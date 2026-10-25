"""The agent roster: 21 roles, mirroring docs/common/api-contract.md "The agent roster" and
src/mock/agents.ts exactly (agent ID, name, kind, model and tools, in the roster's order).

Fifteen run on Claude, each on `claude-haiku-5-5` or `claude-sonnet-5-5` from server/config.py and
nothing else. Six are plain code with no model, which the swarm view labels "rule-based". Each
Claude agent also has its own `max_tokens` and call timeout here, sized to its small typed answer
and to the run's 19-second budget.

`allowed(agent_id, tool)` is the only way a tool gets called (tools.py asks it first).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from server import config

HAIKU = config.MODEL_FAST
SONNET = config.MODEL_DEFAULT


@dataclass(frozen=True)
class AgentSpec:
    agent_id: str
    name_en: str
    name_zh: str
    kind: str  # "claude" or "code"
    model: Optional[str]
    tools: tuple[str, ...]
    max_tokens: int = 0
    timeout_s: float = 0.0


class UnknownAgent(KeyError):
    """An agent ID that isn't in the roster."""


class ToolNotAllowed(PermissionError):
    """An agent asked for a tool its roster entry doesn't list."""


def _claude(agent_id: str, en: str, zh: str, model: str, tools: tuple[str, ...], max_tokens: int, timeout_s: float) -> AgentSpec:
    return AgentSpec(agent_id, en, zh, "claude", model, tools, max_tokens, timeout_s)


def _code(agent_id: str, en: str, zh: str, tools: tuple[str, ...]) -> AgentSpec:
    return AgentSpec(agent_id, en, zh, "code", None, tools)


# max_tokens is a ceiling a little above each answer's size. Haiku answers at roughly 180 tokens a
# second after a 1 to 2.7 second wait, Sonnet at roughly 165 after about 2.5 seconds (B02, B09).
ROSTER: tuple[AgentSpec, ...] = (
    _claude("cindy", "Cindy", "Cindy", HAIKU, ("route",), 160, 3.0),
    _claude("intake", "Intake", "接待", HAIKU, (), 300, 4.0),
    _claude("finder", "Finder", "检索", HAIKU, ("cindia_search", "elastic_agent"), 200, 4.0),
    _claude("curator", "Curator", "精选", SONNET, (), 160, 4.5),
    _claude("steward", "Steward", "文化与认证", SONNET, ("community_page", "verification_record"), 120, 4.5),
    _claude("clerk", "Clerk", "订单", HAIKU, ("order_lookup", "policy"), 450, 4.5),
    _claude("writer", "Writer", "撰写", SONNET, (), 700, 7.0),
    _claude("lister", "Lister", "上架", SONNET, (), 900, 8.0),
    _claude("describer", "Describer", "看图", SONNET, ("image",), 400, 6.0),
    _claude("tagger", "Tagger", "标签", HAIKU, ("community_page",), 200, 4.0),
    _claude("checker", "Checker", "核查", SONNET, ("community_page",), 500, 6.0),
    _code("indexer", "Indexer", "索引", ("embed", "index_write")),
    _code("matcher", "Matcher", "对账", ("b01",)),
    _claude("explainer", "Explainer", "解释", SONNET, ("b02",), 700, 6.0),
    _code("bookkeeper", "Bookkeeper", "记账", ("b06", "b10")),
    _code("scorer", "Scorer", "评分", ("b03",)),
    _code("scout", "Scout", "巡查", ("apify_crawl",)),
    _code("comparer", "Comparer", "比对", ("embed",)),
    _claude("claims", "Claims", "声明核查", HAIKU, (), 300, 5.0),
    _claude("reporter", "Reporter", "报告", SONNET, (), 300, 5.0),
    _claude("designer", "Designer", "设计", SONNET, ("community_page",), 800, 8.0),
)

_BY_ID: dict[str, AgentSpec] = {a.agent_id: a for a in ROSTER}

# Tools the run calls as code on an agent's behalf, outside the roster's lists (contracts section
# 6, D1-41): arrival_window for the Clerk, so no model does date arithmetic.
CODE_TOOLS: frozenset[str] = frozenset({"arrival_window"})


def spec(agent_id: str) -> AgentSpec:
    try:
        return _BY_ID[agent_id]
    except KeyError:
        raise UnknownAgent(agent_id) from None


def is_agent(agent_id: str) -> bool:
    return agent_id in _BY_ID


def allowed(agent_id: str, tool: str) -> bool:
    """Whether the roster lets this agent call this tool."""
    a = _BY_ID.get(agent_id)
    return a is not None and tool in a.tools


def require(agent_id: str, tool: str) -> None:
    """Raises ToolNotAllowed unless the roster lists this tool for this agent."""
    if not allowed(agent_id, tool):
        raise ToolNotAllowed(f"{agent_id} may not call {tool}")


def model_for(agent_id: str) -> Optional[str]:
    """The agent's model, or None for a code agent."""
    return spec(agent_id).model


def claude_agents() -> list[AgentSpec]:
    return [a for a in ROSTER if a.kind == "claude"]
