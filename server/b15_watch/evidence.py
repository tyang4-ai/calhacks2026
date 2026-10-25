"""The hit rule (fix-plan 1.9, A2-1): a listing is a possible copy only with evidence about this
co-op. Code only, no model.

A listing has evidence when it
1. names the co-op (the Diné Weaving and Silver Co-op) or one of its makers (Grace N., Lena T.,
   Mae K.), as the server's own mock.json records them,
2. repeats a run of STORY_RUN_WORDS (8) words from one of the co-op's piece stories (lowercased,
   punctuation stripped), or
3. claims a Cindia verification ("verified on Cindia", "Cindia verified" and the like) on a page
   that isn't a Cindia storefront.

A bare craft or origin claim ("Authentic Native American made") is never evidence. Names and
stories match with marks folded ("Dine" finds "Diné") and any punctuation between words. A Cindia
verification that the listing denies ("not verified on Cindia") doesn't count.

The text checked is the listing's title, snippet and page text. The Scout's page function leaves
Cindia's own `.claim` note out of the page text, so only the seller's words are read.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlsplit

from server import config
from server.b15_watch import thresholds
from server.b15_watch.coop import Records

_WORDS = re.compile(r"[a-z0-9]+")

# Cindia verification claims, on folded text. A negation in the three words before cancels one.
CINDIA_CLAIMS = re.compile(
    r"\b(?:(?:verified|certified|approved|authenticated|vetted)\s+(?:on|by|through|with|via)\s+cindia"
    r"|cindia\W{0,3}(?:verified|certified|approved|authenticated|vetted)"
    r"|cindia\s+(?:verification|certification|seal|badge))\b"
)
NEGATIONS = ("not", "never", "no", "isn't", "isnt", "wasn't", "without", "non")


def fold(text: str) -> str:
    """Lowercase with marks taken off (Diné to dine) and runs of whitespace collapsed."""
    decomposed = unicodedata.normalize("NFKD", text or "")
    plain = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return " ".join(plain.lower().split())


def words(text: str) -> list[str]:
    """Lowercased words with punctuation stripped and marks folded."""
    return _WORDS.findall(fold(text))


def _contains(seq: list[str], sub: list[str]) -> bool:
    if not sub or len(sub) > len(seq):
        return False
    n = len(sub)
    first = sub[0]
    for i in range(len(seq) - n + 1):
        if seq[i] == first and seq[i : i + n] == sub:
            return True
    return False


def runs(text: str, n: int = thresholds.STORY_RUN_WORDS) -> set[tuple[str, ...]]:
    w = words(text)
    return {tuple(w[i : i + n]) for i in range(len(w) - n + 1)}


def negated(folded: str, start: int) -> bool:
    before = folded[:start].split()[-3:]
    return any(b.strip(".,;:!?()\"'") in NEGATIONS for b in before)


def cindia_claim(text: str) -> bool:
    """A Cindia verification the text claims (and doesn't deny)."""
    folded = fold(text)
    return any(not negated(folded, m.start()) for m in CINDIA_CLAIMS.finditer(folded))


def is_cindia_storefront(url: str, site: Optional[str] = None) -> bool:
    """A page of a Cindia storefront: `/store/<slug>` on the public site."""
    base = site if site is not None else config.PUBLIC_SITE_URL
    if not base or not isinstance(url, str):
        return False
    b, u = urlsplit(base), urlsplit(url)
    if (b.hostname or "").lower() != (u.hostname or "").lower():
        return False
    prefix = b.path.rstrip("/") + "/store/"
    return u.path.startswith(prefix)


@dataclass
class Evidence:
    names_coop: bool = False
    makers: list[str] = field(default_factory=list)  # maker IDs the listing names
    story_piece: Optional[str] = None  # the piece whose story it repeats
    cindia_claim: bool = False

    @property
    def found(self) -> bool:
        return self.names_coop or bool(self.makers) or self.story_piece is not None or self.cindia_claim

    def kinds(self) -> list[str]:
        out = []
        if self.names_coop or self.makers:
            out.append("names")
        if self.story_piece:
            out.append("story")
        if self.cindia_claim:
            out.append("cindia")
        return out


def find(title: str, snippet: str, text: str, url: str, records: Records, site: Optional[str] = None) -> Evidence:
    """The evidence about this co-op in one listing."""
    whole = " \n ".join(t for t in (title, snippet, text) if t)
    seq = words(whole)
    ev = Evidence()
    coop_words = words(records.name)
    if coop_words and _contains(seq, coop_words):
        ev.names_coop = True
    for m in records.makers:
        mw = words(m.name)
        if mw and _contains(seq, mw):
            ev.makers.append(m.maker_id)
    listing_runs = runs(whole)
    if listing_runs:
        for p in records.pieces:
            if p.story and runs(p.story) & listing_runs:
                ev.story_piece = p.piece_id
                break
    if cindia_claim(whole) and not is_cindia_storefront(url, site):
        ev.cindia_claim = True
    return ev
