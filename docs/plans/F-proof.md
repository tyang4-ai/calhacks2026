# F-proof · The proof panel (F15)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/proof/ · Made real by: B03

## Goal
During questions, the proof panel shows the four planted errors, which ones Cindy caught, and a score that fills to "Caught 4 of 4". Every part of the system carries a real or simulated label, so judges see exactly what's live.

## Read first
- `docs/common/data-model.md`: Planted errors and the answer key, the Match and Flag rows, Demo-critical figure 10, and `src/mock/answerKey.ts` in the files table.
- `docs/common/events.md`: `proof.scored`, `match.made`, `flag.raised`, the `SourceKey` list, and the store.
- `docs/common/ui-contract.md`: the `studio.proof.main` slot and its source key, the `proof` view, Language, Simulated badge, Test hooks, and the test IDs below.
- `docs/common/design-system.md`: `Panel`, `Badge`, `Flag`, `LedgerTable`, the motion tokens.
- `docs/common/glossary.md`: proof panel, planted error, score, match, flag, and the four match and flag kinds.
- `docs/common/demo-script.md`: `proof.scored` at 59.0 in `d11-receipt`, and After the 60 seconds.

## Interfaces
- Reads:
  - Events: `proof.scored` (`caught`, `total`, `results: { errorId; caught }[]`), `match.made`, `flag.raised`.
  - Store keys: `proof`, `month`, `sources`, `mode`, `clock`. The language comes from `SlotProps.lang`.
  - Data: the four planted errors and their expected results from `src/mock/answerKey.ts`, and the records they name through `getById()`.
  - UI kit: `Panel` (declaring `b03-proof`), `Badge`, `Flag`, `LedgerTable`, the motion helpers.
- Emits: nothing.
- Exports: `{ id: "proof", slots: { "studio.proof.main": ProofPanel } }` from `src/features/proof/index.ts`.
- Test IDs: `proof-score`, `proof-item-<errorId>` for `err_01` to `err_04`. Internal to this feature: `proof-sources` (the real or simulated list) and `proof-source-<key>` for each of the ten source keys.
- Source key: `b03-proof` for the badge. The real or simulated list reads every key in `sources`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Scoreboard: "Caught N of M" from `proof.scored`, filling once on the player clock and final at once after a `seek()`. Before the event it says the test hasn't been scored yet | `src/features/proof/Scoreboard.tsx`, `tests/features/proof-score.spec.ts` | none | opus |
| T2 | Error list: one row per planted error in answer-key order, with its kind label, the records it involves (short labels through `getById()`), what a correct matcher reports, and caught or missed from `proof.scored` | `src/features/proof/ErrorList.tsx`, `tests/features/proof-errors.spec.ts` | none | opus |
| T3 | Real or simulated list: the ten source keys with a label for each part and its current state from `sources`, updating when live mode delivers a key | `src/features/proof/SourceList.tsx`, `tests/features/proof-sources.spec.ts` | none | opus |
| T4 | Assemble the panel (scoreboard, error list and source list in one `Panel`) and wire the slot (lead) | `src/features/proof/ProofPanel.tsx`, `src/features/proof/index.ts` | T1, T2, T3 | lead |

T1, T2 and T3 can run side by side. Builders run their own spec with `npm run test:feature -- proof`.

## Acceptance
- Given the player has passed `proof.scored` (59.0 in the demo timeline), then `proof-score` reads "Caught 4 of 4" from the payload's `caught` and `total`.
- Then `proof-item-err_01` to `proof-item-err_04` each show caught, with the kind and the records from the answer key.
- Given a `proof.scored` with `err_03` not caught, sent with `window.__cindia.emit()`, then `proof-item-err_03` shows missed and `proof-score` reads "Caught 3 of 4".
- Given the player is before `proof.scored`, then `proof-score` says it isn't scored yet, and each item shows its expected result without a verdict.
- In scripted mode, every `proof-source-<key>` reads simulated, and the panel shows `simulated-badge`.
- Given `sources["b01-match"]` turns `"live"`, then `proof-source-b01-match` reads real and the other nine don't change.
- Opened at `/studio/proof` any time after `proof.scored`, the panel shows the same result as when the demo plays through.

## Out of scope
- Running the matcher or scoring it. B03 does that on the server.
- Editing the answer key, adding test cases, and scoring the judge's scenario (F-scenario).
