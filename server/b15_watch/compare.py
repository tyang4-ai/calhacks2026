"""The Comparer: each listing's text match against the co-op's pieces, with Cindia's own model
(docs/plans/B15-watch.md, Comparer; fix-plan 1.9, B2-9).

- Each listing's `title. snippet` is embedded with B11 as a query, through `compose.query_text()`.
- `c` is its cosine to the closest of the co-op's twelve pieces (the matched piece) and `b` its mean
  cosine to all 54 pieces. `similarity = (c - b) / (1 - b)`, clipped to 0 to 1. Screens show it as
  "Text match 0.74", never as a percentage or a picture match.
- Without a trained, warm model, every similarity is None and the scan runs on the text checks.
  `score()` does the arithmetic on vectors, so tests pass hand-made ones.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Optional

import numpy as np

from server.b15_watch import thresholds

log = logging.getLogger("cindia.b15")


@dataclass(frozen=True)
class Match:
    piece_id: Optional[str]
    similarity: Optional[float]


NO_MATCH = Match(None, None)


def normalized(c: float, b: float) -> float:
    """(c - b) / (1 - b), clipped to 0 to 1. 0 when b is 1 or more."""
    if b >= 1.0:
        return 0.0
    v = (float(c) - float(b)) / (1.0 - float(b))
    return float(min(1.0, max(0.0, v)))


def listing_text(title: str, snippet: str) -> str:
    """`title. snippet`, without a doubled stop, or the title alone."""
    t = " ".join((title or "").split())
    s = " ".join((snippet or "").split())
    if not s:
        return t
    if not t:
        return s
    return f"{t} {s}" if t.endswith((".", "!", "?")) else f"{t}. {s}"


def score(queries: np.ndarray, vectors: Mapping[str, Sequence[float]], coop_ids: Sequence[str]) -> list[Match]:
    """The matched piece and normalized similarity of each query vector (rows of `queries`).

    `vectors` holds every piece's vector by pieceId (the 54), `coop_ids` the co-op's pieces among them.
    """
    ids = sorted(vectors)
    coop = [pid for pid in coop_ids if pid in vectors]
    if not ids or not coop or queries.size == 0:
        return [NO_MATCH for _ in range(int(queries.shape[0]) if queries.ndim == 2 else 0)]
    mat = np.asarray([vectors[pid] for pid in ids], dtype=np.float64)
    mat = mat / np.where(np.linalg.norm(mat, axis=1, keepdims=True) > 0, np.linalg.norm(mat, axis=1, keepdims=True), 1.0)
    q = np.asarray(queries, dtype=np.float64)
    q = q / np.where(np.linalg.norm(q, axis=1, keepdims=True) > 0, np.linalg.norm(q, axis=1, keepdims=True), 1.0)
    cos = q @ mat.T  # (n, 54)
    col = {pid: i for i, pid in enumerate(ids)}
    coop_cols = [col[pid] for pid in coop]
    out: list[Match] = []
    for row in cos:
        b = float(np.mean(row))
        sub = row[coop_cols]
        best = int(np.argmax(sub))
        out.append(Match(coop[best], round(normalized(float(sub[best]), b), 4)))
    return out


# ---------------------------------------------------------------------------------------------
# With B11's model


def _model() -> Any:
    try:
        from server.b11_embed import model as b11model
    except Exception:
        return None
    return b11model


def start_warmup() -> None:
    """Starts B11's warm-up in its own thread, so the model loads while Apify crawls."""
    m = _model()
    if m is None:
        return
    try:
        c = m.check(compute_hash=False)
        if c.ok or c.pending:
            m.start_warmup()
    except Exception as exc:
        log.info("b15 comparer: warm-up not started (%s)", type(exc).__name__)


def model_available() -> bool:
    """Whether B11's trained model is on disk and its files agree (no hashing in this thread)."""
    m = _model()
    if m is None:
        return False
    try:
        c = m.check(compute_hash=False)
        return bool(c.ok or c.pending)
    except Exception:
        return False


@dataclass
class Outcome:
    matches: list[Match]
    used_model: bool
    reason: Optional[str] = None  # why there's no model score: "no_model", "not_warm", "busy", "error"


def compare(texts: Sequence[str], coop_ids: Sequence[str], *, wait_s: float = thresholds.MODEL_WAIT_S,
            encode_wait_s: float = thresholds.ENCODE_WAIT_S, encoder: Optional[Callable[[list[str]], Any]] = None,
            vectors: Optional[Mapping[str, Sequence[float]]] = None) -> Outcome:
    """Scores each listing text against the co-op's pieces. `encoder` and `vectors` default to B11's
    (tests pass their own). Never raises: without the model every match is NO_MATCH."""
    n = len(texts)
    if n == 0:
        return Outcome([], used_model=False, reason=None)
    if encoder is None or vectors is None:
        m = _model()
        if m is None or not model_available():
            return Outcome([NO_MATCH] * n, used_model=False, reason="no_model")
        deadline = time.monotonic() + max(0.0, wait_s)
        m.start_warmup()
        while not m.is_warm() and time.monotonic() < deadline:
            time.sleep(0.05)
        if not m.is_warm():
            return Outcome([NO_MATCH] * n, used_model=False, reason="not_warm")
        try:
            vectors = vectors if vectors is not None else m.piece_vectors()
            if encoder is None:

                def encoder(qs: list[str]) -> Any:
                    return m.encode_queries(qs, timeout=encode_wait_s)

        except Exception as exc:
            log.info("b15 comparer: no vectors (%s)", type(exc).__name__)
            return Outcome([NO_MATCH] * n, used_model=False, reason="error")
    try:
        from server.b11_embed import compose

        queries = [compose.query_text(t) for t in texts]
    except Exception:
        queries = ["query: " + (" ".join(t.split()) or "-") for t in texts]
    try:
        vecs = np.asarray(encoder(queries), dtype=np.float64)
    except Exception as exc:
        reason = "busy" if type(exc).__name__ == "Busy" else "error"
        log.info("b15 comparer: encode failed (%s)", type(exc).__name__)
        return Outcome([NO_MATCH] * n, used_model=False, reason=reason)
    if vecs.ndim != 2 or vecs.shape[0] != n:
        return Outcome([NO_MATCH] * n, used_model=False, reason="error")
    return Outcome(score(vecs, vectors, coop_ids), used_model=True)
