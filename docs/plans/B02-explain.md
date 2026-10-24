# B02-explain · Claude explains the catch (F8, F9)

Priority: P2 · Wave: P2 · Depends on: G4 · Folder: server/routers/ · Source key: `b02-explain` · Makes real: F-reconcile (the explanation), F-approvals (the follow-up draft) · Estimate: 1.5 h

**SCOPE:** `server/routers/b02_explain.py, src/sources/live/b02-explain.ts, tests/server/test_b02_explain.py, tests/server/b02_records.json`

## Goal

Claude reads the gallery's contract, its September statement and the bank deposit, says which record to trust and why, in English and Chinese, and drafts a polite follow-up asking for the $340. This is Anthropic's minimum for real use of Claude, and the moment Hyphenate wants to see.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, and B02
- `docs/common/events.md`: The month (`flag.explained`), Approvals, Sources and live replacement
- `docs/common/data-model.md`: Flag, FollowUp, Demo-critical figures 4 and 9
- `docs/plans/F-reconcile.md` and `docs/plans/F-approvals.md`
- In the vault docs folder: `ch13-tech-stack.md` (Claude, from the backend), `docs/claude-api/structured-outputs.md`, `docs/claude-api/migration-2026-10-21.md`
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoint:** `POST /api/b02/explain`. Needs `ANTHROPIC_API_KEY`. `claude-sonnet-5-5` with a 6-second timeout.
- **Structured answer:** the `CatchExplanation` Pydantic model in `api-contract.md`, through `client.messages.parse()` with `output_format`.
- **Server checks before using the answer:** `trusted_record_id` is one of the flag's `recordIds`, and `delta_cents` equals the flag's `deltaCents`. Either check failing is `invalid_model_output`.
- **The prompt:** Cindy speaks in first person, short and plain. She may use only the numbers in the records. She names the contract's 40% commission and the statement's 50%. She says what she's unsure about instead of guessing. The follow-up is polite and specific, asks for the difference, and promises nothing on the owner's behalf.
- **Replaces:** the scripted `flag.explained` for `flg_01`, and the scripted follow-up draft once `events.md` has a `followup.drafted` event. Until then, B02 returns only `flag.explained` and lists the missing event under `needs:`.
- **Adapter** (`src/sources/live/b02-explain.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b02` and `keys.anthropic` is true.
  - `produce(event)`: for the keyed `flag.explained`, post the flag and its three records from `src/mock` and return the result.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The route, the prompt, the Pydantic model and the two checks | `server/routers/b02_explain.py` | none | opus |
| T2 | Fixture and tests. A fake client returns a good answer, a wrong `delta_cents` (expect 502 `invalid_model_output`) and a timeout (expect 504). One live test makes one real call | `tests/server/b02_records.json`, `tests/server/test_b02_explain.py` | T1 | opus |
| T3 | The live adapter | `src/sources/live/b02-explain.ts` | T1 | opus |

## Acceptance

- With the key, the live test's explanation names `ctr_gallery_01` as the record to trust and mentions $340 in both languages.
- Without the key, the endpoint returns 503 `key_missing`, `health()` is false, and the scripted explanation plays.
- A wrong record ID or amount from Claude never reaches the screen: the server returns `invalid_model_output` and the scripted text plays.
- The catch shows Claude's explanation in live mode, and its `Simulated` badge goes away for `b02-explain`.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- Actually sending the follow-up. `followup.sent` stays simulated, and the Devpost says so.
- Explaining flags other than `flg_01`, chat, and streaming.
