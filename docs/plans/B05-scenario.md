# B05-scenario · The judge's scenario (F17)

Priority: P2 · Wave: P2 · Depends on: G4, B01 green, F-scenario green for the drop zone · Folder: server/routers/ · Source key: `b05-scenario` · Makes real: F-scenario · Estimate: 1 h

**SCOPE:** `server/routers/b05_scenario.py, src/sources/live/b05-scenario.ts, tests/server/test_b05_scenario.py, tests/server/b05_statement.csv, tests/server/b05_month.json`

## Goal

A judge drops a statement or a CSV into the console and Cindy reconciles it on the spot. Hyphenate says judges may bring a scenario of their own. If no judge brings one, the held-back statement in `src/mock/scenario.ts` shows the same thing.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, B01 and B05
- `docs/common/events.md`: Proof, Ask Cindy, the scenario (`scenario.loaded`), The month, Sources and live replacement
- `docs/common/data-model.md`: Statement, Money rules
- `docs/plans/B01-match.md` and `docs/plans/F-scenario.md`
- In the vault docs folder: `docs/fastapi/` (request files)
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoint:** `POST /api/b05/scenario`, multipart, as in `api-contract.md`. No key. `python-multipart` comes with `fastapi[standard]`.
- **Parsing:**
  - A CSV has the columns `date,orderId,pieceId,saleCents,commissionBps,netCents`, one statement line per row.
  - A JSON file is a Statement object.
  - Files over 1 MB, or with a bad row, return `bad_request` with a sentence that names the first bad row.
- **Uses:** `reconcile_month()` from `server/routers/b01_match.py`, over the month's records plus the parsed statement.
- **Returns:** `scenario.loaded`, then every `match.made` and `flag.raised` involving the new statement, whose ID is `stm_scn_` plus a number. `api-contract.md` gives every returned event the upgrade's key, while `events.md` keys `match.made` and `flag.raised` to `b01-match`. Use `b05-scenario` as `api-contract.md` says, and note the mismatch under `needs:`.
- **Adapter** (`src/sources/live/b05-scenario.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b01` and `b05`.
  - `produce(event)`: no timeline holds a scripted `scenario.loaded`, so this answers people. The registry passes a person's `scenario.loaded` request on in live mode (Requests from people in `events.md`). Upload its `content` as the file when it has one, or else the held-back statement's CSV text from `src/mock/scenario.ts` under `sampleFileName`, and return the result.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The route, the CSV and JSON parsing, and the size and row checks | `server/routers/b05_scenario.py` | B01 green | opus |
| T2 | Fixtures and tests: the held-back statement as a CSV, a bad row, a file over 1 MB, a JSON statement | `tests/server/b05_statement.csv`, `tests/server/b05_month.json`, `tests/server/test_b05_scenario.py` | T1 | opus |
| T3 | The live adapter | `src/sources/live/b05-scenario.ts` | T1 | opus |

## Acceptance

- The held-back statement returns `scenario.loaded`, then its matches and any flag, all valid against `events.md`.
- A person's own CSV, sent as `content`, returns the results for its `stm_scn_` statement.
- A bad row returns 400 naming the row. A 2 MB file returns 400.
- In live mode the scenario panel shows the server's result, and its `Simulated` badge goes away for `b05-scenario`.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- Excel or PDF uploads, storing uploads, and statements from any channel but the gallery.
