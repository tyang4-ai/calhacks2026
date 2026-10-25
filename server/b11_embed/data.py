"""B11's data: load it, check it, and write the committed snapshot (B11-embed.md, Input data).

- `load()` reads artifacts/mock/mock.json (written by `npm run export:mock`) when it exists and is
  newer than the snapshot, otherwise the committed snapshot server/b11_embed/data/mock.json.
  "Newer" compares `_generatedAt`, or the file times when a file has none. It logs which file it
  read and its `_generatedAt`.
- It fails with one plain line (DataError) when neither file exists, a file isn't UTF-8 JSON, a
  key B11 needs is missing, `searchIndex` doesn't hold 54 entries, or an entry's piece or
  community is missing.
- `check()` lists everything else that's off, one plain line each: the eval set's size, IDs and
  grades, an `embedText` that doesn't follow the passage rule, missing `contentRules` lists.
- `python server/b11_embed/data.py --snapshot` copies the keys B11 uses from the artifact into the
  snapshot, so a machine without Node can train. It writes nothing when the artifact fails
  `load()`'s checks, and prints `check()`'s lines as warnings. `python server/b11_embed/data.py`
  checks whichever file `load()` picks and exits 1 on any problem.

Every file is read and written as UTF-8, with `ensure_ascii=False`, because the data holds Chinese
and Windows defaults to cp1252. Every line of the data is fictional demo data from src/mock/.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import sys
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

if __package__ in (None, ""):  # run as a script: python server/b11_embed/data.py
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from server.b11_embed import compose  # noqa: E402

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
ARTIFACT = REPO_ROOT / "artifacts" / "mock" / "mock.json"
SNAPSHOT = HERE / "data" / "mock.json"

EXPECTED_PIECES = 54
EXPECTED_EVAL = 50
LANGS = ("en", "zh")
AUTHORS = ("data_agent", "gordon")
# The keys load() can't do without.
REQUIRED_KEYS = ("pieces", "communities", "searchIndex")
# The keys the snapshot keeps: the plan's list, plus vibeVocabulary (T3's hard-negative filter) and
# demoSearch (figure 11's tour query, which T3's leak guard and T4's map check use).
SNAPSHOT_KEYS = (
    "pieces",
    "communities",
    "searchIndex",
    "searchEval",
    "keywordAliases",
    "vibeVocabulary",
    "contentRules",
    "demoSearch",
)
CONTENT_RULE_KEYS = ("bannedObjects", "stereotypeWords", "meaningWords", "peopleNames")
SNAPSHOT_ABOUT = (
    "The keys B11 uses from artifacts/mock/mock.json, written by python server/b11_embed/data.py "
    "--snapshot. Every line is fictional demo data from src/mock/."
)

log = logging.getLogger("cindia.b11")


class DataError(Exception):
    """B11's data can't be used. The message is one plain line."""


def id_key(value: str) -> list[Any]:
    """Sort key for IDs like pc_07 and pc_54: text parts as text, number parts as numbers."""
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", str(value))]


def passages_hash(texts: Sequence[str]) -> str:
    """sha256 of the passages joined with a newline, as hex (B11-embed.md, Fingerprints)."""
    return hashlib.sha256("\n".join(texts).encode("utf-8")).hexdigest()


def rel(path: Path) -> str:
    """A path relative to the repo, with forward slashes, for messages."""
    try:
        return Path(path).resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return Path(path).as_posix()


@dataclass
class Data:
    """B11's data, checked by load(). `index` is in pieceId order."""

    source: Path
    generated_at: str | None
    raw: dict[str, Any]
    pieces: dict[str, dict[str, Any]]
    communities: dict[str, dict[str, Any]]
    index: list[dict[str, Any]]
    eval: list[dict[str, Any]]
    aliases: dict[str, str]
    vibe_vocabulary: dict[str, list[str]]
    content_rules: dict[str, Any]
    demo_query: dict[str, Any] | None

    def piece_ids(self) -> list[str]:
        return [e["pieceId"] for e in self.index]

    def piece(self, piece_id: str) -> dict[str, Any]:
        return self.pieces[piece_id]

    def community_of(self, piece_id: str) -> dict[str, Any]:
        return self.communities[self.pieces[piece_id]["communityId"]]

    def passages(self) -> list[str]:
        """The embedTexts, in pieceId order."""
        return [e["embedText"] for e in self.index]

    def passages_hash(self) -> str:
        return passages_hash(self.passages())


def _read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise DataError(f"{rel(path)} doesn't exist (run npm run export:mock first)") from None
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise DataError(f"{rel(path)} isn't valid UTF-8 JSON ({type(exc).__name__})") from None
    if not isinstance(raw, dict):
        raise DataError(f"{rel(path)} doesn't hold a JSON object")
    return raw


def _stamp(raw: Mapping[str, Any]) -> datetime | None:
    """A file's `_generatedAt` as a datetime, or None when it has none."""
    value = raw.get("_generatedAt")
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _choose(artifact: Path, snapshot: Path) -> tuple[Path, dict[str, Any]]:
    """The file load() reads, and its JSON: the artifact when it exists and is at least as new."""
    has_a, has_s = Path(artifact).is_file(), Path(snapshot).is_file()
    if not has_a and not has_s:
        raise DataError(
            f"no data for B11: neither {rel(artifact)} nor {rel(snapshot)} exists (run npm run export:mock)"
        )
    if has_a != has_s:
        path = artifact if has_a else snapshot
        return path, _read_json(path)
    raw_a, raw_s = _read_json(artifact), _read_json(snapshot)
    t_a, t_s = _stamp(raw_a), _stamp(raw_s)
    if t_a is not None and t_s is not None:
        newer_a = t_a >= t_s
    else:
        newer_a = Path(artifact).stat().st_mtime >= Path(snapshot).stat().st_mtime
    return (artifact, raw_a) if newer_a else (snapshot, raw_s)


def pick_source(artifact: Path = ARTIFACT, snapshot: Path = SNAPSHOT) -> Path:
    """The file load() would read. Raises DataError when neither exists."""
    return _choose(artifact, snapshot)[0]


def _records(raw: Mapping[str, Any], key: str) -> list[dict[str, Any]]:
    value = raw.get(key)
    return [r for r in value if isinstance(r, dict)] if isinstance(value, list) else []


def _build(source: Path, raw: dict[str, Any], expected: int) -> Data:
    where = rel(source)
    missing = [k for k in REQUIRED_KEYS if not isinstance(raw.get(k), list)]
    if missing:
        raise DataError(f"{where} has no {', '.join(missing)} (rerun npm run export:mock)")
    pieces = {p["id"]: p for p in _records(raw, "pieces") if isinstance(p.get("id"), str)}
    communities = {c["id"]: c for c in _records(raw, "communities") if isinstance(c.get("id"), str)}
    index = _records(raw, "searchIndex")
    if len(index) != expected:
        raise DataError(f"{where}: searchIndex holds {len(index)} entries, expected {expected}")
    seen: set[str] = set()
    for e in index:
        pid = e.get("pieceId")
        if not isinstance(pid, str) or not pid:
            raise DataError(f"{where}: a searchIndex entry has no pieceId")
        if pid in seen:
            raise DataError(f"{where}: searchIndex lists {pid} twice")
        seen.add(pid)
        if pid not in pieces:
            raise DataError(f"{where}: searchIndex entry {pid} has no piece in pieces")
        cid = pieces[pid].get("communityId")
        if cid not in communities:
            raise DataError(f"{where}: piece {pid} has no community in communities ({cid})")
        if not isinstance(e.get("embedText"), str) or not e["embedText"]:
            raise DataError(f"{where}: searchIndex entry {pid} has no embedText")
    index.sort(key=lambda e: id_key(e["pieceId"]))
    demo = raw.get("demoSearch")
    demo_query = demo.get("query") if isinstance(demo, dict) and isinstance(demo.get("query"), dict) else None
    aliases = raw.get("keywordAliases")
    vocab = raw.get("vibeVocabulary")
    rules = raw.get("contentRules")
    generated = raw.get("_generatedAt")
    return Data(
        source=Path(source),
        generated_at=generated if isinstance(generated, str) else None,
        raw=raw,
        pieces=pieces,
        communities=communities,
        index=index,
        eval=_records(raw, "searchEval"),
        aliases=aliases if isinstance(aliases, dict) else {},
        vibe_vocabulary=vocab if isinstance(vocab, dict) else {},
        content_rules=rules if isinstance(rules, dict) else {},
        demo_query=demo_query,
    )


def load(
    path: Path | None = None,
    *,
    artifact: Path = ARTIFACT,
    snapshot: Path = SNAPSHOT,
    expected: int = EXPECTED_PIECES,
) -> Data:
    """B11's data from `path`, or from the artifact or the snapshot, whichever is newer.

    Raises DataError, with one plain line, when the data can't be used. `expected` is the number
    of index entries (54; tests pass their fixture's count).
    """
    if path is not None:
        source, raw = Path(path), _read_json(Path(path))
    else:
        source, raw = _choose(artifact, snapshot)
    data = _build(source, raw, expected)
    log.info("b11 data: read %s, _generatedAt %s, %d index entries", rel(source), data.generated_at, len(data.index))
    return data


def check(data: Data, *, expected_eval: int = EXPECTED_EVAL) -> list[str]:
    """Everything else that's off in the data, one plain line each. Empty when it's all in order."""
    problems: list[str] = []
    for e in data.index:
        pid = e["pieceId"]
        piece = data.pieces[pid]
        if e.get("communityId") != piece.get("communityId"):
            problems.append(f"{pid}'s index entry and piece name different communities")
        if not compose.has_one_prefix(e["embedText"], "passage"):
            problems.append(f"{pid}'s embedText doesn't start with exactly one 'passage: ' prefix")
        if compose.passage_text(piece, data.community_of(pid)) != e["embedText"]:
            problems.append(f"{pid}'s embedText doesn't follow the passage rule")
    if len(data.eval) != expected_eval:
        problems.append(f"searchEval holds {len(data.eval)} queries, expected {expected_eval}")
    known = set(data.piece_ids())
    seen: set[str] = set()
    for n, q in enumerate(data.eval, start=1):
        qid = q.get("id") if isinstance(q.get("id"), str) else f"query {n}"
        if qid in seen:
            problems.append(f"searchEval lists {qid} twice")
        seen.add(qid)
        if not isinstance(q.get("text"), str) or not q["text"].strip():
            problems.append(f"{qid} has no text")
        if q.get("lang") not in LANGS:
            problems.append(f"{qid}'s lang is {q.get('lang')!r}, expected en or zh")
        if q.get("author") not in AUTHORS:
            problems.append(f"{qid}'s author is {q.get('author')!r}, expected data_agent or gordon")
        grades = q.get("grades")
        if not isinstance(grades, dict) or not grades:
            problems.append(f"{qid} grades no piece")
            continue
        unknown = sorted((pid for pid in grades if pid not in known), key=id_key)
        if unknown:
            problems.append(f"{qid} grades pieces that aren't in the index: {', '.join(unknown)}")
        if any(g not in (1, 2) for g in grades.values()):
            problems.append(f"{qid} has a grade other than 1 or 2")
        if 2 not in grades.values():
            problems.append(f"{qid} has no grade-2 piece")
    for key in CONTENT_RULE_KEYS:
        if key not in data.content_rules:
            problems.append(f"contentRules has no {key}")
    return problems


def snapshot(
    source: Path = ARTIFACT,
    dest: Path = SNAPSHOT,
    *,
    expected: int = EXPECTED_PIECES,
    force: bool = False,
) -> tuple[Data, list[str]]:
    """Copies the keys B11 uses from `source` into `dest`, and returns the data and check()'s lines.

    Writes nothing, and raises DataError, when `source` is missing or fails load()'s checks, or
    when `dest` is newer than `source` (unless `force`).
    """
    source, dest = Path(source), Path(dest)
    if not source.is_file():
        raise DataError(f"{rel(source)} doesn't exist (run npm run export:mock first)")
    raw = _read_json(source)
    data = _build(source, raw, expected)
    if dest.is_file() and not force:
        t_src, t_dest = _stamp(raw), _stamp(_read_json(dest))
        if t_src is not None and t_dest is not None and t_dest > t_src:
            raise DataError(f"{rel(dest)} is newer than {rel(source)}; rerun npm run export:mock, or pass --force")
    out: dict[str, Any] = {"_about": SNAPSHOT_ABOUT, "_generatedAt": raw.get("_generatedAt")}
    for key in SNAPSHOT_KEYS:
        if key in raw:
            out[key] = raw[key]
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(f"{dest.name}.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    os.replace(tmp, dest)
    return data, check(data)


def _summary(data: Data) -> str:
    return (
        f"_generatedAt {data.generated_at}: {len(data.pieces)} pieces, {len(data.communities)} communities, "
        f"{len(data.index)} index entries, {len(data.eval)} eval queries, passagesHash {data.passages_hash()[:16]}"
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check B11's data, or write its committed snapshot.")
    parser.add_argument("--snapshot", action="store_true", help="copy B11's keys from artifacts/mock/mock.json into data/mock.json")
    parser.add_argument("--force", action="store_true", help="with --snapshot, replace a snapshot that is newer than the artifact")
    parser.add_argument("--file", type=Path, help="check this file instead of the one load() picks")
    args = parser.parse_args(argv)
    # load()'s log line goes to stderr while the command runs. Nothing calls logging.basicConfig.
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(message)s"))
    old_level, old_propagate = log.level, log.propagate
    log.addHandler(handler)
    log.setLevel(logging.INFO)
    log.propagate = False
    try:
        if args.snapshot:
            data, problems = snapshot(ARTIFACT, SNAPSHOT, expected=EXPECTED_PIECES, force=args.force)
            print(f"b11 data: wrote {rel(SNAPSHOT)} from {rel(ARTIFACT)}, {_summary(data)}")
            for p in problems:
                print(f"b11 data: warning: {p}")
            return 0
        data = load(args.file, artifact=ARTIFACT, snapshot=SNAPSHOT, expected=EXPECTED_PIECES)
        problems = check(data)
        print(f"b11 data: {rel(data.source)}, {_summary(data)}")
        for p in problems:
            print(f"b11 data: problem: {p}")
        return 1 if problems else 0
    except DataError as exc:
        print(f"b11 data: {exc}", file=sys.stderr)
        return 1
    finally:
        log.removeHandler(handler)
        log.setLevel(old_level)
        log.propagate = old_propagate


if __name__ == "__main__":
    sys.exit(main())
