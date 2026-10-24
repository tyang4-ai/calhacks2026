"""B01 · the matcher. Contract tests for POST /api/b01/reconcile (api-contract.md, B01).

The fixture b01_month.json holds September's records from src/mock, plus the scripted matches and
flag the month timeline plays, so the matcher is checked against exactly what the month view shows.
"""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path

import httpx
import pytest

from server.routers.b01_match import reconcile_month

FIXTURE = json.loads((Path(__file__).parent / "b01_month.json").read_text(encoding="utf-8"))
URL = "/api/b01/reconcile"
LIVE_ID = re.compile(r"^evt_live_\d+$")
MATCH_KINDS = {"one_to_one", "bundled", "refund_netted", "carried_over"}


def body(trigger=None, records=None):
    return {"trigger": trigger, "monthId": FIXTURE["monthId"], "records": copy.deepcopy(records or FIXTURE["records"])}


def scripted_match(kind: str) -> dict:
    return next(m for m in FIXTURE["scripted"]["matches"] if m["kind"] == kind)


def trigger_for(payload: dict, type_: str = "match.made", at: int = 4321) -> dict:
    return {"id": "evt_m_0042", "type": type_, "at": at, "source": "scripted", "key": "b01-match", "payload": payload}


def check_event(e: dict) -> None:
    """The envelope and payload from events.md, for the two types B01 returns."""
    assert set(e) == {"id", "type", "at", "source", "key", "payload"}
    assert LIVE_ID.match(e["id"])
    assert e["source"] == "live" and e["key"] == "b01-match"
    assert isinstance(e["at"], (int, float))
    p = e["payload"]
    if e["type"] == "match.made":
        assert set(p) <= {"matchId", "kind", "recordIds", "intoMonthId"}
        assert isinstance(p["matchId"], str) and p["matchId"]
        assert p["kind"] in MATCH_KINDS
        assert p["recordIds"] and all(isinstance(x, str) for x in p["recordIds"])
        assert ("intoMonthId" in p) == (p["kind"] == "carried_over")
    elif e["type"] == "flag.raised":
        assert set(p) == {"flagId", "kind", "recordIds", "expectedCents", "actualCents", "deltaCents"}
        assert p["kind"] == "short_payment"
        for k in ("expectedCents", "actualCents", "deltaCents"):
            assert isinstance(p[k], int) and not isinstance(p[k], bool)
        assert p["deltaCents"] == p["expectedCents"] - p["actualCents"]
    else:
        pytest.fail(f"unexpected event type {e['type']}")


def events_of(client, **kw) -> list[dict]:
    r = client.post(URL, json=body(**kw))
    assert r.status_code == 200, r.text
    data = r.json()
    assert set(data) == {"events"}
    return data["events"]


def test_health_lists_b01(client):
    assert "b01" in client.get("/api/health").json()["routers"]


def test_fixture_month_matches_the_scripted_month(client):
    events = events_of(client)
    for e in events:
        check_event(e)
    matches = [e["payload"] for e in events if e["type"] == "match.made"]
    flags = [e["payload"] for e in events if e["type"] == "flag.raised"]

    # Every scripted match, same kind and same records, anchored on the same payout.
    got = {m["recordIds"][0]: m for m in matches}
    for s in FIXTURE["scripted"]["matches"]:
        m = got[s["recordIds"][0]]
        assert (m["kind"], m["recordIds"], m.get("intoMonthId")) == (s["kind"], s["recordIds"], s.get("intoMonthId"))
    assert len(matches) == len(FIXTURE["scripted"]["matches"])

    bundled = [m for m in matches if m["kind"] == "bundled"]
    assert len(bundled) == 1 and bundled[0]["recordIds"][1:] == ["ord_015", "ord_016", "ord_017"]

    netted = [m for m in matches if m["kind"] == "refund_netted"]
    assert len(netted) == 1 and "rfd_001" in netted[0]["recordIds"]
    # The refund is for ord_020, which the netted payout's order (ord_021) pays around.
    refund = next(r for r in FIXTURE["records"]["refunds"] if r["id"] == "rfd_001")
    assert refund["orderId"] == "ord_020"

    late = [m for m in matches if m["kind"] == "carried_over"]
    assert len(late) == 1 and late[0]["recordIds"][1:] == ["ord_025", "ord_026"] and late[0]["intoMonthId"] == "2026-10"

    cindia = {o["id"] for o in FIXTURE["records"]["orders"] if o["channelId"] == "ch_cindia"}
    one = {m["recordIds"][1] for m in matches if m["kind"] == "one_to_one"}
    assert cindia <= one

    assert len(flags) == 1
    deposit = next(t for t in FIXTURE["records"]["bankTxns"] if t["memo"].startswith("Gallery payment"))
    f = flags[0]
    assert f["recordIds"] == ["ctr_gallery_01", "stm_gallery_2026_09", deposit["id"]]
    assert (f["expectedCents"], f["actualCents"], f["deltaCents"]) == (204000, 170000, 34000)


def test_events_are_in_date_order_with_unique_ids(client):
    events = events_of(client)
    payouts = {p["id"]: p["date"] for p in FIXTURE["records"]["payouts"]}
    txns = {t["id"]: t["date"] for t in FIXTURE["records"]["bankTxns"]}
    dates = [payouts[e["payload"]["recordIds"][0]] if e["type"] == "match.made" else txns[e["payload"]["recordIds"][2]] for e in events]
    assert dates == sorted(dates)
    assert len({e["id"] for e in events}) == len(events)
    assert all(e["at"] == 0 for e in events)  # no trigger, so at is 0


def test_trigger_keeps_scripted_ids_and_at(client):
    s = scripted_match("bundled")
    events = events_of(client, trigger=trigger_for(s, at=4321))
    assert all(e["at"] == 4321 for e in events)
    twin = next(e["payload"] for e in events if e["type"] == "match.made" and e["payload"]["recordIds"][0] == s["recordIds"][0])
    assert twin["matchId"] == s["matchId"]
    others = [e["payload"]["matchId"] for e in events if e["type"] == "match.made" and e["payload"] is not twin]
    assert all(m.startswith("mat_live_") for m in others)

    flag = FIXTURE["scripted"]["flags"][0]
    events = events_of(client, trigger=trigger_for(flag, "flag.raised"))
    got = next(e["payload"] for e in events if e["type"] == "flag.raised")
    assert got["flagId"] == flag["flagId"]


def test_nothing_to_match_returns_an_empty_list(client):
    """The fallback path: an empty list means the registry plays the scripted event."""
    assert events_of(client, records={"orders": [], "payouts": [], "refunds": [], "statements": [], "bankTxns": [], "contracts": []}) == []


def test_gallery_paid_in_full_raises_no_flag():
    records = copy.deepcopy(FIXTURE["records"])
    for c in records["contracts"]:
        c["commissionBps"] = 5000  # the statement's own rate, so nothing is owed
    out = reconcile_month(FIXTURE["monthId"], records)
    assert not [e for e in out if e["type"] == "flag.raised"]


def test_matcher_does_not_read_payout_order_ids():
    records = copy.deepcopy(FIXTURE["records"])
    for p in records["payouts"]:
        p["orderIds"], p["refundIds"] = [], []
    out = reconcile_month(FIXTURE["monthId"], records)
    assert len([e for e in out if e["type"] == "match.made"]) == len(FIXTURE["scripted"]["matches"])


def assert_error(r, status: int, code: str) -> None:
    assert r.status_code == status
    err = r.json()
    assert set(err) == {"error"} and set(err["error"]) == {"code", "message"}
    assert err["error"]["code"] == code
    assert isinstance(err["error"]["message"], str) and err["error"]["message"]


def test_missing_records_is_bad_request(client):
    assert_error(client.post(URL, json={"trigger": None, "monthId": "2026-09"}), 400, "bad_request")


def test_bad_month_is_bad_request(client):
    assert_error(client.post(URL, json={**body(), "monthId": "September"}), 400, "bad_request")


def test_malformed_record_is_bad_request(client):
    records = copy.deepcopy(FIXTURE["records"])
    records["payouts"][0]["netCents"] = "lots"
    r = client.post(URL, json=body(records=records))
    assert_error(r, 400, "bad_request")
    assert "pay_001" in r.json()["error"]["message"]


def test_not_json_is_bad_request(client):
    r = client.post(URL, content=b"not json", headers={"Content-Type": "application/json"})
    assert_error(r, 400, "bad_request")


@pytest.mark.live
def test_live_running_server():
    """One real call to the API the orchestrator runs on 8000. B01 needs no key, so this skips only
    when nothing answers there."""
    try:
        r = httpx.post(f"http://localhost:8000{URL}", json=body(), timeout=5)
    except httpx.HTTPError:
        pytest.skip("the API server on port 8000 isn't running")
    if r.status_code == 404:
        pytest.skip("the API server on port 8000 hasn't loaded b01 yet")
    assert r.status_code == 200
    events = r.json()["events"]
    for e in events:
        check_event(e)
    assert any(e["type"] == "flag.raised" and e["payload"]["deltaCents"] == 34000 for e in events)
