"""The embedding map: a 2D PCA of the pieces' vectors, and where a query lands on it (B2-28).

- `fit(vectors)` runs PCA by SVD on the centered passage vectors only. It returns the mean, the two
  components (each one's sign fixed so its largest loading is positive, so a rerun draws the same
  map), the two components' explained variance ratios, and `scale`, which maps the pieces' points
  into -1 to 1 (the largest coordinate on either axis becomes 1, so the map keeps its aspect).
- `project(vector, pca, shift)` places any vector with the same mean and components (never refitted
  per request), plus `queryShift` when the map stores one, clipped to -1.2 to 1.2.
- `place(query, ...)` is the rule for a query's point: its projected point when that lands within
  the spread of its top 3 pieces (by cosine), otherwise the score-weighted center of those three,
  marked approximate.
- `choose_shift(...)` is the training-time check on the tour query: no shift when its projection
  lands within the spread of its top 3, otherwise `queryShift`, the passage mean minus the mean
  training-query vector.

"The spread" of three points is the circle around their center whose radius is the farthest of the
three from it, at least MIN_SPREAD, so three pieces drawn on top of each other still leave room.

NumPy only. Vectors are L2-normalized, so cosine is a dot product.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import numpy as np

CLIP = 1.2
MIN_SPREAD = 0.1
TOLERANCE = 1e-3
TOP = 3


def _matrix(vectors: Any) -> np.ndarray:
    m = np.asarray(vectors, dtype=np.float64)
    if m.ndim != 2 or m.shape[0] < 1:
        raise ValueError("PCA needs a non-empty 2D array of vectors")
    return m


def fit(vectors: Any) -> dict[str, Any]:
    """PCA by SVD on the centered vectors: `{ mean, components, scale, explainedVariance }`."""
    x = _matrix(vectors)
    mean = x.mean(axis=0)
    centered = x - mean
    _, s, vt = np.linalg.svd(centered, full_matrices=False)
    components = np.zeros((2, x.shape[1]))
    k = min(2, vt.shape[0])
    components[:k] = vt[:k]
    for i in range(k):
        j = int(np.argmax(np.abs(components[i])))
        if components[i, j] < 0:
            components[i] = -components[i]
    power = s**2
    total = float(power.sum())
    explained = [float(power[i] / total) if total > 0 and i < len(power) else 0.0 for i in range(2)]
    coords = centered @ components.T
    largest = float(np.abs(coords).max()) if coords.size else 0.0
    scale = 1.0 / largest if largest > 1e-12 else 1.0
    return {"mean": mean, "components": components, "scale": scale, "explainedVariance": explained}


def transform(vectors: Any, pca: dict[str, Any]) -> np.ndarray:
    """The 2D points of the vectors, scaled, unclipped (n by 2)."""
    x = _matrix(vectors)
    mean = np.asarray(pca["mean"], dtype=np.float64)
    components = np.asarray(pca["components"], dtype=np.float64)
    return (x - mean) @ components.T * float(pca["scale"])


def project(vector: Sequence[float], pca: dict[str, Any], shift: Sequence[float] | None = None) -> tuple[float, float]:
    """One vector's point: plus `shift` when given, centered, projected, scaled, clipped to -1.2 to 1.2."""
    v = np.asarray(vector, dtype=np.float64)
    if shift is not None:
        v = v + np.asarray(shift, dtype=np.float64)
    x, y = transform(v[None, :], pca)[0]
    return float(np.clip(x, -CLIP, CLIP)), float(np.clip(y, -CLIP, CLIP))


def spread(points: Any) -> tuple[np.ndarray, float]:
    """The center of the points and the radius of their spread (at least MIN_SPREAD)."""
    p = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    center = p.mean(axis=0)
    radius = float(np.linalg.norm(p - center, axis=1).max()) if len(p) else 0.0
    return center, max(radius, MIN_SPREAD)


def inside(point: Sequence[float], points: Any) -> bool:
    """True when the point lies within the spread of the points. The farthest of them sits on the
    edge, so the edge counts as inside, with TOLERANCE to spare for vectors.json's 5-decimal rounding."""
    center, radius = spread(points)
    return float(np.linalg.norm(np.asarray(point, dtype=np.float64) - center)) <= radius + TOLERANCE


def top_indices(query: Sequence[float], piece_vectors: Any, k: int = TOP) -> tuple[list[int], list[float]]:
    """The k pieces closest to the query by cosine (a dot product), best first, ties by position."""
    pv = np.asarray(piece_vectors, dtype=np.float64)
    scores = pv @ np.asarray(query, dtype=np.float64)
    order = np.argsort(-scores, kind="stable")[:k]
    return [int(i) for i in order], [float(scores[i]) for i in order]


def weighted_center(points: Any, weights: Sequence[float]) -> tuple[float, float]:
    """The weighted center of the points, weights below 0 counted as 0, equal weights when all are 0."""
    p = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    w = np.clip(np.asarray(weights, dtype=np.float64), 0.0, None)
    if w.sum() <= 0:
        w = np.ones(len(p))
    x, y = (p * w[:, None]).sum(axis=0) / w.sum()
    return float(np.clip(x, -CLIP, CLIP)), float(np.clip(y, -CLIP, CLIP))


def place(
    query: Sequence[float],
    piece_vectors: Any,
    piece_points: Any,
    pca: dict[str, Any],
    shift: Sequence[float] | None = None,
) -> tuple[float, float, bool]:
    """A query's point on the map and whether it's approximate (B11-embed.md, The map projection)."""
    idx, scores = top_indices(query, piece_vectors)
    pts = np.asarray(piece_points, dtype=np.float64).reshape(-1, 2)[idx]
    x, y = project(query, pca, shift)
    if inside((x, y), pts):
        return x, y, False
    cx, cy = weighted_center(pts, scores)
    return cx, cy, True


def lands(
    query: Sequence[float],
    piece_vectors: Any,
    piece_points: Any,
    pca: dict[str, Any],
    shift: Sequence[float] | None = None,
) -> bool:
    """True when the query's projected point (plus `shift`) lies within the spread of its top 3."""
    idx, _ = top_indices(query, piece_vectors)
    pts = np.asarray(piece_points, dtype=np.float64).reshape(-1, 2)[idx]
    return inside(project(query, pca, shift), pts)


def choose_shift(
    tour_query: Sequence[float],
    piece_vectors: Any,
    piece_points: Any,
    pca: dict[str, Any],
    query_mean: Sequence[float] | None,
) -> tuple[np.ndarray | None, str]:
    """`queryShift` for the map, and how the tour query lands: "projected", "shifted" or "approx".

    No shift when the tour query's plain projection lands within the spread of its top 3. Otherwise
    the shift is the passage mean minus `query_mean` (the mean training-query vector), and the tour
    query lands "shifted" when that brings it inside, or "approx" (the weighted center) when not.
    """
    if lands(tour_query, piece_vectors, piece_points, pca):
        return None, "projected"
    if query_mean is None:
        return None, "approx"
    shift = np.asarray(pca["mean"], dtype=np.float64) - np.asarray(query_mean, dtype=np.float64)
    if lands(tour_query, piece_vectors, piece_points, pca, shift):
        return shift, "shifted"
    return shift, "approx"


def rounded(values: Any, places: int = 5) -> Any:
    """Plain lists of floats rounded to `places` decimals, for vectors.json."""
    arr = np.round(np.asarray(values, dtype=np.float64), places)
    return arr.tolist()
