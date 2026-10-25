"""B11's training pairs: Claude writes buyer-style queries about each piece (B11-embed.md, T3).

    python server/b11_embed/pairs.py                    # Claude when a key is set, else templates
    python server/b11_embed/pairs.py --source template  # templates only, no call
    python server/b11_embed/pairs.py --source claude --model claude-sonnet-5-5
    python server/b11_embed/pairs.py --source raw       # refilter the last Claude answers, no call

Writes `server/b11_embed/pairs.jsonl`, one training pair per line,
`{ "query", "lang", "voice", "pieceId", "negativeId" | null }`, and `pairs_meta.json`,
`{ "pairSource": "claude" | "template" | "mixed", "notes": [...], ... }`, which train.py copies into
report.json. Both are written only when the whole run finishes, each in one atomic replace. A Claude
run also keeps the accepted answers, before the filters, in `artifacts/b11/pairs_raw.json` (not
committed), so `--source raw` can rerun the filters with no new call. Every line is about the
fictional demo catalog in `src/mock/` (fix-plan 1.6), never a real person's data.

**Claude** (the default when `config.ANTHROPIC_API_KEY` is set):
- One `client.messages.parse()` call per piece, with `WrittenQueries` as `output_format`, through
  `server/config.py` only: its key, `base_url=config.CLAUDE_BASE_URL`, and a model checked against
  `config.ALLOWED_MODELS`. The first call uses `config.MODEL_FAST` (Haiku, the orchestrator's cost
  call), and a piece's one retry uses `config.MODEL_DEFAULT` (Sonnet). `max_retries=0`, a 60-second
  timeout, four calls at a time, at most two calls per piece (`--max-calls`, default 2 x pieces) and
  a 15-minute cap on the whole Claude phase (`--deadline`). No temperature, top_p, top_k, thinking
  "enabled" or prefill: Haiku runs with thinking "disabled", and Sonnet, which rejects that, with
  "between_tools", which with no tools means no thinking.
- The prompt gives the piece's index fields, its community's craft line and the other pieces'
  titles and objects. It asks for about 20 queries in nine voices, about a fifth in Chinese, plus two
  to four hard negatives, as a buyer would write them, with no facts beyond the record, never the
  title whole, and every mood, occasion or recipient query naming one concrete facet.
- Server checks: 18 to 22 queries, at least 3 Chinese, at least four voices, every negative a real
  other piece, no query over 200 characters. A failed check, a bad answer or more than four content
  drops retries that piece once, then that piece falls back to templates.
- A host that refuses (401, 403, 407) or a connection that keeps failing stops every later call,
  and the remaining pieces use templates. A model that answers 400 or 404 isn't called again.

**Templates** (`--source template`, no key, or a piece Claude couldn't do): 20 queries per piece
from its facets and vibe words with fixed English and Chinese patterns, and negatives that share the
piece's object.

**Filters**, on every query from either source, counted in `notes`:
- Content (A2-8): a `contentRules` banned object, stereotype word or meaning word, a People's name
  from `peopleNames` used as a product word ("Navajo rug", "Ojibwe-style earrings"; "by Diné
  weavers" is fine), "Indian" or "tribe" at all (S3 R1), or a URL.
- Eval leak: a query whose normalized text (lowercase, punctuation stripped, spaces collapsed)
  equals a held-out eval query's or the tour query's (figure 11), or whose `bm25.tokenize()` tokens
  are at least 80% in one. Two more near-copy rules on `leak_terms()` (`bm25.analyze()`'s English
  terms, Chinese as character bigrams): the same set, or (for a held-out query of 3 or more units)
  at least 80% of its units.
- Repeats: each query once per piece ("each anchor once per positive").
- Hard negatives (B2-6): only `looks`, `material` and `craft_term` lines get one. A candidate is
  dropped when its facets or vibe hold any of the query's motif, mood or recipient words (the
  catalog's motifs, `vibeVocabulary`, `keywordAliases`, and their Chinese words), or when every
  word of the query is a known facet word and the candidate has all of the ones the piece has (it
  answers the query as well as the piece does). Lines cycle through what's left.

Logs counts and piece IDs only, never a query or a key. The HTTP client loggers stay at WARNING.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import logging
import os
import re
import sys
import threading
import time
import unicodedata
from collections import Counter
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

if __package__ in (None, ""):  # run as a script: python server/b11_embed/pairs.py
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from pydantic import BaseModel, ConfigDict, Field, field_validator  # noqa: E402

from server import config  # noqa: E402
from server.b11_embed import bm25, compose  # noqa: E402
from server.b11_embed import data as b11data  # noqa: E402

HERE = Path(__file__).resolve().parent
PAIRS_PATH = HERE / "pairs.jsonl"
META_PATH = HERE / "pairs_meta.json"
RAW_PATH = HERE.parents[1] / "artifacts" / "b11" / "pairs_raw.json"

VOICES: tuple[str, ...] = (
    "mood", "occasion", "recipient", "looks", "material", "craft_term", "short", "long", "misspelled",
)
NEGATIVE_VOICES: frozenset[str] = frozenset({"looks", "material", "craft_term"})
LANGS = ("en", "zh")

TARGET_QUERIES = 20
MIN_QUERIES, MAX_QUERIES = 18, 22
MIN_ZH = 3
MIN_VOICES = 4
MAX_QUERY_CHARS = 200
MAX_CONTENT_DROPS = 4
MAX_NEGATIVES = 4
LEAK_SHARE = 0.8
LEAK_MIN_TERMS = 3

MODEL_FIRST = config.MODEL_FAST
MODEL_RETRY = config.MODEL_DEFAULT
CALL_TIMEOUT_S = 60.0
MAX_TOKENS = 2500
WORKERS = 4
CALLS_PER_PIECE = 2
DEADLINE_S = 900.0
STOP_AFTER_ERRORS = 6  # consecutive transport failures (timeouts, connection, 429, 5xx) before stopping
BUSY_PAUSE_S = 3.0

# Thinking per model: Haiku 5.5 takes "disabled" (B09). Sonnet 5.5 rejects it, and "between_tools"
# with no tools in the request means no thinking (B02).
THINKING: dict[str, dict[str, str]] = {
    config.MODEL_FAST: {"type": "disabled"},
    config.MODEL_DEFAULT: {"type": "between_tools"},
}

log = logging.getLogger("cindia.b11.pairs")


class PairsError(Exception):
    """The run can't go on. The message is one plain line."""


# ---------------------------------------------------------------------------------------------
# Text helpers

_CJK = re.compile(r"[㐀-䶿一-鿿豈-﫿\U00020000-\U0002ffff]")
_URL = re.compile(r"https?://|www\.|[a-z0-9-]+\.(?:com|org|net|io|co|us|shop|store)(?![^\W_])", re.IGNORECASE)
_TOKEN = re.compile(r"[^\W_]+")
_QUOTES = "\"'“”‘’「」『』"


def normalized(text: str) -> str:
    """Lowercase, punctuation stripped, spaces collapsed: the eval-leak guard's normal form, the
    same as train.normalized()."""
    text = unicodedata.normalize("NFKC", text or "").lower()
    return " ".join(re.sub(r"[^\w\s]|_", " ", text).split())


def fold(text: str) -> str:
    """NFKC, lowercase, Latin accents removed ("Diné" to "dine"). CJK characters are untouched."""
    text = unicodedata.normalize("NFKC", text or "").lower()
    decomposed = unicodedata.normalize("NFD", text)
    return unicodedata.normalize("NFC", "".join(ch for ch in decomposed if not unicodedata.combining(ch)))


def has_cjk(text: str) -> bool:
    return _CJK.search(text or "") is not None


def detect_lang(text: str) -> str:
    """zh when the text holds a CJK character, en otherwise."""
    return "zh" if has_cjk(text) else "en"


def clean_query(text: str) -> str:
    """The query as typed: whitespace collapsed, any `query:` prefix and wrapping quotes taken off."""
    text = compose.strip_prefix(" ".join(str(text or "").split()))
    while len(text) >= 2 and text[0] in _QUOTES and text[-1] in _QUOTES:
        text = text[1:-1].strip()
    return text


def _word_pattern(word: str) -> str:
    """A word or phrase as a regex on folded text: letter boundaries, an optional plural, and
    hyphens or spaces inside a phrase matching each other (as tests/data/v2-helpers.ts wordHits)."""
    parts = [re.escape(p) for p in re.split(r"[\s-]+", fold(word).strip()) if p]
    body = r"[\s-]*".join(parts)
    return rf"(?<![^\W_]){body}(?:s|es)?(?![^\W_])"


class WordList:
    """Finds the words of a list in a text: English as whole words (case and accents folded, an
    optional plural), Chinese as substrings."""

    def __init__(self, words: Iterable[str]) -> None:
        self.cjk: list[str] = []
        self._latin: list[tuple[str, re.Pattern[str]]] = []
        for w in dict.fromkeys(w for w in words if isinstance(w, str) and w.strip()):
            if has_cjk(w):
                self.cjk.append(w)
            else:
                self._latin.append((w, re.compile(_word_pattern(w))))

    def hits(self, text: str) -> list[str]:
        folded = fold(text)
        out = [w for w in self.cjk if w in text or w in folded]
        out += [w for w, rx in self._latin if rx.search(folded)]
        return out


# ---------------------------------------------------------------------------------------------
# The content filter (A2-8)

# Words that name the makers as people, so a People's name before one isn't a product word.
PERSON_WORDS: frozenset[str] = frozenset(
    """
    maker makers weaver weavers artist artists artisan artisans smith smiths silversmith silversmiths
    jeweler jewelers jeweller jewellers potter potters beader beaders beadworker beadworkers
    sewer sewers seamstress seamstresses quilter quilters craftsperson craftspeople craftsman
    craftsmen craftswoman craftswomen woman women man men people person family families
    community communities co op coop cooperative collective nation nations member members
    grandmother grandmothers elder elders hands
    """.split()
)
# A People's name followed by one of these is always a product word.
PRODUCT_TAILS: frozenset[str] = frozenset({"style", "styled", "inspired", "made", "look", "looking", "design", "designs", "type"})
# Words before a name at the end of a query that make it about people or a place, not a product.
END_LEADS: frozenset[str] = frozenset({"by", "from", "of", "in", "at", "the", "a", "an", "among", "with"})
# Chinese words for makers, groups and places that may follow a People's name, after an optional 的.
ZH_PERSON_WORDS: tuple[str, ...] = (
    "族", "人", "匠", "工匠", "织工", "织女", "银匠", "陶艺人", "陶艺家", "陶工", "艺人", "手艺人", "艺术家",
    "合作社", "社区", "保留区", "妇女", "女性", "家庭", "民族", "制作者", "创作者", "成员", "手工艺人", "工艺人",
    "工艺师", "设计师",
)
ZH_END_LEADS: tuple[str, ...] = ("来自", "出自", "由")
# S3 R1: never "Indian" as our word for a people, never "tribe" as a product word. Queries are our
# words, so neither appears in one at all.
ALWAYS_DROP: tuple[str, ...] = ("indian", "tribe")


class ContentFilter:
    """Drops a query that breaks `contentRules` (S3-catalog R28): a banned object, a stereotype word,
    a meaning word, a People's name used as a product word, "Indian" or "tribe", or a URL."""

    def __init__(self, rules: Mapping[str, Any]) -> None:
        self.lists = {
            "banned": WordList(rules.get("bannedObjects") or []),
            "stereotype": WordList(rules.get("stereotypeWords") or []),
            "meaning": WordList(rules.get("meaningWords") or []),
            "always": WordList(ALWAYS_DROP),
        }
        names: list[str] = []
        people = rules.get("peopleNames") or {}
        if isinstance(people, Mapping):
            for group in people.values():
                names.extend(n for n in group or [] if isinstance(n, str) and n.strip())
        self.names = sorted(dict.fromkeys(names), key=len, reverse=True)
        latin = [fold(n) for n in self.names if not has_cjk(n)]
        self._latin_names = sorted(dict.fromkeys(latin), key=len, reverse=True)
        self._name_words = {w for n in self._latin_names for w in _TOKEN.findall(n)}
        self._cjk_names = [n for n in self.names if has_cjk(n)]
        self._latin_rx = (
            re.compile(r"(?<![^\W_])(?:" + "|".join(re.escape(n) for n in self._latin_names) + r")(?![^\W_])")
            if self._latin_names
            else None
        )

    def product_word_hits(self, text: str) -> list[str]:
        """The People's names the text uses as a product word."""
        out: list[str] = []
        folded = fold(text)
        if self._latin_rx is not None:
            for m in self._latin_rx.finditer(folded):
                if self._latin_is_product(folded, m.start(), m.end()):
                    out.append(m.group(0))
        for name in self._cjk_names:
            start = text.find(name)
            while start >= 0:
                if self._cjk_is_product(text, start, start + len(name)):
                    out.append(name)
                    break
                start = text.find(name, start + 1)
        return out

    def _latin_is_product(self, folded: str, start: int, end: int) -> bool:
        tail = re.sub(r"^[\W_]+", "", folded[end:])
        if tail and has_cjk(tail[0]):  # a Latin name inside Chinese text: "纳瓦霍（Diné）织工"
            if tail.startswith("的"):
                tail = tail[1:]
            return not tail.startswith(ZH_PERSON_WORDS)
        after = _TOKEN.findall(folded[end:])
        while after and after[0] in self._name_words:
            after = after[1:]
        if after:
            word = after[0]
            if word in PRODUCT_TAILS:
                return True
            return word not in PERSON_WORDS
        before = _TOKEN.findall(folded[:start])
        return not (before and before[-1] in END_LEADS)

    def _cjk_is_product(self, text: str, start: int, end: int) -> bool:
        rest = text[end:]
        while True:
            rest = rest.lstrip()
            m = re.match(r"^[（(][^）)]*[）)]", rest)
            if m:
                rest = rest[m.end():]
                continue
            name = next((n for n in self._cjk_names if rest.startswith(n)), None)
            if name:
                rest = rest[len(name):]
                continue
            break
        rest = rest.lstrip()
        if not rest or not has_cjk(rest[0]):
            before = text[:start].rstrip()
            if not rest and before.endswith(ZH_END_LEADS):
                return False
            return True
        if rest.startswith("的"):
            rest = rest[1:]
        return not rest.startswith(ZH_PERSON_WORDS)

    def hits(self, text: str) -> list[tuple[str, str]]:
        """Every (kind, word) the text breaks, empty when it's clean."""
        out = [(kind, w) for kind, wl in self.lists.items() for w in wl.hits(text)]
        out += [("people", n) for n in self.product_word_hits(text)]
        if _URL.search(text or ""):
            out.append(("url", "url"))
        return out

    def ok(self, text: str) -> bool:
        return not self.hits(text)


# ---------------------------------------------------------------------------------------------
# The eval-leak guard


@dataclass(frozen=True)
class Held:
    label: str
    norm: str
    tokens: frozenset[str]
    terms: frozenset[str]


_CJK_RUN = re.compile(r"[㐀-䶿一-鿿豈-﫿\U00020000-\U0002ffff]+")


def leak_terms(text: str) -> set[str]:
    """The units the near-copy rules compare: bm25.analyze()'s English terms, and for each run of
    Chinese characters its character bigrams (a lone character as itself), which sit closer to
    English words than single characters do. "蓝黄拼布裙" and "蓝白拼布裙" share 2 of 4 bigrams,
    where they'd share 4 of 5 characters."""
    out = {t for t in bm25.analyze(text) if not bm25.is_cjk(t)}
    for run in _CJK_RUN.findall(unicodedata.normalize("NFKC", text or "")):
        out |= {run} if len(run) == 1 else {run[i : i + 2] for i in range(len(run) - 1)}
    return out


class LeakGuard:
    """Keeps the held-out eval queries and the tour query (and near-copies of them) out of training.

    The plan's two rules: the normalized texts are equal, or at least 80% of the query's
    `bm25.tokenize()` tokens (words, single Chinese characters) are in the held query. Two more
    near-copy rules on `leak_terms()`: the same set, or, for a held query of three or more units,
    at least 80% of its units in the query (it holds the held query with a word or two added)."""

    def __init__(self, held: Iterable[tuple[str, str]]) -> None:
        self.held: list[Held] = []
        self._by_norm: dict[str, str] = {}
        for label, text in held:
            if not isinstance(text, str) or not text.strip():
                continue
            h = Held(label, normalized(text), frozenset(bm25.tokenize(text)), frozenset(leak_terms(text)))
            self.held.append(h)
            self._by_norm.setdefault(h.norm, label)

    @classmethod
    def from_data(cls, data: b11data.Data) -> "LeakGuard":
        held = [(str(q.get("id") or f"eval query {n}"), q.get("text")) for n, q in enumerate(data.eval, start=1)]
        if data.demo_query and isinstance(data.demo_query.get("text"), str):
            held.append(("the tour query", data.demo_query["text"]))
        return cls(held)

    def match(self, text: str) -> tuple[str, str] | None:
        """(held label, rule) for the first held query the text copies or nearly copies, else None."""
        norm = normalized(text)
        if norm in self._by_norm:
            return self._by_norm[norm], "equal"
        tokens = set(bm25.tokenize(text))
        terms = leak_terms(text)
        for h in self.held:
            if tokens and len(tokens & h.tokens) / len(tokens) >= LEAK_SHARE:
                return h.label, "tokens"
            if terms and terms == h.terms:
                return h.label, "terms"
            if len(h.terms) >= LEAK_MIN_TERMS and len(terms & h.terms) / len(h.terms) >= LEAK_SHARE:
                return h.label, "contains"
        return None


# ---------------------------------------------------------------------------------------------
# Vocabulary: facet and vibe words in English and Chinese

ZH_COLORS = {
    "grey": "灰", "gray": "灰", "red": "红", "black": "黑", "silver": "银色", "brown": "棕", "white": "白",
    "indigo": "靛蓝", "turquoise": "绿松石色", "pink": "粉", "green": "绿", "blue": "蓝", "yellow": "黄",
    "purple": "紫", "orange": "橙", "cream": "米白", "navy": "藏青", "teal": "青绿", "gold": "金",
    "tan": "棕褐", "beige": "米色", "rust": "铁锈红",
}
ZH_MATERIALS = {
    "wool": "羊毛", "silver": "银", "turquoise": "绿松石", "glass beads": "玻璃珠", "leather": "皮革",
    "thread": "线", "cloth": "布", "clay": "陶土", "slip": "泥浆", "paint": "颜料", "cotton": "棉布",
    "rickrack": "波浪花边",
}
ZH_TECHNIQUES = {
    "handwoven": "手工编织", "hand-stamped": "手工压花", "hand-spun": "手纺", "hand-dyed": "手工染色",
    "soldered": "焊接", "stone setting": "镶石", "beadwork": "串珠", "hand-stitched": "手工缝制",
    "loom-woven": "织机编织", "coil-built": "盘筑", "stone-polished": "石头打磨", "hand-painted": "手绘",
    "patchwork": "拼布", "machine-sewn": "机缝",
}
ZH_MOTIFS = {
    "diamond": "菱形", "step": "阶梯", "dot": "圆点", "band": "条带", "stripe": "条纹", "zigzag": "锯齿",
    "chevron": "人字纹", "line": "线条", "flower": "花", "bud": "花苞", "leaf": "叶", "vine": "藤蔓",
    "berry": "浆果", "geometric": "几何", "fine line": "细线", "square": "方块", "triangle": "三角",
}
ZH_MOODS = {
    "warm": "温暖", "bold": "醒目", "calm": "宁静", "bright": "明亮", "cheerful": "欢快", "quiet": "安静",
    "earthy": "质朴", "playful": "俏皮", "elegant": "优雅", "soft": "柔和",
}
ZH_OCCASIONS = {
    "birthday": "生日", "housewarming": "乔迁", "thank you": "感谢", "holiday": "节日", "everyday": "日常",
}
ZH_RECIPIENTS = {
    "gift for mom": "妈妈", "gift for dad": "爸爸", "gift for a friend": "朋友", "gift for a sister": "姐妹",
    "for myself": "自己",
}
# More words a buyer uses for a recipient, beside keywordAliases (mom, mother, mum, dad, father).
EXTRA_RECIPIENT_WORDS = {
    "friend": "gift for a friend", "bestie": "gift for a friend", "sister": "gift for a sister",
    "sis": "gift for a sister", "myself": "for myself", "mama": "gift for mom", "mommy": "gift for mom",
    "papa": "gift for dad", "daddy": "gift for dad",
}
ZH_RECIPIENT_WORDS = {
    "妈妈": "gift for mom", "母亲": "gift for mom", "老妈": "gift for mom", "爸爸": "gift for dad",
    "父亲": "gift for dad", "老爸": "gift for dad", "朋友": "gift for a friend", "闺蜜": "gift for a friend",
    "姐姐": "gift for a sister", "妹妹": "gift for a sister", "姐妹": "gift for a sister", "自己": "for myself",
}
ZH_EXTRA_MOODS = {"温馨": "warm", "暖": "warm", "大胆": "bold", "平静": "calm", "安静": "quiet", "活泼": "playful", "淡雅": "soft"}
ZH_EXTRA_MOTIFS = {"花朵": "flower", "花卉": "flower", "叶子": "leaf", "条纹": "stripe", "点点": "dot", "波点": "dot", "锯齿纹": "zigzag"}
# Words that carry no facet. A query made only of these and known facet words is "fully known".
FILLER_EN: frozenset[str] = frozenset(
    bm25.stem(w)
    for w in """
    something gift gifts present presents piece pieces pattern patterns looking look want need like likes
    love loves feel feels would nice one pair set ideally im id maybe please made make give giving
    treat buy get find shop color colors colour colours colored coloured design designs style kind
    """.split()
)
FILLER_ZH: tuple[str, ...] = (
    "送给", "送", "给", "的", "图案", "一个", "一只", "一条", "一件", "一对", "一副", "想要", "想买", "适合",
    "和", "与", "色", "款", "礼物", "风格", "做的", "手工",
)
# Plurals that don't just add s or es.
IRREGULAR_PLURALS = {"leaf": "leaves", "knife": "knives", "shelf": "shelves"}
CATS = ("object", "color", "material", "technique", "motif", "mood", "occasion", "recipient")
FACET_CATS = ("object", "color", "material", "technique", "motif")
SENSITIVE_CATS = ("motif", "mood", "recipient")


def _uniq(values: Iterable[Any]) -> list[str]:
    return list(dict.fromkeys(v for v in values if isinstance(v, str) and v.strip()))


def piece_terms(piece: Mapping[str, Any]) -> dict[str, set[str]]:
    """A piece's facet and vibe words by category, in English."""
    facets = piece.get("facets") or {}
    vibe = piece.get("vibe") or {}
    obj = facets.get("object") or {}
    return {
        "object": {obj.get("en")} if isinstance(obj, Mapping) and isinstance(obj.get("en"), str) else set(),
        "color": set(_uniq(facets.get("colors") or [])),
        "material": set(_uniq(facets.get("materials") or [])),
        "technique": set(_uniq(facets.get("techniques") or [])),
        "motif": set(_uniq(facets.get("motifs") or [])),
        "mood": set(_uniq(vibe.get("moods") or [])),
        "occasion": set(_uniq(vibe.get("occasions") or [])),
        "recipient": set(_uniq(vibe.get("recipients") or [])),
    }


class Vocab:
    """The catalog's facet and vibe words, found in a query in English or Chinese."""

    def __init__(self, data: b11data.Data) -> None:
        en: dict[str, set[str]] = {c: set() for c in CATS}
        self.pieces: dict[str, dict[str, set[str]]] = {}
        zh_objects: dict[str, str] = {}
        for pid, piece in data.pieces.items():
            terms = piece_terms(piece)
            self.pieces[pid] = terms
            for c in CATS:
                en[c] |= terms[c]
            obj = (piece.get("facets") or {}).get("object") or {}
            if isinstance(obj, Mapping) and isinstance(obj.get("zh"), str) and isinstance(obj.get("en"), str):
                zh_objects[obj["zh"]] = obj["en"]
        vv = data.vibe_vocabulary
        for c, key in (("mood", "moods"), ("occasion", "occasions"), ("recipient", "recipients")):
            en[c] |= set(_uniq(vv.get(key) or []))
        self.en = en
        # (category, canonical English term) for each English word or phrase that names it.
        latin: list[tuple[str, str, str]] = [(c, t, t) for c in CATS for t in en[c] if c != "recipient"]
        latin += [(c, t, IRREGULAR_PLURALS[t]) for c in CATS for t in en[c] if t in IRREGULAR_PLURALS]
        aliases = {**{k: v for k, v in data.aliases.items() if isinstance(k, str) and isinstance(v, str)}, **EXTRA_RECIPIENT_WORDS}
        for word, canon in aliases.items():
            if canon in en["recipient"] or canon in ZH_RECIPIENTS:
                latin.append(("recipient", canon, word))
        self._latin = [(c, canon, word, re.compile(_word_pattern(word))) for c, canon, word in latin]
        zh: list[tuple[str, str, str]] = []
        for c, table in (("color", ZH_COLORS), ("material", ZH_MATERIALS), ("technique", ZH_TECHNIQUES), ("motif", ZH_MOTIFS),
                         ("mood", ZH_MOODS), ("occasion", ZH_OCCASIONS)):
            zh += [(c, canon, word) for canon, word in table.items()]
        zh += [("recipient", canon, word) for word, canon in ZH_RECIPIENT_WORDS.items()]
        zh += [("mood", canon, word) for word, canon in ZH_EXTRA_MOODS.items()]
        zh += [("motif", canon, word) for word, canon in ZH_EXTRA_MOTIFS.items()]
        zh += [("object", canon, word) for word, canon in zh_objects.items()]
        self._zh = sorted(zh, key=lambda t: len(t[2]), reverse=True)

    def terms(self, text: str) -> dict[str, set[str]]:
        """The facet and vibe words a query names, by category, as canonical English terms."""
        out: dict[str, set[str]] = {c: set() for c in CATS}
        folded = fold(text)
        for c, canon, _word, rx in self._latin:
            if rx.search(folded):
                out[c].add(canon)
        if has_cjk(text):
            for c, canon, word in self._zh:
                if word in text:
                    out[c].add(canon)
        return out

    def fully_known(self, text: str) -> bool:
        """True when every word of the query is a known facet or vibe word or a filler word."""
        if has_cjk(text):
            rest = text
            for _c, _canon, word in self._zh:
                rest = rest.replace(word, " ")
            for word in sorted(FILLER_ZH, key=len, reverse=True):
                rest = rest.replace(word, " ")
            rest = re.sub(r"[\W_]+", "", rest)
            return rest == ""
        covered: set[str] = set()
        folded = fold(text)
        for _c, _canon, word, rx in self._latin:
            if rx.search(folded):
                covered |= {bm25.stem(t) for t in bm25.tokenize(word)}
        words = bm25.analyze(text)
        return bool(words) and all(w in covered or w in FILLER_EN for w in words)


class NegativeFilter:
    """Picks the hard negatives a query may keep (B2-6)."""

    def __init__(self, vocab: Vocab) -> None:
        self.vocab = vocab

    def keep(self, text: str, voice: str, piece_id: str, candidates: Sequence[str]) -> tuple[list[str], int]:
        """(the candidates this query keeps, how many it dropped). A voice outside looks, material and
        craft_term keeps none and drops none: it relies on in-batch negatives."""
        if voice not in NEGATIVE_VOICES or not candidates:
            return [], 0
        q = self.vocab.terms(text)
        sensitive = set().union(*(q[c] for c in SENSITIVE_CATS))
        pos = self.vocab.pieces.get(piece_id) or {c: set() for c in CATS}
        named = [(c, t) for c in FACET_CATS for t in q[c] if t in pos[c]]
        full = bool(named) and self.vocab.fully_known(text)
        kept: list[str] = []
        dropped = 0
        for neg in candidates:
            nt = self.vocab.pieces.get(neg) or {c: set() for c in CATS}
            if sensitive & set().union(*nt.values()):
                dropped += 1
                continue
            if full and all(t in nt[c] for c, t in named):
                dropped += 1
                continue
            kept.append(neg)
        return kept, dropped


# ---------------------------------------------------------------------------------------------
# What Claude returns


class WrittenQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(description="The query, exactly as the shopper would type it")
    lang: Literal["en", "zh"] = Field(description="en for English, zh for simplified Chinese")
    voice: Literal["mood", "occasion", "recipient", "looks", "material", "craft_term", "short", "long", "misspelled"]

    @field_validator("lang", "voice", mode="before")
    @classmethod
    def _lowercase(cls, value: Any) -> Any:
        # Structured outputs don't guarantee an enum value's case.
        return value.strip().lower() if isinstance(value, str) else value


class WrittenQueries(BaseModel):
    model_config = ConfigDict(extra="forbid")

    queries: list[WrittenQuery] = Field(description="About 20 queries for this piece")
    hard_negative_ids: list[str] = Field(description="Two to four IDs of other pieces a careless search would confuse with this one")


# ---------------------------------------------------------------------------------------------
# The prompt

SYSTEM_PROMPT = """You write search queries for training a search model for Cindia, a demo marketplace of handmade pieces. Every piece, maker and community in the catalog is fictional. The crafts are real traditions.

Each query is what a shopper might type into the shop's search box when the piece you're given is the one they want.

Rules for every query:
- Write as a buyer would: plain, everyday words, sometimes casual. No marketing copy.
- Use no facts beyond the record you're given. Don't invent sizes, prices, uses, places or history.
- Never quote the piece's title whole.
- Every mood, occasion or recipient query also names one concrete facet of the piece: its object, one of its colors or one of its materials.
- Leave out the names of nations and peoples. Never put one before an object or a craft (no "<name> rug", "<name>-style earrings" or "<name> pottery").
- Never use any of these words: {avoid}.
- Chinese queries are simplified Chinese, written the way a Chinese-speaking shopper would type them, not translations of the English ones.
- Keep every query under 150 characters."""

VOICE_GUIDE = """- mood: a feeling from its moods, plus one concrete facet
- occasion: an occasion from its occasions, plus one concrete facet
- recipient: who it's for, from its "for" list, plus one concrete facet
- looks: what it looks like: colors, motifs, shape
- material: what it's made of
- craft_term: a craft or technique word from the record
- short: two or three words
- long: one full sentence of 15 to 30 words describing what the shopper wants
- misspelled: a quick query with one or two realistic typos"""


def _line(label: str, values: Iterable[str]) -> str | None:
    vals = _uniq(values)
    return f"- {label}: {', '.join(vals)}" if vals else None


def build_prompt(data: b11data.Data, piece_id: str) -> str:
    """The user turn for one piece: its index fields, its community's craft line and the other pieces."""
    piece = data.piece(piece_id)
    community = data.community_of(piece_id)
    entry = next(e for e in data.index if e["pieceId"] == piece_id)
    facets = piece.get("facets") or {}
    vibe = piece.get("vibe") or {}
    obj = facets.get("object") or {}
    title = piece.get("title") or {}
    craft = (community.get("craft") or {}).get("en") or ""
    note = entry.get("pictureNote") or {}
    lines = [f"The piece, {piece_id}:"]
    lines.append(f"- object: {obj.get('en', '')} (in Chinese: {obj.get('zh', '')})")
    lines.append(f"- title (never quote it whole): {title.get('en', '')} / {title.get('zh', '')}")
    if craft:
        lines.append(f"- the community's craft: {craft}")
    for label, values in (
        ("materials", facets.get("materials") or []),
        ("techniques", facets.get("techniques") or []),
        ("motifs", facets.get("motifs") or []),
        ("colors", facets.get("colors") or []),
        ("moods", vibe.get("moods") or []),
        ("occasions", vibe.get("occasions") or []),
        ("for", vibe.get("recipients") or []),
    ):
        row = _line(label, values)
        if row:
            lines.append(row)
    sentence = compose.first_sentence((piece.get("story") or {}).get("en") or "")
    if sentence:
        lines.append(f"- description: {sentence}")
    if isinstance(note, Mapping) and note.get("en"):
        lines.append(f"- picture: {note['en']}")
    lines.append("")
    lines.append(
        f"Write exactly {TARGET_QUERIES} queries for this piece, no more and no fewer: 16 in English (lang \"en\") "
        f"and 4 in Chinese (lang \"zh\")."
    )
    lines.append("Mix the voices, about two of each, and vary the wording so no two queries are alike:")
    lines.append(VOICE_GUIDE)
    lines.append("")
    lines.append(
        "Then give hard_negative_ids: two to four IDs from the list below of other pieces a careless search "
        "would confuse with this one, such as the same object in another craft, or the same colors on a similar object."
    )
    lines.append("")
    lines.append("The other pieces (ID: title, object):")
    for e in data.index:
        pid = e["pieceId"]
        if pid == piece_id:
            continue
        other = data.piece(pid)
        o_title = (other.get("title") or {}).get("en") or ""
        o_obj = ((other.get("facets") or {}).get("object") or {}).get("en") or ""
        lines.append(f"{pid}: {o_title}, {o_obj}")
    return "\n".join(lines)


def system_prompt(rules: Mapping[str, Any]) -> str:
    avoid = _uniq(
        [*(rules.get("bannedObjects") or []), *(rules.get("stereotypeWords") or []), *(rules.get("meaningWords") or []), *ALWAYS_DROP]
    )
    return SYSTEM_PROMPT.replace("{avoid}", ", ".join(avoid))


# ---------------------------------------------------------------------------------------------
# Candidates and checks


@dataclass
class Candidate:
    text: str
    lang: str
    voice: str


@dataclass
class Attempt:
    model: str
    ok: bool
    reason: str | None
    candidates: list[Candidate] = field(default_factory=list)
    negatives: list[str] = field(default_factory=list)
    content_drops: list[tuple[str, str]] = field(default_factory=list)  # (kind, word), one per query
    kept: list[Candidate] = field(default_factory=list)


def check_output(out: WrittenQueries, piece_id: str, known: set[str]) -> tuple[list[str], list[Candidate], list[str]]:
    """(problems, the cleaned queries, the negatives) for one answer. No problems means it passes."""
    problems: list[str] = []
    cands: list[Candidate] = []
    for q in out.queries:
        text = clean_query(q.text)
        if not text:
            continue
        cands.append(Candidate(text=text, lang=detect_lang(text), voice=q.voice))
    if not MIN_QUERIES <= len(cands) <= MAX_QUERIES:
        problems.append(f"{len(cands)} queries, expected {MIN_QUERIES} to {MAX_QUERIES}")
    zh = sum(1 for c in cands if c.lang == "zh")
    if zh < MIN_ZH:
        problems.append(f"{zh} Chinese queries, expected at least {MIN_ZH}")
    voices = len({c.voice for c in cands})
    if voices < MIN_VOICES:
        problems.append(f"{voices} voices, expected at least {MIN_VOICES}")
    long_ = sum(1 for c in cands if len(c.text) > MAX_QUERY_CHARS)
    if long_:
        problems.append(f"{long_} queries over {MAX_QUERY_CHARS} characters")
    negs: list[str] = []
    for raw in out.hard_negative_ids:
        nid = str(raw or "").strip()
        if nid not in known or nid == piece_id:
            problems.append("a hard negative that isn't another piece")
            break
        if nid not in negs:
            negs.append(nid)
    return problems, cands, negs[:MAX_NEGATIVES]


def screen(cands: Sequence[Candidate], content: ContentFilter) -> tuple[list[Candidate], list[tuple[str, str]]]:
    """(the queries the content filter keeps, one (kind, word) per query it drops)."""
    kept: list[Candidate] = []
    drops: list[tuple[str, str]] = []
    for c in cands:
        hits = content.hits(c.text)
        if hits:
            drops.append(hits[0])
        else:
            kept.append(c)
    return kept, drops


# ---------------------------------------------------------------------------------------------
# Templates


def _plural(noun: str) -> str:
    if noun in IRREGULAR_PLURALS:
        return IRREGULAR_PLURALS[noun]
    if noun.endswith("s"):
        return noun
    if noun.endswith(("x", "ch", "sh")):
        return noun + "es"
    if noun.endswith("y") and len(noun) > 2 and noun[-2] not in "aeiou":
        return noun[:-1] + "ies"
    return noun + "s"


def _article(phrase: str) -> str:
    if phrase.endswith("s") and not phrase.endswith("ss"):
        return phrase  # earrings, a plural object
    return ("an " if phrase[:1] in "aeiou" else "a ") + phrase


def _pick(values: Sequence[str], i: int) -> str | None:
    return values[i % len(values)] if values else None


RECIPIENT_EN = {
    "gift for mom": "my mom", "gift for dad": "my dad", "gift for a friend": "a friend",
    "gift for a sister": "my sister", "for myself": "myself",
}
OCCASION_EN = {
    "birthday": "birthday present", "housewarming": "housewarming gift", "thank you": "thank you gift",
    "holiday": "holiday gift", "everyday": "something for every day",
}
OCCASION_FOR = {
    "birthday": "for a birthday", "housewarming": "for a housewarming", "thank you": "to say thank you",
    "holiday": "for the holidays", "everyday": "for every day",
}


def misspell(phrase: str, n: int) -> str:
    """One deterministic typo in the phrase's longest word: a doubled letter made single, two inner
    letters swapped, or an inner vowel dropped, whichever applies first from rule n."""
    words = phrase.split(" ")
    idx = max(range(len(words)), key=lambda i: len(words[i]))
    w = words[idx]

    def single(x: str) -> str | None:
        for i in range(1, len(x)):
            if x[i] == x[i - 1] and x[i].isalpha():
                return x[:i] + x[i + 1:]
        return None

    def swap(x: str) -> str | None:
        if len(x) < 5:
            return None
        i = len(x) // 2
        return x[: i - 1] + x[i] + x[i - 1] + x[i + 1:] if x[i] != x[i - 1] else None

    def vowel(x: str) -> str | None:
        for i in range(len(x) - 2, 0, -1):
            if x[i] in "aeiou":
                return x[:i] + x[i + 1:]
        return None

    rules = (single, swap, vowel)
    for k in range(3):
        out = rules[(n + k) % 3](w)
        if out and out != w:
            words[idx] = out
            return " ".join(words)
    return phrase + phrase[-1]


def _state(community: Mapping[str, Any]) -> str | None:
    place = (community.get("place") or {}).get("en") or ""
    parts = [p.strip() for p in place.split(",") if p.strip()]
    if len(parts) >= 2:
        return parts[-2]
    return parts[0] if parts else None


def template_queries(data: b11data.Data, piece_id: str) -> list[Candidate]:
    """About 20 queries from the piece's facets and vibe words, 16 English and 4 Chinese patterns."""
    piece = data.piece(piece_id)
    facets = piece.get("facets") or {}
    vibe = piece.get("vibe") or {}
    obj_t = facets.get("object") or {}
    obj = obj_t.get("en") or "piece"
    objz = obj_t.get("zh") or ""
    colors = _uniq(facets.get("colors") or [])
    mats = _uniq(facets.get("materials") or [])
    techs = _uniq(facets.get("techniques") or [])
    motifs = _uniq(facets.get("motifs") or [])
    moods = _uniq(vibe.get("moods") or [])
    occs = _uniq(vibe.get("occasions") or [])
    recs = _uniq(vibe.get("recipients") or [])
    n = int(re.sub(r"\D", "", piece_id) or 0)
    c0, c1 = _pick(colors, 0), _pick(colors, 1)
    m0, m1 = _pick(moods, 0), _pick(moods, 1)
    o0, o1 = _pick(occs, 0), _pick(occs, 1)
    r0, r1 = _pick(recs, 0), _pick(recs, 1)
    ma0, mo0, mo1 = _pick(mats, 0), _pick(motifs, 0), _pick(motifs, 1)
    t0, t1 = _pick(techs, 0), _pick(techs, -1)
    state = _state(data.community_of(piece_id))
    colored = f"{c0} {obj}" if c0 else obj
    out: list[tuple[str, str]] = []

    def add(voice: str, text: str | None) -> None:
        if text:
            out.append((voice, " ".join(text.split())))

    if m0:
        add("mood", f"something {m0}, {_article(colored)}")
    if m1:
        feels = "feel" if _article(obj) == obj else "feels"
        add("mood", f"{_article(f'{m1} {obj}')} that {feels} {m0}" if m0 != m1 else f"{_article(f'{m1} {obj}')}")
    if o0:
        add("occasion", f"{OCCASION_EN.get(o0, o0 + ' gift')}, {_article(colored)}")
    if o1 or o0:
        o = o1 or o0
        add("occasion", f"{ma0 + ' ' if ma0 else ''}{obj} {OCCASION_FOR.get(o, 'for a ' + o)}")
    if r0:
        who = RECIPIENT_EN.get(r0, r0)
        add("recipient", f"{_article(f'{m0} {obj}') if m0 else _article(obj)} for {who}")
    if r1 or r0:
        r = r1 or r0
        if r == "for myself":
            add("recipient", f"treat myself to {_article(colored)}")
        else:
            add("recipient", f"gift for {RECIPIENT_EN.get(r, r)}, {_article(f'{c1} {obj}') if c1 else _article(obj)}")
    if c0:
        add("looks", f"{c0} and {c1} {obj}" if c1 and c1 != c0 else colored)
    if mo0:
        add("looks", f"{obj} with {_article(mo0)} pattern")
    if mo1 or mo0:
        add("looks", f"{_pick(colors, -1) + ' ' if colors else ''}{obj} with {_plural(mo1 or mo0)}")
    if ma0:
        add("material", f"{ma0} {obj}")
    if mats:
        add("material", f"{' and '.join(mats[:2])} {obj}{' from ' + state if state else ''}")
    if t0:
        add("craft_term", f"{t0} {obj}")
    if t1 and (t1 != t0 or len(mats) > 1):
        add("craft_term", f"{t1} {mats[0]} {obj}" if mats else f"{t1} {_plural(obj)}")
    add("short", f"{mo0} {obj}" if mo0 else _plural(obj))
    if m0 and o0 and r0:
        add(
            "long",
            f"I'm looking for {_article(f'{m0} {obj}')} in {c0 or 'warm colors'} as a {OCCASION_EN.get(o0, o0)} "
            f"for {RECIPIENT_EN.get(r0, r0)}{', ideally ' + t0 if t0 else ''}",
        )
    add("misspelled", misspell(colored, n))
    # Chinese
    if objz:
        if m0 and m0 in ZH_MOODS:
            add("mood", f"{ZH_MOODS[m0]}的{ZH_COLORS.get(c0 or '', '')}{'色' if c0 in ZH_COLORS and not ZH_COLORS[c0].endswith('色') else ''}{objz}")
        if r0 and r0 in ZH_RECIPIENTS:
            add("recipient", f"送给{ZH_RECIPIENTS[r0]}的{objz}")
        if ma0 and ma0 in ZH_MATERIALS:
            add("material", f"{ZH_MATERIALS[ma0]}{objz}")
        if mo0 and mo0 in ZH_MOTIFS:
            add("looks", f"{ZH_MOTIFS[mo0]}图案的{objz}")
        elif t0 and t0 in ZH_TECHNIQUES:
            add("craft_term", f"{ZH_TECHNIQUES[t0]}{objz}")
    seen: set[str] = set()
    cands: list[Candidate] = []
    for voice, text in out:
        key = normalized(text)
        if key and key not in seen:
            seen.add(key)
            cands.append(Candidate(text=text, lang=detect_lang(text), voice=voice))
    return cands


def template_negatives(data: b11data.Data, piece_id: str) -> list[str]:
    """The other pieces with the same object, in ID order (the template source's negatives)."""
    obj = ((data.piece(piece_id).get("facets") or {}).get("object") or {}).get("en")
    return [
        pid for pid in data.piece_ids()
        if pid != piece_id and ((data.piece(pid).get("facets") or {}).get("object") or {}).get("en") == obj
    ]


# ---------------------------------------------------------------------------------------------
# Claude


def make_client() -> Any:
    """An Anthropic client holding the key from server/config.py, with no retries of its own."""
    from anthropic import Anthropic

    return Anthropic(
        api_key=config.ANTHROPIC_API_KEY, base_url=config.CLAUDE_BASE_URL, timeout=CALL_TIMEOUT_S, max_retries=0
    )


def require_model(model: str) -> str:
    if model not in config.ALLOWED_MODELS:
        raise PairsError(f"{model!r} isn't one of the platform's models ({', '.join(sorted(config.ALLOWED_MODELS))})")
    return model


def call_claude(client: Any, model: str, system: str, prompt: str) -> Any:
    """One parse() call. No temperature, top_p, top_k, thinking "enabled" or prefill."""
    return client.messages.parse(
        model=require_model(model),
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        output_format=WrittenQueries,
        thinking=THINKING.get(model, {"type": "between_tools"}),
        timeout=CALL_TIMEOUT_S,
    )


def classify(exc: BaseException) -> str:
    """What a failed call means for the run: refused, bad_request, busy, timeout, connection,
    invalid_output or error."""
    try:
        import anthropic
    except ImportError:  # pragma: no cover - the SDK is in server/requirements.txt
        return "error"
    from pydantic import ValidationError

    if isinstance(exc, (anthropic.AuthenticationError, anthropic.PermissionDeniedError)):
        return "refused"
    if isinstance(exc, anthropic.APIStatusError):
        code = getattr(exc, "status_code", None)
        if code in (401, 403, 407):
            return "refused"
        if code in (400, 404, 422):
            return "bad_request"
        return "busy"
    if isinstance(exc, anthropic.APITimeoutError):
        return "timeout"
    if isinstance(exc, anthropic.APIConnectionError):
        return "connection"
    if isinstance(exc, (ValidationError, ValueError, anthropic.APIResponseValidationError)):
        return "invalid_output"
    return "error"


class Budget:
    """The run's limits on Claude, shared by the worker threads: the call cap, the deadline, the
    stop after a refusal or repeated failures, and models that answered 400 or 404."""

    def __init__(self, max_calls: int, deadline_s: float, now: Callable[[], float] = time.monotonic) -> None:
        self.max_calls = max_calls
        self._now = now
        self._end = now() + deadline_s
        self._lock = threading.Lock()
        self.calls = 0
        self.errors_in_a_row = 0
        self.stopped: str | None = None
        self.bad_models: set[str] = set()
        self.usage = {"inputTokens": 0, "outputTokens": 0}
        self.by_model: Counter[str] = Counter()

    def take(self, model: str) -> str | None:
        """Reserves one call to `model`. Returns why it can't, or None when it may go ahead."""
        with self._lock:
            if self.stopped:
                return self.stopped
            if model in self.bad_models:
                return f"{model} answered with an error before"
            if self._now() > self._end:
                return "the Claude phase ran out of time"
            if self.calls >= self.max_calls:
                return f"the {self.max_calls}-call cap was reached"
            self.calls += 1
            self.by_model[model] += 1
            return None

    def done(self, model: str, kind: str | None, usage: Any = None) -> None:
        with self._lock:
            if usage is not None:
                self.usage["inputTokens"] += int(getattr(usage, "input_tokens", 0) or 0)
                self.usage["outputTokens"] += int(getattr(usage, "output_tokens", 0) or 0)
            if kind is None or kind in ("invalid_output", "refusal"):
                self.errors_in_a_row = 0
                return
            if kind == "refused":
                self.stopped = self.stopped or "Claude refused the request (auth or proxy), so every later piece uses templates"
                return
            if kind == "bad_request":
                self.bad_models.add(model)
                return
            self.errors_in_a_row += 1
            if self.errors_in_a_row >= STOP_AFTER_ERRORS:
                self.stopped = self.stopped or f"{self.errors_in_a_row} Claude calls in a row failed ({kind}), so every later piece uses templates"


@dataclass
class Outcome:
    piece_id: str
    source: str  # claude | template
    model: str | None
    attempts: list[Attempt]
    reason: str | None  # why it fell back to templates
    kept: list[Candidate]
    negatives: list[str]
    content_drops: list[tuple[str, str]]
    candidates: list[Candidate] = field(default_factory=list)  # Claude's cleaned answer, before the filters


class ClaudeWriter:
    """Writes one piece's queries with at most two calls, then falls back to templates."""

    def __init__(
        self,
        data: b11data.Data,
        client: Any,
        budget: Budget,
        content: ContentFilter,
        models: Sequence[str] = (MODEL_FIRST, MODEL_RETRY),
        pause: Callable[[float], None] = time.sleep,
    ) -> None:
        self.data = data
        self.client = client
        self.budget = budget
        self.content = content
        self.models = [require_model(m) for m in models]
        self.system = system_prompt(data.content_rules)
        self.known = set(data.piece_ids())
        self.pause = pause

    def _pick_model(self, attempt: int) -> str | None:
        order = self.models[attempt:] + self.models[:attempt]
        for m in order:
            if m not in self.budget.bad_models:
                return m
        return None

    def attempt(self, piece_id: str, model: str) -> tuple[Attempt, str | None]:
        """One call and its checks. Returns the attempt and the failure kind for pacing."""
        prompt = build_prompt(self.data, piece_id)
        try:
            response = call_claude(self.client, model, self.system, prompt)
        except Exception as exc:  # noqa: BLE001 - every failure falls back, and the run goes on
            kind = classify(exc)
            self.budget.done(model, kind)
            status = getattr(exc, "status_code", None)
            return Attempt(model, False, f"call failed ({kind}{', status ' + str(status) if status else ''})"), kind
        usage = getattr(response, "usage", None)
        if getattr(response, "stop_reason", None) == "refusal":
            self.budget.done(model, "refusal", usage)
            return Attempt(model, False, "Claude declined"), "refusal"
        parsed = getattr(response, "parsed_output", None)
        if isinstance(parsed, dict):
            try:
                parsed = WrittenQueries.model_validate(parsed)
            except Exception:  # noqa: BLE001
                parsed = None
        if not isinstance(parsed, WrittenQueries):
            self.budget.done(model, "invalid_output", usage)
            reason = "the answer was cut off" if getattr(response, "stop_reason", None) == "max_tokens" else "the answer had the wrong shape"
            return Attempt(model, False, reason), "invalid_output"
        self.budget.done(model, None, usage)
        problems, cands, negs = check_output(parsed, piece_id, self.known)
        kept, drops = screen(cands, self.content)
        att = Attempt(model, False, None, candidates=cands, negatives=negs, content_drops=drops, kept=kept)
        if problems:
            att.reason = "checks: " + "; ".join(problems)
        elif len(drops) > MAX_CONTENT_DROPS:
            att.reason = f"the content filter dropped {len(drops)} queries"
        else:
            att.ok = True
        return att, None

    def write(self, piece_id: str) -> Outcome:
        attempts: list[Attempt] = []
        reason: str | None = None
        for n in range(CALLS_PER_PIECE):
            model = self._pick_model(n)
            if model is None:
                reason = reason or "no model left to call"
                break
            refusal = self.budget.take(model)
            if refusal:
                reason = refusal if not attempts else f"{attempts[-1].reason}; no retry: {refusal}"
                break
            att, kind = self.attempt(piece_id, model)
            attempts.append(att)
            if att.ok:
                log.info("%s: %s wrote %d queries (attempt %d)", piece_id, model, len(att.candidates), n + 1)
                return Outcome(piece_id, "claude", model, attempts, None, att.kept, att.negatives, att.content_drops, att.candidates)
            reason = att.reason
            log.info("%s: attempt %d with %s didn't pass: %s", piece_id, n + 1, model, att.reason)
            if kind == "busy":
                self.pause(BUSY_PAUSE_S)
        return template_outcome(self.data, piece_id, self.content, attempts, reason or "Claude didn't answer")


def template_outcome(
    data: b11data.Data, piece_id: str, content: ContentFilter, attempts: list[Attempt] | None = None, reason: str | None = None
) -> Outcome:
    kept, drops = screen(template_queries(data, piece_id), content)
    return Outcome(piece_id, "template", None, attempts or [], reason, kept, template_negatives(data, piece_id), drops)


# ---------------------------------------------------------------------------------------------
# Claude's raw answers, kept under artifacts/ (not committed) so the filters can run again
# (`--source raw`) without another call.

RAW_ABOUT = (
    "Claude's accepted answers per piece, cleaned but before the content filter, the eval-leak guard and "
    "the hard-negative filter. Written by server/b11_embed/pairs.py, read by --source raw. Synthetic queries "
    "about the fictional demo catalog. Not committed."
)


def write_raw(path: Path, data: b11data.Data, outcomes: Sequence[Outcome]) -> int:
    pieces = {
        o.piece_id: {
            "model": o.model,
            "queries": [{"text": c.text, "lang": c.lang, "voice": c.voice} for c in o.candidates],
            "hardNegativeIds": list(o.negatives),
        }
        for o in sorted(outcomes, key=lambda o: b11data.id_key(o.piece_id))
        if o.source == "claude" and o.candidates
    }
    if not pieces:
        return 0
    body = {"_about": RAW_ABOUT, "generatedAt": now_utc(), "dataGeneratedAt": data.generated_at, "pieces": pieces}
    _write_atomic(path, json.dumps(body, ensure_ascii=False, indent=1) + "\n")
    return len(pieces)


def raw_outcomes(path: Path, data: b11data.Data, ids: Sequence[str], content: ContentFilter) -> tuple[list[Outcome], str | None]:
    """Outcomes rebuilt from the raw answers: Claude's for each piece the file holds, templates for
    the rest. Raises PairsError when the file is missing or unreadable."""
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        pieces = raw["pieces"]
        if not isinstance(pieces, dict):
            raise TypeError("pieces")
    except FileNotFoundError:
        raise PairsError(f"{b11data.rel(path)} doesn't exist yet: run pairs.py with Claude first") from None
    except (ValueError, KeyError, TypeError) as exc:
        raise PairsError(f"{b11data.rel(path)} isn't a raw answers file ({type(exc).__name__})") from None
    known = set(data.piece_ids())
    out: list[Outcome] = []
    for pid in ids:
        entry = pieces.get(pid)
        if not isinstance(entry, dict) or not isinstance(entry.get("queries"), list):
            out.append(template_outcome(data, pid, content, [], "not in the raw answers"))
            continue
        cands = [
            Candidate(text=clean_query(q.get("text")), lang=detect_lang(clean_query(q.get("text"))), voice=str(q.get("voice")))
            for q in entry["queries"]
            if isinstance(q, dict) and clean_query(q.get("text")) and q.get("voice") in VOICES
        ]
        negs = [n for n in entry.get("hardNegativeIds") or [] if n in known and n != pid][:MAX_NEGATIVES]
        kept, drops = screen(cands, content)
        model = entry.get("model") if entry.get("model") in config.ALLOWED_MODELS else None
        out.append(Outcome(pid, "claude", model, [], None, kept, negs, drops, cands))
    note = f"rebuilt from {b11data.rel(path)} (generated {raw.get('generatedAt')}) with no new call"
    return out, note


# ---------------------------------------------------------------------------------------------
# Assembling the lines


@dataclass
class Counts:
    lines: int = 0
    content: Counter[str] = field(default_factory=Counter)
    leak: Counter[str] = field(default_factory=Counter)
    repeats: int = 0
    negatives_dropped: int = 0
    with_negative: int = 0
    langs: Counter[str] = field(default_factory=Counter)
    voices: Counter[str] = field(default_factory=Counter)


def assemble(
    data: b11data.Data, outcomes: Sequence[Outcome], leak: LeakGuard, negatives: NegativeFilter
) -> tuple[list[dict[str, Any]], Counts]:
    """The pairs.jsonl lines, in piece order, after the leak guard, repeats and the negative filter."""
    counts = Counts()
    lines: list[dict[str, Any]] = []
    by_piece = {o.piece_id: o for o in outcomes}
    for pid in data.piece_ids():
        o = by_piece.get(pid)
        if o is None:
            continue
        for kind, _w in o.content_drops:
            counts.content[kind] += 1
        seen: set[str] = set()
        cycle = 0
        for c in o.kept:
            hit = leak.match(c.text)
            if hit:
                counts.leak[hit[1]] += 1
                continue
            key = normalized(c.text)
            if not key or key in seen:
                counts.repeats += 1
                continue
            seen.add(key)
            kept, dropped = negatives.keep(c.text, c.voice, pid, o.negatives)
            counts.negatives_dropped += dropped
            neg: str | None = None
            if kept:
                neg = kept[cycle % len(kept)]
                cycle += 1
                counts.with_negative += 1
            lines.append({"query": c.text, "lang": c.lang, "voice": c.voice, "pieceId": pid, "negativeId": neg})
            counts.langs[c.lang] += 1
            counts.voices[c.voice] += 1
    counts.lines = len(lines)
    return lines, counts


# ---------------------------------------------------------------------------------------------
# The run


@dataclass
class Options:
    source: str = "auto"  # auto | claude | template
    models: tuple[str, ...] = (MODEL_FIRST, MODEL_RETRY)
    workers: int = WORKERS
    max_calls: int | None = None  # None: CALLS_PER_PIECE x pieces
    deadline_s: float = DEADLINE_S
    pieces: list[str] | None = None
    out: Path = PAIRS_PATH
    meta: Path = META_PATH
    raw: Path | None = None  # None: RAW_PATH, read when the run starts
    write: bool = True


@dataclass
class Result:
    lines: list[dict[str, Any]]
    meta: dict[str, Any]
    outcomes: list[Outcome]


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _pair_source(outcomes: Sequence[Outcome]) -> str:
    kinds = {o.source for o in outcomes}
    if kinds == {"claude"}:
        return "claude"
    if kinds == {"template"}:
        return "template"
    return "mixed"


def _plural_s(n: int, word: str) -> str:
    return f"{n} {word}" if n == 1 else f"{n} {_plural(word)}"


def build_meta(
    data: b11data.Data, outcomes: Sequence[Outcome], counts: Counts, budget: Budget | None, opts: Options,
    seconds: float, why_template: str | None, rebuilt: str | None = None,
) -> dict[str, Any]:
    source = _pair_source(outcomes)
    claude = [o for o in outcomes if o.source == "claude"]
    templ = [o for o in outcomes if o.source == "template"]
    retried = sum(1 for o in outcomes if len(o.attempts) > 1)
    models = sorted({o.model for o in claude if o.model})
    notes: list[str] = []
    n_pieces = len(outcomes)
    if source == "template":
        notes.append(
            f"Training pairs: {counts.lines} query-piece lines for {n_pieces} fictional pieces, built from each piece's facets "
            f"and vibe words with fixed English and Chinese patterns (template source{': ' + why_template if why_template else ''})."
        )
    else:
        line = (
            f"Training pairs: {counts.lines} query-piece lines for {n_pieces} fictional pieces. Claude ({', '.join(models) or 'model not recorded'}) "
            f"wrote the queries for {len(claude)} pieces from their records alone"
        )
        if templ:
            line += (
                f", and {len(templ)} used template queries built from their facets, because Claude's answers for them "
                f"didn't pass the checks or a call failed"
            )
        notes.append(line + ".")
    notes.append(
        f"The content filter dropped {_plural_s(sum(counts.content.values()), 'query')} holding a contentRules banned, stereotype "
        f"or meaning word, a People's name used as a product word, or a URL."
    )
    notes.append(
        f"The eval-leak guard dropped {_plural_s(sum(counts.leak.values()), 'query')} that equaled or nearly matched one of the "
        f"{len(data.eval)} held-out eval queries or the tour query; no eval query was used for training."
    )
    notes.append(
        f"Hard negatives: {counts.with_negative} looks, material and craft_term lines carry one. The filter dropped "
        f"{_plural_s(counts.negatives_dropped, 'candidate')} that shared a motif, mood or recipient word with the query, "
        f"or matched every facet it names; every other line relies on in-batch negatives."
    )
    pieces: dict[str, Any] = {}
    for o in sorted(outcomes, key=lambda o: b11data.id_key(o.piece_id)):
        entry: dict[str, Any] = {"source": o.source, "attempts": len(o.attempts)}
        if o.model:
            entry["model"] = o.model
        if o.reason:
            entry["reason"] = o.reason
        pieces[o.piece_id] = entry
    return {
        "pairSource": source,
        "notes": notes,
        "generatedAt": now_utc(),
        "dataGeneratedAt": data.generated_at,
        "dataFile": b11data.rel(data.source),
        "seconds": round(seconds, 1),
        "models": {"first": opts.models[0], "retry": opts.models[1] if len(opts.models) > 1 else None},
        "counts": {
            "pieces": n_pieces,
            "lines": counts.lines,
            "claudePieces": len(claude),
            "templatePieces": len(templ),
            "retriedPieces": retried,
            "calls": budget.calls if budget else 0,
            "callsByModel": dict(sorted(budget.by_model.items())) if budget else {},
            "withNegative": counts.with_negative,
            "langs": dict(sorted(counts.langs.items())),
            "voices": dict(sorted(counts.voices.items())),
            "dropped": {
                "content": dict(sorted(counts.content.items())),
                "contentTotal": sum(counts.content.values()),
                "leak": dict(sorted(counts.leak.items())),
                "leakTotal": sum(counts.leak.values()),
                "repeats": counts.repeats,
                "negatives": counts.negatives_dropped,
            },
        },
        "usage": dict(budget.usage) if budget else {"inputTokens": 0, "outputTokens": 0},
        "templateReason": why_template,
        "rebuilt": rebuilt,
        "pieces": pieces,
    }


def _write_atomic(path: Path, text: str) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8", newline="\n")
    os.replace(tmp, path)


def write_outputs(lines: Sequence[Mapping[str, Any]], meta: Mapping[str, Any], out: Path, meta_path: Path) -> None:
    body = "".join(json.dumps(dict(line), ensure_ascii=False) + "\n" for line in lines)
    _write_atomic(out, body)
    _write_atomic(meta_path, json.dumps(dict(meta), ensure_ascii=False, indent=1) + "\n")


def run(
    data: b11data.Data,
    opts: Options | None = None,
    *,
    client_factory: Callable[[], Any] | None = None,
    now: Callable[[], float] = time.monotonic,
    pause: Callable[[float], None] = time.sleep,
) -> Result:
    """The whole run on `data`: queries per piece, the filters, the lines, the meta, and the files
    when `opts.write`. Never raises for a Claude failure: those pieces use templates."""
    opts = opts or Options()
    started = now()
    for m in opts.models:
        require_model(m)
    if not data.eval:
        raise PairsError("searchEval is empty, so the eval-leak guard has nothing to hold out (S3's eval queries come first)")
    ids = data.piece_ids()
    if opts.pieces:
        unknown = [p for p in opts.pieces if p not in ids]
        if unknown:
            raise PairsError(f"not in the index: {', '.join(unknown)}")
        ids = [p for p in ids if p in set(opts.pieces)]
    content = ContentFilter(data.content_rules)
    leak = LeakGuard.from_data(data)
    vocab = Vocab(data)
    negatives = NegativeFilter(vocab)

    why_template: str | None = None
    rebuilt: str | None = None
    use_claude = opts.source in ("auto", "claude")
    if opts.source == "template":
        why_template = "--source template"
        use_claude = False
    elif opts.source == "raw":
        use_claude = False
    elif not config.has_key("ANTHROPIC_API_KEY"):
        why_template = "no Anthropic key is set"
        use_claude = False
    budget: Budget | None = None
    outcomes: list[Outcome] = []
    raw_path = Path(opts.raw or RAW_PATH)
    if opts.source == "raw":
        outcomes, rebuilt = raw_outcomes(raw_path, data, ids, content)
    if use_claude:
        factory = client_factory or make_client
        try:
            client = factory()
        except Exception as exc:  # noqa: BLE001 - a client that can't be built means templates
            client = None
            why_template = f"the Claude client couldn't be built ({type(exc).__name__})"
        if client is not None:
            max_calls = opts.max_calls if opts.max_calls is not None else CALLS_PER_PIECE * len(ids)
            budget = Budget(max_calls, opts.deadline_s, now=now)
            writer = ClaudeWriter(data, client, budget, content, models=opts.models, pause=pause)
            with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, opts.workers)) as pool:
                futures = {pool.submit(writer.write, pid): pid for pid in ids}
                for fut in concurrent.futures.as_completed(futures):
                    pid = futures[fut]
                    try:
                        outcomes.append(fut.result())
                    except Exception as exc:  # noqa: BLE001
                        log.info("%s: the writer failed (%s), using templates", pid, type(exc).__name__)
                        outcomes.append(template_outcome(data, pid, content, [], f"the writer failed ({type(exc).__name__})"))
            if budget.stopped and all(o.source == "template" for o in outcomes):
                why_template = budget.stopped
    if not outcomes:
        outcomes = [template_outcome(data, pid, content, [], why_template) for pid in ids]
    outcomes.sort(key=lambda o: b11data.id_key(o.piece_id))
    lines, counts = assemble(data, outcomes, leak, negatives)
    if not lines:
        raise PairsError("no training pairs survived the filters")
    meta = build_meta(data, outcomes, counts, budget, opts, now() - started, why_template, rebuilt)
    if opts.write:
        if use_claude:
            write_raw(raw_path, data, outcomes)
        write_outputs(lines, meta, opts.out, opts.meta)
    return Result(lines=lines, meta=meta, outcomes=outcomes)


def summary(result: Result, opts: Options) -> list[str]:
    m = result.meta
    c = m["counts"]
    d = c["dropped"]
    out = [
        f"b11 pairs: {c['lines']} lines for {c['pieces']} pieces in {m['seconds']} s, pairSource {m['pairSource']} "
        f"({c['claudePieces']} claude, {c['templatePieces']} template, {c['retriedPieces']} retried)",
        f"b11 pairs: {c['calls']} Claude calls {c['callsByModel']}, tokens in {m['usage']['inputTokens']} out {m['usage']['outputTokens']}",
        f"b11 pairs: langs {c['langs']}, voices {c['voices']}, {c['withNegative']} lines with a hard negative",
        f"b11 pairs: dropped by the content filter {d['contentTotal']} {d['content']}, by the eval-leak guard {d['leakTotal']} "
        f"{d['leak']}, repeats {d['repeats']}, hard negatives {d['negatives']}",
    ]
    if m.get("rebuilt"):
        out.append(f"b11 pairs: {m['rebuilt']}")
    if m.get("templateReason"):
        out.append(f"b11 pairs: templates because {m['templateReason']}")
    for pid, p in m["pieces"].items():
        if p["source"] == "template" and p.get("reason") and p["reason"] != m.get("templateReason"):
            out.append(f"b11 pairs: {pid} used templates: {p['reason']}")
    if opts.write:
        out.append(f"b11 pairs: wrote {b11data.rel(opts.out)} and {b11data.rel(opts.meta)}")
    return out


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Write B11's training pairs (server/b11_embed/pairs.jsonl).")
    parser.add_argument("--source", choices=("auto", "claude", "template", "raw"), default="auto",
                        help="auto: Claude when a key is set, else templates; raw: refilter the last Claude answers, no call")
    parser.add_argument("--raw", type=Path, default=None, help="raw answers file (default artifacts/b11/pairs_raw.json)")
    parser.add_argument("--model", default=MODEL_FIRST, help=f"first call's model (default {MODEL_FIRST})")
    parser.add_argument("--retry-model", default=MODEL_RETRY, help=f"the retry's model (default {MODEL_RETRY})")
    parser.add_argument("--workers", type=int, default=WORKERS, help="calls at a time (default 4)")
    parser.add_argument("--max-calls", type=int, default=None, help="cap on Claude calls (default 2 per piece)")
    parser.add_argument("--deadline", type=float, default=DEADLINE_S, help="seconds for the Claude phase (default 900)")
    parser.add_argument("--pieces", default=None, help="comma-separated piece IDs (needs --out)")
    parser.add_argument("--out", type=Path, default=None, help="pairs file (default server/b11_embed/pairs.jsonl)")
    parser.add_argument("--meta", type=Path, default=None, help="meta file (default next to --out as pairs_meta.json)")
    parser.add_argument("--data", type=Path, default=None, help="data file (default: what data.load() picks)")
    parser.add_argument("--dry-run", action="store_true", help="write nothing, print the summary")
    args = parser.parse_args(argv)

    for name in ("httpx", "httpx2", "httpcore", "anthropic"):
        logging.getLogger(name).setLevel(logging.WARNING)
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(message)s"))
    for lg in (log, b11data.log):
        lg.addHandler(handler)
        lg.setLevel(logging.INFO)
        lg.propagate = False
    try:
        pieces = [p.strip() for p in args.pieces.split(",") if p.strip()] if args.pieces else None
        if pieces and args.out is None and not args.dry_run:
            raise PairsError("--pieces writes a partial file, so pass --out (or --dry-run) too")
        out = args.out or PAIRS_PATH
        meta = args.meta or (META_PATH if args.out is None else Path(out).with_name("pairs_meta.json"))
        # A run into another --out keeps its raw answers beside it, so it never replaces the main run's.
        raw = args.raw or (RAW_PATH if args.out is None or args.source == "raw" else Path(out).with_name("pairs_raw.json"))
        opts = Options(
            raw=raw,
            source=args.source,
            models=(require_model(args.model), require_model(args.retry_model)),
            workers=args.workers,
            max_calls=args.max_calls,
            deadline_s=args.deadline,
            pieces=pieces,
            out=out,
            meta=meta,
            write=not args.dry_run,
        )
        data = b11data.load(args.data) if args.data else b11data.load()
        result = run(data, opts)
        for line in summary(result, opts):
            print(line)
        return 0
    except (PairsError, b11data.DataError) as exc:
        print(f"b11 pairs: {exc}", file=sys.stderr)
        return 1
    finally:
        for lg in (log, b11data.log):
            lg.removeHandler(handler)


if __name__ == "__main__":
    sys.exit(main())
