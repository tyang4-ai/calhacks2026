"""B12's module functions, wiring B11's model, the catalog, Elastic and Agent Builder together
(docs/plans/B12-search.md, Python module for B14 and the Indexer).

- `search(text, keywords, lang, filters, k=12)`: the query vector from B11's `encode_queries` on
  `compose.query_text(text, keywords)`, then Elastic's hybrid (engine `elastic_hybrid`) inside its
  2.5-second budget, or the same fusion locally (engine `local_hybrid`) when Elastic isn't
  configured, doesn't answer in time, or holds another fingerprint's vectors. Returns
  `{ "results", "closeMatches", "engine", "modelId" }`. Raises NotReady while B11's model isn't
  trained and warm, and ValueError when there are neither words nor chips.
- `surprise(keyword, method, seed)`: the surprise.drawn payload without surpriseId (surprise.py).
- `converse(text)`: `{ "pieceIds", "ms" }` from the agent `cindia-finder` (agent.py). Raises on failure.
- `index_draft(entry, piece, community, vector) -> bool`: one document into `cindia-drafts`, status
  "draft", with the current fingerprint.
- `publish(listingId, pieceId) -> bool`: copies the draft into `cindia-pieces` as active and deletes it.
- `seed(passages_hash)`: the background seed's checks and start (elastic.start_seed).

The seams (ENCODE, VECTORS, VECTORS_FILE, FINGERPRINT, MODEL_ID, PROCESS) are module attributes so
tests swap in fakes: no test loads a model or calls out. Torch is never imported here.
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable, Mapping, Sequence
from typing import Any

import numpy as np

from server.b11_embed import compose
from server.b12_search import agent, catalog, elastic, local, surprise as surprise_mod, thresholds

log = logging.getLogger("cindia.b12")

NO_VECTORS = "No matching vectors yet. Train B11 first."
TEST_QUESTION = "wool pieces under $100 from Arizona"


class NotReady(Exception):
    """B11's model isn't trained or warm yet."""


# ---------------------------------------------------------------------------------------------
# Seams onto B11


def _encode(text: str) -> list[float]:
    from server.b11_embed import model as b11model

    if not b11model.is_warm():
        b11model.start_warmup()
        raise NotReady("The search model isn't warm yet.")
    try:
        return b11model.encode_array([text], "query", timeout=thresholds.ENCODE_WAIT_S)[0].tolist()
    except (b11model.NotReady, b11model.Busy) as exc:
        raise NotReady(str(exc) or "The search model is busy.") from None


_vec_lock = threading.Lock()
_vec_cache: dict[str, Any] = {}


def _vectors() -> local.Vectors:
    from server.b11_embed import model as b11model

    fp = b11model.fingerprint()
    with _vec_lock:
        if _vec_cache.get("fp") == fp and _vec_cache.get("vectors") is not None:
            return _vec_cache["vectors"]
    try:
        by_id = b11model.piece_vectors()
    except b11model.NotReady as exc:
        raise NotReady(str(exc)) from None
    ids = sorted(by_id)
    vectors = local.Vectors(ids, np.asarray([by_id[i] for i in ids], dtype=np.float64))
    with _vec_lock:
        _vec_cache.update(fp=fp, vectors=vectors)
    return vectors


def _vectors_file() -> tuple[str | None, str | None, str | None, dict[str, list[float]]]:
    """(vectors.json's fingerprint, report.json's fingerprint, report.json's passagesHash, vectors)."""
    from server.b11_embed import model as b11model

    report = b11model.read_report() or {}
    try:
        raw = b11model._read_json(b11model.VECTORS_PATH)  # noqa: SLF001 (B11's stat-cached reader)
    except ValueError:
        raw = None
    if not isinstance(raw, dict):
        return None, report.get("fingerprint"), report.get("passagesHash"), {}
    vecs = {str(p.get("pieceId")): p.get("vector") for p in raw.get("pieces") or [] if isinstance(p, dict)}
    return raw.get("fingerprint"), report.get("fingerprint"), report.get("passagesHash"), vecs


def _fingerprint() -> str | None:
    from server.b11_embed import model as b11model

    return b11model.fingerprint()


def _model_id() -> str | None:
    from server.b11_embed import model as b11model

    report = b11model.read_report() or {}
    mid = report.get("modelId")
    return mid if isinstance(mid, str) else None


def _process(status: str, count: int = 0) -> None:
    """The search process row (C-4), through B13's ordered queue when its bridge is importable."""
    try:
        from server.b13_spacetime import bridge
    except Exception:
        return
    try:
        bridge.set_process("search", status, count)
    except Exception:
        pass


ENCODE: Callable[[str], list[float]] = _encode
VECTORS: Callable[[], local.Vectors] = _vectors
VECTORS_FILE: Callable[[], tuple[str | None, str | None, str | None, dict[str, list[float]]]] = _vectors_file
FINGERPRINT: Callable[[], str | None] = _fingerprint
MODEL_ID: Callable[[], str | None] = _model_id
PROCESS: Callable[..., None] = _process

_published: set[str] = set()
_noted: set[str] = set()


def _note(kind: str, message: str) -> None:
    if kind not in _noted:
        _noted.add(kind)
        log.info("b12 search went local: %s", message)


# ---------------------------------------------------------------------------------------------
# Search


def _elastic_ready(fp: str | None) -> bool:
    if not elastic.configured():
        return False
    with elastic._state_lock:  # noqa: SLF001 (peek, never trigger a refresh)
        st = dict(elastic._status)  # noqa: SLF001
        refreshed = elastic._meta["refreshed"]  # noqa: SLF001
    if refreshed and (not st.get("elastic") or not st.get("indexed")):
        return False
    if st.get("fingerprint") and fp and st["fingerprint"] != fp:
        _note("fingerprint", "the index holds another model's vectors")
        return False
    return True


def _cos_map(vec: Sequence[float], vectors: local.Vectors, extra_ids: Sequence[str] = ()) -> dict[str, float]:
    cos = local.cosines(vec, vectors.matrix)
    out = {pid: float(cos[i]) for i, pid in enumerate(vectors.ids)}
    extra = elastic.extra_vectors()
    for pid in extra_ids:
        if pid not in out and pid in extra:
            out[pid] = float(local.cosines(vec, np.asarray([extra[pid]], dtype=np.float64))[0])
    return out


def search(
    text: str,
    keywords: Sequence[str] | None = None,
    lang: str = "en",
    filters: Mapping[str, Any] | None = None,
    k: int = thresholds.SIZE,
    *,
    budget: float = thresholds.ELASTIC_BUDGET_S,
) -> dict[str, Any]:
    """One search. See the module docstring."""
    keywords = [str(x) for x in (keywords or []) if isinstance(x, str)]
    query = compose.query_text(text, keywords)  # ValueError when there's nothing to embed
    vec = ENCODE(query)
    cat = catalog.get()
    vectors = VECTORS()
    flt = local.Filters.of(keywords, filters)
    size = max(1, min(int(k), thresholds.SIZE))
    fp = FINGERPRINT()
    answer: dict[str, Any] | None = None
    if _elastic_ready(fp):
        try:
            fused, docs, _how = elastic.search(vec, local.keyword_query(text, keywords), flt, elastic.Budget(budget), size)
            stale = [pid for pid, d in docs.items() if pid in cat.docs and fp and d.get("fingerprint") != fp]
            if stale:
                _note("stale", "the index holds another model's vectors")
                raise elastic.ElasticError("upstream_error", "The index's fingerprint isn't B11's.")
            docs = {pid: d for pid, d in docs.items() if flt.allows(d)}
            cos = _cos_map(vec, vectors, [pid for pid, _ in fused])
            in_catalog = [cos[pid] for pid in cat.active_ids() if pid in cos]
            base = float(np.mean(in_catalog)) if in_catalog else None
            results, close = local.results(fused, docs, keywords, cat.aliases, cos, base, size)
            answer = {"results": results, "closeMatches": close, "engine": "elastic_hybrid"}
        except elastic.ElasticError as exc:
            _note(exc.code, exc.message)
            answer = None
    if answer is None:
        ranked = local.rank(cat, vectors, vec, text, keywords, filters, size)
        answer = {"results": ranked["results"], "closeMatches": ranked["closeMatches"], "engine": "local_hybrid"}
    answer["modelId"] = MODEL_ID()
    return answer


def surprise(keyword: str | None, method: str, seed: int, *, budget: float = thresholds.SURPRISE_ELASTIC_BUDGET_S) -> dict[str, Any] | None:
    """The surprise.drawn payload without surpriseId, or None when there's no piece to draw.
    A keyword draw needs the model (NotReady otherwise). pure_random needs nothing."""
    cat = catalog.get()
    ranked: list[tuple[str, float]] | None = None
    kw = (keyword or "").strip()
    if method not in surprise_mod.METHODS:
        raise ValueError(f"unknown method {method!r}")
    if method != "pure_random" and kw:
        res = search(kw, [kw], "en", {}, budget=budget)
        ranked = [(r["pieceId"], float(r["score"])) for r in res["results"]]
    sales = {pid: cat.docs[pid].get("salesThisMonth") for pid in cat.order}
    return surprise_mod.draw(kw or None, method, seed, ranked=ranked, active_ids=cat.active_ids(), sales=sales)


# ---------------------------------------------------------------------------------------------
# Agent Builder


def valid_piece_ids() -> set[str]:
    try:
        ids = set(catalog.get().active_ids())
    except Exception:
        ids = set()
    return ids | set(_published)


def converse(text: str) -> dict[str, Any]:
    """`{ "pieceIds", "ms" }` from cindia-finder. Raises agent.AgentError on any failure."""
    return agent.converse(text, valid_piece_ids())


def agent_step(budget: elastic.Budget) -> bool:
    """The seed's Agent Builder step: create or update the agent, then one test conversation.
    True only when the conversation named at least one catalog piece."""
    if not elastic.kibana_configured():
        return False
    agent.ensure_agent(budget)
    left = min(thresholds.SEED_CONVERSE_TIMEOUT_S, budget.left())
    if left <= 0.5:
        return False
    res = agent.converse(TEST_QUESTION, valid_piece_ids(), timeout=left)
    log.info("b12 agent: test conversation named %d pieces in %d ms", len(res["pieceIds"]), res["ms"])
    return bool(res["pieceIds"])


# ---------------------------------------------------------------------------------------------
# Seed, drafts and publishing


def prepare_seed() -> tuple[list[dict[str, Any]], str]:
    """The seed's documents (every active piece with its vector and the fingerprint) and the
    server's passagesHash. Raises elastic.SeedRefused with the contract's 400 when the vectors don't
    carry B11's current fingerprint."""
    from server.b11_embed import data as b11data

    try:
        cat = catalog.get()
    except b11data.DataError:
        raise elastic.SeedRefused("bad_request", "The server's catalog can't be read, so there's nothing to seed.") from None
    vec_fp, report_fp, report_hash, vecs = VECTORS_FILE()
    if not report_fp or vec_fp != report_fp or report_hash != cat.passages_hash:
        raise elastic.SeedRefused("bad_request", NO_VECTORS)
    docs: list[dict[str, Any]] = []
    for pid in cat.active_ids():
        v = vecs.get(pid)
        if not isinstance(v, list) or len(v) != elastic.DIMS:
            raise elastic.SeedRefused("bad_request", NO_VECTORS)
        docs.append({**cat.docs[pid], "fingerprint": report_fp, "vector": [float(x) for x in v]})
    return docs, cat.passages_hash


def seed(passages_hash: str) -> bool:
    """Checks and starts the background seed. True when a seed started, False when one runs."""
    return elastic.start_seed(passages_hash, prepare_seed, agent_step)


def index_draft(entry: Mapping[str, Any], piece: Mapping[str, Any], community: Mapping[str, Any] | None,
                vector: Sequence[float] | None) -> bool:
    """Writes or overwrites one draft in cindia-drafts. False when Elastic isn't there or refuses."""
    if not elastic.configured() or vector is None or len(vector) != elastic.DIMS:
        return False
    doc = catalog.document(entry, piece, community, status="draft", fingerprint=FINGERPRINT(), vector=list(vector))
    if not doc["pieceId"]:
        return False
    try:
        elastic.index_draft(doc, elastic.Budget(3.0))
        return True
    except elastic.ElasticError as exc:
        log.info("b12 draft not indexed: %s", exc.message)
        return False


def publish_listing(listing_id: str, piece_id: str, budget: float = thresholds.PUBLISH_BUDGET_S) -> dict[str, Any] | None:
    """The published document, or None when there's no such draft. Raises elastic.ElasticError."""
    doc = elastic.publish_doc(piece_id, elastic.Budget(budget))
    if doc is not None:
        _published.add(piece_id)
        log.info("b12 published %s", listing_id if listing_id.startswith("lst_") else "a listing")
    return doc


def publish(listingId: str, pieceId: str) -> bool:  # noqa: N803 (the plan's names)
    try:
        return publish_listing(listingId, pieceId) is not None
    except elastic.ElasticError:
        return False


def reset() -> None:
    """Forgets caches and the published set (tests)."""
    with _vec_lock:
        _vec_cache.clear()
    _published.clear()
    _noted.clear()
