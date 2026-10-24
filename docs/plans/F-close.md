# F-close · Month close and the Excel file (F12)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/close/ · Made real by: B06

## Goal
At beat `d09-close` the month closes. The totals settle into place and an Excel workbook drops onto the console. Clicking it downloads a real .xlsx, built in the browser from the mock ledger, with live formulas in every total.

## Read first
- `docs/common/data-model.md`: Units and rules, the LedgerEntry, Order, ChannelPayout, Refund, Statement, BankTxn, MakerPayout and MakerStatement rows, Money rules, Demo-critical figures 1, 4 and 8.
- `docs/common/events.md`: `month.closed`, `workbook.ready`, `ledger.posted`, and the store.
- `docs/common/ui-contract.md`: the `studio.close.main` slot and its source key, the `close` view, Language, Simulated badge, Test hooks, and the test IDs below.
- `docs/common/design-system.md`: `Panel`, `LedgerTable`, `Money`, `Button`, the motion tokens and the rule that motion follows the player clock.
- `docs/common/demo-script.md`: beat `d09-close` (the file name and the four sheet names).
- `.claude/rules/frontend.md`: the SheetJS notes (formulas go in `f` without the `=`, extend `!ref`, no charts).

## Interfaces
- Reads:
  - Events: `month.closed` (`monthId`, `salesCents`, `feesCents`, `makerPayCents`, `heldCents`), `workbook.ready` (`monthId`, `fileName`, `sheets`, and `url` when live B06 built the file), `ledger.posted` (`entryIds`).
  - Labels: close, workbook (Excel report), held and maker payout come from the glossary. Sales, fees and maker pay have no glossary row yet: keep them in `strings.ts` (T0) and list them under `needs:` so the integrator can add the rows. Don't block on them.
  - Store keys: `month`, `close`, `clock`. The language comes from `SlotProps.lang`.
  - Data, from `src/mock/` through `getById()` and its exports: ledger entries, orders, channel payouts, the refund, the gallery statement and contract, bank transactions, maker payouts and maker statements for `2026-09`.
  - UI kit: `Panel` (declaring `b06-workbook`), `LedgerTable`, `Money`, `Button`, the motion helpers.
- Emits: nothing. The close is scripted in the demo timeline. This feature renders it and builds the file on request.
- Exports: `{ id: "close", slots: { "studio.close.main": ClosePanel } }` from `src/features/close/index.ts`.
- Test IDs: `close-totals`, `close-workbook`, `close-download`. Internal to this feature: `close-preview` (the sheet preview under the card).
- Source key: `b06-workbook`. The kit's `Panel` shows the Simulated badge while it's scripted.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | `src/features/close/strings.ts` | none | lead |
| T1 | Workbook builder: a pure function that turns the September dataset into a SheetJS workbook with the four sheets the demo script names, `Ledger`, `Reconciliation`, `Profit and loss` and `Makers`. Amounts go in as dollars from cents. Every total is a formula (`SUM`, and `gross * (1 - rate)` for the gallery's expected net). Workbook dates come from the dataset, never the wall clock. Unit tests check the sheet names, a formula in every total cell, and the gallery's expected, actual and delta lines | `src/features/close/buildWorkbook.ts`, `src/features/close/buildWorkbook.test.ts` | T0 | opus |
| T2 | Close panel: totals from `month.closed` through `Money`, the workbook card that drops in on `workbook.ready` (one motion on the player clock, finished at once after a `seek()`), the download button, which links to the payload's `url` when it has one (a plain download link, never `fetch`) and otherwise calls T1 and saves the file under the payload's `fileName`, and a preview of the `Profit and loss` sheet in a `LedgerTable`. The button is disabled until `workbook.ready` | `src/features/close/ClosePanel.tsx`, `src/features/close/CloseTotals.tsx`, `src/features/close/WorkbookCard.tsx`, `tests/features/close-panel.spec.ts` | T1 | opus |
| T3 | Download test: seek past `workbook.ready` with `window.__cindia.player.seek()`, click `close-download`, catch the download, open it with SheetJS in the test, and check the sheet names match the event's `sheets`, the totals are formulas, and the figures match the dataset | `tests/features/close-download.spec.ts` | T1, T2 | opus |
| T4 | Assemble and wire the slot (lead) | `src/features/close/index.ts` | T2, T3 | lead |

The lead writes T0 before spawning any builder, because `design-system.md` puts a feature's short UI strings in its own `strings.ts`. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. Builders run their own spec with `npm run test:feature -- close`. A task is done when its own spec passes, even if a later task's spec doesn't exist yet.

## Acceptance
- Given the demo timeline, when the player seeks past `month.closed`, then `close-totals` shows sales, fees, maker pay and held, each equal to the payload, formatted by `Money`. Held reads $340.00.
- Given the player is before `workbook.ready`, then `close-workbook` isn't shown and `close-download` is disabled.
- When the player passes `workbook.ready`, then `close-workbook` shows `cindia-close-2026-09.xlsx` and the four sheet names from the payload.
- When `close-download` is clicked, then a file named as in the payload downloads, and it opens with sheets `Ledger`, `Reconciliation`, `Profit and loss` and `Makers`, in the order of the payload's `sheets`.
- Given a `workbook.ready` with a `url`, sent with `window.__cindia.emit()`, then `close-download` links to that `url` instead of building the file.
- In that file, the `Reconciliation` sheet's gallery line shows expected 2,040.00, actual 1,700.00 and delta 340.00 (data-model figure 4), and the expected value is a formula, not a typed number.
- In that file, every total cell has a formula, and the `Makers` sheet's total for `mkr_01` includes the 134.48 from `ord_001`.
- `close-preview` shows the `Profit and loss` rows with the same values as the file.
- In scripted mode the panel shows `simulated-badge`.
- No request goes beyond localhost. The file is built and saved in the browser.

## Out of scope
- The chart inside the workbook. SheetJS Community can't write charts, so B06 adds it with openpyxl.
- The weekly close, cell styling, other months, and opening the file inside the app.
- Computing the close totals. They come from `month.closed`.
