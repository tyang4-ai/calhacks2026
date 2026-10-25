"""B12 · vibe search and surprise me (docs/plans/B12-search.md, T1 to T5).

Elastic and Kibana are faked by one httpx.MockTransport (FakeElastic below), B11's encoder and
vectors by fixed hand-made vectors from tests/server/b12_fixture.json (zero-padded to 384 numbers),
and the keys by conftest's autouse fixture, so no test downloads a model, calls out or sees a real
key. The transport records only whether an Authorization header was present, as a boolean, and
never prints a request. The one test marked `live` seeds the real Elastic project once, runs the
tour's query once and the 50 eval queries in one _msearch, and writes server/b12_search/eval.json.
"""

from __future__ import annotations

import importlib
import json
import re
import time
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import pytest

from conftest import needs_key, needs_service
from server import config
from server.b12_search import agent, catalog, elastic, engine, local, reasons, thresholds

surprise_mod = importlib.import_module("server.b12_search.surprise")

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FIXTURE = json.loads((HERE / "b12_fixture.json").read_text(encoding="utf-8"))
GOLDEN = json.loads((HERE / "b12_surprise_golden.json").read_text(encoding="utf-8"))
CAT = catalog.from_raw(FIXTURE)
DIMS = 384
FP = "0123456789abcdef"
FAKE_ES = "https://es.b12-fake.test"
FAKE_KB = "https://kb.b12-fake.test"
ACTIVE = ["pc_01", "pc_02", "pc_03", "pc_04", "pc_05", "pc_06"]
EVENT_ID = re.compile(r"^evt_live_12\d{6}\d{4,}$")


def pad(v: list[float]) -> list[float]:
    return [float(x) for x in v] + [0.0] * (DIMS - len(v))


PIECE_VECS = {pid: pad(v) for pid, v in FIXTURE["vectors"]["pieces"].items()}
QUERY = pad(FIXTURE["vectors"]["query"])


def fixture_vectors() -> local.Vectors:
    ids = sorted(PIECE_VECS)
    return local.Vectors(ids, np.asarray([PIECE_VECS[i] for i in ids], dtype=np.float64))


VECTORS = fixture_vectors()


class Encoder:
    """B11's encoder, faked: the query's vector is whatever the test sets."""

    def __init__(self) -> None:
        self.vector = list(QUERY)
        self.texts: list[str] = []
        self.ready = True

    def __call__(self, text: str) -> list[float]:
        if not self.ready:
            raise engine.NotReady("not warm")
        self.texts.append(text)
        return list(self.vector)


@pytest.fixture(autouse=True)
def _b12_fakes(request, monkeypatch, tmp_path):
    """For every test not marked live: the fixture catalog, the fake encoder and vectors, Elastic
    unconfigured and a transport that refuses every request, unless a test installs FakeElastic."""
    if request.node.get_closest_marker("live") is not None:
        elastic.reset()
        engine.reset()
        yield None
        elastic.reset()
        engine.reset()
        return
    enc = Encoder()
    processes: list[tuple[Any, ...]] = []
    monkeypatch.setattr(catalog, "LOADER", lambda: CAT)
    monkeypatch.setattr(engine, "ENCODE", enc)
    monkeypatch.setattr(engine, "VECTORS", lambda: VECTORS)
    monkeypatch.setattr(engine, "FINGERPRINT", lambda: FP)
    monkeypatch.setattr(engine, "MODEL_ID", lambda: "cindia-embed-v1")
    monkeypatch.setattr(engine, "VECTORS_FILE", lambda: (FP, FP, CAT.passages_hash, dict(PIECE_VECS)))
    monkeypatch.setattr(engine, "PROCESS", lambda *a: processes.append(a))
    monkeypatch.setattr(config, "ELASTIC_URL", None)
    monkeypatch.setattr(config, "KIBANA_URL", None)

    def refuse(req: httpx.Request) -> httpx.Response:
        raise AssertionError("a B12 test tried to reach the network without a fake cluster")

    monkeypatch.setattr(elastic, "TRANSPORT", httpx.MockTransport(refuse))
    monkeypatch.setattr(elastic, "LAST_SEED_PATH", tmp_path / "b12" / "last_seed.json")
    elastic.reset()
    engine.reset()
    enc.processes = processes  # type: ignore[attr-defined]
    yield enc
    elastic.reset()
    engine.reset()


# ---------------------------------------------------------------------------------------------
# A fake Elastic project (Elasticsearch and Kibana) behind one MockTransport


def _passes(doc: dict[str, Any], clauses: list[dict[str, Any]]) -> bool:
    for c in clauses:
        if "term" in c:
            ((field, value),) = c["term"].items()
            if doc.get(field) != value:
                return False
        elif "range" in c:
            ((field, cond),) = c["range"].items()
            if not isinstance(doc.get(field), int) or doc[field] > cond["lte"]:
                return False
        elif "terms" in c:
            ((field, values),) = c["terms"].items()
            if doc.get(field) not in values:
                return False
    return True


def _cos(a: list[float], b: list[float]) -> float:
    va, vb = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    return float(va @ vb / (na * nb)) if na and nb else 0.0


class FakeElastic:
    def __init__(self) -> None:
        self.indices: dict[str, dict[str, dict[str, Any]]] = {}
        self.aliases: dict[str, str] = {}
        self.mappings: dict[str, Any] = {}
        self.calls: list[dict[str, Any]] = []
        self.slow = False
        self.reject_retrievers = False
        self.tools: dict[str, Any] = {}
        self.agents: dict[str, Any] = {}
        self.converse_status = 200
        self.reply = "pc_01\npc_99\npc_07\npc_04 is lovely and warm."
        self.conversations = 0

    # -- helpers
    def index_of(self, name: str) -> str | None:
        if name in self.indices:
            return name
        return self.aliases.get(name)

    def docs(self, name: str) -> dict[str, dict[str, Any]]:
        idx = self.index_of(name)
        return self.indices[idx] if idx else {}

    def bodies(self, method: str, path_part: str) -> list[Any]:
        return [c["body"] for c in self.calls if c["method"] == method and path_part in c["path"]]

    def auth_flags(self) -> set[bool]:
        return {c["auth"] for c in self.calls}

    # -- the handler
    def __call__(self, request: httpx.Request) -> httpx.Response:
        raw = request.content.decode("utf-8") if request.content else ""
        body: Any = None
        if raw and request.headers.get("content-type", "").startswith("application/json"):
            body = json.loads(raw)
        self.calls.append({
            "method": request.method, "host": request.url.host, "path": request.url.path,
            "params": dict(request.url.params), "auth": "authorization" in request.headers,
            "xsrf": request.headers.get("kbn-xsrf") == "true", "body": body if body is not None else raw,
        })
        if self.slow:
            time.sleep(min(float((request.extensions.get("timeout") or {}).get("read") or 1.0), 3.5))
            raise httpx.ReadTimeout("slow fake cluster", request=request)
        if request.url.host == "kb.b12-fake.test":
            return self.kibana(request, body)
        return self.es(request, body, raw)

    def es(self, request: httpx.Request, body: Any, raw: str) -> httpx.Response:
        path, method = request.url.path, request.method
        parts = [p for p in path.split("/") if p]
        if path == "/" and method == "GET":
            return httpx.Response(200, json={"version": {"number": "serverless"}})
        if method == "PUT" and len(parts) == 1:
            name = parts[0]
            if name in self.indices:
                return httpx.Response(400, json={"error": {"type": "resource_already_exists_exception"}})
            self.indices[name] = {}
            self.mappings[name] = body
            for alias in (body or {}).get("aliases", {}):
                self.aliases[alias] = name
            return httpx.Response(200, json={"acknowledged": True})
        if method == "PUT" and len(parts) == 2 and parts[1] == "_mapping":
            if parts[0] not in self.indices:
                return httpx.Response(404, json={"error": {"type": "index_not_found_exception"}})
            self.mappings.setdefault(parts[0] + "/_mapping", []).append(body)
            return httpx.Response(200, json={"acknowledged": True})
        if method == "POST" and path == "/_bulk":
            lines = [ln for ln in raw.split("\n") if ln.strip()]
            items = []
            for action, doc in zip(lines[::2], lines[1::2], strict=True):
                meta = json.loads(action)["index"]
                self.indices.setdefault(meta["_index"], {})[meta["_id"]] = json.loads(doc)
                items.append({"index": {"_id": meta["_id"], "status": 201}})
            return httpx.Response(200, json={"errors": False, "items": items})
        if len(parts) >= 2 and parts[1] == "_count":
            if self.index_of(parts[0]) is None:
                return httpx.Response(404, json={"error": {"type": "index_not_found_exception"}})
            return httpx.Response(200, json={"count": len(self.docs(parts[0]))})
        if len(parts) == 3 and parts[1] == "_doc":
            idx = self.index_of(parts[0])
            if idx is None:
                return httpx.Response(404, json={"error": {"type": "index_not_found_exception"}})
            if method == "PUT":
                self.indices[idx][parts[2]] = body
                return httpx.Response(201, json={"result": "created"})
            if method == "DELETE":
                if parts[2] not in self.indices[idx]:
                    return httpx.Response(404, json={"result": "not_found"})
                del self.indices[idx][parts[2]]
                return httpx.Response(200, json={"result": "deleted"})
        if len(parts) == 2 and parts[1] == "_search":
            if self.index_of(parts[0]) is None:
                return httpx.Response(404, json={"error": {"type": "index_not_found_exception"}})
            return self.search(self.docs(parts[0]), body)
        return httpx.Response(400, json={"error": {"type": "illegal_argument_exception"}})

    def hit(self, doc: dict[str, Any], score: float, with_vector: bool = False) -> dict[str, Any]:
        src = {k: v for k, v in doc.items() if with_vector or k != "vector"}
        return {"_id": doc["pieceId"], "_score": score, "_source": src}

    def dense(self, docs: dict[str, dict[str, Any]], knn: dict[str, Any]) -> list[tuple[str, float]]:
        ok = [d for d in docs.values() if _passes(d, knn.get("filter") or [])]
        ranked = sorted(((d["pieceId"], _cos(knn["query_vector"], d["vector"])) for d in ok), key=lambda h: (-h[1], h[0]))
        return ranked[: knn["k"]]

    def lexical(self, docs: dict[str, dict[str, Any]], query: str, clauses: list[dict[str, Any]]) -> list[tuple[str, float]]:
        words = set(re.findall(r"\w+", query.lower()))
        out = []
        for d in docs.values():
            if not _passes(d, clauses):
                continue
            have = set(re.findall(r"\w+", catalog.keyword_text(d).lower()))
            n = len(words & have)
            if n:
                out.append((d["pieceId"], float(n)))
        return sorted(out, key=lambda h: (-h[1], h[0]))

    def search(self, docs: dict[str, dict[str, Any]], body: dict[str, Any]) -> httpx.Response:
        size = body.get("size", 10)
        if "retriever" in body:
            if self.reject_retrievers:
                return httpx.Response(400, json={"error": {"type": "x_content_parse_exception"}})
            r = body["retriever"]
            if "knn" in r:
                hits = [self.hit(docs[p], s) for p, s in self.dense(docs, r["knn"])][:size]
            else:
                std, knn = r["rrf"]["retrievers"][0]["standard"], r["rrf"]["retrievers"][1]["knn"]
                mm = std["query"]["multi_match"]["query"]
                kw = [p for p, _ in self.lexical(docs, mm, std.get("filter") or [])]
                dn = [p for p, _ in self.dense(docs, knn)]
                fused = local.fuse(dn, kw, r["rrf"]["rank_constant"])
                hits = [self.hit(docs[p], s) for p, s in fused][:size]
            return httpx.Response(200, json={"hits": {"hits": hits}})
        if "knn" in body:
            hits = [self.hit(docs[p], (1 + s) / 2) for p, s in self.dense(docs, body["knn"])][:size]
            return httpx.Response(200, json={"hits": {"hits": hits}})
        q = body.get("query") or {}
        if "ids" in q:
            want = q["ids"]["values"]
            vec = isinstance(body.get("_source"), dict) and body["_source"].get("exclude_vectors") is False
            hits = [self.hit(docs[p], 1.0, with_vector=vec) for p in want if p in docs]
            return httpx.Response(200, json={"hits": {"hits": hits}})
        if "term" in q:
            pid = q["term"]["pieceId"]
            hits = [{"_id": pid, "_source": {"fingerprint": docs[pid].get("fingerprint")}}] if pid in docs else []
            return httpx.Response(200, json={"hits": {"hits": hits}})
        if "bool" in q:
            mm = q["bool"]["must"][0]["multi_match"]["query"]
            hits = [self.hit(docs[p], s) for p, s in self.lexical(docs, mm, q["bool"].get("filter") or [])][:size]
            return httpx.Response(200, json={"hits": {"hits": hits}})
        return httpx.Response(200, json={"hits": {"hits": []}})

    def kibana(self, request: httpx.Request, body: Any) -> httpx.Response:
        path, method = request.url.path, request.method
        for kind, store in (("tools", self.tools), ("agents", self.agents)):
            base = f"/api/agent_builder/{kind}"
            if path == base and method == "POST":
                store[body["id"]] = body
                return httpx.Response(200, json=body)
            if path.startswith(base + "/"):
                key = path[len(base) + 1:]
                if method == "GET":
                    return httpx.Response(200, json=store[key]) if key in store else httpx.Response(404, json={"message": "not found"})
                if method == "PUT":
                    store[key] = {**store.get(key, {}), **body}
                    return httpx.Response(200, json=store[key])
        if path == "/api/agent_builder/converse" and method == "POST":
            self.conversations += 1
            if self.converse_status != 200:
                return httpx.Response(self.converse_status, json={"message": "Token limit exceeded for this trial project"})
            return httpx.Response(200, json={
                "conversation_id": "conv_1",
                "response": {"message": self.reply},
                "steps": [{"type": "tool_call", "tool_id": agent.TOOL_ID, "results": [{"type": "resource", "data": {"reference": {"id": "pc_03"}}}]}],
            })
        return httpx.Response(404, json={"message": "not found"})


@pytest.fixture
def es(monkeypatch) -> FakeElastic:
    fake = FakeElastic()
    monkeypatch.setattr(config, "ELASTIC_URL", FAKE_ES)
    monkeypatch.setattr(config, "KIBANA_URL", FAKE_KB)
    monkeypatch.setattr(elastic, "TRANSPORT", httpx.MockTransport(fake))
    elastic.reset()
    return fake


def seeded(fake: FakeElastic, *, drafts: bool = True) -> FakeElastic:
    """The fake cluster after a seed of the fixture's six active pieces."""
    budget = elastic.Budget(10)
    elastic.ensure_indices(budget)
    docs, _ = engine.prepare_seed()
    elastic.bulk(docs, budget)
    if not drafts:
        fake.indices["cindia-drafts-v1"].clear()
    return fake


# ---------------------------------------------------------------------------------------------
# Contract shapes (events.md), checked in Python the way src/core/validate.ts checks them


def check_text(t: Any) -> None:
    assert isinstance(t, dict) and isinstance(t.get("en"), str) and isinstance(t.get("zh"), str) and t["en"] and t["zh"]


def check_event(e: dict[str, Any], etype: str) -> dict[str, Any]:
    assert set(e) == {"id", "type", "at", "source", "key", "payload"}
    assert EVENT_ID.match(e["id"]), e["id"]
    assert e["type"] == etype and e["source"] == "live" and e["key"] == "b12-search"
    assert isinstance(e["at"], (int, float)) and e["at"] >= 0
    p = e["payload"]
    if etype == "search.answered":
        assert set(p) <= {"queryId", "results", "closeMatches", "engine", "modelId", "keywords", "filters", "keywordsBy"}
        assert isinstance(p["queryId"], str) and p["engine"] in ("elastic_hybrid", "local_hybrid", "keyword_scripted")
        assert isinstance(p["closeMatches"], bool) and isinstance(p.get("modelId", ""), str)
        assert isinstance(p["results"], list) and len(p["results"]) <= 12
        for r in p["results"]:
            assert set(r) <= {"pieceId", "score", "closeness", "matched", "reason"}
            assert isinstance(r["pieceId"], str) and 0 <= r["score"] <= 1
            assert "closeness" not in r or 0 <= r["closeness"] <= 1
            assert isinstance(r["matched"], list) and all(isinstance(m, str) for m in r["matched"])
            check_text(r["reason"])
        if p["results"]:
            assert p["results"][0]["score"] == 1
    elif etype == "surprise.drawn":
        assert set(p) == {"surpriseId", "pieceId", "method", "seed", "candidates"}
        assert p["method"] in surprise_mod.METHODS and isinstance(p["seed"], int)
        assert p["pieceId"] in [c["pieceId"] for c in p["candidates"]]
        assert abs(sum(c["weight"] for c in p["candidates"]) - 1) <= 0.003
    elif etype == "listing.indexed":
        assert set(p) <= {"listingId", "pieceId", "modelId", "embedText", "index", "point", "approx"}
        assert p["index"] in ("cindia-drafts", "cindia-pieces")
        assert all(isinstance(p[k], str) for k in ("listingId", "pieceId", "modelId", "embedText"))
    return p


def check_error(resp: httpx.Response, status: int, code: str) -> None:
    assert resp.status_code == status, resp.text
    body = resp.json()
    assert set(body) == {"error"} and body["error"]["code"] == code
    msg = body["error"]["message"]
    assert isinstance(msg, str) and msg and "fake-" not in msg and "Traceback" not in msg


def search_body(**over: Any) -> dict[str, Any]:
    body = {"trigger": {"id": "evt_user_0001", "type": "search.queried", "at": 1234, "source": "user", "payload": {}},
            "queryId": "qry_user_1", "text": "warm red rug gift", "keywords": ["warm", "red", "rug"], "lang": "en", "filters": {}}
    body.update(over)
    return body


# =============================================================================================
# T1: the local hybrid, filters, fusion, closeness and reasons


def ids(results: list[dict[str, Any]]) -> list[str]:
    return [r["pieceId"] for r in results]


def test_local_path_ranks_the_hand_checked_order():
    # Dense (cosine to [1,0,0,0]): pc_05 .9945, pc_01 .9939, pc_02 .9363, pc_04 .7071, pc_03 .1078, pc_06 0.
    # Keyword (BM25 on "warm red rug gift"): pc_02 (all four), pc_01 (warm, red, gift), pc_04 (red,
    # gift), pc_03 (gift). RRF with 60: pc_02 1/63+1/61 = .0322664 beats pc_01 2/62 = .0322581, then
    # pc_04 1/64+1/63, pc_03 1/65+1/64, pc_05 1/61 (vector side only), pc_06 1/66.
    out = local.rank(CAT, VECTORS, QUERY, "warm red rug gift", ["warm", "red", "rug"], {})
    assert ids(out["results"]) == ["pc_02", "pc_01", "pc_04", "pc_03", "pc_05", "pc_06"]
    scores = [r["score"] for r in out["results"]]
    assert scores[0] == 1 and scores == sorted(scores, reverse=True)
    assert out["results"][4]["score"] == round((1 / 61) / (1 / 63 + 1 / 61), 4)
    assert "pc_07" not in ids(out["results"])


def test_a_piece_with_no_keyword_match_enters_only_through_the_vector_side():
    out = local.rank(CAT, VECTORS, QUERY, "warm red rug gift", ["warm", "red", "rug"], {})
    pc05 = next(r for r in out["results"] if r["pieceId"] == "pc_05")
    assert pc05["matched"] == [] and pc05["reason"] == {"en": "Close in feel: calm.", "zh": "感觉相近：calm。"}
    kw = local.keyword_index(CAT).hits("warm red rug gift", set(ACTIVE))
    assert "pc_05" not in kw and "pc_06" not in kw  # zero-score keyword hits never enter
    assert local.keyword_index(CAT).hits("zzzz", set(ACTIVE)) == []


def test_a_price_filter_and_a_price_chip_remove_pieces_above_the_cap():
    by_filter = local.rank(CAT, VECTORS, QUERY, "warm red rug gift", ["warm", "red", "rug"], {"maxPriceCents": 20000})
    by_chip = local.rank(CAT, VECTORS, QUERY, "warm red rug gift", ["warm", "red", "rug", "under $200"], {})
    assert ids(by_filter["results"]) == ids(by_chip["results"]) == ["pc_01", "pc_04", "pc_03", "pc_05"]
    assert all(CAT.docs[p]["priceCents"] <= 20000 for p in ids(by_chip["results"]))
    # The lower cap wins.
    both = local.Filters.of(["under $200"], {"maxPriceCents": 10000})
    assert both.max_price_cents == 10000
    assert local.price_chip_cents("under $200") == 20000 and local.price_chip_cents("below $1,500") == 150000
    assert local.price_chip_cents("warm") is None


def test_a_community_filter_keeps_only_those_communities():
    out = local.rank(CAT, VECTORS, QUERY, "red", ["red"], {"communityIds": ["com_ojibwe", "com_acoma"]})
    assert set(ids(out["results"])) == {"pc_04", "pc_05"}


def test_drafts_never_appear_even_when_their_vector_is_the_query():
    out = local.rank(CAT, VECTORS, PIECE_VECS["pc_07"], "warm red wool rug draft", ["warm", "red", "wool", "rug"], {})
    assert "pc_07" not in ids(out["results"])
    assert not local.Filters().allows(CAT.docs["pc_07"])
    assert "pc_07" not in CAT.active_ids()


def test_closeness_and_close_matches():
    out = local.rank(CAT, VECTORS, QUERY, "warm red rug gift", ["warm"], {})
    cos = {p: local.cosines(QUERY, np.asarray([PIECE_VECS[p]]))[0] for p in ACTIVE}
    base = float(np.mean(list(cos.values())))
    for r in out["results"]:
        assert r["closeness"] == round(min(1, max(0, (cos[r["pieceId"]] - base) / (1 - base))), 4)
    assert out["closeMatches"] is True
    # A query close to nothing: its best piece is pc_03 at about 0.17, under CLOSE_MIN.
    odd = local.rank(CAT, VECTORS, pad([0, 0, 1, 0]), "zzzz", [], {})
    assert odd["closeMatches"] is False
    assert max(r["closeness"] for r in odd["results"]) < thresholds.CLOSE_MIN
    assert local.closeness(0.2, 1.0) == 0.0 and local.closeness(2.0, 0.5) == 1.0


def test_matched_follows_keyword_aliases_and_skips_the_price_chip():
    doc = CAT.docs["pc_01"]
    assert reasons.matched_keywords(["mom", "gift for mom", "under $200", "Warm", "rug"], doc, CAT.aliases) == ["mom", "gift for mom", "Warm"]
    assert reasons.matched_keywords(["warm", "warm"], doc, CAT.aliases) == ["warm"]


def test_reasons_are_built_from_the_facets():
    doc = CAT.docs["pc_01"]
    assert reasons.reason(["warm", "red", "gift for mom"], doc) == {
        "en": "Matches warm, red and gift for mom: small grey, red and black wool weaving.",
        "zh": "匹配：warm、red、gift for mom：灰红黑三色小幅羊毛编织。",
    }
    assert reasons.reason(["warm"], doc)["en"] == "Matches warm: small grey, red and black wool weaving."
    assert reasons.reason([], doc) == {"en": "Close in feel: warm and bold.", "zh": "感觉相近：warm、bold。"}
    assert reasons.reason([], {"moods": []})["en"] == "Close in feel to your words."


def test_close_min_is_recorded_in_thresholds():
    assert 0 < thresholds.CLOSE_MIN < 1 and thresholds.CLOSE_MIN_NOTE
    assert (thresholds.ELASTIC_BUDGET_S, thresholds.SEED_BUDGET_S) == (2.5, 60)
    assert 6 <= thresholds.CONVERSE_TIMEOUT_S < 19 and thresholds.SEED_CONVERSE_TIMEOUT_S < thresholds.SEED_BUDGET_S


# =============================================================================================
# T2: surprise, ported exactly from src/sources/surprise.ts


def test_mulberry32_matches_surprise_ts_bit_for_bit():
    assert [s["seed"] for s in GOLDEN["seeds"]][:3] == [1, 7, 13]
    for s in GOLDEN["seeds"]:
        rng = surprise_mod.mulberry32(s["seed"])
        assert [rng(), rng(), rng()] == s["mulberry32"], s["seed"]


@pytest.mark.parametrize("seed", [1, 7, 13, 10])
def test_golden_draws_replay_exactly(seed):
    s = next(x for x in GOLDEN["seeds"] if x["seed"] == seed)
    for method, d in s["draws"].items():
        cids = [c["pieceId"] for c in d["candidates"]]
        raw = [c["raw"] for c in d["candidates"]]
        assert surprise_mod.raw_weights(method, cids, {}) == raw or method == "fair_random"
        assert surprise_mod.walk(cids, raw, seed) == d["pieceId"], (seed, method)
        total = surprise_mod.plain_total(raw)
        assert [w / total for w in raw] == [c["weight"] for c in d["candidates"]]


def test_figure_12_lands_on_pc_38():
    s = next(x for x in GOLDEN["seeds"] if x["seed"] == 10)
    assert s["mulberry32"][0] == pytest.approx(0.50199, abs=1e-5)
    assert s["draws"]["fair_random"]["pieceId"] == "pc_38"


def test_the_same_seed_gives_the_same_piece_and_weights_sum_to_one():
    a = engine.surprise("red", "keyword_random", 5)
    b = engine.surprise("red", "keyword_random", 5)
    assert a == b and a is not None
    assert abs(sum(c["weight"] for c in a["candidates"]) - 1) < 1e-9
    ranked = engine.search("red", ["red"])["results"]
    assert [c["pieceId"] for c in a["candidates"]] == [r["pieceId"] for r in sorted(ranked, key=lambda r: (-r["score"], r["pieceId"]))]


def test_fair_random_favors_the_fewest_sales():
    d = engine.surprise("geometric", "fair_random", 3)
    sales = {p: CAT.docs[p]["salesThisMonth"] for p in ACTIVE}
    top = max(c["weight"] for c in d["candidates"])
    fewest = min(sales[c["pieceId"]] for c in d["candidates"])
    assert all(sales[c["pieceId"]] == fewest for c in d["candidates"] if c["weight"] == top)
    golden = next(x for x in GOLDEN["seeds"] if x["seed"] == 10)["draws"]["fair_random"]["candidates"]
    assert max(golden, key=lambda c: c["weight"])["pieceId"] == "pc_38"


def test_pure_random_covers_every_active_piece_and_needs_no_model(_b12_fakes):
    _b12_fakes.ready = False
    d = engine.surprise(None, "pure_random", 9)
    assert [c["pieceId"] for c in d["candidates"]] == ACTIVE
    assert all(c["weight"] == pytest.approx(1 / 6) for c in d["candidates"])
    with pytest.raises(engine.NotReady):
        engine.surprise("geometric", "keyword_random", 9)


# =============================================================================================
# T3: Elastic over httpx


def test_the_seed_writes_both_indices_and_every_piece_with_the_fingerprint(es, client):
    resp = client.post("/api/b12/seed", json={"trigger": None, "passagesHash": CAT.passages_hash})
    assert resp.status_code == 200 and resp.json() == {"events": []}
    assert elastic.wait_seed(10)
    for name, alias in (("cindia-pieces-v1", "cindia-pieces"), ("cindia-drafts-v1", "cindia-drafts")):
        body = es.mappings[name]
        assert set(body) == {"mappings", "aliases"} and body["aliases"] == {alias: {}}  # no shard or replica settings
        vec = body["mappings"]["properties"]["vector"]
        assert vec == {"type": "dense_vector", "dims": 384, "index": True, "similarity": "cosine", "index_options": {"type": "int8_hnsw"}}
        props = body["mappings"]["properties"]
        assert props["title_en"]["analyzer"] == "english" and props["title_zh"]["analyzer"] == "standard"
        assert all(props[f]["fields"]["keyword"]["type"] == "keyword" for f in ("materials", "motifs", "moods", "recipients"))
    docs = es.indices["cindia-pieces-v1"]
    assert sorted(docs) == ACTIVE
    assert all(len(d["vector"]) == 384 and d["fingerprint"] == FP and d["status"] == "active" for d in docs.values())
    bulk = [c for c in es.calls if c["path"] == "/_bulk"]
    assert len(bulk) == 1 and bulk[0]["params"] == {"refresh": "wait_for"}
    st = client.get("/api/b12/status").json()
    assert st["indexed"] == 6 and st["drafts"] == 0 and st["fingerprint"] == FP and st["elastic"] is True
    assert st["seeding"] is False and st["seedError"] is None and st["agentBuilder"] is True
    assert agent.AGENT_ID in es.agents and es.conversations == 1
    # A restarted server reads agentBuilder from the last seed, without a conversation.
    assert elastic.read_last_seed() == {"fingerprint": FP, "agentBuilder": True, "indexed": 6}
    elastic.reset()
    assert elastic.refresh_status()["agentBuilder"] is True and es.conversations == 1
    # A later seed finds the indices and adds any field the mapping gained.
    elastic.ensure_indices(elastic.Budget(5))
    assert es.mappings["cindia-pieces-v1/_mapping"][-1]["properties"]["place"] == {"type": "text"}


def test_a_second_seed_while_one_runs_starts_nothing(es):
    elastic.set_status_for_tests(seeding=True)
    assert engine.seed(CAT.passages_hash) is False
    assert not [c for c in es.calls if c["path"] == "/_bulk"]


def test_proxy_mode_sends_no_authorization_header(es, monkeypatch, client):
    monkeypatch.setattr(config, "ELASTIC_AUTH", "proxy")
    monkeypatch.setattr(config, "ELASTIC_API_KEY", None)
    elastic.reset()
    assert config.elastic_headers() == {}
    client.post("/api/b12/seed", json={"trigger": None, "passagesHash": CAT.passages_hash})
    assert elastic.wait_seed(10)
    client.post("/api/b12/search", json=search_body())
    assert es.calls and es.auth_flags() == {False}
    # With a key set, our code sends one: only its presence is recorded, never its value.
    monkeypatch.setattr(config, "ELASTIC_AUTH", None)
    monkeypatch.setattr(config, "ELASTIC_API_KEY", "fake-elastic-api-key-for-tests")
    es.calls.clear()
    client.post("/api/b12/search", json=search_body())
    assert es.auth_flags() == {True}


def test_the_hybrid_request_body(es):
    seeded(es)
    out = engine.search("warm red rug gift", ["warm", "red", "rug", "under $200"], "en", {"communityIds": ["com_dine"]})
    assert out["engine"] == "elastic_hybrid"
    body = es.bodies("POST", "/cindia-pieces/_search")[-1]
    rrf = body["retriever"]["rrf"]
    assert (rrf["rank_constant"], rrf["rank_window_size"], body["size"]) == (60, 50, 12)
    std, knn = rrf["retrievers"][0]["standard"], rrf["retrievers"][1]["knn"]
    want = [{"term": {"status": "active"}}, {"range": {"priceCents": {"lte": 20000}}}, {"terms": {"communityId": ["com_dine"]}}]
    assert std["filter"] == want and knn["filter"] == want
    assert (knn["field"], knn["k"], knn["num_candidates"], len(knn["query_vector"])) == ("vector", 24, 100, 384)
    mm = std["query"]["multi_match"]
    assert mm["query"] == "warm red rug gift" and "motifs^2" in mm["fields"] and "moods^2" in mm["fields"]
    assert {"title_en^1.5", "title_zh^1.5", "embedText"} <= set(mm["fields"])
    assert ids(out["results"]) == ["pc_01"] or set(ids(out["results"])) <= {"pc_01", "pc_03"}
    assert all(CAT.docs[p]["priceCents"] <= 20000 and CAT.docs[p]["communityId"] == "com_dine" for p in ids(out["results"]))


def test_a_rejected_retrievers_request_falls_back_to_two_queries_fused_here(es):
    seeded(es)
    es.reject_retrievers = True
    out = engine.search("warm red rug gift", ["warm", "red", "rug"])
    assert out["engine"] == "elastic_hybrid"
    bodies = es.bodies("POST", "/cindia-pieces/_search")
    assert any("knn" in b for b in bodies) and any("query" in b and "bool" in b["query"] for b in bodies)
    assert ids(out["results"])[:2] == ["pc_02", "pc_01"]


def test_a_slow_cluster_falls_back_to_local_inside_the_budget(es, client):
    seeded(es)
    es.slow = True
    t0 = time.monotonic()
    resp = client.post("/api/b12/search", json=search_body())
    took = time.monotonic() - t0
    assert resp.status_code == 200 and took < 4.0
    p = check_event(resp.json()["events"][0], "search.answered")
    assert p["engine"] == "local_hybrid"
    assert ids(p["results"]) == ["pc_02", "pc_01", "pc_04", "pc_03", "pc_05", "pc_06"]


def test_an_index_with_another_fingerprint_goes_local(es):
    seeded(es)
    for d in es.indices["cindia-pieces-v1"].values():
        d["fingerprint"] = "ffffffffffffffff"
    assert engine.search("warm", ["warm"])["engine"] == "local_hybrid"
    elastic.refresh_status()
    assert elastic.status()["fingerprint"] == "ffffffffffffffff"
    assert engine.search("warm", ["warm"])["engine"] == "local_hybrid"


def test_status_answers_from_the_cache_in_under_a_second(es, client):
    seeded(es)
    t0 = time.monotonic()
    first = client.get("/api/b12/status")
    t1 = time.monotonic()
    second = client.get("/api/b12/status")
    t2 = time.monotonic()
    assert t1 - t0 < 1.0 and t2 - t1 < 0.2
    for r in (first, second):
        assert set(r.json()) == {"elastic", "indexed", "drafts", "fingerprint", "agentBuilder", "seeding", "seedError"}
    assert second.json()["indexed"] == 6
    assert not [c for c in es.calls if "converse" in c["path"]]  # status never runs a conversation


def test_status_without_elastic_says_so(client):
    st = client.get("/api/b12/status").json()
    assert st["elastic"] is False and st["indexed"] == 0 and st["seeding"] is False


# =============================================================================================
# T4: Agent Builder


def test_ensure_agent_creates_the_tool_over_cindia_pieces_and_the_agent(es):
    agent.ensure_agent(elastic.Budget(5))
    tool = es.tools[agent.TOOL_ID]
    assert tool["type"] == "index_search" and tool["configuration"] == {"pattern": "cindia-pieces"}
    ag = es.agents[agent.AGENT_ID]
    assert ag["configuration"]["tools"] == [{"tool_ids": [agent.TOOL_ID]}]
    assert "pieceId" in ag["configuration"]["instructions"] and "active" in ag["configuration"]["instructions"]
    writes = [c for c in es.calls if c["method"] in ("POST", "PUT")]
    assert writes and all(c["xsrf"] for c in writes)
    # A second run updates in place.
    agent.ensure_agent(elastic.Budget(5))
    assert [c["method"] for c in es.calls if c["path"].endswith(agent.AGENT_ID)][-2:] == ["GET", "PUT"]


def test_converse_keeps_only_catalog_piece_ids_and_drops_the_prose(es):
    out = engine.converse("wool pieces under $100 from Arizona")
    assert set(out) == {"pieceIds", "ms"} and isinstance(out["ms"], int)
    assert out["pieceIds"] == ["pc_01", "pc_04"]  # pc_99 isn't in the catalog, pc_07 is a draft, and the prose is gone
    # Only an answer with no message at all falls back to the tool results.
    assert agent.piece_ids({"steps": [{"type": "tool_call", "results": [{"data": {"id": "pc_03"}}]}]}, {"pc_03"}) == ["pc_03"]
    assert agent.piece_ids({"response": {"message": "NONE"}, "steps": [{"type": "tool_call", "results": [{"data": "pc_03"}]}]}, {"pc_03"}) == []
    body = es.bodies("POST", "/api/agent_builder/converse")[0]
    assert body["agent_id"] == "cindia-finder" and body["reasoning_level"] == "none"


def test_a_token_limit_error_means_agent_builder_false_and_the_seed_still_succeeds(es, client):
    es.converse_status = 429
    with pytest.raises(agent.AgentError):
        engine.converse("anything")
    client.post("/api/b12/seed", json={"trigger": None, "passagesHash": CAT.passages_hash})
    assert elastic.wait_seed(10)
    st = client.get("/api/b12/status").json()
    assert st["agentBuilder"] is False and st["seedError"] is None and st["indexed"] == 6


# =============================================================================================
# T5: the endpoints


def test_the_router_loads(client):
    assert "b12" in client.get("/api/health").json()["routers"]


def test_search_returns_one_valid_search_answered_on_the_local_path(client, _b12_fakes):
    resp = client.post("/api/b12/search", json=search_body())
    assert resp.status_code == 200
    events = resp.json()["events"]
    assert len(events) == 1
    p = check_event(events[0], "search.answered")
    assert events[0]["at"] == 1234 and p["queryId"] == "qry_user_1"
    assert p["engine"] == "local_hybrid" and p["modelId"] == "cindia-embed-v1"
    assert all("closeness" in r and r["reason"]["en"] for r in p["results"])
    assert _b12_fakes.texts == ["query: warm red rug gift"]
    assert ("working",) in _b12_fakes.processes and ("done", 6) in _b12_fakes.processes


def test_search_on_elastic_returns_engine_elastic_hybrid_within_filters(es, client):
    seeded(es)
    resp = client.post("/api/b12/search", json=search_body(filters={"maxPriceCents": 20000}))
    p = check_event(resp.json()["events"][0], "search.answered")
    assert p["engine"] == "elastic_hybrid" and p["results"]
    assert all(CAT.docs[r["pieceId"]]["priceCents"] <= 20000 for r in p["results"])
    assert all("closeness" in r and isinstance(r["matched"], list) for r in p["results"])


def test_search_while_the_model_is_cold_returns_nothing(client, _b12_fakes):
    _b12_fakes.ready = False
    resp = client.post("/api/b12/search", json=search_body())
    assert resp.status_code == 200 and resp.json() == {"events": []}


@pytest.mark.parametrize("bad", [
    {"queryId": ""},
    {"lang": "fr"},
    {"text": "x" * 1001},
    {"keywords": "warm"},
    {"keywords": ["x" * 201]},
    {"text": "", "keywords": []},
    {"text": "", "keywords": ["under $200"]},
    {"filters": {"maxPriceCents": -5}},
])
def test_a_bad_search_body_is_400(client, bad):
    check_error(client.post("/api/b12/search", json=search_body(**bad)), 400, "bad_request")


def test_a_search_body_without_queryid_is_400(client):
    body = search_body()
    del body["queryId"]
    check_error(client.post("/api/b12/search", json=body), 400, "bad_request")


def test_surprise_returns_one_valid_surprise_drawn(client):
    resp = client.post("/api/b12/surprise", json={"trigger": None, "surpriseId": "srp_user_1", "keyword": "geometric",
                                                  "method": "fair_random", "seed": 4})
    assert resp.status_code == 200
    e = resp.json()["events"][0]
    p = check_event(e, "surprise.drawn")
    assert e["at"] == 0 and p["surpriseId"] == "srp_user_1" and p["seed"] == 4
    check_error(client.post("/api/b12/surprise", json={"trigger": None, "surpriseId": "s", "method": "lucky", "seed": 1}), 400, "bad_request")
    check_error(client.post("/api/b12/surprise", json={"trigger": None, "surpriseId": "s", "method": "pure_random"}), 400, "bad_request")


def test_a_seed_without_matching_vectors_is_400(es, client, monkeypatch):
    monkeypatch.setattr(engine, "VECTORS_FILE", lambda: ("ffffffffffffffff", FP, CAT.passages_hash, dict(PIECE_VECS)))
    r = client.post("/api/b12/seed", json={"trigger": None, "passagesHash": CAT.passages_hash})
    check_error(r, 400, "bad_request")
    assert r.json()["error"]["message"] == "No matching vectors yet. Train B11 first."
    monkeypatch.setattr(engine, "VECTORS_FILE", lambda: (None, None, None, {}))
    check_error(client.post("/api/b12/seed", json={"trigger": None, "passagesHash": CAT.passages_hash}), 400, "bad_request")
    assert not es.calls


def test_a_seed_with_another_catalogs_hash_is_400(es, client):
    check_error(client.post("/api/b12/seed", json={"trigger": None, "passagesHash": "0" * 64}), 400, "bad_request")
    check_error(client.post("/api/b12/seed", json={"trigger": None, "passagesHash": "nope"}), 400, "bad_request")
    assert not es.calls


def test_a_seed_without_elastic_is_key_missing(client):
    check_error(client.post("/api/b12/seed", json={"trigger": None, "passagesHash": CAT.passages_hash}), 503, "key_missing")


def granted(approval_id: str = "apr_user_ab12cd_1") -> dict[str, Any]:
    return {"id": "evt_user_0009", "type": "approval.granted", "at": 5000, "source": "user",
            "payload": {"approvalId": approval_id, "by": "own_01", "date": "2026-10-01"}}


def draft_entry(pid: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    piece = {**next(p for p in FIXTURE["pieces"] if p["id"] == "pc_07"), "id": pid}
    entry = {**next(e for e in FIXTURE["searchIndex"] if e["pieceId"] == "pc_07"), "pieceId": pid}
    community = next(c for c in FIXTURE["communities"] if c["id"] == "com_dine")
    return entry, piece, community


def test_publish_copies_the_draft_into_cindia_pieces_and_deletes_it(es, client):
    seeded(es)
    pid = "pc_user_ab12cd_1"
    entry, piece, community = draft_entry(pid)
    assert engine.index_draft(entry, piece, community, PIECE_VECS["pc_07"]) is True
    draft = es.indices["cindia-drafts-v1"][pid]
    assert draft["status"] == "draft" and draft["fingerprint"] == FP and len(draft["vector"]) == 384
    # Before the approval, no search returns it.
    assert pid not in ids(engine.search("warm red wool rug", ["warm", "red", "wool", "rug"])["results"])
    body = {"trigger": granted(), "listingId": "lst_user_ab12cd_1", "pieceId": pid, "approvalId": "apr_user_ab12cd_1"}
    resp = client.post("/api/b12/publish", json=body)
    assert resp.status_code == 200, resp.text
    e = resp.json()["events"][0]
    p = check_event(e, "listing.indexed")
    assert p == {"listingId": "lst_user_ab12cd_1", "pieceId": pid, "modelId": "cindia-embed-v1",
                 "embedText": entry["embedText"], "index": "cindia-pieces"}
    assert e["at"] == 5000
    assert pid not in es.indices["cindia-drafts-v1"]
    live = es.indices["cindia-pieces-v1"][pid]
    assert live["status"] == "active" and len(live["vector"]) == 384
    # Now a search can return it, and the agent may name it.
    assert pid in engine.valid_piece_ids()
    # A second publish finds no draft.
    check_error(client.post("/api/b12/publish", json=body), 404, "not_found")


def test_publish_names_only_a_granted_persons_listing(es, client):
    seeded(es)
    base = {"trigger": granted(), "listingId": "lst_user_ab12cd_2", "pieceId": "pc_user_ab12cd_2", "approvalId": "apr_user_ab12cd_1"}
    check_error(client.post("/api/b12/publish", json=base), 404, "not_found")
    check_error(client.post("/api/b12/publish", json={**base, "listingId": "lst_01"}), 400, "bad_request")
    check_error(client.post("/api/b12/publish", json={**base, "trigger": None}), 400, "bad_request")
    check_error(client.post("/api/b12/publish", json={**base, "approvalId": "apr_user_zz_9"}), 400, "bad_request")
    assert not [c for c in es.calls if c["method"] == "PUT" and "/cindia-pieces/_doc/" in c["path"]]


def test_index_draft_without_elastic_is_false():
    entry, piece, community = draft_entry("pc_user_ab12cd_3")
    assert engine.index_draft(entry, piece, community, PIECE_VECS["pc_07"]) is False


def test_the_package_reexports_the_module_functions():
    import server.b12_search as b12

    for name in ("search", "surprise", "converse", "index_draft", "publish"):
        assert callable(getattr(b12, name))
    out = b12.search("warm red rug gift", ["warm", "red", "rug"], "en", {})
    assert set(out) == {"results", "closeMatches", "engine", "modelId"} and out["engine"] == "local_hybrid"


def test_event_ids_never_repeat(client):
    seen = set()
    for n in range(3):
        e = client.post("/api/b12/search", json=search_body(queryId=f"qry_user_{n}")).json()["events"][0]
        assert e["id"] not in seen
        seen.add(e["id"])


# =============================================================================================
# Live: one seed, the tour's query once, and the 50 eval queries in one _msearch (B2-8)


@pytest.mark.live
@needs_key("elastic")
@needs_service("model")
def test_live_seed_search_and_eval_on_elastic(client):
    from server.b11_embed import compose, metrics
    from server.b11_embed import model as b11model

    if not b11model.wait_warm(240):
        pytest.skip("B11's model didn't warm up in this process")
    cat = catalog.load()
    timings: dict[str, float] = {}
    t0 = time.monotonic()
    resp = client.post("/api/b12/seed", json={"trigger": None, "passagesHash": cat.passages_hash})
    assert resp.status_code == 200, resp.json()
    assert elastic.wait_seed(65)
    timings["seed_s"] = round(time.monotonic() - t0, 2)
    st = elastic.refresh_status()
    assert st["seedError"] is None, st["seedError"]
    assert st["indexed"] >= 54 and st["fingerprint"] == b11model.fingerprint()

    tour = cat.demo_query or {}
    te = time.monotonic()
    b11model.encode_queries([compose.query_text(tour["text"], tour["keywords"])])
    timings["encode_one_query_s"] = round(time.monotonic() - te, 3)
    t1 = time.monotonic()
    resp = client.post("/api/b12/search", json={"trigger": None, "queryId": "qry_live_1", "text": tour["text"],
                                                "keywords": tour["keywords"], "lang": tour["lang"], "filters": tour.get("filters") or {}})
    timings["tour_query_s"] = round(time.monotonic() - t1, 2)
    p = check_event(resp.json()["events"][0], "search.answered")
    assert p["engine"] == "elastic_hybrid" and p["results"]
    assert all(cat.docs[r["pieceId"]]["priceCents"] <= 20000 for r in p["results"] if r["pieceId"] in cat.docs)

    queries = cat.eval
    vecs = b11model.encode_queries([compose.query_text(q["text"], []) for q in queries])
    bodies = [elastic.retrievers_body(v, local.keyword_query(q["text"], []), local.Filters(), 10) for q, v in zip(queries, vecs, strict=True)]
    t2 = time.monotonic()
    ranked = elastic.msearch(bodies, elastic.Budget(30))
    timings["eval_msearch_s"] = round(time.monotonic() - t2, 2)
    assert len(ranked) == len(queries) and all(r is not None for r in ranked)
    rankings = {q["id"]: r or [] for q, r in zip(queries, ranked, strict=True)}
    s = metrics.score(rankings, queries)
    out = {
        "_about": "B12's live eval: the 50 held-out queries (written separately by our data agent, never used for "
                  "training) run once on Elastic's hybrid (rrf over multi_match and kNN on Cindia's own vectors). "
                  "A small test, not a benchmark.",
        "engine": "elastic_hybrid",
        "modelId": b11model.read_report().get("modelId"),
        "fingerprint": b11model.fingerprint(),
        "queries": len(queries),
        "k": metrics.K,
        "recallAtK": round(s["recallAtK"], 4),
        "mrr": round(s["mrr"], 4),
        "agentBuilder": st["agentBuilder"],
        "timings": timings,
    }
    (ROOT / "server" / "b12_search" / "eval.json").write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")
    assert 0 < out["recallAtK"] <= 1
