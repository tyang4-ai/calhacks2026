"""B08 · approvals on a second screen (`b08-approvals`).

The owner approves on a real second screen (a phone, or a second tab on /owner) and the console sees
the decision. Cindy proposes, and the only route that turns a pending approval into a decision is
`POST /api/b08/approvals/{approvalId}/decision`, which the owner's phone calls when the owner taps.

Routes (api-contract.md, B08). No key, no network. Approvals live in memory, so a restart clears them.
- POST /api/b08/approvals                         registers a pending approval, returns approval.requested
- GET  /api/b08/approvals?status=pending          the owner's phone, every 2 s: one approval.requested per pending one
- POST /api/b08/approvals/{approvalId}/decision   the owner's tap: approval.granted or approval.declined
- GET  /api/b08/approvals/{approvalId}?wait=6     the console: waits up to `wait` s (at most 6) for the decision
- GET  /api/b08/status                            { ownerConnected }: an owner screen polled in the last 10 s

Decisions are final: a second decision on the same approval changes nothing and returns the first
decision again, with status 200. Registering an approval again never reopens it.
"""

from __future__ import annotations

import datetime as _dt
import itertools
import re
import threading
import time
from typing import Any, Literal, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field

from server import ApiError

router = APIRouter(prefix="/api/b08")

KEY = "b08-approvals"
OWNER_ID = "own_01"
MAX_WAIT_S = 6.0
OWNER_WINDOW_S = 10.0

APPROVAL_ID = r"^apr_[A-Za-z0-9_]+$"
_APPROVAL_RE = re.compile(APPROVAL_ID)
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# evt_live_ plus a number, unique within the server process. B08's numbers start at 800001 so they
# never meet another router's counter.
_ids = itertools.count(800001)

# One lock guards the store and the owner clock. The condition wakes every waiting long-poll when a
# decision lands.
_lock = threading.Lock()
_decided = threading.Condition(_lock)
_store: dict[str, dict[str, Any]] = {}
_order: list[str] = []
_owner_last_poll: Optional[float] = None


def _next_id() -> str:
    # Called with _lock held.
    return f"evt_live_{next(_ids)}"


def reset_for_tests() -> None:
    """Clears the store and the owner clock. Only the tests call it."""
    global _owner_last_poll
    with _lock:
        _store.clear()
        _order.clear()
        _owner_last_poll = None


class TextModel(BaseModel):
    model_config = ConfigDict(extra="ignore")

    en: str
    zh: str


class RegisterRequest(BaseModel):
    trigger: Optional[dict[str, Any]]
    approvalId: str = Field(pattern=APPROVAL_ID)


class DecisionRequest(BaseModel):
    trigger: Optional[dict[str, Any]]
    decision: Literal["granted", "declined"]
    reason: Optional[TextModel] = None


def _at(trigger: Optional[dict[str, Any]]) -> int:
    if not trigger:
        return 0
    at = trigger.get("at")
    if isinstance(at, bool) or not isinstance(at, (int, float)) or at < 0:
        return 0
    return int(at)


def _trigger_payload(trigger: Optional[dict[str, Any]]) -> dict[str, Any]:
    if not trigger:
        return {}
    payload = trigger.get("payload")
    return payload if isinstance(payload, dict) else {}


def _event(event_type: str, at: int, payload: dict[str, Any]) -> dict[str, Any]:
    return {"id": _next_id(), "type": event_type, "at": at, "source": "live", "key": KEY, "payload": payload}


def _check_trigger_id(trigger: Optional[dict[str, Any]], approval_id: str) -> None:
    tid = _trigger_payload(trigger).get("approvalId")
    if tid is not None and tid != approval_id:
        raise ApiError("bad_request", "The trigger is for a different approval than the request.")


@router.post("/approvals")
def register(body: RegisterRequest) -> dict:
    """The console's adapter, on approval.requested. Registers the approval as pending."""
    if body.trigger is not None and body.trigger.get("type") not in (None, "approval.requested"):
        raise ApiError("bad_request", "The trigger must be an approval.requested event.")
    _check_trigger_id(body.trigger, body.approvalId)
    with _lock:
        item = _store.get(body.approvalId)
        if item is None:
            item = {
                "requested": _event("approval.requested", _at(body.trigger), {"approvalId": body.approvalId}),
                "decision": None,
            }
            _store[body.approvalId] = item
            _order.append(body.approvalId)
        return {"events": [item["requested"]]}


@router.get("/approvals")
def list_approvals(status: Literal["pending"] = Query("pending")) -> dict:
    """The owner's phone, every 2 seconds. Lists pending approvals and marks an owner screen as connected."""
    global _owner_last_poll
    with _lock:
        _owner_last_poll = time.monotonic()
        events = [_store[a]["requested"] for a in _order if _store[a]["decision"] is None]
        return {"events": events}


@router.post("/approvals/{approvalId}/decision")
def decide(approvalId: str, body: DecisionRequest) -> dict:
    """The owner's tap. The only route that decides an approval. A second decision returns the first."""
    if not _APPROVAL_RE.match(approvalId):
        raise ApiError("bad_request", "The approval ID isn't valid.")
    trigger = body.trigger
    if trigger is not None:
        expected_type = f"approval.{body.decision}"
        if trigger.get("type") not in (None, expected_type):
            raise ApiError("bad_request", "The trigger doesn't match the decision.")
        _check_trigger_id(trigger, approvalId)
    tp = _trigger_payload(trigger)

    with _decided:
        item = _store.get(approvalId)
        if item is None:
            raise ApiError("not_found", "No approval with this ID is registered.")
        if item["decision"] is not None:
            return {"events": [item["decision"]]}

        at = _at(trigger)
        if body.decision == "granted":
            date = tp.get("date")
            if not isinstance(date, str) or not _DATE_RE.match(date):
                date = _dt.date.today().isoformat()
            event = _event("approval.granted", at, {"approvalId": approvalId, "by": OWNER_ID, "date": date})
        else:
            reason: Optional[dict[str, str]] = None
            if body.reason is not None and (body.reason.en or body.reason.zh):
                reason = {"en": body.reason.en, "zh": body.reason.zh}
            else:
                tr = tp.get("reason")
                if isinstance(tr, dict) and isinstance(tr.get("en"), str) and isinstance(tr.get("zh"), str):
                    reason = {"en": tr["en"], "zh": tr["zh"]}
            if reason is None:
                raise ApiError("bad_request", "A decline needs a reason in English and Chinese.")
            event = _event("approval.declined", at, {"approvalId": approvalId, "by": OWNER_ID, "reason": reason})

        item["decision"] = event
        _decided.notify_all()
        return {"events": [event]}


@router.get("/approvals/{approvalId}")
def wait_for_decision(approvalId: str, wait: float = Query(0, ge=0)) -> dict:
    """The console's adapter, on the scripted approval.granted. Waits up to `wait` seconds (at most 6)."""
    if not _APPROVAL_RE.match(approvalId):
        raise ApiError("bad_request", "The approval ID isn't valid.")
    deadline = time.monotonic() + min(float(wait), MAX_WAIT_S)
    with _decided:
        item = _store.get(approvalId)
        if item is None:
            raise ApiError("not_found", "No approval with this ID is registered.")
        while item["decision"] is None:
            left = deadline - time.monotonic()
            if left <= 0:
                return {"events": []}
            _decided.wait(timeout=left)
        return {"events": [item["decision"]]}


@router.get("/status")
def status() -> dict:
    """Whether an owner screen polled the pending list in the last 10 seconds. Not an events response."""
    with _lock:
        last = _owner_last_poll
    connected = last is not None and (time.monotonic() - last) < OWNER_WINDOW_S
    return {"ownerConnected": connected}
