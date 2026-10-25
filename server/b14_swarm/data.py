"""The mock data B14 reads besides the request: `contentRules`, and the catalog words the content check
derives from it (api-contract.md: "B14 and B15 read `contentRules` from it").

- `mock()` returns `artifacts/mock/mock.json` (written by `npm run export:mock`) when it exists,
  otherwise B11's committed snapshot `server/b11_embed/data/mock.json`, which holds `contentRules`,
  the pieces and the communities. Each file is read once as UTF-8 and read again only when its
  modification time changes. With neither file it returns {}.
- `use(data)` makes every caller see `data` instead (tests), and `use(None)` undoes it.

Every line of the data is fictional demo data from src/mock/.
"""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = REPO_ROOT / "artifacts" / "mock" / "mock.json"
SNAPSHOT = REPO_ROOT / "server" / "b11_embed" / "data" / "mock.json"

log = logging.getLogger("cindia.b14")

_lock = threading.Lock()
_override: Optional[dict[str, Any]] = None
_cache: dict[Path, tuple[float, dict[str, Any]]] = {}


def use(data: Optional[dict[str, Any]]) -> None:
    """Every later mock() call returns `data` (None goes back to the files)."""
    global _override
    with _lock:
        _override = data


def _read(path: Path) -> Optional[dict[str, Any]]:
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return None
    with _lock:
        hit = _cache.get(path)
        if hit and hit[0] == mtime:
            return hit[1]
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        log.info("b14 data: %s can't be read (%s)", path.name, type(exc).__name__)
        return None
    if not isinstance(value, dict):
        return None
    with _lock:
        _cache[path] = (mtime, value)
    return value


def mock() -> dict[str, Any]:
    """The mock dataset as a dict, the artifact first, then B11's snapshot, else {}."""
    with _lock:
        if _override is not None:
            return _override
    for path in (ARTIFACT, SNAPSHOT):
        value = _read(path)
        if value is not None:
            return value
    return {}
