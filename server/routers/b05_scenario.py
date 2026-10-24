"""B05 · the judge's scenario (`b05-scenario`). POST /api/b05/scenario, multipart, no key needed.

A judge drops a gallery statement (CSV or JSON) into the console. The server parses it into a
statement, runs B01's `reconcile_month()` over the month's records plus that statement, and checks
each statement line against the contract's commission. It returns a `scenario.loaded`, then every
`match.made` and `flag.raised` that involves the new statement.

- CSV columns: date,orderId,pieceId,saleCents,commissionBps,netCents, one statement line per row.
- JSON: a Statement object from data-model.md (its own `id` is replaced).
- Files over 1 MB, or with a bad row, are `bad_request` with a sentence naming the first bad row.

IDs: the held-back sample (the trigger carries its `scn_stm_` statement ID and no `content`) keeps
the scripted IDs (`scn_stm_01`, `scn_mat_01`, `scn_flg_01`), so the screens line up with the
scripted answer. A person's own file gets `stm_scn_N`, `scn_mat_live_N` and `scn_flg_live_N`, which
all contain `scn_`, the marker the scenario panel filters on.

A line is matched (`one_to_one`, [statementId, orderId]) when it charges the contract's commission,
its net is the sale less that commission, and, when the order is in the records, its sale equals
the order's gross. Lines that don't are left unmatched, and the short payment shows as the flag.
"""

from __future__ import annotations

import csv
import datetime as _dt
import io
import itertools
import json
from typing import Any

from fastapi import APIRouter, File, Form, UploadFile

from server import ApiError
from server.routers.b01_match import MONTH_RE, bps, reconcile_month

router = APIRouter(prefix="/api/b05")

KEY = "b05-scenario"
MAX_BYTES = 1024 * 1024
COLUMNS = ["date", "orderId", "pieceId", "saleCents", "commissionBps", "netCents"]
GALLERY = "ch_gallery"

# evt_live_ plus a number, unique within the server process. B05's numbers start at 500001 so
# they never collide with another router's.
_evt_counter = itertools.count(500001)
_stm_counter = itertools.count(1)
_mat_counter = itertools.count(1)
_flg_counter = itertools.count(1)
_scn_counter = itertools.count(1)


# ---------------------------------------------------------------------------------------------
# Parsing


def _is_date(v: Any) -> bool:
    if not isinstance(v, str) or len(v) != 10:
        return False
    try:
        _dt.date.fromisoformat(v)
    except ValueError:
        return False
    return True


def _whole(v: Any) -> int | None:
    """A whole number of cents or bps from a CSV cell or a JSON value, or None."""
    if isinstance(v, bool):
        return None
    if isinstance(v, int):
        return v
    if isinstance(v, str):
        s = v.strip()
        if s.lstrip("-").isdigit():
            return int(s)
    return None


def _check_line(raw: dict, where: str) -> dict:
    """One statement line, checked field by field. `where` names the row in the error sentence."""
    order_id = raw.get("orderId")
    piece_id = raw.get("pieceId")
    if not isinstance(order_id, str) or not order_id.strip():
        raise ApiError("bad_request", f"{where} has no orderId.")
    if not isinstance(piece_id, str) or not piece_id.strip():
        raise ApiError("bad_request", f"{where} has no pieceId.")
    vals: dict[str, int] = {}
    for name in ("saleCents", "commissionBps", "netCents"):
        n = _whole(raw.get(name))
        if n is None:
            raise ApiError("bad_request", f"{where} has a {name} that isn't a whole number.")
        vals[name] = n
    if vals["saleCents"] < 0:
        raise ApiError("bad_request", f"{where} has a negative saleCents.")
    if not 0 <= vals["commissionBps"] <= 10000:
        raise ApiError("bad_request", f"{where} has a commissionBps outside 0 to 10000.")
    commission = _whole(raw.get("commissionCents"))
    if commission is None:
        commission = bps(vals["saleCents"], vals["commissionBps"])
    return {
        "orderId": order_id.strip(),
        "pieceId": piece_id.strip(),
        "saleCents": vals["saleCents"],
        "commissionBps": vals["commissionBps"],
        "commissionCents": commission,
        "netCents": vals["netCents"],
    }


def parse_csv(text: str) -> tuple[list[dict], str]:
    """Statement lines and the latest line date, which stands in for the issued date."""
    rows = list(csv.reader(io.StringIO(text)))
    header_at = next((i for i, r in enumerate(rows) if any(c.strip() for c in r)), None)
    if header_at is None:
        raise ApiError("bad_request", "The file is empty.")
    header = [c.strip() for c in rows[header_at]]
    if header != COLUMNS:
        raise ApiError("bad_request", f"Row {header_at + 1} must be the header {','.join(COLUMNS)}.")
    lines: list[dict] = []
    dates: list[str] = []
    for i in range(header_at + 1, len(rows)):
        row = rows[i]
        if not any(c.strip() for c in row):
            continue
        where = f"Row {i + 1}"
        if len(row) != len(COLUMNS):
            raise ApiError("bad_request", f"{where} has {len(row)} columns instead of {len(COLUMNS)}.")
        raw = dict(zip(COLUMNS, (c.strip() for c in row)))
        if not _is_date(raw["date"]):
            raise ApiError("bad_request", f"{where} has a date that isn't like 2026-10-03.")
        lines.append(_check_line(raw, where))
        dates.append(raw["date"])
    if not lines:
        raise ApiError("bad_request", "The file has a header but no statement rows.")
    return lines, max(dates)


def parse_json(text: str) -> tuple[list[dict], str, str | None]:
    """Statement lines, the issued date and the statement's own monthId, if it has one."""
    try:
        obj = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ApiError("bad_request", f"The JSON doesn't parse at line {exc.lineno}.") from None
    if not isinstance(obj, dict):
        raise ApiError("bad_request", "The JSON file must be one Statement object.")
    channel = obj.get("channelId", GALLERY)
    if channel != GALLERY:
        raise ApiError("bad_request", "Only gallery statements (channelId ch_gallery) can be checked.")
    issued = obj.get("issuedDate")
    if not _is_date(issued):
        raise ApiError("bad_request", "The statement's issuedDate isn't a date like 2026-10-09.")
    month = obj.get("monthId")
    if month is not None and (not isinstance(month, str) or not MONTH_RE.match(month)):
        raise ApiError("bad_request", "The statement's monthId must look like 2026-10.")
    raw_lines = obj.get("lines")
    if not isinstance(raw_lines, list) or not raw_lines:
        raise ApiError("bad_request", "The statement has no lines.")
    lines = []
    for i, raw in enumerate(raw_lines):
        where = f"Line {i + 1} of the statement"
        if not isinstance(raw, dict):
            raise ApiError("bad_request", f"{where} isn't an object.")
        lines.append(_check_line(raw, where))
    return lines, issued, month


def _decode(data: bytes) -> str:
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise ApiError("bad_request", "The file isn't UTF-8 text.") from None


def _parse_json_field(raw: str, name: str, allow_null: bool) -> Any:
    try:
        v = json.loads(raw)
    except json.JSONDecodeError:
        raise ApiError("bad_request", f"The {name} field isn't valid JSON.") from None
    if v is None and allow_null:
        return None
    if not isinstance(v, dict):
        raise ApiError("bad_request", f"The {name} field must be a JSON object.")
    return v


# ---------------------------------------------------------------------------------------------
# Matching


def check_statement(month_id: str, records: dict, statement: dict, keep_ids: bool) -> list[dict]:
    """Every match.made and flag.raised that involves `statement`, as {type, payload} dicts."""
    sid = statement["id"]
    contract = next((c for c in records.get("contracts") or [] if isinstance(c, dict) and c.get("channelId") == GALLERY), None)

    def picker(event_type: str, payload: dict) -> str | None:
        if event_type == "flag.raised" and sid in payload.get("recordIds", []):
            return "scn_flg_01" if keep_ids else f"scn_flg_live_{next(_flg_counter)}"
        return None

    merged = dict(records)
    merged["statements"] = [*(records.get("statements") or []), statement]
    try:
        found = reconcile_month(month_id, merged, ids=picker)
    except ValueError as exc:
        raise ApiError("bad_request", str(exc)) from None
    found = [r for r in found if sid in r["payload"].get("recordIds", [])]

    matches: list[dict] = []
    if contract is not None and isinstance(contract.get("commissionBps"), int):
        rate = contract["commissionBps"]
        orders = {o.get("id"): o for o in records.get("orders") or [] if isinstance(o, dict)}
        for line in statement["lines"]:
            if line["commissionBps"] != rate:
                continue
            if line["netCents"] != line["saleCents"] - bps(line["saleCents"], rate):
                continue
            order = orders.get(line["orderId"])
            if order is not None and order.get("grossCents") != line["saleCents"]:
                continue
            n = len(matches) + 1
            mid = f"scn_mat_{n:02d}" if keep_ids else f"scn_mat_live_{next(_mat_counter)}"
            matches.append({"type": "match.made", "payload": {"matchId": mid, "kind": "one_to_one", "recordIds": [sid, line["orderId"]]}})

    other = [r for r in found if r["type"] == "match.made"]
    flags = [r for r in found if r["type"] == "flag.raised"]
    return [*matches, *({"type": r["type"], "payload": r["payload"]} for r in [*other, *flags])]


# ---------------------------------------------------------------------------------------------
# The route


@router.post("/scenario")
async def scenario(
    trigger: str = Form(...),
    file: UploadFile = File(...),
    monthId: str = Form(...),
    records: str = Form(...),
) -> dict:
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ApiError("bad_request", "The file is over 1 MB, so it wasn't read.")
    if not MONTH_RE.match(monthId):
        raise ApiError("bad_request", "monthId must look like 2026-10.")
    trig = _parse_json_field(trigger, "trigger", allow_null=True)
    recs = _parse_json_field(records, "records", allow_null=False)

    t_payload = trig.get("payload") if isinstance(trig, dict) and isinstance(trig.get("payload"), dict) else {}
    at = trig.get("at") if isinstance(trig, dict) else None
    at = at if isinstance(at, (int, float)) and not isinstance(at, bool) and at >= 0 else 0

    # The held-back sample keeps its scripted statement ID; a person's own file gets a new one.
    t_ids = t_payload.get("recordIds") if isinstance(t_payload.get("recordIds"), list) else []
    sample_id = next((x for x in t_ids if isinstance(x, str) and x.startswith("scn_stm_")), None)
    keep_ids = sample_id is not None and "content" not in t_payload
    sid = sample_id if keep_ids else f"stm_scn_{next(_stm_counter)}"

    text = _decode(data)
    name = (file.filename or "").lower()
    is_json = name.endswith(".json") or (not name.endswith(".csv") and text.lstrip().startswith("{"))
    month = monthId
    if is_json:
        lines, issued, own_month = parse_json(text)
        month = own_month or monthId
    else:
        lines, issued = parse_csv(text)

    statement = {
        "id": sid,
        "channelId": GALLERY,
        "monthId": month,
        "issuedDate": issued,
        "lines": lines,
        "totalSaleCents": sum(x["saleCents"] for x in lines),
        "totalCommissionCents": sum(x["commissionCents"] for x in lines),
        "totalNetCents": sum(x["netCents"] for x in lines),
    }
    results = check_statement(month, recs, statement, keep_ids)

    scenario_id = t_payload.get("scenarioId")
    if not isinstance(scenario_id, str) or not scenario_id:
        scenario_id = f"scn_live_{next(_scn_counter)}"
    file_name = t_payload.get("fileName")
    if not isinstance(file_name, str) or not file_name:
        file_name = file.filename or "statement.csv"
    loaded: dict[str, Any] = {"scenarioId": scenario_id, "fileName": file_name}
    if keep_ids:
        loaded["recordIds"] = [x for x in t_ids if isinstance(x, str)]

    out = [{"type": "scenario.loaded", "payload": loaded}, *results]
    events = [
        {
            "id": f"evt_live_{next(_evt_counter)}",
            "type": r["type"],
            "at": at,
            "source": "live",
            "key": KEY,
            "payload": r["payload"],
        }
        for r in out
    ]
    return {"events": events}
