"""B15's numbers in one place (docs/plans/B15-watch.md, Thresholds).

- SIMILARITY_MIN: a listing at or above this text match gets the Claims agent's model check. It is
  measured, not guessed: `python server/b15_watch/calibrate.py` scores
  `tests/server/b15_threshold_fixture.json` with B11's trained model and writes `threshold.json`
  `{ fingerprint, threshold, precision, recall, n }`. When that file is missing, or its fingerprint
  isn't the model's, the threshold is SIMILARITY_DEFAULT (0.75) and every step and note says
  "not measured". `similarity_min()` reads it at call time, so a new model or a new file counts at
  once; `SIMILARITY_MIN` reads the same.
- The crawl: MAX_PAGES pages at MAX_DEPTH links from the market's index, APIFY_RUN_TIMEOUT_S passed
  to Apify as the run's own timeout, inside APIFY_BUDGET_S on our side.
- The scan: TOTAL_BUDGET_S from its start to its events (the adapter aborts at 59.5 seconds).
- Claims: at most CLAIMS_MAX model calls per scan, CLAIMS_TIMEOUT_S each, side by side.
- Hits: at most MAX_HITS possible copies get a report per scan.
- Web text: titles and snippets cut to TEXT_CAP characters, the page's text to PAGE_TEXT_CAP.
- Story runs: STORY_RUN_WORDS words in a row from a piece's story count as repeating it.
- Cache: a scan of the same maker within CACHE_S reuses the crawl and the checks with fresh IDs.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any, Optional

HERE = Path(__file__).resolve().parent
THRESHOLD_PATH = HERE / "threshold.json"

SIMILARITY_DEFAULT = 0.75

MAX_PAGES = 30
MAX_DEPTH = 1
MAX_HITS = 3
CLAIMS_MAX = 10
CLAIMS_TIMEOUT_S = 5.0
TEXT_CAP = 300
PAGE_TEXT_CAP = 2000
URL_CAP = 500
STORY_RUN_WORDS = 8
APIFY_BUDGET_S = 45.0
APIFY_RUN_TIMEOUT_S = 40
TOTAL_BUDGET_S = 58.0
CACHE_S = 1800.0

# The Reporter's one call per hit, and the draft's length per language.
REPORTER_TIMEOUT_S = 5.0
DRAFT_CAP = 1200
# How long the Comparer waits for B11's model to finish warming (it starts at the scan's start),
# and for B11's encode lock.
MODEL_WAIT_S = 3.0
ENCODE_WAIT_S = 2.0
# Time kept back for the Reporter and the events when the Claims calls are timed.
REPORTER_RESERVE_S = 6.0
# A call with less time than this left isn't sent.
MIN_CALL_S = 0.5

# The poll answers from memory. Finished scans are kept this long, at most SCANS_KEPT of them.
SCAN_KEEP_S = 1800.0
SCANS_KEPT = 200

_lock = threading.Lock()
_cache: dict[str, Any] = {"key": None, "value": None}


def _read_file() -> Optional[dict[str, Any]]:
    """threshold.json as a dict, read again only when its size or time changes."""
    try:
        st = THRESHOLD_PATH.stat()
    except OSError:
        return None
    key = (str(THRESHOLD_PATH), st.st_size, st.st_mtime_ns)
    with _lock:
        if _cache["key"] == key:
            return _cache["value"]
    try:
        value = json.loads(THRESHOLD_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        value = None
    if not isinstance(value, dict):
        value = None
    with _lock:
        _cache["key"], _cache["value"] = key, value
    return value


def model_fingerprint() -> Optional[str]:
    """B11's report.json fingerprint, or None (B11 is optional at run time)."""
    try:
        from server.b11_embed import model as b11model
    except Exception:
        return None
    try:
        return b11model.fingerprint()
    except Exception:
        return None


def measured_file() -> Optional[dict[str, Any]]:
    """threshold.json when it holds a threshold from 0 to 1 and the model's fingerprint, else None."""
    data = _read_file()
    if not data:
        return None
    t = data.get("threshold")
    fp = data.get("fingerprint")
    if isinstance(t, bool) or not isinstance(t, (int, float)) or not 0.0 <= float(t) <= 1.0:
        return None
    if not isinstance(fp, str) or not fp:
        return None
    if fp != model_fingerprint():
        return None
    return data


def similarity_min() -> tuple[float, bool]:
    """(the threshold, whether it was measured for the model on disk)."""
    data = measured_file()
    if data is None:
        return SIMILARITY_DEFAULT, False
    return float(data["threshold"]), True


def __getattr__(name: str) -> Any:
    if name == "SIMILARITY_MIN":
        return similarity_min()[0]
    raise AttributeError(name)
