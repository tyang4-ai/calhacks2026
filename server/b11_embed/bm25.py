"""A small BM25 and the tokenizer B11 shares (B11-embed.md, Metrics and the Python module).

- `tokenize(text)` is the shared tokenizer: Unicode NFKC, lowercase, Latin accents folded
  ("Diné" to "dine"), apostrophes dropped ("mom's" to "moms"), English words as runs of letters
  and digits, and every CJK character as its own token. No stopwords, no stemming. T3's eval-leak
  guard compares token sets with it.
- `analyze(text)` is what BM25 indexes and searches: `tokenize()`, then a short English stopword
  list and light plural stripping ("earrings" to "earring", "pouches" to "pouch", "berries" to
  "berry"), so the keyword baseline isn't handicapped by "a", "for" or plurals. Chinese characters
  pass through as they are.
- `BM25` is Okapi BM25 with Lucene's (and Elastic's) IDF, ln(1 + (N - n + 0.5) / (n + 0.5)),
  k1 = 1.2 and b = 0.75. A query's terms count once each. `rank()` returns only documents that
  scored above 0, best first, ties by document ID, so "no keyword hit" stays visible.

Standard library only.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from collections.abc import Callable, Iterable, Mapping, Sequence

K1 = 1.2
B = 0.75

_CJK = re.compile(r"([㐀-䶿一-鿿豈-﫿\U00020000-\U0002ffff])")
_WORD = re.compile(r"[^\W_]+")
_APOSTROPHES = re.compile(r"['‘’ʼ]")

# Short English function words. Content words (gift, mom, red, warm, myself) are never here.
STOPWORDS: frozenset[str] = frozenset(
    """
    a an the and or but nor of for to in on at by with from into onto as is are was were be been
    being it its this that these those my me i you your yours our ours we us she her hers he him his
    they them their theirs who whom what which so very some something any anything all can could
    will would shall should just not no do does did has have had about up out if then than too also
    there here s t
    """.split()
)


def _fold(text: str) -> str:
    """NFKC, lowercase, Latin accents removed. CJK characters are untouched."""
    text = unicodedata.normalize("NFKC", text or "").lower()
    decomposed = unicodedata.normalize("NFD", text)
    return unicodedata.normalize("NFC", "".join(ch for ch in decomposed if not unicodedata.combining(ch)))


def is_cjk(token: str) -> bool:
    return len(token) == 1 and _CJK.fullmatch(token) is not None


def tokenize(text: str) -> list[str]:
    """English words and single CJK characters, lowercased, in text order."""
    text = _APOSTROPHES.sub("", _fold(text))
    return _WORD.findall(_CJK.sub(r" \1 ", text))


def stem(word: str) -> str:
    """Light English plural stripping. Leaves short words, CJK and non-letters alone."""
    if len(word) <= 3 or not word.isascii() or not word.isalpha():
        return word
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith(("sses", "shes", "ches", "xes")):
        return word[:-2]
    if word.endswith("s") and not word.endswith(("ss", "us", "is")):
        return word[:-1]
    return word


def analyze(text: str) -> list[str]:
    """The terms BM25 indexes: tokenize(), minus English stopwords, with plurals stripped."""
    return [t if is_cjk(t) else stem(t) for t in tokenize(text) if t not in STOPWORDS]


class BM25:
    """Okapi BM25 over a fixed set of documents, keyed by ID."""

    def __init__(
        self,
        docs: Mapping[str, str] | Iterable[tuple[str, str]],
        *,
        k1: float = K1,
        b: float = B,
        analyzer: Callable[[str], list[str]] = analyze,
    ) -> None:
        items = list(docs.items()) if isinstance(docs, Mapping) else list(docs)
        self.k1 = k1
        self.b = b
        self.analyzer = analyzer
        self.ids: list[str] = [doc_id for doc_id, _ in items]
        if len(set(self.ids)) != len(self.ids):
            raise ValueError("document IDs must be unique")
        self._tf: list[Counter[str]] = [Counter(analyzer(text)) for _, text in items]
        self._len: list[int] = [sum(tf.values()) for tf in self._tf]
        self.n_docs = len(items)
        self.avgdl = (sum(self._len) / self.n_docs) if self.n_docs else 0.0
        df: Counter[str] = Counter()
        for tf in self._tf:
            df.update(tf.keys())
        self.df = df

    def idf(self, term: str) -> float:
        n = self.df.get(term, 0)
        return math.log(1.0 + (self.n_docs - n + 0.5) / (n + 0.5))

    def scores(self, query: str) -> dict[str, float]:
        """Every document's score for the query, 0.0 where nothing matched."""
        terms = list(dict.fromkeys(self.analyzer(query)))
        out = {doc_id: 0.0 for doc_id in self.ids}
        if not terms or not self.n_docs:
            return out
        avgdl = self.avgdl or 1.0
        for i, doc_id in enumerate(self.ids):
            tf, dl = self._tf[i], self._len[i]
            norm = self.k1 * (1.0 - self.b + self.b * dl / avgdl)
            total = 0.0
            for term in terms:
                f = tf.get(term, 0)
                if f:
                    total += self.idf(term) * f * (self.k1 + 1.0) / (f + norm)
            out[doc_id] = total
        return out

    def rank(self, query: str, top: int | None = None) -> list[tuple[str, float]]:
        """(ID, score) for the documents that scored above 0, best first, ties by ID."""
        hits = [(doc_id, s) for doc_id, s in self.scores(query).items() if s > 0.0]
        hits.sort(key=lambda h: (-h[1], h[0]))
        return hits if top is None else hits[:top]


def token_overlap(a: str, b: str) -> float:
    """The share of `a`'s distinct tokens that `b` also has, by tokenize(). 0.0 when `a` has none."""
    ta, tb = set(tokenize(a)), set(tokenize(b))
    return (len(ta & tb) / len(ta)) if ta else 0.0


def top_ids(hits: Sequence[tuple[str, float]]) -> list[str]:
    """The IDs of rank()'s hits, in order."""
    return [doc_id for doc_id, _ in hits]
