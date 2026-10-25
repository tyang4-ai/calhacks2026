# Demo script

The 60-second demo, beat by beat. The data-smith writes `src/mock/timelines/demo.ts` from this file. The integrator builds the stage that plays it, and the verifier checks each beat's screenshot against it. Times are seconds on the player clock at 1x. Event payload IDs come from `data-model.md`.

The demo follows the buyer's $180 into the studio and out to the maker. The buyer part stays under 15 seconds, because four of the five tracks judge what happens after the money lands.

## Beats

| Beat | Time | Camera | Desktop camera (Phase A) | Events (at) | On screen (test IDs) | Figures shown |
|---|---|---|---|---|---|---|
| `d01-ask` | 0.0 to 4.0 | `buyer` | `shop-legacy` | 0.3 `concierge.asked`: query "a gift under $200 for my mom, she loves red wool". 1.8 `concierge.answered`: `pc_01`, `pc_07`, `pc_11` | `buyer-concierge-input`, `buyer-concierge-results` | Small grey, red and black wool weaving $180.00, Red and grey wool mini weaving $48.00, Red and white wool weaving $175.00 |
| `d02-story` | 4.0 to 8.0 | `buyer` | `shop-legacy` | 4.2 `piece.opened`: `pc_01` | `buyer-story-card`, `buyer-process-timeline` | `mkr_01`'s mark and name, 26 hours, the process steps |
| `d03-split` | 8.0 to 11.0 | `buyer` | `shop-legacy` | 8.3 `split.shown`: `pc_01`, gross 18000, card fee 552, platform fee 1800, materials 2200, maker share 13448 | `buyer-split-bar`, `buyer-split-maker-share` | Maker share $134.48, materials $22.00, Cindia fee $18.00, card fee $5.52 |
| `d04-pay` | 11.0 to 15.0 | `buyer` | `shop-legacy` | 11.3 `checkout.started`. 12.5 `card.tokenized`: `tok_7Q2M9X4KD1PA`, visa, last4 4242. 13.5 `order.placed`: `ord_001`. 14.0 `receipt.updated`: `ord_001`, received | `buyer-pay-button`, `buyer-token`, `buyer-receipt-status` | The token, "Received" |
| `d05-money` | 15.0 to 20.0 | `buyer-studio` | `sell-map` | 15.5 `money.moved` `mv_0001`: sale, buyer to Cindia, 18000. 16.5 `mv_0002`: fee, Cindia to the card network, 552. 17.5 `mv_0003`: settlement, Cindia to the studio, 15648, ref `pay_001`. 18.5 `account.synced` | `money-map-canvas`, `money-map-thread-mv_0001`, `money-map-thread-mv_0003`, `money-map-balance` | $180.00 in, $5.52 card fee, $156.48 to the studio, the new balance |
| `d06-month` | 20.0 to 30.0 | `studio-month` | `sell-month` | 20.2 `month.started`: `2026-09`. 20.4 to 29.6: September's records from `timelines/month.ts`, in date order, about 0.3 s per day, each `record.arrived` followed by its `match.made` and `ledger.posted`. Cindy's `agent.acted` lines for the bundled, refund and carried-over matches. The gallery's statement and deposit wait for `d07` | `reconcile-timeline`, `reconcile-match-<matchId>` for each match | The bundled payout covering 3 orders, the $95.00 refund netted, 2 orders carried to Oct 2 |
| `d07-catch` | 30.0 to 38.0 | `studio-catch` | `sell-catch` | 30.3 `record.arrived`: `stm_gallery_2026_09`. 30.8 `record.arrived`: the gallery's deposit. 31.5 `flag.raised`: `flg_01`, expected 204000, actual 170000, delta 34000. 33.0 `flag.explained`: trust `ctr_gallery_01`. 35.5 `agent.acted`: draft. 35.7 `followup.drafted`: `fup_01` for `apr_01`, its text from `src/mock/`. 36.0 `approval.requested`: `apr_01` | `reconcile-flag`, `reconcile-evidence-contract`, `reconcile-evidence-statement`, `reconcile-evidence-bank`, `reconcile-explanation` | Contract 40%, statement 50%, bank $1,700.00 on Sep 30, owed $2,040.00, short $340.00 |
| `d08-approve` | 38.0 to 43.0 | `studio-owner` | `sell-approvals` | 38.3 `agent.acted`: propose. 38.6 `approval.requested`: `apr_02`. 39.8 `approval.granted`: `apr_01`, `own_01`, `2026-10-01`. 40.3 `followup.sent`: `fup_01`. 41.0 `approval.granted`: `apr_02`. 41.6 `payout.sent` for `mpo_01`, `mpo_02`, `mpo_03`, dated `2026-10-02`. 41.8 `money.moved` `mv_0004` to `mv_0006`: maker pay, studio to each maker | `approvals-item-apr_01`, `approvals-item-apr_02`, `approvals-seal-apr_01`, `approvals-seal-apr_02` | The follow-up for $340.00, the three payouts with any over $500 marked, $340.00 held |
| `d09-close` | 43.0 to 47.0 | `studio-close` | `sell-close` | 43.3 `ledger.posted`: the closing entries. 43.8 `month.closed`: `2026-09`, held 34000. 44.6 `workbook.ready`: `cindia-close-2026-09.xlsx`, sheets Ledger, Reconciliation, Profit and loss, Makers. 45.5 `impact.updated`: `imp_2026_09` | `close-workbook`, `close-totals`, `impact-maker-share`, `impact-days-to-payout`, `impact-hours-saved` | September's sales, fees, maker pay and $340.00 held, the impact numbers marked as estimates |
| `d10-statement` | 47.0 to 50.0 | `maker` | `maker` | 47.4 `statement.issued`: `mst_01`, `mkr_01` | `maker-statement-total`, `maker-statement-lines`, `maker-statement-held` | This month's income with the weaving's $134.48, $95.00 held, payout date Oct 2 |
| `d11-receipt` | 50.0 to 60.0 | `receipt` | `shop-legacy` | 51.0 `receipt.updated`: `ord_001`, paid to the maker, 13448, paid `2026-10-02`. 59.0 `proof.scored`: 4 of 4 (off camera, ready for questions) | `buyer-receipt`, `buyer-receipt-status` | "Paid to the maker", $134.48, Oct 2, 2026 |

Every beat starts with `beat.started` carrying its beat ID and camera at the beat's first time. The timeline's `durationMs` is 60000.

The timeline keeps the v1 camera IDs in the Camera column. On the desktop stage the shell maps them to the Desktop camera column through `toTourCamera()` (`ui-contract.md`, Phase A mapping): `buyer` and `receipt` to `shop-legacy`, the Phase A legacy page `/shop/legacy` in `frame-buyer`, and the rest to the Sell views and the maker page. This holds until I2-tour replaces this sheet with the tour.

Notes for the data-smith:
- `mv_0001` onward are the money moves' IDs, in the order they fire. `acct_studio` is the studio account's ID in `account.synced`.
- The bundled, refund and carried-over matches must each fire during `d06`, so all three are on screen by 29.6.
- `payout.sent` amounts are the `mpo_` amounts from `month.ts`. The three `money.moved` maker-pay moves carry the same amounts.

## Narration (a draft for Gordon to edit)

Gordon says these live. Plain and short, one line per beat.

| Beat | Line |
|---|---|
| `d01-ask` | "My mom loves red wool, so I ask for a gift under two hundred dollars." |
| `d02-story` | "This weaving took one maker 26 hours." |
| `d03-split` | "Before I pay, I can see $134.48 of my $180 goes to the maker." |
| `d04-pay` | "I pay. My card number never leaves checkout. It becomes a token." |
| `d05-money` | "Now follow the money. It lands in the co-op's bank account." |
| `d06-month` | "Cindy plays the co-op's whole month and matches every payout to its orders." |
| `d07-catch` | "Here's the catch. The gallery paid $340 less than the contract says, and Cindy shows why." |
| `d08-approve` | "Cindy drafts the follow-up and the payouts. Only the manager can approve them." |
| `d09-close` | "The month closes into a real Excel file." |
| `d10-statement` | "Each maker gets a plain statement, with what's still owed." |
| `d11-receipt` | "And my receipt now shows the maker got paid." |

## Video mode, `/demo?video=1`

1. **Cold open, `d00-cold-open`, 5 seconds:** the stage seeks to 38.0 without animation, shows the `studio-catch` camera, and puts one line over it: "The gallery paid $340 less than the contract says."
2. **Rewind:** the stage resets the player and plays the 60 seconds from `d01-ask`.
3. **End card, 5 seconds** after 60.0, test ID `demo-end-card`: what's real and what's simulated (read from the store's `sources`), the proof score, and the repo URL.

The demo controls and the beat label are hidden in video mode, so the recording is clean.

## Start at the catch (Hyphenate's judges)

1. `demo-start-at-catch` or `/demo?start=catch` seeks to 30.0 and plays `d07-catch` to `d11-receipt`.
2. At 60.0 the stage shows "Rewind to the buyer" for 1 second, seeks to 0.0, and plays `d01-ask` to `d05-money`.
3. It pauses at 19.999 s, the end of `d05-money`, so Gordon can talk. Not at 20.0, because `seek(20000)` already fires `d06-month`'s `beat.started` and moves the camera to `studio-month`.

## After the 60 seconds (during questions)

Gordon drives these by hand.

1. **Ask Cindy:** open the ask drawer from the top bar. Ask "Which piece earned the most this month?" and get a bar chart (`ask-cindy-chart`). Then "Why did you flag the gallery payment?", answered with the explanation and links to the three records.
2. **The proof panel:** the Proof view shows "Caught 4 of 4" (`proof-score`), with each planted error (`proof-item-err_01` to `proof-item-err_04`) and what a correct matcher reports.
3. **Impact:** the Close view's side panel, with the estimates labeled.
4. **What's live:** `demo-mode-toggle` to Live shows a dot per source. Any panel still on scripted events keeps its Simulated badge.

## Screenshots for G4

`npm run test:demo` saves `artifacts/demo/<beat ID>.png` 300 ms before each beat ends. The verifier checks each one against its row above: the camera's frames are where `ui-contract.md` puts them, every test ID in the On screen column is visible, and the figures match. The test fails a beat when one of its On screen IDs or figures is rendered but scrolled, clipped or covered out of its frame's visible area at the screenshot. Two exceptions: `buyer-pay-button` only has to show during `d04-pay`, and in `d06-month` only the bundled, refund-netted and carried-over match rows must be in frame (one-to-one rows may scroll out). If a feature was cut, its beat still plays and shows the slot placeholder. The verifier checks that beat against the Cut and simulated list in `status.md` instead.
