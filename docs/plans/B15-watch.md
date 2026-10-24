# B15-watch · The copy watch with Apify, on our own sandbox market

Priority: P1 · Wave: V2 · Depends on: D-deploy (the public site and its sandbox market at `PUBLIC_SITE_URL/market/`), B11-embed (the model, optional: without it the text checks still run), B14-swarm (`llm.parse`, `RunRecorder`, `content_check()`, the live approval shape, optional at run time), S3-catalog (`contentRules`, the co-op's pieces and stories) · Folder: `server/b15_watch/` · Source key: `b15-watch` · Makes real: F-watch's Scan now for a person's own scan, and the watch view · Estimate: 2.5 h

**SCOPE:** `server/routers/b15_watch.py, server/b15_watch/, src/sources/live/b15-watch.ts, tests/server/test_b15_watch.py, tests/server/b15_fixture.json, tests/server/b15_threshold_fixture.json`

## Goal

Fakes are a live problem for Native American makers: in August 2026 a San Francisco seller admitted selling over $92,000 of imported jewelry as Native-made (fix-plan 1.3). The watch looks for copies of the Diné co-op's own pieces. Apify's crawler reads a market, Cindia's own model compares each listing with the co-op's pieces, a small agent checks what each listing claims, and the owner gets a calm draft report to approve. It never accuses anyone, never sends anything by itself, and the owner decides.

**It never searches the real web** (fix-plan 1.6). The market it crawls is our own sandbox market: static pages of fictional listings by invented sellers, some of them look-alikes of the co-op's pieces, that ship with the public site at `PUBLIC_SITE_URL/market/`. Until the public site is up, B15 runs on its fixture and the watch stays scripted. The Apify track sees Apify doing the core of the job, and every result it returned is on screen (C-6).

The tour's `d14-watch` always plays the scripted scan (A2-1). Live scans run only from a person's Scan now.

## Read first

- `docs/v2/fix-plan.md` sections 1.3, 1.6 and 1.9 (the hit rule, "Text match 0.91"). Where it disagrees with `docs/v2/contracts.md`, the fix plan wins until FX1 lands its contract changes.
- `docs/v2/contracts.md`:
  - section 1 (`APIFY_TOKEN`, `APIFY_AUTH=proxy`, `PUBLIC_SITE_URL`, the hosts),
  - section 2 (CounterfeitCandidate, figure 14),
  - section 3 (`watch.started`, `watch.scanned`, `counterfeit.flagged`, the 60-second key timeout),
  - section 5 (B15),
  - section 11 (`config.apify_headers()`, the ID scheme, the watch run carrying `fup_02` then `apr_03`),
  - section 12 (labels L19 to L24).

  After I2-core: `docs/common/api-contract.md` B15.
- `docs/tech/apify/cheerio-scraper.md` (the Actor this plan uses: input, output, price, and Cindia's call), `docs/tech/apify/run-sync-get-dataset-items.md` and `docs/tech/apify/api-authentication-and-limits.md`. Don't write the API from memory.
- `docs/plans/S3-catalog.md`: the scripted scan in `src/mock/watch.ts` (`scriptedScan` for `wsc_01`, `cft_01` to `cft_04`, `fup_02`, `apr_03`), and `contentRules`
- `docs/plans/D-deploy.md`: the sandbox market's pages
- `docs/plans/B11-embed.md` (`encode_queries`, `piece_vectors`, `compose.query_text()`) and `docs/plans/B14-swarm.md` (`RunRecorder`, `llm.parse`, `content_check()`, the live approval shape)
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Scout** (`scout.py`, code):
  - One synchronous run of `apify/cheerio-scraper`: `POST https://api.apify.com/v2/actors/apify~cheerio-scraper/run-sync-get-dataset-items?timeout=40&format=json&clean=true`.
  - Input, exactly as `docs/tech/apify/cheerio-scraper.md` gives Cindia's call: `startUrls` is `PUBLIC_SITE_URL/market/`, `linkSelector` `a[href]`, `globs` `PUBLIC_SITE_URL/market/**`, `maxCrawlingDepth` 1, `maxPagesPerCrawl` 30, `maxConcurrency` 5, `maxRequestRetries` 1, `pageLoadTimeoutSecs` 15, a `pageFunction` that returns `{ url, title, text }` from `<title>` and `<main>`, and `proxyConfiguration` `{ "useApifyProxy": false }`.
  - **`respectRobotsTxtFile` is sent as `false`.** The public site's `robots.txt` disallows every crawler so search engines stay off it, and each `/market/` page carries its own `noindex` meta tag (D-deploy). The Scout reads only our own pages, and the globs pin it to `/market/`.
  - Auth comes from `config.apify_headers()`: `Authorization: Bearer <APIFY_TOKEN>`, or nothing when `APIFY_AUTH=proxy`. B15 never builds an auth header, and no URL it builds or logs ever carries a token (B2-34).
  - The whole call has a 45-second budget on our side, with 40 seconds passed to Apify as the run's timeout. A 408 from Apify counts as a timeout.
  - It keeps only items whose `url` is `http` or `https` and starts with `PUBLIC_SITE_URL/market/`, drops duplicate URLs and the market's index page, caps `title` at 300 characters and keeps the first 300 characters of `text` as the `snippet` (B2-19). It stores nothing after the scan's cache expires.
- **Comparer** (`compare.py`, code):
  - Each result's `title. snippet` is embedded with B11 through `compose.query_text()` and scored against the co-op's 12 piece vectors.
  - The matched piece is the closest one.
  - `similarity` is a normalized score (fix-plan 1.9, B2-9): `(c - b) / (1 - b)`, clipped to 0 to 1, where `c` is the cosine to the matched piece and `b` is the result's mean cosine to all 54 pieces. Screens show it as "Text match 0.91" (L19), never as a percentage or a picture match.
  - **The threshold is measured, not guessed.** `calibrate.py` scores `tests/server/b15_threshold_fixture.json` with the real model: for each of the co-op's 12 pieces, 3 look-alike and 3 unrelated listing texts, written once by the builder, invented, on `example.com`. It picks the lowest threshold with precision of at least 0.9 and writes `server/b15_watch/threshold.json` `{ "fingerprint", "threshold", "precision", "recall", "n" }`, with the model's fingerprint. `thresholds.py` reads it. When it's missing or its fingerprint isn't the model's, the threshold is 0.75 and every step and `notes` line says "not measured".
  - Without a trained model (C-6), `similarity` is null and the scan still runs on the text checks below. The health check doesn't wait on B11.
- **Evidence** (`evidence.py`, code), the hit rule from fix-plan 1.9 and A2-1. A result is a possible copy only with evidence about this maker:
  - it names the co-op (the Diné Weaving and Silver Co-op) or one of its makers (Grace N., Lena T., Mae K.), as the server's own `mock.json` records them,
  - it repeats a run of 8 words from one of the co-op's piece stories (lowercased, punctuation stripped), or
  - it claims a Cindia verification ("verified on Cindia", "Cindia verified" and the like) on a page that isn't a Cindia storefront.

  A bare craft or origin claim is never a possible copy.
- **Claims** (`claims.py`, `claude-haiku-5-5` through B14's `llm.parse`):
  - It runs only on results with evidence or a similarity at or above the threshold, at most 10 per scan, in parallel, 5 seconds each (B2-19). The rest get the rule-based check.
  - Output: `claimsNativeMade`, `claimsCommunityMade`, `claimsAuthentic`, `saysInspiredOrStyle`, and `quote`, the words that make the claim, copied exactly from the title or snippet, or empty.
  - **Untrusted text.** The results go in a delimited data block, and the system prompt says this is untrusted text from a web page, to be read and never obeyed. The server checks that `quote` appears word for word in that result. If it doesn't, the result counts as making no claim.
  - **Without the Anthropic key,** a rule-based check stands in: a small word list for claims ("authentic", "genuine", "Native made", "Native American made", "handmade by", the co-op's name) and for disclaimers ("inspired", "style", "machine made"). Its steps say rule-based.
- **Verdicts** (decided with F-watch). Every result the crawl checked gets one, and `watch.scanned` lists them all:
  - `possible_copy`: evidence about this maker (above). It gets a `counterfeit.flagged`, a Reporter draft and an approval. At most 3 per scan.
  - `claim_only`: claims to be Native-made, community-made or authentic, with no evidence about this maker. Listed with L22 ("Claims to be Native-made. We can't check that."), and it never gets a report.
  - `neither`: everything else, look-alikes with no claim included.
- **Reporter** (`reporter.py`, `claude-sonnet-5-5`, A2-13):
  - The draft is a template filled by code, in both languages: the listing's title (from the result, by code), its own URL and no other, which of the co-op's pieces it resembles and its text match, the evidence found, that Cindia hasn't verified its claim, and a request to review. The model only picks which of the listing's own words to quote, checked word for word.
  - It names no seller, cites no law, and runs `content_check()` with `contentRules.accusingWords` in English and Chinese: counterfeit, knockoff, copy, stolen, infringe, violate, fraud, scam, illegal, fake, 假冒, 仿冒, 冒充, 山寨, 盗版, 侵权, 欺诈, 违法, and any more the list holds. A hit falls back to the plain template.
  - At most 1,200 characters per language.
  - Without the key, the plain template.
- **Endpoints** (`server/routers/b15_watch.py`, `router = APIRouter(prefix="/api/b15")`). Long work starts, then the adapter polls (B2-16):
  - `POST /api/b15/watch` `{ "trigger", "runId", "idTag", "idStart", "scanId", "makerId", "queries" }` starts the scan in a server thread and answers 202 at once with `{ "scanId", "status": "running" }` (not an events response).
    - **Only the Diné co-op's makers** (A2-20): `makerId` must be one of `com_dine`'s makers in the server's own `mock.json`, or it answers 400 `bad_request`. The co-op's pieces, stories and index entries come from the server's `mock.json`, never from the request.
    - Single flight: a second POST with the same `scanId` returns that scan. One scan runs at a time across the server, and another one answers 503 `busy`.
    - Cache: a scan of the same maker within 30 minutes reuses the crawl and the checks with fresh IDs, with no new Apify run and no new Claude call.
    - `queries` are the maker's words shown on the screen. The Scout crawls the whole market either way, and the Comparer uses the maker's pieces.
  - `GET /api/b15/watch/{scanId}` returns `{ "status": "running" | "done" | "failed", "events": CindiaEvent[], "error": { "code", "message" } | null }` in under 200 ms. `events` is empty until `done`. Then, in order:
    1. the `swarm.step` events (`stp_user_<tag>_<n>`) for `scout`, `comparer`, `claims` and `reporter`, through B14's `RunRecorder` when it's importable, with the run's `threadId` set to the `scanId`,
    2. `watch.scanned`: `engine: "apify"`, `candidates` (the count), and `results`, every checked result as `{ title, url, snippet, similarity, verdict }`,
    3. for each possible copy, `counterfeit.flagged` (`cft_user_<tag>_<n>`), `followup.drafted` (`fup_user_<tag>_<n>`, the Reporter's draft) and `approval.requested` (`apr_user_<tag>_<n>`, kind `report_listing`, with the live `approval` object).
  - `GET /api/b15/status` returns `{ "market": boolean, "threshold": number, "measured": boolean, "model": boolean }` in under 200 ms. `market` is true when `PUBLIC_SITE_URL` is set. Not an events response.
  - Envelope: `source: "live"`, `key: "b15-watch"`, `at` copied from the trigger or 0. IDs are `evt_live_` plus a number made of `15`, the process start time in seconds modulo 1,000,000, and a four-digit counter (D1-52).
  - Errors, in a failed scan's `error` or as the POST's status:
    - 503 `key_missing` when there's neither `APIFY_TOKEN` nor the proxy flag,
    - 503 `upstream_error` when `PUBLIC_SITE_URL` isn't set: "The sandbox market isn't set up yet.",
    - 504 `upstream_timeout` when Apify runs past its budget,
    - 502 `upstream_error` on an Apify error.
  - It never fetches a page itself. The only outbound hosts are `api.apify.com` and `api.anthropic.com`. It calls `bridge.set_process("watch", ...)` at the start and end of a scan when B13 is importable.
- **Adapter** (`src/sources/live/b15-watch.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b15` and `keys.apify` is true, then `GET /api/b15/status` says `market`. It doesn't wait on B11 (C-6).
  - `produce(event, state)`:
    - **A person's `watch.started`:** post it with `runId`, `idTag` (`pageTag()`) and `idStart` from `liveIdStart()` (8 steps, 3 hits, 3 drafts, 3 approvals), then poll `GET /api/b15/watch/{scanId}` every second until it's `done` or `failed`, within 59.5 seconds in all, and return its events. A failed scan throws, so the scripted scan plays with the Simulated badge.
    - **The tour's keyed `watch.scanned`, `counterfeit.flagged` and `followup.drafted`:** `[]`, so `d14-watch` always plays the scripted scan, with `cft_01`, `fup_02` and `apr_03` (A2-1). `ALLOWED_EMPTY_FALLBACKS` already lists those types for `b15-watch` (contracts section 11).
    - There is no background tour scan, no `tourIds` and no `start()`. A live hit never takes `cft_01`.
- **Thresholds** live in one place, `thresholds.py`: `SIMILARITY_MIN` (from `threshold.json`, else 0.75 not measured), `MAX_PAGES = 30`, `MAX_DEPTH = 1`, `MAX_HITS = 3`, `CLAIMS_MAX = 10`, `CLAIMS_TIMEOUT_S = 5`, `TEXT_CAP = 300`, `STORY_RUN_WORDS = 8`, `APIFY_BUDGET_S = 45`, `TOTAL_BUDGET_S = 58`, `CACHE_S = 1800`.
- **Fixtures** (A2-20, fix-plan 1.6): `tests/server/b15_fixture.json` holds synthetic crawl items only, with URLs on `example.com` or the sandbox market's path and invented titles and sellers: one possible copy (it names the co-op and repeats an 8-word run of `pc_01`'s story), one claim-only listing ("Authentic Native American made", no maker named), one honest "inspired by" listing that names no maker, and unrelated items. Never a recorded Apify response. A test checks every fixture URL's host and that every seller name is in the fixture's own invented list.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b15_watch.py`, with Apify faked by httpx `MockTransport` (items from `tests/server/b15_fixture.json`), B11's encoder faked, a fake Anthropic client, and the fake keys from conftest's autouse fixture. The transport records only whether an `Authorization` header was present, as a boolean.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `thresholds.py` and `scout.py`. Tests: the request's path and query, the body (start URL, globs, depth, page cap, `respectRobotsTxtFile: false`, the proxy setting), no auth header in proxy mode, no token in any URL, only market URLs over `http` or `https` kept, duplicates and the index page dropped, the 300-character caps, a slow fake Apify giving `upstream_timeout`, and the fixture host check | `server/b15_watch/__init__.py`, `server/b15_watch/thresholds.py`, `server/b15_watch/scout.py`, `tests/server/b15_fixture.json` | B11 green | opus |
| T2 | `compare.py`, `evidence.py` and `calibrate.py`, with the threshold fixture. Tests with hand-made vectors: the normalization formula, the matched piece, the three evidence rules, a bare craft claim with no evidence, `similarity` null without a model. Then run `calibrate.py` once with the real model and commit `threshold.json` | `server/b15_watch/compare.py`, `server/b15_watch/evidence.py`, `server/b15_watch/calibrate.py`, `server/b15_watch/threshold.json`, `tests/server/b15_threshold_fixture.json` | T1 | sonnet |
| T3 | `claims.py`, the model path and the rule-based path. Tests: the prompt holds the results only inside the data block, a quote not in the result means no claim, an "inspired by" listing that names no maker is `neither`, "Authentic Native American made" with no maker named is `claim_only`, the fixture's copy is `possible_copy`, at most 10 calls run, each inside 5 seconds | `server/b15_watch/claims.py` | T2 | opus |
| T4 | `reporter.py`. Tests: the draft names the piece and the text match, carries only the listing's own URL, names no seller, contains none of the accusing words in either language, stays under the length cap, and the template works without the key | `server/b15_watch/reporter.py` | T3 | sonnet |
| T5 | The three endpoints: start then poll, single flight, the 30-minute cache, one scan at a time, the co-op-only maker check, the event order, the step recording, the error shapes. Tests: every returned event validates, `watch.scanned` lists every fixture result with its verdict, a maker outside `com_dine` is 400, only Apify's host was called, no token in any log line, a poll answers in under 200 ms while a scan runs. One `live` test (skipped without the Apify token or `PUBLIC_SITE_URL`) crawls the sandbox market with `maxPagesPerCrawl` 5 | `server/routers/b15_watch.py` | T4 | opus |
| T6 | The live adapter: a person's scan with start then poll, `[]` for the tour | `src/sources/live/b15-watch.ts` | T5 | sonnet |
| T7 | **If time** (fix-plan 1.5, C-6): wrap the Scout and the Comparer as our own Apify Actor for the Best Actor prize, published from Gordon's Apify account. Needs his OK and a contract line first | `server/b15_watch/actor/` | T6 | opus |

## Acceptance

- Given the fixture crawl, when the scan runs with fakes, then the poll returns, in order, the four agents' steps, one `watch.scanned` listing every result with its verdict and text match, and one `counterfeit.flagged` with its `followup.drafted` and `approval.requested` for the result that names the co-op and repeats `pc_01`'s story. The claim-only listing is `claim_only` with no report, and the honest "inspired by" listing is `neither`.
- Given `APIFY_AUTH=proxy`, when the Scout calls Apify, then our request carries no `Authorization` header and no URL carries a token.
- Given any scan, when its outbound requests are counted, then they went only to Apify and the Anthropic API, and our server fetched no page.
- Given the Scout's request, then it starts at `PUBLIC_SITE_URL/market/`, its globs stay under `/market/`, and it sends `respectRobotsTxtFile: false`.
- Given a possible copy, when its draft is read, then it accuses no one in either language, names no seller, asks for a review, and the only path from it to anything sent is the owner's approval.
- Given a scan request for `mkr_04` (another community's maker), then it answers 400 `bad_request`.
- Given the tour in live mode, when `d14-watch` arrives, then the adapter returns `[]`, the scripted scan plays with `cft_01`, `fup_02` and `apr_03`, and no live event ever takes `cft_01`.
- Given no `PUBLIC_SITE_URL`, then `health()` is false and Scan now plays the scripted scan with the Simulated badge.
- `npm run test:server` passes. **G5 for v2** (fix-plan 1.4) passes as `npm run gate -- G5 b15-watch watch-live`: `npm run test:server`, then the live feature spec `tests/features/watch-live.spec.ts` (F-watch's feature-lead writes it), where a person's own Scan now in live mode crawls the sandbox market and shows every checked result with its verdict and every event valid, and the scripted tour still passing with `b15-watch` in live mode.

## Out of scope

- The real web. No search engine, marketplace or real seller is ever crawled, named or stored (fix-plan 1.6).
- Image comparison.
- Sending a report, contacting a seller, or a takedown request of any kind.
- Scanning any community's pieces but the Diné co-op's.

## Contract additions needed

FX1 writes these into `docs/v2/contracts.md`. I2-core merges them.
- Section 1: the Apify host stays `api.apify.com`. The Google search scraper is gone. `PUBLIC_SITE_URL` is read by B15 (through `server/config.py`).
- Section 5, B15 (replacing the Google scraper): the Scout runs `apify/cheerio-scraper` over `PUBLIC_SITE_URL/market/` with `respectRobotsTxtFile: false`. `POST /api/b15/watch` `{ trigger, runId, idTag, idStart, scanId, makerId, queries }` answers 202 `{ scanId, status }`. `GET /api/b15/watch/{scanId}` returns `{ status, events, error }`. `GET /api/b15/status` returns `{ market, threshold, measured, model }`. The request no longer carries `pieces`, `entries` or `tourIds`. Only `com_dine`'s makers are scanned. The hit rule is fix-plan 1.9's, with the three verdicts.
- Section 3: `watch.scanned` adds `results: { title, url, snippet, similarity, verdict }[]`, verdict `"possible_copy" | "claim_only" | "neither"`, and `similarity` may be null (decided with FX7).
- Section 11: drop `tourIds`. "The similarity is calibrated" becomes "a normalized similarity, `(c - b) / (1 - b)`, with its threshold measured on a fixture and written to `server/b15_watch/threshold.json`". Live person-scoped IDs are `cft_user_<tag>_<n>`, `fup_user_<tag>_<n>` and `apr_user_<tag>_<n>`.
- The error table adds `busy` (503), as B14 does.
- `tests/demo/beats.ts` (I2-tour T6): `REQUIRED_KEYS` has `b15-watch: apify`. `REQUIRED_SERVICES` has no entry for `b15-watch`, since it doesn't wait on the model.
- S3-catalog T9: compute `cft_01`'s text match with the real model and formula, or label 0.91 illustrative (B2-9).
- D-deploy: the sandbox market's pages put each listing's title in `<title>` and its seller line, claim and description inside `<main>`, link every listing from `/market/`, and carry `noindex`. Its listings come from `src/mock/watch.ts`, fictional sellers only, at least one possible copy of a co-op piece and one claim-only listing.
- `docs/v2/apis-and-accounts.md`, the Apify section: the Actor is `apify/cheerio-scraper`, with its page at `docs/tech/apify/cheerio-scraper.md`.
- F-watch's feature-lead writes `tests/features/watch-live.spec.ts` for this G5.
