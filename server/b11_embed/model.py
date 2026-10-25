"""B11's model at run time, for the router and the other upgrades (B11-embed.md, Python module).

    from server.b11_embed import model          # inside a function, never at module level
    if model.is_warm():
        vec = model.encode_queries([compose.query_text(text, chips)])[0]
        x, y, approx = model.project(vec)

- `is_trained()`: true only when the model on disk hashes to report.json's `modelSha256`,
  vectors.json carries report.json's `fingerprint`, and the current data's `passagesHash` equals the
  report's (B2-3, D2-5). `check()` says why not, in one plain sentence.
- `is_warm()`: the model is loaded, its fingerprints checked and one test encode has run. Only the
  warm-up thread loads it: `start_warmup()` (the first `GET /api/b11/model` calls it) starts one
  background thread, so no request ever waits on the load. Anything that encodes checks `is_warm()`.
- `encode_queries(texts)` and `encode_passages(texts)`: L2-normalized vectors as lists. Each text must
  already carry exactly one `query: ` or `passage: ` prefix (compose.query_text() and the IndexEntry's
  embedText do), checked before anything is encoded. Every encode takes one lock, because a fast
  tokenizer shared across threadpool threads can raise "Already borrowed".
- `piece_vectors()`, `map_points()` and `project(vector)` read vectors.json: the stored PCA, never
  refitted per request, and pca.place()'s rule for a query's point (approximate when its projection
  misses the spread of its top 3).
- `fingerprint()`: report.json's fingerprint, or None. B12 writes it into every Elastic document.

Lazy imports (B2-10): torch and sentence_transformers are imported only inside `load_encoder()`, so
importing this module costs nothing and a broken torch install drops nothing but the model. The
server never calls the Hugging Face Hub: the model loads from `config.MODEL_DIR` with
`local_files_only`, and `fetch_model.py` is the only way a model arrives.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from server import config
from server.b11_embed import compose, pca
from server.b11_embed import data as b11data

HERE = Path(__file__).resolve().parent
REPORT_PATH = HERE / "report.json"
VECTORS_PATH = HERE / "vectors.json"
# The data file to check passagesHash against. None means data.load()'s own pick: the artifact
# (artifacts/mock/mock.json) when it's newer, otherwise the committed snapshot.
DATA_FILE: Path | None = None
EXPECTED_PIECES = b11data.EXPECTED_PIECES
WEIGHTS_NAME = "model.safetensors"
# A failed warm-up isn't retried for this long unless one of the files changes.
RETRY_S = 30.0
WARMUP_TEXT = "query: warm up"

log = logging.getLogger("cindia.b11")


class NotReady(Exception):
    """The model isn't trained or isn't warm yet. The message is one plain sentence."""


class Busy(Exception):
    """Another encode held the lock past the caller's timeout."""


# ---------------------------------------------------------------------------------------------
# Hashes and fingerprints


def sha256_file(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(chunk):
            h.update(block)
    return h.hexdigest()


def fingerprint_of(model_sha256: str, passages_hash: str) -> str:
    """The first 16 hex characters of sha256(modelSha256 + ":" + passagesHash)."""
    return hashlib.sha256(f"{model_sha256}:{passages_hash}".encode("utf-8")).hexdigest()[:16]


def model_dir() -> Path:
    return Path(config.MODEL_DIR)


def weights_file(folder: Path | None = None) -> Path | None:
    """The model's weights: model.safetensors at the top of the folder, or the only one below it."""
    folder = Path(folder) if folder is not None else model_dir()
    top = folder / WEIGHTS_NAME
    if top.is_file():
        return top
    if not folder.is_dir():
        return None
    found = sorted(p for p in folder.rglob(WEIGHTS_NAME) if p.is_file())
    return found[0] if len(found) == 1 else None


_hash_lock = threading.Lock()
_hash_cache: dict[tuple[str, int, int], str] = {}


def _stat_key(path: Path) -> tuple[str, int, int] | None:
    try:
        st = os.stat(path)
    except OSError:
        return None
    return (str(Path(path).resolve()), st.st_size, st.st_mtime_ns)


def weights_sha256(path: Path, *, compute: bool = True) -> str | None:
    """The sha256 of a weights file, cached by its path, size and time. None when not computed
    yet and `compute` is false, or when the file is gone."""
    key = _stat_key(path)
    if key is None:
        return None
    with _hash_lock:
        hit = _hash_cache.get(key)
    if hit is not None or not compute:
        return hit
    digest = sha256_file(path)
    with _hash_lock:
        _hash_cache[key] = digest
    return digest


# ---------------------------------------------------------------------------------------------
# The files, read once per change

_files_lock = threading.Lock()
_json_cache: dict[str, tuple[tuple[str, int, int], Any]] = {}
_data_cache: dict[str, Any] = {}


def _read_json(path: Path) -> Any:
    """The file's JSON, cached by its stat. None when it's missing. ValueError when it's broken."""
    key = _stat_key(path)
    if key is None:
        return None
    with _files_lock:
        hit = _json_cache.get(key[0])
        if hit is not None and hit[0] == key:
            return hit[1]
    try:
        value = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"{b11data.rel(Path(path))} isn't valid UTF-8 JSON ({type(exc).__name__})") from None
    with _files_lock:
        _json_cache[key[0]] = (key, value)
    return value


def read_report() -> dict[str, Any] | None:
    """report.json, or None when it's missing or broken."""
    try:
        value = _read_json(REPORT_PATH)
    except ValueError:
        return None
    return value if isinstance(value, dict) else None


def _data_sources() -> tuple[Any, ...]:
    if DATA_FILE is not None:
        return (_stat_key(Path(DATA_FILE)),)
    return (_stat_key(b11data.ARTIFACT), _stat_key(b11data.SNAPSHOT))


def current_passages_hash() -> str:
    """The passagesHash of the data the server reads now, cached until a data file changes.
    Raises data.DataError with one plain line when the data can't be used."""
    key = (str(DATA_FILE), EXPECTED_PIECES, _data_sources())
    with _files_lock:
        if _data_cache.get("key") == key:
            return _data_cache["hash"]
    d = b11data.load(DATA_FILE, expected=EXPECTED_PIECES)
    digest = d.passages_hash()
    with _files_lock:
        _data_cache.update(key=key, hash=digest)
    return digest


# ---------------------------------------------------------------------------------------------
# The check


@dataclass
class Check:
    ok: bool
    problem: str | None
    report: dict[str, Any] | None = None
    vectors: dict[str, Any] | None = None
    pending: bool = False  # everything matched except the weights' hash, which isn't computed yet


def _where(path: Path) -> str:
    return b11data.rel(Path(path))


def check(*, compute_hash: bool = True) -> Check:
    """Whether the model, vectors.json and the data share one fingerprint, cheapest checks first.

    With `compute_hash` false the weights are hashed only if that's cached already; otherwise the
    result is `pending` (not ok, with a problem saying so), so a request never waits on hashing.
    """
    try:
        report = _read_json(REPORT_PATH)
    except ValueError as exc:
        return Check(False, f"report.json can't be read: {exc}.")
    if not isinstance(report, dict):
        return Check(False, "There's no report.json yet, so the model hasn't been trained (python server/b11_embed/train.py).")
    sha, passages, fp = report.get("modelSha256"), report.get("passagesHash"), report.get("fingerprint")
    if not all(isinstance(v, str) and v for v in (sha, passages, fp)):
        return Check(False, "report.json is missing modelSha256, passagesHash or fingerprint.", report)
    if fingerprint_of(sha, passages) != fp:
        return Check(False, "report.json's fingerprint doesn't match its own hashes.", report)
    try:
        vectors = _read_json(VECTORS_PATH)
    except ValueError as exc:
        return Check(False, f"vectors.json can't be read: {exc}.", report)
    if not isinstance(vectors, dict):
        return Check(False, "vectors.json is missing, so the model has no piece vectors.", report)
    if vectors.get("fingerprint") != fp:
        return Check(False, "vectors.json's fingerprint doesn't match report.json's.", report, vectors)
    try:
        current = current_passages_hash()
    except b11data.DataError as exc:
        return Check(False, f"B11's data can't be read: {exc}.", report, vectors)
    if current != passages:
        return Check(
            False,
            "The catalog's passages changed since the model was trained, so its fingerprint no longer matches.",
            report,
            vectors,
        )
    weights = weights_file()
    if weights is None:
        return Check(
            False,
            f"There's no model in {_where(model_dir())} (run python server/b11_embed/fetch_model.py).",
            report,
            vectors,
        )
    digest = weights_sha256(weights, compute=compute_hash)
    if digest is None:
        return Check(False, "The model's weights are still being checked.", report, vectors, pending=True)
    if digest != sha:
        return Check(False, "The model's weights don't match report.json's modelSha256.", report, vectors)
    return Check(True, None, report, vectors)


def is_trained() -> bool:
    """True only when the weights, vectors.json and the data all match report.json. Hashes the
    weights once per file change (about a second for this model), then answers from the cache."""
    return check(compute_hash=True).ok


def fingerprint() -> str | None:
    """report.json's fingerprint, or None when there's no report. `is_trained()` says whether the
    model on disk is the one it names."""
    report = read_report()
    fp = report.get("fingerprint") if report else None
    return fp if isinstance(fp, str) else None


# ---------------------------------------------------------------------------------------------
# Loading (the only place torch and sentence-transformers are imported)


class STEncoder:
    """A loaded sentence-transformers model. `encode()` adds no prompt: the text carries it."""

    def __init__(self, st_model: Any):
        self.model = st_model

    def encode(self, texts: Sequence[str]) -> np.ndarray:
        return self.model.encode(
            list(texts),
            prompt="",
            batch_size=32,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )


def load_sentence_transformer(path_or_name: str | Path, *, device: str = "cpu", local_only: bool = True) -> Any:
    """A SentenceTransformer with no default prompt, so a prefix is never doubled."""
    from sentence_transformers import SentenceTransformer  # lazy (B2-10)

    try:
        from transformers.utils import logging as hf_logging

        hf_logging.disable_progress_bar()
    except Exception:  # progress bars are cosmetic
        pass
    st = SentenceTransformer(str(path_or_name), device=device, local_files_only=local_only)
    st.default_prompt_name = None
    return st


def load_encoder(path: Path) -> STEncoder:
    """The fine-tuned model from `path`, on the CPU, from local files only."""
    return STEncoder(load_sentence_transformer(path, device="cpu", local_only=True))


# The loader the warm-up thread calls. Tests swap in a fake that loads nothing.
LOADER: Callable[[Path], Any] = load_encoder


# ---------------------------------------------------------------------------------------------
# Warm-up

_state_lock = threading.Lock()
_encode_lock = threading.Lock()
_state: dict[str, Any] = {}


def _blank_state() -> dict[str, Any]:
    return {
        "phase": "cold",  # cold | loading | warm | failed
        "encoder": None,
        "problem": None,
        "signature": None,
        "failed_at": 0.0,
        "thread": None,
        "dims": None,
        "ids": [],
        "vectors": None,
        "points": None,
        "pca": None,
        "shift": None,
        "model_id": None,
    }


_state.update(_blank_state())


def _signature() -> tuple[Any, ...]:
    weights = weights_file()
    return (
        _stat_key(REPORT_PATH),
        _stat_key(VECTORS_PATH),
        _stat_key(weights) if weights else None,
        str(model_dir()),
        _data_sources(),
    )


def _refresh_locked(sig: tuple[Any, ...]) -> None:
    """Drops a loaded model whose files changed (call with _state_lock held)."""
    if _state["phase"] in ("warm", "failed") and _state["signature"] != sig:
        thread = _state["thread"]
        _state.update(_blank_state())
        _state["thread"] = thread if thread is not None and thread.is_alive() else None


def _vector_arrays(vectors: dict[str, Any], dims: int | None) -> tuple[list[str], np.ndarray, np.ndarray, dict[str, Any], Any]:
    pieces = vectors.get("pieces")
    if not isinstance(pieces, list) or not pieces:
        raise NotReady("vectors.json holds no pieces.")
    ids = [str(p["pieceId"]) for p in pieces]
    vecs = np.asarray([p["vector"] for p in pieces], dtype=np.float64)
    pts = np.asarray([[p["x"], p["y"]] for p in pieces], dtype=np.float64)
    if vecs.ndim != 2 or (dims is not None and vecs.shape[1] != dims):
        raise NotReady("vectors.json's vectors don't have the model's dimensions.")
    stored = vectors.get("pca") or {}
    shift = stored.get("queryShift")
    p = {"mean": stored["mean"], "components": stored["components"], "scale": stored["scale"]}
    return ids, vecs, pts, p, shift


def _warm(sig: tuple[Any, ...]) -> None:
    """The warm-up thread: check the fingerprints, load the model, run one test encode."""
    try:
        c = check(compute_hash=True)
        if not c.ok:
            _fail(sig, c.problem or "The model isn't trained.")
            return
        report = c.report or {}
        dims = report.get("dims") if isinstance(report.get("dims"), int) else None
        ids, vecs, pts, p, shift = _vector_arrays(c.vectors or {}, dims)
        encoder = LOADER(model_dir())
        with _encode_lock:
            test = np.asarray(encoder.encode([WARMUP_TEXT]), dtype=np.float64)
        if test.ndim != 2 or test.shape[0] != 1 or (dims is not None and test.shape[1] != dims):
            _fail(sig, "The model's test encode didn't give vectors of the report's dimensions.")
            return
    except NotReady as exc:
        _fail(sig, str(exc))
        return
    except Exception as exc:  # a broken install drops the model, never the server
        _fail(sig, f"The model failed to load ({type(exc).__name__}).")
        return
    with _state_lock:
        if _state["signature"] != sig or _state["phase"] != "loading":
            return
        _state.update(
            phase="warm",
            encoder=encoder,
            problem=None,
            dims=dims or int(test.shape[1]),
            ids=ids,
            vectors=vecs,
            points=pts,
            pca=p,
            shift=shift,
            model_id=report.get("modelId"),
        )
    log.info("b11 model warm: %s, fingerprint %s", report.get("modelId"), report.get("fingerprint"))


def _fail(sig: tuple[Any, ...], problem: str) -> None:
    with _state_lock:
        if _state["signature"] == sig:
            _state.update(phase="failed", encoder=None, problem=problem, failed_at=time.monotonic())
    log.info("b11 model not loaded: %s", problem)


def start_warmup() -> bool:
    """Starts the one warm-up thread unless the model is warm, loading, or failed recently with
    the same files. Returns at once. True when a thread was started."""
    sig = _signature()
    with _state_lock:
        _refresh_locked(sig)
        phase = _state["phase"]
        if phase in ("warm", "loading"):
            return False
        if phase == "failed" and _state["signature"] == sig and time.monotonic() - _state["failed_at"] < RETRY_S:
            return False
        thread = threading.Thread(target=_warm, args=(sig,), name="b11-warmup", daemon=True)
        _state.update(phase="loading", signature=sig, problem=None, thread=thread)
    thread.start()
    return True


def is_warm() -> bool:
    """True once the model is loaded, its fingerprints checked and one test encode has run, and
    none of its files has changed since."""
    sig = _signature()
    with _state_lock:
        _refresh_locked(sig)
        return _state["phase"] == "warm"


def wait_warm(timeout: float) -> bool:
    """Starts the warm-up and waits up to `timeout` seconds for it. For scripts and tests, never
    for a request."""
    start_warmup()
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if is_warm():
            return True
        with _state_lock:
            if _state["phase"] == "failed":
                return False
        time.sleep(0.02)
    return is_warm()


def status(*, start: bool = True) -> dict[str, Any]:
    """`GET /api/b11/model`'s answer, without loading or hashing anything in the caller's thread.
    Starts the warm-up when the files are there."""
    c = check(compute_hash=False)
    if start and (c.ok or c.pending):
        start_warmup()
    warm = c.ok and is_warm()
    with _state_lock:
        failed = _state["problem"] if _state["phase"] == "failed" else None
    report = c.report or read_report() or {}
    dims = report.get("dims")
    return {
        "trained": c.ok,
        "warm": warm,
        "modelId": report.get("modelId") if isinstance(report.get("modelId"), str) else None,
        "baseModel": report.get("baseModel") if isinstance(report.get("baseModel"), str) else None,
        "dims": dims if isinstance(dims, int) else None,
        "fingerprint": report.get("fingerprint") if isinstance(report.get("fingerprint"), str) else None,
        "problem": c.problem if not c.ok else failed,
    }


def reset() -> None:
    """Forgets the loaded model and every cache (for tests, and after fetch_model.py)."""
    with _state_lock:
        _state.update(_blank_state())
    with _hash_lock:
        _hash_cache.clear()
    with _files_lock:
        _json_cache.clear()
        _data_cache.clear()


# ---------------------------------------------------------------------------------------------
# Encoding and the map


def _warm_state() -> dict[str, Any]:
    if not is_warm():
        raise NotReady("The model isn't warm yet.")
    with _state_lock:
        return dict(_state)


def encode_array(texts: Sequence[str], kind: str, *, timeout: float | None = None) -> np.ndarray:
    """L2-normalized vectors (n by dims) for texts that each carry exactly one `kind` prefix.
    Raises ValueError for a missing or doubled prefix, NotReady when not warm, and Busy when the
    encode lock isn't free within `timeout` seconds."""
    checked = compose.require_one_prefix(texts, kind)
    state = _warm_state()
    if not checked:
        return np.zeros((0, state["dims"] or 0))
    if not _encode_lock.acquire(timeout=-1 if timeout is None else max(0.0, timeout)):
        raise Busy("Another encode is running.")
    try:
        out = np.asarray(state["encoder"].encode(checked), dtype=np.float64)
    finally:
        _encode_lock.release()
    norms = np.linalg.norm(out, axis=1, keepdims=True)
    return out / np.where(norms > 0, norms, 1.0)


def encode_queries(texts: Sequence[str], *, timeout: float | None = None) -> list[list[float]]:
    """Vectors for `query: ` texts (build them with compose.query_text())."""
    return encode_array(texts, "query", timeout=timeout).tolist()


def encode_passages(texts: Sequence[str], *, timeout: float | None = None) -> list[list[float]]:
    """Vectors for `passage: ` texts (an IndexEntry's embedText as it is)."""
    return encode_array(texts, "passage", timeout=timeout).tolist()


def _map_state() -> dict[str, Any]:
    """The piece vectors, points and PCA: from the warm model's copy, or from vectors.json after a
    full check when the model isn't loaded."""
    with _state_lock:
        if _state["phase"] == "warm" and _state["vectors"] is not None:
            return dict(_state)
    c = check(compute_hash=True)
    if not c.ok:
        raise NotReady(c.problem or "The model isn't trained.")
    dims = (c.report or {}).get("dims")
    ids, vecs, pts, p, shift = _vector_arrays(c.vectors or {}, dims if isinstance(dims, int) else None)
    return {"ids": ids, "vectors": vecs, "points": pts, "pca": p, "shift": shift}


def piece_vectors() -> dict[str, list[float]]:
    """Each piece's vector from vectors.json, by pieceId. Raises NotReady unless is_trained()."""
    s = _map_state()
    return {pid: s["vectors"][i].tolist() for i, pid in enumerate(s["ids"])}


def map_points() -> list[dict[str, Any]]:
    """Every piece's point on the map, `{ pieceId, x, y }`, in pieceId order."""
    s = _map_state()
    return [{"pieceId": pid, "x": float(s["points"][i][0]), "y": float(s["points"][i][1])} for i, pid in enumerate(s["ids"])]


def project(vector: Sequence[float]) -> tuple[float, float, bool]:
    """A query vector's point on the stored map, and whether it's approximate: its projection (plus
    `queryShift` when stored) when that lands within the spread of its top 3 pieces, otherwise the
    weighted center of those three, with approx true."""
    s = _map_state()
    return pca.place(vector, s["vectors"], s["points"], s["pca"], s["shift"])
