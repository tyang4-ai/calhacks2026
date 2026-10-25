"""B04 · Nessie, the co-op's bank account (`b04-bank`). api-contract.md, B04.

Routes, all needing NESSIE_KEY (503 `key_missing` without it):
- GET  /api/b04/status    { seeded, accountId, balanceCents }, not an events response.
- POST /api/b04/seed      finds or creates the customer "Dine Weaving and Silver Co-op" and its
                          Checking account "Dine co-op operating", then posts September's history.
- POST /api/b04/sale      one deposit for the buyer's sale, read back, plus the account's balance.
- POST /api/b04/payouts   one withdrawal per maker payout, read back, plus the account's balance.

How the balance is read. The account is created with a balance of 0, and the opening balance is
posted as a deposit dated the day before the month starts. `account.synced` carries the account's
balance as of a date, summed from Nessie's own deposits and withdrawals up to that date. That
reproduces src/mock's balanceAsOf() exactly (1265648 after the sale on 2026-09-01), whatever
Nessie does with its `balance` field, and it stays right when the demo is replayed.

Idempotency. Every money line carries a unique description, and nothing is created when a record
with that description is already on the account. So a second seed creates nothing, a replayed sale
reuses its deposit, and replayed payouts reuse their withdrawals. The seed posts the opening
deposit last, and `seeded` means the opening deposit is there, so a seed cut short by a timeout
finishes on the next call. (The contract's "does nothing when the account already has deposits"
holds for a finished seed, and this also repairs an unfinished one.)

Nessie errors give 502 `upstream_error`, its timeouts 504 `upstream_timeout`. The adapter then
plays the scripted events.
"""

from __future__ import annotations

import itertools
import re
import threading
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from server import ApiError
from server.routers import b04_nessie as nessie

router = APIRouter(prefix="/api/b04")

KEY = "b04-bank"
# Plain ASCII on purpose: the sandbox bank finds the customer and the account by exact string, so
# these stay "Dine" and not "Diné". B16 imports the constants, so their names don't change.
CUSTOMER_FIRST = "Dine Weaving and Silver"
CUSTOMER_LAST = "Co-op"
# Fictional US mailing address.
CUSTOMER_ADDRESS = {
    "street_number": "1450",
    "street_name": "Grant Avenue",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94133",
}
ACCOUNT_NICKNAME = "Dine co-op operating"
OPENING_DATE = "2026-08-31"
OPENING_DESCRIPTION = "Opening balance std_dine 2026-09"
STUDIO = {"kind": "studio", "id": "std_dine"}

STATUS_BUDGET_S = 7.0
SEED_BUDGET_S = 28.0
SALE_BUDGET_S = 6.5
PAYOUTS_BUDGET_S = 6.5

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# evt_live_ plus a number, unique within the server process. B04's numbers start at 400001 so
# they never meet another router's counter.
_ids = itertools.count(400001)
_ids_lock = threading.Lock()

# The Nessie IDs, kept in memory once found or created.
_state: dict[str, Optional[str]] = {"customer_id": None, "account_id": None}
_state_lock = threading.Lock()
# One request at a time creates records, so two calls never post the same line twice.
_write_lock = threading.Lock()


def _next_id() -> str:
    with _ids_lock:
        return f"evt_live_{next(_ids)}"


def reset_for_tests() -> None:
    with _state_lock:
        _state["customer_id"] = None
        _state["account_id"] = None
    nessie.reset()


# ---------------------------------------------------------------------------------------------
# Request bodies


class HistoryLine(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    date: str
    amountCents: int = Field(gt=0)
    memo: str = ""
    refId: Optional[str] = None


class History(BaseModel):
    model_config = ConfigDict(extra="allow")

    deposits: list[HistoryLine] = []
    withdrawals: list[HistoryLine] = []


class SeedRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    trigger: Optional[dict[str, Any]]
    studio: dict[str, Any] = {}
    history: History


class SaleRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    trigger: Optional[dict[str, Any]]
    orderId: str
    payoutId: str
    netCents: int = Field(gt=0)
    date: str
    description: str = Field(min_length=1)
    # Optional, sent by the adapter so order.placed and the settlement's moveId can be built when
    # the trigger is the other of the two sale events.
    pieceId: Optional[str] = None
    channelId: Optional[str] = None
    buyerId: Optional[str] = None
    grossCents: Optional[int] = None
    moveId: Optional[str] = None


class MakerPayoutLine(BaseModel):
    model_config = ConfigDict(extra="allow")

    makerPayoutId: str
    makerId: str
    amountCents: int = Field(gt=0)
    date: str
    moveId: Optional[str] = None


class PayoutsRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    trigger: Optional[dict[str, Any]]
    makerPayouts: list[MakerPayoutLine] = Field(min_length=1)


# ---------------------------------------------------------------------------------------------
# Helpers


def _require_key() -> None:
    if not nessie.has_key():
        raise ApiError("key_missing", "This upgrade needs NESSIE_KEY, which isn't set.")


def _check_date(value: str, where: str) -> None:
    if not DATE_RE.match(value):
        raise ApiError("bad_request", f"The request body doesn't match the contract at {where}.")


def _at(trigger: Optional[dict[str, Any]]) -> int:
    if isinstance(trigger, dict):
        at = trigger.get("at")
        if isinstance(at, (int, float)) and not isinstance(at, bool) and at >= 0:
            return int(at)
    return 0


def _event(event_type: str, at: int, payload: dict[str, Any]) -> dict[str, Any]:
    return {"id": _next_id(), "type": event_type, "at": at, "source": "live", "key": KEY, "payload": payload}


def _as_api_error(err: nessie.NessieError) -> ApiError:
    return ApiError(err.code, err.message)


def _day(record: dict[str, Any]) -> str:
    value = record.get("transaction_date")
    return value[:10] if isinstance(value, str) else ""


def _amount(record: dict[str, Any]) -> int:
    value = record.get("amount")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    return int(round(value))


def _counts(record: dict[str, Any]) -> bool:
    return str(record.get("status", "completed")).lower() != "cancelled"


def _balance_as_of(deposits: list[dict[str, Any]], withdrawals: list[dict[str, Any]], as_of: Optional[str]) -> int:
    def keep(r: dict[str, Any]) -> bool:
        return _counts(r) and (as_of is None or _day(r) <= as_of)

    return sum(_amount(d) for d in deposits if keep(d)) - sum(_amount(w) for w in withdrawals if keep(w))


def _latest_day(*lists: list[dict[str, Any]]) -> str:
    days = [_day(r) for rows in lists for r in rows if DATE_RE.match(_day(r))]
    return max(days) if days else OPENING_DATE


def _by_description(rows: list[dict[str, Any]], description: str) -> Optional[dict[str, Any]]:
    """The record with this description. The newest one when there are several."""
    found = [r for r in rows if r.get("description") == description and isinstance(r.get("_id"), str)]
    return found[-1] if found else None


def _line_description(line: HistoryLine) -> str:
    memo = line.memo.strip() or (line.refId or "Co-op record")
    return f"{memo} ({line.id})" if line.id else memo


def _find_account(budget: nessie.Budget) -> Optional[str]:
    """The co-op's account ID: cached, or the account nicknamed ACCOUNT_NICKNAME."""
    with _state_lock:
        cached = _state["account_id"]
    if cached:
        return cached
    for acct in nessie.list_accounts(budget):
        if acct.get("nickname") == ACCOUNT_NICKNAME and isinstance(acct.get("_id"), str):
            with _state_lock:
                _state["account_id"] = acct["_id"]
                if isinstance(acct.get("customer_id"), str):
                    _state["customer_id"] = acct["customer_id"]
            return acct["_id"]
    return None


def _find_or_create_customer(budget: nessie.Budget) -> str:
    with _state_lock:
        cached = _state["customer_id"]
    if cached:
        return cached

    def find() -> Optional[str]:
        for c in nessie.list_customers(budget):
            if c.get("first_name") == CUSTOMER_FIRST and c.get("last_name") == CUSTOMER_LAST and isinstance(c.get("_id"), str):
                return c["_id"]
        return None

    customer_id = find()
    if not customer_id:
        nessie.create_customer(budget, CUSTOMER_FIRST, CUSTOMER_LAST, CUSTOMER_ADDRESS)
        customer_id = find()  # the create answers with a string, so read the list back
    if not customer_id:
        raise ApiError("upstream_error", "Nessie didn't list the co-op's customer after creating it.")
    with _state_lock:
        _state["customer_id"] = customer_id
    return customer_id


def _find_or_create_account(budget: nessie.Budget) -> str:
    account_id = _find_account(budget)
    if account_id:
        return account_id
    customer_id = _find_or_create_customer(budget)

    def find() -> Optional[str]:
        for acct in nessie.list_customer_accounts(budget, customer_id):
            if acct.get("nickname") == ACCOUNT_NICKNAME and isinstance(acct.get("_id"), str):
                return acct["_id"]
        return None

    account_id = find()
    if not account_id:
        nessie.create_account(budget, customer_id, ACCOUNT_NICKNAME, balance=0)
        account_id = find()
    if not account_id:
        raise ApiError("upstream_error", "Nessie didn't list the co-op's account after creating it.")
    with _state_lock:
        _state["account_id"] = account_id
    return account_id


def _require_account(budget: nessie.Budget) -> str:
    account_id = _find_account(budget)
    if not account_id:
        raise ApiError("not_found", "The co-op's Nessie account isn't set up yet, so seed it first.")
    return account_id


def _is_seeded(deposits: list[dict[str, Any]]) -> bool:
    """The opening deposit is posted last, so its presence means the whole history is there."""
    return _by_description(deposits, OPENING_DESCRIPTION) is not None


def _synced(at: int, account_id: str, deposits: list, withdrawals: list, as_of: str) -> dict[str, Any]:
    return _event(
        "account.synced",
        at,
        {"accountId": account_id, "balanceCents": _balance_as_of(deposits, withdrawals, as_of), "asOf": as_of},
    )


def _acquire(budget: nessie.Budget) -> None:
    if not _write_lock.acquire(timeout=max(0.0, budget.left() - 0.5)):
        raise ApiError("upstream_timeout", "Another bank call is still running, so this one ran out of time.")


def _forget_account_on_404(err: nessie.NessieError) -> None:
    if err.status == 404:
        with _state_lock:
            _state["account_id"] = None
            _state["customer_id"] = None


# ---------------------------------------------------------------------------------------------
# Routes


@router.get("/status")
def status() -> dict[str, Any]:
    _require_key()
    budget = nessie.Budget(STATUS_BUDGET_S)
    try:
        account_id = _find_account(budget)
        if not account_id:
            return {"seeded": False, "accountId": None, "balanceCents": None}
        deposits = nessie.list_deposits(budget, account_id)
        withdrawals = nessie.list_withdrawals(budget, account_id)
    except nessie.NessieError as err:
        _forget_account_on_404(err)
        raise _as_api_error(err) from None
    return {
        "seeded": _is_seeded(deposits),
        "accountId": account_id,
        "balanceCents": _balance_as_of(deposits, withdrawals, None),
    }


@router.post("/seed")
def seed(body: SeedRequest) -> dict[str, Any]:
    _require_key()
    lines = [("in", l) for l in body.history.deposits] + [("out", l) for l in body.history.withdrawals]
    for i, (_, line) in enumerate(lines):
        _check_date(line.date, f"history line {i + 1}")
    opening = body.studio.get("openingBalanceCents", 0)
    if isinstance(opening, bool) or not isinstance(opening, int) or opening < 0:
        raise ApiError("bad_request", "The request body doesn't match the contract at studio.openingBalanceCents.")
    descriptions = [_line_description(l) for _, l in lines]
    if len(set(descriptions)) != len(descriptions):
        raise ApiError("bad_request", "Two history lines have the same memo and ID.")

    budget = nessie.Budget(SEED_BUDGET_S)
    _acquire(budget)
    try:
        account_id = _find_or_create_account(budget)
        deposits = nessie.list_deposits(budget, account_id)
        withdrawals = nessie.list_withdrawals(budget, account_id)
        if not _is_seeded(deposits):
            have_in = {d.get("description") for d in deposits}
            have_out = {w.get("description") for w in withdrawals}
            posted = False
            for (direction, line), description in zip(lines, descriptions):
                if direction == "in" and description not in have_in:
                    nessie.create_deposit(budget, account_id, line.amountCents, line.date, description)
                    posted = True
                elif direction == "out" and description not in have_out:
                    nessie.create_withdrawal(budget, account_id, line.amountCents, line.date, description)
                    posted = True
            # The opening deposit goes last: it marks the account as fully seeded.
            if opening > 0:
                nessie.create_deposit(budget, account_id, opening, OPENING_DATE, OPENING_DESCRIPTION)
                posted = True
            if posted:
                deposits = nessie.list_deposits(budget, account_id)
                withdrawals = nessie.list_withdrawals(budget, account_id)
    except nessie.NessieError as err:
        _forget_account_on_404(err)
        raise _as_api_error(err) from None
    finally:
        _write_lock.release()

    as_of = _latest_day(deposits, withdrawals)
    return {"events": [_synced(_at(body.trigger), account_id, deposits, withdrawals, as_of)]}


def _order_payload(body: SaleRequest) -> Optional[dict[str, Any]]:
    trig = body.trigger
    if isinstance(trig, dict) and trig.get("type") == "order.placed" and isinstance(trig.get("payload"), dict):
        p = trig["payload"]
        fields = ("orderId", "pieceId", "channelId", "buyerId", "grossCents", "date")
        if all(f in p for f in fields):
            return {f: p[f] for f in fields}
    if body.pieceId and body.channelId and body.buyerId and isinstance(body.grossCents, int):
        return {
            "orderId": body.orderId,
            "pieceId": body.pieceId,
            "channelId": body.channelId,
            "buyerId": body.buyerId,
            "grossCents": body.grossCents,
            "date": body.date,
        }
    return None


def _settlement_move_id(body: SaleRequest) -> str:
    trig = body.trigger
    if isinstance(trig, dict) and trig.get("type") == "money.moved" and isinstance(trig.get("payload"), dict):
        move_id = trig["payload"].get("moveId")
        if isinstance(move_id, str) and move_id:
            return move_id
    return body.moveId or "mv_0003"


@router.post("/sale")
def sale(body: SaleRequest) -> dict[str, Any]:
    _require_key()
    _check_date(body.date, "date")
    order = _order_payload(body)
    if order is not None and order["orderId"] != body.orderId:
        raise ApiError("bad_request", "The trigger's orderId isn't the request's orderId.")

    budget = nessie.Budget(SALE_BUDGET_S)
    _acquire(budget)
    try:
        account_id = _require_account(budget)
        deposits = nessie.list_deposits(budget, account_id)
        deposit = _by_description(deposits, body.description)
        if deposit is None:
            nessie.create_deposit(budget, account_id, body.netCents, body.date, body.description)
            deposits = nessie.list_deposits(budget, account_id)  # the create answers with a string
            deposit = _by_description(deposits, body.description)
        if deposit is None:
            raise ApiError("upstream_error", "Nessie didn't list the sale's deposit after creating it.")
        if _amount(deposit) != body.netCents:
            raise ApiError("upstream_error", "Nessie's deposit for the sale has a different amount.")
        withdrawals = nessie.list_withdrawals(budget, account_id)
    except nessie.NessieError as err:
        _forget_account_on_404(err)
        raise _as_api_error(err) from None
    finally:
        _write_lock.release()

    at = _at(body.trigger)
    events: list[dict[str, Any]] = []
    if order is not None:
        events.append(_event("order.placed", at, order))
    events.append(
        _event(
            "money.moved",
            at,
            {
                "moveId": _settlement_move_id(body),
                "kind": "settlement",
                "from": {"kind": "cindia"},
                "to": dict(STUDIO),
                "amountCents": body.netCents,
                "refId": body.payoutId,
                "date": body.date,
                "nessieId": deposit["_id"],
            },
        )
    )
    events.append(_synced(at, account_id, deposits, withdrawals, body.date))
    return {"events": events}


def _payout_description(line: MakerPayoutLine) -> str:
    return f"Maker payout {line.makerPayoutId}"


@router.post("/payouts")
def payouts(body: PayoutsRequest) -> dict[str, Any]:
    _require_key()
    ids = [p.makerPayoutId for p in body.makerPayouts]
    if len(set(ids)) != len(ids):
        raise ApiError("bad_request", "Two maker payouts have the same makerPayoutId.")
    for i, p in enumerate(body.makerPayouts):
        _check_date(p.date, f"makerPayouts.{i}.date")

    budget = nessie.Budget(PAYOUTS_BUDGET_S)
    _acquire(budget)
    try:
        account_id = _require_account(budget)
        withdrawals = nessie.list_withdrawals(budget, account_id)
        created = False
        for p in body.makerPayouts:
            if _by_description(withdrawals, _payout_description(p)) is None:
                nessie.create_withdrawal(budget, account_id, p.amountCents, p.date, _payout_description(p))
                created = True
        if created:
            withdrawals = nessie.list_withdrawals(budget, account_id)  # creates answer with a string
        found: list[dict[str, Any]] = []
        for p in body.makerPayouts:
            w = _by_description(withdrawals, _payout_description(p))
            if w is None:
                raise ApiError("upstream_error", "Nessie didn't list a maker payout after creating it.")
            if _amount(w) != p.amountCents:
                raise ApiError("upstream_error", "Nessie's withdrawal for a maker payout has a different amount.")
            found.append(w)
        deposits = nessie.list_deposits(budget, account_id)
    except nessie.NessieError as err:
        _forget_account_on_404(err)
        raise _as_api_error(err) from None
    finally:
        _write_lock.release()

    at = _at(body.trigger)
    events: list[dict[str, Any]] = []
    for p in body.makerPayouts:
        events.append(
            _event(
                "payout.sent",
                at,
                {"makerPayoutId": p.makerPayoutId, "makerId": p.makerId, "amountCents": p.amountCents, "date": p.date},
            )
        )
    for i, (p, w) in enumerate(zip(body.makerPayouts, found)):
        events.append(
            _event(
                "money.moved",
                at,
                {
                    "moveId": p.moveId or f"mv_{4 + i:04d}",
                    "kind": "maker_pay",
                    "from": dict(STUDIO),
                    "to": {"kind": "maker", "id": p.makerId},
                    "amountCents": p.amountCents,
                    "refId": p.makerPayoutId,
                    "date": p.date,
                    "nessieId": w["_id"],
                },
            )
        )
    as_of = max(p.date for p in body.makerPayouts)
    events.append(_synced(at, account_id, deposits, withdrawals, as_of))
    return {"events": events}
