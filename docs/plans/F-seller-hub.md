# F-seller-hub · Overview, new listings and the maker's side panel

Priority: P1 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/seller-hub/ · Made real by: B14, B12, B11

SCOPE: src/features/seller-hub/, tests/features/seller-hub-*

## Goal
The co-op's owner opens Sell and sees the month at a glance: sales so far, money still owed to the co-op, approvals waiting, open flags and possible copies found. Each tile opens its view. On Listings a maker's own notes turn into a finished listing in English and Chinese as the agents work in front of you (Lister, Tagger, Checker, Indexer), each check shown, and the platform's own embedding model indexes it for search the moment it's drafted. The owner reviews Cindy's proposal to publish it, and only the owner can approve. On a maker's page, the side panel lists her own pieces and works in progress, and any question a buyer asked about her work. She answers in her own words, and her answer goes back to the buyer.

## Read first
- `docs/v2/brief.md`: Sell (Overview, Listings), the swarm table, the principles
- `docs/v2/fix-plan.md`: section 1.1 (the names), section 1.4 (pillar 2, the Indexer), section 1.2 (`d15-listing`, the "ask the maker" run)
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: ListingDraft `lst_01`, Piece `facets` and `vibe`, AgentSpec, WorkInProgress, `apr_04`
  - section 3: `listing.requested`, `listing.drafted`, `listing.indexed`, `swarm.step`, `question.forwarded`, `question.answered`, the Requests table row for `listing.requested`
  - section 4: slots `studio.overview.main`, `studio.listings.main`, `maker.side`, the test IDs `seller-*`, the camera `sell-listings`
  - section 6: the roster (`lister`, `describer`, `tagger`, `checker`, `indexer`, and `kind: "code"`)
  - section 8: beat `d15-listing`
  - section 11: listing runs matched by notes and re-keyed, the inline `approval` object, the ID scheme
  - section 12: label L27
- `docs/common/design-system.md` and contracts section 7: `Panel`, `StatTile`, `Chip`, `Badge` (Rule-based, Demo data), `ChatBubble`, `ScoreBar`, `Money`, `MakerMark`, `Tabs`, `Link`
- `docs/common/glossary.md`: new listing, rule-based, agent swarm, keyword, sales, approval, flag, counterfeit watch, work in progress, milestone, demo data

## Interfaces
- **Reads events** through `useCindia()`:
  - for the overview: `record.arrived` and `flag.raised` (the `month` key), `approval.requested`, `approval.granted` and `approval.declined` (the `approvals` key), `counterfeit.flagged` (the `watch` key),
  - for listings: `listing.requested`, `listing.drafted` and `listing.indexed` (the `listings` key), `swarm.step` (the `swarm` key), `approval.requested` for `listing_publish` approvals,
  - for the side panel: `wip.milestone_reached` and `wip.milestone_paid` (the `wip` key), and `question.forwarded` and `question.answered` for this maker, from `support.questions` (each `{ forwarded, answered }` by `questionId`, I2-core T3),
  - `sources`.
- **Reads data** with `getById()`:
  - the orders and refunds that arrived (their `grossCents`, `amountCents`), the flags,
  - `std_dine` (`makerIds`), `lst_01` (`makerId`, `notes`, `lang`),
  - the Approval (`kind`, `subjectIds`). When `getById()` finds none (a live or re-keyed `apr_user_<n>`), `approvals.items[approvalId].approval`, the inline object the store kept from its `approval.requested` (D1-16),
  - the maker's pieces (catalog entries with that `makerId`) and works in progress (WorkInProgress with that `makerId`).
  
  Agent names and kinds come from `getAgent(agentId)` in `src/mock/agents.ts`, because agent IDs have no prefix for `getById()`.
- **Emits,** with `source: "user"` through `userEvent()`:
  - `listing.requested` (`listingId: "lst_user_<n>"`, `makerId`, `notes`, `lang`) when the owner presses "Draft with Cindy". The timeline's own `listing.requested` for `lst_01` plays the tour.
  - `question.answered` (`by` the maker, her own text and `lang`, naming the forwarded question) when the maker presses Send on her page.
- **Which listing run answers a person:** the scripted responder matches a person's `listing.requested` by its normalized notes, never by `listingId` (B1-11). Notes equal to `lst_01.notes` get `run_02`, re-keyed to the person's `lst_user_<n>` and its run, step and check IDs, and ending in an inline `apr_user_<n>` publish approval whose subject is the person's listing, never `apr_04`. Any other notes get the fallback sample draft. This feature only follows the IDs that arrive.
- **Navigation:** tiles and the approve link move to another route through the kit `Link` or `navigate()` from `src/core/nav.ts`, never a page reload.
- **Exports:** `src/features/seller-hub/index.ts` default-exports `{ id: "seller-hub", slots: { "studio.overview.main": SellerOverview, "studio.listings.main": ListingsView, "maker.side": MakerSide } }`.
- **Source keys on the badge:**
  - overview: `b10-derived`,
  - listings: `b14-swarm` and `b12-search`,
  - `maker.side`: the pieces and works in progress render no keyed events, so that panel shows the kit's `Demo data` badge. The questions panel declares the key `question.forwarded` carries, so it shows `simulated-badge` in scripted mode.
- **Test IDs:**
  - From the contracts: `seller-overview`, `seller-listing-notes`, `seller-listing-draft`, `seller-listing-check-<checkId>`, `seller-listing-indexed`, `seller-listing-approve`, `seller-maker-side`.
  - Internal to this feature: `seller-overview-tile-<tile>` for `sales`, `waiting`, `approvals`, `flags`, `hits`, then `seller-listing-maker` (the maker picker), `seller-listing-ask` ("Draft with Cindy"), `seller-listing-steps`, `seller-listing-step-<stepId>`, `seller-listing-translated-<lang>` (L27), `seller-maker-pieces`, `seller-maker-wip`, `seller-maker-questions`, `seller-maker-question-<questionId>`, `seller-maker-reply-<questionId>`, `seller-maker-send-<questionId>`, `seller-maker-answer-<questionId>`.
- **Labels from the glossary:** sales, approval, flag, counterfeit watch, new listing, keyword, rule-based, agent swarm, work in progress, milestone, demo data, proposed by Cindy. From contracts section 12: L27.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): tile labels, the listing screen's buttons and states, the index line, the side panel's headings, the questions panel's lines, English and Chinese side by side, with L27 as contracts section 12 words it | src/features/seller-hub/strings.ts | none | lead |
| T1 | Spec helper: re-export `seekToEvent` from `tests/smoke/lib.ts`, open a Sell view or a maker page, seed events with `window.__cindia.emit` | tests/features/seller-hub-lib.ts | none | sonnet |
| T2 | Overview tiles and their figures | src/features/seller-hub/overviewFigures.ts, src/features/seller-hub/OverviewTiles.tsx, tests/features/seller-hub-overview.spec.ts | T0, T1 | sonnet |
| T3 | The listing composer: maker picker, notes, "Draft with Cindy" | src/features/seller-hub/ListingComposer.tsx, tests/features/seller-hub-compose.spec.ts | T0, T1 | sonnet |
| T4 | The run's steps as they stream | src/features/seller-hub/ListingSteps.tsx, tests/features/seller-hub-steps.spec.ts | T0, T1 | sonnet |
| T5 | The draft, its checks, the index line and the approve link | src/features/seller-hub/ListingDraftCard.tsx, tests/features/seller-hub-draft.spec.ts | T0, T1 | opus |
| T6 | The maker page's side panel: pieces, works in progress, and questions from buyers with her reply | src/features/seller-hub/MakerSide.tsx, src/features/seller-hub/MakerQuestions.tsx, tests/features/seller-hub-maker.spec.ts, tests/features/seller-hub-questions.spec.ts | T0, T1 | sonnet |
| T7 | Assemble the views and fill the slots (lead) | src/features/seller-hub/SellerOverview.tsx, src/features/seller-hub/ListingsView.tsx, src/features/seller-hub/index.ts, tests/features/seller-hub-flow.spec.ts | T2 to T6 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 is small and runs next.
- T2 to T6 own disjoint files and run two at a time.

Which listing the screen follows: the newest `listing.requested` in the store. That's the tour's `lst_01`, or the owner's own `lst_user_<n>`.

**T1.** `seller-hub-lib.ts` exports:
- `seekToEvent(page, type, match, offsetMs)`, re-exported from `tests/smoke/lib.ts`, never copied,
- `openSell(page, view)` and `openMaker(page, makerId)`, which wait for the slots to fill,
- `seed(page, events)`, which emits events through `window.__cindia.emit`, for the listing and question events before the tour carries them.

**T2.** `overviewFigures.ts` derives each tile from the store and the mock, with no wall clock:
- **Sales so far this month** (`sales`): the gross of the orders whose `record.arrived` has fired, less the refunds that have arrived. There's no "today" in a scripted month, so the tile says "so far this month".
- **Money waiting** (`waiting`): the sum of `deltaCents` over the open flags, the money owed to the co-op that hasn't arrived ($340.00 after the catch).
- **Approvals waiting** (`approvals`): requested approvals still pending, inline ones included.
- **Open flags** (`flags`): the flags raised.
- **Possible copies found** (`hits`): the `counterfeit.flagged` events.

`OverviewTiles` (`seller-overview`) lays the five out as the kit's `StatTile`s (I2-kit), with amounts through `Money`. Each `StatTile` sits inside a kit `Link`, which opens its view:
- sales and flags to `/sell/month`,
- waiting to `/sell/month`, where the catch is,
- approvals to `/sell/approvals`,
- hits to `/sell/watch`.

**T3.** `ListingComposer` holds:
- a maker picker (`seller-listing-maker`) over `std_dine.makerIds`, starting at `lst_01.makerId`,
- the notes box (`seller-listing-notes`), prefilled with `lst_01.notes` in `lst_01.lang`. When the store's newest `listing.requested` came from the timeline, the box shows that request's notes, as if typed.
- "Draft with Cindy" (`seller-listing-ask`), which emits `listing.requested` as above. It's disabled while that listing's run is still going (a request with no `listing.drafted` yet for its ID).

**T4.** `ListingSteps` (`seller-listing-steps`) lists the `swarm.step` events of the listing's run, in order. A listing run's `threadId` is its `listingId`. Each step (`seller-listing-step-<stepId>`) is a kit `ChatBubble` with:
- the agent's `name` from the roster, and the `Rule-based` badge when its `kind` is `code`,
- the step's `summary` in the slot's language,
- `toolName` when set, and `ms`.

New steps slide in with the kit's UI motion on the player clock. Before any step: "Cindy is starting the team."

**T5.** `ListingDraftCard` (`seller-listing-draft`) renders the newest `listing.drafted` for the listing:
- the title and summary in English and Chinese. The version in the language the notes weren't written in (not the request's `lang`) carries `seller-listing-translated-<lang>` with L27: "Translated by the Lister agent. The maker hasn't checked this version."
- the facets (object, materials, techniques, motifs, colors) and the vibe words (moods, occasions, who it's for) as kit `Chip`s,
- one row per check (`seller-listing-check-<checkId>`): its kind, passed (jade, with a check mark) or needs review (amber, with the payload's note), never color alone. In the tour, the facts check catches a claim the notes don't make (A1-14), labeled a planted test as the data writes it. A protocol check that fails because a draft names another community's craft shows the Checker's note (L26) as the payload carries it.

`seller-listing-indexed` shows once a `listing.indexed` for the listing is in the store, in scripted mode too, since `run_02` ends with one (D1-31). It reads that the platform's own model indexed it for search as a draft (`cindia-drafts`), with the payload's `modelId` and the passage it embedded (`embedText`), and that it moves into the live index when the owner approves.

`seller-listing-approve` ("Review Cindy's proposal") is enabled once an `approval.requested` has arrived whose Approval (from `getById()`, or `approvals.items[approvalId].approval` when that misses) has kind `listing_publish` and names the listing in `subjectIds`. That's `apr_04` for `lst_01`, and an `apr_user_<n>` for a person's listing. It moves to `/sell/approvals?ref=<approvalId>`. Before that it's disabled with "Waiting for Cindy's proposal". After a grant it reads approved, and after a decline it reads declined. The card always says only the owner can approve publishing.

**T6.** `MakerSide` (`seller-maker-side`) fills the right third of `/maker/<makerId>`:
- the maker's pieces (`seller-maker-pieces`), read-only with a `Demo data` badge: illustration, title in the slot's language, price, one of a kind or not,
- the maker's works in progress (`seller-maker-wip`): title, the milestones in a kit `MilestoneTimeline` with each one's status from the `wip` store key, falling back to the mock's status,
- `MakerQuestions` (`seller-maker-questions`), the maker's side of "ask the maker" (C-13). Each `question.forwarded` for this maker shows as `seller-maker-question-<questionId>`, newest first: the buyer's words as they asked them, the piece it's about, and "Cindy forwarded this because the records don't answer it. Your answer goes back to the buyer in your own words." Under it, a reply box (`seller-maker-reply-<questionId>`, empty, never prefilled) and Send (`seller-maker-send-<questionId>`), which emits `question.answered`. Once a `question.answered` for that question is in the store (hers, or the scripted one in the tour), `seller-maker-answer-<questionId>` shows it as sent and the box goes. Nothing on this panel writes words for her.

A maker with no pieces, works or questions shows a short empty line for each.

**T7.**
- `SellerOverview` puts the tiles in one kit `Panel` declaring `b10-derived`.
- `ListingsView` lays out the composer and the steps (left half) and the draft (right half) in one `Panel` declaring `b14-swarm` and `b12-search`. All of it fits the Sell frame at 1440 by 900.
- `index.ts` exports the module.
- `seller-hub-flow.spec.ts` plays the listing from the timeline's `listing.requested` for `lst_01` to its `listing.indexed` and `approval.requested` for `apr_04` with event-anchored seeks (or seeded events before the tour carries them), and checks `d15-listing`'s IDs inside `frame-studio`.

## Acceptance
Every spec opens the route named, moves the timeline with `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` or seeds events with `seed`, never a fixed time, and checks by test ID only, at 1440 by 900. Arrival is asserted with Playwright's default expect timeout, never a wall-clock window (B1-27).

1. **Given** `/sell/overview` 300 ms after the timeline's `flag.raised` for `flg_01`, **then**:
   - `seller-overview-tile-waiting` reads $340.00,
   - `seller-overview-tile-flags` reads 1,
   - `seller-overview-tile-sales` reads the gross of the orders arrived so far, less the refund once `rfd_001` has arrived.
   
   **When** the owner clicks `seller-overview-tile-waiting`, **then** the page is `/sell/month` and the store wasn't reset (the flag is still there).
2. **Given** the same page after the timeline's `approval.requested` for `apr_01` and `apr_02`, **then** `seller-overview-tile-approvals` reads 2, and after both grants it reads 0. **Given** a seeded `counterfeit.flagged`, **then** `seller-overview-tile-hits` reads 1.
3. **Given** `/sell/listings` before any listing event, **then** `seller-listing-notes` holds `lst_01`'s notes and `seller-listing-maker` shows that listing's maker.
4. **Given** the listing run for `lst_01` (the tour's events, or the same events seeded), 300 ms after its `listing.drafted`, **then**:
   - `seller-listing-steps` lists the lister, tagger, checker and indexer steps in order, with the indexer marked rule-based,
   - `seller-listing-draft` shows the title in both languages, the facet and vibe chips, and `seller-listing-translated-<lang>` beside the version not in `lst_01.lang` only,
   - each `seller-listing-check-<checkId>` shows passed or needs review,
   - all inside `frame-studio`. These are `d15-listing`'s IDs.
5. **Given** the same run 300 ms after its `listing.indexed`, in scripted mode, **then** `seller-listing-indexed` shows the payload's `modelId` and names `cindia-drafts`, inside `frame-studio`.
6. **Given** that run and an `approval.requested` for `apr_04`, **when** the owner clicks `seller-listing-approve`, **then** the page is `/sell/approvals?ref=apr_04`. Before that request arrives, the button is disabled.
7. **When** the owner presses `seller-listing-ask` with `lst_01`'s notes unchanged, **then** the store holds a `listing.requested` with `source: "user"` and a `lst_user_` ID, `seller-listing-steps` shows the scripted run's steps under that listing's ID, and `seller-listing-approve` enables on an `apr_user_` approval that names the person's listing, never on `apr_04`. **When** the notes are edited first, **then** the steps belong to the fallback sample run.
8. **Given** `/maker/mkr_01`, **then** `seller-maker-pieces` lists `pc_01`, `pc_04`, `pc_09` and `pc_12` with their prices, and `seller-maker-side` shows the `Demo data` badge.
9. **Given** `/maker/mkr_01` and a seeded `question.forwarded` for `mkr_01` about `pc_01` (from the scripted "ask the maker" run in `src/mock/swarm.ts`), **then** `seller-maker-question-<questionId>` shows the buyer's words and `pc_01`, and `seller-maker-reply-<questionId>` is empty. **When** the maker types a reply and presses `seller-maker-send-<questionId>`, **then** the store holds one `question.answered` with `source: "user"`, `by: "mkr_01"` and her exact text, and `seller-maker-answer-<questionId>` shows it.
10. **Given** scripted mode, **then** the overview and listings panels and the questions panel show `simulated-badge`.
11. **Given** `demo-lang-toggle` switched to Chinese, **then** every label is Chinese and the amounts are unchanged. The buyer's question and the maker's answer stay as written.

## Out of scope
- Publishing a listing for real, editing a draft field by field, or photo upload. The Describer runs only when B14 gets an image, so no screen says it ran (A2-18).
- The approvals inbox itself (M-approvals), the storefront builder (F-storefront), the counterfeit watch (F-watch) and the buyer's side of "ask the maker" (F-support). The overview only links to them.
- Translating the maker's answer. Grace N. writes in English and the buyer reads English. Any translation is the buyer side's job, labeled there.
- Orders management, inventory and shipping.

## Contract additions needed
1. **`question.forwarded` and `question.answered`** (contracts section 3, from C-13): this plan reads a question's ID, `threadId`, `makerId`, `pieceId`, the buyer's `text` and `lang` from `question.forwarded`, and emits `question.answered` with that question's ID, `makerId`, `text` and `lang`. If section 3 names them differently, section 3 wins and the builders follow it. A person's `question.answered` needs an ID prefix in section 11's scheme.
2. **`maker.side`'s source keys** (contracts section 4) add the key `question.forwarded` carries, for the questions panel's badge.
3. Already settled, kept here for the record: `navigate()` and the kit `Link`, listing runs threaded by `listingId` and matched by notes, `apr_04` at the end of the tour's listing run, `listing.indexed` keyed `b14-swarm` at the end of `run_02`, and the kit `StatTile` (I2-kit).
