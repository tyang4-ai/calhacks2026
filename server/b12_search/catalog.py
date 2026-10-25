"""The catalog B12 searches, built from the server's own data (docs/plans/B12-search.md, B2-25).

- `load()` reads `pieces`, `communities`, `searchIndex` and `keywordAliases` through B11's data.py
  (artifacts/mock/mock.json, or B11's committed snapshot when it's newer), cached until a data file
  changes. Every line of it is fictional demo data from src/mock/.
- `document(entry, piece, community, ...)` is one Elastic document, the same shape for
  `cindia-pieces` and `cindia-drafts`, and the shape the local path ranks:
  keywords `pieceId`, `communityId`, `makerId`, `storefrontSlug`, `status`, `fingerprint`,
  integers `priceCents`, `salesThisMonth`, text `title_en`, `title_zh`, `object`, `craft`,
  `craft_zh`, `people`, `place` (the community's region), `embedText`, the facet lists `materials`, `techniques`, `motifs`, `colors`,
  `moods`, `occasions`, `recipients`, and `vector` (384 numbers) when one is given.
- `keyword_text(doc)` is what the local BM25 indexes: B11's keyword text rule
  (compose.keyword_text), so the local path scores keywords the way B11's evaluation did.
- `words(doc)` is the piece's facet and vibe words, lowercased, which `matched` is checked against.

Standard library plus B11's pure modules. Nothing here calls out or loads a model.
"""

from __future__ import annotations

import os
import threading
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from server.b11_embed import compose
from server.b11_embed import data as b11data

FACET_LISTS = ("materials", "techniques", "motifs", "colors")
VIBE_LISTS = ("moods", "occasions", "recipients")
LIST_FIELDS = FACET_LISTS + VIBE_LISTS


def _en(value: Any) -> str:
    if isinstance(value, Mapping):
        value = value.get("en")
    return value if isinstance(value, str) else ""


def _zh(value: Any) -> str:
    if isinstance(value, Mapping):
        value = value.get("zh")
    return value if isinstance(value, str) else ""


def _strs(values: Any) -> list[str]:
    return [v for v in (values or []) if isinstance(v, str) and v.strip()]


def _int(value: Any, default: int = 0) -> int:
    return value if isinstance(value, int) and not isinstance(value, bool) else default


def document(
    entry: Mapping[str, Any],
    piece: Mapping[str, Any],
    community: Mapping[str, Any] | None,
    *,
    status: str | None = None,
    fingerprint: str | None = None,
    vector: list[float] | None = None,
) -> dict[str, Any]:
    """One Elastic document for a piece. `status` defaults to the entry's, then "active"."""
    facets = piece.get("facets") if isinstance(piece.get("facets"), Mapping) else {}
    vibe = piece.get("vibe") if isinstance(piece.get("vibe"), Mapping) else {}
    community = community or {}
    pid = str(entry.get("pieceId") or piece.get("id") or "")
    embed = entry.get("embedText")
    if not isinstance(embed, str) or not embed:
        embed = compose.passage_text(piece, community)
    doc: dict[str, Any] = {
        "pieceId": pid,
        "communityId": str(entry.get("communityId") or piece.get("communityId") or ""),
        "makerId": str(entry.get("makerId") or piece.get("makerId") or ""),
        "storefrontSlug": str(entry.get("storefrontSlug") or ""),
        "status": status or str(entry.get("status") or "active"),
        "fingerprint": fingerprint,
        "priceCents": _int(piece.get("priceCents")),
        "salesThisMonth": max(0, _int(entry.get("salesThisMonth"))),
        "title_en": _en(piece.get("title")),
        "title_zh": _zh(piece.get("title")),
        "object": _en(facets.get("object")),
        "object_zh": _zh(facets.get("object")),
        "craft": _en(community.get("craft")),
        "craft_zh": _zh(community.get("craft")),
        "people": _en(community.get("people")),
        "place": _en(community.get("place")),
        "embedText": embed,
    }
    for key in FACET_LISTS:
        doc[key] = _strs(facets.get(key))
    for key in VIBE_LISTS:
        doc[key] = _strs(vibe.get(key))
    if vector is not None:
        doc["vector"] = [float(x) for x in vector]
    return doc


def keyword_text(doc: Mapping[str, Any]) -> str:
    """B11's keyword text (compose.keyword_text) from a document: the passage without its prefix
    and labels, the object in English and Chinese, the facet words, the Chinese title and the
    craft's Chinese name."""
    entry = {"embedText": doc.get("embedText") or ""}
    piece = {
        "facets": {
            "object": {"en": doc.get("object") or "", "zh": doc.get("object_zh") or ""},
            **{k: list(doc.get(k) or []) for k in FACET_LISTS},
        },
        "title": {"zh": doc.get("title_zh") or ""},
    }
    community = {"craft": {"zh": doc.get("craft_zh") or ""}}
    return compose.keyword_text(entry, piece, community)


def words(doc: Mapping[str, Any]) -> set[str]:
    """The piece's facet and vibe words, lowercased: its object, materials, techniques, motifs,
    colors, moods, occasions and recipients (data-model.md, the keyword scorer's word set)."""
    out = {str(doc.get("object") or "").strip().lower()}
    for key in LIST_FIELDS:
        out.update(str(w).strip().lower() for w in (doc.get(key) or []))
    out.discard("")
    return out


@dataclass
class Catalog:
    """The active pieces as documents (no vectors), in pieceId order, plus what search needs."""

    docs: dict[str, dict[str, Any]]
    order: list[str]
    aliases: dict[str, str]
    passages_hash: str
    eval: list[dict[str, Any]] = field(default_factory=list)
    demo_query: dict[str, Any] | None = None

    def active_ids(self) -> list[str]:
        return [pid for pid in self.order if self.docs[pid].get("status") == "active"]


def from_data(d: b11data.Data) -> Catalog:
    """A Catalog from B11's checked data."""
    docs: dict[str, dict[str, Any]] = {}
    for entry in d.index:
        pid = entry["pieceId"]
        docs[pid] = document(entry, d.piece(pid), d.community_of(pid))
    aliases = {str(k).strip().lower(): str(v).strip().lower() for k, v in (d.aliases or {}).items() if str(k).strip() and str(v).strip()}
    return Catalog(
        docs=docs,
        order=d.piece_ids(),
        aliases=aliases,
        passages_hash=d.passages_hash(),
        eval=list(d.eval),
        demo_query=d.demo_query,
    )


def from_raw(raw: Mapping[str, Any], *, expected: int | None = None) -> Catalog:
    """A Catalog from a mock.json-shaped dict (tests use their own fixture)."""
    tmp_index = raw.get("searchIndex") or []
    n = expected if expected is not None else len(tmp_index)
    d = b11data._build(Path("<fixture>"), dict(raw), n)  # noqa: SLF001 (B11's own checks)
    return from_data(d)


_lock = threading.Lock()
_cache: dict[str, Any] = {}


def _stat(path: Path) -> tuple[int, int] | None:
    try:
        st = os.stat(path)
    except OSError:
        return None
    return (st.st_size, st.st_mtime_ns)


def load() -> Catalog:
    """The server's catalog, read through B11's data.load(), cached until a data file changes.
    Raises b11data.DataError (one plain line) when the data can't be used."""
    key = (_stat(b11data.ARTIFACT), _stat(b11data.SNAPSHOT))
    with _lock:
        if _cache.get("key") == key:
            return _cache["catalog"]
    cat = from_data(b11data.load())
    with _lock:
        _cache.update(key=key, catalog=cat)
    return cat


# Tests swap this for a function that returns their fixture's Catalog.
LOADER = load


def get() -> Catalog:
    return LOADER()


def reset() -> None:
    with _lock:
        _cache.clear()
