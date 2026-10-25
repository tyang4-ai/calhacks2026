"""Whether the local services the v2 upgrades lean on are there. Never raises, never logs a value.

- spacetime_reachable(): any HTTP answer from SPACETIME_URL within 300 ms, cached for 10 seconds.
- model_present(): MODEL_DIR exists and holds modules.json (a saved sentence-transformers model).

GET /api/health reports both under `services`. tests/server/conftest.py's needs_service() skips a
test when one is missing.
"""

from __future__ import annotations

import threading
import time
from pathlib import Path
from urllib.parse import urlsplit

import httpx

from server import config

SPACETIME_TIMEOUT_S = 0.3
SPACETIME_CACHE_S = 10.0

_LOOPBACK = {"127.0.0.1", "localhost", "::1"}
_lock = threading.Lock()
_cache: dict[str, tuple[float, bool]] = {}


def _probe(url: str) -> bool:
    try:
        host = urlsplit(url).hostname or ""
        # A loopback address never goes through the outbound proxy.
        with httpx.Client(timeout=SPACETIME_TIMEOUT_S, trust_env=host not in _LOOPBACK) as client:
            client.get(url)
        return True
    except Exception:
        return False


def spacetime_reachable() -> bool:
    """True when SPACETIME_URL gives any HTTP answer within 300 ms. Cached for 10 seconds per URL."""
    url = config.SPACETIME_URL
    if not url:
        return False
    now = time.monotonic()
    with _lock:
        hit = _cache.get(url)
        if hit and now - hit[0] < SPACETIME_CACHE_S:
            return hit[1]
    ok = _probe(url)
    with _lock:
        _cache[url] = (time.monotonic(), ok)
    return ok


def model_present() -> bool:
    """True when MODEL_DIR exists and holds modules.json."""
    try:
        return (Path(config.MODEL_DIR) / "modules.json").is_file()
    except Exception:
        return False


def clear_cache() -> None:
    """Forgets the cached SpacetimeDB answer (for tests)."""
    with _lock:
        _cache.clear()
