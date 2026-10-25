"""B13-live tests (docs/plans/B13-live.md).

T1, the SpacetimeDB module in server/b13_spacetime/module/ and its README:
- static checks on the module's packages, its ten private tables, the reducers' arguments and the
  owner check, and on the README's commands. They read the files, so they run everywhere.
- a build with the CLI (`spacetime build`), skipped while `spacetime` isn't on the path or the
  module's node_modules is missing (the orchestrator installs the packages after T1).
- one live check, under needs_service("spacetime"), that an anonymous caller can neither read a
  table nor call a reducer on the published database. It skips until `cindia` is published.

T2 to T5 add their own tests to this file.
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
