"""Checks GET /api/health with FastAPI's TestClient. Starts no server. Never prints a key."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from server.main import app  # noqa: E402


def main() -> int:
    client = TestClient(app)
    r = client.get("/api/health")
    problems = []
    if r.status_code != 200:
        problems.append(f"status {r.status_code}")
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if body.get("ok") is not True:
        problems.append("ok is not true")
    if body.get("version") != "0.1.0":
        problems.append("version is not 0.1.0")
    keys = body.get("keys")
    if not isinstance(keys, dict) or set(keys) != {"anthropic", "nessie"} or not all(isinstance(v, bool) for v in keys.values()):
        problems.append("keys is not { anthropic: bool, nessie: bool }")
    if not isinstance(body.get("routers"), list):
        problems.append("routers is not a list")

    bad = client.get("/api/nope")
    err = bad.json().get("error", {}) if bad.headers.get("content-type", "").startswith("application/json") else {}
    if bad.status_code != 404 or err.get("code") != "not_found":
        problems.append("an unknown path doesn't answer with the not_found error shape")

    if problems:
        print("server self-test: FAIL, " + "; ".join(problems))
        return 1
    print(f"server self-test: PASS, ok, version {body['version']}, keys as booleans, routers {body['routers']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
