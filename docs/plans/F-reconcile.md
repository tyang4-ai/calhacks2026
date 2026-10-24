# F-reconcile · The month and the catch (F7, F8)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/reconcile/ · Made real by: B01, B02

## Goal
A judge watches the studio's whole September play in ten seconds while Cindy ties every payout to its orders, including the hard cases: a bundled payout, a refund taken out of a later payout, and a payout that lands after the close. Then the catch: the gallery paid $340.00 less than its contract says, and Cindy puts the contract, the statement and the bank record side by side and says which one to trust.

## Read first
- `docs/common/events.md`: the Month section, `agent.acted`, the store, sources and the Simulated rule
- `docs/common/data-model.md`: Order, ChannelPayout, Refund, Statement, BankTxn, Match, Flag, Contract, demo-critical figures 3 to 7, the planted errors
- `docs/common/ui-contract.md`: `studio.month.main`, the console's `month` view, the `studio-month` and `studio-catch` cameras, the reconcile test IDs
- `docs/common/design-system.md`: `LedgerTable`, `Flag`, `EvidenceCard`, `Money`, `Panel`, `Badge`, the seal-red and jade rules
- `docs/common/demo-script.md`: beats `d06-month` and `d07-catch`
- `docs/common/glossary.md`: match, bundled payout, refund taken out, carried to next month, the catch, flag, evidence, trust this record, contract, commission, statement, bank record

## Interfaces
- **Reads events** through `useCindia()`: `month.started`, `record.arrived`, `match.made`, `flag.raised`, `flag.explained`, `ledger.posted`, `month.closed`. Which store key holds each is in `src/core/store.ts` (the `month` key). Also reads `sources`. The language comes from `SlotProps.lang`.
- **Reads data** with `getById()`: every record named in those events (orders, payouts, refunds, the statement, bank records), the contract `ctr_gallery_01`, and pieces for order labels.
- **Emits:** nothing. Cindy's latest `agent.acted` line already shows in the console's top bar.
- **Exports:** `src/features/reconcile/index.ts` default-exports `{ id: "reconcile", slots: { "studio.month.main": ReconcileView } }`, typed with `FeatureModule` from `src/core/featureTypes.ts`.
- **Source keys on the badge:** `b01-match`, `b02-explain`. The panel shows `simulated-badge` while either is `"scripted"`.
- **Test IDs:** `reconcile-timeline`, `reconcile-match-<matchId>`, `reconcile-flag`, `reconcile-evidence-contract`, `reconcile-evidence-statement`, `reconcile-evidence-bank`, `reconcile-explanation`. Internal to this feature: `reconcile-counter-<recordType>` for the running counts, `reconcile-record-<recordId>` for an unmatched record row, `reconcile-handled` for the "Cindy handled" strip (where the bundled, refund-netted and carried-over matches carry their `reconcile-match-<matchId>`), `reconcile-row-<matchId>` for those three matches' rows in the list, and `reconcile-list` for the list's scroll container.
- **Labels from the glossary:** match, bundled payout, refund taken out, carried to next month, flag, evidence, trust this record, contract, commission, statement, bank record, payout, plus the record types (order, payout, refund, statement, bank record). Order and refund have no glossary row yet: keep them in `strings.ts` (T0) and list them under `needs:` so the integrator can add the rows. Don't block on them.
- **Dates** use the kit's `formatDate(iso, lang)`. Never the wall clock.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | src/features/reconcile/strings.ts | none | lead |
| T1 | Match rows with their kind | src/features/reconcile/matchLabels.ts, src/features/reconcile/MatchRow.tsx, tests/features/reconcile-matches.spec.ts | T0 | opus |
| T2 | The month timeline | src/features/reconcile/recordRows.ts, src/features/reconcile/MonthTimeline.tsx, tests/features/reconcile-month.spec.ts | T1 (`MatchRow`) | opus |
| T3 | The catch: flag, evidence and explanation | src/features/reconcile/CatchPanel.tsx, src/features/reconcile/EvidenceTrio.tsx, tests/features/reconcile-catch.spec.ts | T0 | opus |
| T4 | Assemble the view and fill the slot (lead) | src/features/reconcile/ReconcileView.tsx, src/features/reconcile/index.ts, tests/features/reconcile-flow.spec.ts | T1 to T3 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder, because `design-system.md` puts a feature's short UI strings in its own `strings.ts`. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T4 fills the slot, and the lead sends any failure back to the builder who owns the file.

**T1.** `matchLabels.ts` maps each Match `kind` to its glossary label and to the one short reason line the row shows ("one payout, three orders", "the $95.00 refund taken out", "lands Oct 2, counts in October"), with amounts and dates filled in from the records, never typed in. `MatchRow` (`reconcile-match-<matchId>`) shows the matched records together on one row with a jade check, the kind as a chip for the three special kinds, and the amounts.

**T2.** `recordRows.ts` turns a record ID into a display row (type, date, party, amount). `MonthTimeline` (`reconcile-timeline`) lists the month in date order on the kit's `LedgerTable`: a record shows as its own row when it arrives, and when a `match.made` names it, its rows draw together into one `MatchRow` with a Motion layout transition. The newest rows stay in view as the month plays. Above the table, a counter per record type rises (`reconcile-counter-<recordType>`), and a line reads how many payouts are matched so far.

**T3.** `CatchPanel` appears when `flag.raised` arrives and takes the top of the view. Its kit `Flag` (`reconcile-flag`) reads expected, paid and short from the payload. `EvidenceTrio` puts three kit `EvidenceCard`s side by side, each with its key figure highlighted: the contract's commission and what the studio is owed (`reconcile-evidence-contract`), the statement's commission and its net (`reconcile-evidence-statement`), and the bank deposit with its date (`reconcile-evidence-bank`). The percentages come from the records' `commissionBps`. On `flag.explained`, `reconcile-explanation` shows Cindy's explanation in the slot's language, and the card for `trustRecordId` carries the "trust this record" label.

**T4.** `ReconcileView` stacks the catch above the timeline once a flag exists, and shows the timeline alone before that, inside one kit `Panel` that declares `b01-match` and `b02-explain`. The camera `studio-catch` zooms to the flag and evidence, so they keep a fixed place at the top. `index.ts` exports the module. `reconcile-flow.spec.ts` plays `d06-month` into `d07-catch`.

## Acceptance
Every spec opens `/studio/month`, moves the demo timeline with `window.__cindia.player.seek(ms)` to the moment named (beat times are in `demo-script.md`), and checks by test ID only.

1. **Given** 25 seconds (inside `d06-month`), **then** `reconcile-timeline` shows the month's records in date order, the counters have risen, and the newest rows are in view.
2. **Given** the end of `d06-month`, **then** every `match.made` in the store has its `reconcile-match-<matchId>`. The bundled match names `ord_015`, `ord_016` and `ord_017` under the bundled payout label. The refund match names `rfd_001` and shows $95.00 taken out. The carried-over match names `ord_025` and `ord_026` and Oct 2.
3. **Given** the end of `d06-month`, **then** there is no flag yet, because the gallery's statement and deposit arrive in `d07-catch`.
4. **Given** 31.6 seconds (after `flag.raised`), **then** `reconcile-flag` reads $2,040.00 expected, $1,700.00 paid and $340.00 short.
5. **Given** the end of `d07-catch`, **then** `reconcile-evidence-contract` highlights 40% and $2,040.00, `reconcile-evidence-statement` highlights 50% and $1,700.00, `reconcile-evidence-bank` highlights $1,700.00 on Sep 30, and the contract card says to trust it.
6. **Given** the end of `d07-catch`, **then** `reconcile-explanation` shows the `flag.explained` text in English, and with `demo-lang-toggle` switched to Chinese it shows the Chinese text.
7. **Given** scripted mode, **then** the panel shows `simulated-badge`.
8. **Given** a `seek()` to any moment, **then** the same rows, matches and figures render every time.

## Out of scope
- The real matcher (B01) and Claude's explanation (B02). Phase 1 renders the scripted events.
- The judge's own file upload (F-scenario, `studio.month.side`).
- Clicking a number to see where it comes from (F-audit).
- Drafting or sending the follow-up. Cindy's draft and the owner's approval belong to F-approvals.
