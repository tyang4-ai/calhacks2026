"""B11 · the embedding model. Tests for T1 (data.py, compose.py), T2 (bm25.py, metrics.py), T4
(train.py, evaluate.py, pca.py) and T6 (model.py and the three endpoints in server/routers/b11_embed.py).

The fixture b11_fixture.json holds three pieces (pc_01, pc_10, pc_14), their two communities and
their index entries, copied from artifacts/mock/mock.json. The "real data" tests read whichever
file data.load() would pick (the artifact or the committed snapshot) and skip, saying which field
is missing, while S3-catalog is still writing it.

T4 and T6 run the whole pipeline on that fixture, with a small synthetic eval set and pairs file
built here, through a fake backend whose encoder hashes words into vectors, so nothing downloads a
model or calls the network. Two tests use a tiny randomly initialized sentence-transformers model
built in a temporary folder (no download) to exercise the real encode, save and load path, and two
more run the real SentenceTransformerTrainer on it when `datasets` and `accelerate` are installed
(server/b11_embed/requirements-train.txt), skipping with that reason otherwise. The one live test
needs the trained model on disk (needs_service("model")).
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import logging
import math
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

import numpy as np
import pytest
from conftest import needs_service

from server import config
from server.b11_embed import bm25, compose, evaluate, metrics, pca, train
from server.b11_embed import data as b11data
from server.b11_embed import model as b11model

FIXTURE = Path(__file__).with_name("b11_fixture.json")
ROOT = Path(__file__).resolve().parents[2]

PC_01_PASSAGE = (
    "passage: wall weaving | craft: Wool weavings, silver and turquoise jewelry, Diné (Navajo) | "
    "materials: wool | techniques: handwoven | motifs: diamond, step | colors: grey, red, black | "
    "mood: warm, bold | for: birthday, gift for mom | "
    "A small wool weaving in grey, red and black, with a stepped diamond at its center."
)
DEMO_TEXT = "a warm, bold gift for my mom. she loves red wool. under $200"
DEMO_CHIPS = ["warm", "bold", "red", "wool", "gift for mom", "under $200"]


def fixture_raw() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def fixture_data() -> b11data.Data:
    return b11data.load(FIXTURE, expected=3)


def write_json(path: Path, obj: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    return path


class ListHandler(logging.Handler):
    def __init__(self) -> None:
        super().__init__(logging.INFO)
        self.lines: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.lines.append(record.getMessage())


# ---------------------------------------------------------------------------------------------
# T1 · compose.py: the passage rule


def test_fixture_passages_rebuild_exactly():
    raw = fixture_raw()
    pieces = {p["id"]: p for p in raw["pieces"]}
    communities = {c["id"]: c for c in raw["communities"]}
    assert len(raw["searchIndex"]) == 3
    for e in raw["searchIndex"]:
        piece = pieces[e["pieceId"]]
        assert compose.passage_text(piece, communities[piece["communityId"]]) == e["embedText"], e["pieceId"]


def test_pc_01_passage_literally():
    d = fixture_data()
    assert d.index[0]["embedText"] == PC_01_PASSAGE
    assert compose.passage_text(d.piece("pc_01"), d.community_of("pc_01")) == PC_01_PASSAGE


def test_a_missing_part_is_left_out_with_its_label():
    d = fixture_data()
    # pc_10 has no motifs, and its story is one sentence with no ". " in it.
    text = compose.passage_text(d.piece("pc_10"), d.community_of("pc_10"))
    assert "motifs:" not in text
    assert text.endswith("| " + d.piece("pc_10")["story"]["en"].strip())

    base = {
        "facets": {"object": {"en": "seed pot", "zh": "种子罐"}, "materials": ["clay"], "techniques": [], "motifs": [], "colors": ["black"]},
        "vibe": {"moods": [], "occasions": [], "recipients": ["gift for mom"]},
        "story": {"en": "A small pot. It is black.", "zh": ""},
    }
    community = {"craft": {"en": "Coil-built, hand-painted pottery"}, "people": {"en": "Acoma Pueblo"}}
    assert compose.passage_text(base, community) == (
        "passage: seed pot | craft: Coil-built, hand-painted pottery, Acoma Pueblo | materials: clay | "
        "colors: black | for: gift for mom | A small pot."
    )
    only_occasions = {**base, "vibe": {"moods": ["calm"], "occasions": ["birthday"], "recipients": []}}
    assert "| mood: calm | for: birthday |" in compose.passage_text(only_occasions, community)
    no_for = {**base, "vibe": {"moods": [], "occasions": [], "recipients": []}}
    assert "for:" not in compose.passage_text(no_for, community)
    assert compose.passage_text(base, None).startswith("passage: seed pot | materials: clay |")
    people_only = {"people": {"en": "Seminole"}}
    assert "| craft: Seminole |" in compose.passage_text(base, people_only)
    no_story = {**base, "story": {"en": "   "}}
    assert compose.passage_text(no_story, community).endswith("| for: gift for mom")


@pytest.mark.parametrize(
    ("story", "first"),
    [
        ("One! Two.", "One!"),
        ("Is it red? Yes, red.", "Is it red?"),
        ("No end mark here", "No end mark here"),
        ("Ends with a period.", "Ends with a period."),
        ("  Padded at the start. Rest.", "Padded at the start."),
        ("About 3.5 cm wide. More words.", "About 3.5 cm wide."),
        ("", ""),
    ],
)
def test_first_sentence(story, first):
    assert compose.first_sentence(story) == first


# ---------------------------------------------------------------------------------------------
# T1 · compose.py: the query rule and the prefixes


def test_figure_11_query_adds_no_chip_the_text_already_has():
    # Every word chip's words are in the text, and the price chip is a filter.
    assert compose.query_text(DEMO_TEXT, DEMO_CHIPS) == "query: " + DEMO_TEXT


def test_chips_whose_words_are_missing_are_appended_once_in_order():
    assert compose.query_text("something cozy", ["warm", "gift for mom", "under $200", "warm"]) == (
        "query: something cozy, warm, gift for mom"
    )
    # A chip with only some of its words in the text is added whole.
    assert compose.query_text("a red rug", ["red wool"]) == "query: a red rug, red wool"
    # A chip made redundant by an earlier chip isn't added.
    assert compose.query_text("a gift", ["gift for mom", "mom"]) == "query: a gift, gift for mom"
    # Words are matched whole and case-insensitively, as the browser splits them.
    assert compose.query_text("Red Wool rug", ["wool", "woo"]) == "query: Red Wool rug, woo"


@pytest.mark.parametrize("chip", ["under $200", "below $1,200", "Under $60", "under  $45.50", " below $9 "])
def test_a_price_chip_is_never_embedded(chip):
    assert compose.is_price_chip(chip)
    assert compose.query_text("red earrings", [chip]) == "query: red earrings"
    assert compose.query_text("", ["warm", chip]) == "query: warm"


@pytest.mark.parametrize("chip", ["under the sea", "$200", "below", "under $", "gift for mom"])
def test_other_chips_are_not_price_chips(chip):
    assert not compose.is_price_chip(chip)


def test_query_words_are_kept_as_typed_with_whitespace_collapsed():
    assert compose.query_text("  a   calm\nbowl  ", []) == "query: a calm bowl"
    assert compose.query_text("给妈妈的红色羊毛礼物", ["red"]) == "query: 给妈妈的红色羊毛礼物, red"
    with pytest.raises(ValueError):
        compose.query_text("   ", ["under $50"])


@pytest.mark.parametrize("text", ["query: red wool", "query: query: red wool", "  QUERY :  red wool", "passage: red wool"])
def test_a_query_never_gets_a_second_prefix(text):
    out = compose.query_text(text, [])
    assert out == "query: red wool"
    assert compose.has_one_prefix(out, "query")


def test_has_one_prefix():
    assert compose.has_one_prefix("query: red wool", "query")
    assert compose.has_one_prefix(PC_01_PASSAGE, "passage")
    for bad in ["query: query: red", "query: passage: red", "Query: red", "query:red", "query:  red", "red", "query: ", ""]:
        assert not compose.has_one_prefix(bad, "query"), bad
    assert not compose.has_one_prefix("query: red", "passage")
    assert not compose.has_one_prefix("passage: passage: rug", "passage")
    assert compose.require_one_prefix(["query: a", "query: b"], "query") == ["query: a", "query: b"]
    with pytest.raises(ValueError, match="input 1"):
        compose.require_one_prefix(["query: a", "query: query: b"], "query")


def test_every_string_the_code_builds_has_exactly_one_prefix():
    d = fixture_data()
    passages = [compose.passage_text(d.piece(pid), d.community_of(pid)) for pid in d.piece_ids()]
    compose.require_one_prefix(passages + d.passages(), "passage")
    queries = [
        compose.query_text(d.demo_query["text"], d.demo_query["keywords"]),
        compose.query_text("query: something warm", ["gift for mom"]),
        compose.query_text("passage: 耳环", []),
        compose.query_text("", ["bold", "under $60"]),
    ]
    compose.require_one_prefix(queries, "query")
    for q in queries:
        assert compose.count_prefixes(q) == 1 and "passage:" not in q


def test_keyword_text_drops_the_prefix_and_labels_and_adds_the_chinese_words():
    d = fixture_data()
    text = compose.keyword_text(d.index[0], d.piece("pc_01"), d.community_of("pc_01"))
    for label in ("passage:", "craft:", "materials:", "techniques:", "motifs:", "colors:", "mood:", "for:"):
        assert label not in text
    assert d.piece("pc_01")["title"]["zh"] in text  # 灰红黑三色小幅羊毛编织
    assert d.community_of("pc_01")["craft"]["zh"] in text  # 羊毛编织与绿松石银饰
    assert "壁挂编织" in text  # the object in Chinese
    assert text.startswith("wall weaving Wool weavings, silver and turquoise jewelry, Diné (Navajo) wool handwoven")
    # The craft line keeps its own colon ("Floral beadwork: earrings, ...").
    ojibwe = compose.keyword_text(d.index[2], d.piece("pc_14"), d.community_of("pc_14"))
    assert "Floral beadwork: earrings, pouches and necklaces, Ojibwe" in ojibwe


# ---------------------------------------------------------------------------------------------
# T1 · data.py


def test_fixture_loads_in_piece_id_order_and_logs_its_source():
    logger = logging.getLogger("cindia.b11")
    handler = ListHandler()
    logger.addHandler(handler)
    old = logger.level
    logger.setLevel(logging.INFO)
    try:
        d = fixture_data()
    finally:
        logger.removeHandler(handler)
        logger.setLevel(old)
    assert d.piece_ids() == ["pc_01", "pc_10", "pc_14"]
    assert set(d.communities) == {"com_dine", "com_ojibwe"}
    assert d.generated_at == fixture_raw()["_generatedAt"]
    assert d.demo_query["text"] == DEMO_TEXT
    assert d.aliases["mom"] == "gift for mom"
    assert len(handler.lines) == 1
    assert "b11_fixture.json" in handler.lines[0] and d.generated_at in handler.lines[0]
    assert b11data.check(d, expected_eval=0) == []


def test_passages_hash_is_sha256_of_the_passages_in_piece_id_order(tmp_path):
    raw = fixture_raw()
    raw["searchIndex"] = list(reversed(raw["searchIndex"]))
    d = b11data.load(write_json(tmp_path / "m.json", raw), expected=3)
    texts = [e["embedText"] for e in sorted(fixture_raw()["searchIndex"], key=lambda e: e["pieceId"])]
    assert d.passages() == texts
    assert d.passages_hash() == hashlib.sha256("\n".join(texts).encode("utf-8")).hexdigest()
    assert b11data.id_key("pc_9") < b11data.id_key("pc_10")


def test_load_reads_the_newer_of_artifact_and_snapshot(tmp_path):
    raw = fixture_raw()
    art, snap = tmp_path / "art" / "mock.json", tmp_path / "snap" / "mock.json"
    write_json(art, {**raw, "_generatedAt": "2026-10-25T04:00:00.000Z"})
    write_json(snap, {**raw, "_generatedAt": "2026-10-25T03:00:00.000Z"})
    assert b11data.load(artifact=art, snapshot=snap, expected=3).source == art
    write_json(snap, {**raw, "_generatedAt": "2026-10-25T05:00:00.000Z"})
    assert b11data.load(artifact=art, snapshot=snap, expected=3).source == snap
    # Without _generatedAt, the file times decide.
    write_json(art, {k: v for k, v in raw.items() if k != "_generatedAt"})
    os.utime(art, (1_000_000, 1_000_000))
    assert b11data.pick_source(art, snap) == snap
    os.utime(art, (4_000_000_000, 4_000_000_000))
    assert b11data.pick_source(art, snap) == art
    # Only one of them.
    art.unlink()
    assert b11data.load(artifact=art, snapshot=snap, expected=3).source == snap


def test_load_fails_with_one_plain_line(tmp_path):
    raw = fixture_raw()
    cases = []
    with pytest.raises(b11data.DataError) as e:
        b11data.load(artifact=tmp_path / "none.json", snapshot=tmp_path / "nope.json")
    cases.append((e.value, "neither"))
    with pytest.raises(b11data.DataError) as e:
        b11data.load(FIXTURE)  # 3 entries, not 54
    cases.append((e.value, "searchIndex holds 3 entries, expected 54"))
    with pytest.raises(b11data.DataError) as e:
        b11data.load(write_json(tmp_path / "a.json", {k: v for k, v in raw.items() if k != "searchIndex"}), expected=3)
    cases.append((e.value, "has no searchIndex"))
    no_piece = {**raw, "pieces": raw["pieces"][:2]}
    with pytest.raises(b11data.DataError) as e:
        b11data.load(write_json(tmp_path / "b.json", no_piece), expected=3)
    cases.append((e.value, "pc_14 has no piece"))
    no_comm = {**raw, "communities": raw["communities"][:1]}
    with pytest.raises(b11data.DataError) as e:
        b11data.load(write_json(tmp_path / "c.json", no_comm), expected=3)
    cases.append((e.value, "no community"))
    twice = {**raw, "searchIndex": [raw["searchIndex"][0]] * 3}
    with pytest.raises(b11data.DataError) as e:
        b11data.load(write_json(tmp_path / "d.json", twice), expected=3)
    cases.append((e.value, "pc_01 twice"))
    bad = tmp_path / "e.json"
    bad.write_text("{not json", encoding="utf-8")
    with pytest.raises(b11data.DataError) as e:
        b11data.load(bad, expected=3)
    cases.append((e.value, "isn't valid UTF-8 JSON"))
    for exc, words in cases:
        message = str(exc)
        assert words in message
        assert "\n" not in message and len(message) < 300


def test_check_lists_what_is_off(tmp_path):
    raw = fixture_raw()
    raw["searchIndex"][1] = {**raw["searchIndex"][1], "embedText": raw["searchIndex"][1]["embedText"] + " Extra."}
    raw["searchEval"] = [
        {"id": "sq_001", "text": "red wool", "lang": "en", "grades": {"pc_01": 2, "pc_99": 1}, "author": "data_agent"},
        {"id": "sq_002", "text": "耳环", "lang": "fr", "grades": {"pc_10": 1}, "author": "someone"},
        {"id": "sq_002", "text": "", "lang": "zh", "grades": {}, "author": "gordon"},
    ]
    raw["contentRules"] = {"bannedObjects": []}
    problems = b11data.check(b11data.load(write_json(tmp_path / "m.json", raw), expected=3))
    joined = "\n".join(problems)
    assert "pc_10's embedText doesn't follow the passage rule" in joined
    assert "searchEval holds 3 queries, expected 50" in joined
    assert "sq_001 grades pieces that aren't in the index: pc_99" in joined
    assert "sq_002's lang is 'fr'" in joined
    assert "sq_002's author is 'someone'" in joined
    assert "sq_002 has no grade-2 piece" in joined
    assert "searchEval lists sq_002 twice" in joined
    assert "sq_002 has no text" in joined and "sq_002 grades no piece" in joined
    assert "contentRules has no stereotypeWords" in joined
    assert all("\n" not in p for p in problems)


def test_snapshot_copies_only_b11s_keys_as_utf8(tmp_path):
    raw = {**fixture_raw(), "orders": [{"id": "ord_001"}], "ledger": []}
    src = write_json(tmp_path / "artifacts" / "mock.json", raw)
    dest = tmp_path / "data" / "mock.json"
    d, problems = b11data.snapshot(src, dest, expected=3)
    assert d.piece_ids() == ["pc_01", "pc_10", "pc_14"]
    assert problems == ["searchEval holds 0 queries, expected 50"]
    text = dest.read_text(encoding="utf-8")
    assert "灰红黑三色小幅羊毛编织" in text and "\\u" not in text
    out = json.loads(text)
    assert list(out)[:2] == ["_about", "_generatedAt"]
    assert set(out) == {"_about", "_generatedAt", *b11data.SNAPSHOT_KEYS}
    assert out["_generatedAt"] == raw["_generatedAt"]
    assert out["searchIndex"] == raw["searchIndex"]
    assert not list(dest.parent.glob("*.tmp"))
    # The snapshot loads on its own.
    assert b11data.load(dest, expected=3).passages_hash() == d.passages_hash()


def test_snapshot_writes_nothing_for_bad_data(tmp_path):
    dest = tmp_path / "data" / "mock.json"
    with pytest.raises(b11data.DataError, match="doesn't exist"):
        b11data.snapshot(tmp_path / "missing.json", dest, expected=3)
    src = write_json(tmp_path / "mock.json", fixture_raw())
    with pytest.raises(b11data.DataError, match="expected 54"):
        b11data.snapshot(src, dest)
    assert not dest.exists()
    # A snapshot newer than the artifact is kept unless forced.
    write_json(dest, {**fixture_raw(), "_generatedAt": "2099-01-01T00:00:00.000Z"})
    with pytest.raises(b11data.DataError, match="newer"):
        b11data.snapshot(src, dest, expected=3)
    b11data.snapshot(src, dest, expected=3, force=True)
    assert json.loads(dest.read_text(encoding="utf-8"))["_generatedAt"] == fixture_raw()["_generatedAt"]


def test_cli_snapshot_and_check(tmp_path, monkeypatch, capsys):
    src = write_json(tmp_path / "artifacts" / "mock.json", fixture_raw())
    dest = tmp_path / "data" / "mock.json"
    monkeypatch.setattr(b11data, "ARTIFACT", src)
    monkeypatch.setattr(b11data, "SNAPSHOT", dest)
    monkeypatch.setattr(b11data, "EXPECTED_PIECES", 3)
    assert b11data.main(["--snapshot"]) == 0
    out = capsys.readouterr().out
    assert "wrote" in out and "3 index entries" in out and "warning: searchEval holds 0 queries" in out
    assert dest.is_file()
    assert b11data.main([]) == 1  # the eval set is missing, so the check exits 1
    assert "problem: searchEval holds 0 queries" in capsys.readouterr().out
    monkeypatch.setattr(b11data, "EXPECTED_PIECES", 54)
    assert b11data.main(["--file", str(src)]) == 1
    err = capsys.readouterr().err
    assert err.strip().endswith("searchIndex holds 3 entries, expected 54")


# ---------------------------------------------------------------------------------------------
# T1 · the real data, when it exists (skips name what S3-catalog hasn't written yet)


def real_raw() -> tuple[Path, dict]:
    try:
        path = b11data.pick_source()
    except b11data.DataError as exc:
        pytest.skip(f"no B11 data yet: {exc}")
    return path, json.loads(path.read_text(encoding="utf-8"))


def test_real_index_follows_the_passage_rule():
    path, raw = real_raw()
    where = b11data.rel(path)
    index = raw.get("searchIndex") or []
    if not index:
        pytest.skip(f"searchIndex is empty in {where}: S3-catalog T5 hasn't written the index yet")
    communities = {c["id"]: c for c in raw.get("communities") or []}
    if not communities:
        pytest.skip(f"communities is empty in {where}: S3-catalog T2 hasn't written them yet")
    pieces = {p["id"]: p for p in raw.get("pieces") or []}
    wrong = []
    for e in index:
        piece = pieces.get(e["pieceId"])
        assert piece is not None, f"{e['pieceId']} is in searchIndex but not in pieces"
        community = communities.get(piece.get("communityId"))
        assert community is not None, f"{e['pieceId']}'s community {piece.get('communityId')} is missing"
        assert compose.has_one_prefix(e["embedText"], "passage"), e["pieceId"]
        if compose.passage_text(piece, community) != e["embedText"]:
            wrong.append(e["pieceId"])
    assert wrong == [], f"embedText doesn't follow the passage rule for {wrong}"


def test_real_index_holds_all_54_pieces():
    path, raw = real_raw()
    n = len(raw.get("searchIndex") or [])
    if n < b11data.EXPECTED_PIECES:
        pytest.skip(f"searchIndex holds {n} of 54 entries in {b11data.rel(path)}: S3-catalog hasn't finished the catalog")
    d = b11data.load()
    assert len(d.index) == 54 and len(set(d.piece_ids())) == 54
    assert [p for p in b11data.check(d) if "embedText" in p] == []


def test_real_eval_queries_compose_with_one_prefix():
    path, raw = real_raw()
    queries = raw.get("searchEval") or []
    if not queries:
        pytest.skip(f"searchEval is empty in {b11data.rel(path)}: S3-catalog T6 hasn't written the eval queries yet")
    composed = [compose.query_text(q["text"], []) for q in queries]
    compose.require_one_prefix(composed, "query")
    known = {e["pieceId"] for e in raw.get("searchIndex") or []}
    for q in queries:
        assert q.get("lang") in ("en", "zh"), q.get("id")
        assert set(q.get("grades") or {}) <= known, q.get("id")
        assert 2 in (q.get("grades") or {}).values(), q.get("id")
    demo = ((raw.get("demoSearch") or {}).get("query") or {}).get("text")
    assert demo not in {q["text"] for q in queries}


def test_committed_snapshot_loads_when_present():
    if not b11data.SNAPSHOT.is_file():
        pytest.skip(f"{b11data.rel(b11data.SNAPSHOT)} isn't written yet (python server/b11_embed/data.py --snapshot)")
    raw = json.loads(b11data.SNAPSHOT.read_text(encoding="utf-8"))
    assert set(raw) <= {"_about", "_generatedAt", *b11data.SNAPSHOT_KEYS}
    d = b11data.load(b11data.SNAPSHOT)
    assert [p for p in b11data.check(d) if "embedText" in p] == []


# ---------------------------------------------------------------------------------------------
# T2 · bm25.py


def test_tokenize():
    assert bm25.tokenize("Red, red WOOL 红色羊毛") == ["red", "red", "wool", "红", "色", "羊", "毛"]
    assert bm25.tokenize("Diné (Navajo)") == ["dine", "navajo"]
    assert bm25.tokenize("my mom’s hand-painted pot, under $200") == ["my", "moms", "hand", "painted", "pot", "under", "200"]
    assert bm25.tokenize("ｒｅｄ　ＷＯＯＬ，羊毛。") == ["red", "wool", "羊", "毛"]
    assert bm25.tokenize("red色") == ["red", "色"]
    assert bm25.tokenize("") == []


def test_analyze_drops_stopwords_and_plurals():
    assert bm25.analyze("Earrings and pouches for my mom's") == ["earring", "pouch", "mom"]
    assert bm25.analyze("berries dresses glass cactus beads boxes") == ["berry", "dress", "glass", "cactus", "bead", "box"]
    assert bm25.analyze("给妈妈的耳环") == ["给", "妈", "妈", "的", "耳", "环"]
    assert bm25.analyze("for the a") == []
    assert "gift" in bm25.analyze("a gift for myself") and "myself" in bm25.analyze("a gift for myself")


def test_bm25_scores_worked_by_hand():
    index = bm25.BM25({"d1": "red wool", "d2": "red clay", "d3": "blue clay pot"})
    # N = 3, lengths 2, 2, 3, avgdl = 7/3, k1 = 1.2, b = 0.75.
    idf_once = math.log(1 + (3 - 1 + 0.5) / (1 + 0.5))  # ln(8/3), a term in one document
    idf_twice = math.log(1 + (3 - 2 + 0.5) / (2 + 0.5))  # ln(1.6), a term in two documents
    tf_len2 = 2.2 / (1 + 1.2 * (0.25 + 0.75 * 2 / (7 / 3)))  # f = 1 in a 2-term document
    tf_len3 = 2.2 / (1 + 1.2 * (0.25 + 0.75 * 3 / (7 / 3)))  # f = 1 in a 3-term document
    assert index.idf("wool") == pytest.approx(0.980829, abs=1e-6)
    assert index.scores("wool") == pytest.approx({"d1": idf_once * tf_len2, "d2": 0.0, "d3": 0.0})
    assert index.scores("wool")["d1"] == pytest.approx(1.041709, abs=1e-6)
    # A query term counts once, and stopwords count for nothing.
    assert index.scores("the wool wool") == index.scores("wool")
    hits = index.rank("red pot")
    assert [h[0] for h in hits] == ["d3", "d1", "d2"]  # d1 and d2 tie, by ID
    assert hits[0][1] == pytest.approx(idf_once * tf_len3)
    assert hits[1][1] == pytest.approx(idf_twice * tf_len2)
    assert hits[2][1] == pytest.approx(idf_twice * tf_len2)
    # Only documents that scored above 0 come back.
    assert index.rank("green") == [] and index.rank("for the") == []
    assert index.rank("red pot", top=1) == hits[:1]
    with pytest.raises(ValueError):
        bm25.BM25([("d1", "a"), ("d1", "b")])


def test_bm25_gives_chinese_queries_a_keyword_baseline():
    d = fixture_data()
    docs = {pid: compose.keyword_text(d.index[i], d.piece(pid), d.community_of(pid)) for i, pid in enumerate(d.piece_ids())}
    index = bm25.BM25(docs)
    assert set(bm25.top_ids(index.rank("耳环"))) == {"pc_10", "pc_14"}
    assert bm25.top_ids(index.rank("红色羊毛"))[0] == "pc_01"
    assert bm25.top_ids(index.rank("beaded earrings with flowers"))[0] == "pc_14"
    assert bm25.top_ids(index.rank("Turquoise earring"))[0] == "pc_10"


def test_token_overlap():
    assert bm25.token_overlap("red wool rug", "a red wool rug") == 1.0
    assert bm25.token_overlap("红色羊毛", "红色") == 0.5
    assert bm25.token_overlap("", "anything") == 0.0


# ---------------------------------------------------------------------------------------------
# T2 · metrics.py, on a toy set worked out by hand

TOY_QUERIES = [
    {"id": "q1", "lang": "en", "grades": {"A": 2, "B": 1, "C": 1}},
    {"id": "q2", "lang": "en", "grades": {"D": 2}},
    {"id": "q3", "lang": "zh", "grades": {"A": 1, "E": 2}},
]
TOY_SYSTEMS = {
    # q1: A, B in the top 5 of 3 graded, A (grade 2) first. q2: D at rank 7. q3: A only, no E.
    "x": {"q1": ["A", "x1", "B", "x2", "x3", "C"], "q2": ["x1", "x2", "x3", "x4", "x5", "x6", "D"], "q3": ["A", "x1", "x2"]},
    # q1: all three, A third. q2: D first. q3: nothing returned.
    "y": {"q1": ["B", "C", "A"], "q2": ["D"], "q3": []},
}


def test_recall_at_5_and_mrr_at_10_by_hand():
    x = metrics.per_query(TOY_SYSTEMS["x"], TOY_QUERIES)
    assert x["q1"] == pytest.approx({"recallAtK": 2 / 3, "mrr": 1.0})
    assert x["q2"] == pytest.approx({"recallAtK": 0.0, "mrr": 1 / 7})
    assert x["q3"] == pytest.approx({"recallAtK": 0.5, "mrr": 0.0})
    assert metrics.score(TOY_SYSTEMS["x"], TOY_QUERIES) == pytest.approx({"recallAtK": (2 / 3 + 0 + 0.5) / 3, "mrr": (1 + 1 / 7) / 3})
    assert metrics.score(TOY_SYSTEMS["y"], TOY_QUERIES) == pytest.approx({"recallAtK": 2 / 3, "mrr": 4 / 9})
    # min(5, graded): seven graded pieces and a top 5 full of them is 1.0.
    seven = {p: 1 for p in "ABCDEFG"} | {"A": 2}
    assert metrics.recall_at_k(list("ABCDE"), seven) == 1.0
    # MRR@10 stops at rank 10, and a grade-1 piece doesn't count.
    assert metrics.reciprocal_rank([f"n{i}" for i in range(10)] + ["A"], {"A": 2}) == 0.0
    assert metrics.reciprocal_rank(["B", "A"], {"A": 2, "B": 1}) == 0.5
    assert metrics.recall_at_k(["A"], {}) == 0.0


def test_scores_per_language_by_hand():
    table = metrics.by_lang(TOY_SYSTEMS, TOY_QUERIES)
    assert list(table) == ["en", "zh"]
    assert table["en"]["queries"] == 2 and table["zh"]["queries"] == 1
    en = {row["system"]: row for row in table["en"]["systems"]}
    zh = {row["system"]: row for row in table["zh"]["systems"]}
    assert en["x"]["recallAtK"] == pytest.approx(1 / 3) and en["x"]["mrr"] == pytest.approx(4 / 7)
    assert en["y"]["recallAtK"] == pytest.approx(1.0) and en["y"]["mrr"] == pytest.approx(2 / 3)
    assert (zh["x"]["recallAtK"], zh["x"]["mrr"]) == pytest.approx((0.5, 0.0))
    assert (zh["y"]["recallAtK"], zh["y"]["mrr"]) == pytest.approx((0.0, 0.0))
    rows = metrics.systems_table(TOY_SYSTEMS, TOY_QUERIES)
    assert [r["system"] for r in rows] == ["x", "y"] and set(rows[0]) == {"system", "recallAtK", "mrr"}
    by_author = metrics.by_group(TOY_SYSTEMS, [{**q, "author": "gordon" if q["id"] == "q2" else "data_agent"} for q in TOY_QUERIES], "author")
    assert by_author["gordon"]["queries"] == 1 and by_author["data_agent"]["queries"] == 2


def test_rrf_by_hand():
    # A: 1/61 + 1/62, B: 1/62, C: 1/63 + 1/61, so A, C, B.
    assert metrics.rrf([["A", "B", "C"], ["C", "A"]]) == ["A", "C", "B"]
    assert metrics.rrf([["B"], ["A"]]) == ["A", "B"]  # a tie goes by ID
    assert metrics.rrf([["A", "A", "B"]]) == ["A", "B"]  # a repeat in one run counts once


def test_hybrid_skips_keyword_hits_that_scored_zero():
    # Keyword hits are C (3.0) and B (0.0). B's zero is skipped: A 1/61, B 1/62, C 1/63 + 1/61.
    assert metrics.hybrid(["A", "B", "C"], [("C", 3.0), ("B", 0.0)]) == ["C", "A", "B"]
    # Counting B's zero would have put B second (1/62 + 1/62 > 1/61).
    assert metrics.rrf([["A", "B", "C"], ["C", "B"]]) == ["C", "B", "A"]
    assert metrics.hybrid(["A", "B", "C"], [("C", 2.0), ("A", 1.0), ("B", 0.0)]) == ["A", "C", "B"]
    assert metrics.hybrid(["B", "A"], [("A", 0.0), ("B", 0.0)]) == ["B", "A"]
    assert metrics.hybrid(["B", "A"], []) == ["B", "A"]


def test_paired_bootstrap_against_hand_cases():
    # Every query differs by exactly 0.2, so every resample's mean does too.
    same = metrics.paired_bootstrap([0.5] * 10, [0.3] * 10)
    assert same["delta"] == pytest.approx(0.2)
    assert same["ci95"] == pytest.approx([0.2, 0.2]) and same["beats"] is True
    # Differences +1 and -1: a resample's mean is -1, 0 or +1 with chances 1/4, 1/2, 1/4, so the
    # 2.5th and 97.5th percentiles are -1 and +1.
    split = metrics.paired_bootstrap([1.0, 0.0], [0.0, 1.0])
    assert split["delta"] == 0.0 and split["ci95"] == [-1.0, 1.0] and split["beats"] is False
    # Differences 1, 0, 0, 0: the mean is k/4 with k ~ Binomial(4, 1/4), P(k=0) = 0.316 and
    # P(k<=2) = 0.949, P(k<=3) = 0.996, so the interval is [0, 0.75], which touches zero.
    one = metrics.paired_bootstrap([1.0, 0.0, 0.0, 0.0], [0.0] * 4)
    assert one["delta"] == 0.25 and one["ci95"] == [0.0, 0.75] and one["beats"] is False
    # b ahead of a.
    behind = metrics.paired_bootstrap([0.0] * 4, [1.0] * 4)
    assert behind["ci95"] == [-1.0, -1.0] and behind["beats"] is False
    # Seeded: the same call gives the same interval.
    vals_a, vals_b = [0.1, 0.5, 0.9, 0.3, 0.7, 1.0], [0.2, 0.2, 0.6, 0.3, 0.1, 0.5]
    assert metrics.paired_bootstrap(vals_a, vals_b) == metrics.paired_bootstrap(vals_a, vals_b)
    with pytest.raises(ValueError):
        metrics.paired_bootstrap([1.0], [1.0, 0.0])
    with pytest.raises(ValueError):
        metrics.paired_bootstrap([], [])


def test_compare_and_verdict():
    rows_x = metrics.per_query(TOY_SYSTEMS["x"], TOY_QUERIES)
    rows_y = metrics.per_query(TOY_SYSTEMS["y"], TOY_QUERIES)
    row = metrics.compare("custom", "keyword", "recallAtK", rows_y, rows_x)
    assert set(row) == {"a", "b", "metric", "delta", "ci95", "beats"}
    assert (row["a"], row["b"], row["metric"]) == ("custom", "keyword", "recallAtK")
    assert row["delta"] == pytest.approx(2 / 3 - (2 / 3 + 0.5) / 3)
    assert len(row["ci95"]) == 2 and row["ci95"][0] <= row["delta"] <= row["ci95"][1]
    assert "within noise" in metrics.verdict(row) and "recall@5" in metrics.verdict(row)
    win = {"a": "custom", "b": "keyword", "metric": "mrr", "delta": 0.2, "ci95": [0.05, 0.3], "beats": True}
    assert metrics.verdict(win).startswith("Cindia's model beats keyword (BM25) on MRR@10")
    loss = {"a": "hybrid", "b": "custom", "metric": "mrr", "delta": -0.2, "ci95": [-0.3, -0.05], "beats": False}
    assert metrics.verdict(loss).startswith("Cindia's model beats local hybrid")
    with pytest.raises(ValueError):
        metrics.compare("a", "b", "ndcg", rows_x, rows_y)


def test_unjudged_lists_top_5_pieces_no_grade_covers():
    out = metrics.unjudged(TOY_SYSTEMS, TOY_QUERIES)
    assert out == {"q1": ["x1", "x2", "x3"], "q2": ["x1", "x2", "x3", "x4", "x5"], "q3": ["x1", "x2"]}


# ---------------------------------------------------------------------------------------------
# Lazy imports (B2-10)


def test_no_torch_or_sentence_transformers_at_import():
    code = (
        "import sys\n"
        "import server.b11_embed, server.b11_embed.data, server.b11_embed.compose, "
        "server.b11_embed.bm25, server.b11_embed.metrics, server.b11_embed.evaluate, "
        "server.b11_embed.pca, server.b11_embed.model, server.b11_embed.train, server.routers.b11_embed\n"
        "print('torch' in sys.modules, 'sentence_transformers' in sys.modules)\n"
    )
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    res = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, timeout=60, env=env)
    assert res.returncode == 0, res.stderr[-500:]
    assert res.stdout.strip() == "False False"


# ---------------------------------------------------------------------------------------------
# T4 and T6 · shared fakes: a tiny eval set, a pairs file and a backend that hashes words

DIMS = 24
FIXTURE_EVAL = [
    {"id": "sq_001", "text": "warm red wool weaving for my mom", "lang": "en", "grades": {"pc_01": 2}, "author": "data_agent"},
    {"id": "sq_002", "text": "turquoise and silver earrings", "lang": "en", "grades": {"pc_10": 2, "pc_14": 1}, "author": "data_agent"},
    {"id": "sq_003", "text": "beaded earrings with a red flower", "lang": "en", "grades": {"pc_14": 2, "pc_10": 1}, "author": "data_agent"},
    {"id": "sq_004", "text": "something bold and bright for a friend", "lang": "en", "grades": {"pc_14": 2}, "author": "gordon"},
    {"id": "sq_005", "text": "红色羊毛编织", "lang": "zh", "grades": {"pc_01": 2}, "author": "data_agent"},
    {"id": "sq_006", "text": "绿松石银耳环", "lang": "zh", "grades": {"pc_10": 2, "pc_14": 1}, "author": "data_agent"},
]
FIXTURE_PAIRS = {
    "pc_01": [
        ("grey and red wall hanging", "en", "looks", "pc_14"),
        ("handwoven wool piece with a diamond", "en", "material", "pc_10"),
        ("cozy weaving for mom's birthday", "en", "occasion", None),
        ("stepped diamond weaving", "en", "craft_term", "pc_14"),
        ("something warm for the living room wall", "en", "mood", None),
        ("small wool tapestry", "en", "short", None),
        ("a weaving my mother would hang up, grey red and black", "en", "long", None),
        ("wool weavng", "en", "misspelled", None),
        ("灰红黑羊毛壁挂", "zh", "looks", "pc_10"),
        ("给妈妈的生日礼物 羊毛", "zh", "recipient", None),
    ],
    "pc_10": [
        ("turquoise stone drop earrings", "en", "looks", "pc_14"),
        ("plain silver setting earrings", "en", "material", "pc_14"),
        ("elegant earrings for my sister", "en", "recipient", None),
        ("stone setting jewelry", "en", "craft_term", "pc_01"),
        ("bright holiday gift for a friend, turquoise", "en", "occasion", None),
        ("silver earrings", "en", "short", None),
        ("small blue stones hanging from a wire", "en", "long", None),
        ("turqoise earings", "en", "misspelled", None),
        ("绿松石耳坠", "zh", "looks", "pc_14"),
        ("送姐姐的银耳环", "zh", "recipient", None),
    ],
    "pc_14": [
        ("red and green flower earrings", "en", "looks", "pc_10"),
        ("glass bead earrings on leather", "en", "material", "pc_10"),
        ("bold bright earrings for mom", "en", "recipient", None),
        ("hand-stitched beadwork", "en", "craft_term", "pc_01"),
        ("birthday gift with flowers and leaves", "en", "occasion", None),
        ("floral beaded earrings", "en", "short", None),
        ("one red flower and two green leaves on each earring", "en", "long", None),
        ("bedwork earings", "en", "misspelled", None),
        ("红绿花朵串珠耳环", "zh", "looks", "pc_10"),
        ("送朋友的串珠耳环", "zh", "recipient", None),
    ],
}


def hash_vectors(texts, salt: str, dims: int = DIMS) -> np.ndarray:
    """Each text's words (after its prefix) hashed into `dims` slots, plus a tiny salted constant,
    L2-normalized. Deterministic, and different per salt, so base and custom differ."""
    out = np.zeros((len(texts), dims))
    for i, t in enumerate(texts):
        for tok in bm25.analyze(compose.strip_prefix(t)):
            h = int(hashlib.sha256(f"{salt}:{tok}".encode("utf-8")).hexdigest(), 16)
            out[i, h % dims] += 1.0
            out[i, (h // dims) % dims] += 0.5
        out[i, int(hashlib.sha256(salt.encode()).hexdigest(), 16) % dims] += 0.05
    return out / np.linalg.norm(out, axis=1, keepdims=True)


class FakeModel:
    def __init__(self, name: str, salt: str):
        self.name = name
        self.salt = salt
        self.max_seq_length = 512


class Killed(Exception):
    """The fake backend's stand-in for a VM that was reclaimed mid-run."""


class FakeBackend:
    """train.py's backend without torch: hashing encoders, simulated steps, a fake weights file."""

    name = "fake"

    def __init__(self, steps_per_epoch: int = 4, kill_at: int | None = None, step_seconds: float = 0.01):
        self.steps_per_epoch = steps_per_epoch
        self.kill_at = kill_at
        self.step_seconds = step_seconds
        self.encoded: list[str] = []
        self.calls: list[tuple] = []

    def device(self, wanted):
        return "cpu" if wanted in ("cpu", "auto") else wanted

    def prepare(self, seed, threads):
        self.calls.append(("prepare", seed, threads))

    def load(self, name, device, *, local_only):
        self.calls.append(("load", str(name), local_only))
        salt_file = Path(name) / "salt.txt"
        return FakeModel(str(name), salt_file.read_text(encoding="utf-8") if salt_file.is_file() else "base")

    def encoder(self, model):
        def enc(texts):
            self.encoded.extend(texts)
            return hash_vectors(texts, model.salt)

        return enc

    def token_lengths(self, model, texts):
        return [len(t.split()) + 2 for t in texts]

    def set_max_seq_length(self, model, n):
        model.max_seq_length = n

    def freeze_word_embeddings(self, model):
        return 21_900_000, 117_700_000

    def train(self, model, rows, settings, batch, *, output_dir, progress, max_steps=None, resume_from=None):
        self.calls.append(("train", batch, max_steps, None if resume_from is None else Path(resume_from).name))
        compose.require_one_prefix([r["anchor"] for k in rows for r in rows[k]], "query")
        total = max_steps or settings.epochs * self.steps_per_epoch
        progress.total_steps = total
        start = int(Path(resume_from).name.split("-")[1]) if resume_from else 0
        for step in range(start + 1, total + 1):
            progress.step(step, self.step_seconds)
            progress.logs(step, {"loss": 1.0 / step, "learning_rate": 2e-5})
            if max_steps is None and step % self.steps_per_epoch == 0:
                progress.epoch(step / self.steps_per_epoch, step)
                ck = Path(output_dir) / f"checkpoint-{step}"
                ck.mkdir(parents=True, exist_ok=True)
                (ck / "model.safetensors").write_bytes(f"epoch {step}".encode())
                (ck / "trainer_state.json").write_text(json.dumps({"global_step": step}), encoding="utf-8")
                if self.kill_at == step:
                    raise Killed()
        model.salt = "custom"
        return {"steps": total, "loss": 0.1}

    def save(self, model, path):
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        (path / "model.safetensors").write_bytes(f"fake weights {model.salt}".encode())
        (path / "modules.json").write_text("[]", encoding="utf-8")
        (path / "salt.txt").write_text(model.salt, encoding="utf-8")


class FakeEncoder:
    """model.py's loaded model, as the fake loader returns it: the same hashing as the backend's
    custom model, so query vectors match vectors.json. It notes concurrent encodes."""

    def __init__(self, salt: str, delay: float = 0.0):
        self.salt = salt
        self.delay = delay
        self.texts: list[str] = []
        self.active = 0
        self.overlap = False
        self._lock = threading.Lock()

    def encode(self, texts):
        with self._lock:
            self.active += 1
            self.overlap = self.overlap or self.active > 1
        try:
            if self.delay:
                time.sleep(self.delay)
            self.texts.extend(texts)
            return hash_vectors(list(texts), self.salt)
        finally:
            with self._lock:
                self.active -= 1


def fixture_with_eval(tmp_path: Path, eval_queries=None) -> Path:
    raw = fixture_raw()
    raw["searchEval"] = FIXTURE_EVAL if eval_queries is None else eval_queries
    return write_json(tmp_path / "data" / "mock.json", raw)


def write_pairs(path: Path, extra: list[dict] | None = None) -> Path:
    lines = []
    for pid, rows in FIXTURE_PAIRS.items():
        for query, lang, voice, neg in rows:
            lines.append({"query": query, "lang": lang, "voice": voice, "pieceId": pid, "negativeId": neg})
    lines += extra or []
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in lines), encoding="utf-8")
    return path


def options(tmp_path: Path, mode: str = "train", **settings) -> train.Options:
    out = tmp_path / "run"
    paths = train.Paths(
        pairs=write_pairs(out / "pairs.jsonl") if not (out / "pairs.jsonl").exists() else out / "pairs.jsonl",
        pairs_meta=out / "pairs_meta.json",
        report=out / "report.json",
        vectors=out / "vectors.json",
        unjudged=out / "unjudged.json",
        model_dir=tmp_path / "models" / "cindia-embed-v1",
        checkpoints=tmp_path / "models" / "checkpoints" / "cindia-embed-v1",
        log=tmp_path / "artifacts" / "b11" / "train.log",
        probe=tmp_path / "artifacts" / "b11" / "probe.json",
        data=fixture_with_eval(tmp_path) if not (tmp_path / "data" / "mock.json").exists() else tmp_path / "data" / "mock.json",
    )
    return train.Options(mode=mode, paths=paths, settings=train.Settings(**settings), publish=False, expected_pieces=3)


def run_fake(tmp_path: Path, mode: str = "train", backend: FakeBackend | None = None, **settings) -> tuple[int, train.Options, FakeBackend]:
    backend = backend or FakeBackend()
    o = options(tmp_path, mode, **settings)
    return train.run(o, backend), o, backend


def read(path: Path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------------------------
# T4 · train.py's pieces


@pytest.mark.parametrize(("lengths", "cap"), [([61, 20], 64), ([64], 64), ([65], 72), ([130, 3], 128), ([3], 8), ([], 8)])
def test_token_cap_rounds_up_to_8_and_stops_at_128(lengths, cap):
    assert train.token_cap(lengths) == cap


def test_load_pairs_checks_every_line(tmp_path):
    d = fixture_data()
    good = {"query": "red wool", "lang": "en", "voice": "short", "pieceId": "pc_01", "negativeId": None}
    cases = [
        ("{not json", "isn't JSON"),
        (json.dumps([1]), "isn't a JSON object"),
        (json.dumps({**good, "query": "  "}), "has no query"),
        (json.dumps({**good, "lang": "fr"}), "lang is 'fr'"),
        (json.dumps({**good, "voice": ""}), "has no voice"),
        (json.dumps({**good, "pieceId": "pc_99"}), "isn't in the index"),
        (json.dumps({**good, "negativeId": "pc_01"}), "negativeId must be another piece"),
        (json.dumps({**good, "negativeId": "pc_77"}), "negativeId must be another piece"),
    ]
    for line, words in cases:
        path = tmp_path / "p.jsonl"
        path.write_text(json.dumps(good) + "\n" + line + "\n", encoding="utf-8")
        with pytest.raises(train.TrainError) as e:
            train.load_pairs(path, d)
        assert "line 2" in str(e.value) and words in str(e.value), str(e.value)
    with pytest.raises(train.TrainError, match="doesn't exist yet"):
        train.load_pairs(tmp_path / "missing.jsonl", d)
    (tmp_path / "empty.jsonl").write_text("\n", encoding="utf-8")
    with pytest.raises(train.TrainError, match="holds no training pairs"):
        train.load_pairs(tmp_path / "empty.jsonl", d)
    # Exact repeats are dropped, and the rest load in file order.
    path = write_pairs(tmp_path / "ok.jsonl", extra=[{**good}, {**good, "query": "Red  WOOL!"}])
    pairs = train.load_pairs(path, d)
    assert len(pairs) == 31 and pairs[0].piece_id == "pc_01" and pairs[-1].query == "red wool"


def test_training_refuses_an_eval_query_or_the_tour_query(tmp_path):
    d = b11data.load(fixture_with_eval(tmp_path), expected=3)
    for leaked, who in [("Warm red WOOL weaving, for my mom!", "sq_001"), (DEMO_TEXT, "the tour query")]:
        path = write_pairs(tmp_path / "p.jsonl", extra=[{"query": leaked, "lang": "en", "voice": "long", "pieceId": "pc_01", "negativeId": None}])
        with pytest.raises(train.TrainError, match=re.escape(who)):
            train.guard_eval_leak(train.load_pairs(path, d), d)
    train.guard_eval_leak(train.load_pairs(write_pairs(tmp_path / "clean.jsonl"), d), d)


def test_dev_split_holds_out_a_tenth_of_each_pieces_queries(tmp_path):
    pairs = train.load_pairs(write_pairs(tmp_path / "p.jsonl"), fixture_data())
    tr, dev = train.split_dev(pairs, 13)
    assert len(dev) == 3 and {p.piece_id for p in dev} == {"pc_01", "pc_10", "pc_14"}
    assert len(tr) == len(pairs) - 3
    assert not {train.normalized(p.query) for p in dev} & {train.normalized(p.query) for p in tr}
    assert train.split_dev(pairs, 13) == (tr, dev)  # seeded
    # A held-out text leaves training for every piece it's paired with.
    shared = [train.Pair("gift", "en", "short", "pc_01", None, 1), train.Pair("gift", "en", "short", "pc_10", None, 2)]
    more = [train.Pair(f"q{i}", "en", "short", "pc_01", None, 3 + i) for i in range(9)]
    for seed in range(20):
        t2, d2 = train.split_dev(shared + more, seed)
        held = {train.normalized(x.query) for x in d2}
        assert len(d2) == 1 and all(train.normalized(p.query) not in held for p in t2)
        assert len(t2) == len(shared + more) - (2 if held == {"gift"} else 1)


def test_rows_follow_the_one_text_rule(tmp_path):
    d = fixture_data()
    rows = train.build_rows(train.load_pairs(write_pairs(tmp_path / "p.jsonl"), d), d)
    assert len(rows["triplets"]) == 12 and len(rows["pairs"]) == 18
    passages = set(d.passages())
    for r in rows["pairs"] + rows["triplets"]:
        assert compose.has_one_prefix(r["anchor"], "query")
        assert r["positive"] in passages
    for r in rows["triplets"]:
        assert r["negative"] in passages and r["negative"] != r["positive"]
    assert {"anchor": "query: grey and red wall hanging"}.items() <= rows["triplets"][0].items()


def test_latest_checkpoint_and_resume_rules(tmp_path):
    ck = tmp_path / "models" / "checkpoints" / "x"
    key = {"pairsHash": "a", "batch": 32}
    assert train.prepare_checkpoints(ck, key) is None and (ck / "run.json").is_file()
    for step, complete in [(4, True), (12, True), (16, False)]:
        folder = ck / f"checkpoint-{step}"
        folder.mkdir()
        (folder / "model.safetensors").write_bytes(b"w")
        if complete:
            (folder / "trainer_state.json").write_text("{}", encoding="utf-8")
    (ck / "checkpoint-99.tmp").mkdir()
    assert train.latest_checkpoint(ck).name == "checkpoint-12"  # 16 never finished writing
    assert train.prepare_checkpoints(ck, key).name == "checkpoint-12"
    # Another run's checkpoints are cleared, never resumed.
    assert train.prepare_checkpoints(ck, {**key, "batch": 16}) is None
    assert train.latest_checkpoint(ck) is None and read(ck / "run.json")["batch"] == 16
    # Nothing training writes may land under server/.
    with pytest.raises(train.TrainError, match="under server/"):
        train.prepare_checkpoints(ROOT / "server" / "b11_embed" / "checkpoints", key)
    assert not (ROOT / "server" / "b11_embed" / "checkpoints").exists()
    assert "server" not in train.Paths().checkpoints.relative_to(ROOT).parts
    assert train.Paths().checkpoints.relative_to(ROOT).parts[:2] == ("models", "checkpoints")


# ---------------------------------------------------------------------------------------------
# T4 · pca.py


def test_pca_fits_the_passages_into_minus_one_to_one():
    rng = np.random.default_rng(0)
    x = rng.normal(size=(54, 16)) * np.linspace(3, 0.1, 16)
    fitted = pca.fit(x)
    pts = pca.transform(x, fitted)
    assert pts.shape == (54, 2)
    assert np.abs(pts).max() == pytest.approx(1.0) and np.abs(pts).max() <= 1.0 + 1e-9
    ev = fitted["explainedVariance"]
    assert ev[0] >= ev[1] > 0 and sum(ev) <= 1.0
    # Deterministic signs: each component's largest loading is positive.
    for comp in fitted["components"]:
        assert comp[np.argmax(np.abs(comp))] > 0
    again = pca.fit(x[::-1])
    assert np.allclose(again["components"], fitted["components"])
    # A passage projects onto its own point, and projection never refits.
    assert pca.project(x[3], fitted) == pytest.approx(tuple(pts[3]))
    far = fitted["mean"] + 50 * fitted["components"][0]
    assert pca.project(far, fitted) == pytest.approx((1.2, pca.project(far, fitted)[1]))
    assert all(abs(v) <= 1.2 for v in pca.project(-far, fitted))


def test_the_spread_of_three_points_and_the_weighted_center():
    pts = np.array([[0.0, 0.0], [0.2, 0.0], [0.1, 0.3]])
    assert pca.inside((0.1, 0.1), pts)
    assert not pca.inside((0.9, 0.9), pts)
    # Three points on top of each other still leave MIN_SPREAD of room.
    same = np.array([[0.5, 0.5]] * 3)
    assert pca.inside((0.5 + pca.MIN_SPREAD * 0.9, 0.5), same) and not pca.inside((0.5 + pca.MIN_SPREAD * 1.1, 0.5), same)
    assert pca.weighted_center(pts, [1, 1, 2]) == pytest.approx((0.1, 0.15))
    assert pca.weighted_center(pts, [-1, 0, 0]) == pytest.approx((0.1, 0.1))  # all weights 0: plain center


def _hand_map():
    # A map worked out by hand: mean 0, the components are the first two axes, scale 1. Pieces 0
    # to 2 sit near (1, 0) and piece 3 at (0, 1); the third axis is one the map doesn't draw.
    pv = evaluate.normalize(np.array([[1, 0, 0], [0.9, 0.1, 0], [0.9, -0.1, 0], [0, 1, 0]], dtype=float))
    m = {"mean": np.zeros(3), "components": np.array([[1.0, 0, 0], [0, 1.0, 0]]), "scale": 1.0}
    return pv, m, pca.transform(pv, m)


def test_place_uses_the_projection_when_it_lands_and_the_weighted_center_when_not():
    pv, m, pts = _hand_map()
    # Close to pieces 0 to 2, and drawn among them: its own projection.
    near = np.array([0.99, 0.0, 0.14])
    x, y, approx = pca.place(near, pv, pts, m)
    assert (x, y) == pytest.approx((0.99, 0.0)) and approx is False
    # The same top 3 (cosine 0.6, 0.596, 0.596), but most of it lies along the hidden axis, so its
    # projection (0.6, 0) is 0.39 from their center, outside their spread (about 0.11).
    off = np.array([0.6, 0.0, 0.8])
    idx, scores = pca.top_indices(off, pv)
    assert idx == [0, 1, 2]
    x, y, approx = pca.place(off, pv, pts, m)
    assert approx is True and (x, y) == pytest.approx(pca.weighted_center(pts[idx], scores))
    # queryShift moves it before projecting; the ranking never uses the shift.
    x, y, approx = pca.place(off, pv, pts, m, shift=[0.4, 0.0, -0.8])
    assert (x, y) == pytest.approx((1.0, 0.0)) and approx is False


def test_choose_shift_three_outcomes():
    pv, m, pts = _hand_map()
    assert pca.choose_shift(np.array([0.99, 0.0, 0.14]), pv, pts, m, None) == (None, "projected")
    off = np.array([0.6, 0.0, 0.8])
    assert not pca.lands(off, pv, pts, m)
    # The training queries' mean sits at (-0.4, 0, 0.8): the passage mean minus it brings the
    # tour query to (1, 0), inside the spread.
    shift, how = pca.choose_shift(off, pv, pts, m, [-0.4, 0.0, 0.8])
    assert how == "shifted" and np.allclose(shift, [0.4, 0.0, -0.8])
    # A shift along the hidden axis only doesn't move the point, so the query stays approximate.
    shift, how = pca.choose_shift(off, pv, pts, m, [0.0, 0.0, 0.8])
    assert how == "approx" and np.allclose(shift, [0.0, 0.0, -0.8])
    assert pca.choose_shift(off, pv, pts, m, None) == (None, "approx")


# ---------------------------------------------------------------------------------------------
# T4 · evaluate.py


def test_the_four_systems_on_the_fixture(tmp_path):
    d = b11data.load(fixture_with_eval(tmp_path), expected=3)
    seen: list[str] = []

    def enc(salt):
        def f(texts):
            seen.extend(texts)
            return hash_vectors(texts, salt)

        return f

    vecs = {}
    for name in ("base", "custom"):
        p = evaluate.encode(enc(name), d.passages(), "passage")
        q = evaluate.encode(enc(name), [evaluate.query_text(x) for x in d.eval], "query")
        vecs[name] = evaluate.Vectors(p, q)
    res = evaluate.evaluate(d, d.eval, vecs, resamples=500)
    # Every string the code encoded carries exactly one prefix of its kind.
    assert seen and all(compose.has_one_prefix(t, "passage") or compose.has_one_prefix(t, "query") for t in seen)
    assert all(compose.count_prefixes(t) == 1 for t in seen)
    ev = res.eval
    assert [s["system"] for s in ev["systems"]] == ["keyword", "base", "custom", "hybrid"]
    assert ev["k"] == 5 and ev["queries"] == 6
    assert ev["querySet"] == "agent-written, held out; 1 of 6 written or edited by Gordon"
    assert set(ev["byLang"]) == {"en", "zh"} and ev["byLang"]["zh"]["queries"] == 2
    assert all([s["system"] for s in g["systems"]] == list(evaluate.SYSTEMS) for g in ev["byLang"].values())
    assert [(c["a"], c["b"], c["metric"]) for c in ev["comparisons"]] == [
        ("custom", "keyword", "recallAtK"), ("custom", "keyword", "mrr"),
        ("custom", "base", "recallAtK"), ("custom", "base", "mrr"),
        ("hybrid", "custom", "recallAtK"), ("hybrid", "custom", "mrr"),
    ]
    for c in ev["comparisons"]:
        assert c["ci95"][0] <= c["delta"] <= c["ci95"][1] and c["beats"] == (c["ci95"][0] > 0)
    for s in ev["systems"]:
        assert 0.0 <= s["recallAtK"] <= 1.0 and 0.0 <= s["mrr"] <= 1.0
    # The numbers are the metrics' own, recomputed here from the rankings.
    for s in ev["systems"]:
        assert s["recallAtK"] == pytest.approx(metrics.score(res.rankings[s["system"]], d.eval)["recallAtK"], abs=1e-6)
    # keyword ranks only pieces that scored, so a Chinese query has a fair baseline.
    assert res.rankings["keyword"]["sq_005"][0] == "pc_01"
    assert res.rankings["keyword"]["sq_006"][0] == "pc_10"
    # Dense systems rank every piece; hybrid fuses custom and the keyword hits.
    assert all(len(r) == 3 for r in res.rankings["custom"].values())
    hits = evaluate.keyword_hits(evaluate.keyword_index(d), [evaluate.query_text(d.eval[1])])[0]
    assert res.rankings["hybrid"]["sq_002"] == metrics.hybrid(res.rankings["custom"]["sq_002"], hits)
    assert any("Gordon" in n for n in res.notes) and "byAuthor" in ev
    assert all(any(w in n for w in ("beats", "within noise")) for n in res.notes[:6])
    rows = evaluate.unjudged(res, d.eval)
    assert [r["queryId"] for r in rows] == [q["id"] for q in d.eval]
    for r, q in zip(rows, d.eval, strict=True):
        assert not set(r["pieceIds"]) & set(q["grades"])


def test_query_set_is_never_called_hand_written():
    assert evaluate.query_set_label([{"author": "data_agent"}] * 50) == "agent-written, held out"
    for label in (evaluate.query_set_label([{"author": "gordon"}]), evaluate.QUERY_SET):
        assert "hand" not in label.lower()


# ---------------------------------------------------------------------------------------------
# T4 · the whole pipeline with the fake backend


def test_probe_runs_three_steps_and_prints_peak_rss_and_seconds_per_step(tmp_path, capsys):
    code, o, backend = run_fake(tmp_path, "probe")
    assert code == 0
    out = capsys.readouterr().out
    assert re.search(r"probe: 3 steps at batch 32 on cpu, [\d.]+ s per step \([\d., ]+\), peak RSS ([\d.]+ GB|unknown)", out), out
    assert "within the limits" in out
    assert ("train", 32, 3, None) in backend.calls
    probe = read(o.paths.probe)
    assert probe["steps"] == 3 and len(probe["stepSeconds"]) == 3 and probe["overLimit"] is False
    assert probe["pairsHash"] == hashlib.sha256(o.paths.pairs.read_bytes()).hexdigest()
    assert not o.paths.report.exists() and not o.paths.model_dir.exists()
    assert not (o.paths.checkpoints.parent / "probe").exists()


def test_a_slow_probe_sends_the_next_run_to_batch_16(tmp_path, capsys):
    code, o, _ = run_fake(tmp_path, "probe", backend=FakeBackend(step_seconds=31.0))
    assert code == 0 and "over the limits" in capsys.readouterr().out
    code, o, backend = run_fake(tmp_path)
    assert code == 0
    report = read(o.paths.report)
    assert report["batch"] == 16 and any(n.startswith("Batch 16, not 32") for n in report["notes"])
    assert any(c[0] == "train" and c[1] == 16 for c in backend.calls)
    # An explicit --batch wins over the probe.
    code, o, backend = run_fake(tmp_path, batch=32)
    assert read(o.paths.report)["batch"] == 32


def test_the_pipeline_writes_report_vectors_and_unjudged_from_this_run(tmp_path):
    code, o, backend = run_fake(tmp_path)
    assert code == 0
    report, vectors, unjudged = read(o.paths.report), read(o.paths.vectors), read(o.paths.unjudged)
    d = b11data.load(o.paths.data, expected=3)
    # The fingerprints: weights, passages, and the two joined.
    weights = o.paths.model_dir / "model.safetensors"
    assert report["modelSha256"] == hashlib.sha256(weights.read_bytes()).hexdigest()
    assert report["passagesHash"] == d.passages_hash()
    assert report["fingerprint"] == hashlib.sha256(f"{report['modelSha256']}:{report['passagesHash']}".encode()).hexdigest()[:16]
    assert vectors["fingerprint"] == report["fingerprint"] == unjudged["fingerprint"]
    # The report's shape.
    assert report["modelId"] == "cindia-embed-v1" and report["baseModel"] == "intfloat/multilingual-e5-small"
    assert (report["pairs"], report["epochs"], report["batch"], report["seed"], report["device"]) == (30, 3, 32, 13, "cpu")
    assert report["dims"] == DIMS and report["pairSource"] == "unknown"
    assert (report["hubRepo"], report["hubRevision"], report["hubUrl"]) == (None, None, None)
    assert len(report["pca"]["explainedVariance"]) == 2
    ev = report["eval"]
    assert ev["querySet"].startswith("agent-written, held out") and [s["system"] for s in ev["systems"]] == list(evaluate.SYSTEMS)
    assert set(ev["byLang"]) == {"en", "zh"} and len(ev["comparisons"]) == 6
    notes = " ".join(report["notes"])
    for words in ("written by our data agent", "held out", "a small test, not a benchmark",
                  "local hybrid", "MRR@10", "Dev split", "word embeddings frozen", "21.9M of 117.7M"):
        assert words in notes, words
    assert "hand-written" not in notes.lower()
    assert report["training"]["devQueries"] == 3 and report["training"]["steps"] == 12
    # vectors.json: every piece, in pieceId order, with its vector and an in-range point.
    assert vectors["modelId"] == "cindia-embed-v1" and vectors["dims"] == DIMS
    assert [p["pieceId"] for p in vectors["pieces"]] == ["pc_01", "pc_10", "pc_14"]
    for p in vectors["pieces"]:
        assert len(p["vector"]) == DIMS and -1.0 <= p["x"] <= 1.0 and -1.0 <= p["y"] <= 1.0
        assert all(round(v, 5) == v for v in p["vector"])
    assert len(vectors["pca"]["mean"]) == DIMS and len(vectors["pca"]["components"]) == 2
    assert vectors["pca"]["queryShift"] is None or len(vectors["pca"]["queryShift"]) == DIMS
    assert [q["queryId"] for q in unjudged["queries"]] == [q["id"] for q in FIXTURE_EVAL]
    # The custom vectors are the trained model's, not the base model's.
    assert np.allclose(np.array(vectors["pieces"][0]["vector"]), hash_vectors([d.passages()[0]], "custom")[0], atol=1e-5)
    # Every string encoded carries exactly one prefix, and checkpoints are gone after a clean run.
    assert backend.encoded and all(compose.count_prefixes(t) == 1 for t in backend.encoded)
    assert not o.paths.checkpoints.exists()
    assert ("prepare", 13, 2) in backend.calls


def test_the_log_has_steps_and_epochs_and_never_a_query(tmp_path):
    root_handlers = list(logging.getLogger().handlers)
    code, o, _ = run_fake(tmp_path)
    assert code == 0
    text = o.paths.log.read_text(encoding="utf-8")
    assert re.search(r"step 10/12, loss [\d.]+, lr [\d.e+-]+, [\d.]+ s a step", text)
    assert "epoch 1 done at step 4" in text and "epoch 3 done at step 12" in text
    assert "recall@5" in text and "MRR@10" in text
    for _pid, rows in FIXTURE_PAIRS.items():
        for query, *_ in rows:
            assert query not in text
    for q in FIXTURE_EVAL:
        assert q["text"] not in text
    for name in ("httpx", "httpx2", "httpcore"):
        assert logging.getLogger(name).level == logging.WARNING
    assert logging.getLogger().handlers == root_handlers  # never logging.basicConfig
    assert logging.getLogger("cindia.b11").handlers == []  # run() takes its handlers off again


def test_a_killed_run_resumes_from_the_newest_checkpoint(tmp_path):
    o = options(tmp_path)
    with pytest.raises(Killed):
        train.run(o, FakeBackend(kill_at=8))
    assert train.latest_checkpoint(o.paths.checkpoints).name == "checkpoint-8"
    assert not o.paths.report.exists()
    backend = FakeBackend()
    assert train.run(o, backend) == 0
    assert ("train", 32, None, "checkpoint-8") in backend.calls
    assert read(o.paths.report)["training"]["resumedFrom"].endswith("checkpoint-8")
    assert not o.paths.checkpoints.exists()


def test_eval_only_rescores_the_saved_model_and_keeps_the_hub_fields(tmp_path):
    code, o, _ = run_fake(tmp_path)
    first = read(o.paths.report)
    first.update(hubRepo="someone/cindia-embed", hubRevision="abc123", hubUrl="https://huggingface.co/someone/cindia-embed")
    train.write_json(o.paths.report, first)
    unjudged_before = o.paths.unjudged.read_text(encoding="utf-8")
    # Pooled grading adds a grade, then --eval-only reruns the scores on the same model.
    raw = read(o.paths.data)
    raw["searchEval"][3]["grades"]["pc_10"] = 1
    train.write_json(o.paths.data, raw)
    backend = FakeBackend()
    o2 = dataclasses_replace(o, mode="eval")
    assert train.run(o2, backend) == 0
    second = read(o.paths.report)
    assert (second["hubRepo"], second["hubRevision"], second["hubUrl"]) == (first["hubRepo"], first["hubRevision"], first["hubUrl"])
    assert second["modelSha256"] == first["modelSha256"] and second["fingerprint"] == first["fingerprint"]
    assert (second["pairs"], second["epochs"], second["batch"]) == (first["pairs"], first["epochs"], first["batch"])
    assert not any(c[0] == "train" for c in backend.calls)
    assert any(c[0] == "load" and c[2] is True for c in backend.calls)  # the saved model, from local files
    assert any("--eval-only" in n for n in second["notes"])
    assert o.paths.unjudged.read_text(encoding="utf-8") == unjudged_before  # the pooled list stays as graded
    # A model whose weights changed is refused.
    (o.paths.model_dir / "model.safetensors").write_bytes(b"something else")
    assert train.run(o2, FakeBackend()) == 1
    assert "doesn't match report.json's modelSha256" in o.paths.log.read_text(encoding="utf-8")


def dataclasses_replace(o, **changes):
    import dataclasses

    return dataclasses.replace(o, **changes)


def test_the_run_stops_with_one_plain_line(tmp_path):
    # No eval queries yet.
    base = tmp_path / "b"
    fixture_with_eval(base, eval_queries=[])
    code, o, _ = run_fake(base)
    assert code == 1 and "searchEval is empty" in o.paths.log.read_text(encoding="utf-8")
    # No pairs yet.
    o = options(tmp_path / "c")
    o.paths.pairs.unlink()
    assert train.run(o, FakeBackend()) == 1
    assert "run python server/b11_embed/pairs.py first" in o.paths.log.read_text(encoding="utf-8")
    # --eval-only before any training.
    o = options(tmp_path / "d", "eval")
    assert train.run(o, FakeBackend()) == 1
    assert "run python server/b11_embed/train.py first" in o.paths.log.read_text(encoding="utf-8")


def test_publish_waits_for_the_token_the_repo_and_publish_py(tmp_path, monkeypatch):
    o = options(tmp_path)
    o.publish = True
    lines: list[str] = []
    monkeypatch.setattr(train.log, "info", lambda msg, *a: lines.append(msg % a if a else msg))
    monkeypatch.setattr(config, "HF_TOKEN", None)
    monkeypatch.setattr(config, "HF_REPO", "someone/cindia-embed")
    train.maybe_publish(o)
    monkeypatch.setattr(config, "HF_TOKEN", "fake-hf-token-for-tests")
    monkeypatch.setattr(config, "HF_REPO", None)
    train.maybe_publish(o)
    assert lines[0] == lines[1] == "publish: skipped, HF_TOKEN or CINDIA_HF_REPO isn't set"
    monkeypatch.setattr(config, "HF_REPO", "someone/cindia-embed")
    if importlib.util.find_spec("server.b11_embed.publish") is None:
        train.maybe_publish(o)
        assert lines[-1] == "publish: skipped, server/b11_embed/publish.py doesn't exist yet (T8)"
    o.publish = False
    train.maybe_publish(o)
    assert lines[-1] == "publish: skipped (--no-publish)"
    assert all("fake-hf-token" not in line for line in lines)


def test_cli_flags_map_to_options():
    o = train.parse_args(["--probe", "--seed", "7", "--device", "auto", "--batch", "16", "--no-publish"])
    assert (o.mode, o.settings.seed, o.settings.device, o.settings.batch, o.publish) == ("probe", 7, "auto", 16, False)
    o = train.parse_args(["--eval-only"])
    assert (o.mode, o.settings.seed, o.settings.device, o.settings.batch, o.settings.epochs) == ("eval", 13, "cpu", None, 3)
    assert o.paths.model_dir == Path(config.MODEL_DIR)
    assert train.parse_args([]).mode == "train"
    with pytest.raises(SystemExit):
        train.parse_args(["--probe", "--eval-only"])


# ---------------------------------------------------------------------------------------------
# T6 · model.py and the endpoints, with the fake pipeline's files and a fake loader


@pytest.fixture
def b11_files(tmp_path, monkeypatch):
    """A trained model from the fake pipeline, with model.py pointed at it and a fake loader that
    takes 0.3 s to load. Yields the train Options."""
    code, o, _ = run_fake(tmp_path)
    assert code == 0
    point_model_at(monkeypatch, o)
    yield o
    b11model.reset()


def point_model_at(monkeypatch, o, delay: float = 0.3, encode_delay: float = 0.0):
    loaded: list[FakeEncoder] = []

    def loader(path):
        time.sleep(delay)
        enc = FakeEncoder((Path(path) / "salt.txt").read_text(encoding="utf-8"), delay=encode_delay)
        loaded.append(enc)
        return enc

    monkeypatch.setattr(b11model, "REPORT_PATH", o.paths.report)
    monkeypatch.setattr(b11model, "VECTORS_PATH", o.paths.vectors)
    monkeypatch.setattr(b11model, "DATA_FILE", o.paths.data)
    monkeypatch.setattr(b11model, "EXPECTED_PIECES", 3)
    monkeypatch.setattr(config, "MODEL_DIR", o.paths.model_dir)
    monkeypatch.setattr(b11model, "LOADER", loader)
    b11model.reset()
    return loaded


@pytest.fixture
def no_b11_files(tmp_path, monkeypatch):
    monkeypatch.setattr(b11model, "REPORT_PATH", tmp_path / "report.json")
    monkeypatch.setattr(b11model, "VECTORS_PATH", tmp_path / "vectors.json")
    monkeypatch.setattr(b11model, "DATA_FILE", FIXTURE)
    monkeypatch.setattr(b11model, "EXPECTED_PIECES", 3)
    monkeypatch.setattr(config, "MODEL_DIR", tmp_path / "models" / "none")
    monkeypatch.setattr(b11model, "LOADER", lambda path: pytest.fail("nothing should load"))
    b11model.reset()
    yield tmp_path
    b11model.reset()


EVT_ID = re.compile(r"evt_live_11\d{6}\d{4,}")
STATUS_KEYS = {"trained", "warm", "modelId", "baseModel", "dims", "fingerprint", "problem"}


def assert_live_event(ev: dict, etype: str) -> dict:
    assert set(ev) == {"id", "type", "at", "source", "key", "payload"}
    assert ev["type"] == etype and ev["source"] == "live" and ev["key"] == "b11-embed"
    assert EVT_ID.fullmatch(ev["id"]), ev["id"]
    assert isinstance(ev["at"], (int, float)) and ev["at"] >= 0
    return ev["payload"]


def assert_error(resp, status: int, code: str) -> None:
    assert resp.status_code == status
    body = resp.json()
    assert set(body) == {"error"} and body["error"]["code"] == code
    assert isinstance(body["error"]["message"], str) and "\n" not in body["error"]["message"]


def timed_get(client, path="/api/b11/model"):
    t0 = time.perf_counter()
    r = client.get(path)
    return r, time.perf_counter() - t0


def wait_until(predicate, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.02)
    return predicate()


def test_router_is_listed_in_health(client):
    assert "b11" in client.get("/api/health").json()["routers"]


def test_get_model_with_no_model_says_why_fast(client, no_b11_files):
    r, dt = timed_get(client)
    assert r.status_code == 200 and dt < 0.2
    body = r.json()
    assert set(body) == STATUS_KEYS
    assert body["trained"] is False and body["warm"] is False
    assert body["modelId"] is None and body["fingerprint"] is None
    assert "report.json" in body["problem"] and "\n" not in body["problem"]
    assert not b11model.is_trained() and not b11model.is_warm()


def test_get_model_answers_cold_in_under_200ms_and_warms_in_the_background(client, b11_files):
    o = b11_files
    r, dt = timed_get(client)
    assert r.status_code == 200 and dt < 0.2
    body = r.json()
    assert set(body) == STATUS_KEYS and body["warm"] is False
    report = read(o.paths.report)
    assert (body["modelId"], body["baseModel"], body["dims"], body["fingerprint"]) == (
        "cindia-embed-v1", "intfloat/multilingual-e5-small", DIMS, report["fingerprint"],
    )
    times = []

    def warm():
        resp, t = timed_get(client)
        times.append(t)
        return resp.json()["warm"]

    assert wait_until(warm, 5.0)
    assert max(times) < 0.2  # no call waited on the 0.3 s load
    final = client.get("/api/b11/model").json()
    assert final["trained"] is True and final["warm"] is True and final["problem"] is None
    assert b11model.is_trained() and b11model.is_warm() and b11model.fingerprint() == report["fingerprint"]


def test_a_weights_mismatch_makes_trained_false_and_both_posts_empty(client, b11_files):
    o = b11_files
    (o.paths.model_dir / "model.safetensors").write_bytes(b"not the trained weights")
    b11model.reset()
    client.get("/api/b11/model")
    assert wait_until(lambda: client.get("/api/b11/model").json()["problem"] != "The model's weights are still being checked.")
    body = client.get("/api/b11/model").json()
    assert body["trained"] is False and body["warm"] is False
    assert body["problem"] == "The model's weights don't match report.json's modelSha256."
    assert client.post("/api/b11/report", json={"trigger": None}).json() == {"events": []}
    assert client.post("/api/b11/map", json={"trigger": None, "queryId": "qry_user_1", "text": "red wool", "keywords": []}).json() == {"events": []}
    assert not b11model.is_trained()


@pytest.mark.parametrize("what", ["vectors", "passages", "weights_missing", "report_fingerprint"])
def test_every_fingerprint_mismatch_is_refused(client, b11_files, what):
    o = b11_files
    if what == "vectors":
        v = read(o.paths.vectors)
        v["fingerprint"] = "0" * 16
        train.write_json(o.paths.vectors, v)
        words = "vectors.json's fingerprint"
    elif what == "passages":
        raw = read(o.paths.data)
        raw["searchIndex"][0]["embedText"] += " Changed."
        train.write_json(o.paths.data, raw)
        words = "passages changed"
    elif what == "weights_missing":
        (o.paths.model_dir / "model.safetensors").unlink()
        words = "There's no model in"
    else:
        rep = read(o.paths.report)
        rep["fingerprint"] = "f" * 16
        train.write_json(o.paths.report, rep)
        words = "fingerprint doesn't match its own hashes"
    b11model.reset()
    body = client.get("/api/b11/model").json()
    assert body["trained"] is False and words in body["problem"]
    assert client.post("/api/b11/report", json={"trigger": None}).json() == {"events": []}
    with pytest.raises(b11model.NotReady):
        b11model.piece_vectors()


def test_post_report_returns_the_reports_numbers(client, b11_files):
    o = b11_files
    report = read(o.paths.report)
    t0 = time.perf_counter()
    r = client.post("/api/b11/report", json={"trigger": {"id": "evt_0101", "type": "model.trained", "at": 41000}})
    assert r.status_code == 200 and time.perf_counter() - t0 < 1.0
    events = r.json()["events"]
    assert [e["type"] for e in events] == ["model.trained", "proof.search_scored"]
    trained = assert_live_event(events[0], "model.trained")
    assert trained == {"modelId": "cindia-embed-v1", "baseModel": "intfloat/multilingual-e5-small", "pairs": 30, "epochs": 3, "dims": DIMS}
    scored = assert_live_event(events[1], "proof.search_scored")
    assert set(scored) == {"modelId", "k", "queries", "systems"}
    assert scored["k"] == 5 and scored["queries"] == 6 and scored["modelId"] == "cindia-embed-v1"
    assert scored["systems"] == [{"system": s["system"], "recallAtK": s["recallAtK"], "mrr": s["mrr"]} for s in report["eval"]["systems"]]
    assert all(e["at"] == 41000 for e in events)
    assert events[0]["id"] != events[1]["id"]
    # hubUrl appears once the publish has set it, and `at` is 0 with no trigger.
    report["hubUrl"] = "https://huggingface.co/someone/cindia-embed"
    train.write_json(o.paths.report, report)
    events = client.post("/api/b11/report", json={"trigger": None}).json()["events"]
    assert events[0]["payload"]["hubUrl"] == report["hubUrl"] and events[0]["at"] == 0


def test_post_report_with_no_report_is_empty(client, no_b11_files):
    assert client.post("/api/b11/report", json={"trigger": None}).json() == {"events": []}


def test_post_map_is_empty_until_warm_then_returns_one_search_mapped(client, b11_files):
    o = b11_files
    body = {"trigger": {"type": "search.queried", "at": 1234}, "queryId": "qry_user_3", "text": DEMO_TEXT, "keywords": DEMO_CHIPS}
    assert client.post("/api/b11/map", json=body).json() == {"events": []}  # cold: it starts the warm-up
    assert wait_until(b11model.is_warm)
    t0 = time.perf_counter()
    r = client.post("/api/b11/map", json=body)
    assert r.status_code == 200 and time.perf_counter() - t0 < 2.0
    events = r.json()["events"]
    assert len(events) == 1
    p = assert_live_event(events[0], "search.mapped")
    assert events[0]["at"] == 1234
    assert set(p) <= {"queryId", "modelId", "points", "query", "method", "approx"}
    assert p["queryId"] == "qry_user_3" and p["modelId"] == "cindia-embed-v1" and p["method"] == "pca"
    vectors = read(o.paths.vectors)
    assert p["points"] == [{"pieceId": v["pieceId"], "x": v["x"], "y": v["y"]} for v in vectors["pieces"]]
    assert -1.2 <= p["query"]["x"] <= 1.2 and -1.2 <= p["query"]["y"] <= 1.2
    # The query point follows pca.place's rule on the stored map, never a refit.
    qv = hash_vectors([compose.query_text(DEMO_TEXT, DEMO_CHIPS)], "custom")[0]
    x, y, approx = pca.place(
        qv,
        np.array([v["vector"] for v in vectors["pieces"]]),
        np.array([[v["x"], v["y"]] for v in vectors["pieces"]]),
        vectors["pca"],
        vectors["pca"]["queryShift"],
    )
    assert (p["query"]["x"], p["query"]["y"]) == pytest.approx((x, y), abs=1e-4)
    assert ("approx" in p) == approx and p.get("approx", True) is True
    # The encoded text is the query rule's: one prefix, and no chip the text already holds.
    enc = b11model._state["encoder"]
    assert enc.texts[-1] == "query: " + DEMO_TEXT
    assert all(compose.count_prefixes(t) == 1 for t in enc.texts)
    # A chip the text lacks is added; a price chip never is.
    client.post("/api/b11/map", json={**body, "text": "something cozy", "keywords": ["wool", "under $60"]})
    assert enc.texts[-1] == "query: something cozy, wool"


@pytest.mark.parametrize(
    ("body", "status"),
    [
        ({"queryId": "q", "text": "red", "keywords": []}, 400),  # no trigger
        ({"trigger": None, "text": "red", "keywords": []}, 400),  # no queryId
        ({"trigger": None, "queryId": "q", "keywords": []}, 400),  # no text
        ({"trigger": None, "queryId": "q", "text": "x" * 1001, "keywords": []}, 400),
        ({"trigger": None, "queryId": "q", "text": "", "keywords": ["under $50"]}, 400),  # nothing to embed
        ({"trigger": None, "queryId": "q", "text": "red", "keywords": ["k" * 201]}, 400),
        ({"trigger": None, "queryId": "q", "text": "red", "keywords": [3]}, 400),
        ({"trigger": "evt_1", "queryId": "q", "text": "red", "keywords": []}, 400),
    ],
)
def test_post_map_rejects_a_bad_body(client, no_b11_files, body, status):
    assert_error(client.post("/api/b11/map", json=body), status, "bad_request")


def test_post_report_rejects_a_bad_body(client, no_b11_files):
    assert_error(client.post("/api/b11/report", json={}), 400, "bad_request")
    assert_error(client.post("/api/b11/report", content=b"{nope", headers={"content-type": "application/json"}), 400, "bad_request")


def test_event_ids_never_repeat(client, b11_files):
    ids = []
    for _ in range(3):
        ids += [e["id"] for e in client.post("/api/b11/report", json={"trigger": None}).json()["events"]]
    assert len(ids) == len(set(ids)) == 6
    nums = [int(i[len("evt_live_"):]) for i in ids]
    assert nums == sorted(nums)
    assert all(i.startswith("evt_live_11") and len(i) == len("evt_live_11") + 6 + 4 for i in ids)


def test_encoding_takes_one_lock_and_checks_prefixes(b11_files, monkeypatch):
    with pytest.raises(b11model.NotReady):
        b11model.encode_queries(["query: red wool"])
    loaded = point_model_at(monkeypatch, b11_files, delay=0.0, encode_delay=0.05)
    assert b11model.wait_warm(5.0)
    errors = []

    def worker(i):
        try:
            b11model.encode_queries([f"query: red wool {i}"])
        except Exception as exc:  # pragma: no cover
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors and loaded and loaded[0].overlap is False
    for bad in (["red wool"], ["query: query: red"], ["passage: red"]):
        with pytest.raises(ValueError):
            b11model.encode_queries(bad)
    with pytest.raises(ValueError):
        b11model.encode_passages(["query: red"])
    out = b11model.encode_passages([fixture_data().passages()[0]])
    assert len(out) == 1 and len(out[0]) == DIMS and math.isclose(sum(v * v for v in out[0]), 1.0, rel_tol=1e-6)
    # A held lock past the timeout is Busy, never a wait without end.
    b11model._encode_lock.acquire()
    try:
        with pytest.raises(b11model.Busy):
            b11model.encode_array(["query: red"], "query", timeout=0.05)
    finally:
        b11model._encode_lock.release()


def test_map_post_is_empty_when_the_encode_lock_stays_busy(client, b11_files, monkeypatch):
    assert b11model.wait_warm(5.0)
    from server.routers import b11_embed as router_mod

    monkeypatch.setattr(router_mod, "ENCODE_WAIT_S", 0.05)
    b11model._encode_lock.acquire()
    try:
        body = {"trigger": None, "queryId": "q1", "text": "red wool", "keywords": []}
        assert client.post("/api/b11/map", json=body).json() == {"events": []}
    finally:
        b11model._encode_lock.release()


def test_piece_vectors_points_and_project(b11_files):
    vectors = read(b11_files.paths.vectors)
    pv = b11model.piece_vectors()
    assert list(pv) == ["pc_01", "pc_10", "pc_14"] and pv["pc_01"] == vectors["pieces"][0]["vector"]
    assert b11model.map_points() == [{"pieceId": v["pieceId"], "x": v["x"], "y": v["y"]} for v in vectors["pieces"]]
    x, y, approx = b11model.project(pv["pc_10"])
    assert isinstance(approx, bool) and -1.2 <= x <= 1.2 and -1.2 <= y <= 1.2
    expected = pca.place(
        pv["pc_10"],
        np.array(list(pv.values())),
        np.array([[v["x"], v["y"]] for v in vectors["pieces"]]),
        vectors["pca"],
        vectors["pca"]["queryShift"],
    )
    assert (x, y) == pytest.approx(expected[:2]) and approx == expected[2]
    # With no queryShift stored, a piece's own vector lands on its own point.
    train.write_json(b11_files.paths.vectors, {**vectors, "pca": {**vectors["pca"], "queryShift": None}}, compact=True)
    b11model.reset()
    x, y, approx = b11model.project(pv["pc_10"])
    assert not approx and (x, y) == pytest.approx((vectors["pieces"][1]["x"], vectors["pieces"][1]["y"]), abs=1e-4)


def test_a_changed_model_folder_drops_the_warm_model(b11_files, monkeypatch):
    assert b11model.wait_warm(5.0)
    rep = read(b11_files.paths.report)
    train.write_json(b11_files.paths.report, {**rep, "notes": rep["notes"] + ["touched"]})
    os.utime(b11_files.paths.report, None)
    assert not b11model.is_warm()  # its files changed, so it reloads before it encodes again
    assert b11model.wait_warm(5.0)


# ---------------------------------------------------------------------------------------------
# The real sentence-transformers path, on a tiny model built here (no download)

TRAINING_LIBS = all(importlib.util.find_spec(m) is not None for m in ("datasets", "accelerate"))
needs_training_libs = pytest.mark.skipif(
    not TRAINING_LIBS, reason="datasets and accelerate aren't installed (server/b11_embed/requirements-train.txt)"
)


def build_tiny_st_model(folder: Path, texts: list[str]) -> Path:
    """A randomly initialized 1-layer BERT with a word-level tokenizer over the texts' words, saved
    as a sentence-transformers model (Transformer, mean pooling, Normalize). No download."""
    import torch
    from sentence_transformers import SentenceTransformer
    from sentence_transformers.sentence_transformer.modules import Normalize, Pooling, Transformer
    from tokenizers import Tokenizer, models, normalizers, pre_tokenizers, processors
    from transformers import BertConfig, BertModel, PreTrainedTokenizerFast

    special = ["[PAD]", "[UNK]", "[CLS]", "[SEP]", "[MASK]"]
    norm = normalizers.BertNormalizer(lowercase=True, handle_chinese_chars=True)
    pre = pre_tokenizers.BertPreTokenizer()
    words: list[str] = []
    for t in texts:
        for w, _ in pre.pre_tokenize_str(norm.normalize_str(t)):
            if w not in words:
                words.append(w)
    vocab = {w: i for i, w in enumerate(special + words)}
    tok = Tokenizer(models.WordLevel(vocab=vocab, unk_token="[UNK]"))
    tok.normalizer = norm
    tok.pre_tokenizer = pre
    tok.post_processor = processors.TemplateProcessing(single="[CLS] $A [SEP]", special_tokens=[("[CLS]", 2), ("[SEP]", 3)])
    raw = folder / "raw"
    PreTrainedTokenizerFast(
        tokenizer_object=tok, unk_token="[UNK]", pad_token="[PAD]", cls_token="[CLS]", sep_token="[SEP]", mask_token="[MASK]", model_max_length=128
    ).save_pretrained(str(raw))
    torch.manual_seed(0)
    cfg = BertConfig(vocab_size=len(vocab), hidden_size=16, num_hidden_layers=1, num_attention_heads=2, intermediate_size=32, max_position_embeddings=160)
    BertModel(cfg).save_pretrained(str(raw))
    tr = Transformer(str(raw))
    st = SentenceTransformer(modules=[tr, Pooling(tr.get_embedding_dimension(), pooling_mode="mean"), Normalize()], device="cpu")
    out = folder / "tiny-st"
    st.save_pretrained(str(out), create_model_card=False)
    return out


@pytest.fixture(scope="module")
def tiny_model(tmp_path_factory):
    folder = tmp_path_factory.mktemp("tiny")
    texts = [e["embedText"] for e in fixture_raw()["searchIndex"]]
    texts += [compose.query_text(q["text"], []) for q in FIXTURE_EVAL] + [compose.query_text(DEMO_TEXT, DEMO_CHIPS), b11model.WARMUP_TEXT]
    texts += [compose.query_text(q, []) for rows in FIXTURE_PAIRS.values() for q, *_ in rows]
    return build_tiny_st_model(folder, texts)


class RealEncodeNoTrain(train.STBackend):
    """The real backend with training swapped for nothing, so the real load, freeze, encode and
    save code runs without datasets and accelerate."""

    def require_training(self):
        pass

    def train(self, model, rows, settings, batch, *, output_dir, progress, max_steps=None, resume_from=None):
        for step in range(1, 4):
            progress.step(step, 0.0)
        return {"steps": 0, "loss": 0.0}


def test_real_encode_save_and_load_on_a_tiny_model(tmp_path, tiny_model, monkeypatch, client):
    o = options(tmp_path, base_model=str(tiny_model))
    assert train.run(o, RealEncodeNoTrain()) == 0
    report, vectors = read(o.paths.report), read(o.paths.vectors)
    assert report["dims"] == 16 and len(vectors["pieces"]) == 3
    assert report["training"]["trainableWeights"] < report["training"]["totalWeights"]  # word embeddings frozen
    assert report["training"]["maxSeqLength"] % 8 == 0 and report["training"]["maxSeqLength"] <= 128
    assert (o.paths.model_dir / "modules.json").is_file()
    assert report["modelSha256"] == hashlib.sha256((o.paths.model_dir / "model.safetensors").read_bytes()).hexdigest()
    # model.py's real loader: warm in the background, then a live map from the real model.
    monkeypatch.setattr(b11model, "REPORT_PATH", o.paths.report)
    monkeypatch.setattr(b11model, "VECTORS_PATH", o.paths.vectors)
    monkeypatch.setattr(b11model, "DATA_FILE", o.paths.data)
    monkeypatch.setattr(b11model, "EXPECTED_PIECES", 3)
    monkeypatch.setattr(config, "MODEL_DIR", o.paths.model_dir)
    b11model.reset()
    try:
        r, dt = timed_get(client)
        assert dt < 0.2 and r.json()["warm"] is False
        assert b11model.wait_warm(60.0), client.get("/api/b11/model").json()["problem"]
        assert client.get("/api/b11/model").json()["trained"] is True
        q = b11model.encode_queries([compose.query_text("red wool", [])])[0]
        assert len(q) == 16 and math.isclose(sum(v * v for v in q), 1.0, rel_tol=1e-5)
        # The loaded model's vectors equal the ones the pipeline stored.
        p = b11model.encode_passages([fixture_data().passages()[0]])[0]
        assert np.allclose(p, vectors["pieces"][0]["vector"], atol=1e-4)
        body = {"trigger": None, "queryId": "qry_user_1", "text": DEMO_TEXT, "keywords": DEMO_CHIPS}
        events = client.post("/api/b11/map", json=body).json()["events"]
        assert len(events) == 1 and len(assert_live_event(events[0], "search.mapped")["points"]) == 3
    finally:
        b11model.reset()


@pytest.mark.skipif(TRAINING_LIBS, reason="datasets and accelerate are installed")
def test_without_the_training_libraries_the_probe_stops_before_any_download(tmp_path):
    o = options(tmp_path, "probe", base_model="intfloat/multilingual-e5-small")
    assert train.run(o, train.STBackend()) == 1
    text = o.paths.log.read_text(encoding="utf-8")
    assert "not installed: run python -m pip install -r server/b11_embed/requirements-train.txt" in text
    assert not o.paths.probe.exists()


@needs_training_libs
def test_real_training_arguments_carry_the_memory_safe_settings(tmp_path):
    args = train.STBackend().training_args(train.Settings(), 32, tmp_path / "ck", None)
    assert (args.per_device_train_batch_size, args.num_train_epochs, args.learning_rate, args.warmup_steps) == (32, 3, 2e-5, 0.1)
    assert str(args.batch_sampler).lower().endswith("no_duplicates")
    assert (args.fp16, args.bf16, args.dataloader_num_workers, args.push_to_hub, args.use_cpu) == (False, False, 0, False, True)
    assert str(args.save_strategy).lower().endswith("epoch") and args.save_only_model and args.save_total_limit == 1
    assert args.logging_steps == 10 and args.seed == 13
    probe = train.STBackend().training_args(train.Settings(), 32, tmp_path / "ck", 3)
    assert probe.max_steps == 3 and str(probe.save_strategy).lower().endswith("no")


@needs_training_libs
def test_real_probe_and_training_on_a_tiny_model(tmp_path, tiny_model, capsys):
    o = options(tmp_path, "probe", base_model=str(tiny_model))
    assert train.run(o, train.STBackend()) == 0
    assert "probe: 3 steps at batch 32" in capsys.readouterr().out
    assert read(o.paths.probe)["steps"] == 3
    o = options(tmp_path, "train", base_model=str(tiny_model), epochs=1)
    assert train.run(o, train.STBackend()) == 0
    report = read(o.paths.report)
    assert report["training"]["steps"] >= 1 and report["epochs"] == 1
    assert not o.paths.checkpoints.exists()
    assert "epoch 1 done" in o.paths.log.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------------------------
# Live: the trained model on disk (T5's run), one real map and the report


@pytest.mark.live
@needs_service("model")
def test_live_map_and_report_from_the_trained_model(client):
    b11model.reset()
    try:
        assert b11model.wait_warm(120.0), b11model.status(start=False)["problem"]
        d = b11data.load()
        demo = d.demo_query or {"text": DEMO_TEXT, "keywords": DEMO_CHIPS}
        body = {"trigger": None, "queryId": "qry_01", "text": demo["text"], "keywords": demo.get("keywords") or []}
        events = client.post("/api/b11/map", json=body).json()["events"]
        assert len(events) == 1
        p = assert_live_event(events[0], "search.mapped")
        assert len(p["points"]) == 54 and p["method"] == "pca"
        if not p.get("approx"):
            qv = b11model.encode_queries([compose.query_text(body["text"], body["keywords"])])[0]
            vecs = b11model.piece_vectors()
            idx, _ = pca.top_indices(qv, list(vecs.values()))
            pts = np.array([[pt["x"], pt["y"]] for pt in p["points"]])[idx]
            assert pca.inside((p["query"]["x"], p["query"]["y"]), pts)
        report = json.loads(b11model.REPORT_PATH.read_text(encoding="utf-8"))
        scored = client.post("/api/b11/report", json={"trigger": None}).json()["events"][1]["payload"]
        assert scored["systems"] == [{"system": s["system"], "recallAtK": s["recallAtK"], "mrr": s["mrr"]} for s in report["eval"]["systems"]]
    finally:
        b11model.reset()
