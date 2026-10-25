"""The content check (A2-8, A2-11, A2-16): `content_check(text, maker_community, records)`.

It reads `contentRules` from `artifacts/mock/mock.json` (or B11's committed snapshot, data.py):
`bannedObjects`, `stereotypeWords`, `meaningWords`, `accusingWords` and `peopleNames`. It runs on
every Lister, Tagger, Writer, Curator, Designer and Describer output and returns the words it found
and why. A text fails on:

- a banned object, a stereotype word or a meaning word ("symbolizes", "represents", 象征, 寓意 and
  their close forms),
- a People's name, or a craft, of a community other than the maker's own (`peopleNames`, and the
  techniques only other communities' pieces carry), or a nation's name used as a product word
  ("Navajo rug", "Navajo-style"),
- a word with diacritics that the records don't contain, or a greeting or a sentence in a language
  other than English and Chinese,
- for a `{en, zh}` text, a craft term that the records keep in Latin script inside Chinese
  ("churro（丘罗羊）", R19) appearing in the English but not unchanged in the Chinese.

`accusingWords` count only with `accusing=True` (B15's reports). English words match whole, with an
optional plural `s` or `es`, ignoring case. Chinese words match as substrings.
"""

from __future__ import annotations

import re
import threading
import unicodedata
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from typing import Any, Optional, Union

from server.b14_swarm import data

CJK = re.compile(r"[㐀-鿿豈-﫿]")
# Letters with marks: Latin-1 Supplement and Latin Extended letters, or combining marks.
MARKED = re.compile(r"[À-ÖØ-öø-ɏḀ-ỿ̀-ͯ]")
WORD = re.compile(r"[^\W\d_]+(?:['’][^\W\d_]+)*")
OTHER_SCRIPTS = re.compile(
    r"[Ͱ-ϿЀ-ӿ֐-׿؀-ۿऀ-ॿ฀-๿"
    r"぀-ヿᄀ-ᇿ가-힯]"
)

# Close forms of contentRules' meaning words, so "symbolize" and "represent" fail like the listed ones.
MEANING_EXTRA = (
    "symbolize",
    "symbolise",
    "symbolized",
    "symbolic",
    "symbolism",
    "represent",
    "represented",
    "representing",
    "signifies",
    "signify",
    "stands for",
    "寓意着",
    "意味着",
)

# Greetings and thanks in other languages, including the communities' own, which a reply never uses.
GREETINGS = (
    "hola",
    "bonjour",
    "salut",
    "ciao",
    "hallo",
    "guten tag",
    "buenos días",
    "buenos dias",
    "buenas",
    "gracias",
    "merci",
    "danke",
    "obrigado",
    "obrigada",
    "olá",
    "namaste",
    "konnichiwa",
    "aloha",
    "shalom",
    "ya'at'eeh",
    "yá'át'ééh",
    "ahéhee'",
    "ahehee",
    "boozhoo",
    "aaniin",
    "miigwech",
    "halito",
)

# Function words of the common Latin-script languages, for "a sentence in another language".
FOREIGN_FUNCTION = frozenset(
    "el la los las es está están por para que una del al con muy pero como esta este "
    "le les des est et pour avec dans sur une vous nous ce cette sont "
    "der das und ist nicht mit ein eine ich sie wir auf für "
    "il di che per sono della gli questo questa "
    "não você uma com são isso".split()
)
ENGLISH_FUNCTION = frozenset(
    "the a an is are was were be and or of to in on at for with by from this that these those it its "
    "i you your we our they their he she her his not can will would has have had do does".split()
)

PRODUCT_NOUNS_EXTRA = ("rug", "blanket", "jewelry", "jewellery", "pottery", "pot", "necklace", "bracelet", "design", "art", "print")
PRODUCT_NOUNS_ZH = ("地毯", "毯子", "毯", "首饰", "饰品", "珠宝", "陶器", "风格", "艺术品", "式")
STYLE_WORDS = ("style", "inspired", "made")

Text = Mapping[str, str]


@dataclass(frozen=True)
class Hit:
    word: str
    why: str  # banned_object, stereotype, meaning, accusing, other_people, other_craft, product_word,
    # diacritics, language or craft_term
    lang: str = ""


@dataclass(frozen=True)
class ContentResult:
    hits: tuple[Hit, ...] = field(default_factory=tuple)

    @property
    def ok(self) -> bool:
        return not self.hits

    def reasons(self) -> list[str]:
        """The kinds of problem found, sorted, each once."""
        return sorted({h.why for h in self.hits})

    def words(self) -> list[str]:
        return sorted({h.word for h in self.hits})

    def names_other_community(self) -> bool:
        """Whether the text names another community's People or craft (L26's case)."""
        return any(h.why in ("other_people", "other_craft") for h in self.hits)


# ---------------------------------------------------------------------------------------------
# Word matching


_pattern_cache: dict[str, re.Pattern[str]] = {}
_pattern_lock = threading.Lock()


def _word_pattern(word: str) -> re.Pattern[str]:
    with _pattern_lock:
        p = _pattern_cache.get(word)
        if p is None:
            body = r"[\s\-]+".join(re.escape(part) for part in re.split(r"[\s]+", word.strip()))
            p = re.compile(rf"(?<![^\W_]){body}(?:s|es)?(?![^\W_])", re.IGNORECASE)
            _pattern_cache[word] = p
    return p


def word_hits(text: str, words: Iterable[str]) -> list[str]:
    """The words found in the text: Chinese ones as substrings, others whole, with a plural."""
    found: list[str] = []
    for w in words:
        if not isinstance(w, str) or not w.strip():
            continue
        if CJK.search(w):
            if w in text:
                found.append(w)
        elif _word_pattern(w).search(text):
            found.append(w)
    return found


def _strings(value: Any, out: list[str]) -> list[str]:
    if isinstance(value, str):
        out.append(value)
    elif isinstance(value, Mapping):
        for v in value.values():
            _strings(v, out)
    elif isinstance(value, (list, tuple)):
        for v in value:
            _strings(v, out)
    return out


def _zh_strings(value: Any, out: list[str]) -> list[str]:
    """Every `zh` string inside a structure."""
    if isinstance(value, Mapping):
        for k, v in value.items():
            if k == "zh" and isinstance(v, str):
                out.append(v)
            else:
                _zh_strings(v, out)
    elif isinstance(value, (list, tuple)):
        for v in value:
            _zh_strings(v, out)
    return out


def _fold(word: str) -> str:
    return unicodedata.normalize("NFC", word).casefold().replace("’", "'")


# ---------------------------------------------------------------------------------------------
# What the data gives the check, derived once per dataset


@dataclass
class _Derived:
    rules: dict[str, Any]
    marked_words: frozenset[str]
    glossed_terms: tuple[str, ...]
    crafts_by_community: dict[str, frozenset[str]]
    objects: tuple[str, ...]
    community_names: tuple[str, ...]


_derived_lock = threading.Lock()
_derived: Optional[tuple[int, _Derived]] = None

GLOSS_BEFORE = re.compile(r"([A-Za-zÀ-ɏ][A-Za-zÀ-ɏ'’\-]*)\s*（")
GLOSS_INSIDE = re.compile(r"（\s*([A-Za-zÀ-ɏ][A-Za-zÀ-ɏ'’\- ]*?)\s*）")


def marked_words_in(texts: Iterable[str]) -> set[str]:
    out: set[str] = set()
    for t in texts:
        for m in WORD.finditer(t):
            if MARKED.search(m.group(0)):
                out.add(_fold(m.group(0)))
    return out


def _derive(mock: dict[str, Any]) -> _Derived:
    rules = mock.get("contentRules") if isinstance(mock.get("contentRules"), dict) else {}
    texts = _strings({k: v for k, v in mock.items() if k != "contentRules"}, [])
    glossed: set[str] = set()
    # Craft terms come from the catalog's own texts, where R19 glosses them.
    for z in _zh_strings({k: mock.get(k) for k in ("pieces", "communities")}, []):
        for m in GLOSS_BEFORE.finditer(z):
            glossed.add(m.group(1))
        for m in GLOSS_INSIDE.finditer(z):
            glossed.add(m.group(1).strip())
    crafts: dict[str, set[str]] = {}
    objects: set[str] = set()
    for p in mock.get("pieces") or []:
        if not isinstance(p, dict):
            continue
        cid = p.get("communityId")
        facets = p.get("facets") if isinstance(p.get("facets"), dict) else {}
        obj = facets.get("object", {}).get("en") if isinstance(facets.get("object"), dict) else None
        if isinstance(obj, str):
            objects.add(obj)
        # A community's craft is how it makes things (its techniques). Objects overlap across
        # communities (earrings, pendant necklaces), so they never mark another community's craft.
        if isinstance(cid, str):
            crafts.setdefault(cid, set()).update(t for t in facets.get("techniques") or [] if isinstance(t, str))
    # The communities' own names ("Diné Weaving and Silver Co-op"), which hold a nation's name
    # before a craft word without being a product word.
    names: list[str] = []
    for c in mock.get("communities") or []:
        if isinstance(c, dict) and isinstance(c.get("name"), dict):
            v = c["name"]
            names.extend(s for s in (v.get("en"), v.get("zh")) if isinstance(s, str) and s)
    return _Derived(
        rules=rules,
        marked_words=frozenset(marked_words_in(texts)),
        glossed_terms=tuple(sorted(glossed)),
        crafts_by_community={k: frozenset(v) for k, v in crafts.items()},
        objects=tuple(sorted(objects)),
        community_names=tuple(sorted(set(names), key=len, reverse=True)),
    )


def derived() -> _Derived:
    global _derived
    mock = data.mock()
    with _derived_lock:
        if _derived is not None and _derived[0] == id(mock):
            return _derived[1]
    d = _derive(mock)
    with _derived_lock:
        _derived = (id(mock), d)
    return d


def rules() -> dict[str, Any]:
    """`contentRules` from the mock data ({} when it's missing)."""
    return derived().rules


# ---------------------------------------------------------------------------------------------
# The checks


def _own_set(maker_community: Union[str, Iterable[str], None]) -> Optional[set[str]]:
    if maker_community is None:
        return None
    if isinstance(maker_community, str):
        return {maker_community}
    return {c for c in maker_community if isinstance(c, str)}


def _strip_names(text: str, names: Iterable[str]) -> str:
    for n in names:
        text = text.replace(n, " ")
    return text


def _product_hits(text: str, names: list[str], nouns: list[str]) -> list[str]:
    found: list[str] = []
    latin = [n for n in names if not CJK.search(n)]
    zh = [n for n in names if CJK.search(n)]
    if latin:
        name_alt = "|".join(re.escape(n) for n in sorted(latin, key=len, reverse=True))
        noun_alt = "|".join(r"[\s\-]+".join(re.escape(x) for x in n.split()) for n in sorted(nouns, key=len, reverse=True))
        style_alt = "|".join(STYLE_WORDS)
        pat = re.compile(
            rf"(?<![^\W_])({name_alt})(?:(?:[\s\-]+(?:{style_alt}))?[\s\-]+(?:{noun_alt})(?:s|es)?|[\s\-]+(?:style|inspired))(?![^\W_])",
            re.IGNORECASE,
        )
        found.extend(m.group(0) for m in pat.finditer(text))
    if zh:
        name_alt = "|".join(re.escape(n) for n in sorted(zh, key=len, reverse=True))
        noun_alt = "|".join(re.escape(n) for n in PRODUCT_NOUNS_ZH)
        pat = re.compile(rf"(?:{name_alt})(?:（[^）]*）)?(?:{noun_alt})")
        found.extend(m.group(0) for m in pat.finditer(text))
    return found


def _language_hits(text: str) -> list[str]:
    found: list[str] = []
    m = OTHER_SCRIPTS.search(text)
    if m:
        found.append(m.group(0))
    found.extend(word_hits(text, GREETINGS))
    for sentence in re.split(r"(?<=[.!?¡¿。！？])\s*|[\n]+", text):
        words = [w.casefold() for w in WORD.findall(sentence) if not CJK.search(w)]
        if len(words) < 3:
            continue
        foreign = sum(1 for w in words if w in FOREIGN_FUNCTION)
        english = sum(1 for w in words if w in ENGLISH_FUNCTION)
        if foreign >= 2 and foreign > english:
            found.append(sentence.strip()[:40])
    return found


def _check_one(text: str, lang: str, d: _Derived, own: Optional[set[str]], extra_marked: set[str],
               accusing: bool) -> list[Hit]:
    r = d.rules
    hits: list[Hit] = []

    def add(words: Iterable[str], why: str) -> None:
        for w in words:
            hits.append(Hit(w, why, lang))

    add(word_hits(text, r.get("bannedObjects") or []), "banned_object")
    add(word_hits(text, r.get("stereotypeWords") or []), "stereotype")
    add(word_hits(text, list(r.get("meaningWords") or []) + list(MEANING_EXTRA)), "meaning")
    if accusing:
        add(word_hits(text, r.get("accusingWords") or []), "accusing")

    people = r.get("peopleNames") if isinstance(r.get("peopleNames"), dict) else {}
    if own is not None:
        other_names = [n for cid, names in people.items() if cid != "general" and cid not in own for n in names or []]
        add(word_hits(text, other_names), "other_people")
        own_crafts = set().union(*(d.crafts_by_community.get(c, frozenset()) for c in own)) if own else set()
        other_crafts = {w for cid, ws in d.crafts_by_community.items() if cid not in own for w in ws} - own_crafts
        add(word_hits(text, sorted(other_crafts)), "other_craft")
    all_names = [n for names in people.values() for n in names or [] if isinstance(n, str)]
    nouns = list(d.objects) + list(PRODUCT_NOUNS_EXTRA)
    add(_product_hits(_strip_names(text, d.community_names), all_names, nouns), "product_word")

    allowed = d.marked_words | extra_marked
    for m in WORD.finditer(text):
        w = m.group(0)
        if MARKED.search(w) and _fold(w) not in allowed:
            hits.append(Hit(w, "diacritics", lang))

    add(_language_hits(text), "language")
    return hits


def content_check(text: Union[str, Text], maker_community: Union[str, Iterable[str], None] = None,
                  records: Any = None, *, accusing: bool = False) -> ContentResult:
    """Checks a text, or an `{en, zh}` text, against contentRules.

    `maker_community` is the maker's own community ID (or several, for a reply about pieces from
    more than one). With None, other communities' names and crafts aren't checked. `records` is the
    request's records (a dict, or anything with a `raw` dict): its words with marks count as known.
    """
    d = derived()
    own = _own_set(maker_community)
    raw = getattr(records, "raw", records)
    extra = marked_words_in(_strings(raw, [])) if raw is not None else set()
    hits: list[Hit] = []
    if isinstance(text, Mapping):
        en = text.get("en") if isinstance(text.get("en"), str) else ""
        zh = text.get("zh") if isinstance(text.get("zh"), str) else ""
        hits.extend(_check_one(en, "en", d, own, extra, accusing))
        hits.extend(_check_one(zh, "zh", d, own, extra, accusing))
        for term in d.glossed_terms:
            if word_hits(en, [term]) and term not in zh:
                hits.append(Hit(term, "craft_term", "zh"))
    else:
        hits.extend(_check_one(str(text), "", d, own, extra, accusing))
    return ContentResult(tuple(hits))
