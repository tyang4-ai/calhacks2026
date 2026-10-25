"""B09 · the shopping concierge. Contract tests with a fake Anthropic client, plus one live call.

The fixture (b09_catalog.json) is dumped from src/mock: the scripted concierge.answered from the
demo timeline, the twelve catalog pieces with each maker's name, and the curated set.
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
from pydantic import ValidationError

from conftest import needs_key
from server import config as server_config
from server.routers import b09_concierge
from server.routers.b09_concierge import ConciergePicks, price_limit

FIXTURE = json.loads((Path(__file__).parent / "b09_catalog.json").read_text(encoding="utf-8"))
URL = "/api/b09/concierge"
FAKE_KEY = "test-placeholder-not-a-key"
DEMO_QUERY = "a gift under $200 for my mom, she loves red wool"
CATALOG_IDS = {p["id"] for p in FIXTURE["catalog"]}
PRICES = {p["id"]: p["priceCents"] for p in FIXTURE["catalog"]}


def body(**over) -> dict:
    f = copy.deepcopy(FIXTURE)
    b = {"trigger": f["trigger"], "query": f["query"], "lang": f["lang"], "catalog": f["catalog"]}
    b.update(over)
    return b


def picks(*ids: str) -> ConciergePicks:
    return ConciergePicks(
        picks=[
            {"piece_id": i, "reason_en": f"A plain sentence about {i}.", "reason_zh": f"关于{i}的一句话。"} for i in ids
        ]
    )


GOOD = ("pc_01", "pc_07", "pc_11")


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
    monkeypatch.setattr(b09_concierge, "make_client", lambda: fake)
    return fake


def answer_with(*ids: str):
    return lambda kw: SimpleNamespace(parsed_output=picks(*ids))


# --- event shape checks, from events.md ---------------------------------------------------------


def is_text(v) -> bool:
    return isinstance(v, dict) and isinstance(v.get("en"), str) and isinstance(v.get("zh"), str) and v["en"] and v["zh"]


def check_answered(e: dict, at, query: str) -> None:
    assert re.fullmatch(r"evt_live_\d+", e["id"])
    assert e["type"] == "concierge.answered"
    assert e["source"] == "live"
    assert e["key"] == "b09-concierge"
    assert e["at"] == at
    p = e["payload"]
    assert set(p) == {"query", "pieceIds", "reasons"}
    assert p["query"] == query
    assert len(p["pieceIds"]) == 3 and len(set(p["pieceIds"])) == 3
    assert set(p["pieceIds"]) <= CATALOG_IDS
    assert set(p["reasons"]) == set(p["pieceIds"])
    for pid in p["pieceIds"]:
        assert is_text(p["reasons"][pid]), pid


def assert_error(resp, status: int, code: str) -> None:
    assert resp.status_code == status, resp.text
    err = resp.json()["error"]
    assert err["code"] == code
    assert isinstance(err["message"], str) and err["message"]
    assert FAKE_KEY not in resp.text


# --- the fixture itself -------------------------------------------------------------------------


def test_fixture_holds_the_demo_figures():
    assert len(FIXTURE["catalog"]) == 12
    assert FIXTURE["query"] == DEMO_QUERY
    assert FIXTURE["trigger"]["type"] == "concierge.answered"
    assert FIXTURE["trigger"]["payload"]["pieceIds"] == list(GOOD)
    assert FIXTURE["curatedSet"]["pieceIds"] == list(GOOD)
    assert all(PRICES[i] < 20000 for i in GOOD)
    assert all(is_text(p["maker"]) for p in FIXTURE["catalog"])


# --- the price limit in the query ---------------------------------------------------------------


@pytest.mark.parametrize(
    "query, expected",
    [
        (DEMO_QUERY, (20000, True)),
        ("something blue", None),
        ("a scarf, up to $85 please", (8500, False)),
        ("$50 or less", (5000, False)),
        ("below $1,200.50 and red wool", (120050, True)),
        ("budget of 100 dollars", (10000, False)),
        ("给妈妈的礼物，200美元以内，她喜欢红色羊毛", (20000, False)),
        ("不超过100美元的小礼物", (10000, False)),
        ("低于$60", (6000, True)),
        ("under $300 but ideally under $100", (10000, True)),
    ],
)
def test_price_limit(query, expected):
    assert price_limit(query) == expected


# --- no key -------------------------------------------------------------------------------------


def test_missing_key_is_503_key_missing(client, monkeypatch):
    monkeypatch.setattr(server_config, "ANTHROPIC_API_KEY", None)
    called = []
    monkeypatch.setattr(b09_concierge, "make_client", lambda: called.append(1))
    assert_error(client.post(URL, json=body()), 503, "key_missing")
    assert called == []


def test_health_lists_b09_and_reports_no_key(client, monkeypatch):
    monkeypatch.setattr(server_config, "ANTHROPIC_API_KEY", None)
    h = client.get("/api/health").json()
    assert "b09" in h["routers"]
    assert h["keys"]["anthropic"] is False


# --- bad bodies ---------------------------------------------------------------------------------


def test_missing_catalog_is_400(client, with_key):
    b = body()
    del b["catalog"]
    assert_error(client.post(URL, json=b), 400, "bad_request")


def test_bad_lang_is_400(client, with_key):
    assert_error(client.post(URL, json=body(lang="fr")), 400, "bad_request")


def test_empty_query_is_400(client, with_key):
    assert_error(client.post(URL, json=body(query="  ")), 400, "bad_request")


# --- a good answer ------------------------------------------------------------------------------


def test_good_answer_gives_one_concierge_answered(client, with_key, monkeypatch):
    fake = use_fake(monkeypatch, answer_with("pc_11", "pc_01", "pc_07"))
    resp = client.post(URL, json=body())
    assert resp.status_code == 200, resp.text
    events = resp.json()["events"]
    assert len(events) == 1
    check_answered(events[0], FIXTURE["trigger"]["at"], DEMO_QUERY)
    assert events[0]["payload"]["pieceIds"] == ["pc_11", "pc_01", "pc_07"]  # Claude's order kept
    assert len(fake.messages.calls) == 1


def test_request_follows_the_2026_10_21_api(client, with_key, monkeypatch):
    fake = use_fake(monkeypatch, answer_with(*GOOD))
    assert client.post(URL, json=body()).status_code == 200
    kw = fake.messages.calls[0]
    assert kw["model"] == "claude-haiku-5-5"
    assert kw["output_format"] is ConciergePicks
    for banned in ("temperature", "top_p", "top_k"):
        assert banned not in kw
    assert kw.get("thinking") is None or kw["thinking"].get("type") != "enabled"
    assert all(m["role"] == "user" for m in kw["messages"])  # no prefilled assistant turn
    assert 0 < kw["timeout"] <= 4.0
    prompt = kw["messages"][0]["content"]
    for pid in CATALOG_IDS:
        assert pid in prompt
    for needle in (DEMO_QUERY, "Price limit: under $200.00", "$180.00", "Small grey, red and black wool weaving", "Grace N.", "26"):
        assert needle in prompt, needle
    assert FAKE_KEY not in prompt


def test_user_request_without_a_limit(client, with_key, monkeypatch):
    """A buyer's own concierge.asked: any three catalog pieces pass, and the query is echoed."""
    use_fake(monkeypatch, answer_with("pc_03", "pc_04", "pc_05"))
    trigger = {
        "id": "evt_user_0001",
        "type": "concierge.asked",
        "at": 4321,
        "source": "user",
        "payload": {"query": "something with water and fish", "lang": "en"},
    }
    resp = client.post(URL, json=body(trigger=trigger, query="something with water and fish"))
    assert resp.status_code == 200, resp.text
    check_answered(resp.json()["events"][0], 4321, "something with water and fish")


def test_trigger_null_gives_at_zero(client, with_key, monkeypatch):
    use_fake(monkeypatch, answer_with(*GOOD))
    events = client.post(URL, json=body(trigger=None)).json()["events"]
    assert events[0]["at"] == 0


def test_ids_are_unique(client, with_key, monkeypatch):
    use_fake(monkeypatch, answer_with(*GOOD))
    a = client.post(URL, json=body()).json()["events"][0]["id"]
    b = client.post(URL, json=body()).json()["events"][0]["id"]
    assert a != b


# --- answers that fail the checks (each 502 invalid_model_output) -------------------------------


def test_unknown_piece_is_invalid_model_output(client, with_key, monkeypatch):
    use_fake(monkeypatch, answer_with("pc_01", "pc_99", "pc_11"))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_repeated_piece_is_invalid_model_output(client, with_key, monkeypatch):
    use_fake(monkeypatch, answer_with("pc_01", "pc_01", "pc_11"))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_over_budget_is_invalid_model_output(client, with_key, monkeypatch):
    use_fake(monkeypatch, answer_with("pc_01", "pc_03", "pc_11"))  # pc_03 is $1,200
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


@pytest.mark.parametrize("ids", [("pc_01", "pc_07"), ("pc_01", "pc_07", "pc_11", "pc_09"), ()])
def test_wrong_count_is_invalid_model_output(client, with_key, monkeypatch, ids):
    use_fake(monkeypatch, answer_with(*ids))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_empty_reason_is_invalid_model_output(client, with_key, monkeypatch):
    def behave(kw):
        p = picks(*GOOD)
        p.picks[1].reason_zh = " "
        return SimpleNamespace(parsed_output=p)

    use_fake(monkeypatch, behave)
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_malformed_json_is_invalid_model_output(client, with_key, monkeypatch):
    def behave(kw):
        # What parse() raises when Claude's text doesn't validate against output_format.
        return SimpleNamespace(parsed_output=ConciergePicks.model_validate_json('{"picks": [{"piece_id": "pc_01"'))

    use_fake(monkeypatch, behave)
    with pytest.raises(ValidationError):
        ConciergePicks.model_validate_json("{")
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


def test_no_parsed_output_is_invalid_model_output(client, with_key, monkeypatch):
    use_fake(monkeypatch, lambda kw: SimpleNamespace(parsed_output=None, stop_reason="refusal"))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


# --- upstream failures --------------------------------------------------------------------------

REQ = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")


def test_sdk_timeout_is_504(client, with_key, monkeypatch):
    def behave(kw):
        raise anthropic.APITimeoutError(request=REQ)

    use_fake(monkeypatch, behave)
    assert_error(client.post(URL, json=body()), 504, "upstream_timeout")


def test_slow_answer_hits_the_deadline(client, with_key, monkeypatch):
    monkeypatch.setattr(b09_concierge, "CLAUDE_TIMEOUT_S", 0.2)

    def behave(kw):
        time.sleep(1.0)
        return SimpleNamespace(parsed_output=picks(*GOOD))

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


def _sdk_with(text: str, sent: list[dict]):
    def handler(request):
        sent.append(json.loads(request.content))
        return httpx2.Response(
            200,
            json={
                "id": "msg_test",
                "type": "message",
                "role": "assistant",
                "model": "claude-haiku-5-5",
                "content": [{"type": "text", "text": text}],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": 10, "output_tokens": 10},
            },
        )

    def make():
        return anthropic.Anthropic(
            api_key=FAKE_KEY, http_client=httpx2.Client(transport=httpx2.MockTransport(handler)), max_retries=0
        )

    return make


def test_sdk_request_on_the_wire(client, with_key, monkeypatch):
    sent: list[dict] = []
    monkeypatch.setattr(b09_concierge, "make_client", _sdk_with(picks(*GOOD).model_dump_json(), sent))
    resp = client.post(URL, json=body())
    assert resp.status_code == 200, resp.text
    check_answered(resp.json()["events"][0], FIXTURE["trigger"]["at"], DEMO_QUERY)
    assert len(sent) == 1
    wire = sent[0]
    assert wire["model"] == "claude-haiku-5-5"
    for banned in ("temperature", "top_p", "top_k"):
        assert banned not in wire
    assert wire.get("thinking", {}).get("type") != "enabled"
    assert wire["output_config"]["format"]["type"] == "json_schema"
    assert [m["role"] for m in wire["messages"]] == ["user"]


def test_sdk_malformed_text_is_invalid_model_output(client, with_key, monkeypatch):
    sent: list[dict] = []
    monkeypatch.setattr(b09_concierge, "make_client", _sdk_with('{"picks": [{"piece_id": "pc_01"', sent))
    assert_error(client.post(URL, json=body()), 502, "invalid_model_output")


# --- one real call ------------------------------------------------------------------------------


@pytest.mark.live
@needs_key("ANTHROPIC_API_KEY")
def test_live_claude_picks_three_gifts(client):
    resp = client.post(URL, json=body())
    assert resp.status_code == 200, resp.json().get("error")
    events = resp.json()["events"]
    assert len(events) == 1
    check_answered(events[0], FIXTURE["trigger"]["at"], DEMO_QUERY)
    assert all(PRICES[i] < 20000 for i in events[0]["payload"]["pieceIds"])
