# I2-tour · The 3-minute tour on `/demo`

Priority: P0 · Wave: V3 · Depends on: F-search, M-buyer, F-support, F-process, F-communities, M-approvals, F-seller-hub (P0, since `d15-listing` is in the spine), F-watch, F-storefront, M-maker-statement and M-desktop (C-11, B1-36), each green or cut · Area: `src/app/demo/`, the demo timeline, the demo tests · Owners: integrator (T2 to T8) and data-smith (T1) · Gate: G4v2, tag `demo-ok-v2`

SCOPE: src/app/, src/core/featureTypes.ts, src/core/events.ts, src/core/state.ts, src/core/validate.ts, src/core/validate.test.ts, src/core/reducers/small.ts, src/core/reducers.test.ts, docs/common/demo-script.md, docs/common/ui-contract.md, docs/common/events.md, tests/demo/, tests/offline/, tests/smoke/

That is the integrator's SCOPE. The data-smith's task T1 is a separate spawn with `SCOPE: src/mock/timelines/demo.ts, src/mock/timelines/month.ts, src/mock/index.ts, tests/data/`.

**Three spawns, one after the other (B1-26):**
1. The integrator for T2, so the contract the timeline is written against is on disk.
2. The data-smith for T1.
3. The integrator for T3 to T8.

From the first spawn until G4v2 passes, `test:demo` and `check:data` can be red, because the timeline and the stage change in steps. The orchestrator runs no other gate in that window, and G4v2 itself runs with no other agent active. I3-redesign (V4) starts only after G4v2, since its SCOPE overlaps this plan's.

## Goal

`/demo` plays the 3-minute tour, the same every time, with no network:
1. **The pitch, 0 to 60 s.** Three full-frame cards: what Cindia is, why, and the tech.
2. **The buyer minute, 60 to 120 s.** Vibe search, the piece and where the money goes, a question the swarm answers with a guard firing, pay, and a receipt that promises to show when Grace N. is paid.
3. **The seller minute, 120 to 180 s.** A maker's notes become a listing that our model embeds into the index. Then the money: the map, the month, the catch, approve and seal, close, Grace N.'s statement, and the buyer's receipt turning to "Paid to the maker".
4. **Chapter 2, 180 to 205 s, for questions.** Surprise me, the proofs, the copy watch and the storefront.

Gordon presents with `/demo?mode=present`, one beat at a time. The tests use `/demo`, which plays straight through, and the video uses `/demo?video=1`, which plays the spine in under 3 minutes. Every v1 finance figure stays exactly as it was. The process views open beside the page at the right moments, the reconcile and approvals views included (C-12), and the end card names the seats Cindia fills.

## Read first

- `docs/v2/fix-plan.md` section 1.2 (the 3-minute demo and its beat table), 1.1 (the names), 1.4 (why the tour stays scripted, and G5 for v2) and 1.9.
- `docs/v2/contracts.md` section 8 (the same beat table), section 4 (the `pitch` camera, `/demo?mode=present`, `?start=<beatId>`, the cameras' pages), section 10 (G4v2 and G5) and section 12 (A2's labels L1, L25, L28 to L30). After I2-core, the same names are in `docs/common/`.
- `docs/common/demo-script.md` (v1's beats with R0's names, video mode, start at the catch, the screenshot rules), `docs/common/events.md` (`beat.started`), `docs/common/data-model.md` (figures 1 to 16).
- The stage as I2-shell left it: `src/app/demo/`, `src/app/chrome/ProcessOverlay.tsx`, `src/app/surfaces/` (`ShopSurface`'s `legacy` page, `LegacyBox.tsx`), `src/app/routes.tsx`, `src/core/nav.ts` (the stage navigator).
- The demo tests: `tests/demo/beats.ts`, `harness.ts`, `demo.spec.ts`, `modes.spec.ts`, `tests/offline/offline.spec.ts`, and `tests/smoke/lib.ts` (`seekToEvent`, `isLocal`, `expectSlots`).
- The data-smith reads its v1 `src/mock/timelines/demo.ts` and `month.ts`, `tests/data/timelines.test.ts` and `figures.test.ts`, and S3-catalog's `src/mock/search.ts`, `swarm.ts`, `listings.ts`, `watch.ts`, `model.ts`, `projects.ts`, `splits.ts` and `database.ts`.

## Interfaces

- **Reads:**
  - `store.demo` (`beatId`, `camera`, `process`, `drawer`),
  - `store.buyer.openPieceId`, `store.search.latestQueryId`,
  - `store.sources`, `store.proof` and `store.model` for the end card,
  - `store.log`, for the newest `beat.started`,
  - the `demo` timeline, and `src/app/demo/pitch.ts`.
- **Emits:** nothing. The timeline carries every event.
- **`beat.started`** carries `process?` and `drawer?: "support" | "ask" | "audit"`. I2-core owns both fields and `demo.drawer` (B1-38), and T2 only checks them. A beat may carry several `beat.started` events with the same `beatId`: one at its start, and one at each camera, process or drawer change in its row. Beat boundaries are the first `beat.started` of each beat. Each one sets `demo.process` and `demo.drawer` to its own values, so a `beat.started` without them closes the view and the drawer.
- **Cameras:** once T3 lands, `CameraId` is the tour cameras only, `pitch` included. `LegacyCameraId`, `LEGACY_CAMERA_IDS`, `LEGACY_CAMERA_TO_TOUR`, `toTourCamera()` and `shop-legacy` leave `src/core/featureTypes.ts`. The `maker` camera shows `/maker/mkr_01` (Grace N., in English) and the `store` camera shows `/store/dine-weavers`.
- **The `pitch` camera** shows a full-frame card (`src/app/demo/PitchCard.tsx`), with no Shop or Sell frame. The card for `p01-what`, `p02-why` or `p03-how` carries `pitch-card-what`, `pitch-card-why` or `pitch-card-how`. Before the first beat, and after a reset, the stage shows the `pitch` camera with the first card.
- **Process beats on the stage:** when a beat sets `process`, the frame scales to 0.66 in the left two thirds, and a panel filling the right third holds the `process.view` slot with `SlotProps.processId`. The panel has no test ID of its own (B1-5, D1-4). F-process renders `process-view` and the view root `process-pane-<processId>` inside it (fix-plan 1.9). The frame and the panel both stay visible, so the beat's On screen IDs show in both. The split takes 600 ms on the player clock, like a camera move. A person's `?process=` stays I2-shell's centered overlay.
- **The drawer and the panel together** (`d04-support`): the drawer stays open inside the scaled frame, at the frame's right edge.
- **Navigation on `/demo`** is I2-shell's stage navigator (B1-18): `navigate()` does nothing, and `openDrawer()` or `setProcess()` sets a stage override that the next `beat.started` or a seek clears. The beat's own `drawer` and `process` are what the tour shows.
- **The search page on the stage** keeps I2-shell T4's rule when T3 rewrites `DemoStage.tsx`: on `/demo`, `shop.search.main` gets no `searchParams.q`, or only the latest query's own text (from `store.search.latestQueryId`) with its keywords, never any other text. F-search emits a `search.queried` only for a `q` that differs from the latest query's text, so it never emits one on the stage, in `d01-vibe` or in `d02-surprise`.
- **The tour is always scripted** (fix-plan 1.2). Its events come from `src/mock/timelines/demo.ts`, it never waits on a network, and it plays the same every time. In live mode, each v2 source with a keyed tour event (B11 to B15, with `b13-live` keyed only on d15's `data.synced`) answers it with `[]` at once, so the scripted event plays on time, and `ALLOWED_EMPTY_FALLBACKS` lists them (fix-plan 1.4). B16 keys no tour event. A v2 source shows live only for a person's own request, after the tour ("Try it yourself"). v1's finance sources keep v1's rule unchanged.

### The beats

The table from fix-plan 1.2. The spine is `p01-what` to `d12-receipt`, and chapter 2 is `d02-surprise`, `d13-proof`, `d14-watch` and `d16-store`. `durationMs` is 205000.

| Beat | Time (s) | Camera | Process |
|---|---|---|---|
| `p01-what` | 0 to 20 | `pitch` | |
| `p02-why` | 20 to 40 | `pitch` | |
| `p03-how` | 40 to 60 | `pitch` | |
| `d01-vibe` | 60 to 74 | `shop-home`, then `shop-search` at 63.5 | `search` from 66.5 |
| `d03-piece` | 74 to 86 | `shop-piece` | |
| `d04-support` | 86 to 104 | `shop-piece`, drawer `support` | `swarm` from 90 |
| `d05-pay` | 104 to 120 | `shop-piece` | `checkout` from 107 |
| `d15-listing` | 120 to 130 | `sell-listings` | `swarm` from 122, `data` from 127 |
| `d06-money` | 130 to 136 | `sell-map` | |
| `d07-month` | 136 to 146 | `sell-month` | `reconcile` from 142 (C-12) |
| `d08-catch` | 146 to 154 | `sell-catch` | |
| `d09-approve` | 154 to 161 | `sell-approvals` | `approvals` from 155 (C-12) |
| `d10-close` | 161 to 166 | `sell-close` | |
| `d11-maker` | 166 to 172 | `maker` | |
| `d12-receipt` | 172 to 180 | `shop-receipt` | |
| `d02-surprise` | 180 to 186 | `shop-search` | |
| `d13-proof` | 186 to 192 | `sell-proof` | `model` from 189 |
| `d14-watch` | 192 to 200 | `sell-watch` | |
| `d16-store` | 200 to 205 | `store` | |

### The events, at 1x

Times are seconds. The finance beats keep every v1 event, ID and payload, and move by the offsets shown. The tour's own IDs are `qry_01`, `srp_01`, `thr_01`, `run_01`, `run_02`, `lst_01`, `pc_55`, `wsc_01`, `ctb_01`, `fup_02`, `apr_03` and `apr_04` (contracts section 11).

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

- v1's concierge events (`d01-ask`) aren't in the tour. v1's `d02-story` `piece.opened` and `d03-split` `split.shown` move to 74.3 and 76.5, and `proof.scored` moves from 59.0 to 179.0.
- `run_01` and `run_02` keep their step order and their times from `src/mock/swarm.ts`. S3 times them to fit the 87.6 to 95.5 s and 121.0 to 126.0 s windows, so nothing is scaled.

### The modes

**Plain `/demo`** (the tests, and anyone who opens the link) auto-plays every beat back to back, the spine and chapter 2, with no pause at beat ends, and ends on the end card, which stays up (contracts section 4). It starts on Play, as v1 did.

**Presenter mode, `/demo?mode=present`** (Gordon at the table):
1. The stage seeks to the start of the first beat, or of the beat `?start=` names, and plays it.
2. Each beat pauses by itself 1 ms before the next beat's first `beat.started`, so its last frame stays up while Gordon talks. A frame that overshoots seeks back to that stop, as v1's start at the catch already did.
3. Paused at a beat's end, Space or the right arrow plays the next beat, and the left arrow replays the current one from its start. While a beat plays, the right arrow jumps to the next beat's start and plays it, and Space pauses or resumes, as the controls already do.
4. After `d12-receipt`, the end card shows and stays. The right arrow or Space hides it and plays `d02-surprise`. The left arrow hides it and replays `d12-receipt`.
5. Chapter 2 pauses the same way, and after `d16-store` the player stops at 205.0.
6. The keys do nothing while focus is in a text field (v1's `isTextInput()`), so a judge can type during "Try it yourself".

**`?start=<beatId>`** seeks to that beat's first event and plays from there, pausing at its end in presenter mode. An unknown beat ID is ignored. `?start=catch`, the `demo-start-at-catch` control and the `c` key all mean `?start=d08-catch` (contracts section 4), so v1's rewind card goes. Every time in these modes comes from the timeline's `beat.started` events, never from a constant.

**Video mode, `/demo?video=1`** (Gordon records it). It stays under 3 minutes, Figma's limit:
1. The cold open seeks to the last millisecond of `d08-catch` (153.999) without animation, so the flag, its evidence and the explanation are up on the `sell-catch` camera, and shows v1's line "The gallery paid $340 less than the contract says." for 5 seconds.
2. Then it resets and plays the spine from `p01-what`, with no controls or beat label.
3. Each pitch card holds for 10 seconds instead of 20. Ten seconds after a pitch beat's first `beat.started` on the player clock, the player seeks to the next beat's first `beat.started` and plays on. The pitch beats carry no other events, so the seek skips nothing.
4. The buyer and seller minutes, `d01-vibe` to `d12-receipt`, play at 1x.
5. At the end of `d12-receipt` (179.999) the player pauses, and the end card shows for 5 seconds. Chapter 2 isn't in the video.
6. That's about 2 minutes 40 seconds in all: 5 for the cold open, 30 for the three cards, 120 for the two minutes and 5 for the end card.
7. `mode=present` and `?start=` are ignored in video mode.

### The pitch cards

`src/app/demo/pitch.ts` holds the three cards' text, and `PitchCard.tsx` draws one card: a title and at most four short lines in large type, with A2's L1 in small type at its foot ("Demo. Every maker, community and story here is fictional. Nothing is for sale."), because the `pitch` camera has no top bar. I3-redesign's T6 can own the card's look later. Each card sits under a `[GORDON]` comment, so a search finds every placeholder. The text on screen carries no marker, so it reads well until Gordon writes his own (fix-plan section 5). The placeholders, from fix-plan 1.1 to 1.4:

| Card | Title | Lines |
|---|---|---|
| `what` (`p01-what`) | Cindia | A platform for underrepresented makers, starting with Native American makers. Buyers find a piece by describing a feeling. Cindia does the selling, the marketing and the books for the makers. Every sale is split to the maker who made it, and the buyer sees the maker get paid. |
| `why` (`p02-why`) | Why | Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. On a marketplace the shop gets one payout, and a co-op splits it by hand. Fakes sell as Native-made, and the real makers lose the sale. If we don't help them, who will? |
| `how` (`p03-how`) | How it works | A swarm of small agents, each with one job, on Claude Haiku and Sonnet. Our own embedding model, fine-tuned on queries Claude wrote, embeds every listing. SpacetimeDB holds every record, and Elastic's search index is built from it. A person approves anything that moves money. |

A comment beside the "Fakes" line names its source, the U.S. Attorney's case of Aug 5, 2026 in fix-plan 1.3.

### The end card (`demo-end-card`)

It shows after `d12-receipt` in presenter mode and in video mode:
- "Cindia" and the first line of the `what` card,
- the seats line (C-12), word for word as contracts section 4 gives it, kept as one constant in `EndCard.tsx` that D-sponsors copies into the README, the Devpost and `sponsors/hyphenate/`: "Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money.",
- the planted-error proof, "Caught 4 of 4 planted errors", from `proof.scored`,
- the search model's recall at 5 for each system from `proof.search_scored` when `store.model.scored` is set, with A2's L28 under it: "50 test queries over the same 54 fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark." With no report, "Search model: not trained yet",
- what's live and what's simulated, from `store.sources`, with a name for every source key (v1's ten, and `b11-embed` to `b16-bank-books`), "Checkout: demo only, no real charge" under Simulated, and L29 under both lists: "Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved.",
- at the foot, L30, "Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.", and the repo URL.

The labels are in English, as the video is. Their Chinese goes beside them in `src/app/strings.ts` for the language toggle. v1's title line goes.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T2 | Check, without changing, the contract code the timeline needs, which I2-core owns (B1-38): `beat.started.process` and `drawer`, `demo.process` and `demo.drawer`, `pitch` in `TourCameraId`, `data` in `ProcessId`, and `data.synced` with its reducer. Add a unit test where I2-core left one out. Anything missing goes under needs, for the orchestrator to send back to I2-core. Then write the tour into `docs/common/demo-script.md`: the beat table and the events table above, under `## Beats`, with v1's sheet kept as `## v1 beats` until T7. Add the several-per-beat rule to `events.md`'s `beat.started` if I2-core's merge left it out | src/core/events.ts, src/core/featureTypes.ts, src/core/state.ts, src/core/validate.ts, src/core/validate.test.ts, src/core/reducers/small.ts, src/core/reducers.test.ts, docs/common/demo-script.md, docs/common/events.md | the features above, green or cut | sonnet (integrator) |
| T1 | The data-smith: rewrite `src/mock/timelines/demo.ts` to the events table, building each event from S3's exports (`demoSearch`, `demoSurprise`, `splits`, `swarmRuns`, `listings`, `scriptedScan`, `counterfeitCandidates`, `report`, `demoContribution`, `demoFundMoves`, `demoDataSync`, and `allApprovals` and `allFollowUps` for `apr_03`, `apr_04` and `fup_02`) and v1's records, as the v1 file already does. The tour's `search.queried` takes `demoSearch`'s query and adds `queryId` `qry_01` (D1-49). `MONTH_SHIFT_MS` becomes 136200, `BEATS` lists the tour's beats, and `DEMO_QUERY` keeps its name with figure 11's text. `month.ts` keeps its own times. Write `tests/data/demo-timeline.test.ts`, and move the demo halves of `timelines.test.ts` and `figures.test.ts` to the tour (below) | src/mock/timelines/demo.ts, src/mock/timelines/month.ts, src/mock/index.ts, tests/data/demo-timeline.test.ts, tests/data/timelines.test.ts, tests/data/figures.test.ts | T2 | opus (data-smith) |
| T3 | The stage: a camera for every tour camera, `pitch` with `PitchCard.tsx` and `pitch.ts`, the drawer and the process per beat through the surfaces' props, the split layout, I2-shell T4's `searchParams` rule for `shop.search.main` kept as Interfaces states it, and a short title per beat in `BeatLabel.tsx`, numbered in tour order. Then remove the legacy cameras (`LegacyCameraId`, `LEGACY_CAMERA_IDS`, `LEGACY_CAMERA_TO_TOUR`, `toTourCamera()`, `shop-legacy`), the Phase A legacy boxes (`src/app/surfaces/LegacyBox.tsx` and the `legacy` prop on `SellSurface` and `MakerSurface`, B1-23), and `StudioView` wherever only `src/app/` still uses it, in favor of `SellView` | src/app/demo/DemoStage.tsx, src/app/demo/cameras.ts, src/app/demo/cameras.test.ts, src/app/demo/stage.module.css, src/app/demo/BeatLabel.tsx, src/app/demo/PitchCard.tsx, src/app/demo/pitch.ts, src/app/demo/useDemoTimeline.ts, src/app/chrome/ProcessOverlay.tsx, src/app/surfaces/LegacyBox.tsx, src/app/surfaces/SellSurface.tsx, src/app/surfaces/MakerSurface.tsx, src/app/surfaces/views.ts, src/core/featureTypes.ts, src/core/validate.ts | T1 | opus (integrator) |
| T4 | The modes: plain `/demo` ending on the end card, presenter mode, `?start=<beatId>` with `catch` as `d08-catch`, video mode with its cold open at 153.999 and its 10-second pitch cards, and the end card, with its strings in both languages | src/app/demo/presenter.ts, src/app/demo/startAt.ts, src/app/demo/startAtCatch.ts, src/app/demo/videoMode.ts, src/app/demo/ColdOpen.tsx, src/app/demo/EndCard.tsx, src/app/controls/DemoControls.tsx, src/app/controls/playback.ts, src/app/strings.ts | T3 | opus (integrator) |
| T5 | Remove `/shop/legacy` from `routes.tsx` and the `legacy` page from `ShopSurface` (D1-42), but only when F-search fills `shop.home.main` and M-buyer fills `shop.piece.main` and `shop.receipt.main`. Otherwise keep the page, and say why in the report. Before removing it, grep `tests/features/` for `/shop/legacy`. M-buyer's phone-flow specs may still visit it, since M-buyer's last task deletes them after G4v2 (contracts section 11, B1-25): list them in the report. Any other spec on it keeps the page and goes under needs | src/app/routes.tsx, src/app/surfaces/ShopSurface.tsx | T3 | sonnet (integrator) |
| T6 | The tests (below) | tests/demo/beats.ts, tests/demo/harness.ts, tests/demo/demo.spec.ts, tests/demo/modes.spec.ts, tests/offline/offline.spec.ts, tests/smoke/routes.spec.ts, tests/smoke/shell.spec.ts | T4, T5 | opus (integrator) |
| T7 | The contracts: `demo-script.md` final, with T2's tables, the checks at each screenshot, the narration draft below, the modes, the pitch cards, the end card and the screenshot rules, and v1's sheet removed. `ui-contract.md`'s camera states final, with the Phase A mapping, the legacy boxes and the legacy page removed. Every change listed for `decisions.md` in the report | docs/common/demo-script.md, docs/common/ui-contract.md, docs/common/events.md | T6 | sonnet (integrator) |
| T8 | Run every green feature's specs against the tour (`npm run test:feature -- <slug>` for each). Don't edit `tests/features/`. List each failing spec with its cause (a fixed-time seek, a removed route) and the plan whose lead fixes it, because the tour moves every beat and only event-anchored seeks survive it (D1-34) | none (report only) | T6 | sonnet (integrator) |

**T1's tests.** `tests/data/demo-timeline.test.ts` checks:
- every event passes `validateEvents()`, IDs are unique, `at` never goes backwards, nothing lands after 205000, and the tour holds fewer than 400 events, the `log` cap,
- every `beat.started` matches `demo-script.md`'s beat table: each beat's first one at its start with its first camera, then each camera, process and drawer change at its time,
- the tour's own events at the times in the events table,
- every v1 event with its v1 payload at its tour time: 4.2 to 74.3, 8.3 to 76.5, `d04-pay` +93.0, `d05-money` +115.0, the month and `d07-catch` and `d08-approve` +116.0, `d09-close` +118.0, `d10-statement` +119.0, the paid receipt +122.0 and `proof.scored` at 179.0. The payload changes are `pieceId` on `card.tokenized` and `compare` on `split.shown`,
- figures 11 to 14 and 16 at their times: figure 13's `project.funded`, `mv_0101` and `mv_0102` equal to `demoContribution` and `demoFundMoves`, figure 14's `counterfeit.flagged` equal to `cft_01` in `counterfeitCandidates` (its similarity read from there, never typed), and the tour's `split.shown` equal to `splits.pc_01`, figure 16's `compare` included,
- `model.trained`, `proof.search_scored` and `search.mapped` present exactly when `report` isn't null,
- `run_01` holds a `check` step and plays inside 87.6 to 95.5, and `run_02` plays inside 121.0 to 126.0, followed by `listing.drafted`, `listing.indexed`, `data.synced` and `apr_04`, in that order,
- every key equals its type's key in `events.md`, except `fup_02`'s `b15-watch`, which contracts section 11 sets.

It also moves the v1 checks to the tour (D1-8, B1-21):
- `timelines.test.ts`'s demo half: `durationMs` 205000. The beats come from `demo-script.md`'s `## Beats` table, with beat IDs starting `p` or `d` and the first camera in each Camera cell. The own-events list moves to the tour's times, the month to the 136200 shift, and the catch to 146.3, 146.8, 147.5 and 149.0. The money moves fire as `mv_0001` to `mv_0003`, `mv_0101`, `mv_0102`, then `mv_0004` to `mv_0006`. The buyer's beats lose the concierge, so the query check reads figure 11's `search.queried`. The `act_` order and the derived payloads keep their checks. The `events.md` half stays as S3 left it.
- `figures.test.ts`: figure 2 is checked on `curatedSet` (`pc_01`, `pc_07`, `pc_11` in order, each with its reason), which the scripted concierge answer reads, instead of on the tour. Figures 8 to 10 keep reading the tour's events.

T1's report gives the orchestrator the `decisions.md` entry: these checks move to the tour's times, and figure 2 to `curatedSet`, as a planned update from the review, not a weakening.

**T6's tests:**
- `tests/demo/beats.ts` lists the 19 beats in tour order. Each has its camera, process and drawer at its screenshot, its On screen IDs from contracts section 8 grouped by feature slug (the pitch cards under `stage`, which is never cut), its slots, and its figures from the table below.
- Figures that depend on the data come from the loaded timeline at run time, as d06's match rows already do: d01's chips from `qry_01`'s keywords, d04's check step from `run_01`, d15's check IDs from `listing.drafted`, d02's piece from `surprise.drawn`, and d14's text match from the `similarity` of `counterfeit.flagged` `cft_01`, which S3 T9 rewrites after training.
- `CAMERA_FRAMES`: each tour camera shows its one frame at scale 1, `sell-catch` at 1.35, and any frame under a process at 0.66 in the left two thirds. `pitch` shows no frame. `CAMERA_VIEW` gives each `sell-` camera its view.
- The process panel: at a screenshot under a process, the `process.view` slot that the stage's panel holds (outside every frame) fills the right third, and `process-pane-<processId>` shows in it, or `slot-process-view` when F-process is cut.
- Lookups stay I2-shell's, inside the shown frame (B1-35). `process-` IDs are looked up inside the panel, and the pitch cards on the stage.
- The recorder keeps the first `beat.started` of each beat. The player-clock check compares that event's own `at`, read from `store.log`, with the beat's start, so a late frame can't fail it. The real-time check keeps I2-shell's 250 ms tolerance for the cloud VM (B1-27).
- The end-of-run check stays I2-shell's: real time against `durationMs` plus 500 ms. `report.json` keeps `durationMs` and `endedAtWallMs`, which the gate reads (at most `durationMs` plus 15 seconds). The demo and offline tests set their timeout from the page's `player.durationMs()` plus 90 seconds, since the config's 150 seconds is shorter than the tour.
- `ALLOWED_EMPTY_FALLBACKS` gets an entry for each v2 source with a keyed tour event, marked `tourScripted: true`. Such a key passes when its adapter was healthy at the start and every fallback was an allowed "returned nothing". It doesn't have to go live during the tour, because its G5 proves live mode with a person's own request (fix-plan 1.4). v1's keys keep v1's rule. B12's entry covers B2-11's `search.answered`.

  | Key | Its keyed tour events |
  |---|---|
  | `b11-embed` | `search.mapped`, `model.trained`, `proof.search_scored` |
  | `b12-search` | `search.answered`, `surprise.drawn` |
  | `b13-live` | `data.synced` |
  | `b14-swarm` | `swarm.step`, `support.answered`, `listing.drafted`, `listing.indexed`, `question.forwarded`, `question.answered` |
  | `b15-watch` | `watch.scanned`, `counterfeit.flagged`, `followup.drafted` |

  All five entries carry `tourScripted: true`. d15's `data.synced` is the one tour event keyed `b13-live`, and the B13 adapter answers it with `[]` at once, so the scripted snapshot plays on time. `b16-bank-books` gets no entry, because B16 keys no tour event (`B16-bank-books.md`, contracts section 3). Its live twins of `flag.raised` and `money.moved` come through `start(emit)` after the scripted event is in the store, so the tour never waits on it.
- `REQUIRED_KEYS`: `b14-swarm` anthropic, `b15-watch` apify and `b16-bank-books` nessie. `REQUIRED_SERVICES`: `model` for `b11-embed` and `b12-search`, and `spacetime` for `b13-live`. `b15-watch` needs no service, since it doesn't wait on the model (B15-watch, C-6). I2-shell T6 wrote the first two keys and the three services (B2-11, D1-23, D2-7), and T6 adds `b16-bank-books`. T6 checks each row against its upgrade plan's Adapter section as it stands then.
- `cutFeatures()` reads `M-` rows too and maps each to its slugs (B1-24): M-buyer to `buyer`, M-approvals to `approvals`, M-maker-statement to `maker-statement`, and M-desktop to its nine folders. A cut migration's v1 version may still fill its slot, so its beats accept the slot filled or showing its placeholder, and the report lists the beat as cut.
- `modes.spec.ts`: presenter mode, `?start=<beatId>` and `?start=catch`, the end card at the end of plain `/demo`, video mode and reset, at 8x where the player clock allows. Every time comes from the timeline's `beat.started` events or `seekToEvent()`, never typed (D1-34). Reset leaves the clock at 0, the store empty and the `pitch` camera up.
- `offline.spec.ts`: the tour with every request beyond localhost blocked. It also fails on any `page.on("websocket")` whose URL `isLocal()` rejects, since `context.route` doesn't see WebSockets (D2-34).
- `tests/smoke/`: no `/shop/legacy` route or `shop-legacy` camera, and `/demo?mode=present` renders `pitch-card-what` with no console errors.

**Checks at each screenshot**, 300 ms before each beat ends. The On screen IDs are contracts section 8's, and these are the camera, process and figures on top of them:

| Beat | Camera, process | Figures and extra checks |
|---|---|---|
| `p01-what`, `p02-why`, `p03-how` | `pitch`, none | Its card fills the stage, every frame is hidden, and its text equals `pitch.ts` |
| `d01-vibe` | `shop-search`, `search` | Chip n reads keyword n of `qry_01` (figure 11, `gift for mom` and `under $200` among them). `search-result-pc_01` shows $180.00 |
| `d03-piece` | `shop-piece`, none | `buyer-story-card` shows Grace N. and 26 hours. `buyer-split-maker-share` shows $134.48, `buyer-split-bar` $22.00, $18.00 and $5.52, and `buyer-split-compare` the gallery share S3 computes for `pc_01` |
| `d04-support` | `shop-piece` with drawer `support`, `swarm` | `process-swarm-step-<stepId>` for `run_01`'s `check` step |
| `d05-pay` | `shop-piece`, `checkout` | `buyer-token` tok_7Q2M9X4KD1PA, `buyer-receipt-status` Received, `buyer-project-addon` $5.00, `buyer-receipt-promise` Grace N. `buyer-pay-button` may show earlier in the beat only (v1's rule) |
| `d15-listing` | `sell-listings`, `data` | `seller-listing-check-<checkId>` for each check in the tour's `listing.drafted` |
| `d06-money` | `sell-map`, none | $180.00, $5.52 and $156.48 on `money-map-canvas`, and the balance from the store's `account.synced` |
| `d07-month` | `sell-month`, `reconcile` | v1's rule: the bundled, refund-netted and carried-over match rows in frame |
| `d08-catch` | `sell-catch`, none | $340.00 and $2,040.00 on `reconcile-flag`, 40%, 50%, $1,700.00 and Sep 30 on the evidence |
| `d09-approve` | `sell-approvals`, `approvals` | $340.00 on `approvals-item-apr_01` and `approvals-item-apr_02` |
| `d10-close` | `sell-close`, none | `cindia-close-2026-09.xlsx`, $340.00 on `close-totals`, Estimate on `impact-hours-saved` |
| `d11-maker` | `maker`, none | `maker-statement-total` This month's income, `maker-statement-lines` $134.48, `maker-statement-held` $95.00 |
| `d12-receipt` | `shop-receipt`, none | `buyer-receipt-status` Paid to the maker, `buyer-receipt` $134.48 and Oct 2, 2026, `buyer-receipt-maker-note` Grace N. |
| `d02-surprise` | `shop-search`, none | `search-surprise-result` shows figure 12's piece |
| `d13-proof` | `sell-proof`, `model` | `proof-score` 4 of 4. `search-proof` reads "Not trained yet", or the four systems from the report |
| `d14-watch` | `sell-watch`, none | `watch-similarity-cft_01` reads "Text match" and the similarity of the timeline's `counterfeit.flagged` `cft_01` to two places (0.91 until S3 T9 replaces it), never a typed number |
| `d16-store` | `store`, none | `store-page` on `/store/dine-weavers` |

**The narration draft** for `demo-script.md` is one line per beat, in tour order, for Gordon to rewrite in his own words:

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
| `d09-approve` | "Cindy drafts the follow-up and the payouts. Only the owner can approve them." |
| `d10-close` | "The month closes into a real Excel file." |
| `d11-maker` | "Because the gallery paid short, $95 of Grace N.'s pay is held, and her statement tells her why." |
| `d12-receipt` | "And my receipt now shows Grace N. got paid, with a note from her." |
| `d02-surprise` | "Surprise me leans toward makers who sold less this month, and the rule is right on the screen." |
| `d13-proof` | "The matcher caught four of four planted errors. Here's our search model against keyword search on 50 held-out queries. A small test, not a benchmark." |
| `d14-watch` | "Cindy looks for listings that use the co-op's name or copy its words. The owner decides, and nothing is sent." |
| `d16-store` | "And each co-op has its own storefront at its own link." |

The `d14-watch` line is A2's L25. The `d01-vibe` line is a pitch claim fix-plan 1.5 keeps, with the Finder writing the chips in live mode as "if time".

## Acceptance

- Given G4v2 (`npm run build`, then `npm run test:demo` three times on the production build, `npm run test:offline`, and the verifier's screenshot review against the checks above), run with no other agent active, then all three runs and the offline run pass, and each tour run's `report.json` has `endedAtWallMs` within `durationMs` (205000) plus 15 seconds.
- Given the run, when each beat is 300 ms from its end, then its screenshot shows its camera's frame (none for `pitch`), and its process panel in the right third when the beat sets one, with every On screen ID from contracts section 8 visible and unclipped in the shown frame or the panel.
- Given `p01-what` to `p03-how`, then `pitch-card-what`, `pitch-card-why` and `pitch-card-how` fill the stage in turn, each with L1, and no Shop or Sell frame shows.
- Given `d01-vibe`, then `search-chip-1` to `search-chip-6` read figure 11's keywords in order, `gift for mom` and `under $200` among them, and `search-result-pc_01` shows $180.00. With a model report, `search-engine` names the model from `model.trained` (A1-2, A1-4). With none, it names the keyword engine, and the run still passes.
- Given `d03-piece`, then `buyer-split-maker-share` shows $134.48 and `buyer-split-compare` shows the gallery share. Given `d05-pay`, then `buyer-project-addon` shows $5.00, `buyer-token` shows `tok_7Q2M9X4KD1PA` and `buyer-receipt-promise` names Grace N.
- Given `d04-support`, then the swarm view shows `run_01`'s `check` step beside the open drawer (A1-7).
- Given `d15-listing`, then `seller-listing-indexed` and `process-data-tables` show, with the data view's rows from `data.synced`, and `apr_04` is in the store (D1-13).
- Given `d07-month` and `d09-approve`, then the reconcile and approvals views are open beside the frame at their screenshots (C-12).
- Given `d06-money` to `d12-receipt`, then every v1 figure shows in its beat: the money map's $180.00, $5.52 and $156.48 and the balance, the bundled payout, the $95.00 refund, the $340.00 short payment with 40%, 50% and $1,700.00, the seals, the close and its workbook, "This month's income" with $134.48 and $95.00 held, and "Paid to the maker" with Oct 2, 2026 and Grace N.'s note.
- Given `d13-proof` with no model report, then `search-proof` says "Not trained yet" and the run still passes. With a report, it shows the four systems' numbers from the report.
- Given `d14-watch`, then `watch-item-cft_01` shows, `watch-similarity-cft_01` reads "Text match" and the similarity of the timeline's `counterfeit.flagged` `cft_01` to two places (0.91 until S3 T9 replaces it, and never typed in the test), and the store holds `fup_02` keyed `b15-watch` and `apr_03`.
- Given the stage on `shop-search` in `d01-vibe` and `d02-surprise`, then `shop.search.main`'s `data-slot-props` hold no `q`, or `qry_01`'s own text, and the store gains no `search.queried` with `source: "user"`.
- Given `npm run test:offline`, then the run passes with no request and no WebSocket beyond localhost.
- Given `/demo` played to the end, then `demo-end-card` shows after `d16-store` and stays.
- Given `/demo?mode=present`, then:
  - the stage plays `p01-what` and pauses by itself 1 ms before `p02-why` starts, with `pitch-card-what` up,
  - Space or the right arrow plays the next beat, which pauses the same way,
  - the left arrow replays the current beat from its start,
  - after `d12-receipt`, `demo-end-card` shows and stays, and the right arrow continues into `d02-surprise`,
  - after `d16-store`, the player stops at 205.0.
- Given `/demo?start=d14-watch`, then the tour starts at `d14-watch`'s first event on `sell-watch` and plays to the end. With `mode=present` it pauses at `d14-watch`'s end. Given an unknown beat ID, then `/demo` behaves as it does without one.
- Given `demo-start-at-catch` or `/demo?start=catch`, then the tour starts at `d08-catch`, as `?start=d08-catch` does.
- Given `/demo?video=1`, then:
  - the cold open shows `d08-catch` and v1's line for 5 seconds,
  - the tour plays `p01-what` to `d12-receipt` with no controls or beat label,
  - each pitch card shows for 10 seconds on the player clock, then the player seeks to the next beat's first `beat.started`,
  - the buyer and seller minutes play at 1x, and the whole video runs under 3 minutes, about 2 minutes 40 seconds,
  - `demo-end-card` shows for 5 seconds after `d12-receipt`, with the seats line, the proof, the live and simulated sources with L29, L28 beside the search scores when they exist, L30 and the repo URL.
- Given live mode in a G5, then each v2 source's tour events play scripted through allowed fallbacks, with no throw and no timeout, and each v1 source meets v1's rule.
- Given `npm run check:data`, then `tests/data/demo-timeline.test.ts` passes, along with `timelines.test.ts` and `figures.test.ts` on the tour and every other v1 and G2b data test.
- Given a V2 feature or migration that was cut, then its beat still plays with that slot's placeholder, or a cut migration's v1 version, and the demo test reports the beat as cut, as in v1.
- Given T8's report, then every feature spec passes against the tour, or is listed with its cause and the plan that fixes it.

## Out of scope

- New features, and event types or test IDs beyond what contracts sections 3, 4 and 8 give. A gap goes under needs.
- Changes inside `src/features/` and `tests/features/`. A beat that looks wrong because of a feature goes back to its lead.
- Live runs inside the tour (fix-plan 1.9). Live mode answers people's own requests only.
- `d17-ask-maker` (C-13), unless F-support and F-seller-hub both ship the ask-the-maker run. Then T2 adds its row to chapter 2 after `d16-store`, T1 its events (`run_07`, then `ans_01`'s `question.answered`, then `run_09`), and `durationMs` grows by its length. Otherwise it stays a question Gordon clicks during Q&A, and nothing here changes.
- Gordon's own words for the cards and the narration, recording the video, and hosting it.

## Contract names this plan uses

- The beat table and `durationMs` 205000: contracts section 8 (fix-plan 1.2).
- The `pitch` camera, `/demo?mode=present`, `?start=<beatId>`, `?start=catch`, and the cameras' pages (`/maker/mkr_01`, `/store/dine-weavers`): contracts section 4.
- `pitch-card-what`, `pitch-card-why` and `pitch-card-how`, drawn by the stage: contracts section 8's On screen column, and section 4's test IDs.
- The end card's contents and its seats line: contracts section 4.
- `b16-bank-books` and its keyed events: contracts sections 3 and 5.
- `beat.started.process` and `drawer`, `demo.process` and `demo.drawer`, and the several-per-beat rule: owned by I2-core (section 11, B1-38). T2 only checks them.
- `data` in `ProcessId`, `process-pane-<processId>` and `process-data-tables`: contracts sections 3 and 4, and fix-plan 1.9.
- `data.synced`, keyed `b13-live`, with its scripted payload `demoDataSync` in `src/mock/database.ts`, and its `tourScripted` entry in `ALLOWED_EMPTY_FALLBACKS`: contracts sections 3 and 11.
- `pieceId` on `card.tokenized`: contracts section 3 (B1-34).
- The tour's IDs and `fup_02` keyed `b15-watch`: contracts section 11.
- `demoContribution` and `demoFundMoves`: S3's exports (D1-38).
- A2's labels L1, L25, L28, L29 and L30: contracts section 12.
- `buyer-split-compare`, `buyer-receipt-promise`, `buyer-receipt-maker-note`, `search-surprise-rule` and `seller-listing-indexed`: contracts section 4, rendered by M-buyer, F-search and F-seller-hub.
