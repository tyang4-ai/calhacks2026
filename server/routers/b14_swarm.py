"""B14 · the agent swarm (`b14-swarm`, docs/plans/B14-swarm.md, api-contract.md B14).

Endpoints, each needing the Anthropic key (`config.ANTHROPIC_API_KEY`, 503 `key_missing` without it)
and each answering in under 19 seconds with `{ "events": [...] }`: every `swarm.step` in order, then
the run's final events.

- `POST /api/b14/support` `{ trigger, runId, idTag, idStart, threadId, side, text, lang, contextIds,
  records }`: the support run. Ends in `support.answered`, or `support.escalated` with a
  `support_action` approval, or `support.answered` with L14 and a `question.forwarded`.
- `POST /api/b14/listing` `{ trigger, runId, idTag, idStart, listingId, makerId, notes, lang,
  community, maker, vibeVocabulary, image? }`: the listing run. Ends in `listing.drafted`,
  `listing.indexed` (`cindia-drafts`, when B12 wrote it) and a `listing_publish` approval.
- `POST /api/b14/storefront` `{ trigger, runId, idTag, idStart, storefrontId, community, pieces }`:
  the Designer. Ends in `storefront.drafted`.

The rules here (B2-32, B2-17):
- **Limits:** `text` at most 1,000 characters, `notes` at most 2,000, an `image` at most 4 MB and PNG
  or JPEG by its magic bytes, a body of at most 2 MB (6 MB for a listing with an image), checked on
  the bytes read, all else 400 `bad_request`.
- **IDs:** `idTag` is 4 to 12 lowercase letters or digits, `runId` is `run_user_<idTag>_<n>`, and
  `idStart` the first number the browser reserved, one for every prefix or one per prefix.
- **Two runs at once** across the server. A third answers 503 `busy`, so the scripted answer plays.
- **Records per side:** a buyer request's records are cut to the buyer's list before any agent sees
  them (tools.scope_records).
- **A run Claude never answered** (every call failed) is an error with the first failure's code
  (`upstream_timeout`, `upstream_error`, `key_missing`), so the adapter plays the scripted run
  instead of a run of rule-based steps. A listing or storefront run with no draft is the same.
- **The safety sweep:** no response ever carries `approval.granted`, `approval.declined`,
  `followup.sent`, `payout.sent`, `money.moved` or `storefront.published`.

Nothing here logs a body, a key or Claude's output, and nothing calls out at import time.
"""

from __future__ import annotations

import base64
import binascii
import logging
import re
import threading
from typing import Any, Callable, Literal, Optional, Union

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.concurrency import run_in_threadpool

from server import ApiError, config
from server.b14_swarm import llm, steps, tools
from server.b14_swarm import run as run_mod
from server.b14_swarm.agents import ListingJob, StorefrontJob, SupportJob

log = logging.getLogger("cindia.b14")

router = APIRouter(prefix="/api/b14")

MAX_TEXT = 1000
MAX_NOTES = 2000
MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_BODY_BYTES = 2 * 1024 * 1024
MAX_BODY_IMAGE_BYTES = 6 * 1024 * 1024
MAX_RUNS = 2
# The run's own budget: under the endpoint's 19 seconds, with room to answer.
RUN_BUDGET_S = 18.5

ID_RE = re.compile(r"^[a-z]{2,4}_[a-z0-9_]{1,80}$")
TAG_RE = steps.TAG_RE
PNG = b"\x89PNG\r\n\x1a\n"
JPEG = b"\xff\xd8\xff"

_runs = threading.BoundedSemaphore(MAX_RUNS)

ERROR_MESSAGES = {
    "key_missing": "This upgrade needs ANTHROPIC_API_KEY, which isn't set.",
    "upstream_timeout": "Claude didn't answer in time.",
    "upstream_error": "Claude answered with an error.",
    "invalid_model_output": "Claude's answer failed the server's checks.",
}


# ---------------------------------------------------------------------------------------------
# Request models


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: Optional[dict[str, Any]] = None
    runId: str = Field(min_length=1, max_length=100)
    idTag: str = Field(min_length=4, max_length=12)
    idStart: Union[int, dict[str, int]]


class SupportRequest(_Base):
    threadId: str = Field(min_length=1, max_length=100)
    side: Literal["buyer", "seller"]
    text: str = Field(min_length=1, max_length=MAX_TEXT)
    lang: Literal["en", "zh"]
    contextIds: list[str] = Field(default_factory=list, max_length=20)
    records: dict[str, Any] = Field(default_factory=dict)


class ListingRequest(_Base):
    listingId: str = Field(min_length=1, max_length=100)
    makerId: str = Field(min_length=1, max_length=100)
    notes: str = Field(min_length=1, max_length=MAX_NOTES)
    lang: Literal["en", "zh"]
    community: dict[str, Any]
    maker: dict[str, Any]
    vibeVocabulary: dict[str, list[str]] = Field(default_factory=dict)
    image: Optional[str] = None


class StorefrontRequest(_Base):
    storefrontId: str = Field(min_length=1, max_length=100)
    community: dict[str, Any]
    pieces: list[dict[str, Any]] = Field(default_factory=list, max_length=200)


# ---------------------------------------------------------------------------------------------
# Checks


def _need_key() -> None:
    if not config.has_key("ANTHROPIC_API_KEY"):
        raise ApiError("key_missing", ERROR_MESSAGES["key_missing"])


async def _read(request: Request, limit: int) -> bytes:
    length = request.headers.get("content-length")
    if length is not None and length.isdigit() and int(length) > limit:
        raise ApiError("bad_request", f"The request body is larger than {limit // (1024 * 1024)} MB.")
    body = await request.body()
    if len(body) > limit:
        raise ApiError("bad_request", f"The request body is larger than {limit // (1024 * 1024)} MB.")
    return body


def _parse(model: type[BaseModel], body: bytes) -> Any:
    try:
        return model.model_validate_json(body)
    except ValidationError as exc:
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", []))
        raise ApiError("bad_request", f"The request body doesn't match the contract{f' at {where}' if where else ''}.") from None


def _check_ids(req: _Base, *ids: str) -> None:
    if not TAG_RE.match(req.idTag):
        raise ApiError("bad_request", "idTag must be 4 to 12 lowercase letters or digits.")
    if not re.fullmatch(rf"run_user_{re.escape(req.idTag)}_\d{{1,9}}", req.runId):
        raise ApiError("bad_request", "runId must be run_user_<idTag>_<n>.")
    for i in ids:
        if not isinstance(i, str) or not ID_RE.match(i):
            raise ApiError("bad_request", "An ID in the request isn't a record ID.")
    try:
        steps.IdMint(req.idTag, req.idStart)
    except ValueError:
        raise ApiError("bad_request", "idStart must hold whole numbers from 1.") from None
    start = req.idStart
    if isinstance(start, dict) and (any(k not in steps.RESERVED for k in start) or any(v > 10**9 for v in start.values())):
        raise ApiError("bad_request", "idStart names a prefix the swarm doesn't use.")
    if isinstance(start, int) and start > 10**9:
        raise ApiError("bad_request", "idStart is too large.")


def _image(value: Optional[str]) -> tuple[Optional[bytes], Optional[str]]:
    """The image's bytes and type, from base64 or a data URL, PNG or JPEG by its magic bytes."""
    if value is None or value == "":
        return None, None
    raw = value.split(",", 1)[1] if value.startswith("data:") and "," in value else value
    try:
        data = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        raise ApiError("bad_request", "image must be base64.") from None
    if len(data) > MAX_IMAGE_BYTES:
        raise ApiError("bad_request", "The image is larger than 4 MB.")
    if data.startswith(PNG):
        return data, "image/png"
    if data.startswith(JPEG):
        return data, "image/jpeg"
    raise ApiError("bad_request", "The image must be a PNG or a JPEG.")


def _at(trigger: Optional[dict[str, Any]]) -> float:
    return steps.trigger_at(trigger)


# ---------------------------------------------------------------------------------------------
# Running


def sweep(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The safety sweep: a run never emits a person's decision or a move of money."""
    bad = [e for e in events if e.get("type") in run_mod.FORBIDDEN_EVENTS]
    if bad:
        log.info("b14 sweep: dropped %d forbidden events", len(bad))
    return [e for e in events if e.get("type") not in run_mod.FORBIDDEN_EVENTS]


def _guarded(fn: Callable[..., list[dict[str, Any]]], job: Any) -> list[dict[str, Any]]:
    if not _runs.acquire(blocking=False):
        raise ApiError("busy", "The swarm is already running two answers, so the scripted answer plays.")
    try:
        tally = llm.start_tally()
        try:
            events = fn(job, budget_s=RUN_BUDGET_S)
        except run_mod.RunFailed as exc:
            code = tally.never_answered() or exc.code
            raise ApiError(code, ERROR_MESSAGES.get(code, "The swarm couldn't finish this run.")) from None
        except ApiError:
            raise
        except Exception as exc:
            log.info("b14 run failed (%s)", type(exc).__name__)
            raise ApiError("internal", "The swarm hit an error.") from None
        code = tally.never_answered()
        if code is not None:
            raise ApiError(code, ERROR_MESSAGES.get(code, "Claude couldn't be reached."))
        return sweep(events)
    finally:
        _runs.release()


@router.post("/support")
async def post_support(request: Request) -> dict[str, Any]:
    _need_key()
    req: SupportRequest = _parse(SupportRequest, await _read(request, MAX_BODY_BYTES))
    if not req.text.strip():
        raise ApiError("bad_request", "text is empty.")
    _check_ids(req, req.threadId, *req.contextIds)
    job = SupportJob(
        run_id=req.runId,
        thread_id=req.threadId,
        side=req.side,
        text=req.text.strip(),
        lang=req.lang,
        context_ids=list(dict.fromkeys(req.contextIds)),
        records=tools.scope_records(req.records, req.side, req.contextIds),
        id_tag=req.idTag,
        id_start=req.idStart,
        at=_at(req.trigger),
    )
    return {"events": await run_in_threadpool(_guarded, run_mod.support_run, job)}


@router.post("/listing")
async def post_listing(request: Request) -> dict[str, Any]:
    _need_key()
    req: ListingRequest = _parse(ListingRequest, await _read(request, MAX_BODY_IMAGE_BYTES))
    if req.image is None and len(await request.body()) > MAX_BODY_BYTES:
        raise ApiError("bad_request", "The request body is larger than 2 MB.")
    if not req.notes.strip():
        raise ApiError("bad_request", "notes are empty.")
    community_id = req.community.get("id")
    _check_ids(req, req.listingId, req.makerId, community_id if isinstance(community_id, str) else "")
    maker_ids = req.community.get("makerIds")
    if isinstance(maker_ids, list) and req.makerId not in maker_ids:
        raise ApiError("bad_request", "The maker isn't one of the community's makers.")
    image, image_type = _image(req.image)
    vocab = {k: [w for w in req.vibeVocabulary.get(k, []) if isinstance(w, str)][:50] for k in ("moods", "occasions", "recipients")}
    job = ListingJob(
        run_id=req.runId,
        listing_id=req.listingId,
        maker_id=req.makerId,
        notes=req.notes.strip(),
        lang=req.lang,
        community=req.community,
        maker=req.maker,
        vocabulary=vocab,
        id_tag=req.idTag,
        id_start=req.idStart,
        image=image,
        image_type=image_type,
        at=_at(req.trigger),
    )
    return {"events": await run_in_threadpool(_guarded, run_mod.listing_run, job)}


@router.post("/storefront")
async def post_storefront(request: Request) -> dict[str, Any]:
    _need_key()
    req: StorefrontRequest = _parse(StorefrontRequest, await _read(request, MAX_BODY_BYTES))
    community_id = req.community.get("id")
    _check_ids(req, req.storefrontId, community_id if isinstance(community_id, str) else "")
    job = StorefrontJob(
        run_id=req.runId,
        storefront_id=req.storefrontId,
        community=req.community,
        pieces=[p for p in req.pieces if isinstance(p, dict)],
        id_tag=req.idTag,
        id_start=req.idStart,
        at=_at(req.trigger),
    )
    return {"events": await run_in_threadpool(_guarded, run_mod.storefront_run, job)}
