# B07-ask · Ask Cindy with Claude and tools (F14)

Priority: P2 · Wave: P2 · Depends on: G4 · Folder: server/routers/ · Source key: `b07-ask` · Makes real: F-ask-cindy · Estimate: 1.5 h

**SCOPE:** `server/routers/b07_ask.py, src/sources/live/b07-ask.ts, tests/server/test_b07_ask.py, tests/server/b07_records.json`

## Goal

The owner asks in Chinese or English, for example 这个月哪件作品最赚钱?, and Claude answers from the studio's own records with a short card and a chart. Claude calls tools that compute the numbers in Python, so no number on screen comes from the model's memory. Anthropic and Microsoft both look for this.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, and B07
- `docs/common/events.md`: Proof, Ask Cindy, the scenario (`ask.asked`, `ask.answered`, `ChartSpec`), Sources and live replacement
- `docs/common/data-model.md`: Order, Piece, MakerStatement, Money rules
- `docs/plans/F-ask-cindy.md`
- In the vault docs folder: `ch13-tech-stack.md` (Claude, from the backend), `docs/claude-api/` (tool use and strict mode), `docs/anthropic-sdk-python/tools.md` and `example-tools.py`
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoint:** `POST /api/b07/ask`. Needs `ANTHROPIC_API_KEY`. `claude-sonnet-5-5`, at most 4 tool rounds, 6.5 seconds in total.
- **Tools,** all strict with `"additionalProperties": false`, run by the server over the request's `records`:
  - `revenue_by_piece(month_id)`, `revenue_by_channel(month_id)`, `maker_earnings(month_id)`: rows of label and cents.
  - `find_records(kind, ids)`: the matching records.
  - `answer(answer_en, answer_zh, chart, ref_ids)`: ends the loop. `chart` is a ChartSpec from `events.md` or null.
- **Server checks on `answer`:** every `ref_ids` entry exists in the records, and every chart value equals a value some tool returned in this request. A failed check is `invalid_model_output`.
- **The prompt:** Cindy answers in the question's language first, but always fills both. Numbers only from tool results. She says plainly when the records can't answer.
- **Answers people:** the demo timeline holds no `ask.asked` or `ask.answered`, because Gordon asks during questions. Every question the owner sends, a suggestion or a typed one, arrives as an `ask.asked` request with `source: "user"`, and the registry passes it to this adapter in live mode (Requests from people in `events.md`).
- **Adapter** (`src/sources/live/b07-ask.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b07` and `keys.anthropic` is true.
  - `produce(event)`: for a person's `ask.asked`, post its `questionId`, `text` and `lang` with the records from `src/mock`, and return the result.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The tools, the loop, the checks and the route | `server/routers/b07_ask.py` | none | opus |
| T2 | Fixture and tests with a fake client that scripts the tool calls: a good answer, too many rounds (504), a chart value no tool returned (502), an unknown ref ID (502). One live test asks the first canned question | `tests/server/b07_records.json`, `tests/server/test_b07_ask.py` | T1 | opus |
| T3 | The live adapter | `src/sources/live/b07-ask.ts` | T1 | opus |

## Acceptance

- 这个月哪件作品最赚钱? returns an answer naming the top piece by revenue as `revenue_by_piece` computed it, with a bar chart whose values equal that tool's rows, in both languages.
- Wrong IDs or invented numbers never reach the screen.
- In live mode the Ask Cindy panel shows the server's answers, and its `Simulated` badge goes away for `b07-ask`.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- Conversation memory between questions, voice input, and writing to the records.
