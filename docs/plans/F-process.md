# F-process · The process blocks and their views

Priority: P0 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/process/ · Made real by: B11, B12, B13, B14, B15 and the v1 upgrades

SCOPE: src/features/process/, tests/features/process-*

## Goal
Across the top of every page, ten small blocks show what Cindia is doing right now: searching, agents working, the checkout, money moving, the month being matched, approvals waiting, the close, the proof, the counterfeit watch and the search model. A judge clicks any block and sees that process drawn out (the embedding map, the agents lighting up, the money threads), with the raw events listed underneath. Each event shows whether it came from a live service or the script.

## Read first
- `docs/v2/brief.md`: Under the hood, the agent swarm, search and the index
- `docs/v2/contracts.md`:
  - section 3: every event type, `ProcessId`, `swarm.step`, the payload rule, the Requests rows
  - section 4: the process bar and views table, slots `process.bar` and `process.view`, the `process-` test IDs, `?process=`
  - section 6: the agent roster
  - section 7: `ProcessBlock`, `ProcessView`, `EventLog`, `AgentGraph`, `EmbeddingMap`, `ScoreBar`, `Thread`, `Badge`
  - section 8: the tour's process overlays in `d01-vibe`, `d04-support`, `d05-pay`, `d13-proof` and `d15-listing`
  - section 9: the glossary rows
- `docs/common/events.md` (after I2-core): the store keys, `sources`, the Simulated rule
- `docs/common/ui-contract.md` (after I2-core): SlotProps, feature modules, test hooks
- `docs/common/design-system.md` (after I2-core): motion on the player clock, the seal-red and jade rules

## Interfaces
- **Reads events** through `useCindia()`:
  - the store's `log` (one entry per event: `id`, `type`, `at`, `source`, `key`) for the event logs, the statuses and the counts,
  - `clock` for the "working" window,
  - `sources` for the badges,
  - the domain keys each view draws from: `search`, `surprise`, `swarm`, `support`, `buyer`, `money`, `month`, `approvals`, `close`, `proof`, `model`, `watch`, `projects`, `wip`.
  
  The language comes from `SlotProps.lang`. Every figure a view draws comes from an event payload in the store, never typed in.
- **Reads data:** the agent roster from `src/mock/agents.ts` (names, kind, model, tools, job), and `getById()` for the pieces, parties, records and approvals the events name.
- **Reads props:** `SlotProps.processId`, the open process (on `process.view`, and on `process.bar` to mark the active block).
- **Emits:** nothing. Opening and closing a view goes through `setProcess(id)` and `setProcess(null)` from `src/core/nav.ts`, which set or clear `?process=`.
- **Exports:** `src/features/process/index.ts` default-exports `{ id: "process", slots: { "process.bar": ProcessBar, "process.view": ProcessViewHost } }`.
- **Source keys:** each block and each view declares the keys of its process from the contract's table. The bar as a whole renders all keys. `checkout` has no keys and always shows the Simulated badge, because the card is always simulated.
- **Test IDs from the contract:** `process-bar`, `process-block-<processId>`, `process-view`, `process-view-close`, `process-log`, `process-search-map`, `process-swarm-graph`, `process-swarm-step-<stepId>`, `process-money-diagram`, `process-model-card`.
- **Internal test IDs:**
  - `process-block-status-<processId>` (its text is the status) and `process-block-count-<processId>`,
  - `process-view-<processId>`, the root of each view,
  - `process-search-scores`,
  - `process-swarm-run-picker`,
  - `process-checkout-flow`, `process-checkout-stored`, `process-checkout-never`,
  - `process-money-balance`,
  - `process-reconcile-flag`,
  - `process-approvals-list`,
  - `process-close-chain`,
  - `process-proof-errors`, `process-proof-search`,
  - `process-watch-chain`,
  - `process-empty`, the waiting line a view shows before its first event.
- **Labels from the glossary:** the ten block labels in the contract's table (both languages), live, rule-based, agent swarm, search model, flag, approval, seal, token, Simulated.

### The processes (`processes.ts`, T1)

| Process | Event types in its log | Count on the block | Attention when |
|---|---|---|---|
| `search` | `search.queried`, `search.answered`, `search.mapped`, `surprise.asked`, `surprise.drawn` | answers (`search.answered` plus `surprise.drawn`) | never |
| `swarm` | `support.asked`, `swarm.step`, `support.answered`, `support.escalated`, `listing.requested`, `listing.drafted`, `storefront.drafted` | steps | a `support.escalated` whose approval is still pending |
| `checkout` | `piece.opened`, `split.shown`, `checkout.started`, `card.tokenized`, `order.placed`, `project.funded`, `receipt.updated` | orders | never |
| `money` | `money.moved`, `account.synced`, `payout.sent`, `wip.milestone_paid` | moves | never |
| `reconcile` | `month.started`, `record.arrived`, `match.made`, `flag.raised`, `flag.explained`, `ledger.posted` | matches | a flag is in the store and no `followup.sent` has arrived |
| `approvals` | `approval.requested`, `approval.granted`, `approval.declined`, `followup.drafted`, `followup.sent` | pending approvals | any approval is pending |
| `close` | `month.closed`, `workbook.ready`, `statement.issued`, `impact.updated` | statements issued | never |
| `proof` | `proof.scored`, `proof.search_scored` | caught of total, as "4/4" | never |
| `watch` | `watch.started`, `watch.scanned`, `counterfeit.flagged` | hits | a hit whose `report_listing` approval is pending |
| `model` | `model.trained`, `proof.search_scored`, `search.mapped` | none (the block reads "trained" or stays idle) | never |

A block's status is one of these, checked in this order:
1. `attention` when its rule above holds,
2. `working` when its newest event's `at` is within 2000 ms of the store's `clock`,
3. `done` when it has at least one event,
4. `idle` otherwise.

The status reads only the store, so a `seek()` gives the same status every time.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string the bar and views need that the glossary lacks, English and Chinese side by side, including the stored and never-stored lists | src/features/process/strings.ts | none | lead |
| T1 | The process map, the status rule and the bar | src/features/process/processes.ts, src/features/process/ProcessBar.tsx, tests/features/process-bar.spec.ts | T0 | opus |
| T2 | The search view: map, scores, engine | src/features/process/SearchProcess.tsx, tests/features/process-search.spec.ts | T1 | opus |
| T3 | The swarm view: graph and step rows | src/features/process/SwarmProcess.tsx, tests/features/process-swarm.spec.ts | T1 | opus |
| T4 | The checkout and money views | src/features/process/CheckoutProcess.tsx, src/features/process/MoneyProcess.tsx, tests/features/process-money.spec.ts | T1 | opus |
| T5 | The reconcile, approvals and close views | src/features/process/ReconcileProcess.tsx, src/features/process/ApprovalsProcess.tsx, src/features/process/CloseProcess.tsx, tests/features/process-books.spec.ts | T1 | sonnet |
| T6 | The proof, watch and model views | src/features/process/ProofProcess.tsx, src/features/process/WatchProcess.tsx, src/features/process/ModelProcess.tsx, tests/features/process-proof.spec.ts | T1 | sonnet |
| T7 | Assemble the view host and fill the slots (lead) | src/features/process/ProcessViewHost.tsx, src/features/process/index.ts, tests/features/process-flow.spec.ts | T1 to T6 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder. T1 lands before T2 to T6 start, because every view imports the process map from `processes.ts`. T2 to T6 each export view components that take `lang` and read the store. They don't draw their own frame or log, because T7's host wraps every view in the kit's `ProcessView` with its badge, its log and its close button. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T7 fills the slots, and the lead sends any failure back to the builder who owns the file.

**T1.** `processes.ts` exports the table above:
- per process: its label key, its source keys, its event types, a count function and an attention function,
- the status rule, as a pure function of the store state.

`ProcessBar` (`process-bar`) renders ten kit `ProcessBlock`s (`process-block-<processId>`) in the contract's order. Each shows its label, `process-block-status-<processId>`, `process-block-count-<processId>` and its Live or Simulated badge. Status uses the kit's colors with a second cue for each (an icon and a word), so color never carries it alone. Clicking a block calls `setProcess(id)`. The open process (`SlotProps.processId`) shows as pressed. The bar fits 1440 px in one row of 64 px.

**T2.** `SearchProcess` (`process-view-search`):
- The kit `EmbeddingMap` (`process-search-map`) draws the newest `search.mapped`: every piece as a dot colored by community, the query as a star, and lines from the star to the newest `search.answered`'s top six. Hovering a dot names the piece.
- `process-search-scores` lists those six with their `score` as a `ScoreBar`, the `matched` keywords, the engine and the `modelId`.
- Before any `search.mapped`, the map area keeps its test ID and shows `process-empty`: the map appears after the first search, or "Not trained yet" when `src/mock/model.ts` has no report and no `model.trained` has arrived.

**T3.** `SwarmProcess` (`process-view-swarm`):
- The kit `AgentGraph` (`process-swarm-graph`) shows the roster's agents that took part in the selected run. Edges follow the steps in order (`route` and `handoff` from Cindy to a specialist, `result` back). A node lights when its step's `at` is reached on the player clock, never on wall time.
- Under it, one row per step (`process-swarm-step-<stepId>`): the agent's name from the roster, the step `kind`, `toolName`, `model`, `ms` and the `summary` in the slot's language. Agents of kind `code` carry the kit's Rule-based badge.
- `process-swarm-run-picker` chooses the run. The newest is the default.
- A step's source and key show in the row, so a judge can tell a B13-streamed step from a scripted one.

**T4.**
- `CheckoutProcess` (`process-view-checkout`):
  - `process-checkout-flow` draws card, then token (`card.tokenized`), then order (`order.placed`), with the split from `split.shown` and any `project.funded` add-on.
  - `process-checkout-stored` lists what Cindia keeps (the token, the card brand, the last four digits, the order).
  - `process-checkout-never` lists what it never keeps (the card number, the security code).
- `MoneyProcess` (`process-view-money`): `process-money-diagram` places the parties named in the store's `money.moved` events (buyer, Cindia, card network, studio, maker, gallery, community fund) and draws one kit `Thread` per move, sewing on the player clock, with its amount and kind. `process-money-balance` shows the newest `account.synced`.

**T5.**
- `ReconcileProcess` (`process-view-reconcile`): counts by record type, matches by kind, and `process-reconcile-flag` with expected, paid, short and the record to trust, from `flag.raised` and `flag.explained`.
- `ApprovalsProcess` (`process-view-approvals`): `process-approvals-list` shows each approval in the order requested, with what Cindy proposed, its status, the kit `Seal` on granted ones, and what followed (`followup.sent`, `payout.sent`, `wip.milestone_paid`).
- `CloseProcess` (`process-view-close`): `process-close-chain` runs ledger posted, month closed (with its totals), workbook ready, statements issued, and receipt paid to the maker, each lit when its event is in the store.

**T6.**
- `ProofProcess` (`process-view-proof`): `process-proof-errors` lists each planted error from `proof.scored` and whether it was caught, and `process-proof-search` shows the four systems from `proof.search_scored`, or "Not trained yet".
- `WatchProcess` (`process-view-watch`): `process-watch-chain` runs search (the queries from `watch.started`), then compare (the engine and candidate count from `watch.scanned`), then check the claim and propose a report (each `counterfeit.flagged` with its similarity and the pending approval).
- `ModelProcess` (`process-view-model`): `process-model-card` shows the newest `model.trained` (base model, training pairs, epochs, dimensions, and the model card link when `hubUrl` is set) and the `proof.search_scored` table. With neither, it says "Not trained yet" and what the card will show.

**T7.** `ProcessViewHost` reads `SlotProps.processId` and renders nothing without one. With one, it wraps the matching view in the kit's `ProcessView` (`process-view`):
- the block's label as the title, and the Live or Simulated badge for that process's keys,
- the close button `process-view-close`, which calls `setProcess(null)` (Esc does the same while the view is open),
- at the bottom, the kit `EventLog` (`process-log`) with the store's `log` filtered to that process's event types, newest last: time on the player clock, type, source and key.

`index.ts` exports the module. `process-flow.spec.ts` opens every view in turn from the bar.

## Acceptance
Specs open the route named and check by test ID only.
- Where a line needs a v1 event, the spec seeks the demo timeline, which carries every v1 event at v1's times in Phase A.
- Where it needs a v2 event, the spec emits the scripted payload from `src/mock/` with `window.__cindia.emit()`, at the tour's time from contracts section 8, after a `seek()` to that time.
- After `I2-tour`, G4v2 checks the overlays at the tour's beats.

1. **Given** `/shop` on a fresh store, **then** `process-bar` shows the ten `process-block-<processId>` in the contract's order, each `idle`. Every block shows `simulated-badge` in scripted mode, and `process-block-checkout` shows it in every mode.
2. **Given** the store clock at 1.0 s with the tour's `search.queried` at 0.4 s, **then** `process-block-status-search` reads working. **Given** the clock at 5.0 s with the newest search event at 2.6 s, **then** it reads done.
3. **Given** the demo timeline sought past v1's `flag.raised` and before `followup.sent`, **then** `process-block-status-reconcile` reads attention. **Given** the timeline past `followup.sent`, **then** it reads done.
4. **Given** the timeline just after v1's `approval.requested` for `apr_02`, **then** `process-block-status-approvals` reads attention and `process-block-count-approvals` shows the number of pending approvals in the store.
5. **When** a person clicks `process-block-swarm`, **then** the URL has `?process=swarm` and `process-view-swarm` shows. **When** they press `process-view-close` or Esc, **then** `?process=` is gone and `process-view` is not on screen.
6. **Given** the tour's `search.answered` and `search.mapped` emitted, **then** `process-search-map` draws one point per piece in the payload and the query star, and `process-search-scores` lists six results with their scores and the engine.
7. **Given** the tour's `d04-support` run emitted, **then** `process-swarm-graph` shows Cindy, Intake, Steward, Clerk and Writer, and there is one `process-swarm-step-<stepId>` per step, in order, each with its agent, kind, tool, model and ms.
8. **Given** the tour's `d15-listing` run emitted, **then** the Indexer's row carries the Rule-based badge.
9. **Given** the timeline past v1's `card.tokenized` and `order.placed`, **then** `process-checkout-flow` shows the token `tok_7Q2M9X4KD1PA` and `ord_001`, and `process-checkout-never` lists the card number.
10. **Given** the timeline past v1's `account.synced` with `mv_0101` and `mv_0102` emitted, **then** `process-money-diagram` draws threads for `mv_0001`, `mv_0002`, `mv_0003`, `mv_0101` and `mv_0102`, including one to the community fund `prj_01`.
11. **Given** no `model.trained` and `report` null, **then** `process-model-card` says "Not trained yet". **When** a `model.trained` and a `proof.search_scored` are emitted, **then** it shows the base model, the pairs, the epochs and the four systems.
12. **Given** any open view, **then** `process-log` lists only that process's event types, newest last, each with its time, type, source and key.
13. **Given** a `seek()` to any moment, **then** every block's status and count and every open view render the same each time.

## Out of scope
- Any business logic. Views only draw what the store holds.
- The shell's overlay placement, the `?process=` routing and the tour's camera. The shell (`I2-shell`, `I2-tour`) owns them.
- Editing or replaying events from the log.

## Contract additions needed
- **A store key `log`:** an array of `{ id, type, at, source, key }`, one entry per applied event, idempotent by `id`, keeping the newest 400 (I2-core).
- **`src/core/nav.ts`** with `setProcess(processId | null)`, which sets or clears `?process=`. On `/demo`, the shell maps it to the stage's overlay (I2-core, I2-shell).
- **`SlotProps.processId` is also passed to `process.bar`:** the open process, or undefined (I2-core, I2-shell).
- **Ownership of the `process-` test IDs:**
  - The process feature renders `process-bar`, `process-block-<processId>`, `process-view`, `process-view-close` and `process-log` inside the shell's two slots.
  - The shell renders only the slot containers and their empty placeholders (`slot-process-bar`, `slot-process-view`).
  - The contract's Shell line should say so (I2-core).
- **Overlay placement:** the shell keeps the top bar and the process bar visible above an open process view, and never covers an open drawer with it. The tour's `d04-support` needs the support drawer and the swarm view on screen together (I2-shell).
- **`src/mock/agents.ts` exports** `agents: AgentSpec[]` and `getAgent(agentId)`, because agent IDs have no prefix for `getById()` (S3-catalog).
