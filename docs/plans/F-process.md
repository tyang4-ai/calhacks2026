# F-process · The process blocks and their views

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/process/ · Made real by: B11, B12, B13, B14, B15, B16 and the v1 upgrades

SCOPE: src/features/process/, tests/features/process-*

## Goal
Across the top of every page, eleven small blocks show what the Cindia platform is doing right now: searching, agents working, the checkout, money moving, the month being matched, approvals waiting, the close, the proof, the counterfeit watch, the search model and the data it holds. One line on the bar says how many are live ("Live: N of 11"), and in live mode the bar also says how many screens are watching. A judge clicks any block and sees that process drawn out (the embedding map, the agents lighting up, the money threads, the database tables), with the raw events listed underneath. Each event shows whether it came from a live service or the script.

## Read first
- `docs/v2/fix-plan.md`: section 1.4 (the three pillars and the `data` view), section 1.2 (the tour), section 1.9 (the view roots)
- `docs/v2/brief.md`: Under the hood, the agent swarm, search and the index, the database
- `docs/v2/contracts.md`:
  - section 3: every event type, `ProcessId` (now with `data`), `swarm.step`, `listing.indexed`, `question.forwarded` and `question.answered`, the payload rule, the Requests rows
  - section 4: the process bar and views table, presence, slots `process.bar` and `process.view`, the `process-` test IDs, `?process=`
  - section 5: B12's status, B13's tables and its polling endpoint
  - section 6: the agent roster
  - section 7: `ProcessBlock`, `ProcessView`, `EventLog`, `AgentGraph`, `EmbeddingMap`, `ScoreBar`, `Thread`, `Badge`
  - section 8: the tour's process views in `d01-vibe`, `d04-support`, `d05-pay`, `d07-month`, `d09-approve`, `d13-proof` and `d15-listing`
  - section 9: the glossary rows
  - section 11: the `log` store key, the ID scheme, the inline `approval` object
  - section 12: labels L18, L28 and L29
- `docs/common/events.md` (after I2-core): the store keys, `sources`, the Simulated rule
- `docs/common/ui-contract.md` (after I2-core): SlotProps, feature modules, test hooks
- `docs/common/design-system.md` (after I2-core): motion on the player clock, the seal-red and jade rules

## Interfaces
- **Reads events** through `useCindia()`:
  - the store's `log` (one entry per event: `id`, `type`, `at`, `source`, `key`) for the event logs, the statuses and the counts,
  - `clock` for the "working" window, and `player.isPlaying()` from `src/core/` (with `player.subscribe()`), because "working" counts only while the player plays (B1-37),
  - `sources` for the Live marks and the summary,
  - the domain keys each view draws from: `search`, `surprise`, `swarm`, `support`, `buyer`, `money`, `month`, `approvals`, `close`, `proof`, `model`, `watch`, `projects`, `wip`, `listings`,
  - in live mode, the database status that the B13 and B12 adapters put in the store (contract addition 1): each SpacetimeDB table's row count and newest rows, the process status rows, the number of screens watching, and the index counts.
  
  The language comes from `SlotProps.lang`. Every figure a view draws comes from an event payload in the store or from `src/mock/`, never typed in.
- **Reads data:** the agent roster through `agents` and `getAgent()` from `src/mock/agents.ts` (names, kind, model, tools, job), `getById()` for the pieces, parties, records and approvals the events name, and for the data view in scripted mode `pieces`, `orders`, `approvals`, `listings`, `searchIndex`, `swarmRuns`, `modelId` and `report` from `src/mock/`.
- **Reads props:** `SlotProps.processId`, the open process (on `process.view`, and on `process.bar` to mark the active block).
- **Emits:** nothing. Opening and closing a view goes through `setProcess(id)` and `setProcess(null)` from `src/core/nav.ts`, which set or clear `?process=`, and on `/demo` the shell decides what they do.
- **Exports:** `src/features/process/index.ts` default-exports `{ id: "process", slots: { "process.bar": ProcessBar, "process.view": ProcessViewHost } }`.
- **Source keys:** each block and each view declares the keys of its process from the contract's table. The bar as a whole renders all keys. `checkout` has no keys and is never live, because the card is always simulated. `data` declares `b13-live`, `b12-search` and `b11-embed` (contract addition 2).
- **Test IDs from the contract:** `process-bar`, `process-block-<processId>`, `process-view`, `process-view-close`, `process-log`, `process-search-map`, `process-swarm-graph`, `process-swarm-step-<stepId>`, `process-money-diagram`, `process-model-card`, `process-data-tables`. The process feature renders all of them inside the shell's two slot containers. The shell renders only `slot-process-bar` and `slot-process-view`.
- **Internal test IDs:**
  - `process-block-status-<processId>` (its text is the status), `process-block-count-<processId>`, and `process-block-live-<processId>`, the Live mark, shown only when all of that process's keys are live,
  - `process-live-summary`, the one summary line, and `process-presence`, the screens line in live mode,
  - `process-pane-<processId>`, the root of each view (B1-5, D1-18). Never `process-view-<processId>`, because `process-view-close` is the close button,
  - `process-search-scores`,
  - `process-swarm-run-picker`, `process-swarm-shared` (L18),
  - `process-checkout-flow`, `process-checkout-stored`, `process-checkout-never`,
  - `process-money-balance`, `process-money-sandbox` (L29),
  - `process-reconcile-flag`,
  - `process-approvals-list`,
  - `process-close-chain`,
  - `process-proof-errors`, `process-proof-search`,
  - `process-watch-chain`, `process-watch-results`,
  - `process-model-test-note` (L28),
  - `process-data-table-<table>` for `catalog`, `listings`, `orders`, `approvals`, `runs`, `steps`, `processes` and `screens`, then `process-data-index` and `process-data-model`,
  - `process-empty`, the waiting line a view shows before its first event.
- **Labels from the glossary:** the eleven block labels in the contract's table (both languages), live, rule-based, agent swarm, search model, flag, approval, seal, token, Simulated. From contracts section 12: L18 in the swarm view, L28 on the model card, L29 in the money view.

### The processes (`processes.ts`, T1)

| Process | Event types in its log | Count on the block | Attention when |
|---|---|---|---|
| `search` | `search.queried`, `search.answered`, `search.mapped`, `surprise.asked`, `surprise.drawn` | answers (`search.answered` plus `surprise.drawn`) | never |
| `swarm` | `support.asked`, `swarm.step`, `support.answered`, `support.escalated`, `question.forwarded`, `question.answered`, `listing.requested`, `listing.drafted`, `listing.indexed`, `storefront.requested`, `storefront.drafted` (D1-54) | steps | a `support.escalated` whose approval is still pending |
| `checkout` | `piece.opened`, `split.shown`, `checkout.started`, `card.tokenized`, `order.placed`, `project.funded`, `receipt.updated` | orders | never |
| `money` | `money.moved`, `account.synced`, `payout.sent`, `wip.milestone_paid` | moves | never |
| `reconcile` | `month.started`, `record.arrived`, `match.made`, `flag.raised`, `flag.explained`, `ledger.posted` | matches | a flag is in the store and no `followup.sent` has arrived |
| `approvals` | `approval.requested`, `approval.granted`, `approval.declined`, `followup.drafted`, `followup.sent` | pending approvals | any approval is pending |
| `close` | `month.closed`, `workbook.ready`, `statement.issued`, `impact.updated` | statements issued | never |
| `proof` | `proof.scored`, `proof.search_scored` | caught of total, as "4/4" | never |
| `watch` | `watch.started`, `watch.scanned`, `counterfeit.flagged` | hits | a hit whose `report_listing` approval is pending |
| `model` | `model.trained`, `proof.search_scored`, `search.mapped` | none (the block reads "trained" or stays idle) | never |
| `data` | `listing.requested`, `listing.drafted`, `listing.indexed`, `order.placed`, `approval.requested`, `approval.granted`, `approval.declined`, `swarm.step`, `model.trained`, and in live mode the database status (contract addition 1) | documents in the search index: 54 at the start, 55 once the tour's listing is indexed | never |

A block's status is one of these, checked in this order:
1. `attention` when its rule above holds,
2. `working` when the player is playing and its newest event's `at` is within 2000 ms of the store's `clock` (B1-37). In live mode, also while B13's process status row for that process says working (C-4), so a person's live request lights its block after the tour has stopped,
3. `done` when it has at least one event,
4. `idle` otherwise.

In scripted mode the status reads only the store and whether the player plays, so a `seek()` gives the same status every time.

### The data view (`DataProcess.tsx`, T7)

The data view shows the platform's one database (fix-plan 1.4, pillar 3). `process-data-tables` lists eight SpacetimeDB tables, each with its row count and its newest rows (at most three, newest first, as an ID and one short label). T7 maps B13-live's table names to these eight rows.

| Row (`process-data-table-<table>`) | Rows in scripted mode | Newest rows in scripted mode |
|---|---|---|
| `catalog` | `pieces` (54) | the last three pieces by ID |
| `listings` | `listings`, plus each `lst_user_<n>` in the store | the newest listings in the log, each with its state: requested, drafted, indexed or approved |
| `orders` | `orders`, plus each `ord_user_<n>` in the store | the newest `order.placed` |
| `approvals` | the demo approvals `apr_01` to `apr_05` in `src/mock/`, plus each `apr_user_<n>` in the store | the newest `approval.requested`, with its status |
| `runs` | the runs in the store's `swarm` key | the newest runs |
| `steps` | the steps in the store's `swarm` key | the newest steps, with agent and kind |
| `processes` | 11, one per process | each block's status by the bar's rule |
| `screens` | 1, this screen | this screen |

- **The index** (`process-data-index`): `cindia-pieces` holds the 54 `searchIndex` entries plus every listing whose `listing_publish` approval is granted, and `cindia-drafts` holds every listing with a `listing.indexed` and no grant yet. The newest `listing.indexed` shows its `pieceId` and `modelId` from the payload. In the tour that's `lst_01`'s piece, so `cindia-drafts` reads 1 at `d15-listing`.
- **The model** (`process-data-model`): `modelId`, then trained (with `dims`) from the store's `model` key, or "Not trained yet" when no `model.trained` has arrived and `report` is null.
- **Live mode:** each group reads live values only while its own key is live: the tables, process status and screens from B13 (`b13-live`), the index from B12 (`b12-search`), the model from B11 (`b11-embed`). A group whose key isn't live keeps its scripted values. Each group shows the kit's Live badge when its key is live, and the view's own badge follows the kit rule over all three keys, so scripted mode shows `simulated-badge`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string the bar and views need that the glossary lacks, English and Chinese side by side, including the stored and never-stored lists, the summary and presence lines, the eight table names, and L18, L28 and L29 as contracts section 12 words them | src/features/process/strings.ts | none | lead |
| T1 | The process map, the status rule and the bar, with the summary and presence | src/features/process/processes.ts, src/features/process/ProcessBar.tsx, tests/features/process-bar.spec.ts | T0 | opus |
| T2 | The search view: map, scores, engine | src/features/process/SearchProcess.tsx, tests/features/process-search.spec.ts | T1 | opus |
| T3 | The swarm view: graph and step rows | src/features/process/SwarmProcess.tsx, tests/features/process-swarm.spec.ts | T1 | opus |
| T4 | The checkout and money views | src/features/process/CheckoutProcess.tsx, src/features/process/MoneyProcess.tsx, tests/features/process-money.spec.ts | T1 | opus |
| T5 | The reconcile, approvals and close views | src/features/process/ReconcileProcess.tsx, src/features/process/ApprovalsProcess.tsx, src/features/process/CloseProcess.tsx, tests/features/process-books.spec.ts | T1 | sonnet |
| T6 | The proof, watch and model views | src/features/process/ProofProcess.tsx, src/features/process/WatchProcess.tsx, src/features/process/ModelProcess.tsx, tests/features/process-proof.spec.ts | T1 | sonnet |
| T7 | The data view: tables, index and model | src/features/process/DataProcess.tsx, src/features/process/dataRows.ts, src/features/process/dataRows.test.ts, tests/features/process-data.spec.ts | T1 | opus |
| T8 | Assemble the view host and fill the slots (lead) | src/features/process/ProcessViewHost.tsx, src/features/process/index.ts, tests/features/process-flow.spec.ts | T1 to T7 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder. T1 lands before T2 to T7 start, because every view imports the process map from `processes.ts`. T2 to T7 each export view components that take `lang` and read the store, two builders at a time. Each view's root carries `process-pane-<processId>`. They don't draw their own frame or log, because T8's host wraps every view in the kit's `ProcessView` with its badge, its log and its close button. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T8 fills the slots, and the lead sends any failure back to the builder who owns the file.

**T1.** `processes.ts` exports the table above:
- per process: its label key, its source keys, its event types, a count function and an attention function,
- the status rule, as a pure function of the store state and whether the player plays.

`ProcessBar` (`process-bar`) renders eleven kit `ProcessBlock`s (`process-block-<processId>`) in the order of the contract's table. Each shows its label, `process-block-status-<processId>` and `process-block-count-<processId>`. Status uses the kit's colors with a second cue for each (an icon and a word), so color never carries it alone. A block whose keys are all live shows the small Live mark `process-block-live-<processId>`. Blocks show no Simulated badge of their own (A1-15). Instead:
- `process-live-summary` reads "Live: N of 11", where N counts the processes whose keys are all live. `checkout` never counts, so it reads "Live: 0 of 11" in scripted mode.
- While any key is scripted, the bar shows the kit's `simulated-badge` once, beside the summary. Every view keeps its own badge.
- In live mode, while `b13-live` is live, `process-presence` reads "N screens watching" from B13's screens count (C-4). In scripted mode it isn't rendered.

Clicking a block calls `setProcess(id)`. The open process (`SlotProps.processId`) shows as pressed. The bar fits 1440 px in one row of 64 px: the eleven blocks, then the summary and presence.

**T2.** `SearchProcess` (`process-pane-search`):
- The kit `EmbeddingMap` (`process-search-map`) draws the newest `search.mapped`: every piece as a dot colored by community, the query as a star, and lines from the star to the newest `search.answered`'s top six. Hovering a dot names the piece.
- `process-search-scores` lists those six with their `score` as a `ScoreBar`, the `matched` keywords, the engine and the `modelId`.
- Before any `search.mapped`, the map area keeps its test ID and shows `process-empty`: the map appears after the first search, or "Not trained yet" when `src/mock/model.ts` has no report and no `model.trained` has arrived.

**T3.** `SwarmProcess` (`process-pane-swarm`):
- The kit `AgentGraph` (`process-swarm-graph`) shows the roster's agents that took part in the selected run. Edges follow the steps in order (`route` and `handoff` from Cindy to a specialist, `result` back). A node lights when its step is in the store and the player clock has reached its `at`, never on wall time. A live step's `at` is stamped with the player clock when it arrives (B2-14, done in the registry or the B13 adapter), so a live run lights up step by step as its steps land.
- Under it, one row per step (`process-swarm-step-<stepId>`): the agent's name from the roster, the step `kind`, `toolName`, `model`, `ms` and the `summary` in the slot's language. Agents of kind `code` carry the kit's Rule-based badge. A step whose `toolName` is `elastic_agent` names its tool "Elastic Agent Builder", and the graph draws it as a tool node beside the Finder (C-3).
- A step's source and key show in the row, so a judge can tell a B13-streamed step from a scripted one.
- `process-swarm-run-picker` chooses the run. When the tour opened the view (the store's `demo.process` is `swarm`), the default is the newest run whose ID comes from `src/mock/swarm.ts`, never a `run_user_` ID, so another screen's or a person's run never takes over the tour's view (B2-15). Anywhere else the newest run is the default.
- In live mode, `process-swarm-shared` shows L18: "Live steps are shared with every open screen in this demo."

**T4.**
- `CheckoutProcess` (`process-pane-checkout`):
  - `process-checkout-flow` draws card, then token (`card.tokenized`), then order (`order.placed`), with the split from `split.shown` and any `project.funded` add-on.
  - `process-checkout-stored` lists what Cindia keeps (the token, the card brand, the last four digits, the order).
  - `process-checkout-never` lists what it never keeps (the card number, the security code).
- `MoneyProcess` (`process-pane-money`):
  - `process-money-diagram` places the parties named in the store's `money.moved` events (buyer, Cindia, card network, the co-op, maker, gallery, community fund) and draws one kit `Thread` per move, sewing on the player clock, with its amount and kind.
  - `process-money-balance` shows the newest `account.synced`.
  - `process-money-sandbox` shows L29: "Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved."

**T5.**
- `ReconcileProcess` (`process-pane-reconcile`): counts by record type, matches by kind, and `process-reconcile-flag` with expected, paid, short and the record to trust, from `flag.raised` and `flag.explained`. The tour opens it late in `d07-month` (C-12).
- `ApprovalsProcess` (`process-pane-approvals`): `process-approvals-list` shows each approval in the order requested, with what Cindy proposed, its status, the kit `Seal` on granted ones, and what followed (`followup.sent`, `payout.sent`, `wip.milestone_paid`). An approval `getById()` doesn't find (a live `apr_user_<n>`) uses the inline `approval` object the store kept from its `approval.requested`. The tour opens it in `d09-approve` (C-12).
- `CloseProcess` (`process-pane-close`): `process-close-chain` runs ledger posted, month closed (with its totals), workbook ready, statements issued, and receipt paid to the maker, each lit when its event is in the store.

**T6.**
- `ProofProcess` (`process-pane-proof`): `process-proof-errors` lists each planted error from `proof.scored` and whether it was caught, and `process-proof-search` shows the four systems from `proof.search_scored`, or "Not trained yet".
- `WatchProcess` (`process-pane-watch`): `process-watch-chain` runs search (the queries from `watch.started`), then compare (the engine and the count from `watch.scanned`), then check the claim and propose a report (each `counterfeit.flagged` with its similarity and the pending approval). `process-watch-results` lists every result the scan checked, hits or not, with its verdict, as `watch.scanned` carries them (C-6, contract addition 3).
- `ModelProcess` (`process-pane-model`): `process-model-card` shows the newest `model.trained` (base model, training pairs, epochs, dimensions, and the model card link when `hubUrl` is set) and the `proof.search_scored` table, with `process-model-test-note` under it reading L28: "50 test queries over the same 54 fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark." With neither event, it says "Not trained yet" and what the card will show.

**T7.** `dataRows.ts` builds the data view's rows from the store and `src/mock/` as the table in "The data view" says, as pure functions with unit tests (54 catalog rows, `lst_01`'s states in order, the index counts before and after a `listing.indexed` and a grant). `DataProcess` (`process-pane-data`) renders `process-data-tables`, `process-data-index` and `process-data-model`, and switches each group to its live values by the live-mode rule.

**T8.** `ProcessViewHost` reads `SlotProps.processId` and renders nothing without one. With one, it wraps the matching view in the kit's `ProcessView` (`process-view`):
- the block's label as the title, and the Live or Simulated badge for that process's keys,
- the close button `process-view-close`, which calls `setProcess(null)` (Esc does the same while the view is open),
- at the bottom, the kit `EventLog` (`process-log`) with the store's `log` filtered to that process's event types, newest last: time on the player clock, type, source and key.

`index.ts` exports the module. `process-flow.spec.ts` opens every view in turn from the bar.

## Acceptance
Specs open the route named and check by test ID only.
- Every spec moves the timeline with `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts`, never to a fixed time, because `I2-tour` moves the beats (B1-28).
- A v2 event the timeline doesn't carry yet is emitted with `window.__cindia.emit()` from the scripted payload in `src/mock/`, stamped at the player's current clock. Events are idempotent by ID, so the same spec still passes once the tour carries them.
- Arrival is asserted with Playwright's default expect timeout, never a wall-clock window (B1-27).
- After `I2-tour`, G4v2 checks the views at the tour's beats.

1. **Given** `/shop` on a fresh store in scripted mode, **then** `process-bar` shows the eleven `process-block-<processId>` in the contract's order, each `idle`, no `process-block-live-<processId>`, `process-live-summary` reads "Live: 0 of 11", the bar shows one `simulated-badge`, and `process-presence` is not on the page.
2. **Given** the player playing, 600 ms after the tour's `search.queried` (or that event emitted), **then** `process-block-status-search` reads working. **When** the player pauses, **then** it reads done, and it stays done (B1-37).
3. **Given** the timeline sought to 300 ms after v1's `flag.raised` and before `followup.sent`, **then** `process-block-status-reconcile` reads attention. **Given** the timeline sought past `followup.sent`, **then** it reads done.
4. **Given** the timeline sought to 300 ms after v1's `approval.requested` for `apr_02`, **then** `process-block-status-approvals` reads attention and `process-block-count-approvals` shows the number of pending approvals in the store.
5. **When** a person clicks `process-block-swarm`, **then** the URL has `?process=swarm` and `process-pane-swarm` shows inside `process-view`. **When** they press `process-view-close` or Esc, **then** `?process=` is gone and `process-view` is not on screen. Exactly one element carries each of `process-bar`, `process-view` and `process-view-close`.
6. **Given** the tour's `search.answered` and `search.mapped`, **then** `process-search-map` draws one point per piece in the payload and the query star, and `process-search-scores` lists six results with their scores and the engine.
7. **Given** the tour's `d04-support` run (`run_01`), **then** `process-swarm-graph` shows Intake, Cindy, Steward, Clerk and Writer, there is one `process-swarm-step-<stepId>` per step in order, each with its agent, kind, tool, model and ms, and the run's `check` step reads kind check.
8. **Given** the tour's `d15-listing` run (`run_02`) through its `listing.indexed`, **then** the Indexer's row carries the Rule-based badge, and `process-log` in the swarm view lists the `listing.indexed`.
9. **Given** a `run_user_` run emitted after `run_01` while the store's `demo.process` is `swarm`, **then** the swarm view still shows `run_01` by default. **Given** the same run on `/shop?process=swarm` with no tour beat, **then** the newest run shows.
10. **Given** a step whose `toolName` is `elastic_agent` (the scripted find run from `src/mock/swarm.ts`), **then** its `process-swarm-step-<stepId>` names "Elastic Agent Builder". **Given** a seeded `support.escalated` with an `approval.requested` still pending, **then** `process-block-status-swarm` reads attention. Only B14 sends `support.escalated` unless a scripted run in `src/mock/swarm.ts` ends in one, so this path is tested with seeded events on purpose (D1-32).
11. **Given** the timeline sought past v1's `card.tokenized` and `order.placed`, **then** `process-checkout-flow` shows the token `tok_7Q2M9X4KD1PA` and `ord_001`, and `process-checkout-never` lists the card number.
12. **Given** the timeline sought past v1's `account.synced`, with `mv_0101` and `mv_0102` from the tour or emitted, **then** `process-money-diagram` draws threads for `mv_0001`, `mv_0002`, `mv_0003`, `mv_0101` and `mv_0102`, including one to the community fund `prj_01`, and `process-money-sandbox` shows L29.
13. **Given** no `model.trained` and `report` null, **then** `process-model-card` says "Not trained yet". **When** a `model.trained` and a `proof.search_scored` are emitted, **then** it shows the base model, the pairs, the epochs, the four systems and `process-model-test-note` with L28.
14. **Given** `/shop?process=data` on a fresh store, **then** `process-data-table-catalog` reads 54, `process-data-table-processes` reads 11, `process-data-index` reads `cindia-pieces` 54 and `cindia-drafts` 0, and the view shows `simulated-badge`.
15. **Given** the tour's `listing.indexed` for `lst_01` (or the listing run emitted), **then** `process-data-table-listings` lists `lst_01` first as indexed, `process-data-index` reads `cindia-drafts` 1 with the payload's `pieceId`, and `process-block-count-data` reads 55. These are `d15-listing`'s `process-data-tables` checks.
16. **Given** any open view, **then** `process-log` lists only that process's event types, newest last, each with its time, type, source and key.
17. **Given** a `seek()` to any moment in scripted mode, **then** every block's status and count and every open view render the same each time.
18. **Given** live mode with `b13-live` live (spec skips with a named reason when `/api/health` doesn't list `b13`), **then** `process-presence` reads the number of screens B13 reports, and a second page opened in the same context raises it by one.

## Out of scope
- Any business logic. Views only draw what the store holds.
- The shell's overlay placement, the `?process=` routing and the tour's camera. The shell (`I2-shell`, `I2-tour`) owns them.
- Fetching anything. Features never call `fetch`, so B12's and B13's status reach the view only through their adapters and the store.
- Editing or replaying events from the log, and writing to SpacetimeDB from the browser.

## Contract additions needed
1. **The database status in the store.** The data view, presence and the live process status need B13's and B12's status as events. Proposed: an event keyed `b13-live`, emitted by the B13 adapter when its poll of `GET /api/b13/changes` sees a change, with `{ tables: { table; rows; newest: { id; label }[] }[]; screens: number; processes: { processId; status }[] }`, and one keyed `b12-search` from the B12 adapter with `{ indexed; drafts; elastic; agentBuilder }`. The store keeps the newest of each under one key. FX1 names the events and the key, I2-core writes the reducer, B13-live and B12-search emit them.
2. **The `data` row in the process table** (contracts section 4): label "Data, 数据", keys `b13-live`, `b12-search`, `b11-embed`.
3. **Every checked result on `watch.scanned`:** a `results` list (title, URL text, snippet, normalized similarity, verdict) beside the `candidates` count, so the watch view lists every result (C-6). F-watch needs the same field.
4. **The bar's badge rule** (contracts section 4, The process bar and views): a block shows a count and a Live mark when all its keys are live. The bar shows one summary, "Live: N of 11", and one `simulated-badge` while any key is scripted (A1-15).
5. Already settled, kept here for the record: the `log` store key and the inline `approval` object (contracts section 11), `src/core/nav.ts` with `setProcess`, `SlotProps.processId` on `process.bar`, the shell rendering only the slot containers, and `agents` with `getAgent()` from `src/mock/agents.ts`.
