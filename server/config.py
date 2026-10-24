"""Server configuration. Loads .env from the repo root once.

The only module that reads keys. Never print, log or return a key value: use has_key() to say
whether one is set.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent

# Loaded once, at import. A missing .env is fine: Phase 1 runs without keys.
load_dotenv(REPO_ROOT / ".env", override=False)

ANTHROPIC_API_KEY: str | None = os.environ.get("ANTHROPIC_API_KEY") or None
NESSIE_KEY: str | None = os.environ.get("NESSIE_KEY") or None

MODEL_DEFAULT = "claude-sonnet-5-5"
MODEL_FAST = "claude-haiku-5-5"

VERSION = "0.1.0"

# Built files (B06 workbooks) go here. Not committed.
FILES_DIR = REPO_ROOT / "artifacts" / "files"


def has_key(name: str) -> bool:
    """Whether a key is set. Never returns its value."""
    if name == "ANTHROPIC_API_KEY":
        return bool(ANTHROPIC_API_KEY)
    if name == "NESSIE_KEY":
        return bool(NESSIE_KEY)
    return bool(os.environ.get(name))
