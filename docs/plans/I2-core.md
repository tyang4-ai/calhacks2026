# I2-core · v2 contracts, core types, store, sources and server config

Priority: P0 · Wave: V1 · Depends on: none (first v2 item) · Area: `docs/common/`, `src/core/`, `src/sources/` (not `live/`), the server skeleton, `scripts/` · Owner: integrator · Gate: `npm run check` and `npm run test:smoke` after the first spawn, then G1b together with I2-kit and I2-shell

SCOPE: docs/common/, src/core/, src/sources/*.ts, src/app/, server/__init__.py, server/config.py, server/main.py, server/services.py, server/requirements.txt, tests/server/conftest.py, scripts/export-mock.mjs, scripts/gate.mjs, scripts/lib/, package.json, package-lock.json

`src/app/` is in this SCOPE only for type fallout: when a widened union breaks an exhaustive record or a switch in the shell, add the missing keys with placeholder labels and nothing else. The shell's real v2 work is I2-shell.

**Two spawns.**
1. The first spawn does T1 to T4, T6 and T7, then reports. The orchestrator commits it as `I2-core: v2 contracts and core`.
2. T5, the scripted responders, is a second spawn. It starts only after S3-catalog's T1 has committed typed stub files for the new `src/mock/` modules, because the responders import them. Its SCOPE line is `src/sources/*.ts, src/core/types.ts`.

## Goal

Every v2 name in `docs/v2/contracts.md` becomes real in two places, in one commit:
- in `docs/common/`, which is the truth again from this commit on,
- in the shared code every v2 feature and upgrade imports: types, events, reducers, validation, sources, the server's config and health, and the mock export.

The app still looks and plays exactly like v1. `npm run test:demo` keeps passing on the v1 timeline.

## Read first

- `docs/v2/contracts.md`, all of it. It's what you merge.
- `docs/v2/brief.md` for the reasons.
- `docs/common/conventions.md`, `events.md`, `data-model.md`, `ui-contract.md`, `api-contract.md`, `design-system.md`, `demo-script.md`, `definition-of-done.md`, `glossary.md`: what you edit.
- The code you change:
  - `src/core/types.ts`, `events.ts`, `featureTypes.ts`, `state.ts`, `reducers/`, `validate.ts`, `testFixtures.ts`,
  - `src/sources/types.ts`, `registry.ts`, `requests.ts`, `mockAnswers.ts`,
  - `server/config.py`, `server/main.py`, `tests/server/conftest.py`,
  - `scripts/gate.mjs`, `scripts/lib/common.mjs`.
- `docs/harness/lessons.md`, for gotchas from v1.

## Interfaces

**Reads:** nothing at runtime beyond what v1 read. The responders (T5) read the new `src/mock/` exports listed below through `import.meta.glob`, so the build passes before S3-catalog fills them.

**Exports added to `src/core/`:**
- **Types (`types.ts`):**
  - the entities in contracts section 2: `Community`, `Project`, `WorkInProgress`, `Milestone`, `Storefront`, `StorefrontBlock`, `ListingDraft`, `AgentSpec`, `SearchQuery`, `CounterfeitCandidate`, `IndexEntry`, `Facets`, `Vibe`,
  - the changed `Person` and `Piece`,
  - `ApprovalKind` with the seven kinds, and the ID string aliases.
- **The shared shapes the data-smith's stubs and the responders both use (`types.ts`):**
  - `ScriptedRun`: `runId`, `side`, `trigger` (`{ kind: "support"; matches: string[] }` or `{ kind: "listing"; listingId }` or `{ kind: "storefront"; storefrontId }`), `steps` (`swarm.step` payloads without `threadId`), and `final` (one event type and payload: `support.answered`, `support.escalated`, `listing.drafted` or `storefront.drafted`).
  - `ModelReport`: `trained` (the `model.trained` payload), `scored` (the `proof.search_scored` payload), `points` (`{ pieceId; x; y }[]`).
  - `DemoSearch`: `query` (the `search.queried` payload without `queryId`), `answer` (the `search.answered` payload without `queryId`).
  - `DemoSurprise`: `ask` (without `surpriseId`), `draw` (without `surpriseId`).
  - `ScriptedScan`: `queries`, `cftIds`, `approvalId?`.
  - `Policy`: `shipping`, `returns`, `care`, each `Text`.
- **Events (`events.ts`):** every new event type and payload in contracts section 3, plus:
  - `SourceKey` with `b11-embed` to `b15-watch`, and `SOURCE_KEYS` with all fifteen,
  - `ProcessId` and `PROCESS_IDS`,
  - `MoneyMoveKind` with `project_fund` and `milestone`, and `Party.kind` with `community_fund`,
  - `beat.started` with `process?`.
- **Feature types (`featureTypes.ts`):**
  - `SurfaceId` adds `"store"`.
  - `SlotId` and `SLOT_IDS` add the twenty slots in contracts section 4.
  - `SlotProps` adds `processId?`, `pieceId?`, `communityId?`, `projectId?`, `orderId?`, `slug?`, `side?` and `searchParams?: { q?: string; k?: string[] }`.
  - `SellView` and `SELL_VIEWS` are the eleven Sell views in route order. `StudioView` stays as the v1 five until I2-tour, so nothing in v1 breaks.
  - `TourCameraId` is the cameras in contracts section 4. `LegacyCameraId` is v1's eight.
  - `CameraId` is both, until I2-tour drops the legacy ones.
  - `LEGACY_CAMERA_TO_TOUR` and `toTourCamera(id)` carry the Phase A mapping: `buyer` to `shop-home`, `receipt` to `shop-receipt`, `buyer-studio` to `sell-map`, `studio-month` to `sell-month`, `studio-catch` to `sell-catch`, `studio-owner` to `sell-approvals`, `studio-close` to `sell-close`, `maker` to `maker`.
- **State (`state.ts`):** the new store keys with the shapes below.

**The new store keys.** Every record is keyed by its entity ID, and every entry also keeps `at`, the player time of its event.

| Key | Shape |
|---|---|
| `search` | `queries`, `answers`, `maps` (each by `queryId`), `latestQueryId` |
| `surprise` | `asks`, `draws` (by `surpriseId`), `latestSurpriseId` |
| `support` | `threads` by `threadId`: `{ side, lang, contextIds, messages }`. A message is `{ kind: "asked" \| "answered" \| "escalated", eventId, at, ... }`, with the fields of its event. Plus `threadIds`, `latestThreadId` |
| `swarm` | `runs` by `runId`: `{ threadId, stepIds, done, firstAt, lastAt }`. `steps` by `stepId`. `runIds`, `latestRunId` |
| `listings` | `requests`, `drafts`, `indexed` (by `listingId`), `latestListingId` |
| `projects` | `contributions` by `contributionId`, `addedCents` by `projectId` (raised in this run, added to the entity's `raisedCents` on screen) |
| `wip` | `milestones` by `milestoneId`: `{ wipId, status: "reached" \| "paid", date, amountCents? }` |
| `model` | `trained` and `scored`, each the payload or `null` |
| `watch` | `scans` by `scanId`: `{ makerId, queries, engine?, candidates?, startedAt, scannedAt? }`. `hits` by `cftId`, `hitIds`, `latestScanId` |
| `storefront` | `drafts` by `storefrontId` (the blocks), `published` by `storefrontId` (the slug) |
| `demo` | gains `process: ProcessId \| null` from `beat.started` |

Support messages are keyed by the event's own `id`, so a seek that replays the timeline never doubles a message. `done` turns true on `support.answered`, `support.escalated`, `listing.drafted` or `storefront.drafted` for that run.

**Exports added to `src/sources/` (T4 and T5):**
- `timeoutFor(key)`: 8000 ms by default, 20000 for `b14-swarm`, 60000 for `b15-watch`. The registry and the responder use it for `produce()`. `health()` keeps the 8-second default.
- `keywordSearch.ts` (T5):
  - `extractKeywords(text, vocab)` returns `{ keywords, filters }`.
  - `scoreKeywords(keywords, filters, index, pieces)` returns at most 12 results with `score` from 0 to 1, `matched` and a `reason` as `Text`.
  - `keywordVocab(index, aliases)` builds the vocabulary from every facet and vibe word in the index, plus `keywordAliases`.
- `surprise.ts` (T5): `drawSurprise({ keyword?, method, seed }, index, pieces)` returns the `surprise.drawn` payload without `surpriseId`. The rules:
  - The random number generator is mulberry32, seeded with `seed`.
  - `pure_random` picks from all pieces sorted by `pieceId`.
  - `keyword_random` and `fair_random` use the keyword's top 12 from `scoreKeywords`, sorted by score, then `pieceId`. `keyword_random` picks uniformly among them.
  - `fair_random` picks by cumulative weight `1 / (1 + salesThisMonth)`, drawing `rng() * totalWeight`.
  - `candidates` lists every candidate with its weight.
- `scriptedSwarm.ts` (T5): `planRun(run, request, ids)` turns a `ScriptedRun` into planned events:
  - each step 300 ms after the one before, the first at 1200 ms,
  - the final event 300 ms after the last step,
  - `threadId` from the request.
  
  A person's runs get IDs from `run_51` onward and their steps from `stp_5001` onward, so a second ask never collides with the timeline's `run_01` or `stp_0001`.

**The mock exports the responders read** (S3-catalog writes them):

| File | Exports |
|---|---|
| `catalog.ts` | `pieces` |
| `searchIndex.ts` | `searchIndex`, `keywordAliases` (a word or phrase people type, mapped to the vocabulary term: `peonies` to `peony`, `mom` to `gift for mom`) |
| `search.ts` | `demoSearch`, `demoSurprise` |
| `swarm.ts` | `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun` |
| `watch.ts` | `counterfeitCandidates`, `scriptedScan` |
| `model.ts` | `modelId`, `report` |
| `policy.ts` | `policy` |

**Server:**
- **`server/config.py`** reads the process environment first, then `.env` with `override=False`. It exposes:
  - `ANTHROPIC_API_KEY` (from `CINDIA_ANTHROPIC_API_KEY`, falling back to `ANTHROPIC_API_KEY`), `NESSIE_KEY`,
  - `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `ELASTIC_AUTH`,
  - `APIFY_TOKEN`, `APIFY_AUTH`, `HF_TOKEN`,
  - `SPACETIME_URL` (default `http://127.0.0.1:3000`), `SPACETIME_DB` (default `cindia`), `MODEL_DIR` (from `CINDIA_MODEL_DIR`, default `models/cindia-embed-v1` under the repo root),
  - `MODEL_DEFAULT`, `MODEL_FAST` and `MODEL_TOP = "claude-opus-5-5"`.
  
  It also exposes:
  - `has_key(name)`:
    - `ELASTIC_API_KEY` counts as set with a key, or with `ELASTIC_AUTH=proxy`, and only when `ELASTIC_URL` is set too.
    - `APIFY_TOKEN` counts as set with a token or with `APIFY_AUTH=proxy`.
    - `ANTHROPIC_API_KEY` counts as set when either name is set.
  - `elastic_headers()` and `apify_headers()`. Each returns the auth header, or an empty dict in proxy mode. Upgrades use these instead of reading keys themselves.
  
  Nothing prints, logs or returns a value.
- **`server/services.py`:**
  - `spacetime_reachable()`: any HTTP answer from `SPACETIME_URL` within 300 ms, cached for 10 seconds.
  - `model_present()`: `MODEL_DIR` exists and holds `modules.json`.
- **`GET /api/health`** returns `keys: { anthropic, nessie, elastic, apify, hf }` and `services: { spacetime, model }` as booleans, beside v1's `ok`, `version` and `routers`.
- **`tests/server/conftest.py`** adds `needs_service(name)` for `spacetime` and `model`, next to `needs_key`.
- **`server/requirements.txt`** adds pinned versions you pick and record in your report: `sentence-transformers`, `torch` (CPU), `numpy`, `elasticsearch` 9.x, `websockets`, `huggingface_hub`, plus `httpx` (already there). For torch, add `--extra-index-url https://download.pytorch.org/whl/cpu`, so Linux gets the CPU build instead of the CUDA one.

**Scripts:**
- `npm run export:mock` runs `node scripts/export-mock.mjs`, which:
  - loads `src/mock/index.ts` through Vite's `createServer` (middleware mode, `appType: "custom"`) and `ssrLoadModule`,
  - writes `artifacts/mock/mock.json`: one top-level key per export of `src/mock/index.ts` whose value isn't a function, plus `_generatedAt`,
  - prints one line per key with its item count,
  - closes the server and exits 0. It's `cmd.exe`-safe.
- `scripts/gate.mjs` gains G1b, G2b and G4v2 as `definition-of-done.md` section 10 defines them. G4v2's per-run limit is 130 seconds.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Merge `docs/v2/contracts.md` into `docs/common/` (details below). Mark nothing as "new" in the merged text: write it as the contract, in the same voice as v1 | docs/common/conventions.md, docs/common/glossary.md, docs/common/data-model.md, docs/common/events.md, docs/common/ui-contract.md, docs/common/api-contract.md, docs/common/design-system.md, docs/common/demo-script.md, docs/common/definition-of-done.md | none | opus |
| T2 | Types: entities, shared shapes, events, feature types, cameras. Fix the type fallout in `src/app/` (the exhaustive records in `strings.ts`, `lang.ts`, `surfaces/views.ts` and the demo stage) with placeholder entries only | src/core/types.ts, src/core/events.ts, src/core/featureTypes.ts, src/core/index.ts, src/app/strings.ts, src/app/lang.ts, src/app/surfaces/views.ts, src/app/demo/cameras.ts, src/app/demo/DemoStage.tsx | T1 | opus |
| T3 | State and reducers, idempotent per entity ID, with unit tests applying every new type once and twice | src/core/state.ts, src/core/reducers/index.ts, src/core/reducers/search.ts, src/core/reducers/support.ts, src/core/reducers/listings.ts, src/core/reducers/projects.ts, src/core/reducers/model.ts, src/core/reducers/watch.ts, src/core/reducers/storefront.ts, src/core/reducers/small.ts, src/core/reducers.test.ts, src/core/testFixtures.ts | T2 | opus |
| T4 | Validation for every new payload, the per-key timeouts in the registry and the responder, and their tests | src/core/validate.ts, src/core/validate.test.ts, src/sources/types.ts, src/sources/registry.ts, src/sources/registry.test.ts | T2 | sonnet |
| T6 | Server config, services, health, requirements, conftest. Create or refresh `.venv` and install the requirements with `.venv`'s Python. On Linux, use `python3 -m venv .venv` | server/config.py, server/services.py, server/main.py, server/requirements.txt, tests/server/conftest.py | none | sonnet |
| T7 | `scripts/export-mock.mjs`, the `export:mock` script in `package.json`, G1b, G2b and G4v2 in `scripts/gate.mjs` | scripts/export-mock.mjs, scripts/gate.mjs, scripts/lib/common.mjs, package.json, package-lock.json | none | sonnet |
| T5 | Second spawn, after S3-catalog T1. The five new rows in the responder: `search.queried`, `surprise.asked`, `support.asked`, `listing.requested`, `watch.started`. `mockAnswers.ts` reads the new exports. The three helpers with their tests | src/sources/requests.ts, src/sources/requests.test.ts, src/sources/mockAnswers.ts, src/sources/keywordSearch.ts, src/sources/keywordSearch.test.ts, src/sources/surprise.ts, src/sources/surprise.test.ts, src/sources/scriptedSwarm.ts, src/sources/scriptedSwarm.test.ts, src/core/types.ts | S3-catalog T1, T4 | opus |

### T1 · What goes where in `docs/common/`

| File | Section of `docs/v2/contracts.md` it takes |
|---|---|
| `conventions.md` | Section 1 (the build machine, port 3000, the hosts, the environment variable table). Plus folder rows: `design/` (orchestrator, read-only for agents), `sponsors/` (scribe), `server/bNN_<slug>/` folders (backend-builder, with the upgrade's own prefix), `models/` (not committed), `artifacts/mock/` (written by `npm run export:mock`) |
| `glossary.md` | Section 9, appended to Domain words |
| `data-model.md` | Section 2: communities, the new and changed entities, the approval kinds and `community_fund`, the embedded passage rule, figures 11 to 15, the new `src/mock/` files, and the event-only ID prefixes below |
| `events.md` | Section 3, plus the store shapes in this plan's Interfaces |
| `ui-contract.md` | Section 4: routes, surfaces and frames, the transition rule, slots, `SlotProps`, the process bar and views, camera states with the Phase A mapping, test IDs. `frame-owner` and `PhoneFrame` are retired. `/dev/kit` and `?drawer=support` on Shop routes are added |
| `api-contract.md` | Sections 5 and 6 |
| `design-system.md` | Section 7, and desktop sizes: `PageFrame` 1440 by 900, the 56 px top bar, the 64 px process bar, the 440 px drawer. Phone frames are retired |
| `demo-script.md` | Only the Phase A mapping: a "Desktop camera (Phase A)" column next to the v1 camera column, plus one paragraph saying the timeline keeps the v1 camera IDs and the shell maps them until I2-tour. Nothing else changes |
| `definition-of-done.md` | Section 10's gates and tags |

**Event-only ID prefixes** that `data-model.md` gains:
- `qry_01` (the demo query) and `qry_51` onward (people's queries),
- `srp_01` and `srp_51` onward (surprise),
- `thr_01` and `thr_51` onward (support threads),
- `run_01` onward (scripted runs) and `run_51` onward (people's runs),
- `stp_0001` onward (scripted steps) and `stp_5001` onward (people's steps),
- `wsc_01` and `wsc_51` onward (watch scans),
- `lst_51` onward (people's listing requests),
- `chk_01` onward (listing checks),
- `ctb_01` onward (contributions).

### T5 · The responders in detail

- **`search.queried`**, from a person:
  - If its text, normalized as v1 normalizes questions, equals `demoSearch.query.text`, the answer is `demoSearch.answer` with the request's `queryId`.
  - Otherwise `scoreKeywords` answers with engine `keyword_scripted`.
  - When `report` in `model.ts` isn't null, a `search.mapped` follows 300 ms later: every piece's point from the report, the query placed at the score-weighted center of its top three results, and `approx: true`.
- **`surprise.asked`:** `drawSurprise` with the request's fields.
- **`support.asked`:**
  - The first run in `swarmRuns` whose trigger is `support`, on the same side, with a `matches` entry equal to the normalized text. Otherwise `fallbackSupportRun`.
  - Through `planRun`, with the thread and new run and step IDs.
- **`listing.requested`:** the run whose trigger has the request's `listingId`, otherwise `fallbackListingRun` with the request's `listingId`.
- **`watch.started`:**
  - `watch.scanned` (engine `scripted`, `candidates` as the count) at 1.2 s,
  - one `counterfeit.flagged` per `scriptedScan.cftIds` entry, 300 ms apart, with the request's `scanId`,
  - then `approval.requested` for `scriptedScan.approvalId` when it's set.
- **`extractKeywords` order:**
  1. moods,
  2. facet words (object, materials, techniques, motifs, colors),
  3. occasions and recipients,
  4. the price chip.
  
  Within each group, the order is the order of appearance in the text.
  - It matches multi-word vocabulary terms first, then single words with simple plural stripping (`ies` to `y`, then `es`, then `s`), then `keywordAliases`.
  - `under $N` and `below $N` become the chip `under $N` and the filter `maxPriceCents: N * 100`.
  - For figure 11's text it must return figure 11's six chips in figure 11's order. A unit test with a fixture vocabulary proves the rule. The data-smith's G2b test proves it on the real data.
- **Reasons:** `reason` is `{ en: "Matches " + words, zh: "匹配：" + words }`. The words stay as the facet words, which are English.

## Acceptance

- Given the first spawn's work, when `npm run check` runs, then it exits 0. Every v1 test still passes and every new reducer test passes.
- Given every event type in `docs/common/events.md`, when `reducers.test.ts` applies each once and then twice, then the state is the same after the second time.
- Given an invalid payload for each new type, when `validateEvent()` checks it, then it returns at least one problem. Given a valid one, it returns none.
- Given a fake adapter for `b14-swarm` that answers in 15 seconds, when its request plays in live mode, then its events are used. Given one for `b01-match` that answers in 9 seconds, then the scripted event plays. Both are tested with fake timers.
- Given `npm run test:smoke` and `npm run test:demo` after the first spawn, then both exit 0. The app looks and plays like v1.
- Given `npm run test:server`, then it exits 0, and the health self-test sees `keys` with five booleans and `services` with two.
- Given no environment variables and no `.env`, when `/api/health` answers, then every key and service is `false`, and the server starts without error.
- Given `ELASTIC_URL` set and `ELASTIC_AUTH=proxy` with no key, then `keys.elastic` is `true` and `elastic_headers()` returns `{}`.
- Given `npm run export:mock`, then `artifacts/mock/mock.json` exists, has `pieces` and `_generatedAt`, and the script exits 0 on Windows and Linux.
- Given T5, when a person's `search.queried` with figure 11's text plays in scripted mode, then 1.2 seconds later `search.answered` carries `demoSearch.answer`'s results with the request's `queryId`.
- Given T5, when a person asks a support question that matches no scripted run, then steps arrive 300 ms apart and the final `support.answered` comes from `fallbackSupportRun`, with a run ID from `run_51` and step IDs from `stp_5001`.
- Given T5, when `drawSurprise` runs twice with the same seed and inputs, then it returns the same piece.
- Given `npm run check:scope -- src/core/ src/sources/`, then it exits 0.

## Out of scope

- The desktop shell, routes, frames and the process bar, which are I2-shell.
- Kit components, which are I2-kit.
- Mock data, which is S3-catalog.
- Live adapters and routers, which are B11 to B15.
- Changes to `.gitignore`, `.env.example` or `CLAUDE.md`, which belong to the orchestrator. Listed under needs.

## Needs (for the orchestrator)

- Add `models/` to `.gitignore`.
- Add the v2 variable names to `.env.example` with empty values.
- Add `npm run export:mock` and `npm run art` to the Commands table in `CLAUDE.md`.

## Contract additions needed

`docs/v2/contracts.md` doesn't define these yet. This plan uses them:
- **Types and helpers:**
  - `SellView` and `SELL_VIEWS`, the eleven Sell views.
  - `TourCameraId`, `LegacyCameraId`, `LEGACY_CAMERA_TO_TOUR` and `toTourCamera()`. `CameraId` covers both sets until I2-tour.
  - The shared types `ScriptedRun`, `ModelReport`, `DemoSearch`, `DemoSurprise`, `ScriptedScan`, `Policy` in `src/core/types.ts`.
- **`SlotProps.searchParams?: { q?: string; k?: string[] }`.**
- **Mock exports:**
  - the export names in the "mock exports the responders read" table, including `keywordAliases`, `demoSearch`, `demoSurprise`, `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun`, `counterfeitCandidates` and `scriptedScan`,
  - `src/mock/index.ts` re-exports every new mock file, so `export:mock` sees them.
- **The keyword chip order rule** in T5. For figure 11 to come out in its stated order, `garden` and `peony` must be motif words and `gift for mom` must be a recipients phrase that `mom` aliases to.
- **The store shapes** for the new keys, and `demo.process`.
- **`search.mapped` gains `approx?: boolean`**, true when the query's point is estimated from its results instead of embedded.
- **The event-only ID prefixes** in T1 (`qry_`, `srp_`, `thr_`, `run_`, `stp_`, `wsc_`, `lst_51`, `chk_`, `ctb_`), with the people's ranges starting at 51 or 5001.
- **The shape of `artifacts/mock/mock.json`:** one top-level key per non-function export of `src/mock/index.ts`, plus `_generatedAt`.
- **`server/config.py`:** `elastic_headers()`, `apify_headers()` and `MODEL_TOP`. Upgrades call these instead of reading keys.
- **`server/services.py`:** `spacetime_reachable()` and `model_present()`.
- **`tests/server/conftest.py`:** `needs_service(name)`.
- **`?drawer=support` on Shop routes,** which opens `shop.drawer.support`. **`/dev/kit`** for the kit gallery.
