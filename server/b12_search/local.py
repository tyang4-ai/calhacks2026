"""The local hybrid, engine `local_hybrid`, and the pieces both paths share (B12-search.md, search steps).

- **Filters:** `Filters.of(keywords, filters)`: `maxPriceCents`, any price chip such as `under $200`
  (the lower cap wins), and `communityIds` (empty means all). Only `status: "active"` documents
  ever pass, so a draft can't appear even if one were handed in.
- **Fusion:** reciprocal rank fusion with rank constant 60 over two runs: the dense run (the query's
  cosine to each eligible piece, the top `KNN_K`, as Elastic's knn retriever takes k) and the
  keyword run (B11's BM25 over each piece's keyword text, only pieces that scored above 0, the top
  `RANK_WINDOW`). A piece no keyword matched enters only through the vector side, and a zero-score
  keyword hit never enters in pieceId order. Ties sort by pieceId.
- **Results:** at most 12, best first. `score` is the fused score over the best one's, so the best
  is 1. `closeness` is `(c - b) / (1 - b)` clipped to 0 to 1, where `c` is the piece's cosine to the
  query and `b` the query's mean cosine to every piece in the catalog. `closeMatches` is false when
  no result reaches `CLOSE_MIN`. `matched` and `reason` come from reasons.py.

Pure functions over numpy arrays and documents: no model, no network. engine.py wires B11's model
and the catalog in.
"""

from __future__ import annotations

import threading
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

import numpy as np

from server.b11_embed import bm25, compose
from server.b12_search import catalog, reasons, thresholds


@dataclass(frozen=True)
class Filters:
    max_price_cents: int | None = None
    community_ids: frozenset[str] | None = None

    @staticmethod
    def of(keywords: Iterable[str] | None, filters: Mapping[str, Any] | None) -> "Filters":
        cap = None
        filters = filters or {}
        raw_cap = filters.get("maxPriceCents")
        if isinstance(raw_cap, (int, float)) and not isinstance(raw_cap, bool) and raw_cap >= 0:
            cap = int(raw_cap)
        for chip in keywords or ():
            cents = price_chip_cents(chip)
            if cents is not None:
                cap = cents if cap is None else min(cap, cents)
        ids = [c for c in (filters.get("communityIds") or []) if isinstance(c, str) and c]
        return Filters(cap, frozenset(ids) if ids else None)

    def allows(self, doc: Mapping[str, Any]) -> bool:
        if doc.get("status") != "active":
            return False
        price = doc.get("priceCents")
        if self.max_price_cents is not None and (not isinstance(price, int) or price > self.max_price_cents):
            return False
        if self.community_ids is not None and doc.get("communityId") not in self.community_ids:
            return False
        return True


def price_chip_cents(chip: Any) -> int | None:
    """The cap a price chip sets, in cents (`under $200` is 20000), or None for any other chip."""
    text = " ".join(str(chip or "").split())
    if not compose.is_price_chip(text):
        return None
    try:
        return int(round(float(text.split("$", 1)[1].replace(",", "")) * 100))
    except (IndexError, ValueError):
        return None


def word_chips(keywords: Iterable[str] | None) -> list[str]:
    """The chips that are words to match: price chips left out, each once, as typed."""
    out: list[str] = []
    seen: set[str] = set()
    for raw in keywords or ():
        chip = " ".join(str(raw or "").split())
        if not chip or compose.is_price_chip(chip) or chip.lower() in seen:
            continue
        seen.add(chip.lower())
        out.append(chip)
    return out


def keyword_query(text: str, keywords: Iterable[str] | None) -> str:
    """The words the keyword side searches: the composed query (compose.query_text) without its
    prefix, so it holds the text and each chip not already in it, and never the price chip."""
    try:
        return compose.strip_prefix(compose.query_text(text, list(keywords or ())))
    except ValueError:
        return ""


def rrf_scores(runs: Sequence[Sequence[str]], k: int = thresholds.RANK_CONSTANT) -> dict[str, float]:
    """Each ID's sum of 1 / (k + rank) over the runs it's in, ranks from 1, each ID once per run."""
    fused: dict[str, float] = {}
    for run in runs:
        seen: set[str] = set()
        for rank, pid in enumerate(run, start=1):
            if pid in seen:
                continue
            seen.add(pid)
            fused[pid] = fused.get(pid, 0.0) + 1.0 / (k + rank)
    return fused


def fuse(dense: Sequence[str], keyword: Sequence[str], k: int = thresholds.RANK_CONSTANT) -> list[tuple[str, float]]:
    """(pieceId, fused score), best first, ties by pieceId."""
    fused = rrf_scores([list(dense), list(keyword)], k)
    return sorted(fused.items(), key=lambda kv: (-kv[1], kv[0]))


def cosines(query: Sequence[float], matrix: np.ndarray) -> np.ndarray:
    """The cosine of a query vector to each row (rows and query normalized here, so any input works)."""
    q = np.asarray(query, dtype=np.float64)
    qn = np.linalg.norm(q)
    if matrix.size == 0 or qn == 0:
        return np.zeros(matrix.shape[0] if matrix.ndim == 2 else 0)
    norms = np.linalg.norm(matrix, axis=1)
    return (matrix @ q) / (np.where(norms > 0, norms, 1.0) * qn)


def closeness(c: float, b: float) -> float:
    """(c - b) / (1 - b) clipped to 0 to 1, where b is the query's mean cosine to every piece."""
    if not np.isfinite(c) or not np.isfinite(b) or b >= 1.0:
        return 0.0
    return float(min(1.0, max(0.0, (c - b) / (1.0 - b))))


class KeywordIndex:
    """B11's BM25 over every catalog piece's keyword text. IDF counts the whole catalog, as
    Elastic's does over the whole index, and the filters apply to the hits afterwards."""

    def __init__(self, docs: Mapping[str, Mapping[str, Any]]):
        self.bm25 = bm25.BM25([(pid, catalog.keyword_text(doc)) for pid, doc in docs.items()])

    def hits(self, query: str, allowed: set[str], window: int = thresholds.RANK_WINDOW) -> list[str]:
        if not query.strip():
            return []
        return [pid for pid, _ in self.bm25.rank(query) if pid in allowed][:window]


_index_lock = threading.Lock()
_index_cache: dict[int, tuple[Any, KeywordIndex]] = {}


def keyword_index(cat: catalog.Catalog) -> KeywordIndex:
    """The catalog's keyword index, built once per catalog object."""
    with _index_lock:
        hit = _index_cache.get(id(cat))
        if hit is not None and hit[0] is cat:
            return hit[1]
    idx = KeywordIndex({pid: cat.docs[pid] for pid in cat.active_ids()})
    with _index_lock:
        _index_cache.clear()
        _index_cache[id(cat)] = (cat, idx)
    return idx


@dataclass
class Vectors:
    """Piece vectors from B11's vectors.json: IDs in order and one row each."""

    ids: list[str]
    matrix: np.ndarray

    def row(self, pid: str) -> np.ndarray | None:
        try:
            return self.matrix[self.ids.index(pid)]
        except ValueError:
            return None


def results(
    fused: Sequence[tuple[str, float]],
    docs: Mapping[str, Mapping[str, Any]],
    keywords: Sequence[str],
    aliases: Mapping[str, str],
    cos_by_id: Mapping[str, float],
    base: float | None,
    size: int = thresholds.SIZE,
) -> tuple[list[dict[str, Any]], bool]:
    """The answer's results and closeMatches, from a fused ranking and the documents it names."""
    top = [(pid, s) for pid, s in fused if pid in docs][:size]
    if not top:
        return [], False
    best = top[0][1] or 1.0
    out: list[dict[str, Any]] = []
    close = False
    for pid, s in top:
        doc = docs[pid]
        matched = reasons.matched_keywords(keywords, doc, aliases)
        item: dict[str, Any] = {
            "pieceId": pid,
            "score": round(s / best, 4) if best > 0 else 0.0,
            "matched": matched,
            "reason": reasons.reason(matched, doc),
        }
        if base is not None and pid in cos_by_id:
            item["closeness"] = round(closeness(cos_by_id[pid], base), 4)
            close = close or item["closeness"] >= thresholds.CLOSE_MIN
        out.append(item)
    return out, close


def rank(
    cat: catalog.Catalog,
    vectors: Vectors,
    query_vector: Sequence[float],
    text: str,
    keywords: Sequence[str],
    filters: Mapping[str, Any] | None,
    size: int = thresholds.SIZE,
) -> dict[str, Any]:
    """The local hybrid: `{ "results", "closeMatches", "base", "cos" }` for one query."""
    flt = Filters.of(keywords, filters)
    allowed = {pid for pid in cat.order if pid in cat.docs and flt.allows(cat.docs[pid])}
    cos = cosines(query_vector, vectors.matrix)
    cos_by_id = {pid: float(cos[i]) for i, pid in enumerate(vectors.ids)}
    in_catalog = [cos_by_id[pid] for pid in cat.active_ids() if pid in cos_by_id]
    base = float(np.mean(in_catalog)) if in_catalog else None
    dense = sorted((pid for pid in allowed if pid in cos_by_id), key=lambda pid: (-cos_by_id[pid], pid))[: thresholds.KNN_K]
    kw = keyword_index(cat).hits(keyword_query(text, keywords), allowed)
    fused = fuse(dense, kw)
    out, close = results(fused, cat.docs, keywords, cat.aliases, cos_by_id, base, size)
    return {"results": out, "closeMatches": close, "base": base, "cos": cos_by_id}
