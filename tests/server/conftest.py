"""Shared fixtures for the backend tests (api-contract.md, "What the server skeleton provides").

- `client`: FastAPI's TestClient on server.main:app. It starts no server.
- the `live` marker: a test that makes one real call to an outside service.
- `needs_key(name)`: skips a test when that key isn't set.
- `needs_service(name)`: skips a test when a local service is missing, `spacetime` or `model`.
- an autouse fixture: every test not marked `live` sees a fake value for every key in
  server.config and neither `*_AUTH` flag. A test that needs a missing key sets it to None itself.
  Live tests keep the real values, and never assert on headers or print a request.

Upgrade tests import the helpers with `from conftest import needs_key, needs_service`.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from server import config as server_config  # noqa: E402
from server import services as server_services  # noqa: E402
from server.main import app  # noqa: E402

# Claude clients in this process reach the real API, whatever the shell's ANTHROPIC_BASE_URL says,
# as uvicorn does through scripts/server.mjs.
os.environ["ANTHROPIC_BASE_URL"] = server_config.CLAUDE_BASE_URL

# Plainly fake, and shaped like no real key, so the secrets scan never matches them.
FAKE_KEYS = {attr: f"fake-{attr.lower().replace('_', '-')}-for-tests" for attr in server_config.KEY_ATTRS}

SERVICES = {
    "spacetime": server_services.spacetime_reachable,
    "model": server_services.model_present,
}


def pytest_configure(config):
    config.addinivalue_line("markers", "live: makes one real call to an outside service, skipped when its key or service is missing")


@pytest.fixture(autouse=True)
def _fake_keys(request, monkeypatch):
    """Fake keys and no proxy flags for every test not marked live."""
    if request.node.get_closest_marker("live") is None:
        for attr, value in FAKE_KEYS.items():
            monkeypatch.setattr(server_config, attr, value)
        for attr in server_config.AUTH_ATTRS:
            monkeypatch.setattr(server_config, attr, None)
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def needs_key(name: str):
    """Decorator: skip the test when the key isn't set. Never reads the value into the test."""
    return pytest.mark.skipif(not server_config.has_key(name), reason=f"{name} is not set")


def needs_service(name: str):
    """Decorator: skip the test when a local service is missing: `spacetime` (SpacetimeDB answers
    on SPACETIME_URL) or `model` (the trained model is in MODEL_DIR)."""
    if name not in SERVICES:
        raise ValueError(f"unknown service {name!r}, expected one of {sorted(SERVICES)}")
    return pytest.mark.skipif(not SERVICES[name](), reason=f"{name} is not available")
