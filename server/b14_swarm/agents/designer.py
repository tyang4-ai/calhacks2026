"""The Designer (`claude-sonnet-5-5`, tool `community_page`): drafts a community's storefront as 4 to 6
blocks, each `{ blockId, kind, props }` (data-model.md, "Storefront blocks"; D1-25, A2-22).

The model picks which blocks and in what order, writes the hero's tagline and the titles, and puts
the community's pieces in order. Code builds every block, so the props are single strings or string
lists named as data-model.md gives them, in English (decisions.md, English only):

- hero `tagline`: the model's line when `content_check()` passes on it against the community and it
  holds no digits, else the community's own craft line from the records (the step says so),
- story `title` and `body` (the body is the community's `about`, shown under L8),
- pieces `pieceIds`: only the community's own pieces (any other is dropped, and the step says how
  many), or all of them in catalog order when none is left,
- process `title` and `body` (the body never renders),
- projects `projectIds`: the community's own projects,
- visit `address` (the region from the records, never a street address) and `hours`, always
  "Visits by arrangement". Never a phone, an email or opening hours (R22).

Block IDs are `blk_user_<tag>_<n>`. Publishing stays the owner's own `storefront.published`.
"""

from __future__ import annotations

import re
from typing import Any, Literal, Optional

from pydantic import BaseModel

from server.b14_swarm import content, llm, steps
from server.b14_swarm.steps import IdMint, PendingStep, Stopwatch, summary

AGENT = "designer"
KINDS = ("hero", "story", "pieces", "process", "projects", "visit")
REQUIRED = ("hero", "story", "pieces")
MIN_BLOCKS, MAX_BLOCKS = 4, 6
MAX_LINE = 90
VISIT_HOURS = "Visits by arrangement"
CONTACT = re.compile(r"\d|@|https?:|www\.|\bphone\b|\bcall\b|\bemail\b", re.IGNORECASE)

SYSTEM = """You are the Designer on Cindia, a demo marketplace for fictional Native American makers. You draft one community's storefront page from its records below.

Return:
- blocks: 4 to 6 block kinds in the order they should appear, from: hero, story, pieces, process, projects, visit. Always include hero, story and pieces.
- tagline: the hero's one plain line about the craft, under 80 characters. Describe what the makers make and how, never a People's name as a style, never words like authentic, ancient, tribal, spiritual or sacred, and no numbers.
- storyTitle and processTitle: short plain titles.
- pieceIds: the community's pieces below, best first, only from that list.

Code fills the story text, the projects and the visit block from the records. Never write an address, a phone number, an email or opening hours."""


class DesignerOut(BaseModel):
    blocks: list[Literal["hero", "story", "pieces", "process", "projects", "visit"]]
    tagline: str
    storyTitle: str
    processTitle: str
    pieceIds: list[str]


def _en(v: Any) -> str:
    return v.get("en", "").strip() if isinstance(v, dict) and isinstance(v.get("en"), str) else ""


def own_pieces(community: dict[str, Any], pieces: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cid = community.get("id")
    return [p for p in pieces if isinstance(p, dict) and isinstance(p.get("id"), str) and p.get("communityId") == cid]


def build_content(community: dict[str, Any], pieces: list[dict[str, Any]]) -> str:
    lines = [
        f"Community: {community.get('id')}, {_en(community.get('name'))}",
        f"Craft: {_en(community.get('craft'))}",
        f"About: {_en(community.get('about'))}",
        f"Projects: {len(community.get('projectIds') or [])}",
        "Pieces:",
    ]
    lines += [f"- {p['id']}: {_en(p.get('title'))}" for p in pieces] or ["- none"]
    return "\n".join(lines)


def _line_ok(s: str, community_id: Any) -> list[str]:
    """The check reasons a tagline or title fails, [] when it passes."""
    if not s or len(s) > MAX_LINE:
        return ["too_long" if s else "empty"]
    failed = [r for r in content.content_check(s, community_id, None).reasons()]
    if CONTACT.search(s):
        failed.append("typed_number")
    return failed


def group_word(community: dict[str, Any]) -> str:
    name = _en(community.get("name")).lower()
    return "studio" if "studio" in name else ("co-op" if "co-op" in name or "cooperative" in name else "community")


def blocks_for(out: DesignerOut, community: dict[str, Any], pieces: list[dict[str, Any]], ids: IdMint) -> tuple[list[dict[str, Any]], list[PendingStep]]:
    cid = community.get("id")
    checks: list[PendingStep] = []
    order: list[str] = []
    for k in out.blocks:
        if k in KINDS and k not in order:
            order.append(k)
    for k in REQUIRED:
        if k not in order:
            order.insert(min(REQUIRED.index(k), len(order)), k)
    if not community.get("projectIds"):
        order = [k for k in order if k != "projects"]
    for k in ("visit", "process", "projects"):
        if len(order) >= MIN_BLOCKS:
            break
        if k not in order and (k != "projects" or community.get("projectIds")):
            order.append(k)
    order = order[:MAX_BLOCKS]

    tagline = " ".join(out.tagline.split())
    failed = _line_ok(tagline, cid)
    if failed:
        tagline = _en(community.get("craft")) or "Made by hand"
        checks.append(PendingStep(AGENT, "check", summary("designer.tagline_rule", checks=[f for f in failed if f in steps.ENUMS["check"]] or ["empty"])))
    story_title = " ".join(out.storyTitle.split())
    if _line_ok(story_title, cid):
        story_title = f"About the {group_word(community)}"
    process_title = " ".join(out.processTitle.split())
    if _line_ok(process_title, cid):
        process_title = "How it's made"

    own = [p["id"] for p in own_pieces(community, pieces)]
    picked = [pid for pid in dict.fromkeys(x.strip() for x in out.pieceIds if isinstance(x, str)) if pid in own]
    dropped = len([x for x in out.pieceIds if isinstance(x, str) and x.strip() not in own])
    if dropped:
        checks.append(PendingStep(AGENT, "check", summary("designer.dropped", count=dropped)))
    picked = picked or own[:12]

    props: dict[str, dict[str, Any]] = {
        "hero": {"tagline": tagline},
        "story": {"title": story_title, "body": _en(community.get("about"))},
        "pieces": {"pieceIds": picked},
        "process": {"title": process_title, "body": ""},
        "projects": {"projectIds": [p for p in community.get("projectIds") or [] if isinstance(p, str)]},
        "visit": {"address": _en(community.get("place")), "hours": VISIT_HOURS},
    }
    blocks = [{"blockId": ids.next("blk"), "kind": k, "props": props[k]} for k in order]
    return blocks, checks


def run(community: dict[str, Any], pieces: list[dict[str, Any]], ids: IdMint, budget: steps.Budget) -> tuple[Optional[list[dict[str, Any]]], list[PendingStep], Optional[str]]:
    """(the blocks or None, the steps, the failure's contract code when there are no blocks)."""
    own = own_pieces(community, pieces)
    w = Stopwatch()
    page_step = PendingStep(AGENT, "tool", summary("designer.tool_page", community=community.get("id"), count=len(own)), tool="community_page", ms=w.ms())
    timeout = budget.for_call(AGENT, steps.TEMPLATE_RESERVE_S)
    att = llm.attempt(AGENT, SYSTEM, build_content(community, own), DesignerOut, timeout)
    if not att.ok:
        return None, [page_step, PendingStep(AGENT, "result", summary("designer.failed", reason=att.reason or "error"), ms=att.ms, rule_based=True)], \
            att.code or "invalid_model_output"
    blocks, checks = blocks_for(att.value, community, pieces, ids)
    kinds = [b["kind"] for b in blocks]
    return blocks, [page_step, PendingStep(AGENT, "result", summary("designer.drafted", count=len(blocks), kinds=kinds), ms=att.ms)] + checks, None
