# B12-search · Vibe search and surprise me, on Elastic with our own vectors

Priority: P0 · Wave: V2 · Depends on: B11-embed (the model, `vectors.json`, `bm25.py`, `compose.query_text()`, the fingerprint) · Folder: `server/b12_search/` · Source key: `b12-search` · Makes real: F-search for a person's own search and surprise draw, the Finder's tools in B14 (`cindia_search`, and `cindia-finder` for find questions), the index B14's Indexer writes drafts to · Estimate: 3 h

**SCOPE:** `server/routers/b12_search.py, server/b12_search/, src/sources/live/b12-search.ts, tests/server/test_b12_search.py, tests/server/b12_fixture.json`

## Goal

Search by feeling, for real. A buyer's words become a query vector from Cindia's own model, and Elastic Serverless ranks the catalog by that vector and by keywords at once, fused into one list, with filters like price. The Elastic track sees our own embeddings in their index and an Agent Builder agent, `cindia-finder`, that the swarm calls from code for every find question (C-3). When Elastic can't be reached, the same fusion runs locally, so search never goes dark.

Elastic is the search index built from the platform's data (fix-plan 1.4): the same `src/mock/` export that seeds SpacetimeDB, plus B11's vectors. Nothing real goes into it (fix-plan 1.6). New listings wait in `cindia-drafts` and reach `cindia-pieces` only when the owner approves.

The tour is always scripted (fix-plan 1.2). B12 answers people's own searches and surprise draws in "try it yourself", and never replaces the tour's events.

## Read first

- `docs/v2/fix-plan.md` sections 1.2, 1.4, 1.6 and 1.9. Where it disagrees with `docs/v2/contracts.md`, the fix plan wins until FX1 lands its contract changes.
- `docs/v2/contracts.md`:
  - section 1 (`ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `ELASTIC_AUTH=proxy`, the hosts),
  - section 2 (IndexEntry, figures 11 and 12),
  - section 3 (`search.queried`, `search.answered`, `surprise.asked`, `surprise.drawn`, the Requests rows),
  - section 5 (B12),
  - section 11 (`config.elastic_headers()`, the surprise rule, `keywordAliases`, `mock.json`, `listing.indexed` keyed `b14-swarm`).

  After I2-core: `docs/common/api-contract.md` B12 and `events.md`.
- `docs/v2/apis-and-accounts.md`, the Elastic and Agent Builder sections, including the key's privileges
- `docs/plans/B11-embed.md`: `model.py`, `compose.py`, `bm25.py`, `metrics.py` (RRF), `vectors.json` and the fingerprint
- `docs/plans/F-search.md`: what the screens show
- `docs/plans/B04-bank.md`: the pattern of seeding from the adapter's `health()` in the background
- `docs/tech/elasticsearch/` (`dense-vector-mapping.md`, `knn-search.md`, `retrievers-rrf-hybrid.md`, `reciprocal-rank-fusion.md`, `serverless-project-connection-and-api-keys.md`, `serverless-differences-and-billing.md`) and `docs/tech/elastic-agent-builder/` (start with `kibana-api.md`, then `api-tools.md`, `api-agents.md`, `api-converse.md`, `tools-index-search-and-custom.md`, `api-keys.md`). Record the Agent Builder paths you use in `agent.py`'s docstring. Don't write them from memory.
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Elastic access** (`server/b12_search/elastic.py`):
  - httpx REST calls, no Elasticsearch client library (so `elasticsearch` can leave `server/requirements.txt`, B2-34).
  - The base URL is `ELASTIC_URL`.
  - Every request takes its auth from `config.elastic_headers()`: `Authorization: ApiKey <key>` when `ELASTIC_API_KEY` is set, and nothing when `ELASTIC_AUTH=proxy`, because the cloud environment's network secret adds it. B12 never builds an auth header itself.
  - The key needs index privileges on `cindia-pieces*` and `cindia-drafts*` (create, write, manage) and the `feature_agentBuilder` privileges, and nothing else (B2-33). `apis-and-accounts.md` says how.
  - Timeouts: one 2.5-second budget for the whole Elastic part of a search, 20 seconds for the bulk seed, 6 seconds for `converse()`. Every write tolerates `resource_already_exists_exception` as success.
  - Never log a header, a key, a URL with a key in it, or a response body. The `httpx` and `httpcore` loggers stay at WARNING.
- **The indices:**
  - `cindia-pieces-v1` behind alias `cindia-pieces`: the 54 active pieces, then approved listings.
  - `cindia-drafts-v1` behind alias `cindia-drafts`: drafted listings waiting for the owner (B2-25).
  - One mapping for both:
    - keywords: `pieceId`, `communityId`, `makerId`, `storefrontSlug`, `status`, `fingerprint`,
    - integers: `priceCents`, `salesThisMonth`,
    - text: `title_en` (English analyzer), `title_zh` (standard analyzer, which splits Chinese per character), `object`, `craft`, `craft_zh`, `people`, `embedText`,
    - text with a keyword subfield: `materials`, `techniques`, `motifs`, `colors`, `moods`, `occasions`, `recipients`,
    - `vector`: `dense_vector`, 384 dimensions, `similarity: cosine`, `index_options: { type: int8_hnsw }`.

  Set no shard or replica settings, since Serverless rejects them.
- **Endpoints** (`server/routers/b12_search.py`, `router = APIRouter(prefix="/api/b12")`):
  - `POST /api/b12/seed` `{ "trigger": null, "passagesHash": string }`, up to 60 seconds. B2-25: the server seeds from its own data, never from what the browser sends:
    1. It reads `pieces`, `communities` and `searchIndex` from `artifacts/mock/mock.json` (B11's `data.py`) and the vectors from B11's `vectors.json`. Without vectors, or when `vectors.json`'s fingerprint isn't B11's current one, it answers 400 `bad_request`: "No matching vectors yet. Train B11 first." When the body's `passagesHash` differs from the server's, it answers 400 too, because the browser and the server hold different catalogs.
    2. It creates both indices and aliases if missing, then bulk-writes one document per piece into `cindia-pieces` (document ID the `pieceId`, so a reseed overwrites), each carrying the `fingerprint`, then refreshes.
    3. It calls `ensure_agent()`, then one test `converse()` (D2-11), inside the same 60 seconds. A token-limit or any other Agent Builder error leaves `agentBuilder: false` and doesn't fail the seed.

    It returns `{ "events": [] }`. Two calls at once are single-flight: the second waits for the first and returns its result.
  - `GET /api/b12/status` returns `{ "elastic", "indexed", "drafts", "fingerprint", "agentBuilder" }` in under 1 second, always from a cache. A background thread refreshes the cache every 30 seconds in live mode, using `GET /` as the cluster check (Serverless answers 410 to `_cluster/*`), `GET /cindia-pieces/_count`, `GET /cindia-drafts/_count`, and one document's `fingerprint`. It never runs a conversation (B2-24). `agentBuilder` is the result of the seed's test conversation.
  - `POST /api/b12/search` `{ "trigger", "queryId", "text", "keywords", "lang", "filters" }` returns one `search.answered`, under 4 seconds. The steps are below.
  - `POST /api/b12/surprise` `{ "trigger", "surpriseId", "keyword", "method", "seed" }` returns one `surprise.drawn`, under 2 seconds.
  - `POST /api/b12/publish` `{ "trigger", "listingId", "pieceId", "approvalId" }`, under 3 seconds. When the owner approves a person's listing, it copies the draft document from `cindia-drafts` into `cindia-pieces` with `status: "active"` and deletes the draft, then tells SpacetimeDB through B13's bridge (`publish_listing`) when that's importable. It returns `listing.indexed` for the listing with its `pieceId`, `modelId` and `embedText`, keyed `b12-search`. It answers 404 `not_found` when there's no such draft. It never publishes anything the request didn't name, and only for an `approvalId` the request says was granted.
- **The search steps:**
  1. **Filters:** `filters.maxPriceCents` and `filters.communityIds`, plus any chip shaped like `under $200`, which becomes a price filter. Only `status: "active"` pieces are ever returned, and drafts are in another index anyway.
  2. **Query vector:** B11's `encode_queries()` on `compose.query_text(text, keywords)`: `query: <text>`, then each chip whose words aren't in the text, never the price chip (B2-27). The same rule B11 used for training and evaluation.
  3. **Elastic path,** engine `elastic_hybrid`, inside the 2.5-second budget:
     - One retrievers request: `rrf` over a `standard` retriever (a `multi_match` of the text and the keywords over the titles, `embedText` and the facet fields, with motifs and moods weighted up) and a `knn` retriever on `vector` (k 24, 100 candidates). The same filters go on both. `rank_constant` 60, `rank_window_size` 50, size 12.
     - If the cluster rejects the retrievers request and budget remains, run the two queries separately and fuse them with B11's RRF, then note it once in the log.
     - When the budget runs out, go local.
  4. **Local path,** engine `local_hybrid`: when Elastic isn't configured, doesn't answer in time, or its index fingerprint isn't B11's, the same fusion over `vectors.json` (cosine) and B11's BM25 over `embedText`, the facets, `title.zh` and the craft's Chinese name, with the same filters.
  5. **Results** (B2-26):
     - At most 12, best first. RRF fuses only pieces the keyword side actually matched, so a zero-score keyword hit never enters in `pieceId` order.
     - `score` is the fused score scaled to 0 to 1 within this answer, where the best is 1.
     - `closeness` is the piece's normalized cosine to the query, `(c - b) / (1 - b)` clipped to 0 to 1, where `b` is the query's mean cosine to all 54 pieces. It's shown beside the rank, so a nonsense query doesn't read as a perfect match.
     - `closeMatches` on the answer is false when no result's `closeness` reaches `CLOSE_MIN` in `server/b12_search/thresholds.py` (0.5 until T1 measures it on the eval queries and records the value), and the screen then says "no close matches".
     - `matched` is the query's keywords found in that piece's facets or vibe, after `keywordAliases` (so the chip `gift for mom` matches the recipients phrase).
     - `reason` comes from `reasons.py` with no model call. In English: "Matches warm, red and gift for mom: a hand-woven wool rug." When nothing matched word for word: "Close in feel: warm and bright." In Chinese, the matched words and the piece's Chinese title.
     - `modelId` is B11's.
- **Surprise** (`surprise.py`), the same draw as the scripted one in `src/sources/surprise.ts`, so only the ranking differs:
  - `keyword_random` and `fair_random` draw from the keyword's top 12 by the hybrid ranking, with candidates scoring above 0 only, sorted by score and then `pieceId`. `pure_random` draws from all active pieces, sorted by `pieceId`.
  - Raw weights are equal for `keyword_random` and `pure_random`, and `1 / (1 + salesThisMonth)` for `fair_random`.
  - The draw is ported exactly as `surprise.ts` does it: the first number from mulberry32 seeded with `seed`, ported bit for bit, times the total raw weight, then a plain loop over the raw weights in candidate order. Never Python's `sum()`, which uses compensated summation since 3.12 and can land on a different piece at a boundary (B2-26).
  - The event's `candidates[].weight` is each raw weight divided by the total, so they sum to 1 for display.
  - A golden test replays the whole draw for seeds 1, 7 and 13 against fixtures generated from `surprise.ts` (the integrator writes them, or I2-core exports `mulberry32` for a Node one-liner).
  - Because B12 ranks with our model and the scripted draw with keywords, B12's piece for seed 7 may differ from the scripted figure 12 piece. A person's draw is live, and the tour's is scripted.
- **Agent Builder** (`agent.py`), the Elastic track's visible job (C-3):
  - `ensure_agent()` creates or updates agent `cindia-finder` at `KIBANA_URL` with the same auth plus `kbn-xsrf: true` on writes, and its tool `cindia.search_pieces`, an `index_search` tool (or ES|QL, whichever the current API offers) over `cindia-pieces` only, with `status: active` in its instructions or filter, so drafts never reach it.
  - Its instructions say to answer only with pieces from the index, and to name each by `pieceId`.
  - `converse(text) -> { "pieceIds": list[str], "ms": int }` sends one message and parses the piece IDs out. IDs not in the catalog are dropped. It keeps only `pieceIds`, never the prose answer, so no model text reaches another agent (B2-26). It has a 6-second timeout. Keep calls few: the trial restricts LLM tokens and Serverless includes 1,000 executions a month.
  - B14's Finder calls it from code for every `find` intent (B14 plan), and the swarm view labels that step "Elastic Agent Builder".
- **Python module for B14 and the Indexer** (`server/b12_search/__init__.py` re-exports these):
  - `search(text, keywords, lang, filters, k=12)`, which returns the same shape as the endpoint's results plus `engine`, `modelId` and `closeMatches`,
  - `surprise(keyword, method, seed)`,
  - `converse(text)`,
  - `index_draft(entry, piece, community, vector) -> bool`, which writes or overwrites one document in `cindia-drafts` with `status: "draft"` and the current fingerprint,
  - `publish(listingId, pieceId) -> bool`, the endpoint's copy step.
- **Events:** `source: "live"`, `key: "b12-search"`, `at` copied from the trigger or 0. IDs are `evt_live_` plus a number made of `12`, the process start time in seconds modulo 1,000,000, and a four-digit counter (D1-52).
- **Adapter** (`src/sources/live/b12-search.ts`, default export a `LiveAdapter`):
  - `health()`:
    1. `GET /api/health` lists `b12`, and `GET /api/b11/model` says `trained` and `warm`.
    2. `GET /api/b12/status`. When `elastic` is true and `indexed` is under 54 or its `fingerprint` isn't B11's, start `POST /api/b12/seed` in the background (fetch timeout 60 seconds, D2-32) with the `passagesHash` of `searchIndex`, and answer false until it's done (B04's pattern). A failed seed is retried after 20 seconds.
    3. When `elastic` is false, or the seed failed, answer true, because the local path is live ranking with our own model.
  - `produce(event, state)`:
    - **A person's `search.queried`:** post it to `/api/b12/search`. When B11 is healthy, also post `/api/b11/map` and append its `search.mapped`. All within 7.5 seconds.
    - **A person's `surprise.asked`:** post `/api/b12/surprise` with its keyword, method and seed.
    - **The tour's keyed `search.answered` and `surprise.drawn`:** `[]`, so the tour plays scripted in both modes (fix-plan 1.2). `ALLOWED_EMPTY_FALLBACKS` lists both for `b12-search` (I2-tour T6, B2-11).
    - Anything else: `[]`. `listing.indexed` is keyed `b14-swarm` (contracts section 11), so this adapter never sees it.
    - Every fetch aborts at 7.5 seconds.
  - `start(emit)`: watches the store, and when an `approval.granted` lands for a `listing_publish` approval whose listing is a person's (`lst_user_`), posts `/api/b12/publish` once for that listing in this page load and emits the returned `listing.indexed`. It returns a stop function that unsubscribes and keeps the posted set, so a health flap never publishes twice.
- **Thresholds** live in `thresholds.py`: `ELASTIC_BUDGET_S = 2.5`, `SEED_BUDGET_S = 60`, `CONVERSE_TIMEOUT_S = 6`, `CLOSE_MIN`.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b12_search.py`, with Elastic and Kibana faked by httpx `MockTransport`, B11's encoder replaced by a fake, and the fake keys from conftest's autouse fixture, so no test downloads a model, calls out, or sees a real key. The transport handler records only whether an `Authorization` header was present, as a boolean, and never prints a request.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `local.py`, `reasons.py` and `thresholds.py`: the local hybrid with filters, chip-to-filter parsing, the status filter, RRF over matched keyword hits only, score scaling, `closeness` and `closeMatches`, and reasons. Measure `CLOSE_MIN` on the 50 eval queries with B11's fake-free model when it exists, and record it. Tests on a 6-piece fixture with hand-checked rankings | `server/b12_search/__init__.py`, `server/b12_search/local.py`, `server/b12_search/reasons.py`, `server/b12_search/thresholds.py`, `tests/server/b12_fixture.json` | B11 green | opus |
| T2 | `surprise.py`: the three methods, the candidate order, the mulberry32 port and the plain-loop walk. Tests: the golden draws for seeds 1, 7 and 13, the same seed gives the same piece, displayed weights sum to 1, `fair_random` favors the fewest sales, `pure_random` covers all active pieces | `server/b12_search/surprise.py` | T1 | sonnet |
| T3 | `elastic.py`: headers from `config.elastic_headers()`, both indices and aliases, the seed from the server's own data with the fingerprint, single flight, the retrievers query inside the 2.5-second budget, the client-side fusion fallback, the cached status with its background refresh. Tests check the request bodies, that proxy mode sends no auth header, that a slow fake cluster falls back inside the budget, and that status answers from cache in under 1 second | `server/b12_search/elastic.py` | T1 | opus |
| T4 | `agent.py`: `ensure_agent()` with the tool over `cindia-pieces`, and `converse()` keeping only valid `pieceIds`. Tests check the requests, that unknown piece IDs and the prose answer are dropped, and that a token-limit error means `agentBuilder: false` | `server/b12_search/agent.py` | T3 | opus |
| T5 | The five endpoints, the Elastic or local choice, `index_draft()` and `publish()`, the error shapes and the event envelope. Tests: every response validates against the contract, a bad body is 400, an Elastic timeout falls back to `local_hybrid` with status 200, a seed without matching vectors is 400, a seed with another catalog's `passagesHash` is 400, publish copies a draft and deletes it and 404s on a missing one. One `live` test (skipped unless the Elastic key or the proxy flag is set) seeds, runs the tour's query once, and runs the 50 eval queries once on Elastic, writing recall at 5 and MRR@10 to `server/b12_search/eval.json` (B2-8) | `server/routers/b12_search.py`, `server/b12_search/eval.json` | T2, T3, T4 | opus |
| T6 | The live adapter: people's searches and draws, the background seed, `[]` for the tour, and the publish watch | `src/sources/live/b12-search.ts` | T5 | sonnet |
| T7 | **If time** (fix-plan 1.5, C-9): in live mode the Finder writes the chips. `POST /api/b12/search` with `finder: true` asks B14's Finder (Haiku, imported inside the function) for keywords and filters, uses them, and returns them on `search.answered` labeled as the Finder's. The rule-based extractor stays the instant preview and the scripted path. Only after FX1 adds the fields below | `server/routers/b12_search.py`, `src/sources/live/b12-search.ts` | T6, B14 green | sonnet |

## Acceptance

- Given the 6-piece fixture, when the local path ranks "warm red rug gift", then the hand-checked order comes back, a price filter removes pieces above it, a piece with no keyword match enters only through the vector side, and drafts never appear.
- Given seeds 1, 7 and 13, when `surprise` runs, then each draw equals the golden draw from `surprise.ts`, and `fair_random` gives the fewest-sales piece the largest weight.
- Given Elastic configured, when the adapter's `health()` runs on an empty index, then the seed writes 54 documents with 384-number vectors and B11's fingerprint from the server's own data, `cindia-finder` exists after it, and `GET /api/b12/status` reports `indexed: 54` in under 1 second.
- Given a person's query in live mode, when `POST /api/b12/search` runs against Elastic, then it returns one valid `search.answered`, engine `elastic_hybrid`, with at most 12 results, each with `matched`, `closeness` and a `reason`, and every result within the query's filters.
- Given Elastic unreachable or slow, when the same query runs, then it returns engine `local_hybrid` with status 200, in under 4 seconds.
- Given `cindia-finder` exists, when `converse("wool pieces under $100 from Arizona")` runs, then every returned piece ID is an active piece in the catalog, and no prose comes back.
- Given a person's listing drafted by B14 and then approved by the owner, when the approval lands, then the draft leaves `cindia-drafts`, the piece is in `cindia-pieces`, and a `listing.indexed` arrives. Before the approval, no search and no Agent Builder answer returns it.
- Given the proxy mode, when any Elastic call is made, then no request carries an `Authorization` header from our code.
- Given the tour in live mode, when `search.answered` and `surprise.drawn` arrive, then the adapter returns `[]` and the scripted events play.
- `npm run test:server` passes. **G5 for v2** (fix-plan 1.4) passes: `npm run test:server`, a live feature spec where a person's own search in live mode gets a live `search.answered` and `search.mapped`, and a person's own surprise draw a live `surprise.drawn`, with every event valid, and the scripted tour still passing with `b12-search` in live mode.

## Out of scope

- Indexing anything but the catalog and approved listings.
- Semantic re-ranking with a hosted model.
- ELSER or any Elastic-hosted embedding. The vectors are ours.
- A search UI. F-search owns the screens.
- Any real piece, maker or buyer in either index.

## Contract additions needed

FX1 writes these into `docs/v2/contracts.md`. I2-core merges them.
- Section 5, B12: `POST /api/b12/seed` takes `{ trigger, passagesHash }` and seeds from the server's own `mock.json` and `vectors.json` (it no longer takes `entries`, `pieces` or `communities`). It calls `ensure_agent()` and one test conversation. `GET /api/b12/status` returns `{ elastic, indexed, drafts, fingerprint, agentBuilder }` from a cache in under 1 second. New `POST /api/b12/publish` `{ trigger, listingId, pieceId, approvalId }` returns `listing.indexed` keyed `b12-search`. Drafts live in `cindia-drafts` until the owner approves. The module functions are `search`, `surprise`, `converse`, `index_draft` and `publish`.
- Section 3: `search.answered` results add `closeness: number` (0 to 1), and the payload adds `closeMatches: boolean`. `surprise.drawn` candidates' `weight` values sum to 1. `listing.indexed` stays keyed `b14-swarm` for the Indexer's draft and is keyed `b12-search` when B12's publish sends it.
- If T7 runs: `search.answered` adds `keywords?: string[]`, `filters?` and `keywordsBy?: "finder" | "rules"`.
- `tests/demo/beats.ts` (I2-tour T6): `ALLOWED_EMPTY_FALLBACKS` adds `b12-search` for `search.answered` and `surprise.drawn`, and `REQUIRED_SERVICES` has `b12-search: model`.
- `src/sources/surprise.ts` (I2-core) exports `mulberry32`, or the integrator writes golden draws for seeds 1, 7 and 13 into `tests/server/b12_surprise_golden.json`.
- `server/requirements.txt` (I2-core) drops `elasticsearch`, since B12 uses httpx.
