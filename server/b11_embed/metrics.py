"""How B11 scores a search system on the held-out queries (B11-embed.md, Metrics, B2-8).

- `recall_at_k`: (graded pieces in the top 5) / min(5, graded pieces), grades 1 and 2 both count.
- `reciprocal_rank`: MRR@10's per-query term, 1 / the rank of the first grade-2 piece within the
  top 10, or 0 when there is none. Every label says MRR@10.
- `rrf` and `hybrid`: reciprocal rank fusion with constant 60. `hybrid` fuses the custom model's
  ranking with the keyword hits, skipping keyword hits that scored 0. Labels call it "local
  hybrid", because the live Elastic hybrid is a different system.
- `per_query`, `score`, `by_group` and `by_lang`: the means over the queries, overall and per
  language (or per author, for queries Gordon wrote or edited).
- `paired_bootstrap` and `compare`: the paired bootstrap over the queries, 10,000 resamples,
  seeded, with the 95% percentile interval. A system "beats" another only when the interval is
  above zero. Otherwise the gap is within noise, or the other system is ahead.
- `unjudged`: for each query, the pieces any system put in its top 5 that the query doesn't grade,
  for the one pooled grading pass.

A ranking is a list of piece IDs, best first. A query is a searchEval record: `id`, `lang`,
`grades` (pieceId to 1 or 2) and the rest. Numbers come back unrounded.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any

import numpy as np

K = 5
MRR_DEPTH = 10
RRF_K = 60
RESAMPLES = 10_000
SEED = 13
METRICS = ("recallAtK", "mrr")
LABELS = {
    "recallAtK": "recall@5",
    "mrr": "MRR@10",
    "keyword": "keyword (BM25)",
    "base": "base model",
    "custom": "Cindia's model",
    "hybrid": "local hybrid",
}

Ranking = Sequence[str]
Grades = Mapping[str, int]


def relevant(grades: Grades) -> set[str]:
    """The pieces a query grades 1 or 2."""
    return {pid for pid, g in grades.items() if g in (1, 2)}


def recall_at_k(ranked: Ranking, grades: Grades, k: int = K) -> float:
    """(graded pieces in the top k) / min(k, graded pieces). 0.0 when the query grades none."""
    rel = relevant(grades)
    if not rel:
        return 0.0
    hits = len(rel.intersection(list(ranked)[:k]))
    return hits / min(k, len(rel))


def reciprocal_rank(ranked: Ranking, grades: Grades, depth: int = MRR_DEPTH) -> float:
    """1 / the rank of the first grade-2 piece within the top `depth`, or 0.0 when there is none."""
    for rank, pid in enumerate(list(ranked)[:depth], start=1):
        if grades.get(pid) == 2:
            return 1.0 / rank
    return 0.0


def rrf(runs: Iterable[Ranking], k: int = RRF_K) -> list[str]:
    """Reciprocal rank fusion: each ID scores the sum of 1 / (k + rank) over the runs it's in,
    ranks from 1. Best first, ties by ID."""
    fused: dict[str, float] = {}
    for run in runs:
        seen: set[str] = set()
        for rank, pid in enumerate(run, start=1):
            if pid in seen:
                continue
            seen.add(pid)
            fused[pid] = fused.get(pid, 0.0) + 1.0 / (k + rank)
    return sorted(fused, key=lambda pid: (-fused[pid], pid))


def hybrid(dense: Ranking, keyword: Iterable[tuple[str, float]], k: int = RRF_K) -> list[str]:
    """The local hybrid: RRF of the dense ranking and the keyword hits that scored above 0, in
    the keyword system's order."""
    hits = [pid for pid, s in keyword if s > 0.0]
    return rrf([list(dense), hits], k=k)


def per_query(rankings: Mapping[str, Ranking], queries: Sequence[Mapping[str, Any]]) -> dict[str, dict[str, float]]:
    """Each query's recallAtK and mrr, keyed by query ID. A query with no ranking scores 0."""
    out: dict[str, dict[str, float]] = {}
    for q in queries:
        ranked = rankings.get(q["id"], [])
        grades = q.get("grades") or {}
        out[q["id"]] = {"recallAtK": recall_at_k(ranked, grades), "mrr": reciprocal_rank(ranked, grades)}
    return out


def score(rankings: Mapping[str, Ranking], queries: Sequence[Mapping[str, Any]]) -> dict[str, float]:
    """The mean recallAtK and mrr over the queries (0.0 for no queries)."""
    rows = per_query(rankings, queries)
    n = len(rows)
    return {m: (sum(r[m] for r in rows.values()) / n if n else 0.0) for m in METRICS}


def systems_table(systems: Mapping[str, Mapping[str, Ranking]], queries: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """`[{ "system", "recallAtK", "mrr" }]`, one row per system, in the order given."""
    return [{"system": name, **score(rankings, queries)} for name, rankings in systems.items()]


def by_group(
    systems: Mapping[str, Mapping[str, Ranking]],
    queries: Sequence[Mapping[str, Any]],
    key: str = "lang",
) -> dict[str, dict[str, Any]]:
    """`{ group: { "queries": n, "systems": [...] } }` for each value of `key` the queries carry,
    in sorted order."""
    groups: dict[str, list[Mapping[str, Any]]] = {}
    for q in queries:
        groups.setdefault(str(q.get(key)), []).append(q)
    return {g: {"queries": len(qs), "systems": systems_table(systems, qs)} for g, qs in sorted(groups.items())}


def by_lang(systems: Mapping[str, Mapping[str, Ranking]], queries: Sequence[Mapping[str, Any]]) -> dict[str, dict[str, Any]]:
    """Every system scored per language (`byLang`)."""
    return by_group(systems, queries, "lang")


def paired_bootstrap(
    a: Sequence[float],
    b: Sequence[float],
    *,
    resamples: int = RESAMPLES,
    seed: int = SEED,
) -> dict[str, Any]:
    """The paired bootstrap of mean(a) - mean(b) over the queries.

    Draws `resamples` samples of the query indices with replacement (NumPy's default_rng, seeded),
    takes the mean difference of each, and returns `{ "delta", "ci95": [lo, hi], "beats" }`, where
    the interval is the 2.5th and 97.5th percentiles and `beats` is true only when lo > 0.
    """
    da, db = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    if da.shape != db.shape or da.ndim != 1:
        raise ValueError("a and b must be paired lists of the same length")
    if da.size == 0:
        raise ValueError("the bootstrap needs at least one query")
    diff = da - db
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, diff.size, size=(resamples, diff.size))
    means = diff[idx].mean(axis=1)
    lo, hi = np.percentile(means, [2.5, 97.5])
    return {"delta": float(diff.mean()), "ci95": [float(lo), float(hi)], "beats": bool(lo > 0.0)}


def compare(
    a: str,
    b: str,
    metric: str,
    rows_a: Mapping[str, Mapping[str, float]],
    rows_b: Mapping[str, Mapping[str, float]],
    *,
    resamples: int = RESAMPLES,
    seed: int = SEED,
) -> dict[str, Any]:
    """One `comparisons` row: `{ "a", "b", "metric", "delta", "ci95", "beats" }`, paired over the
    query IDs both systems scored (per_query()'s output), in sorted order."""
    if metric not in METRICS:
        raise ValueError(f"unknown metric {metric!r}")
    ids = sorted(set(rows_a) & set(rows_b))
    boot = paired_bootstrap([rows_a[i][metric] for i in ids], [rows_b[i][metric] for i in ids], resamples=resamples, seed=seed)
    return {"a": a, "b": b, "metric": metric, **boot}


def verdict(row: Mapping[str, Any]) -> str:
    """One plain sentence for a comparisons row. "beats" only when the interval excludes zero."""
    a, b = LABELS.get(row["a"], row["a"]), LABELS.get(row["b"], row["b"])
    metric = LABELS.get(row["metric"], row["metric"])
    lo, hi = row["ci95"]
    span = f"{row['delta']:+.3f}, 95% interval {lo:+.3f} to {hi:+.3f}"
    if lo > 0.0:
        return f"{a} beats {b} on {metric} ({span})."
    if hi < 0.0:
        return f"{b} beats {a} on {metric} ({span})."
    return f"The gap between {a} and {b} on {metric} is within noise ({span})."


def unjudged(
    systems: Mapping[str, Mapping[str, Ranking]],
    queries: Sequence[Mapping[str, Any]],
    k: int = K,
) -> dict[str, list[str]]:
    """For each query ID, the pieces any system put in its top k that the query doesn't grade,
    in the order first seen (systems in the order given)."""
    out: dict[str, list[str]] = {}
    for q in queries:
        grades = q.get("grades") or {}
        found: list[str] = []
        for rankings in systems.values():
            for pid in list(rankings.get(q["id"], []))[:k]:
                if pid not in grades and pid not in found:
                    found.append(pid)
        out[q["id"]] = found
    return out
