"""Measures CLOSE_MIN on the 50 held-out eval queries with B11's trained model (B12-search.md, T1).

    .venv/bin/python server/b12_search/measure_close.py      (Windows: .venv\\Scripts\\python.exe)

It loads the model from CINDIA_MODEL_DIR (local files only, never the Hub), runs the local hybrid
for every eval query and a few nonsense queries, and prints, per query, the best result's
closeness and the closeness of its graded pieces. Then it prints the line that keeps the most eval
queries "close" while every nonsense query stays below it. It calls nothing outside the machine and
writes nothing: copy the printed value into thresholds.py by hand.
"""

from __future__ import annotations

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import numpy as np  # noqa: E402

from server.b11_embed import compose  # noqa: E402
from server.b11_embed import model as b11model  # noqa: E402
from server.b12_search import catalog, local  # noqa: E402

NONSENSE = [
    "quarterly tax spreadsheet template",
    "replacement tire for a mountain bike",
    "how do I reset my router password",
    "cheap phone charger cable",
    "a database migration script",
    "汽车轮胎",
]


def best_closeness(cat: catalog.Catalog, vectors: local.Vectors, text: str) -> tuple[float, dict[str, float]]:
    vec = b11model.encode_queries([compose.query_text(text, [])])[0]
    out = local.rank(cat, vectors, vec, text, [], {}, 12)
    by_id = {r["pieceId"]: r.get("closeness", 0.0) for r in out["results"]}
    cos = local.cosines(vec, vectors.matrix)
    base = float(np.mean(cos))
    every = {pid: local.closeness(float(cos[i]), base) for i, pid in enumerate(vectors.ids)}
    return (max(by_id.values()) if by_id else 0.0), every


def main() -> int:
    if not b11model.wait_warm(180):
        print(f"measure_close: the model isn't ready: {b11model.status(start=False)['problem']}")
        return 1
    cat = catalog.load()
    by_id = b11model.piece_vectors()
    ids = sorted(by_id)
    vectors = local.Vectors(ids, np.asarray([by_id[i] for i in ids]))
    eval_best: list[float] = []
    grade2: list[float] = []
    for q in cat.eval:
        best, every = best_closeness(cat, vectors, q["text"])
        eval_best.append(best)
        g2 = [every[p] for p, g in (q.get("grades") or {}).items() if g == 2 and p in every]
        grade2.append(max(g2) if g2 else 0.0)
    junk = [best_closeness(cat, vectors, t)[0] for t in NONSENSE]
    print(f"eval queries {len(eval_best)}: best closeness min {min(eval_best):.3f}, p10 {np.percentile(eval_best, 10):.3f}, "
          f"median {np.median(eval_best):.3f}")
    print(f"eval best grade-2 closeness: min {min(grade2):.3f}, p10 {np.percentile(grade2, 10):.3f}, median {np.median(grade2):.3f}")
    print("nonsense best closeness: " + ", ".join(f"{t!r} {b:.3f}" for t, b in zip(NONSENSE, junk, strict=True)))
    top_junk = max(junk)
    for line in [x / 100 for x in range(20, 81, 5)]:
        kept = sum(1 for b in eval_best if b >= line)
        print(f"  CLOSE_MIN {line:.2f}: {kept}/{len(eval_best)} eval queries close, nonsense close {sum(1 for b in junk if b >= line)}/{len(junk)}")
    # The lowest line on a 0.05 grid that every nonsense query's best stays under.
    pick = next((x / 100 for x in range(5, 100, 5) if x / 100 > top_junk), 0.95)
    kept = sum(1 for b in eval_best if b >= pick)
    print(f"measure_close: suggested CLOSE_MIN {pick:.2f} ({kept}/{len(eval_best)} eval queries close, "
          f"every nonsense query's best under it, the highest {top_junk:.3f})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
