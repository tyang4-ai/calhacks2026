# F-scenario · The judge's scenario (F17)

Priority: P1 · Wave: W2 · Depends on: G4 · Folder: src/features/scenario/ · Made real by: B05

## Goal
A judge drops in a statement or CSV and Cindy works through it on the spot. If the judge brings nothing, one click loads the held-back sample statement, so the moment still happens.

## Read first
- `docs/common/data-model.md`: the IDs that live only in events (`scn_01` and the `scn_` record IDs), the Statement, Match and Flag rows, and `src/mock/scenario.ts` in the files table.
- `docs/common/events.md`: `scenario.loaded`, `record.arrived`, `match.made`, `flag.raised`, Requests from people (the registry answers `scenario.loaded`, 1.2 seconds later in real time), and the store.
- `docs/common/ui-contract.md`: the `studio.month.side` slot and its source key, the `month` view, Language, Simulated badge, Test hooks.
- `docs/common/design-system.md`: `Panel`, `Button`, `Flag`, `EvidenceCard`, `LedgerTable`, and the words-on-screen rules for errors and empty states.
- `docs/common/glossary.md`: statement, match, flag, the catch, contract.

## Interfaces
- Reads:
  - Data: `sampleFileName` and `sampleRecordIds` from `src/mock/scenario.ts`, the records they name through `getById()`, and the gallery contract.
  - Store keys: `scenario`, `month`, `mode`, `clock`. The language comes from `SlotProps.lang`.
  - UI kit: `Panel` (declaring `b05-scenario`), `Button`, `Flag`, `EvidenceCard`, `LedgerTable`.
- Emits: `scenario.loaded` (`scenarioId: "scn_01"`, `fileName` from `sampleFileName`, `recordIds` from `sampleRecordIds`), built with `userEvent()` from `src/core/events.ts` so it has `source: "user"`, when someone picks the sample. In live mode a dropped file sends the same request with the file's text as `content` (T1). The request carries no `key`, since `userEvent()` sets none and the registry routes it to `b05-scenario` by its Requests from people table. The sources registry answers with the sample's `record.arrived`, `match.made` and `flag.raised` events, scripted from `src/mock/scenario.ts` or live from B05. The feature never writes those itself.
- Exports: `{ id: "scenario", slots: { "studio.month.side": ScenarioPanel } }` from `src/features/scenario/index.ts`.
- Test IDs, all internal to this feature: `scenario-panel`, `scenario-dropzone`, `scenario-use-sample`, `scenario-file`, `scenario-note`, `scenario-results`, `scenario-flag`.
- Source key: `b05-scenario`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | `src/features/scenario/strings.ts` | none | lead |
| T1 | Drop zone: drag and drop or a file picker for a .csv or .json statement, the two formats B05 reads (`api-contract.md`). It shows the file's name in `scenario-file`. In scripted mode it never reads, uploads or emits anything for a dropped file. Instead `scenario-note` says reading files comes with the live upgrade and offers the sample. In live mode it reads a file of at most 200 KB as text and emits `scenario.loaded` with `scenarioId: "scn_01"`, the file's name, `recordIds: []` (the records exist only once B05 parses the file) and the text as `content`. A bigger file gets a note instead | `src/features/scenario/DropZone.tsx`, `tests/features/scenario-drop.spec.ts` | T0 | opus |
| T2 | Sample and results: "Use the sample statement" emits the request above, and the results list shows the scenario's records with their matches and any flag, read from the store and filtered to IDs that contain `scn_` (the sample's `scn_` IDs and the `stm_scn_` statement a live parse returns). When a request with `content` gets its answer while `sources["b05-scenario"]` is still `"scripted"`, the registry fell back to the sample, so `scenario-note` says these are the sample's results | `src/features/scenario/ScenarioResults.tsx`, `src/features/scenario/useSample.ts`, `tests/features/scenario-sample.spec.ts` | T0 | opus |
| T3 | Assemble the panel and wire the slot (lead) | `src/features/scenario/ScenarioPanel.tsx`, `src/features/scenario/index.ts` | T1, T2 | lead |

The lead writes T0 before spawning any builder, because `design-system.md` puts a feature's short UI strings in its own `strings.ts`. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. T1 and T2 then run side by side. Builders run their own spec with `npm run test:feature -- scenario`, moving the player past the 1.2-second answer delay with `window.__cindia.player.seek()`.

## Acceptance
- Given the console's month view, then `scenario-panel` shows `scenario-dropzone` and `scenario-use-sample`.
- When `scenario-use-sample` is clicked, then the store holds `scenario.loaded` with `source: "user"` and the sample's `fileName` and `recordIds`, and 1.2 seconds later in real time, `scenario-results` lists the sample's records with their matches and `scenario-flag` shows its flag if the sample has one.
- When a file is dropped in scripted mode, then `scenario-file` shows its name, `scenario-note` explains that files are read by the live upgrade and offers the sample, and no event is emitted.
- When a .csv file under 200 KB is dropped in live mode (switched with `demo-mode-toggle`), then the store holds a `scenario.loaded` with `source: "user"` and the file's text as `content`.
- Using the sample twice shows each result once.
- The sample never changes September's totals, the proof score or the close.
- No request goes beyond localhost, and a dropped file is never read or sent in scripted mode.
- In scripted mode the panel shows `simulated-badge`.

## Out of scope
- Parsing a dropped file and running the real matcher on it. That's B05, which reads the `content` this feature sends. Excel and PDF files, which B05 doesn't read.
- Saving uploads, more than one scenario at a time, and scoring the scenario in the proof panel.
