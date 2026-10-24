"""B02 · Claude explains the catch. Contract tests with a fake Anthropic client, plus one live call.

The fixture (b02_records.json) is dumped from src/mock: the scripted flag.explained and
followup.drafted, flg_01 and its three records (ctr_gallery_01, stm_gallery_2026_09, txn_026).
"""

from __future__ import annotations

import copy
import json
import re
import time
from pathlib import Path
from types import SimpleNamespace

import anthropic
import httpx2
import pytest

from conftest import needs_key
from server import config as server_config
from server.routers import b02_explain
from server.routers.b02_explain import CatchExplanation

FIXTURE = json.loads((Path(__file__).parent / "b02_records.json").read_text(encoding="utf-8"))
URL = "/api/b02/explain"
FAKE_KEY = "test-placeholder-not-a-key"


def body() -> dict:
    f = copy.deepcopy(FIXTURE)
    return {
        "trigger": f["trigger"],
        "flagId": f["flagId"],
        "flag": f["flag"],
        "contract": f["contract"],
        "statement": f["statement"],
        "bankTxn": f["bankTxn"],
        "followUpId": f["followUpId"],
        "approvalId": f["approvalId"],
        "to": f["followUp"]["to"],
    }


def good_answer(**over) -> CatchExplanation:
    data = {
        "trusted_record_id": "ctr_gallery_01",
        "delta_cents": 34000,
        "explanation_en": "The statement charged 50% but the contract says 40%. I trust the contract, so the gallery owes $340.00.",
        "explanation_zh": "对账单按50%收取佣金，合同约定40%。我以合同为准，画廊还欠$340.00。",
        "follow_up_subject_en": "September statement: commission at 50% instead of 40%",
        "follow_up_subject_zh": "9月对账单：佣金按50%计，合同为40%",
        "follow_up_body_en": "Hello,\n\nCould you send the $340.00 difference?\n\nThank you,\nGu Embroidery Studio",
        "follow_up_body_zh": "您好：\n\n烦请补付差额$340.00。\n\n谢谢！\n顾绣工作室",
    }
    data.update(over)
    return CatchExplanation(**data)


class FakeMessages:
    def __init__(self, behave):
        self.behave = behave
        self.calls: list[dict] = []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        return self.behave(kwargs)


class FakeClient:
    def __init__(self, behave):
        self.messages = FakeMessages(behave)


@pytest.fixture
def with_key(monkeypatch):
    """Pretend the key is set. The value is a placeholder, never a real key."""
    monkeypatch.setattr(server_config, "ANTHROPIC_API_KEY", FAKE_KEY)


def use_fake(monkeypatch, behave) -> FakeClient:
    fake = FakeClient(behave)
    monkeypatch.setattr(b02_explain, "make_client", lambda: fake)
    return fake


# --- event shape checks, from events.md ---------------------------------------------------------


def is_text(v) -> bool:
    return isinstance(v, dict) and isinstance(v.get("en"), str) and isinstance(v.get("zh"), str) and v["en"] and v["zh"]


def check_envelope(e: dict, at) -> None:
    assert re.fullmatch(r"evt_live_\d+", e["id"])
    assert e["source"] == "live"
    assert e["key"] == "b02-explain"
    assert e["at"] == at
    assert isinstance(e["payload"], dict)


def check_explained(e: dict) -> None:
    assert e["type"] == "flag.explained"
    p = e["payload"]
    assert set(p) == {"flagId", "trustRecordId", "explanation"}
    assert p["flagId"] == "flg_01"
    assert p["trustRecordId"] in FIXTURE["flag"]["recordIds"]
    assert is_text(p["explanation"])


def check_drafted(e: dict) -> None:
    assert e["type"] == "followup.drafted"
    p = e["payload"]
    assert set(p) == {"followUpId", "approvalId", "to", "subject", "body"}
    assert p["followUpId"] == "fup_01"
    assert p["approvalId"] == "apr_01"
    for k in ("to", "subject", "body"):
        assert is_text(p[k]), k


def assert_error(resp, status: int, code: str) -> None:
    assert resp.status_code == status, resp.text
    err = resp.json()["error"]
    assert err["code"] == code
    assert isinstance(err["message"], str) and err["message"]
    assert FAKE_KEY not in resp.text


# --- the fixture itself -------------------------------------------------------------------------


def test_fixture_holds_the_demo_figures():
    flag = FIXTURE["flag"]
    assert flag["recordIds"] == ["ctr_gallery_01", "stm_gallery_2026_09", "txn_026"]
    assert (flag["expectedCents"], flag["actualCents"], flag["deltaCents"]) == (204000, 170000, 34000)
    assert FIXTURE["contract"]["commissionBps"] == 4000
    assert {line["commissionBps"] for line in FIXTURE["statement"]["lines"]} == {5000}
    assert FIXTURE["bankTxn"]["amountCents"] == 170000


# --- no key -------------------------------------------------------------------------------------


def test_missing_key_is_503_key_missing(client, monkeypatch):
    monkeypatch.setattr(server_config, "ANTHROPIC_API_KEY", None)
    called = []
    monkeypatch.setattr(b02_explain, "make_client", lambda: called.append(1))
    assert_error(client.post(URL, json=body()), 503, "key_missing")
    assert called == []


def test_health_lists_b02_and_reports_the_key(client, monkeypatch):
    monkeypatch.setattr(server_config, "ANTHROPIC_API_KEY", None)
    h = client.get("/api/health").json()
    assert "b02" in h["routers"]
    assert h["keys"]["anthropic"] is False


# --- bad bodies ---------------------------------------------------------------------------------


def test_bad_body_is_400(client, with_key):
    b = body()
    del b["flag"]
    assert_error(client.post(URL, json=b), 400, "bad_request")


def test_flag_id_mismatch_is_400(client, with_key, monkeypatch):
    use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=good_answer()))
    b = body()
    b["flagId"] = "flg_99"
    assert_error(client.post(URL, json=b), 400, "bad_request")


# --- a good answer ------------------------------------------------------------------------------


def test_good_answer_gives_both_events(client, with_key, monkeypatch):
    fake = use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=good_answer()))
    resp = client.post(URL, json=body())
    assert resp.status_code == 200, resp.text
    events = resp.json()["events"]
    assert [e["type"] for e in events] == ["flag.explained", "followup.drafted"]
    at = FIXTURE["trigger"]["at"]
    for e in events:
        check_envelope(e, at)
    check_explained(events[0])
    check_drafted(events[1])
    assert events[0]["payload"]["trustRecordId"] == "ctr_gallery_01"
    assert "$340.00" in events[0]["payload"]["explanation"]["en"]
    assert events[1]["payload"]["to"] == FIXTURE["followUp"]["to"]
    assert events[0]["id"] != events[1]["id"]
    assert len(fake.messages.calls) == 1


def test_request_follows_the_2026_10_21_api(client, with_key, monkeypatch):
    fake = use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=good_answer()))
    assert client.post(URL, json=body()).status_code == 200
    kw = fake.messages.calls[0]
    assert kw["model"] == "claude-sonnet-5-5"
    assert kw["output_format"] is CatchExplanation
    for banned in ("temperature", "top_p", "top_k"):
        assert banned not in kw
    assert kw.get("thinking") in (None,) or kw["thinking"].get("type") != "enabled"
    assert all(m["role"] == "user" for m in kw["messages"])  # no prefilled assistant turn
    assert 0 < kw["timeout"] <= 6.0
    prompt = kw["messages"][0]["content"]
    for needle in ("ctr_gallery_01", "stm_gallery_2026_09", "txn_026", "40%", "50%", "$340.00", "$2,040.00", "$1,700.00"):
        assert needle in prompt, needle
    assert FAKE_KEY not in prompt


def test_trigger_null_gives_at_zero_and_default_to(client, with_key, monkeypatch):
    use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=good_answer()))
    b = body()
    b["trigger"] = None
    del b["to"]
    events = client.post(URL, json=b).json()["events"]
    assert all(e["at"] == 0 for e in events)
    assert is_text(events[1]["payload"]["to"])


# --- answers that fail the checks ---------------------------------------------------------------


def test_wrong_delta_is_invalid_model_output(client, with_key, monkeypatch):
    use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=good_answer(delta_cents=33000)))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_wrong_record_is_invalid_model_output(client, with_key, monkeypatch):
    use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=good_answer(trusted_record_id="ctr_made_up")))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_malformed_json_is_invalid_model_output(client, with_key, monkeypatch):
    def behave(kw):
        # What parse() raises when Claude's text doesn't validate against output_format.
        return SimpleNamespace(parsed_output=CatchExplanation.model_validate_json('{"trusted_record_id": "ctr_gallery_01"'))

    use_fake(monkeypatch, behave)
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_no_parsed_output_is_invalid_model_output(client, with_key, monkeypatch):
    use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=None, stop_reason="refusal"))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_empty_text_is_invalid_model_output(client, with_key, monkeypatch):
    use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=good_answer(explanation_zh="  ")))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


# --- upstream failures --------------------------------------------------------------------------

REQ = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")


def test_sdk_timeout_is_504(client, with_key, monkeypatch):
    def behave(kw):
        raise anthropic.APITimeoutError(request=REQ)

    use_fake(monkeypatch, behave)
    assert_error(client.post(URL, json=body()), 504, "upstream_timeout")


def test_slow_answer_hits_the_deadline(client, with_key, monkeypatch):
    monkeypatch.setattr(b02_explain, "CLAUDE_TIMEOUT_S", 0.2)

    def behave(kw):
        time.sleep(1.0)
        return SimpleNamespace(parsed_output=good_answer())

    use_fake(monkeypatch, behave)
    t0 = time.perf_counter()
    assert_error(client.post(URL, json=body()), 504, "upstream_timeout")
    assert time.perf_counter() - t0 < 0.9


def test_api_error_is_502_upstream_error(client, with_key, monkeypatch):
    def behave(kw):
        raise anthropic.RateLimitError("rate limited", response=httpx2.Response(429, request=REQ), body=None)

    use_fake(monkeypatch, behave)
    assert_error(client.post(URL, json=body()), 502, "upstream_error")


def test_connection_error_is_502_upstream_error(client, with_key, monkeypatch):
    def behave(kw):
        raise anthropic.APIConnectionError(request=REQ)

    use_fake(monkeypatch, behave)
    assert_error(client.post(URL, json=body()), 502, "upstream_error")


# --- the real SDK over a mock transport: what actually goes on the wire --------------------------


def test_sdk_request_on_the_wire(client, with_key, monkeypatch):
    sent: list[dict] = []
    answer_json = good_answer().model_dump_json()

    def handler(request):
        sent.append(json.loads(request.content))
        return httpx2.Response(
            200,
            json={
                "id": "msg_test",
                "type": "message",
                "role": "assistant",
                "model": "claude-sonnet-5-5",
                "content": [{"type": "text", "text": answer_json}],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": 10, "output_tokens": 10},
            },
        )

    def make():
        return anthropic.Anthropic(
            api_key=FAKE_KEY, http_client=httpx2.Client(transport=httpx2.MockTransport(handler)), max_retries=0
        )

    monkeypatch.setattr(b02_explain, "make_client", make)
    resp = client.post(URL, json=body())
    assert resp.status_code == 200, resp.text
    check_explained(resp.json()["events"][0])
    assert len(sent) == 1
    wire = sent[0]
    assert wire["model"] == "claude-sonnet-5-5"
    for banned in ("temperature", "top_p", "top_k", "thinking"):
        assert banned not in wire
    assert wire["output_config"]["format"]["type"] == "json_schema"
    assert [m["role"] for m in wire["messages"]] == ["user"]


# --- one real call ------------------------------------------------------------------------------


@pytest.mark.live
@needs_key("ANTHROPIC_API_KEY")
def test_live_claude_explains_the_catch(client):
    resp = client.post(URL, json=body())
    assert resp.status_code == 200, resp.json().get("error")
    events = resp.json()["events"]
    explained, drafted = events
    check_explained(explained)
    check_drafted(drafted)
    p = explained["payload"]
    assert p["trustRecordId"] == "ctr_gallery_01"
    assert "340" in p["explanation"]["en"] and "340" in p["explanation"]["zh"]
    assert "340" in drafted["payload"]["body"]["en"] and "340" in drafted["payload"]["body"]["zh"]
