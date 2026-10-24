# M-maker-statement · A maker's page on the desktop (v2 migration of F-maker-statement)

Priority: P1 · Wave: V2 · Depends on: G1b · Folder: src/features/maker-statement/ · Made real by: B10

SCOPE: src/features/maker-statement/, tests/features/maker-statement-*

## Goal
A maker opens her page on a desktop and reads her month in her own language. For the Gu makers that's Chinese: 本月收入 (this month's income), each piece she sold with her share, what's held because the gallery paid short, the payout date and that the money went out. The header shows her mark, her name, and her name in her own language when her community has written it.

## Read first
- `docs/v2/brief.md`: the maker page, the principles (no machine translation into Indigenous languages)
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: Person `nativeName`, `languages`, `communityId`
  - section 4: the `maker` surface (`frame-maker`, starts in the maker's `lang`), `/maker/:makerId`, slots `maker.main` (this feature) and `maker.side` (seller-hub), the `maker` camera
  - section 8: beat `d11-maker`
- `docs/plans/F-maker-statement.md`: what each v1 component does and its acceptance
- `docs/common/design-system.md`: `MakerMark`, `Money`, `Panel`, `Badge`, `Toast`, the Chinese body text rules
- `docs/common/glossary.md`: maker statement (本月收入), maker share, held, the held note, payout date, paid, no sales yet, demo data
- The current code in `src/features/maker-statement/` and its specs in `tests/features/maker-statement-*`

## Interfaces
- **Reads events** through `useCindia()`: `statement.issued` for this maker, `payout.sent` for this maker's payout, and `sources`. Lines, total, held amount and payout date render from the `statement.issued` payload, as v1.
- **Reads data** with `getById()`: the maker (name, `surnameChar`, `nativeName`, `communityId`), the pieces in the payload's lines (title in both languages), and the maker's community (its `name`, for the header).
- **The maker** comes from `SlotProps.makerId` (the route, and `mkr_01` on `/demo`). The language comes from `SlotProps.lang`, which the shell starts at the maker's `lang`.
- **Emits:** nothing.
- **Exports:** `src/features/maker-statement/index.ts` default-exports `{ id: "maker-statement", slots: { "maker.main": MakerStatementView } }`, unchanged.
- **Source key on the badge:** `b10-derived`.
- **Test IDs:**
  - v1, kept: `maker-statement-total`, `maker-statement-lines`, `maker-statement-held`.
  - v1 internal, kept: `maker-statement-line-<orderId>`, `maker-statement-payout-date`, `maker-statement-paid`, `maker-statement-empty`.
  - New internal: `maker-statement-header`, `maker-statement-native-name`.
- **Labels from the glossary:** this month's income, maker share, held, the held note, payout date, paid, no sales yet, demo data, maker.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the desktop strings (the column headings of the lines table, the header's "maker at" line), English and Chinese side by side | src/features/maker-statement/strings.ts | none | lead |
| T1 | Spec helper: seek to a timeline event, open a maker page | tests/features/maker-statement-lib.ts | none | sonnet |
| T2 | The header at desktop size: mark, name, native name, community, the month, the total, payout date, paid and its toast | src/features/maker-statement/StatementHeader.tsx, src/features/maker-statement/statementToast.css, tests/features/maker-statement-total.spec.ts, tests/features/maker-statement-toast.spec.ts | T0, T1 | opus |
| T3 | The lines table and the held note at desktop width | src/features/maker-statement/StatementLines.tsx, src/features/maker-statement/HeldNote.tsx, tests/features/maker-statement-lines.spec.ts | T0, T1 | sonnet |
| T4 | Assemble the view (lead) | src/features/maker-statement/MakerStatementView.tsx, src/features/maker-statement/index.ts, tests/features/maker-statement-flow.spec.ts | T2, T3 | lead |

**T1.** `maker-statement-lib.ts` exports two helpers. `seekToEvent(page, type, match, offsetMs)` reads `window.__cindia.player.getTimeline()` and seeks to the first matching event's `at` plus the offset. `openMaker(page, makerId)` opens `/maker/<makerId>` and waits for `maker.main` to fill. Fixed beat times are never used, because I2-tour moves every beat.

**T2.** `StatementHeader` (`maker-statement-header`) spans the main column:
- the kit `MakerMark`,
- the maker's name in the slot's language,
- under it, `nativeName` in `maker-statement-native-name` when the person has one, shown exactly as written and never translated,
- the community's name and a `Demo data` badge,
- the month,
- 本月收入 with the payload's `totalCents` in `maker-statement-total`, the largest text on the page,
- the payload's `payoutDate` in `maker-statement-payout-date`,
- `maker-statement-paid`, which reads paid once `payout.sent` arrives for this maker's payout.

The kit `Toast` shows the first time paid arrives, as v1 (`maker-statement-toast.spec.ts` keeps that check).

**T3.** `StatementLines` (`maker-statement-lines`) becomes a kit `LedgerTable` with three columns: the piece's title in the slot's language, the order's date, and the maker's share, right-aligned. It has one row per payload line (`maker-statement-line-<orderId>`). `HeldNote` (`maker-statement-held`) sits under the table: the payload's `heldCents` and the glossary's held note, in seal-red text with no alarm styling. It hides when nothing is held.

**T4.** `MakerStatementView` fills the main column of the maker page (the left two thirds, beside seller-hub's `maker.side`) inside one kit `Panel` that declares `b10-derived`. It shows `maker-statement-empty` until `statement.issued` arrives for this maker, then the header, the lines and the held note. Chinese body text gets the design system's line height. `maker-statement-flow.spec.ts` plays the statement from `statement.issued` to `payout.sent` on `/maker/mkr_01` with event-anchored seeks, and checks the `d11-maker` IDs inside `frame-maker`.

## Acceptance
Every spec opens `/maker/<makerId>`, moves the timeline with `seekToEvent` from `maker-statement-lib.ts`, and checks by test ID only. "Inside the frame" means fully inside `frame-maker` and every clipping ancestor at 1440 by 900.

1. **Given** 300 ms before the timeline's `statement.issued` for `mkr_01`, **then** `maker-statement-empty` shows and no total does.
2. **Given** 300 ms after it, **then**:
   - `maker-statement-total` reads 本月收入 with the payload's total,
   - `maker-statement-line-ord_001` reads 牡丹团扇 with $134.48,
   - `maker-statement-held` shows $95.00 with the held note,
   - `maker-statement-payout-date` reads 2026年10月2日,
   - all inside the frame.
3. **Given** the same moment, **then** `maker-statement-paid` reads paid, because `payout.sent` for `mpo_01` fired earlier in the timeline.
4. **Given** `/maker/mkr_04`, an Indigenous maker with no statement, **then** the page starts in that maker's `lang`, `maker-statement-native-name` shows the name exactly as the data writes it, and `maker-statement-empty` reads no sales yet.
5. **Given** `demo-lang-toggle` switched to English on `/maker/mkr_01`, **then** the labels, piece titles and date are English (Oct 2, 2026), and the amounts are unchanged.
6. **Given** scripted mode, **then** the panel shows `simulated-badge`.

## Out of scope
- The maker's listings and works in progress beside the statement (seller-hub's `maker.side`).
- Computing the statement from the ledger (B10). The page shows the payload.
- Past months, history, downloads, or statements for the seven Indigenous communities, which have no scripted month.
- Translating anything into an Indigenous language.

## Contract additions needed
None. If S3 gives no Indigenous maker a `nativeName`, acceptance 4 checks only the empty state and the starting language.
