# M-maker-statement · A maker's page on the desktop (v2 migration of F-maker-statement)

Priority: P1 · Wave: V2 · Depends on: G1b, G2b (acceptance 4 reads S3's `mkr_04`) · Folder: src/features/maker-statement/ · Made real by: B10

SCOPE: src/features/maker-statement/, tests/features/maker-statement-*

## Goal
A maker opens her page on a desktop and reads her month in plain English: this month's income, each piece she sold with her share, what's held because the gallery paid short, the payout date and that the money went out. For Grace N. of the Diné Weaving and Silver Co-op, $95.00 of her share is held, and the page says why: the gallery hasn't paid what it owes. The page opens in English, and Chinese stays available as the platform's second interface language. The header shows her mark, her name and her co-op.

## Read first
- `docs/v2/brief.md`: the maker page, the principles (no machine translation into Native American languages)
- `docs/v2/fix-plan.md`: section 1.1 (the names, and "Language": the statement is in English and the maker page opens in English)
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: Person `nativeName` (unset for everyone in v2), `languages`, `communityId`
  - section 4: the `maker` surface (`frame-maker`, starts in the maker's `lang`), `/maker/:makerId`, slots `maker.main` (this feature) and `maker.side` (seller-hub), the `maker` camera
  - section 8: beat `d11-maker`, with the held line (A1-12)
- `docs/plans/F-maker-statement.md`: what each v1 component does and its acceptance
- `docs/plans/R0-reskin.md`: the old-to-new names, and the maker statement's strings after the re-skin
- `docs/common/design-system.md`: `MakerMark`, `Money`, `Panel`, `Badge`, `Toast`, `LedgerTable`, the Chinese body text rules
- `docs/common/glossary.md`: maker statement (This month's income, 本月收入), maker share, held, the held note, payout date, paid, no sales yet, demo data
- The current code in `src/features/maker-statement/` and its specs in `tests/features/maker-statement-*`

## Interfaces
- **Reads events** through `useCindia()`: `statement.issued` for this maker, `payout.sent` for this maker's payout, and `sources`. Lines, total, held amount and payout date render from the `statement.issued` payload, as v1.
- **Reads data** with `getById()`: the maker (name, `surnameChar`, `nativeName`, `communityId`, `lang`), the pieces in the payload's lines (title in both languages), and the maker's community (its `name`, for the header).
- **The maker** comes from `SlotProps.makerId` (the route, and `mkr_01` on `/demo`). The language comes from `SlotProps.lang`, which the shell starts at the maker's `lang`. After R0, `mkr_01` to `mkr_03` have `lang: "en"`, so Grace N.'s page opens in English. The demo's language toggle switches it to Chinese.
- **Emits:** nothing.
- **Exports:** `src/features/maker-statement/index.ts` default-exports `{ id: "maker-statement", slots: { "maker.main": MakerStatementView } }`, unchanged.
- **Source key on the badge:** `b10-derived`.
- **Test IDs:**
  - v1, kept: `maker-statement-total`, `maker-statement-lines`, `maker-statement-held`.
  - v1 internal, kept: `maker-statement-line-<orderId>`, `maker-statement-payout-date`, `maker-statement-paid`, `maker-statement-empty`.
  - New internal: `maker-statement-header`, `maker-statement-native-name` (rendered only when a person has a `nativeName`, which no one has in v2).
- **Labels from the glossary:** this month's income, maker share, held, the held note, payout date, paid, no sales yet, demo data, maker.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the desktop strings (the column headings of the lines table, the header's "maker at" line, the held line that names the gallery's short payment), English and Chinese side by side | src/features/maker-statement/strings.ts | none | lead |
| T1 | Spec helper: re-export `seekToEvent` from `tests/smoke/lib.ts`, open a maker page | tests/features/maker-statement-lib.ts | none | sonnet |
| T2 | The header at desktop size: mark, name, community, the month, the total, payout date, paid and its toast | src/features/maker-statement/StatementHeader.tsx, src/features/maker-statement/statementToast.css, tests/features/maker-statement-total.spec.ts, tests/features/maker-statement-toast.spec.ts | T0, T1 | opus |
| T3 | The lines table and the held note at desktop width | src/features/maker-statement/StatementLines.tsx, src/features/maker-statement/HeldNote.tsx, tests/features/maker-statement-lines.spec.ts | T0, T1 | sonnet |
| T4 | Assemble the view (lead) | src/features/maker-statement/MakerStatementView.tsx, src/features/maker-statement/index.ts, tests/features/maker-statement-flow.spec.ts | T2, T3 | lead |

**T1.** `maker-statement-lib.ts` exports two helpers. `seekToEvent(page, type, match, offsetMs)` is re-exported from `tests/smoke/lib.ts`, never copied. `openMaker(page, makerId)` opens `/maker/<makerId>` and waits for `maker.main` to fill. Fixed beat times are never used, because I2-tour moves every beat.

**T2.** `StatementHeader` (`maker-statement-header`) spans the main column:
- the kit `MakerMark`,
- the maker's name in the slot's language,
- under it, `nativeName` in `maker-statement-native-name` only when the person has one, shown exactly as written and never translated. No one has one in v2, so the element doesn't render,
- the community's name and a `Demo data` badge,
- the month,
- "This month's income" (本月收入 in Chinese) with the payload's `totalCents` in `maker-statement-total`, the largest text on the page,
- the payload's `payoutDate` in `maker-statement-payout-date`,
- `maker-statement-paid`, which reads paid once `payout.sent` arrives for this maker's payout.

The kit `Toast` shows the first time paid arrives, as v1 (`maker-statement-toast.spec.ts` keeps that check).

**T3.** `StatementLines` (`maker-statement-lines`) becomes a kit `LedgerTable` with three columns: the piece's title in the slot's language, the order's date, and the maker's share, right-aligned. It has one row per payload line (`maker-statement-line-<orderId>`). `HeldNote` (`maker-statement-held`) sits under the table: the payload's `heldCents` and the glossary's held note ("Held until the gallery pays what it owes"), then one plain line that ties it to the catch, "The gallery paid less than its contract says, so part of your share waits until it pays." (A1-12). Seal-red text with no alarm styling. It hides when nothing is held.

**T4.** `MakerStatementView` fills the main column of the maker page (the left two thirds, beside seller-hub's `maker.side`) inside one kit `Panel` that declares `b10-derived`. It shows `maker-statement-empty` until `statement.issued` arrives for this maker, then the header, the lines and the held note. Chinese body text, when the toggle picks Chinese, gets the design system's line height. `maker-statement-flow.spec.ts` plays the statement from `statement.issued` to `payout.sent` on `/maker/mkr_01` with event-anchored seeks, and checks the `d11-maker` IDs inside `frame-maker`.

## Acceptance
Every spec opens `/maker/<makerId>`, moves the timeline with `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` (through `maker-statement-lib.ts`), never a fixed time, and checks by test ID only. Arrival is asserted with Playwright's default expect timeout, never a wall-clock window. "Inside the frame" means fully inside `frame-maker` and every clipping ancestor at 1440 by 900.

1. **Given** 300 ms before the timeline's `statement.issued` for `mkr_01`, **then** `maker-statement-empty` shows and no total does.
2. **Given** 300 ms after it, on `/maker/mkr_01` as it opens (English), **then**:
   - `maker-statement-header` shows Grace N. and the Diné Weaving and Silver Co-op,
   - `maker-statement-total` reads "This month's income" with the payload's total,
   - `maker-statement-line-ord_001` reads `pc_01`'s English title from `src/mock/catalog.ts` with $134.48,
   - `maker-statement-held` shows $95.00 with the held note and the line about the gallery's short payment,
   - `maker-statement-payout-date` reads Oct 2, 2026,
   - all inside the frame.
3. **Given** the same moment, **then** `maker-statement-paid` reads paid, because `payout.sent` for `mpo_01` fired earlier in the timeline.
4. **Given** `/maker/mkr_04`, an Ojibwe co-op maker with no statement, **then** the page starts in English, no `maker-statement-native-name` renders, and `maker-statement-empty` reads no sales yet.
5. **Given** `demo-lang-toggle` switched to Chinese on `/maker/mkr_01`, **then** the labels are Chinese (`maker-statement-total` reads 本月收入), the piece titles are `pc_01`'s Chinese title, the date reads 2026年10月2日, and the amounts are unchanged.
6. **Given** scripted mode, **then** the panel shows `simulated-badge`.

## Out of scope
- The maker's listings, works in progress and buyers' questions beside the statement (seller-hub's `maker.side`).
- Computing the statement from the ledger (B10). The page shows the payload.
- Past months, history, downloads, or statements for the Ojibwe, Acoma and Seminole communities, which have no scripted month.
- Translating anything into a Native American language.

## Contract additions needed
1. **The maker surface's starting language** (contracts section 4, Surfaces and frames): it still starts in the maker's `lang`, which R0 sets to English for `mkr_01` to `mkr_03`. The table's note "(Chinese for `mkr_01` to `mkr_03`)" goes.
2. **The held line** that ties the held amount to the gallery's short payment is a feature string (T0). If the glossary gives it a row, the glossary's words win.
