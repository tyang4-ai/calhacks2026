# B12-search · Vibe search and surprise me, on Elastic with our own vectors

Priority: P0 · Wave: V2 · Depends on: B11-embed (the model, `vectors.json`, `bm25.py`) · Folder: `server/b12_search/` · Source key: `b12-search` · Makes real: F-search (results, surprise me), the Finder's tools in B14, the index B14's Indexer writes to · Estimate: 3 h

**SCOPE:** `server/routers/b12_search.py, server/b12_search/, src/sources/live/b12-search.ts, tests/server/test_b12_search.py, tests/server/b12_fixture.json`

## Goal

Search by feeling, for real. A buyer's words become a query vector from Cindia's own model, and Elastic Serverless ranks the catalog by that vector and by keywords at once, fused into one list, with filters like price. The Elastic track sees our own embeddings in their index and an Agent Builder agent the swarm can ask. When Elastic can't be reached, the same fusion runs locally, so search never goes dark.

## Read first

- `docs/v2/contracts.md`:
  - section 1 (`ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `ELASTIC_AUTH=proxy`, the hosts),
  - section 2 (IndexEntry, figures 11 and 12),
  - section 3 (`search.queried`, `search.answered`, `surprise.asked`, `surprise.drawn`, `listing.indexed`, the Requests rows),
  - section 5 (B12),
  - section 11 (`config.elastic_headers()`, the surprise rule, `keywordAliases`, `mock.json`).
  
  After I2-core: `docs/common/api-contract.md` B12 and `events.md`.
- `docs/plans/B11-embed.md`: `model.py`, `bm25.py`, `metrics.py` (RRF) and `vectors.json`, which you import and read
- `docs/plans/F-search.md`: what the screens show
- `docs/plans/B04-bank.md`: the pattern of seeding from the adapter's `health()` in the background
- Elastic's docs, fetched as needed: Serverless API keys, the `dense_vector` mapping with `int8_hnsw`, the retrievers API (`rrf`, `standard`, `knn`), the bulk API, and Agent Builder in Kibana (agents, tools, converse). Read the current Agent Builder endpoint paths there and record them in `agent.py`'s docstring. Don't write them from memory.
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Elastic access** (`server/b12_search/elastic.py`):
  - httpx REST calls, no new client library.
  - The base URL is `ELASTIC_URL`.
  - Every request takes its auth from `config.elastic_headers()` (`contracts.md` section 11): `Authorization: ApiKey <key>` when `ELASTIC_API_KEY` is set, and nothing when `ELASTIC_AUTH=proxy`, because the cloud environment's network secret adds it. B12 never builds an auth header itself.
  - Timeouts: 3 seconds per call, 20 seconds for the bulk seed.
  - Never log a header, a key or a response body.
- **The index:** `cindia-pieces-v1` behind alias `cindia-pieces`. Mapping:
  - keywords: `pieceId`, `communityId`, `makerId`, `storefrontSlug`, `status`,
  - integers: `priceCents`, `salesThisMonth`,
  - text: `title_en` (English analyzer), `title_zh` (standard analyzer, which splits Chinese per character), `object`, `craft`, `people`, `embedText`,
  - text with a keyword subfield: `materials`, `techniques`, `motifs`, `colors`, `moods`, `occasions`, `recipients`,
  - `vector`: `dense_vector`, 384 dimensions, `similarity: cosine`, `index_options: { type: int8_hnsw }`.
  
  Set no shard or replica settings, since Serverless rejects them.
- **Endpoints** (`server/routers/b12_search.py`, `router = APIRouter(prefix="/api/b12")`):
  - `POST /api/b12/seed` `{ "entries", "pieces", "communities" }`, up to 60 seconds. It creates the index and the alias if missing, then bulk-writes one document per piece with its vector from B11's `vectors.json` (keyed by `pieceId`), then refreshes. It's idempotent: same document IDs, so a reseed overwrites. It returns `{ "events": [] }`. Without B11's vectors it answers 400 `bad_request`: "No vectors yet. Train B11 first." `communities` supplies `craft` and `people`.
  - `GET /api/b12/status` returns `{ "elastic", "indexed", "agentBuilder" }`. `elastic` is true when the cluster answers with our auth. `indexed` is the alias's document count. `agentBuilder` is true when `cindia-finder` exists and its last test conversation returned a valid piece ID. Each lookup is cached for 30 seconds.
  - `POST /api/b12/search` `{ "trigger", "queryId", "text", "keywords", "lang", "filters" }` returns one `search.answered`, under 4 seconds. The steps are below.
  - `POST /api/b12/surprise` `{ "trigger", "surpriseId", "keyword", "method", "seed" }` returns one `surprise.drawn`, under 2 seconds.
- **The search steps:**
  1. **Filters:** `filters.maxPriceCents` and `filters.communityIds`, plus any chip shaped like `under $200`, which becomes a price filter. Only `status: "active"` pieces are ever returned.
  2. **Query vector:** B11's `encode_queries()` on the query rule's text.
  3. **Elastic path,** engine `elastic_hybrid`:
     - One retrievers request: `rrf` over a `standard` retriever (a `multi_match` of the text and the keywords over the titles, `embedText` and the facet fields, with motifs and moods weighted up) and a `knn` retriever on `vector` (k 24, 100 candidates). The same filters go on both. `rank_constant` 60, `rank_window_size` 50, size 12.
     - If the cluster rejects the retrievers request, run the two queries separately and fuse them with B11's RRF, then note it once in the log.
  4. **Local path,** engine `local_hybrid`: when Elastic isn't configured or doesn't answer, the same fusion over `vectors.json` (cosine) and B11's BM25 over `embedText` and the facets from `artifacts/mock/mock.json`, with the same filters.
  5. **Results:**
     - At most 12, best first.
     - `score` is the fused score scaled to 0 to 1 within this answer, where the best is 1.
     - `matched` is the query's keywords found in that piece's facets or vibe, after `keywordAliases` from `mock.json` (so the chip `gift for mom` matches the recipients phrase).
     - `reason` comes from `reasons.py` with no model call. In English: "Matches peony, soft and gift for mom: a round silk fan." When nothing matched word for word: "Close in feel: gentle and hopeful." In Chinese, the matched words and the piece's Chinese title.
     - `modelId` is B11's.
- **Surprise** (`surprise.py`), the same rule as the scripted draw in `contracts.md` section 11, so only the ranking differs:
  - `keyword_random` and `fair_random` draw from the keyword's top 12 by the hybrid ranking, sorted by score and then `pieceId`. `pure_random` draws from all active pieces, sorted by `pieceId`.
  - Weights are equal for `keyword_random` and `pure_random`, and `1 / (1 + salesThisMonth)` for `fair_random`, normalized to sum to 1.
  - The draw takes the first number from mulberry32 seeded with `seed`, ported to Python bit for bit, and walks the cumulative weights in candidate order. A test checks the port against the first five numbers the browser's `src/sources/surprise.ts` gives for seeds 1 and 7.
  - Because B12 ranks with our model and the scripted draw with keywords, B12's piece for seed 7 may differ from the scripted `pc_46`. The tour doesn't depend on which piece it is.
- **Agent Builder** (`agent.py`):
  - `ensure_agent()` creates or updates agent `cindia-finder` in Kibana, at `KIBANA_URL` with the same auth plus `kbn-xsrf: true` on writes.
  - Its tool is a search over `cindia-pieces`, an index search tool or an ES|QL tool with price and community parameters, whichever the current API offers.
  - Its instructions say to answer only with pieces from the index, and to name each one by `pieceId`.
  - `converse(text) -> { "answer": str, "pieceIds": list[str] }` sends one message and parses the piece IDs out. IDs not in the catalog are dropped. It has a 6-second timeout.
- **Python module for B14 and the Indexer** (`server/b12_search/__init__.py` re-exports these):
  - `search(text, keywords, lang, filters, k=12)`, which returns the same shape as the endpoint's results plus `engine` and `modelId`,
  - `surprise(keyword, method, seed)`,
  - `converse(text)`,
  - `index_one(entry, piece, community, vector) -> bool`, which writes or overwrites one document. A draft listing goes in with `status: "draft"`, so search never returns it before the owner approves.
- **Events:** `source: "live"`, `key: "b12-search"`, IDs `evt_live_` from a counter starting at 1200001, `at` copied from the trigger or 0.
- **Adapter** (`src/sources/live/b12-search.ts`, default export a `LiveAdapter`):
  - `health()`:
    1. `GET /api/health` lists `b12`, and `GET /api/b11/model` says `trained`.
    2. `GET /api/b12/status`. When `elastic` is true and `indexed` is under 54, start `POST /api/b12/seed` in the background with `searchIndex`, `pieces` and `communities` from `src/mock`, and answer false until it's done (B04's pattern).
    3. When `elastic` is false, answer true, because the local path is live ranking with our own model.
  - `produce(event, state)`:
    - **A person's `search.queried`:** post it to `/api/b12/search`. When B11 is healthy, also post `/api/b11/map` and append its `search.mapped`. All within 7.5 seconds.
    - **The keyed `search.answered` in the tour:** post the matching `search.queried` from the store. If `pc_01` isn't in the first six results, return `[]`, so the scripted answer plays and the tour's next beat, which opens `pc_01`, still makes sense. B09's `pc_01` rule, applied here.
    - **A person's `surprise.asked`, or the keyed `surprise.drawn`:** post `/api/b12/surprise` with that draw's keyword, method and seed (from the store's `surprise.asked` for a keyed event).
    - **A keyed `listing.indexed`:** `[]`. B14's Indexer writes live entries through the Python module, and the tour has none.
    - Every fetch aborts at 7.5 seconds.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b12_search.py`, with Elastic and Kibana faked by httpx `MockTransport` and B11's encoder replaced by a fake, so no test downloads a model or calls out.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `local.py` and `reasons.py`: the local hybrid with filters, chip-to-filter parsing, the status filter, score scaling and reasons. Tests on a 6-piece fixture with hand-checked rankings | `server/b12_search/__init__.py`, `server/b12_search/local.py`, `server/b12_search/reasons.py`, `tests/server/b12_fixture.json` | B11 green | opus |
| T2 | `surprise.py`: the three methods, the candidate order and the mulberry32 port. Tests: the port matches the browser's numbers, the same seed gives the same piece, weights sum to 1, `fair_random` favors the fewest sales, and `pure_random` covers all active pieces | `server/b12_search/surprise.py` | T1 | sonnet |
| T3 | `elastic.py`: headers from `config.elastic_headers()`, the mapping, the seed with bulk, the retrievers query, the client-side fusion fallback, the status. Tests check the request bodies and that the proxy mode sends no auth header | `server/b12_search/elastic.py` | T1 | opus |
| T4 | `agent.py`: `ensure_agent()` and `converse()`. Tests check the requests and that unknown piece IDs are dropped | `server/b12_search/agent.py` | T3 | opus |
| T5 | The four endpoints, choosing the Elastic or the local path, the error shapes and the event envelope. Tests: every response validates against the contract, a bad body is 400, an Elastic timeout falls back to `local_hybrid` with status 200, a seed without vectors is 400. One `live` test (skipped unless `ELASTIC_API_KEY` or the proxy flag is set) seeds and runs the tour's query once | `server/routers/b12_search.py` | T2, T3, T4 | opus |
| T6 | The live adapter, with the background seed and the `pc_01` rule | `src/sources/live/b12-search.ts` | T5 | sonnet |

## Acceptance

- Given the 6-piece fixture, when the local path ranks "soft peony gift", then the hand-checked order comes back, a price filter removes pieces above it, and drafts never appear.
- Given seed 7 and the same candidates, when `surprise` runs twice, then it draws the same piece both times, and `fair_random` gives the fewest-sales piece the largest weight.
- Given Elastic configured, when the adapter's `health()` runs on an empty index, then the seed writes 54 documents with 384-number vectors, and `GET /api/b12/status` reports `indexed: 54`.
- Given the tour's query, when `POST /api/b12/search` runs against Elastic, then it returns one valid `search.answered`, engine `elastic_hybrid`, with at most 12 results, all at or under $200, each with `matched` and a `reason`.
- Given Elastic unreachable, when the same query runs, then it returns engine `local_hybrid` with status 200.
- Given `cindia-finder` exists, when `converse("wool pieces under $100 from Peru")` runs, then every returned piece ID is in the catalog, and `GET /api/b12/status` says `agentBuilder: true`.
- Given the proxy mode, when any Elastic call is made, then no request carries an `Authorization` header from our code.
- `npm run test:server` passes, and G5 for `b12` passes: the tour in live mode shows `b12-search` live for `search.answered` and `surprise.drawn`.

## Out of scope

- Indexing anything but the catalog.
- Semantic re-ranking with a hosted model.
- ELSER or any Elastic-hosted embedding. The vectors are ours.
- A search UI. F-search owns the screens.

## Contract additions needed

- `POST /api/b12/seed` gains `communities` in its body (for `craft` and `people`), and answers 400 `bad_request` before B11 has vectors.
- `listing.indexed` stays keyed to `b12-search`, but in v2 B14's response carries it, and B12's adapter returns `[]` for it.
- The Python module functions `search`, `surprise`, `converse` and `index_one`, which B14 imports.
- `src/sources/surprise.ts` (I2-core) exports its mulberry32 generator, so B12's test can compare the port against it, or a fixture of its first numbers for seeds 1 and 7 is written into the test.
