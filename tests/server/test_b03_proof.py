"""B03 · the proof panel scores the matcher. Contract tests for POST /api/b03/score.

The fixture b03_month.json is September's records and the answer key, dumped from src/mock.
Nothing here makes a network call except the one test marked live, which posts to the running
API on localhost:8000 and skips when it isn't up.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from server.routers.b03_proof import PlantedError, score

FIXTURE = Path(__file__).with_name("b03_month.json")
ENVELOPE = {"id", "type", "at", "source", "key", "payload"}

TRIGGER = {
    "id": "evt_0099",
    "type": "proof.scored",
    "at": 59000,
    "source": "scripted",
    "key": "b03-proof",
    "payload": {
        "caught": 4,
        "total": 4,
        "results": [{"errorId": f"err_0{i}", "caught": True} for i in range(1, 5)],
    },
}


def load_month() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def body_for(month: dict, trigger=TRIGGER) -> dict:
    return {"trigger": trigger, "monthId": month["monthId"], "records": month["records"], "answerKey": month["answerKey"]}


def check_proof_event(e: dict) -> None:
    """The envelope and the proof.scored payload from events.md."""
    assert set(e) == ENVELOPE
    assert e["type"] == "proof.scored"
    assert e["source"] == "live"
    assert e["key"] == "b03-proof"
    assert isinstance(e["id"], str) and e["id"].startswith("evt_live_") and e["id"][9:].isdigit()
    assert isinstance(e["at"], (int, float)) and not isinstance(e["at"], bool)
    p = e["payload"]
    assert set(p) == {"caught", "total", "results"}
    assert type(p["caught"]) is int and type(p["total"]) is int
    assert isinstance(p["results"], list) and len(p["results"]) == p["total"]
    for r in p["results"]:
        assert set(r) == {"errorId", "caught"}
        assert isinstance(r["errorId"], str) and type(r["caught"]) is bool
    assert p["caught"] == sum(1 for r in p["results"] if r["caught"])


def results_by_id(e: dict) -> dict[str, bool]:
    return {r["errorId"]: r["caught"] for r in e["payload"]["results"]}


# --- The route ---------------------------------------------------------------------------------


def test_fixture_month_scores_4_of_4(client):
    res = client.post("/api/b03/score", json=body_for(load_month()))
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"events"} and len(body["events"]) == 1
    e = body["events"][0]
    check_proof_event(e)
    assert e["at"] == 59000
    assert e["payload"]["caught"] == 4 and e["payload"]["total"] == 4
    assert results_by_id(e) == {"err_01": True, "err_02": True, "err_03": True, "err_04": True}


def test_tampered_month_without_the_refund_scores_3_of_4(client):
    month = load_month()
    records = month["records"]
    records["refunds"] = []
    for p in records["payouts"]:
        if p.get("refundIds"):
            p["refundIds"] = []
    res = client.post("/api/b03/score", json=body_for(month))
    assert res.status_code == 200
    e = res.json()["events"][0]
    check_proof_event(e)
    assert e["payload"]["caught"] == 3 and e["payload"]["total"] == 4
    assert results_by_id(e) == {"err_01": True, "err_02": True, "err_03": False, "err_04": True}


def test_null_trigger_gives_at_zero_and_ids_are_unique(client):
    month = load_month()
    a = client.post("/api/b03/score", json=body_for(month, trigger=None)).json()["events"][0]
    b = client.post("/api/b03/score", json=body_for(month, trigger=None)).json()["events"][0]
    check_proof_event(a)
    assert a["at"] == 0
    assert a["id"] != b["id"]


@pytest.mark.parametrize(
    "drop",
    ["records", "answerKey", "monthId", "trigger"],
)
def test_bad_body_gives_bad_request(client, drop):
    body = body_for(load_month())
    del body[drop]
    res = client.post("/api/b03/score", json=body)
    assert res.status_code == 400
    err = res.json()
    assert set(err) == {"error"}
    assert err["error"]["code"] == "bad_request"
    assert isinstance(err["error"]["message"], str) and err["error"]["message"]


def test_empty_answer_key_and_missing_record_list_are_bad_requests(client):
    month = load_month()
    body = body_for(month)
    body["answerKey"] = []
    assert client.post("/api/b03/score", json=body).json()["error"]["code"] == "bad_request"
    body = body_for(month)
    del body["records"]["refunds"]
    res = client.post("/api/b03/score", json=body)
    assert res.status_code == 400 and res.json()["error"]["code"] == "bad_request"


def test_health_lists_b03(client):
    assert "b03" in client.get("/api/health").json()["routers"]


# --- The caught rules, on made-up matcher output ---------------------------------------------


def key() -> list[PlantedError]:
    return [PlantedError(**e) for e in load_month()["answerKey"]]


def perfect() -> list[dict]:
    return [
        {"flagId": "flg_01", "kind": "short_payment", "recordIds": ["ctr_gallery_01", "stm_gallery_2026_09", "txn_026"],
         "expectedCents": 204000, "actualCents": 170000, "deltaCents": 34000},
        {"matchId": "mat_009", "kind": "bundled", "recordIds": ["pay_009", "ord_015", "ord_016", "ord_017"]},
        {"matchId": "mat_017", "kind": "refund_netted", "recordIds": ["pay_017", "ord_021", "rfd_001", "ord_020"]},
        {"type": "match.made", "payload": {"matchId": "mat_024", "kind": "carried_over",
                                           "recordIds": ["ord_026", "ord_025", "pay_024"], "intoMonthId": "2026-10"}},
    ]


def test_score_rules_accept_a_correct_matcher():
    p = score(perfect(), key())
    assert p["caught"] == 4 and p["total"] == 4


def test_score_rules_reject_near_misses():
    found = perfect()
    found[0]["deltaCents"] = 33999                          # wrong amount
    found[1]["recordIds"] = ["pay_009", "ord_015", "ord_016"]  # one order short
    found[2]["kind"] = "one_to_one"                         # wrong kind
    found[3]["payload"]["intoMonthId"] = "2026-09"          # wrong month
    p = score(found, key())
    assert p["caught"] == 0
    assert all(r["caught"] is False for r in p["results"])


def test_score_rules_flag_must_be_on_the_planted_records():
    found = copy.deepcopy(perfect())
    found[0]["recordIds"] = ["ctr_gallery_01", "stm_gallery_2026_09", "txn_099"]
    p = score(found, key())
    assert {r["errorId"]: r["caught"] for r in p["results"]}["err_01"] is False
    assert p["caught"] == 3


def test_score_with_nothing_found_is_zero():
    p = score([], key())
    assert p == {"caught": 0, "total": 4, "results": [{"errorId": f"err_0{i}", "caught": False} for i in range(1, 5)]}


# --- One live call -----------------------------------------------------------------------------


@pytest.mark.live
def test_live_score_against_running_api():
    """One real call to the API on localhost:8000 (B03 needs no key). Skips when the API isn't up."""
    httpx = pytest.importorskip("httpx")
    try:
        health = httpx.get("http://localhost:8000/api/health", timeout=3).json()
    except Exception:
        pytest.skip("the API on localhost:8000 isn't running")
    if "b03" not in health.get("routers", []):
        pytest.skip("the running API hasn't loaded b03 yet")
    res = httpx.post("http://localhost:8000/api/b03/score", json=body_for(load_month()), timeout=7)
    assert res.status_code == 200
    e = res.json()["events"][0]
    check_proof_event(e)
    assert e["payload"]["caught"] == 4
