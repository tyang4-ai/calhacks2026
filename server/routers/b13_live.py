"""B13 · the database (`b13-live`): SpacetimeDB holds the platform's shared state.

Routes (api-contract.md, B13). No key from the browser. The bridge calls SpacetimeDB as the owner.
- GET  /api/b13/changes?after=<seq>&screen=<screenId>&role=<role>  { events, seq } from the feed's snapshot
- GET  /api/b13/status                                             { spacetime, db, seeded, screens, tables, seq }
- POST /api/b13/seed    { trigger: null }                           seeds from the server's own mock.json
- POST /api/b13/record  { trigger: null, events }                   mirrors orders, approvals and listing states

`changes` and `status` always answer from the snapshot, in well under 300 ms, and start the one
feed poller on first use. `seed` and `record` answer 503 `upstream_error` without SPACETIME_TOKEN or
with SpacetimeDB down. Nothing here returns or logs a token or a URL.
"""

from __future__ import annotations

import re
import threading
import time
from typing import Any, Optional

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

from server import ApiError, config, services
from server.b13_spacetime import bridge, feed, seed

router = APIRouter(prefix="/api/b13")

KEY = "b13-live"
ROLES = ("buyer", "seller", "tour")
SCREEN_RE = re.compile(r"^scr_[A-Za-z0-9]{6,12}$")
TOUCH_EVERY_S = 5.0
FIRST_POLL_WAIT_S = 0.2
RECORD_MAX_EVENTS = 50
RECORD_MAX_BYTES = 256 * 1024
SEED_WAIT_S = 10.0

# The ID scheme (data-model.md): the module's record-ID shape, at most 64 characters.
_RECORD_ID = re.compile(r"^[a-z]{2,4}_[a-z0-9]{1,24}(?:_[a-z0-9]{1,24}){0,4}$")
_EVENT_ID = re.compile(r"^evt_[a-z0-9_]{1,60}$")
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
APPROVAL_KINDS = (
    "follow_up",
    "maker_payouts",
    "listing_publish",
    "storefront_publish",
    "report_listing",
    "milestone_release",
    "support_action",
)
MIRRORED = (
    "order.placed",
    "approval.requested",
    "approval.granted",
    "approval.declined",
    "listing.requested",
    "listing.drafted",
    "listing.indexed",
)
SUBJECTS_MAX = 8
CENTS_MAX = 1_000_000_000_000


def _upstream(message: str) -> JSONResponse:
    """B13's 503 upstream_error (api-contract.md B13), in the contract's error shape."""
    return JSONResponse(status_code=503, content={"error": {"code": "upstream_error", "message": message}})


# ---------------------------------------------------------------------------------------------
# GET /api/b13/changes and /api/b13/status

_touch_lock = threading.Lock()
_touched: dict[str, float] = {}


def _touch(screen_id: str, role: str) -> None:
    """Refreshes the caller's screens row at most every 5 seconds, through the bridge's queue."""
    now = time.monotonic()
    with _touch_lock:
        last = _touched.get(screen_id)
        if last is not None and now - last < TOUCH_EVERY_S:
            return
        _touched[screen_id] = now
        if len(_touched) > 500:
            for sid, at in list(_touched.items()):
                if now - at > 60:
                    del _touched[sid]
    if bridge.has_token():
        bridge.touch_screen(screen_id, role)


def reset_for_tests() -> None:
    global _seed_ok
    with _touch_lock:
        _touched.clear()
    _seed_ok = False


@router.get("/changes")
def changes(
    after: int = Query(0, ge=0),
    screen: Optional[str] = None,
    role: Optional[str] = None,
) -> dict[str, Any]:
    if not isinstance(screen, str) or not SCREEN_RE.match(screen):
        raise ApiError("bad_request", "screen must be scr_ and 6 to 12 letters or digits.")
    if role not in ROLES:
        raise ApiError("bad_request", "role must be buyer, seller or tour.")
    f = feed.get()
    f.ensure_started(wait_s=FIRST_POLL_WAIT_S)
    _touch(screen, role)
    events, seq = f.changes(after)
    return {"events": events, "seq": seq}


@router.get("/status")
def status() -> dict[str, Any]:
    f = feed.get()
    f.ensure_started(wait_s=FIRST_POLL_WAIT_S)
    snap = f.status()
    # The feed first: when it's healthy SpacetimeDB answered within the last poll, so the probe is quick.
    spacetime = bool(f.healthy() and bridge.available() and services.spacetime_reachable())
    return {
        "spacetime": spacetime,
        "db": config.SPACETIME_DB,
        "seeded": snap["seeded"],
        "screens": snap["screens"],
        "tables": snap["tables"],
        "seq": snap["seq"],
    }


# ---------------------------------------------------------------------------------------------
# POST /api/b13/seed


class SeedRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: Optional[Any] = None


_seed_lock = threading.Lock()
_seed_ok = False


def _seed_once() -> str:
    """One seed: 'ok', 'no_data' or 'refused'."""
    try:
        payload = seed.payload_from_file()
    except seed.SeedDataMissing:
        return "no_data"
    return "ok" if bridge.seed_catalog(payload) else "refused"


def _seed_single_flight() -> str:
    """Runs the seed, or waits for the one already running and shares its result."""
    global _seed_ok
    if _seed_lock.acquire(blocking=False):
        try:
            result = _seed_once()
            _seed_ok = result == "ok"
            return result
        finally:
            _seed_lock.release()
    if _seed_lock.acquire(timeout=SEED_WAIT_S):
        _seed_lock.release()
        return "ok" if _seed_ok else "refused"
    return "refused"


@router.post("/seed", response_model=None)
def seed_route(_body: SeedRequest) -> Any:
    if not bridge.has_token():
        return _upstream("SPACETIME_TOKEN isn't set, so the database can't be seeded.")
    result = _seed_single_flight()
    if result == "no_data":
        raise ApiError("internal", "The server's mock data isn't there yet. Run npm run export:mock.")
    if result != "ok":
        return _upstream("SpacetimeDB didn't take the seed.")
    return {"events": []}


# ---------------------------------------------------------------------------------------------
# POST /api/b13/record


class RecordRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: Optional[Any] = None
    events: list[Any]


def _rid(value: Any, *prefixes: str) -> Optional[str]:
    if not isinstance(value, str) or len(value) > 64 or not _RECORD_ID.match(value):
        return None
    if prefixes and not any(value.startswith(f"{p}_") for p in prefixes):
        return None
    return value


def _cents(value: Any) -> Optional[int]:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0 or value > CENTS_MAX:
        return None
    return value


def mirror_event(event: Any) -> Optional[dict[str, Any]]:
    """The event as the module reads it: the envelope's ID, type and key, and only the IDs, kinds,
    amounts and dates it stores. None for any other type or a malformed event."""
    if not isinstance(event, dict):
        return None
    type_ = event.get("type")
    if type_ not in MIRRORED:
        return None
    event_id = event.get("id")
    if not isinstance(event_id, str) or not _EVENT_ID.match(event_id):
        return None
    p = event.get("payload")
    if not isinstance(p, dict):
        return None
    out: dict[str, Any]
    if type_ == "order.placed":
        order_id, piece_id, channel_id = _rid(p.get("orderId"), "ord"), _rid(p.get("pieceId"), "pc"), _rid(p.get("channelId"), "ch")
        gross, date = _cents(p.get("grossCents")), p.get("date")
        if not (order_id and piece_id and channel_id) or gross is None or not isinstance(date, str) or not _DATE.match(date):
            return None
        out = {"orderId": order_id, "pieceId": piece_id, "channelId": channel_id, "grossCents": gross, "date": date}
    elif type_ == "approval.requested":
        approval_id = _rid(p.get("approvalId"), "apr")
        if not approval_id:
            return None
        out = {"approvalId": approval_id}
        inline = p.get("approval")
        if inline is not None:
            if not isinstance(inline, dict) or inline.get("kind") not in APPROVAL_KINDS:
                return None
            subjects = inline.get("subjectIds")
            if not isinstance(subjects, list) or len(subjects) > SUBJECTS_MAX:
                return None
            checked = [_rid(s) for s in subjects]
            if any(s is None for s in checked):
                return None
            approval: dict[str, Any] = {"kind": inline["kind"], "subjectIds": checked}
            if inline.get("amountCents") is not None:
                amount = _cents(inline.get("amountCents"))
                if amount is None:
                    return None
                approval["amountCents"] = amount
            out["approval"] = approval
    elif type_ in ("approval.granted", "approval.declined"):
        approval_id = _rid(p.get("approvalId"), "apr")
        if not approval_id:
            return None
        out = {"approvalId": approval_id}
    elif type_ in ("listing.requested", "listing.drafted"):
        listing_id, maker_id = _rid(p.get("listingId"), "lst"), _rid(p.get("makerId"), "mkr")
        if not (listing_id and maker_id):
            return None
        out = {"listingId": listing_id, "makerId": maker_id}
    else:  # listing.indexed
        listing_id, piece_id = _rid(p.get("listingId"), "lst"), _rid(p.get("pieceId"), "pc")
        if not (listing_id and piece_id):
            return None
        out = {"listingId": listing_id, "pieceId": piece_id}
    mirrored: dict[str, Any] = {"id": event_id, "type": type_, "payload": out}
    key = event.get("key")
    if isinstance(key, str) and re.match(r"^b\d\d-[a-z0-9-]{1,24}$", key):
        mirrored["key"] = key
    return mirrored


@router.post("/record", response_model=None)
def record_route(body: RecordRequest, request: Request) -> Any:
    length = request.headers.get("content-length")
    if length is not None and length.isdigit() and int(length) > RECORD_MAX_BYTES:
        raise ApiError("bad_request", "The body is larger than 256 KB.")
    if len(body.events) > RECORD_MAX_EVENTS:
        raise ApiError("bad_request", "At most 50 events can be recorded at once.")
    kept = [m for m in (mirror_event(e) for e in body.events) if m is not None]
    if not kept:
        return {"events": []}
    if not bridge.has_token():
        return _upstream("SPACETIME_TOKEN isn't set, so nothing can be recorded.")
    if not bridge.record(kept):
        return _upstream("SpacetimeDB didn't take the recorded events.")
    return {"events": []}
