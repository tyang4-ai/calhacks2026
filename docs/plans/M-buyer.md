# M-buyer · The desktop piece page and receipt (v2 migration of F-buyer)

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/buyer/ · Made real by: B10, B04

SCOPE: src/features/buyer/, tests/features/buyer-*

## Goal
A judge opens a piece on the desktop Shop and takes it in at a glance: who made it, how long it took, how the maker's community verifies its makers, and how much of the price reaches the maker. They pay with a simulated card that becomes a token, can add $5.00 to the community's project, and later the receipt page shows the maker was paid. Every v1 figure stays exactly as it was.

## Read first
- `docs/v2/brief.md`: Shop, the piece page, the principles
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: Community (`verification`, `projectIds`), Project (`addOnCents`), figure 13
  - section 3: `project.funded`, the Requests table
  - section 4: routes `/shop/piece/:pieceId` and `/shop/receipt/:orderId`, slots `shop.piece.main` and `shop.receipt.main`, `SlotProps.pieceId` and `orderId`, the transition rule, test IDs `buyer-verification` and `buyer-project-addon`
  - section 8: beats `d03-piece`, `d05-pay`, `d12-receipt`
- `docs/plans/F-buyer.md`: what each v1 component does and its acceptance
- `docs/common/design-system.md` and contracts section 7: `PageFrame`, `VerificationLine`, `ShareBar`, `Money`, `MakerMark`, `Button`, `Badge`
- `docs/common/glossary.md`: every label below
- The current code in `src/features/buyer/` and its specs in `tests/features/buyer-*`

## Interfaces
- **Reads events** through `useCindia()`:
  - `piece.opened`, `split.shown`, `checkout.started`, `card.tokenized`, `order.placed`, `receipt.updated` (the `buyer` key),
  - `project.funded` (the `projects` key that I2-core adds),
  - `sources`.
  
  The split and the receipt's share and paid date render from the event payloads, as in v1, never from the order.
- **Which piece:** `SlotProps.pieceId` when the route sets it, otherwise the store's `openPieceId` (the tour on `/demo`). **Which order:** `SlotProps.orderId` when set, otherwise the newest order in the store.
- **Reads data** with `getById()`: the piece, its maker (name, `surnameChar`), its community (`name`, `craft`, `verification`, `projectIds`), the community's first project (`title`, `addOnCents`), and the order for the receipt.
- **Emits,** with `source: "user"`, through `userEvent()`:
  - `checkout.started` when the buyer presses pay.
  - `project.funded` (`contributionId`, `projectId`, `amountCents` from the project's `addOnCents`, `buyerId: "buy_01"`, no `orderId`) in the same click, when the add-on is on.
  - `piece.opened` from the "See where your money goes" button, which only shows when the store has no split for this piece yet.
  
  Nothing is emitted on mount or on a route change, so a seek always lands on the same screen.
- **Exports:** `src/features/buyer/index.ts` default-exports `{ id: "buyer", slots: { "buyer.main": BuyerFlow, "shop.piece.main": PiecePage, "shop.receipt.main": ReceiptPage } }`. `buyer.main` stays filled until T7, so the Phase A demo and the v1 specs keep passing.
- **Source keys on the badge:**
  - piece page: `b10-derived`, `b04-bank`,
  - receipt page: `b10-derived`,
  - `buyer.main` keeps its v1 keys.
- **Test IDs:**
  - v1, kept: `buyer-story-card`, `buyer-process-timeline`, `buyer-split-bar`, `buyer-split-maker-share`, `buyer-pay-button`, `buyer-token`, `buyer-receipt`, `buyer-receipt-status`, `buyer-concierge-input` and `buyer-concierge-results` (until T7).
  - New in the contracts: `buyer-verification`, `buyer-project-addon`.
  - Internal to this feature: `buyer-split-price`, `buyer-simulated-note`, `buyer-split-request` (the "See where your money goes" button), `buyer-piece-page`, `buyer-receipt-page`, `buyer-contribution` (the confirmation line after a contribution).
- **Labels from the glossary:** maker share, materials, Cindia fee, card fee, token, receipt, received, paid to the maker, simulated checkout, hours of work, heritage, how makers are verified, community project, demo data.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the desktop strings ("See where your money goes", the add-on line, the contribution confirmation, the receipt page heading, back to Shop), English and Chinese side by side | src/features/buyer/strings.ts | none | lead |
| T1 | Spec helper and the v1 specs moved onto event-anchored seeks | tests/features/buyer-lib.ts, tests/features/buyer-checkout.spec.ts, tests/features/buyer-receipt.spec.ts, tests/features/buyer-story.spec.ts, tests/features/buyer-flow.spec.ts, tests/features/buyer-concierge.spec.ts | none | sonnet |
| T2 | Piece page left column: story, process steps, verification line | src/features/buyer/PieceStory.tsx, src/features/buyer/StoryCard.tsx, src/features/buyer/ProcessTimeline.tsx, src/features/buyer/PieceVerification.tsx, tests/features/buyer-piece-story.spec.ts | T0, T1 | opus |
| T3 | Piece page price column: the price, the split and the split request | src/features/buyer/PieceSplit.tsx, src/features/buyer/PriceSplit.tsx, tests/features/buyer-piece-split.spec.ts | T0, T1 | opus |
| T4 | Desktop checkout: pay, the project add-on, the token, the inline order status | src/features/buyer/Checkout.tsx, src/features/buyer/ProjectAddOn.tsx, tests/features/buyer-piece-pay.spec.ts | T0, T1 | opus |
| T5 | The receipt page | src/features/buyer/ReceiptPage.tsx, src/features/buyer/Receipt.tsx, tests/features/buyer-receipt-page.spec.ts | T0, T1 | sonnet |
| T6 | Assemble the pages and fill the slots (lead) | src/features/buyer/PiecePage.tsx, src/features/buyer/index.ts, tests/features/buyer-desktop-flow.spec.ts | T2 to T5 | lead |
| T7 | After G4v2 only: retire the phone flow (lead) | src/features/buyer/BuyerFlow.tsx, src/features/buyer/ConciergeChat.tsx, src/features/buyer/CuratedGrid.tsx, src/features/buyer/index.ts, tests/features/buyer-concierge.spec.ts, tests/features/buyer-flow.spec.ts | G4v2, contract change 6 below | lead |

**How the tasks fit:**
- The lead writes T0 before spawning anyone.
- T1 runs first, because every new spec imports its helper.
- T2 to T5 can then run two at a time (the v2 cap). Each owns its components and its spec.
- `BuyerFlow` keeps using `StoryCard`, `ProcessTimeline`, `PriceSplit`, `Checkout` and `Receipt` until T7. So every change to those five adds props with defaults that keep the phone flow's v1 behavior and test IDs unchanged.
- T7 is a separate small round that the orchestrator starts after G4v2, once the tour no longer plays `buyer.main`.

**T1.** `buyer-lib.ts` exports `seekToEvent(page, type, match, offsetMs)`. It reads `window.__cindia.player.getTimeline()`, finds the first event of `type` whose payload matches `match` (for example `{ pieceId: "pc_01" }`), pauses and seeks to that event's `at` plus `offsetMs`. It throws a clear error when the event isn't in the timeline. The v1 specs swap their fixed beat times for this helper and open the route where I2-shell renders `buyer.main` in Phase A. This matters because I2-tour moves every beat's time, while the events and figures stay.

**T2.** `PieceStory` is the left two thirds of the piece page.
- It reuses `StoryCard` (`buyer-story-card`) with a `layout="page"` prop: the title in both languages, the maker's name and `MakerMark`, hours of work, materials, the heritage line, and the piece's illustration with its `imageAlt` and an "Illustration" label.
- It reuses `ProcessTimeline` (`buyer-process-timeline`) as a horizontal row of steps with their hours.
- `PieceVerification` (`buyer-verification`) draws the kit `VerificationLine` from the community's `verification`: who attested and how, with the note. The community's name links to `/shop/community/<communityId>` through the kit `Link` (contract addition 1).
- A `Demo data` badge sits beside the maker's name, since every person is fictional.

**T3.** `PieceSplit` is the top of the right third.
- It shows the price (`buyer-split-price`).
- When the store holds a `split.shown` for this piece, it renders `PriceSplit`: the kit `ShareBar` in `buyer-split-bar` and the maker share in `buyer-split-maker-share`, from the payload as in v1.
- When there's no split yet, it shows `buyer-split-request` ("See where your money goes"), which emits `piece.opened` for this piece. The scripted answer, a `split.shown` 1.2 seconds later in real time, is contract addition 2.
- `PriceSplit` gains a `pieceId` prop that defaults to the store's latest split, so `BuyerFlow` is unchanged.

**T4.** `Checkout` sits under the split.
- `ProjectAddOn` (`buyer-project-addon`) shows the community's first project, its title and `addOnCents` through `Money`, with an on and off switch, on by default.
- The pay button (`buyer-pay-button`) emits `checkout.started` and, when the add-on is on, `project.funded` in the same click. Once `checkout.started` is in the store, the button is disabled.
- On `card.tokenized` the masked number turns into the token (`buyer-token`), as in v1.
- The simulated note (`buyer-simulated-note`) always shows.
- After `order.placed` and `receipt.updated` for the order, an inline status line (`buyer-receipt-status`) reads "Received", with a kit `Link` to `/shop/receipt/<orderId>`.
- After a contribution, `buyer-contribution` names the project and the amount.
- For a person's checkout of any other piece, the token and order come from contract addition 3. Without it, pay is disabled with a note that the guided demo pays for the Peony fan only.

**T5.** `ReceiptPage` (`buyer-receipt-page`) centers `Receipt` (`buyer-receipt`) in the Shop frame for `SlotProps.orderId`, or the newest order. It shows:
- the piece and its illustration,
- the amount and date,
- the status line `buyer-receipt-status`, which follows `receipt.updated`: "Received", then "Paid to the maker" with the maker's name, `makerShareCents` and `paidDate` from the payload,
- the contribution, when a `project.funded` names this order (the tour's `ctb_01` names `ord_001`).

`Receipt` gains an `orderId` prop that defaults to the newest order, so `BuyerFlow` is unchanged.

**T6.** `PiecePage` (`buyer-piece-page`) lays out `PieceStory` (two thirds) and the price column (`PieceSplit`, then `Checkout`, a third) inside one kit `Panel` per column with the source keys above.
- It leaves the page's right edge to the support feature's `shop.piece.side`, so the two columns plus that slot fit 1440 by 900 with nothing important below the fold.
- An unknown piece ID shows a short note and a `Link` back to `/shop`.
- `index.ts` exports the module above.
- `buyer-desktop-flow.spec.ts` walks the piece page and the receipt page through the v1 events with `seekToEvent`.

**T7.** After G4v2 the tour no longer uses `buyer.main`. The lead removes `BuyerFlow`, `ConciergeChat`, `CuratedGrid`, the `buyer.main` entry in `index.ts` and the two specs that only test them, once the integrator has removed `buyer.main` and the two concierge test IDs from the contract (change 6). Then G3 again.

## Acceptance
Every spec opens the route named, moves the timeline with `seekToEvent` from `buyer-lib.ts` (never a fixed time), and checks by test ID only. "Inside the frame" means the element's box sits fully inside `frame-buyer` and every clipping ancestor at 1440 by 900.

1. **Given** `/shop/piece/pc_01` 300 ms after the timeline's `split.shown` for `pc_01`, **then**:
   - `buyer-story-card` shows the Peony fan, its maker's name and `MakerMark`, 26 hours of work and its heritage line,
   - `buyer-process-timeline` lists every step,
   - `buyer-verification` shows how `com_gu` verifies its makers,
   - the four parts of `buyer-split-bar` add up to $180.00 and `buyer-split-maker-share` reads $134.48,
   - all six are inside the frame.
2. **Given** `/shop/piece/pc_01` 300 ms after the timeline's `receipt.updated` with status `received` for `ord_001`, **then** `buyer-token` shows a token starting with `tok_` and last four 4242, `buyer-simulated-note` shows, and `buyer-receipt-status` reads "Received".
3. **When** the buyer leaves `buyer-project-addon` on and presses `buyer-pay-button` on `/shop/piece/pc_01` before the timeline's `checkout.started`, **then** the store holds exactly one `checkout.started` with `source: "user"`, and one `project.funded` for `prj_01` with 500 and `source: "user"`. With the add-on switched off, the click adds no `project.funded`.
4. **Given** `/shop/receipt/ord_001` 300 ms after the timeline's `receipt.updated` with status `paid_to_maker`, **then** `buyer-receipt` and `buyer-receipt-status` read "Paid to the maker", the maker's name, $134.48 and Oct 2, 2026, inside the frame.
5. **Given** `/shop/piece/pc_20` with no split in the store, **then** `buyer-split-request` shows. **When** it's pressed, **then** the store holds a `piece.opened` for `pc_20` with `source: "user"`, and within 2 seconds in real time `buyer-split-bar` shows that piece's split (needs addition 2).
6. **When** the buyer presses `buyer-pay-button` on `/shop/piece/pc_20`, **then** within 2 seconds in real time `buyer-token` and a "Received" `buyer-receipt-status` show for an `ord_user_` order (needs addition 3).
7. **Given** scripted mode, **then** each page shows `simulated-badge`.
8. **Given** `demo-lang-toggle` switched to Chinese, **then** every label on both pages is Chinese and the amounts are unchanged.
9. **Given** the Phase A demo (before I2-tour), **then** every v1 buyer spec passes on the moved routes with event-anchored seeks, and `buyer.main` still shows the v1 phone flow.
10. **Given** the tour (after I2-tour), **then** at the end of `d03-piece`, `d05-pay` and `d12-receipt` every buyer test ID that beat lists in contracts section 8 is inside the frame. The desktop flow spec checks this with the same events.

## Out of scope
- The vibe search and its results (F-search), and the support drawer beside the piece (F-support, slot `shop.piece.side`).
- Computing a split or a receipt in the browser. They come from events (B10 live).
- Real payments, real card numbers, accounts, a cart, shipping, or posting to Nessie (B04).
- Community pages and project pages (F-communities). The piece page only links to them.

## Contract additions needed
1. **Navigation for features:** `navigate(path: string)` in `src/core/` (the shell registers the router's navigate function), and a kit `Link` in `src/ui/` (prop `to`) that renders a real anchor and calls `navigate` on a plain click. That way moving between pages never reloads the store.
2. **Request row:** `piece.opened` from a person is answered on key `b10-derived`. Scripted, it's a `split.shown` for that piece from `src/mock/splits.ts`, one split per piece computed by the data-smith with the `ch_cindia` money rules, and `pc_01`'s equals figure 1. Live, it's B10. A `piece.opened` from the timeline isn't answered.
3. **Request row:** `checkout.started` from a person, for a piece that isn't the timeline's open piece, is answered by a scripted `card.tokenized` (a token `tok_` plus 12 letters or digits made from the piece ID with no randomness, brand `visa`, last four 4242), then `order.placed` (`orderId: "ord_user_<n>"`, `channelId: "ch_cindia"`, the piece's price) and `receipt.updated` (`received`). User orders don't enter the month, the ledger or the money map.
4. **IDs:** a person's contributions use `ctb_user_<n>`.
5. **Phase A (for I2-shell):** `buyer.main` has to keep rendering wherever the Phase A `buyer` camera and the v1 buyer specs look for it, even after F-search fills `shop.home.main`. Otherwise F-search's green turns the Phase A demo red. A transitional route or stage slot that always renders `buyer.main` until I2-tour would do it.
6. **After G4v2:** remove `buyer.main`, `buyer-concierge-input` and `buyer-concierge-results` from the UI contract, so T7 can delete them.
