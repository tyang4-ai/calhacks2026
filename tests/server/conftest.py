"""Shared fixtures for the backend tests (api-contract.md, "What the server skeleton provides").

- `client`: FastAPI's TestClient on server.main:app. It starts no server.
- the `live` marker: a test that makes one real call to Claude or Nessie.
- `needs_key(name)`: skips a test when that key isn't set.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from server import config as server_config  # noqa: E402
from server.main import app  # noqa: E402


def pytest_configure(config):
    config.addinivalue_line("markers", "live: makes one real call to Claude or Nessie, skipped when its key is missing")


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def needs_key(name: str):
    """Decorator: skip the test when the key isn't set. Never reads the value into the test."""
    return pytest.mark.skipif(not server_config.has_key(name), reason=f"{name} is not set")
