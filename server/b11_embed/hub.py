"""B11's Hugging Face hand-off, shared by publish.py and fetch_model.py (B11-embed.md, The hand-off;
fix-plan 1.7). The repo is private (`config.HF_REPO`, from `CINDIA_HF_REPO`), and the token is read
only through server/config.py and never printed, logged or put in a message.

- `MODEL_PATTERNS` are the model files the repo carries: `*.json`, `*.safetensors`, `*.txt`,
  `sentencepiece.bpe.model`, `1_Pooling/*` and `2_Normalize/*` (sentence-transformers 6 saves the
  Normalize module's config.json there, and modules.json names that folder). `model_files()`
  matches them one path segment at a time, so `*.json` means a JSON file at the top of the folder,
  and `uncovered_modules()` names any module folder in modules.json whose files they'd leave out. huggingface_hub matches patterns with
  fnmatch, where `*` also crosses `/` (`*.json` matches `checkpoint-59/trainer_state.json`), so
  publish.py never hands it these patterns: it passes the exact file names they selected as
  `allow_patterns`, with `IGNORE_PATTERNS` on top, and a checkpoint can't match either way.
- `check_online()` refuses when `HF_HUB_OFFLINE` is set in this shell (uvicorn runs with it, so the
  server never calls the Hub).
- `bound_timeouts()` gives huggingface_hub's HTTP client a timeout, because its default has none.
- `describe()` turns a Hub error into one plain line, never the error's own text.

huggingface_hub is imported inside the functions, so importing this module costs nothing.
"""

from __future__ import annotations

import json
import os
import re
from collections.abc import Iterable
from fnmatch import fnmatchcase
from pathlib import Path
from typing import Any

MODEL_PATTERNS: tuple[str, ...] = ("*.json", "*.safetensors", "*.txt", "sentencepiece.bpe.model", "1_Pooling/*", "2_Normalize/*")
CARD_NAME = "README.md"
REPORT_NAME = "report.json"
WEIGHTS_NAME = "model.safetensors"
# Files a model folder must hold to load (services.model_present() checks modules.json).
REQUIRED_FILES: tuple[str, ...] = (WEIGHTS_NAME, "modules.json")
# Never uploaded or kept, whatever else matches: checkpoints, trainer state, logs, pairs, caches.
IGNORE_PATTERNS: tuple[str, ...] = (
    "*checkpoint*",
    "*trainer_state*",
    "*training_args*",
    "*optimizer*",
    "*scheduler*",
    "*rng_state*",
    "*.pt",
    "*.pth",
    "*.ckpt",
    "*.log",
    "*.jsonl",
    "*pairs*",
    "runs/*",
    "*/runs/*",
    ".cache/*",
    "*/.cache/*",
    ".git/*",
    "*/.git/*",
)
GLOB_CHARS = re.compile(r"[*?\[\]]")
REPO_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]*$")
HUB_URL = "https://huggingface.co"
# huggingface_hub's own client has no timeout. Every request gets these.
READ_TIMEOUT_S = 120.0
CONNECT_TIMEOUT_S = 15.0
INFO_TIMEOUT_S = 30.0
_OFF = {"1", "true", "yes", "on"}


class HubError(Exception):
    """The hand-off can't go on. The message is one plain line with no secret in it."""


# ---------------------------------------------------------------------------------------------
# Which files


def segment_match(path: str, pattern: str) -> bool:
    """A glob match where `*` stays inside one path segment, as a shell glob does."""
    a, b = path.split("/"), pattern.split("/")
    return len(a) == len(b) and all(fnmatchcase(x, y) for x, y in zip(a, b))


def ignored(path: str) -> bool:
    """Whether a path matches IGNORE_PATTERNS (fnmatch, as huggingface_hub applies them)."""
    return any(fnmatchcase(path, p) for p in IGNORE_PATTERNS)


def is_model_file(path: str) -> bool:
    """A repo-relative path with forward slashes that MODEL_PATTERNS select and nothing ignores."""
    return any(segment_match(path, p) for p in MODEL_PATTERNS) and not ignored(path)


def model_files(folder: Path, *, skip: Iterable[str] = (CARD_NAME, REPORT_NAME)) -> list[str]:
    """The model files in `folder`, as sorted relative paths with forward slashes. `skip` leaves out
    names the hand-off writes itself (the card and the report)."""
    folder = Path(folder)
    if not folder.is_dir():
        return []
    skipped = set(skip)
    out = []
    for p in folder.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(folder).as_posix()
        if rel in skipped or not is_model_file(rel):
            continue
        out.append(rel)
    return sorted(out)


def uncovered_modules(folder: Path, names: Iterable[str]) -> list[str]:
    """The module folders modules.json names that hold files missing from `names`, so a model
    published or installed without them might not load. Empty when every module is covered."""
    try:
        modules = json.loads((Path(folder) / "modules.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    have = set(names)
    out = []
    for m in modules if isinstance(modules, list) else []:
        sub = m.get("path") if isinstance(m, dict) else None
        if not isinstance(sub, str) or not sub.strip("/"):
            continue
        d = Path(folder) / sub
        files = [p.relative_to(folder).as_posix() for p in d.rglob("*") if p.is_file()] if d.is_dir() else []
        if any(f not in have for f in files):
            out.append(sub.strip("/"))
    return out


def exact_patterns(names: Iterable[str]) -> list[str]:
    """`allow_patterns` that match exactly these names and nothing else. Refuses a name that holds
    a glob character, since it would match more than itself."""
    out = []
    for name in names:
        if GLOB_CHARS.search(name):
            raise HubError(f"the file name {name!r} holds a glob character, so it can't be uploaded by exact name")
        out.append(name)
    return out


# ---------------------------------------------------------------------------------------------
# The repo, the shell and the client


def check_repo_id(repo: str | None) -> str:
    if not repo:
        raise HubError("CINDIA_HF_REPO isn't set: set it to the private model repo, <account>/cindia-embed")
    if not REPO_ID.match(repo):
        raise HubError(f"CINDIA_HF_REPO is {repo!r}, which isn't <account>/<name>")
    return repo


def repo_url(repo: str) -> str:
    return f"{HUB_URL}/{repo}"


def check_online() -> None:
    """Refuses when HF_HUB_OFFLINE is set, since huggingface_hub then blocks every call."""
    if (os.environ.get("HF_HUB_OFFLINE") or "").strip().lower() in _OFF:
        raise HubError("HF_HUB_OFFLINE is set in this shell, so nothing can reach the Hub: run it from a shell without it")


def bound_timeouts(read_s: float = READ_TIMEOUT_S, connect_s: float = CONNECT_TIMEOUT_S) -> bool:
    """Gives huggingface_hub's shared HTTP client a timeout (its default is none). True when set.
    Xet transfers run in hf_xet's own client, which retries and times out by itself."""
    try:
        import httpx2
        from huggingface_hub.utils import get_session

        get_session().timeout = httpx2.Timeout(read_s, connect=connect_s)
        return True
    except Exception:  # an older or newer client without these hooks keeps its own settings
        return False


def make_api(token: str | None) -> Any:
    """An HfApi with the token from server/config.py (None means huggingface_hub's own lookup)."""
    from huggingface_hub import HfApi

    bound_timeouts()
    return HfApi(token=token)


def resolve(repo: str, revision: str | None, token: str | None, timeout: float = INFO_TIMEOUT_S) -> str:
    """The commit hash `revision` (None for the newest, `main`) points to in `repo`. One call."""
    info = make_api(token).repo_info(repo, revision=revision, repo_type="model", timeout=timeout)
    sha = getattr(info, "sha", None)
    if not isinstance(sha, str) or not sha:
        raise HubError(f"the Hub didn't say which commit {repo} is at")
    return sha


def _status(exc: BaseException) -> int | None:
    response = getattr(exc, "response", None)
    status = getattr(response, "status_code", None)
    return status if isinstance(status, int) else None


def describe(exc: BaseException, repo: str, *, write: bool) -> str:
    """One plain line for a Hub error. It names the error's type and status, never its text."""
    if isinstance(exc, HubError):
        return str(exc)
    access = "write" if write else "read"
    try:
        from huggingface_hub import errors
    except Exception:  # pragma: no cover - huggingface_hub is in server/requirements.txt
        errors = None
    if errors is not None:
        if isinstance(exc, errors.OfflineModeIsEnabled):
            return "HF_HUB_OFFLINE is set in this shell, so nothing can reach the Hub: run it from a shell without it"
        if isinstance(exc, errors.RevisionNotFoundError):
            return f"{repo} has no such revision: pull this repo, or run it with --latest"
        if isinstance(exc, errors.RepositoryNotFoundError):
            return f"the Hub has no repo {repo} that HF_TOKEN can see: check CINDIA_HF_REPO, and that the token has {access} access to it"
        if isinstance(exc, errors.HfHubHTTPError):
            status = _status(exc)
            if status in (401, 403):
                return f"the Hub refused HF_TOKEN (status {status}): it needs {access} access to {repo}"
            return f"the Hub answered {status or 'an error'} ({type(exc).__name__})"
    return (
        f"couldn't reach huggingface.co ({type(exc).__name__}): check the network, and on a certificate "
        "error run it again with HF_HUB_DISABLE_XET=1"
    )
