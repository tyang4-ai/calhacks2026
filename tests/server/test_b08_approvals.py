"""B08 · approvals on a second screen. Contract tests with FastAPI's TestClient, no server, no network.

B08 needs no key. The one live-marked test reads /api/b08/status from the API on localhost:8000 and
skips when that API isn't running or hasn't loaded b08.
"""

from __future__ import annotations

import re
import threading
import time

import pytest

from server.routers import b08_approvals

EVT_LIVE = re.compile(r"^evt_live_\d+$")


@pytest.fixture(autouse=True)
def clean_store():
    b08_approvals.reset_for_tests()
    yield
    b08_approvals.reset_for_tests()


def scripted(event_type: str, payload: dict, at: int = 36000, source: str = "scripted") -> dict:
    e = {"id": "evt_0101", "type": event_type, "at": at, "source": source, "payload": payload}
    if source != "user":
        e["key"] = "b08-approvals"
    return e


def register(client, approval_id: str = "apr_01", at: int = 36000):
    trigger = scripted("approval.requested", {"approvalId": approval_id}, at=at)
    return client.post("/api/b08/approvals", json={"trigger": trigger, "approvalId": approval_id})


def check_envelope(e: dict, event_type: str, at: int) -> None:
    assert set(e) == {"id", "type", "at", "source", "key", "payload"}
    assert EVT_LIVE.match(e["id"])
    assert e["type"] == event_type
    assert e["at"] == at
    assert e["source"] == "live"
    assert e["key"] == "b08-approvals"


def check_error(res, status: int, code: str) -> None:
    assert res.status_code == status
    body = res.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == code
    assert isinstance(body["error"]["message"], str) and body["error"]["message"]


def test_health_lists_b08(client):
    assert "b08" in client.get("/api/health").json()["routers"]


def test_register_returns_the_live_twin(client):
    res = register(client, at=36000)
    assert res.status_code == 200
    events = res.json()["events"]
    assert len(events) == 1
    check_envelope(events[0], "approval.requested", 36000)
    assert events[0]["payload"] == {"approvalId": "apr_01"}


def test_register_with_null_trigger_uses_at_zero(client):
    res = client.post("/api/b08/approvals", json={"trigger": None, "approvalId": "apr_02"})
    assert res.status_code == 200
    check_envelope(res.json()["events"][0], "approval.requested", 0)


def test_registered_approval_is_listed_pending(client):
    register(client, "apr_01")
    register(client, "apr_02", at=38600)
    events = client.get("/api/b08/approvals", params={"status": "pending"}).json()["events"]
    assert [e["payload"]["approvalId"] for e in events] == ["apr_01", "apr_02"]
    for e in events:
        assert e["type"] == "approval.requested"
        assert e["source"] == "live"


def test_register_twice_keeps_one_and_never_reopens(client):
    first = register(client).json()["events"][0]
    again = register(client).json()["events"][0]
    assert again == first
    client.post("/api/b08/approvals/apr_01/decision", json={"trigger": None, "decision": "granted"})
    register(client)
    assert client.get("/api/b08/approvals?status=pending").json()["events"] == []


def test_grant_from_the_owner(client):
    register(client)
    trigger = scripted("approval.granted", {"approvalId": "apr_01", "by": "own_01", "date": "2026-10-01"}, at=39000, source="user")
    res = client.post(
        "/api/b08/approvals/apr_01/decision",
        json={"trigger": trigger, "decision": "granted", "reason": {"en": "", "zh": ""}},
    )
    assert res.status_code == 200
    events = res.json()["events"]
    assert len(events) == 1
    check_envelope(events[0], "approval.granted", 39000)
    assert events[0]["payload"] == {"approvalId": "apr_01", "by": "own_01", "date": "2026-10-01"}
    # No longer pending.
    assert client.get("/api/b08/approvals?status=pending").json()["events"] == []


def test_grant_with_null_trigger_gets_a_date(client):
    register(client)
    res = client.post("/api/b08/approvals/apr_01/decision", json={"trigger": None, "decision": "granted"})
    e = res.json()["events"][0]
    check_envelope(e, "approval.granted", 0)
    assert re.match(r"^\d{4}-\d{2}-\d{2}$", e["payload"]["date"])
    assert e["payload"]["by"] == "own_01"


def test_decline_with_reason(client):
    register(client, "apr_02")
    reason = {"en": "Not yet, wait for the gallery.", "zh": "先等画廊回复。"}
    res = client.post(
        "/api/b08/approvals/apr_02/decision",
        json={"trigger": None, "decision": "declined", "reason": reason},
    )
    assert res.status_code == 200
    e = res.json()["events"][0]
    check_envelope(e, "approval.declined", 0)
    assert e["payload"] == {"approvalId": "apr_02", "by": "own_01", "reason": reason}


def test_decline_reason_from_the_trigger(client):
    register(client, "apr_02")
    reason = {"en": "Not yet", "zh": "暂不"}
    trigger = scripted("approval.declined", {"approvalId": "apr_02", "by": "own_01", "reason": reason}, source="user")
    res = client.post(
        "/api/b08/approvals/apr_02/decision",
        json={"trigger": trigger, "decision": "declined", "reason": {"en": "", "zh": ""}},
    )
    assert res.json()["events"][0]["payload"]["reason"] == reason


def test_decline_without_reason_is_bad_request(client):
    register(client, "apr_02")
    res = client.post("/api/b08/approvals/apr_02/decision", json={"trigger": None, "decision": "declined"})
    check_error(res, 400, "bad_request")


def test_second_decision_returns_the_first(client):
    register(client)
    first = client.post("/api/b08/approvals/apr_01/decision", json={"trigger": None, "decision": "granted"})
    second = client.post(
        "/api/b08/approvals/apr_01/decision",
        json={"trigger": None, "decision": "declined", "reason": {"en": "No", "zh": "不"}},
    )
    assert second.status_code == 200
    assert second.json() == first.json()
    assert second.json()["events"][0]["type"] == "approval.granted"


def test_wait_times_out_with_empty_events(client):
    register(client)
    t0 = time.monotonic()
    res = client.get("/api/b08/approvals/apr_01", params={"wait": 1})
    elapsed = time.monotonic() - t0
    assert res.status_code == 200
    assert res.json() == {"events": []}
    assert 0.9 <= elapsed < 3


def test_wait_returns_a_decision_made_earlier(client):
    register(client)
    client.post("/api/b08/approvals/apr_01/decision", json={"trigger": None, "decision": "granted"})
    t0 = time.monotonic()
    events = client.get("/api/b08/approvals/apr_01?wait=6").json()["events"]
    assert time.monotonic() - t0 < 1
    assert events[0]["type"] == "approval.granted"
    assert events[0]["payload"]["by"] == "own_01"


def test_wait_wakes_on_the_owners_decision(client):
    register(client)

    def tap():
        time.sleep(0.4)
        client.post("/api/b08/approvals/apr_01/decision", json={"trigger": None, "decision": "granted"})

    t = threading.Thread(target=tap)
    t0 = time.monotonic()
    t.start()
    res = client.get("/api/b08/approvals/apr_01", params={"wait": 5})
    elapsed = time.monotonic() - t0
    t.join()
    events = res.json()["events"]
    assert len(events) == 1
    assert events[0]["type"] == "approval.granted"
    assert events[0]["payload"]["by"] == "own_01"
    assert elapsed < 4


def test_owner_connected_false_then_true_after_a_poll(client):
    assert client.get("/api/b08/status").json() == {"ownerConnected": False}
    client.get("/api/b08/approvals?status=pending")
    assert client.get("/api/b08/status").json() == {"ownerConnected": True}


def test_the_console_wait_does_not_count_as_an_owner(client):
    register(client)
    client.get("/api/b08/approvals/apr_01?wait=0")
    assert client.get("/api/b08/status").json() == {"ownerConnected": False}


def test_owner_connection_expires(client, monkeypatch):
    client.get("/api/b08/approvals?status=pending")
    real = time.monotonic()
    monkeypatch.setattr(b08_approvals.time, "monotonic", lambda: real + 11)
    assert client.get("/api/b08/status").json() == {"ownerConnected": False}


# Errors, in the contract's shape.


def test_unknown_approval_is_not_found(client):
    check_error(client.post("/api/b08/approvals/apr_99/decision", json={"trigger": None, "decision": "granted"}), 404, "not_found")
    check_error(client.get("/api/b08/approvals/apr_99?wait=0"), 404, "not_found")


def test_bad_bodies_are_bad_request(client):
    check_error(client.post("/api/b08/approvals", json={"trigger": None}), 400, "bad_request")
    check_error(client.post("/api/b08/approvals", json={"trigger": None, "approvalId": "nope"}), 400, "bad_request")
    register(client)
    check_error(client.post("/api/b08/approvals/apr_01/decision", json={"trigger": None, "decision": "maybe"}), 400, "bad_request")
    check_error(client.get("/api/b08/approvals?status=granted"), 400, "bad_request")
    check_error(client.get("/api/b08/approvals/apr_01?wait=-1"), 400, "bad_request")


def test_trigger_must_match_the_request(client):
    wrong_id = scripted("approval.requested", {"approvalId": "apr_02"})
    check_error(client.post("/api/b08/approvals", json={"trigger": wrong_id, "approvalId": "apr_01"}), 400, "bad_request")
    wrong_type = scripted("approval.granted", {"approvalId": "apr_01", "by": "own_01", "date": "2026-10-01"})
    check_error(client.post("/api/b08/approvals", json={"trigger": wrong_type, "approvalId": "apr_01"}), 400, "bad_request")
    register(client)
    grant = scripted("approval.granted", {"approvalId": "apr_01", "by": "own_01", "date": "2026-10-01"}, source="user")
    res = client.post(
        "/api/b08/approvals/apr_01/decision",
        json={"trigger": grant, "decision": "declined", "reason": {"en": "No", "zh": "不"}},
    )
    check_error(res, 400, "bad_request")
    # Nothing was decided by the bad request.
    assert client.get("/api/b08/approvals/apr_01?wait=0").json() == {"events": []}


def test_only_the_decision_route_decides(client):
    """Registering, listing, waiting and status never grant an approval."""
    register(client)
    client.get("/api/b08/approvals?status=pending")
    client.get("/api/b08/approvals/apr_01?wait=0")
    client.get("/api/b08/status")
    register(client)
    assert [e["payload"]["approvalId"] for e in client.get("/api/b08/approvals?status=pending").json()["events"]] == ["apr_01"]


@pytest.mark.live
def test_live_status_against_running_api():
    """One real call to the API on localhost:8000 (B08 needs no key). Skips when the API isn't up.

    It only reads the status, so it never adds an approval to the owner's pending list."""
    httpx = pytest.importorskip("httpx")
    try:
        health = httpx.get("http://localhost:8000/api/health", timeout=3).json()
    except Exception:
        pytest.skip("the API on localhost:8000 isn't running")
    if "b08" not in health.get("routers", []):
        pytest.skip("the running API hasn't loaded b08 yet")
    res = httpx.get("http://localhost:8000/api/b08/status", timeout=3)
    assert res.status_code == 200
    assert isinstance(res.json()["ownerConnected"], bool)


def test_ids_are_unique(client):
    ids = set()
    for n in range(1, 4):
        ids.add(register(client, f"apr_0{n}").json()["events"][0]["id"])
        ids.add(client.post(f"/api/b08/approvals/apr_0{n}/decision", json={"trigger": None, "decision": "granted"}).json()["events"][0]["id"])
    assert len(ids) == 6
