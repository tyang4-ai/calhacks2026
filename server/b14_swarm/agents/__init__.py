"""The swarm's agents, one file each, and what they share.

Each agent file holds its input, its Pydantic output model, its prompt and its run function, and
takes its model ID and tools from roster.py. Every prompt is short and plain, names the co-op and its
makers as the records do, and says: answer only from what you're given, and if it doesn't say,
answer `unknown`. The person's words go in a delimited data block, never into the instructions.

What they share:

- `SupportJob`: one support request, as the router hands it to `run.support_run()`.
- `Fact`: a placeholder the Writer may use (`{arrival_earliest}`), with its value per language,
  filled by code. Every number, date, amount, name and quote in a reply is one of these.
- `SpecialistResult`: what a specialist returns: its status, its facts, the IDs it used, a draft in
  both languages built by code from its facts, the steps it took, and anything the run's ending needs.
- `specialist(name)`: the specialist's run function. `finder` and `curator` fall back to a stub that
  says search isn't connected only if their files are missing (a cut), so the support run never breaks.
- `ListingJob`, `ListingContext` and `StorefrontJob`: the listing and storefront runs' requests.
- The placeholder helpers: find, strip and fill `{name}` placeholders, and spot a number or a date
  typed outside one.
"""

from __future__ import annotations

import importlib
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from server.b14_swarm.steps import Budget, IdMint, PendingStep, summary, usd
from server.b14_swarm.tools import Records, Toolbox

Text = dict[str, str]
LANGS = ("en", "zh")


def text(en: str, zh: str) -> Text:
    return {"en": en, "zh": zh}


def english(t: Text) -> Text:
    """English only (decisions.md, Oct 25 00:14 PT): a Text whose zh value repeats the English."""
    return {"en": t.get("en", ""), "zh": t.get("en", "")}


@dataclass
class SupportJob:
    """One person's support request (`POST /api/b14/support`), after the router's checks."""

    run_id: str
    thread_id: str
    side: str  # "buyer" or "seller"
    text: str
    lang: str  # "en" or "zh"
    context_ids: list[str]
    records: Any
    id_tag: str
    id_start: Any = 1
    at: float = 0


@dataclass
class ListingJob:
    """One person's listing request (`POST /api/b14/listing`), after the router's checks. The run's
    thread is the listing ID."""

    run_id: str
    listing_id: str
    maker_id: str
    notes: str
    lang: str
    community: dict[str, Any]
    maker: dict[str, Any]
    vocabulary: dict[str, list[str]]
    id_tag: str
    id_start: Any = 1
    image: Optional[bytes] = None
    image_type: Optional[str] = None  # image/png or image/jpeg, from the magic bytes
    at: float = 0


@dataclass
class ListingContext:
    job: ListingJob
    budget: Budget
    ids: IdMint
    box: Toolbox
    # Filled in as the run goes: the Lister's draft, the Describer's note, the Tagger's vibe.
    draft: Any = None
    picture: Any = None
    vibe: Any = None


@dataclass
class StorefrontJob:
    """One storefront draft request (`POST /api/b14/storefront`). The run's thread is the storefront ID."""

    run_id: str
    storefront_id: str
    community: dict[str, Any]
    pieces: list[dict[str, Any]]
    id_tag: str
    id_start: Any = 1
    at: float = 0


@dataclass
class Fact:
    """A placeholder: `name` as written in a reply (`{name}`), its value per language, and `about`,
    what it holds, which is all the Writer sees of it."""

    name: str
    value: Text
    about: str


@dataclass
class Quote:
    """A sentence from the records, word for word in each language, and where it's from."""

    source: str  # verification.note, verification.by, community.about, community.protocols, piece.heritage, piece.story
    sentence: Text
    label: Text  # the source, named for the reader
    subject_id: str  # the community or piece it belongs to


@dataclass
class SpecialistResult:
    agent_id: str
    status: str  # "answered", "unknown" or "skipped"
    facts: list[Fact] = field(default_factory=list)
    ref_ids: list[str] = field(default_factory=list)
    draft: Optional[Text] = None
    steps: list[PendingStep] = field(default_factory=list)
    reason: Optional[str] = None
    quote: Optional[Quote] = None
    # Placeholder groups the Writer's reply must use, at least one name from each.
    required: list[list[str]] = field(default_factory=list)
    # The code-built draft the template reply uses, when `draft` is an agent's own words.
    template: Optional[Text] = None
    # Plain notes for the Writer, built by code ("arrival before the date asked: yes").
    notes: list[str] = field(default_factory=list)
    # Anything else the run's ending reads (the Steward's intent, the Finder's candidates).
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class SupportContext:
    job: SupportJob
    records: Records
    box: Toolbox
    budget: Budget
    ids: IdMint
    intake: Any = None  # intake.IntakeResult
    results: dict[str, SpecialistResult] = field(default_factory=dict)
    # Work the run starts from code ahead of the specialist that reads it (the Finder's
    # elastic_agent call, started as soon as Intake says find), by name.
    background: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------------------------
# Placeholders

PLACEHOLDER = re.compile(r"\{([a-z][a-z0-9_]*)\}")
# A number typed in English or Chinese: digits (ASCII or full width), a currency or percent sign,
# or Chinese numerals before a date, money or count word.
TYPED_DIGITS = re.compile(r"[0-9０-９$＄%％]")
TYPED_ZH_NUMBER = re.compile(r"[〇零一二两三四五六七八九十百千万]+\s*(?:月|日|号|天|周|年|美元|元|块|刀|%)")


def placeholders(s: str) -> list[str]:
    return PLACEHOLDER.findall(s or "")


def strip_placeholders(s: str) -> str:
    return PLACEHOLDER.sub(" ", s or "")


def typed_number(s: str) -> bool:
    """Whether a number, date or amount is typed outside the placeholders."""
    bare = strip_placeholders(s)
    return bool(TYPED_DIGITS.search(bare) or TYPED_ZH_NUMBER.search(bare))


def fill(s: str, facts: dict[str, Fact], lang: str) -> str:
    """Each `{name}` replaced by its fact's value in `lang`. Unknown names stay as written (the
    checks before reject them)."""

    def sub(m: re.Match[str]) -> str:
        f = facts.get(m.group(1))
        return f.value.get(lang, f.value.get("en", "")) if f else m.group(0)

    return PLACEHOLDER.sub(sub, s or "")


def fill_text(t: Text, facts: dict[str, Fact]) -> Text:
    return {lang: tidy(fill(t.get(lang, ""), facts, lang), lang) for lang in LANGS}


def tidy(s: str, lang: str) -> str:
    s = re.sub(r"[ \t]+", " ", s).strip()
    if lang == "zh":
        s = re.sub(r"(?<=[㐀-鿿。，：；！？）（“”]) (?=[㐀-鿿。，：；！？）（“”])", "", s)
    return s


def join_drafts(drafts: list[Text]) -> Text:
    en = " ".join(d["en"].strip() for d in drafts if d and d.get("en", "").strip())
    zh = "".join(d["zh"].strip() for d in drafts if d and d.get("zh", "").strip())
    return {"en": en, "zh": zh}


# ---------------------------------------------------------------------------------------------
# Formatting for facts (the same prose forms src/mock/util.ts writes)

MONTHS_EN = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
MONTH_NAMES_EN = ("January", "February", "March", "April", "May", "June", "July", "August", "September",
                  "October", "November", "December")


def date_text(iso: str) -> Text:
    _, m, d = (int(x) for x in iso.split("-"))
    return {"en": f"{MONTHS_EN[m - 1]} {d}", "zh": f"{m}月{d}日"}


def month_text(month_id: str) -> Text:
    """"2026-09" as September and 9月."""
    m = int(month_id.split("-")[1])
    return {"en": MONTH_NAMES_EN[m - 1], "zh": f"{m}月"}


def money_text(cents: int) -> Text:
    return {"en": usd(cents), "zh": usd(cents)}


def same(value: str) -> Text:
    return {"en": value, "zh": value}


def name_of(record: Optional[dict[str, Any]]) -> Optional[Text]:
    n = record.get("name") if isinstance(record, dict) else None
    if isinstance(n, dict) and isinstance(n.get("en"), str) and isinstance(n.get("zh"), str):
        return {"en": n["en"], "zh": n["zh"]}
    return None


# ---------------------------------------------------------------------------------------------
# The specialists

Specialist = Callable[[SupportContext], SpecialistResult]


def _finder_stub(ctx: SupportContext) -> SpecialistResult:
    """Only if finder.py is missing: no candidates, said plainly."""
    return SpecialistResult(
        agent_id="finder",
        status="unknown",
        reason="unavailable",
        draft=text("I can't search the catalog in this run.", "本次运行无法搜索作品目录。"),
        steps=[PendingStep("finder", "result", summary("finder.unavailable"), rule_based=True)],
        extra={"candidates": []},
    )


def _curator_stub(ctx: SupportContext) -> SpecialistResult:
    """Only if curator.py is missing: nothing to put in order, so no step."""
    return SpecialistResult(agent_id="curator", status="skipped", reason="unavailable", extra={"order": []})


_STUBS: dict[str, Specialist] = {"finder": _finder_stub, "curator": _curator_stub}


def specialist(name: str) -> Specialist:
    """The run function of agents/<name>.py, or its stub while that file doesn't exist."""
    try:
        module = importlib.import_module(f"server.b14_swarm.agents.{name}")
    except ModuleNotFoundError as exc:
        if exc.name == f"server.b14_swarm.agents.{name}" and name in _STUBS:
            return _STUBS[name]
        raise
    fn = getattr(module, "run", None)
    if fn is None:
        if name in _STUBS:
            return _STUBS[name]
        raise AttributeError(f"agents/{name}.py has no run()")
    return fn
