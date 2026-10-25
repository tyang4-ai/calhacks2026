"""Why a result matched, built from its facets with no model call (docs/plans/B12-search.md, B2-26).

- `matched_keywords(keywords, doc, aliases)`: the request's chips found in the piece's facets or
  vibe, after `keywordAliases` (the chip `mom` or `gift for mom` matches the recipients phrase
  `gift for mom`). A price chip is a filter and never matches. Each chip once, in request order,
  as the person's chip reads.
- `reason(matched, doc)`: one short sentence as Text.
  - Something matched: "Matches warm, red and gift for mom: small grey, red and black wool
    weaving." In Chinese, the matched words and the piece's Chinese title:
    "匹配：warm、red、gift for mom：灰红黑三色小幅羊毛编织。"
  - Nothing matched word for word: "Close in feel: warm and bold." from the piece's moods, or
    "Close in feel to your words." when it has none. In Chinese: "感觉相近：warm、bold。"
  The facet words stay English, as the facets are (data-model.md, Reasons).
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from server.b11_embed import compose
from server.b12_search import catalog


def _norm(chip: str) -> str:
    return " ".join(str(chip or "").split()).lower()


def matched_keywords(keywords: Iterable[str], doc: Mapping[str, Any], aliases: Mapping[str, str]) -> list[str]:
    """The chips this piece carries, after aliases, in request order, each once."""
    have = catalog.words(doc)
    out: list[str] = []
    seen: set[str] = set()
    for raw in keywords or ():
        chip = " ".join(str(raw or "").split())
        norm = chip.lower()
        if not norm or norm in seen or compose.is_price_chip(chip):
            continue
        seen.add(norm)
        term = aliases.get(norm, norm)
        if norm in have or term in have:
            out.append(chip)
    return out


def join_en(items: list[str]) -> str:
    """`a`, `a and b`, `a, b and c`."""
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return f"{', '.join(items[:-1])} and {items[-1]}"


def _title_en(doc: Mapping[str, Any]) -> str:
    title = str(doc.get("title_en") or doc.get("object") or "").strip().rstrip(".")
    return title[:1].lower() + title[1:] if title else ""


def reason(matched: list[str], doc: Mapping[str, Any]) -> dict[str, str]:
    """One short sentence, English and Chinese, from the matched chips and the piece's facets."""
    title_en = _title_en(doc)
    title_zh = str(doc.get("title_zh") or "").strip().rstrip("。")
    if matched:
        en = f"Matches {join_en(matched)}" + (f": {title_en}." if title_en else ".")
        zh = f"匹配：{'、'.join(matched)}" + (f"：{title_zh}。" if title_zh else "。")
        return {"en": en, "zh": zh}
    moods = [str(m) for m in (doc.get("moods") or []) if str(m).strip()]
    if moods:
        return {"en": f"Close in feel: {join_en(moods)}.", "zh": f"感觉相近：{'、'.join(moods)}。"}
    return {"en": "Close in feel to your words.", "zh": "感觉与您的描述相近。"}
