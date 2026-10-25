"""B16 · the books checked against the bank, on Nessie. Contract tests with FastAPI's TestClient and a
fake Nessie behind httpx.MockTransport holding the co-op's operating account from
tests/server/b16_fixture.json, so nothing here touches the network.

The one test marked `live` needs NESSIE_KEY and skips without it: it seeds B16's two accounts, posts
the tour's community fund move once, and reconciles the fixture month against the real sandbox.
"""

from __future__ import annotations

import copy
import json
import logging
import re
import threading
import time
from pathlib import Path
from typing import Any, Optional

import httpx
import pytest
from conftest import needs_key

from server import config
from server.b16_bank_books import accounts, books
from server.routers import b01_match, b04_bank, b04_nessie
from server.routers import b16_bank_books as b16

FIXTURE = json.loads((Path(__file__).parent / "b16_fixture.json").read_text(encoding="utf-8"))
NESSIE = FIXTURE["nessie"]
OPERATING_ID = NESSIE["operatingId"]
FLAG = FIXTURE["scriptedFlag"]
FAKE_KEY = "fake-test-key-b16-0000"
EVT_LIVE_16 = re.compile(r"^evt_live_16\d{10,}$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
PARTY_KINDS = {"buyer", "cindia", "card_network", "studio", "maker", "gallery", "processor", "supplier", "community_fund"}
MOVE_KINDS = {"sale", "fee", "settlement", "payout_in", "materials", "maker_pay", "refund", "project_fund", "milestone"}
STATUS_FIELDS = {"operating", "seeded", "fundAccountId", "heldAccountId", "fundBalanceCents", "heldBalanceCents"}


# ---------------------------------------------------------------------------------------------
# A fake Nessie: customers, accounts, deposits and withdrawals in memory, seeded from the fixture.
# Create calls answer with a plain JSON string, as the spec says, so the server reads the list back.


class FakeNessie:
    def __init__(self, seeded: bool = True) -> None:
        self.customers: list[dict[str, Any]] = copy.deepcopy(NESSIE["customers"]) if seeded else []
        self.accounts: list[dict[str, Any]] = copy.deepcopy(NESSIE["accounts"]) if seeded else []
        self.deposits: dict[str, list[dict[str, Any]]] = copy.deepcopy(NESSIE["deposits"]) if seeded else {}
        self.withdrawals: dict[str, list[dict[str, Any]]] = copy.deepcopy(NESSIE["withdrawals"]) if seeded else {}
        self.calls: list[tuple[str, str, str]] = []  # (method, host, path)
        self.timeouts: list[float] = []
        self.keys_seen: set[str] = set()
        self.fail_with: Optional[int] = None
        self.timeout_on: Optional[str] = None  # a path fragment that times out
        self.delay_s = 0.0
        self.n = 0
        self.lock = threading.Lock()

    def _id(self) -> str:
        self.n += 1
        return f"b16f{self.n:020x}"

    def posts(self) -> list[str]:
        return [p for m, _, p in self.calls if m == "POST"]

    def account(self, nickname: str, customer_id: Optional[str] = None) -> Optional[dict[str, Any]]:
        cid = customer_id or NESSIE["customers"][0]["_id"]
        return next((a for a in self.accounts if a["nickname"] == nickname and a["customer_id"] == cid), None)

    def handler(self, request: httpx.Request) -> httpx.Response:
        with self.lock:
            return self._handle(request)

    def _handle(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        self.calls.append((request.method, request.url.host, path))
        self.keys_seen.add(request.url.params.get("key", ""))
        timeout = request.extensions.get("timeout", {})
        self.timeouts.append(max(v for v in timeout.values() if v is not None) if timeout else 999.0)
        if self.delay_s:
            time.sleep(self.delay_s)
        if self.timeout_on and self.timeout_on in path:
            raise httpx.ReadTimeout("slow", request=request)
        if self.fail_with:
            return httpx.Response(self.fail_with, json={"code": self.fail_with, "message": "boom"})
        if request.url.params.get("key") != FAKE_KEY:
            return httpx.Response(401, json={"code": 401, "message": "bad key"})
        body = json.loads(request.content) if request.content else None
        parts = [p for p in path.split("/") if p]
        m = request.method

        if parts == ["accounts"] and m == "GET":
            return httpx.Response(200, json=self.accounts)
        if parts == ["customers"] and m == "GET":
            return httpx.Response(200, json=self.customers)
        if len(parts) == 3 and parts[0] == "customers" and parts[2] == "accounts":
            cid = parts[1]
            if m == "GET":
                return httpx.Response(200, json=[a for a in self.accounts if a["customer_id"] == cid])
            assert set(body) == {"type", "nickname", "rewards", "balance"}
            acct = {"_id": self._id(), "customer_id": cid, "account_number": "3" * 16, **body}
            self.accounts.append(acct)
            self.deposits[acct["_id"]] = []
            self.withdrawals[acct["_id"]] = []
            return httpx.Response(201, json="Account created")
        if len(parts) >= 2 and parts[0] == "accounts":
            aid = parts[1]
            acct = next((a for a in self.accounts if a["_id"] == aid), None)
            if acct is None:
                return httpx.Response(404, json={"code": 404, "message": "no account"})
            if len(parts) == 2:
                return httpx.Response(200, json=acct)
            store = {"deposits": self.deposits, "withdrawals": self.withdrawals}.get(parts[2])
            if store is None:
                return httpx.Response(404, json={"code": 404, "message": "no such endpoint"})
            if m == "GET":
                return httpx.Response(200, json=store[aid])
            for f in ("medium", "transaction_date", "status", "amount", "description"):
                assert f in body, f"missing {f}"
            assert isinstance(body["amount"], int)
            kind = parts[2][:-1]
            store[aid].append({"_id": self._id(), "type": kind, **body})
            return httpx.Response(201, json=f"{kind.capitalize()} created")
        return httpx.Response(404, json={"code": 404, "message": "not found"})


@pytest.fixture
def fake(monkeypatch):
    yield from _fake(monkeypatch, seeded=True)


@pytest.fixture
def empty_fake(monkeypatch):
    """A Nessie where B04 hasn't seeded the co-op's account yet."""
    yield from _fake(monkeypatch, seeded=False)


def _fake(monkeypatch, seeded: bool):
    nessie = FakeNessie(seeded=seeded)
    monkeypatch.setattr(config, "NESSIE_KEY", FAKE_KEY)
    monkeypatch.setattr(accounts, "BACKGROUND", False)
    monkeypatch.setattr(b16, "PROCESS", lambda *a: None)
    b16.reset_for_tests()
    b04_bank.reset_for_tests()
    b04_nessie.set_transport(httpx.MockTransport(nessie.handler))
    yield nessie
    b04_nessie.set_transport(None)
    b16.reset_for_tests()
    b04_bank.reset_for_tests()


@pytest.fixture
def no_key(monkeypatch):
    monkeypatch.setattr(config, "NESSIE_KEY", None)
    monkeypatch.setattr(accounts, "BACKGROUND", False)
    b16.reset_for_tests()
    yield
    b16.reset_for_tests()


@pytest.fixture
def logs():
    """Every log line from the server's logger and the HTTP client loggers, at any level."""
    lines: list[str] = []

    class Grab(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            lines.append(record.getMessage())

    handler = Grab(level=logging.DEBUG)
    names = ("cindia", "httpx", "httpcore")
    for n in names:
        logging.getLogger(n).addHandler(handler)
    yield lines
    for n in names:
        logging.getLogger(n).removeHandler(handler)


# ---------------------------------------------------------------------------------------------
# Bodies and checks


def flag_trigger(**changes: Any) -> dict[str, Any]:
    payload = {**FLAG, **changes}
    return {"id": "evt_0150", "type": "flag.raised", "at": 141800, "source": "live", "key": "b01-match", "payload": payload}


def reconcile_body(trigger: Optional[dict[str, Any]] = None, **records: Any) -> dict[str, Any]:
    return {
        "trigger": trigger if trigger is not None else flag_trigger(),
        "monthId": FIXTURE["monthId"],
        "records": {**copy.deepcopy(FIXTURE["records"]), **records},
    }


def seed_body(**commission: Any) -> dict[str, Any]:
    return {"trigger": None, "commission": {**FIXTURE["commission"], **commission}}


def move(name: str, **payload: Any) -> dict[str, Any]:
    trig = copy.deepcopy(FIXTURE["moves"][name])
    trig["payload"].update(payload)
    return {"trigger": trig}


def check_envelope(e: dict[str, Any], event_type: str, at: int | float) -> None:
    assert set(e) == {"id", "type", "at", "source", "key", "payload"}
    assert EVT_LIVE_16.match(e["id"]), e["id"]
    assert e["type"] == event_type
    assert e["at"] == at
    assert e["source"] == "live"
    assert e["key"] == "b16-bank-books"


def check_flag(p: dict[str, Any]) -> None:
    """flag.raised's payload as events.md gives it, with B16's nessieId."""
    assert set(p) == {"flagId", "kind", "recordIds", "expectedCents", "actualCents", "deltaCents", "nessieId"}
    assert isinstance(p["flagId"], str) and p["flagId"]
    assert p["kind"] == "short_payment"
    assert isinstance(p["recordIds"], list) and all(isinstance(i, str) and i for i in p["recordIds"])
    for f in ("expectedCents", "actualCents", "deltaCents"):
        assert isinstance(p[f], int) and not isinstance(p[f], bool)
    assert p["deltaCents"] == p["expectedCents"] - p["actualCents"]
    assert isinstance(p["nessieId"], str) and p["nessieId"]


def check_move(p: dict[str, Any]) -> None:
    """money.moved's payload as events.md gives it, with B16's nessieId."""
    assert set(p) <= {"moveId", "kind", "from", "to", "amountCents", "refId", "date", "nessieId"}
    assert {"moveId", "kind", "from", "to", "amountCents", "refId", "date", "nessieId"} <= set(p)
    assert p["kind"] in MOVE_KINDS
    for side in ("from", "to"):
        assert set(p[side]) <= {"kind", "id"} and p[side]["kind"] in PARTY_KINDS
    assert isinstance(p["amountCents"], int) and p["amountCents"] > 0
    assert DATE.match(p["date"])
    assert isinstance(p["nessieId"], str) and p["nessieId"]


def check_error(res, status: int, code: str) -> None:
    assert res.status_code == status, res.text
    body = res.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message"}
    assert body["error"]["code"] == code
    msg = body["error"]["message"]
    assert isinstance(msg, str) and msg
    assert FAKE_KEY not in msg and "key=" not in msg and "nessieisreal" not in msg


def seeded(client) -> None:
    res = client.post("/api/b16/seed", json=seed_body())
    assert res.status_code == 200, res.text


def operating_records(fake: FakeNessie) -> tuple[list, list]:
    return fake.deposits[OPERATING_ID], fake.withdrawals[OPERATING_ID]


# ---------------------------------------------------------------------------------------------
# T1 · books.py: Nessie's records to BankTxns, and B01's matcher over them


def test_seeded_descriptions_map_back_to_the_scripted_ids_and_ref_ids():
    txns = {t["id"]: t for t in books.bank_txns(NESSIE["deposits"][OPERATING_ID], NESSIE["withdrawals"][OPERATING_ID])}
    by_nessie = {r["_id"]: r for r in NESSIE["deposits"][OPERATING_ID] + NESSIE["withdrawals"][OPERATING_ID]}
    for s in FIXTURE["scriptedBankTxns"]:
        t = txns[s["id"]]
        assert (t["date"], t["direction"], t["amountCents"], t["memo"]) == (s["date"], s["direction"], s["amountCents"], s["memo"])
        if s["refId"].startswith("pay_"):
            assert t["refId"] == s["refId"]  # the payout ends the memo
        else:
            assert t["refId"] == s["id"]  # a purchase's memo names no ID, so the scripted ID stands in
        assert by_nessie[t["nessieId"]]["description"] == f"{s['memo']} ({s['id']})"
    # B04's live lines carry no scripted ID: nessie_<_id>, and a maker payout's refId from its memo.
    payouts = [t for t in txns.values() if t["memo"].startswith("Maker payout ")]
    assert sorted(t["refId"] for t in payouts) == ["mpo_01", "mpo_02", "mpo_03"]
    assert all(t["id"] == f"nessie_{t['nessieId']}" and t["direction"] == "out" for t in payouts)
    sale = next(t for t in txns.values() if t["memo"].startswith("Cindia sale ord_001"))
    assert sale["id"] == sale["refId"] == f"nessie_{sale['nessieId']}" and sale["amountCents"] == 15648
    opening = next(t for t in txns.values() if t["memo"] == b04_bank.OPENING_DESCRIPTION)
    assert opening["date"] == "2026-08-31" and opening["amountCents"] == 1250000


def test_a_cancelled_record_is_left_out():
    deposits = NESSIE["deposits"][OPERATING_ID]
    cancelled = [d for d in deposits if d["status"] == "cancelled"]
    assert len(cancelled) == 1
    txns = books.bank_txns(deposits, NESSIE["withdrawals"][OPERATING_ID])
    assert cancelled[0]["_id"] not in {t["nessieId"] for t in txns}
    assert len(txns) == len(deposits) - 1 + len(NESSIE["withdrawals"][OPERATING_ID])
    # It matters: counted, the cancelled full-amount deposit would hide the short payment.
    counted = [{**d, "status": "completed"} for d in deposits]
    flags = books.reconcile(FIXTURE["monthId"], FIXTURE["records"], counted, NESSIE["withdrawals"][OPERATING_ID])
    assert flags == []


def test_the_fixture_month_gives_flg_01_with_v1_figures_and_the_gallery_deposits_nessie_id():
    trigger = flag_trigger()
    flags = books.reconcile(
        FIXTURE["monthId"],
        FIXTURE["records"],
        NESSIE["deposits"][OPERATING_ID],
        NESSIE["withdrawals"][OPERATING_ID],
        ids=b01_match._trigger_picker(trigger),
    )
    assert len(flags) == 1
    p = flags[0]["payload"]
    check_flag(p)
    assert p["flagId"] == "flg_01"
    assert (p["expectedCents"], p["actualCents"], p["deltaCents"]) == (FLAG["expectedCents"], FLAG["actualCents"], FLAG["deltaCents"])
    assert (p["expectedCents"], p["actualCents"], p["deltaCents"]) == (204000, 170000, 34000)
    assert p["recordIds"] == FLAG["recordIds"]
    assert p["nessieId"] == NESSIE["galleryDepositId"]
    assert flags[0]["date"] == "2026-09-30"


def test_without_a_trigger_the_flag_gets_a_live_id_and_the_same_figures():
    flags = books.reconcile(FIXTURE["monthId"], FIXTURE["records"], NESSIE["deposits"][OPERATING_ID], NESSIE["withdrawals"][OPERATING_ID])
    assert len(flags) == 1
    assert flags[0]["payload"]["flagId"].startswith("flg_live_")
    assert flags[0]["payload"]["deltaCents"] == 34000


def test_the_newest_record_with_a_scripted_id_wins_and_odd_records_are_skipped():
    gallery = next(d for d in NESSIE["deposits"][OPERATING_ID] if d["_id"] == NESSIE["galleryDepositId"])
    newer = {**gallery, "_id": "b16newer000000000000000a"}
    odd = [{"_id": "x" * 24, "amount": "lots", "transaction_date": "2026-09-30", "description": "?"}, {"amount": 5}, "not a record"]
    txns = books.bank_txns([gallery, newer, *odd], [])
    assert [t["nessieId"] for t in txns] == ["b16newer000000000000000a"]


@pytest.mark.parametrize(
    "description,memo,scripted",
    [
        ("Gallery payment pay_023 (txn_026)", "Gallery payment pay_023", "txn_026"),
        ("Wool weaving yarn, 4 kg (txn_003)", "Wool weaving yarn, 4 kg", "txn_003"),
        ("Opening balance std_dine 2026-09", "Opening balance std_dine 2026-09", None),
        ("Maker payout mpo_01", "Maker payout mpo_01", None),
        ("Community fund ctb_01 (mv_0102)", "Community fund ctb_01", "mv_0102"),
    ],
)
def test_split_description(description, memo, scripted):
    assert books.split_description(description) == (memo, scripted)


# ---------------------------------------------------------------------------------------------
# Without the key


def test_health_lists_b16(client, no_key):
    body = client.get("/api/health").json()
    assert "b16" in body["routers"]
    assert body["keys"]["nessie"] is False


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("GET", "/api/b16/status", None),
        ("POST", "/api/b16/seed", seed_body()),
        ("POST", "/api/b16/reconcile", reconcile_body()),
        ("POST", "/api/b16/moves", move("fund")),
    ],
)
def test_every_route_needs_the_key(client, no_key, method, path, body):
    check_error(client.request(method, path, json=body), 503, "key_missing")


# ---------------------------------------------------------------------------------------------
# T2 · accounts.py, through the seed and the moves


def test_seed_creates_the_two_accounts_under_the_co_ops_customer_and_the_held_opening_deposit(client, fake):
    res = client.post("/api/b16/seed", json=seed_body())
    assert res.status_code == 200
    assert res.json() == {"events": []}
    customer = NESSIE["customers"][0]["_id"]
    fund = fake.account(accounts.FUND_NICKNAME, customer)
    held = fake.account(accounts.HELD_NICKNAME, customer)
    assert fund and held and fund["type"] == held["type"] == "Checking"
    assert fund["nickname"] == "Community fund prj_01" and held["nickname"] == "Commissions held by Cindia"
    assert fake.deposits[fund["_id"]] == [] and fake.withdrawals[fund["_id"]] == []
    [opening] = fake.deposits[held["_id"]]
    assert (opening["amount"], opening["transaction_date"], opening["description"]) == (120000, "2026-09-01", "Commission wip_01 paid in")
    assert opening["medium"] == "balance" and opening["status"] == "completed"
    # The other customer's account of the same nickname is never used.
    other = NESSIE["accounts"][0]
    assert fake.deposits[other["_id"]] == []
    # The seed refreshed the cached status, so the adapter's next health() sees it.
    status = client.get("/api/b16/status").json()
    assert status == {
        "operating": True,
        "seeded": True,
        "fundAccountId": fund["_id"],
        "heldAccountId": held["_id"],
        "fundBalanceCents": 0,
        "heldBalanceCents": 120000,
    }


def test_a_second_seed_creates_nothing(client, fake):
    seeded(client)
    before = len(fake.posts())
    b16.reset_for_tests()  # as after a server restart: the IDs are found again
    assert client.post("/api/b16/seed", json=seed_body()).status_code == 200
    assert client.post("/api/b16/seed", json=seed_body()).status_code == 200
    assert len(fake.posts()) == before
    assert sum(1 for a in fake.accounts if a["customer_id"] == NESSIE["customers"][0]["_id"]) == 3


def test_two_seeds_at_once_create_each_record_once(client, fake):
    fake.delay_s = 0.02
    results: list[int] = []

    def run() -> None:
        results.append(client.post("/api/b16/seed", json=seed_body()).status_code)

    threads = [threading.Thread(target=run) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert results == [200, 200]
    assert len([p for p in fake.posts() if p.endswith("/accounts")]) == 2
    assert len([p for p in fake.posts() if p.endswith("/deposits")]) == 1


def test_a_seed_cut_short_finishes_on_the_next_call(client, fake):
    fake.timeout_on = "/deposits"
    check_error(client.post("/api/b16/seed", json=seed_body()), 504, "upstream_timeout")
    fake.timeout_on = None
    accounts.refresh_status()
    assert client.get("/api/b16/status").json()["seeded"] is False
    seeded(client)
    assert client.get("/api/b16/status").json()["seeded"] is True
    held = fake.account(accounts.HELD_NICKNAME)
    assert len(fake.deposits[held["_id"]]) == 1


def test_a_replayed_move_reuses_its_record(client, fake):
    seeded(client)
    first = client.post("/api/b16/moves", json=move("fund")).json()["events"]
    n = len(fake.posts())
    b16.reset_for_tests()  # a restart in between changes nothing
    again = client.post("/api/b16/moves", json=move("fund")).json()["events"]
    assert len(fake.posts()) == n
    assert first[0]["payload"]["nessieId"] == again[0]["payload"]["nessieId"]
    fund = fake.account(accounts.FUND_NICKNAME)
    assert [d["description"] for d in fake.deposits[fund["_id"]]] == ["Community fund ctb_01 (mv_0102)"]


@pytest.mark.parametrize(
    "name,changes",
    [
        ("buyerLeg", {}),  # project_fund, buyer to Cindia
        ("fund", {"to": {"kind": "studio", "id": "std_dine"}}),
        ("fund", {"kind": "maker_pay"}),
        ("fund", {"kind": "settlement"}),
        ("milestone", {"from": {"kind": "studio", "id": "std_dine"}}),
    ],
)
def test_a_move_of_another_kind_is_refused(client, fake, name, changes):
    seeded(client)
    n = len(fake.calls)
    check_error(client.post("/api/b16/moves", json=move(name, **changes)), 400, "bad_request")
    assert len(fake.calls) == n  # refused before any Nessie call


def test_the_operating_account_is_never_written(client, fake):
    before = copy.deepcopy(operating_records(fake))
    seeded(client)
    assert client.post("/api/b16/moves", json=move("fund")).status_code == 200
    assert client.post("/api/b16/moves", json=move("milestone")).status_code == 200
    assert client.post("/api/b16/reconcile", json=reconcile_body()).status_code == 200
    assert operating_records(fake) == before
    assert not any(OPERATING_ID in p for p in fake.posts())
    with pytest.raises(Exception):
        accounts.post_once(b04_nessie.Budget(5), "in", OPERATING_ID, 100, "2026-09-01", "never")
    assert operating_records(fake) == before


# ---------------------------------------------------------------------------------------------
# T3 · the endpoints


def test_status_answers_from_the_cache_without_calling_nessie(client, fake):
    fake.delay_s = 1.0  # a slow Nessie never slows the status down
    t0 = time.perf_counter()
    res = client.get("/api/b16/status")
    ms = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200 and ms < 300
    assert res.json() == accounts.COLD and set(res.json()) == STATUS_FIELDS
    assert fake.calls == []


def test_status_before_and_after_the_seed(client, fake):
    accounts.refresh_status()
    before = client.get("/api/b16/status").json()
    assert before == {**accounts.COLD, "operating": True}
    seeded(client)
    after = client.get("/api/b16/status").json()
    assert after["operating"] is True and after["seeded"] is True
    assert set(after) == STATUS_FIELDS
    assert FAKE_KEY not in json.dumps(after) and "nessieisreal" not in json.dumps(after)


def test_status_operating_is_false_without_b04s_opening_deposit(client, fake):
    fake.deposits[OPERATING_ID] = [d for d in fake.deposits[OPERATING_ID] if d["description"] != b04_bank.OPENING_DESCRIPTION]
    accounts.refresh_status()
    assert client.get("/api/b16/status").json()["operating"] is False


def test_the_background_refresher_fills_the_cache_and_stops(client, fake, monkeypatch):
    monkeypatch.setattr(accounts, "BACKGROUND", True)
    monkeypatch.setattr(accounts, "REFRESH_EVERY_S", 0.05)
    assert client.get("/api/b16/status").json() == accounts.COLD
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline and client.get("/api/b16/status").json()["operating"] is not True:
        time.sleep(0.02)
    assert client.get("/api/b16/status").json()["operating"] is True
    accounts.stop_refresher()
    n = len(fake.calls)
    time.sleep(0.2)
    assert len(fake.calls) == n


def test_seed_without_b04s_account_is_not_found(client, empty_fake):
    check_error(client.post("/api/b16/seed", json=seed_body()), 404, "not_found")
    assert empty_fake.posts() == []


@pytest.mark.parametrize(
    "body",
    [
        {"trigger": None},
        {"trigger": None, "commission": {"wipId": "wip_01"}},
        seed_body(priceCents=0),
        seed_body(priceCents="120000"),
        seed_body(priceCents=1200.5),
        seed_body(wipId="commission one"),
    ],
)
def test_seed_rejects_a_bad_body(client, fake, body):
    check_error(client.post("/api/b16/seed", json=body), 400, "bad_request")
    assert fake.calls == []


def test_reconcile_returns_flg_01_checked_against_nessie(client, fake):
    res = client.post("/api/b16/reconcile", json=reconcile_body())
    assert res.status_code == 200
    events = res.json()["events"]
    assert len(events) == 1
    e = events[0]
    check_envelope(e, "flag.raised", 141800)
    check_flag(e["payload"])
    assert e["payload"] == {**FLAG, "nessieId": NESSIE["galleryDepositId"]}
    # Reads only: the operating account's two lists after one account list.
    assert fake.posts() == []


def test_reconcile_ignores_the_requests_bank_txns(client, fake):
    paid_in_full = [{"id": "txn_026", "date": "2026-09-30", "direction": "in", "amountCents": 204000, "memo": "Gallery payment pay_023", "refId": "pay_023"}]
    res = client.post("/api/b16/reconcile", json=reconcile_body(bankTxns=paid_in_full))
    assert res.status_code == 200
    [e] = res.json()["events"]
    assert e["payload"]["actualCents"] == 170000 and e["payload"]["nessieId"] == NESSIE["galleryDepositId"]


def test_reconcile_with_a_null_trigger_returns_every_flag_at_0(client, fake):
    events = client.post("/api/b16/reconcile", json={**reconcile_body(), "trigger": None}).json()["events"]
    assert [e["type"] for e in events] == ["flag.raised"]
    check_envelope(events[0], "flag.raised", 0)
    assert events[0]["payload"]["flagId"].startswith("flg_live_")


def test_reconcile_returns_nothing_when_the_bank_disagrees_with_the_flag(client, fake):
    gallery = next(d for d in fake.deposits[OPERATING_ID] if d["_id"] == NESSIE["galleryDepositId"])
    gallery["amount"] = 180000  # Nessie says the gallery paid another amount
    assert client.post("/api/b16/reconcile", json=reconcile_body()).json() == {"events": []}


def test_reconcile_returns_nothing_when_the_trigger_has_other_figures(client, fake):
    trig = flag_trigger(actualCents=160000, deltaCents=44000)
    assert client.post("/api/b16/reconcile", json=reconcile_body(trig)).json() == {"events": []}


def test_reconcile_returns_nothing_when_nessie_has_no_gallery_deposit(client, fake):
    fake.deposits[OPERATING_ID] = [d for d in fake.deposits[OPERATING_ID] if d["_id"] != NESSIE["galleryDepositId"]]
    assert client.post("/api/b16/reconcile", json=reconcile_body()).json() == {"events": []}


def test_reconcile_before_b04s_account_is_not_found(client, empty_fake):
    check_error(client.post("/api/b16/reconcile", json=reconcile_body()), 404, "not_found")


@pytest.mark.parametrize(
    "mutate",
    [
        lambda b: b.update(monthId="Sept"),
        lambda b: b.pop("records"),
        lambda b: b["records"].update(orders="not a list"),
        lambda b: b["records"]["orders"][0].pop("grossCents"),
        lambda b: b["records"]["statements"][0].update(lines=[]),
    ],
)
def test_reconcile_rejects_a_bad_body(client, fake, mutate):
    body = reconcile_body()
    mutate(body)
    check_error(client.post("/api/b16/reconcile", json=body), 400, "bad_request")
    assert fake.calls == []


def test_the_fund_move_posts_one_deposit_of_500_and_returns_its_twin(client, fake):
    seeded(client)
    trig = move("fund")
    res = client.post("/api/b16/moves", json=trig)
    assert res.status_code == 200
    [e] = res.json()["events"]
    check_envelope(e, "money.moved", trig["trigger"]["at"])
    check_move(e["payload"])
    fund = fake.account(accounts.FUND_NICKNAME)
    [dep] = fake.deposits[fund["_id"]]
    assert (dep["amount"], dep["transaction_date"], dep["description"]) == (500, "2026-09-01", "Community fund ctb_01 (mv_0102)")
    assert e["payload"] == {**trig["trigger"]["payload"], "nessieId": dep["_id"]}
    assert e["payload"]["to"] == {"kind": "community_fund", "id": "prj_01"} and e["payload"]["from"] == {"kind": "cindia"}


def test_the_milestone_move_posts_one_withdrawal_from_the_held_account(client, fake):
    seeded(client)
    trig = move("milestone")
    [e] = client.post("/api/b16/moves", json=trig).json()["events"]
    check_envelope(e, "money.moved", trig["trigger"]["at"])
    check_move(e["payload"])
    held = fake.account(accounts.HELD_NICKNAME)
    [w] = fake.withdrawals[held["_id"]]
    assert (w["amount"], w["transaction_date"], w["description"]) == (48000, "2026-10-02", "Milestone release mls_02 (mv_user_1)")
    assert e["payload"] == {**trig["trigger"]["payload"], "nessieId": w["_id"]}
    assert e["payload"]["from"] == {"kind": "cindia"}
    accounts.refresh_status()
    assert client.get("/api/b16/status").json()["heldBalanceCents"] == 120000 - 48000


def test_a_move_before_the_seed_is_not_found(client, fake):
    check_error(client.post("/api/b16/moves", json=move("fund")), 404, "not_found")
    assert fake.posts() == []


def test_a_move_the_bank_disagrees_with_returns_nothing(client, fake):
    seeded(client)
    fund = fake.account(accounts.FUND_NICKNAME)
    fake.deposits[fund["_id"]].append(
        {"_id": "b16other00000000000000aa", "type": "deposit", "transaction_date": "2026-09-01", "status": "completed",
         "medium": "balance", "amount": 700, "description": "Community fund ctb_01 (mv_0102)"}
    )
    n = len(fake.posts())
    assert client.post("/api/b16/moves", json=move("fund")).json() == {"events": []}
    assert len(fake.posts()) == n


def test_a_move_nessie_never_lists_returns_nothing(client, fake):
    seeded(client)
    original = fake._handle

    def forgetful(request: httpx.Request) -> httpx.Response:
        res = original(request)
        if request.method == "GET" and request.url.path.endswith("/deposits") and fake.account(accounts.FUND_NICKNAME)["_id"] in request.url.path:
            return httpx.Response(200, json=[])
        return res

    fake._handle = forgetful
    assert client.post("/api/b16/moves", json=move("fund")).json() == {"events": []}


def test_a_fund_move_for_another_project_returns_nothing(client, fake):
    seeded(client)
    n = len(fake.calls)
    res = client.post("/api/b16/moves", json=move("fund", to={"kind": "community_fund", "id": "prj_02"}))
    assert res.json() == {"events": []}
    assert len(fake.calls) == n


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"trigger": None},
        {"trigger": {"type": "money.moved"}},
        {"trigger": {**FIXTURE["moves"]["fund"], "type": "flag.raised"}},
        move("fund", amountCents=0),
        move("fund", amountCents="500"),
        move("fund", date="Sept 1"),
        move("fund", extra="field"),
        move("fund", to={"kind": "community_fund"}),
        move("fund", to={"kind": "charity", "id": "prj_01"}),
    ],
)
def test_moves_rejects_a_bad_body(client, fake, body):
    seeded(client)
    n = len(fake.calls)
    check_error(client.post("/api/b16/moves", json=body), 400, "bad_request")
    assert len(fake.calls) == n


def test_a_nessie_timeout_gives_504(client, fake):
    seeded(client)
    fake.timeout_on = "/deposits"
    check_error(client.post("/api/b16/moves", json=move("fund")), 504, "upstream_timeout")
    check_error(client.post("/api/b16/reconcile", json=reconcile_body()), 504, "upstream_timeout")


def test_a_nessie_error_gives_502(client, fake):
    seeded(client)
    fake.fail_with = 500
    check_error(client.post("/api/b16/moves", json=move("milestone")), 502, "upstream_error")
    check_error(client.post("/api/b16/reconcile", json=reconcile_body()), 502, "upstream_error")
    check_error(client.post("/api/b16/seed", json=seed_body()), 502, "upstream_error")


def test_the_client_sends_the_key_in_the_query_with_a_timeout_of_at_most_5_s(client, fake):
    seeded(client)
    client.post("/api/b16/moves", json=move("fund"))
    client.post("/api/b16/reconcile", json=reconcile_body())
    assert fake.keys_seen == {FAKE_KEY}
    assert fake.timeouts and max(fake.timeouts) <= 5.0


def test_no_log_line_response_or_error_carries_the_key_or_a_url(client, fake, logs):
    texts = [client.post("/api/b16/seed", json=seed_body()).text]
    texts.append(client.get("/api/b16/status").text)
    texts.append(client.post("/api/b16/reconcile", json=reconcile_body()).text)
    texts.append(client.post("/api/b16/moves", json=move("fund")).text)
    fake.fail_with = 500
    texts.append(client.post("/api/b16/moves", json=move("milestone")).text)
    fake.fail_with = None
    fake.timeout_on = "/withdrawals"
    texts.append(client.post("/api/b16/reconcile", json=reconcile_body()).text)
    for text in texts + logs:
        assert FAKE_KEY not in text
        assert "key=" not in text
        assert "nessieisreal" not in text and "https://" not in text


def test_process_status_is_set_around_a_post_and_a_check(client, fake, monkeypatch):
    calls: list[tuple] = []
    monkeypatch.setattr(b16, "PROCESS", lambda *a: calls.append(a))
    seeded(client)
    client.post("/api/b16/moves", json=move("fund"))
    client.post("/api/b16/reconcile", json=reconcile_body())
    assert calls == [("money", "working", 1), ("money", "done", 0), ("reconcile", "working", 1), ("reconcile", "done", 0)]


def test_event_ids_are_unique_and_carry_b16s_number(client, fake):
    seeded(client)
    ids = [client.post("/api/b16/reconcile", json=reconcile_body()).json()["events"][0]["id"] for _ in range(3)]
    ids.append(client.post("/api/b16/moves", json=move("fund")).json()["events"][0]["id"])
    assert len(set(ids)) == 4
    assert all(i.startswith(f"evt_live_16{b16._START}") for i in ids)


def test_b16_never_emits_account_synced_or_match_made(client, fake):
    seeded(client)
    types = {e["type"] for e in client.post("/api/b16/reconcile", json=reconcile_body()).json()["events"]}
    types |= {e["type"] for e in client.post("/api/b16/moves", json=move("fund")).json()["events"]}
    types |= {e["type"] for e in client.post("/api/b16/moves", json=move("milestone")).json()["events"]}
    assert types == {"flag.raised", "money.moved"}


# ---------------------------------------------------------------------------------------------
# Live: seeds, posts the tour's community fund move once, and reconciles the fixture month against
# the real sandbox. Skipped without NESSIE_KEY. Nothing is printed; the timings go to artifacts/.


@pytest.mark.live
@needs_key("NESSIE_KEY")
def test_live_seed_fund_move_and_reconcile(client, monkeypatch):
    monkeypatch.setattr(accounts, "BACKGROUND", False)
    monkeypatch.setattr(b16, "PROCESS", lambda *a: None)
    b04_nessie.set_transport(None)
    b16.reset_for_tests()
    timings: list[str] = []

    def timed(label: str, fn):
        t0 = time.perf_counter()
        out = fn()
        timings.append(f"{label} {(time.perf_counter() - t0) * 1000:.0f} ms")
        return out

    try:
        res = timed("POST /api/b16/seed", lambda: client.post("/api/b16/seed", json=seed_body()))
        if res.status_code == 404:
            pytest.skip("B04's operating account isn't seeded on this Nessie key, so B16 has nothing to build on")
        assert res.status_code == 200, res.json().get("error", {}).get("code")
        timed("status refresh", lambda: accounts.refresh_status())
        status = client.get("/api/b16/status").json()
        assert status["operating"] is True and status["seeded"] is True
        assert status["heldBalanceCents"] is not None and status["fundBalanceCents"] is not None

        trig = move("fund")
        res = timed("POST /api/b16/moves (mv_0102)", lambda: client.post("/api/b16/moves", json=trig))
        assert res.status_code == 200, res.json().get("error", {}).get("code")
        [e] = res.json()["events"]
        check_envelope(e, "money.moved", trig["trigger"]["at"])
        check_move(e["payload"])
        assert {k: v for k, v in e["payload"].items() if k != "nessieId"} == trig["trigger"]["payload"]

        res = timed("POST /api/b16/reconcile", lambda: client.post("/api/b16/reconcile", json=reconcile_body()))
        assert res.status_code == 200, res.json().get("error", {}).get("code")
        [f] = res.json()["events"]
        check_envelope(f, "flag.raised", 141800)
        check_flag(f["payload"])
        assert {k: v for k, v in f["payload"].items() if k != "nessieId"} == FLAG
    finally:
        out = Path(__file__).resolve().parents[2] / "artifacts" / "b16-live-timings.txt"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text("\n".join(timings) + "\n", encoding="utf-8")
        b16.reset_for_tests()
