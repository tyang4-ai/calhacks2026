# I2-core · v2 contracts, core types, store, sources and server config

Priority: P0 · Wave: V1 · Depends on: R0-reskin, committed with every v1 check green · Area: `docs/common/`, `src/core/`, `src/sources/` (not `live/`), the server skeleton, `scripts/` · Owner: integrator, plus one feature-lead and one data-smith for the fallout step · Gate: core (`npm run check`, `npm run test:smoke`, `npm run test:demo` and `npm run test:server`, tag `v2-core`) after the first spawn and the fallout step, then G1b together with I2-kit and I2-shell

**I2-core runs after R0-reskin.** R0 (`docs/plans/R0-reskin.md`) moves v1's whole money story to the Diné Weaving and Silver Co-op in one commit. I2-core starts only once that commit is in, so every name in this plan and in what it writes is scope C: the studio `std_dine`, the communities `com_dine`, `com_ojibwe`, `com_acoma` and `com_seminole`, the owner Ruth B. and the makers Grace N., Lena T. and Mae K. Cindia is a platform in every line T1 writes.

SCOPE: docs/common/, src/core/, src/sources/*.ts, src/app/, server/__init__.py, server/config.py, server/main.py, server/services.py, server/requirements.txt, tests/server/conftest.py, tests/demo/harness.ts, scripts/export-mock.mjs, scripts/gate.mjs, scripts/test-feature.mjs, scripts/server.mjs, scripts/secrets-scan.mjs, scripts/server_selftest.py, scripts/lib/, vite.config.ts, package.json, package-lock.json

`src/app/` is in this SCOPE only for type fallout: when a widened union breaks an exhaustive record or a switch in the shell, add the missing keys with placeholder entries and nothing else. The shell's real v2 work is I2-shell. `tests/demo/harness.ts` is in it only for the one `report.json` field in T7.

**Two integrator spawns, with a fallout step between them.**
1. **First spawn** (integrator): T1 to T4, T6 and T7. It ends when `npm run check:scope -- src/core/ src/sources/ src/app/ scripts/` exits 0, then reports.
2. **Fallout step**, as soon as the first spawn reports (B1-1). The orchestrator spawns FO1 (a feature-lead) and FO2 (a data-smith) at the same time, with the headers in "The fallout step" below. When both report, it runs the core gate's four commands (contracts section 10): `npm run check`, `npm run test:smoke`, `npm run test:demo` and `npm run test:server`. Then it commits all three spawns' work as `I2-core: v2 contracts and core` and tags it `v2-core`. Once that commit lands, uvicorn reloads `config.py`, so the orchestrator reads `/api/health` again before it trusts `keys.anthropic` (D2-10).
3. **Second spawn** (integrator): T5, then T8, the scripted responders. It starts only after S3-catalog's T1 has committed typed stub files for every `src/mock/` module the responders read (the table in Interfaces). Its SCOPE line is `src/sources/*.ts`. It writes no type: every shared type lands in T2, so S3 builds against a fixed `src/core/types.ts`. A type it finds missing goes under `needs:`. The orchestrator commits it on its own `npm run check:scope -- src/sources/` pass (B1-20), because S3's data-smith is mid-edit at that time.

## Goal

Every v2 name in `docs/v2/contracts.md` becomes real in two places, in one commit:
- in `docs/common/`, which is the truth again from this commit on,
- in the shared code every v2 feature and upgrade imports: types, events, reducers, validation, navigation, sources, the server's config and health, the mock export and the gate.

The site still looks and plays exactly like v1 after R0. `npm run test:demo` keeps passing on the v1 timeline.

## Read first

- `docs/v2/contracts.md`, all of it, sections 11 and 12 included. It's what you merge.
- `docs/v2/fix-plan.md` sections 1.4 (models, G5 for v2) and 1.9 (page tags, the gate's time rule), for the reasons behind T4, T6 and T7.
- `docs/plans/R0-reskin.md`, for the names now in the code.
- `docs/v2/brief.md` for the reasons behind the rest.
- `docs/common/conventions.md`, `events.md`, `data-model.md`, `ui-contract.md`, `api-contract.md`, `design-system.md`, `demo-script.md`, `definition-of-done.md`, `glossary.md`: what you edit.
- The code you change:
  - `src/core/types.ts`, `events.ts`, `featureTypes.ts`, `state.ts`, `reducers/`, `validate.ts`, `testFixtures.ts`,
  - `src/sources/types.ts`, `registry.ts`, `requests.ts`, `index.ts`, `mockAnswers.ts`,
  - `src/app/strings.ts`, `lang.ts`, `featureLoader.ts`, `surfaces/views.ts`, `demo/cameras.ts`, `demo/cameras.test.ts`, `demo/DemoStage.tsx`, `demo/EndCard.tsx`,
  - `server/config.py`, `server/main.py`, `tests/server/conftest.py`, `scripts/server_selftest.py`, `scripts/server.mjs`,
  - `scripts/gate.mjs`, `scripts/test-feature.mjs`, `scripts/secrets-scan.mjs`, `scripts/lib/common.mjs`, `tests/demo/harness.ts` (the end of `playDemo()`), `vite.config.ts`.
- `docs/harness/lessons.md`, for gotchas from v1.

## Interfaces

**Reads:** nothing at runtime beyond what v1 read. The responders (T5, T8) read the `src/mock/` exports in the table below through `import.meta.glob`, so the build passes before S3-catalog fills them.

### Exports added to `src/core/`

**Types (`types.ts`):**
- the entities in contracts section 2: `Community`, `Project`, `WorkInProgress`, `Milestone`, `Storefront`, `StorefrontBlock`, `ListingDraft`, `AgentSpec` (with `model?` limited to `"claude-haiku-5-5" | "claude-sonnet-5-5"`), `SearchQuery`, `CounterfeitCandidate`, `IndexEntry`, `Facets`, `Vibe`,
- the changed `Person` and `Piece` (`Piece` gains `communityId`, `facets`, `vibe` and `imageAlt`, all required, which is why the fallout step exists),
- `ApprovalKind` with v1's two kinds and section 2's new ones, and the ID string aliases.

**The shared shapes** the data-smith's stubs and the responders both use (`types.ts`). Section 11 names these types without fields, so their fields are set here (D1 "Names used in plans that no contract defines"):

```ts
// One event a scripted run plays, without id, source, key or at.
type PlannedEvent = { type: EventType, payload: object }

type ScriptedRun = {
  runId: string,                       // run_01 onward
  side: "buyer" | "seller",
  threadId: string,                    // thr_01 onward, the listingId, the storefrontId, or thr_00 for a fallback
  trigger:
    | { kind: "support", matches: string[], pieceId?: string, makerId?: string }   // matches: normalized en and zh texts
    | { kind: "listing", listingId: string, notes: string }      // matched on the normalized notes
    | { kind: "storefront", storefrontId: string }
    | { kind: "question", questionId: string },                  // the "ask the maker" relay
  steps: Omit<Payloads["swarm.step"], "threadId">[],
  final: PlannedEvent[],               // in order: the run's last events, approvals and follow-ups included
}

type ModelReport = { trained: Payloads["model.trained"], scored: Payloads["proof.search_scored"], points: { pieceId: string, x: number, y: number }[] }
type DemoSearch = { query: Omit<Payloads["search.queried"], "queryId">, answer: Omit<Payloads["search.answered"], "queryId"> }
type DemoSurprise = { ask: Omit<Payloads["surprise.asked"], "surpriseId">, draw: Omit<Payloads["surprise.drawn"], "surpriseId"> }
type ScriptedScan = { scanId: string, makerId: string, queries: string[], cftIds: string[], followUpId?: string, approvalId?: string }
type PolicyTopic = { id: string, title: Text, body: Text, data?: Record<string, string | number> }   // pol_01 onward
type Policy = PolicyTopic[]
```

- `ScriptedRun.final` is a list (B1-8, D1-12). The listing run ends with `listing.drafted`, `listing.indexed` and `approval.requested` `apr_04`. The watch scan carries `followup.drafted` `fup_02` before `approval.requested` `apr_03`.
- `trigger.pieceId` names the piece a buyer run talks about. The responder plays that run only when the question's `contextIds` include it (A2-10).
- `trigger.makerId` works the same way for a maker: the run plays only when the question's `contextIds` include that maker. So `run_04` and `run_10`, which name `mkr_01`, answer only on Grace N.'s pages, and the seller drawer anywhere else gets the fallback (S3-catalog).
- `DemoSearch.query` has no `queryId`. The tour's timeline adds `qry_01` (D1-49).
- `Policy` is the list of topics section 11 gives, never three `Text` fields (B1-9, D1-11). `pol_01` holds `{ transitDaysMin: 6, transitDaysMax: 10 }`.

**Events (`events.ts`):**
- every new event type and payload in contracts sections 3 and 11, named here where this plan relies on them:
  - `question.forwarded` `{ questionId, threadId, makerId, pieceId, text, lang }` and `question.answered` `{ questionId, answerId, makerId, text, lang }`, the "ask the maker" loop (C-13),
  - two status events, because features never fetch: `data.synced` keyed `b13-live`, `{ tables: { table, rows, newest: { id, label }[] }[], screens, processes: { processId, status }[] }`, and `index.synced` keyed `b12-search`, `{ indexed, drafts, elastic, agentBuilder }`,
  - `watch.scanned` gains `results: { title, url, snippet, similarity: number | null, verdict }[]`, with `similarity` null when no model scored the result and `verdict` one of `"possible_copy"`, `"claim_only"` and `"neither"`, so the watch lists every checked result and not only the hits,
  - `storefront.requested` `{ storefrontId }` (D1-6),
  - `storefront.published` `{ storefrontId, slug, blocks }`, with `blocks` as on `Storefront`, the owner's working copy at the moment she publishes. Its type and schema require all three, so the public page shows what she published (B1-43, F-storefront),
  - `card.tokenized` gains `pieceId` (B1-34),
  - `split.shown` gains `compare?: { channelId: "ch_gallery", commissionBps, makerShareCents }`, what the maker would get through the gallery (figure 16),
  - `search.answered` results gain `closeness?` (0 to 1), and the payload gains `closeMatches?`, `keywords?`, `filters?` and `keywordsBy?: "finder" | "rules"`,
  - `listing.indexed` carries `index: "cindia-drafts" | "cindia-pieces"`, required, plus `point?: { x, y }` and `approx?`,
  - `flag.raised` gains `nessieId?: string`, set only by B16,
  - `approval.requested` gains `approval?: InlineApproval`, where `InlineApproval` is `{ kind, subjectIds, amountCents?, overLimit, proposedBy: "cindy", summary: Text, decisionDate }`. `decisionDate` is there because the v1 `Approval` record has one (B1-15),
  - `search.mapped` gains `approx?: boolean`,
  - `beat.started` gains `process?: ProcessId` and `drawer?: "support" | "ask" | "audit"`. I2-core owns both fields and `demo.drawer`. I2-tour T2 only checks them (B1-38),
- any other type or field section 3 adds gets its type, schema and reducer here too. The schemas take section 3's final fields, the optional ones above included, and T4's validation checks each one,
- `SourceKey` with `b11-embed` to `b15-watch` and every other key section 3 lists, and `SOURCE_KEYS` with all of them,
- `ProcessId` with `data` (11 processes) and `PROCESS_IDS`, in the order of section 4's process table,
- `MoneyMoveKind` with `project_fund` and `milestone`, and `Party.kind` with `community_fund`,
- `REQUEST_KEYS` for every request row in sections 3 and 11 (D1-6): `search.queried` and `surprise.asked` on `b12-search`, `support.asked`, `listing.requested` and `storefront.requested` on `b14-swarm`, `watch.started` on `b15-watch`, `piece.opened` on `b10-derived`, `wip.milestone_reached` on `b08-approvals`, and `question.answered` on `b14-swarm`, because the Writer relays the maker's answer. `checkout.started` stays keyless. T2 adds them all, so the second spawn never edits `events.ts`. Until T5 and T8 land, each of these answers with nothing, which is what v1 does for an unknown request.

**Feature types (`featureTypes.ts`):**
- `SurfaceId` adds `"store"`.
- `SlotId` and `SLOT_IDS` add the slots in contracts section 4.
- `SlotProps` adds `processId?`, `pieceId?`, `communityId?`, `projectId?`, `orderId?`, `slug?`, `side?` and `searchParams?: { q?: string, k: string[] }`, with `k` required inside it as section 11 says (D1-28). `refId?` now also serves `owner.main`. `publicSite?: boolean` is true only on the public build, where I2-shell sets it on every slot and the features that sell show A2's L6 in place of Pay (fix-plan 1.8).
- `SellView` and `SELL_VIEWS` are the eleven Sell views in route order. `StudioView` stays as the v1 five until I2-tour, so nothing in v1 breaks.
- `TourCameraId` is the cameras in contracts section 4, `pitch` included, plus `shop-legacy` (`frame-buyer` on `/shop/legacy`) until I2-tour T3 removes it (B1-3, D1-3). `LegacyCameraId` is v1's eight.
- `CameraId` is both, until I2-tour drops the legacy ones. `LEGACY_CAMERA_IDS` and `TOUR_CAMERA_IDS` list each set, and `CAMERA_IDS` is both, which `validate.ts` uses for `beat.started.camera`.
- `LEGACY_CAMERA_TO_TOUR` and `toTourCamera(id)` carry the Phase A mapping: `buyer` and `receipt` to `shop-legacy`, `buyer-studio` to `sell-map`, `studio-month` to `sell-month`, `studio-catch` to `sell-catch`, `studio-owner` to `sell-approvals`, `studio-close` to `sell-close`, `maker` to `maker`.

**Navigation (`nav.ts`, B1-2, D1-1):**
- the route builders section 11 lists: `shopRoute()`, `searchRoute({ q, k })`, `pieceRoute(pieceId)`, `communityRoute(communityId)`, `projectsRoute(id?)`, `receiptRoute(orderId)`, `storeRoute(slug)`, `sellRoute(view, { drawer?, ref? })`, `makerRoute(makerId)`. Query values are URI-encoded, and `k` repeats once per keyword.
- `navigate(path)`, `setProcess(processId | null)` and `openDrawer("ask" | "audit" | "support", ref?)`.
- `registerNavigator(impl)` takes `{ navigate, setProcess, openDrawer }` and returns a function that unregisters it. I2-shell T1 registers a router version and a `/demo` version.
- Until a navigator is registered, the three calls are safe no-ops: they do nothing and never throw. Features never touch `window.location`.

**State (`state.ts`):** the new store keys below.

### The store keys

Every record is keyed by its entity ID, and every entry also keeps `at`, the player time of its event.

| Key | Shape |
|---|---|
| `search` | `queries`, `answers`, `maps` (each by `queryId`), `latestQueryId` |
| `surprise` | `asks`, `draws` (by `surpriseId`), `latestSurpriseId` |
| `support` | `threads` by `threadId`: `{ side, lang, contextIds, messages }`. A message is `{ kind: "asked" \| "answered" \| "escalated", eventId, at, ... }`, with the fields of its event. Plus `threadIds`, `latestThreadId`, and `questions` by `questionId`: `{ forwarded, answered }`, each its event's payload with `eventId` (its event's `id`, as thread messages keep) and `at`, or `null`. The maker page and the buyer's support thread both read `questions` |
| `swarm` | `runs` by `runId`: `{ threadId, stepIds, done, firstAt, lastAt }`. `steps` by `stepId`. `runIds`, `latestRunId` |
| `listings` | `requests`, `drafts`, `indexed` (by `listingId`), `latestListingId` |
| `storefront` | `requests`, `drafts` (the blocks) and `published`, each by `storefrontId`. A `published` entry is `{ slug, blocks, at }` from the newest `storefront.published` for that storefront, so the public page shows the blocks the owner published (B1-43) |
| `projects` | `contributions` by `contributionId`, and `addedCents` by `projectId` (raised in this run, added to the entity's `raisedCents` on screen). `addedCents` is always the sum of that project's `contributions`, never a running increment, so a repeated `project.funded` counts once (B1-44) |
| `wip` | `milestones` by `milestoneId`: `{ wipId, status: "reached" \| "paid", date, amountCents? }` |
| `model` | `trained` and `scored`, each the payload or `null` |
| `watch` | `scans` by `scanId`: `{ makerId, queries, engine?, candidates?, results?, startedAt, scannedAt? }`, with `results` as `watch.scanned` carries them. `hits` by `cftId`, `hitIds`, `latestScanId` |
| `sync` | `data` and `index`: the newest `data.synced` and the newest `index.synced`, each its payload with `at`, or `null` |
| `log` | `entries`: one `{ id, type, at, source, key }` per event, newest last, one entry per event `id`, keeping the newest 400 (B1-15, D1-2). The process views and block counts read it, and the stage reads the newest `beat.started` ID from it, so it lands in the first spawn (T3). A status event (`data.synced`, `index.synced`) replaces the log's earlier entry of its own type instead of adding one, so live polling never pushes the tour's events out |
| `demo` | gains `process: ProcessId \| null` and `drawer: "support" \| "ask" \| "audit" \| null`, both from `beat.started` |
| `buyer` | gains `checkouts` and `cards` by `pieceId` (B1-34). `card.tokenized` is filed under its `pieceId`, or under the latest `checkout.started`'s piece when the event has none. `checkout` and `card` stay as the latest of each, for v1's readers, until M-buyer moves off them |
| `approvals` | each `ApprovalState` gains `approval?`, the inline object from `approval.requested`, stored as it arrives (D1-16). M-approvals, F-watch and F-seller-hub read it when `getById()` finds nothing |

- Support messages are keyed by the event's own `id`, so a seek that replays the timeline never doubles a message.
- Each `forwarded` and `answered` entry in `support.questions` keeps its event's `id` as `eventId`, as thread messages do. A paused player gives every answer the same `at`, so F-support orders the "ask the maker" loop by each entry's place in `log`, found through `eventId`, never by `at`.
- A run's `done` turns true on its run's `support.answered`, `support.escalated`, `listing.drafted` or `storefront.drafted`. The run is found by `runId` where the payload has one, otherwise by thread: listing and storefront runs use the `listingId` or `storefrontId` as `threadId`.
- Replaying the whole timeline twice gives the same `log`, the same counts and the same records.

### Exports added to `src/sources/`

**From T4 (first spawn):**
- `timeoutFor(key)`: 8000 ms by default, 20000 for `b14-swarm`, 60000 for `b15-watch`. The registry's `produce()` and the responder's adapter call both use it, so `index.ts` passes `timeoutFor` to the responder instead of one `timeoutMs` (B1-33, D2-31). `health()` keeps the 8-second default.
- `ids.ts` (fix-plan 1.9, D1-21):
  - `pageTag()`: a 6-character tag of lowercase letters and digits, made on the first call from `crypto.getRandomValues` and the same for the page's whole life. Only live adapters call it, so scripted mode never uses a random value.
  - `answerId(prefix)`: the next ID for a scripted answer to a person, `<prefix>_user_<n>`. Numbers are reserved per prefix the moment an answer is planned, so two answers pending at once never share one. They start over at 1 when the player's epoch changes, which is when a reset or seek drops the store's person-made records.
  - `liveIdStart(prefix, count)`: reserves `count` numbers for a live run and returns the first. Live IDs are `<prefix>_user_<pageTag()>_<n>`. These numbers never start over within a page, so SpacetimeDB rows from an earlier epoch never collide with new ones.
- **Arrival time for streamed events** (B2-14): the registry re-stamps the `at` of every event an adapter hands to `start(emit)` with `player.now()` as it arrives, so live swarm steps and status events light up when they land. This happens in one place, `src/sources/registry.ts`. The responder already does the same for answers to people.

**From T5 and T8 (second spawn):**
- `keywords.ts`: `extractKeywords(text)` returns `{ keywords: string[], filters: { maxPriceCents?: number } }`, building its vocabulary with `keywordVocab()`. Exported from `src/sources/index.ts`.
- `keywordSearch.ts`:
  - `scoreKeywords(keywords, filters, index, pieces)` returns at most 12 results, best first, with `score` from 0 to 1, `matched` and a `reason` as `Text`. The score is the share of the request's keywords (the price chip left out) found in the piece's facets or vibe. Pieces that score 0 are left out. The filters (`maxPriceCents`, `communityIds`) apply before ranking. Ties sort by `pieceId`.
  - `keywordVocab(index, aliases)` builds the vocabulary from every facet and vibe word in the index, plus `keywordAliases`.
- `surprise.ts`:
  - `mulberry32(seed)` is exported, so B12's Python port is tested against it (B1-38, D1-36).
  - `drawSurprise({ keyword?, method, seed }, index, pieces)` returns the `surprise.drawn` payload without `surpriseId`. The rules are below.
- `scriptedSwarm.ts`: `planRun(run, request, ids)` turns a `ScriptedRun` into planned events. Offsets start at 0, and the responder adds its 1.2-second wait, so the first step lands 1.2 seconds after the request, as in v1 (B1-32):
  - each step 300 ms after the one before, the first at offset 0,
  - each `final` event 300 ms after the one before it, the first 300 ms after the last step,
  - `threadId` from the request, and every ID the person's run needs re-keyed through `answerId()`. The re-keying rules are in "The responders in detail".
  - for a `question` run answering a person's own `question.answered`, her `text` takes the place of `ans_01`'s text wherever the run's reply quotes it, so `run_09` relays her words and never the scripted answer.

### The mock exports the responders read

S3-catalog writes them. S3's T1 stubs cover every file in this table.

| File | Exports | Read by |
|---|---|---|
| `catalog.ts` | `pieces` | T5, T8 |
| `searchIndex.ts` | `searchIndex`, `keywordAliases` (a word or phrase people type, mapped to the vocabulary term, such as `mom` to `gift for mom`) | T5 |
| `search.ts` | `demoSearch`, `demoSurprise` | T5 |
| `swarm.ts` | `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun` | T5, T8 |
| `watch.ts` | `counterfeitCandidates`, `scriptedScan` | T5 |
| `model.ts` | `modelId`, `report` | T5 |
| `splits.ts` | `splits`: a record by `pieceId` of `split.shown` payloads, `pc_01` equal to figure 1 (D1-6) | T8 |
| `projects.ts` | `projects`, `worksInProgress` | T8 |
| `listings.ts` | `listings` | T5 |
| `index.ts` | `getById()`, which finds `apr_03`, `apr_04`, `apr_05` and `fup_02` wherever S3 keeps them. `allApprovals` (`apr_01` to `apr_05`) and `allFollowUps` (`fup_01`, `fup_02`) hold the same records as named exports, so `mock.json` carries them | T5, T8 |

### Server

- **`server/config.py`** reads the process environment first, then `.env` with `override=False`. It exposes:
  - `ANTHROPIC_API_KEY` (from `CINDIA_ANTHROPIC_API_KEY`, falling back to `ANTHROPIC_API_KEY`), `NESSIE_KEY`,
  - `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `ELASTIC_AUTH`,
  - `APIFY_TOKEN`, `APIFY_AUTH`, `HF_TOKEN`, and `HF_REPO` (from `CINDIA_HF_REPO`, the private model repo B11 publishes to and fetches from, not secret, default unset),
  - `SPACETIME_URL` (default `http://127.0.0.1:3000`), `SPACETIME_DB` (default `cindia`), `SPACETIME_TOKEN` (the publisher's token, fix-plan 1.9),
  - `PUBLIC_SITE_URL` (not secret, default unset), `MODEL_DIR` (from `CINDIA_MODEL_DIR`, default `models/cindia-embed-v1` under the repo root),
  - `MODEL_DEFAULT = "claude-sonnet-5-5"`, `MODEL_FAST = "claude-haiku-5-5"` and `ALLOWED_MODELS`, which holds exactly those two. `MODEL_TOP` is gone: no Opus and no other model anywhere in the platform (fix-plan 1.4),
  - `CLAUDE_BASE_URL = "https://api.anthropic.com"`, a constant that never comes from the environment. Every v2 Claude client passes it as `base_url` (D2-25).

  It also exposes:
  - `has_key(name)`, which reads this module's resolved attributes at call time, never `os.environ` (D2-29), so a test that sets `config.ANTHROPIC_API_KEY = None` sees `false`:
    - `ELASTIC_API_KEY` counts as set with a key, or with `ELASTIC_AUTH=proxy`, and only when `ELASTIC_URL` is set too.
    - `APIFY_TOKEN` counts as set with a token or with `APIFY_AUTH=proxy`.
    - `ANTHROPIC_API_KEY` counts as set when either name is set.
  - `elastic_headers()`, `apify_headers()` and `spacetime_headers()`. Each returns the auth header, or an empty dict in proxy mode or with no token. Upgrades use these instead of reading keys themselves.

  Nothing prints, logs or returns a value.
- **`server/services.py`:**
  - `spacetime_reachable()`: any HTTP answer from `SPACETIME_URL` within 300 ms, cached for 10 seconds.
  - `model_present()`: `MODEL_DIR` exists and holds `modules.json`.
- **`server/main.py`:**
  - `GET /api/health` returns `keys: { anthropic, nessie, elastic, apify, hf }` and `services: { spacetime, model }` as booleans, beside v1's `ok`, `version` and `routers`.
  - When a router fails to import, the log line names the missing module for an `ImportError` (its `name`), next to the exception's type, and never the message (B2-10).
  - The `httpx` and `httpcore` loggers are set to WARNING, so no full URL (Nessie's carries `?key=`) is ever logged. Nothing calls `logging.basicConfig` (B2-34).
- **`tests/server/conftest.py`:**
  - `needs_service(name)` for `spacetime` and `model`, next to `needs_key`.
  - An autouse fixture swaps every key attribute in `config` for a fake value and clears `ELASTIC_AUTH` and `APIFY_AUTH`, for every test not marked `live`. A test that needs a missing key sets it to `None` itself, as the v1 tests already do. Live tests keep the real values, and never assert on headers or print a request (B2-23).
- **`scripts/server_selftest.py`** (D2-9), which `npm run test:server` runs after pytest:
  - `keys` holds exactly the five names and `services` exactly the two, all booleans.
  - It scans `server/`, `src/` and `scripts/` (test files left out) for strings shaped like a Claude model ID (`claude-<name>-<n>`) and fails on any that isn't in `config.ALLOWED_MODELS`, naming the file. This is the test fix-plan 1.4 asks for. Today's code passes it: only `claude-sonnet-5-5` and `claude-haiku-5-5` appear.
- **`scripts/server.mjs`** starts uvicorn with `--timeout-graceful-shutdown 3`, so an open response can't hang a reload (D2-15), and with `HF_HUB_OFFLINE=1` and `ANTHROPIC_BASE_URL=https://api.anthropic.com` in its environment. The server never calls the Hugging Face Hub. `fetch_model.py` (B11) is the only way a model arrives. The pinned base URL also covers v1's routers without editing them.
- **`server/requirements.txt`** adds pinned versions you pick and record in your report: `sentence-transformers`, `torch` (CPU), `numpy`, `huggingface_hub`, plus `httpx` (already there). For torch, add `--extra-index-url https://download.pytorch.org/whl/cpu`, so Linux gets the CPU build. `elasticsearch` is left out, because B12 talks to Elastic with httpx (D2-20). `websockets` goes in only if B13-live names it.

### Scripts and config

- `npm run export:mock` runs `node scripts/export-mock.mjs`, which:
  - loads `src/mock/index.ts` through Vite's `createServer` with `appType: "custom"`, `server.middlewareMode: true`, `server.hmr: false` and `server.ws: false` where the installed Vite accepts it, so it opens no port (D2-30), then `ssrLoadModule`,
  - writes `artifacts/mock/mock.json` in UTF-8: one top-level key per export of `src/mock/index.ts` whose value isn't a function, plus `_generatedAt`,
  - so it carries `allApprovals` (`apr_01` to `apr_05`) and `allFollowUps` (`fup_01`, `fup_02`) once S3-catalog exports them from `src/mock/index.ts`. `getById()` is a function and never reaches the JSON, so the server's readers find every approval and follow-up only through these two lists,
  - prints one line per key with its item count,
  - closes the server and exits 0. It's `cmd.exe`-safe.
- `vite.config.ts`: `server.watch.ignored` adds `.venv`, `models`, `server` and `artifacts`, so torch's files never load the watcher (B2-31).
- `scripts/secrets-scan.mjs` (G6, B2-22):
  - It reads key values from `.env` and also from the process environment, for every v2 name: `CINDIA_ANTHROPIC_API_KEY`, `ANTHROPIC_API_KEY`, `NESSIE_KEY`, `ELASTIC_API_KEY`, `APIFY_TOKEN`, `HF_TOKEN` and `SPACETIME_TOKEN`. Values stay in memory and are never printed.
  - It adds patterns for Apify tokens (`apify_api_`), Hugging Face tokens (`hf_`) and JWTs.
  - It takes optional extra paths (`node scripts/secrets-scan.mjs <path> ...`), so B11 can scan the model folder and its card before a publish.
- `scripts/test-feature.mjs` takes one or more slugs or spec paths (B1-24). Today it takes one slug only.
  - An argument ending in `.spec.ts` runs that one file, such as `tests/features/support-live.spec.ts`. That's how a G5 line names its live spec.
  - Any other argument is a slug and expands to `tests/features/<slug>-*.spec.ts`. A bare spec name like `support-live` is a slug too, matches nothing, and the script exits 1 naming it.
- `scripts/gate.mjs`, as `definition-of-done.md` section 10 defines the gates:
  - **Names:** G1, G1b, G2, G2b, G3, G4, G4v2, G5 and G6, in any case. The report is written as `<gate>-<HHMM>.md` with the gate's own spelling. R0, core and D-deploy have no entry: the orchestrator runs the commands in their section 10 row itself, as the gate skill says.
  - **The tour's time (fix-plan 1.9, B1-4):** after every `npm run test:demo`, the gate reads `artifacts/demo/report.json`. The check passes when the file was written by this run and its `endedAtWallMs` is at most its `durationMs` plus 15 seconds, the same margin v1's 75-second limit gave its 60-second demo. Playwright's whole-run time, which also counts `modes.spec.ts` and the browser start, is recorded for information and never judged. G1b, G4, G4v2, G5 and G6 all use this one rule. The 75-second and 130-second limits are gone.
  - **G1b:** `npm run check`, `npm run test:smoke`, `npm run build`, `npm run test:demo` once (the Phase A mapping), `npm run test:offline`.
  - **G2b:** `npm run check:data`, `npm run check:scope -- src/mock/ tests/data/ src/sources/` and `npm run art -- --check`, never a whole-repo check while other V1 agents are mid-edit (B1-19). I2-art T0 adds the `art` script and the 54 placeholders before G1b.
  - **G3** takes one or more slugs. It runs `check:scope` over every slug's folder and specs, `test:feature` with every slug, and `test:smoke`. M-desktop's nine folders fit one call (B1-24).
  - **G4v2:** `npm run build`, `npm run test:demo` three times, `npm run test:offline`.
  - **G5 for `b01` to `b10`:** as v1, on whatever timeline is current.
  - **G5 for `b11` to `b16`** (fix-plan 1.4): `npm run test:server`, the upgrade's contract tests and its live test as v1 runs them, the live feature specs named by path after the slug (`npm run gate -- G5 <slug> tests/features/<spec>.spec.ts ...`, such as `npm run gate -- G5 b14-swarm tests/features/support-live.spec.ts`, at least one path, each run through `npm run test:feature`), then `npm run build`, `npm run test:demo` once with the source in live mode, timed by the rule above, and `npm run test:offline`. The tour stays scripted, so the source's keyed tour events are allowed to come back empty (`ALLOWED_EMPTY_FALLBACKS`).
  - **G6:** as v1, with the time rule above.
- `tests/demo/harness.ts`, one field at the end of `playDemo()`: `report.json` gains `durationMs`, the player's own, for the timeline that played, so the gate never guesses the tour's length. I2-shell T6 makes the harness's end-of-run check relative to it, and I2-shell T6 and I2-tour T6 keep the field.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Merge `docs/v2/contracts.md`, all twelve sections, into `docs/common/` (details below). Mark nothing as "new" in the merged text: write it as the contract, in the same voice as v1 | docs/common/conventions.md, docs/common/glossary.md, docs/common/data-model.md, docs/common/events.md, docs/common/ui-contract.md, docs/common/api-contract.md, docs/common/design-system.md, docs/common/demo-script.md, docs/common/definition-of-done.md | none | opus |
| T2 | Types: entities, shared shapes, events, `REQUEST_KEYS`, feature types, cameras, `nav.ts` with its unit test. Fix the type fallout in `src/app/` with placeholder entries only (details below) | src/core/types.ts, src/core/events.ts, src/core/featureTypes.ts, src/core/nav.ts, src/core/nav.test.ts, src/core/index.ts, src/app/strings.ts, src/app/lang.ts, src/app/featureLoader.ts, src/app/surfaces/views.ts, src/app/demo/cameras.ts, src/app/demo/cameras.test.ts, src/app/demo/DemoStage.tsx, src/app/demo/EndCard.tsx | T1 | opus |
| T3 | State and reducers, idempotent per entity ID, with unit tests applying every new type once and twice, a duplicate `project.funded` counted once, and the demo timeline replayed twice into the same `log`. `small.ts` takes `surprise`, `wip`, `demo` and `sync` | src/core/state.ts, src/core/reducers/index.ts, src/core/reducers/search.ts, src/core/reducers/support.ts, src/core/reducers/listings.ts, src/core/reducers/projects.ts, src/core/reducers/model.ts, src/core/reducers/watch.ts, src/core/reducers/storefront.ts, src/core/reducers/log.ts, src/core/reducers/approvals.ts, src/core/reducers/buyer.ts, src/core/reducers/small.ts, src/core/reducers.test.ts, src/core/testFixtures.ts | T2 | opus |
| T4 | Validation for every new payload and every section 11 field, the per-key timeouts in the registry and the responder, the registry's arrival re-stamp for `start(emit)` events, `ids.ts`, and their tests | src/core/validate.ts, src/core/validate.test.ts, src/sources/types.ts, src/sources/registry.ts, src/sources/registry.test.ts, src/sources/requests.ts, src/sources/index.ts, src/sources/ids.ts, src/sources/ids.test.ts | T2 | sonnet |
| T6 | Server config, services, health, logging, requirements, conftest, the self-test and the server script. Create or refresh `.venv` and install the requirements with `.venv`'s Python. On Linux, use `python3 -m venv .venv`. After the install, `torch.__version__` must end in `+cpu`, or the CUDA build came from PyPI and the install is redone | server/config.py, server/services.py, server/main.py, server/requirements.txt, tests/server/conftest.py, scripts/server_selftest.py, scripts/server.mjs | none | sonnet |
| T7 | `scripts/export-mock.mjs` and the `export:mock` script, the gates, `test-feature.mjs`, the secrets scan, the Vite watcher and the harness's `durationMs` field | scripts/export-mock.mjs, scripts/gate.mjs, scripts/test-feature.mjs, scripts/secrets-scan.mjs, scripts/lib/common.mjs, tests/demo/harness.ts, vite.config.ts, package.json, package-lock.json | none | sonnet |
| FO1 | Fallout step, feature-lead: placeholder entries for the widened unions in four v1 feature files (details below) | src/features/proof/strings.ts, src/features/money-map/strings.ts, src/features/money-map/partyLayout.ts, src/features/approvals/approvalSummary.ts | T2 | sonnet |
| FO2 | Fallout step, data-smith: minimal v2 fields on the twelve `com_dine` pieces (details below) | src/mock/catalog.ts | T2 | sonnet |
| T5 | Second spawn, after S3-catalog T1. The six rows in "The responders in detail": `search.queried`, `surprise.asked`, `support.asked`, `listing.requested`, `watch.started`, and the shared re-keying. `mockAnswers.ts` reads the new exports. The four helpers with their tests | src/sources/requests.ts, src/sources/requests.test.ts, src/sources/mockAnswers.ts, src/sources/keywords.ts, src/sources/keywords.test.ts, src/sources/keywordSearch.ts, src/sources/keywordSearch.test.ts, src/sources/surprise.ts, src/sources/surprise.test.ts, src/sources/scriptedSwarm.ts, src/sources/scriptedSwarm.test.ts, src/sources/index.ts | S3-catalog T1, T4 | opus |
| T8 | Second spawn, after T5. Section 11's request rows: a person's `piece.opened`, a keyless `checkout.started`, `wip.milestone_reached`, `approval.granted` on a `milestone_release`, `storefront.requested`, and `question.answered`, with responder tests (B1-6, D1-6) | src/sources/requests.ts, src/sources/requests.test.ts, src/sources/mockAnswers.ts | T5 | opus |

`src/sources/requests.ts` is written by T4 in the first spawn and by T5 and T8 in the second, never at the same time.

### T1 · What goes where in `docs/common/`

| File | What it takes |
|---|---|
| `conventions.md` | Section 1: the cloud build machine (the Windows desktop and laptop become demo machines), port 3000, the hosts, and the variable table with `CINDIA_ANTHROPIC_API_KEY`, `SPACETIME_TOKEN` and `PUBLIC_SITE_URL`. Folder rows: `design/` (the orchestrator's, written only from the planning session), `sponsors/` (scribe), `server/bNN_<slug>/` folders (backend-builder, with the upgrade's own prefix), `models/` (not committed), `artifacts/mock/` (written by `npm run export:mock`). The cloud's Git rule from fix-plan 1.9: push the branch only, record each tag and its SHA in `status.md`, cut by SHA, and Gordon pushes the tags from Windows at the freeze. From section 11: the npm scripts, the shape of `mock.json`, `seekToEvent` and the rule that every v2 spec seeks by event, and who owns `sponsors/` and `design/` |
| `glossary.md` | Section 9 appended to Domain words, section 11's glossary rows, and the words of fix-plan 1.1: "Native American" and the four nation names in English and Chinese. Section 12's on-screen labels, L1 to L30, as one table with the English, the Chinese, where each shows (its test ID) and its owner, which every owner copies word for word |
| `data-model.md` | Section 2: the four communities with every ID and slug, the new and changed entities, the approval kinds and `community_fund`, the passage rule, figures 11 to 16, the new `src/mock/` files. Section 11's data parts: the export list (with `allApprovals` and `allFollowUps`), `demoQuestions`, the approval subjects and where each approval lives, storefront block props, `Policy`, the keyword chip rule, the surprise draw. The shared shapes in this plan's Interfaces. The ID scheme below. S3-catalog's content rules, R1 to R28, by reference: a pointer to that section of `docs/plans/S3-catalog.md`, not a copy |
| `events.md` | Section 3, with `data` in `ProcessId`, `question.forwarded`, `question.answered` and `pieceId` on `card.tokenized`. Section 11's event parts: the payload additions, `storefront.requested`, the inline `approval`, every Requests row, `listing.indexed`'s key, and the person-scoped and page-tagged IDs. This plan's store shapes, with the "ask the maker" loop as `support.questions`, the store key sections 3 and 11 call `questions` |
| `ui-contract.md` | Section 4: routes with `/demo?mode=present` and `?start=<beatId>`, surfaces and frames, slots, `SlotProps`, the process bar and views with presence, camera states with `pitch`, test IDs. Section 11's shell parts: `nav.ts`, the kit `Link`, `?ref=` on `/sell/approvals`, `?drawer=support` on Shop routes, the Phase A legacy page `/shop/legacy` and camera `shop-legacy` (which replace section 4's old transition rule), the process view layout, which plan renders which test ID, `/dev/kit`. `frame-owner` and `PhoneFrame` are retired |
| `api-contract.md` | Sections 5 and 6, and section 11's server parts. Each v2 endpoint is written in v1's line format: method and path, key, budget, request, events, fallback, adapter. Four v1 rules widen (D2-18): the Timeouts bullet points at the per-key timeouts in `events.md`, "nothing in the browser calls" covers every outside service and SpacetimeDB, the error table covers every outside service, and the `mock.json` exception names every server reader |
| `design-system.md` | Section 7, and desktop sizes: `PageFrame` 1440 by 900, the 56 px top bar, the 64 px process bar, the 440 px drawer, and `PAGE_WIDTH` and `PAGE_HEIGHT`, which I2-kit owns. The kit `Link`, `StatTile` and the `Badge` variants. Phone frames are retired |
| `demo-script.md` | Only the Phase A mapping: a "Desktop camera (Phase A)" column placed right after the Camera column, so the v1 data test still reads Beat, Time and Camera as the first three (B1-39), plus one paragraph saying the timeline keeps the v1 camera IDs and the shell maps `buyer` and `receipt` to `shop-legacy` and the rest through `toTourCamera()`, until I2-tour. Nothing else changes. The tour table lands in I2-tour |
| `definition-of-done.md` | Section 10's gates and tags: G1b, G2b, G4v2, G5 for v2 (fix-plan 1.4), and the time rule: the tour test alone, from `report.json`, against the timeline's `durationMs` plus 15 seconds |

T1's report ends with a coverage list: every heading, bullet group and table of contracts sections 1 to 12, each with the `docs/common/` file it went to. A part with no home is a `needs:` line, never a silent drop (D1-9).

**The ID scheme** that `data-model.md` gains, as section 11 states it (D1-47):
- **The tour and the scripted data:** `qry_01`, `srp_01`, `thr_00` to `thr_05` (`thr_00` is the fallback runs' placeholder thread), `wsc_01` (the tour's scan), `run_01` to `run_10` (one per scripted run, section 11's list), `pc_55` (the piece `lst_01` drafts in the tour, event-only until `apr_04` is granted), `stp_0001` onward, `chk_01` onward (listing checks), `ctb_01` onward, `qst_01` onward (questions forwarded to a maker), `ans_01` onward (a maker's scripted answers), `blk_01` onward (storefront blocks), `mls_01` onward (milestones) and `pol_01` onward (policy topics). `lst_` and `run_` are also record prefixes in `src/mock/`.
- **A person's requests** (made by features, counting what's in the store): `qry_user_<n>`, `srp_user_<n>`, `thr_user_<n>`, `wsc_user_<n>`, `lst_user_<n>`, `ctb_user_<n>`, `ord_user_<n>`, and `ans_user_<n>` for a maker's answer on her page.
- **Scripted answers to a person** (from `answerId()`): `run_user_<n>`, `stp_user_<n>`, `chk_user_<n>`, `pc_user_<n>`, `cft_user_<n>`, `fup_user_<n>`, `apr_user_<n>`, `mv_user_<n>`, `qst_user_<n>`, `blk_user_<n>`, plus v1's `evt_reply_<n>` and `act_reply_<n>`.
- **Live answers to a person:** the same prefixes with the page tag, `<prefix>_user_<tag>_<n>` (fix-plan 1.9).

### T2 · Details

- **Fallout in `src/app/`, placeholder entries only:**
  - `strings.ts` `SLOT_LABELS` and `lang.ts` `SURFACE_START_LANG` gain the new slots and the `store` surface.
  - `featureLoader.ts` `SLOT_FEATURE` gains each new slot with its feature slug from the contract's slot table. A slug whose folder doesn't exist yet renders the slot's placeholder, as today.
  - `demo/EndCard.tsx` `SOURCE_NAMES` gains a placeholder name per new key. I2-tour writes the real end card.
  - `demo/cameras.ts` and `demo/DemoStage.tsx` gain the `store` surface, and give every tour camera a placeholder pose. I2-shell T4 writes the real ones.
  - `demo/cameras.test.ts` keeps looping over the cameras it checks today, now named `LEGACY_CAMERA_IDS`. Its checks don't change.
  - `surfaces/views.ts` needs nothing while `StudioView` stays the v1 five.
- **`nav.ts`** as in Interfaces, exported from `src/core/index.ts`. Its unit test covers each route builder's exact path, the no-op calls before registration, and calls reaching a registered navigator until it unregisters.

### The fallout step

Widening the core types breaks files no integrator may edit (B1-1). These two spawns fix them, and their work is committed with the first spawn's in one commit. Both make placeholder or minimal entries only, and neither changes behavior.

```text
ROLE: feature-lead
PLAN: docs/plans/I2-core.md
TASK: FO1
SCOPE: src/features/proof/strings.ts, src/features/money-map/strings.ts, src/features/money-map/partyLayout.ts, src/features/approvals/approvalSummary.ts
```

- `proof/strings.ts` `SOURCE_LABELS` gains a label per new source key.
- `money-map/strings.ts` `partyNames` gains `community_fund`, and `moveKindNames` gains `project_fund` and `milestone`.
- `money-map/partyLayout.ts` `FIXED` gains a place for `community_fund`, out of the way of v1's parties.
- `approvals/approvalSummary.ts` types `kind` as `ApprovalKind` and gives every new kind a plain placeholder summary. M-approvals writes the real ones.
- Checks: `npm run check:scope -- src/features/proof/ src/features/money-map/ src/features/approvals/`.

```text
ROLE: data-smith
PLAN: docs/plans/I2-core.md
TASK: FO2
SCOPE: src/mock/catalog.ts
```

- `pc_01` to `pc_12` gain `communityId: "com_dine"`, `facets` (the object from the title, empty word lists, `oneOfAKind: true`, `leadTimeDays: 0`, since each piece is already made), `vibe` with empty lists, and `imageAlt` from the title.
- S3-catalog T5 replaces these with the full values later. No number changes.
- Checks: `npm run check:scope -- src/mock/` and `npm run check:data`.

### T5 and T8 · The responders in detail

**Shared rules:**
- Every answer event carries the request's key, as v1's answers do. The keyless `checkout.started` answer carries none.
- **Re-keying a person's run.** Any ID the scripted record names that would collide with the tour's is replaced through `answerId()`: the run, its steps and checks, a listing's `listingId` (the request's) and its `pc_user_<n>`, a storefront's `storefrontId` (the request's) and its drafted blocks (`blk_user_<n>`), a forwarded question (`qst_user_<n>`), counterfeit hits, follow-ups and approvals. A re-keyed `approval.requested` carries the inline `approval` object, copied from the scripted approval's record with `subjectIds` naming the person's own records. So a person never sees `apr_03`, `apr_04`, `cft_01` or `qst_01` reused (B1-11, B1-40, D1-12, D1-22).
- Texts are normalized as v1 normalizes questions.

**`search.queried`** (T5), from a person:
- `demoSearch.answer`, with the request's `queryId`, only when the text, the keywords and the filters all equal `demoSearch.query`'s. A refined chip or a price cap gets the scorer instead (B1-14).
- Otherwise `scoreKeywords` answers, with engine `keyword_scripted` and the request's filters applied.
- When `report` in `model.ts` isn't null, a `search.mapped` follows 300 ms later: every piece's point from the report, the query placed at the score-weighted center of its top three results, and `approx: true`.

**`surprise.asked`** (T5): `drawSurprise` with the request's fields.
- The random number generator is `mulberry32`, seeded with `seed`.
- `keyword_random` and `fair_random` with a keyword use the keyword's top 12 from `scoreKeywords`, only pieces scoring above 0, sorted by score, then `pieceId`.
- For `pure_random`, with no keyword, or when the keyword matches nothing, all 54 in `pieceId` order, with the method's weights.
- The raw weights are 1 for `keyword_random` and `pure_random`, and `1 / (1 + salesThisMonth)` from the piece's `searchIndex` entry for `fair_random`.
- The draw is `rng() * total` over the raw weights, walked with a plain loop in candidate order. B12's Python port walks the same way.
- `candidates` lists every candidate with `weight` as its raw weight divided by the total, so the weights sum to 1 (D1-35).

**`support.asked`** (T5):
- The first run in `swarmRuns` whose trigger is `support`, on the same side, with a `matches` entry equal to the normalized text, and whose `pieceId` and `makerId`, when set, are among the request's `contextIds`.
- Otherwise `fallbackSupportRun`, whose reply is A2's L16 in the platform's scope C words, written by S3. A buyer who asks the tour's question on another piece's page gets that fallback and no `pc_01` reference (A2-10).
- Through `planRun`, with the request's thread and re-keyed run, step and check IDs.
- A run that forwards a question (`run_07`) re-keys its `question.forwarded` to `qst_user_<n>`, on the request's `threadId`, with the request's own `text` and `lang`. Its L14 reply lands on the same thread. So the maker page and the buyer's thread both show the person's own question, and T8 can relay her answer back to that thread.

**`listing.requested`** (T5):
- The run whose `listing` trigger's normalized notes equal the request's notes, re-keyed to the request's `listingId`.
- Otherwise `fallbackListingRun`, re-keyed the same way.
- The person's run ends with its own `apr_user_<n>`, whose `approval` object is a `listing_publish` for the person's listing. It never re-emits `apr_04`.

**`watch.started`** (T5), from `scriptedScan`:
- `watch.scanned` at offset 0: engine `scripted`, `candidates` as the count, and `results` with every checked candidate from `counterfeitCandidates` (title, URL, snippet, similarity and its `verdict`), hits and non-hits alike,
- one `counterfeit.flagged` per `cftIds` entry, 300 ms apart, with the request's `scanId`, re-keyed to `cft_user_<n>`,
- then `followup.drafted` for `followUpId`, re-keyed to `fup_user_<n>`, when it's set,
- then `approval.requested` for `approvalId`, re-keyed to `apr_user_<n>` with its `approval` object naming the person's hits, when it's set.
- The tour's `cft_01` hit and `apr_03` stay as they were.

**`extractKeywords`** (T5), deterministic (B1-13, D1-5):
1. Lowercase the text and split it into words. `under $N` and `below $N` become the chip `under $N` and the filter `maxPriceCents: N * 100`, and their words are used up.
2. Match multi-word vocabulary terms and multi-word `keywordAliases` keys, longest first.
3. Match single-word alias keys. A word that is an alias key always resolves through its alias.
4. Match the remaining single words against the vocabulary, as they are, then with simple plural stripping (`ies` to `y`, then `es`, then `s`).
5. Every matched word is used up, so no later pass matches it again, and each chip appears once.

The output order is moods, then facet words (any of object, materials, techniques, motifs or colors, together, in text order), then occasions and recipients, then the price chip. Within each group the order is the order of first appearance in the text. A term in two groups counts in the earlier one. For figure 11's text it must return figure 11's six chips in figure 11's order. A unit test with a fixture vocabulary proves the rules, and the data-smith's G2b test proves them on the real data.

**Reasons:** `reason` is `{ en: "Matches " + words, zh: "匹配：" + words }`, with the matched facet words joined by ", ". The words stay English, as the facets are.

**T8's rows:**
- **A person's `piece.opened`:** `split.shown` from `splits[pieceId]`. B10's live adapter returns nothing for it, so this answer plays in both modes.
- **A person's `checkout.started`** on a piece the loaded timeline doesn't check out itself. It has no key, so `handle()` gains a keyless path that skips the adapters and plays the scripted answer:
  - `card.tokenized` with the piece's `pieceId`, a token made from the piece ID with no randomness, and last four `4242`,
  - `order.placed` `ord_user_<n>` on `ch_cindia`, with the figures of `splits[pieceId]`,
  - `receipt.updated` with status `received`.
  - These orders stay out of the month, the ledger and the money map, and the tour's own card and checkout stay on their piece.
- **A person's `wip.milestone_reached`** (date `2026-10-01`): `agent.acted` (a proposal, `act_reply_<n>`) and `approval.requested` `apr_05` for `wip_01`'s second milestone. Any other milestone gets only the `agent.acted` line.
- **`approval.granted` on a `milestone_release`** (found through `getById()` or the stored inline approval): `wip.milestone_paid` and a `money.moved` of kind `milestone`, Cindia to the maker, `mv_user_<n>`, dated `2026-10-02`, for that milestone's share. v1's approvals still get nothing.
- **`storefront.requested`:** the run whose trigger names the request's `storefrontId`, `run_03` for `sto_01`, with its drafted blocks re-keyed to `blk_user_<n>`. Any other storefront gets no scripted draft, because the Designer drafts only the seller's own storefront (A2-22).
- **A person's `question.answered`** (the maker's reply on her page):
  - the run in `swarmRuns` whose `question` trigger names that question, `run_09` for `qst_01`,
  - for any other question in `support.questions` that no run names, such as a person's `qst_user_<n>`, `run_09`'s relay,
  - either way through `planRun`, re-keyed, ending in the Writer's `support.answered` on the question's original thread, `support.questions[questionId].forwarded.threadId` (`run_09`'s own `thr_03` when the store holds no forward for `qst_01`), with her own text in place of `ans_01`'s wherever the reply quotes it,
  - a question no run names and the store doesn't hold gets no answer.

## Acceptance

- Given the first spawn and the fallout step, when `npm run check` runs, then it exits 0. Every v1 test still passes and every new reducer test passes.
- Given every event type in `docs/common/events.md`, when `reducers.test.ts` applies each once and then twice, then the state is the same after the second time.
- Given the demo timeline played twice, then the `log` holds the same entries in the same order, at most 400.
- Given two `project.funded` events with one `contributionId`, then `addedCents` counts it once.
- Given two `data.synced` events, then `sync.data` holds the newer. The same holds for `index.synced` and `sync.index`.
- Given a fake adapter whose `start(emit)` hands over an event with `at: 0`, then the store holds it with the player's time at arrival.
- Given `question.forwarded` and then `question.answered` for one `questionId`, then `support.questions` holds both under that ID, each with its event's `id` as `eventId`.
- Given two `storefront.published` events for `sto_01` with different `blocks`, then `storefront.published["sto_01"]` holds the newer one's `slug`, `blocks` and `at`. Given one without `blocks`, then `validateEvent()` returns a problem.
- Given a valid payload with each optional field of section 3 set (`split.shown.compare`, a result's `closeness`, `closeMatches`, `keywordsBy`, `listing.indexed`'s `point` and `approx`, `flag.raised.nessieId`) and a `watch.scanned` result whose `similarity` is `null`, then `validateEvent()` returns no problem. Given a `listing.indexed` without `index`, or a `question.answered` without `answerId`, then it returns a problem.
- Given a person's `checkout.started` on `pc_13` after the tour's checkout of `pc_01`, then `buyer.cards` holds both pieces' cards and the `pc_01` card is unchanged.
- Given an invalid payload for each new type and each section 11 field, when `validateEvent()` checks it, then it returns at least one problem. Given a valid one, it returns none.
- Given a fake adapter for `b14-swarm` that answers in 15 seconds, when its request plays in live mode, then its events are used. Given one for `b01-match` that answers in 9 seconds, then the scripted event plays. Both are tested with fake timers, for the registry and for a person's request through the responder.
- Given `nav.ts` with no navigator registered, when a feature calls `navigate`, `setProcess` or `openDrawer`, then nothing happens and nothing throws. Given a registered one, the calls reach it, and the route builders return the exact paths in section 11.
- Given `answerId("run")` called twice in one epoch, then the IDs differ. Given a player reset between them, then both are `run_user_1`. Given `pageTag()` called twice, then it returns the same 6-character tag.
- Given the core gate after the fallout step, then `npm run check`, `npm run test:smoke`, `npm run test:demo` and `npm run test:server` all exit 0. The site looks and plays like v1 after R0.
- Given `npm run test:server`, then it exits 0, and the self-test sees `keys` with five booleans, `services` with two, and no model ID outside `ALLOWED_MODELS` in `server/`, `src/` or `scripts/`.
- Given no environment variables and no `.env`, when `/api/health` answers, then every key and service is `false`, and the server starts without error.
- Given only `CINDIA_ANTHROPIC_API_KEY` set, then `keys.anthropic` is `true`.
- Given `ELASTIC_URL` set and `ELASTIC_AUTH=proxy` with no key, then `keys.elastic` is `true` and `elastic_headers()` returns `{}`.
- Given a test not marked `live`, then every key in `config` is a fake value and neither `*_AUTH` flag is set.
- Given a router that imports a missing module, then the server starts and the log names that module.
- Given `npm run export:mock`, then `artifacts/mock/mock.json` exists, has `pieces` and `_generatedAt`, no port opened, and the script exits 0 on Windows and Linux.
- Given a v2 key's value in the process environment and in a tracked file, when `node scripts/secrets-scan.mjs` runs, then it names the file and the variable, never the value, and exits 1. Given a fake `apify_api_`, `hf_` or JWT string in a tracked file, then it does the same.
- Given `npm run gate -- G1b`, then its report shows the tour's time from `report.json` against `durationMs` plus 15 seconds, and Playwright's whole-run time only for information. Given a `report.json` older than the run, then the time check fails.
- Given `npm run gate -- G3` with two slugs, then `check:scope` and `test:feature` cover both.
- Given T5, when a person's `search.queried` with figure 11's text, keywords and filters plays in scripted mode, then 1.2 seconds later `search.answered` carries `demoSearch.answer`'s results with the request's `queryId`. Given the same text with one chip removed or a lower price cap, then the answer comes from `scoreKeywords` with the filters applied.
- Given T5, when a person asks a support question that matches no scripted run, then the first step arrives 1.2 seconds after the request, the steps arrive 300 ms apart, and the final `support.answered` comes from `fallbackSupportRun`, with a run ID `run_user_1` and step IDs from `stp_user_1`.
- Given T5, when the tour's d04 question is asked with `contextIds: ["pc_20"]`, then the fallback answers and no reply names `pc_01`.
- Given T5, when `run_04`'s seller question is asked with `contextIds: ["mkr_01"]`, then `run_04` answers. Given the same question with `contextIds: ["mkr_02"]` or none, then the fallback answers.
- Given T5, when a support question and a listing request are planned within 1.2 seconds, then their run and step IDs don't overlap.
- Given T5, when a person's `listing.requested` carries `lst_01`'s notes, then the run is `lst_01`'s, re-keyed to the person's `listingId`, and it ends with an `apr_user_<n>` whose `approval` names that listing.
- Given T5, when a person's `watch.started` plays after the tour, then the hits are `cft_user_<n>`, the follow-up `fup_user_<n>` and the approval `apr_user_<n>`, and the tour's `cft_01` hit is unchanged.
- Given T5, when `drawSurprise` runs twice with the same seed and inputs, then it returns the same piece, and the candidates' weights sum to 1.
- Given T8, when a person opens `pc_13`, then `split.shown` carries `splits["pc_13"]`.
- Given T8, when a person's `wip.milestone_reached` names `wip_01`'s second milestone and the owner grants `apr_05`, then `wip.milestone_paid` and a `money.moved` of kind `milestone` with ID `mv_user_1` follow.
- Given T8, when a person's `storefront.requested` names `sto_01`, then `run_03`'s steps play and `storefront.drafted` follows.
- Given T8, when a person's `question.answered` for `qst_01` carries her own text, then `run_09`'s `support.answered` quotes that text exactly and not `ans_01`'s.
- Given `npm run check:scope -- src/core/ src/sources/`, then it exits 0.

## Out of scope

- The desktop shell, routes, frames, the process bar and the navigator it registers, which are I2-shell.
- Kit components, `Link`, `StatTile`, `PAGE_WIDTH` and `PAGE_HEIGHT`, which are I2-kit. `src/core/` defines neither size.
- Mock data, which is S3-catalog, apart from FO2's minimal fields.
- Live adapters and routers, which are B11 to B16.
- The tour, its timeline, `beats.ts` and the pitch cards, which are I2-tour.
- Changes to `.gitignore`, `.env.example`, `CLAUDE.md` or the command guard, which belong to the orchestrator. Listed under needs.

## Needs (for the orchestrator)

- Add `SPACETIME_TOKEN`, `PUBLIC_SITE_URL` and `CINDIA_HF_REPO` to `.env.example` with empty values. The other v2 names are there already, and `.gitignore` already lists `models/`.
- Run the fallout step (FO1 and FO2) between the first spawn's report and the commit.

## Names this plan sets that the contracts should state

`docs/v2/contracts.md` section 11 names some of these without detail. Each is settled here and goes into `docs/common/` through T1:
- **Types:** the fields of `ScriptedRun` (with `trigger.pieceId` and `trigger.makerId`, the `listing` trigger's `notes` and the `question` trigger), `PlannedEvent`, `ModelReport`, `DemoSearch`, `DemoSurprise`, `ScriptedScan`, `PolicyTopic` and `Policy`, and `InlineApproval`.
- **Views and cameras:** `SellView` and `SELL_VIEWS`, `TourCameraId` (with `pitch` and `shop-legacy`), `LegacyCameraId`, `LEGACY_CAMERA_IDS`, `TOUR_CAMERA_IDS`, `CAMERA_IDS`, `LEGACY_CAMERA_TO_TOUR` and `toTourCamera()`.
- **Navigation and slot props:** `registerNavigator(impl)` beside section 11's `nav.ts` exports, and `SlotProps.publicSite?`, which I2-shell asks for.
- **Sources:** `timeoutFor()`, `pageTag()`, `answerId()`, `liveIdStart()`, `scoreKeywords()`, `drawSurprise()`, `planRun()` and `mulberry32()`, with the rules above.
- **Store:** the shapes in "The store keys", `support.questions`, `sync`, `buyer.checkouts` and `buyer.cards`, and `approval?` on each approval.
- **IDs:** `qst_01` onward, `qst_user_<n>` and `ans_user_<n>`, following the prefixes FX7 settled.
- **Server:** `ALLOWED_MODELS`, `CLAUDE_BASE_URL`, `elastic_headers()`, `apify_headers()`, `spacetime_headers()`, `spacetime_reachable()`, `model_present()`, `needs_service()` and the autouse fake-key fixture.
- **Scripts:** the shape of `artifacts/mock/mock.json`, the extra paths on `secrets-scan.mjs`, several slugs on `test:feature` and G3, and live specs after the slug on G5 for `b11` to `b16`.
- **The gate's time rule:** `endedAtWallMs` at most `durationMs` plus 15 seconds, read from `report.json`.
