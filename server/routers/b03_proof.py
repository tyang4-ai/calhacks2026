"""B03 · the proof panel scores the matcher (`b03-proof`).

POST /api/b03/score runs B01's matcher over the month's records and checks each planted error in the
answer key against what the matcher reported. It returns one `proof.scored`. No key, no network.

When a planted error counts as caught (docs/plans/B03-proof.md):
- short_payment: a `flag.raised` of that kind on exactly the planted error's records, with the
  answer key's expected, actual and delta amounts. The trusted record isn't part of `flag.raised`,
  so it isn't scored.
- bundled: a `match.made` of that kind whose records are exactly the answer key's records.
- refund_netted: a `match.made` of that kind that includes every refund in the planted error.
- carried_over: a `match.made` of that kind with exactly the answer key's records. `intoMonthId`
  must equal the expected month when the matcher sets it. Without it, the kind stands for the month.

B03 never changes the matcher. It only reads what `reconcile_month()` returns, which is a list of
`{type, date, payload}` items (bare payloads are read too).
"""

from __future__ import annotations

import itertools
import threading
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from server import ApiError
from server.routers.b01_match import reconcile_month

router = APIRouter(prefix="/api/b03")

KEY = "b03-proof"

# evt_live_ plus a number, unique within the server process. B03's numbers start at 300001 so
# they never meet another router's counter.
_ids = itertools.count(300001)
_ids_lock = threading.Lock()


def _next_id() -> str:
    with _ids_lock:
        return f"evt_live_{next(_ids)}"


class Records(BaseModel):
    model_config = ConfigDict(extra="allow")

    orders: list[dict[str, Any]]
    payouts: list[dict[str, Any]]
    refunds: list[dict[str, Any]]
    statements: list[dict[str, Any]]
    bankTxns: list[dict[str, Any]]
    contracts: list[dict[str, Any]]


class PlantedError(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    recordIds: list[str]
    expected: dict[str, Any]


class ScoreRequest(BaseModel):
    trigger: Optional[dict[str, Any]]
    monthId: str = Field(pattern=r"^\d{4}-\d{2}$")
    records: Records
    answerKey: list[PlantedError] = Field(min_length=1)


def _as_event(item: Any) -> tuple[str, dict[str, Any]] | None:
    """Reads one item from reconcile_month(): a full event or a bare payload. Returns (type, payload)."""
    if not isinstance(item, dict):
        return None
    if isinstance(item.get("type"), str) and isinstance(item.get("payload"), dict):
        return item["type"], item["payload"]
    if "matchId" in item:
        return "match.made", item
    if "flagId" in item:
        return "flag.raised", item
    return None


def _ids_of(payload: dict[str, Any]) -> set[str]:
    ids = payload.get("recordIds")
    return {str(i) for i in ids} if isinstance(ids, list) else set()


def _is_caught(err: PlantedError, found: list[tuple[str, dict[str, Any]]]) -> bool:
    exp = err.expected
    kind = str(exp.get("kind") or err.kind)
    event_type = str(exp.get("event") or ("flag.raised" if kind == "short_payment" else "match.made"))
    candidates = [p for t, p in found if t == event_type and p.get("kind") == kind]

    if event_type == "flag.raised":
        want = set(err.recordIds)
        for p in candidates:
            if _ids_of(p) != want:
                continue
            if all(p.get(f) == exp.get(f) for f in ("expectedCents", "actualCents", "deltaCents")):
                return True
        return False

    if event_type != "match.made":
        return False

    if kind == "refund_netted":
        refund_ids = {i for i in err.recordIds if i.startswith("rfd_")} or {
            i for i in exp.get("recordIds", []) if isinstance(i, str) and i.startswith("rfd_")
        }
        if not refund_ids:
            return False
        return any(refund_ids <= _ids_of(p) for p in candidates)

    want = {str(i) for i in exp.get("recordIds", [])} or set(err.recordIds)
    into = exp.get("intoMonthId")
    for p in candidates:
        if _ids_of(p) != want:
            continue
        got_into = p.get("intoMonthId")
        if into is not None and got_into is not None and got_into != into:
            continue
        return True
    return False


def score(found_items: list[Any], answer_key: list[PlantedError]) -> dict[str, Any]:
    """The `proof.scored` payload for what the matcher found, against the answer key. Pure."""
    found = [ev for ev in (_as_event(i) for i in found_items) if ev is not None]
    results = [{"errorId": e.id, "caught": _is_caught(e, found)} for e in answer_key]
    return {"caught": sum(1 for r in results if r["caught"]), "total": len(results), "results": results}


@router.post("/score")
def score_month(body: ScoreRequest) -> dict:
    records = body.records.model_dump()
    try:
        found = reconcile_month(body.monthId, records)
    except (KeyError, TypeError, ValueError) as exc:
        raise ApiError("bad_request", "The month's records couldn't be matched, so check their fields.") from exc
    if not isinstance(found, list):
        raise ApiError("internal", "The matcher returned something the score can't read.")

    payload = score(found, body.answerKey)
    at = body.trigger.get("at") if isinstance(body.trigger, dict) else None
    event = {
        "id": _next_id(),
        "type": "proof.scored",
        "at": at if isinstance(at, (int, float)) and not isinstance(at, bool) else 0,
        "source": "live",
        "key": KEY,
        "payload": payload,
    }
    return {"events": [event]}
