"""B11 · the embedding model. Tests for T1 (data.py, compose.py) and T2 (bm25.py, metrics.py).

The fixture b11_fixture.json holds three pieces (pc_01, pc_10, pc_14), their two communities and
their index entries, copied from artifacts/mock/mock.json. The "real data" tests read whichever
file data.load() would pick (the artifact or the committed snapshot) and skip, saying which field
is missing, while S3-catalog is still writing it. Nothing here downloads a model, imports torch
or calls the network.
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import subprocess
import sys
from pathlib import Path

import pytest

from server.b11_embed import bm25, compose, metrics
from server.b11_embed import data as b11data

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
        "server.b11_embed.bm25, server.b11_embed.metrics\n"
        "print('torch' in sys.modules, 'sentence_transformers' in sys.modules)\n"
    )
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    res = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, timeout=60, env=env)
    assert res.returncode == 0, res.stderr[-500:]
    assert res.stdout.strip() == "False False"
