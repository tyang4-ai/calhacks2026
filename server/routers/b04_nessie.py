"""B04 · the Nessie client (Capital One's sandbox bank). A helper module with no `router`, so
server/main.py skips it.

- The key comes only from server/config.py and goes in the query string as `?key=` on every call.
  Nothing here prints, logs or returns it, and no URL is ever logged (the `httpx` logger is held
  at WARNING, and error messages never carry a URL or an exception's text).
- The base URL is the first of BASE_URLS that answers `GET /accounts` with a 2xx, found once per
  server process.
- Every call has a timeout of at most 5 seconds, cut shorter by the request's Budget, and no
  retries.
- Create calls answer with a plain string ("Deposit created"), so callers read the list back to
  find the new record.
- Only deposits and withdrawals move money: Nessie can't create purchases or transfers.

Tests swap the network for an httpx.MockTransport with set_transport(), and reset() clears the
cached base URL.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any, Optional

import httpx

from server import config

BASE_URLS = (
    "https://api.nessieisreal.com",
    "https://prod-api.nessieisreal.com",
    "https://qa-api.nessieisreal.com",
)
CALL_TIMEOUT_S = 5.0

# httpx logs every request URL at INFO, and the URL carries the key. Keep it quiet.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

_lock = threading.Lock()
_base_url: Optional[str] = None
_transport: Optional[httpx.BaseTransport] = None


class NessieError(Exception):
    """A Nessie failure, already in the contract's terms. `message` is one plain sentence."""

    def __init__(self, code: str, message: str, status: Optional[int] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


class Budget:
    """The time a request has left. Each call's timeout is the smaller of 5 s and what's left."""

    def __init__(self, seconds: float):
        self.end = time.monotonic() + seconds

    def left(self) -> float:
        return self.end - time.monotonic()

    def call_timeout(self) -> float:
        left = self.left()
        if left <= 0.05:
            raise NessieError("upstream_timeout", "Nessie didn't answer in time.")
        return min(CALL_TIMEOUT_S, left)


def set_transport(transport: Optional[httpx.BaseTransport]) -> None:
    """Tests only: route every call through this transport instead of the network."""
    global _transport
    _transport = transport


def reset() -> None:
    """Forget the base URL, so the next call finds it again."""
    global _base_url
    with _lock:
        _base_url = None


def has_key() -> bool:
    return config.has_key("NESSIE_KEY")


def _key() -> str:
    key = config.NESSIE_KEY
    if not key:
        raise NessieError("key_missing", "This upgrade needs NESSIE_KEY, which isn't set.")
    return key


def _send(base: str, method: str, path: str, budget: Budget, body: Any = None) -> Any:
    """One call. Returns the parsed JSON (or the text when it isn't JSON). Raises NessieError."""
    timeout = budget.call_timeout()
    kwargs: dict[str, Any] = {"timeout": httpx.Timeout(timeout)}
    if _transport is not None:
        kwargs["transport"] = _transport
    try:
        with httpx.Client(**kwargs) as client:
            res = client.request(method, base + path, params={"key": _key()}, json=body)
    except httpx.TimeoutException:
        raise NessieError("upstream_timeout", "Nessie didn't answer in time.") from None
    except httpx.HTTPError:
        raise NessieError("upstream_error", "Nessie couldn't be reached.") from None
    if not 200 <= res.status_code < 300:
        raise NessieError("upstream_error", f"Nessie answered with status {res.status_code}.", res.status_code)
    if not res.content:
        return None
    try:
        return res.json()
    except ValueError:
        return res.text


def base_url(budget: Budget) -> str:
    """The first base URL that answers GET /accounts, found once per process."""
    global _base_url
    with _lock:
        if _base_url:
            return _base_url
    timed_out = False
    for base in BASE_URLS:
        try:
            _send(base, "GET", "/accounts", budget)
        except NessieError as err:
            if err.code == "key_missing":
                raise
            if err.code == "upstream_timeout":
                timed_out = True
                if budget.left() <= 0.05:
                    break
            continue
        with _lock:
            _base_url = base
        return base
    if timed_out:
        raise NessieError("upstream_timeout", "Nessie didn't answer in time.")
    raise NessieError("upstream_error", "No Nessie server answered.")


def call(method: str, path: str, budget: Budget, body: Any = None) -> Any:
    _key()
    return _send(base_url(budget), method, path, budget, body)


def _list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise NessieError("upstream_error", "Nessie answered with something that isn't a list.")
    return [v for v in value if isinstance(v, dict)]


def _obj(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise NessieError("upstream_error", "Nessie answered with something that isn't a record.")
    return value


# ---------------------------------------------------------------------------------------------
# Endpoints (docs/spec/nessie/ch13-nessie-openapi-spec.yaml). Lists and reads return records,
# creates return nothing useful, so callers read the list back.


def list_customers(budget: Budget) -> list[dict[str, Any]]:
    return _list(call("GET", "/customers", budget))


def create_customer(budget: Budget, first_name: str, last_name: str, address: dict[str, str]) -> None:
    call("POST", "/customers", budget, {"first_name": first_name, "last_name": last_name, "address": address})


def list_accounts(budget: Budget) -> list[dict[str, Any]]:
    return _list(call("GET", "/accounts", budget))


def list_customer_accounts(budget: Budget, customer_id: str) -> list[dict[str, Any]]:
    return _list(call("GET", f"/customers/{customer_id}/accounts", budget))


def create_account(budget: Budget, customer_id: str, nickname: str, balance: int = 0) -> None:
    call(
        "POST",
        f"/customers/{customer_id}/accounts",
        budget,
        {"type": "Checking", "nickname": nickname, "rewards": 0, "balance": balance},
    )


def get_account(budget: Budget, account_id: str) -> dict[str, Any]:
    return _obj(call("GET", f"/accounts/{account_id}", budget))


def list_deposits(budget: Budget, account_id: str) -> list[dict[str, Any]]:
    return _list(call("GET", f"/accounts/{account_id}/deposits", budget))


def list_withdrawals(budget: Budget, account_id: str) -> list[dict[str, Any]]:
    return _list(call("GET", f"/accounts/{account_id}/withdrawals", budget))


def _txn_body(amount_cents: int, date: str, description: str) -> dict[str, Any]:
    return {
        "medium": "balance",
        "transaction_date": date,
        "status": "completed",
        "amount": int(amount_cents),
        "description": description,
    }


def create_deposit(budget: Budget, account_id: str, amount_cents: int, date: str, description: str) -> None:
    call("POST", f"/accounts/{account_id}/deposits", budget, _txn_body(amount_cents, date, description))


def create_withdrawal(budget: Budget, account_id: str, amount_cents: int, date: str, description: str) -> None:
    call("POST", f"/accounts/{account_id}/withdrawals", budget, _txn_body(amount_cents, date, description))


def probe_purchase(budget: Budget, account_id: str) -> int:
    """The one live probe: try POST /accounts/{id}/purchases and return only the status code."""
    timeout = budget.call_timeout()
    kwargs: dict[str, Any] = {"timeout": httpx.Timeout(timeout)}
    if _transport is not None:
        kwargs["transport"] = _transport
    base = base_url(budget)
    body = {"medium": "balance", "purchase_date": "2026-09-01", "amount": 1, "description": "Cindia probe"}
    try:
        with httpx.Client(**kwargs) as client:
            return client.post(f"{base}/accounts/{account_id}/purchases", params={"key": _key()}, json=body).status_code
    except httpx.HTTPError:
        return 0
