"""B16 T1 · the bank side of the books, read from Nessie.

Each deposit and withdrawal on the co-op's operating account becomes a `BankTxn` (data-model.md):

- `id` is the scripted ID in the `(...)` that ends the description B04's seed wrote
  (`Gallery payment pay_023 (txn_026)` gives `txn_026`), or `nessie_<_id>` when there is none.
- `direction` is `in` for deposits and `out` for withdrawals, `date` is `transaction_date`'s day,
  and `amountCents` is `amount` (Nessie keeps whole cents).
- `memo` is the description without the ID, and `refId` is the payout, purchase or maker payout
  ID that ends the memo when there is one, otherwise the scripted ID.
- `nessieId` is the record's Nessie `_id`.
- A cancelled record is left out, as B04 does. When two records carry the same scripted ID, the
  newest (the last one listed) wins, as B04's find-by-description does.

`reconcile()` runs B01's `reconcile_month()` over the request's records with this bank side and
keeps only the flags checked against a Nessie deposit, each with that deposit's `nessieId`. No I/O.
"""

from __future__ import annotations

import re
from typing import Any, Callable, Optional

from server.routers import b01_match

SCRIPTED_ID_RE = re.compile(r"^(?P<memo>.*?)\s*\((?P<id>[a-z]+_[A-Za-z0-9_]+)\)$")
REF_ID_RE = re.compile(r"(?:^|\s)(?P<ref>(?:pay|pur|mpo)_[A-Za-z0-9_]+)$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

IdPicker = Callable[[str, dict], Optional[str]]


def day(record: dict[str, Any]) -> str:
    """The record's `transaction_date` as YYYY-MM-DD, or "" when it has none."""
    value = record.get("transaction_date")
    if not isinstance(value, str):
        return ""
    d = value[:10]
    return d if DATE_RE.match(d) else ""


def amount(record: dict[str, Any]) -> Optional[int]:
    """The record's whole-cent amount, or None when it isn't a number."""
    value = record.get("amount")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return int(round(value))


def counts(record: dict[str, Any]) -> bool:
    """False for a cancelled record, which never counts."""
    return str(record.get("status", "completed")).lower() != "cancelled"


def balance(deposits: list[dict[str, Any]], withdrawals: list[dict[str, Any]]) -> int:
    """Deposits less withdrawals, cancelled records left out."""
    return sum(amount(d) or 0 for d in deposits if counts(d)) - sum(amount(w) or 0 for w in withdrawals if counts(w))


def split_description(description: str) -> tuple[str, Optional[str]]:
    """(memo, scripted ID) from a description like `Gallery payment pay_023 (txn_026)`."""
    text = description.strip()
    m = SCRIPTED_ID_RE.match(text)
    if not m:
        return text, None
    return m.group("memo").strip(), m.group("id")


def to_bank_txn(record: dict[str, Any], direction: str) -> Optional[dict[str, Any]]:
    """One Nessie deposit or withdrawal as a BankTxn, or None when it can't be one."""
    nessie_id = record.get("_id")
    if not isinstance(nessie_id, str) or not nessie_id:
        return None
    if not counts(record):
        return None
    date = day(record)
    cents = amount(record)
    if not date or cents is None:
        return None
    description = record.get("description")
    memo, scripted = split_description(description if isinstance(description, str) else "")
    txn_id = scripted or f"nessie_{nessie_id}"
    ref = REF_ID_RE.search(memo)
    return {
        "id": txn_id,
        "date": date,
        "direction": direction,
        "amountCents": cents,
        "memo": memo,
        "refId": ref.group("ref") if ref else txn_id,
        "nessieId": nessie_id,
    }


def bank_txns(deposits: list[dict[str, Any]], withdrawals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Every counted record as a BankTxn, one per ID (the newest wins), in date order."""
    by_id: dict[str, dict[str, Any]] = {}
    for direction, rows in (("in", deposits), ("out", withdrawals)):
        for r in rows:
            if not isinstance(r, dict):
                continue
            t = to_bank_txn(r, direction)
            if t is not None:
                by_id.pop(t["id"], None)  # the newest record with this ID takes the place
                by_id[t["id"]] = t
    return sorted(by_id.values(), key=lambda t: (t["date"], t["id"]))


def check_records(month_id: str, records: dict[str, Any]) -> None:
    """Raises ValueError with one plain sentence when the request's records can't be matched."""
    b01_match.reconcile_month(month_id, {**records, "bankTxns": []})


def reconcile(
    month_id: str,
    records: dict[str, Any],
    deposits: list[dict[str, Any]],
    withdrawals: list[dict[str, Any]],
    ids: Optional[IdPicker] = None,
) -> list[dict[str, Any]]:
    """Every `flag.raised` B01's matcher finds against Nessie's bank side, each with `nessieId`.

    Returns `{"type": "flag.raised", "date", "payload"}` items in date order. A flag the matcher
    couldn't check against a deposit has no Nessie record behind it, so it's left out. The request's
    own `bankTxns`, if any, are replaced by Nessie's. Raises ValueError for records of the wrong shape.
    """
    txns = bank_txns(deposits, withdrawals)
    results = b01_match.reconcile_month(month_id, {**records, "bankTxns": txns}, ids=ids)
    by_id = {t["id"]: t for t in txns}
    out: list[dict[str, Any]] = []
    for r in results:
        if r.get("type") != "flag.raised":
            continue
        record_ids = r["payload"].get("recordIds") or []
        txn = by_id.get(record_ids[2]) if len(record_ids) >= 3 else None
        if txn is None or txn["direction"] != "in":
            continue
        out.append({"type": "flag.raised", "date": r["date"], "payload": {**r["payload"], "nessieId": txn["nessieId"]}})
    return out
