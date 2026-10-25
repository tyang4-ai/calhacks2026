"""B11's model card, server/b11_embed/README.md (B11-embed.md, The model card; A2-12, A2-19, B2-30).

publish.py publishes only with this card, after two checks:

- `check()`: the card holds each line the plan asks for (`REQUIRED`: what it is, the base model with
  its link and licence, the intended use, the data, the evaluation, the limits, what it's not for
  and L30's words), never calls the test set hand-written, links no host but huggingface.co,
  example.com and example.org, and breaks no `contentRules` list: no banned object, stereotype or
  meaning word, no "Indian" or "tribe", and no nation's name used as a product word (pairs.py's
  ContentFilter, one paragraph at a time).
- `render()`: fills the two marked blocks from pairs_meta.json (who wrote the training queries) and
  report.json (the four systems overall and per language, the paired bootstrap comparisons with
  their 95% intervals, and the run's notes), so the card's numbers are the report's. `check(...,
  filled=True)` then also refuses a block that still holds its placeholder.
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from server.b11_embed import metrics
from server.b11_embed.pairs import ContentFilter

HERE = Path(__file__).resolve().parent
CARD_PATH = HERE / "README.md"

PAIRS = ("<!-- cindia:pairs:start -->", "<!-- cindia:pairs:end -->")
RESULTS = ("<!-- cindia:results:start -->", "<!-- cindia:results:end -->")
PLACEHOLDER = "_Filled in from"

# (what, the words the card must hold). Compared case-insensitively, with backticks and asterisks
# dropped and whitespace collapsed.
REQUIRED: tuple[tuple[str, str], ...] = (
    ("the licence in the front matter", "license: mit"),
    ("the base model in the front matter", "base_model: intfloat/multilingual-e5-small"),
    ("what it is", "cindia-embed-v1 is a sentence-embedding model fine-tuned from"),
    ("the base model's link", "https://huggingface.co/intfloat/multilingual-e5-small"),
    ("the base model's licence", "MIT licence"),
    ("the intended use", "Search over this fictional demo catalog of 54 listings on the Cindia platform"),
    ("the data", "synthetic queries that Claude wrote about 54 fictional listings"),
    ("the nations", "fictional members of real Native American nations"),
    ("the Diné makers", "Diné"),
    ("the Ojibwe makers", "Ojibwe"),
    ("the Acoma Pueblo makers", "Acoma Pueblo"),
    ("the Seminole makers", "Seminole"),
    ("no real data", "No real community's, maker's or buyer's data"),
    ("the evaluation", "50 agent-written, held-out queries over the same 54 pieces that are in training"),
    ("one model family", "one model family"),
    ("the intervals", "95% intervals"),
    ("not a benchmark", "a small test, not a benchmark"),
    ("the limits", "One small catalog, one run, queries and pieces from the same authoring pipeline"),
    (
        "what it's not for",
        "not for classifying, ranking or verifying real makers or their work, judging authenticity or identity, "
        "or any decision about a real person",
    ),
    (
        "L30",
        "Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked "
        "with these communities yet, and a real launch starts with them.",
    ),
)
# The eval set was written by our data agent, never by hand (B2-7, A2-12).
FORBIDDEN: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("calls the test set hand-written", re.compile(r"hand[\s-]?written|written by hand", re.IGNORECASE)),
)
ALLOWED_HOSTS: tuple[str, ...] = ("huggingface.co", "example.com", "example.org")

_URL = re.compile(r"[a-z][a-z0-9+.-]*://([^/\s)\]>\"'`]+)", re.IGNORECASE)
_WWW = re.compile(r"(?<![\w.-])(www\.[a-z0-9.-]+)", re.IGNORECASE)
_BARE = re.compile(
    r"(?<![\w@/.-])((?:[a-z0-9-]+\.)+(?:com|org|net|io|co|ai|dev|app|us|edu|gov|shop|store|info|me))(?![\w-])",
    re.IGNORECASE,
)
_LINK = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")


def normalize(text: str) -> str:
    return " ".join(text.replace("`", "").replace("*", "").split()).casefold()


def _host(raw: str) -> str:
    host = raw.rsplit("@", 1)[-1].split(":", 1)[0]
    return host.strip(".").lower()


def host_allowed(host: str) -> bool:
    return any(host == h or host.endswith("." + h) for h in ALLOWED_HOSTS)


def url_hosts(text: str) -> list[str]:
    """Every host a URL, a www. name or a bare domain in the text names."""
    hosts = [_host(m.group(1)) for m in _URL.finditer(text)]
    hosts += [_host(m.group(1)) for m in _WWW.finditer(text)]
    stripped = _URL.sub(" ", text)
    hosts += [_host(m.group(1)) for m in _BARE.finditer(stripped)]
    return hosts


def paragraphs(text: str) -> list[str]:
    """The card's text as plain lines for the word checks: links shown by their text, markdown marks
    dropped. Each paragraph of the card is one line."""
    out = []
    for line in text.splitlines():
        line = _LINK.sub(r"\1", line).replace("`", " ").replace("*", " ").replace("|", " ")
        line = re.sub(r"^\s*(?:#+|-|>)\s*", "", line).strip()
        if line:
            out.append(line)
    return out


def _block(text: str, markers: tuple[str, str]) -> tuple[int, int] | None:
    start, end = markers
    if text.count(start) != 1 or text.count(end) != 1:
        return None
    a, b = text.index(start), text.index(end)
    return (a + len(start), b) if a < b else None


def check(text: str, rules: Mapping[str, Any], *, filled: bool = False) -> list[str]:
    """Every problem with the card, in plain words. Empty when it passes."""
    problems: list[str] = []
    norm = normalize(text)
    for what, words in REQUIRED:
        if normalize(words) not in norm:
            problems.append(f"the card doesn't state {what} ({words!r})")
    for what, rx in FORBIDDEN:
        if rx.search(text):
            problems.append(f"the card {what}")
    for host in url_hosts(text):
        if not host_allowed(host):
            problems.append(f"the card links {host}, which isn't huggingface.co, example.com or example.org")
    content = ContentFilter(rules)
    for line in paragraphs(text):
        for kind, word in content.hits(line):
            if kind == "url":
                continue  # the URL check above names the host
            if kind == "people":
                problems.append(f"the card uses a nation's name as a product word ({word!r} in {line[:60]!r})")
            else:
                problems.append(f"the card holds a contentRules {kind} word ({word!r} in {line[:60]!r})")
    for name, markers in (("pairs", PAIRS), ("results", RESULTS)):
        span = _block(text, markers)
        if span is None:
            problems.append(f"the card needs one {markers[0]} ... {markers[1]} block, in that order")
        elif filled and (PLACEHOLDER in text[span[0] : span[1]] or not text[span[0] : span[1]].strip()):
            problems.append(f"the card's {name} block isn't filled in")
    return list(dict.fromkeys(problems))


def fill(text: str, markers: tuple[str, str], body: str) -> str:
    """The text with the block between the markers replaced by `body` (the markers stay)."""
    span = _block(text, markers)
    if span is None:
        raise ValueError(f"the card has no single {markers[0]} block")
    return text[: span[0]] + "\n" + body.strip() + "\n" + text[span[1] :]


# ---------------------------------------------------------------------------------------------
# The two blocks


def _n(value: Any) -> int:
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else 0


def render_pairs(meta: Mapping[str, Any]) -> str:
    """Who wrote the training queries, from pairs_meta.json."""
    counts = meta.get("counts") if isinstance(meta.get("counts"), Mapping) else {}
    langs = counts.get("langs") if isinstance(counts.get("langs"), Mapping) else {}
    dropped = counts.get("dropped") if isinstance(counts.get("dropped"), Mapping) else {}
    pieces = meta.get("pieces") if isinstance(meta.get("pieces"), Mapping) else {}
    first: Counter[str] = Counter()
    retried: Counter[str] = Counter()
    templates = 0
    for info in pieces.values():
        if not isinstance(info, Mapping):
            continue
        if info.get("source") != "claude":
            templates += 1
            continue
        model = str(info.get("model") or "Claude")
        (retried if _n(info.get("attempts")) > 1 else first)[model] += 1
    who = [f"{m} for {n} {'piece' if n == 1 else 'pieces'}" for m, n in sorted(first.items())]
    who += [f"{m} for {n} {'piece' if n == 1 else 'pieces'} on a retry after a failed check" for m, n in sorted(retried.items())]
    claude = sum(first.values()) + sum(retried.values())
    lines = [
        f"- `pairs.jsonl` holds {_n(counts.get('lines'))} query-piece lines for {_n(counts.get('pieces')) or len(pieces)} "
        f"fictional pieces: {_n(langs.get('en'))} in English and {_n(langs.get('zh'))} in Chinese.",
        f"- Claude wrote the queries for {claude} {'piece' if claude == 1 else 'pieces'}: {', '.join(who) or 'none'}. "
        f"{templates} {'piece' if templates == 1 else 'pieces'} fell back to fixed templates.",
        f"- The content filter dropped {_n(dropped.get('contentTotal'))} queries and the eval-leak guard dropped "
        f"{_n(dropped.get('leakTotal'))}. {_n(counts.get('withNegative'))} lines carry a filtered hard negative, and "
        "the rest rely on in-batch negatives.",
    ]
    if meta.get("generatedAt"):
        lines.append(f"- Written {meta['generatedAt']}, from the catalog exported at {meta.get('dataGeneratedAt') or 'an unrecorded time'}.")
    return "\n".join(lines)


def claude_pieces(meta: Mapping[str, Any]) -> int:
    pieces = meta.get("pieces") if isinstance(meta.get("pieces"), Mapping) else {}
    return sum(1 for p in pieces.values() if isinstance(p, Mapping) and p.get("source") == "claude")


def _f(value: Any) -> str:
    return f"{float(value):.3f}" if isinstance(value, (int, float)) and not isinstance(value, bool) else "n/a"


def _rows(block: Any) -> dict[str, Mapping[str, Any]]:
    systems = block.get("systems") if isinstance(block, Mapping) else None
    return {str(r.get("system")): r for r in systems or [] if isinstance(r, Mapping)}


def render_results(report: Mapping[str, Any]) -> str:
    """The four systems overall and per language, the comparisons and the notes, from report.json."""
    ev = report.get("eval") if isinstance(report.get("eval"), Mapping) else {}
    by_lang = ev.get("byLang") if isinstance(ev.get("byLang"), Mapping) else {}
    overall = _rows(ev)
    en, zh = _rows(by_lang.get("en")), _rows(by_lang.get("zh"))
    n_en = _n((by_lang.get("en") or {}).get("queries")) if isinstance(by_lang.get("en"), Mapping) else 0
    n_zh = _n((by_lang.get("zh") or {}).get("queries")) if isinstance(by_lang.get("zh"), Mapping) else 0
    training = report.get("training") if isinstance(report.get("training"), Mapping) else {}
    k = _n(ev.get("k")) or metrics.K
    lines = [
        f"Scored {training.get('scoredAt') or 'in the run'} on {report.get('device') or 'an unrecorded device'}: "
        f"{_n(ev.get('queries'))} queries ({n_en} English, {n_zh} Chinese), the top {k} of 54 pieces. "
        f"Fingerprint `{report.get('fingerprint')}`.",
        "",
        "| System | recall@5 | MRR@10 | recall@5, English | recall@5, Chinese | MRR@10, English | MRR@10, Chinese |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for system in [s for s in ("keyword", "base", "custom", "hybrid") if s in overall] + [s for s in overall if s not in metrics.LABELS]:
        o, e, z = overall[system], en.get(system, {}), zh.get(system, {})
        lines.append(
            f"| {metrics.LABELS.get(system, system)} | {_f(o.get('recallAtK'))} | {_f(o.get('mrr'))} | "
            f"{_f(e.get('recallAtK'))} | {_f(z.get('recallAtK'))} | {_f(e.get('mrr'))} | {_f(z.get('mrr'))} |"
        )
    comparisons = [c for c in ev.get("comparisons") or [] if isinstance(c, Mapping)]
    verdicts: list[str] = []
    for c in comparisons:
        try:
            verdicts.append(metrics.verdict(c))
        except (KeyError, TypeError, ValueError):
            continue
    if verdicts:
        lines += ["", f"Paired bootstrap over the queries ({metrics.RESAMPLES:,} resamples, seeded), 95% intervals:", ""]
        lines += [f"- {v}" for v in verdicts]
    # The report's notes repeat the verdicts, which are listed once above.
    notes = [str(n) for n in report.get("notes") or [] if isinstance(n, str) and n.strip() and str(n) not in verdicts]
    if notes:
        lines += ["", "Notes from the run:", ""]
        lines += [f"- {n}" for n in notes]
    return "\n".join(lines)


def render(template: str, report: Mapping[str, Any], meta: Mapping[str, Any]) -> str:
    """The card with both blocks filled in."""
    return fill(fill(template, PAIRS, render_pairs(meta)), RESULTS, render_results(report))


def systems_in(report: Mapping[str, Any]) -> Sequence[str]:
    """The systems report.json scored, in its order."""
    return list(_rows(report.get("eval") if isinstance(report.get("eval"), Mapping) else {}))
