"""Surprise me, ported exactly from src/sources/surprise.ts (data-model.md, "The surprise draw").

Only the ranking differs from the scripted draw: `keyword_random` and `fair_random` draw from the
keyword's top 12 by B12's hybrid ranking (candidates scoring above 0 only, sorted by score, then
pieceId), where the scripted draw uses the keyword scorer. `pure_random`, a missing keyword, or a
keyword that ranks nothing draws from every active piece in pieceId order.

- Raw weights: 1 for `keyword_random` and `pure_random`, `1 / (1 + salesThisMonth)` for `fair_random`.
- The draw: the first number from mulberry32 seeded with `seed` (ported bit for bit: 32-bit wrapping
  adds, unsigned shifts and Math.imul), times the total raw weight, then a plain loop over the raw
  weights in candidate order, landing on the first candidate whose running total is above it (the
  last when float rounding leaves none). The total is summed with a plain loop too, never Python's
  `sum()`, which uses compensated summation since 3.12 and can land on another piece at a boundary.
- The payload's `candidates[].weight` is each raw weight over the total, unrounded, so they sum to 1.

The golden test (tests/server/b12_surprise_golden.json, written by golden.mjs from surprise.ts
itself) checks mulberry32's numbers bit for bit and replays each golden draw's candidates.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from typing import Any

METHODS = ("keyword_random", "pure_random", "fair_random")
TOP = 12

_U32 = 0xFFFFFFFF


def _i32(x: int) -> int:
    """JavaScript's ToInt32 for an integer."""
    x &= _U32
    return x - 0x100000000 if x & 0x80000000 else x


def _imul(a: int, b: int) -> int:
    """JavaScript's Math.imul."""
    return _i32((a & _U32) * (b & _U32))


def mulberry32(seed: int) -> Callable[[], float]:
    """The seeded generator, numbers from 0 (inclusive) to 1 (exclusive), as surprise.ts makes them."""
    state = [_i32(int(seed))]

    def nxt() -> float:
        a = _i32(state[0] + 0x6D2B79F5)
        state[0] = a
        t = _imul(a ^ ((a & _U32) >> 15), _i32(1 | a))
        t = _i32(_i32(t + _imul(t ^ ((t & _U32) >> 7), _i32(61 | t))) ^ t)
        return ((t ^ ((t & _U32) >> 14)) & _U32) / 4294967296

    return nxt


def raw_weights(method: str, ids: Sequence[str], sales: Mapping[str, Any]) -> list[float]:
    """1 each, or 1 / (1 + salesThisMonth) for fair_random (a missing or negative count is 0)."""
    out: list[float] = []
    for pid in ids:
        if method != "fair_random":
            out.append(1)
            continue
        n = sales.get(pid)
        n = n if isinstance(n, (int, float)) and not isinstance(n, bool) and n > 0 else 0
        out.append(1 / (1 + n))
    return out


def plain_total(raw: Sequence[float]) -> float:
    total = 0.0
    for w in raw:
        total += w
    return total


def walk(ids: Sequence[str], raw: Sequence[float], seed: int) -> str:
    """The piece the draw lands on, walked exactly as surprise.ts walks it."""
    total = plain_total(raw)
    r = mulberry32(seed)() * total
    piece = ids[-1]
    running = 0.0
    for i, pid in enumerate(ids):
        running += raw[i]
        if r < running:
            piece = pid
            break
    return piece


def candidates(method: str, keyword: str | None, ranked: Sequence[tuple[str, float]] | None, active_ids: Sequence[str]) -> list[str]:
    """The candidate IDs in order. `ranked` is the keyword's hybrid ranking, (pieceId, score)."""
    kw = (keyword or "").strip()
    ids: list[str] = []
    if method != "pure_random" and kw and ranked:
        hits = [(pid, s) for pid, s in ranked if isinstance(s, (int, float)) and s > 0]
        hits.sort(key=lambda h: (-h[1], h[0]))
        seen: set[str] = set()
        for pid, _ in hits:
            if pid not in seen:
                seen.add(pid)
                ids.append(pid)
            if len(ids) == TOP:
                break
    if not ids:
        ids = sorted(dict.fromkeys(active_ids))
    return ids


def draw(
    keyword: str | None,
    method: str,
    seed: int,
    *,
    ranked: Sequence[tuple[str, float]] | None,
    active_ids: Sequence[str],
    sales: Mapping[str, Any],
) -> dict[str, Any] | None:
    """The surprise.drawn payload without surpriseId, or None when there's no piece to draw."""
    if method not in METHODS:
        raise ValueError(f"unknown method {method!r}")
    ids = candidates(method, keyword, ranked, active_ids)
    if not ids:
        return None
    raw = raw_weights(method, ids, sales)
    total = plain_total(raw)
    return {
        "pieceId": walk(ids, raw, seed),
        "method": method,
        "seed": seed,
        "candidates": [{"pieceId": pid, "weight": raw[i] / total} for i, pid in enumerate(ids)],
    }
