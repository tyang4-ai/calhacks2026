"""Measures the Comparer's threshold with the real model (docs/plans/B15-watch.md, Comparer).

    .venv/bin/python server/b15_watch/calibrate.py            # writes server/b15_watch/threshold.json
    .venv/bin/python server/b15_watch/calibrate.py --dry-run  # prints, writes nothing

It scores `tests/server/b15_threshold_fixture.json` (for each of the co-op's 12 pieces, 3 look-alike
and 3 unrelated listing texts, invented, on example.com) with B11's trained model and B15's formula:
each listing's `title. snippet` as a query, the closest of the co-op's pieces, and
`(c - b) / (1 - b)` clipped to 0 to 1. On a grid of thresholds from 0.00 to 1.00 in steps of 0.01, a
listing at or above the threshold counts as a look-alike. It picks the lowest threshold whose
precision is at least 0.9 and writes `{ fingerprint, threshold, precision, recall, n }` (plus when it
was measured and how often a look-alike's closest piece was its own), with the model's fingerprint.
With no threshold reaching 0.9 it writes nothing and exits 1. It never calls out: the model loads
from `CINDIA_MODEL_DIR` with local files only.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Sequence

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.b15_watch import compare, coop, thresholds  # noqa: E402

FIXTURE = ROOT / "tests" / "server" / "b15_threshold_fixture.json"
PRECISION_MIN = 0.9


def load_fixture(path: Path = FIXTURE) -> list[dict[str, Any]]:
    """Every listing as { pieceId, label ("lookalike" or "unrelated"), title, snippet }."""
    data = json.loads(path.read_text(encoding="utf-8"))
    out: list[dict[str, Any]] = []
    for piece_id, groups in sorted(data["pieces"].items()):
        for label in ("lookalike", "unrelated"):
            for row in groups[label]:
                out.append({"pieceId": piece_id, "label": label, "title": row["title"], "snippet": row["snippet"]})
    return out


def sweep(scores: Sequence[float], labels: Sequence[str]) -> list[dict[str, Any]]:
    """Precision and recall at each threshold from 0.00 to 1.00."""
    positives = sum(1 for lab in labels if lab == "lookalike")
    rows = []
    for k in range(0, 101):
        t = k / 100
        tp = sum(1 for s, lab in zip(scores, labels) if s >= t and lab == "lookalike")
        fp = sum(1 for s, lab in zip(scores, labels) if s >= t and lab != "lookalike")
        precision = tp / (tp + fp) if tp + fp else None
        recall = tp / positives if positives else 0.0
        rows.append({"threshold": t, "tp": tp, "fp": fp, "precision": precision, "recall": recall})
    return rows


def pick(rows: Sequence[dict[str, Any]], precision_min: float = PRECISION_MIN) -> Optional[dict[str, Any]]:
    """The lowest threshold whose precision reaches `precision_min`."""
    for r in rows:
        if r["precision"] is not None and r["precision"] >= precision_min:
            return r
    return None


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Measure B15's similarity threshold with the real model.")
    ap.add_argument("--dry-run", action="store_true", help="print the result, write nothing")
    ap.add_argument("--fixture", type=Path, default=FIXTURE)
    args = ap.parse_args(argv)

    from server.b11_embed import model as b11model

    c = b11model.check(compute_hash=True)
    if not c.ok:
        print(f"calibrate: the model isn't ready: {c.problem}")
        return 1
    if not b11model.wait_warm(300):
        print("calibrate: the model didn't warm up.")
        return 1
    fingerprint = b11model.fingerprint()
    records = coop.records()
    coop_ids = records.piece_ids()
    if len(coop_ids) != 12:
        print(f"calibrate: expected the co-op's 12 pieces, found {len(coop_ids)}.")
        return 1

    rows = load_fixture(args.fixture)
    texts = [compare.listing_text(r["title"], r["snippet"]) for r in rows]
    outcome = compare.compare(texts, coop_ids, wait_s=5.0, encode_wait_s=30.0)
    if not outcome.used_model:
        print(f"calibrate: the model didn't score the fixture ({outcome.reason}).")
        return 1
    scores = [m.similarity or 0.0 for m in outcome.matches]
    labels = [r["label"] for r in rows]
    own = sum(1 for r, m in zip(rows, outcome.matches) if r["label"] == "lookalike" and m.piece_id == r["pieceId"])
    lookalikes = sum(1 for lab in labels if lab == "lookalike")

    look = sorted(s for s, lab in zip(scores, labels) if lab == "lookalike")
    unrel = sorted(s for s, lab in zip(scores, labels) if lab != "lookalike")
    print(f"calibrate: {len(rows)} listings, fingerprint {fingerprint}")
    print(f"  look-alikes: min {look[0]:.3f} median {look[len(look) // 2]:.3f} max {look[-1]:.3f}; closest piece is its own for {own} of {lookalikes}")
    print(f"  unrelated:   min {unrel[0]:.3f} median {unrel[len(unrel) // 2]:.3f} max {unrel[-1]:.3f}")

    table = sweep(scores, labels)
    best = pick(table)
    if best is None:
        print(f"calibrate: no threshold reaches precision {PRECISION_MIN}; threshold.json not written.")
        return 1
    out = {
        "fingerprint": fingerprint,
        "threshold": best["threshold"],
        "precision": round(best["precision"], 4),
        "recall": round(best["recall"], 4),
        "n": len(rows),
        "pieceAccuracy": round(own / lookalikes, 4) if lookalikes else None,
        "measuredAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fixture": "tests/server/b15_threshold_fixture.json",
    }
    print(f"  threshold {out['threshold']:.2f}: precision {out['precision']}, recall {out['recall']} (tp {best['tp']}, fp {best['fp']})")
    if args.dry_run:
        print("calibrate: dry run, nothing written.")
        return 0
    thresholds.THRESHOLD_PATH.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"calibrate: wrote {thresholds.THRESHOLD_PATH.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
