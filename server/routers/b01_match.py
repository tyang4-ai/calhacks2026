"""B01 · the matcher (`b01-match`). POST /api/b01/reconcile, no key needed.

A pure Python matcher over a month's records. It matches each channel payout to the orders it pays
for by amount and date alone (it never reads a payout's own orderIds), and checks every consignment
statement against its contract and the bank deposit.

Other upgrades (B03, B05) import `reconcile_month(month_id, records)`. It does no I/O and returns a
list of `{"type": "match.made" | "flag.raised", "date": "YYYY-MM-DD", "payload": {...}}` dicts in
date order. `payload` follows events.md. IDs are `mat_live_N` and `flg_live_N` unless the caller
passes `ids`, a function that picks the scripted twin's ID (the route does this with its trigger).
"""

from __future__ import annotations

import calendar
import datetime as _dt
import itertools
import re
from typing import Any, Callable

from fastapi import APIRouter
from pydantic import BaseModel, Field

from server import ApiError

router = APIRouter(prefix="/api/b01")

KEY = "b01-match"  # the source key on every returned event
MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")

# How far back a payout may reach for its orders, and how many orders one payout may bundle.
WINDOW_DAYS = 14
MAX_BUNDLE = 4
MAX_CANDIDATES = 12

_evt_counter = itertools.count(1)
_mat_counter = itertools.count(1)
_flg_counter = itertools.count(1)


# ---------------------------------------------------------------------------------------------
# Money and date helpers (data-model.md, Units and rules)


def bps(amount_cents: int, rate_bps: int) -> int:
    """amount x rate in basis points, rounded half up once, the same as src/mock/util.ts."""
    return (amount_cents * rate_bps + 5000) // 10000


def _days_between(a: str, b: str) -> int:
    """Days from ISO date a to ISO date b. Pure date arithmetic, no wall clock."""
    try:
        return (_dt.date.fromisoformat(b) - _dt.date.fromisoformat(a)).days
    except ValueError:
        raise ValueError(f"{a} or {b} isn't a date like 2026-09-01.") from None


def last_day(month_id: str) -> str:
    y, m = (int(x) for x in month_id.split("-"))
    return f"{month_id}-{calendar.monthrange(y, m)[1]:02d}"


def _month_of(iso: str) -> str:
    return iso[:7]


# ---------------------------------------------------------------------------------------------
# The matcher


def _int(rec: dict, field: str) -> int:
    v = rec.get(field)
    if isinstance(v, bool) or not isinstance(v, int):
        raise ValueError(f"{rec.get('id', 'A record')} has no whole-cent {field}.")
    return v


def _str(rec: dict, field: str) -> str:
    v = rec.get(field)
    if not isinstance(v, str) or not v:
        raise ValueError(f"{rec.get('id', 'A record')} has no {field}.")
    return v


def _settlement(order: dict) -> int:
    """What a channel pays the studio for one order: gross less card and Cindia fees."""
    return _int(order, "grossCents") - int(order.get("cardFeeCents") or 0) - int(order.get("platformFeeCents") or 0)


def _list(records: dict, name: str) -> list[dict]:
    v = records.get(name) or []
    if not isinstance(v, list) or not all(isinstance(x, dict) for x in v):
        raise ValueError(f"records.{name} must be a list of objects.")
    return v


IdPicker = Callable[[str, dict], "str | None"]


def reconcile_month(month_id: str, records: dict, ids: IdPicker | None = None) -> list[dict]:
    """Every match.made and flag.raised for the month, in date order. Pure, no I/O.

    `ids(event_type, payload)` may return the scripted ID to keep for a result, or None.
    Raises ValueError with one plain sentence when the records don't have the shape data-model.md gives.
    """
    if not isinstance(month_id, str) or not MONTH_RE.match(month_id):
        raise ValueError("monthId must look like 2026-09.")
    if not isinstance(records, dict):
        raise ValueError("records must be an object.")

    orders = _list(records, "orders")
    payouts = _list(records, "payouts")
    refunds = _list(records, "refunds")
    statements = _list(records, "statements")
    bank_txns = _list(records, "bankTxns")
    contracts = _list(records, "contracts")

    close = last_day(month_id)
    consignment = {_str(c, "channelId"): c for c in contracts}
    out: list[dict] = []

    # Validate the fields the matcher reads up front, so a bad record is a clear 400.
    for o in orders:
        _str(o, "id"), _str(o, "channelId"), _str(o, "date"), _settlement(o)
    for p in payouts:
        _str(p, "id"), _str(p, "channelId"), _str(p, "date"), _int(p, "netCents")
    for r in refunds:
        _str(r, "id"), _str(r, "orderId"), _str(r, "date"), _int(r, "amountCents")

    order_by_id = {o["id"]: o for o in orders}
    matched_orders: set[str] = set()
    used_refunds: set[str] = set()

    def candidates(p: dict) -> list[dict]:
        """Unmatched orders of the month on the payout's channel, on or before its date, newest first."""
        c = [
            o
            for o in orders
            if o["id"] not in matched_orders
            and o["channelId"] == p["channelId"]
            and _month_of(o["date"]) == month_id
            and o["date"] <= p["date"]
            and 0 <= _days_between(o["date"], p["date"]) <= WINDOW_DAYS
        ]
        c.sort(key=lambda o: (o["date"], o["id"]), reverse=True)
        return c[:MAX_CANDIDATES]

    def by_date(os: list[dict]) -> list[str]:
        return [o["id"] for o in sorted(os, key=lambda o: (o["date"], o["id"]))]

    def find(p: dict) -> tuple[str, list[str], list[str]] | None:
        net = p["netCents"]
        cands = candidates(p)
        # One payout, one order.
        for o in cands:
            if _settlement(o) == net:
                return "one_to_one", [o["id"]], []
        # One payout, two to four orders from the days before it.
        for size in range(2, MAX_BUNDLE + 1):
            for combo in itertools.combinations(cands, size):
                if sum(_settlement(o) for o in combo) == net:
                    return "bundled", by_date(list(combo)), []
        # Orders less a refund on the same channel, refunded on or before the payout.
        open_refunds = [
            r
            for r in refunds
            if r["id"] not in used_refunds
            and r["date"] <= p["date"]
            and order_by_id.get(r["orderId"], {}).get("channelId") == p["channelId"]
        ]
        for r in open_refunds:
            for size in range(1, MAX_BUNDLE + 1):
                for combo in itertools.combinations(cands, size):
                    if sum(_settlement(o) for o in combo) - r["amountCents"] == net:
                        return "refund_netted", by_date(list(combo)), [r["id"]]
        return None

    for p in sorted(payouts, key=lambda x: (x["date"], x["id"])):
        if p["channelId"] in consignment:
            continue  # consignment money is checked against its statement below
        found = find(p)
        if not found:
            continue
        kind, order_ids, refund_ids = found
        matched_orders.update(order_ids)
        used_refunds.update(refund_ids)
        payload: dict[str, Any] = {"matchId": "", "kind": kind, "recordIds": [p["id"], *order_ids, *refund_ids]}
        if p["date"] > close:
            payload["kind"] = "carried_over"
            payload["intoMonthId"] = _month_of(p["date"])
        picked = ids("match.made", payload) if ids else None
        payload["matchId"] = picked or f"mat_live_{next(_mat_counter)}"
        out.append({"type": "match.made", "date": p["date"], "payload": payload})

    # Consignment: the statement against the contract's commission and against the bank.
    for s in statements:
        sid = _str(s, "id")
        contract = consignment.get(s.get("channelId"))
        if not contract or s.get("monthId", month_id) != month_id:
            continue
        lines = s.get("lines")
        if not isinstance(lines, list) or not lines:
            raise ValueError(f"{sid} has no lines.")
        rate = _int(contract, "commissionBps")
        expected = sum(_int(line, "saleCents") - bps(_int(line, "saleCents"), rate) for line in lines)
        issued = _str(s, "issuedDate")
        channel_payouts = {p["id"] for p in payouts if p["channelId"] == s["channelId"]}
        deposits = [
            t
            for t in bank_txns
            if t.get("direction") == "in"
            and isinstance(t.get("date"), str)
            and t["date"] >= issued
            and _days_between(issued, t["date"]) <= WINDOW_DAYS
            and (t.get("refId") in channel_payouts or t.get("amountCents") == s.get("totalNetCents"))
        ]
        deposits.sort(key=lambda t: (t["date"], str(t.get("id"))))
        if deposits:
            deposit = deposits[0]
            actual = _int(deposit, "amountCents")
            record_ids = [contract["id"], sid, _str(deposit, "id")]
            date = deposit["date"]
        else:
            # No money yet: compare what the statement says it will pay.
            actual = _int(s, "totalNetCents")
            record_ids = [contract["id"], sid]
            date = issued
        if actual >= expected:
            continue
        payload = {
            "flagId": "",
            "kind": "short_payment",
            "recordIds": record_ids,
            "expectedCents": expected,
            "actualCents": actual,
            "deltaCents": expected - actual,
        }
        picked = ids("flag.raised", payload) if ids else None
        payload["flagId"] = picked or f"flg_live_{next(_flg_counter)}"
        out.append({"type": "flag.raised", "date": date, "payload": payload})

    out.sort(key=lambda e: e["date"])  # stable: same-day results keep their order
    return out


# ---------------------------------------------------------------------------------------------
# The route


class Records(BaseModel):
    orders: list[dict] = Field(default_factory=list)
    payouts: list[dict] = Field(default_factory=list)
    refunds: list[dict] = Field(default_factory=list)
    statements: list[dict] = Field(default_factory=list)
    bankTxns: list[dict] = Field(default_factory=list)
    contracts: list[dict] = Field(default_factory=list)


class ReconcileRequest(BaseModel):
    trigger: dict | None
    monthId: str
    records: Records


def _trigger_picker(trigger: dict | None) -> IdPicker:
    """Keeps the trigger's scripted ID for the result with the same anchor record."""
    t_type = trigger.get("type") if isinstance(trigger, dict) else None
    t_payload = trigger.get("payload") if isinstance(trigger, dict) else None
    if not isinstance(t_payload, dict):
        t_payload = {}
    t_ids = t_payload.get("recordIds") if isinstance(t_payload.get("recordIds"), list) else []

    def pick(event_type: str, payload: dict) -> str | None:
        if event_type != t_type or not t_ids:
            return None
        if event_type == "match.made" and payload["recordIds"][0] == t_ids[0]:
            mid = t_payload.get("matchId")
            return mid if isinstance(mid, str) and mid else None
        if event_type == "flag.raised" and payload.get("kind") == t_payload.get("kind") and payload["recordIds"][1] in t_ids:
            fid = t_payload.get("flagId")
            return fid if isinstance(fid, str) and fid else None
        return None

    return pick


@router.post("/reconcile")
def reconcile(body: ReconcileRequest) -> dict:
    if not MONTH_RE.match(body.monthId):
        raise ApiError("bad_request", "monthId must look like 2026-09.")
    at = body.trigger.get("at") if isinstance(body.trigger, dict) else None
    at = at if isinstance(at, (int, float)) and not isinstance(at, bool) else 0
    try:
        results = reconcile_month(body.monthId, body.records.model_dump(), ids=_trigger_picker(body.trigger))
    except ValueError as exc:
        raise ApiError("bad_request", str(exc)) from None
    events = [
        {
            "id": f"evt_live_{next(_evt_counter):04d}",
            "type": r["type"],
            "at": at,
            "source": "live",
            "key": KEY,
            "payload": r["payload"],
        }
        for r in results
    ]
    return {"events": events}
