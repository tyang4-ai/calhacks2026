# F-buyer · Buyer flow (F1 to F5)

> **v1 history.** This plan was built and is green in v1. Its names (the Gu embroidery studio, its makers and pieces) are from before R0, which re-skins v1 as the Diné Weaving and Silver Co-op with every number unchanged. For current names, read `docs/plans/R0-reskin.md` and `docs/v2/contracts.md`.

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/buyer/ · Made real by: B09, B10, B04

## Goal
In under 15 seconds a judge watches a buyer ask for a gift, meet the maker behind the $180.00 peony fan, see how much of the price reaches that maker, and pay with a card that turns into a token. At the end of the demo the same receipt flips to show the maker was paid.

## Read first
- `docs/common/events.md`: the envelope, the Buyer section, the store, sources and the Simulated rule
- `docs/common/data-model.md`: Piece, Person, Order, the money rules, demo-critical figures 1 and 2
- `docs/common/ui-contract.md`: `buyer.main`, the phone frame, SlotProps, the buyer test IDs
- `docs/common/design-system.md`: `Panel`, `Button`, `Money`, `ShareBar`, `MakerMark`, `Badge`, type, motion, words on screen
- `docs/common/demo-script.md`: beats `d01-ask`, `d02-story`, `d03-split`, `d04-pay`, `d11-receipt`
- `docs/common/glossary.md`: maker share, token, receipt and every label this flow shows

## Interfaces
- **Reads events** through `useCindia()`: `concierge.asked`, `concierge.answered`, `piece.opened`, `split.shown`, `checkout.started`, `card.tokenized`, `order.placed`, `receipt.updated`. Which store key holds each is in `src/core/store.ts` (the `buyer` key for most). Also reads `sources`. The language comes from `SlotProps.lang`, never from the store. The split and the receipt's share and paid date render from the `split.shown` and `receipt.updated` payloads, never from the order, because a live B10 recomputes them.
- **Reads data** with `getById()`: the pieces in `concierge.answered` (title, maker, hours, materials, price, story, heritage, process, image), each piece's maker (name, `surnameChar`), and order `ord_001`.
- **Emits,** with `source: "user"`, built with `userEvent()` from `src/core/events.ts` so their IDs and `at` follow `events.md`: `concierge.asked` (`query`, `lang`) when the buyer types a request and presses Enter, `piece.opened` (tapping a curated piece) and `checkout.started` (the pay button). The sources registry answers a typed request with `concierge.answered`, the curated set in scripted mode. Every other buyer event comes from the timeline in Phase 1.
- **Exports:** `src/features/buyer/index.ts` default-exports `{ id: "buyer", slots: { "buyer.main": BuyerFlow } }`, typed with `FeatureModule` from `src/core/featureTypes.ts`.
- **Source keys on the badge:** `b09-concierge`, `b10-derived`, `b04-bank`. The panel shows `simulated-badge` while any of them is `"scripted"` in `sources`.
- **Test IDs:** `buyer-concierge-input`, `buyer-concierge-results`, `buyer-story-card`, `buyer-process-timeline`, `buyer-split-bar`, `buyer-split-maker-share`, `buyer-pay-button`, `buyer-token`, `buyer-receipt`, `buyer-receipt-status`. Internal to this feature: `buyer-result-<pieceId>` for each curated piece, `buyer-simulated-note` (the checkout note) and `buyer-split-price` (the price above the split).
- **Labels from the glossary:** maker share, materials, Cindia fee, card fee, token, receipt, received, paid to the maker, simulated checkout, hours of work, heritage.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | src/features/buyer/strings.ts | none | lead |
| T1 | Concierge and curated grid (F1) | src/features/buyer/ConciergeChat.tsx, src/features/buyer/CuratedGrid.tsx, tests/features/buyer-concierge.spec.ts | T0 | opus |
| T2 | Maker story card and process timeline (F2) | src/features/buyer/StoryCard.tsx, src/features/buyer/ProcessTimeline.tsx, tests/features/buyer-story.spec.ts | T0 | opus |
| T3 | Price split and simulated checkout (F3, F4) | src/features/buyer/PriceSplit.tsx, src/features/buyer/Checkout.tsx, tests/features/buyer-checkout.spec.ts | T0 | opus |
| T4 | Paid receipt (F5) | src/features/buyer/Receipt.tsx, tests/features/buyer-receipt.spec.ts | T0 | opus |
| T5 | Assemble the flow and fill the slot (lead) | src/features/buyer/BuyerFlow.tsx, src/features/buyer/index.ts, tests/features/buyer-flow.spec.ts | T1 to T4 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder, because `design-system.md` puts a feature's short UI strings in its own `strings.ts`. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. T1 to T4 each export one component that takes what it needs as props or reads the store. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T5 fills the slot, and the lead sends any failure back to the builder who owns the file.

**T1.** `ConciergeChat` shows the request from the timeline's `concierge.asked` in `buyer-concierge-input` as if typed. The buyer can also type a request there and press Enter, which emits `concierge.asked` as above. `CuratedGrid` renders the three pieces of `concierge.answered` in `buyer-concierge-results`, in payload order, each as `buyer-result-<pieceId>` with its image, title, price and reason. When the answer arrives the grid rearranges into the curated set with a Motion layout transition. Tapping a piece emits `piece.opened`.

**T2.** `StoryCard` (`buyer-story-card`) shows the opened piece: title in both languages, the maker's name and `MakerMark`, hours of work, materials and the heritage line. `ProcessTimeline` (`buyer-process-timeline`) lists the piece's `process` steps with their hours, from sketch to the last stitch.

**T3.** `PriceSplit` draws the kit's `ShareBar` in `buyer-split-bar` from `split.shown`: maker share, materials, Cindia fee and card fee, with the maker share labeled in `buyer-split-maker-share`. `Checkout` shows the pay button (`buyer-pay-button`). On `card.tokenized` the masked card number with its last four digits turns into the token in `buyer-token`. A plain line says the checkout is simulated and no card is charged.

**T4.** `Receipt` (`buyer-receipt`) shows the order from `order.placed`: piece, amount, date. `buyer-receipt-status` follows `receipt.updated`: "Received" at `d04-pay`, then it flips to "Paid to the maker" at `d11-receipt`, with the maker's name (from the payload's `makerId`), and the share and paid date from the payload's `makerShareCents` and `paidDate`, through `Money` and `formatDate`.

**T5.** `BuyerFlow` shows one step at a time on the phone, chosen from the store: concierge and grid, then the story, then split and checkout, then the receipt. It keeps the receipt reachable for `d11-receipt`. It shows `simulated-badge` per the rule above. `index.ts` exports the module. `buyer-flow.spec.ts` walks the five beats in order.

## Acceptance
Every spec opens `/buyer`, moves the demo timeline to a moment just before a beat ends with `window.__cindia.player.seek(ms)` (beat times are in `demo-script.md`), and checks by test ID only.

1. **Given** the end of `d01-ask`, **then** `buyer-concierge-input` shows the request from `concierge.asked`, and `buyer-concierge-results` holds exactly three pieces in the order `pc_01`, `pc_07`, `pc_11`, each with its reason.
2. **Given** the end of `d02-story`, **then** `buyer-story-card` shows the Peony fan, its maker's name and `MakerMark`, 26 hours of work and its heritage line, and `buyer-process-timeline` lists every step in the piece's `process`.
3. **Given** the end of `d03-split`, **then** `buyer-split-bar` shows four parts that add up to $180.00, and `buyer-split-maker-share` reads $134.48.
4. **Given** the end of `d04-pay`, **then** `buyer-token` shows the token from `card.tokenized` (it starts with `tok_`) and the card's last four digits, the screen says the checkout is simulated, and `buyer-receipt-status` reads "Received" for `ord_001`.
5. **Given** the end of `d11-receipt`, **then** `buyer-receipt` and `buyer-receipt-status` read "Paid to the maker", with the maker's name, $134.48 and Oct 2, 2026.
6. **Given** any beat in scripted mode, **then** the panel shows `simulated-badge`.
7. **When** the buyer taps `buyer-result-pc_07` after `d01-ask`, **then** the store holds a `piece.opened` for `pc_07` with `source: "user"`, and `buyer-story-card` shows the Peony sachet.
8. **Given** each of `d01-ask` to `d04-pay`, **then** the phone shows one step with nothing important scrolled out of view, so the buyer part reads in 15 seconds.
9. **When** the buyer types a request in `buyer-concierge-input` and presses Enter, **then** the store holds a `concierge.asked` with `source: "user"`, and 1.2 seconds later in real time `buyer-concierge-results` shows `pc_01`, `pc_07` and `pc_11`.

## Out of scope
- Real recommendations for a typed request (B09). In scripted mode every request gets the curated set.
- Computing the price split or the receipt from the ledger (B10). Phase 1 shows the payloads.
- Real payments, real card numbers, accounts, shipping, a cart, or a full storefront.
- Posting the sale to Nessie (B04).
