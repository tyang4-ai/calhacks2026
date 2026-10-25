# Demo script

The tour on `/demo`, beat by beat: three pitch cards, the buyer minute and the seller minute (the spine, 0 to 180 s), then chapter 2 for questions. The data-smith writes `src/mock/timelines/demo.ts` from `## Beats`. The integrator builds the stage that plays it, and the verifier checks each beat's screenshot against it. Times are seconds on the player clock at 1x. Event payload IDs come from `data-model.md`, and "figure n" is `data-model.md`'s figure n. The site is English only (Gordon, Oct 24, 11:35 PM), so every line here is too.

## Beats

The tour has four parts:
1. **The pitch, 0 to 60 s.** Three full-frame cards: what Cindia is, why, and how it works.
2. **The buyer minute, 60 to 120 s.** Vibe search, the piece and where the money goes, a question the swarm answers with a check firing, pay, and a receipt that promises to show when Grace N. is paid.
3. **The seller minute, 120 to 180 s.** A maker's notes become a listing that our model embeds into the index. Then the money: the map, the month, the catch, approve and seal, close, Grace N.'s statement, and the buyer's receipt turning to "Paid to the maker".
4. **Chapter 2, 180 to 220 s, for questions.** Surprise me, the proofs, the copy watch, the storefront, and a question only the maker can answer.

The spine is `p01-what` to `d12-receipt`. Chapter 2 is `d02-surprise`, `d13-proof`, `d14-watch`, `d16-store` and `d17-ask-maker`. The timeline's `durationMs` is 220000.

| Beat | Time (s) | Camera | Process | On screen (test IDs) |
|---|---|---|---|---|
| `p01-what` | 0 to 20 | `pitch` | | `pitch-card-what` |
| `p02-why` | 20 to 40 | `pitch` | | `pitch-card-why` |
| `p03-how` | 40 to 60 | `pitch` | | `pitch-card-how` |
| `d01-vibe` | 60 to 74 | `shop-home`, then `shop-search` at 63.5 | `search` from 66.5 | `search-input`, `search-chip-1` to `search-chip-6`, `search-results`, `search-result-pc_01`, `search-engine`, `process-search-map` |
| `d03-piece` | 74 to 86 | `shop-piece` | | `buyer-story-card`, `buyer-verification`, `buyer-split-bar`, `buyer-split-maker-share`, `buyer-split-compare` |
| `d04-support` | 86 to 104 | `shop-piece`, drawer `support` | `swarm` from 90 | `support-drawer`, `support-reply`, `support-agent`, `process-swarm-graph` |
| `d05-pay` | 104 to 120 | `shop-piece` | `checkout` from 107 | `buyer-pay-button`, `buyer-project-addon`, `buyer-token`, `buyer-receipt-status`, `buyer-receipt-promise` |
| `d15-listing` | 120 to 130 | `sell-listings` | `swarm` from 122, `data` from 127 | `seller-listing-notes`, `seller-listing-draft`, `seller-listing-check-<checkId>`, `seller-listing-indexed`, `process-data-tables` |
| `d06-money` | 130 to 136 | `sell-map` | | `money-map-canvas`, `money-map-thread-mv_0001`, `money-map-thread-mv_0003`, `money-map-balance` |
| `d07-month` | 136 to 146 | `sell-month` | `reconcile` from 142 (C-12) | `reconcile-timeline`, `reconcile-match-<matchId>` for each match |
| `d08-catch` | 146 to 154 | `sell-catch` | | `reconcile-flag`, `reconcile-evidence-contract`, `reconcile-evidence-statement`, `reconcile-evidence-bank`, `reconcile-explanation` |
| `d09-approve` | 154 to 161 | `sell-approvals` | `approvals` from 155 (C-12) | `approvals-item-apr_01`, `approvals-item-apr_02`, `approvals-seal-apr_01`, `approvals-seal-apr_02` |
| `d10-close` | 161 to 166 | `sell-close` | | `close-workbook`, `close-totals`, `impact-maker-share`, `impact-days-to-payout`, `impact-hours-saved` |
| `d11-maker` | 166 to 172 | `maker` | | `maker-statement-total`, `maker-statement-lines`, `maker-statement-held` |
| `d12-receipt` | 172 to 180 | `shop-receipt` | | `buyer-receipt`, `buyer-receipt-status`, `buyer-receipt-maker-note` |
| `d02-surprise` | 180 to 186 | `shop-search` | | `search-surprise`, `search-surprise-result`, `search-surprise-rule` |
| `d13-proof` | 186 to 192 | `sell-proof` | `model` from 189 | `proof-score`, `search-proof`, `process-model-card` |
| `d14-watch` | 192 to 200 | `sell-watch` | | `watch-results`, `watch-item-cft_01`, `watch-similarity-cft_01` |
| `d16-store` | 200 to 205 | `store` | | `store-page` |
| `d17-ask-maker` | 205 to 220 | `shop-piece`, drawer `support`, then `maker` at 212.5, then `shop-piece`, drawer `support` at 215 | | `support-forwarded-qst_01`, `support-maker-answer-qst_01` |

- **`beat.started`.** Each beat's first `beat.started` fires at its start time with the first camera in its Camera cell, and its drawer when the cell names one. One more, with the same `beatId`, fires at each camera, process or drawer change in the beat's row, at the time the row gives. Beat boundaries are the first `beat.started` of each beat. Each one carries the whole state for its stretch of the beat, so `demo.camera`, `demo.process` and `demo.drawer` take its own values, and a `beat.started` without `process` or `drawer` closes the view or the drawer. So `d04-support`'s second `beat.started` carries drawer `support` again, with process `swarm`, and `d17-ask-maker`'s `maker` stretch has no drawer.
- **Cameras** (`ui-contract.md`). `pitch` is a full-frame card with no Shop or Sell frame. `shop-search` shows the latest query, `shop-piece` the open piece (`pc_01`), `shop-receipt` `ord_001`, `sell-catch` the month zoomed to the flag and its evidence, `maker` `/maker/mkr_01` (Grace N., in English) and `store` `/store/dine-weavers`. Before the first beat, and after a reset, the stage shows the `pitch` camera with the first card.
- **Process beats.** A beat with a process shows its frame at 0.66 in the left two thirds and the `process.view` slot in a panel filling the right third. The panel has no test ID of its own, and F-process renders `process-view` and `process-pane-<processId>` inside it. The frame and the panel both stay visible, so a beat's On screen IDs show in one or the other. The split takes 600 ms on the player clock, like a camera move. In `d04-support` the drawer stays open inside the scaled frame, at its right edge.
- **Screenshots.** `npm run test:demo` saves `artifacts/demo/<beat ID>.png` 300 ms before each beat ends, and `artifacts/demo/end-card.png` once the run ends. The rules are in "Screenshots and their checks" below.
- **The design.** Drop 3 draws a screen for most beats: `design/HANDOFF.md` ("The screens, in tour order") and `design/flows.md` give the screen and what changes in each, and the verifier compares `artifacts/demo/<beat ID>.png` with it. Not drawn: `d07-month`'s records table, `d13-proof`, `d14-watch`, `d02-surprise`'s result after the draw, `d17-ask-maker`, the end card and the split layout.
- **`d17-ask-maker`** (C-13) is in chapter 2 because F-support and F-seller-hub both ship the "ask the maker" run: F-support renders `support-forwarded-<questionId>` and `support-maker-answer-<questionId>` in the buyer's thread, and F-seller-hub shows the forwarded question (`seller-maker-question-qst_01`) and her answer (`seller-maker-answer-qst_01`) on Grace N.'s page during its `maker` stretch.

### The events, at 1x

Times are seconds. The finance beats keep every v1 event, ID and payload, and move by the offsets shown. The tour's own IDs are `qry_01`, `srp_01`, `thr_01`, `run_01`, `run_02`, `lst_01`, `pc_55`, `wsc_01`, `ctb_01`, `fup_02`, `apr_03` and `apr_04` (contracts section 11), plus `thr_03`, `run_07`, `qst_01`, `ans_01` and `run_09` in `d17-ask-maker`.

| Beat | Events (at) |
|---|---|
| `p01-what` | 0.0 `beat.started` `pitch`. Nothing else |
| `p02-why` | 20.0 `beat.started` `pitch` |
| `p03-how` | 40.0 `beat.started` `pitch` |
| `d01-vibe` | 60.0 `beat.started` `shop-home`. 60.2 `model.trained` and `proof.search_scored`, only when `model.ts`'s report exists, so the search line can name the model (A1-4). 60.4 `search.queried` `qry_01` (figure 11). 62.6 `search.answered`. 63.5 `beat.started` `shop-search`. 66.0 `search.mapped`, from the report's points, so only when it exists. 66.5 `beat.started` `shop-search`, process `search` |
| `d03-piece` | 74.0 `beat.started` `shop-piece`. 74.3 `piece.opened` `pc_01`. 76.5 `split.shown` from `splits.pc_01`: figure 1's numbers plus figure 16's `compare`, the gallery comparison (A1-10) |
| `d04-support` | 86.0 `beat.started` `shop-piece`, drawer `support`. 86.4 `support.asked` `thr_01`: the buyer's first `demoQuestions` entry, "Did the maker weave this herself? Can it arrive by October 10?", context `pc_01`. 87.6 to 95.5 `run_01`'s `swarm.step` events in S3's order: cindy, intake, cindy, steward with its `check` step, clerk, writer (A1-7). 90.0 `beat.started` `shop-piece`, drawer `support`, process `swarm`. 96.0 `support.answered` |
| `d05-pay` | 104.0 `beat.started` `shop-piece`. v1's `d04-pay` events at +93.0 s: 104.3 `checkout.started`, 105.5 `card.tokenized` (now with `pieceId` `pc_01`, B1-34), 106.5 `order.placed` `ord_001`, 107.0 `receipt.updated` received. Plus 106.0 `project.funded` `ctb_01` (figure 13) and 107.0 `beat.started` `shop-piece`, process `checkout` |
| `d15-listing` | 120.0 `beat.started` `sell-listings`. 120.3 `listing.requested` `lst_01`. 121.0 to 126.0 `run_02`'s `swarm.step` events in S3's order: cindy, lister, tagger, the three checker checks, indexer. 122.0 `beat.started` `sell-listings`, process `swarm`. 126.5 `listing.drafted`. 127.0 `listing.indexed` (index `cindia-drafts`), whose piece `pc_55` joins the catalog only when `apr_04` is granted, then one `data.synced` keyed `b13-live` with `demoDataSync` from `src/mock/database.ts` as its payload, so `process-data-tables` has rows, then `beat.started` `sell-listings`, process `data`. 128.0 `approval.requested` `apr_04` (D1-13) |
| `d06-money` | 130.0 `beat.started` `sell-map`. v1's `d05-money` events at +115.0 s: 130.5 `mv_0001`, 131.5 `mv_0002`, 132.5 `mv_0003`, 133.5 `account.synced`. Plus 134.2 `mv_0101` and 134.8 `mv_0102`, built from S3's `demoFundMoves`, each with `refId` `ctb_01` and date `2026-09-01` (D1-37, D1-38) |
| `d07-month` | 136.0 `beat.started` `sell-month`. v1's `d06-month` at +116.0 s: the month timeline shifted by `MONTH_SHIFT_MS` 136200, so 136.2 `month.started` and the month's records from 136.4 to 145.6, at 0.3 s a day. 142.0 `beat.started` `sell-month`, process `reconcile` |
| `d08-catch` | 146.0 `beat.started` `sell-catch`. v1's `d07-catch` at +116.0 s: 146.3 the gallery's statement, 146.8 its deposit, 147.5 `flag.raised`, 149.0 `flag.explained`, 151.5 `agent.acted` (draft), 151.7 `followup.drafted` `fup_01`, 152.0 `approval.requested` `apr_01` |
| `d09-approve` | 154.0 `beat.started` `sell-approvals`. v1's `d08-approve` at +116.0 s: 154.3 `agent.acted` (propose), 154.6 `approval.requested` `apr_02`, 155.8 `approval.granted` `apr_01`, 156.3 `followup.sent`, 157.0 `approval.granted` `apr_02`, 157.6 the three `payout.sent`, 157.8 `mv_0004` to `mv_0006`. 155.0 `beat.started` `sell-approvals`, process `approvals` |
| `d10-close` | 161.0 `beat.started` `sell-close`. v1's `d09-close` at +118.0 s: 161.3 `ledger.posted`, 161.8 `month.closed`, 162.6 `workbook.ready`, 163.5 `impact.updated` |
| `d11-maker` | 166.0 `beat.started` `maker`. v1's `d10-statement` at +119.0 s: 166.4 `statement.issued` `mst_01`, with its $95.00 held line (A1-12) |
| `d12-receipt` | 172.0 `beat.started` `shop-receipt`. 173.0 `receipt.updated` paid to the maker (v1's 51.0 plus 122.0 s). 179.0 `proof.scored` 4 of 4, off camera, so the end card and `d13-proof` have it |
| `d02-surprise` | 180.0 `beat.started` `shop-search`. 180.4 `surprise.asked` `srp_01` (figure 12). 181.6 `surprise.drawn`, figure 12's piece |
| `d13-proof` | 186.0 `beat.started` `sell-proof`. 189.0 `beat.started` `sell-proof`, process `model`. No second `proof.search_scored`: d01's is already in the store, and a seek replays it. With no report, neither beat has one |
| `d14-watch` | 192.0 `beat.started` `sell-watch`. 192.3 `watch.started` `wsc_01`. 194.5 `watch.scanned`. 195.0 `counterfeit.flagged` `cft_01` (figure 14). 195.5 `followup.drafted` `fup_02`, keyed `b15-watch` (D1-13). 196.5 `approval.requested` `apr_03` |
| `d16-store` | 200.0 `beat.started` `store`. No other events |
| `d17-ask-maker` | 205.0 `beat.started` `shop-piece`, drawer `support`. 205.4 `support.asked` `thr_03`: the buyer's second `demoQuestions` entry, "What does the pattern on this weaving mean?", context `pc_01`. 206.6 to 211.0 `run_07`'s eight `swarm.step` events in S3's order: cindy, intake, cindy, steward (two tools, its result and its `check` step), writer. 211.6 `support.answered`, L14 naming Grace N. 211.9 `question.forwarded` `qst_01` to `mkr_01` about `pc_01`, on `thr_03`. 212.5 `beat.started` `maker`. 213.5 `question.answered` `ans_01`, Grace N.'s scripted answer from `makerQuestions`, word for word. 215.0 `beat.started` `shop-piece`, drawer `support`. 215.4 to 216.0 `run_09`'s two `swarm.step` events: cindy, writer. 216.7 `support.answered` on `thr_03`, quoting her answer exactly |

- v1's concierge events (`d01-ask`) aren't in the tour. v1's `d02-story` `piece.opened` and `d03-split` `split.shown` move to 74.3 and 76.5, and `proof.scored` moves from 59.0 to 179.0.
- `run_01`, `run_02`, `run_07` and `run_09` keep their step order and their times from `src/mock/swarm.ts`: the first step plays at the window's start, and each step's `ms` is the gap to the next step. S3 times the runs to fit the windows above (87.6 to 95.5 s, 121.0 to 126.0 s, 206.6 to 211.0 s and 215.4 to 216.0 s), so nothing is scaled. The final events after a run (`support.answered`, `listing.drafted`, `question.forwarded`) play at the times in the table, not at a gap after the last step.
- Every event carries its type's key from `events.md`, except `fup_02`, keyed `b15-watch` (contracts section 11). d15's `data.synced` is the one tour event keyed `b13-live`.
- The tour holds fewer than 400 events, the `log` cap, and nothing lands after 220000.
- The tour is always scripted. In live mode each v2 source with a keyed tour event (B11 to B15) answers it with `[]` at once, so the scripted event plays on time. B16 keys no tour event. A v2 source goes live only for a person's own request, after the tour.

## Narration (a draft for Gordon to rewrite)

Gordon says these live, one line per beat in tour order, in his own words. The `d14-watch` line is L25, word for word. The `d01-vibe` line is a pitch claim fix-plan 1.5 keeps.

| Beat | Line |
|---|---|
| `p01-what` | "This is Cindia, a platform for underrepresented makers, starting with Native American makers." |
| `p02-why` | "Selling online takes time, broadband and reach that many makers on tribal lands don't have. If we don't help them, who will?" |
| `p03-how` | "Under it: a swarm of small Claude agents, our own embedding model, and one database that holds everything." |
| `d01-vibe` | "I describe the gift in my own words, and Cindy turns them into keywords I can see and change." |
| `d03-piece` | "This weaving took Grace N. 26 hours. Before I pay, I see $134.48 of my $180 goes to her, and how much less the gallery would pay her." |
| `d04-support` | "I ask if she wove it herself and if it can arrive by October 10. Small agents answer, a check confirms the quote is in the co-op's record, and you can watch each one work." |
| `d05-pay` | "I pay, add five dollars to the co-op's project, and my card becomes a token. The receipt promises to show me when Grace N. is paid." |
| `d15-listing` | "A maker writes a few lines of notes. The agents draft the listing, a check strikes a claim her notes never made, and our model adds it to the index." |
| `d06-money` | "Now follow the money into the co-op's bank account." |
| `d07-month` | "Cindy plays the co-op's whole month, matches every payout, and the reconcile view shows her record of work." |
| `d08-catch` | "Here's the catch. The gallery paid $340 less than the contract says." |
| `d09-approve` | "Cindy drafts the follow-up and the payouts. Only the manager can approve them." |
| `d10-close` | "The month closes into a real Excel file." |
| `d11-maker` | "Because the gallery paid short, $95 of Grace N.'s pay is held, and her statement tells her why." |
| `d12-receipt` | "And my receipt now shows Grace N. got paid, with a note from her." |
| `d02-surprise` | "Surprise me leans toward makers who sold less this month, and the rule is right on the screen." |
| `d13-proof` | "The matcher caught four of four planted errors. Here's our search model against keyword search on 50 held-out queries. A small test, not a benchmark." |
| `d14-watch` | "Cindy looks for listings that use the co-op's name or copy its words. The owner decides, and nothing is sent." |
| `d16-store` | "And each co-op has its own storefront at its own link." |
| `d17-ask-maker` | "When I ask what the pattern means, Cindy won't guess. She asks Grace N., and her answer comes back in her own words." |

## Screenshots and their checks

`npm run test:demo` plays `/demo` at 1x on the production build and checks each beat 300 ms before it ends (`tests/demo/beats.ts`, `harness.ts`). At that moment:
- **The camera.** `demo-stage`'s `data-camera`, and the store's `demo.camera`, `demo.process` and `demo.drawer`, are the ones the table below gives. The camera's one frame shows at full opacity: at scale 1, `sell-catch` at 1.35, and any frame under a process at 0.66 inside the left two thirds. Every other frame sits at opacity 0. `pitch` shows no frame, only its own card filling the stage.
- **The process panel.** In a beat with a process, the `process.view` slot outside every frame fills the right third of the stage, with `process-pane-<processId>` in it (or `slot-process-view` while F-process is cut). Without one, the panel is hidden.
- **Where IDs are looked up.** Inside the shown frame, never the first match in the document, because all four frames stay mounted. The `process-` IDs are looked up inside the panel, and the pitch cards on the stage.
- **In view.** Every On screen ID is visible, not scrolled or clipped out of its frame or the panel, and not mostly covered (the beat label included). Each figure's text sits in an element that's in view.
- **Three exceptions.** Two from v1: `buyer-pay-button` has to show only during `d05-pay`, not at its screenshot, and in `d07-month` only the bundled, refund-netted and carried-over match rows must be in frame (one-to-one rows may scroll out). One from the tour: in `d17-ask-maker`, `support-forwarded-qst_01` has to show only during the beat (from 211.9 s), because the support thread scrolls to the newest reply once `run_09` answers.
- **A cut feature** still plays its beat with the slot's placeholder, and the report lists the beat as cut. A cut migration's v1 version may fill the slot instead.
- **Time.** Each beat's first `beat.started` has its own `at` within 100 ms of its start (read from the store's log, so a late frame can't fail it) and lands within 250 ms of it in real time. The run ends within `durationMs` plus 500 ms of real time, and `report.json` keeps `durationMs` and `endedAtWallMs`. The end card then shows and stays.
- **Data, never typed.** Figures that depend on the data come from the loaded timeline: d01's chips from `qry_01`'s keywords, d03's gallery share from `split.shown`'s `compare`, d04's check step from `run_01`, d15's check IDs from `listing.drafted`, d02's piece from `surprise.drawn`, d13's systems from `proof.search_scored`, d14's text match from `counterfeit.flagged` `cft_01`'s `similarity` to two places, and d17's words from `question.answered`.

| Beat | Camera, process, drawer | Figures and extra checks |
|---|---|---|
| `p01-what`, `p02-why`, `p03-how` | `pitch` | Its card fills the stage, every frame is hidden, and its title and lines equal `pitch.ts` |
| `d01-vibe` | `shop-search`, `search` | Chip n reads keyword n of `qry_01` (figure 11, `gift for mom` and `under $200` among them). `search-result-pc_01` shows $180.00 |
| `d03-piece` | `shop-piece` | `buyer-story-card` shows Grace N. and 26 hours. `buyer-split-maker-share` shows $134.48, `buyer-split-bar` $22.00, $18.00 and $5.52, and `buyer-split-compare` the gallery share from `split.shown` ($86.00) |
| `d04-support` | `shop-piece`, `swarm`, drawer `support` | `process-swarm-step-<stepId>` for `run_01`'s `check` step |
| `d05-pay` | `shop-piece`, `checkout` | `buyer-token` tok_7Q2M9X4KD1PA, `buyer-receipt-status` Received, `buyer-project-addon` $5.00, `buyer-receipt-promise` Grace N. |
| `d15-listing` | `sell-listings`, `data` | `seller-listing-check-<checkId>` for each check in the tour's `listing.drafted` |
| `d06-money` | `sell-map` | $180.00, $5.52 and $156.48 on `money-map-canvas`, and the balance from the store's `account.synced` |
| `d07-month` | `sell-month`, `reconcile` | The bundled, refund-netted and carried-over match rows in frame |
| `d08-catch` | `sell-catch` | $340.00 and $2,040.00 on `reconcile-flag`, 40%, 50%, $1,700.00 and Sep 30 on the evidence |
| `d09-approve` | `sell-approvals`, `approvals` | $340.00 on `approvals-item-apr_01` and `approvals-item-apr_02` |
| `d10-close` | `sell-close` | `cindia-close-2026-09.xlsx`, $340.00 on `close-totals`, Estimate on `impact-hours-saved` |
| `d11-maker` | `maker` | `maker-statement-total` This month's income, `maker-statement-lines` $134.48, `maker-statement-held` $95.00 |
| `d12-receipt` | `shop-receipt` | `buyer-receipt-status` Paid to the maker, `buyer-receipt` $134.48 and Oct 2, 2026, `buyer-receipt-maker-note` Grace N. |
| `d02-surprise` | `shop-search` | `search-surprise-result` shows figure 12's piece, by its title |
| `d13-proof` | `sell-proof`, `model` | `proof-score` 4 of 4. `search-proof` shows `search-proof-row-<system>` for each system in the report, or "Not trained yet" |
| `d14-watch` | `sell-watch` | `watch-similarity-cft_01` reads "Text match" and the similarity of the timeline's `counterfeit.flagged` `cft_01` to two places, never a typed number |
| `d16-store` | `store` | `store-page` on `/store/dine-weavers` |
| `d17-ask-maker` | `shop-piece`, drawer `support` | `support-maker-answer-qst_01` holds `question.answered`'s words exactly |

The verifier looks at every beat's screenshot against this section and the On screen column: nothing clipped, overlapping or under 14 px in the frame's own pixels, and every listed ID in frame.

## The modes

Every time in these modes comes from the timeline's `beat.started` events, never from a constant. A beat's last millisecond is 1 ms before the next beat's first `beat.started`, because a seek to that time would already fire the next beat's camera.

**Plain `/demo`** (the tests, and anyone who opens the link) starts on Play, as v1 did, then plays every beat back to back, the spine and chapter 2, with no pause at beat ends. At the end the end card shows and stays, until a reset or a seek.

**Presenter mode, `/demo?mode=present`** (Gordon at the table):
1. The stage seeks to the start of the first beat, or of the beat `?start=` names, and plays it.
2. Each beat pauses by itself on its last millisecond, so its last frame stays up while Gordon talks. A frame that overshoots seeks back to that stop.
3. Paused at a beat's end, Space or the right arrow plays the next beat, and the left arrow replays the current one from its start. While a beat plays, the right arrow jumps to the next beat's start and plays it, and Space pauses or resumes.
4. After `d12-receipt`, the end card shows and stays. The right arrow or Space hides it and plays `d02-surprise`. The left arrow hides it and replays `d12-receipt`.
5. Chapter 2 pauses the same way, and after `d17-ask-maker` the player stops at 220.0.
6. The keys do nothing while focus is in a text field, so a judge can type during "Try it yourself".

**`?start=<beatId>`** seeks to that beat's first event and plays from there, pausing at its end in presenter mode. An unknown beat ID is ignored. `?start=catch`, the `demo-start-at-catch` control and the `c` key all mean `?start=d08-catch`. v1's rewind card is gone.

**Video mode, `/demo?video=1`** (Gordon records it), under 3 minutes, Figma's limit:
1. The cold open seeks to the last millisecond of `d08-catch` (153.999) without animation, so the flag, its evidence and the explanation are up on the `sell-catch` camera, and shows v1's line "The gallery paid $340 less than the contract says." for 5 seconds.
2. Then it resets and plays the spine from `p01-what`, with no controls or beat label.
3. Each pitch card holds for 10 seconds instead of 20: 10 seconds after a pitch beat's first `beat.started` on the player clock, the player seeks to the next beat's first `beat.started` and plays on. The pitch beats carry no other events, so the seek skips nothing.
4. The buyer and seller minutes, `d01-vibe` to `d12-receipt`, play at 1x.
5. At the end of `d12-receipt` (179.999) the player pauses, and the end card shows for 5 seconds. Chapter 2 isn't in the video.
6. That's about 2 minutes 40 seconds: 5 for the cold open, 30 for the three cards, 120 for the two minutes and 5 for the end card.
7. `mode=present` and `?start=` are ignored in video mode.

## The pitch cards

**Final** (Gordon, through `docs/v2/video-brief.md` section 7, "approved by Gordon"). `src/app/demo/pitch.ts` holds the same text, and if the two ever differ, the file wins. `PitchCard.tsx` draws one card: a title and at most four short lines in large type, with L1 in small type at its foot ("Demo. Every maker, community and story here is fictional. Nothing is for sale."), because the `pitch` camera has no top bar. The tagline **"Made by hand. Paid in full."** opens the Cindia card in the strongest type on the card, and the end card repeats it. In `pitch.ts` each card sits under a `[GORDON]` comment, and a comment beside the "Fakes" line names its source, the U.S. Attorney's case of Aug 5, 2026 in fix-plan 1.3.

| Card | Title | Lines |
|---|---|---|
| `what` (`p01-what`, `pitch-card-what`) | Cindia | Made by hand. Paid in full. / A platform for underrepresented makers, starting with Native American makers. / Yes, it's like Etsy. But we do the selling, the marketing and the books for them. / Buyers find a piece by describing a feeling, and watch the maker get paid. |
| `why` (`p02-why`, `pitch-card-why`) | Why | Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. / On a marketplace, a co-op gets one payout and splits it by hand. / Fakes sell as Native-made. In August, one eBay seller admitted to selling more than $92,000 of them. / If we don't help them, who will? |
| `how` (`p03-how`, `pitch-card-how`) | How it works | A swarm of small Claude agents, each with one job, on Haiku and Sonnet. / Our own embedding model, fine-tuned on queries Claude wrote, embeds every listing. / SpacetimeDB holds every record, and Elastic searches them. / A person approves anything that moves money. |

## The end card (`demo-end-card`)

It shows after `d12-receipt` in presenter mode and in video mode, and at the end of plain `/demo`, where it stays. It covers the stage, so no top bar shows, and it carries, in English:
- "Cindia" and the tagline, "Made by hand. Paid in full.",
- the seats line, one constant (`SEATS_LINE` in `EndCard.tsx`) that D-sponsors copies into the README, the Devpost and `sponsors/hyphenate/`: "Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money.",
- the planted-error proof, "Caught 4 of 4 planted errors", from `proof.scored`,
- the search model's recall at 5 for each system from `proof.search_scored` when `store.model.scored` is set, with L28 under it, or else "Search model: not trained yet",
- what's live and what's simulated, from `store.sources`, with a name for every source key (`b01-match` to `b16-bank-books`), "Checkout: demo only, no real charge" under Simulated, and L29 under both lists,
- at the foot, L30, the repo URL, and L1.
