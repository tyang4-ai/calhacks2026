"""B05 · the judge's scenario. Contract tests for POST /api/b05/scenario (multipart).

Fixtures, dumped from src/mock/scenario.ts:
- b05_statement.csv: the held-back statement as the CSV the adapter uploads (scenarioCsv).
- b05_month.json: the scenario's records (orders, payout, deposit, the gallery contract), the
  statement object, the sample's IDs and the scripted match.made and flag.raised replies.

How the live path is proven: b05-scenario has no timeline events, so the G5 live demo can't play
it. The "live path" tests below post exactly the form the adapter src/sources/live/b05-scenario.ts
builds (trigger = the person's scenario.loaded event, file, monthId, records) through TestClient,
for the sample, for a judge's own CSV sent as `content`, and for a bad file, and check every event
against events.md. The one test marked live makes the same sample call against the running API.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

HERE = Path(__file__).parent
MONTH = json.loads((HERE / "b05_month.json").read_text(encoding="utf-8"))
SAMPLE_CSV = (HERE / "b05_statement.csv").read_text(encoding="utf-8")
ENVELOPE = {"id", "type", "at", "source", "key", "payload"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URL = "/api/b05/scenario"


def sample_trigger(at: int = 21000) -> dict:
    """The scenario.loaded a person emits with "Use the sample statement" (useSample.ts)."""
    return {
        "id": "evt_user_0007",
        "type": "scenario.loaded",
        "at": at,
        "source": "user",
        "payload": {"scenarioId": MONTH["scenarioId"], "fileName": MONTH["sampleFileName"], "recordIds": list(MONTH["sampleRecordIds"])},
    }


def own_trigger(file_name: str, content: str, at: int = 30000) -> dict:
    """The scenario.loaded the drop zone emits for a person's own file (DropZone.tsx)."""
    return {
        "id": "evt_user_0008",
        "type": "scenario.loaded",
        "at": at,
        "source": "user",
        "payload": {"scenarioId": MONTH["scenarioId"], "fileName": file_name, "recordIds": [], "content": content},
    }


def sample_records() -> dict:
    return json.loads(json.dumps(MONTH["records"]))


def own_records() -> dict:
    """What the adapter sends with a person's own file: only the contract, so the sample's
    deposit can't be taken for the judge's payment."""
    return {"orders": [], "payouts": [], "refunds": [], "statements": [], "bankTxns": [], "contracts": MONTH["records"]["contracts"]}


def post(client, trigger, file_name: str, content: str | bytes, records: dict, month_id: str = "2026-10"):
    data = content.encode("utf-8") if isinstance(content, str) else content
    mime = "application/json" if file_name.endswith(".json") else "text/csv"
    return client.post(
        URL,
        data={"trigger": json.dumps(trigger), "monthId": month_id, "records": json.dumps(records)},
        files={"file": (file_name, data, mime)},
    )


# --- events.md checks --------------------------------------------------------------------------

PAYLOADS = {
    "scenario.loaded": ({"scenarioId", "fileName"}, {"recordIds", "content"}),
    "match.made": ({"matchId", "kind", "recordIds"}, {"intoMonthId"}),
    "flag.raised": ({"flagId", "kind", "recordIds", "expectedCents", "actualCents", "deltaCents"}, set()),
}


def check_event(e: dict, at: int) -> None:
    assert set(e) == ENVELOPE
    assert e["source"] == "live" and e["key"] == "b05-scenario"
    assert isinstance(e["id"], str) and e["id"].startswith("evt_live_") and e["id"][9:].isdigit()
    assert e["at"] == at
    required, optional = PAYLOADS[e["type"]]
    p = e["payload"]
    assert required <= set(p) <= required | optional, (e["type"], set(p))
    if e["type"] == "scenario.loaded":
        assert isinstance(p["scenarioId"], str) and isinstance(p["fileName"], str)
        assert "content" not in p  # the server never echoes the file
        if "recordIds" in p:
            assert all(isinstance(x, str) for x in p["recordIds"])
    elif e["type"] == "match.made":
        assert p["kind"] in {"one_to_one", "bundled", "refund_netted", "carried_over"}
        assert "scn_" in p["matchId"]
        assert all(isinstance(x, str) for x in p["recordIds"])
    else:
        assert p["kind"] == "short_payment"
        assert "scn_" in p["flagId"]
        for f in ("expectedCents", "actualCents", "deltaCents"):
            assert type(p[f]) is int
        assert p["deltaCents"] == p["expectedCents"] - p["actualCents"]


def check_response(res, at: int) -> list[dict]:
    assert res.status_code == 200, res.text
    body = res.json()
    assert set(body) == {"events"}
    events = body["events"]
    assert events and events[0]["type"] == "scenario.loaded"
    for e in events:
        check_event(e, at)
    ids = [e["id"] for e in events]
    assert len(set(ids)) == len(ids)
    return events


def check_error(res, status: int = 400, code: str = "bad_request") -> str:
    assert res.status_code == status, res.text
    err = res.json()
    assert set(err) == {"error"} and set(err["error"]) == {"code", "message"}
    assert err["error"]["code"] == code
    msg = err["error"]["message"]
    assert isinstance(msg, str) and msg and "\n" not in msg and "Traceback" not in msg
    return msg


# --- The live path, as the adapter calls it ----------------------------------------------------


def test_live_path_sample_matches_the_scripted_answer(client):
    """The held-back sample returns scenario.loaded, its two matches and the 850-cent flag, with
    the scripted IDs, so the panel shows the same thing it shows in scripted mode."""
    events = check_response(post(client, sample_trigger(), MONTH["sampleFileName"], SAMPLE_CSV, sample_records()), 21000)
    loaded = events[0]["payload"]
    assert loaded == {"scenarioId": "scn_01", "fileName": MONTH["sampleFileName"], "recordIds": MONTH["sampleRecordIds"]}
    got = [{"type": e["type"], "payload": e["payload"]} for e in events[1:]]
    assert got == MONTH["replies"]
    flag = events[-1]["payload"]
    assert (flag["expectedCents"], flag["actualCents"], flag["deltaCents"]) == (18000, 17150, 850)
    assert flag["recordIds"] == ["ctr_gallery_01", "scn_stm_01", "scn_txn_01"]


def test_live_path_judges_own_csv(client):
    """A person's own CSV, sent as content: a new stm_scn_ statement, a match per fair line, and a
    flag against what the statement says it pays, since there's no deposit for it."""
    csv_text = (
        "date,orderId,pieceId,saleCents,commissionBps,netCents\n"
        "2026-10-12,judge_ord_1,pc_02,20000,4000,12000\n"
        "2026-10-14,judge_ord_2,pc_04,10000,4500,5500\n"
    )
    res = post(client, own_trigger("my-gallery.csv", csv_text), "my-gallery.csv", csv_text, own_records())
    events = check_response(res, 30000)
    loaded = events[0]["payload"]
    assert loaded == {"scenarioId": "scn_01", "fileName": "my-gallery.csv"}
    matches = [e["payload"] for e in events if e["type"] == "match.made"]
    flags = [e["payload"] for e in events if e["type"] == "flag.raised"]
    assert len(matches) == 1 and len(flags) == 1
    sid = matches[0]["recordIds"][0]
    assert re.fullmatch(r"stm_scn_\d+", sid)
    assert matches[0]["recordIds"] == [sid, "judge_ord_1"] and matches[0]["kind"] == "one_to_one"
    assert re.fullmatch(r"scn_mat_live_\d+", matches[0]["matchId"])
    assert flags[0]["recordIds"] == ["ctr_gallery_01", sid]
    # Owed at 40%: 12000 + 6000 = 18000. The statement pays 12000 + 5500 = 17500.
    assert (flags[0]["expectedCents"], flags[0]["actualCents"], flags[0]["deltaCents"]) == (18000, 17500, 500)
    assert re.fullmatch(r"scn_flg_live_\d+", flags[0]["flagId"])


def test_live_path_fair_csv_has_matches_and_no_flag(client):
    csv_text = "date,orderId,pieceId,saleCents,commissionBps,netCents\r\n2026-10-12,j1,pc_02,20000,4000,12000\r\n"
    events = check_response(post(client, own_trigger("fair.csv", csv_text), "fair.csv", csv_text, own_records()), 30000)
    assert [e["type"] for e in events] == ["scenario.loaded", "match.made"]


def test_live_path_bad_file_names_the_row(client):
    csv_text = (
        "date,orderId,pieceId,saleCents,commissionBps,netCents\n"
        "2026-10-12,j1,pc_02,20000,4000,12000\n"
        "2026-10-13,j2,pc_03,twelve,4000,7200\n"
    )
    msg = check_error(post(client, own_trigger("bad.csv", csv_text), "bad.csv", csv_text, own_records()))
    assert "Row 3" in msg and "saleCents" in msg


def test_json_statement_matches_like_the_csv(client):
    """A JSON Statement object from data-model.md gives the same results as the CSV, under a new
    statement ID (it's a person's own file)."""
    stm = dict(MONTH["statement"], id="anything_the_judge_wrote")
    text = json.dumps(stm, ensure_ascii=False)
    events = check_response(post(client, own_trigger("statement.json", text), "statement.json", text, sample_records()), 30000)
    matches = [e["payload"] for e in events if e["type"] == "match.made"]
    flags = [e["payload"] for e in events if e["type"] == "flag.raised"]
    sid = flags[0]["recordIds"][1]
    assert re.fullmatch(r"stm_scn_\d+", sid)
    assert [m["recordIds"] for m in matches] == [[sid, "scn_ord_01"], [sid, "scn_ord_02"]]
    assert flags[0]["recordIds"] == ["ctr_gallery_01", sid, "scn_txn_01"]
    assert flags[0]["deltaCents"] == 850


# --- Errors ------------------------------------------------------------------------------------


def test_file_over_1_mb_is_bad_request(client):
    big = SAMPLE_CSV + ("2026-10-03,scn_ord_01,pc_09,12000,4000,7200\n" * 50000)
    assert len(big.encode()) > 2_000_000
    msg = check_error(post(client, sample_trigger(), "big.csv", big, sample_records()))
    assert "1 MB" in msg


@pytest.mark.parametrize(
    ("content", "needle"),
    [
        ("date,order,pieceId,saleCents,commissionBps,netCents\n2026-10-03,a,pc_09,1,4000,1\n", "Row 1"),
        ("date,orderId,pieceId,saleCents,commissionBps,netCents\n2026-13-03,a,pc_09,1,4000,1\n", "Row 2"),
        ("date,orderId,pieceId,saleCents,commissionBps,netCents\n2026-10-03,a,pc_09,1,4000\n", "Row 2"),
        ("date,orderId,pieceId,saleCents,commissionBps,netCents\n2026-10-03,,pc_09,1,4000,1\n", "Row 2"),
        ("date,orderId,pieceId,saleCents,commissionBps,netCents\n2026-10-03,a,pc_09,1,40000,1\n", "Row 2"),
        ("date,orderId,pieceId,saleCents,commissionBps,netCents\n", "no statement rows"),
        ("", "empty"),
    ],
)
def test_bad_csv_is_bad_request(client, content, needle):
    msg = check_error(post(client, own_trigger("x.csv", content), "x.csv", content, own_records()))
    assert needle in msg


@pytest.mark.parametrize(
    ("content", "needle"),
    [
        ("{not json", "doesn't parse"),
        ("[1, 2]", "one Statement object"),
        (json.dumps({"issuedDate": "2026-10-09", "lines": []}), "no lines"),
        (json.dumps({"issuedDate": "2026-10-09", "lines": [{"orderId": "a", "pieceId": "p", "saleCents": 1.5, "commissionBps": 4000, "netCents": 1}]}), "Line 1"),
        (json.dumps({"lines": [{"orderId": "a"}]}), "issuedDate"),
        (json.dumps({"channelId": "ch_site", "issuedDate": "2026-10-09", "lines": [{"orderId": "a"}]}), "gallery"),
    ],
)
def test_bad_json_is_bad_request(client, content, needle):
    msg = check_error(post(client, own_trigger("x.json", content), "x.json", content, own_records()))
    assert needle in msg


def test_non_utf8_file_is_bad_request(client):
    check_error(post(client, own_trigger("x.csv", ""), "x.csv", b"\xff\xfe\x00bad", own_records()))


@pytest.mark.parametrize("drop", ["trigger", "file", "monthId", "records"])
def test_missing_form_field_is_bad_request(client, drop):
    data = {"trigger": json.dumps(sample_trigger()), "monthId": "2026-10", "records": json.dumps(sample_records())}
    files = {"file": ("s.csv", SAMPLE_CSV.encode(), "text/csv")}
    if drop == "file":
        files = {}
    else:
        del data[drop]
    check_error(client.post(URL, data=data, files=files or None))


def test_bad_trigger_records_and_month_are_bad_requests(client):
    for data in (
        {"trigger": "{oops", "monthId": "2026-10", "records": json.dumps(sample_records())},
        {"trigger": json.dumps(sample_trigger()), "monthId": "2026-10", "records": "[]"},
        {"trigger": json.dumps(sample_trigger()), "monthId": "October", "records": json.dumps(sample_records())},
    ):
        check_error(client.post(URL, data=data, files={"file": ("s.csv", SAMPLE_CSV.encode(), "text/csv")}))
    bad_records = sample_records()
    bad_records["orders"] = [{"id": "scn_ord_01"}]
    check_error(post(client, sample_trigger(), "s.csv", SAMPLE_CSV, bad_records))


def test_json_body_instead_of_a_form_is_bad_request(client):
    check_error(client.post(URL, json={"trigger": None, "monthId": "2026-10"}))


def test_null_trigger_gives_at_zero_and_new_ids(client):
    res = client.post(
        URL,
        data={"trigger": "null", "monthId": "2026-10", "records": json.dumps(own_records())},
        files={"file": ("s.csv", SAMPLE_CSV.encode(), "text/csv")},
    )
    events = check_response(res, 0)
    assert re.fullmatch(r"scn_live_\d+", events[0]["payload"]["scenarioId"])
    assert events[0]["payload"]["fileName"] == "s.csv"
    assert all(e["type"] != "flag.raised" or re.fullmatch(r"scn_flg_live_\d+", e["payload"]["flagId"]) for e in events)


def test_health_lists_b05_and_b01(client):
    routers = client.get("/api/health").json()["routers"]
    assert "b05" in routers and "b01" in routers


# --- One live call -----------------------------------------------------------------------------


@pytest.mark.live
def test_live_sample_against_running_api():
    """One real call to the API on localhost:8000 (B05 needs no key). Skips when the API isn't up
    or hasn't loaded b05 yet."""
    httpx = pytest.importorskip("httpx")
    try:
        health = httpx.get("http://localhost:8000/api/health", timeout=3).json()
    except Exception:
        pytest.skip("the API on localhost:8000 isn't running")
    if "b05" not in health.get("routers", []):
        pytest.skip("the running API hasn't loaded b05 yet")
    res = httpx.post(
        f"http://localhost:8000{URL}",
        data={"trigger": json.dumps(sample_trigger()), "monthId": "2026-10", "records": json.dumps(sample_records())},
        files={"file": (MONTH["sampleFileName"], SAMPLE_CSV.encode(), "text/csv")},
        timeout=7,
    )
    events = check_response(res, 21000)
    assert [{"type": e["type"], "payload": e["payload"]} for e in events[1:]] == MONTH["replies"]
