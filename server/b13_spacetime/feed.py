"""The B13 feed: one poller per server process and its snapshot (docs/plans/B13-live.md, "Feed").

- Every 500 ms it runs `SELECT * FROM changes WHERE seq > <last>` through the bridge and sorts the
  rows by `seq` in Python, since the SQL has no ORDER BY.
- When there are changes it re-reads only the tables they touch (all small, and `steps` only from
  its newest row on unless a step was deleted) and updates the snapshot: each table's rows, the
  process rows, the screens seen in the last 15 seconds, and a ring of the newest 500 steps.
- `screens` is re-read every 2 seconds too, because a presence refresh isn't logged as a change.
- Every 10 seconds it calls `expire_screens(15000)` and checks the database's epoch. A new epoch
  (a publish that deleted the data) starts the snapshot over.
- When SpacetimeDB is down it keeps the last snapshot, marks itself not ok, and retries every 2 s.

The router answers `/api/b13/changes` and `/api/b13/status` from it, never from SpacetimeDB directly.

Events (key `b13-live`, `source: "live"`, `at` 0):
- `swarm.step`, one per `steps` row, mapped field for field. An empty `tool_name` or `model` is left out.
- `data.synced`: `{ tables: { table, rows, newest: { id, label }[] }[], screens, processes }`. Labels
  are built by code from the row's kind, state, status, amount or the catalog's own title, never a
  person's words.
- IDs are `evt_live_` + `131` (a step) or `132` (a `data.synced`) + the epoch modulo 1,000,000 (six
  digits) + the change's `seq` (nine digits), so a resent row keeps its ID.

A step's change and its row are paired in order: the reducers run one at a time, so the k-th logged
insert of a step ID belongs to the k-th row with that ID, and rows newer than the changes read wait
for the next poll.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Callable, Optional

from server.b13_spacetime import bridge

KEY = "b13-live"
WATCHED: tuple[str, ...] = ("catalog", "listings", "orders", "approvals", "runs", "steps", "processes", "screens")
ID_COLUMN = {
    "catalog": "piece_id",
    "listings": "listing_id",
    "orders": "order_id",
    "approvals": "approval_id",
    "runs": "run_id",
    "steps": "step_id",
    "processes": "process_id",
    "screens": "screen_id",
}
# events.md ProcessId and B13's process statuses.
PROCESS_IDS = ("search", "swarm", "checkout", "money", "reconcile", "approvals", "close", "proof", "watch", "model", "data")
PROCESS_STATUSES = ("working", "done")
CATALOG_SEEDED = 54

POLL_S = 0.5
RETRY_S = 2.0
SCREENS_REFRESH_S = 2.0
MAINTAIN_S = 10.0
SCREEN_WINDOW_MS = 15_000
RING_MAX = 500
NEWEST = 3
# A first poll replays only runs still going (and active in the last 10 minutes) or finished in the last minute.
REPLAY_FINISHED_MS = 60_000
REPLAY_RUNNING_MS = 10 * 60_000
LABEL_MAX = 60

STEP_PREFIX = "131"
SYNC_PREFIX = "132"

SqlFn = Callable[[str], Optional[list[dict[str, Any]]]]


@dataclass(frozen=True)
class StepEntry:
    change_seq: int
    row_seq: int
    row: dict[str, Any]


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _str(value: Any) -> str:
    return value if isinstance(value, str) else ""


def _money(cents: Any) -> str:
    n = _int(cents)
    return f"${n // 100:,}.{n % 100:02d}"


def label_for(table: str, row: dict[str, Any]) -> str:
    """A short label from the row's own fields: kind, state, status, amount or the catalog title."""
    if table == "catalog":
        text = _str(row.get("title_en")) or "published piece"
    elif table == "listings":
        text = _str(row.get("state")) or "listing"
    elif table == "orders":
        text = f"{_str(row.get('origin')) or 'mock'} · {_money(row.get('gross_cents'))}"
    elif table == "approvals":
        parts = [_str(row.get("kind")) or "approval"]
        if _int(row.get("amount_cents")) > 0:
            parts.append(_money(row.get("amount_cents")))
        parts.append(_str(row.get("status")) or "pending")
        text = " · ".join(parts)
    elif table == "runs":
        text = f"{_str(row.get('side'))} · {'done' if row.get('finished') is True else 'running'}"
    elif table == "steps":
        text = f"{_str(row.get('agent_id'))} · {_str(row.get('kind'))}"
    elif table == "processes":
        text = f"{_str(row.get('status'))} · {_int(row.get('count'))}"
    elif table == "screens":
        text = _str(row.get("role")) or "screen"
    else:
        text = ""
    return text[:LABEL_MAX]


def event_id(prefix: str, epoch: int, seq: int) -> str:
    return f"evt_live_{prefix}{epoch % 1_000_000:06d}{seq % 1_000_000_000:09d}"


def step_payload(row: dict[str, Any]) -> dict[str, Any]:
    """A `steps` row as a `swarm.step` payload, field for field. Empty tool and model are left out."""
    payload: dict[str, Any] = {
        "runId": _str(row.get("run_id")),
        "threadId": _str(row.get("thread_id")),
        "stepId": _str(row.get("step_id")),
        "agentId": _str(row.get("agent_id")),
        "kind": _str(row.get("kind")),
        "summary": {"en": _str(row.get("summary_en")), "zh": _str(row.get("summary_zh"))},
    }
    tool = _str(row.get("tool_name"))
    if tool:
        payload["toolName"] = tool
    payload["ms"] = max(0, _int(row.get("ms")))
    model = _str(row.get("model"))
    if model:
        payload["model"] = model
    return payload


class Feed:
    """The poller and its snapshot. `sql` returns rows as dicts, or None when the read failed."""

    def __init__(
        self,
        sql: Optional[SqlFn] = None,
        expire: Optional[Callable[[int], bool]] = None,
        wall_ms: Optional[Callable[[], int]] = None,
        clock: Optional[Callable[[], float]] = None,
    ):
        self._sql: SqlFn = sql or bridge.poll_sql
        self._expire = expire or bridge.expire_screens
        self._wall_ms = wall_ms or (lambda: int(time.time() * 1000))
        self._clock = clock or time.monotonic
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._first_done = threading.Event()
        self._clear()
        self.ok = False
        self._next_screens = 0.0
        self._next_maintain = 0.0

    def _clear(self) -> None:
        self.epoch: Optional[int] = None
        self.loaded = False
        self.last_seq = 0
        self.rows: dict[str, dict[int, dict[str, Any]]] = {t: {} for t in WATCHED}
        self.ring: deque[StepEntry] = deque(maxlen=RING_MAX)
        self.paired_row_seq = 0
        self.run_activity: dict[str, int] = {}

    # -----------------------------------------------------------------------------------------
    # Polling

    def poll_once(self) -> bool:
        """One poll. True when SpacetimeDB answered every read. Never raises."""
        try:
            ok = self._poll()
        except Exception:
            ok = False
        self.ok = ok
        self._first_done.set()
        return ok

    def _read(self, query: str) -> Optional[list[dict[str, Any]]]:
        rows = self._sql(query)
        return rows if isinstance(rows, list) else None

    def _poll(self) -> bool:
        now = self._clock()
        maintain = now >= self._next_maintain
        if self.epoch is None or maintain:
            config_rows = self._read("SELECT * FROM config")
            if config_rows is None:
                return False
            epochs = [_int(r.get("epoch"), -1) for r in config_rows if r.get("key") == "owner"]
            epoch = epochs[0] if epochs and epochs[0] >= 0 else None
            if epoch is None:
                return False
            if self.epoch is not None and epoch != self.epoch:
                with self._lock:
                    self._clear()
            self.epoch = epoch
        if maintain and self.loaded:
            self._expire(SCREEN_WINDOW_MS)
            self._next_maintain = now + MAINTAIN_S
        elif maintain:
            self._next_maintain = now + MAINTAIN_S

        changes = self._read(f"SELECT * FROM changes WHERE seq > {int(self.last_seq)}")
        if changes is None:
            return False
        changes = sorted((c for c in changes if _int(c.get("seq")) > self.last_seq), key=lambda c: _int(c.get("seq")))

        touched = set(WATCHED) if not self.loaded else {c.get("table") for c in changes} & set(WATCHED)
        if now >= self._next_screens:
            touched.add("screens")
        step_deleted = any(c.get("table") == "steps" and c.get("op") == "delete" for c in changes)

        fresh: dict[str, dict[int, dict[str, Any]]] = {}
        for table in WATCHED:
            if table not in touched:
                continue
            if table == "steps" and self.loaded and not step_deleted:
                since = max(self.rows["steps"], default=0)
                got = self._read(f"SELECT * FROM steps WHERE seq > {int(since)}")
                if got is None:
                    return False
                merged = dict(self.rows["steps"])
                merged.update({_int(r.get("seq")): r for r in got})
                fresh[table] = merged
            else:
                got = self._read(f"SELECT * FROM {table}")
                if got is None:
                    return False
                fresh[table] = {_int(r.get("seq")): r for r in got}

        with self._lock:
            self.rows.update(fresh)
            if "screens" in touched:
                self._next_screens = now + SCREENS_REFRESH_S
            self._apply_changes(changes, rebuilt_steps=step_deleted or not self.loaded)
            if changes:
                self.last_seq = _int(changes[-1].get("seq"))
            self.loaded = True
        return True

    def _apply_changes(self, changes: list[dict[str, Any]], rebuilt_steps: bool) -> None:
        """Pairs each surviving step insert with its row, and tracks each run's last activity."""
        steps = self.rows["steps"]
        if rebuilt_steps:
            # Steps that were deleted leave the ring.
            self.ring = deque((e for e in self.ring if e.row_seq in steps), maxlen=RING_MAX)

        # Per step ID, the change seqs of inserts that still have a row (a delete drops the oldest).
        live: dict[str, list[tuple[int, int]]] = {}
        for c in changes:
            seq, at, table, op, row_id = _int(c.get("seq")), _int(c.get("at")), c.get("table"), c.get("op"), _str(c.get("row_id"))
            if table == "runs":
                self.run_activity[row_id] = max(at, self.run_activity.get(row_id, 0))
            if table != "steps":
                continue
            if op == "insert":
                live.setdefault(row_id, []).append((seq, at))
            elif op == "delete" and live.get(row_id):
                live[row_id].pop(0)

        candidates: dict[str, list[int]] = {}
        for row_seq in sorted(s for s in steps if s > self.paired_row_seq):
            candidates.setdefault(_str(steps[row_seq].get("step_id")), []).append(row_seq)

        paired: list[StepEntry] = []
        for step_id, inserts in live.items():
            rows = candidates.get(step_id, [])
            for (change_seq, at), row_seq in zip(inserts, rows):
                row = steps[row_seq]
                paired.append(StepEntry(change_seq, row_seq, row))
                run_id = _str(row.get("run_id"))
                self.run_activity[run_id] = max(at, self.run_activity.get(run_id, 0))
        if paired:
            paired.sort(key=lambda e: e.change_seq)
            self.ring.extend(paired)
            self.paired_row_seq = max(self.paired_row_seq, max(e.row_seq for e in paired))

    # -----------------------------------------------------------------------------------------
    # The thread

    def ensure_started(self, wait_s: float = 0.0) -> None:
        """Starts the one poller thread on first use. Waits up to `wait_s` for the first poll."""
        with self._lock:
            if self._thread is None or not self._thread.is_alive():
                self._stop.clear()
                self._thread = threading.Thread(target=self._loop, name="b13-feed", daemon=True)
                self._thread.start()
        if wait_s > 0 and not self._first_done.is_set():
            self._first_done.wait(wait_s)

    def stop(self) -> None:
        self._stop.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            ok = self.poll_once()
            self._stop.wait(POLL_S if ok else RETRY_S)

    # -----------------------------------------------------------------------------------------
    # Answers

    def healthy(self) -> bool:
        return self.ok and self.loaded and self.epoch is not None

    def screens_seen(self) -> int:
        cutoff = self._wall_ms() - SCREEN_WINDOW_MS
        return sum(1 for r in self.rows["screens"].values() if _int(r.get("last_seen")) >= cutoff)

    def _runs_by_id(self) -> dict[str, dict[str, Any]]:
        return {_str(r.get("run_id")): r for r in self.rows["runs"].values()}

    def _replayable(self, run_id: str, runs: dict[str, dict[str, Any]], now_ms: int) -> bool:
        activity = self.run_activity.get(run_id)
        if activity is None:
            return False
        age = now_ms - activity
        run = runs.get(run_id)
        if run is not None and run.get("finished") is not True and age <= REPLAY_RUNNING_MS:
            return True
        return age <= REPLAY_FINISHED_MS

    def sync_payload(self) -> dict[str, Any]:
        tables = []
        for table in WATCHED:
            rows = self.rows[table]
            newest = [rows[s] for s in sorted(rows, reverse=True)[:NEWEST]]
            tables.append({
                "table": table,
                "rows": len(rows),
                "newest": [{"id": _str(r.get(ID_COLUMN[table])), "label": label_for(table, r)} for r in newest],
            })
        processes = []
        for r in sorted(self.rows["processes"].values(), key=lambda r: _int(r.get("seq"))):
            pid, status = r.get("process_id"), r.get("status")
            if pid in PROCESS_IDS and status in PROCESS_STATUSES:
                processes.append({"processId": pid, "status": status})
        return {"tables": tables, "screens": self.screens_seen(), "processes": processes}

    def _event(self, prefix: str, seq: int, type_: str, payload: dict[str, Any]) -> dict[str, Any]:
        return {"id": event_id(prefix, self.epoch or 0, seq), "type": type_, "at": 0, "source": "live", "key": KEY, "payload": payload}

    def changes(self, after: int) -> tuple[list[dict[str, Any]], int]:
        """The events above `after` and the newest change seq they cover.

        A first poll (`after` 0, or above the snapshot after a restart or a new epoch) gets the
        steps of runs still going or finished in the last 60 seconds, and always one `data.synced`.
        Before the first good read there is nothing to say yet.
        """
        with self._lock:
            if not self.loaded or self.epoch is None:
                return [], 0
            first = after <= 0 or after > self.last_seq
            now_ms = self._wall_ms()
            runs = self._runs_by_id()
            events = []
            for entry in self.ring:
                if first:
                    if not self._replayable(_str(entry.row.get("run_id")), runs, now_ms):
                        continue
                elif entry.change_seq <= after:
                    continue
                events.append(self._event(STEP_PREFIX, entry.change_seq, "swarm.step", step_payload(entry.row)))
            if first or self.last_seq > after:
                events.append(self._event(SYNC_PREFIX, self.last_seq, "data.synced", self.sync_payload()))
            return events, self.last_seq

    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "seeded": len(self.rows["catalog"]) >= CATALOG_SEEDED,
                "screens": self.screens_seen() if self.loaded else 0,
                "tables": [{"table": t, "rows": len(self.rows[t])} for t in WATCHED],
                "seq": self.last_seq,
            }


_feed: Optional[Feed] = None
_feed_lock = threading.Lock()


def get() -> Feed:
    """The server process's one feed, made on first use. Its thread starts on ensure_started()."""
    global _feed
    with _feed_lock:
        if _feed is None:
            _feed = Feed()
        return _feed


def set_for_tests(feed: Optional[Feed]) -> None:
    """Swaps the process's feed (tests drive a fake one with poll_once and no thread)."""
    global _feed
    with _feed_lock:
        if _feed is not None and _feed is not feed:
            _feed.stop()
        _feed = feed
