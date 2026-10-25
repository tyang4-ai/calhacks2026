"""The Diné co-op's records B15 reads from the server's own mock data, never from a request
(A2-20): the community's name, its makers, its pieces and their stories, and its owner.

- `mock()` returns `artifacts/mock/mock.json` (written by `npm run export:mock`) when it exists,
  otherwise B11's committed snapshot `server/b11_embed/data/mock.json`. Each file is read once as
  UTF-8 and again only when it changes. `use(data)` makes every caller see `data` instead (tests).
- `records()` builds the co-op's `Records` from it. The snapshot has no makers, so without the
  export the maker check has nothing to accept and the scan isn't run.

Every name here is fictional demo data from src/mock/.
"""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = REPO_ROOT / "artifacts" / "mock" / "mock.json"
SNAPSHOT = REPO_ROOT / "server" / "b11_embed" / "data" / "mock.json"

COMMUNITY_ID = "com_dine"

_lock = threading.Lock()
_override: Optional[dict[str, Any]] = None
_files: dict[Path, tuple[tuple[int, int], dict[str, Any]]] = {}
_built: dict[str, Any] = {"source": None, "records": None}


def use(data: Optional[dict[str, Any]]) -> None:
    """Every later mock() call returns `data` (None goes back to the files)."""
    global _override
    with _lock:
        _override = data
        _built["source"], _built["records"] = None, None


def _read(path: Path) -> Optional[dict[str, Any]]:
    try:
        st = path.stat()
    except OSError:
        return None
    key = (st.st_size, st.st_mtime_ns)
    with _lock:
        hit = _files.get(path)
        if hit and hit[0] == key:
            return hit[1]
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(value, dict):
        return None
    with _lock:
        _files[path] = (key, value)
    return value


def mock() -> dict[str, Any]:
    """The mock dataset, the artifact first, then B11's snapshot, else {}."""
    with _lock:
        if _override is not None:
            return _override
    for path in (ARTIFACT, SNAPSHOT):
        value = _read(path)
        if value is not None:
            return value
    return {}


def _en(value: Any) -> str:
    if isinstance(value, dict):
        v = value.get("en")
        return v if isinstance(v, str) else ""
    return value if isinstance(value, str) else ""


@dataclass(frozen=True)
class Maker:
    maker_id: str
    name: str


@dataclass(frozen=True)
class Piece:
    piece_id: str
    maker_id: str
    title: str
    story: str


@dataclass
class Records:
    community_id: str
    name: str
    makers: list[Maker] = field(default_factory=list)
    pieces: list[Piece] = field(default_factory=list)
    owner: str = ""
    accusing_words: list[str] = field(default_factory=list)

    def maker(self, maker_id: str) -> Optional[Maker]:
        return next((m for m in self.makers if m.maker_id == maker_id), None)

    def piece(self, piece_id: str) -> Optional[Piece]:
        return next((p for p in self.pieces if p.piece_id == piece_id), None)

    def maker_ids(self) -> set[str]:
        return {m.maker_id for m in self.makers}

    def piece_ids(self) -> list[str]:
        return [p.piece_id for p in self.pieces]

    def first_piece_of(self, maker_id: str) -> Optional[Piece]:
        return next((p for p in self.pieces if p.maker_id == maker_id), None)


def _makers(data: dict[str, Any]) -> list[Maker]:
    out: list[Maker] = []
    seen: set[str] = set()
    for key in ("allMakers", "makers", "people"):
        rows = data.get(key)
        if not isinstance(rows, list):
            continue
        for p in rows:
            if not isinstance(p, dict) or p.get("communityId") != COMMUNITY_ID:
                continue
            role = p.get("role")
            if role is not None and role != "maker":
                continue
            mid, name = p.get("id"), _en(p.get("name"))
            if isinstance(mid, str) and mid and name and mid not in seen:
                seen.add(mid)
                out.append(Maker(mid, name))
    return out


def _owner(data: dict[str, Any]) -> str:
    for p in data.get("leads") or []:
        if isinstance(p, dict) and p.get("communityId") == COMMUNITY_ID and _en(p.get("name")):
            return _en(p.get("name"))
    owner = data.get("owner")
    if isinstance(owner, dict) and _en(owner.get("name")):
        return _en(owner.get("name"))
    return ""


def build(data: dict[str, Any]) -> Records:
    community = next((c for c in data.get("communities") or [] if isinstance(c, dict) and c.get("id") == COMMUNITY_ID), {})
    pieces = [
        Piece(p["id"], str(p.get("makerId") or ""), _en(p.get("title")), _en(p.get("story")))
        for p in data.get("pieces") or []
        if isinstance(p, dict) and p.get("communityId") == COMMUNITY_ID and isinstance(p.get("id"), str)
    ]
    rules = data.get("contentRules") if isinstance(data.get("contentRules"), dict) else {}
    accusing = [w for w in rules.get("accusingWords") or [] if isinstance(w, str) and w.strip()]
    return Records(
        community_id=COMMUNITY_ID,
        name=_en(community.get("name")),
        makers=_makers(data),
        pieces=pieces,
        owner=_owner(data),
        accusing_words=accusing,
    )


def records() -> Records:
    """The co-op's records, built once per mock data object."""
    data = mock()
    with _lock:
        if _built["source"] is data and _built["records"] is not None:
            return _built["records"]
    rec = build(data)
    with _lock:
        _built["source"], _built["records"] = data, rec
    return rec
