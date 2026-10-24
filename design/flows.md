# Cindia · flows

Handoff drop 2 · direction B · Warp and weft · Oct 24, 2026

The paths the ten kept screens cover, in the order the tour plays them (contracts section 8). For each step: what a person does, what changes, and the screen in `design/screens/` that shows the state. All motion runs on the player clock and is instant under reduced motion. The durations come from `tokens.md`: the thread draws in 700 ms, the seal presses in over 220 ms, rows weave in 40 ms apart, and clicks answer in 160 ms.

## The buyer, on Shop

| Step | Beat | Screen | The person | What changes |
|---|---|---|---|---|
| 1 | `d01-vibe`, from 0 s | `shop-home--hero` | Types a feeling into `search-input` and presses Search | The keyword chips appear under the box (`search-chip-1` to `-6`). Vibe search turns Working |
| 2 | `d01-vibe`, from 3.5 s | `shop-search--results` | Reads the results, can remove a chip or change a filter | Six Compact cards weave in, each with its reason. The engine line says which engine answered and that it's Simulated |
| 2a | `d01-vibe`, from 6.5 s | `process-search--view` | Clicks the Vibe search block, or the tour opens it | `?process=search`. The map draws, the star links to the six results, and the scores and the log fill in |
| 3 | `d02-surprise` | `shop-search--results` | Picks a mode and presses Surprise me | The drawn piece fills the result row, with the method named in words |
| 4 | `d03-piece` | `shop-piece-pc_01--checkout` | Opens Peony fan | The piece page with the story, the verification and the split. Checkout turns Done, since `piece.opened` and `split.shown` are its events |
| 5 | `d04-support` | `shop-piece-pc_01--support-drawer` | Presses Help and asks "Did the maker stitch this herself? Can it arrive by October 10?" | The drawer slides in from the right over a scrim. The step strip lights each agent in turn, and the Now line says what the active agent is doing |
| 5a | `d04-support`, from 25 s | `process-swarm--view` | Clicks Agent swarm, or How it works | The graph lights the latest step's node, each handoff's edge draws over 600 ms, and a step row is added per `swarm.step` |
| 6 | `d04-support`, at 30 s | `shop-piece-pc_01--support-answered` | Reads the reply | Writer's reply lands. The strip is all done: "Answered by Writer after 8 steps." The same thread shows in "Ask about this piece" |
| 7 | `d05-pay` | `shop-piece-pc_01--token` | Leaves the add-on checked and presses Pay | Pay reads "Securing your card…", then the token box takes the place of the card line and Pay, and the status reads Received. Checkout counts 1 order |
| 8 | `d12-receipt` | `shop-receipt-ord_001--received`, then `--paid-to-maker` | Opens View receipt | Received, with the last stretch of the thread dotted. On `receipt.updated` with `paid_to_maker`, the thread draws on to the maker, the stop fills, and the status turns `jade` |

## The studio, on Sell

| Step | Beat | Screen | The owner | What changes |
|---|---|---|---|---|
| 9 | `d06-money` | `sell-map--default` | Opens Money map | Each `money.moved` adds a row, and its thread draws from payer to payee. The balance updates on `account.synced` |
| 10 | `d08-catch` | `sell-month--catch` | Sees the flag | The flag line and the three evidence cards appear, then Cindy's explanation. Reconcile turns Attention and shows "!" |
| 11 | `d09-approve` | `sell-approvals--waiting`, then `--sealed` | Approves each card in turn | Each seal presses into its slot without turning. The actions become Approved with the date and what followed. Approvals turns Done, and the maker payouts start on the money map |
| 12 | `d10-close` | `sell-close--impact` | Opens Close | The totals fill on `month.closed`. The Excel report card drops in on `workbook.ready`, and Impact fills on `impact.updated`, with Estimate badges on the estimates |
| 13 | `d11-maker` | `maker-mkr_01--zh` | The camera moves to Lu Yun's page | In Chinese: 本月收入, the payout and its date, and the held line with why it's held |

`d07-month` (the records arriving and matching) uses the month table, which isn't in this drop.

## Getting around

- **Shop and Sell:** the switch on the beam. A maker page counts as Sell, and a storefront as Shop.
- **Process views:** any block opens `?process=<id>`, and Esc or `process-view-close` clears it. The beam stays clickable above the scrim, so another block switches views directly.
- **Drawers:**
  - Help (`?drawer=support`) is on every page, and Ask Cindy (`?drawer=ask`) is on Sell pages.
  - Esc or the close button shuts a drawer.
  - A process view never covers an open drawer.
- **Links on the screens:**
  - "View receipt", from the piece page to the receipt.
  - "Open Approvals", from the catch to Approvals.
  - "See the flag in Month", from Approvals back to the catch.
  - "How it works", from the support drawer to the swarm view.

## Not drawn yet

- The month's records table during `d07-month`.
- The checkout, money, reconcile, approvals, close, proof, watch and model process views.
- The tour's title and end cards.
- The held screens: the storefront builder, the store page, listings, the counterfeit watch, and the projects and community pages.
- A clickable Figma prototype of these paths. `HANDOFF.md` lists it with the other Figma work still to do.
