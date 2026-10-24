# B09-concierge · The shopping concierge (F1)

Priority: P2 · Wave: P2 · Depends on: G4 · Folder: server/routers/ · Source key: `b09-concierge` · Makes real: F-buyer (the gift finder) · Estimate: 1 h

**SCOPE:** `server/routers/b09_concierge.py, src/sources/live/b09-concierge.ts, tests/server/test_b09_concierge.py, tests/server/b09_catalog.json`

## Goal

The gift finder's three picks come from Claude reading the catalog, with a reason for each in English and Chinese. Visa wants AI that does more than chat, and this is the first thing a judge sees.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, and B09
- `docs/common/events.md`: Buyer (`concierge.asked`, `concierge.answered`), Sources and live replacement
- `docs/common/data-model.md`: Piece, The catalog, Demo-critical figure 2
- `docs/plans/F-buyer.md` and `docs/common/demo-script.md` (the first beats)
- In the vault docs folder: `ch13-tech-stack.md` (Claude, from the backend), `docs/claude-api/structured-outputs.md`
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoint:** `POST /api/b09/concierge`. Needs `ANTHROPIC_API_KEY`. `claude-haiku-5-5` with a 4-second timeout, because it opens the demo.
- **Structured answer** through `client.messages.parse()`: exactly three picks, each `{ piece_id, reason_en, reason_zh }`. Each reason is one plain sentence about the piece itself: the maker, the craft, the motif or the hours.
- **Server checks:** every `piece_id` is in the catalog, the three are different, and a price limit in the query holds. A failed check is `invalid_model_output`.
- **Replaces:** the keyed `concierge.answered` in the demo timeline.
- **Keeping the demo whole:** the next scripted beat opens `pc_01`. If Claude's picks don't include `pc_01`, the adapter returns `[]` and the scripted answer plays. A buyer's own query, once the registry can pass one to adapters, has no such check.
- **Adapter** (`src/sources/live/b09-concierge.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b09` and `keys.anthropic` is true.
  - `produce(event)`: post the query and the catalog from `src/mock` and return the result.
  - A buyer's own typed query reaches the adapter only once the sources registry passes a person's keyed actions to adapters. Until then, list it under `needs:`.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The route, the prompt, the Pydantic model and the checks | `server/routers/b09_concierge.py` | none | opus |
| T2 | Fixture and tests with a fake client: a good answer, an unknown piece, a repeated piece, a pick over the budget (each 502), a timeout (504). One live test sends the demo query | `tests/server/b09_catalog.json`, `tests/server/test_b09_concierge.py` | T1 | opus |
| T3 | The live adapter, including the `pc_01` check | `src/sources/live/b09-concierge.ts` | T1 | opus |

## Acceptance

- The demo query returns three different pieces under $200, each with a reason in both languages.
- A slow or wrong answer never holds up the demo: the scripted `pc_01`, `pc_07`, `pc_11` plays instead.
- In live mode the gift finder shows Claude's picks and reasons, and its `Simulated` badge goes away for `b09-concierge`.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- Search over anything but the twelve catalog pieces, images, and a chat with follow-up questions.
