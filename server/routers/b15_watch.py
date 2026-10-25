"""B15 · the copy watch's endpoints (api-contract.md B15, docs/plans/B15-watch.md Endpoints).

Long work starts, then the adapter polls (B2-16):

- `POST /api/b15/watch` `{ trigger, runId, idTag, idStart, scanId, makerId, queries }` starts a scan in
  a server thread and answers 202 `{ scanId, status }` at once (not an events response).
  - Only the Diné co-op's makers, as the server's own mock.json records them (A2-20): any other
    `makerId` is 400 `bad_request`. The co-op's pieces and stories never come from the request.
  - Single flight keyed by `idTag` plus `scanId`: a second POST with both returns that scan. One scan
    runs at a time across the server, and another one answers 503 `busy`.
  - A scan of the same maker within 30 minutes reuses the crawl and the checks with fresh IDs, with
    no new Apify run and no new Claude call.
  - Errors: 503 `key_missing` without `APIFY_TOKEN` or `APIFY_AUTH=proxy`, 503 `upstream_error` without
    `PUBLIC_SITE_URL` ("The sandbox market isn't set up yet."). A failed scan's poll carries
    `upstream_timeout` or `upstream_error` in `error`.
- `GET /api/b15/watch/{scanId}?idTag=<tag>` answers from memory: `{ status, events, error }`, `events`
  empty until `done`, or 404 `not_found` for a scan this server doesn't know under that tag.
- `GET /api/b15/status`: `{ market, threshold, measured, model }`, from config and local files.

The only outbound hosts are api.apify.com (the Scout) and api.anthropic.com (Claims, Reporter). Nothing
here fetches a page, and nothing logs a key, a body or a listing's words.
"""

from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Optional, Union

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator

from server import ApiError, config
from server.b15_watch import compare, coop, scan, scout, steps, thresholds

log = logging.getLogger("cindia.b15")

router = APIRouter(prefix="/api/b15")

RUN_RE = re.compile(r"^[a-z]{2,5}(?:_[a-z0-9]+){1,6}$")
SCAN_RE = re.compile(r"^wsc_[a-z0-9_]{1,60}$")


class WatchBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: Optional[dict[str, Any]]
    runId: str = Field(max_length=64)
    idTag: str = Field(pattern=r"^[a-z0-9]{4,12}$")
    idStart: Union[StrictInt, dict[str, StrictInt]]
    scanId: str = Field(max_length=64)
    makerId: str = Field(max_length=32)
    queries: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("runId")
    @classmethod
    def _run(cls, v: str) -> str:
        if not RUN_RE.match(v):
            raise ValueError("runId isn't an ID")
        return v

    @field_validator("scanId")
    @classmethod
    def _scan(cls, v: str) -> str:
        if not SCAN_RE.match(v):
            raise ValueError("scanId isn't a scan ID")
        return v

    @field_validator("queries")
    @classmethod
    def _queries(cls, v: list[str]) -> list[str]:
        if any(len(q) > 300 for q in v):
            raise ValueError("a query is longer than 300 characters")
        return v


@dataclass
class ScanState:
    tag: str
    scan_id: str
    maker_id: str
    status: str = "running"
    events: list[dict[str, Any]] = field(default_factory=list)
    error: Optional[dict[str, str]] = None
    created: float = field(default_factory=time.monotonic)


_lock = threading.Lock()
_scans: dict[tuple[str, str], ScanState] = {}
_running: Optional[tuple[str, str]] = None
_cache: dict[str, scan.Analysis] = {}


def reset() -> None:
    """Forgets every scan and the cache (tests)."""
    global _running
    with _lock:
        _scans.clear()
        _cache.clear()
        _running = None


def _prune_locked() -> None:
    now = time.monotonic()
    for k in [k for k, s in _scans.items() if s.status != "running" and now - s.created > thresholds.SCAN_KEEP_S]:
        del _scans[k]
    finished = sorted((s.created, k) for k, s in _scans.items() if s.status != "running")
    while len(_scans) > thresholds.SCANS_KEPT and finished:
        _, k = finished.pop(0)
        _scans.pop(k, None)
    for m in [m for m, a in _cache.items() if now - a.created > thresholds.CACHE_S]:
        del _cache[m]


def _run(key: tuple[str, str], body: WatchBody, ids: steps.Ids, records: coop.Records) -> None:
    global _running
    st = _scans[key]
    steps.process("working", 1)
    payloads: list[dict[str, Any]] = []
    t0 = time.monotonic()
    try:
        analysis = scan.analyze(body.makerId, records)
        events, payloads = scan.events_for(analysis, ids=ids, run_id=body.runId, scan_id=body.scanId, at=steps.trigger_at(body.trigger))
        with _lock:
            _cache[body.makerId] = analysis
            st.events = events
            st.status = "done"
        log.info("b15 scan done: %d listings, %d hits, %.0f ms", len(analysis.checked), len(analysis.hits), (time.monotonic() - t0) * 1000)
    except scout.ScoutError as exc:
        with _lock:
            st.error = {"code": exc.code, "message": exc.message}
            st.status = "failed"
        log.info("b15 scan failed: %s", exc.code)
    except Exception as exc:  # anything else fails the scan, never the server
        with _lock:
            st.error = {"code": "internal", "message": "The scan hit an error."}
            st.status = "failed"
        log.info("b15 scan failed: internal (%s)", type(exc).__name__)
    finally:
        with _lock:
            if _running == key:
                _running = None
        steps.process("done", 0)
    if payloads:
        steps.mirror(body.runId, body.scanId, payloads)


@router.post("/watch", status_code=202, response_model=None)
def start_watch(body: WatchBody) -> Union[dict[str, Any], JSONResponse]:
    global _running
    records = coop.records()
    if body.makerId not in records.maker_ids():
        raise ApiError("bad_request", "The watch scans only the Diné co-op's makers.")
    try:
        ids = steps.Ids(body.idTag, body.idStart)
    except ValueError:
        raise ApiError("bad_request", "idStart must hold whole numbers from 1.") from None
    try:
        scout.check_ready()
    except scout.ScoutError as exc:
        if exc.code == "upstream_error":
            # The contract's one 503 upstream_error: no sandbox market yet (the error table's 502 is
            # for an outside service that answered with an error).
            return JSONResponse(status_code=503, content={"error": {"code": exc.code, "message": exc.message}})
        raise ApiError(exc.code, exc.message) from None
    key = (body.idTag, body.scanId)
    mirror: Optional[list[dict[str, Any]]] = None
    with _lock:
        _prune_locked()
        existing = _scans.get(key)
        if existing is not None:
            return {"scanId": body.scanId, "status": existing.status}
        cached = _cache.get(body.makerId)
        if cached is not None:
            age = time.monotonic() - cached.created
            events, mirror = scan.events_for(cached, ids=ids, run_id=body.runId, scan_id=body.scanId,
                                             at=steps.trigger_at(body.trigger), reused_age_s=age)
            _scans[key] = ScanState(body.idTag, body.scanId, body.makerId, status="done", events=events)
        elif _running is not None:
            raise ApiError("busy", "Another scan is running, so the scripted scan plays.")
        else:
            _scans[key] = ScanState(body.idTag, body.scanId, body.makerId)
            _running = key
    if mirror is not None:
        steps.mirror(body.runId, body.scanId, mirror)
        return {"scanId": body.scanId, "status": "done"}
    threading.Thread(target=_run, args=(key, body, ids, records), name="b15-scan", daemon=True).start()
    return {"scanId": body.scanId, "status": "running"}


@router.get("/watch/{scan_id}")
def poll_watch(scan_id: str, idTag: str = Query(max_length=12)) -> dict[str, Any]:
    with _lock:
        st = _scans.get((idTag, scan_id))
        if st is None:
            raise ApiError("not_found", "There's no scan with that ID for this page.")
        return {
            "status": st.status,
            "events": list(st.events) if st.status == "done" else [],
            "error": dict(st.error) if st.error else None,
        }


@router.get("/status")
def watch_status() -> dict[str, Any]:
    threshold, measured = thresholds.similarity_min()
    return {
        "market": bool(config.PUBLIC_SITE_URL),
        "threshold": threshold,
        "measured": measured,
        "model": compare.model_available(),
    }
