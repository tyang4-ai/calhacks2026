"""The B13 bridge: every call the server makes to SpacetimeDB (docs/plans/B13-live.md, "Bridge").

Other upgrades import it inside their functions:

    from server.b13_spacetime import bridge
    if bridge.available():
        bridge.start_run(run_id, thread_id, "buyer")

- Each call is one HTTP request to `config.SPACETIME_URL`: `POST /v1/database/<db>/call/<reducer>`
  with a JSON array of the reducer's arguments in order, or `POST /v1/database/<db>/sql` with the
  query text. The only auth header is `config.spacetime_headers()`, the owner's token. The bridge
  never builds one itself, never falls back to an anonymous identity, and never prints, logs or
  returns the token or the URL.
- Every request has a 0.8-second timeout. The seed alone gets 5 seconds, inside its endpoint's 10.
- Calls from a swarm run or a scan (`start_run`, `add_step`, `finish_run`, `set_process`, and the
  router's `touch_screen`) go through one ordered background thread, so a run never waits on
  SpacetimeDB and its steps land in order. `record`, `seed_catalog`, `expire_screens` and `sql`
  answer the caller directly.
- When SpacetimeDB doesn't answer, the call is a no-op that logs one line, and the bridge stops
  trying for 30 seconds. Without `SPACETIME_TOKEN` it is unavailable and says so once.
- `available()` says whether the last call worked. The feed's polls (`poll_sql`) keep it fresh and
  end a back-off early once SpacetimeDB answers again.
"""

from __future__ import annotations

import json
import logging
import queue
import threading
import time
from typing import Any, Optional
from urllib.parse import quote, urlsplit

import httpx

from server import config

log = logging.getLogger("cindia")

TIMEOUT_S = 0.8
SEED_TIMEOUT_S = 5.0
BACKOFF_S = 30.0
QUEUE_MAX = 5000
TEXT_MAX = 160
U32_MAX = 2**32 - 1
# A refused call (bad arguments) logs at most one line per reducer in this long.
REFUSED_LOG_S = 30.0

_LOOPBACK = {"127.0.0.1", "localhost", "::1"}

# Test seams: an httpx transport (MockTransport in the tests) and the clock.
_transport: Optional[httpx.BaseTransport] = None
_now = time.monotonic

_lock = threading.Lock()
_client: Optional[httpx.Client] = None
_client_for: Optional[tuple[str, int]] = None
_down_until = 0.0
_last_ok: Optional[bool] = None
_said_no_token = False
_said_full = False
_refused_logged: dict[str, float] = {}

_STOP = object()
_queue: "queue.Queue[Any]" = queue.Queue(maxsize=QUEUE_MAX)
_worker: Optional[threading.Thread] = None


# ---------------------------------------------------------------------------------------------
# State


def has_token() -> bool:
    """Whether SPACETIME_TOKEN is set. Never reads or returns the value."""
    return bool(config.SPACETIME_TOKEN)


def available() -> bool:
    """True when the token is set, no back-off is running and the last call worked (or none ran yet)."""
    if not has_token():
        return False
    with _lock:
        if _now() < _down_until:
            return False
        return _last_ok is not False


def backing_off() -> bool:
    with _lock:
        return _now() < _down_until


def reset() -> None:
    """Forgets every state, stops the worker and closes the client (for tests)."""
    global _client, _client_for, _down_until, _last_ok, _said_no_token, _said_full, _queue, _worker
    with _lock:
        old_queue, old_worker = _queue, _worker
        _queue = queue.Queue(maxsize=QUEUE_MAX)
        _worker = None
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
        _client = None
        _client_for = None
        _down_until = 0.0
        _last_ok = None
        _said_no_token = False
        _said_full = False
        _refused_logged.clear()
    if old_worker is not None:
        try:
            old_queue.put_nowait(_STOP)
        except queue.Full:
            pass


def _say_no_token() -> None:
    global _said_no_token
    with _lock:
        if _said_no_token:
            return
        _said_no_token = True
    log.info("b13 bridge: SPACETIME_TOKEN isn't set, so the bridge is off (no anonymous fallback)")


def _went_down(reason: str) -> None:
    """Starts the 30-second back-off. Logs one line when SpacetimeDB was up before."""
    global _down_until, _last_ok
    with _lock:
        was_up = _now() >= _down_until
        _down_until = _now() + BACKOFF_S
        _last_ok = False
    if was_up:
        log.info("b13 bridge: SpacetimeDB didn't answer (%s), pausing calls for %d s", reason, int(BACKOFF_S))


def _worked() -> None:
    global _down_until, _last_ok
    with _lock:
        was_down = _last_ok is False
        _down_until = 0.0
        _last_ok = True
    if was_down:
        log.info("b13 bridge: SpacetimeDB answers again")


def _refused(what: str, status: int) -> None:
    """SpacetimeDB answered but refused this one call (bad arguments). No back-off."""
    global _last_ok
    with _lock:
        _last_ok = True
        last = _refused_logged.get(what)
        if last is not None and _now() - last < REFUSED_LOG_S:
            return
        _refused_logged[what] = _now()
    log.info("b13 bridge: %s was refused (HTTP %d)", what, status)


# ---------------------------------------------------------------------------------------------
# HTTP


def _http() -> httpx.Client:
    """One client per URL and transport. A loopback URL never goes through the outbound proxy."""
    global _client, _client_for
    url = config.SPACETIME_URL
    key = (url, id(_transport))
    with _lock:
        if _client is not None and _client_for == key:
            return _client
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
        host = urlsplit(url).hostname or ""
        kwargs: dict[str, Any] = {"base_url": url, "timeout": TIMEOUT_S, "trust_env": host not in _LOOPBACK}
        if _transport is not None:
            kwargs["transport"] = _transport
        _client = httpx.Client(**kwargs)
        _client_for = key
        return _client


def _db_path(tail: str) -> str:
    return f"/v1/database/{quote(config.SPACETIME_DB, safe='')}/{tail}"


def _send(what: str, path: str, *, body: Any = None, text: Optional[str] = None, timeout: float = TIMEOUT_S,
          respect_backoff: bool = True) -> Optional[httpx.Response]:
    """One request with the owner's header. None when skipped, down or refused. Never raises."""
    if not has_token():
        _say_no_token()
        return None
    if respect_backoff and backing_off():
        return None
    headers = dict(config.spacetime_headers())
    if not headers:
        _say_no_token()
        return None
    try:
        client = _http()
        if text is not None:
            headers["Content-Type"] = "text/plain; charset=utf-8"
            resp = client.post(path, content=text.encode("utf-8"), headers=headers, timeout=timeout)
        else:
            resp = client.post(path, json=body, headers=headers, timeout=timeout)
    except Exception as exc:  # timeouts, refused connections, anything else: a no-op
        _went_down(type(exc).__name__)
        return None
    status = resp.status_code
    if 200 <= status < 300:
        _worked()
        return resp
    # A bad token, a missing database or a caller that isn't the owner: nothing will work, so back off.
    if status in (401, 403, 404) or (status == 530 and resp.text.startswith("not_owner")):
        _went_down(f"HTTP {status}")
        return None
    if status in (400, 530):
        _refused(what, status)
        return None
    _went_down(f"HTTP {status}")
    return None


def call(reducer: str, args: list[Any], *, timeout: float = TIMEOUT_S) -> bool:
    """Calls one reducer now. True when SpacetimeDB accepted it."""
    return _send(reducer, _db_path(f"call/{quote(reducer, safe='')}"), body=args, timeout=timeout) is not None


def _rows(resp: httpx.Response) -> list[dict[str, Any]]:
    """The first statement's rows as dicts, named from its schema."""
    data = resp.json()
    if not isinstance(data, list) or not data:
        return []
    first = data[0] if isinstance(data[0], dict) else {}
    names: list[str] = []
    for el in ((first.get("schema") or {}).get("elements") or []):
        name = el.get("name") if isinstance(el, dict) else None
        if isinstance(name, dict):
            name = name.get("some", next(iter(name.values()), None)) if name else None
        names.append(name if isinstance(name, str) else f"col{len(names)}")
    out: list[dict[str, Any]] = []
    for row in first.get("rows") or []:
        if isinstance(row, dict):
            out.append(dict(row))
        elif isinstance(row, list):
            out.append({names[i] if i < len(names) else f"col{i}": v for i, v in enumerate(row)})
    return out


def sql(query: str) -> list[dict[str, Any]]:
    """Runs one SQL query as the owner. Each row is a dict by column name. [] when it fails."""
    resp = _send("sql", _db_path("sql"), text=query)
    if resp is None:
        return []
    try:
        return _rows(resp)
    except Exception:
        return []


def poll_sql(query: str) -> Optional[list[dict[str, Any]]]:
    """The feed's SQL: ignores the back-off (the feed retries every 2 s itself). None when it fails."""
    resp = _send("sql", _db_path("sql"), text=query, respect_backoff=False)
    if resp is None:
        return None
    try:
        return _rows(resp)
    except Exception:
        _went_down("unreadable SQL answer")
        return None


# ---------------------------------------------------------------------------------------------
# The ordered background queue


def _run_worker(q: "queue.Queue[Any]") -> None:
    while True:
        item = q.get()
        try:
            if item is _STOP:
                return
            reducer, args = item
            call(reducer, args)
        except Exception as exc:
            log.info("b13 bridge: queued call failed (%s)", type(exc).__name__)
        finally:
            q.task_done()


def _enqueue(reducer: str, args: list[Any]) -> bool:
    """Queues one reducer call behind the others. False when the bridge is off or backing off."""
    global _worker, _said_full
    if not has_token():
        _say_no_token()
        return False
    if backing_off():
        return False
    with _lock:
        q = _queue
        if _worker is None or not _worker.is_alive():
            _worker = threading.Thread(target=_run_worker, args=(q,), name="b13-bridge", daemon=True)
            _worker.start()
    try:
        q.put_nowait((reducer, args))
    except queue.Full:
        with _lock:
            said, _said_full = _said_full, True
        if not said:
            log.info("b13 bridge: the queue is full, dropping calls until it drains")
        return False
    return True


def flush(timeout_s: float = 2.0) -> bool:
    """Waits until every queued call has run. True when the queue drained in time."""
    deadline = time.monotonic() + timeout_s
    with _lock:
        q = _queue
    while q.unfinished_tasks > 0:
        if time.monotonic() >= deadline:
            return False
        time.sleep(0.005)
    return True


# ---------------------------------------------------------------------------------------------
# The calls


def _clip(value: Any) -> str:
    text = value if isinstance(value, str) else ""
    return text[:TEXT_MAX]


def step_args(payload: dict[str, Any]) -> Optional[list[Any]]:
    """A `swarm.step` payload as add_step's ten arguments, in order. None when it isn't one."""
    if not isinstance(payload, dict):
        return None
    ids = [payload.get(k) for k in ("runId", "stepId", "threadId", "agentId", "kind")]
    if not all(isinstance(v, str) and v for v in ids):
        return None
    summary = payload.get("summary") if isinstance(payload.get("summary"), dict) else {}
    try:
        ms = int(round(float(payload.get("ms") or 0)))
    except (TypeError, ValueError):
        ms = 0
    ms = max(0, min(U32_MAX, ms))
    tool = payload.get("toolName")
    model = payload.get("model")
    return [
        ids[0], ids[1], ids[2], ids[3], ids[4],
        _clip(summary.get("en")), _clip(summary.get("zh")),
        tool if isinstance(tool, str) else "",
        ms,
        model if isinstance(model, str) else "",
    ]


def start_run(run_id: str, thread_id: str, side: str) -> bool:
    """Queues start_run. A run ID the database holds starts over (its old steps go)."""
    return _enqueue("start_run", [run_id, thread_id, side])


def add_step(payload: dict[str, Any]) -> bool:
    """Queues add_step from a `swarm.step` payload dict."""
    args = step_args(payload)
    if args is None:
        return False
    return _enqueue("add_step", args)


def finish_run(run_id: str) -> bool:
    return _enqueue("finish_run", [run_id])


def set_process(process_id: str, status: str, count: int = 0) -> bool:
    """Queues one process row's status (`working` or `done`) and count (C-4)."""
    try:
        n = max(0, min(U32_MAX, int(count)))
    except (TypeError, ValueError):
        n = 0
    return _enqueue("set_process", [process_id, status, n])


def touch_screen(screen_id: str, role: str) -> bool:
    """Queues a screen's presence refresh."""
    return _enqueue("touch_screen", [screen_id, role])


def expire_screens(older_than_ms: int) -> bool:
    """Deletes the screens not seen in that long. Answers directly (the feed's thread calls it)."""
    return call("expire_screens", [int(older_than_ms)])


def record(events: list[dict[str, Any]]) -> bool:
    """Applies up to 50 mirrored Cindia events through the `record` reducer. True when accepted."""
    return call("record", [json.dumps(events, ensure_ascii=False, separators=(",", ":"))])


def seed_catalog(payload: dict[str, Any]) -> bool:
    """Upserts the catalog, the scripted orders and the scripted approvals. True when accepted."""
    return call("seed_catalog", [json.dumps(payload, ensure_ascii=False, separators=(",", ":"))], timeout=SEED_TIMEOUT_S)
