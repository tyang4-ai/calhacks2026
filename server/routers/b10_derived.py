"""B10 · numbers derived from the ledger (`b10-derived`).

POST /api/b10/derive takes one scripted trigger (split.shown, receipt.updated, statement.issued or
impact.updated) and the records from src/mock, recomputes the trigger's figures with the money
rules in data-model.md, and returns that one event with `source: "live"`. No key, no network.

Money rules, one function per channel (rates in basis points, half up, once per line):
- ch_cindia:  card fee 290 bps + 30, platform fee 1000 bps, maker share = gross - card - platform - materials
- ch_site:    card fee 290 bps + 30, maker share = gross - card - materials
- ch_gallery: commission at the contract's commissionBps, maker share = gross - commission - materials

Where the other figures come from:
- receipt.updated: `paid_to_maker` once the maker payout carrying the order is `sent`, with
  `paidDate` from that payout's `date` or else its maker_pay ledger entry. `received` before.
- statement.issued: the maker's paid orders whose channel payout lands in the month, each share
  recomputed. The held amount is the gallery's unpaid receivable in the ledger (owed by contract
  less what the gallery paid), shared across the gallery orders by what each one is owed. The
  payout date is the maker payout's maker_pay ledger entry.
- impact.updated: the maker share over Cindia sales, weighted by sale, and the days from the
  month's last day to the maker payout in the ledger. The two estimates are copied from the trigger.
"""

from __future__ import annotations

import calendar
import datetime as dt
import itertools
import threading
from typing import Any, Callable, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from server import ApiError

router = APIRouter(prefix="/api/b10")

KEY = "b10-derived"
TYPES = ("split.shown", "receipt.updated", "statement.issued", "impact.updated")
CARD_BPS = 290
CARD_FIXED_CENTS = 30
PLATFORM_BPS = 1000
GALLERY_CHANNEL = "ch_gallery"

# evt_live_ plus a number, unique within the server process. B10's numbers start at 1000001 so
# they never meet another router's counter.
_ids = itertools.count(1000001)
_ids_lock = threading.Lock()


def _next_id() -> str:
    with _ids_lock:
        return f"evt_live_{next(_ids)}"


class Records(BaseModel):
    model_config = ConfigDict(extra="allow")

    catalog: list[dict[str, Any]]
    orders: list[dict[str, Any]]
    payouts: list[dict[str, Any]]
    makerPayouts: list[dict[str, Any]]
    ledger: list[dict[str, Any]]
    contracts: list[dict[str, Any]]


class DeriveRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    trigger: Optional[dict[str, Any]]
    records: Records
    # The channel a split is shown for. The buyer browses Cindia, so that's the default.
    channelId: str = "ch_cindia"


# ---------------------------------------------------------------------------------------------
# Small readers. A wrong type is the caller's mistake (bad_request).


def _int(rec: dict[str, Any], field: str) -> int:
    v = rec.get(field)
    if isinstance(v, bool) or not isinstance(v, int):
        raise ApiError("bad_request", f"The field {field} must be an integer.")
    return v


def _str(rec: dict[str, Any], field: str) -> str:
    v = rec.get(field)
    if not isinstance(v, str) or not v:
        raise ApiError("bad_request", f"The field {field} must be a non-empty string.")
    return v


def _index(items: list[dict[str, Any]], what: str) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for it in items:
        out[_str(it, "id")] = it
    return out


def _date(iso: str) -> dt.date:
    try:
        return dt.date.fromisoformat(iso)
    except ValueError:
        raise ApiError("bad_request", f"The date {iso} isn't a YYYY-MM-DD date.") from None


# ---------------------------------------------------------------------------------------------
# The money rules.


def bps(amount_cents: int, rate_bps: int) -> int:
    """amount x rate in basis points, rounded half up once."""
    return (amount_cents * rate_bps + 5000) // 10000


def card_fee(gross_cents: int) -> int:
    return bps(gross_cents, CARD_BPS) + CARD_FIXED_CENTS


def split_cindia(gross: int, materials: int, _commission_bps: int) -> dict[str, int]:
    card = card_fee(gross)
    platform = bps(gross, PLATFORM_BPS)
    return {"cardFeeCents": card, "platformFeeCents": platform, "commissionCents": 0, "makerShareCents": gross - card - platform - materials}


def split_site(gross: int, materials: int, _commission_bps: int) -> dict[str, int]:
    card = card_fee(gross)
    return {"cardFeeCents": card, "platformFeeCents": 0, "commissionCents": 0, "makerShareCents": gross - card - materials}


def split_gallery(gross: int, materials: int, commission_bps: int) -> dict[str, int]:
    commission = bps(gross, commission_bps)
    return {"cardFeeCents": 0, "platformFeeCents": 0, "commissionCents": commission, "makerShareCents": gross - commission - materials}


RULES: dict[str, Callable[[int, int, int], dict[str, int]]] = {
    "ch_cindia": split_cindia,
    "ch_site": split_site,
    "ch_gallery": split_gallery,
}


class Books:
    """The records of one request, indexed, with the money rules applied to them."""

    def __init__(self, records: Records):
        self.pieces = _index(records.catalog, "piece")
        self.orders = _index(records.orders, "order")
        self.payouts = records.payouts
        self.maker_payouts = records.makerPayouts
        self.ledger = records.ledger
        self.contracts = records.contracts

    def piece(self, piece_id: str) -> dict[str, Any]:
        p = self.pieces.get(piece_id)
        if p is None:
            raise ApiError("not_found", f"The piece {piece_id} isn't in the catalog.")
        return p

    def order(self, order_id: str) -> dict[str, Any]:
        o = self.orders.get(order_id)
        if o is None:
            raise ApiError("not_found", f"The order {order_id} isn't in the records.")
        return o

    def commission_bps(self, channel_id: str) -> int:
        for c in self.contracts:
            if c.get("channelId") == channel_id:
                return _int(c, "commissionBps")
        if channel_id == GALLERY_CHANNEL:
            raise ApiError("not_found", "The records have no contract for the gallery.")
        return 0

    def split(self, piece_id: str, channel_id: str, gross: Optional[int] = None) -> dict[str, int]:
        rule = RULES.get(channel_id)
        if rule is None:
            raise ApiError("not_found", f"The channel {channel_id} has no money rule.")
        p = self.piece(piece_id)
        gross_cents = _int(p, "priceCents") if gross is None else gross
        materials = _int(p, "materialsCents")
        out = rule(gross_cents, materials, self.commission_bps(channel_id))
        return {"grossCents": gross_cents, "materialsCents": materials, **out}

    def order_split(self, order: dict[str, Any]) -> dict[str, int]:
        return self.split(_str(order, "pieceId"), _str(order, "channelId"), _int(order, "grossCents"))

    def maker_of(self, order: dict[str, Any]) -> str:
        return _str(self.piece(_str(order, "pieceId")), "makerId")

    def payout_for_order(self, order_id: str) -> Optional[dict[str, Any]]:
        for p in self.payouts:
            if order_id in (p.get("orderIds") or []):
                return p
        return None

    def maker_payout_for_order(self, order_id: str) -> Optional[dict[str, Any]]:
        for mp in self.maker_payouts:
            if order_id in (mp.get("orderIds") or []):
                return mp
        return None

    def maker_payout_for(self, maker_id: str, month_id: Optional[str]) -> Optional[dict[str, Any]]:
        for mp in self.maker_payouts:
            if mp.get("makerId") == maker_id and (month_id is None or mp.get("monthId") == month_id):
                return mp
        return None

    def ledger_date(self, ref_id: str, account: str) -> Optional[str]:
        for e in self.ledger:
            if e.get("refId") == ref_id and e.get("account") == account:
                return _str(e, "date")
        return None

    def paid_date(self, maker_payout: dict[str, Any]) -> Optional[str]:
        d = maker_payout.get("date")
        if isinstance(d, str) and d:
            return d
        return self.ledger_date(_str(maker_payout, "id"), "maker_pay")

    def gallery_held(self) -> dict[str, int]:
        """What the gallery still owes, per gallery order, from receivable_gallery in the ledger.

        Each gallery order's journal debits what the contract says the gallery owes for it. The
        gallery's payment credits the account. What's left is shared across the orders by what each
        one is owed, half up, with any rounding remainder on the largest share, so the parts add
        up to the total to the cent.
        """
        owed: dict[str, int] = {}
        paid = 0
        for e in self.ledger:
            if e.get("account") != "receivable_gallery":
                continue
            ref = _str(e, "refId")
            debit, credit = _int(e, "debitCents"), _int(e, "creditCents")
            if ref in self.orders:
                owed[ref] = owed.get(ref, 0) + debit - credit
            else:
                paid += credit - debit
        short = sum(owed.values()) - paid
        if short <= 0 or not owed:
            return {oid: 0 for oid in owed}
        total_owed = sum(owed.values())
        parts = {oid: (short * amt * 2 + total_owed) // (2 * total_owed) for oid, amt in owed.items()}
        rest = short - sum(parts.values())
        if rest:
            biggest = max(owed, key=lambda oid: owed[oid])
            parts[biggest] += rest
        return parts


def _month_end(month_id: str) -> dt.date:
    try:
        y, m = (int(x) for x in month_id.split("-"))
        return dt.date(y, m, calendar.monthrange(y, m)[1])
    except (ValueError, TypeError):
        raise ApiError("bad_request", f"The month {month_id} isn't a YYYY-MM month.") from None


# ---------------------------------------------------------------------------------------------
# The four derivations. Each takes the trigger's payload and returns the recomputed payload.


def derive_split(books: Books, payload: dict[str, Any], channel_id: str) -> dict[str, Any]:
    s = books.split(_str(payload, "pieceId"), channel_id)
    return {
        "pieceId": payload["pieceId"],
        "grossCents": s["grossCents"],
        "cardFeeCents": s["cardFeeCents"],
        "platformFeeCents": s["platformFeeCents"],
        "materialsCents": s["materialsCents"],
        "makerShareCents": s["makerShareCents"],
    }


def derive_receipt(books: Books, payload: dict[str, Any]) -> dict[str, Any]:
    order = books.order(_str(payload, "orderId"))
    out: dict[str, Any] = {
        "orderId": order["id"],
        "status": "received",
        "makerId": books.maker_of(order),
        "makerShareCents": books.order_split(order)["makerShareCents"],
    }
    mp = books.maker_payout_for_order(order["id"])
    if mp is not None and mp.get("status") == "sent":
        paid = books.paid_date(mp)
        if paid:
            out["status"] = "paid_to_maker"
            out["paidDate"] = paid
    return out


def _statement_month(books: Books, maker_id: str) -> str:
    mp = books.maker_payout_for(maker_id, None)
    if mp is not None and isinstance(mp.get("monthId"), str):
        return mp["monthId"]
    raise ApiError("not_found", f"The records have no maker payout for {maker_id}.")


def derive_statement(books: Books, payload: dict[str, Any]) -> dict[str, Any]:
    maker_id = _str(payload, "makerId")
    month_id = _statement_month(books, maker_id)
    month_end = _month_end(month_id)
    held_by_order = books.gallery_held()

    lines: list[dict[str, Any]] = []
    held = 0
    for order in books.orders.values():
        if books.maker_of(order) != maker_id or order.get("status") != "paid":
            continue
        if not _str(order, "date").startswith(month_id):
            continue
        payout = books.payout_for_order(order["id"])
        if payout is None or _date(_str(payout, "date")) > month_end:
            continue  # the money hasn't arrived by the close, so it pays next month
        lines.append({"orderId": order["id"], "pieceId": order["pieceId"], "makerShareCents": books.order_split(order)["makerShareCents"]})
        held += held_by_order.get(order["id"], 0)

    mp = books.maker_payout_for(maker_id, month_id)
    payout_date = books.paid_date(mp) if mp is not None else None
    if not payout_date:
        payout_date = _str(payload, "payoutDate")
    return {
        "makerStatementId": _str(payload, "makerStatementId"),
        "makerId": maker_id,
        "lines": lines,
        "totalCents": sum(line["makerShareCents"] for line in lines),
        "heldCents": held,
        "payoutDate": payout_date,
    }


def derive_impact(books: Books, payload: dict[str, Any]) -> dict[str, Any]:
    cindia = [o for o in books.orders.values() if o.get("channelId") == "ch_cindia"]
    gross = sum(_int(o, "grossCents") for o in cindia)
    if gross <= 0:
        raise ApiError("not_found", "The records have no Cindia sales to average over.")
    share = sum(books.order_split(o)["makerShareCents"] for o in cindia)
    maker_share_bps = (share * 10000 * 2 + gross) // (2 * gross)

    pay_dates = [books.paid_date(mp) for mp in books.maker_payouts]
    pay_dates = [d for d in pay_dates if d]
    months = sorted({mp.get("monthId") for mp in books.maker_payouts if isinstance(mp.get("monthId"), str)})
    if not pay_dates or not months:
        raise ApiError("not_found", "The records have no maker payout in the ledger.")
    close = _month_end(months[0])
    days = (_date(max(pay_dates)) - close).days

    return {
        "impactId": _str(payload, "impactId"),
        "makerShareBps": maker_share_bps,
        "daysCloseToPayout": days,
        # Estimates the dataset doesn't measure: copied from the trigger, still marked as estimates.
        "daysCloseToPayoutBefore": _int(payload, "daysCloseToPayoutBefore"),
        "bookkeepingHoursSaved": _int(payload, "bookkeepingHoursSaved"),
        "estimate": True,
    }


def derive(trigger: dict[str, Any], records: Records, channel_id: str = "ch_cindia") -> dict[str, Any]:
    """The trigger's event, recomputed from the records."""
    etype = trigger.get("type")
    payload = trigger.get("payload")
    if etype not in TYPES:
        raise ApiError("bad_request", "The trigger must be a split.shown, receipt.updated, statement.issued or impact.updated event.")
    if not isinstance(payload, dict):
        raise ApiError("bad_request", "The trigger has no payload.")
    books = Books(records)
    if etype == "split.shown":
        out = derive_split(books, payload, channel_id)
    elif etype == "receipt.updated":
        out = derive_receipt(books, payload)
    elif etype == "statement.issued":
        out = derive_statement(books, payload)
    else:
        out = derive_impact(books, payload)
    at = trigger.get("at", 0)
    if isinstance(at, bool) or not isinstance(at, (int, float)):
        at = 0
    return {"id": _next_id(), "type": etype, "at": at, "source": "live", "key": KEY, "payload": out}


@router.post("/derive")
def derive_route(body: DeriveRequest) -> dict:
    if body.trigger is None:
        raise ApiError("bad_request", "B10 needs a trigger event to know which figures to compute.")
    return {"events": [derive(body.trigger, body.records, body.channelId)]}
