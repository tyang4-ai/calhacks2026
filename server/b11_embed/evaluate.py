"""B11's evaluation: the four systems ranked on the held-out queries and scored (B11-embed.md, Metrics).

- `keyword`: BM25 (bm25.py) over each piece's `compose.keyword_text()`: its embedText without the
  prefix and labels, the facet words, the Chinese title and the craft's Chinese name. Only pieces
  that scored above 0 are ranked.
- `base` and `custom`: every piece ranked by cosine (a dot product of L2-normalized vectors) with the
  untuned and the fine-tuned model, ties by pieceId. The vectors come in from the caller, so this
  module never loads a model and the tests can pass a fake encoder's vectors.
- `hybrid`: the local hybrid, reciprocal rank fusion of `custom` and the keyword hits that scored
  above 0 (metrics.hybrid). Labels call it "local hybrid", because the live Elastic hybrid is a
  different system.

`evaluate()` returns the `eval` block of report.json (overall, per language, the paired bootstrap
comparisons), the rankings for unjudged.json, and the plain-sentence notes. Every query is composed
by the one rule, `compose.query_text(text, chips)`, so every encoded query carries exactly one
`query: ` prefix and every passage its `passage: ` one.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from server.b11_embed import bm25, compose, metrics
from server.b11_embed.data import Data

SYSTEMS = ("keyword", "base", "custom", "hybrid")
# The comparisons the report carries, (a, b): custom against keyword, custom against base, hybrid
# against custom, each on both metrics.
COMPARISONS = (("custom", "keyword"), ("custom", "base"), ("hybrid", "custom"))
QUERY_SET = "agent-written, held out"

Encoder = Callable[[list[str]], np.ndarray]


def query_text(q: Mapping[str, Any]) -> str:
    """An eval or dev query by the one rule: its text, then any chips it carries."""
    return compose.query_text(str(q.get("text") or ""), q.get("keywords") or [])


def keyword_index(data: Data) -> bm25.BM25:
    """BM25 over every piece's keyword text, in pieceId order."""
    docs = []
    for entry in data.index:
        pid = entry["pieceId"]
        docs.append((pid, compose.keyword_text(entry, data.piece(pid), data.community_of(pid))))
    return bm25.BM25(docs)


def keyword_hits(index: bm25.BM25, texts: Sequence[str]) -> list[list[tuple[str, float]]]:
    """Each composed query's keyword hits (pieces that scored above 0), best first."""
    return [index.rank(compose.strip_prefix(t)) for t in texts]


def normalize(vectors: Any) -> np.ndarray:
    """Rows scaled to unit length (rows of zeros stay zero)."""
    m = np.asarray(vectors, dtype=np.float64)
    norms = np.linalg.norm(m, axis=1, keepdims=True)
    return m / np.where(norms > 0, norms, 1.0)


def encode(encoder: Encoder, texts: Sequence[str], kind: str) -> np.ndarray:
    """Encodes the texts after checking each starts with exactly one `kind` prefix, normalized."""
    checked = compose.require_one_prefix(texts, kind)
    if not checked:
        return np.zeros((0, 0))
    return normalize(encoder(checked))


def dense_rankings(query_vectors: Any, passage_vectors: Any, piece_ids: Sequence[str]) -> list[list[str]]:
    """Every piece ranked by cosine for each query, best first, ties by pieceId order."""
    q = np.asarray(query_vectors, dtype=np.float64)
    p = np.asarray(passage_vectors, dtype=np.float64)
    if q.size == 0:
        return []
    scores = q @ p.T
    ids = list(piece_ids)
    return [[ids[j] for j in np.argsort(-row, kind="stable")] for row in scores]


@dataclass
class Vectors:
    """One model's vectors: the passages in pieceId order and the queries in eval order."""

    passages: np.ndarray
    queries: np.ndarray


@dataclass
class Result:
    """What evaluate() found."""

    eval: dict[str, Any]
    rankings: dict[str, dict[str, list[str]]]
    per_query: dict[str, dict[str, dict[str, float]]]
    notes: list[str] = field(default_factory=list)


def _rounded(x: float) -> float:
    return round(float(x), 6)


def _round_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{k: (_rounded(v) if isinstance(v, float) else v) for k, v in row.items()} for row in rows]


def _round_groups(groups: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {g: {"queries": v["queries"], "systems": _round_rows(v["systems"])} for g, v in groups.items()}


def query_set_label(queries: Sequence[Mapping[str, Any]]) -> str:
    """`querySet`: "agent-written, held out", plus how many Gordon wrote or edited when any."""
    gordon = sum(1 for q in queries if q.get("author") == "gordon")
    if gordon:
        return f"{QUERY_SET}; {gordon} of {len(queries)} written or edited by Gordon"
    return QUERY_SET


def rank_all(
    data: Data,
    queries: Sequence[Mapping[str, Any]],
    vectors: Mapping[str, Vectors],
) -> dict[str, dict[str, list[str]]]:
    """The four systems' rankings, `{ system: { queryId: [pieceId, ...] } }`, in SYSTEMS order."""
    ids = data.piece_ids()
    qids = [q["id"] for q in queries]
    texts = [query_text(q) for q in queries]
    hits = keyword_hits(keyword_index(data), texts)
    out: dict[str, dict[str, list[str]]] = {"keyword": {qid: bm25.top_ids(h) for qid, h in zip(qids, hits, strict=True)}}
    for name in ("base", "custom"):
        v = vectors[name]
        out[name] = dict(zip(qids, dense_rankings(v.queries, v.passages, ids), strict=True))
    out["hybrid"] = {qid: metrics.hybrid(out["custom"][qid], h) for qid, h in zip(qids, hits, strict=True)}
    return {name: out[name] for name in SYSTEMS}


def evaluate(
    data: Data,
    queries: Sequence[Mapping[str, Any]],
    vectors: Mapping[str, Vectors],
    *,
    resamples: int = metrics.RESAMPLES,
    seed: int = metrics.SEED,
) -> Result:
    """Scores the four systems on the queries: the report's `eval` block, the rankings and notes."""
    if not queries:
        raise ValueError("the evaluation needs at least one query")
    rankings = rank_all(data, queries, vectors)
    rows = {name: metrics.per_query(r, queries) for name, r in rankings.items()}
    comparisons = []
    for a, b in COMPARISONS:
        for metric in metrics.METRICS:
            comparisons.append(metrics.compare(a, b, metric, rows[a], rows[b], resamples=resamples, seed=seed))
    block: dict[str, Any] = {
        "k": metrics.K,
        "queries": len(queries),
        "querySet": query_set_label(queries),
        "systems": _round_rows(metrics.systems_table(rankings, queries)),
        "byLang": _round_groups(metrics.by_lang(rankings, queries)),
        "comparisons": [
            {**c, "delta": _rounded(c["delta"]), "ci95": [_rounded(c["ci95"][0]), _rounded(c["ci95"][1])]} for c in comparisons
        ],
    }
    notes = [metrics.verdict(c) for c in comparisons]
    gordon = [q for q in queries if q.get("author") == "gordon"]
    if gordon:
        block["byAuthor"] = _round_groups(metrics.by_group(rankings, queries, "author"))
        own = {r["system"]: r for r in metrics.systems_table(rankings, gordon)}
        notes.append(
            f"The {len(gordon)} queries Gordon wrote or edited, scored as their own row: "
            + ", ".join(f"{metrics.LABELS[s]} recall@5 {own[s]['recallAtK']:.3f}, MRR@10 {own[s]['mrr']:.3f}" for s in SYSTEMS)
            + "."
        )
    return Result(eval=block, rankings=rankings, per_query=rows, notes=notes)


def unjudged(result: Result, queries: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """For unjudged.json: each query's top-5 pieces (any system) that the query doesn't grade."""
    found = metrics.unjudged(result.rankings, queries)
    return [{"queryId": q["id"], "text": q.get("text"), "lang": q.get("lang"), "pieceIds": found[q["id"]]} for q in queries]


def unjudged_count(result: Result, queries: Sequence[Mapping[str, Any]]) -> int:
    return sum(len(v) for v in metrics.unjudged(result.rankings, queries).values())


def dev_scores(
    dev: Sequence[Mapping[str, Any]],
    piece_ids: Sequence[str],
    vectors: Mapping[str, Vectors],
) -> dict[str, dict[str, float]]:
    """Recall@5 and MRR@10 of each model on the dev split, where each query grades its own piece 2."""
    queries = [{"id": f"dev_{i}", "grades": {d["pieceId"]: 2}} for i, d in enumerate(dev)]
    out = {}
    for name, v in vectors.items():
        ranked = dict(zip([q["id"] for q in queries], dense_rankings(v.queries, v.passages, piece_ids), strict=True))
        out[name] = metrics.score(ranked, queries)
    return out
