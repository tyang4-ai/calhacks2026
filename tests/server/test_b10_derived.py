"""B10 · numbers derived from the ledger. Contract tests for POST /api/b10/derive.

The fixture b10_records.json is September's records, the scripted B10 triggers from the demo
timeline and the dataset's figures, dumped from src/mock. Every recomputed number is checked
against the dataset to the cent and against the demo-critical figures in data-model.md. Nothing
here calls the network except the one test marked live, which posts to the API the orchestrator
runs on localhost:8000 and skips when it isn't up or hasn't loaded b10.
"""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path

import httpx
import pytest

from server.routers.b10_derived import bps, card_fee

FIXTURE = Path(__file__).with_name("b10_records.json")
ENVELOPE = {"id", "type", "at", "source", "key", "payload"}
PAYLOAD_FIELDS = {
    "split.shown": {"pieceId", "grossCents", "cardFeeCents", "platformFeeCents", "materialsCents", "makerShareCents"},
    "receipt.updated": {"orderId", "status", "makerId", "makerShareCents", "paidDate"},
    "statement.issued": {"makerStatementId", "makerId", "lines", "totalCents", "heldCents", "payoutDate"},
    "impact.updated": {"impactId", "makerShareBps", "daysCloseToPayout", "daysCloseToPayoutBefore", "bookkeepingHoursSaved", "estimate"},
}


def load() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def with_sent(records: dict, date: str = "2026-10-02") -> dict:
    """The records as the adapter sends them once the store holds every payout.sent."""
    out = copy.deepcopy(records)
    for mp in out["makerPayouts"]:
        mp["status"] = "sent"
        mp["date"] = date
    return out


def derive(client, trigger: dict, records: dict) -> dict:
    res = client.post("/api/b10/derive", json={"trigger": trigger, "records": records})
    assert res.status_code == 200, res.text
    events = res.json()["events"]
    assert len(events) == 1
    return events[0]


def check_envelope(ev: dict, trigger: dict) -> None:
    assert set(ev) == ENVELOPE
    assert re.fullmatch(r"evt_live_\d+", ev["id"])
    assert ev["type"] == trigger["type"]
    assert ev["at"] == trigger["at"]
    assert ev["source"] == "live"
    assert ev["key"] == "b10-derived"
    assert set(ev["payload"]) <= PAYLOAD_FIELDS[ev["type"]]
    for k, v in ev["payload"].items():
        if k.endswith("Cents") or k.endswith("Bps"):
            assert isinstance(v, int) and not isinstance(v, bool), k


# ---------------------------------------------------------------------------------------------
# The money rules


def test_rounding_is_half_up():
    assert bps(18000, 290) == 522
    assert bps(5, 1000) == 1  # 0.5 rounds up
    assert bps(4, 1000) == 0
    assert card_fee(18000) == 552


# ---------------------------------------------------------------------------------------------
# split.shown


def test_split_for_pc_01_on_cindia(client):
    month = load()
    trigger = month["triggers"]["split"]
    ev = derive(client, trigger, month["records"])
    check_envelope(ev, trigger)
    assert ev["payload"] == {
        "pieceId": "pc_01",
        "grossCents": 18000,
        "cardFeeCents": 552,
        "platformFeeCents": 1800,
        "materialsCents": 2200,
        "makerShareCents": 13448,
    }
    assert ev["payload"] == trigger["payload"]


def test_split_on_every_channel_matches_every_order(client):
    """Each order's fees and maker share, recomputed from its piece and channel, equal the dataset's."""
    month = load()
    for o in month["records"]["orders"]:
        trigger = {**month["triggers"]["split"], "payload": {**month["triggers"]["split"]["payload"], "pieceId": o["pieceId"]}}
        res = client.post("/api/b10/derive", json={"trigger": trigger, "records": month["records"], "channelId": o["channelId"]})
        assert res.status_code == 200
        p = res.json()["events"][0]["payload"]
        want = month["expected"]["orders"][o["id"]]
        assert p["makerShareCents"] == want["makerShareCents"], o["id"]
        assert p["cardFeeCents"] == want["cardFeeCents"], o["id"]
        assert p["platformFeeCents"] == want["platformFeeCents"], o["id"]


# ---------------------------------------------------------------------------------------------
# receipt.updated


def test_receipt_reads_received_before_the_payout_is_sent(client):
    month = load()
    trigger = month["triggers"]["receiptReceived"]
    ev = derive(client, trigger, month["records"])
    check_envelope(ev, trigger)
    assert ev["payload"] == {"orderId": "ord_001", "status": "received", "makerId": "mkr_01", "makerShareCents": 13448}


def test_receipt_reads_paid_once_mpo_01_is_sent(client):
    month = load()
    trigger = month["triggers"]["receiptPaid"]
    ev = derive(client, trigger, with_sent(month["records"]))
    check_envelope(ev, trigger)
    assert ev["payload"] == {
        "orderId": "ord_001",
        "status": "paid_to_maker",
        "makerId": "mkr_01",
        "makerShareCents": 13448,
        "paidDate": "2026-10-02",
    }
    assert ev["payload"] == trigger["payload"]


def test_receipt_paid_date_falls_back_to_the_ledger(client):
    month = load()
    records = copy.deepcopy(month["records"])
    for mp in records["makerPayouts"]:
        mp["status"] = "sent"  # no date: the maker_pay ledger entry gives it
    ev = derive(client, month["triggers"]["receiptPaid"], records)
    assert ev["payload"]["paidDate"] == "2026-10-02"


def test_receipt_stays_received_when_the_trigger_says_paid_but_the_payout_is_proposed(client):
    month = load()
    ev = derive(client, month["triggers"]["receiptPaid"], month["records"])
    assert ev["payload"]["status"] == "received"
    assert "paidDate" not in ev["payload"]


# ---------------------------------------------------------------------------------------------
# statement.issued


@pytest.mark.parametrize("index,held", [(0, 9500), (1, 8000), (2, 16500)])
def test_every_maker_statement_matches_the_dataset(client, index, held):
    month = load()
    mst = month["expected"]["makerStatements"][index]
    base = month["triggers"]["statement"]
    trigger = {
        **base,
        "payload": {
            "makerStatementId": mst["id"],
            "makerId": mst["makerId"],
            "lines": mst["lines"],
            "totalCents": mst["totalCents"],
            "heldCents": mst["heldCents"],
            "payoutDate": mst["payoutDate"],
        },
    }
    ev = derive(client, trigger, with_sent(month["records"]))
    check_envelope(ev, trigger)
    p = ev["payload"]
    assert p["makerStatementId"] == mst["id"]
    assert p["lines"] == mst["lines"]
    assert p["totalCents"] == sum(line["makerShareCents"] for line in p["lines"]) == mst["totalCents"]
    assert p["heldCents"] == held == mst["heldCents"]
    assert p["payoutDate"] == "2026-10-02"


def test_scripted_statement_trigger_is_recomputed_identically(client):
    month = load()
    trigger = month["triggers"]["statement"]
    ev = derive(client, trigger, month["records"])
    assert ev["payload"] == trigger["payload"]


def test_held_amounts_add_up_to_the_gallery_short(client):
    """Every gallery line uses the contract's 4000 bps, so the held parts add up to the 34000 short."""
    month = load()
    assert month["records"]["contracts"][0]["commissionBps"] == 4000
    total_held = 0
    for mst in month["expected"]["makerStatements"]:
        trigger = {**month["triggers"]["statement"], "payload": {**month["triggers"]["statement"]["payload"], "makerStatementId": mst["id"], "makerId": mst["makerId"]}}
        total_held += derive(client, trigger, month["records"])["payload"]["heldCents"]
    assert total_held == 34000


def test_gallery_line_shares_use_the_contract(client):
    month = load()
    pieces = {p["id"]: p for p in month["records"]["catalog"]}
    gallery = [o for o in month["records"]["orders"] if o["channelId"] == "ch_gallery"]
    for mst in month["expected"]["makerStatements"]:
        trigger = {**month["triggers"]["statement"], "payload": {**month["triggers"]["statement"]["payload"], "makerStatementId": mst["id"], "makerId": mst["makerId"]}}
        lines = {line["orderId"]: line for line in derive(client, trigger, month["records"])["payload"]["lines"]}
        for o in gallery:
            if o["id"] in lines:
                gross = o["grossCents"]
                assert lines[o["id"]]["makerShareCents"] == gross - bps(gross, 4000) - pieces[o["pieceId"]]["materialsCents"]


# ---------------------------------------------------------------------------------------------
# impact.updated


def test_impact_matches_the_dataset(client):
    month = load()
    trigger = month["triggers"]["impact"]
    ev = derive(client, trigger, month["records"])
    check_envelope(ev, trigger)
    imp = month["expected"]["impact"]
    assert ev["payload"] == {
        "impactId": imp["id"],
        "makerShareBps": imp["makerShareBps"],
        "daysCloseToPayout": 2,
        "daysCloseToPayoutBefore": imp["daysCloseToPayoutBefore"],
        "bookkeepingHoursSaved": imp["bookkeepingHoursSaved"],
        "estimate": True,
    }
    assert ev["payload"] == trigger["payload"]


# ---------------------------------------------------------------------------------------------
# Errors and the envelope


def test_ids_are_unique(client):
    month = load()
    a = derive(client, month["triggers"]["split"], month["records"])
    b = derive(client, month["triggers"]["split"], month["records"])
    assert a["id"] != b["id"]


def error_of(res) -> dict:
    body = res.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message"}
    assert isinstance(body["error"]["message"], str) and body["error"]["message"]
    return body["error"]


def test_null_trigger_is_bad_request(client):
    res = client.post("/api/b10/derive", json={"trigger": None, "records": load()["records"]})
    assert res.status_code == 400
    assert error_of(res)["code"] == "bad_request"


def test_missing_records_is_bad_request(client):
    res = client.post("/api/b10/derive", json={"trigger": load()["triggers"]["split"]})
    assert res.status_code == 400
    assert error_of(res)["code"] == "bad_request"


def test_wrong_trigger_type_is_bad_request(client):
    month = load()
    res = client.post("/api/b10/derive", json={"trigger": {"type": "proof.scored", "at": 0, "payload": {}}, "records": month["records"]})
    assert res.status_code == 400
    assert error_of(res)["code"] == "bad_request"


def test_unknown_piece_is_not_found(client):
    month = load()
    trigger = {**month["triggers"]["split"], "payload": {**month["triggers"]["split"]["payload"], "pieceId": "pc_99"}}
    res = client.post("/api/b10/derive", json={"trigger": trigger, "records": month["records"]})
    assert res.status_code == 404
    assert error_of(res)["code"] == "not_found"


def test_unknown_order_is_not_found(client):
    month = load()
    trigger = {**month["triggers"]["receiptPaid"], "payload": {**month["triggers"]["receiptPaid"]["payload"], "orderId": "ord_999"}}
    res = client.post("/api/b10/derive", json={"trigger": trigger, "records": month["records"]})
    assert res.status_code == 404
    assert error_of(res)["code"] == "not_found"


def test_no_key_needed(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("NESSIE_KEY", raising=False)
    month = load()
    assert client.post("/api/b10/derive", json={"trigger": month["triggers"]["split"], "records": month["records"]}).status_code == 200


def test_listed_in_health(client):
    assert "b10" in client.get("/api/health").json()["routers"]


@pytest.mark.live
def test_live_running_api():
    """One real call to the API the orchestrator runs on :8000. Skips when it isn't up or lacks b10."""
    try:
        health = httpx.get("http://127.0.0.1:8000/api/health", timeout=2).json()
    except Exception:
        pytest.skip("the API on :8000 isn't running")
    if "b10" not in health.get("routers", []):
        pytest.skip("the running API hasn't loaded b10 yet (needs a restart)")
    month = load()
    res = httpx.post("http://127.0.0.1:8000/api/b10/derive", json={"trigger": month["triggers"]["split"], "records": month["records"]}, timeout=7)
    assert res.status_code == 200
    assert res.json()["events"][0]["payload"]["makerShareCents"] == 13448
