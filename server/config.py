"""Server configuration. Reads the process environment first, then .env at the repo root.

The only module that reads keys. Never print, log or return a key value: use has_key() to say
whether one is set, and the *_headers() helpers to build an outside service's auth header.

The names (docs/v2/contracts.md section 1, conventions.md):
- ANTHROPIC_API_KEY comes from CINDIA_ANTHROPIC_API_KEY, falling back to ANTHROPIC_API_KEY.
- NESSIE_KEY, ELASTIC_URL, KIBANA_URL, ELASTIC_API_KEY, ELASTIC_AUTH, APIFY_TOKEN, APIFY_AUTH,
  HF_TOKEN, SPACETIME_URL, SPACETIME_DB, SPACETIME_TOKEN and PUBLIC_SITE_URL as they are.
- HF_REPO comes from CINDIA_HF_REPO, MODEL_DIR from CINDIA_MODEL_DIR.
- ELASTIC_AUTH=proxy and APIFY_AUTH=proxy mean a cloud network secret attaches the key, so the
  server sends no auth header of its own and the key counts as set.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent

# Loaded once, at import, without overriding the process environment. A missing .env is fine.
load_dotenv(REPO_ROOT / ".env", override=False)


def _env(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _auth_flag(name: str) -> str | None:
    value = _env(name)
    return value.lower() if value else None


# Keys and tokens (secret).
ANTHROPIC_API_KEY: str | None = _env("CINDIA_ANTHROPIC_API_KEY") or _env("ANTHROPIC_API_KEY")
NESSIE_KEY: str | None = _env("NESSIE_KEY")
ELASTIC_API_KEY: str | None = _env("ELASTIC_API_KEY")
APIFY_TOKEN: str | None = _env("APIFY_TOKEN")
HF_TOKEN: str | None = _env("HF_TOKEN")
SPACETIME_TOKEN: str | None = _env("SPACETIME_TOKEN")

# Proxy-mode flags: "proxy" when a cloud network secret attaches the key, otherwise None.
ELASTIC_AUTH: str | None = _auth_flag("ELASTIC_AUTH")
APIFY_AUTH: str | None = _auth_flag("APIFY_AUTH")

# Not secret.
ELASTIC_URL: str | None = _env("ELASTIC_URL")
KIBANA_URL: str | None = _env("KIBANA_URL")
HF_REPO: str | None = _env("CINDIA_HF_REPO")
SPACETIME_URL: str = _env("SPACETIME_URL") or "http://127.0.0.1:3000"
SPACETIME_DB: str = _env("SPACETIME_DB") or "cindia"
PUBLIC_SITE_URL: str | None = _env("PUBLIC_SITE_URL")
MODEL_DIR: Path = Path(_env("CINDIA_MODEL_DIR") or (REPO_ROOT / "models" / "cindia-embed-v1"))
if not MODEL_DIR.is_absolute():
    MODEL_DIR = REPO_ROOT / MODEL_DIR

# The only Claude models the platform uses (fix-plan 1.4). A self-test fails on any other ID.
MODEL_DEFAULT = "claude-sonnet-5-5"
MODEL_FAST = "claude-haiku-5-5"
ALLOWED_MODELS: frozenset[str] = frozenset({MODEL_DEFAULT, MODEL_FAST})

# A constant, never read from the environment. Every v2 Claude client passes it as base_url.
CLAUDE_BASE_URL = "https://api.anthropic.com"

VERSION = "0.1.0"

# Built files (B06 workbooks) go here. Not committed.
FILES_DIR = REPO_ROOT / "artifacts" / "files"

# Every attribute above that holds a secret. The test fixture swaps each for a fake value.
KEY_ATTRS: tuple[str, ...] = (
    "ANTHROPIC_API_KEY",
    "NESSIE_KEY",
    "ELASTIC_API_KEY",
    "APIFY_TOKEN",
    "HF_TOKEN",
    "SPACETIME_TOKEN",
)
AUTH_ATTRS: tuple[str, ...] = ("ELASTIC_AUTH", "APIFY_AUTH")

# has_key() accepts the variable names and the short names /api/health reports.
_ALIASES = {
    "CINDIA_ANTHROPIC_API_KEY": "ANTHROPIC_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "nessie": "NESSIE_KEY",
    "elastic": "ELASTIC_API_KEY",
    "apify": "APIFY_TOKEN",
    "hf": "HF_TOKEN",
    "spacetime": "SPACETIME_TOKEN",
}


def _is_proxy(flag: str | None) -> bool:
    return flag == "proxy"


def has_key(name: str) -> bool:
    """Whether a key is set. Reads this module's resolved values at call time, never os.environ.

    ELASTIC_API_KEY counts with a key or ELASTIC_AUTH=proxy, and only when ELASTIC_URL is set too.
    APIFY_TOKEN counts with a token or APIFY_AUTH=proxy. Never returns or logs a value.
    """
    attr = _ALIASES.get(name, name)
    g = globals()
    if attr == "ELASTIC_API_KEY":
        return bool(g.get("ELASTIC_URL")) and (bool(g.get("ELASTIC_API_KEY")) or _is_proxy(g.get("ELASTIC_AUTH")))
    if attr == "APIFY_TOKEN":
        return bool(g.get("APIFY_TOKEN")) or _is_proxy(g.get("APIFY_AUTH"))
    if attr.startswith("_") or not attr.isupper():
        return False
    return bool(g.get(attr))


def elastic_headers() -> dict[str, str]:
    """Elastic's auth header, or {} in proxy mode or with no key."""
    if _is_proxy(ELASTIC_AUTH) or not ELASTIC_API_KEY:
        return {}
    return {"Authorization": f"ApiKey {ELASTIC_API_KEY}"}


def apify_headers() -> dict[str, str]:
    """Apify's auth header, or {} in proxy mode or with no token."""
    if _is_proxy(APIFY_AUTH) or not APIFY_TOKEN:
        return {}
    return {"Authorization": f"Bearer {APIFY_TOKEN}"}


def spacetime_headers() -> dict[str, str]:
    """The SpacetimeDB publisher's auth header, or {} with no token."""
    if not SPACETIME_TOKEN:
        return {}
    return {"Authorization": f"Bearer {SPACETIME_TOKEN}"}
