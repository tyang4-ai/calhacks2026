"""B02 · Claude explains the catch (`b02-explain`).

POST /api/b02/explain takes the short-payment flag (flg_01) and its three records (the gallery's
contract, its September statement and the bank deposit), asks Claude which record to trust and
why, in English and Chinese, and has it draft a polite follow-up asking for the difference.

- Needs ANTHROPIC_API_KEY, read only through server/config.py. Without it: 503 key_missing.
- claude-sonnet-5-5 through client.messages.parse() with the CatchExplanation model as
  output_format. No temperature, top_p, top_k, thinking "enabled" or prefill.
- One call, a 6-second timeout and no retries, so the endpoint finishes in under 7 seconds.
- The server checks Claude's answer before using it: trusted_record_id must be one of the flag's
  recordIds, and delta_cents must equal the flag's deltaCents. Either failing, or an answer that
  doesn't parse, is 502 invalid_model_output, and the scripted text plays.
- Returns a flag.explained for the flag and a followup.drafted for followUpId.

Never logs a key, the request body or Claude's raw output.
"""

from __future__ import annotations

import concurrent.futures
import itertools
import json
import logging
import threading
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, ValidationError

from server import ApiError
from server import config

router = APIRouter(prefix="/api/b02")
log = logging.getLogger("cindia")

KEY = "b02-explain"
MODEL = config.MODEL_DEFAULT  # claude-sonnet-5-5
CLAUDE_TIMEOUT_S = 6.0
MAX_TOKENS = 1600

# evt_live_ plus a number, unique within the server process. B02's numbers start at 200001 so they
# never meet another router's counter.
_ids = itertools.count(200001)
_ids_lock = threading.Lock()

# One worker thread per in-flight call: a call that runs past the timeout is abandoned, not awaited.
_pool = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="b02")


def _next_id() -> str:
    with _ids_lock:
        return f"evt_live_{next(_ids)}"


# ---------------------------------------------------------------------------------------------
# The request (api-contract.md, B02). Records are the full objects from data-model.md.


class TextModel(BaseModel):
    en: str
    zh: str


class FlagIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    kind: str
    recordIds: list[str]
    expectedCents: int
    actualCents: int
    deltaCents: int


class ContractIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    commissionBps: int


class StatementLineIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    orderId: str
    saleCents: int
    commissionBps: int
    commissionCents: int
    netCents: int


class StatementIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    lines: list[StatementLineIn]
    totalSaleCents: int
    totalCommissionCents: int
    totalNetCents: int


class BankTxnIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    date: str
    amountCents: int


class ExplainRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    trigger: Optional[dict[str, Any]]
    flagId: str
    flag: FlagIn
    contract: ContractIn
    statement: StatementIn
    bankTxn: BankTxnIn
    followUpId: str
    approvalId: str
    # Who the follow-up goes to, from src/mock's FollowUp. Optional: Claude doesn't write it.
    to: Optional[TextModel] = None


# ---------------------------------------------------------------------------------------------
# Claude's structured answer (api-contract.md, B02).


class CatchExplanation(BaseModel):
    trusted_record_id: str  # must be one of the flag's recordIds
    delta_cents: int  # must equal the flag's deltaCents
    explanation_en: str  # two or three plain sentences, first person as Cindy
    explanation_zh: str
    follow_up_subject_en: str
    follow_up_subject_zh: str
    follow_up_body_en: str  # a polite note to the gallery asking for the difference
    follow_up_body_zh: str


# ---------------------------------------------------------------------------------------------
# The prompt.

SYSTEM_PROMPT = """You are Cindy, the AI agent that keeps the books for a small Gu embroidery (顾绣) studio in Shanghai that sells through Cindia, its own website and a consignment gallery in San Francisco. You speak to the studio owner in the first person, short and plain, like a careful bookkeeper.

Rules:
- Use only the numbers that appear in the records and the facts you are given. Never invent a date, an amount, a rate or a name.
- Write money in US dollars with a dollar sign and cents, for example $340.00, in English and in Chinese alike.
- Name the contract's commission rate and the rate the statement charged.
- Say which record you trust and why. If something is uncertain, say what you are unsure about instead of guessing.
- explanation_en and explanation_zh: two or three sentences each. The Chinese is natural Simplified Chinese, not a word-for-word translation.
- The follow-up is a short, polite, specific note from the studio to the gallery's accounts team. It thanks them for the statement and payment, points out the commission difference, and asks them to send the difference. It promises nothing on the owner's behalf: no discounts, no deadlines the owner did not set, no legal threats. Sign it "Gu Embroidery Studio" in English and "顾绣工作室" in Chinese. Keep each body under 90 words or 180 characters.
- trusted_record_id is the ID of the record you trust, exactly as written in the records. delta_cents is the amount still owed, in integer cents.
"""


def _usd(cents: int) -> str:
    sign = "-" if cents < 0 else ""
    c = abs(cents)
    return f"{sign}${c // 100:,}.{c % 100:02d}"


def _pct(bps: int) -> str:
    return f"{bps / 100:g}%"


def build_prompt(req: ExplainRequest) -> str:
    """The user turn: the records as JSON plus the figures the matcher already found."""
    flag, contract, statement, bank = req.flag, req.contract, req.statement, req.bankTxn
    rates = sorted({line.commissionBps for line in statement.lines})
    facts = [
        f"Flag {flag.id} ({flag.kind}) links the records {', '.join(flag.recordIds)}.",
        f"The contract {contract.id} sets the gallery's commission at {_pct(contract.commissionBps)}.",
        f"The statement {statement.id} charged {' and '.join(_pct(r) for r in rates)} on {len(statement.lines)} sales"
        f" totalling {_usd(statement.totalSaleCents)}, and says the studio's net is {_usd(statement.totalNetCents)}.",
        f"The bank record {bank.id} shows {_usd(bank.amountCents)} received on {bank.date}.",
        f"At the contract's rate the studio should have received {_usd(flag.expectedCents)}.",
        f"It received {_usd(flag.actualCents)}, so the difference is {_usd(flag.deltaCents)} ({flag.deltaCents} cents).",
    ]
    records = {
        "contract": req.contract.model_dump(),
        "statement": req.statement.model_dump(),
        "bankTxn": req.bankTxn.model_dump(),
    }
    return (
        "The matcher flagged a short payment from the gallery. Here are the facts it found:\n"
        + "\n".join(f"- {f}" for f in facts)
        + "\n\nThe three records, as JSON:\n"
        + json.dumps(records, ensure_ascii=False, indent=1)
        + "\n\nExplain to the owner which record to trust and why, and draft the follow-up to the gallery."
    )


# ---------------------------------------------------------------------------------------------
# The Claude call. Tests replace make_client() with a fake.


def make_client():
    """An Anthropic client holding the key from server/config.py. No retries inside a request."""
    from anthropic import Anthropic

    return Anthropic(api_key=config.ANTHROPIC_API_KEY, timeout=CLAUDE_TIMEOUT_S, max_retries=0)


def _call_claude(client: Any, prompt: str) -> Any:
    return client.messages.parse(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        output_format=CatchExplanation,
        output_config={"effort": "low"},
        timeout=CLAUDE_TIMEOUT_S,
    )


def ask_claude(req: ExplainRequest) -> CatchExplanation:
    """One call with a hard deadline. Maps every failure to the contract's error codes."""
    import anthropic

    prompt = build_prompt(req)
    client = make_client()
    future = _pool.submit(_call_claude, client, prompt)
    try:
        response = future.result(timeout=CLAUDE_TIMEOUT_S)
    except concurrent.futures.TimeoutError:
        future.cancel()
        raise ApiError("upstream_timeout", "Claude didn't answer in time.")
    except (anthropic.APITimeoutError, anthropic.DeadlineExceededError):
        raise ApiError("upstream_timeout", "Claude didn't answer in time.")
    except (ValidationError, ValueError, anthropic.APIResponseValidationError):
        # parse() validates the JSON against CatchExplanation; a malformed answer lands here.
        raise ApiError("invalid_model_output", "Claude's answer didn't have the expected shape.")
    except anthropic.APIStatusError as exc:
        raise ApiError("upstream_error", f"Claude answered with an error (status {exc.status_code}).")
    except anthropic.APIError:
        raise ApiError("upstream_error", "Claude couldn't be reached.")

    parsed = getattr(response, "parsed_output", None)
    if isinstance(parsed, dict):
        try:
            parsed = CatchExplanation.model_validate(parsed)
        except ValidationError:
            parsed = None
    if not isinstance(parsed, CatchExplanation):
        raise ApiError("invalid_model_output", "Claude's answer didn't have the expected shape.")
    return parsed


# ---------------------------------------------------------------------------------------------
# The checks and the events.


def check_answer(req: ExplainRequest, answer: CatchExplanation) -> None:
    if answer.trusted_record_id not in req.flag.recordIds:
        raise ApiError("invalid_model_output", "Claude named a record that isn't one of the flag's records.")
    if answer.delta_cents != req.flag.deltaCents:
        raise ApiError("invalid_model_output", "Claude's amount owed doesn't match the flag's difference.")
    texts = [
        answer.explanation_en,
        answer.explanation_zh,
        answer.follow_up_subject_en,
        answer.follow_up_subject_zh,
        answer.follow_up_body_en,
        answer.follow_up_body_zh,
    ]
    if any(not t.strip() for t in texts):
        raise ApiError("invalid_model_output", "Claude left part of its answer empty.")


DEFAULT_TO = {"en": "Gallery accounts", "zh": "画廊财务部"}


def build_events(req: ExplainRequest, answer: CatchExplanation) -> list[dict[str, Any]]:
    at = req.trigger.get("at", 0) if isinstance(req.trigger, dict) else 0
    if not isinstance(at, (int, float)) or isinstance(at, bool):
        at = 0
    to = req.to.model_dump() if req.to else dict(DEFAULT_TO)
    explained = {
        "id": _next_id(),
        "type": "flag.explained",
        "at": at,
        "source": "live",
        "key": KEY,
        "payload": {
            "flagId": req.flagId,
            "trustRecordId": answer.trusted_record_id,
            "explanation": {"en": answer.explanation_en.strip(), "zh": answer.explanation_zh.strip()},
        },
    }
    drafted = {
        "id": _next_id(),
        "type": "followup.drafted",
        "at": at,
        "source": "live",
        "key": KEY,
        "payload": {
            "followUpId": req.followUpId,
            "approvalId": req.approvalId,
            "to": to,
            "subject": {"en": answer.follow_up_subject_en.strip(), "zh": answer.follow_up_subject_zh.strip()},
            "body": {"en": answer.follow_up_body_en.strip(), "zh": answer.follow_up_body_zh.strip()},
        },
    }
    return [explained, drafted]


def check_request(req: ExplainRequest) -> None:
    if req.flag.id != req.flagId:
        raise ApiError("bad_request", "The flag in the body isn't the flag named by flagId.")
    for rec, name in ((req.contract, "contract"), (req.statement, "statement"), (req.bankTxn, "bank record")):
        if rec.id not in req.flag.recordIds:
            raise ApiError("bad_request", f"The {name} in the body isn't one of the flag's records.")


@router.post("/explain")
def explain(req: ExplainRequest) -> dict[str, Any]:
    check_request(req)
    if not config.has_key("ANTHROPIC_API_KEY"):
        raise ApiError("key_missing", "This upgrade needs ANTHROPIC_API_KEY, which isn't set.")
    answer = ask_claude(req)
    check_answer(req, answer)
    return {"events": build_events(req, answer)}
