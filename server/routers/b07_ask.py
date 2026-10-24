"""B07 · Ask Cindy (`b07-ask`).

POST /api/b07/ask answers the owner's question from the studio's own records. Claude (MODEL_DEFAULT)
calls strict tools that this module runs in Python over the request's `records`, so no number on
screen comes from the model's memory:

- revenue_by_piece(month_id), revenue_by_channel(month_id), maker_earnings(month_id): rows of
  label and cents, computed here.
- find_records(kind, ids): the matching records.
- answer(answer_en, answer_zh, chart, ref_ids): ends the loop.

The server checks the answer before it returns it: every ref ID is in the records, every chart value
equals a cents value some tool returned in this request, the labels line up with the values, and both
languages are filled. A failed check is `invalid_model_output`. At most MAX_ROUNDS calls to Claude
and TOTAL_SECONDS in total, else `upstream_timeout`. Without ANTHROPIC_API_KEY the route answers
`key_missing`, and the adapter's health() is false because /api/health reports keys.anthropic false.

Never sends temperature, top_p, top_k, thinking or a prefilled assistant turn, and never forces a
tool with tool_choice (Sonnet 5.5 rejects `any` and `tool`): the answer tool is picked by prompt.
Nothing here logs a key, a request body or Claude's output.
"""

from __future__ import annotations

import itertools
import json
import threading
import time
from collections import Counter
from typing import Any, Callable, Literal, Optional

import anthropic
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from server import ApiError, config

router = APIRouter(prefix="/api/b07")

KEY = "b07-ask"
MODEL = config.MODEL_DEFAULT  # claude-sonnet-5-5
MAX_ROUNDS = 4
TOTAL_SECONDS = 6.5
MIN_CALL_SECONDS = 0.5  # don't start a Claude call with less time left than this
MAX_TOKENS = 1200

# evt_live_ plus a number, unique within the server process. B07's numbers start at 700001 so they
# never meet another router's counter.
_ids = itertools.count(700001)
_ids_lock = threading.Lock()


def _next_id() -> str:
    with _ids_lock:
        return f"evt_live_{next(_ids)}"


# ---------------------------------------------------------------------------------------------
# The request


class Records(BaseModel):
    model_config = ConfigDict(extra="allow")

    orders: list[dict[str, Any]]
    catalog: list[dict[str, Any]]
    makerStatements: list[dict[str, Any]]
    flags: list[dict[str, Any]]
    # Optional, sent by the adapter so Cindy can cite them (the canned answers do).
    makerPayouts: list[dict[str, Any]] = Field(default_factory=list)
    contracts: list[dict[str, Any]] = Field(default_factory=list)
    statements: list[dict[str, Any]] = Field(default_factory=list)
    bankTxns: list[dict[str, Any]] = Field(default_factory=list)
    makers: list[dict[str, Any]] = Field(default_factory=list)
    channels: list[dict[str, Any]] = Field(default_factory=list)


RECORD_KINDS = ("orders", "catalog", "makerStatements", "flags", "makerPayouts", "contracts", "statements", "bankTxns", "makers", "channels")


class AskRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    trigger: Optional[dict[str, Any]]
    questionId: str
    text: str
    lang: Literal["en", "zh"]
    records: Records

    @field_validator("questionId", "text")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v


# ---------------------------------------------------------------------------------------------
# The tools, run in Python over the records


def _int(v: Any) -> int:
    return v if isinstance(v, int) and not isinstance(v, bool) else 0


def _text(rec: Optional[dict[str, Any]], field: str, fallback: str) -> tuple[str, str]:
    t = (rec or {}).get(field)
    if isinstance(t, dict):
        en = t.get("en") if isinstance(t.get("en"), str) else fallback
        zh = t.get("zh") if isinstance(t.get("zh"), str) else en
        return en, zh
    return fallback, fallback


def _by_id(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {r["id"]: r for r in rows if isinstance(r, dict) and isinstance(r.get("id"), str)}


class ToolError(Exception):
    """A tool call Claude can correct: it goes back as a tool_result with is_error."""


def _check_month(month_id: Any) -> str:
    if not isinstance(month_id, str) or len(month_id) != 7 or month_id[4] != "-":
        raise ToolError("month_id must look like 2026-09.")
    return month_id


def _month_orders(records: Records, month_id: str) -> list[dict[str, Any]]:
    """The month's sold orders. A refunded order earned nothing."""
    return [
        o for o in records.orders
        if isinstance(o, dict) and str(o.get("date", "")).startswith(month_id) and o.get("status") != "refunded"
    ]


def revenue_by_piece(records: Records, month_id: Any) -> dict[str, Any]:
    month_id = _check_month(month_id)
    pieces = _by_id(records.catalog)
    rows: dict[str, dict[str, Any]] = {}
    for o in _month_orders(records, month_id):
        pid = str(o.get("pieceId", ""))
        if pid not in rows:
            en, zh = _text(pieces.get(pid), "title", pid)
            rows[pid] = {"piece_id": pid, "label_en": en, "label_zh": zh, "orders": 0, "order_ids": [],
                         "gross_cents": 0, "maker_share_cents": 0}
        r = rows[pid]
        r["orders"] += 1
        r["order_ids"].append(o.get("id"))
        r["gross_cents"] += _int(o.get("grossCents"))
        r["maker_share_cents"] += _int(o.get("makerShareCents"))
    out = sorted(rows.values(), key=lambda r: (-r["gross_cents"], r["piece_id"]))
    return {"month_id": month_id, "note": "Gross sales and maker share per piece, refunded orders left out, largest gross first.", "rows": out}


def revenue_by_channel(records: Records, month_id: Any) -> dict[str, Any]:
    month_id = _check_month(month_id)
    channels = _by_id(records.channels)
    rows: dict[str, dict[str, Any]] = {}
    for o in _month_orders(records, month_id):
        cid = str(o.get("channelId", ""))
        if cid not in rows:
            en, zh = _text(channels.get(cid), "name", cid)
            rows[cid] = {"channel_id": cid, "label_en": en, "label_zh": zh, "orders": 0, "gross_cents": 0,
                         "fees_cents": 0, "maker_share_cents": 0}
        r = rows[cid]
        r["orders"] += 1
        r["gross_cents"] += _int(o.get("grossCents"))
        r["fees_cents"] += _int(o.get("cardFeeCents")) + _int(o.get("platformFeeCents")) + _int(o.get("commissionCents"))
        r["maker_share_cents"] += _int(o.get("makerShareCents"))
    out = sorted(rows.values(), key=lambda r: (-r["gross_cents"], r["channel_id"]))
    return {"month_id": month_id, "note": "Gross sales, fees as recorded on the orders, and maker share per sales channel.", "rows": out}


def maker_earnings(records: Records, month_id: Any) -> dict[str, Any]:
    month_id = _check_month(month_id)
    makers = _by_id(records.makers)
    payouts = {p.get("makerId"): p for p in records.makerPayouts if isinstance(p, dict) and p.get("monthId") == month_id}
    out = []
    for s in records.makerStatements:
        if not isinstance(s, dict) or s.get("monthId") != month_id:
            continue
        mid = str(s.get("makerId", ""))
        en, zh = _text(makers.get(mid), "name", mid)
        p = payouts.get(mid)
        row = {
            "maker_id": mid, "label_en": en, "label_zh": zh, "maker_statement_id": s.get("id"),
            "pieces_sold": len(s.get("lines") or []), "earned_cents": _int(s.get("totalCents")),
            "held_cents": _int(s.get("heldCents")), "payout_date": s.get("payoutDate"),
        }
        if p:
            row["maker_payout_id"] = p.get("id")
            row["payout_cents"] = _int(p.get("amountCents"))
            row["payout_status"] = p.get("status")
        out.append(row)
    out.sort(key=lambda r: (-r["earned_cents"], r["maker_id"]))
    return {"month_id": month_id, "note": "Each maker's share for the month, what is held until the gallery pays, and the payout.", "rows": out}


def find_records(records: Records, kind: Any, ids: Any) -> dict[str, Any]:
    if kind not in RECORD_KINDS:
        raise ToolError(f"kind must be one of {', '.join(RECORD_KINDS)}.")
    if not isinstance(ids, list):
        raise ToolError("ids must be a list of record IDs.")
    rows = getattr(records, kind)
    if not ids:
        return {"kind": kind, "records": rows[:40], "note": "No ids given, so these are the first records of this kind."}
    want = {str(i) for i in ids}
    found = [r for r in rows if isinstance(r, dict) and r.get("id") in want]
    missing = sorted(want - {r.get("id") for r in found})
    return {"kind": kind, "records": found, "missing_ids": missing}


TOOL_FUNCS: dict[str, Callable[..., dict[str, Any]]] = {
    "revenue_by_piece": lambda rec, inp: revenue_by_piece(rec, inp.get("month_id")),
    "revenue_by_channel": lambda rec, inp: revenue_by_channel(rec, inp.get("month_id")),
    "maker_earnings": lambda rec, inp: maker_earnings(rec, inp.get("month_id")),
    "find_records": lambda rec, inp: find_records(rec, inp.get("kind"), inp.get("ids")),
}


def _month_tool(name: str, description: str) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"month_id": {"type": "string", "description": "The month as YYYY-MM, for example 2026-09."}},
            "required": ["month_id"],
            "additionalProperties": False,
        },
    }


_TEXT_SCHEMA = {
    "type": "object",
    "properties": {"en": {"type": "string"}, "zh": {"type": "string"}},
    "required": ["en", "zh"],
    "additionalProperties": False,
}

CHART_SCHEMA = {
    "type": "object",
    "properties": {
        "type": {"type": "string", "enum": ["bar", "line"]},
        "title": _TEXT_SCHEMA,
        "labels": {"type": "array", "items": {"type": "string"}},
        "series": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": _TEXT_SCHEMA,
                    "valuesCents": {"type": "array", "items": {"type": "integer"}},
                },
                "required": ["name", "valuesCents"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["type", "title", "labels", "series"],
    "additionalProperties": False,
}

TOOLS: list[dict[str, Any]] = [
    _month_tool("revenue_by_piece", "Gross sales and maker share in cents for every piece sold in the month, largest first, with the order IDs behind each row."),
    _month_tool("revenue_by_channel", "Gross sales, fees and maker share in cents for each sales channel in the month."),
    _month_tool("maker_earnings", "Each maker's earnings for the month in cents: earned, held until the gallery pays, and the payout with its date."),
    {
        "name": "find_records",
        "description": "Look up records by ID, for example a flag, a contract, a statement or a bank record. An empty ids list returns the first records of that kind.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "enum": list(RECORD_KINDS)},
                "ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["kind", "ids"],
            "additionalProperties": False,
        },
    },
    {
        "name": "answer",
        "description": "Give the owner your answer. Call this exactly once, last. Every number and chart value must come from a tool result in this conversation.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "answer_en": {"type": "string", "description": "Two or three plain sentences in English, first person as Cindy. Money as dollars, like $1,234.56."},
                "answer_zh": {"type": "string", "description": "The same answer in Simplified Chinese."},
                "chart": {"anyOf": [CHART_SCHEMA, {"type": "null"}], "description": "A chart whose valuesCents are copied exactly from tool rows, or null."},
                "ref_ids": {"type": "array", "items": {"type": "string"}, "description": "IDs of the records the answer rests on."},
            },
            "required": ["answer_en", "answer_zh", "chart", "ref_ids"],
            "additionalProperties": False,
        },
    },
]

SYSTEM_PROMPT = (
    "You are Cindy, the bookkeeping agent for a small Gu embroidery studio with three makers. "
    "The studio owner asks you about the month's money. Answer only from the studio's records, through the tools. "
    "Rules: Take every number from a tool result. Never estimate, round or recall a number. "
    "Amounts in tool results are integer cents; write them as dollars in your sentences. "
    "When the records can't answer the question, say so plainly in both languages, with chart null and no ref_ids. "
    "Use as few tool calls as you can, in one turn if possible, then call the answer tool. "
    "Write the answer in the question's language first, then the other one: answer_en and answer_zh are both filled every time. "
    "Add a chart only when it helps, and copy its valuesCents exactly from one tool's rows, with labels in the question's language. "
    "ref_ids lists the IDs of the records your answer rests on, such as piece, order, maker statement, flag or contract IDs."
)


# ---------------------------------------------------------------------------------------------
# Checks on the answer


class AnswerText(BaseModel):
    model_config = ConfigDict(extra="forbid")
    en: str
    zh: str


class ChartSeries(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: AnswerText
    valuesCents: list[int]


class Chart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["bar", "line"]
    title: AnswerText
    labels: list[str]
    series: list[ChartSeries]


class AnswerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer_en: str
    answer_zh: str
    chart: Optional[Chart]
    ref_ids: list[str]


def _record_ids(records: Records) -> set[str]:
    ids: set[str] = set()
    for kind in RECORD_KINDS:
        for r in getattr(records, kind):
            if isinstance(r, dict) and isinstance(r.get("id"), str):
                ids.add(r["id"])
    return ids


def _collect_cents(value: Any, out: set[int], key: str = "") -> None:
    """Every integer a tool returned under a cents field (`*_cents` or `*Cents`)."""
    if isinstance(value, dict):
        for k, v in value.items():
            _collect_cents(v, out, str(k))
    elif isinstance(value, list):
        for v in value:
            _collect_cents(v, out, key)
    elif isinstance(value, int) and not isinstance(value, bool) and (key.endswith("_cents") or key.endswith("Cents")):
        out.add(value)


def check_answer(raw: Any, records: Records, seen_cents: set[int]) -> dict[str, Any]:
    """The `ask.answered` payload fields from the answer tool's input, or invalid_model_output."""
    try:
        a = AnswerInput.model_validate(raw)
    except ValidationError:
        raise ApiError("invalid_model_output", "Claude's answer didn't have the expected shape.") from None
    if not a.answer_en.strip() or not a.answer_zh.strip():
        raise ApiError("invalid_model_output", "Claude's answer left one of the two languages empty.")
    known = _record_ids(records)
    ref_ids: list[str] = []
    for rid in a.ref_ids:
        if rid not in known:
            raise ApiError("invalid_model_output", "Claude's answer cited a record that isn't in the records.")
        if rid not in ref_ids:
            ref_ids.append(rid)
    out: dict[str, Any] = {"answer": {"en": a.answer_en.strip(), "zh": a.answer_zh.strip()}, "refIds": ref_ids}
    if a.chart is not None:
        c = a.chart
        if not c.labels or not c.series:
            raise ApiError("invalid_model_output", "Claude's chart had no labels or no series.")
        for s in c.series:
            if len(s.valuesCents) != len(c.labels):
                raise ApiError("invalid_model_output", "Claude's chart had a different number of labels and values.")
            if any(v not in seen_cents for v in s.valuesCents):
                raise ApiError("invalid_model_output", "Claude's chart had a value no tool returned.")
        out["chart"] = c.model_dump()
    return out


# ---------------------------------------------------------------------------------------------
# The loop


def make_client() -> Any:
    """The Anthropic client. Tests replace this with a fake. The key comes only from server.config."""
    return anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY, max_retries=0, timeout=TOTAL_SECONDS)


def _block_param(block: Any) -> Optional[dict[str, Any]]:
    """An assistant content block as a request param, so the tool results can follow it."""
    btype = getattr(block, "type", None)
    if btype == "text":
        return {"type": "text", "text": getattr(block, "text", "")}
    if btype == "tool_use":
        return {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
    dump = getattr(block, "model_dump", None)
    if callable(dump):
        return dump(mode="json", exclude_none=True)
    return None


def _month_of(records: Records) -> str:
    months = Counter(str(s.get("monthId")) for s in records.makerStatements if isinstance(s, dict) and s.get("monthId"))
    if not months:
        months = Counter(str(o.get("date", ""))[:7] for o in records.orders if isinstance(o, dict) and o.get("date"))
    return months.most_common(1)[0][0] if months else "unknown"


def build_user_prompt(body: AskRequest) -> str:
    """The question, its language, the month and an index of record IDs. No figures: those come from tools."""
    lines = [
        f"Question ({'Chinese' if body.lang == 'zh' else 'English'}): {body.text.strip()}",
        f"This month is {_month_of(body.records)}.",
        "Record IDs you can look up with find_records or cite in ref_ids:",
    ]
    for kind in RECORD_KINDS:
        ids = [r["id"] for r in getattr(body.records, kind) if isinstance(r, dict) and isinstance(r.get("id"), str)]
        if ids:
            lines.append(f"- {kind}: {', '.join(ids)}")
    pieces = [f"{r['id']} {_text(r, 'title', r['id'])[0]}" for r in body.records.catalog if isinstance(r, dict) and isinstance(r.get("id"), str)]
    if pieces:
        lines.append("Pieces: " + "; ".join(pieces))
    makers = [f"{r['id']} {_text(r, 'name', r['id'])[0]} / {_text(r, 'name', r['id'])[1]}" for r in body.records.makers if isinstance(r, dict) and isinstance(r.get("id"), str)]
    if makers:
        lines.append("Makers: " + "; ".join(makers))
    return "\n".join(lines)


def _run_tool(name: str, inp: Any, records: Records, seen_cents: set[int]) -> tuple[str, bool]:
    fn = TOOL_FUNCS.get(name)
    if fn is None:
        return f"There is no tool named {name}.", True
    try:
        result = fn(records, inp if isinstance(inp, dict) else {})
    except ToolError as exc:
        return str(exc), True
    _collect_cents(result, seen_cents)
    return json.dumps(result, ensure_ascii=False), False


def _now() -> float:
    """The clock for the 6.5-second budget. Tests replace it."""
    return time.monotonic()


def ask_claude(body: AskRequest, client: Any) -> dict[str, Any]:
    """Runs the tool loop and returns the checked answer fields. Raises ApiError on any failure."""
    deadline = _now() + TOTAL_SECONDS
    seen_cents: set[int] = set()
    messages: list[dict[str, Any]] = [{"role": "user", "content": build_user_prompt(body)}]

    for _round in range(MAX_ROUNDS):
        left = deadline - _now()
        if left < MIN_CALL_SECONDS:
            raise ApiError("upstream_timeout", "Claude didn't answer in time.")
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
                timeout=left,
            )
        except anthropic.APITimeoutError:
            raise ApiError("upstream_timeout", "Claude didn't answer in time.") from None
        except anthropic.DeadlineExceededError:
            raise ApiError("upstream_timeout", "Claude didn't answer in time.") from None
        except anthropic.APIError:
            raise ApiError("upstream_error", "Claude answered with an error.") from None
        except Exception:
            raise ApiError("upstream_error", "The call to Claude failed.") from None

        content = list(getattr(resp, "content", None) or [])
        tool_uses = [b for b in content if getattr(b, "type", None) == "tool_use"]

        final = next((b for b in tool_uses if getattr(b, "name", None) == "answer"), None)
        if final is not None:
            return check_answer(getattr(final, "input", None), body.records, seen_cents)

        assistant_blocks = [p for p in (_block_param(b) for b in content) if p is not None]
        if not assistant_blocks:
            raise ApiError("invalid_model_output", "Claude's reply was empty.")
        messages.append({"role": "assistant", "content": assistant_blocks})

        if tool_uses:
            results = []
            for b in tool_uses:
                text, is_error = _run_tool(b.name, getattr(b, "input", None), body.records, seen_cents)
                results.append({"type": "tool_result", "tool_use_id": b.id, "content": text, **({"is_error": True} if is_error else {})})
            messages.append({"role": "user", "content": results})
        else:
            # Claude wrote prose instead of calling a tool. Ask once more, in a new user turn.
            messages.append({"role": "user", "content": "Please give your answer with the answer tool."})

    raise ApiError("upstream_timeout", "Claude ran out of tool rounds before answering.")


@router.post("/ask")
def ask_route(body: AskRequest) -> dict:
    if not config.has_key("ANTHROPIC_API_KEY"):
        raise ApiError("key_missing", "Ask Cindy needs ANTHROPIC_API_KEY, which isn't set.")
    trigger = body.trigger or {}
    payload = trigger.get("payload") if isinstance(trigger.get("payload"), dict) else {}
    question_id = payload.get("questionId") if isinstance(payload.get("questionId"), str) else body.questionId
    fields = ask_claude(body, make_client())
    at = trigger.get("at", 0)
    if not isinstance(at, (int, float)) or isinstance(at, bool):
        at = 0
    event = {
        "id": _next_id(),
        "type": "ask.answered",
        "at": at,
        "source": "live",
        "key": KEY,
        "payload": {"questionId": question_id, **fields},
    }
    return {"events": [event]}
