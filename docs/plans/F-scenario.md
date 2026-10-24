# F-scenario · The judge's scenario (F17)

Priority: P1 · Wave: W2 · Depends on: G4 · Folder: src/features/scenario/ · Made real by: B05

## Goal
A judge drops in a statement or CSV and Cindy works through it on the spot. If the judge brings nothing, one click loads the held-back sample statement, so the moment still happens.

## Read first
- `docs/common/data-model.md`: the IDs that live only in events (`scn_01` and the `scn_` record IDs), the Statement, Match and Flag rows, and `src/mock/scenario.ts` in the files table.
- `docs/common/events.md`: `scenario.loaded`, `record.arrived`, `match.made`, `flag.raised`, Requests from people (the registry answers `scenario.loaded`, 1.2 seconds later on the player clock), and the store.
- `docs/common/ui-contract.md`: the `studio.month.side` slot and its source key, the `month` view, Language, Simulated badge, Test hooks.
- `docs/common/design-system.md`: `Panel`, `Button`, `Flag`, `EvidenceCard`, `LedgerTable`, and the words-on-screen rules for errors and empty states.
- `docs/common/glossary.md`: statement, match, flag, the catch, contract.

## Interfaces
- Reads:
  - Data: the held-back statement in `src/mock/scenario.ts` (its `scn_01` ID, file name and record IDs), and the gallery contract.
  - Store keys: `scenario`, `month`, `mode`, `clock`. The language comes from `SlotProps.lang`.
  - UI kit: `Panel` (declaring `b05-scenario`), `Button`, `Flag`, `EvidenceCard`, `LedgerTable`.
- Emits: `scenario.loaded` with `source: "user"` and `key: "b05-scenario"` (`scenarioId: "scn_01"`, the sample's `fileName` and `recordIds`) when someone picks the sample. The sources registry answers with the sample's `record.arrived`, `match.made` and `flag.raised` events, scripted from `src/mock/scenario.ts` or live from B05. The feature never writes those itself.
- Exports: `{ id: "scenario", slots: { "studio.month.side": ScenarioPanel } }` from `src/features/scenario/index.ts`.
- Test IDs, all internal to this feature: `scenario-panel`, `scenario-dropzone`, `scenario-use-sample`, `scenario-file`, `scenario-note`, `scenario-results`, `scenario-flag`.
- Source key: `b05-scenario`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Drop zone: drag and drop or a file picker for .csv, .xlsx and .pdf. It shows the file's name. In scripted mode it never reads, uploads or emits anything for a dropped file. Instead `scenario-note` says reading files comes with the live upgrade and offers the sample | `src/features/scenario/DropZone.tsx`, `tests/features/scenario-drop.spec.ts` | none | opus |
| T2 | Sample and results: "Use the sample statement" emits the request above, and the results list shows the sample's records with their matches and any flag, read from the store and filtered to the `scn_` records | `src/features/scenario/ScenarioResults.tsx`, `src/features/scenario/useSample.ts`, `tests/features/scenario-sample.spec.ts` | none | opus |
| T3 | Assemble the panel and wire the slot (lead) | `src/features/scenario/ScenarioPanel.tsx`, `src/features/scenario/index.ts` | T1, T2 | lead |

T1 and T2 run side by side. Builders run their own spec with `npm run test:feature -- scenario`, moving the player past the 1.2-second answer delay with `window.__cindia.player.seek()`.

## Acceptance
- Given the console's month view, then `scenario-panel` shows `scenario-dropzone` and `scenario-use-sample`.
- When `scenario-use-sample` is clicked, then the store holds `scenario.loaded` with `source: "user"` and `key: "b05-scenario"`, and once the player moves 1.2 seconds on, `scenario-results` lists the sample's records with their matches and `scenario-flag` shows its flag if the sample has one.
- When a file is dropped in scripted mode, then `scenario-file` shows its name, `scenario-note` explains that files are read by the live upgrade and offers the sample, and no event is emitted.
- Using the sample twice shows each result once.
- The sample never changes September's totals, the proof score or the close.
- No request goes beyond localhost, and a dropped file is never uploaded in scripted mode.
- In scripted mode the panel shows `simulated-badge`.

## Out of scope
- Parsing a dropped file and running the real matcher on it. That's B05, which also needs a way to hand the adapter the file itself, since `scenario.loaded` carries only its name.
- Saving uploads, more than one scenario at a time, and scoring the scenario in the proof panel.
