"""B12 · vibe search and surprise me (`b12-search`), on Elastic Serverless with Cindia's own vectors.

Endpoints (api-contract.md, B12; docs/plans/B12-search.md):
- `POST /api/b12/seed` `{ trigger, passagesHash }`: checks the vectors (B11's current fingerprint) and
  the catalog hash, then seeds in a server thread and answers at once with `{ "events": [] }`. 400
  `bad_request` without matching vectors or with another catalog's hash, 503 `key_missing` without
  the Elastic settings. A second call while one runs starts nothing.
- `GET /api/b12/status`: `{ elastic, indexed, drafts, fingerprint, agentBuilder, seeding, seedError }`
  from a cache, in under a second. Not an events response.
- `POST /api/b12/search` `{ trigger, queryId, text, keywords, lang, filters }`: one `search.answered`
  (engine `elastic_hybrid` or `local_hybrid`) in under 4 seconds, or `[]` while B11's model isn't warm.
- `POST /api/b12/surprise` `{ trigger, surpriseId, keyword, method, seed }`: one `surprise.drawn`,
  drawn exactly as src/sources/surprise.ts draws, in under 2 seconds.
- `POST /api/b12/publish` `{ trigger, listingId, pieceId, approvalId }`: when the trigger is the
  owner's `approval.granted` for that approval, copies the person's draft from `cindia-drafts` into
  `cindia-pieces` and returns one `listing.indexed` (`index: "cindia-pieces"`, keyed `b12-search`).
  404 `not_found` when there's no such draft.

Events carry `source: "live"`, `key: "b12-search"`, `at` from the trigger (or 0), and IDs made of
`evt_live_`, then `12`, the process start time in seconds modulo 1,000,000 as six digits, and a
four-digit count from 0001 (D1-52). Nothing here logs a body, a key or a URL. Torch is never imported
here, and nothing calls out at import time.
"""

from __future__ import annotations

import itertools
import re
import threading
import time
from typing import Any, Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

from server import ApiError
from server.b11_embed import data as b11data
from server.b12_search import elastic, engine

router = APIRouter(prefix="/api/b12")

KEY = "b12-search"
MAX_TEXT = 1000
MAX_KEYWORDS = 50
MAX_KEYWORD_CHARS = 200
MAX_BODY_BYTES = 2 * 1024 * 1024
ID_RE = re.compile(r"^[a-z]{2,4}_[A-Za-z0-9_]{1,80}$")
PIECE_RE = re.compile(r"^pc_[a-z0-9_]{1,60}$")
PERSON_LISTING_RE = re.compile(r"^lst_user_[a-z0-9_]{1,60}$")
HASH_RE = re.compile(r"^[0-9a-f]{64}$")

_START = f"{int(time.time()) % 1_000_000:06d}"
_counter = itertools.count(1)
_counter_lock = threading.Lock()


def _next_id() -> str:
    with _counter_lock:
        n = next(_counter)
    return f"evt_live_12{_START}{n:04d}"


class Filters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    maxPriceCents: int | None = Field(default=None, ge=0, le=100_000_000)
    communityIds: list[str] = Field(default_factory=list, max_length=20)


class SeedRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: dict[str, Any] | None
    passagesHash: str = Field(min_length=1, max_length=128)


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: dict[str, Any] | None
    queryId: str = Field(min_length=1, max_length=100)
    text: str = Field(max_length=MAX_TEXT)
    keywords: list[str] = Field(default_factory=list, max_length=MAX_KEYWORDS)
    lang: Literal["en", "zh"] = "en"
    filters: Filters | None = None


class SurpriseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: dict[str, Any] | None
    surpriseId: str = Field(min_length=1, max_length=100)
    keyword: str | None = Field(default=None, max_length=MAX_KEYWORD_CHARS)
    method: Literal["keyword_random", "pure_random", "fair_random"]
    seed: int = Field(ge=-(2**53), le=2**53)


class PublishRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: dict[str, Any] | None
    listingId: str = Field(min_length=1, max_length=100)
    pieceId: str = Field(min_length=1, max_length=100)
    approvalId: str = Field(min_length=1, max_length=100)


def _check_size(request: Request) -> None:
    length = request.headers.get("content-length")
    if length is not None and length.isdigit() and int(length) > MAX_BODY_BYTES:
        raise ApiError("bad_request", "The request body is larger than 2 MB.")


def _at(trigger: dict[str, Any] | None) -> int | float:
    at = (trigger or {}).get("at")
    return at if isinstance(at, (int, float)) and not isinstance(at, bool) and at >= 0 else 0


def _event(etype: str, at: int | float, payload: dict[str, Any]) -> dict[str, Any]:
    return {"id": _next_id(), "type": etype, "at": at, "source": "live", "key": KEY, "payload": payload}


def _elastic_error(exc: elastic.ElasticError) -> ApiError:
    if exc.code == "upstream_timeout":
        return ApiError("upstream_timeout", "Elastic didn't answer in time.")
    if exc.code == "key_missing":
        return ApiError("key_missing", "This needs ELASTIC_URL and the Elastic key (ELASTIC_API_KEY or ELASTIC_AUTH=proxy), which aren't set.")
    return ApiError("upstream_error", "Elastic answered with an error.")


@router.get("/status")
def get_status() -> dict[str, Any]:
    return elastic.status()


@router.post("/seed")
def post_seed(body: SeedRequest, request: Request) -> dict[str, Any]:
    _check_size(request)
    if not HASH_RE.match(body.passagesHash):
        raise ApiError("bad_request", "passagesHash must be a sha256 hex digest.")
    try:
        engine.seed(body.passagesHash)
    except elastic.SeedRefused as exc:
        raise ApiError(exc.code, exc.message) from None
    except b11data.DataError:
        raise ApiError("bad_request", "The server's catalog can't be read, so there's nothing to seed.") from None
    return {"events": []}


@router.post("/search")
def post_search(body: SearchRequest, request: Request) -> dict[str, Any]:
    _check_size(request)
    if any(len(k) > MAX_KEYWORD_CHARS for k in body.keywords):
        raise ApiError("bad_request", f"Each keyword is at most {MAX_KEYWORD_CHARS} characters.")
    filters = body.filters.model_dump(exclude_none=True) if body.filters else {}
    if not body.text.strip() and not [k for k in body.keywords if k.strip()]:
        raise ApiError("bad_request", "The search needs words or a keyword.")
    engine.PROCESS("working")
    try:
        answer = engine.search(body.text, body.keywords, body.lang, filters)
    except engine.NotReady:
        engine.PROCESS("done", 0)
        return {"events": []}
    except ValueError:
        engine.PROCESS("done", 0)
        raise ApiError("bad_request", "The search needs words or a keyword other than a price.") from None
    except b11data.DataError:
        engine.PROCESS("done", 0)
        raise ApiError("internal", "The server's catalog can't be read.") from None
    engine.PROCESS("done", len(answer["results"]))
    payload: dict[str, Any] = {
        "queryId": body.queryId,
        "results": answer["results"],
        "closeMatches": bool(answer["closeMatches"]),
        "engine": answer["engine"],
    }
    if answer.get("modelId"):
        payload["modelId"] = answer["modelId"]
    return {"events": [_event("search.answered", _at(body.trigger), payload)]}


@router.post("/surprise")
def post_surprise(body: SurpriseRequest, request: Request) -> dict[str, Any]:
    _check_size(request)
    engine.PROCESS("working")
    try:
        draw = engine.surprise(body.keyword, body.method, body.seed)
    except engine.NotReady:
        engine.PROCESS("done", 0)
        return {"events": []}
    except ValueError:
        engine.PROCESS("done", 0)
        raise ApiError("bad_request", "The draw's keyword or method isn't valid.") from None
    except b11data.DataError:
        engine.PROCESS("done", 0)
        raise ApiError("internal", "The server's catalog can't be read.") from None
    if draw is None:
        engine.PROCESS("done", 0)
        return {"events": []}
    engine.PROCESS("done", 1)
    return {"events": [_event("surprise.drawn", _at(body.trigger), {"surpriseId": body.surpriseId, **draw})]}


@router.post("/publish")
def post_publish(body: PublishRequest, request: Request) -> dict[str, Any]:
    _check_size(request)
    if not PERSON_LISTING_RE.match(body.listingId):
        raise ApiError("bad_request", "Only a person's own listing (lst_user_) is published here.")
    if not PIECE_RE.match(body.pieceId) or not ID_RE.match(body.approvalId):
        raise ApiError("bad_request", "pieceId or approvalId isn't a valid ID.")
    t = body.trigger or {}
    granted = t.get("type") == "approval.granted" and isinstance(t.get("payload"), dict) and t["payload"].get("approvalId") == body.approvalId
    if not granted:
        raise ApiError("bad_request", "The trigger must be the owner's approval.granted for this approval.")
    if not elastic.configured():
        raise ApiError("key_missing", "This needs ELASTIC_URL and the Elastic key (ELASTIC_API_KEY or ELASTIC_AUTH=proxy), which aren't set.")
    try:
        doc = engine.publish_listing(body.listingId, body.pieceId)
    except elastic.ElasticError as exc:
        raise _elastic_error(exc) from None
    if doc is None:
        raise ApiError("not_found", "There's no draft for that piece in cindia-drafts.")
    payload: dict[str, Any] = {
        "listingId": body.listingId,
        "pieceId": body.pieceId,
        "modelId": engine.MODEL_ID() or "cindia-embed-v1",
        "embedText": str(doc.get("embedText") or ""),
        "index": "cindia-pieces",
    }
    return {"events": [_event("listing.indexed", _at(body.trigger), payload)]}
