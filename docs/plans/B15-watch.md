# B15-watch · Counterfeit watch with Apify

Priority: P1 · Wave: V2 · Depends on: B11-embed (the model), B14-swarm (the step recorder and the live approval shape, optional at run time) · Folder: `server/b15_watch/` · Source key: `b15-watch` · Makes real: F-watch (Sell › Counterfeit watch), the watch view · Estimate: 2.5 h

**SCOPE:** `server/routers/b15_watch.py, server/b15_watch/, src/sources/live/b15-watch.ts, tests/server/test_b15_watch.py, tests/server/b15_fixture.json`

## Goal

Fakes are an old problem for makers, and Indigenous makers have the most to lose. The watch runs the maker's pieces as web searches through Apify, compares what it finds with Cindia's own embeddings, checks what each listing claims, and hands the owner a calm draft report to approve. It never accuses anyone, never visits the pages it finds, and never sends anything by itself. The Apify track sees Apify doing the core of a real job.

## Read first

- `docs/v2/contracts.md`:
  - section 1 (`APIFY_TOKEN`, `APIFY_AUTH=proxy`, the hosts),
  - section 2 (CounterfeitCandidate, figure 14),
  - section 3 (`watch.started`, `watch.scanned`, `counterfeit.flagged`, the 60-second key timeout),
  - section 5 (B15),
  - section 11 (`config.apify_headers()`, the ID scheme, the watch run carrying `fup_02` then `apr_03`).
  
  After I2-core: `docs/common/api-contract.md` B15.
- `docs/plans/S3-catalog.md`: the scripted scan in `src/mock/watch.ts` (`scriptedScan` for `wsc_01`, `cft_01` to `cft_04`, `fup_02`, `apr_03`)
- `docs/plans/B11-embed.md` (`encode_queries`, `piece_vectors`) and `docs/plans/B14-swarm.md` (`RunRecorder`, `llm.parse`, the live approval shape)
- Apify's API docs for running an actor synchronously and getting its dataset items, and the input and output schema of Apify's Google search results scraper actor. Check both before coding. Don't write them from memory.
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Scout** (`scout.py`, code):
  - One synchronous run of the Google search scraper actor through the Apify API, with the maker's queries (at most 3), one page per query and at most 10 results per query.
  - Auth comes from `config.apify_headers()` (`contracts.md` section 11): `Authorization: Bearer <APIFY_TOKEN>`, or nothing when `APIFY_AUTH=proxy`. B15 never builds an auth header itself.
  - The whole call has a 45-second budget, passed to Apify as the run's timeout and enforced on our side too.
  - It keeps only `title`, `url` and the snippet from each organic result, dropping duplicate URLs. It stores nothing after the response.
- **Comparer** (`compare.py`, code):
  - Each result's `title. snippet` is embedded as a query with B11, and scored against the maker's piece vectors.
  - The matched piece is the closest one.
  - Because raw cosine runs high for any two texts, the reported `similarity` is calibrated: `(c - b) / (1 - b)`, clipped to 0 to 1, where `c` is the cosine to the matched piece and `b` is the mean cosine of that result to all 54 pieces.
  - A result counts as a look-alike at 0.75 or above.
- **Claims** (`claims.py`, `claude-haiku-5-5` through B14's `llm.parse`):
  - Output: `claimsCommunityMade`, `claimsIndigenousMade`, `claimsAuthentic`, `saysInspiredOrStyle`, `quote` (the words that make the claim, copied exactly from the title or snippet, or empty), and `claim` in English and Chinese.
  - The server checks that `quote` appears word for word in the result. If it doesn't, the result counts as making no claim.
  - **Without the Anthropic key,** a rule-based check stands in: a small word list for claims (authentic, genuine, handmade by, hand-stitched, made by the community's name, Native made, Indigenous made) and for disclaimers (inspired, style, machine). Its steps say rule-based.
- **A hit** is a look-alike whose claim is unverified: any of the three claims is true, `saysInspiredOrStyle` is false, and the page isn't a Cindia storefront. The scan reports at most 3 hits.
- **Reporter** (`reporter.py`, `claude-sonnet-5-5`):
  - For each hit it drafts a short note to the marketplace's trust and safety team, in both languages: what the listing says, which of the maker's pieces it resembles and how closely, that its claim isn't verified, and a request to review.
  - It names no person and uses no word that accuses (fraud, scam, illegal, fake). The server checks that list.
  - Without the key, it uses a plain template.
- **Endpoint** (`server/routers/b15_watch.py`, `router = APIRouter(prefix="/api/b15")`):
  - `POST /api/b15/watch` `{ "trigger", "runId", "idStart", "tourIds?", "scanId", "makerId", "queries", "pieces", "entries" }`, under 58 seconds.
    - IDs follow `contracts.md` section 11. The adapter sends `runId` (`run_user_<n>`) and `idStart`, the next free number per prefix in the store, and the server numbers from there.
    - With `tourIds: { cftId: "cft_01", followUpId: "fup_02" }` (the tour's scan only), the first hit takes those IDs, and no `approval.requested` is returned.
    - It returns, in order:
      1. the `swarm.step` events (`stp_user_<n>`) for `scout`, `comparer`, `claims` and `reporter`, through B14's `RunRecorder` when it's importable, with the run's `threadId` set to the `scanId`,
      2. `watch.scanned` (engine `apify`, `candidates` as the result count),
      3. for each hit, `counterfeit.flagged` (`cft_user_<n>`), `followup.drafted` (`fup_user_<n>`, the Reporter's draft) and `approval.requested` (`apr_user_<n>`, kind `report_listing`, with the live `approval` object B14 adds to the contract).
  - Envelope: `source: "live"`, `key: "b15-watch"`, IDs `evt_live_` from a counter starting at 1500001, `at` copied from the trigger or 0.
  - Errors:
    - 503 `key_missing` when there's neither `APIFY_TOKEN` nor the proxy flag,
    - 504 `upstream_timeout` when Apify runs past its budget,
    - 502 `upstream_error` on an Apify error.
    
    When B11 has no trained model, it returns `{ "events": [] }`, so the scripted scan plays.
  - It never fetches a result's page. The only outbound hosts are Apify's API and the Anthropic API.
- **Adapter** (`src/sources/live/b15-watch.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b15`, `keys.apify` is true, and `GET /api/b11/model` says `trained`.
  - `start(emit)`: when live mode turns on, start the tour's scan (`scriptedScan` from `src/mock/watch.ts`, its `scanId`, maker and queries, with that maker's pieces and entries) in the background and cache its promise by `scanId`. It emits nothing itself and returns a stop function that drops the cache.
  - `produce(event, state)`:
    - **A person's `watch.started`:** post it with that maker's pieces and entries from `src/mock`, and wait up to 59.5 seconds.
    - **The tour's keyed `watch.scanned`, `counterfeit.flagged` or `followup.drafted` for `wsc_01`:** wait at most 3 seconds for the cached scan.
      - The cached tour scan asks the server for tour IDs: its first hit becomes `cft_01` with its draft as `fup_02` (the tour's own IDs, v1's live-twin rule), later hits get `cft_user_<n>`, and the run emits no approval, because the tour's `apr_03` (keyed `b08-approvals`, subject `cft_01`) follows as scripted.
      - When the scan is ready, return its whole event list, which the reducers deduplicate by ID.
      - When it isn't ready, return `[]`, so the scripted event plays and the panel keeps its Simulated badge.
      - Do the same for a keyed `counterfeit.flagged` or `followup.drafted` when the live scan found no hit, because the real web may hold no look-alike that day, and the panel should say so honestly.
- **Thresholds** live in one place, `thresholds.py`: `SIMILARITY_MIN = 0.75`, `MAX_QUERIES = 3`, `RESULTS_PER_QUERY = 10`, `MAX_HITS = 3`, `APIFY_BUDGET_S = 45`, `TOTAL_BUDGET_S = 58`.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b15_watch.py`, with Apify faked by httpx `MockTransport` (results in `tests/server/b15_fixture.json`), B11's encoder faked, and a fake Anthropic client.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `thresholds.py` and `scout.py`. Tests: the request's path, body and auth (no header in proxy mode), at most 3 queries and 10 results each, duplicates dropped, only title, URL and snippet kept, a slow fake Apify giving `upstream_timeout` | `server/b15_watch/__init__.py`, `server/b15_watch/thresholds.py`, `server/b15_watch/scout.py`, `tests/server/b15_fixture.json` | B11 green | opus |
| T2 | `compare.py`. Tests with hand-made vectors: the calibration formula, the matched piece, the 0.75 line | `server/b15_watch/compare.py` | T1 | sonnet |
| T3 | `claims.py`, the model path and the rule-based path. Tests: a quote not in the result means no claim, "Gu-inspired machine embroidery" isn't a hit, "authentic hand-stitched Gu embroidery" is | `server/b15_watch/claims.py` | T2 | opus |
| T4 | `reporter.py`. Tests: the draft names the piece and the similarity, contains none of the accusing words, and the template works without the key | `server/b15_watch/reporter.py` | T3 | sonnet |
| T5 | The endpoint, the event order, the step recording, the error shapes. Tests: every returned event validates, only Apify's host was called, no token in any log line. One `live` test (skipped without the Apify token and a trained model) runs one query with 3 results | `server/routers/b15_watch.py` | T4 | opus |
| T6 | The live adapter, with the background demo scan and the 3-second wait for the tour's keyed events | `src/sources/live/b15-watch.ts` | T5 | opus |

## Acceptance

- Given the fixture results, when the scan runs with fakes, then it returns, in order, the four agents' steps, one `watch.scanned`, and one `counterfeit.flagged` with its `followup.drafted` and `approval.requested`, for the one result that resembles `pc_01` at 0.75 or above and claims to be hand-stitched Gu embroidery. The honest "Gu-inspired" result isn't flagged.
- Given `APIFY_AUTH=proxy`, when the scout calls Apify, then our request carries no `Authorization` header.
- Given any scan, when its outbound requests are counted, then they went only to Apify and the Anthropic API, and no result page was fetched.
- Given a hit, when its draft is read, then it accuses no one and asks for a review, and the only path from it to anything sent is the owner's approval, which v1's B08 carries.
- Given live mode switched on at the tour's start, when `d14-watch` arrives, then the cached scan's events replace the scripted ones, or the scripted ones play with the Simulated badge when the scan isn't back or found nothing.
- `npm run test:server` passes, and G5 for `b15` passes, with the allowed-empty entries below.

## Out of scope

- Visiting, screenshotting or storing any found page.
- Image comparison.
- Sending a report, contacting a seller, or a takedown request of any kind.
- Scanning anything but the maker's own pieces.

## Contract additions needed

- `tests/demo/beats.ts`: `ALLOWED_EMPTY_FALLBACKS` gains `b15-watch` for `watch.scanned`, `counterfeit.flagged` and `followup.drafted` (an integrator change), because the live scan may not be back in time, or may find nothing on the real web.
- The tour's `followup.drafted` `fup_02` carries key `b15-watch`, not `b02-explain` (I2-tour's timeline task), so B02's adapter never tries to explain it. The request field `tourIds` above.
- Section 11's `*_user_<n>` scheme extended to `cft_user_<n>` and `fup_user_<n>` (with B14's `apr_user_<n>`), the request fields `runId` and `idStart`, and the scan's `threadId` being its `scanId`.
- The `approval` object on `approval.requested`, as B14 adds it.
