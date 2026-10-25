"""B16 · the books checked against the bank, on Nessie (`b16-bank-books`). api-contract.md, B16.

Routes, all needing NESSIE_KEY (503 `key_missing` without it):
- GET  /api/b16/status     from a cache a background thread refreshes every 30 s while asked.
                           Not an events response.
- POST /api/b16/seed       finds or creates `Community fund prj_01` and `Commissions held by Cindia`
                           under the co-op's customer, and posts the held account's opening deposit
                           once. 404 `not_found` without B04's operating account.
- POST /api/b16/reconcile  B01's body. Reads the operating account's deposits and withdrawals back
                           from Nessie and runs B01's `reconcile_month()` over the request's records
                           with them. Every flag.raised it finds, each with the `nessieId` of the
                           deposit the statement was checked against.
- POST /api/b16/moves      posts a `project_fund` move to a `community_fund` as a deposit on the fund
                           account, or a `milestone` move as a withdrawal from the held account, and
                           returns the trigger's money.moved plus `nessieId`.

B16 never writes B04's operating account and never emits `account.synced`. One request at a time
writes to Nessie. Nessie errors give 502 `upstream_error`, its timeouts 504 `upstream_timeout`.
When the bank's answer disagrees with the event (another amount, a missing record), the endpoint
returns `{ "events": [] }`, so the scripted figure keeps its Simulated badge.
"""

from __future__ import annotations

import itertools
import threading
import time
from typing import Any, Callable, Literal, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field, StrictInt

from server import ApiError
from server.b16_bank_books import accounts, books
from server.routers import b01_match
from server.routers import b04_nessie as nessie

router = APIRouter(prefix="/api/b16")

KEY = "b16-bank-books"
MAX_BODY_BYTES = 2 * 1024 * 1024
DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"

SEED_BUDGET_S = 18.5  # the adapter's seed fetch gives up at 20 s
RECONCILE_BUDGET_S = 4.5  # under 5 s
MOVES_BUDGET_S = 5.5  # under 6 s

# evt_live_ plus 16, the server's start time as six digits and a four-digit count (D1-52).
_START = f"{int(time.time()) % 1_000_000:06d}"
_counter = itertools.count(1)
_counter_lock = threading.Lock()

# One request at a time writes to Nessie (B04's pattern, with B16's own lock).
_write_lock = threading.Lock()


def _next_id() -> str:
    with _counter_lock:
        n = next(_counter)
    return f"evt_live_16{_START}{n:04d}"


def reset_for_tests() -> None:
    accounts.reset_for_tests()
    nessie.reset()


# ---------------------------------------------------------------------------------------------
# Process status (C-4), through B13's ordered queue when its bridge is importable


def _bridge_process(process_id: str, status: str, count: int = 0) -> None:
    try:
        from server.b13_spacetime import bridge
    except Exception:
        return
    try:
        if bridge.available():
            bridge.set_process(process_id, status, count)
    except Exception:
        pass


# A seam: tests swap it for a recorder.
PROCESS: Callable[[str, str, int], None] = _bridge_process


def _process(process_id: str, status: str, count: int) -> None:
    try:
        PROCESS(process_id, status, count)
    except Exception:
        pass


# ---------------------------------------------------------------------------------------------
# Request bodies


class Commission(BaseModel):
    model_config = ConfigDict(extra="ignore")

    wipId: str = Field(pattern=r"^wip_[A-Za-z0-9_]+$", max_length=40)
    priceCents: StrictInt = Field(gt=0)


class SeedRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: Optional[dict[str, Any]]
    commission: Commission


class ReconcileRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: Optional[dict[str, Any]]
    monthId: str
    records: b01_match.Records


PartyKind = Literal["buyer", "cindia", "card_network", "studio", "maker", "gallery", "processor", "supplier", "community_fund"]
MoveKind = Literal["sale", "fee", "settlement", "payout_in", "materials", "maker_pay", "refund", "project_fund", "milestone"]


class Party(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: PartyKind
    id: Optional[str] = Field(default=None, min_length=1, max_length=100)


class MovePayload(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    moveId: str = Field(min_length=1, max_length=100)
    kind: MoveKind
    from_: Party = Field(alias="from")
    to: Party
    amountCents: StrictInt = Field(gt=0)
    refId: str = Field(min_length=1, max_length=100)
    date: str = Field(pattern=DATE_PATTERN)
    nessieId: Optional[str] = None


class MoveTrigger(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["money.moved"]
    payload: MovePayload


class MovesRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: MoveTrigger


# ---------------------------------------------------------------------------------------------
# Helpers


def _require_key() -> None:
    if not nessie.has_key():
        raise ApiError("key_missing", "This upgrade needs NESSIE_KEY, which isn't set.")


def _check_size(request: Request) -> None:
    length = request.headers.get("content-length")
    if length is not None and length.isdigit() and int(length) > MAX_BODY_BYTES:
        raise ApiError("bad_request", "The request body is larger than 2 MB.")


def _at(trigger: Any) -> int | float:
    at = trigger.get("at") if isinstance(trigger, dict) else None
    return at if isinstance(at, (int, float)) and not isinstance(at, bool) and at >= 0 else 0


def _event(event_type: str, at: int | float, payload: dict[str, Any]) -> dict[str, Any]:
    return {"id": _next_id(), "type": event_type, "at": at, "source": "live", "key": KEY, "payload": payload}


def _as_api_error(err: nessie.NessieError) -> ApiError:
    accounts.forget_on_404(err)
    return ApiError(err.code, err.message)


def _acquire(budget: nessie.Budget) -> None:
    if not _write_lock.acquire(timeout=max(0.0, budget.left() - 0.5)):
        raise ApiError("upstream_timeout", "Another bank call is still running, so this one ran out of time.")


# ---------------------------------------------------------------------------------------------
# Routes


@router.get("/status")
def status() -> dict[str, Any]:
    _require_key()
    return accounts.cached_status()


@router.post("/seed")
def seed(body: SeedRequest, request: Request) -> dict[str, Any]:
    _require_key()
    _check_size(request)
    budget = nessie.Budget(SEED_BUDGET_S)
    _acquire(budget)  # single flight: a second seed waits, then finds everything there
    try:
        accounts.seed(budget, body.commission.wipId, body.commission.priceCents)
    except nessie.NessieError as err:
        raise _as_api_error(err) from None
    finally:
        _write_lock.release()
    # Refresh the cached status with what's left of the budget, so the next health() sees it.
    try:
        accounts.refresh_status(budget)
    except Exception:
        accounts.kick()
    return {"events": []}


def _same_figures(flag: dict[str, Any], trigger_payload: dict[str, Any]) -> bool:
    for field in ("expectedCents", "actualCents", "deltaCents", "recordIds"):
        if field in trigger_payload and flag.get(field) != trigger_payload[field]:
            return False
    return True


@router.post("/reconcile")
def reconcile(body: ReconcileRequest, request: Request) -> dict[str, Any]:
    _require_key()
    _check_size(request)
    if not b01_match.MONTH_RE.match(body.monthId):
        raise ApiError("bad_request", "monthId must look like 2026-09.")
    records = body.records.model_dump()
    records.pop("bankTxns", None)  # the bank side comes from Nessie
    try:
        books.check_records(body.monthId, records)
    except ValueError as exc:
        raise ApiError("bad_request", str(exc)) from None

    budget = nessie.Budget(RECONCILE_BUDGET_S)
    _process("reconcile", "working", 1)
    try:
        account_id = accounts.operating_id(budget)
        if not account_id:
            raise ApiError("not_found", accounts.NOT_SET_UP)
        deposits = nessie.list_deposits(budget, account_id)
        withdrawals = nessie.list_withdrawals(budget, account_id)
    except nessie.NessieError as err:
        raise _as_api_error(err) from None
    finally:
        _process("reconcile", "done", 0)

    trigger = body.trigger if isinstance(body.trigger, dict) else None
    try:
        flags = books.reconcile(body.monthId, records, deposits, withdrawals, ids=b01_match._trigger_picker(trigger))
    except ValueError as exc:
        raise ApiError("bad_request", str(exc)) from None

    # The flag that checks the trigger must agree with it, or nothing live is added.
    t_payload = trigger.get("payload") if trigger and trigger.get("type") == "flag.raised" else None
    if isinstance(t_payload, dict) and isinstance(t_payload.get("flagId"), str):
        twin = next((f["payload"] for f in flags if f["payload"]["flagId"] == t_payload["flagId"]), None)
        if twin is None or not _same_figures(twin, t_payload):
            return {"events": []}

    at = _at(trigger)
    return {"events": [_event("flag.raised", at, f["payload"]) for f in flags]}


@router.post("/moves")
def moves(body: MovesRequest, request: Request) -> dict[str, Any]:
    _require_key()
    _check_size(request)
    move = body.trigger.payload
    if move.kind == "project_fund" and move.to.kind == "community_fund":
        if not move.to.id:
            raise ApiError("bad_request", "A community fund move needs the project's ID in to.id.")
        if move.to.id != accounts.FUND_PROJECT_ID:
            return {"events": []}  # only prj_01's fund has a Nessie account
        direction, label = "in", "Community fund"
    elif move.kind == "milestone" and move.from_.kind == "cindia":
        direction, label = "out", "Milestone release"
    else:
        raise ApiError("bad_request", "Only a project_fund move to a community_fund or a milestone move from Cindia posts to the bank.")
    description = f"{label} {move.refId} ({move.moveId})"

    budget = nessie.Budget(MOVES_BUDGET_S)
    _process("money", "working", 1)
    try:
        _acquire(budget)
        try:
            found = accounts.ids(budget)
            if not found.operating_id:
                raise ApiError("not_found", accounts.NOT_SET_UP)
            account_id = found.fund_id if direction == "in" else found.held_id
            if not account_id:
                raise ApiError("not_found", accounts.B16_NOT_SET_UP)
            record = accounts.post_once(budget, direction, account_id, move.amountCents, move.date, description)
        except nessie.NessieError as err:
            raise _as_api_error(err) from None
        finally:
            _write_lock.release()
    finally:
        _process("money", "done", 0)

    # The bank must agree with the event: the record is listed, counts, and has the same amount.
    if record is None or not books.counts(record) or books.amount(record) != move.amountCents:
        return {"events": []}
    accounts.kick()
    payload = move.model_dump(by_alias=True, exclude_unset=True, exclude_none=True)
    payload["nessieId"] = record["_id"]
    return {"events": [_event("money.moved", _at(body.trigger.model_dump()), payload)]}
