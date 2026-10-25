"""B13-live tests (docs/plans/B13-live.md).

T1, the SpacetimeDB module in server/b13_spacetime/module/ and its README:
- static checks on the module's packages, its ten private tables, the reducers' arguments and the
  owner check, and on the README's commands. They read the files, so they run everywhere.
- a build with the CLI (`spacetime build`), skipped while `spacetime` isn't on the path or the
  module's node_modules is missing (the orchestrator installs the packages after T1).
- one live check, under needs_service("spacetime"), that an anonymous caller can neither read a
  table nor call a reducer on the published database. It skips until `cindia` is published.

T2 to T5, below the T1 tests:
- T2, bridge.py with an httpx MockTransport: the request path and argument order per reducer, the
  queue keeps order on its own thread, a no-op on a refused connection, the 30-second back-off, no
  call at all without the token (no anonymous fallback), and no log line carrying the token or URL.
- T3, feed.py against a fake database from b13_fixture.json: field mapping, labels from fields only,
  the order by seq, no event sent twice, the 60-second replay rule, an outage keeps the snapshot.
- T4, seed.py and save_token.py: the payload's 54 pieces and scripted approvals, and the token saver
  with a fake CLI (replaces only its own line, prints no token).
- T5, the four endpoints with TestClient, and one live test that writes three steps and an order
  through the bridge and reads them back through /api/b13/changes (skipped without SPACETIME_TOKEN).
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import httpx
import pytest

from conftest import needs_service
from server import config

ROOT = Path(__file__).resolve().parents[2]
B13 = ROOT / "server" / "b13_spacetime"
MODULE = B13 / "module"
INDEX = MODULE / "src" / "index.ts"
README = B13 / "README.md"

# The ten tables and their columns in order, as docs/plans/B13-live.md writes them, `seq` first.
TABLES: dict[str, list[str]] = {
    "catalog": [
        "seq", "piece_id", "community_id", "maker_id", "title_en", "title_zh",
        "community_en", "maker_name", "price_cents", "status",
    ],
    "listings": ["seq", "listing_id", "maker_id", "piece_id", "state", "updated_at"],
    "orders": ["seq", "order_id", "piece_id", "channel_id", "gross_cents", "date", "origin"],
    "approvals": ["seq", "approval_id", "kind", "subject_ids", "amount_cents", "status", "updated_at"],
    "runs": ["seq", "run_id", "thread_id", "side", "started_at", "finished"],
    "steps": [
        "seq", "step_id", "run_id", "thread_id", "agent_id", "kind", "summary_en", "summary_zh",
        "tool_name", "ms", "model",
    ],
    "processes": ["seq", "process_id", "status", "count", "updated_at"],
    "screens": ["seq", "screen_id", "role", "last_seen"],
    "changes": ["seq", "table", "row_id", "op", "at"],
    "config": ["seq", "key", "owner", "epoch"],
}
UNIQUE = {
    "catalog": "piece_id",
    "listings": "listing_id",
    "orders": "order_id",
    "approvals": "approval_id",
    "runs": "run_id",
    "processes": "process_id",
    "screens": "screen_id",
    "config": "key",
}
# The reducers and their arguments in the order the bridge sends them as a JSON array.
REDUCERS: dict[str, list[str]] = {
    "seed_catalog": ["payload_json"],
    "record": ["events_json"],
    "start_run": ["run_id", "thread_id", "side"],
    "add_step": [
        "run_id", "step_id", "thread_id", "agent_id", "kind", "summary_en", "summary_zh",
        "tool_name", "ms", "model",
    ],
    "finish_run": ["run_id"],
    "set_process": ["process_id", "status", "count"],
    "touch_screen": ["screen_id", "role"],
    "expire_screens": ["older_than_ms"],
    "clear_runs": [],
}
COLUMN = re.compile(r"^\s*(\w+): t\.(\w+)\(\)(.*?),?$", re.M)
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")


def _source() -> str:
    return INDEX.read_text(encoding="utf-8")


def _balanced(src: str, open_at: int) -> str:
    """The text inside the bracket at `open_at` and its match, skipping quoted strings."""
    pairs = {"(": ")", "{": "}", "[": "]"}
    stack = [pairs[src[open_at]]]
    i = open_at + 1
    while i < len(src):
        ch = src[i]
        if ch in "'\"`":
            end = src.index(ch, i + 1)
            while src[end - 1] == "\\":
                end = src.index(ch, end + 1)
            i = end + 1
            continue
        if ch in pairs:
            stack.append(pairs[ch])
        elif ch == stack[-1]:
            stack.pop()
            if not stack:
                return src[open_at + 1 : i]
        i += 1
    raise AssertionError(f"unbalanced bracket at {open_at}")


def _function_body(src: str, signature: str) -> str:
    """The body of the function whose line starts with `signature` (up to its opening brace)."""
    start = src.index(signature)
    return _balanced(src, src.index("{", start + len(signature) - 1))


def _tables(src: str) -> dict[str, str]:
    out = {}
    for m in re.finditer(r"^const (\w+) = table\(", src, re.M):
        out[m.group(1)] = _balanced(src, m.end() - 1)
    return out


def _reducers(src: str) -> dict[str, tuple[list[str], str]]:
    """Each exported reducer: its argument names in order and its body."""
    out = {}
    for m in re.finditer(r"^export const (\w+) = spacetimedb\.reducer\(", src, re.M):
        inside = _balanced(src, m.end() - 1)
        args: list[str] = []
        rest = inside.lstrip()
        if rest.startswith("{"):
            params = _balanced(rest, 0)
            args = [c.group(1) for c in COLUMN.finditer(params.replace(",", ",\n"))]
            rest = rest[len(params) + 2 :]
        arrow = rest.index("=> {")
        body = _balanced(rest, arrow + 3)
        out[m.group(1)] = (args, body)
    return out


def test_package_pins_exact_versions_for_the_2_13_cli():
    pkg = json.loads((MODULE / "package.json").read_text(encoding="utf-8"))
    assert pkg["private"] is True
    assert pkg["dependencies"] == {"spacetimedb": "2.13.0"}
    assert set(pkg["devDependencies"]) == {"typescript"}
    for name, version in {**pkg["dependencies"], **pkg["devDependencies"]}.items():
        assert SEMVER.match(version), f"{name} must be pinned to an exact version, not {version!r}"
    assert "publish" not in pkg.get("scripts", {}), "a publish script would run on `npm publish`"
    tsconfig = (MODULE / "tsconfig.json").read_text(encoding="utf-8")
    for required in ('"target": "ESNext"', '"module": "ESNext"', '"isolatedModules": true', '"noEmit": true'):
        assert required in tsconfig


def test_module_declares_the_ten_private_tables():
    src = _source()
    tables = _tables(src)
    assert set(tables) == set(TABLES)
    schema = re.search(r"const spacetimedb = schema\(\{([^}]*)\}\);", src)
    assert schema, "the schema object"
    assert [n.strip() for n in schema.group(1).split(",") if n.strip()] == list(TABLES)
    assert "export default spacetimedb;" in src
    assert "public: true" not in src
    for name, block in tables.items():
        options = _balanced(block, block.index("{"))
        assert options.strip() == "public: false", f"{name} must be private"
        columns = [(c.group(1), c.group(2), c.group(3)) for c in COLUMN.finditer(block)]
        assert [c[0] for c in columns] == TABLES[name], name
        assert columns[0][1:] == ("u64", ".primaryKey().autoInc()"), f"{name}.seq is the auto-increment key"
        for column, kind, extra in columns[1:]:
            if column == UNIQUE.get(name):
                assert extra == ".unique()", f"{name}.{column} is unique"
            elif (name, column) == ("steps", "run_id"):
                assert extra == ".index('btree')"
            else:
                assert extra == "", f"{name}.{column} is a plain column"
            assert column == column.lower(), "column names are snake case"
            if column.endswith("_cents"):
                assert kind == "i64"
            if column.endswith("_at") or column in ("at", "last_seen", "epoch"):
                assert kind == "u64", f"{name}.{column} is a u64 time"
    assert "step_id: t.string()," in tables["steps"], "step_id is a plain column (B2-2)"


def test_reducers_take_the_plan_arguments_in_order():
    src = _source()
    reducers = _reducers(src)
    assert {n: a for n, (a, _) in reducers.items()} == REDUCERS
    exports = re.findall(r"^export (?:const|function|class|let|var) (\w+)", src, re.M)
    assert sorted(exports) == sorted([*REDUCERS, "init"]), "only the reducers and init are exported"


def test_every_reducer_but_init_checks_the_owner_first():
    reducers = _reducers(_source())
    for name, (_, body) in reducers.items():
        first = body.strip().split("\n", 1)[0].strip()
        assert first == "requireOwner(ctx);", f"{name} must check the owner before anything else"
    src = _source()
    owner = _function_body(src, "function requireOwner(ctx: Ctx): void {")
    assert "ctx.db.config.key.find(OWNER_KEY)" in owner
    assert "row.owner.isEqual(ctx.sender)" in owner
    assert "SenderError" in src and "fail(" in owner


def test_init_stores_the_owner_and_the_epoch():
    src = _source()
    m = re.search(r"^export const init = spacetimedb\.init\(", src, re.M)
    assert m, "the init lifecycle reducer"
    body = _balanced(src, m.end() - 1)
    assert "owner: ctx.sender" in body
    assert "epoch: ctx.timestamp.microsSinceUnixEpoch / 1_000_000n" in body
    assert "key: OWNER_KEY" in body and "const OWNER_KEY = 'owner';" in src


def test_text_is_capped_and_only_the_platform_models_are_allowed():
    src = _source()
    assert "const TEXT_MAX = 160;" in src
    assert "summary_en: clip(args.summary_en)" in src and "summary_zh: clip(args.summary_zh)" in src
    models = re.search(r"const MODELS = \[([^\]]*)\] as const;", src)
    assert models
    assert [m.strip().strip("'") for m in models.group(1).split(",")] == ["", "claude-haiku-5-5", "claude-sonnet-5-5"]
    assert set(re.findall(r"claude-[a-z0-9-]+", src)) == {"claude-haiku-5-5", "claude-sonnet-5-5"}
    for line in src.splitlines():
        if re.search(r"opus|fable", line, re.I):
            assert line.strip().startswith(("/**", "*", "//")), f"Opus or Fable outside a comment: {line}"
    assert "const RECORD_EVENTS_MAX = 50;" in src and "const RECORD_JSON_MAX = 256 * 1024;" in src


def test_module_names_no_host_and_no_token():
    src = _source()
    for word in ("http://", "https://", "maincloud", "SPACETIME_TOKEN", "process.env", "fetch("):
        assert word not in src, word
    # A person's words never reach a table: the record reducer reads no notes, titles, summaries or reasons.
    parse_event = _function_body(src, "function parseEvent(value: unknown, at: string): Mirrored | null {")
    read = set(re.findall(r"\b(?:payload|inline)\.(\w+)", parse_event))
    assert read == {
        "orderId", "pieceId", "channelId", "grossCents", "date", "approvalId", "approval",
        "kind", "subjectIds", "amountCents", "listingId", "makerId",
    }, f"parseEvent reads only IDs, kinds, amounts and dates: {sorted(read)}"


def test_readme_gives_the_local_commands():
    readme = README.read_text(encoding="utf-8")
    for command in (
        "spacetime start --listen-addr 127.0.0.1:3000",
        "npm install --no-audit --no-fund",
        "spacetime build",
        "spacetime publish -s local cindia --yes=skip-login",
        "server/b13_spacetime/save_token.py",
        "spacetime call -s local cindia clear_runs",
    ):
        assert f"\n{command}\n" in readme or f"\n.venv/bin/python {command}\n" in readme, command
    for folder in ("from `server/b13_spacetime/module/`", "from the repo root", "from anywhere"):
        assert folder in readme
    blocks = re.findall(r"```text\n(.*?)```", readme, re.S)
    lines = [line for block in blocks for line in block.splitlines() if line.startswith("spacetime ")]
    for line in lines:
        verb = line.split()[1]
        if verb in ("publish", "call", "sql", "delete", "logs"):
            assert " -s local " in f"{line} ", f"every {verb} names the local server: {line}"
        assert verb != "login", "no command logs in"
    assert all(line != "spacetime start" for line in lines)


@pytest.mark.skipif(shutil.which("spacetime") is None, reason="the spacetime CLI isn't on the path")
@pytest.mark.skipif(not (MODULE / "node_modules").is_dir(), reason="the module's packages aren't installed yet (README step 1)")
def test_module_builds_with_the_cli():
    result = subprocess.run(
        [shutil.which("spacetime") or "spacetime", "build"],
        cwd=MODULE,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=300,
        check=False,
    )
    output = (result.stdout + result.stderr)[-4000:]
    assert result.returncode == 0, f"spacetime build failed:\n{output}"
    bundle = MODULE / "dist" / "bundle.js"
    assert bundle.is_file() and bundle.stat().st_size > 0, f"no dist/bundle.js:\n{output}"
    js = bundle.read_text(encoding="utf-8", errors="replace")
    for name in REDUCERS:
        assert name in js, f"the bundle has no {name}"


@pytest.mark.live
@needs_service("spacetime")
def test_an_anonymous_caller_can_neither_read_nor_write():
    url = config.SPACETIME_URL
    if urlparse(url).hostname not in ("127.0.0.1", "localhost", "::1"):
        pytest.skip("checked only against the local server")
    db = config.SPACETIME_DB
    with httpx.Client(base_url=url, timeout=2.0, trust_env=False) as client:
        read = client.post(f"/v1/database/{db}/sql", content="SELECT * FROM catalog")
        if read.status_code == 404:
            pytest.skip(f"the database {db} isn't published yet (README step 3)")
        assert read.status_code >= 400, "an anonymous SQL read of a private table must fail"
        write = client.post(f"/v1/database/{db}/call/touch_screen", json=["scr_anonprobe1", "tour"])
        assert write.status_code >= 400, "an anonymous reducer call must be refused"


# =============================================================================================
# T2 to T5: the bridge, the feed, the seed and token saver, and the four endpoints.
# No test here reaches the real SpacetimeDB except the one marked live: an autouse fixture refuses
# every bridge request unless a test installs its own httpx MockTransport, and swaps in a feed
# that reads nothing. The feed tests poll a fake database built from tests/server/b13_fixture.json.

import logging  # noqa: E402
import random  # noqa: E402
import sys  # noqa: E402
import threading  # noqa: E402
import time  # noqa: E402
from typing import Any  # noqa: E402

from server import services  # noqa: E402
from server.b13_spacetime import bridge, save_token  # noqa: E402
from server.b13_spacetime import feed as feed_mod  # noqa: E402
from server.b13_spacetime import seed as seed_mod  # noqa: E402
from server.routers import b13_live  # noqa: E402

FIXTURE = json.loads((Path(__file__).parent / "b13_fixture.json").read_text(encoding="utf-8"))
EPOCH6 = f"{FIXTURE['epoch'] % 1_000_000:06d}"
NOW_MS = FIXTURE["nowMs"]
SQL_RE = re.compile(r"^SELECT \* FROM (\w+)(?: WHERE seq > (\d+))?$")
ENVELOPE = {"id", "type", "at", "source", "key", "payload"}
STEP_KINDS = {"route", "call", "tool", "result", "check", "handoff", "reply"}
TABLE_NAMES = ["catalog", "listings", "orders", "approvals", "runs", "steps", "processes", "screens"]


def _refuse(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("connection refused", request=request)


def _idle_feed() -> feed_mod.Feed:
    f = feed_mod.Feed(sql=lambda q: None, expire=lambda ms: False)
    f.ensure_started = lambda wait_s=0.0: None  # type: ignore[method-assign]
    return f


@pytest.fixture(autouse=True)
def _b13_isolated(request, monkeypatch):
    live = request.node.get_closest_marker("live") is not None
    bridge.reset()
    b13_live.reset_for_tests()
    if not live:
        monkeypatch.setattr(bridge, "_transport", httpx.MockTransport(_refuse))
        feed_mod.set_for_tests(_idle_feed())
    yield
    feed_mod.set_for_tests(None)
    bridge.reset()


@pytest.fixture
def cindia_log():
    """Every line the `cindia` logger writes (it doesn't propagate, so caplog alone misses it)."""
    lines: list[str] = []

    class _Keep(logging.Handler):
        def emit(self, record):
            lines.append(record.getMessage())

    handler = _Keep(level=logging.DEBUG)
    logger = logging.getLogger("cindia")
    logger.addHandler(handler)
    yield lines
    logger.removeHandler(handler)


class Spacetime:
    """A fake SpacetimeDB HTTP API: records each request and answers reducers and SQL."""

    def __init__(self, status: int = 200, body: str = "", tables: dict | None = None, delay_s: float = 0.0):
        self.status, self.body, self.delay_s = status, body, delay_s
        self.tables = tables or {}
        self.requests: list[httpx.Request] = []
        self.threads: list[str] = []
        self.lock = threading.Lock()

    def __call__(self, request: httpx.Request) -> httpx.Response:
        with self.lock:
            self.requests.append(request)
            self.threads.append(threading.current_thread().name)
        if self.delay_s:
            time.sleep(self.delay_s)
        if request.url.path.endswith("/sql") and self.status == 200:
            m = SQL_RE.match(request.content.decode("utf-8"))
            rows = self.tables.get(m.group(1) if m else "", [])
            names = list(rows[0]) if rows else ["seq"]
            schema = {"elements": [{"name": {"some": n}, "algebraic_type": {"String": []}} for n in names]}
            return httpx.Response(200, json=[{"schema": schema, "rows": [[r[n] for n in names] for r in rows]}])
        return httpx.Response(self.status, text=self.body)

    def calls(self) -> list[tuple[str, Any]]:
        out = []
        for r in self.requests:
            tail = r.url.path.split(f"/v1/database/{config.SPACETIME_DB}/", 1)[1]
            out.append((tail, r.content.decode("utf-8") if tail == "sql" else json.loads(r.content)))
        return out


def _use(monkeypatch, fake) -> Any:
    monkeypatch.setattr(bridge, "_transport", httpx.MockTransport(fake))
    return fake


STEP = {
    "runId": "run_user_k3x9qa_1",
    "threadId": "thr_user_k3x9qa_1",
    "stepId": "stp_user_k3x9qa_1",
    "agentId": "finder",
    "kind": "tool",
    "summary": {"en": "Found 6 pieces", "zh": "找到6件作品"},
    "toolName": "cindia_search",
    "ms": 120.4,
}


# ---------------------------------------------------------------------------------------------
# T2: bridge.py

def test_bridge_calls_each_reducer_with_its_arguments_in_order(monkeypatch):
    fake = _use(monkeypatch, Spacetime())
    events = [{"id": "evt_0001", "type": "order.placed", "payload": {"orderId": "ord_001"}}]
    payload = {"catalog": [{"piece_id": "pc_01"}], "orders": [], "approvals": []}
    assert bridge.start_run("run_user_k3x9qa_1", "thr_user_k3x9qa_1", "buyer")
    assert bridge.add_step(STEP)
    assert bridge.add_step({**STEP, "stepId": "stp_user_k3x9qa_2", "kind": "reply", "toolName": None, "model": "claude-sonnet-5-5"})
    assert bridge.finish_run("run_user_k3x9qa_1")
    assert bridge.set_process("swarm", "working", 2)
    assert bridge.touch_screen("scr_k3x9qa", "tour")
    assert bridge.flush()
    assert bridge.expire_screens(15000)
    assert bridge.record(events)
    assert bridge.seed_catalog(payload)
    calls = fake.calls()
    assert [c[0] for c in calls] == [
        "call/start_run", "call/add_step", "call/add_step", "call/finish_run", "call/set_process",
        "call/touch_screen", "call/expire_screens", "call/record", "call/seed_catalog",
    ]
    assert calls[0][1] == ["run_user_k3x9qa_1", "thr_user_k3x9qa_1", "buyer"]
    assert calls[1][1] == [
        "run_user_k3x9qa_1", "stp_user_k3x9qa_1", "thr_user_k3x9qa_1", "finder", "tool",
        "Found 6 pieces", "找到6件作品", "cindia_search", 120, "",
    ]
    assert calls[2][1][-3:] == ["", 120, "claude-sonnet-5-5"]
    assert calls[3][1] == ["run_user_k3x9qa_1"]
    assert calls[4][1] == ["swarm", "working", 2]
    assert calls[5][1] == ["scr_k3x9qa", "tour"]
    assert calls[6][1] == [15000]
    assert [json.loads(a) for a in calls[7][1]] == [events]
    assert [json.loads(a) for a in calls[8][1]] == [payload]
    assert all(r.method == "POST" for r in fake.requests)


def test_bridge_caps_summaries_and_refuses_a_non_step():
    long = {**STEP, "summary": {"en": "x" * 500, "zh": "字" * 500}, "ms": -5}
    args = bridge.step_args(long)
    assert args is not None and len(args[5]) == 160 and len(args[6]) == 160 and args[8] == 0
    assert bridge.step_args({"runId": "run_01"}) is None
    assert bridge.add_step({"stepId": "stp_0001"}) is False


def test_bridge_sql_names_columns_from_the_schema(monkeypatch):
    fake = _use(monkeypatch, Spacetime(tables={"changes": FIXTURE["changes"][:2]}))
    rows = bridge.sql("SELECT * FROM changes WHERE seq > 0")
    assert rows == FIXTURE["changes"][:2]
    assert fake.calls() == [("sql", "SELECT * FROM changes WHERE seq > 0")]


def test_bridge_queue_keeps_order_and_never_makes_the_caller_wait(monkeypatch):
    fake = _use(monkeypatch, Spacetime(delay_s=0.02))
    t0 = time.perf_counter()
    for n in range(1, 21):
        assert bridge.add_step({**STEP, "stepId": f"stp_user_k3x9qa_{n}"})
    assert time.perf_counter() - t0 < 0.2, "queued calls return at once"
    assert bridge.flush(5.0)
    assert [c[1][1] for c in fake.calls()] == [f"stp_user_k3x9qa_{n}" for n in range(1, 21)]
    assert set(fake.threads) == {"b13-bridge"}, "queued calls run on the bridge's one thread"


def test_bridge_is_a_no_op_on_a_refused_connection(cindia_log):
    assert bridge.record([{"id": "evt_0001", "type": "order.placed", "payload": {}}]) is False
    assert bridge.seed_catalog({}) is False
    assert bridge.sql("SELECT * FROM config") == []
    assert bridge.poll_sql("SELECT * FROM config") is None
    assert bridge.start_run("run_01", "thr_01", "buyer") is False, "a back-off drops queued calls at once"
    assert bridge.available() is False
    assert len([line for line in cindia_log if "didn't answer" in line]) == 1, "one line per outage"


def test_bridge_backs_off_for_30_seconds(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(bridge, "_now", lambda: clock[0])
    fake = Spacetime()
    attempts = []

    def flaky(request):
        attempts.append(request.url.path)
        if len(attempts) == 1:
            raise httpx.ConnectTimeout("timed out", request=request)
        return fake(request)

    _use(monkeypatch, flaky)
    assert bridge.record([]) is False
    for wait in (0.0, 10.0, 29.9):
        clock[0] = 1000.0 + wait
        assert bridge.record([]) is False
        assert bridge.available() is False
    assert len(attempts) == 1, "no call goes out during the back-off"
    clock[0] = 1030.1
    assert bridge.record([]) is True
    assert len(attempts) == 2 and bridge.available() is True


def test_the_feed_poll_ignores_the_back_off_and_ends_it(monkeypatch):
    clock = [50.0]
    monkeypatch.setattr(bridge, "_now", lambda: clock[0])
    assert bridge.record([]) is False
    assert bridge.backing_off()
    _use(monkeypatch, Spacetime(tables={"config": [{"seq": 1, "key": "owner", "epoch": 7}]}))
    assert bridge.poll_sql("SELECT * FROM config") == [{"seq": 1, "key": "owner", "epoch": 7}]
    assert not bridge.backing_off() and bridge.available()


def test_bridge_without_a_token_makes_no_call_and_says_so_once(monkeypatch, cindia_log):
    monkeypatch.setattr(config, "SPACETIME_TOKEN", None)
    fake = _use(monkeypatch, Spacetime())
    assert bridge.start_run("run_01", "thr_01", "buyer") is False
    assert bridge.add_step(STEP) is False
    assert bridge.record([]) is False
    assert bridge.seed_catalog({}) is False
    assert bridge.sql("SELECT * FROM config") == []
    assert bridge.poll_sql("SELECT * FROM config") is None
    assert fake.requests == [], "never an anonymous request"
    assert bridge.available() is False and bridge.has_token() is False
    assert len([line for line in cindia_log if "SPACETIME_TOKEN" in line]) == 1


def test_a_refused_reducer_call_logs_once_and_doesnt_back_off(monkeypatch, cindia_log):
    _use(monkeypatch, Spacetime(status=530, body="add_step: kind: expected one of route, call"))
    for _ in range(3):
        assert bridge.call("add_step", []) is False
    assert not bridge.backing_off() and bridge.available()
    assert len([line for line in cindia_log if "refused" in line]) == 1


@pytest.mark.parametrize("status,body", [(401, "Invalid token: InvalidToken"), (404, "`cindia` not found"),
                                         (530, "not_owner: only the publisher may call this reducer"), (503, "")])
def test_a_bad_token_a_missing_database_or_a_server_error_backs_off(monkeypatch, status, body):
    _use(monkeypatch, Spacetime(status=status, body=body))
    assert bridge.call("touch_screen", ["scr_k3x9qa", "tour"]) is False
    assert bridge.backing_off() and not bridge.available()


def test_no_log_line_or_error_carries_the_token_or_the_url(monkeypatch, cindia_log):
    token = config.SPACETIME_TOKEN
    assert token, "the autouse fixture sets a fake token"
    monkeypatch.setattr(config, "SPACETIME_URL", "http://owner:pw-in-url@127.0.0.1:3000")

    def leaky(request):
        raise httpx.ConnectError(f"refused {request.url} with {request.headers.get('authorization')}", request=request)

    _use(monkeypatch, leaky)
    bridge.record([])
    bridge.reset()
    _use(monkeypatch, Spacetime(status=530, body=f"echo {token}"))
    bridge.call("add_step", [])
    bridge.reset()
    _use(monkeypatch, Spacetime(status=401, body=f"Invalid token {token}"))
    bridge.sql("SELECT * FROM config")
    assert cindia_log, "the failures were logged"
    for line in cindia_log:
        assert token not in line and "pw-in-url" not in line and "http" not in line, line


# ---------------------------------------------------------------------------------------------
# T3: feed.py, against a fake database


class FakeDb:
    """The fixture's tables and change log behind the feed's SQL. Rows come back in a shuffled
    order, because SpacetimeDB's SQL has no ORDER BY."""

    def __init__(self):
        self.epoch = FIXTURE["epoch"]
        self.tables = {t: [dict(r) for r in rows] for t, rows in FIXTURE["tables"].items()}
        self.changes = [dict(c) for c in FIXTURE["changes"]]
        self.down = False
        self.queries: list[str] = []
        self.expired: list[int] = []
        self.after_changes_read = None
        self._shuffle = random.Random(13)
        # Auto-increment never reuses a seq, even after a delete.
        self._seqs = {t: max((r["seq"] for r in rows), default=0) for t, rows in self.tables.items()}
        self._seqs["changes"] = max(c["seq"] for c in self.changes)

    def sql(self, query: str):
        self.queries.append(query)
        if self.down:
            return None
        m = SQL_RE.match(query)
        assert m, f"the feed only runs SELECT * FROM <table> [WHERE seq > n]: {query}"
        table, after = m.group(1), int(m.group(2)) if m.group(2) else -1
        if table == "config":
            return [{"seq": 1, "key": "owner", "owner": ["0xc200"], "epoch": self.epoch}]
        rows = self.changes if table == "changes" else self.tables[table]
        out = [dict(r) for r in rows if r["seq"] > after]
        self._shuffle.shuffle(out)
        if table == "changes" and self.after_changes_read:
            hook, self.after_changes_read = self.after_changes_read, None
            hook()
        return out

    def expire(self, ms: int) -> bool:
        self.expired.append(ms)
        return True

    def _next(self, table: str) -> int:
        self._seqs[table] += 1
        return self._seqs[table]

    def change(self, table: str, row_id: str, op: str, at: int) -> int:
        seq = self._next("changes")
        self.changes.append({"seq": seq, "table": table, "row_id": row_id, "op": op, "at": at})
        return seq

    def add_step(self, run_id: str, step_id: str, at: int, agent: str = "writer", kind: str = "reply") -> int:
        steps = self.tables["steps"]
        steps.append({
            "seq": self._next("steps"), "step_id": step_id, "run_id": run_id, "thread_id": "thr_user_2",
            "agent_id": agent, "kind": kind, "summary_en": "Checked the facts", "summary_zh": "核对了事实",
            "tool_name": "", "ms": 50, "model": "",
        })
        return self.change("steps", step_id, "insert", at)

    def restart_run(self, run_id: str, at: int) -> None:
        for step in [s for s in self.tables["steps"] if s["run_id"] == run_id]:
            self.tables["steps"].remove(step)
            self.change("steps", step["step_id"], "delete", at)
        for run in self.tables["runs"]:
            if run["run_id"] == run_id:
                run.update(started_at=at, finished=False)
        self.change("runs", run_id, "update", at)

    def finish_run(self, run_id: str, at: int) -> None:
        for run in self.tables["runs"]:
            if run["run_id"] == run_id:
                run["finished"] = True
        self.change("runs", run_id, "update", at)


def _feed(db: FakeDb, wall: list[int] | None = None, mono: list[float] | None = None) -> feed_mod.Feed:
    wall = wall if wall is not None else [NOW_MS]
    mono = mono if mono is not None else [100.0]
    f = feed_mod.Feed(sql=db.sql, expire=db.expire, wall_ms=lambda: wall[0], clock=lambda: mono[0])
    f.ensure_started = lambda wait_s=0.0: None  # type: ignore[method-assign]
    return f


def _check_shape(e: dict) -> None:
    """The envelope and payload as events.md and src/core/validate.ts describe them."""
    assert set(e) <= ENVELOPE and set(e) >= {"id", "type", "at", "source", "key", "payload"}
    assert e["source"] == "live" and e["key"] == "b13-live" and e["at"] == 0
    assert re.match(r"^evt_live_13[12]\d{6}\d{9}$", e["id"]), e["id"]
    p = e["payload"]
    if e["type"] == "swarm.step":
        assert set(p) <= {"runId", "threadId", "stepId", "agentId", "kind", "summary", "toolName", "ms", "model"}
        for k in ("runId", "threadId", "stepId", "agentId"):
            assert isinstance(p[k], str) and p[k]
        assert p["kind"] in STEP_KINDS
        assert set(p["summary"]) == {"en", "zh"} and all(isinstance(v, str) for v in p["summary"].values())
        assert isinstance(p["ms"], int) and p["ms"] >= 0
        assert "toolName" not in p or (isinstance(p["toolName"], str) and p["toolName"])
        assert "model" not in p or p["model"] in config.ALLOWED_MODELS
    else:
        assert e["type"] == "data.synced"
        assert set(p) == {"tables", "screens", "processes"}
        assert [t["table"] for t in p["tables"]] == TABLE_NAMES
        for t in p["tables"]:
            assert set(t) == {"table", "rows", "newest"} and isinstance(t["rows"], int)
            assert len(t["newest"]) <= 3
            assert all(set(n) == {"id", "label"} and isinstance(n["id"], str) and isinstance(n["label"], str) for n in t["newest"])
        assert isinstance(p["screens"], int)
        for proc in p["processes"]:
            assert set(proc) == {"processId", "status"}
            assert proc["processId"] in feed_mod.PROCESS_IDS and proc["status"] in ("working", "done")


def test_feed_maps_rows_to_events_in_seq_order():
    db = FakeDb()
    f = _feed(db)
    assert f.poll_once() and f.healthy()
    events, seq = f.changes(0)
    assert seq == 23
    for e in events:
        _check_shape(e)
    steps = [e for e in events if e["type"] == "swarm.step"]
    assert [e["payload"]["stepId"] for e in steps] == FIXTURE["expected"]["firstPollSteps"]
    assert [e["id"] for e in steps] == [f"evt_live_131{EPOCH6}{s:09d}" for s in FIXTURE["expected"]["firstPollStepChangeSeqs"]]
    route, tool, reply = (e["payload"] for e in steps)
    assert route == {
        "runId": "run_user_k3x9qa_1", "threadId": "thr_user_2", "stepId": "stp_user_k3x9qa_1", "agentId": "intake",
        "kind": "route", "summary": {"en": "Read the question SUMMARY-MARKER", "zh": "读了问题"}, "ms": 380,
        "model": "claude-haiku-5-5",
    }
    assert tool["toolName"] == "cindia_search" and "model" not in tool, "an empty model is left out"
    assert "toolName" not in reply, "an empty tool name is left out"
    synced = events[-1]
    assert synced["type"] == "data.synced" and synced["id"] == f"evt_live_132{EPOCH6}{23:09d}"
    assert len([e for e in events if e["type"] == "data.synced"]) == 1


def test_feed_data_synced_counts_rows_and_labels_from_fields_only():
    db = FakeDb()
    f = _feed(db)
    f.poll_once()
    p = f.changes(0)[0][-1]["payload"]
    rows = {t["table"]: t["rows"] for t in p["tables"]}
    assert rows == {t: len(FIXTURE["tables"][t]) for t in TABLE_NAMES}
    newest = {t["table"]: [[n["id"], n["label"]] for n in t["newest"]] for t in p["tables"]}
    assert newest == FIXTURE["expected"]["newest"]
    assert p["screens"] == FIXTURE["expected"]["screens"], "only screens seen in the last 15 seconds"
    assert p["processes"] == FIXTURE["expected"]["processes"], "unknown process IDs are left out"
    assert "MARKER" not in json.dumps(p), "a label never carries a step's summary or other text"


def test_feed_sends_each_change_once_and_a_resent_row_keeps_its_id():
    db = FakeDb()
    f = _feed(db)
    f.poll_once()
    assert f.changes(23) == ([], 23)
    seq = db.add_step("run_user_k3x9qa_1", "stp_user_k3x9qa_4", NOW_MS - 1000, agent="steward", kind="check")
    assert f.poll_once()
    events, new_seq = f.changes(23)
    assert new_seq == seq == 24
    assert [e["type"] for e in events] == ["swarm.step", "data.synced"]
    assert events[0]["id"] == f"evt_live_131{EPOCH6}{24:09d}" and events[0]["payload"]["stepId"] == "stp_user_k3x9qa_4"
    assert f.changes(23)[0] == events, "asking again gives the same IDs"
    assert f.changes(24) == ([], 24)
    assert db.queries[-1] == "SELECT * FROM steps WHERE seq > 5", "only the new steps are read"


def test_a_first_poll_replays_only_runs_still_going_or_finished_in_the_last_minute():
    db = FakeDb()
    wall = [NOW_MS]
    f = _feed(db, wall)
    f.poll_once()
    first = [e["payload"]["runId"] for e in f.changes(0)[0] if e["type"] == "swarm.step"]
    assert set(first) == {"run_user_k3x9qa_1"}, "the run finished ten minutes ago isn't replayed"
    db.finish_run("run_user_k3x9qa_1", NOW_MS - 1000)
    f.poll_once()
    assert len([e for e in f.changes(0)[0] if e["type"] == "swarm.step"]) == 3, "finished a second ago"
    wall[0] = NOW_MS + 59_000
    assert len([e for e in f.changes(0)[0] if e["type"] == "swarm.step"]) == 3, "finished 60 s ago"
    wall[0] = NOW_MS + 60_000
    events, seq = f.changes(0)
    assert [e["type"] for e in events] == ["data.synced"], "finished over a minute ago: only the data.synced"
    events, _ = f.changes(seq + 50)
    assert [e["type"] for e in events] == ["data.synced"], "a seq from before a restart counts as a first poll"


def test_an_outage_keeps_the_last_snapshot():
    db = FakeDb()
    mono = [100.0]
    f = _feed(db, mono=mono)
    assert f.poll_once()
    before, status = f.changes(0), f.status()
    db.down = True
    mono[0] += 3
    assert f.poll_once() is False
    assert not f.ok and not f.healthy()
    assert f.changes(0) == before and f.status() == status
    db.down = False
    db.add_step("run_user_k3x9qa_1", "stp_user_k3x9qa_4", NOW_MS)
    assert f.poll_once() and f.healthy()
    assert f.changes(23)[0][0]["payload"]["stepId"] == "stp_user_k3x9qa_4"


def test_a_step_written_between_the_two_reads_waits_for_the_next_poll():
    db = FakeDb()
    f = _feed(db)
    f.poll_once()
    db.add_step("run_user_k3x9qa_1", "stp_user_k3x9qa_4", NOW_MS)
    db.after_changes_read = lambda: db.add_step("run_user_k3x9qa_1", "stp_user_k3x9qa_5", NOW_MS)
    f.poll_once()
    events, seq = f.changes(23)
    assert seq == 24 and [e["payload"]["stepId"] for e in events if e["type"] == "swarm.step"] == ["stp_user_k3x9qa_4"]
    f.poll_once()
    events, seq = f.changes(24)
    assert seq == 25
    assert [(e["id"], e["payload"]["stepId"]) for e in events if e["type"] == "swarm.step"] == [
        (f"evt_live_131{EPOCH6}{25:09d}", "stp_user_k3x9qa_5"),
    ]


def test_a_restarted_run_drops_its_old_steps():
    db = FakeDb()
    f = _feed(db)
    f.poll_once()
    db.restart_run("run_user_k3x9qa_1", NOW_MS)
    seq = db.add_step("run_user_k3x9qa_1", "stp_user_k3x9qa_1", NOW_MS, agent="intake", kind="route")
    f.poll_once()
    first = [e for e in f.changes(0)[0] if e["type"] == "swarm.step"]
    assert [(e["id"], e["payload"]["agentId"]) for e in first] == [(f"evt_live_131{EPOCH6}{seq:09d}", "intake")]
    assert {t["table"]: t["rows"] for t in f.changes(0)[0][-1]["payload"]["tables"]}["steps"] == 3


def test_the_feed_expires_screens_every_10_seconds_and_follows_a_new_epoch():
    db = FakeDb()
    mono = [100.0]
    f = _feed(db, mono=mono)
    f.poll_once()
    mono[0] += 0.5
    f.poll_once()
    assert db.expired == []
    mono[0] += 10
    f.poll_once()
    assert db.expired == [15000]
    db.epoch = 1761999999
    mono[0] += 10
    assert f.poll_once()
    events, seq = f.changes(0)
    assert seq == 23 and events[-1]["id"] == f"evt_live_132999999{23:09d}", "a new epoch starts the IDs over"


def test_the_feed_answers_nothing_before_its_first_good_read():
    db = FakeDb()
    db.down = True
    f = _feed(db)
    assert f.poll_once() is False
    assert f.changes(0) == ([], 0)
    assert f.status()["seeded"] is False and f.status()["seq"] == 0


# ---------------------------------------------------------------------------------------------
# T4: seed.py and save_token.py


def test_the_seed_payload_keeps_only_ids_titles_and_amounts():
    payload = seed_mod.build_payload(FIXTURE["mock"])
    assert set(payload) == {"catalog", "orders", "approvals"}
    assert payload["catalog"][0] == {
        "piece_id": "pc_01", "community_id": "com_dine", "maker_id": "mkr_01",
        "title_en": "Small grey, red and black wool weaving", "title_zh": "灰红黑三色小幅羊毛编织",
        "community_en": "Diné Weaving and Silver Co-op", "maker_name": "Grace N.", "price_cents": 18000, "status": "active",
    }
    assert payload["orders"] == [{"order_id": "ord_001", "piece_id": "pc_01", "channel_id": "ch_cindia",
                                  "gross_cents": 18000, "date": "2026-09-01", "origin": "mock"}]
    assert payload["approvals"] == FIXTURE["seedApprovals"]
    assert "MARKER" not in json.dumps(payload, ensure_ascii=False), "no story, note or other text"


def test_the_seed_payload_from_mock_json_holds_the_54_pieces():
    if not seed_mod.MOCK_PATH.is_file() and not seed_mod.SNAPSHOT_PATH.is_file():
        pytest.skip("no mock.json yet (npm run export:mock)")
    payload = seed_mod.payload_from_file()
    catalog = payload["catalog"]
    assert len(catalog) == 54 and len({p["piece_id"] for p in catalog}) == 54
    for p in catalog:
        assert re.match(r"^pc_\d+$", p["piece_id"]) and p["community_id"].startswith("com_") and p["maker_id"].startswith("mkr_")
        assert p["title_en"] and p["community_en"] and p["maker_name"] and p["price_cents"] > 0
    assert [a["approval_id"] for a in payload["approvals"]] == ["apr_01", "apr_02", "apr_03", "apr_04", "apr_05"]
    assert all(a["status"] == "pending" for a in payload["approvals"])
    assert payload["orders"] and all(o["order_id"].startswith("ord_") and o["origin"] == "mock" for o in payload["orders"])
    assert len(json.dumps(payload)) < 512 * 1024


FAKE_TOKEN = "fakehdr0000.fakebody0000.fakesig00000"


def _fake_cli(tmp_path: Path, lines: list[str], code: int = 0) -> list[str]:
    script = tmp_path / "fake_spacetime.py"
    script.write_text(
        "import sys\n"
        "assert sys.argv[1:] == ['login', 'show', '--token'], sys.argv\n"
        f"for line in {lines!r}:\n    print(line)\n"
        f"sys.exit({code})\n",
        encoding="utf-8",
    )
    return [sys.executable, str(script)]


def test_save_token_replaces_only_its_own_line_and_prints_no_token(tmp_path, monkeypatch, capsys):
    env = tmp_path / ".env"
    env.write_text("ANTHROPIC_API_KEY=fake-a\nSPACETIME_TOKEN=old-value\nNESSIE_KEY=fake-n\nSPACETIME_TOKEN=older\n", encoding="utf-8")
    cli = _fake_cli(tmp_path, ["You are logged in as c200aa", f"Your auth token (don't share this!) is {FAKE_TOKEN}"])
    monkeypatch.setattr(save_token, "CLI", cli)
    monkeypatch.setattr(save_token, "ENV_PATH", env)
    assert save_token.main() == 0
    out = capsys.readouterr()
    assert out.out == "SPACETIME_TOKEN saved to .env\n" and out.err == ""
    assert env.read_text(encoding="utf-8") == f"ANTHROPIC_API_KEY=fake-a\nSPACETIME_TOKEN={FAKE_TOKEN}\nNESSIE_KEY=fake-n\n"


def test_save_token_creates_env_and_keeps_windows_line_endings(tmp_path, monkeypatch, capsys):
    env = tmp_path / ".env"
    monkeypatch.setattr(save_token, "CLI", _fake_cli(tmp_path, [f"Your auth token (don't share this!) is {FAKE_TOKEN}"]))
    monkeypatch.setattr(save_token, "ENV_PATH", env)
    assert save_token.main() == 0
    assert env.read_text(encoding="utf-8") == f"SPACETIME_TOKEN={FAKE_TOKEN}\n"
    env.write_bytes(b"NESSIE_KEY=fake-n\r\nSPACETIME_TOKEN=x\r\n")
    assert save_token.main() == 0
    assert env.read_bytes() == f"NESSIE_KEY=fake-n\r\nSPACETIME_TOKEN={FAKE_TOKEN}\r\n".encode()
    assert FAKE_TOKEN not in capsys.readouterr().out


@pytest.mark.parametrize("lines,code", [([f"Your auth token (don't share this!) is {FAKE_TOKEN}"], 2), (["You are logged in as c200aa"], 0)])
def test_save_token_writes_nothing_when_the_cli_fails(tmp_path, monkeypatch, capsys, lines, code):
    env = tmp_path / ".env"
    env.write_text("NESSIE_KEY=fake-n\n", encoding="utf-8")
    monkeypatch.setattr(save_token, "CLI", _fake_cli(tmp_path, lines, code))
    monkeypatch.setattr(save_token, "ENV_PATH", env)
    assert save_token.main() == 1
    out = capsys.readouterr()
    assert FAKE_TOKEN not in out.out + out.err and "Nothing was written" in out.out
    assert env.read_text(encoding="utf-8") == "NESSIE_KEY=fake-n\n"


def test_save_token_never_prints_or_logs_what_it_reads():
    src = (B13 / "save_token.py").read_text(encoding="utf-8")
    printed = re.findall(r"print\((.*)\)", src)
    assert len(printed) >= 5
    for p in printed:
        assert "{token" not in p and "result.std" not in p and "{output" not in p and ", token" not in p, p
    assert "import logging" not in src and "log." not in src


# ---------------------------------------------------------------------------------------------
# T5: the four endpoints


def _serve(db: FakeDb | None = None, wall: list[int] | None = None) -> tuple[FakeDb, feed_mod.Feed]:
    db = db or FakeDb()
    f = _feed(db, wall)
    f.poll_once()
    feed_mod.set_for_tests(f)
    return db, f


def _error(r, status: int, code: str) -> None:
    assert r.status_code == status, r.text
    body = r.json()
    assert set(body) == {"error"} and body["error"]["code"] == code and isinstance(body["error"]["message"], str)


def test_changes_answers_events_and_seq_from_the_snapshot(client, monkeypatch):
    touched = []
    monkeypatch.setattr(bridge, "touch_screen", lambda s, r: touched.append((s, r)) or True)
    _serve()
    r = client.get("/api/b13/changes", params={"after": 0, "screen": "scr_k3x9qa", "role": "tour"})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"events", "seq"} and body["seq"] == 23
    assert [e["type"] for e in body["events"]] == ["swarm.step"] * 3 + ["data.synced"]
    for e in body["events"]:
        _check_shape(e)
    again = client.get("/api/b13/changes", params={"after": 23, "screen": "scr_k3x9qa", "role": "tour"}).json()
    assert again == {"events": [], "seq": 23}
    assert touched == [("scr_k3x9qa", "tour")], "the screen row is refreshed at most every 5 seconds"
    b13_live._touched["scr_k3x9qa"] -= 6
    client.get("/api/b13/changes", params={"after": 23, "screen": "scr_k3x9qa", "role": "tour"})
    assert len(touched) == 2


@pytest.mark.parametrize("params", [
    {"after": 0, "role": "tour"},
    {"after": 0, "screen": "scr_k3x9", "role": "tour"},
    {"after": 0, "screen": "scr_k3x9qa_1", "role": "tour"},
    {"after": 0, "screen": "screen_k3x9qa", "role": "tour"},
    {"after": 0, "screen": "scr_k3x9qa1234567", "role": "tour"},
    {"after": 0, "screen": "scr_k3x9qa"},
    {"after": 0, "screen": "scr_k3x9qa", "role": "owner"},
    {"after": -1, "screen": "scr_k3x9qa", "role": "tour"},
    {"after": "x", "screen": "scr_k3x9qa", "role": "tour"},
])
def test_changes_checks_the_screen_and_the_role(client, params):
    _error(client.get("/api/b13/changes", params=params), 400, "bad_request")


def test_changes_before_the_first_read_answers_empty(client):
    r = client.get("/api/b13/changes", params={"after": 0, "screen": "scr_k3x9qa", "role": "buyer"})
    assert r.status_code == 200 and r.json() == {"events": [], "seq": 0}


def test_status_has_no_token_and_no_credentialed_url(client, monkeypatch):
    monkeypatch.setattr(config, "SPACETIME_URL", "http://owner:pw-in-url@127.0.0.1:3000")
    monkeypatch.setattr(services, "spacetime_reachable", lambda: True)
    _serve()
    r = client.get("/api/b13/status")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"spacetime", "db", "seeded", "screens", "tables", "seq"}
    assert body["spacetime"] is True and body["db"] == config.SPACETIME_DB
    assert body["seeded"] is False, "3 catalog rows, not 54"
    assert body["screens"] == 1 and body["seq"] == 23
    assert body["tables"] == [{"table": t, "rows": len(FIXTURE["tables"][t])} for t in TABLE_NAMES]
    text = r.text
    assert config.SPACETIME_TOKEN not in text and "pw-in-url" not in text and "http" not in text and "Bearer" not in text


def test_status_says_seeded_once_the_catalog_holds_54_pieces(client, monkeypatch):
    monkeypatch.setattr(services, "spacetime_reachable", lambda: True)
    db = FakeDb()
    base = db.tables["catalog"][0]
    db.tables["catalog"] = [{**base, "seq": n, "piece_id": f"pc_{n:02d}"} for n in range(1, 55)]
    _serve(db)
    assert client.get("/api/b13/status").json()["seeded"] is True


def test_status_spacetime_agrees_with_the_service_check_and_the_bridge(client, monkeypatch):
    reachable = [True]
    monkeypatch.setattr(services, "spacetime_reachable", lambda: reachable[0])
    db, f = _serve()
    assert client.get("/api/b13/status").json()["spacetime"] is True
    reachable[0] = False
    assert client.get("/api/b13/status").json()["spacetime"] is False
    reachable[0] = True
    bridge.record([])  # refused by the autouse transport: the bridge backs off
    assert bridge.available() is False
    assert client.get("/api/b13/status").json()["spacetime"] is False
    bridge.reset()
    db.down = True
    f.poll_once()
    body = client.get("/api/b13/status").json()
    assert body["spacetime"] is False and body["seq"] == 23, "the snapshot stays"
    monkeypatch.setattr(config, "SPACETIME_TOKEN", None)
    db.down = False
    f.poll_once()
    assert client.get("/api/b13/status").json()["spacetime"] is False


RECORD_IN = [
    {"id": "evt_user_0001", "type": "order.placed", "at": 5, "source": "user",
     "payload": {"orderId": "ord_user_k3x9qa_1", "pieceId": "pc_01", "channelId": "ch_cindia", "buyerId": "buy_01", "grossCents": 18000, "date": "2026-10-01"}},
    {"id": "evt_user_0002", "type": "support.asked", "at": 6, "source": "user",
     "payload": {"threadId": "thr_user_1", "side": "buyer", "text": "PERSON-WORDS a question", "lang": "en", "contextIds": []}},
    {"id": "evt_user_0003", "type": "listing.requested", "at": 7, "source": "user",
     "payload": {"listingId": "lst_user_k3x9qa_1", "makerId": "mkr_02", "notes": "PERSON-WORDS my notes", "lang": "en"}},
    {"id": "evt_live_141000001", "type": "listing.drafted", "at": 8, "source": "live", "key": "b14-swarm",
     "payload": {"listingId": "lst_user_k3x9qa_1", "makerId": "mkr_02", "title": {"en": "PERSON-WORDS", "zh": "x"}, "summary": {"en": "x", "zh": "x"}}},
    {"id": "evt_live_141000002", "type": "approval.requested", "at": 9, "source": "live", "key": "b14-swarm",
     "payload": {"approvalId": "apr_user_k3x9qa_1", "approval": {"kind": "listing_publish", "subjectIds": ["lst_user_k3x9qa_1"],
                 "overLimit": False, "proposedBy": "cindy", "summary": {"en": "PERSON-WORDS", "zh": "x"}, "decisionDate": "2026-10-01"}}},
    {"id": "evt_user_0004", "type": "approval.granted", "at": 10, "source": "user",
     "payload": {"approvalId": "apr_user_k3x9qa_1", "by": "own_01", "date": "2026-10-01"}},
    {"id": "evt_user_0005", "type": "approval.declined", "at": 11, "source": "user",
     "payload": {"approvalId": "apr_02", "by": "own_01", "reason": {"en": "PERSON-WORDS", "zh": "x"}}},
    {"id": "evt_live_121000003", "type": "listing.indexed", "at": 12, "source": "live", "key": "b12-search",
     "payload": {"listingId": "lst_user_k3x9qa_1", "pieceId": "pc_user_k3x9qa_1", "modelId": "cindia-embed-v1", "embedText": "PERSON-WORDS", "index": "cindia-pieces"}},
    {"id": "evt_0040", "type": "approval.requested", "at": 13, "source": "scripted", "key": "b08-approvals", "payload": {"approvalId": "apr_01"}},
    {"id": "evt_user_0006", "type": "order.placed", "payload": {"orderId": "ORD-1", "pieceId": "pc_01", "channelId": "ch_cindia", "grossCents": 1, "date": "2026-10-01"}},
    {"id": "evt_user_0007", "type": "order.placed", "payload": {"orderId": "ord_user_2", "pieceId": "pc_01", "channelId": "ch_cindia", "grossCents": -5, "date": "2026-10-01"}},
    {"id": "bad id", "type": "approval.granted", "payload": {"approvalId": "apr_01"}},
    {"id": "evt_user_0008", "type": "approval.granted", "payload": {"approvalId": "fup_01"}},
    {"id": "evt_user_0009", "type": "approval.requested", "payload": {"approvalId": "apr_user_3", "approval": {"kind": "buy_a_car", "subjectIds": []}}},
    "not an event",
]
RECORD_OUT = [
    {"id": "evt_user_0001", "type": "order.placed",
     "payload": {"orderId": "ord_user_k3x9qa_1", "pieceId": "pc_01", "channelId": "ch_cindia", "grossCents": 18000, "date": "2026-10-01"}},
    {"id": "evt_user_0003", "type": "listing.requested", "payload": {"listingId": "lst_user_k3x9qa_1", "makerId": "mkr_02"}},
    {"id": "evt_live_141000001", "type": "listing.drafted", "key": "b14-swarm", "payload": {"listingId": "lst_user_k3x9qa_1", "makerId": "mkr_02"}},
    {"id": "evt_live_141000002", "type": "approval.requested", "key": "b14-swarm",
     "payload": {"approvalId": "apr_user_k3x9qa_1", "approval": {"kind": "listing_publish", "subjectIds": ["lst_user_k3x9qa_1"]}}},
    {"id": "evt_user_0004", "type": "approval.granted", "payload": {"approvalId": "apr_user_k3x9qa_1"}},
    {"id": "evt_user_0005", "type": "approval.declined", "payload": {"approvalId": "apr_02"}},
    {"id": "evt_live_121000003", "type": "listing.indexed", "key": "b12-search", "payload": {"listingId": "lst_user_k3x9qa_1", "pieceId": "pc_user_k3x9qa_1"}},
    {"id": "evt_0040", "type": "approval.requested", "key": "b08-approvals", "payload": {"approvalId": "apr_01"}},
]


def test_record_keeps_only_the_mirrored_types_and_strips_text(client, monkeypatch):
    sent = []
    monkeypatch.setattr(bridge, "record", lambda events: sent.append(events) or True)
    r = client.post("/api/b13/record", json={"trigger": None, "events": RECORD_IN})
    assert r.status_code == 200 and r.json() == {"events": []}
    assert sent == [RECORD_OUT], "one record call with only the mirrored fields"
    assert "PERSON-WORDS" not in json.dumps(sent)


def test_record_with_nothing_to_mirror_makes_no_call(client, monkeypatch):
    sent = []
    monkeypatch.setattr(bridge, "record", lambda events: sent.append(events) or True)
    r = client.post("/api/b13/record", json={"trigger": None, "events": [RECORD_IN[1]]})
    assert r.status_code == 200 and r.json() == {"events": []} and sent == []


def test_record_limits_the_body(client, monkeypatch):
    monkeypatch.setattr(bridge, "record", lambda events: True)
    _error(client.post("/api/b13/record", json={"trigger": None, "events": [RECORD_IN[0]] * 51}), 400, "bad_request")
    big = [{**RECORD_IN[1], "payload": {**RECORD_IN[1]["payload"], "text": "x" * 6000}} for _ in range(45)]
    _error(client.post("/api/b13/record", json={"trigger": None, "events": big}), 400, "bad_request")
    _error(client.post("/api/b13/record", json={"trigger": None, "events": "nope"}), 400, "bad_request")
    _error(client.post("/api/b13/record", json={"trigger": None}), 400, "bad_request")
    assert client.post("/api/b13/record", json={"trigger": None, "events": [RECORD_IN[0]] * 50}).status_code == 200


def test_record_answers_503_without_the_token_or_with_spacetime_down(client, monkeypatch):
    body = {"trigger": None, "events": [RECORD_IN[0]]}
    _error(client.post("/api/b13/record", json=body), 503, "upstream_error")  # the autouse transport refuses
    monkeypatch.setattr(config, "SPACETIME_TOKEN", None)
    r = client.post("/api/b13/record", json=body)
    _error(r, 503, "upstream_error")
    assert "SPACETIME_TOKEN" in r.json()["error"]["message"]


def test_seed_is_idempotent_and_single_flight(client, monkeypatch):
    calls, started = [], threading.Event()
    expected = seed_mod.build_payload(FIXTURE["mock"])
    monkeypatch.setattr(seed_mod, "payload_from_file", lambda path=None: seed_mod.build_payload(FIXTURE["mock"]))

    def slow_seed(payload):
        calls.append(payload)
        started.set()
        time.sleep(0.3)
        return True

    monkeypatch.setattr(bridge, "seed_catalog", slow_seed)
    results = []

    def post():
        results.append(client.post("/api/b13/seed", json={"trigger": None, "catalog": [{"piece_id": "pc_99"}]}))

    first = threading.Thread(target=post)
    first.start()
    assert started.wait(2)
    second = threading.Thread(target=post)
    second.start()
    first.join(5)
    second.join(5)
    assert [r.status_code for r in results] == [200, 200] and all(r.json() == {"events": []} for r in results)
    assert len(calls) == 1, "a second seed while one runs shares its result"
    assert calls[0] == expected, "built from the server's own data, never from the request"
    assert client.post("/api/b13/seed", json={"trigger": None}).json() == {"events": []}
    assert len(calls) == 2 and calls[1] == calls[0], "seeding again sends the same payload"


def test_seed_errors(client, monkeypatch):
    monkeypatch.setattr(seed_mod, "payload_from_file", lambda path=None: {"catalog": [], "orders": [], "approvals": []})
    _error(client.post("/api/b13/seed", json={"trigger": None}), 503, "upstream_error")  # refused by the autouse transport

    def missing(path=None):
        raise seed_mod.SeedDataMissing("no file")

    monkeypatch.setattr(seed_mod, "payload_from_file", missing)
    monkeypatch.setattr(bridge, "seed_catalog", lambda payload: True)
    _error(client.post("/api/b13/seed", json={"trigger": None}), 500, "internal")
    monkeypatch.setattr(config, "SPACETIME_TOKEN", None)
    _error(client.post("/api/b13/seed", json={"trigger": None}), 503, "upstream_error")


def test_health_lists_b13(client):
    assert "b13" in client.get("/api/health").json()["routers"]


@pytest.mark.live
@needs_service("spacetime")
def test_live_three_steps_and_an_order_come_back_through_changes(client):
    if not config.SPACETIME_TOKEN:
        pytest.skip("SPACETIME_TOKEN is not set (server/b13_spacetime/save_token.py)")
    tag = "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(6))
    f = feed_mod.Feed()
    f.ensure_started = lambda wait_s=0.0: None  # type: ignore[method-assign]
    feed_mod.set_for_tests(f)
    assert f.poll_once(), "the feed reads the database as the owner"
    before = f.last_seq
    run_id, thread_id = f"run_user_{tag}_1", f"thr_user_{tag}_1"
    assert bridge.start_run(run_id, thread_id, "buyer")
    for n, (agent, kind) in enumerate([("intake", "route"), ("finder", "tool"), ("writer", "reply")], start=1):
        assert bridge.add_step({"runId": run_id, "threadId": thread_id, "stepId": f"stp_user_{tag}_{n}", "agentId": agent,
                                "kind": kind, "summary": {"en": f"Step {n}", "zh": f"第{n}步"}, "ms": 10 * n})
    assert bridge.finish_run(run_id)
    assert bridge.flush(5.0)
    order_id = f"ord_user_{tag}_1"
    assert bridge.record([{"id": f"evt_user_{tag}", "type": "order.placed", "payload": {
        "orderId": order_id, "pieceId": "pc_01", "channelId": "ch_cindia", "grossCents": 18000, "date": "2026-10-01"}}])
    assert f.poll_once()
    body = client.get("/api/b13/changes", params={"after": before, "screen": f"scr_{tag}", "role": "tour"}).json()
    for e in body["events"]:
        _check_shape(e)
    steps = [e["payload"]["stepId"] for e in body["events"] if e["type"] == "swarm.step" and e["payload"]["runId"] == run_id]
    assert steps == [f"stp_user_{tag}_{n}" for n in (1, 2, 3)]
    synced = body["events"][-1]["payload"]
    orders = next(t for t in synced["tables"] if t["table"] == "orders")
    assert {"id": order_id, "label": "person · $180.00"} in orders["newest"]
    assert body["seq"] > before
