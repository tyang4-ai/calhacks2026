"""Cindy (`claude-haiku-5-5`, tool `route`): picks which specialists run, in what order, and which can
run side by side. She knows no facts of her own and never sees the person's words, only Intake's
intents and the side.

The server's checks after her call: the specialists must come from the route table for Intake's
intents and the side (buyer `finder`, `curator`, `steward`, `clerk`; seller `clerk`, `bookkeeper`,
`steward`). Unknown names are dropped, a specialist an intent needs and she left out is added after
hers, and the Curator always runs after the Finder, never beside it. The Writer is always added
last, by code, so it isn't hers to pick.

When the table leaves one specialist or none there's nothing to decide, so no call is made. When
her call fails or runs out of time, code uses the route table. Either way the step says rule-based.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel

from server.b14_swarm import llm, steps
from server.b14_swarm.agents import SupportContext
from server.b14_swarm.steps import PendingStep, summary

AGENT = "cindy"

SIDE_SPECIALISTS: dict[str, tuple[str, ...]] = {
    "buyer": ("finder", "curator", "steward", "clerk"),
    "seller": ("clerk", "bookkeeper", "steward"),
}

# Which specialists each intent needs, per side.
ROUTES: dict[str, dict[str, tuple[str, ...]]] = {
    "buyer": {
        "find": ("finder", "curator"),
        "piece_question": ("steward",),
        "authenticity": ("steward",),
        "culture": ("steward",),
        "order_status": ("clerk",),
        "shipping": ("clerk",),
        "returns": ("clerk",),
        "payout": (),
        "listing_help": (),
        "other": (),
    },
    "seller": {
        "find": (),
        "piece_question": ("steward",),
        "authenticity": ("steward",),
        "culture": ("steward",),
        "order_status": ("clerk",),
        "shipping": ("clerk",),
        "returns": ("clerk",),
        "payout": ("bookkeeper",),
        "listing_help": ("steward",),
        "other": (),
    },
}

# A specialist that needs another's result first.
DEPENDS: dict[str, str] = {"curator": "finder"}

JOBS = {
    "finder": "turns the request into search keywords and filters, and finds candidate pieces",
    "curator": "puts the Finder's candidates in order (needs the Finder's result)",
    "steward": "answers who made a piece and questions about the community, only by quoting the records",
    "clerk": "order status, shipping and returns, from the policy and the orders on screen",
    "bookkeeper": "a maker's payout, held amount and payout date, from the co-op's books",
}

SYSTEM = """You are Cindy, who routes one support question on Cindia to its specialist agents. You know no facts of your own and you answer nothing yourself.

Pick the specialists that should work on the question, only from the allowed list, in the order they should run. In parallel, list the ones that can run side by side because none of them needs another's result. routeNote: one short sentence on why. The Writer always runs last and isn't yours to pick."""


class CindyOut(BaseModel):
    specialists: list[str]
    parallel: list[str]
    routeNote: str


@dataclass
class Route:
    specialists: list[str]
    groups: list[list[str]]
    rule_based: bool
    reason: Optional[str] = None


def route_table(intents: list[str], side: str) -> list[str]:
    """The specialists the intents need on this side, in the order the intents come."""
    table = ROUTES.get(side, ROUTES["buyer"])
    out: list[str] = []
    for intent in intents:
        for name in table.get(intent, ()):
            if name not in out:
                out.append(name)
    return _ordered(out)


def _ordered(names: list[str]) -> list[str]:
    """Moves each specialist after the one it depends on."""
    out = list(names)
    for after, before in DEPENDS.items():
        if after in out and before in out and out.index(after) < out.index(before):
            out.remove(after)
            out.insert(out.index(before) + 1, after)
    return out


def groups_for(names: list[str], parallel: set[str]) -> list[list[str]]:
    """Consecutive specialists marked parallel share a group, unless one depends on another."""
    groups: list[list[str]] = []
    for name in names:
        current = groups[-1] if groups else None
        if (
            current is not None
            and name in parallel
            and all(n in parallel for n in current)
            and DEPENDS.get(name) not in current
            and not any(DEPENDS.get(n) == name for n in current)
        ):
            current.append(name)
        else:
            groups.append([name])
    return groups


def rule_groups(names: list[str]) -> list[list[str]]:
    """The route table's plan: everything independent side by side, then whatever depends on it."""
    first = [n for n in names if n not in DEPENDS]
    later = [n for n in names if n in DEPENDS]
    return [g for g in (first, later) if g]


def _norm(values: list[str]) -> list[str]:
    out: list[str] = []
    for v in values:
        if isinstance(v, str):
            k = v.strip().lower()
            if k and k not in out:
                out.append(k)
    return out


def check(out: CindyOut, intents: list[str], side: str) -> Route:
    """Her answer, held to the route table and the side."""
    allowed = route_table(intents, side)
    side_ok = set(SIDE_SPECIALISTS.get(side, ()))
    chosen = [s for s in _norm(out.specialists) if s in allowed and s in side_ok]
    chosen += [s for s in allowed if s not in chosen]
    chosen = _ordered(chosen)
    parallel = {s for s in _norm(out.parallel) if s in chosen}
    return Route(chosen, groups_for(chosen, parallel), rule_based=False)


def build_content(intents: list[str], side: str, allowed: list[str]) -> str:
    lines = [f"Side: {side}", f"Intents (from Intake): {', '.join(intents)}", "Allowed specialists:"]
    lines += [f"- {name}: {JOBS[name]}" for name in allowed]
    return "\n".join(lines)


def run(ctx: SupportContext) -> tuple[Route, list[PendingStep]]:
    intents, side = ctx.intake.intents, ctx.job.side
    allowed = route_table(intents, side)
    if not allowed:
        route = Route([], [], rule_based=True, reason="simple")
        return route, [PendingStep(AGENT, "route", summary("cindy.none"), rule_based=True)]
    if len(allowed) == 1:
        route = Route(allowed, [allowed], rule_based=True, reason="simple")
        return route, [PendingStep(AGENT, "call", summary("cindy.rule", reason="simple", agents=allowed), rule_based=True)]
    timeout = ctx.budget.for_call(AGENT, steps.WRITER_RESERVE_S)
    att = llm.attempt(AGENT, SYSTEM, build_content(intents, side, allowed), CindyOut, timeout)
    if att.ok:
        route = check(att.value, intents, side)
        key = "cindy.route_parallel" if any(len(g) > 1 for g in route.groups) else "cindy.route"
        return route, [PendingStep(AGENT, "call", summary(key, agents=route.specialists), ms=att.ms)]
    route = Route(allowed, rule_groups(allowed), rule_based=True, reason=att.reason)
    text = summary("cindy.rule", reason=att.reason or "rule", agents=allowed)
    return route, [PendingStep(AGENT, "call", text, ms=att.ms, rule_based=True)]


def handoff_step(approval_id: str) -> PendingStep:
    """Her step when a person takes over (code decides; she proposes, a person approves)."""
    return PendingStep(AGENT, "handoff", summary("cindy.handoff", approval=approval_id), rule_based=True)
