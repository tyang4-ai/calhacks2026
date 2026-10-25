# Events

Read by every feature, the integrator and the backend. The UI never fetches data or runs timers of its own. It renders a store that is built from a stream of events. In scripted mode the player emits every event. In live mode a live adapter replaces the events for its own key, and the screens don't change. The tour on `/demo` is always scripted: live mode answers people's own requests only.

## The envelope

```ts
type Source = "scripted" | "live" | "user";

interface CindiaEvent<T extends EventType = EventType> {
  id: string;          // "evt_0001" the timeline, "evt_user_0001" a person, "evt_reply_1" a scripted answer, "evt_live_…" a live answer
  type: T;             // one of the types below
  at: number;          // ms on the player clock when it fires
  source: Source;
  key?: SourceKey;     // set on events a live adapter can replace
  payload: Payloads[T];
}
```

- An event's `key` names the source that produced it. The Key column in the tables below is the source whose live adapter replaces the scripted event of that type in the timeline. A live event carries the key of the adapter that made it, so every live event B05 returns or adds (`scenario.loaded`, `record.arrived`, `match.made`, `flag.raised`) carries `b05-scenario`, even though this table keys `match.made` and `flag.raised` to `b01-match`.
- Event IDs: `evt_` plus a number for the timeline, `evt_user_` for a person, `evt_reply_<n>` for a scripted answer, and `evt_live_` for a live answer, built as `api-contract.md` says so they never repeat across server restarts.
- IDs inside payloads point at the entities in `data-model.md`. Components look the entity up with `getById()` from `src/mock`. Payloads don't copy entity data.
- The exception is numbers and text a live adapter recomputes: `split.shown`, `receipt.updated`, `statement.issued`, `impact.updated`, `followup.drafted`, `search.answered`, `surprise.drawn`, `support.answered`, `listing.drafted`, `proof.search_scored`, `watch.scanned`, `counterfeit.flagged`, `data.synced` and `index.synced` carry their figures and text in the payload, and the screens render them from the event, never from the entity. The scripted events carry the same figures as `src/mock/`.
- `Text` is `{ en: string; zh: string }`. Amounts are integer cents.

## Event types

### Buyer (F-buyer, M-buyer)

| Type | Payload | Key |
|---|---|---|
| `concierge.asked` | `query: string`, `lang` | |
| `concierge.answered` | `query`, `pieceIds: string[]` (three), `reasons: Record<pieceId, Text>` | `b09-concierge` |
| `piece.opened` | `pieceId` | |
| `split.shown` | `pieceId`, `grossCents`, `cardFeeCents`, `platformFeeCents`, `materialsCents`, `makerShareCents`, `compare?: { channelId: "ch_gallery"; commissionBps; makerShareCents }` (what the maker would get for the same piece through the gallery, figure 16) | `b10-derived` |
| `checkout.started` | `pieceId`, `grossCents` | |
| `card.tokenized` | `token` (`tok_` and 12 letters or digits), `brand: "visa"`, `last4`, `pieceId?` (every producer sets it but v1's 60-second timeline) | |
| `order.placed` | `orderId`, `pieceId`, `channelId`, `buyerId`, `grossCents`, `date` | `b04-bank` |
| `receipt.updated` | `orderId`, `status: "received" \| "paid_to_maker"`, `makerId`, `makerShareCents`, `paidDate?` | `b10-derived` |

- The buyer store keeps each checkout and card by piece (`buyer.checkouts`, `buyer.cards`). A `card.tokenized` without `pieceId` is filed under the latest `checkout.started`'s piece.

### Money (F-money-map)

| Type | Payload | Key |
|---|---|---|
| `money.moved` | `moveId`, `kind: "sale" \| "fee" \| "settlement" \| "payout_in" \| "materials" \| "maker_pay" \| "refund" \| "project_fund" \| "milestone"`, `from: Party`, `to: Party`, `amountCents`, `refId`, `date`, `nessieId?` (set only by the live B04 and B16 adapters) | `b04-bank` |
| `account.synced` | `accountId`, `balanceCents`, `asOf` (a date) | `b04-bank` |

`Party` is `{ kind: "buyer" \| "cindia" \| "card_network" \| "studio" \| "maker" \| "gallery" \| "processor" \| "supplier" \| "community_fund"; id?: string }`. A `community_fund` party's `id` is the project's ID.

- v1's moves are `mv_0001` to `mv_0006`. The tour's project add-on moves are `mv_0101` (buyer to Cindia) and `mv_0102` (Cindia to the `community_fund` of `prj_01`), figure 13. A person's milestone release takes `mv_user_<n>`.
- B16 sends only live twins of `money.moved` (a `project_fund` or `milestone` move, with `nessieId` added) and never keys a tour event.

### The month (F-reconcile)

| Type | Payload | Key |
|---|---|---|
| `month.started` | `monthId` | |
| `record.arrived` | `recordId`, `recordType: "order" \| "payout" \| "refund" \| "statement" \| "bank_txn"`, `date` | |
| `match.made` | `matchId`, `kind` (from Match), `recordIds`, `intoMonthId?` (only for `carried_over`, the month it counts in) | `b01-match` |
| `flag.raised` | `flagId`, `kind`, `recordIds`, `expectedCents`, `actualCents`, `deltaCents`, `nessieId?` (set only by B16) | `b01-match` |
| `flag.explained` | `flagId`, `trustRecordId`, `explanation: Text` | `b02-explain` |
| `ledger.posted` | `entryIds: string[]` | |
| `month.closed` | `monthId`, `salesCents` (gross of the month's orders, less refunds), `feesCents` (card fees, Cindia fees and gallery commission as charged), `makerPayCents` (the approved maker payouts), `heldCents` (34000 in September) | |

- B16 keys only the live twin of `flag.raised` it finds against Nessie's bank records, with `nessieId`, and no tour event.

### Cindy (every feature that shows the agent)

| Type | Payload | Key |
|---|---|---|
| `agent.acted` | `actId`, `kind: "match" \| "flag" \| "explain" \| "draft" \| "propose" \| "close" \| "answer" \| "score"`, `text: Text`, `refId?` | |

`agent.acted` is Cindy's running log: one short line per thing she does, in first person ("Matched 3 orders to one payout."). Panels may show the latest lines. It never carries numbers that aren't also in another event.

### Approvals (F-approvals, M-approvals)

| Type | Payload | Key |
|---|---|---|
| `approval.requested` | `approvalId`, `approval?: InlineApproval` (for an approval that isn't in `src/mock/`, IDs `apr_user_<n>`) | `b08-approvals` |
| `approval.granted` | `approvalId`, `by: "own_01"`, `date` | `b08-approvals` |
| `approval.declined` | `approvalId`, `by: "own_01"`, `reason: Text` | `b08-approvals` |
| `followup.drafted` | `followUpId`, `approvalId`, `to: Text`, `subject: Text`, `body: Text` | `b02-explain` |
| `followup.sent` | `followUpId`, `approvalId` | |
| `payout.sent` | `makerPayoutId`, `makerId`, `amountCents`, `date` | `b04-bank` |

`InlineApproval` is `{ kind: ApprovalKind; subjectIds: string[]; amountCents?: number; overLimit: boolean; proposedBy: "cindy"; summary: Text; decisionDate: string }`, the fields of the `Approval` record in `data-model.md` that a decision needs. The approvals reducer stores it as it arrives, and the approvals feature renders it when `getById()` finds nothing.

Only the owner's screen emits `approval.granted` or `approval.declined` with `source: "user"`. The demo timeline also carries a scripted `approval.granted`, so the run plays by itself. The first decision on an approval wins: the store ignores any later grant or decline for it, so a person tapping before the scripted grant is fine, and a grant after a decline changes nothing.

- The tour's `followup.drafted` `fup_02`, the Reporter's draft about `cft_01`, is keyed `b15-watch`.

### The close (F-close, F-maker-statement, F-impact)

| Type | Payload | Key |
|---|---|---|
| `workbook.ready` | `monthId`, `fileName`, `sheets: string[]`, `url?` (set by the live B06 adapter, a path under `/api/b06/files/`. Without it the feature builds the file in the browser) | `b06-workbook` |
| `statement.issued` | `makerStatementId`, `makerId`, `lines: { orderId; pieceId; makerShareCents }[]`, `totalCents`, `heldCents`, `payoutDate` | `b10-derived` |
| `impact.updated` | `impactId`, `makerShareBps`, `daysCloseToPayout`, `daysCloseToPayoutBefore`, `bookkeepingHoursSaved`, `estimate: boolean` | `b10-derived` |

### Proof, Ask Cindy, the scenario

| Type | Payload | Key |
|---|---|---|
| `proof.scored` | `caught`, `total`, `results: { errorId; caught: boolean }[]` | `b03-proof` |
| `ask.asked` | `questionId`, `text`, `lang` | |
| `ask.answered` | `questionId`, `answer: Text`, `chart?: ChartSpec`, `refIds: string[]` | `b07-ask` |
| `scenario.loaded` | `scenarioId`, `fileName`, `recordIds?` (the sample's `scn_` IDs, absent for a person's own file), `content?` (the file's text, at most 200 KB, sent only when a person drops in their own file) | `b05-scenario` |

`ChartSpec` is `{ type: "bar" \| "line"; title: Text; labels: string[]; series: { name: Text; valuesCents: number[] }[] }`. Recharts draws it with the kit's `chartTheme`.

### Search (F-search)

| Type | Payload | Key |
|---|---|---|
| `search.queried` | `queryId`, `text`, `keywords: string[]`, `lang`, `filters?: { maxPriceCents?: number; communityIds?: string[] }` | |
| `search.answered` | `queryId`, `results: { pieceId; score; closeness?; matched: string[]; reason: Text }[]` (at most 12, best first, `score` scaled so the best is 1, `closeness` the normalized cosine to the query from 0 to 1 when a model answered), `closeMatches?: boolean` (false when no result is close, and the screen says "no close matches"), `engine: "elastic_hybrid" \| "local_hybrid" \| "keyword_scripted"`, `modelId?`, and `keywords?: string[]`, `filters?` and `keywordsBy?: "finder" \| "rules"` (set only when the Finder wrote the chips) | `b12-search` |
| `search.mapped` | `queryId`, `modelId`, `points: { pieceId; x; y }[]` (all pieces), `query: { x; y }`, `method: "pca"`, `approx?: boolean` (true when the points come from scripted data) | `b11-embed` |
| `surprise.asked` | `surpriseId`, `keyword?`, `method: "keyword_random" \| "pure_random" \| "fair_random"`, `seed` | |
| `surprise.drawn` | `surpriseId`, `pieceId`, `method`, `seed`, `candidates: { pieceId; weight }[]` (the weights sum to 1, `data-model.md`'s surprise draw) | `b12-search` |

- A person's `seed` is 1 plus the number of `surprise.asked` events already in the store.

### Support and the agent swarm (F-support)

| Type | Payload | Key |
|---|---|---|
| `support.asked` | `threadId`, `side: "buyer" \| "seller"`, `text`, `lang`, `contextIds: string[]` (the records on screen: a piece, an order or a listing, a store page's community, or a maker page's maker) | |
| `swarm.step` | `runId`, `threadId`, `stepId` (`stp_0001` onward), `agentId`, `kind: "route" \| "call" \| "tool" \| "result" \| "check" \| "handoff" \| "reply"`, `summary: Text`, `toolName?`, `ms`, `model?` | `b14-swarm` |
| `support.answered` | `threadId`, `runId`, `agentId` (the agent whose words these are, usually `writer`), `reply: Text`, `refIds: string[]`, `approvalIds?: string[]` | `b14-swarm` |
| `support.escalated` | `threadId`, `runId`, `reason: Text`, `approvalId` | `b14-swarm` |
| `question.forwarded` | `questionId` (`qst_`), `threadId`, `makerId`, `pieceId`, `text` (the buyer's question, as asked), `lang` | `b14-swarm` |
| `question.answered` | `questionId`, `answerId` (`ans_`), `makerId`, `text` (the maker's own words, exactly as she wrote them, never rewritten by an agent), `lang` | `b14-swarm` |

- `swarm.step` events from B13 carry key `b13-live`, because the B13 adapter delivers them.
- `support.escalated` has no scripted producer in the tour. Seeded specs cover its paths.
- **The "ask the maker" loop:** the buyer's meaning question gets the L14 reply and a `question.forwarded` to the piece's maker. Her `question.answered` on the maker page is a request, and its answer is the Writer's `support.answered` on the original thread, quoting her words exactly. If the chapter 2 beat `d17-ask-maker` ships, it carries `drawer: "support"`, and its On screen IDs are `support-forwarded-<questionId>` and `support-maker-answer-<questionId>`.

### Listings and storefronts (F-seller-hub, F-storefront)

| Type | Payload | Key |
|---|---|---|
| `listing.requested` | `listingId`, `makerId`, `notes`, `lang` | |
| `listing.drafted` | `listingId`, `makerId`, `title: Text`, `summary: Text`, `facets` (as on Piece, except that `oneOfAKind` and `leadTimeDays` are optional), `hours?` (from the notes), `vibe` (as on Piece), `checks: { checkId; kind: "protocol" \| "facts" \| "price"; ok: boolean; note: Text }[]` | `b14-swarm` |
| `listing.indexed` | `listingId`, `pieceId`, `modelId`, `embedText`, `index: "cindia-drafts" \| "cindia-pieces"` (required), `point?: { x; y }` (the new vector's dot on the map), `approx?` | `b14-swarm` for the Indexer's draft. B12's publish sends its own, keyed `b12-search` |
| `storefront.requested` | `storefrontId` | |
| `storefront.drafted` | `storefrontId`, `blocks` (as on Storefront) | `b14-swarm` |
| `storefront.published` | `storefrontId`, `slug`, `blocks` (as on Storefront: the owner's working copy at the moment she publishes), all three required | |

- Listing runs use the `listingId` as `threadId`, and storefront runs the `storefrontId`.
- `storefront.published` is the owner's own decision. `storefront-publish` emits it directly, with no approval.
- **Publishing a person's listing:** when the owner grants a `listing_publish` approval for an `lst_user_` listing in live mode, the B12 adapter's `start(emit)` posts `/api/b12/publish` once and emits the returned `listing.indexed` (`index: "cindia-pieces"`, keyed `b12-search`). Scripted mode adds nothing after the grant.

### Projects and works in progress (F-communities)

| Type | Payload | Key |
|---|---|---|
| `project.funded` | `contributionId` (`ctb_01` onward), `projectId`, `amountCents`, `buyerId`, `orderId?` | |
| `wip.milestone_reached` | `wipId`, `milestoneId`, `date` | |
| `wip.milestone_paid` | `wipId`, `milestoneId`, `amountCents`, `date` | |

- `project.funded` and the `wip.*` events are applied directly. Releasing a milestone goes through an approval (`milestone_release`), which `b08-approvals` carries.

### The search model (B11, shown by F-search and F-process)

| Type | Payload | Key |
|---|---|---|
| `model.trained` | `modelId`, `baseModel`, `pairs`, `epochs`, `dims`, `hubUrl?` | `b11-embed` |
| `proof.search_scored` | `modelId`, `k: 5`, `queries`, `systems: { system: "keyword" \| "base" \| "custom" \| "hybrid"; recallAtK; mrr }[]` (`mrr` is MRR at 10) | `b11-embed` |

### The copy watch (F-watch)

| Type | Payload | Key |
|---|---|---|
| `watch.started` | `scanId`, `makerId`, `queries: string[]` | |
| `watch.scanned` | `scanId`, `engine: "apify" \| "scripted"`, `candidates` (a count), `results: { title; url; snippet; similarity: number \| null; verdict: "possible_copy" \| "claim_only" \| "neither" }[]` (every result checked, hits and non-hits alike, in the order checked, `similarity` null when no model scored it) | `b15-watch` |
| `counterfeit.flagged` | `cftId`, `scanId`, `pieceId`, `url`, `title`, `snippet`, `similarity`, `claim: Text` | `b15-watch` |

- A scan's `threadId` is its `scanId`.
- **The watch run:** the tour's scan carries `followup.drafted` `fup_02` (the Reporter's draft), then `approval.requested` `apr_03`. A person's scripted scan re-keys its hits to `cft_user_<n>`, its draft to `fup_user_<n>` and its approval to `apr_user_<n>`, so the tour's `cft_01` and `apr_03` stay as they were. A live hit never takes `cft_01`.

### Status (F-process)

| Type | Payload | Key |
|---|---|---|
| `data.synced` | `tables: { table; rows; newest: { id; label }[] }[]` (`table` one of `catalog`, `listings`, `orders`, `approvals`, `runs`, `steps`, `processes` and `screens`, with at most three newest rows, each an ID and a label built by code), `screens`, `processes: { processId; status }[]` | `b13-live` |
| `index.synced` | `indexed`, `drafts`, `elastic: boolean`, `agentBuilder: boolean` | `b12-search` |

- `data.synced` comes from the B13 adapter whenever its poll of `GET /api/b13/changes` sees a change. In scripted mode the tour's `d15-listing` beat carries one at 127.0, built from the mock data (`demoDataSync`). That is the one tour event keyed `b13-live`, and in live mode the B13 adapter answers it with `[]` at once, so the scripted one plays.
- `index.synced` comes from the B12 adapter after the seed and on each status change.
- Features never fetch, so these two events are how a process view learns the database's and the index's state.

### The demo stage (I1, I2-shell, I2-tour)

| Type | Payload | Key |
|---|---|---|
| `beat.started` | `beatId` (from `demo-script.md`), `camera: CameraId` (from `ui-contract.md`), `process?: ProcessId` (opens that process view during the beat), `drawer?: "support" \| "ask" \| "audit"` (opens that drawer) | |

- A beat may carry more than one `beat.started` with the same `beatId`, for each camera, process or drawer change inside it.
- `ProcessId` is `"search" | "swarm" | "checkout" | "money" | "reconcile" | "approvals" | "close" | "proof" | "watch" | "model" | "data"`, eleven processes in this order, listed as `PROCESS_IDS`. `ui-contract.md` gives each one's label and keys.
- I2-core owns `process`, `drawer`, their schema and their reducer (`demo.process`, `demo.drawer`). I2-tour only sets them on the tour's beats.

## The player (`src/core/player.ts`)

```ts
interface Timeline { id: string; durationMs: number; events: CindiaEvent[] } // events sorted by `at`

interface Player {
  load(timeline: Timeline): void;
  play(): void;
  pause(): void;
  reset(): void;                    // clock to 0, store cleared
  seek(ms: number): void;           // replays every event up to ms at once, without animation
  setSpeed(x: 1 | 2 | 4 | 8): void;
  now(): number;                    // the player clock, the only clock motion may use
  isPlaying(): boolean;
  epoch(): number;                  // counts loads, resets and seeks; a pending answer or a motion that started before a change drops itself
  getTimeline(): Timeline | null;   // the loaded timeline, events sorted by `at`
  durationMs(): number;             // the loaded timeline's `durationMs`, 0 with none; the demo harness writes it to report.json and the gate times the tour against it
}
```

- The player uses `requestAnimationFrame` and its own clock. Tests can drive it with `seek()`.
- Timelines live in `src/mock/timelines/`. `demo` is the demo timeline: v1's 60-second run (`durationMs` 60000) until I2-tour, then the 205-second tour (`durationMs` 205000). `month` is the fast-forward month the demo plays inside its beats.

## The store (`src/core/store.ts`)

- `emit(event)` adds an event. The player, live adapters and user actions all go through it.
- `userEvent(type, payload)` from `src/core/events.ts` builds a person's event: the next `evt_user_` ID, `at` from `player.now()`, `source: "user"`. Features use it for every tap and typed request.
- `useCindia(selector)` reads state in components, built on `useSyncExternalStore`. No other state library.
- Every reducer is idempotent per entity ID, so replaying or duplicating an event never double-counts. Replaying the whole timeline twice gives the same `log`, the same counts and the same records.
- The state holds IDs, statuses and the figures that keyed events carry in their payloads (see the payload rule at the top), under these keys: `clock`, `mode` (`"scripted" \| "live"`), `lang` (`"auto" \| "en" \| "zh"`, starting at `auto`, see `ui-contract.md`), `buyer`, `money`, `month`, `agent`, `approvals`, `close`, `proof`, `ask`, `impact`, `demo`, `scenario`, `search`, `surprise`, `support`, `swarm`, `listings`, `storefront`, `projects`, `wip`, `model`, `watch`, `sync`, `log`, and `sources` (`Record<SourceKey, "scripted" \| "live">`, the last source that delivered each key).
- The integrator writes a reducer for every event type in this file, with unit tests (the scaffolder in S1, then I2-core). Features add none.

### Store shapes

Every record is keyed by its entity ID, and every entry also keeps `at`, the player time of its event.

| Key | Shape |
|---|---|
| `search` | `queries`, `answers`, `maps` (each by `queryId`), `latestQueryId` |
| `surprise` | `asks`, `draws` (by `surpriseId`), `latestSurpriseId` |
| `support` | `threads` by `threadId`: `{ side, lang, contextIds, messages }`. A message is `{ kind: "asked" \| "answered" \| "escalated", eventId, at, ... }`, with the fields of its event. Plus `threadIds`, `latestThreadId`, and `questions` by `questionId`: `{ forwarded, answered }`, each its event's payload with `eventId` (its event's `id`) and `at`, or `null`. The maker page and the buyer's support thread both read `questions` |
| `swarm` | `runs` by `runId`: `{ threadId, stepIds, done, firstAt, lastAt }`. `steps` by `stepId`. `runIds`, `latestRunId` |
| `listings` | `requests`, `drafts`, `indexed` (by `listingId`), `latestListingId` |
| `storefront` | `requests`, `drafts` (the blocks) and `published`, each by `storefrontId`. A `published` entry is `{ slug, blocks, at }` from the newest `storefront.published` for that storefront, so the public page shows the blocks the owner published |
| `projects` | `contributions` by `contributionId`, and `addedCents` by `projectId` (raised in this run, added to the entity's `raisedCents` on screen). `addedCents` is always the sum of that project's `contributions`, never a running increment, so a repeated `project.funded` counts once |
| `wip` | `milestones` by `milestoneId`: `{ wipId, status: "reached" \| "paid", date, amountCents? }` |
| `model` | `trained` and `scored`, each the payload or `null` |
| `watch` | `scans` by `scanId`: `{ makerId, queries, engine?, candidates?, results?, startedAt, scannedAt? }`, with `results` as `watch.scanned` carries them. `hits` by `cftId`, `hitIds`, `latestScanId` |
| `sync` | `sync.data` and `sync.index`: the newest `data.synced` and the newest `index.synced`, each its payload with `at`, or `null` |
| `log` | `entries`: one `{ id, type, at, source, key }` per event, newest last, one entry per event `id`, keeping the newest 400. A status event (`data.synced`, `index.synced`) replaces the log's earlier entry of its own type instead of adding one, so live polling never pushes the tour's events out. The process views and block counts read it, and the stage reads the newest `beat.started` ID from it |
| `demo` | `beatId`, `camera`, `process: ProcessId \| null` and `drawer: "support" \| "ask" \| "audit" \| null`, all from the newest `beat.started` |
| `buyer` | v1's fields, plus `checkouts` and `cards` by `pieceId`. `card.tokenized` is filed under its `pieceId`, or under the latest `checkout.started`'s piece when the event has none. `checkout` and `card` stay as the latest of each, for v1's readers, until M-buyer moves off them |
| `approvals` | each `ApprovalState` keeps `approval?`, the inline object from `approval.requested`, stored as it arrives. M-approvals, F-watch and F-seller-hub read it when `getById()` finds nothing |

- Support messages are keyed by the event's own `id`, so a seek that replays the timeline never doubles a message.
- Each `forwarded` and `answered` entry in `support.questions` keeps its event's `id` as `eventId`, as thread messages do. A paused player gives every answer the same `at`, so F-support orders the "ask the maker" loop by each entry's place in `log`, found through `eventId`, never by `at`.
- A run's `done` turns true on its run's `support.answered`, `support.escalated`, `listing.drafted` or `storefront.drafted`. The run is found by `runId` where the payload has one, otherwise by thread: listing and storefront runs use the `listingId` or `storefrontId` as `threadId`.

## Sources and live replacement (`src/sources/`)

```ts
type SourceKey = "b01-match" | "b02-explain" | "b03-proof" | "b04-bank" | "b05-scenario"
  | "b06-workbook" | "b07-ask" | "b08-approvals" | "b09-concierge" | "b10-derived"
  | "b11-embed" | "b12-search" | "b13-live" | "b14-swarm" | "b15-watch" | "b16-bank-books";

interface LiveAdapter {
  key: SourceKey;
  health(): Promise<boolean>;                                   // GET /api/health and its own check
  produce(event: CindiaEvent, state: CindiaState): Promise<CindiaEvent[]>;
  start?(emit: (e: CindiaEvent) => void): () => void;           // optional: push events on its own schedule (B08's second screen, B13's feed, B16's checks), returns a stop function
}
```

- `SOURCE_KEYS` lists every key above. Each key's adapter is `src/sources/live/<key>.ts`, so B16's is `src/sources/live/b16-bank-books.ts`.
- The registry finds adapters in `src/sources/live/` with `import.meta.glob`. Each file `src/sources/live/bNN-<slug>.ts` default-exports one `LiveAdapter`. Adding an adapter never edits the registry.
- In live mode the registry calls `start()` on each healthy adapter that has one, and calls the returned stop function when the mode goes back to scripted.
- **Scripted mode:** every event comes from the player as written.
- **Live mode:** when the player reaches an event whose `key` has a healthy adapter, the registry calls `produce()` with the key's timeout. On success it emits the returned events with `source: "live"`. On an error, a timeout or an empty result, it emits the scripted event instead and logs why. The demo never stalls on a network call.
- **Timeouts per key:** `timeoutFor(key)` in `src/sources/` gives `produce()` 8 seconds by default, 20 seconds for `b14-swarm` and 60 seconds for `b15-watch`. Each adapter aborts its fetch 0.5 seconds earlier. The registry and the responder both use `timeoutFor`. `health()` keeps the 8-second default.
- **Arrival time:** the registry re-stamps the `at` of every event an adapter hands to `start(emit)` with `player.now()` as it arrives, in one place, `src/sources/registry.ts`, so live swarm steps and status events light up when they land. The responder does the same for answers to people.
- **Background work** an adapter starts from `start(emit)` (B13's mirror, B16's checks) is allowed when it never delays or replaces a tour event. It may add a live twin that only adds a field, like `nessieId`.
- A panel shows the `Simulated` badge while `sources[key]` for any key it renders is `"scripted"`.

### Source helpers

`src/sources/` exports these, and features and live adapters use them instead of their own:

| Helper | File | Does |
|---|---|---|
| `timeoutFor(key)` | `types.ts`, exported from `src/sources/index.ts` | The per-key timeout above |
| `pageTag()` | `ids.ts` | A 6-character tag of lowercase letters and digits, made on the first call from `crypto.getRandomValues` and the same for the page's whole life. Only live adapters call it, so scripted mode never uses a random value |
| `answerId(prefix)` | `ids.ts` | The next ID for a scripted answer to a person, `<prefix>_user_<n>`. Numbers are reserved per prefix the moment an answer is planned, so two answers pending at once never share one. They start over at 1 when the player's epoch changes, which is when a reset or seek drops the store's person-made records |
| `liveIdStart(prefix, count)` | `ids.ts` | Reserves `count` numbers for a live run and returns the first, sent as `idStart`. Live IDs are `<prefix>_user_<pageTag()>_<n>`, and these numbers never start over within a page, so SpacetimeDB rows from an earlier epoch never collide with new ones |
| `extractKeywords(text, vocab?)` | `keywords.ts`, exported from `src/sources/index.ts` | The keyword chips and filters, by `data-model.md`'s keyword chip rule. `vocab` defaults to the catalog's, built once from `src/mock/`; tests pass their own |
| `scoreKeywords(keywords, filters, index, pieces)`, `keywordVocab(index, aliases, pieces?)` | `keywordSearch.ts` | The scripted keyword scorer and its vocabulary, by `data-model.md`'s rule. `pieces` defaults to the catalog's `pieces` |
| `drawSurprise({ keyword?, method, seed }, index, pieces)`, `mulberry32(seed)` | `surprise.ts` | The surprise draw, by `data-model.md`'s rule, or `null` when the index has no active piece. B12's Python port is tested against both |
| `planRun(run, request, ids, opts?)` | `scriptedSwarm.ts` | Turns a `ScriptedRun` into planned `{ offset, event }` pairs, with the timing and re-keying below. `ids(prefix)` is `answerId()` in the request's epoch. `opts` carries the thread for a maker's answer, the quote to replace, the scripted approvals for the inline copy, and IDs that become the request's own (`qst_01` to the person's question) |

## Requests from people

Some events start from a person, not the timeline: the buyer typing their own request, the owner asking Cindy, a judge dropping in a file, a search, a support question, a maker's notes, a scan. The feature emits the request with `userEvent()`, so it has `source: "user"` and no `key`. The sources registry picks the key from the table below by event type, and answers it.

| Request | Key | Scripted answer | Live answer |
|---|---|---|---|
| `concierge.asked` | `b09-concierge` | `concierge.answered` with the curated set from `src/mock/` (`pc_01`, `pc_07`, `pc_11` for any request) | the B09 adapter |
| `ask.asked` | `b07-ask` | `ask.answered` from `src/mock/ask.ts`: the canned answer whose question matches, or else one saying scripted mode answers the three demo questions | the B07 adapter |
| `scenario.loaded` | `b05-scenario` | the held-back statement's `record.arrived`, `match.made` and `flag.raised` events from `src/mock/scenario.ts`. For a person's own file, the same sample answer plus an `agent.acted` line saying scripted mode reads the sample and live mode reads their file | the B05 adapter, which parses `content` when a person sent their own file |
| `approval.granted`, `approval.declined` | `b08-approvals` | nothing more, the store has already applied it, except a grant on a `milestone_release` (its own row below) | the B08 adapter forwards it to the server, so the other screen sees it, then returns `[]`, so the scripted answer to that decision plays |
| `search.queried` | `b12-search` | `demoSearch.answer` from `src/mock/search.ts`, with the request's `queryId`, only when the text, the keywords and the filters all equal `demoSearch.query`'s. Anything else, a refined chip or a price cap included, gets the keyword scorer over `searchIndex` with the request's filters applied, engine `keyword_scripted`. The text is compared after normalization, the keywords as a set, and the filters with an empty `communityIds` left out. When `report` in `src/mock/model.ts` isn't null, a `search.mapped` follows 300 ms later: every piece's point from the report, the query at the score-weighted center of its top three results (at the center of every point when there is no result), and `approx: true` | the B12 adapter |
| `surprise.asked` | `b12-search` | `drawSurprise` with the request's fields (`data-model.md`'s surprise draw) | the B12 adapter |
| `support.asked` | `b14-swarm` | the first run in `swarmRuns` whose trigger is `support`, on the same side, with a `matches` entry equal to the normalized text, and whose `pieceId` and `makerId`, when set, are among the request's `contextIds`. Otherwise `fallbackSupportRun`, which replies L16, so the d04 question asked on another piece's page gets the fallback and no `pc_01` reference. A run that forwards a question (`run_07`) re-keys its `question.forwarded` to `qst_user_<n>` on the request's `threadId`, with the request's own `text` and `lang`, and its L14 reply lands on the same thread | the B14 adapter |
| `question.answered` | `b14-swarm` | the run whose `question` trigger names the question (`run_09` for `qst_01`), or for any other question whose `forwarded` entry `support.questions` holds and that no run names, such as a person's `qst_user_<n>`, `run_09`'s relay. Either way the Writer's `support.answered` lands on the question's original thread, `support.questions[questionId].forwarded.threadId` (`run_09`'s own `thr_03` when the store holds no forward for `qst_01`), with her own text in place of `ans_01`'s wherever the reply quotes it. A question no run names and the store doesn't hold gets no answer | none yet: the B14 adapter returns `[]` until the live loop lands, so the scripted relay plays in both modes |
| `listing.requested` | `b14-swarm` | the run whose `listing` trigger's normalized notes equal the request's (`lst_01`'s run), or else `fallbackListingRun`, a draft labeled as a sample. Either way re-keyed to the request's `listingId`, and ending with its own `apr_user_<n>`, whose inline approval is a `listing_publish` for the person's listing. It never re-emits `apr_04` | the B14 adapter |
| `storefront.requested` | `b14-swarm` | the Designer run whose trigger names the request's `storefrontId` (`run_03` for `sto_01`), with its drafted blocks re-keyed to `blk_user_<n>`. Any other storefront gets no scripted draft, because the Designer drafts only the seller's own storefront | the B14 adapter |
| `watch.started` | `b15-watch` | from `scriptedScan` in `src/mock/watch.ts`: `watch.scanned` at offset 0 (engine `scripted`, `candidates` as the count, and `results` with every checked candidate from `counterfeitCandidates`, its title, URL, snippet, similarity and verdict), then one `counterfeit.flagged` per `cftIds` entry, 300 ms apart, with the request's `scanId`, re-keyed to `cft_user_<n>`, then `followup.drafted` for `followUpId` re-keyed to `fup_user_<n>` when it's set, then `approval.requested` for `approvalId` re-keyed to `apr_user_<n>`, its inline approval naming the person's hits, when it's set | the B15 adapter |
| `piece.opened` | `b10-derived` | `split.shown` from `splits[pieceId]` (`pc_01`'s equals figure 1, with figure 16's comparison) | none: the B10 adapter returns `[]` for it, so the scripted answer plays in both modes |
| `checkout.started` on any piece but the loaded timeline's own | none, through a keyless path that skips the adapters | `card.tokenized` (the piece's `pieceId`, a token made from the piece ID with no randomness, last four 4242), `order.placed` `ord_user_<n>` on `ch_cindia` with the figures of `splits[pieceId]`, buyer `buy_01` and date `2026-10-01` (the demo's decision day, after September closed), and `receipt.updated` with status `received` and the piece's maker, 300 ms apart. A piece with no split gets only the card. These orders stay out of the month, the ledger and the money map, and the tour's own card and checkout stay on their piece | none |
| `wip.milestone_reached` (date always `2026-10-01`) | `b08-approvals` | `agent.acted` (a proposal, `act_reply_<n>`) and `approval.requested` for the `milestone_release` approval whose subjects name that commission and milestone, `apr_05` for `wip_01`'s second milestone. Any other milestone gets only the `agent.acted` line | none: the scripted answer plays in both modes |
| `approval.granted` on a `milestone_release` (found through `getById()` or the stored inline approval) | `b08-approvals` | `wip.milestone_paid` and a `money.moved` of kind `milestone`, Cindia to the maker, `mv_user_<n>`, `refId` the milestone, dated `2026-10-02`, for that milestone's share of the commission's price (half up). Only once per approval, only while the store holds it as granted, and never for a milestone already paid | B08 forwards the decision and the scripted answer plays. B16 then posts the move as a withdrawal from `Commissions held by Cindia`, and its `from` stays Cindia |

- `REQUEST_KEYS` in `src/core/events.ts` maps every request row above to its key. `checkout.started` is the one keyless request. `support.escalated` and `question.forwarded` are answers, never requests. A row whose scripted answer isn't written yet answers with nothing, as an unknown request does.
- The scripted answer arrives 1.2 seconds later in real time, with a timer, so it reads as Cindy working. This is the one wall-clock wait in the site: it answers a person, and the player may be paused or past the timeline's end when they ask. The answer's `at` is the player clock when it's delivered.
- **Planned runs:** `planRun` starts its offsets at 0 and the responder adds the 1.2 seconds, so the first step lands 1.2 seconds after the request. Each step comes 300 ms after the one before, and each `final` event 300 ms after the one before it, the first 300 ms after the last step. The run takes the request's `threadId`.
- **Re-keying a person's run.** Any ID the scripted record names that would collide with the tour's is replaced through `answerId()`: the run, its steps and checks, a listing's `listingId` (the request's) and its `pc_user_<n>`, a storefront's `storefrontId` (the request's) and its drafted blocks (`blk_user_<n>`), a forwarded question (`qst_user_<n>`), counterfeit hits, follow-ups and approvals. A re-keyed `approval.requested` carries the inline `approval` object, copied from the scripted approval's record with `subjectIds` naming the person's own records. So a person never sees `apr_03`, `apr_04`, `cft_01` or `qst_01` reused. `data-model.md` lists every prefix.
- For a `question` run answering a person's own `question.answered`, her `text` takes the place of `ans_01`'s text wherever the run's reply quotes it, so `run_09` relays her words and never the scripted answer.
- Every answer event carries the request's key, as the v1 answers do. The keyless `checkout.started` answer carries none, and neither does Cindy's `agent.acted` line in an answer, as v1's own-file note doesn't.
- Texts are matched after the same normalization the v1 responder applies to questions.
- In live mode the registry tries the adapter first, with the key's timeout and the scripted answer as the fallback. Live mode answers people's own requests only: B14 and B15 replace no tour run and prefetch nothing.
- The demo timeline's own request events (`concierge.asked`, `ask.asked`, `search.queried`, `support.asked` and the rest) carry `source: "scripted"` and their answers are already in the timeline, so the registry doesn't answer those.
- Live adapters call only `/api/...` on localhost. Keys stay on the server.

## Validation

- `src/core/validate.ts` checks an event's type and payload against this file, without a new dependency. The schemas take every field in the tables above, the optional ones included, and check each one: a `watch.scanned` result's `similarity` may be `null`, and `listing.indexed` without `index`, `question.answered` without `answerId` or `storefront.published` without `blocks` is a problem.
- `surprise.drawn`'s weights must sum to 1 within 0.003, so weights rounded to 4 decimals pass for up to 60 candidates (all 54 pieces for `pure_random`). The scripted draw keeps them unrounded.
- `npm run check` validates every scripted timeline, and G2 and G2b fail on any invalid event.
- An event type or field that isn't in this file is a contract change: it goes to the integrator under `needs:`.
