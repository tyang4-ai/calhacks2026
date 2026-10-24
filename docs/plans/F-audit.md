# F-audit · The audit trail (F10)

Priority: P1 · Wave: W2 · Depends on: G4 · Folder: src/features/audit/ · Made real by: B10

## Goal
Any figure can be traced. The audit drawer unfolds a figure's trail one step at a time, from a maker payout back through the orders and channel payouts to the bank record and the ledger entries behind it.

## Read first
- `docs/common/data-model.md`: Entities (every `orderIds`, `refundIds`, `recordIds`, `refId` and `nettedInPayoutId` link), Money rules, Demo-critical figures 1, 4, 6 and 8.
- `docs/common/events.md`: the store.
- `docs/common/ui-contract.md`: the `studio.drawer.audit` slot and its source key, Drawers, Language, Simulated badge, Test hooks.
- `docs/common/design-system.md`: `Panel`, `LedgerTable`, `Money`, `EvidenceCard`, and the motion rule for things a person opens.
- `docs/common/glossary.md`: audit trail, ledger, bank record, payout, statement, contract, held.

## Interfaces
- Reads:
  - Data through `getById()`: maker payouts, orders, channel payouts, the refund, the gallery statement and contract, bank transactions, ledger entries, matches and the flag.
  - Store keys: `month`, `close`, `approvals`. The language comes from `SlotProps.lang`, and `SlotProps.refId` names the record to open, from `?drawer=audit&ref=<entity id>`.
  - UI kit: `Panel` (declaring `b10-derived`), `LedgerTable`, `Money`, `EvidenceCard`.
- Emits: nothing.
- Exports: `{ id: "audit", slots: { "studio.drawer.audit": AuditDrawer } }` from `src/features/audit/index.ts`.
- Test IDs, all internal to this feature: `audit-drawer`, `audit-start-list`, `audit-start-<recordId>`, `audit-trail`, `audit-step-<recordId>`, `audit-bank-record`.
- Source key: `b10-derived`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | `src/features/audit/strings.ts` | none | lead |
| T1 | Trail builder: a pure function from a record ID to its ordered steps, following the links in data-model.md and ending at the bank transaction and the ledger entries that point at it. Unit tests cover `mpo_01` (through `ord_001` and `pay_001`), `flg_01` (contract, statement, bank deposit) and `ord_020` (through `rfd_001` and the payout it was netted from) | `src/features/audit/buildTrail.ts`, `src/features/audit/buildTrail.test.ts` | T0 | opus |
| T2 | Trail view: the steps unfold one at a time when opened, each with its record kind, date, amount through `Money` and memo, with the bank record last and marked as the source of truth | `src/features/audit/TrailView.tsx`, `tests/features/audit-trail.spec.ts` | T1 | opus |
| T3 | Drawer and start list: the month's traceable figures (the three maker payouts, the flag and the buyer's order) with their amounts, and the trail of the one picked. When `SlotProps.refId` is set, the drawer opens straight on that record's trail | `src/features/audit/AuditDrawer.tsx`, `src/features/audit/StartList.tsx`, `tests/features/audit-drawer.spec.ts` | T1, T2 | opus |
| T4 | Wire the slot (lead) | `src/features/audit/index.ts` | T3 | lead |

The lead writes T0 before spawning any builder, because `design-system.md` puts a feature's short UI strings in its own `strings.ts`. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. Builders run their own spec with `npm run test:feature -- audit`, moving the player with `window.__cindia.player.seek()`.

## Acceptance
- Given `/studio/close?drawer=audit` after the close, then `audit-start-list` lists `mpo_01`, `mpo_02`, `mpo_03`, `flg_01` and `ord_001`, each with its amount.
- When `audit-start-mpo_01` is clicked, then `audit-trail` unfolds steps including `audit-step-ord_001`, and ends with `audit-bank-record` for the transaction that paid the maker.
- Given `/studio/close?drawer=audit&ref=mpo_01` after the close, then `audit-trail` shows `mpo_01`'s trail without a click.
- When `audit-start-flg_01` is clicked, then the trail shows the contract, the statement and the bank deposit, with $2,040.00 expected and $1,700.00 actual through `Money`.
- When the trail for `ord_020` is built, then it reaches `rfd_001` and the payout it was netted from.
- Every amount in a trail equals the field in the dataset.
- In scripted mode the drawer shows `simulated-badge`.

## Out of scope
- Opening the drawer by clicking a number inside another feature. Features don't change the URL, so that needs a shell change by the integrator.
- Editing records and exporting a trail.
