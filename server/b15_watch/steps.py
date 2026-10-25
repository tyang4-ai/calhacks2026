"""A scan's IDs, its four agents' steps, the event envelope and the B13 bridge mirror.

- **IDs** (data-model.md, the ID scheme): `Ids(idTag, idStart)` hands out
  `<prefix>_user_<tag>_<n>` from the first number the browser reserved per prefix with
  `liveIdStart()`: 8 steps, 3 hits, 3 drafts and 3 approvals per scan. `idStart` is one number for
  every prefix or a number per prefix, and never runs past what was reserved.
- **Steps** are `swarm.step` payloads for `scout`, `comparer`, `claims` and `reporter` (the roster's
  agents), with `threadId` the scan's `scanId`. A summary is built only from counts, numbers and
  enum words, never from a listing's words: steps reach every open screen. English only (Gordon,
  Oct 24), so `zh` repeats `en`. `model` is set only on a step a Claude call made.
  B14's RunRecorder makes swarm-run summaries from its own phrase list and counts its runs as swarm
  runs, so a scan keeps its own small recorder with the same payload shape and the same bridge calls.
- **Events:** `evt_live_` plus `15`, the process start time in seconds modulo 1,000,000 as six
  digits, and a four-digit count from 0001 (D1-52). `source: "live"`, `key: "b15-watch"`, and `at`
  copied from the trigger or 0.
- **Bridge:** when B13's bridge is importable and available, a scan sets the `watch` process to
  `working` at its start and `done` at its end, and mirrors its run and steps. A bridge failure never
  reaches the scan.
"""

from __future__ import annotations

import itertools
import logging
import re
import threading
import time
from dataclasses import dataclass
from typing import Any, Optional, Union

from server import config
from server.b15_watch import KEY

log = logging.getLogger("cindia.b15")

TAG_RE = re.compile(r"^[a-z0-9]{4,12}$")
RESERVED: dict[str, int] = {"stp": 8, "cft": 3, "fup": 3, "apr": 3}
AGENTS = ("scout", "comparer", "claims", "reporter")
STEP_KINDS = ("route", "call", "tool", "result", "check", "handoff", "reply")
MODELS = {"claims": config.MODEL_FAST, "reporter": config.MODEL_DEFAULT}


class IdsExhausted(RuntimeError):
    """A scan asked for more IDs of a prefix than the browser reserved."""


class Ids:
    def __init__(self, tag: str, start: Union[int, dict[str, int], None]):
        if not isinstance(tag, str) or not TAG_RE.match(tag):
            raise ValueError("idTag must be 4 to 12 lowercase letters or digits.")
        self.tag = tag
        self._first: dict[str, int] = {}
        for prefix in RESERVED:
            first = start.get(prefix) if isinstance(start, dict) else start
            if first is None:
                first = 1
            if isinstance(first, bool) or not isinstance(first, int) or first < 1:
                raise ValueError("idStart must hold whole numbers from 1.")
            self._first[prefix] = first
        self._used = {p: 0 for p in RESERVED}
        self._lock = threading.Lock()

    def next(self, prefix: str) -> str:
        with self._lock:
            if prefix not in RESERVED or self._used[prefix] >= RESERVED[prefix]:
                raise IdsExhausted(f"no {prefix} IDs left")
            n = self._first[prefix] + self._used[prefix]
            self._used[prefix] += 1
        return f"{prefix}_user_{self.tag}_{n}"


@dataclass
class Step:
    """One step as the scan took it, before it has an ID."""

    agent_id: str
    kind: str
    summary: str
    ms: int = 0
    tool: Optional[str] = None
    model: Optional[str] = None


def step(agent_id: str, kind: str, summary: str, *, ms: int = 0, tool: Optional[str] = None, model_call: bool = False) -> Step:
    if agent_id not in AGENTS:
        raise ValueError(f"{agent_id} isn't one of the watch's agents")
    if kind not in STEP_KINDS:
        raise ValueError(f"unknown step kind {kind}")
    model = MODELS.get(agent_id) if model_call else None
    if model is not None and model not in config.ALLOWED_MODELS:
        raise ValueError("only the platform's two Claude models")
    return Step(agent_id, kind, summary, max(0, int(ms)), tool, model)


def step_payload(s: Step, *, run_id: str, scan_id: str, step_id: str) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "runId": run_id,
        "threadId": scan_id,
        "stepId": step_id,
        "agentId": s.agent_id,
        "kind": s.kind,
        "summary": {"en": s.summary, "zh": s.summary},
    }
    if s.tool:
        payload["toolName"] = s.tool
    payload["ms"] = s.ms
    if s.model:
        payload["model"] = s.model
    return payload


class Stopwatch:
    def __init__(self) -> None:
        self._t0 = time.monotonic()

    def ms(self) -> int:
        return max(0, int(round((time.monotonic() - self._t0) * 1000)))


# ---------------------------------------------------------------------------------------------
# The envelope

_PROCESS_START = int(time.time()) % 1_000_000
_numbers = itertools.count(1)
_numbers_lock = threading.Lock()


def event_id() -> str:
    with _numbers_lock:
        n = next(_numbers)
    return f"evt_live_15{_PROCESS_START:06d}{n:04d}"


def trigger_at(trigger: Any) -> float:
    at = trigger.get("at", 0) if isinstance(trigger, dict) else 0
    if isinstance(at, bool) or not isinstance(at, (int, float)) or at < 0:
        return 0
    return at


def envelope(type_: str, payload: dict[str, Any], at: float) -> dict[str, Any]:
    return {"id": event_id(), "type": type_, "at": at, "source": "live", "key": KEY, "payload": payload}


# ---------------------------------------------------------------------------------------------
# The B13 bridge (optional)

_DEFAULT = object()
BRIDGE: Any = _DEFAULT  # tests set a fake, or None for no bridge


def bridge() -> Any:
    if BRIDGE is not _DEFAULT:
        return BRIDGE
    try:
        from server.b13_spacetime import bridge as b13
    except Exception:
        return None
    return b13


def _call(name: str, *args: Any) -> None:
    b = bridge()
    if b is None:
        return
    try:
        if not b.available():
            return
        getattr(b, name)(*args)
    except Exception as exc:  # the bridge never breaks a scan
        log.info("b15 bridge %s failed (%s)", name, type(exc).__name__)


def process(status: str, count: int) -> None:
    _call("set_process", "watch", status, count)


def mirror(run_id: str, scan_id: str, payloads: list[dict[str, Any]]) -> None:
    """Mirrors a finished scan's run and steps to B13 (seller side)."""
    b = bridge()
    if b is None:
        return
    try:
        if not b.available():
            return
        b.start_run(run_id, scan_id, "seller")
        for p in payloads:
            b.add_step(dict(p))
        b.finish_run(run_id)
    except Exception as exc:
        log.info("b15 bridge mirror failed (%s)", type(exc).__name__)
