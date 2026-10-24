# I2-tour · The v2 guided tour on `/demo`

Priority: P0 · Wave: V3 · Depends on: F-search, M-buyer, F-support, F-process, M-approvals, F-seller-hub, F-watch, F-storefront green or cut · Area: `src/app/demo/`, the demo timeline, the demo tests · Owners: data-smith (T1) and integrator (T2 to T6) · Gate: G4v2, tag `demo-ok-v2`

SCOPE: src/app/, src/core/featureTypes.ts, src/core/events.ts, src/core/state.ts, src/core/validate.ts, src/core/validate.test.ts, src/core/reducers/small.ts, src/core/reducers.test.ts, docs/common/demo-script.md, docs/common/ui-contract.md, docs/common/events.md, tests/demo/, tests/offline/, tests/smoke/

That is the integrator's SCOPE. The data-smith's task T1 is a separate spawn with `SCOPE: src/mock/timelines/demo.ts, src/mock/timelines/month.ts, src/mock/index.ts, tests/data/`. The two run in parallel once T2's type change (`beat.started.drawer`) has landed.

## Goal

`/demo` plays the whole v2 story by itself in about 104 seconds. A judge sees:
- vibe search and surprise me,
- the piece, a question the swarm answers, the payment,
- the money, the month, the catch, the seal, the close,
- the maker's statement, the receipt, the proof,
- the counterfeit watch, a new listing, a storefront.

The process views open beside the page at the right moments. Every v1 finance figure stays exactly as it was. Video mode and start at the catch work for the recording and for Hyphenate's judges.

## Read first

- `docs/v2/contracts.md` section 8, the beat table. After I2-core, the same table is in `docs/common/demo-script.md`'s Phase A notes and `ui-contract.md`'s camera states.
- `docs/common/demo-script.md` (v1 beats, video mode, start at the catch, screenshot rules), `docs/common/events.md` (`beat.started`), `docs/common/data-model.md` (figures 1 to 15).
- The stage as I2-shell left it: `src/app/demo/`, `src/app/chrome/ProcessOverlay.tsx`, `src/app/surfaces/ShopSurface.tsx` (the `/shop/legacy` page).
- The demo tests: `tests/demo/beats.ts`, `harness.ts`, `demo.spec.ts`, `modes.spec.ts`, `tests/offline/offline.spec.ts`.
- The data-smith reads its v1 `src/mock/timelines/demo.ts` and `month.ts`, plus `src/mock/search.ts`, `swarm.ts`, `watch.ts`, `listings.ts` and `model.ts` from S3-catalog.

## Interfaces

- **Reads:**
  - `store.demo` (`beatId`, `camera`, `process`, `drawer`),
  - `store.buyer.openPieceId`, `store.search.latestQueryId`,
  - `store.sources`, `store.proof` and `store.model` for the end card,
  - the `demo` timeline.
- **Emits:** nothing. The timeline carries every event.
- **`beat.started` gains `drawer?: "support" | "ask" | "audit"`,** which opens that drawer in the shown frame for the beat, as `process` opens a process view. A beat may carry more than one `beat.started` with the same `beatId`: one at its start, and one at each camera, process or drawer change in its row. Beat boundaries are the first `beat.started` of each beat.
- **Cameras:** `CameraId` becomes the tour cameras only. `LegacyCameraId`, `LEGACY_CAMERA_TO_TOUR` and `toTourCamera()` are removed from `src/core/featureTypes.ts` and `validate.ts` once the timeline no longer uses them.
- **Process beats on the stage:** when a beat sets `process`, the stage shows the frame scaled to 0.66 in the left two thirds, and the `process.view` slot in a panel (`process-view`) filling the right third. Both stay visible, so the beat's On screen IDs on the page and in the view all show. A manual `?process=` stays the centered overlay I2-shell built.
- **The drawer and the process panel together** (`d04-support`): the drawer stays open inside the scaled frame, at the frame's right edge.

**The tour's events**, at 1x. Times are seconds. The finance beats keep every v1 event, ID and payload, and move by the offsets shown.

| Beat | Events (at) |
|---|---|
| `d01-vibe` | 0.0 `beat.started` `shop-home`. 0.4 `search.queried` `qry_01` (figure 11). 2.6 `search.answered`. 3.5 `beat.started` `shop-search`. 6.0 `search.mapped` (only when `model.ts`'s report exists). 6.5 `beat.started` `shop-search`, process `search` |
| `d02-surprise` | 9.0 `beat.started` `shop-search`. 9.4 `surprise.asked` `srp_01` (figure 12). 10.6 `surprise.drawn` `pc_46` |
| `d03-piece` | 14.0 `beat.started` `shop-piece`. 14.3 `piece.opened` `pc_01`. 16.5 `split.shown` (v1's figures) |
| `d04-support` | 21.0 `beat.started` `shop-piece`, drawer `support`. 21.4 `support.asked` `thr_01`, buyer, "Did the maker stitch this herself? Can it arrive by October 10?", context `pc_01`. 22.6 to 29.5 the `swarm.step` events of `run_01` (cindy, intake, steward, clerk, writer). 25.0 `beat.started` `shop-piece`, drawer `support`, process `swarm`. 30.0 `support.answered` |
| `d05-pay` | 33.0 `beat.started` `shop-piece`. v1's `d04-pay` events at +22.0 s: 33.3 `checkout.started`, 34.5 `card.tokenized`, 35.5 `order.placed` `ord_001`, 36.0 `receipt.updated` received. Plus 35.0 `project.funded` `ctb_01` (figure 13) and 36.0 `beat.started` `shop-piece`, process `checkout` |
| `d06-money` | 39.0 `beat.started` `sell-map`. v1's `d05-money` events at +24.0 s: 39.5 `mv_0001`, 40.5 `mv_0002`, 41.5 `mv_0003`, 42.5 `account.synced`. Plus 43.2 `mv_0101` and 43.8 `mv_0102` |
| `d07-month` | 45.0 `beat.started` `sell-month`. v1's `d06-month` at +25.0 s (45.2 `month.started`, the month's records 45.4 to 54.6) |
| `d08-catch` | 55.0 `beat.started` `sell-catch`. v1's `d07-catch` at +25.0 s |
| `d09-approve` | 63.0 `beat.started` `sell-approvals`. v1's `d08-approve` at +25.0 s |
| `d10-close` | 68.0 `beat.started` `sell-close`. v1's `d09-close` at +25.0 s |
| `d11-maker` | 72.0 `beat.started` `maker`. v1's `d10-statement` at +25.0 s |
| `d12-receipt` | 75.0 `beat.started` `shop-receipt`. 76.0 `receipt.updated` paid to the maker (v1's 51.0 plus 25.0 s) |
| `d13-proof` | 80.0 `beat.started` `sell-proof`. 80.4 `proof.scored` 4 of 4. 80.8 `model.trained` and 81.0 `proof.search_scored`, both only when the report exists. 83.0 `beat.started` `sell-proof`, process `model` |
| `d14-watch` | 85.0 `beat.started` `sell-watch`. 85.3 `watch.started` `wsc_01`. 87.5 `watch.scanned`. 88.0 `counterfeit.flagged` `cft_01` (figure 14). 89.5 `approval.requested` `apr_03` |
| `d15-listing` | 92.0 `beat.started` `sell-listings`. 92.3 `listing.requested` `lst_01`. 93.0 to 97.5 the `swarm.step` events of `run_02` (lister, tagger, checker, indexer). 95.0 `beat.started` `sell-listings`, process `swarm`. 98.0 `listing.drafted` |
| `d16-store` | 100.0 `beat.started` `store`. No other events |

`durationMs` is 104000. `proof.scored` moves from v1's 59.0 to 80.4. v1's `d01-ask` concierge events and `d02-story` aren't in the tour.

**Video mode (`?video=1`):**
1. The cold open seeks to 63.0 without animation and shows the `sell-catch` camera, whatever beat that time falls in, with v1's line "The gallery paid $340 less than the contract says." for 5 seconds.
2. Then it resets and plays from 0.
3. The end card (`demo-end-card`) shows for 5 seconds after 104.0:
   - what's real and what's simulated (from `store.sources`),
   - the planted-error score,
   - the search model's recall at 5 for each system when `store.model.scored` is set,
   - the repo URL.

**Start at the catch** (`demo-start-at-catch` or `?start=catch`):
1. Seek to 55.0 and play to 104.0.
2. Show "Rewind to the buyer" for 1 second.
3. Seek to 0 and play to 38.999, then pause, with `d05-pay` still on screen. Seeking to 39.0 would fire `d06-money`'s `beat.started`.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T2 | `beat.started.drawer` in the types, validation, reducer and state (`demo.drawer`), with tests. This lands first, so T1 can use it | src/core/events.ts, src/core/state.ts, src/core/validate.ts, src/core/validate.test.ts, src/core/reducers/small.ts, src/core/reducers.test.ts | the V2 features | sonnet (integrator) |
| T1 | The data-smith: rewrite `src/mock/timelines/demo.ts` to the events table (tour camera IDs, `process` and `drawer` on `beat.started`), with the month timeline shifted to start at 45.0 and the v1 constants (`DEMO_QUERY`, `MONTH_SHIFT_MS`, `CATCH_TIMES`) updated. Write `tests/data/demo-timeline.test.ts`:<br>- every event valid and sorted,<br>- every beat's first `beat.started` at its start time,<br>- figures 11 to 14 at their times,<br>- every v1 finance event present with the same ID and payload at its shifted time,<br>- `model.trained`, `proof.search_scored` and `search.mapped` present exactly when the report exists | src/mock/timelines/demo.ts, src/mock/timelines/month.ts, src/mock/index.ts, tests/data/demo-timeline.test.ts | T2 | opus (data-smith) |
| T3 | The stage:<br>- cameras for every tour camera,<br>- the drawer per beat through the surfaces' props,<br>- the process split layout,<br>- removing the legacy camera types and mapping once T1's timeline uses tour IDs | src/app/demo/DemoStage.tsx, src/app/demo/cameras.ts, src/app/demo/cameras.test.ts, src/app/demo/stage.module.css, src/app/demo/BeatLabel.tsx, src/app/chrome/ProcessOverlay.tsx, src/core/featureTypes.ts | T1 | opus (integrator) |
| T4 | Video mode (cold open at 63.0, end card after 104.0 with the search proof) and start at the catch (55.0, rewind, pause at 38.999) | src/app/demo/videoMode.ts, src/app/demo/ColdOpen.tsx, src/app/demo/EndCard.tsx, src/app/demo/startAtCatch.ts, src/app/controls/DemoControls.tsx | T3 | sonnet (integrator) |
| T5 | Remove the `/shop/legacy` route and the `shop-legacy` camera from `ShopSurface` and the routes, but only if `shop.home.main` (F-search) and `shop.receipt.main` (M-buyer) are filled. If either feature was cut, keep the legacy page and say so in the report | src/app/surfaces/ShopSurface.tsx | T3 | sonnet (integrator) |
| T6 | The tests:<br>- `tests/demo/beats.ts` rewritten from the events table, with each beat's On screen IDs and figures (v1's figures for the finance beats, figures 11 to 14 for the new ones),<br>- the harness accepting several `beat.started` per beat and checking the process panel's position,<br>- each run under 130 seconds, screenshots 300 ms before each beat ends,<br>- `tests/offline/` for the tour,<br>- `tests/smoke/` cleaned of the legacy cameras | tests/demo/beats.ts, tests/demo/harness.ts, tests/demo/demo.spec.ts, tests/demo/modes.spec.ts, tests/offline/offline.spec.ts, tests/smoke/shell.spec.ts | T4, T5 | opus (integrator) |
| T7 | The contracts:<br>- `demo-script.md` replaced: the beat table, the narration draft below, video mode, start at the catch, the screenshot rules,<br>- `ui-contract.md`'s camera states final, with the Phase A mapping removed and the drawer and the process split added,<br>- `events.md`'s `beat.started` with `drawer`,<br>- every change logged for `decisions.md` in the report | docs/common/demo-script.md, docs/common/ui-contract.md, docs/common/events.md | T6 | sonnet (integrator) |

**The narration draft** for `demo-script.md` is one line per beat, for Gordon to rewrite in his own words:

| Beat | Line |
|---|---|
| `d01-vibe` | "I describe the gift in my own words, and Cindy turns them into keywords I can see and change." |
| `d02-surprise` | "Surprise me picks something I'd never have searched for, and it leans toward makers who've sold less this month." |
| `d03-piece` | "This fan took one maker 26 hours. Before I pay, I see $134.48 of my $180 goes to her." |
| `d04-support` | "I ask if she stitched it herself. Small agents answer, and you can watch each one work." |
| `d05-pay` | "I pay, add five dollars to the studio's apprentice fund, and my card becomes a token." |
| `d06-money` | "Now follow the money into the studio's bank account." |
| `d07-month` | "Cindy plays the studio's whole month and matches every payout." |
| `d08-catch` | "Here's the catch. The gallery paid $340 less than the contract says." |
| `d09-approve` | "Cindy drafts the follow-up and the payouts. Only the owner can approve them." |
| `d10-close` | "The month closes into a real Excel file." |
| `d11-maker` | "Each maker gets a statement in Chinese, with what's still owed." |
| `d12-receipt` | "And my receipt now shows the maker got paid." |
| `d13-proof` | "The matcher caught four of four planted errors, and here's how our search model scores against keyword search." |
| `d14-watch` | "Cindy watches the web for copies of the makers' work. The owner decides what to report." |
| `d15-listing` | "A maker writes notes in Chinese, and the agents turn them into a checked listing." |
| `d16-store` | "Every community gets its own storefront at its own link." |

## Acceptance

- Given G4v2 (`npm run build`, then `npm run test:demo` three times on the production build, `npm run test:offline`, and the verifier's screenshot review against the events table), then all three runs pass, and each takes under 130 seconds with page load.
- Given the run, when each beat is 300 ms from its end, then its screenshot shows its camera's frame, and its process panel when the beat sets one, with every On screen ID from contracts section 8 visible and unclipped.
- Given `d01-vibe`, then `search-chip-1` to `search-chip-6` read `soft`, `hopeful`, `garden`, `peony`, `gift for mom`, `under $200`, and `search-results` shows $180.00, $48.00 and $175.00.
- Given `d05-pay`, then `buyer-project-addon` shows $5.00 and `buyer-token` shows `tok_7Q2M9X4KD1PA`. Given `d03-piece`, then `buyer-split-maker-share` shows $134.48.
- Given `d07-month` to `d12-receipt`, then every v1 figure from `demo-script.md` v1 shows in its beat: the bundled payout, the $95.00 refund, the $340.00 short payment, the seals, the close, 本月收入 with $134.48, "Paid to the maker".
- Given `d13-proof` with no model report, then `search-proof` says "Not trained yet" and the run still passes. With a report, it shows the four systems' numbers from the report.
- Given `npm run test:offline`, then the run passes with no request beyond localhost.
- Given `/demo?video=1`, then:
  - the cold open shows the catch and v1's line for 5 seconds,
  - the tour plays from `d01-vibe` with no controls or beat label,
  - `demo-end-card` shows for 5 seconds after 104.0, with the search proof when it exists.
- Given `demo-start-at-catch`, then the player plays 55.0 to 104.0, shows "Rewind to the buyer", plays 0.0 to 38.999 and pauses there.
- Given `npm run check:data`, then `tests/data/demo-timeline.test.ts` passes, along with every v1 and G2b data test.
- Given a V2 feature that was cut, then its beat still plays with that slot's placeholder, and the demo test reports the beat as cut, as in v1.

## Out of scope

- New features, new event types beyond `beat.started.drawer`, and new test IDs. A gap goes under needs.
- Changes inside `src/features/`. A beat that looks wrong because of a feature goes back to its lead.
- Recording or hosting the video. Gordon records it himself.

## Contract additions needed

- `beat.started.drawer?: "support" | "ask" | "audit"`, and the rule that a beat may carry several `beat.started` events with the same `beatId`.
- The process split on the stage: the frame at 0.66 in the left two thirds, the `process.view` slot in the right third, with `process-view` on that panel. A manual `?process=` stays the centered overlay.
- `model.trained` at 80.8 in `d13-proof` when the report exists, so the model view has its card.
- The scripted IDs the tour uses: `qry_01`, `srp_01`, `thr_01`, `run_01` (the support run), `run_02` (the listing run), `wsc_01`, `ctb_01`.
- `demo.drawer` in the store, set from `beat.started` and cleared by the next one without a drawer.
