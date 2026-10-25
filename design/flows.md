# Cindia · flows

Handoff drop 3 · direction B · Warp and weft · Oct 24, 2026

The tour in the order it plays (contracts section 8), with the screen in `design/screens/` for each state. All motion runs on the player clock and is instant under reduced motion. The durations come from `tokens.md`: the thread draws in 700 ms, the seal presses in over 220 ms, rows weave in 40 ms apart, and clicks answer in 160 ms.

## The pitch, 0 to 60 s

| Step | Beat | Screen | The person | What changes |
|---|---|---|---|---|
| 1 | `p01-what`, 0 s | `pitch-card--what` | Gordon talks | The card fills the stage. In presenter mode the beat pauses at its end and the presenter hint shows at the bottom right |
| 2 | `p02-why`, 20 s | `pitch-card--why` | Presses → or Space | The next card. ← replays the current one |
| 3 | `p03-how`, 40 s | `pitch-card--how` | Presses → or Space | The last card. → goes on to the buyer minute |

## The buyer minute, on Shop, 60 to 120 s

| Step | Beat | Screen | The person | What changes |
|---|---|---|---|---|
| 4 | `d01-vibe`, from 60 s | `shop-home--hero` | Types a feeling into `search-input` and presses Search | The six keyword chips appear under the box. Vibe search turns Working |
| 5 | `d01-vibe`, from 63.5 s | `shop-search--results` | Reads the results, can remove a chip or change a filter | Six compact cards weave in, each with its reason and its verification line. The engine line says which engine answered |
| 6 | `d01-vibe`, from 66.5 s | `process-search--view` | The tour opens the view, or the person clicks Vibe search | `?process=search`. The map draws with each community in its color, the star links to the six results, and the scores and the log fill in |
| 7 | `d03-piece`, from 74 s | `shop-piece-pc_01--checkout` | Opens the small grey, red and black wool weaving | The story card, the verification and the split with "Through the gallery: $86.00. On Cindia: $134.48." Checkout turns Done. Before the question, the side shows the suggestions |
| 8 | `d04-support`, from 86 s | `shop-piece-pc_01--support-drawer` | Presses Help and asks "Did the maker weave this herself? Can it arrive by October 10?" | The drawer slides in over a scrim. The strip lights each agent in turn, the Now line says what the active one is doing, and each step joins the list under the question |
| 9 | `d04-support`, from 90 s | `process-swarm--view` | The tour opens Agent swarm | The graph lights the latest step's node, each handoff's edge draws over 600 ms, and a step row is added per `swarm.step` |
| 10 | `d04-support`, at 96 s | `shop-piece-pc_01--support-answered` | Reads the reply | The reply replaces the list. The strip is all done: "Answered by Writer after 10 steps." The same thread shows in "Ask about this piece" |
| 11 | `d05-pay`, from 104 s | `shop-piece-pc_01--checkout`, then `--token` | Leaves the add-on on and presses Pay | At 106 s the add-on turns on with the tour's contribution. Pay reads "Securing your card…", then the token box takes the place of the card line and Pay, and the status reads Received with "We'll show you when Grace N. is paid." |
| 12 | `d05-pay` | `shop-receipt-ord_001--received` | Opens "View receipt" | Received, with the last stretch of the thread dotted and the promise under the status |

## The seller minute, on Sell, 120 to 180 s

| Step | Beat | Screen | The owner | What changes |
|---|---|---|---|---|
| 13 | `d15-listing`, from 120 s | `sell-listings--d15` | Lena T.'s notes are in, and Draft with Cindy runs | The steps fill in order. The draft lands at 126.5 s with its checks, the planted claim marked for review |
| 14 | `d15-listing`, from 127 s | `process-data--view` | The tour opens Data | The tables, the index and the model card. `cindia-drafts` shows the new draft, and the map rings it beside the co-op's weavings. At 128 s Approvals gets `apr_04` |
| 15 | `d06-money`, from 130 s | `sell-map--default` | Opens Money map | Each `money.moved` adds a row, and its thread draws from payer to payee. The balance updates on `account.synced` |
| 16 | `d08-catch`, from 146 s | `sell-month--catch` | Sees the flag | The flag line and the three evidence cards appear, then Cindy's explanation. Reconcile turns Attention and shows "!" |
| 17 | `d09-approve`, from 154 s | `sell-approvals--waiting`, then `--sealed` | Approves each card in turn | Each seal presses into its slot without turning. The actions become Approved with the date and what followed |
| 18 | `d10-close`, from 161 s | `sell-close--impact` | Opens Close | The totals fill on `month.closed`. The Excel report card drops in on `workbook.ready`, and Impact fills with Estimate badges on the two estimates |
| 19 | `d11-maker`, from 166 s | `maker-mkr_01--en` | The camera moves to Grace N.'s page | In English: this month's income, the payout and its date, the held line and why it's held, and her four pieces for sale |
| 20 | `d12-receipt`, from 172 s | `shop-receipt-ord_001--paid-to-maker` | Back on the buyer's receipt | On `receipt.updated` with `paid_to_maker`, the thread draws on to Grace N., the stop fills, the status turns `jade`, and her note appears with her mark and the Demo data badge |

In presenter mode the end card follows `d12-receipt`. It isn't drawn in this drop.

## Chapter 2, for questions, 180 to 205 s

| Beat | Screen | What it shows |
|---|---|---|
| `d02-surprise` | `shop-search--results` | Surprise me with its three modes. The result after a draw isn't drawn |
| `d13-proof` | not drawn | |
| `d14-watch` | not drawn | |
| `d16-store` | `store-dine-weavers--page` | The co-op's store page, from the store bar to the footer |

The community page (`shop-community-com_dine--page`) isn't a beat. It opens from the co-op's name on the piece page and from the community cards.

## Getting around

- **Shop and Sell:** the switch on the beam. A maker page counts as Sell, and a storefront as Shop.
- **Process views:** any block opens `?process=<id>`, and Esc or `process-view-close` clears it. The beam stays clickable above the scrim, so another block switches views directly. On `/demo`, a beat that sets a process shows its view in a panel on the right third instead.
- **Drawers:**
  - Help (`?drawer=support`) is on every page, and Ask Cindy (`?drawer=ask`) is on Sell pages.
  - Esc or the close button shuts a drawer.
  - A process view never covers an open drawer.
- **Presenter mode** (`/demo?mode=present`): → or Space plays the next beat, ← replays the current one. The hint at the bottom right says so.
- **Links on the screens:**
  - "View receipt", from the piece page to the receipt.
  - The co-op's name in the story card, to the community page.
  - "See the co-op's storefront", from the community page to the store page.
  - "Open Approvals", from the catch to Approvals.
  - "See the flag in Month", from Approvals back to the catch.
  - "Review Cindy's proposal", from the listing to Approvals.
  - "How it works", from the support drawer to the swarm view.
