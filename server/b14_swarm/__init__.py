"""B14 · the agent swarm (`b14-swarm`, docs/plans/B14-swarm.md).

Customer service for buyers and sellers, run by narrow agents on Claude: each has one job, its own
small typed input and output, only the tools that job needs, and `claude-haiku-5-5` or
`claude-sonnet-5-5` and nothing else. Cindy routes and knows no facts of her own. Code fills every
number, date and quote, so an agent can't invent one, and anything that would move money becomes
an approval for a person, never an action.

The modules:

- `llm.py`: the one Claude call path (`parse()`), with the speed settings, the timeout in a worker
  thread, and the refusal, `max_tokens` and error mapping.
- `steps.py`: the run recorder (`swarm.step` payloads, the B13 bridge queue), the person-scoped IDs,
  the fixed-phrase summaries, the budget and the event envelope.
- `content.py`: `content_check()`, against `contentRules` from `artifacts/mock/mock.json`.
- `roster.py`: the 21 agents and `allowed(agent_id, tool)`.
- `tools.py`: the records each side may see and the tools that read them.
- `agents/`: one file per agent. `run.py`: the support run.

The router (`server/routers/b14_swarm.py`) is a later task; nothing here calls out at import time.
"""

KEY = "b14-swarm"
