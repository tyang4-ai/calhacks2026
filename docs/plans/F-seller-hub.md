# F-seller-hub · Overview, new listings and the maker's side panel

Priority: P1 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/seller-hub/ · Made real by: B14, B12, B11

SCOPE: src/features/seller-hub/, tests/features/seller-hub-*

## Goal
The studio owner opens Sell and sees the month at a glance: sales so far, money still owed to the studio, approvals waiting, open flags and look-alikes found. Each tile opens its view. On Listings a maker's notes in Chinese turn into a finished bilingual listing as the agents work in front of you (Lister, Tagger, Checker, Indexer), each check shown. The owner reviews Cindy's proposal to publish it, and only the owner can approve. On a maker's page, the side panel lists her own pieces and works in progress.

## Read first
- `docs/v2/brief.md`: Sell (Overview, Listings), the swarm table, the principles
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: ListingDraft `lst_01`, Piece `facets` and `vibe`, AgentSpec, WorkInProgress, `apr_04`
  - section 3: `listing.requested`, `listing.drafted`, `listing.indexed`, `swarm.step`, the Requests table row for `listing.requested`
  - section 4: slots `studio.overview.main`, `studio.listings.main`, `maker.side`, the test IDs `seller-*`, the camera `sell-listings`
  - section 6: the roster (`lister`, `describer`, `tagger`, `checker`, `indexer`, and `kind: "code"`)
  - section 8: beat `d15-listing`
- `docs/common/design-system.md` and contracts section 7: `Panel`, `Chip`, `Badge` (Rule-based, Demo data), `ChatBubble`, `ScoreBar`, `Money`, `MakerMark`, `Tabs`
- `docs/common/glossary.md`: new listing, rule-based, agent swarm, keyword, sales, approval, flag, counterfeit watch, work in progress, milestone, demo data

## Interfaces
- **Reads events** through `useCindia()`:
  - for the overview: `record.arrived` and `flag.raised` (the `month` key), `approval.requested`, `approval.granted` and `approval.declined` (the `approvals` key), `counterfeit.flagged` (the `watch` key),
  - for listings: `listing.requested`, `listing.drafted` and `listing.indexed` (the `listings` key), `swarm.step` (the `swarm` key), `approval.requested` for `listing_publish` approvals,
  - for the side panel: `wip.milestone_reached` and `wip.milestone_paid` (the `wip` key),
  - `sources`.
- **Reads data** with `getById()`:
  - the orders and refunds that arrived (their `grossCents`, `amountCents`), the flags,
  - `std_gu` (`makerIds`), `lst_01` (`makerId`, `notes`, `lang`),
  - the AgentSpec of each step's `agentId` (`name`, `kind`),
  - the Approval (`kind`, `subjectIds`),
  - the maker's pieces (catalog entries with that `makerId`) and works in progress (WorkInProgress with that `makerId`).
- **Emits,** with `source: "user"` through `userEvent()`: `listing.requested` (`listingId: "lst_user_<n>"`, `makerId`, `notes`, `lang`) when the owner presses "Draft with Cindy". The timeline's own `listing.requested` for `lst_01` plays the tour.
- **Navigation:** tiles and the approve link move to another route through the kit `Link` or `navigate()` (contract addition 1), never a page reload.
- **Exports:** `src/features/seller-hub/index.ts` default-exports `{ id: "seller-hub", slots: { "studio.overview.main": SellerOverview, "studio.listings.main": ListingsView, "maker.side": MakerSide } }`.
- **Source keys on the badge:**
  - overview: `b10-derived`,
  - listings: `b14-swarm` and `b12-search`,
  - `maker.side` renders no keyed events, so it shows the kit's `Demo data` badge instead.
- **Test IDs:**
  - From the contracts: `seller-overview`, `seller-listing-notes`, `seller-listing-draft`, `seller-listing-check-<checkId>`, `seller-listing-approve`, `seller-maker-side`.
  - Internal to this feature: `seller-overview-tile-<tile>` for `sales`, `waiting`, `approvals`, `flags`, `hits`, then `seller-listing-maker` (the maker picker), `seller-listing-ask` ("Draft with Cindy"), `seller-listing-steps`, `seller-listing-step-<stepId>`, `seller-listing-indexed`, `seller-maker-pieces`, `seller-maker-wip`.
- **Labels from the glossary:** sales, approval, flag, counterfeit watch, new listing, keyword, rule-based, agent swarm, work in progress, milestone, demo data, proposed by Cindy.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): tile labels, the listing screen's buttons and states, the side panel's headings, English and Chinese side by side | src/features/seller-hub/strings.ts | none | lead |
| T1 | Spec helper: seek to a timeline event, open a Sell view or a maker page, seed events with `window.__cindia.emit` | tests/features/seller-hub-lib.ts | none | sonnet |
| T2 | Overview tiles and their figures | src/features/seller-hub/overviewFigures.ts, src/features/seller-hub/OverviewTiles.tsx, tests/features/seller-hub-overview.spec.ts | T0, T1 | sonnet |
| T3 | The listing composer: maker picker, notes, "Draft with Cindy" | src/features/seller-hub/ListingComposer.tsx, tests/features/seller-hub-compose.spec.ts | T0, T1 | sonnet |
| T4 | The run's steps as they stream | src/features/seller-hub/ListingSteps.tsx, tests/features/seller-hub-steps.spec.ts | T0, T1 | sonnet |
| T5 | The draft, its checks, the index line and the approve link | src/features/seller-hub/ListingDraftCard.tsx, tests/features/seller-hub-draft.spec.ts | T0, T1 | opus |
| T6 | The maker page's side panel | src/features/seller-hub/MakerSide.tsx, tests/features/seller-hub-maker.spec.ts | T0, T1 | sonnet |
| T7 | Assemble the views and fill the slots (lead) | src/features/seller-hub/SellerOverview.tsx, src/features/seller-hub/ListingsView.tsx, src/features/seller-hub/index.ts, tests/features/seller-hub-flow.spec.ts | T2 to T6 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 is small and runs next.
- T2 to T6 own disjoint files and run two at a time.

Which listing the screen follows: the newest `listing.requested` in the store. That's the tour's `lst_01`, or the owner's own `lst_user_<n>`.

**T1.** `seller-hub-lib.ts` exports:
- `seekToEvent(page, type, match, offsetMs)`, which reads `window.__cindia.player.getTimeline()`,
- `openSell(page, view)` and `openMaker(page, makerId)`, which wait for the slots to fill,
- `seed(page, events)`, which emits events through `window.__cindia.emit`, for the listing events before the tour carries them.

**T2.** `overviewFigures.ts` derives each tile from the store and the mock, with no wall clock:
- **Sales so far this month** (`sales`): the gross of the orders whose `record.arrived` has fired, less the refunds that have arrived. There's no "today" in a scripted month, so the tile says "so far this month".
- **Money waiting** (`waiting`): the sum of `deltaCents` over the open flags, the money owed to the studio that hasn't arrived ($340.00 after the catch).
- **Approvals waiting** (`approvals`): requested approvals still pending.
- **Open flags** (`flags`): the flags raised.
- **Look-alikes found** (`hits`): the `counterfeit.flagged` events.

`OverviewTiles` (`seller-overview`) lays the five out as kit stat tiles, with amounts through `Money`. Each tile is a kit `Link`:
- sales and flags to `/sell/month`,
- waiting to `/sell/month`, where the catch is,
- approvals to `/sell/approvals`,
- hits to `/sell/watch`.

**T3.** `ListingComposer` holds:
- a maker picker (`seller-listing-maker`) over `std_gu.makerIds`, starting at `lst_01.makerId`,
- the notes box (`seller-listing-notes`), prefilled with `lst_01.notes` in Chinese. When the store's newest `listing.requested` came from the timeline, the box shows that request's notes, as if typed.
- "Draft with Cindy" (`seller-listing-ask`), which emits `listing.requested` as above. It's disabled while that listing's run is still going (a request with no `listing.drafted` yet for its ID).

**T4.** `ListingSteps` (`seller-listing-steps`) lists the `swarm.step` events of the listing's run, in order. A listing run's `threadId` is its `listingId` (contract addition 2). Each step (`seller-listing-step-<stepId>`) is a kit `ChatBubble` with:
- the agent's `name` from the roster, and the `Rule-based` badge when its `kind` is `code`,
- the step's `summary` in the slot's language,
- `toolName` when set, and `ms`.

New steps slide in with the kit's UI motion on the player clock. Before any step: "Cindy is starting the team."

**T5.** `ListingDraftCard` (`seller-listing-draft`) renders the newest `listing.drafted` for the listing:
- the title in English and Chinese, the summary,
- the facets (object, materials, techniques, motifs, colors) and the vibe words (moods, occasions, who it's for) as kit `Chip`s,
- one row per check (`seller-listing-check-<checkId>`): its kind, passed (jade, with a check mark) or needs review (amber, with the note), never color alone.

When `listing.indexed` for the listing is in the store, `seller-listing-indexed` reads that it's indexed for search, with the `modelId`.

`seller-listing-approve` ("Review Cindy's proposal") is enabled once an `approval.requested` has arrived whose Approval has kind `listing_publish` and names the listing in `subjectIds`. It moves to `/sell/approvals?ref=<approvalId>` (contract addition 3). Before that it's disabled with "Waiting for Cindy's proposal". After a grant it reads approved, and after a decline it reads declined. The card always says only the owner can approve publishing.

**T6.** `MakerSide` (`seller-maker-side`) fills the right third of `/maker/<makerId>`, read-only, with a `Demo data` badge:
- the maker's pieces (`seller-maker-pieces`): illustration, title in the slot's language, price, one of a kind or not,
- the maker's works in progress (`seller-maker-wip`): title, the milestones in a kit `MilestoneTimeline` with each one's status from the `wip` store key, falling back to the mock's status.

A maker with neither shows a short empty line.

**T7.**
- `SellerOverview` puts the tiles in one kit `Panel` declaring `b10-derived`.
- `ListingsView` lays out the composer and the steps (left half) and the draft (right half) in one `Panel` declaring `b14-swarm` and `b12-search`. All of it fits the Sell frame at 1440 by 900.
- `index.ts` exports the module.
- `seller-hub-flow.spec.ts` plays the listing from the timeline's `listing.requested` for `lst_01` to its `listing.drafted` with event-anchored seeks (or seeded events before the tour carries them), and checks `d15-listing`'s IDs inside `frame-studio`.

## Acceptance
Every spec opens the route named, moves the timeline with `seekToEvent` or seeds events with `seed`, and checks by test ID only, at 1440 by 900.

1. **Given** `/sell/overview` 300 ms after the timeline's `flag.raised` for `flg_01`, **then**:
   - `seller-overview-tile-waiting` reads $340.00,
   - `seller-overview-tile-flags` reads 1,
   - `seller-overview-tile-sales` reads the gross of the orders arrived so far, less the refund once `rfd_001` has arrived.
   
   **When** the owner clicks `seller-overview-tile-waiting`, **then** the page is `/sell/month` and the store wasn't reset (the flag is still there).
2. **Given** the same page after the timeline's `approval.requested` for `apr_01` and `apr_02`, **then** `seller-overview-tile-approvals` reads 2, and after both grants it reads 0. **Given** a seeded `counterfeit.flagged`, **then** `seller-overview-tile-hits` reads 1.
3. **Given** `/sell/listings` before any listing event, **then** `seller-listing-notes` holds `lst_01`'s Chinese notes and `seller-listing-maker` shows that listing's maker.
4. **Given** the listing run for `lst_01` (the tour's events, or the same events seeded), 300 ms after its `listing.drafted`, **then**:
   - `seller-listing-steps` lists the lister, tagger, checker and indexer steps in order, with the indexer marked rule-based,
   - `seller-listing-draft` shows the title in both languages and the facet and vibe chips,
   - each `seller-listing-check-<checkId>` shows passed or needs review,
   - all inside `frame-studio`. These are `d15-listing`'s IDs.
5. **Given** that run and an `approval.requested` for `apr_04`, **when** the owner clicks `seller-listing-approve`, **then** the page is `/sell/approvals?ref=apr_04`. Before that request arrives, the button is disabled.
6. **When** the owner edits the notes and presses `seller-listing-ask`, **then** the store holds a `listing.requested` with `source: "user"` and a `lst_user_` ID, and within 3 seconds in real time `seller-listing-steps` shows the scripted run's first step for it.
7. **Given** `/maker/mkr_01`, **then** `seller-maker-pieces` lists `pc_01`, `pc_04`, `pc_09` and `pc_12` with their prices, and `seller-maker-side` shows the `Demo data` badge.
8. **Given** scripted mode, **then** the overview and listings panels show `simulated-badge`.
9. **Given** `demo-lang-toggle` switched to Chinese, **then** every label is Chinese and the amounts are unchanged.

## Out of scope
- Publishing a listing for real, editing a draft field by field, or photo upload. The Describer runs only when B14 gets an image.
- The approvals inbox itself (M-approvals), the storefront builder (F-storefront) and counterfeit watch (F-watch). The overview only links to them.
- Orders management, inventory and shipping.

## Contract additions needed
1. **Navigation for features:** `navigate(path)` in `src/core/` and a kit `Link` (prop `to`) that moves between routes without reloading the store. M-buyer lists the same addition.
2. **Listing runs:** a listing run's `swarm.step` events carry the `listingId` as `threadId`. A person's listing requests use `lst_user_<n>`. The scripted answer to a person's `listing.requested` whose notes equal `lst_01.notes` is `lst_01`'s run re-keyed to the request's `listingId`. Any other notes get the fallback sample draft.
3. **The listing run ends with a proposal:** after `listing.drafted`, the scripted run, the live B14 run and the tour's `d15-listing` carry `approval.requested` for the publish approval (`apr_04` for `lst_01`, at 98.5 in the tour). `apr_04`'s `subjectIds` is `["lst_01"]`. `/sell/approvals?ref=<approvalId>` selects it (M-approvals addition 1).
