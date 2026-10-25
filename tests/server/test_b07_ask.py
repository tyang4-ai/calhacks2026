"""B07 · Ask Cindy. Contract tests for POST /api/b07/ask.

The fixture b07_records.json is September's records as the adapter sends them, dumped from
src/mock, plus the three canned questions. A fake Anthropic client scripts Claude's tool calls, so
the tool loop, the prompt, the server's checks and every error path run without a network call.
The one test marked live asks the first canned question through the real client and skips when
ANTHROPIC_API_KEY isn't set.
"""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable

import anthropic
import httpx2
import pytest

from conftest import needs_key
from server import config
from server.routers import b07_ask

FIXTURE = Path(__file__).with_name("b07_records.json")
ENVELOPE = {"id", "type", "at", "source", "key", "payload"}
FORBIDDEN_PARAMS = {"temperature", "top_p", "top_k", "thinking", "tool_choice"}


def load() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


DATA = load()
RECORDS = DATA["records"]
MONTH = DATA["monthId"]
Q1 = DATA["canned"][0]


def body(text: str | None = None, lang: str = "zh", question_id: str = "ask_user_01", at: int = 41200) -> dict:
    text = text or Q1["questions"]["zh"]
    trigger = {"id": "evt_user_0001", "type": "ask.asked", "at": at, "source": "user",
               "payload": {"questionId": question_id, "text": text, "lang": lang}}
    return {"trigger": trigger, "questionId": question_id, "text": text, "lang": lang, "records": copy.deepcopy(RECORDS)}


# ---------------------------------------------------------------------------------------------
# A fake Anthropic client


def tool_use(name: str, inp: dict, n: int = 1) -> SimpleNamespace:
    return SimpleNamespace(type="tool_use", id=f"toolu_{name}_{n}", name=name, input=inp)


def text_block(text: str) -> SimpleNamespace:
    return SimpleNamespace(type="text", text=text)


def reply(*blocks: SimpleNamespace) -> SimpleNamespace:
    stop = "tool_use" if any(b.type == "tool_use" for b in blocks) else "end_turn"
    return SimpleNamespace(content=list(blocks), stop_reason=stop)


class FakeClient:
    """Plays one scripted step per messages.create() call and records every call's kwargs."""

    def __init__(self, steps: list[Any]):
        self.steps = list(steps)
        self.calls: list[dict] = []
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **kwargs):
        # Copy the messages list now, since the loop appends to it after the call.
        self.calls.append({**kwargs, "messages": copy.deepcopy(kwargs.get("messages"))})
        step = self.steps.pop(0) if self.steps else self.steps_last
        if isinstance(step, BaseException):
            raise step
        return step(kwargs) if callable(step) else step

    steps_last: Any = None


def last_tool_result(kwargs: dict) -> dict:
    """The JSON of the first tool_result in the newest user turn."""
    turn = kwargs["messages"][-1]
    assert turn["role"] == "user"
    result = next(b for b in turn["content"] if b["type"] == "tool_result")
    return json.loads(result["content"])


@pytest.fixture
def with_key(monkeypatch):
    """A placeholder key, so the route passes its key check. The fake client never sends it."""
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "placeholder-for-tests")


def install(monkeypatch, fake: FakeClient) -> FakeClient:
    monkeypatch.setattr(b07_ask, "make_client", lambda: fake)
    return fake


def answer_from_piece_rows(kwargs: dict) -> SimpleNamespace:
    """Answers ask_01 from the revenue_by_piece rows the server sent back, as Claude would."""
    rows = last_tool_result(kwargs)["rows"]
    top = rows[0]
    chart = {
        "type": "bar",
        "title": {"en": "Sales by piece, September 2026", "zh": "2026年9月各作品销售额"},
        "labels": [r["label_zh"] for r in rows],
        "series": [{"name": {"en": "Sales", "zh": "销售额"}, "valuesCents": [r["gross_cents"] for r in rows]}],
    }
    return reply(tool_use("answer", {
        "answer_en": f"{top['label_en']} earned the most in September.",
        "answer_zh": f"9月最赚钱的是{top['label_zh']}。",
        "chart": chart,
        "ref_ids": [top["piece_id"], *top["order_ids"]],
    }, 2))


def check_event(e: dict, question_id: str, at: int) -> dict:
    assert set(e) == ENVELOPE
    assert e["type"] == "ask.answered"
    assert e["source"] == "live" and e["key"] == "b07-ask"
    assert re.fullmatch(r"evt_live_\d+", e["id"])
    assert e["at"] == at
    p = e["payload"]
    assert set(p) <= {"questionId", "answer", "chart", "refIds"}
    assert p["questionId"] == question_id
    assert set(p["answer"]) == {"en", "zh"} and p["answer"]["en"] and p["answer"]["zh"]
    assert isinstance(p["refIds"], list) and all(isinstance(i, str) for i in p["refIds"])
    if "chart" in p:
        c = p["chart"]
        assert set(c) == {"type", "title", "labels", "series"} and c["type"] in ("bar", "line")
        assert set(c["title"]) == {"en", "zh"}
        for s in c["series"]:
            assert set(s) == {"name", "valuesCents"} and set(s["name"]) == {"en", "zh"}
            assert len(s["valuesCents"]) == len(c["labels"])
            assert all(isinstance(v, int) and not isinstance(v, bool) for v in s["valuesCents"])
    return p


def all_ids() -> set[str]:
    return {r["id"] for rows in RECORDS.values() for r in rows if isinstance(r, dict) and "id" in r}


# ---------------------------------------------------------------------------------------------
# Key, health and bad bodies


def test_missing_key_is_key_missing(client, monkeypatch):
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", None)
    called = []
    monkeypatch.setattr(b07_ask, "make_client", lambda: called.append(1))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 503
    assert r.json() == {"error": {"code": "key_missing", "message": r.json()["error"]["message"]}}
    assert "ANTHROPIC_API_KEY" in r.json()["error"]["message"]
    assert called == []


def test_health_lists_b07_and_no_key(client, monkeypatch):
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", None)
    h = client.get("/api/health").json()
    assert "b07" in h["routers"]
    assert h["keys"]["anthropic"] is False


@pytest.mark.parametrize("bad", [
    {},
    {"trigger": None, "questionId": "ask_01", "text": "hi", "lang": "fr", "records": RECORDS},
    {"trigger": None, "questionId": "ask_01", "text": "  ", "lang": "en", "records": RECORDS},
    {"trigger": None, "questionId": "ask_01", "text": "hi", "lang": "en", "records": {"orders": []}},
])
def test_bad_body_is_bad_request(client, with_key, bad):
    r = client.post("/api/b07/ask", json=bad)
    assert r.status_code == 400
    err = r.json()["error"]
    assert err["code"] == "bad_request" and isinstance(err["message"], str)


# ---------------------------------------------------------------------------------------------
# The tools, in Python


def test_revenue_by_piece_matches_the_orders():
    recs = b07_ask.Records.model_validate(RECORDS)
    out = b07_ask.revenue_by_piece(recs, MONTH)
    sold = [o for o in RECORDS["orders"] if o["status"] == "paid"]
    assert sum(r["gross_cents"] for r in out["rows"]) == sum(o["grossCents"] for o in sold)
    assert sum(r["maker_share_cents"] for r in out["rows"]) == sum(o["makerShareCents"] for o in sold)
    refunded = {o["id"] for o in RECORDS["orders"] if o["status"] == "refunded"}
    assert refunded and not refunded & {i for r in out["rows"] for i in r["order_ids"]}
    grosses = [r["gross_cents"] for r in out["rows"]]
    assert grosses == sorted(grosses, reverse=True)
    titles = {p["id"]: p["title"] for p in RECORDS["catalog"]}
    assert all(r["label_zh"] == titles[r["piece_id"]]["zh"] for r in out["rows"])


def test_channel_and_maker_tools():
    recs = b07_ask.Records.model_validate(RECORDS)
    ch = b07_ask.revenue_by_channel(recs, MONTH)["rows"]
    sold = [o for o in RECORDS["orders"] if o["status"] == "paid"]
    assert sum(r["gross_cents"] for r in ch) == sum(o["grossCents"] for o in sold)
    mk = b07_ask.maker_earnings(recs, MONTH)["rows"]
    by_maker = {s["makerId"]: s for s in RECORDS["makerStatements"]}
    assert {r["maker_id"] for r in mk} == set(by_maker)
    for r in mk:
        assert r["earned_cents"] == by_maker[r["maker_id"]]["totalCents"]
        assert r["held_cents"] == by_maker[r["maker_id"]]["heldCents"]
    found = b07_ask.find_records(recs, "flags", ["flg_01", "flg_nope"])
    assert [f["id"] for f in found["records"]] == ["flg_01"] and found["missing_ids"] == ["flg_nope"]
    with pytest.raises(b07_ask.ToolError):
        b07_ask.revenue_by_piece(recs, "September")


def test_tools_are_strict_and_closed():
    def closed(schema: Any) -> None:
        if isinstance(schema, dict):
            if schema.get("type") == "object":
                assert schema.get("additionalProperties") is False
                assert set(schema["required"]) == set(schema["properties"])
            for v in schema.values():
                closed(v)
        elif isinstance(schema, list):
            for v in schema:
                closed(v)

    names = [t["name"] for t in b07_ask.TOOLS]
    assert names == ["revenue_by_piece", "revenue_by_channel", "maker_earnings", "find_records", "answer"]
    for t in b07_ask.TOOLS:
        assert t["strict"] is True
        closed(t["input_schema"])


def test_prompt_names_the_question_month_and_ids():
    req = b07_ask.AskRequest.model_validate(body())
    prompt = b07_ask.build_user_prompt(req)
    assert Q1["questions"]["zh"] in prompt and "Chinese" in prompt
    assert MONTH in prompt
    for rid in ("ord_001", "pc_03", "flg_01", "mst_01", "ctr_gallery_01"):
        assert rid in prompt
    # No figures in the prompt: numbers reach Claude only through tool results.
    assert str(RECORDS["orders"][0]["grossCents"]) not in prompt


# ---------------------------------------------------------------------------------------------
# The loop, with a fake client


def test_good_answer_with_chart(client, with_key, monkeypatch):
    fake = install(monkeypatch, FakeClient([
        reply(text_block("Let me add up the month."), tool_use("revenue_by_piece", {"month_id": MONTH})),
        answer_from_piece_rows,
    ]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 200, r.text
    events = r.json()["events"]
    assert len(events) == 1
    p = check_event(events[0], "ask_user_01", 41200)

    # The top piece and the chart are what revenue_by_piece computed, to the cent.
    recs = b07_ask.Records.model_validate(RECORDS)
    rows = b07_ask.revenue_by_piece(recs, MONTH)["rows"]
    assert p["refIds"][0] == rows[0]["piece_id"]
    assert set(p["refIds"]) <= all_ids()
    assert p["chart"]["series"][0]["valuesCents"] == [r["gross_cents"] for r in rows]
    assert p["chart"]["labels"] == [r["label_zh"] for r in rows]

    # The request: the plan's model, a timeout inside 6.5 s, no removed parameters, no prefill.
    assert len(fake.calls) == 2
    for call in fake.calls:
        assert call["model"] == "claude-sonnet-5-5"
        assert not FORBIDDEN_PARAMS & set(call)
        assert 0 < call["timeout"] <= 6.5
        assert call["messages"][-1]["role"] == "user"
        assert call["system"] == b07_ask.SYSTEM_PROMPT
    second = fake.calls[1]["messages"]
    assert second[1]["role"] == "assistant"
    assert [b["type"] for b in second[1]["content"]] == ["text", "tool_use"]
    assert second[2]["content"][0]["tool_use_id"] == "toolu_revenue_by_piece_1"


def test_good_answer_without_chart(client, with_key, monkeypatch):
    def explain(kwargs):
        flag = last_tool_result(kwargs)["records"][0]
        return reply(tool_use("answer", {
            "answer_en": "The gallery charged 50% instead of the contract's 40%, so it paid short. I trust the signed contract.",
            "answer_zh": "画廊按50%而非合同约定的40%抽成，所以少付了。我以已签合同为准。",
            "chart": None,
            "ref_ids": list(flag["recordIds"]),
        }, 2))

    install(monkeypatch, FakeClient([reply(tool_use("find_records", {"kind": "flags", "ids": ["flg_01"]})), explain]))
    r = client.post("/api/b07/ask", json=body(DATA["canned"][1]["questions"]["en"], "en", "ask_02", 0))
    assert r.status_code == 200, r.text
    p = check_event(r.json()["events"][0], "ask_02", 0)
    assert "chart" not in p
    assert p["refIds"] == DATA["canned"][1]["refIds"]


def test_records_cannot_answer(client, with_key, monkeypatch):
    install(monkeypatch, FakeClient([reply(tool_use("answer", {
        "answer_en": "The records don't say what the weather was.",
        "answer_zh": "账目里没有天气的记录。",
        "chart": None,
        "ref_ids": [],
    }))]))
    r = client.post("/api/b07/ask", json=body("What was the weather?", "en"))
    assert r.status_code == 200
    p = check_event(r.json()["events"][0], "ask_user_01", 41200)
    assert p["refIds"] == [] and "chart" not in p


def test_tool_errors_go_back_to_claude(client, with_key, monkeypatch):
    def after_error(kwargs):
        res = kwargs["messages"][-1]["content"][0]
        assert res["is_error"] is True
        return reply(tool_use("revenue_by_piece", {"month_id": MONTH}, 2))

    fake = install(monkeypatch, FakeClient([
        reply(tool_use("revenue_by_piece", {"month_id": "Sept"})),
        after_error,
        answer_from_piece_rows,
    ]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 200, r.text
    assert len(fake.calls) == 3


def test_prose_reply_gets_one_more_round(client, with_key, monkeypatch):
    fake = install(monkeypatch, FakeClient([
        reply(text_block("I think it was the grey, red and black weaving.")),
        reply(tool_use("revenue_by_piece", {"month_id": MONTH})),
        answer_from_piece_rows,
    ]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 200, r.text
    nudge = fake.calls[1]["messages"]
    assert nudge[-2]["role"] == "assistant" and nudge[-1] == {"role": "user", "content": "Please give your answer with the answer tool."}


@pytest.mark.parametrize("bad_input", [
    {"answer_en": "Only English.", "chart": None, "ref_ids": []},
    {"answer_en": "Hi.", "answer_zh": "", "chart": None, "ref_ids": []},
    {"answer_en": "Hi.", "answer_zh": "你好。", "chart": {"type": "pie", "title": {"en": "a", "zh": "b"}, "labels": [], "series": []}, "ref_ids": []},
    {"answer_en": "Hi.", "answer_zh": "你好。", "chart": None, "ref_ids": "pc_01"},
    "not an object",
])
def test_malformed_answer_is_invalid_model_output(client, with_key, monkeypatch, bad_input):
    install(monkeypatch, FakeClient([reply(tool_use("answer", bad_input))]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "invalid_model_output"


def test_chart_value_no_tool_returned(client, with_key, monkeypatch):
    def invent(kwargs):
        rows = last_tool_result(kwargs)["rows"]
        values = [r["gross_cents"] for r in rows]
        values[0] += 100  # one dollar more than the tool said
        return reply(tool_use("answer", {
            "answer_en": "Sales by piece.", "answer_zh": "各作品销售额。",
            "chart": {"type": "bar", "title": {"en": "Sales", "zh": "销售额"}, "labels": [r["label_en"] for r in rows],
                      "series": [{"name": {"en": "Sales", "zh": "销售额"}, "valuesCents": values}]},
            "ref_ids": [rows[0]["piece_id"]],
        }, 2))

    install(monkeypatch, FakeClient([reply(tool_use("revenue_by_piece", {"month_id": MONTH})), invent]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 502
    assert r.json()["error"] == {"code": "invalid_model_output", "message": "Claude's chart had a value no tool returned."}


def test_chart_before_any_tool_is_rejected(client, with_key, monkeypatch):
    install(monkeypatch, FakeClient([reply(tool_use("answer", {
        "answer_en": "Sales.", "answer_zh": "销售额。",
        "chart": {"type": "bar", "title": {"en": "Sales", "zh": "销售额"}, "labels": ["a"],
                  "series": [{"name": {"en": "Sales", "zh": "销售额"}, "valuesCents": [18000]}]},
        "ref_ids": [],
    }))]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 502 and r.json()["error"]["code"] == "invalid_model_output"


def test_unknown_ref_id(client, with_key, monkeypatch):
    install(monkeypatch, FakeClient([reply(tool_use("answer", {
        "answer_en": "The grey, red and black weaving.", "answer_zh": "灰红黑三色编织。", "chart": None, "ref_ids": ["pc_01", "pc_999"],
    }))]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "invalid_model_output"


def test_too_many_rounds_is_upstream_timeout(client, with_key, monkeypatch):
    fake = FakeClient([])
    fake.steps_last = reply(tool_use("revenue_by_channel", {"month_id": MONTH}))
    install(monkeypatch, fake)
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 504
    assert r.json()["error"]["code"] == "upstream_timeout"
    assert len(fake.calls) == b07_ask.MAX_ROUNDS == 4


def test_claude_timeout_is_upstream_timeout(client, with_key, monkeypatch):
    req = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    install(monkeypatch, FakeClient([anthropic.APITimeoutError(request=req)]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 504
    assert r.json()["error"]["code"] == "upstream_timeout"


def test_total_deadline_is_upstream_timeout(client, with_key, monkeypatch):
    clock = iter([0.0, 0.1, 7.0])  # the deadline, the first call, then past 6.5 s
    monkeypatch.setattr(b07_ask, "_now", lambda: next(clock, 7.0))
    fake = install(monkeypatch, FakeClient([reply(tool_use("revenue_by_piece", {"month_id": MONTH}))]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 504 and r.json()["error"]["code"] == "upstream_timeout"
    assert len(fake.calls) == 1


@pytest.mark.parametrize("status", [400, 429, 500, 529])
def test_claude_error_is_upstream_error(client, with_key, monkeypatch, status):
    req = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    err = anthropic.APIStatusError("upstream said no", response=httpx2.Response(status, request=req), body=None)
    install(monkeypatch, FakeClient([err]))
    r = client.post("/api/b07/ask", json=body())
    assert r.status_code == 502
    err_body = r.json()["error"]
    assert err_body["code"] == "upstream_error"
    assert "placeholder-for-tests" not in r.text


def test_question_id_comes_from_the_trigger(client, with_key, monkeypatch):
    install(monkeypatch, FakeClient([reply(tool_use("answer", {
        "answer_en": "Yes.", "answer_zh": "是的。", "chart": None, "ref_ids": [],
    }))]))
    b = body(question_id="ask_user_07")
    b["questionId"] = "ask_user_07"
    r = client.post("/api/b07/ask", json=b)
    assert r.json()["events"][0]["payload"]["questionId"] == "ask_user_07"


# ---------------------------------------------------------------------------------------------
# One real call


@pytest.mark.live
@needs_key("ANTHROPIC_API_KEY")
def test_live_first_canned_question(client):
    r = client.post("/api/b07/ask", json=body())
    if r.status_code == 504:
        pytest.skip("Claude didn't answer inside 6.5 seconds this time")
    assert r.status_code == 200, r.json()
    p = check_event(r.json()["events"][0], "ask_user_01", 41200)
    assert set(p["refIds"]) <= all_ids()
    recs = b07_ask.Records.model_validate(RECORDS)
    cents: set[int] = set()
    for tool in (b07_ask.revenue_by_piece, b07_ask.revenue_by_channel, b07_ask.maker_earnings):
        b07_ask._collect_cents(tool(recs, MONTH), cents)
    if "chart" in p:
        assert all(v in cents for s in p["chart"]["series"] for v in s["valuesCents"])
