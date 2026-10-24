"""B09 · the shopping concierge (`b09-concierge`).

POST /api/b09/concierge takes the buyer's request and the twelve catalog pieces, and asks Claude for
exactly three picks, each with one plain sentence in English and Chinese about the piece itself.

- Needs ANTHROPIC_API_KEY, read only through server/config.py. Without it: 503 key_missing.
- claude-haiku-5-5 through client.messages.parse() with the ConciergePicks model as output_format,
  because this call opens the demo. No temperature, top_p, top_k, thinking "enabled" or prefill.
- One call, a 4-second deadline and no retries.
- The server checks Claude's answer before using it: three picks, three different piece IDs, every
  one in the catalog, and every one within a price limit stated in the query. A failed check, or an
  answer that doesn't parse, is 502 invalid_model_output, and the scripted curated set plays.
- Returns one concierge.answered with the query, the three pieceIds in Claude's order and reasons.

Never logs a key, the request body or Claude's raw output.
"""

from __future__ import annotations

import concurrent.futures
import itertools
import json
import logging
import re
import threading
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, ValidationError

from server import ApiError
from server import config

router = APIRouter(prefix="/api/b09")
log = logging.getLogger("cindia")

KEY = "b09-concierge"
MODEL = config.MODEL_FAST  # claude-haiku-5-5
CLAUDE_TIMEOUT_S = 4.0
MAX_TOKENS = 700

# evt_live_ plus a number, unique within the server process. B09's numbers start at 900001 so they
# never meet another router's counter.
_ids = itertools.count(900001)
_ids_lock = threading.Lock()

# One worker thread per in-flight call: a call that runs past the deadline is abandoned, not awaited.
_pool = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="b09")


def _next_id() -> str:
    with _ids_lock:
        return f"evt_live_{next(_ids)}"


# ---------------------------------------------------------------------------------------------
# The request (api-contract.md, B09).


class TextModel(BaseModel):
    en: str
    zh: str


class PieceIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    title: TextModel
    makerId: str
    priceCents: int
    hours: float
    story: TextModel
    # The maker's name, added by the adapter from src/mock/people.ts. Optional.
    maker: Optional[TextModel] = None
    kind: Optional[str] = None
    heritage: Optional[TextModel] = None


class ConciergeRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    trigger: Optional[dict[str, Any]]
    query: str
    lang: str
    catalog: list[PieceIn]


# ---------------------------------------------------------------------------------------------
# Claude's structured answer. The API's schema subset can't say "exactly three", so the server
# checks the count.


class ConciergePick(BaseModel):
    piece_id: str  # one of the catalog's piece IDs, exactly as written
    reason_en: str  # one plain sentence about the piece itself
    reason_zh: str


class ConciergePicks(BaseModel):
    picks: list[ConciergePick]  # exactly three, best first


# ---------------------------------------------------------------------------------------------
# A price limit stated in the query, in cents. None when the query states none.

_NUM = r"(\d[\d,]*(?:\.\d{1,2})?)"
_STRICT_EN = r"under|below|less than|cheaper than|lower than"
_LOOSE_EN = r"up to|at most|no more than|not more than|within|max(?:imum)?|budget(?: is| of)?"
_EN_BEFORE = re.compile(
    rf"\b({_STRICT_EN}|{_LOOSE_EN})\s*(?:about\s*|around\s*)?(?:US\s*)?\$\s*{_NUM}", re.IGNORECASE
)
_EN_AFTER = re.compile(rf"\$\s*{_NUM}\s*(?:or less|or under|or below|max\b|tops\b)", re.IGNORECASE)
_EN_DOLLARS = re.compile(rf"\b({_STRICT_EN}|{_LOOSE_EN})\s*{_NUM}\s*(?:dollars|usd|bucks)\b", re.IGNORECASE)
_ZH_BEFORE = re.compile(rf"(低于|少于|不到|不超过|最多|预算)\s*\$?\s*{_NUM}")
_ZH_AFTER = re.compile(rf"\$?\s*{_NUM}\s*(?:美元|美金|刀|元|块)?\s*(以内|之内|以下)")
_STRICT_WORDS = {"under", "below", "less than", "cheaper than", "lower than", "低于", "少于", "不到"}


def _cents(num: str) -> int:
    return int(round(float(num.replace(",", "")) * 100))


def price_limit(query: str) -> Optional[tuple[int, bool]]:
    """The tightest price limit in the query as (cents, strict), or None. Strict means "under"."""
    found: list[tuple[int, bool]] = []
    for m in _EN_BEFORE.finditer(query):
        found.append((_cents(m.group(2)), m.group(1).lower() in _STRICT_WORDS))
    for m in _EN_DOLLARS.finditer(query):
        found.append((_cents(m.group(2)), m.group(1).lower() in _STRICT_WORDS))
    for m in _EN_AFTER.finditer(query):
        found.append((_cents(m.group(1)), False))
    for m in _ZH_BEFORE.finditer(query):
        found.append((_cents(m.group(2)), m.group(1) in _STRICT_WORDS))
    for m in _ZH_AFTER.finditer(query):
        found.append((_cents(m.group(1)), False))
    if not found:
        return None
    # The lowest cap wins; at the same cap, "under" is the tighter one.
    return min(found, key=lambda f: (f[0], not f[1]))


def within_limit(price_cents: int, limit: Optional[tuple[int, bool]]) -> bool:
    if limit is None:
        return True
    cap, strict = limit
    return price_cents < cap if strict else price_cents <= cap


# ---------------------------------------------------------------------------------------------
# The prompt.

SYSTEM_PROMPT = """You are Cindy, the gift finder on Cindia, a marketplace where buyers get Gu embroidery (顾绣) straight from the studio's makers. A buyer tells you what they are looking for, and you pick exactly three pieces from the catalog you are given.

Rules:
- Pick exactly three different pieces, best match first. Use only piece IDs from the catalog, exactly as written.
- If the request names a price limit, every pick must be within it. Each piece's price is given in US dollars.
- Each reason is one plain sentence about the piece itself: its maker, the craft, the motif, or the hours of work. Use only facts from the catalog. Never invent a name, a number or a story.
- reason_en is English. reason_zh is natural Simplified Chinese, not a word-for-word translation.
- Keep each reason under 25 words or 40 characters. No marketing language and no exclamation marks.
"""


def _usd(cents: int) -> str:
    return f"${cents // 100:,}.{cents % 100:02d}"


def _hours(h: float) -> str:
    return f"{h:g}"


def build_prompt(req: ConciergeRequest) -> str:
    """The user turn: the request, any price limit, and one compact line per piece."""
    rows = []
    for p in req.catalog:
        row = {
            "id": p.id,
            "title_en": p.title.en,
            "title_zh": p.title.zh,
            "price": _usd(p.priceCents),
            "maker_en": p.maker.en if p.maker else p.makerId,
            "maker_zh": p.maker.zh if p.maker else p.makerId,
            "hours": _hours(p.hours),
            "story_en": p.story.en,
        }
        rows.append(json.dumps(row, ensure_ascii=False))
    limit = price_limit(req.query)
    lines = [f"The buyer's request ({req.lang}): {req.query}"]
    if limit is not None:
        cap, strict = limit
        lines.append(f"Price limit: {'under' if strict else 'at most'} {_usd(cap)}.")
    lines.append("")
    lines.append(f"The catalog, {len(rows)} pieces, one JSON object per line:")
    lines.extend(rows)
    lines.append("")
    lines.append("Pick exactly three pieces for this buyer, best first, with a reason for each.")
    return "\n".join(lines)


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
        output_format=ConciergePicks,
        # Haiku 5.5 accepts thinking off at low effort: the fastest answer for the demo's opening.
        thinking={"type": "disabled"},
        output_config={"effort": "low"},
        timeout=CLAUDE_TIMEOUT_S,
    )


def ask_claude(req: ConciergeRequest) -> ConciergePicks:
    """One call with a hard deadline. Maps every failure to the contract's error codes."""
    import anthropic

    prompt = build_prompt(req)
    client = make_client()
    deadline = CLAUDE_TIMEOUT_S
    future = _pool.submit(_call_claude, client, prompt)
    try:
        response = future.result(timeout=deadline)
    except concurrent.futures.TimeoutError:
        future.cancel()
        raise ApiError("upstream_timeout", "Claude didn't answer in time.")
    except (anthropic.APITimeoutError, anthropic.DeadlineExceededError):
        raise ApiError("upstream_timeout", "Claude didn't answer in time.")
    except (ValidationError, ValueError, anthropic.APIResponseValidationError):
        # parse() validates the JSON against ConciergePicks; a malformed answer lands here.
        raise ApiError("invalid_model_output", "Claude's answer didn't have the expected shape.")
    except anthropic.APIStatusError as exc:
        raise ApiError("upstream_error", f"Claude answered with an error (status {exc.status_code}).")
    except anthropic.APIError:
        raise ApiError("upstream_error", "Claude couldn't be reached.")

    parsed = getattr(response, "parsed_output", None)
    if isinstance(parsed, dict):
        try:
            parsed = ConciergePicks.model_validate(parsed)
        except ValidationError:
            parsed = None
    if not isinstance(parsed, ConciergePicks):
        raise ApiError("invalid_model_output", "Claude's answer didn't have the expected shape.")
    return parsed


# ---------------------------------------------------------------------------------------------
# The checks and the event.


def check_request(req: ConciergeRequest) -> None:
    if not req.query.strip():
        raise ApiError("bad_request", "The query is empty.")
    if req.lang not in ("en", "zh"):
        raise ApiError("bad_request", "lang must be en or zh.")
    if len(req.catalog) < 3:
        raise ApiError("bad_request", "The catalog needs at least three pieces.")
    ids = [p.id for p in req.catalog]
    if len(set(ids)) != len(ids):
        raise ApiError("bad_request", "The catalog lists a piece twice.")


def check_answer(req: ConciergeRequest, answer: ConciergePicks) -> None:
    by_id = {p.id: p for p in req.catalog}
    picks = answer.picks
    if len(picks) != 3:
        raise ApiError("invalid_model_output", "Claude didn't pick exactly three pieces.")
    ids = [p.piece_id for p in picks]
    if any(i not in by_id for i in ids):
        raise ApiError("invalid_model_output", "Claude picked a piece that isn't in the catalog.")
    if len(set(ids)) != 3:
        raise ApiError("invalid_model_output", "Claude picked the same piece twice.")
    limit = price_limit(req.query)
    if any(not within_limit(by_id[i].priceCents, limit) for i in ids):
        raise ApiError("invalid_model_output", "Claude picked a piece over the buyer's price limit.")
    if any(not p.reason_en.strip() or not p.reason_zh.strip() for p in picks):
        raise ApiError("invalid_model_output", "Claude left a reason empty.")


def build_event(req: ConciergeRequest, answer: ConciergePicks) -> dict[str, Any]:
    at = req.trigger.get("at", 0) if isinstance(req.trigger, dict) else 0
    if not isinstance(at, (int, float)) or isinstance(at, bool):
        at = 0
    return {
        "id": _next_id(),
        "type": "concierge.answered",
        "at": at,
        "source": "live",
        "key": KEY,
        "payload": {
            "query": req.query,
            "pieceIds": [p.piece_id for p in answer.picks],
            "reasons": {p.piece_id: {"en": p.reason_en.strip(), "zh": p.reason_zh.strip()} for p in answer.picks},
        },
    }


@router.post("/concierge")
def concierge(req: ConciergeRequest) -> dict[str, Any]:
    check_request(req)
    if not config.has_key("ANTHROPIC_API_KEY"):
        raise ApiError("key_missing", "This upgrade needs ANTHROPIC_API_KEY, which isn't set.")
    answer = ask_claude(req)
    check_answer(req, answer)
    return {"events": [build_event(req, answer)]}
