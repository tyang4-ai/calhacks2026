# B06-workbook · The month-close workbook (F12)

Priority: P2 · Wave: P2 · Depends on: G4 · Folder: server/routers/ · Source key: `b06-workbook` · Makes real: F-close · Estimate: 1 h

**SCOPE:** `server/routers/b06_workbook.py, src/sources/live/b06-workbook.ts, tests/server/test_b06_workbook.py, tests/server/b06_month.json`

## Goal

The month close produces a real Excel workbook, built on the server with openpyxl: the ledger, the reconciliation, profit and loss, and each maker's earnings, with live formulas and a native chart. Microsoft judges end-to-end functionality, and this is the file the owner would actually open.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, and B06
- `docs/common/events.md`: The close (`workbook.ready`), Sources and live replacement
- `docs/common/data-model.md`: LedgerEntry, Statement, MakerStatement, Money rules
- `docs/plans/F-close.md`
- In the vault docs folder: `ch13-tech-stack.md` (The Excel file), `docs/openpyxl/charts-bar.md`
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoints:** `POST /api/b06/workbook` and `GET /api/b06/files/{fileName}`, as in `api-contract.md`. No key.
- **The workbook** `cindia-close-2026-09.xlsx`:
  - `Ledger`: one row per ledger entry, with a totals row of `=SUM(...)` formulas.
  - `Reconciliation`: each payout, its matched orders and its status, the gallery's $340 shown as a receivable.
  - `Profit and loss`: sales by channel, fees, commission, materials, maker pay, all as formulas over `Ledger`.
  - `Makers`: each maker's pieces, share, held amount and payout, with a native `BarChart` of earnings.
- **Files** go to `artifacts/files/`. `GET /api/b06/files/{fileName}` serves only plain file names from that folder. Any `/`, `\` or `..` in the name gives `not_found`.
- **Replaces:** the keyed `workbook.ready`. In scripted mode the browser builds the workbook with SheetJS, without the chart.
- **The download:** `events.md` gives `workbook.ready` an optional `url`, set by this adapter. F-close links to it when it's there, so the owner downloads the server's file with its chart. In scripted mode the browser keeps building its own copy.
- **Adapter** (`src/sources/live/b06-workbook.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b06`.
  - `produce(event)`: post the month's records from `src/mock`, set `url` on the returned `workbook.ready` to `/api/b06/files/` plus its `fileName`, and return it.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The workbook builder and both routes | `server/routers/b06_workbook.py` | none | opus |
| T2 | Fixture and tests that open the built file with openpyxl: the sheet names, a formula in each totals row, one bar chart on `Makers`, totals equal to the fixture's, the content type, and a `../` name giving 404 | `tests/server/b06_month.json`, `tests/server/test_b06_workbook.py` | T1 | opus |
| T3 | The live adapter | `src/sources/live/b06-workbook.ts` | T1 | opus |

## Acceptance

- The workbook has the four sheets, formula totals and one native bar chart, and its totals match the dataset.
- The file is served with the xlsx content type, and path tricks give 404.
- The browser's SheetJS workbook still works in scripted mode.
- In live mode `close-download` gets the server's file through the event's `url`.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- Power BI, cell styling beyond bold headers and number formats, and months other than September.
