# F-scenario · The judge's scenario (F17)

Priority: P1 · Wave: W2 · Depends on: G4 · Folder: src/features/scenario/ · Made real by: B05

## Goal
A judge drops in a statement or CSV and Cindy works through it on the spot. If the judge brings nothing, one click loads the held-back sample statement, so the moment still happens.

## Read first
- `docs/common/data-model.md`: the Statement and Match rows, the Flag row, and `src/mock/scenario.ts` in the files table.
- `docs/common/events.md`: `scenario.loaded`, `record.arrived`, `match.made`, `flag.raised`, `flag.explained`, the envelope (`source` and `key`), the store, and the Simulated badge rule.
- `docs/common/ui-contract.md`: the `studio.month.side` slot, the `month` view, the test IDs below, and the test hook for driving the player.
- `docs/common/design-system.md`: `Panel`, `Button`, `Flag`, `EvidenceCard`, `LedgerTable`, `Badge`, the words-on-screen rules for errors and empty states.
- `docs/common/glossary.md`: statement, match, flag, the catch, contract.

## Interfaces
- Reads:
  - Data: the held-back statement in `src/mock/scenario.ts` and the scripted events for it, and the gallery contract.
  - Store keys: `scenario`, `month`, `sources`, `mode`, `lang`, `clock`.
  - UI kit: `Panel`, `Button`, `Flag`, `EvidenceCard`, `LedgerTable`, `Badge` (Simulated).
- Emits: `scenario.loaded` with `source: "scripted"` and `key: "b05-scenario"`, then the sample's scripted `record.arrived`, `match.made`, `flag.raised` and `flag.explained` events, through the store's `emit()`, stamped with the current player time.
- Exports: `{ id: "scenario", slots: { "studio.month.side": ScenarioPanel } }` from `src/features/scenario/index.ts`.
- Test IDs, all internal to this feature: `scenario-panel`, `scenario-dropzone`, `scenario-use-sample`, `scenario-file`, `scenario-note`, `scenario-results`, `scenario-flag`.
- Source key it renders: `b05-scenario`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Drop zone: drag and drop or a file picker for .csv, .xlsx and .pdf. It shows the file's name and never reads or uploads the file in scripted mode. Instead `scenario-note` says reading files comes with the live upgrade and offers the sample | `src/features/scenario/DropZone.tsx`, `tests/features/scenario-drop.spec.ts` | none | opus |
| T2 | Sample run and results: "Use the sample statement" emits the events above, and the results list shows the sample's records with their matches and any flag, read from the store and filtered to the sample's records | `src/features/scenario/runSample.ts`, `src/features/scenario/ScenarioResults.tsx`, `tests/features/scenario-sample.spec.ts` | none | opus |
| T3 | Assemble the panel with the Simulated badge and wire the slot (lead) | `src/features/scenario/ScenarioPanel.tsx`, `src/features/scenario/index.ts` | T1, T2 | lead |

T1 and T2 run side by side. Builders run their own spec with `npm run test:feature -- scenario`.

## Acceptance
- Given the console's month view, then `scenario-panel` shows `scenario-dropzone` and `scenario-use-sample`.
- When `scenario-use-sample` is clicked, then the store holds `scenario.loaded` with `key: "b05-scenario"`, `scenario-results` lists the sample's records with their matches, and `scenario-flag` shows its flag if the sample has one.
- When a file is dropped in scripted mode, then `scenario-file` shows its name and `scenario-note` explains that files are read by the live upgrade, with the sample offered.
- Running the sample twice shows each result once.
- The sample's events never change September's totals, the proof score or the close.
- No request goes beyond localhost, and a dropped file is never uploaded in scripted mode.
- While `sources["b05-scenario"]` is `"scripted"`, the panel shows `simulated-badge`.

## Out of scope
- Parsing files and running the real matcher on them. That's B05 (and B01's matcher).
- Saving uploads, more than one scenario at a time, and scoring the scenario in the proof panel.
