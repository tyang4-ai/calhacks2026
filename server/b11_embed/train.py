"""Fine-tune, score and map Cindia's embedding model (B11-embed.md, T4). Use the .venv Python:

    python server/b11_embed/train.py --probe      # 3 training steps: peak RSS and seconds per step
    python server/b11_embed/train.py              # the run: train, score, map, write, publish
    python server/b11_embed/train.py --eval-only  # rescore the saved model (after pooled grading)

The steps: load the data (data.py) and the pairs (pairs.jsonl, T3), fine-tune
`intfloat/multilingual-e5-small` with MultipleNegativesRankingLoss on (query, passage) pairs and
(query, passage, hard negative) triplets, score the four systems on the held-out queries
(evaluate.py), fit the 2D map (pca.py), write report.json, vectors.json and unjudged.json with the
fingerprints, then publish when `config.HF_TOKEN` and `config.HF_REPO` are set and publish.py
exists (T8; until then one log line says it's skipped).

Memory-safe on 2 vCPUs (B2-5): word embeddings frozen, `max_seq_length` the longest passage in
tokens rounded up to a multiple of 8 and at most 128, batch 32 with NO_DUPLICATES batches, 3
epochs, learning rate 2e-5 with 10% warmup, no fp16 or bf16, no dataloader workers, 2 torch threads,
CPU unless `--device auto` finds a GPU. Run `--probe` first: when it measures a peak over 4 GB or
more than 30 seconds a step, the next run uses batch 16 on its own and says so in `notes`.

One model-only checkpoint per epoch goes under models/checkpoints/ (never under server/), and a
killed run started again resumes from the newest. The log is artifacts/b11/train.log: one line every
10 steps and one per epoch, counts and scores only, never a query or a key. The HTTP client loggers
stay at WARNING and nothing calls logging.basicConfig, so no request URL reaches a log (B2-34).

torch, sentence-transformers, datasets and accelerate are imported only inside STBackend's methods,
so the tests drive this whole pipeline with a fake backend and never download a model.
"""

from __future__ import annotations

import argparse
import dataclasses
import hashlib
import importlib.util
import json
import logging
import math
import os
import random
import re
import shutil
import sys
import time
import unicodedata
from collections import Counter
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__ in (None, ""):  # run as a script: python server/b11_embed/train.py
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import numpy as np  # noqa: E402

from server import config  # noqa: E402
from server.b11_embed import compose, evaluate, metrics, pca  # noqa: E402
from server.b11_embed import data as b11data  # noqa: E402
from server.b11_embed import model as b11model  # noqa: E402

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
SERVER_DIR = REPO_ROOT / "server"

MODEL_ID = "cindia-embed-v1"
BASE_MODEL = "intfloat/multilingual-e5-small"
BASE_LICENSE = "MIT"
LANGS = ("en", "zh")
DEV_SHARE = 0.1
TOKEN_CAP = 128
PROBE_STEPS = 3
PROBE_MAX_RSS_BYTES = 4 * 1024**3
PROBE_MAX_STEP_S = 30.0
DEFAULT_BATCH = 32
FALLBACK_BATCH = 16
LOG_EVERY = 10
MAX_QUERY_CHARS = 1000

log = logging.getLogger("cindia.b11.train")


class TrainError(Exception):
    """The run can't go on. The message is one plain line."""


# ---------------------------------------------------------------------------------------------
# Options


@dataclass
class Paths:
    pairs: Path = HERE / "pairs.jsonl"
    pairs_meta: Path = HERE / "pairs_meta.json"
    report: Path = HERE / "report.json"
    vectors: Path = HERE / "vectors.json"
    unjudged: Path = HERE / "unjudged.json"
    model_dir: Path = field(default_factory=lambda: Path(config.MODEL_DIR))
    checkpoints: Path = REPO_ROOT / "models" / "checkpoints" / MODEL_ID
    log: Path = REPO_ROOT / "artifacts" / "b11" / "train.log"
    probe: Path = REPO_ROOT / "artifacts" / "b11" / "probe.json"
    data: Path | None = None


@dataclass
class Settings:
    base_model: str = BASE_MODEL
    model_id: str = MODEL_ID
    epochs: int = 3
    batch: int | None = None  # None: 32, or 16 when the last probe went over the limits
    lr: float = 2e-5
    warmup: float = 0.1
    seed: int = 13
    device: str = "cpu"  # cpu | auto | cuda
    threads: int = 2
    token_cap: int = TOKEN_CAP


@dataclass
class Options:
    mode: str = "train"  # train | probe | eval
    paths: Paths = field(default_factory=Paths)
    settings: Settings = field(default_factory=Settings)
    publish: bool = True
    expected_pieces: int = b11data.EXPECTED_PIECES


# ---------------------------------------------------------------------------------------------
# Small helpers


def rel(path: Path) -> str:
    return b11data.rel(Path(path))


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def write_json(path: Path, obj: Any, *, compact: bool = False) -> None:
    """Writes JSON as UTF-8 with ensure_ascii off, through a temporary file and os.replace."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":")) if compact else json.dumps(obj, ensure_ascii=False, indent=2)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text + "\n", encoding="utf-8")
    os.replace(tmp, path)


def read_json(path: Path) -> Any:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise TrainError(f"{rel(path)} isn't valid UTF-8 JSON ({type(exc).__name__})") from None


def normalized(text: str) -> str:
    """Lowercase, punctuation stripped, spaces collapsed (the eval-leak guard's normal form)."""
    text = unicodedata.normalize("NFKC", text or "").lower()
    return " ".join(re.sub(r"[^\w\s]|_", " ", text).split())


def token_cap(lengths: Sequence[int], cap: int = TOKEN_CAP) -> int:
    """The longest length rounded up to a multiple of 8, at most `cap` (and at least 8)."""
    longest = max(lengths) if lengths else 8
    return max(8, min(cap, int(math.ceil(longest / 8.0)) * 8))


def peak_rss_bytes() -> int | None:
    """This process's peak resident memory in bytes: resource.getrusage on Linux and macOS, psutil's
    peak working set on Windows when psutil is installed, otherwise None."""
    try:
        import resource

        peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return int(peak if sys.platform == "darwin" else peak * 1024)
    except ImportError:
        pass
    try:
        import psutil  # type: ignore[import-not-found]

        info = psutil.Process().memory_info()
        return int(getattr(info, "peak_wset", 0) or info.rss)
    except Exception:
        return None


def gb(n: int | None) -> str:
    return "unknown" if n is None else f"{n / 1024**3:.2f} GB"


def millions(n: int) -> str:
    return f"{n / 1e6:.1f}M"


_saved_logger_state: list[tuple[int, bool]] = []


def setup_logging(path: Path) -> list[logging.Handler]:
    """One line per message to artifacts/b11/train.log and to stderr. The HTTP client loggers stay
    at WARNING. Never logging.basicConfig. Returns the handlers, which close_logging() removes."""
    for name in ("httpx", "httpx2", "httpcore"):
        logging.getLogger(name).setLevel(logging.WARNING)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter("%(asctime)s %(message)s", "%Y-%m-%d %H:%M:%S")
    file_handler = logging.FileHandler(path, encoding="utf-8")
    file_handler.setFormatter(fmt)
    stream = logging.StreamHandler(sys.stderr)
    stream.setFormatter(logging.Formatter("%(message)s"))
    parent = logging.getLogger("cindia.b11")
    _saved_logger_state.append((parent.level, parent.propagate))
    parent.setLevel(logging.INFO)
    parent.propagate = False
    for h in (file_handler, stream):
        parent.addHandler(h)
    log.setLevel(logging.INFO)
    return [file_handler, stream]


def close_logging(handlers: Sequence[logging.Handler]) -> None:
    parent = logging.getLogger("cindia.b11")
    for h in handlers:
        parent.removeHandler(h)
        h.close()
    if _saved_logger_state:
        level, propagate = _saved_logger_state.pop()
        parent.setLevel(level)
        parent.propagate = propagate


# ---------------------------------------------------------------------------------------------
# The pairs


@dataclass(frozen=True)
class Pair:
    query: str
    lang: str
    voice: str
    piece_id: str
    negative_id: str | None
    line: int


def load_pairs(path: Path, data: b11data.Data) -> list[Pair]:
    """pairs.jsonl's lines, checked: `{ query, lang, voice, pieceId, negativeId | null }` each, every
    piece in the data, a negative never the piece itself. Exact repeats are dropped."""
    path = Path(path)
    if not path.is_file():
        raise TrainError(f"{rel(path)} doesn't exist yet: run python server/b11_embed/pairs.py first (T3)")
    known = set(data.piece_ids())
    out: list[Pair] = []
    seen: set[tuple[str, str, str | None]] = set()
    repeats = 0
    with open(path, encoding="utf-8") as f:
        for n, raw in enumerate(f, start=1):
            if not raw.strip():
                continue
            try:
                row = json.loads(raw)
            except json.JSONDecodeError:
                raise TrainError(f"{rel(path)} line {n} isn't JSON") from None
            if not isinstance(row, dict):
                raise TrainError(f"{rel(path)} line {n} isn't a JSON object")
            query, lang, voice = row.get("query"), row.get("lang"), row.get("voice")
            pid, neg = row.get("pieceId"), row.get("negativeId")
            if not isinstance(query, str) or not compose.strip_prefix(query) or len(query) > MAX_QUERY_CHARS:
                raise TrainError(f"{rel(path)} line {n} has no query, or one over {MAX_QUERY_CHARS} characters")
            if lang not in LANGS:
                raise TrainError(f"{rel(path)} line {n}'s lang is {lang!r}, expected en or zh")
            if not isinstance(voice, str) or not voice:
                raise TrainError(f"{rel(path)} line {n} has no voice")
            if pid not in known:
                raise TrainError(f"{rel(path)} line {n} names a piece that isn't in the index ({pid!r})")
            if neg is not None and (neg not in known or neg == pid):
                raise TrainError(f"{rel(path)} line {n}'s negativeId must be another piece in the index, or null")
            key = (normalized(query), pid, neg)
            if key in seen:
                repeats += 1
                continue
            seen.add(key)
            out.append(Pair(query=query, lang=lang, voice=voice, piece_id=pid, negative_id=neg, line=n))
    if not out:
        raise TrainError(f"{rel(path)} holds no training pairs")
    if repeats:
        log.info("pairs: dropped %d exact repeats", repeats)
    return out


def guard_eval_leak(pairs: Sequence[Pair], data: b11data.Data) -> None:
    """Refuses to train when a training query equals an eval query or the tour query once
    normalized. pairs.py's guard drops those (and near repeats), so this only catches a stale file."""
    held: dict[str, str] = {}
    for q in data.eval:
        if isinstance(q.get("text"), str):
            held[normalized(q["text"])] = str(q.get("id"))
    if data.demo_query and isinstance(data.demo_query.get("text"), str):
        held[normalized(data.demo_query["text"])] = "the tour query"
    for p in pairs:
        hit = held.get(normalized(compose.strip_prefix(p.query)))
        if hit:
            raise TrainError(f"pairs.jsonl line {p.line} repeats {hit}; rerun pairs.py, whose eval-leak guard drops it")


def pairs_source(meta_path: Path, pairs_path: Path) -> tuple[str, list[str]]:
    """`pairSource` and pairs.py's notes (drop counts, dropped negatives) from pairs_meta.json when
    T3 writes one, else from a `source` field on the lines, else "unknown"."""
    meta = read_json(meta_path) if Path(meta_path).is_file() else None
    if isinstance(meta, dict) and isinstance(meta.get("pairSource"), str):
        notes = [str(n) for n in meta.get("notes") or [] if isinstance(n, str)]
        return meta["pairSource"], notes
    sources: set[str] = set()
    if Path(pairs_path).is_file():
        with open(pairs_path, encoding="utf-8") as f:
            for raw in f:
                try:
                    row = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if isinstance(row, dict) and isinstance(row.get("source"), str):
                    sources.add(row["source"])
    if len(sources) == 1:
        return sources.pop(), []
    if sources:
        return "mixed", [f"Pairs come from more than one source: {', '.join(sorted(sources))}."]
    return "unknown", []


def split_dev(pairs: Sequence[Pair], seed: int, share: float = DEV_SHARE) -> tuple[list[Pair], list[Pair]]:
    """Holds out `share` of each piece's queries (rounded, none for a piece with fewer than 2) as
    the dev split, seeded. A held-out query text leaves training for every piece it's paired with."""
    rng = random.Random(seed)
    by_piece: dict[str, list[Pair]] = {}
    for p in pairs:
        by_piece.setdefault(p.piece_id, []).append(p)
    dev: list[Pair] = []
    dev_texts: set[str] = set()
    for pid in sorted(by_piece, key=b11data.id_key):
        group = by_piece[pid]
        texts = list(dict.fromkeys(normalized(p.query) for p in group))
        n = int(round(share * len(texts))) if len(texts) >= 2 else 0
        chosen = set(rng.sample(texts, n)) if n else set()
        for p in group:
            t = normalized(p.query)
            if t in chosen and t not in dev_texts:
                dev.append(p)
                dev_texts.add(t)
    train = [p for p in pairs if normalized(p.query) not in dev_texts]
    return train, dev


def build_rows(pairs: Sequence[Pair], data: b11data.Data) -> dict[str, list[dict[str, str]]]:
    """Training rows by the one text rule: `pairs` (anchor, positive) and `triplets` (anchor,
    positive, negative). The anchor is compose.query_text(query), the passages are embedTexts."""
    passages = {e["pieceId"]: e["embedText"] for e in data.index}
    rows: dict[str, list[dict[str, str]]] = {"pairs": [], "triplets": []}
    for p in pairs:
        row = {"anchor": compose.query_text(p.query, []), "positive": passages[p.piece_id]}
        if p.negative_id:
            row["negative"] = passages[p.negative_id]
            rows["triplets"].append(row)
        else:
            rows["pairs"].append(row)
    for kind, items in rows.items():
        texts = [r["anchor"] for r in items]
        compose.require_one_prefix(texts, "query")
        compose.require_one_prefix([r["positive"] for r in items] + [r.get("negative", r["positive"]) for r in items], "passage")
        log.debug("rows: %d %s", len(items), kind)
    return rows


# ---------------------------------------------------------------------------------------------
# Checkpoints

_CHECKPOINT = re.compile(r"^checkpoint-(\d+)$")


def latest_checkpoint(folder: Path) -> Path | None:
    """The newest complete checkpoint in the folder: `checkpoint-<step>` holding trainer_state.json
    and a model.safetensors, highest step first."""
    folder = Path(folder)
    if not folder.is_dir():
        return None
    found: list[tuple[int, Path]] = []
    for child in folder.iterdir():
        m = _CHECKPOINT.match(child.name)
        if not m or not child.is_dir():
            continue
        if (child / "trainer_state.json").is_file() and any(child.rglob(b11model.WEIGHTS_NAME)):
            found.append((int(m.group(1)), child))
    return max(found)[1] if found else None


def ensure_outside_server(path: Path, what: str) -> None:
    resolved = Path(path).resolve()
    try:
        resolved.relative_to(SERVER_DIR.resolve())
    except ValueError:
        return
    raise TrainError(f"{what} would go under server/ ({rel(path)}), which only holds committed files")


def prepare_checkpoints(folder: Path, run_key: Mapping[str, Any]) -> Path | None:
    """The checkpoint to resume from, or None for a fresh start. Checkpoints from a run with other
    settings or other pairs are cleared first."""
    folder = Path(folder)
    ensure_outside_server(folder, "Checkpoints")
    key_file = folder / "run.json"
    if folder.is_dir():
        old = read_json(key_file) if key_file.is_file() else None
        if old == dict(run_key):
            latest = latest_checkpoint(folder)
            if latest is not None:
                log.info("resuming from %s", rel(latest))
            return latest
        log.info("clearing checkpoints from another run in %s", rel(folder))
        shutil.rmtree(folder)
    folder.mkdir(parents=True, exist_ok=True)
    write_json(key_file, dict(run_key))
    return None


# ---------------------------------------------------------------------------------------------
# The backend: the only code that touches torch and sentence-transformers


class Progress:
    """What the backend reports while training: one log line every 10 steps and one per epoch,
    plus each step's seconds for the probe."""

    def __init__(self, every: int = LOG_EVERY):
        self.every = every
        self.step_seconds: list[float] = []
        self.started = time.monotonic()
        self.total_steps: int | None = None

    def step(self, step: int, seconds: float) -> None:
        self.step_seconds.append(seconds)

    def logs(self, step: int, values: Mapping[str, Any]) -> None:
        if self.every > 1 and step % self.every:
            return
        loss = values.get("loss")
        lr = values.get("learning_rate")
        recent = self.step_seconds[-self.every :]
        per = sum(recent) / len(recent) if recent else 0.0
        of = f"/{self.total_steps}" if self.total_steps else ""
        parts = [f"step {step}{of}"]
        if isinstance(loss, (int, float)):
            parts.append(f"loss {loss:.4f}")
        if isinstance(lr, (int, float)):
            parts.append(f"lr {lr:.2e}")
        parts.append(f"{per:.1f} s a step")
        log.info(", ".join(parts))

    def epoch(self, epoch: float, step: int) -> None:
        minutes = (time.monotonic() - self.started) / 60.0
        log.info("epoch %d done at step %d, %.1f min", int(round(epoch)), step, minutes)


class STBackend:
    """sentence-transformers 6.2 on torch: load, encode, freeze, train with SentenceTransformerTrainer."""

    name = "sentence-transformers"

    def require_training(self) -> None:
        """Training needs datasets and accelerate (requirements-train.txt). Says so before anything
        downloads, instead of failing inside the trainer."""
        missing = [m for m in ("datasets", "accelerate") if importlib.util.find_spec(m) is None]
        if missing:
            raise TrainError(
                f"{' and '.join(missing)} {'is' if len(missing) == 1 else 'are'} not installed: run "
                "python -m pip install -r server/b11_embed/requirements-train.txt with the .venv Python"
            )

    def device(self, wanted: str) -> str:
        import torch

        if wanted == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return wanted

    def prepare(self, seed: int, threads: int) -> None:
        import torch
        from transformers import set_seed
        from transformers.utils import logging as hf_logging

        hf_logging.set_verbosity_warning()
        hf_logging.disable_progress_bar()
        torch.set_num_threads(threads)
        set_seed(seed)
        torch.manual_seed(seed)

    def load(self, name_or_path: str | Path, device: str, *, local_only: bool) -> Any:
        return b11model.load_sentence_transformer(name_or_path, device=device, local_only=local_only)

    def encoder(self, model: Any) -> evaluate.Encoder:
        return b11model.STEncoder(model).encode

    def token_lengths(self, model: Any, texts: Sequence[str]) -> list[int]:
        ids = model.tokenizer(list(texts), add_special_tokens=True, truncation=False)["input_ids"]
        return [len(x) for x in ids]

    def set_max_seq_length(self, model: Any, n: int) -> None:
        model.max_seq_length = n

    def freeze_word_embeddings(self, model: Any) -> tuple[int, int]:
        """Freezes `embeddings.word_embeddings` (the input embeddings) and returns the trainable and
        total weight counts."""
        hf = model[0].auto_model
        emb = hf.get_input_embeddings()
        for p in emb.parameters():
            p.requires_grad = False
        total = sum(p.numel() for p in model.parameters())
        trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        return trainable, total

    def training_args(self, settings: Settings, batch: int, output_dir: Path, max_steps: int | None) -> Any:
        from sentence_transformers import SentenceTransformerTrainingArguments
        from sentence_transformers.sentence_transformer.training_args import BatchSamplers

        probe = max_steps is not None
        return SentenceTransformerTrainingArguments(
            output_dir=str(output_dir),
            num_train_epochs=settings.epochs,
            max_steps=max_steps if probe else -1,
            per_device_train_batch_size=batch,
            learning_rate=settings.lr,
            warmup_steps=settings.warmup,
            lr_scheduler_type="linear",
            fp16=False,
            bf16=False,
            dataloader_num_workers=0,
            batch_sampler=BatchSamplers.NO_DUPLICATES,
            save_strategy="no" if probe else "epoch",
            save_only_model=True,
            save_total_limit=1,
            logging_strategy="steps",
            logging_steps=1 if probe else LOG_EVERY,
            eval_strategy="no",
            report_to="none",
            push_to_hub=False,
            disable_tqdm=True,
            seed=settings.seed,
            data_seed=settings.seed,
            use_cpu=settings.device == "cpu",
        )

    def train(
        self,
        model: Any,
        rows: Mapping[str, list[dict[str, str]]],
        settings: Settings,
        batch: int,
        *,
        output_dir: Path,
        progress: Progress,
        max_steps: int | None = None,
        resume_from: Path | None = None,
    ) -> dict[str, Any]:
        import warnings

        from datasets import Dataset, DatasetDict
        from sentence_transformers import SentenceTransformerTrainer
        from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss
        from transformers import TrainerCallback
        from transformers.trainer_callback import PrinterCallback, ProgressCallback

        sets = {}
        if rows.get("pairs"):
            sets["pairs"] = Dataset.from_dict(
                {"anchor": [r["anchor"] for r in rows["pairs"]], "positive": [r["positive"] for r in rows["pairs"]]}
            )
        if rows.get("triplets"):
            t = rows["triplets"]
            sets["triplets"] = Dataset.from_dict(
                {"anchor": [r["anchor"] for r in t], "positive": [r["positive"] for r in t], "negative": [r["negative"] for r in t]}
            )
        if not sets:
            raise TrainError("there are no training rows")
        train_dataset = DatasetDict(sets) if len(sets) > 1 else next(iter(sets.values()))
        args = self.training_args(settings, batch, output_dir, max_steps)
        resume = str(resume_from) if resume_from else None

        class _Callback(TrainerCallback):
            def __init__(self) -> None:
                self.t0 = 0.0

            def on_train_begin(self, args, state, control, lr_scheduler=None, **kwargs):  # noqa: ANN001
                progress.total_steps = state.max_steps or None
                # save_only_model keeps no scheduler state, so a resumed run steps a fresh
                # scheduler up to where the checkpoint stopped instead of warming up again.
                if resume and lr_scheduler is not None and not (Path(resume) / "scheduler.pt").is_file():
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        for _ in range(int(state.global_step)):
                            lr_scheduler.step()

            def on_step_begin(self, args, state, control, **kwargs):  # noqa: ANN001
                self.t0 = time.perf_counter()

            def on_step_end(self, args, state, control, **kwargs):  # noqa: ANN001
                progress.step(int(state.global_step), time.perf_counter() - self.t0)

            def on_log(self, args, state, control, logs=None, **kwargs):  # noqa: ANN001
                if logs and "loss" in logs:
                    progress.logs(int(state.global_step), logs)

            def on_epoch_end(self, args, state, control, **kwargs):  # noqa: ANN001
                if max_steps is None:
                    progress.epoch(float(state.epoch or 0), int(state.global_step))

        loss = MultipleNegativesRankingLoss(model)
        trainer = SentenceTransformerTrainer(
            model=model, args=args, train_dataset=train_dataset, loss=loss, callbacks=[_Callback()]
        )
        for cb in (PrinterCallback, ProgressCallback):
            trainer.remove_callback(cb)
        result = trainer.train(resume_from_checkpoint=resume)
        return {"steps": int(trainer.state.global_step), "loss": float(result.training_loss)}

    def save(self, model: Any, path: Path) -> None:
        model.save_pretrained(str(path), create_model_card=False)


# ---------------------------------------------------------------------------------------------
# The run


def load_data(o: Options) -> b11data.Data:
    try:
        if o.paths.data is not None:
            return b11data.load(o.paths.data, expected=o.expected_pieces)
        return b11data.load(expected=o.expected_pieces)
    except b11data.DataError as exc:
        raise TrainError(str(exc)) from None


def eval_queries(d: b11data.Data) -> list[dict[str, Any]]:
    queries = [q for q in d.eval if isinstance(q.get("id"), str) and isinstance(q.get("grades"), dict) and q["grades"]]
    if not queries:
        raise TrainError(
            f"searchEval is empty in {rel(d.source)}: S3-catalog hasn't written the eval queries yet, so there's nothing to score"
        )
    return queries


def file_hash(path: Path) -> str | None:
    return sha256_bytes(Path(path).read_bytes()) if Path(path).is_file() else None


def choose_batch(o: Options, pairs_hash: str | None) -> tuple[int, str | None]:
    """The batch size, and a note when the last probe sent it down to 16."""
    if o.settings.batch is not None:
        return o.settings.batch, None
    probe = read_json(o.paths.probe) if Path(o.paths.probe).is_file() else None
    if isinstance(probe, dict) and probe.get("pairsHash") == pairs_hash and probe.get("batch") == DEFAULT_BATCH and probe.get("overLimit"):
        note = (
            f"Batch 16, not 32: the memory probe measured a peak of {gb(probe.get('peakRssBytes'))} and "
            f"{probe.get('secondsPerStep', 0):.1f} s a step at batch 32 (limits 4 GB and 30 s)."
        )
        return FALLBACK_BATCH, note
    return DEFAULT_BATCH, None


def save_model(backend: Any, model: Any, target: Path) -> Path:
    """Saves into a fresh folder beside the target, then swaps it in, so a killed save never
    leaves half a model where the server looks."""
    target = Path(target)
    ensure_outside_server(target, "The model")
    staging = target.with_name(target.name + ".new")
    old = target.with_name(target.name + ".old")
    for p in (staging, old):
        if p.exists():
            shutil.rmtree(p)
    backend.save(model, staging)
    if b11model.weights_file(staging) is None:
        raise TrainError(f"the saved model in {rel(staging)} has no {b11model.WEIGHTS_NAME}")
    if target.exists():
        os.replace(target, old)
    os.replace(staging, target)
    if old.exists():
        shutil.rmtree(old, ignore_errors=True)
    return target


def model_sha256(folder: Path) -> str:
    weights = b11model.weights_file(folder)
    if weights is None:
        raise TrainError(f"there's no {b11model.WEIGHTS_NAME} in {rel(folder)}")
    return b11model.sha256_file(weights)


@dataclass
class Encoded:
    """Everything the report needs, encoded by one model."""

    vectors: evaluate.Vectors
    dev: np.ndarray
    tour: np.ndarray | None


def encode_all(
    enc: evaluate.Encoder,
    d: b11data.Data,
    queries: Sequence[Mapping[str, Any]],
    dev: Sequence[Pair],
) -> Encoded:
    passages = evaluate.encode(enc, d.passages(), "passage")
    qv = evaluate.encode(enc, [evaluate.query_text(q) for q in queries], "query")
    dv = evaluate.encode(enc, [compose.query_text(p.query, []) for p in dev], "query") if dev else np.zeros((0, passages.shape[1]))
    tour = None
    if d.demo_query and isinstance(d.demo_query.get("text"), str):
        tour = evaluate.encode(enc, [compose.query_text(d.demo_query["text"], d.demo_query.get("keywords") or [])], "query")[0]
    return Encoded(vectors=evaluate.Vectors(passages=passages, queries=qv), dev=dv, tour=tour)


def build_map(
    d: b11data.Data,
    custom: Encoded,
    queries: Sequence[Mapping[str, Any]],
    train_anchor_mean: Callable[[], np.ndarray | None],
) -> tuple[dict[str, Any], np.ndarray, Any, list[str]]:
    """The PCA, the pieces' points, queryShift and the map's notes."""
    pv = custom.vectors.passages
    fitted = pca.fit(pv)
    points = pca.transform(pv, fitted)
    notes: list[str] = []
    shift = None
    if custom.tour is not None:
        if pca.lands(custom.tour, pv, points, fitted):
            placement = "projected"
        else:
            shift, placement = pca.choose_shift(custom.tour, pv, points, fitted, train_anchor_mean())
        fitted["tourQuery"] = placement
        words = {
            "projected": "its projected point lands within the spread of its top 3, so the map stores no queryShift",
            "shifted": "its plain projection missed the spread of its top 3, so the map stores queryShift (the passage mean minus the mean training-query vector), and with it the query lands inside",
            "approx": "its projection missed the spread of its top 3 even with queryShift, so it sits at the weighted center of its top 3, marked approximate",
        }[placement]
        notes.append(f"The tour query on the map: {words}.")
    else:
        notes.append("The data has no tour query, so the map's projection check didn't run.")
    approx = sum(1 for v in custom.vectors.queries if pca.place(v, pv, points, fitted, shift)[2])
    notes.append(
        f"On the map, {len(queries) - approx} of the {len(queries)} test queries land by projection and {approx} at the "
        f"weighted center of their top 3, marked approximate. The two components explain "
        f"{fitted['explainedVariance'][0]:.1%} and {fitted['explainedVariance'][1]:.1%} of the passages' variance."
    )
    return fitted, points, shift, notes


def report_notes(
    *,
    result: evaluate.Result,
    queries: Sequence[Mapping[str, Any]],
    d: b11data.Data,
    training: Mapping[str, Any],
    dev: Mapping[str, Mapping[str, float]] | None,
    map_notes: Sequence[str],
    data_problems: Sequence[str],
    scored_at: str,
    device: str,
    eval_only: bool,
) -> list[str]:
    n_pieces = len(d.index)
    gordon = sum(1 for q in queries if q.get("author") == "gordon")
    who = "our data agent, not a person" if not gordon else f"our data agent ({gordon} written or edited by Gordon)"
    notes = [
        f"Every number here comes from this run, scored {scored_at} on {device}"
        + (", rerun with --eval-only on the saved model." if eval_only else "."),
        f"The {len(queries)} test queries were written by {who}, and held out: none is used for training. "
        f"The {n_pieces} pieces they grade are in training, and only the queries are held out. "
        "One small catalog and one model family: a small test, not a benchmark.",
        *result.notes,
        "hybrid is a local hybrid: reciprocal rank fusion (constant 60) of Cindia's model and BM25, skipping keyword hits "
        "that scored 0. The live Elastic hybrid is a different system, and B12 records its own numbers.",
        "recallAtK is recall@5 (grades 1 and 2 both count); mrr is MRR@10 (the first grade-2 piece within the top 10).",
    ]
    unjudged = evaluate.unjudged_count(result, queries)
    if unjudged:
        notes.append(
            f"{unjudged} pieces in some system's top 5 aren't graded for their query, and count as misses until the pooled "
            "grading pass (unjudged.json)."
        )
    else:
        notes.append("Every piece in any system's top 5 is graded for its query.")
    if dev:
        notes.append(
            f"Dev split: {training.get('devQueries', 0)} training queries held out (10% of each piece's). Recall@5 on them: "
            f"base {dev['base']['recallAtK']:.3f}, Cindia's model {dev['custom']['recallAtK']:.3f}. They come from the "
            "same authoring pipeline as the training queries, so they say less than the test set."
        )
    notes.extend(map_notes)
    notes.append(
        f"Fine-tuned from {BASE_MODEL} ({BASE_LICENSE}) for {training.get('epochs')} epochs at batch {training.get('batch')} "
        f"({training.get('steps')} steps) with MultipleNegativesRankingLoss on {training.get('pairRows')} query-passage pairs and "
        f"{training.get('tripletRows')} triplets with a hard negative, NO_DUPLICATES batches, learning rate "
        f"{training.get('learningRate')} with {training.get('warmup', 0):.0%} warmup, seed {training.get('seed')}, "
        f"max_seq_length {training.get('maxSeqLength')}, word embeddings frozen "
        f"({millions(int(training.get('trainableWeights') or 0))} of {millions(int(training.get('totalWeights') or 0))} weights trained)."
    )
    if training.get("batchNote"):
        notes.append(str(training["batchNote"]))
    notes.extend(str(n) for n in training.get("pairsNotes") or [])
    for p in data_problems:
        notes.append(f"Data check: {p}")
    return notes


def finish(
    o: Options,
    d: b11data.Data,
    queries: Sequence[Mapping[str, Any]],
    base: Encoded,
    custom: Encoded,
    *,
    sha: str,
    training: dict[str, Any],
    dev_pairs: Sequence[Pair],
    train_anchor_mean: Callable[[], np.ndarray | None],
    data_problems: Sequence[str],
    device: str,
    keep: Mapping[str, Any] | None,
    eval_only: bool,
) -> dict[str, Any]:
    """Scores, maps and writes report.json, vectors.json and unjudged.json. Returns the report."""
    s = o.settings
    passages_hash = d.passages_hash()
    fp = b11model.fingerprint_of(sha, passages_hash)
    vectors = {"base": base.vectors, "custom": custom.vectors}
    result = evaluate.evaluate(d, queries, vectors, seed=s.seed)
    dev = None
    if dev_pairs:
        dev = evaluate.dev_scores(
            [{"pieceId": p.piece_id} for p in dev_pairs],
            d.piece_ids(),
            {"base": evaluate.Vectors(base.vectors.passages, base.dev), "custom": evaluate.Vectors(custom.vectors.passages, custom.dev)},
        )
        training["devRecallAtK"] = {k: round(v["recallAtK"], 6) for k, v in dev.items()}
    fitted, points, shift, map_notes = build_map(d, custom, queries, train_anchor_mean)
    scored_at = now_utc()
    keep = keep or {}
    report: dict[str, Any] = {
        "modelId": s.model_id,
        "baseModel": s.base_model,
        "dims": int(custom.vectors.passages.shape[1]),
        "pairs": int(training.get("pairs") or 0),
        "epochs": int(training.get("epochs") or s.epochs),
        "batch": int(training.get("batch") or DEFAULT_BATCH),
        "seed": int(training.get("seed") or s.seed),
        "device": str(training.get("device") or device),
        "pairSource": str(training.get("pairSource") or "unknown"),
        "modelSha256": sha,
        "passagesHash": passages_hash,
        "fingerprint": fp,
        "hubRepo": keep.get("hubRepo"),
        "hubRevision": keep.get("hubRevision"),
        "hubUrl": keep.get("hubUrl"),
        "pca": {
            "explainedVariance": [round(float(v), 6) for v in fitted["explainedVariance"]],
            "tourQuery": fitted.get("tourQuery"),
            "queryShift": shift is not None,
        },
        "eval": result.eval,
        "training": {**training, "scoredAt": scored_at},
        "notes": report_notes(
            result=result,
            queries=queries,
            d=d,
            training=training,
            dev=dev,
            map_notes=map_notes,
            data_problems=data_problems,
            scored_at=scored_at,
            device=device,
            eval_only=eval_only,
        ),
    }
    vectors_json = {
        "modelId": s.model_id,
        "dims": report["dims"],
        "fingerprint": fp,
        "pca": {
            "mean": pca.rounded(fitted["mean"]),
            "components": pca.rounded(fitted["components"]),
            "scale": round(float(fitted["scale"]), 6),
            "queryShift": pca.rounded(shift) if shift is not None else None,
        },
        "pieces": [
            {
                "pieceId": pid,
                "vector": pca.rounded(custom.vectors.passages[i]),
                "x": round(float(points[i][0]), 5),
                "y": round(float(points[i][1]), 5),
            }
            for i, pid in enumerate(d.piece_ids())
        ],
    }
    write_json(o.paths.vectors, vectors_json, compact=True)
    write_json(o.paths.report, report)
    if not eval_only or not Path(o.paths.unjudged).is_file():
        write_json(
            o.paths.unjudged,
            {
                "_about": "For each held-out query, the pieces any system put in its top 5 that the query doesn't grade, "
                "for one pooled grading pass (S3-catalog T9). Fictional demo data.",
                "modelId": s.model_id,
                "fingerprint": fp,
                "k": metrics.K,
                "systems": list(evaluate.SYSTEMS),
                "queries": evaluate.unjudged(result, queries),
            },
        )
    for row in result.eval["systems"]:
        log.info("%s: recall@5 %.3f, MRR@10 %.3f", metrics.LABELS[row["system"]], row["recallAtK"], row["mrr"])
    log.info("wrote %s, %s and %s, fingerprint %s", rel(o.paths.report), rel(o.paths.vectors), rel(o.paths.unjudged), fp)
    return report


def anchor_mean(backend: Any, model: Any, anchors: Sequence[str]) -> Callable[[], np.ndarray | None]:
    """The mean training-query vector, encoded only if the map needs it."""

    def compute() -> np.ndarray | None:
        texts = list(dict.fromkeys(anchors))
        if not texts:
            return None
        log.info("encoding %d training queries for the map's queryShift", len(texts))
        return evaluate.encode(backend.encoder(model), texts, "query").mean(axis=0)

    return compute


def maybe_publish(o: Options) -> None:
    """Publishes through publish.py (T8) when the token, the repo and the script are all there."""
    if not o.publish:
        log.info("publish: skipped (--no-publish)")
        return
    if not (config.has_key("HF_TOKEN") and config.HF_REPO):
        log.info("publish: skipped, HF_TOKEN or CINDIA_HF_REPO isn't set")
        return
    if importlib.util.find_spec("server.b11_embed.publish") is None:
        log.info("publish: skipped, server/b11_embed/publish.py doesn't exist yet (T8)")
        return
    from server.b11_embed import publish  # type: ignore[attr-defined]

    code = publish.main([])
    log.info("publish: publish.py exited %s", code)


def run_probe(o: Options, backend: Any) -> int:
    s = o.settings
    d = load_data(o)
    pairs = load_pairs(o.paths.pairs, d)
    guard_eval_leak(pairs, d)
    train_pairs, _ = split_dev(pairs, s.seed)
    rows = build_rows(train_pairs, d)
    batch = s.batch or DEFAULT_BATCH
    random.seed(s.seed)
    np.random.seed(s.seed)
    getattr(backend, "require_training", lambda: None)()
    device = backend.device(s.device)
    backend.prepare(s.seed, s.threads)
    model = backend.load(s.base_model, device, local_only=False)
    cap = token_cap(backend.token_lengths(model, d.passages()), s.token_cap)
    backend.set_max_seq_length(model, cap)
    trainable, total = backend.freeze_word_embeddings(model)
    probe_dir = Path(o.paths.checkpoints).parent / "probe"
    ensure_outside_server(probe_dir, "The probe's output")
    progress = Progress(every=1)
    t0 = time.monotonic()
    backend.train(model, rows, s, batch, output_dir=probe_dir, progress=progress, max_steps=PROBE_STEPS)
    shutil.rmtree(probe_dir, ignore_errors=True)
    steps = progress.step_seconds[:PROBE_STEPS]
    per = sum(steps) / len(steps) if steps else float("nan")
    peak = peak_rss_bytes()
    over = (peak is not None and peak > PROBE_MAX_RSS_BYTES) or (steps and per > PROBE_MAX_STEP_S)
    write_json(
        o.paths.probe,
        {
            "at": now_utc(),
            "steps": len(steps),
            "batch": batch,
            "device": device,
            "secondsPerStep": round(per, 3) if steps else None,
            "stepSeconds": [round(x, 3) for x in steps],
            "peakRssBytes": peak,
            "maxSeqLength": cap,
            "trainableWeights": trainable,
            "totalWeights": total,
            "pairsHash": file_hash(o.paths.pairs),
            "overLimit": bool(over),
            "seconds": round(time.monotonic() - t0, 1),
        },
    )
    shown = ", ".join(f"{x:.1f}" for x in steps)
    print(
        f"probe: {len(steps)} steps at batch {batch} on {device}, {per:.1f} s per step ({shown}), peak RSS {gb(peak)}, "
        f"max_seq_length {cap}, {millions(trainable)} of {millions(total)} weights train"
    )
    if over:
        print("probe: over the limits (4 GB peak or 30 s a step), so the next run uses batch 16 and says so in notes")
    else:
        print(f"probe: within the limits (4 GB peak, 30 s a step), so the next run keeps batch {batch}")
    log.info("probe: %d steps, %.1f s a step, peak RSS %s, batch %d", len(steps), per, gb(peak), batch)
    return 0


def run_train(o: Options, backend: Any) -> int:
    s, paths = o.settings, o.paths
    started = time.monotonic()
    d = load_data(o)
    queries = eval_queries(d)
    data_problems = b11data.check(d)
    for p in data_problems:
        log.info("data check: %s", p)
    pairs = load_pairs(paths.pairs, d)
    guard_eval_leak(pairs, d)
    pair_source, pairs_notes = pairs_source(paths.pairs_meta, paths.pairs)
    train_pairs, dev_pairs = split_dev(pairs, s.seed)
    rows = build_rows(train_pairs, d)
    pairs_hash = file_hash(paths.pairs)
    batch, batch_note = choose_batch(o, pairs_hash)
    ensure_outside_server(paths.model_dir, "The model")
    log.info(
        "train: %d pairs (%d train, %d dev, %d with a hard negative), batch %d, %d epochs, seed %d",
        len(pairs), len(train_pairs), len(dev_pairs), len(rows["triplets"]), batch, s.epochs, s.seed,
    )
    random.seed(s.seed)
    np.random.seed(s.seed)
    getattr(backend, "require_training", lambda: None)()
    device = backend.device(s.device)
    backend.prepare(s.seed, s.threads)
    model = backend.load(s.base_model, device, local_only=False)
    cap = token_cap(backend.token_lengths(model, d.passages()), s.token_cap)
    backend.set_max_seq_length(model, cap)
    trainable, total = backend.freeze_word_embeddings(model)
    log.info("model: %s on %s, max_seq_length %d, %s of %s weights train", s.base_model, device, cap, millions(trainable), millions(total))
    base = encode_all(backend.encoder(model), d, queries, dev_pairs)
    run_key = {
        "baseModel": s.base_model,
        "pairsHash": pairs_hash,
        "passagesHash": d.passages_hash(),
        "batch": batch,
        "epochs": s.epochs,
        "lr": s.lr,
        "seed": s.seed,
        "maxSeqLength": cap,
    }
    resume = prepare_checkpoints(paths.checkpoints, run_key)
    progress = Progress()
    stats = backend.train(model, rows, s, batch, output_dir=paths.checkpoints, progress=progress, resume_from=resume)
    save_model(backend, model, paths.model_dir)
    sha = model_sha256(paths.model_dir)
    log.info("saved the model to %s, sha256 %s", rel(paths.model_dir), sha[:16])
    custom = encode_all(backend.encoder(model), d, queries, dev_pairs)
    training = {
        "pairs": len(pairs),
        "trainQueries": len(train_pairs),
        "devQueries": len(dev_pairs),
        "pairRows": len(rows["pairs"]),
        "tripletRows": len(rows["triplets"]),
        "voices": dict(sorted(Counter(p.voice for p in pairs).items())),
        "langs": dict(sorted(Counter(p.lang for p in pairs).items())),
        "epochs": s.epochs,
        "batch": batch,
        "batchNote": batch_note,
        "seed": s.seed,
        "device": device,
        "learningRate": s.lr,
        "warmup": s.warmup,
        "maxSeqLength": cap,
        "trainableWeights": trainable,
        "totalWeights": total,
        "steps": stats.get("steps"),
        "resumedFrom": rel(resume) if resume else None,
        "minutes": round((time.monotonic() - started) / 60.0, 1),
        "pairSource": pair_source,
        "pairsNotes": pairs_notes,
        "trainedAt": now_utc(),
    }
    anchors = [compose.query_text(p.query, []) for p in train_pairs]
    finish(
        o, d, queries, base, custom,
        sha=sha, training=training, dev_pairs=dev_pairs,
        train_anchor_mean=anchor_mean(backend, model, anchors),
        # A new model isn't on the Hub yet, so hubRepo, hubRevision and hubUrl start null (publish.py sets them).
        data_problems=data_problems, device=device, keep=None,
        eval_only=False,
    )
    shutil.rmtree(paths.checkpoints, ignore_errors=True)
    log.info("train: done in %.1f min; checkpoints cleared", (time.monotonic() - started) / 60.0)
    maybe_publish(o)
    return 0


def run_eval_only(o: Options, backend: Any) -> int:
    s, paths = o.settings, o.paths
    old = read_json(paths.report)
    if not isinstance(old, dict) or not isinstance(old.get("modelSha256"), str):
        raise TrainError(f"there's no {rel(paths.report)} to rerun: run python server/b11_embed/train.py first")
    if b11model.weights_file(paths.model_dir) is None:
        raise TrainError(f"there's no model in {rel(paths.model_dir)}: train it, or run python server/b11_embed/fetch_model.py")
    sha = model_sha256(paths.model_dir)
    if sha != old["modelSha256"]:
        raise TrainError(f"the model in {rel(paths.model_dir)} doesn't match report.json's modelSha256, so --eval-only won't score it")
    d = load_data(o)
    queries = eval_queries(d)
    data_problems = b11data.check(d)
    training = dict(old.get("training") or {})
    pairs: list[Pair] = []
    if Path(paths.pairs).is_file():
        pairs = load_pairs(paths.pairs, d)
        guard_eval_leak(pairs, d)
    seed = int(old.get("seed") or s.seed)
    train_pairs, dev_pairs = split_dev(pairs, seed) if pairs else ([], [])
    device = backend.device(s.device)
    backend.prepare(seed, s.threads)
    cap = training.get("maxSeqLength")
    custom_model = backend.load(paths.model_dir, device, local_only=True)
    base_model = backend.load(old.get("baseModel") or s.base_model, device, local_only=False)
    if isinstance(cap, int):
        backend.set_max_seq_length(custom_model, cap)
        backend.set_max_seq_length(base_model, cap)
    base = encode_all(backend.encoder(base_model), d, queries, dev_pairs)
    custom = encode_all(backend.encoder(custom_model), d, queries, dev_pairs)
    training.update(
        pairs=old.get("pairs", training.get("pairs")),
        epochs=old.get("epochs", training.get("epochs")),
        batch=old.get("batch", training.get("batch")),
        seed=seed,
        device=old.get("device", training.get("device")),
        pairSource=old.get("pairSource", training.get("pairSource")),
        devQueries=len(dev_pairs),
    )
    anchors = [compose.query_text(p.query, []) for p in train_pairs]
    finish(
        dataclasses.replace(o, settings=dataclasses.replace(s, seed=seed)),
        d, queries, base, custom,
        sha=sha, training=training, dev_pairs=dev_pairs,
        train_anchor_mean=anchor_mean(backend, custom_model, anchors),
        data_problems=data_problems, device=device, keep=old, eval_only=True,
    )
    maybe_publish(o)
    return 0


def run(o: Options, backend: Any | None = None) -> int:
    """Runs one mode with the given backend (sentence-transformers unless a test passes a fake).
    Returns the exit code. A TrainError prints its one line and exits 1."""
    backend = backend or STBackend()
    handlers = setup_logging(o.paths.log)
    try:
        log.info("b11 train.py %s, seed %d, device %s", o.mode, o.settings.seed, o.settings.device)
        if o.mode == "probe":
            return run_probe(o, backend)
        if o.mode == "eval":
            return run_eval_only(o, backend)
        return run_train(o, backend)
    except TrainError as exc:
        log.info("b11 train.py stopped: %s", exc)
        return 1
    finally:
        close_logging(handlers)


def parse_args(argv: Sequence[str] | None) -> Options:
    parser = argparse.ArgumentParser(description="Fine-tune, score and map Cindia's embedding model (B11).")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--probe", action="store_true", help=f"run {PROBE_STEPS} training steps, print peak RSS and seconds per step, exit")
    mode.add_argument("--eval-only", action="store_true", help="reload the saved model and rerun only the evaluation and the report")
    parser.add_argument("--seed", type=int, default=13)
    parser.add_argument("--device", choices=("cpu", "auto", "cuda"), default="cpu", help="cpu by default; auto uses a GPU when torch finds one")
    parser.add_argument("--batch", type=int, default=None, help="batch size (default 32, or 16 when the last probe went over the limits)")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--pairs", type=Path, default=None, help="training pairs (default server/b11_embed/pairs.jsonl)")
    parser.add_argument("--data", type=Path, default=None, help="data file (default: what data.load() picks)")
    parser.add_argument("--model-dir", type=Path, default=None, help="where the model goes (default CINDIA_MODEL_DIR)")
    parser.add_argument("--no-publish", action="store_true", help="never call publish.py at the end")
    args = parser.parse_args(argv)
    paths = Paths()
    if args.pairs is not None:
        paths.pairs = args.pairs
    if args.data is not None:
        paths.data = args.data
    if args.model_dir is not None:
        paths.model_dir = args.model_dir if args.model_dir.is_absolute() else REPO_ROOT / args.model_dir
    settings = Settings(seed=args.seed, device=args.device, batch=args.batch, epochs=args.epochs)
    return Options(
        mode="probe" if args.probe else "eval" if args.eval_only else "train",
        paths=paths,
        settings=settings,
        publish=not args.no_publish,
    )


def main(argv: Sequence[str] | None = None) -> int:
    return run(parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
