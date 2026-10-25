# M-buyer · The desktop piece page and receipt (v2 migration of F-buyer)

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/buyer/ · Made real by: B10, B04

SCOPE: src/features/buyer/, tests/features/buyer-*

## Goal
A judge opens a piece on the desktop Shop and takes it in at a glance: who made it, how long it took, how its community would verify its makers in a real launch, and how much of the price reaches the maker, beside what the same maker would get through the gallery. The tour's piece is `pc_01`, Grace N.'s small grey, red and black wool weaving from the Diné Weaving and Silver Co-op. The buyer pays with a simulated card that becomes a token, and can choose to add $5.00 to the community's project, which stays off until they switch it on. The receipt promises to show when Grace N. is paid, and later turns to "Paid to the maker" with a short note from her. On the public site nothing can be bought, and the page says so where Pay would be. Every v1 figure stays exactly as it was.

## Read first
- `docs/v2/fix-plan.md`:
  - section 1.1: the Diné co-op, Grace N. and the IDs,
  - section 1.2: beats `d03-piece`, `d05-pay` and `d12-receipt`, and their On screen IDs,
  - section 1.3, points 2 and 5: each maker is paid, and the split is on the page before anyone pays,
  - section 1.8: no Pay on the public build.
- `docs/plans/R0-reskin.md`: the old-to-new names. R0 runs before V1, so the v1 code and specs this plan migrates already say Grace N., the co-op and the new titles
- `docs/v2/brief.md`: Shop, the piece page, the principles
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: Community (`verification`, `demo`, `projectIds`), Project (`addOnCents`), figure 13
  - section 3: `project.funded`, `card.tokenized` with `pieceId`, the Requests table
  - section 4: routes `/shop/piece/:pieceId` and `/shop/receipt/:orderId`, slots `shop.piece.main` and `shop.receipt.main`, `SlotProps.pieceId`, `orderId` and `publicSite`, test IDs `buyer-verification` and `buyer-project-addon`
  - section 11: the Requests rows for a person's `piece.opened` and `checkout.started`, `splits`, the Phase A legacy page `/shop/legacy`, the ID scheme, `seekToEvent`
  - section 12: labels L4 to L7 and L10
- `docs/v2/reviews/A2-culture-trust.md`: findings 2, 3 and 21, labels L4 to L7 and L10
- `docs/v2/reviews/A1-novelty.md`: finding 10 and top changes 2, 6 and 7 (the comparison, the promise and her note)
- `docs/plans/F-buyer.md`: what each v1 component does and its acceptance
- `docs/common/design-system.md` and contracts section 7: `PageFrame`, `VerificationLine` and its `demo` prop, `ShareBar`, `Money`, `MakerMark`, `Button`, `Badge`
- `docs/common/glossary.md`: every label below
- The current code in `src/features/buyer/` and its specs in `tests/features/buyer-*`

## Interfaces
- **Reads events** through `useCindia()`:
  - `piece.opened`, `split.shown`, `checkout.started`, `card.tokenized`, `order.placed`, `receipt.updated` (the `buyer` key). The checkout and the card come from `buyer.checkouts[pieceId]` and `buyer.cards[pieceId]` for this page's piece, never from the single latest one, so a person's checkout of another piece never changes this page (D1-46),
  - `project.funded` (the `projects` key),
  - `sources`.

  The split and the receipt's share and paid date render from the event payloads, as in v1, never from the order.
- **Which piece:** `SlotProps.pieceId` when the route sets it, otherwise the store's `openPieceId` (the tour on `/demo`). **Which order:** `SlotProps.orderId` when set, otherwise the newest order in the store. A person's `ord_user_<n>` order lives only in the store's `buyer.orders`, so the receipt reads it there, and reads a mock order such as `ord_001` with `getById()` (D1-33).
- **Reads data** with `getById()` and the `src/mock` exports:
  - the piece, its maker (name, `surnameChar`), its community (`name`, `craft`, `verification`, `demo`, `projectIds`), and the community's first project (`title`, `addOnCents`),
  - the gallery split for the piece in `src/mock/splits.ts`, for the comparison line (S3 T7, A1-10). A piece with no gallery split shows no line,
  - the maker's receipt note in `src/mock/` (S3, A1 top change 7).
- **The public build:** `SlotProps.publicSite` is true there (I2-shell). This feature never reads `import.meta.env`. With `publicSite`, `buyer-pay-blocked` shows L6 in place of `buyer-pay-button`, on `shop.piece.main` and on `buyer.main` alike, and nothing on the page can emit a checkout or a contribution (fix-plan 1.8). The scripted tour's token and receipt still render from their events. On localhost the demo checkout works for every piece.
- **Emits,** with `source: "user"`, through `userEvent()`:
  - `checkout.started` when the buyer presses pay.
  - `project.funded` (`contributionId` from the next `ctb_user_` number, `projectId`, `amountCents` from the project's `addOnCents`, `buyerId: "buy_01"`, no `orderId`) in the same click, only when the buyer has switched the add-on on.
  - `piece.opened` from the "See where your money goes" button, which only shows when the store has no split for this piece yet.

  Nothing is emitted on mount or on a route change, so a seek always lands on the same screen.
- **Exports:** `src/features/buyer/index.ts` default-exports `{ id: "buyer", slots: { "buyer.main": BuyerFlow, "shop.piece.main": PiecePage, "shop.receipt.main": ReceiptPage } }`. `buyer.main` stays filled until T7, so the Phase A demo and the v1 specs keep passing.
- **Source keys on the badge:**
  - piece page: `b10-derived`, `b04-bank`,
  - receipt page: `b10-derived`,
  - `buyer.main` keeps its v1 keys.
- **Test IDs:**
  - v1, kept: `buyer-story-card`, `buyer-process-timeline`, `buyer-split-bar`, `buyer-split-maker-share`, `buyer-pay-button`, `buyer-token`, `buyer-receipt`, `buyer-receipt-status`, `buyer-concierge-input` and `buyer-concierge-results` (until T7).
  - New in the contracts: `buyer-verification`, `buyer-project-addon`, and from fix-plan 1.2's tour table `buyer-split-compare` (the gallery comparison under the split), `buyer-receipt-promise` (the promise under the received status) and `buyer-receipt-maker-note` (the maker's note on the paid receipt).
  - Internal to this feature: `buyer-split-price`, `buyer-simulated-note`, `buyer-split-request` (the "See where your money goes" button), `buyer-piece-page`, `buyer-receipt-page`, `buyer-contribution` (the confirmation line after a contribution), `buyer-story-demo-note` (L5), `buyer-addon-note` (L7), `buyer-pay-blocked` (L6), `buyer-receipt-demo-note` (L10).
- **Labels from the glossary:** maker share, materials, Cindia fee, card fee, token, receipt, received, paid to the maker, simulated checkout, hours of work, about the craft (the `heritage` line), how makers are verified, community project, demo data. From contracts section 12: L4, which the kit's `VerificationLine` prints with `demo`, and L5, L6, L7 and L10.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the desktop strings ("See where your money goes", the add-on line, the contribution confirmation, the comparison line, the receipt promise, the note's heading, the receipt page heading, back to Shop) and L5, L6, L7 and L10 as contracts section 12 words them, English and Chinese side by side | src/features/buyer/strings.ts | none | lead |
| T1 | Spec helper and the v1 specs moved onto event-anchored seeks | tests/features/buyer-lib.ts, tests/features/buyer-checkout.spec.ts, tests/features/buyer-receipt.spec.ts, tests/features/buyer-story.spec.ts, tests/features/buyer-flow.spec.ts, tests/features/buyer-concierge.spec.ts | none | sonnet |
| T2 | Piece page left column: story, process steps, verification line, the demo note | src/features/buyer/PieceStory.tsx, src/features/buyer/StoryCard.tsx, src/features/buyer/ProcessTimeline.tsx, src/features/buyer/PieceVerification.tsx, tests/features/buyer-piece-story.spec.ts | T0, T1 | opus |
| T3 | Piece page price column: the price, the split, the gallery comparison and the split request | src/features/buyer/PieceSplit.tsx, src/features/buyer/PriceSplit.tsx, src/features/buyer/PriceCompare.tsx, tests/features/buyer-piece-split.spec.ts | T0, T1 | opus |
| T4 | Desktop checkout: pay and the public build's block, the project add-on, the token, the inline order status and the promise | src/features/buyer/Checkout.tsx, src/features/buyer/ProjectAddOn.tsx, src/features/buyer/checkoutRules.ts, src/features/buyer/checkoutRules.test.ts, src/features/buyer/BuyerFlow.tsx, tests/features/buyer-piece-pay.spec.ts | T0, T1 | opus |
| T5 | The receipt page: status, promise, the maker's note, the demo receipt note | src/features/buyer/ReceiptPage.tsx, src/features/buyer/Receipt.tsx, tests/features/buyer-receipt-page.spec.ts | T0, T1 | sonnet |
| T6 | Assemble the pages and fill the slots (lead) | src/features/buyer/PiecePage.tsx, src/features/buyer/index.ts, tests/features/buyer-desktop-flow.spec.ts | T2 to T5 | lead |
| T7 | After G4v2 only: retire the phone flow and all five phone-flow specs (lead) | src/features/buyer/BuyerFlow.tsx, src/features/buyer/ConciergeChat.tsx, src/features/buyer/CuratedGrid.tsx, src/features/buyer/index.ts, tests/features/buyer-checkout.spec.ts, tests/features/buyer-receipt.spec.ts, tests/features/buyer-story.spec.ts, tests/features/buyer-flow.spec.ts, tests/features/buyer-concierge.spec.ts | G4v2, contract change 6 below | lead |

**How the tasks fit:**
- The lead writes T0 before spawning anyone.
- T1 runs first, because every new spec imports its helper.
- T2 to T5 can then run two at a time (the v2 cap). Each owns its components and its spec.
- `BuyerFlow` keeps using `StoryCard`, `ProcessTimeline`, `PriceSplit`, `Checkout` and `Receipt` until T7. So every change to those five adds props with defaults that keep the phone flow's v1 behavior and test IDs unchanged. The new lines (L5, the comparison, the add-on, the promise, the note, L10) show only under the desktop props. The one exception is the public build's block, which applies to the phone flow too, since `/shop/legacy` may be on the public site before T7 (fix-plan 1.8, I2-shell).
- T7 is a separate small round that the orchestrator starts right after G4v2, once the tour no longer plays `buyer.main`.

**T1.** `buyer-lib.ts` re-exports `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` (I2-shell T5) and never copies it (contracts section 11, D1-34). It adds `tourEvent(page, type, match, offsetMs, seed)`:
- When the timeline holds the event, it seeks there with `seekToEvent`.
- Until I2-tour puts v2 events such as `project.funded` `ctb_01` into the timeline, it pauses the player and emits `seed`, the scripted payloads from `src/mock/`, with `window.__cindia.emit()`.

The v1 events (`split.shown`, `checkout.started`, `card.tokenized`, `order.placed`, `receipt.updated`) are in the timeline already. All five v1 specs swap their fixed beat times for `seekToEvent`, because I2-tour moves every beat's time while the events and figures stay. Then (B1-25):
- `buyer-checkout`, `buyer-receipt` and `buyer-story` move to the desktop pages, `/shop/piece/<pieceId>` and `/shop/receipt/ord_001`, so none of them depends on `/shop/legacy`. They pass once T6 fills the slots.
- `buyer-flow` and `buyer-concierge` test the phone flow itself, so they stay on `/shop/legacy`, the one place I2-shell renders `buyer.main` in Phase A.

T7 deletes all five.

**T2.** `PieceStory` is the left part of the piece page.
- It reuses `StoryCard` (`buyer-story-card`) with a `layout="page"` prop: the title in both languages, the maker's name and `MakerMark`, hours of work, materials, the craft line ("About the craft"), and the piece's illustration with its `imageAlt` and an "Illustration" label.
- A `Demo data` badge sits beside the maker's name, and `buyer-story-demo-note` under the story reads L5: "Fictional maker and story, written by the Cindia team."
- It reuses `ProcessTimeline` (`buyer-process-timeline`) as a horizontal row of steps with their hours.
- `PieceVerification` (`buyer-verification`) draws the kit `VerificationLine` from the community's `verification` with `demo={community.demo}`, so the line starts with L3 ("Demo verification", 演示认证) and shows L4 under it: "Demo: this shows how verification would work. No real check was done." (演示：这里展示认证将如何进行。并未做过真实核查。) Both come word for word from contracts section 12. The note itself is the community's data (A2 R6). For the Diné co-op it says a real launch would have the Navajo Nation's own enrollment or certification under the Indian Arts and Crafts Act, keep only a yes or no, and that no real check was done for this demo. The community's name links to `/shop/community/<communityId>` through the kit `Link`.

**T3.** `PieceSplit` is the top of the price column.
- It shows the price (`buyer-split-price`).
- When the store holds a `split.shown` for this piece, it renders `PriceSplit`: the kit `ShareBar` in `buyer-split-bar` and the maker share in `buyer-split-maker-share`, from the payload as in v1.
- `PriceCompare` (`buyer-split-compare`) sits under the split when the piece has a gallery split in `src/mock/splits.ts` (A1-10): "Through the gallery, by its contract, Grace N. would get $86.00 for this piece. On Cindia, $134.48." The maker's name comes from the piece. The gallery amount is the gallery split's maker share, which the data model's gallery rule gives as gross minus the contract's 40% commission minus materials (18000 minus 7200 minus 2200 is 8600 cents for `pc_01`). The Cindia amount is the `split.shown` payload's `makerShareCents`. Both go through `Money`, and code computed both, so nothing here is typed in.
- When there's no split yet, it shows `buyer-split-request` ("See where your money goes"), which emits `piece.opened` for this piece. The scripted answer, a `split.shown` for that piece from `splits.ts`, is contracts section 11's Requests row (I2-core T8).
- `PriceSplit` gains a `pieceId` prop that defaults to the store's latest split, so `BuyerFlow` is unchanged.

**T4.** `Checkout` sits under the split. `checkoutRules.ts` holds its pure rules, and `checkoutRules.test.ts` tests them: whether pay is open, blocked by the public build, or done for this piece, and whether the add-on reads on.
- `ProjectAddOn` (`buyer-project-addon`) shows the community's first project, its title and `addOnCents` through `Money`, with an on and off switch.
  - It starts off, so no one gives money they didn't choose to give (C-10).
  - `buyer-addon-note` beside it reads L7 before any click: "Demo project. No money is collected."
  - The switch reads on while the buyer has it switched on, and whenever the store holds a `project.funded` for this piece's checkout. That's one whose `orderId` names an order of this piece (the tour's `ctb_01` names `ord_001`, which is `pc_01`'s), or the one this page's own pay click emitted, as long as the store still holds it. So the tour shows it on during `d05-pay`, and a seek that clears the store turns it off again.
  - Once this piece's `checkout.started` is in the store, the switch is locked.
- The pay button (`buyer-pay-button`) emits `checkout.started` and, when the add-on is on, `project.funded` in the same click. Once `buyer.checkouts[pieceId]` is set, the button is disabled.
- With `publicSite`, `buyer-pay-blocked` replaces the pay button and reads L6: "This is the public demo. Nothing here can be bought." (这是公开演示版。这里的物品都无法购买。), word for word from contracts section 12. The add-on stays locked off there, unless the tour's own contribution turns it on.
- When `buyer.cards[pieceId]` arrives, the masked number turns into the token (`buyer-token`), as in v1.
- The simulated note (`buyer-simulated-note`) always shows.
- After this piece's `order.placed` and `receipt.updated`, an inline status line (`buyer-receipt-status`) reads "Received", with a kit `Link` to `/shop/receipt/<orderId>`.
  - Under it, `buyer-receipt-promise` reads "We'll show you when Grace N. is paid.", with the maker's name from the receipt's `makerId`.
  - For an `ord_user_` order, `buyer-receipt-demo-note` shows L10 in place of the promise, "Demo receipt. Nothing was sold.", because a person's order never enters the month and is never paid out.
- After a contribution for this checkout, `buyer-contribution` names the project and the amount. If the person's own contribution is already there, the tour's `ctb_01` arriving later doesn't add a second line (D1-46).
- A person's checkout of any piece but the timeline's gets its token and order from contracts section 11's keyless Requests row (I2-core T8).
- In `BuyerFlow.tsx`, T4 changes one thing: it passes `SlotProps.publicSite` to `Checkout`, so the phone flow shows L6 on the public build too.

**T5.** `ReceiptPage` (`buyer-receipt-page`) centers `Receipt` (`buyer-receipt`) in the Shop frame for `SlotProps.orderId`, or the newest order. It shows:
- the piece and its illustration,
- the amount and date,
- the status line `buyer-receipt-status`, which follows `receipt.updated`: "Received", then "Paid to the maker" with the maker's name, `makerShareCents` and `paidDate` from the payload,
- `buyer-receipt-promise` while the status is received ("We'll show you when Grace N. is paid."),
- `buyer-receipt-maker-note` once the status is `paid_to_maker`: the maker's own note from `src/mock/`, as she wrote it, under her name and `MakerMark`, with the `Demo data` badge. It is the last thing the tour's buyer sees (`d12-receipt`), so the promise in `d05-pay` gets kept on screen,
- for an `ord_user_` order, L10 in `buyer-receipt-demo-note`, and no promise or note,
- the contribution, when a `project.funded` names this order (the tour's `ctb_01` names `ord_001`).

`Receipt` gains an `orderId` prop that defaults to the newest order, so `BuyerFlow` is unchanged.

**T6.** `PiecePage` (`buyer-piece-page`) lays out `PieceStory` and the price column (`PieceSplit`, then `Checkout`) inside one kit `Panel` per column with the source keys above.
- It leaves the page's right third to the support feature's `shop.piece.side`, so the two columns plus that slot fit 1440 by 900 with nothing important below the fold.
- An unknown piece ID shows a short note and a `Link` back to `/shop`.
- `index.ts` exports the module above.
- `buyer-desktop-flow.spec.ts` walks the piece page and the receipt page through the tour's events with `tourEvent`.

**T7.** After G4v2 the tour no longer uses `buyer.main`. The lead removes `BuyerFlow`, `ConciergeChat`, `CuratedGrid` and the `buyer.main` entry in `index.ts`, and deletes all five phone-flow specs: `buyer-checkout`, `buyer-receipt`, `buyer-story`, `buyer-flow` and `buyer-concierge` (B1-25). `buyer-flow` and `buyer-concierge` look for `/shop/legacy`, which I2-tour T5 removes before G4v2, and the other three only repeat what the desktop specs check. T7 runs right after G4v2 and before any V4 round reruns G3, once the integrator has removed `buyer.main` and the two concierge test IDs from the contract (change 6). Then G3 again.

## Acceptance
Every spec opens the route named, reaches tour events with `seekToEvent` or `tourEvent` from `buyer-lib.ts` (never a fixed time), and checks by test ID only. A spec seeks before it acts, because a seek drops a pending answer (lessons, F-ask-cindy). An answer to a person counts as arrived when it shows within Playwright's default expect timeout, never inside a wall-clock window (B1-27). Expected values come from `src/mock/`, not typed in. "Inside the frame" means the element's box sits fully inside `frame-buyer` and every clipping ancestor at 1440 by 900.

1. **Given** `/shop/piece/pc_01` 300 ms after the timeline's `split.shown` for `pc_01`, **then**:
   - `buyer-story-card` shows `pc_01`'s title, Grace N. with her `MakerMark`, 26 hours of work and the craft line, with the `Demo data` badge and `buyer-story-demo-note` (L5),
   - `buyer-process-timeline` lists every step,
   - `buyer-verification` shows how `com_dine` would verify its makers, starting with L3 and with L4 under it,
   - the four parts of `buyer-split-bar` add up to $180.00 and `buyer-split-maker-share` reads $134.48,
   - `buyer-split-compare` reads the gallery split's maker share for `pc_01` from `src/mock/splits.ts` ($86.00) against $134.48,
   - all six are inside the frame.
2. **Given** `/shop/piece/pc_01` 300 ms after the timeline's `receipt.updated` with status `received` for `ord_001`, **then** `buyer-token` shows a token starting with `tok_` and last four 4242, `buyer-simulated-note` shows, `buyer-receipt-status` reads "Received", and `buyer-receipt-promise` reads "We'll show you when Grace N. is paid." **Given** the tour's `project.funded` `ctb_01` too, **then** `buyer-project-addon` reads on and `buyer-contribution` names `prj_01`'s title and $5.00.
3. **Given** `/shop/piece/pc_01` on a fresh store, before the timeline's `checkout.started`, **then** `buyer-project-addon` is off and `buyer-addon-note` shows L7. **When** the buyer switches it on and presses `buyer-pay-button`, **then** the store holds exactly one `checkout.started` with `source: "user"`, and one `project.funded` for `prj_01` with 500 and `source: "user"`. **When**, on another fresh store, they press pay with the add-on left off, **then** the click adds no `project.funded`.
4. **Given** `/shop/receipt/ord_001` 300 ms after the timeline's `receipt.updated` with status `paid_to_maker`, **then** `buyer-receipt` and `buyer-receipt-status` read "Paid to the maker", Grace N., $134.48 and Oct 2, 2026, `buyer-receipt-maker-note` shows her note from `src/mock/` with the `Demo data` badge, `buyer-receipt-promise` is gone, and all of it is inside the frame.
5. **Given** `/shop/piece/pc_02` with no split in the store, **then** `buyer-split-request` shows. **When** it's pressed, **then** the store holds a `piece.opened` for `pc_02` with `source: "user"`, and `buyer-split-bar` shows `pc_02`'s split from `src/mock/splits.ts` once it arrives (contracts section 11's Requests row).
6. **When** the buyer presses `buyer-pay-button` on `/shop/piece/pc_02` on a fresh store on localhost, **then** `buyer-token` and a "Received" `buyer-receipt-status` arrive for an `ord_user_` order, and `buyer-receipt-demo-note` shows L10 in place of the promise. **Given** `/shop/piece/pc_01` afterwards, **then** it shows no token, because `pc_02`'s card is filed under `pc_02` (D1-46). **Given** `/shop/receipt/<that order>`, **then** L10 shows and there's no maker note.
7. **Given** `checkoutRules.test.ts`, **then** with `publicSite` every piece's pay is blocked and the add-on can't emit, and without it pay is open for every piece until that piece's own checkout starts. On the public build, `buyer-pay-blocked` stands where `buyer-pay-button` was (D-deploy checks the built site).
8. **Given** scripted mode, **then** each page shows `simulated-badge`.
9. **Given** `demo-lang-toggle` switched to Chinese, **then** every label on both pages is Chinese, L4 to L7 and L10 included, the maker's note stays as she wrote it, and the amounts are unchanged.
10. **Given** the Phase A demo (before I2-tour), **then** every v1 buyer spec passes with event-anchored seeks: `buyer-checkout`, `buyer-receipt` and `buyer-story` on the desktop pages, and `buyer-flow` and `buyer-concierge` on `/shop/legacy`, where `buyer.main` still shows the v1 phone flow.
11. **Given** the tour (after I2-tour), **then** at the end of `d03-piece`, `d05-pay` and `d12-receipt` every buyer test ID that beat lists in fix-plan 1.2's table is inside the frame, `buyer-split-compare`, `buyer-receipt-promise` and `buyer-receipt-maker-note` included. The desktop flow spec checks this with the same events.

## Out of scope
- The vibe search and its results (F-search), and the support drawer beside the piece (F-support, slot `shop.piece.side`).
- Computing a split, a comparison or a receipt in the browser. They come from events and `src/mock/` (B10 live).
- Real payments, real card numbers, accounts, a cart, shipping, or posting to Nessie (B04).
- Community pages and project pages (F-communities). The piece page only links to them.
- Deploying the public site and checking it (D-deploy).

## Contract additions needed
Settled in contracts section 11, I2-core and I2-shell, listed so a builder knows where each lives:
1. **Navigation for features:** `navigate(path)` in `src/core/nav.ts` and the kit `Link` (prop `to`), which renders a real anchor and calls `navigate` on a plain click, so moving between pages never reloads the store.
2. **Request row:** `piece.opened` from a person is answered on key `b10-derived` with a `split.shown` for that piece from `src/mock/splits.ts`, one split per piece under the `ch_cindia` money rules, with `pc_01`'s equal to figure 1. A `piece.opened` from the timeline isn't answered.
3. **Request row:** `checkout.started` from a person, for a piece the timeline doesn't check out, has no key and is answered by a scripted `card.tokenized` (with the `pieceId`, a `tok_` token made from the piece ID with no randomness, brand `visa`, last four 4242), then `order.placed` (`orderId: "ord_user_<n>"`, `channelId: "ch_cindia"`, the piece's price) and `receipt.updated` (`received`). A person's orders stay out of the month, the ledger and the money map.
4. **IDs:** a person's contributions use `ctb_user_<n>`.
5. **The store:** `buyer.checkouts` and `buyer.cards` by `pieceId` (I2-core T3, B1-34).
6. **After G4v2:** remove `buyer.main`, `buyer-concierge-input` and `buyer-concierge-results` from the UI contract, so T7 can delete them.
7. **The public build:** `SlotProps.publicSite` (I2-shell).

Still open, and in the fix report's needs:
8. The names of the gallery split for the comparison and of the maker's receipt note in `src/mock/`, in contracts section 11 (S3 T7).
