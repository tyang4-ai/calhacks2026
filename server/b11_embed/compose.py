"""The one text rule B11 embeds by (data-model.md, "The embedded passage").

- A passage is the IndexEntry's `embedText` as it is. `passage_text()` rebuilds it from a piece and
  its community, so tests can prove the data follows the rule:

      passage: {object} | craft: {craft}, {people} | materials: ... | techniques: ... | motifs: ... |
      colors: ... | mood: {moods} | for: {occasions}, {recipients} | {first sentence of story.en}

  A missing part is left out with its label. In `for:`, an empty list is skipped.
- A query is `query_text(text, chips)`: `query: ` and the person's words, then `, ` and each chip
  whose words aren't already in the text. A price chip (`under $200`) is never added, because it's
  a filter. Training queries, eval queries, `map`, B12's search and B15's comparer all use it.
- Every input carries exactly one `passage: ` or `query: ` prefix, written in the text. Nothing
  passes sentence-transformers' `prompts` or calls `encode_query()`, so a prefix is never doubled.
  `require_one_prefix()` is the check model.py runs before it encodes anything.
- `keyword_text()` is what the keyword system (BM25) indexes for a piece.

Pure string code: no imports beyond the standard library.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from typing import Any

QUERY_PREFIX = "query: "
PASSAGE_PREFIX = "passage: "
PREFIXES: dict[str, str] = {"query": QUERY_PREFIX, "passage": PASSAGE_PREFIX}

# The labels the passage rule writes, in order. The object part has none.
PASSAGE_LABELS: tuple[str, ...] = ("craft", "materials", "techniques", "motifs", "colors", "mood", "for")

# A leading prefix in any case or spacing, so a text that already has one is never prefixed twice.
_LEADING_PREFIX = re.compile(r"^\s*(?:query|passage)\s*:\s*", re.IGNORECASE)
# Words as src/sources/keywordSearch.ts keywordWords() splits them: dollar amounts, or runs of
# letters and digits, lowercased.
_WORDS = re.compile(r"\$\d[\d,]*(?:\.\d+)?|[^\W_]+")
# A price chip as src/sources/keywordSearch.ts isPriceChip() reads one.
_PRICE_CHIP = re.compile(r"^(?:under|below)\s+\$\d[\d,]*(?:\.\d+)?$", re.IGNORECASE)
_CJK = re.compile(r"[㐀-䶿一-鿿豈-﫿]")
# The end of a story's first sentence: ". ", "! " or "? ".
_SENTENCE_END = re.compile(r"[.!?] ")


def _en(value: Any) -> str:
    """The English side of a Text, or a plain string as it is."""
    if isinstance(value, Mapping):
        value = value.get("en")
    return value if isinstance(value, str) else ""


def _list(values: Any) -> list[str]:
    return [v for v in (values or []) if isinstance(v, str) and v != ""]


def words(text: str) -> list[str]:
    """The lowercased words of a text, split as the browser's keyword code splits them."""
    return _WORDS.findall((text or "").lower())


def first_sentence(text: str) -> str:
    """The text up to and including the first ". ", "! " or "? ", or all of it, trimmed."""
    text = text or ""
    end = _SENTENCE_END.search(text)
    return (text[: end.start() + 1] if end else text).strip()


def passage_text(piece: Mapping[str, Any], community: Mapping[str, Any] | None) -> str:
    """A piece's passage by the rule, from its record and its community's record."""
    facets = piece.get("facets") or {}
    vibe = piece.get("vibe") or {}
    parts: list[str] = []
    obj = _en(facets.get("object"))
    if obj:
        parts.append(obj)
    if community:
        craft = [x for x in (_en(community.get("craft")), _en(community.get("people"))) if x]
        if craft:
            parts.append("craft: " + ", ".join(craft))
    lists = (
        ("materials", _list(facets.get("materials"))),
        ("techniques", _list(facets.get("techniques"))),
        ("motifs", _list(facets.get("motifs"))),
        ("colors", _list(facets.get("colors"))),
        ("mood", _list(vibe.get("moods"))),
        ("for", _list(vibe.get("occasions")) + _list(vibe.get("recipients"))),
    )
    for label, values in lists:
        if values:
            parts.append(f"{label}: {', '.join(values)}")
    sentence = first_sentence(_en(piece.get("story")))
    if sentence:
        parts.append(sentence)
    return PASSAGE_PREFIX + " | ".join(parts)


def is_price_chip(chip: str) -> bool:
    """True for a chip like `under $200` or `below $1,200`, which is a filter, never embedded."""
    return bool(_PRICE_CHIP.match(" ".join(str(chip or "").split())))


def strip_prefix(text: str) -> str:
    """The text without any leading `query: ` or `passage: ` prefixes."""
    text = text or ""
    while True:
        m = _LEADING_PREFIX.match(text)
        if not m:
            return text.strip()
        text = text[m.end() :]


def _chip_present(chip: str, present: set[str], lowered: str) -> bool:
    chip_words = words(chip)
    if not chip_words:
        return True  # nothing to add
    return all(w in present or (_CJK.search(w) is not None and w in lowered) for w in chip_words)


def query_text(text: str, chips: Iterable[str] = ()) -> str:
    """`query: ` and the person's words, then `, ` and each chip whose words aren't in the text yet.

    The words are kept as typed, with runs of whitespace collapsed and any prefix already on them
    taken off. A price chip is never added. A chip is added once. Raises ValueError when there are
    neither words nor chips to embed.
    """
    base = strip_prefix(" ".join(str(text or "").split()))
    parts = [base] if base else []
    present = set(words(base))
    lowered = base.lower()
    for raw in chips or ():
        chip = " ".join(str(raw or "").split())
        if not chip or is_price_chip(chip) or _chip_present(chip, present, lowered):
            continue
        parts.append(chip)
        present.update(words(chip))
        lowered = f"{lowered} {chip.lower()}"
    if not parts:
        raise ValueError("a query needs words or a chip")
    return QUERY_PREFIX + ", ".join(parts)


def count_prefixes(text: str) -> int:
    """How many `query:` or `passage:` prefixes a text starts with, in any case or spacing."""
    n = 0
    text = text or ""
    while True:
        m = _LEADING_PREFIX.match(text)
        if not m:
            return n
        n += 1
        text = text[m.end() :]


def has_one_prefix(text: str, kind: str) -> bool:
    """True when the text starts with exactly one prefix, the `kind` one ("query" or "passage"),
    written exactly (lowercase, one space), with words after it."""
    prefix = PREFIXES[kind]
    if not isinstance(text, str) or not text.startswith(prefix) or count_prefixes(text) != 1:
        return False
    rest = text[len(prefix) :]
    return bool(rest) and not rest[0].isspace()


def require_one_prefix(texts: Iterable[str], kind: str) -> list[str]:
    """The texts as a list, or ValueError naming the first one without exactly one `kind` prefix.
    model.py calls this on every batch before it encodes, so no input is ever double-prefixed."""
    out = list(texts)
    for i, t in enumerate(out):
        if not has_one_prefix(t, kind):
            raise ValueError(f"input {i} doesn't start with exactly one {PREFIXES[kind]!r} prefix")
    return out


def keyword_text(
    entry: Mapping[str, Any],
    piece: Mapping[str, Any] | None = None,
    community: Mapping[str, Any] | None = None,
) -> str:
    """What the keyword system indexes for one piece (B11-embed.md, Metrics, `keyword`): the
    passage without its prefix and labels, then the facet words (the object in English and Chinese,
    materials, techniques, motifs, colors), the Chinese title and the craft's Chinese name, so a
    Chinese query gets a fair keyword baseline."""
    parts: list[str] = []
    for part in strip_prefix(str(entry.get("embedText") or "")).split(" | "):
        label, sep, rest = part.partition(": ")
        parts.append(rest if sep and label in PASSAGE_LABELS else part)
    if piece:
        facets = piece.get("facets") or {}
        obj = facets.get("object") or {}
        if isinstance(obj, Mapping):
            parts += [str(obj.get("en") or ""), str(obj.get("zh") or "")]
        for key in ("materials", "techniques", "motifs", "colors"):
            parts += _list(facets.get(key))
        title = piece.get("title") or {}
        if isinstance(title, Mapping):
            parts.append(str(title.get("zh") or ""))
    if community:
        craft = community.get("craft") or {}
        if isinstance(craft, Mapping):
            parts.append(str(craft.get("zh") or ""))
    return " ".join(p for p in parts if p)
