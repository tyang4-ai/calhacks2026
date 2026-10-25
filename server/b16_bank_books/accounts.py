"""B16 T2 · the co-op's Nessie accounts.

Every call goes through B04's client (`server/routers/b04_nessie.py`): its key handling, base URL
discovery, Budget, 5-second timeouts and errors. Nothing here prints, logs or returns the key or a
URL.

- The co-op's operating account is B04's, found by `b04_bank.ACCOUNT_NICKNAME` in one
  `GET /accounts`, and the co-op's customer is that account's `customer_id`. B16 never writes it:
  `post_once()` refuses the operating account, so B04's `account.synced` figures stay exact.
- B16 adds two Checking accounts under the same fictional customer, found or created by nickname:
  `Community fund prj_01` (opened at 0) and `Commissions held by Cindia`, opened with one deposit of
  the commission's price, described `Commission wip_01 paid in` and dated 2026-09-01.
- Creates answer with a plain string, so every create is followed by a read of the list.
- The status cache: `cached_status()` answers at once from memory, and a background thread
  refreshes it every 30 seconds while someone keeps asking (the adapter's health() in live mode),
  then stops after two idle minutes. One refresh is one account list, the operating account's
  deposits until its opening deposit has been seen once, then each B16 account's deposits and
  withdrawals.
"""

from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass
from typing import Any, Optional

from server import ApiError
from server.b16_bank_books import books
from server.routers import b04_bank
from server.routers import b04_nessie as nessie

log = logging.getLogger("cindia")

FUND_PROJECT_ID = "prj_01"
FUND_NICKNAME = f"Community fund {FUND_PROJECT_ID}"
HELD_NICKNAME = "Commissions held by Cindia"
HELD_OPENING_DATE = "2026-09-01"
HELD_OPENING_RE = re.compile(r"^Commission [a-z]+_[A-Za-z0-9_]+ paid in$")

REFRESH_EVERY_S = 30.0
IDLE_STOP_S = 120.0
REFRESH_BUDGET_S = 15.0

NOT_SET_UP = "The co-op's Nessie account isn't set up yet, so B04 seeds it first."
B16_NOT_SET_UP = "B16's Nessie accounts aren't set up yet, so B16 seeds them first."


def held_opening_description(wip_id: str) -> str:
    return f"Commission {wip_id} paid in"


@dataclass
class Found:
    customer_id: Optional[str] = None
    operating_id: Optional[str] = None
    fund_id: Optional[str] = None
    held_id: Optional[str] = None


_state = Found()
_state_lock = threading.Lock()
# The operating account whose opening deposit has been seen, so the status refresh reads its
# deposits only until then.
_operating_confirmed: Optional[str] = None


def reset_for_tests() -> None:
    global _state, _operating_confirmed, _snapshot, _last_asked
    stop_refresher()
    with _state_lock:
        _state = Found()
        _operating_confirmed = None
    with _snap_lock:
        _snapshot = None
        _last_asked = 0.0


def forget() -> None:
    """Forget every cached account ID, as after a 404 from Nessie."""
    global _state, _operating_confirmed
    with _state_lock:
        _state = Found()
        _operating_confirmed = None


def forget_on_404(err: nessie.NessieError) -> None:
    if err.status == 404:
        forget()


def _first(accounts: list[dict[str, Any]], nickname: str, customer_id: Optional[str] = None) -> Optional[dict[str, Any]]:
    for acct in accounts:
        if acct.get("nickname") != nickname or not isinstance(acct.get("_id"), str):
            continue
        if customer_id is not None and acct.get("customer_id") != customer_id:
            continue
        return acct
    return None


def _read(accounts: list[dict[str, Any]]) -> Found:
    operating = _first(accounts, b04_bank.ACCOUNT_NICKNAME)
    if operating is None:
        return Found()
    customer_id = operating.get("customer_id") if isinstance(operating.get("customer_id"), str) else None
    fund = _first(accounts, FUND_NICKNAME, customer_id) if customer_id else None
    held = _first(accounts, HELD_NICKNAME, customer_id) if customer_id else None
    return Found(
        customer_id=customer_id,
        operating_id=operating["_id"],
        fund_id=fund["_id"] if fund else None,
        held_id=held["_id"] if held else None,
    )


def find(budget: nessie.Budget) -> Found:
    """One GET /accounts: B04's operating account, its customer and B16's two accounts."""
    global _state
    found = _read(nessie.list_accounts(budget))
    with _state_lock:
        _state = found
    return Found(**vars(found))


def ids(budget: nessie.Budget) -> Found:
    """The cached IDs when all four are known, otherwise a fresh find()."""
    with _state_lock:
        cached = Found(**vars(_state))
    if cached.operating_id and cached.customer_id and cached.fund_id and cached.held_id:
        return cached
    return find(budget)


def operating_id(budget: nessie.Budget) -> Optional[str]:
    """B04's operating account, cached or found."""
    with _state_lock:
        cached = _state.operating_id
    return cached or find(budget).operating_id


def by_description(rows: list[dict[str, Any]], description: str) -> Optional[dict[str, Any]]:
    """The record with this description, the newest when there are several (as B04 does)."""
    found = [r for r in rows if r.get("description") == description and isinstance(r.get("_id"), str)]
    return found[-1] if found else None


def _guard(account_id: str) -> None:
    """B16 never writes B04's operating account."""
    with _state_lock:
        operating = _state.operating_id
    if not account_id or account_id == operating:
        raise ApiError("internal", "B16 never writes the co-op's operating account.")


# ---------------------------------------------------------------------------------------------
# The seed


def _find_or_create(budget: nessie.Budget, found: Found) -> Found:
    """B16's two accounts under the co-op's customer, created when missing and read back."""
    global _state
    assert found.customer_id
    created = False
    if not found.fund_id:
        nessie.create_account(budget, found.customer_id, FUND_NICKNAME, balance=0)
        created = True
    if not found.held_id:
        nessie.create_account(budget, found.customer_id, HELD_NICKNAME, balance=0)
        created = True
    if created:
        # The creates answer with a string, so read the customer's accounts back.
        mine = nessie.list_customer_accounts(budget, found.customer_id)
        fund = _first(mine, FUND_NICKNAME)
        held = _first(mine, HELD_NICKNAME)
        found = Found(found.customer_id, found.operating_id, fund["_id"] if fund else None, held["_id"] if held else None)
    if not found.fund_id or not found.held_id:
        raise ApiError("upstream_error", "Nessie didn't list B16's accounts after creating them.")
    with _state_lock:
        _state = Found(**vars(found))
    return found


def seed(budget: nessie.Budget, wip_id: str, price_cents: int) -> Found:
    """Finds or creates the two accounts and posts the held account's opening deposit once.

    The caller holds the write lock. Raises ApiError not_found without B04's account.
    """
    found = find(budget)
    if not found.operating_id or not found.customer_id:
        raise ApiError("not_found", NOT_SET_UP)
    found = _find_or_create(budget, found)
    assert found.held_id
    _guard(found.held_id)
    description = held_opening_description(wip_id)
    deposits = nessie.list_deposits(budget, found.held_id)
    if by_description(deposits, description) is None:
        nessie.create_deposit(budget, found.held_id, price_cents, HELD_OPENING_DATE, description)
        deposits = nessie.list_deposits(budget, found.held_id)
        if by_description(deposits, description) is None:
            raise ApiError("upstream_error", "Nessie didn't list the commission's opening deposit after creating it.")
    return found


# ---------------------------------------------------------------------------------------------
# Posts


def post_once(budget: nessie.Budget, direction: str, account_id: str, amount_cents: int, date: str, description: str) -> Optional[dict[str, Any]]:
    """The record with this description on a B16 account, posted first when it isn't there.

    Returns the record read back from the list, or None when Nessie doesn't list it. A replay
    finds the earlier record and posts nothing. The caller holds the write lock.
    """
    _guard(account_id)
    if direction == "in":
        listing, create = nessie.list_deposits, nessie.create_deposit
    elif direction == "out":
        listing, create = nessie.list_withdrawals, nessie.create_withdrawal
    else:
        raise ValueError("direction is in or out")
    record = by_description(listing(budget, account_id), description)
    if record is None:
        create(budget, account_id, amount_cents, date, description)
        record = by_description(listing(budget, account_id), description)  # creates answer with a string
    return record


# ---------------------------------------------------------------------------------------------
# Status, from a cache


COLD: dict[str, Any] = {
    "operating": False,
    "seeded": False,
    "fundAccountId": None,
    "heldAccountId": None,
    "fundBalanceCents": None,
    "heldBalanceCents": None,
}

_snapshot: Optional[dict[str, Any]] = None
_snap_lock = threading.Lock()
_last_asked = 0.0
_thread: Optional[threading.Thread] = None
_wake = threading.Event()
_stop = threading.Event()
# Tests turn the thread off and call refresh_status() themselves.
BACKGROUND = True


def read_status(budget: nessie.Budget) -> dict[str, Any]:
    """The status from Nessie: one account list, then each account's records."""
    global _operating_confirmed
    found = find(budget)
    operating = False
    if found.operating_id:
        with _state_lock:
            confirmed = _operating_confirmed == found.operating_id
        if confirmed:
            operating = True
        else:
            deposits = nessie.list_deposits(budget, found.operating_id)
            operating = any(d.get("description") == b04_bank.OPENING_DESCRIPTION and books.counts(d) for d in deposits)
            if operating:
                with _state_lock:
                    _operating_confirmed = found.operating_id
    fund_balance = held_balance = None
    held_open = False
    if found.fund_id:
        fund_balance = books.balance(nessie.list_deposits(budget, found.fund_id), nessie.list_withdrawals(budget, found.fund_id))
    if found.held_id:
        held_deposits = nessie.list_deposits(budget, found.held_id)
        held_balance = books.balance(held_deposits, nessie.list_withdrawals(budget, found.held_id))
        held_open = any(isinstance(d.get("description"), str) and HELD_OPENING_RE.match(d["description"]) and books.counts(d) for d in held_deposits)
    return {
        "operating": operating,
        "seeded": bool(found.fund_id and found.held_id and held_open),
        "fundAccountId": found.fund_id,
        "heldAccountId": found.held_id,
        "fundBalanceCents": fund_balance,
        "heldBalanceCents": held_balance,
    }


def refresh_status(budget: Optional[nessie.Budget] = None) -> dict[str, Any]:
    """Reads the status from Nessie now and keeps it. Raises NessieError."""
    global _snapshot
    snap = read_status(budget or nessie.Budget(REFRESH_BUDGET_S))
    with _snap_lock:
        _snapshot = snap
    return dict(snap)


def cached_status() -> dict[str, Any]:
    """The last status read, at once. Starts the refresher when it isn't running."""
    global _last_asked
    with _snap_lock:
        _last_asked = time.monotonic()
        snap = dict(_snapshot) if _snapshot else dict(COLD)
    if BACKGROUND:
        _ensure_refresher()
    return snap


def kick() -> None:
    """Asks a running refresher to read the status again now."""
    _wake.set()


def _ensure_refresher() -> None:
    global _thread
    with _snap_lock:
        if _thread is not None and _thread.is_alive():
            return
        _stop.clear()
        _thread = threading.Thread(target=_refresher, name="b16-status", daemon=True)
        _thread.start()


def stop_refresher() -> None:
    global _thread
    _stop.set()
    _wake.set()
    with _snap_lock:
        t, _thread = _thread, None
    if t is not None and t is not threading.current_thread():
        t.join(timeout=2.0)
    _wake.clear()


def _refresher() -> None:
    global _thread
    while not _stop.is_set():
        try:
            refresh_status()
        except nessie.NessieError as err:
            forget_on_404(err)
            if err.code == "key_missing":
                break
        except Exception as exc:  # the refresher never takes the server down
            log.info("b16 status refresh failed (%s)", type(exc).__name__)
        _wake.wait(REFRESH_EVERY_S)
        _wake.clear()
        with _snap_lock:
            if time.monotonic() - _last_asked > IDLE_STOP_S:
                if _thread is threading.current_thread():
                    _thread = None
                return
    with _snap_lock:
        if _thread is threading.current_thread():
            _thread = None
