"""B11 · Cindia's own embedding model (`b11-embed`). No key, no outside call.

- `GET /api/b11/model` answers `{ trained, warm, modelId, baseModel, dims, fingerprint, problem }` in
  under 200 ms. It never loads or hashes the model in the request: the first call starts the one
  background warm-up thread (server/b11_embed/model.py), and later calls say `warm: true` once it
  has loaded the model, checked the fingerprints and run one test encode. Not an events response.
- `POST /api/b11/report` `{ trigger }` returns `model.trained` and `proof.search_scored` built from
  server/b11_embed/report.json, or `[]` when there's no trained model whose fingerprints match.
- `POST /api/b11/map` `{ trigger, queryId, text, keywords }` embeds the query by the one rule
  (compose.query_text), projects it with the stored PCA (never refitted per request) and returns one
  `search.mapped` with every piece's point and the query's, `method: "pca"`. `approx` is set only
  when the query's point is the weighted center of its top 3 (pca.place). It returns `[]` while the
  model isn't trained or warm, or when the encode lock stays busy, so the scripted map plays.

Events carry `source: "live"`, `key: "b11-embed"`, `at` from the trigger (or 0), and IDs made of
`evt_live_`, then `11`, the process start time in seconds modulo 1,000,000 as six digits, and a
four-digit count from 0001, so a reload never repeats one (D1-52). Torch is never imported here:
model.py loads it inside the warm-up thread.
"""

from __future__ import annotations

import itertools
import threading
import time
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

from server import ApiError
from server.b11_embed import compose
from server.b11_embed import model as b11model

router = APIRouter(prefix="/api/b11")

KEY = "b11-embed"
MAX_TEXT = 1000
MAX_KEYWORDS = 50
MAX_KEYWORD_CHARS = 200
MAX_BODY_BYTES = 2 * 1024 * 1024
# /map's budget is 2 seconds once warm, so it waits at most this long for the encode lock.
ENCODE_WAIT_S = 1.5

_START = f"{int(time.time()) % 1_000_000:06d}"
_counter = itertools.count(1)
_counter_lock = threading.Lock()


def _next_id() -> str:
    with _counter_lock:
        n = next(_counter)
    return f"evt_live_11{_START}{n:04d}"


class ReportRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: dict[str, Any] | None


class MapRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: dict[str, Any] | None
    queryId: str = Field(min_length=1, max_length=100)
    text: str = Field(max_length=MAX_TEXT)
    keywords: list[str] = Field(default_factory=list, max_length=MAX_KEYWORDS)


def _check_size(request: Request) -> None:
    length = request.headers.get("content-length")
    if length is not None and length.isdigit() and int(length) > MAX_BODY_BYTES:
        raise ApiError("bad_request", "The request body is larger than 2 MB.")


def _at(trigger: dict[str, Any] | None) -> int | float:
    at = (trigger or {}).get("at")
    return at if isinstance(at, (int, float)) and not isinstance(at, bool) and at >= 0 else 0


def _event(etype: str, at: int | float, payload: dict[str, Any]) -> dict[str, Any]:
    return {"id": _next_id(), "type": etype, "at": at, "source": "live", "key": KEY, "payload": payload}


@router.get("/model")
def get_model() -> dict[str, Any]:
    return b11model.status(start=True)


@router.post("/report")
def post_report(body: ReportRequest, request: Request) -> dict[str, Any]:
    _check_size(request)
    c = b11model.check(compute_hash=True)
    report = c.report if c.ok else None
    if not report:
        return {"events": []}
    ev = report.get("eval") or {}
    systems = ev.get("systems")
    needed = (report.get("modelId"), report.get("baseModel"), report.get("pairs"), report.get("epochs"), report.get("dims"))
    if any(v is None for v in needed) or not isinstance(systems, list) or not systems:
        return {"events": []}
    at = _at(body.trigger)
    trained: dict[str, Any] = {
        "modelId": report["modelId"],
        "baseModel": report["baseModel"],
        "pairs": report["pairs"],
        "epochs": report["epochs"],
        "dims": report["dims"],
    }
    if isinstance(report.get("hubUrl"), str) and report["hubUrl"]:
        trained["hubUrl"] = report["hubUrl"]
    scored = {
        "modelId": report["modelId"],
        "k": ev.get("k", 5),
        "queries": ev.get("queries"),
        "systems": [{"system": s["system"], "recallAtK": s["recallAtK"], "mrr": s["mrr"]} for s in systems],
    }
    return {"events": [_event("model.trained", at, trained), _event("proof.search_scored", at, scored)]}


@router.post("/map")
def post_map(body: MapRequest, request: Request) -> dict[str, Any]:
    _check_size(request)
    if any(not isinstance(k, str) or len(k) > MAX_KEYWORD_CHARS for k in body.keywords):
        raise ApiError("bad_request", f"Each keyword is at most {MAX_KEYWORD_CHARS} characters.")
    try:
        text = compose.query_text(body.text, body.keywords)
    except ValueError:
        raise ApiError("bad_request", "The query needs words or a keyword.") from None
    if not b11model.is_warm():
        b11model.start_warmup()
        return {"events": []}
    try:
        vector = b11model.encode_array([text], "query", timeout=ENCODE_WAIT_S)[0]
        x, y, approx = b11model.project(vector)
        points = b11model.map_points()
    except (b11model.NotReady, b11model.Busy):
        return {"events": []}
    payload: dict[str, Any] = {
        "queryId": body.queryId,
        "modelId": (b11model.read_report() or {}).get("modelId"),
        "points": [{"pieceId": p["pieceId"], "x": round(p["x"], 5), "y": round(p["y"], 5)} for p in points],
        "query": {"x": round(x, 5), "y": round(y, 5)},
        "method": "pca",
    }
    if approx:
        payload["approx"] = True
    return {"events": [_event("search.mapped", _at(body.trigger), payload)]}
