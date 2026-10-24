"""B04 · Nessie, the studio's bank account. Contract tests with FastAPI's TestClient and a fake
Nessie behind httpx.MockTransport, so nothing here touches the network.

The two tests marked `live` need NESSIE_KEY and skip without it: one lists accounts (read only),
and one probes `POST /accounts/{id}/purchases` once and records only its status code.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Optional

import httpx
import pytest
from conftest import needs_key

from server import config
from server.routers import b04_bank, b04_nessie

FIXTURE = json.loads((Path(__file__).parent / "b04_history.json").read_text(encoding="utf-8"))
EVT_LIVE = re.compile(r"^evt_live_\d+$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FAKE_KEY = "fake-test-key-0000"
PARTY_KINDS = {"buyer", "cindia", "card_network", "studio", "maker", "gallery", "processor", "supplier"}
MOVE_KINDS = {"sale", "fee", "settlement", "payout_in", "materials", "maker_pay", "refund"}


# ---------------------------------------------------------------------------------------------
# A fake Nessie: customers, accounts, deposits and withdrawals in memory. Create calls answer
# with a plain JSON string, as the spec says, so the server has to read the list back.


class FakeNessie:
    def __init__(self) -> None:
        self.customers: list[dict[str, Any]] = []
        self.accounts: list[dict[str, Any]] = []
        self.deposits: dict[str, list[dict[str, Any]]] = {}
        self.withdrawals: dict[str, list[dict[str, Any]]] = {}
        self.calls: list[tuple[str, str, str]] = []  # (method, host, path)
        self.timeouts: list[float] = []
        self.keys_seen: set[str] = set()
        self.down_hosts: set[str] = set()
        self.fail_with: Optional[int] = None
        self.timeout_on: Optional[str] = None  # a path fragment that times out
        self.n = 0

    def _id(self) -> str:
        self.n += 1
        return f"{self.n:024x}"

    def creates(self, kind: str) -> int:
        return sum(1 for m, _, p in self.calls if m == "POST" and p.endswith(kind))

    def handler(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        host = request.url.host
        self.calls.append((request.method, host, path))
        self.keys_seen.add(request.url.params.get("key", ""))
        timeout = request.extensions.get("timeout", {})
        self.timeouts.append(max(v for v in timeout.values() if v is not None) if timeout else 999.0)
        if host in self.down_hosts:
            raise httpx.ConnectError("down", request=request)
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
        if parts == ["customers"] and m == "POST":
            self.customers.append({"_id": self._id(), **body})
            return httpx.Response(201, json="Customer created")
        if len(parts) == 3 and parts[0] == "customers" and parts[2] == "accounts":
            cid = parts[1]
            if m == "GET":
                return httpx.Response(200, json=[a for a in self.accounts if a["customer_id"] == cid])
            acct = {"_id": self._id(), "customer_id": cid, "account_number": "1" * 16, **body}
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
            store[aid].append({"_id": self._id(), **body})
            return httpx.Response(201, json=f"{parts[2][:-1].capitalize()} created")
        return httpx.Response(404, json={"code": 404, "message": "not found"})


@pytest.fixture
def fake(monkeypatch):
    nessie = FakeNessie()
    monkeypatch.setattr(config, "NESSIE_KEY", FAKE_KEY)
    b04_bank.reset_for_tests()
    b04_nessie.set_transport(httpx.MockTransport(nessie.handler))
    yield nessie
    b04_nessie.set_transport(None)
    b04_bank.reset_for_tests()


@pytest.fixture
def no_key(monkeypatch):
    monkeypatch.setattr(config, "NESSIE_KEY", None)
    b04_bank.reset_for_tests()
    yield
    b04_bank.reset_for_tests()


def seed_body() -> dict[str, Any]:
    return {"trigger": None, "studio": FIXTURE["studio"], "history": FIXTURE["history"]}


def sale_trigger() -> dict[str, Any]:
    s = FIXTURE["sale"]
    return {
        "id": "evt_0012",
        "type": "order.placed",
        "at": 13500,
        "source": "scripted",
        "key": "b04-bank",
        "payload": {k: s[k] for k in ("orderId", "pieceId", "channelId", "buyerId", "grossCents", "date")},
    }


def sale_body(trigger: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    return {"trigger": trigger if trigger is not None else sale_trigger(), **FIXTURE["sale"]}


def payout_trigger() -> dict[str, Any]:
    p = FIXTURE["makerPayouts"][0]
    return {
        "id": "evt_0090",
        "type": "payout.sent",
        "at": 41600,
        "source": "scripted",
        "key": "b04-bank",
        "payload": {k: p[k] for k in ("makerPayoutId", "makerId", "amountCents", "date")},
    }


def payouts_body() -> dict[str, Any]:
    return {"trigger": payout_trigger(), "makerPayouts": FIXTURE["makerPayouts"]}


def check_envelope(e: dict[str, Any], event_type: str, at: int) -> None:
    assert set(e) == {"id", "type", "at", "source", "key", "payload"}
    assert EVT_LIVE.match(e["id"])
    assert e["type"] == event_type
    assert e["at"] == at
    assert e["source"] == "live"
    assert e["key"] == "b04-bank"


def check_move(p: dict[str, Any]) -> None:
    assert set(p) <= {"moveId", "kind", "from", "to", "amountCents", "refId", "date", "nessieId"}
    assert re.match(r"^mv_\d{4}$", p["moveId"])
    assert p["kind"] in MOVE_KINDS
    assert p["from"]["kind"] in PARTY_KINDS and p["to"]["kind"] in PARTY_KINDS
    assert isinstance(p["amountCents"], int) and p["amountCents"] > 0
    assert DATE.match(p["date"])
    assert isinstance(p["nessieId"], str) and p["nessieId"]


def check_synced(p: dict[str, Any]) -> None:
    assert set(p) == {"accountId", "balanceCents", "asOf"}
    assert isinstance(p["accountId"], str) and p["accountId"]
    assert isinstance(p["balanceCents"], int)
    assert DATE.match(p["asOf"])


def check_error(res, status: int, code: str) -> None:
    assert res.status_code == status
    body = res.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == code
    msg = body["error"]["message"]
    assert isinstance(msg, str) and msg and FAKE_KEY not in msg and "key=" not in msg


def seeded(client, fake: FakeNessie) -> None:
    assert client.post("/api/b04/seed", json=seed_body()).status_code == 200


# ---------------------------------------------------------------------------------------------
# Without the key


def test_health_lists_b04_and_reports_the_key_missing(client, no_key):
    body = client.get("/api/health").json()
    assert "b04" in body["routers"]
    assert body["keys"]["nessie"] is False


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("GET", "/api/b04/status", None),
        ("POST", "/api/b04/seed", seed_body()),
        ("POST", "/api/b04/sale", sale_body()),
        ("POST", "/api/b04/payouts", payouts_body()),
    ],
)
def test_every_route_needs_the_key(client, no_key, method, path, body):
    res = client.request(method, path, json=body)
    check_error(res, 503, "key_missing")


# ---------------------------------------------------------------------------------------------
# The client


def test_client_finds_the_base_url_once_and_skips_a_dead_host(client, fake):
    fake.down_hosts.add("api.nessieisreal.com")
    assert client.get("/api/b04/status").json() == {"seeded": False, "accountId": None, "balanceCents": None}
    client.get("/api/b04/status")
    hosts = [h for _, h, _ in fake.calls]
    assert hosts.count("api.nessieisreal.com") == 1
    assert set(hosts) == {"api.nessieisreal.com", "prod-api.nessieisreal.com"}


def test_client_sends_the_key_in_the_query_and_a_timeout_of_at_most_5_s(client, fake):
    seeded(client, fake)
    assert fake.keys_seen == {FAKE_KEY}
    assert fake.timeouts and max(fake.timeouts) <= 5.0


def test_client_reads_the_list_back_after_a_create_that_answers_a_string(fake):
    budget = b04_nessie.Budget(5)
    assert b04_nessie.create_customer(budget, "A", "B", b04_bank.CUSTOMER_ADDRESS) is None
    listed = b04_nessie.list_customers(budget)
    assert [c["first_name"] for c in listed] == ["A"]


def test_client_maps_errors_and_timeouts(fake):
    fake.fail_with = 500
    with pytest.raises(b04_nessie.NessieError) as err:
        b04_nessie.list_accounts(b04_nessie.Budget(5))
    assert err.value.code == "upstream_error"
    fake.fail_with = None
    b04_nessie.reset()
    fake.timeout_on = "/accounts"
    with pytest.raises(b04_nessie.NessieError) as err:
        b04_nessie.list_accounts(b04_nessie.Budget(5))
    assert err.value.code == "upstream_timeout"
    assert FAKE_KEY not in str(err.value)


# ---------------------------------------------------------------------------------------------
# Seed


def test_seed_creates_customer_account_and_history_once(client, fake):
    res = client.post("/api/b04/seed", json=seed_body())
    assert res.status_code == 200
    events = res.json()["events"]
    assert len(events) == 1
    check_envelope(events[0], "account.synced", 0)
    check_synced(events[0]["payload"])

    assert [c["first_name"] + " " + c["last_name"] for c in fake.customers] == ["Gu Embroidery Studio"]
    assert set(fake.customers[0]["address"]) == {"street_number", "street_name", "city", "state", "zip"}
    assert len(fake.accounts) == 1
    acct = fake.accounts[0]
    assert acct["nickname"] == "Gu studio operating" and acct["type"] == "Checking"
    aid = acct["_id"]
    hist = FIXTURE["history"]
    assert len(fake.deposits[aid]) == len(hist["deposits"]) + 1  # plus the opening balance
    assert len(fake.withdrawals[aid]) == len(hist["withdrawals"])
    for d in fake.deposits[aid] + fake.withdrawals[aid]:
        assert d["medium"] == "balance" and d["status"] == "completed"
    # Neither the sale nor the maker payouts are in the seeded history.
    descs = [d["description"] for d in fake.deposits[aid] + fake.withdrawals[aid]]
    assert not any("pay_001" in d for d in descs) and not any("mpo_" in d for d in descs)
    # The opening deposit is posted last.
    assert fake.deposits[aid][-1]["amount"] == FIXTURE["studio"]["openingBalanceCents"]

    status = client.get("/api/b04/status").json()
    assert status["seeded"] is True and status["accountId"] == aid
    opening = FIXTURE["studio"]["openingBalanceCents"]
    net = sum(l["amountCents"] for l in hist["deposits"]) - sum(l["amountCents"] for l in hist["withdrawals"])
    assert status["balanceCents"] == opening + net
    assert events[0]["payload"]["balanceCents"] == opening + net


def test_a_second_seed_changes_nothing(client, fake):
    seeded(client, fake)
    before = len([c for c in fake.calls if c[0] == "POST"])
    b04_bank.reset_for_tests()  # as after a server restart: the IDs are found again
    res = client.post("/api/b04/seed", json=seed_body())
    assert res.status_code == 200
    assert len([c for c in fake.calls if c[0] == "POST"]) == before
    assert len(fake.customers) == 1 and len(fake.accounts) == 1


def test_a_seed_cut_short_finishes_on_the_next_call(client, fake):
    # The 5th deposit times out: the opening marker never lands, so status says not seeded.
    original = fake.handler
    count = {"n": 0}

    def flaky(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path.endswith("/deposits"):
            count["n"] += 1
            if count["n"] == 5:
                raise httpx.ReadTimeout("slow", request=request)
        return original(request)

    b04_nessie.set_transport(httpx.MockTransport(flaky))
    check_error(client.post("/api/b04/seed", json=seed_body()), 504, "upstream_timeout")
    assert client.get("/api/b04/status").json()["seeded"] is False
    assert client.post("/api/b04/seed", json=seed_body()).status_code == 200
    aid = fake.accounts[0]["_id"]
    descs = [d["description"] for d in fake.deposits[aid]]
    assert len(descs) == len(set(descs)) == len(FIXTURE["history"]["deposits"]) + 1
    assert client.get("/api/b04/status").json()["seeded"] is True


def test_seed_rejects_a_bad_body(client, fake):
    check_error(client.post("/api/b04/seed", json={"trigger": None, "studio": {}}), 400, "bad_request")
    bad = seed_body()
    bad["history"] = {"deposits": [{"date": "Sept 2", "amountCents": 5}], "withdrawals": []}
    check_error(client.post("/api/b04/seed", json=bad), 400, "bad_request")


# ---------------------------------------------------------------------------------------------
# Sale


def test_sale_posts_one_deposit_and_reproduces_the_demo_balance(client, fake):
    seeded(client, fake)
    res = client.post("/api/b04/sale", json=sale_body())
    assert res.status_code == 200
    events = res.json()["events"]
    assert [e["type"] for e in events] == ["order.placed", "money.moved", "account.synced"]
    for e in events:
        check_envelope(e, e["type"], 13500)
    assert events[0]["payload"] == sale_trigger()["payload"]
    move = events[1]["payload"]
    check_move(move)
    assert move["moveId"] == "mv_0003" and move["kind"] == "settlement"
    assert move["from"] == {"kind": "cindia"} and move["to"] == {"kind": "studio", "id": "std_gu"}
    assert move["amountCents"] == 15648 and move["refId"] == "pay_001" and move["date"] == "2026-09-01"
    aid = fake.accounts[0]["_id"]
    sale_deps = [d for d in fake.deposits[aid] if d["amount"] == 15648]
    assert len(sale_deps) == 1 and move["nessieId"] == sale_deps[0]["_id"]
    synced = events[2]["payload"]
    check_synced(synced)
    assert synced == {"accountId": aid, "balanceCents": FIXTURE["expected"]["balanceAfterSale"], "asOf": "2026-09-01"}


def test_a_replayed_sale_reuses_its_deposit(client, fake):
    seeded(client, fake)
    first = client.post("/api/b04/sale", json=sale_body()).json()["events"]
    trig = {
        "id": "evt_0016",
        "type": "money.moved",
        "at": 17500,
        "source": "scripted",
        "key": "b04-bank",
        "payload": {"moveId": "mv_0003", "kind": "settlement", "from": {"kind": "cindia"},
                    "to": {"kind": "studio", "id": "std_gu"}, "amountCents": 15648, "refId": "pay_001", "date": "2026-09-01"},
    }
    second = client.post("/api/b04/sale", json=sale_body(trig)).json()["events"]
    assert fake.creates("deposits") == len(FIXTURE["history"]["deposits"]) + 2  # history, opening, one sale
    assert second[1]["payload"]["nessieId"] == first[1]["payload"]["nessieId"]
    assert second[1]["at"] == 17500
    # The order comes from the optional fields when the trigger is the settlement.
    assert second[0]["type"] == "order.placed" and second[0]["payload"]["orderId"] == "ord_001"
    assert second[2]["payload"]["balanceCents"] == FIXTURE["expected"]["balanceAfterSale"]


def test_sale_before_seed_is_not_found(client, fake):
    check_error(client.post("/api/b04/sale", json=sale_body()), 404, "not_found")


def test_sale_bad_body(client, fake):
    body = sale_body()
    del body["netCents"]
    check_error(client.post("/api/b04/sale", json=body), 400, "bad_request")
    body = sale_body()
    body["netCents"] = -1
    check_error(client.post("/api/b04/sale", json=body), 400, "bad_request")


def test_sale_nessie_timeout_gives_504(client, fake):
    seeded(client, fake)
    fake.timeout_on = "/deposits"
    check_error(client.post("/api/b04/sale", json=sale_body()), 504, "upstream_timeout")


def test_sale_nessie_error_gives_502(client, fake):
    seeded(client, fake)
    fake.fail_with = 500
    check_error(client.post("/api/b04/sale", json=sale_body()), 502, "upstream_error")


# ---------------------------------------------------------------------------------------------
# Payouts


def test_payouts_create_three_withdrawals_and_lower_the_balance_by_their_sum(client, fake):
    seeded(client, fake)
    client.post("/api/b04/sale", json=sale_body())
    aid = fake.accounts[0]["_id"]
    before = b04_bank._balance_as_of(fake.deposits[aid], fake.withdrawals[aid], "2026-10-02")
    res = client.post("/api/b04/payouts", json=payouts_body())
    assert res.status_code == 200
    events = res.json()["events"]
    assert [e["type"] for e in events] == ["payout.sent"] * 3 + ["money.moved"] * 3 + ["account.synced"]
    for e in events:
        check_envelope(e, e["type"], 41600)
    total = 0
    for spec, sent, move in zip(FIXTURE["makerPayouts"], events[:3], events[3:6]):
        assert sent["payload"] == {k: spec[k] for k in ("makerPayoutId", "makerId", "amountCents", "date")}
        p = move["payload"]
        check_move(p)
        assert p["moveId"] == spec["moveId"] and p["kind"] == "maker_pay"
        assert p["from"] == {"kind": "studio", "id": "std_gu"} and p["to"] == {"kind": "maker", "id": spec["makerId"]}
        assert p["amountCents"] == spec["amountCents"] and p["refId"] == spec["makerPayoutId"]
        total += spec["amountCents"]
    payout_ws = [w for w in fake.withdrawals[aid] if w["description"].startswith("Maker payout ")]
    assert sorted(w["description"] for w in payout_ws) == ["Maker payout mpo_01", "Maker payout mpo_02", "Maker payout mpo_03"]
    assert {e["payload"]["nessieId"] for e in events[3:6]} == {w["_id"] for w in payout_ws}
    synced = events[6]["payload"]
    check_synced(synced)
    assert synced["asOf"] == "2026-10-02"
    assert synced["balanceCents"] == before - total == FIXTURE["expected"]["balanceAfterPayouts"]


def test_replayed_payouts_create_nothing_new(client, fake):
    seeded(client, fake)
    client.post("/api/b04/sale", json=sale_body())
    client.post("/api/b04/payouts", json=payouts_body())
    n = fake.creates("withdrawals")
    again = client.post("/api/b04/payouts", json=payouts_body()).json()["events"]
    assert fake.creates("withdrawals") == n
    assert again[-1]["payload"]["balanceCents"] == FIXTURE["expected"]["balanceAfterPayouts"]


def test_payouts_bad_body(client, fake):
    check_error(client.post("/api/b04/payouts", json={"trigger": None, "makerPayouts": []}), 400, "bad_request")
    dup = payouts_body()
    dup["makerPayouts"] = [FIXTURE["makerPayouts"][0]] * 2
    check_error(client.post("/api/b04/payouts", json=dup), 400, "bad_request")


def test_payouts_nessie_timeout_gives_504(client, fake):
    seeded(client, fake)
    fake.timeout_on = "/withdrawals"
    check_error(client.post("/api/b04/payouts", json=payouts_body()), 504, "upstream_timeout")


def test_payouts_nessie_error_gives_502(client, fake):
    seeded(client, fake)
    fake.fail_with = 503
    check_error(client.post("/api/b04/payouts", json=payouts_body()), 502, "upstream_error")


def test_no_key_in_any_response(client, fake):
    seeded(client, fake)
    for res in (
        client.get("/api/b04/status"),
        client.post("/api/b04/sale", json=sale_body()),
        client.post("/api/b04/payouts", json=payouts_body()),
    ):
        assert FAKE_KEY not in res.text


# ---------------------------------------------------------------------------------------------
# Live: one real call each, skipped without NESSIE_KEY. Nothing is printed.


@pytest.mark.live
@needs_key("NESSIE_KEY")
def test_live_lists_accounts():
    b04_nessie.set_transport(None)
    b04_nessie.reset()
    accounts = b04_nessie.list_accounts(b04_nessie.Budget(15))
    assert isinstance(accounts, list)


@pytest.mark.live
@needs_key("NESSIE_KEY")
def test_live_purchase_probe_records_its_status():
    b04_nessie.set_transport(None)
    b04_nessie.reset()
    budget = b04_nessie.Budget(15)
    accounts = b04_nessie.list_accounts(budget)
    if not accounts:
        pytest.skip("no Nessie account to probe")
    status = b04_nessie.probe_purchase(budget, accounts[0]["_id"])
    # Recorded, not asserted: the spec has no purchase create, so anything but a 2xx is expected.
    out = Path(__file__).resolve().parents[2] / "artifacts" / "b04-purchase-probe.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(f"POST /accounts/{{id}}/purchases answered {status}\n", encoding="utf-8")
    assert isinstance(status, int)
