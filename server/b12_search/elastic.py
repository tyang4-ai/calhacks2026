"""Elastic Serverless over plain httpx REST (docs/plans/B12-search.md, Elastic access; B2-34).

- **Auth:** every request takes its headers from `config.elastic_headers()`: `Authorization: ApiKey
  <key>` with ELASTIC_API_KEY, nothing with ELASTIC_AUTH=proxy (the cloud's network secret adds it).
  B12 never builds an auth header itself. The base URL is ELASTIC_URL. Nothing here logs a header, a
  key, a URL or a response body, and main.py keeps the httpx loggers at WARNING.
- **Indices:** `cindia-pieces-v1` behind alias `cindia-pieces` (the active pieces, then approved
  listings) and `cindia-drafts-v1` behind alias `cindia-drafts` (drafted listings waiting for the
  owner), one mapping for both, no shard or replica settings (Serverless rejects them). Every write
  takes `resource_already_exists_exception` as success.
- **Seed:** `start_seed(passages_hash)` checks first (vectors with B11's current fingerprint, the
  same catalog hash as the browser's), then seeds in one background thread, single flight, inside
  60 seconds: both indices, one bulk write of every piece (ID the pieceId, so a reseed overwrites,
  each with the fingerprint, `refresh=wait_for`), then agent.ensure_agent() and one test
  conversation, whose result is `agentBuilder`. An Agent Builder error never fails the seed.
- **Search:** `search(...)` sends one retrievers request, `rrf` (rank constant 60, window 50, size 12)
  over a `standard` retriever (a multi_match of the text and chips over the titles, embedText and
  the facets, motifs and moods weighted up) and a `knn` retriever on `vector` (k 24, 100 candidates),
  the same filters on both, inside one 2.5-second budget. When the cluster rejects the retrievers
  request (a 400) and budget remains, it runs the two queries separately and fuses them with the
  same RRF, noting it once in the log. Anything else, or a spent budget, raises ElasticError and
  the caller goes local.
- **Status:** `status()` answers from a cache in well under a second. A background thread
  refreshes it every 30 seconds while Elastic is configured: `GET /` as the cluster check
  (Serverless answers 410 to `_cluster/*`), `_count` on both aliases, and one document's
  `fingerprint`. It never runs a conversation.
- **Drafts:** `index_draft(doc)` writes one document into `cindia-drafts`, `publish_doc(pieceId)`
  copies it into `cindia-pieces` as active and deletes the draft.

Tests set TRANSPORT to an httpx.MockTransport and ELASTIC_URL to a fake host, so nothing calls out.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from collections.abc import Callable, Mapping, Sequence
from typing import Any

import httpx

from server import config
from server.b12_search import catalog, local, thresholds

log = logging.getLogger("cindia.b12")

PIECES = "cindia-pieces"
DRAFTS = "cindia-drafts"
PIECES_INDEX = "cindia-pieces-v1"
DRAFTS_INDEX = "cindia-drafts-v1"
DIMS = 384

_TEXT_KW = {"type": "text", "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}}
MAPPING: dict[str, Any] = {
    "dynamic": False,
    "properties": {
        **{f: {"type": "keyword"} for f in ("pieceId", "communityId", "makerId", "storefrontSlug", "status", "fingerprint")},
        "priceCents": {"type": "integer"},
        "salesThisMonth": {"type": "integer"},
        "title_en": {"type": "text", "analyzer": "english"},
        "title_zh": {"type": "text", "analyzer": "standard"},
        "object": {"type": "text"},
        "object_zh": {"type": "text", "analyzer": "standard"},
        "craft": {"type": "text"},
        "craft_zh": {"type": "text", "analyzer": "standard"},
        "people": {"type": "text"},
        "place": {"type": "text"},
        "embedText": {"type": "text"},
        **{f: dict(_TEXT_KW) for f in catalog.LIST_FIELDS},
        "vector": {
            "type": "dense_vector",
            "dims": DIMS,
            "index": True,
            "similarity": "cosine",
            "index_options": {"type": "int8_hnsw"},
        },
    },
}

# The multi_match fields, motifs and moods weighted up (B12-search.md, search step 3).
MATCH_FIELDS = [
    "title_en^1.5",
    "title_zh^1.5",
    "object^1.5",
    "object_zh",
    "craft",
    "craft_zh",
    "people",
    "place",
    "embedText",
    "materials",
    "techniques",
    "motifs^2",
    "colors",
    "moods^2",
    "occasions",
    "recipients",
]
SOURCE_FIELDS = [
    "pieceId", "communityId", "makerId", "storefrontSlug", "status", "fingerprint", "priceCents", "salesThisMonth",
    "title_en", "title_zh", "object", "object_zh", "craft", "craft_zh", "people", "place", "embedText", *catalog.LIST_FIELDS,
]

# Tests install an httpx.MockTransport here.
TRANSPORT: httpx.BaseTransport | None = None


class ElasticError(Exception):
    """Elastic didn't answer in time or answered with an error. The message is one plain sentence."""

    def __init__(self, code: str, message: str, *, status: int | None = None, rejected: bool = False):
        super().__init__(message)
        self.code = code  # upstream_timeout | upstream_error | key_missing | not_found
        self.message = message
        self.status = status
        self.rejected = rejected


class Budget:
    """One deadline shared by every call in a step."""

    def __init__(self, seconds: float):
        self.end = time.monotonic() + max(0.0, seconds)

    def left(self) -> float:
        return self.end - time.monotonic()

    def timeout(self, cap: float | None = None) -> float:
        left = self.left()
        if left <= 0.05:
            raise ElasticError("upstream_timeout", "Elastic didn't answer in time.")
        return min(left, cap) if cap else left


def configured() -> bool:
    """True when ELASTIC_URL and a key (or the proxy flag) are set."""
    return config.has_key("ELASTIC_API_KEY")


def kibana_configured() -> bool:
    return configured() and bool(config.KIBANA_URL)


# ---------------------------------------------------------------------------------------------
# One client per base URL, auth and transport, kept for its connections

_client_lock = threading.Lock()
_clients: dict[tuple[Any, ...], httpx.Client] = {}


def client_for(base_url: str, extra: Mapping[str, str] | None = None) -> httpx.Client:
    """A shared client for one base URL. Headers come from config.elastic_headers() only."""
    headers = {**config.elastic_headers(), "Accept": "application/json", **(extra or {})}
    key = (base_url.rstrip("/"), tuple(sorted(headers.items())), id(TRANSPORT))
    with _client_lock:
        c = _clients.get(key)
        if c is None:
            if len(_clients) > 8:
                for old in _clients.values():
                    old.close()
                _clients.clear()
            c = httpx.Client(base_url=base_url.rstrip("/"), headers=headers, timeout=5.0, transport=TRANSPORT)
            _clients[key] = c
        return c


def _es() -> httpx.Client:
    if not configured():
        raise ElasticError("key_missing", "Elastic isn't configured (ELASTIC_URL and its key).")
    return client_for(str(config.ELASTIC_URL))


def _error_type(resp: httpx.Response) -> str:
    try:
        body = resp.json()
    except ValueError:
        return ""
    err = body.get("error") if isinstance(body, dict) else None
    if isinstance(err, dict):
        return str(err.get("type") or "")
    return ""


def request(method: str, path: str, budget: Budget, *, body: Any = None, content: str | None = None,
            params: Mapping[str, Any] | None = None, cap: float | None = None, ok404: bool = False,
            ndjson: bool = False) -> httpx.Response:
    """One Elastic call inside the budget. Raises ElasticError for a timeout, a network failure or
    a status of 400 and up (404 passes when `ok404`, and resource_already_exists_exception always)."""
    client = _es()
    headers = {"Content-Type": "application/x-ndjson" if ndjson else "application/json"}
    try:
        resp = client.request(
            method,
            path,
            json=body if content is None else None,
            content=content,
            params=params,
            headers=headers,
            timeout=budget.timeout(cap),
        )
    except httpx.TimeoutException:
        raise ElasticError("upstream_timeout", "Elastic didn't answer in time.") from None
    except httpx.HTTPError as exc:
        raise ElasticError("upstream_error", f"Elastic couldn't be reached ({type(exc).__name__}).") from None
    if resp.status_code < 400:
        return resp
    if resp.status_code == 404 and ok404:
        return resp
    kind = _error_type(resp)
    if resp.status_code == 400 and kind == "resource_already_exists_exception":
        return resp
    raise ElasticError(
        "upstream_error",
        f"Elastic answered {resp.status_code}{f' ({kind})' if kind else ''}.",
        status=resp.status_code,
        rejected=resp.status_code == 400,
    )


# ---------------------------------------------------------------------------------------------
# Indices and documents


def ensure_index(index: str, alias: str, budget: Budget) -> None:
    """Creates the index with its alias and the mapping, or finds it already there and adds any
    field the mapping gained since (an existing field's definition never changes)."""
    resp = request("PUT", f"/{index}", budget, body={"mappings": MAPPING, "aliases": {alias: {}}})
    if resp.status_code == 400:  # resource_already_exists_exception
        request("PUT", f"/{index}/_mapping", budget, body=MAPPING)


def ensure_indices(budget: Budget) -> None:
    ensure_index(PIECES_INDEX, PIECES, budget)
    ensure_index(DRAFTS_INDEX, DRAFTS, budget)


def bulk_body(docs: Sequence[Mapping[str, Any]], index: str = PIECES_INDEX) -> str:
    lines: list[str] = []
    for doc in docs:
        lines.append(json.dumps({"index": {"_index": index, "_id": doc["pieceId"]}}))
        lines.append(json.dumps(doc, ensure_ascii=False))
    return "\n".join(lines) + "\n"


def bulk(docs: Sequence[Mapping[str, Any]], budget: Budget) -> int:
    """Writes the documents into cindia-pieces and waits for the refresh. Returns how many failed."""
    resp = request("POST", "/_bulk", budget, content=bulk_body(docs), params={"refresh": "wait_for"},
                   cap=thresholds.BULK_TIMEOUT_S, ndjson=True)
    body = resp.json()
    if not body.get("errors"):
        return 0
    return sum(1 for item in body.get("items") or [] if (item.get("index") or {}).get("error"))


def put_doc(alias: str, doc: Mapping[str, Any], budget: Budget) -> None:
    request("PUT", f"/{alias}/_doc/{doc['pieceId']}", budget, body=dict(doc), params={"refresh": "wait_for"})


def get_doc(alias: str, piece_id: str, budget: Budget) -> dict[str, Any] | None:
    """One document's _source by ID through a search (works on an alias), or None. Asks for the
    vector back; a cluster that refuses that is asked again without it."""
    query = {"query": {"ids": {"values": [piece_id]}}, "size": 1}
    try:
        resp = request("POST", f"/{alias}/_search", budget, body={**query, "_source": {"exclude_vectors": False}}, ok404=True)
    except ElasticError as exc:
        if not exc.rejected:
            raise
        resp = request("POST", f"/{alias}/_search", budget, body=query, ok404=True)
    if resp.status_code == 404:
        return None
    hits = ((resp.json().get("hits") or {}).get("hits")) or []
    return dict(hits[0].get("_source") or {}) if hits else None


def delete_doc(alias: str, piece_id: str, budget: Budget) -> None:
    request("DELETE", f"/{alias}/_doc/{piece_id}", budget, params={"refresh": "wait_for"}, ok404=True)


def count(alias: str, budget: Budget) -> int:
    resp = request("GET", f"/{alias}/_count", budget, ok404=True, cap=thresholds.STATUS_CALL_TIMEOUT_S)
    if resp.status_code == 404:
        return 0
    n = resp.json().get("count")
    return n if isinstance(n, int) else 0


def fingerprint_of_index(budget: Budget, piece_id: str | None) -> str | None:
    """One catalog document's fingerprint, or any document's when that one is missing."""
    query: dict[str, Any] = {"term": {"pieceId": piece_id}} if piece_id else {"match_all": {}}
    resp = request("POST", f"/{PIECES}/_search", budget, body={"size": 1, "_source": ["fingerprint"], "query": query},
                   ok404=True, cap=thresholds.STATUS_CALL_TIMEOUT_S)
    if resp.status_code == 404:
        return None
    hits = ((resp.json().get("hits") or {}).get("hits")) or []
    fp = (hits[0].get("_source") or {}).get("fingerprint") if hits else None
    return fp if isinstance(fp, str) else None


# Vectors this process wrote into drafts or published, by pieceId, for closeness on pieces that
# aren't in vectors.json.
_extra_vectors: dict[str, list[float]] = {}


def remember_vector(piece_id: str, vector: Sequence[float] | None) -> None:
    if vector is not None and len(vector) == DIMS:
        _extra_vectors[piece_id] = [float(x) for x in vector]


def extra_vectors() -> dict[str, list[float]]:
    return dict(_extra_vectors)


def index_draft(doc: Mapping[str, Any], budget: Budget) -> None:
    """Writes one draft document into cindia-drafts (creating the index the first time)."""
    ensure_index(DRAFTS_INDEX, DRAFTS, budget)
    put_doc(DRAFTS, {**doc, "status": "draft"}, budget)
    remember_vector(str(doc.get("pieceId")), doc.get("vector"))
    mark_counts_stale()


def publish_doc(piece_id: str, budget: Budget) -> dict[str, Any] | None:
    """Copies the draft into cindia-pieces as active and deletes the draft. None when there's no
    such draft. Raises ElasticError when the copy can't be made."""
    draft = get_doc(DRAFTS, piece_id, budget)
    if draft is None:
        return None
    vector = draft.get("vector") if isinstance(draft.get("vector"), list) else _extra_vectors.get(piece_id)
    if not vector or len(vector) != DIMS:
        raise ElasticError("upstream_error", "The draft's vector couldn't be read back from Elastic.")
    doc = {**{k: v for k, v in draft.items() if k != "vector"}, "status": "active", "vector": vector}
    put_doc(PIECES, doc, budget)
    delete_doc(DRAFTS, piece_id, budget)
    remember_vector(piece_id, vector)
    mark_counts_stale()
    return doc


# ---------------------------------------------------------------------------------------------
# Search


def filter_clauses(flt: local.Filters) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = [{"term": {"status": "active"}}]
    if flt.max_price_cents is not None:
        out.append({"range": {"priceCents": {"lte": flt.max_price_cents}}})
    if flt.community_ids is not None:
        out.append({"terms": {"communityId": sorted(flt.community_ids)}})
    return out


def match_query(query: str) -> dict[str, Any]:
    return {"multi_match": {"query": query, "fields": MATCH_FIELDS, "type": "best_fields", "tie_breaker": 0.3}}


def knn_clause(vector: Sequence[float], flt: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "field": "vector",
        "query_vector": [float(x) for x in vector],
        "k": thresholds.KNN_K,
        "num_candidates": thresholds.NUM_CANDIDATES,
        "filter": flt,
    }


def retrievers_body(vector: Sequence[float], query: str, flt: local.Filters, size: int = thresholds.SIZE) -> dict[str, Any]:
    """The one hybrid request: rrf over a standard (multi_match) and a knn retriever."""
    clauses = filter_clauses(flt)
    knn = {"knn": knn_clause(vector, clauses)}
    if not query.strip():
        return {"size": size, "_source": SOURCE_FIELDS, "retriever": knn}
    return {
        "size": size,
        "_source": SOURCE_FIELDS,
        "retriever": {
            "rrf": {
                "retrievers": [
                    {"standard": {"query": match_query(query), "filter": clauses}},
                    knn,
                ],
                "rank_constant": thresholds.RANK_CONSTANT,
                "rank_window_size": thresholds.RANK_WINDOW,
            }
        },
    }


def _hits(resp: httpx.Response) -> list[dict[str, Any]]:
    hits = ((resp.json().get("hits") or {}).get("hits")) or []
    return [h for h in hits if isinstance(h, dict) and isinstance(h.get("_source"), dict)]


_split_noted = [False]


def search(vector: Sequence[float], query: str, flt: local.Filters, budget: Budget,
           size: int = thresholds.SIZE) -> tuple[list[tuple[str, float]], dict[str, dict[str, Any]], str]:
    """The hybrid on Elastic: (fused ranking, documents by pieceId, how it ran). Raises ElasticError
    when it can't answer inside the budget."""
    docs: dict[str, dict[str, Any]] = {}
    try:
        resp = request("POST", f"/{PIECES}/_search", budget, body=retrievers_body(vector, query, flt, size))
        fused: list[tuple[str, float]] = []
        for h in _hits(resp):
            src = h["_source"]
            pid = str(src.get("pieceId") or h.get("_id") or "")
            if pid and pid not in docs:
                docs[pid] = src
                fused.append((pid, float(h.get("_score") or 0.0)))
        return fused, docs, "retrievers"
    except ElasticError as exc:
        if not exc.rejected:
            raise
    if not _split_noted[0]:
        _split_noted[0] = True
        log.info("b12 elastic: the retrievers request was refused, so the two queries run separately and fuse here")
    clauses = filter_clauses(flt)
    dense: list[str] = []
    resp = request("POST", f"/{PIECES}/_search", budget, body={
        "size": thresholds.KNN_K, "_source": SOURCE_FIELDS, "knn": knn_clause(vector, clauses)})
    for h in _hits(resp):
        pid = str(h["_source"].get("pieceId") or h.get("_id") or "")
        if pid and pid not in dense:
            dense.append(pid)
            docs.setdefault(pid, h["_source"])
    keyword: list[str] = []
    if query.strip():
        resp = request("POST", f"/{PIECES}/_search", budget, body={
            "size": thresholds.RANK_WINDOW, "_source": SOURCE_FIELDS,
            "query": {"bool": {"must": [match_query(query)], "filter": clauses}}})
        for h in _hits(resp):
            if float(h.get("_score") or 0.0) <= 0.0:
                continue
            pid = str(h["_source"].get("pieceId") or h.get("_id") or "")
            if pid and pid not in keyword:
                keyword.append(pid)
                docs.setdefault(pid, h["_source"])
    return local.fuse(dense, keyword)[:size], docs, "split"


def msearch(bodies: Sequence[Mapping[str, Any]], budget: Budget) -> list[list[str] | None]:
    """Many searches in one request (the live eval): each one's pieceIds, or None for an error."""
    lines: list[str] = []
    for b in bodies:
        lines.append("{}")
        lines.append(json.dumps(b))
    resp = request("POST", f"/{PIECES}/_msearch", budget, content="\n".join(lines) + "\n", ndjson=True)
    out: list[list[str] | None] = []
    for r in resp.json().get("responses") or []:
        if not isinstance(r, dict) or r.get("error"):
            out.append(None)
            continue
        hits = ((r.get("hits") or {}).get("hits")) or []
        out.append([str((h.get("_source") or {}).get("pieceId") or h.get("_id")) for h in hits])
    return out


# ---------------------------------------------------------------------------------------------
# Status cache, its refresher, and the seed

_state_lock = threading.Lock()


def _blank() -> dict[str, Any]:
    return {
        "elastic": False,
        "indexed": 0,
        "drafts": 0,
        "fingerprint": None,
        "agentBuilder": False,
        "seeding": False,
        "seedError": None,
    }


_status: dict[str, Any] = _blank()
_meta: dict[str, Any] = {"refreshed": 0.0, "thread": None, "stop": threading.Event(), "wake": threading.Event(), "seed_thread": None}


def status() -> dict[str, Any]:
    """The cached status. The first call starts the refresher and waits up to 0.6 seconds for its
    first answer, so the answer still comes in under a second."""
    if configured():
        first = _ensure_refresher()
        if first is not None:
            first.wait(0.6)
    with _state_lock:
        out = dict(_status)
    if not configured():
        out["elastic"] = False
    return out


def _ensure_refresher() -> threading.Event | None:
    """Starts the refresher thread if it isn't running. Returns an event set after its first pass
    when it was just started."""
    with _state_lock:
        t = _meta["thread"]
        if t is not None and t.is_alive():
            return None
        stop = threading.Event()
        first = threading.Event()
        _meta["stop"] = stop
        t = threading.Thread(target=_refresh_loop, args=(stop, first), name="b12-status", daemon=True)
        _meta["thread"] = t
    t.start()
    return first


def _refresh_loop(stop: threading.Event, first: threading.Event) -> None:
    while not stop.is_set():
        try:
            refresh_status()
        except Exception as exc:  # the refresher never dies
            log.info("b12 status refresh failed (%s)", type(exc).__name__)
        first.set()
        wake = _meta["wake"]
        wake.wait(thresholds.STATUS_REFRESH_S)
        wake.clear()
        if not configured():
            break


def mark_counts_stale() -> None:
    """Asks the refresher for a pass now (after a draft or a publish changes a count)."""
    _meta["wake"].set()


def _first_piece_id() -> str | None:
    try:
        ids = catalog.get().active_ids()
    except Exception:
        return None
    return ids[0] if ids else None


def refresh_status() -> dict[str, Any]:
    """One pass: the cluster check, both counts and one document's fingerprint."""
    if not configured():
        with _state_lock:
            _status["elastic"] = False
            return dict(_status)
    budget = Budget(4 * thresholds.STATUS_CALL_TIMEOUT_S)
    update: dict[str, Any] = {}
    try:
        request("GET", "/", budget, cap=thresholds.STATUS_CALL_TIMEOUT_S)
        update["elastic"] = True
        update["indexed"] = count(PIECES, budget)
        update["drafts"] = count(DRAFTS, budget)
        update["fingerprint"] = fingerprint_of_index(budget, _first_piece_id()) if update["indexed"] else None
    except ElasticError as exc:
        update = {"elastic": False} if "indexed" not in update else update
        log.info("b12 status: %s", exc.message)
    with _state_lock:
        if not _meta.get("seeded_here") and update.get("fingerprint"):
            # No seed ran in this process: agentBuilder is the last seed's result, when that seed
            # wrote the index's current fingerprint. Never a conversation (B2-24).
            last = read_last_seed()
            update["agentBuilder"] = bool(last.get("agentBuilder")) and last.get("fingerprint") == update["fingerprint"]
        _status.update(update)
        _meta["refreshed"] = time.monotonic()
        return dict(_status)


# Where the last seed's result is kept, so a restarted server reports agentBuilder without a
# conversation. Not committed (artifacts/). Tests point it at a temporary file.
LAST_SEED_PATH = catalog.b11data.REPO_ROOT / "artifacts" / "b12" / "last_seed.json"


def read_last_seed() -> dict[str, Any]:
    try:
        value = json.loads(LAST_SEED_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return value if isinstance(value, dict) else {}


def write_last_seed(fingerprint: str | None, agent_ok: bool, indexed: int) -> None:
    try:
        LAST_SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp = LAST_SEED_PATH.with_name(f"last_seed.{threading.get_ident()}.tmp")
        tmp.write_text(json.dumps({"fingerprint": fingerprint, "agentBuilder": agent_ok, "indexed": indexed}) + "\n", encoding="utf-8")
        tmp.replace(LAST_SEED_PATH)
    except OSError:
        pass


class SeedRefused(Exception):
    """The seed's checks failed before any thread started. The message is one plain sentence."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def start_seed(passages_hash: str, prepare: Callable[[], tuple[list[dict[str, Any]], str]],
               agent_step: Callable[[Budget], bool] | None = None) -> bool:
    """Checks, then seeds in a background thread. `prepare()` returns the documents (with vectors
    and the fingerprint) and the server's passagesHash, or raises SeedRefused. Returns True when a
    seed thread started, False when one was already running (single flight)."""
    if not configured():
        raise SeedRefused("key_missing", "Seeding needs ELASTIC_URL and the Elastic key (ELASTIC_API_KEY or ELASTIC_AUTH=proxy), which aren't set.")
    docs, server_hash = prepare()
    if passages_hash != server_hash:
        raise SeedRefused("bad_request", "The browser and the server hold different catalogs, so the seed was refused.")
    with _state_lock:
        t = _meta["seed_thread"]
        if _status["seeding"] or (t is not None and t.is_alive()):
            return False
        _status["seeding"] = True
        _status["seedError"] = None
        t = threading.Thread(target=_seed, args=(docs, agent_step), name="b12-seed", daemon=True)
        _meta["seed_thread"] = t
    t.start()
    return True


def _seed(docs: list[dict[str, Any]], agent_step: Callable[[Budget], bool] | None) -> None:
    budget = Budget(thresholds.SEED_BUDGET_S)
    error: str | None = None
    agent_ok = False
    t0 = time.monotonic()
    try:
        ensure_indices(budget)
        failed = bulk(docs, budget)
        if failed:
            error = f"Elastic refused {failed} of the {len(docs)} documents."
        if error is None and agent_step is not None:
            try:
                agent_ok = bool(agent_step(budget))
            except Exception as exc:  # Agent Builder never fails the seed
                log.info("b12 seed: Agent Builder step failed (%s)", type(exc).__name__)
                agent_ok = False
    except ElasticError as exc:
        error = f"The seed failed: {exc.message}"
    except Exception as exc:
        error = f"The seed failed ({type(exc).__name__})."
    log.info("b12 seed: %d documents, %s, agentBuilder %s, %.1f s", len(docs), "ok" if error is None else "failed",
             agent_ok, time.monotonic() - t0)
    with _state_lock:
        _status["seeding"] = False
        _status["seedError"] = error
        _status["agentBuilder"] = agent_ok
        _meta["seeded_here"] = True
    if error is None:
        write_last_seed(docs[0].get("fingerprint") if docs else None, agent_ok, len(docs))
    try:
        refresh_status()
    except Exception:
        pass
    mark_counts_stale()


def wait_seed(timeout: float) -> bool:
    """Waits for a running seed (tests and the live eval). True when none is running at the end."""
    t = _meta.get("seed_thread")
    if t is not None:
        t.join(timeout)
        return not t.is_alive()
    return True


def set_status_for_tests(**fields: Any) -> None:
    with _state_lock:
        _status.update(fields)


def reset() -> None:
    """Stops the refresher, forgets the cache, the clients and the remembered vectors (tests)."""
    _meta["stop"].set()
    _meta["wake"].set()
    t = _meta.get("thread")
    if t is not None:
        t.join(1.0)
    with _state_lock:
        _status.clear()
        _status.update(_blank())
        _meta.update(refreshed=0.0, thread=None, stop=threading.Event(), wake=threading.Event(), seed_thread=None, seeded_here=False)
    with _client_lock:
        for c in _clients.values():
            c.close()
        _clients.clear()
    _extra_vectors.clear()
    _split_noted[0] = False
