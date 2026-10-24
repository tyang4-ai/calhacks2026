# F-maker-statement · A maker's statement in Chinese (F11)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/maker-statement/ · Made real by: B10

## Goal
A maker opens her phone and sees 本月收入, this month's income, in Chinese: each piece she sold, her share of each, what's held back because the gallery paid short, and the day the money arrives. The demo shows `mkr_01`, who made the peony fan the buyer just bought.

## Read first
- `docs/common/events.md`: the close section (`statement.issued`), `payout.sent`, the store, sources and the Simulated rule
- `docs/common/data-model.md`: MakerStatement, MakerPayout, Person, Piece, the money rules, demo-critical figures 1, 4 and 8
- `docs/common/ui-contract.md`: `maker.main`, the phone frame, the route `/maker/:makerId`, SlotProps, Language, the `maker` camera, the maker-statement test IDs
- `docs/common/design-system.md`: `MakerMark`, `Money`, `Panel`, `Badge`, `Toast`, type rules for Chinese body text
- `docs/common/demo-script.md`: beat `d10-statement`, and `payout.sent` in `d08-approve`
- `docs/common/glossary.md`: maker statement (本月收入), maker share, held, maker payout, the catch

## Interfaces
- **Reads events** through `useCindia()`: `statement.issued` (for this maker) and `payout.sent` (for this maker's payout). Which store key holds each is in `src/core/store.ts`. Also reads `sources`. The language comes from `SlotProps.lang`, which starts in Chinese on this surface.
- **Reads data** with `getById()`: the maker statement named in `statement.issued` (`mst_01` in the demo), its lines' pieces (title in both languages), the maker (name, `surnameChar`), and the maker payout for this maker and month.
- **The maker ID** for `/maker/:makerId` must reach the slot from the shell. `ui-contract.md`'s `SlotProps` doesn't carry it yet. The lead raises it under `needs:` before the builders start (suggested: an optional `makerId` in `SlotProps`, set on the maker surface, `mkr_01` on `/demo`).
- **Emits:** nothing.
- **Exports:** `src/features/maker-statement/index.ts` default-exports `{ id: "maker-statement", slots: { "maker.main": MakerStatementView } }`, typed with `FeatureModule` from `src/core/featureTypes.ts`.
- **Source key on the badge:** `b10-derived`. The panel shows `simulated-badge` while it is `"scripted"`.
- **Test IDs:** `maker-statement-total`, `maker-statement-lines`, `maker-statement-held`. Internal to this feature: `maker-statement-line-<orderId>` for each line, `maker-statement-payout-date`, `maker-statement-paid`, `maker-statement-empty`.
- **Labels from the glossary:** this month's income (本月收入), maker share, held, maker payout, plus the lines this surface needs that aren't there yet: the held note ("The gallery paid less than its contract says. Your part is held until it pays."), payout date, paid, and the empty state ("Your statement isn't ready yet"). Missing ones go under `needs:`.
- **Dates** use the kit's date helper if `src/ui/` has one, otherwise `Intl.DateTimeFormat` on the ISO string with `timeZone: "UTC"`, `zh-CN` or `en-US` by the slot's language. Never the wall clock.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The statement header: total, payout date, paid | src/features/maker-statement/StatementHeader.tsx, tests/features/maker-statement-total.spec.ts | the maker ID (see Interfaces) | opus |
| T2 | The lines and the held note | src/features/maker-statement/StatementLines.tsx, src/features/maker-statement/HeldNote.tsx, tests/features/maker-statement-lines.spec.ts | the maker ID (see Interfaces) | opus |
| T3 | Assemble the view and fill the slot (lead) | src/features/maker-statement/MakerStatementView.tsx, src/features/maker-statement/index.ts, tests/features/maker-statement-flow.spec.ts | T1, T2 | lead |

**How the tasks fit:** builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T3 fills the slot, and the lead sends any failure back to the builder who owns the file.

**T1.** `StatementHeader` shows the maker's `MakerMark` and name, the month, and 本月收入 with the statement's `totalCents` in `maker-statement-total`, large, as the first thing on the phone. Under it, the payout date (`maker-statement-payout-date`). When `payout.sent` arrives for this maker's payout, `maker-statement-paid` reads paid, with a kit `Toast` the first time.

**T2.** `StatementLines` (`maker-statement-lines`) lists each line of the statement as `maker-statement-line-<orderId>`: the piece's title in the slot's language and the maker's share, with amounts right-aligned. `HeldNote` (`maker-statement-held`) shows the statement's `heldCents` and the one-line held note, in seal-red text with no alarm styling. It hides when nothing is held.

**T3.** `MakerStatementView` shows `maker-statement-empty` until `statement.issued` arrives for this maker, then the header, the lines and the held note, inside one kit `Panel` that declares `b10-derived`. Chinese body text gets the design system's line height. `index.ts` exports the module. `maker-statement-flow.spec.ts` plays `d10-statement` on `/maker/mkr_01`.

## Acceptance
Every spec opens `/maker/mkr_01`, moves the demo timeline with `window.__cindia.player.seek(ms)` to the moment named (beat times are in `demo-script.md`), and checks by test ID only.

1. **Given** 46 seconds (before `statement.issued`), **then** `maker-statement-empty` shows and no total does.
2. **Given** the end of `d10-statement`, **then** `maker-statement-total` reads 本月收入 with `mst_01`'s total in dollars.
3. **Given** the end of `d10-statement`, **then** `maker-statement-lines` holds one line per line of `mst_01`, and `maker-statement-line-ord_001` reads 牡丹团扇 with $134.48.
4. **Given** the end of `d10-statement`, **then** `maker-statement-held` shows $95.00 with the held note, and `maker-statement-payout-date` reads 10月2日.
5. **Given** the end of `d10-statement`, **then** `maker-statement-paid` reads paid, because `payout.sent` for `mpo_01` fired in `d08-approve`.
6. **Given** `demo-lang-toggle` switched to English, **then** the labels, piece titles and date are English (Oct 2), and the amounts are unchanged.
7. **Given** scripted mode, **then** the panel shows `simulated-badge`.

## Out of scope
- Computing the statement from the ledger (B10). Phase 1 shows `mst_01` as written.
- Paying the maker. `payout.sent` comes from the timeline.
- Past months, a history list, or a download.
- The studio's own view of all makers (F-close and F-dashboard).
