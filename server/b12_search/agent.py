"""Elastic Agent Builder: the agent `cindia-finder` and its one tool (B12-search.md, Agent Builder; C-3).

Kibana paths used (from docs/tech/elastic-agent-builder/kibana-api.md, api-tools.md, api-agents.md
and api-converse.md, read on 2026-10-24; the base is KIBANA_URL, default space):
- `GET  /api/agent_builder/tools/{toolId}` then `PUT /api/agent_builder/tools/{toolId}` (update:
  description, configuration, tags) or `POST /api/agent_builder/tools` (create: id, type,
  description, configuration, tags). The tool is `cindia.search_pieces`, type `index_search`,
  configuration `{"pattern": "cindia-pieces"}`, so it searches only the active pieces' alias and a
  draft in `cindia-drafts` can never reach it. Its one input is `nlQuery`.
- `GET  /api/agent_builder/agents/{id}` then `PUT /api/agent_builder/agents/{id}` (name, description,
  configuration, labels) or `POST /api/agent_builder/agents` (id, name, description, configuration
  with `instructions` and `tools[].tool_ids`).
- `POST /api/agent_builder/converse` `{ "agent_id": "cindia-finder", "input": text }`, which waits
  for the whole run and answers `{ conversation_id, response: { message }, steps: [...] }`.

Every call sends config.elastic_headers() (nothing in proxy mode, where the network secret adds the
key) and `kbn-xsrf: true` on writes. Nothing here logs a header, a URL or a response body.

`converse(text)` returns `{ "pieceIds", "ms" }`: the piece IDs named in the agent's answer and its
tool results, in order, each once, keeping only active catalog pieces (and pieces this process
published). The prose answer is dropped and never reaches another agent (B2-26). It has a
6-second timeout and raises AgentError on any failure, a token-limit error included, which the seed
records as `agentBuilder: false`. Keep calls few: the trial restricts LLM tokens, and Serverless
includes 1,000 executions a month.
"""

from __future__ import annotations

import logging
import re
import time
from collections.abc import Iterable
from typing import Any

import httpx

from server import config
from server.b12_search import elastic, thresholds

log = logging.getLogger("cindia.b12")

AGENT_ID = "cindia-finder"
TOOL_ID = "cindia.search_pieces"
TOOL: dict[str, Any] = {
    "id": TOOL_ID,
    "type": "index_search",
    "description": (
        "Searches Cindia's catalog of fictional handmade pieces in the cindia-pieces index. Every document "
        "there is an active piece with pieceId, title_en, title_zh, object, craft, materials, techniques, "
        "motifs, colors, moods, occasions, recipients and priceCents (in cents)."
    ),
    "configuration": {"pattern": elastic.PIECES},
    "tags": ["cindia", "search"],
}
INSTRUCTIONS = (
    "You find pieces in Cindia's demo catalog. Every maker and piece in it is fictional. "
    "Call the cindia.search_pieces tool exactly once, with the person's words as nlQuery. It reads the "
    "cindia-pieces index, where every piece has status active. Then answer only with pieces that call "
    "returned, never with pieces you imagine: name each by its pieceId (like pc_07), at most six, best "
    "first, one per line, and write nothing else. Prices are in cents (priceCents 10000 is $100), and "
    "place names the region a piece comes from. If the call returned nothing, answer NONE."
)
AGENT: dict[str, Any] = {
    "id": AGENT_ID,
    "name": "Cindia finder",
    "description": "Finds active pieces in Cindia's fictional demo catalog and answers with their pieceIds.",
    "labels": ["cindia"],
    "configuration": {"instructions": INSTRUCTIONS, "tools": [{"tool_ids": [TOOL_ID]}]},
}

# Measured 2026-10-24 23:50 PT: with the default reasoning and no "exactly once", one conversation
# made three tool calls and took 37.5 s. With "none" and one tool call, 7.1 s (3 LLM calls).
REASONING_LEVEL = "none"

PIECE_ID = re.compile(r"\bpc_(?:user_[a-z0-9]{6}_)?\d{1,4}\b")


class AgentError(Exception):
    """Agent Builder failed. The message is one plain sentence."""


def _kibana() -> httpx.Client:
    if not elastic.kibana_configured():
        raise AgentError("Agent Builder isn't configured (KIBANA_URL and the Elastic key).")
    return elastic.client_for(str(config.KIBANA_URL))


def _call(method: str, path: str, timeout: float, body: Any = None) -> httpx.Response:
    client = _kibana()
    headers = {"Content-Type": "application/json"}
    if method in ("POST", "PUT", "DELETE"):
        headers["kbn-xsrf"] = "true"
    try:
        return client.request(method, path, json=body, headers=headers, timeout=max(0.1, timeout))
    except httpx.TimeoutException:
        raise AgentError("Agent Builder didn't answer in time.") from None
    except httpx.HTTPError as exc:
        raise AgentError(f"Agent Builder couldn't be reached ({type(exc).__name__}).") from None


def _check(resp: httpx.Response, what: str) -> httpx.Response:
    if resp.status_code >= 400:
        raise AgentError(f"Agent Builder answered {resp.status_code} to {what}.")
    return resp


def _upsert(get_path: str, create_path: str, create_body: dict[str, Any], update_body: dict[str, Any],
            budget: elastic.Budget, what: str) -> None:
    resp = _call("GET", get_path, budget.timeout(5.0))
    if resp.status_code == 200:
        _check(_call("PUT", get_path, budget.timeout(8.0), update_body), f"the {what} update")
        return
    if resp.status_code != 404:
        _check(resp, f"the {what} lookup")
    created = _call("POST", create_path, budget.timeout(8.0), create_body)
    if created.status_code == 409:  # made by a parallel call meanwhile
        _check(_call("PUT", get_path, budget.timeout(8.0), update_body), f"the {what} update")
        return
    _check(created, f"the {what} creation")


def ensure_agent(budget: elastic.Budget | None = None) -> None:
    """Creates or updates the tool `cindia.search_pieces` and the agent `cindia-finder`."""
    budget = budget or elastic.Budget(20.0)
    try:
        _upsert(f"/api/agent_builder/tools/{TOOL_ID}", "/api/agent_builder/tools", dict(TOOL),
                {k: TOOL[k] for k in ("description", "configuration", "tags")}, budget, "tool")
        _upsert(f"/api/agent_builder/agents/{AGENT_ID}", "/api/agent_builder/agents", dict(AGENT),
                {k: AGENT[k] for k in ("name", "description", "labels", "configuration")}, budget, "agent")
    except elastic.ElasticError as exc:
        raise AgentError(exc.message) from None


def _strings(value: Any) -> Iterable[str]:
    """Every string inside a JSON value, depth first."""
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for v in value.values():
            yield from _strings(v)
    elif isinstance(value, list):
        for v in value:
            yield from _strings(v)


def piece_ids(body: Any, valid: set[str]) -> list[str]:
    """The valid piece IDs the agent's answer names, in order, each once. Only when the answer has
    no message at all are its tool results read instead. "NONE" names nothing."""
    out: list[str] = []
    resp = body.get("response") if isinstance(body, dict) else None
    message = resp.get("message") if isinstance(resp, dict) else None
    texts: list[str] = [message] if isinstance(message, str) else []
    if not isinstance(message, str):
        for step in (body.get("steps") if isinstance(body, dict) else None) or []:
            if isinstance(step, dict) and step.get("type") == "tool_call":
                texts.extend(_strings(step.get("results") or []))
    for text in texts:
        for pid in PIECE_ID.findall(text):
            if pid in valid and pid not in out:
                out.append(pid)
    return out


def converse(text: str, valid: set[str], timeout: float = thresholds.CONVERSE_TIMEOUT_S) -> dict[str, Any]:
    """One message to cindia-finder. `{ "pieceIds", "ms" }`, only IDs in `valid`, no prose."""
    t0 = time.monotonic()
    body_out = {"agent_id": AGENT_ID, "input": str(text)[:1000], "reasoning_level": REASONING_LEVEL}
    resp = _call("POST", "/api/agent_builder/converse", timeout, body_out)
    if resp.status_code >= 400:
        raise AgentError(f"Agent Builder answered {resp.status_code} to the conversation.")
    try:
        body = resp.json()
    except ValueError:
        raise AgentError("Agent Builder's answer wasn't JSON.") from None
    ms = int((time.monotonic() - t0) * 1000)
    return {"pieceIds": piece_ids(body, valid), "ms": ms}
