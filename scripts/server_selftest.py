"""The server self-test, run by `npm run test:server` after pytest. Starts no server, never prints a key.

1. GET /api/health with FastAPI's TestClient: ok, version, `keys` with exactly the five names and
   `services` with exactly the two, all booleans, `routers` a list, and the not_found error shape.
2. A scan of server/, src/ and scripts/ (test files left out) for strings shaped like a Claude
   model ID. Any ID outside config.ALLOWED_MODELS fails, naming the file (fix-plan 1.4).
3. Health and config in fresh Python processes with a clean environment and no .env:
   - no keys: every key is false, and with the services pointed at nothing every service is false,
   - only CINDIA_ANTHROPIC_API_KEY (a fake value): keys.anthropic is true and nothing else is,
   - ELASTIC_URL with ELASTIC_AUTH=proxy and no key: keys.elastic is true, elastic_headers() is {},
   - a router that imports a missing module: the server still starts, and the log names the module
     next to the exception's type and never the message.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from server import config  # noqa: E402
from server.main import app  # noqa: E402

KEY_NAMES = {"anthropic", "nessie", "elastic", "apify", "hf"}
SERVICE_NAMES = {"spacetime", "model"}

# A Claude model ID: "claude-" and a name with at least one digit in it, such as claude-<name>-<n>.
MODEL_ID_RE = re.compile(r"(?<![A-Za-z0-9_-])claude-[a-z0-9][a-z0-9.-]*")
SCAN_DIRS = ("server", "src", "scripts")
SCAN_EXTS = {".py", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".jsonl", ".md", ".txt", ".toml", ".yaml", ".yml", ".html", ".css"}
SKIP_DIRS = {"node_modules", "__pycache__", ".venv", "dist", "target", ".pytest_cache"}
MAX_BYTES = 8 * 1024 * 1024


def is_test_file(name: str) -> bool:
    return (
        name == "conftest.py"
        or name.startswith("test_")
        or name.endswith("_test.py")
        or re.search(r"\.(test|spec)\.[cm]?[jt]sx?$", name) is not None
    )


def model_id_problems() -> tuple[int, list[str]]:
    """Files scanned, and one problem per file with a model ID outside ALLOWED_MODELS."""
    problems: list[str] = []
    scanned = 0
    for top in SCAN_DIRS:
        base = ROOT / top
        if not base.is_dir():
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for name in filenames:
                path = Path(dirpath) / name
                if path.suffix not in SCAN_EXTS or is_test_file(name):
                    continue
                try:
                    if path.stat().st_size > MAX_BYTES:
                        continue
                    text = path.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    continue
                scanned += 1
                bad = set()
                for m in MODEL_ID_RE.finditer(text):
                    found = m.group(0).rstrip(".-")
                    if any(ch.isdigit() for ch in found) and found not in config.ALLOWED_MODELS:
                        bad.add(found)
                if bad:
                    rel = path.relative_to(ROOT).as_posix()
                    problems.append(f"{rel} names a model outside ALLOWED_MODELS: {', '.join(sorted(bad))}")
    return scanned, problems


def health_problems(client: TestClient) -> tuple[dict, list[str]]:
    problems: list[str] = []
    r = client.get("/api/health")
    if r.status_code != 200:
        problems.append(f"status {r.status_code}")
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if body.get("ok") is not True:
        problems.append("ok is not true")
    if body.get("version") != "0.1.0":
        problems.append("version is not 0.1.0")
    keys = body.get("keys")
    if not isinstance(keys, dict) or set(keys) != KEY_NAMES or not all(isinstance(v, bool) for v in keys.values()):
        problems.append("keys is not { anthropic, nessie, elastic, apify, hf } as booleans")
    services = body.get("services")
    if not isinstance(services, dict) or set(services) != SERVICE_NAMES or not all(isinstance(v, bool) for v in services.values()):
        problems.append("services is not { spacetime, model } as booleans")
    if not isinstance(body.get("routers"), list):
        problems.append("routers is not a list")

    bad = client.get("/api/nope")
    err = bad.json().get("error", {}) if bad.headers.get("content-type", "").startswith("application/json") else {}
    if bad.status_code != 404 or err.get("code") != "not_found":
        problems.append("an unknown path doesn't answer with the not_found error shape")
    return body, problems


# Runs in one fresh Python started with a clean environment. .env is never loaded, one router
# fails to import a missing module, and it prints booleans only. The first scenario is the import
# itself. Each later one sets its variables and reloads server.config, which main.py reads at call time.
CHILD = r"""
import importlib, io, json, logging, os, pkgutil, sys
sys.path.insert(0, sys.argv[1])
scenarios = json.loads(sys.argv[2])
import dotenv
dotenv.load_dotenv = lambda *a, **k: False
real_iter, real_import = pkgutil.iter_modules, importlib.import_module
def fake_iter(path=None, prefix=""):
    yield from real_iter(path, prefix)
    if path and any(str(p).replace("\\", "/").endswith("server/routers") for p in path):
        yield pkgutil.ModuleInfo(None, "b99_selftest", False)
def fake_import(name, package=None):
    if name == "server.routers.b99_selftest":
        raise ModuleNotFoundError("No module named zz_selftest_missing (MESSAGE-MUST-NOT-BE-LOGGED)", name="zz_selftest_missing")
    return real_import(name, package)
pkgutil.iter_modules, importlib.import_module = fake_iter, fake_import
captured = io.StringIO()
logging.getLogger("cindia").addHandler(logging.StreamHandler(captured))  # main.py then adds none
import server.main as main
from fastapi.testclient import TestClient
from server import config, services
client = TestClient(main.app)
base = dict(os.environ)
out = []
for i, extra in enumerate(scenarios):
    if i:
        os.environ.clear()
        os.environ.update(base)
        os.environ.update(extra)
        importlib.reload(config)
        services.clear_cache()
    r = client.get("/api/health")
    body = r.json()
    out.append({
        "status": r.status_code,
        "keys": body.get("keys"),
        "services": body.get("services"),
        "routers": body.get("routers"),
        "elasticHeadersEmpty": config.elastic_headers() == {},
    })
logs = captured.getvalue()
print(json.dumps({
    "results": out,
    "logNamesModule": "b99_selftest failed to load: ModuleNotFoundError, missing module zz_selftest_missing" in logs,
    "logHasMessage": "MESSAGE-MUST-NOT-BE-LOGGED" in logs,
}))
"""


def run_child(scenarios: list[dict[str, str]]) -> dict | None:
    env = {k: v for k, v in os.environ.items() if k in ("PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE")}
    env.update({"PYTHONDONTWRITEBYTECODE": "1", "PYTHONIOENCODING": "utf-8"})
    try:
        r = subprocess.run(
            [sys.executable, "-c", CHILD, str(ROOT), json.dumps(scenarios)],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired:
        return None
    lines = [ln for ln in r.stdout.splitlines() if ln.startswith("{")]
    if r.returncode != 0 or not lines:
        return None
    return json.loads(lines[-1])


def clean_env_problems() -> list[str]:
    nowhere = {"SPACETIME_URL": "http://127.0.0.1:9", "CINDIA_MODEL_DIR": str(ROOT / "artifacts" / "selftest-no-model")}
    scenarios = [
        {},
        nowhere,
        {"CINDIA_ANTHROPIC_API_KEY": "fake-cindia-anthropic-for-selftest", **nowhere},
        {"ELASTIC_URL": "https://selftest.invalid", "ELASTIC_AUTH": "proxy", **nowhere},
        {"ELASTIC_AUTH": "proxy", **nowhere},
        {"APIFY_AUTH": "proxy", **nowhere},
    ]
    child = run_child(scenarios)
    if child is None or len(child.get("results", [])) != len(scenarios):
        return ["with a clean environment and a broken router the server didn't start"]
    a, b, c, d, e, f = child["results"]
    problems: list[str] = []
    if any(x["status"] != 200 for x in child["results"]):
        problems.append("/api/health failed in a clean-environment scenario")
    if any(a["keys"].values()):
        problems.append(f"with no environment some keys are true: {sorted(k for k, v in a['keys'].items() if v)}")
    if any(b["services"].values()) or any(b["keys"].values()):
        problems.append("with no keys and the services pointed at nothing, something is true")
    if c["keys"] != {"anthropic": True, "nessie": False, "elastic": False, "apify": False, "hf": False}:
        problems.append("with only CINDIA_ANTHROPIC_API_KEY set, keys.anthropic isn't the only true key")
    if d["keys"].get("elastic") is not True or not d["elasticHeadersEmpty"]:
        problems.append("ELASTIC_URL with ELASTIC_AUTH=proxy doesn't give keys.elastic true and empty elastic_headers()")
    if e["keys"].get("elastic") is not False:
        problems.append("ELASTIC_AUTH=proxy without ELASTIC_URL counts as an Elastic key")
    if f["keys"].get("apify") is not True:
        problems.append("APIFY_AUTH=proxy doesn't count as an Apify token")
    if not child["logNamesModule"]:
        problems.append("a router with a missing import isn't logged with the missing module's name")
    if child["logHasMessage"]:
        problems.append("a router's import error message reached the log")
    if "b99" in (a["routers"] or []):
        problems.append("a router that failed to load is listed in routers")
    return problems


def main() -> int:
    client = TestClient(app)
    body, problems = health_problems(client)
    scanned, model_problems = model_id_problems()
    problems += model_problems
    problems += clean_env_problems()

    if problems:
        print("server self-test: FAIL, " + "; ".join(problems))
        return 1
    print(
        f"server self-test: PASS, ok, version {body['version']}, keys {sorted(body['keys'])} and services "
        f"{sorted(body['services'])} as booleans, routers {body['routers']}, {scanned} files scanned with no model "
        f"outside {sorted(config.ALLOWED_MODELS)}, clean-environment health, proxy flags and router load errors checked"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
