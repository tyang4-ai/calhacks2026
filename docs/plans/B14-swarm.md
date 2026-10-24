# B14-swarm · The agent swarm: small agents, one job each

Priority: P0 · Wave: V2 · Depends on: B13-live (the bridge, optional at run time), B12-search (the Finder's tools and the Indexer's writes), B11-embed (vectors) · Folder: `server/b14_swarm/` · Source key: `b14-swarm` · Makes real: F-support (both drawers), the swarm view, the listing flow in F-seller-hub, the storefront draft in F-storefront · Estimate: 5 h

**SCOPE:** `server/routers/b14_swarm.py, server/b14_swarm/, src/sources/live/b14-swarm.ts, tests/server/test_b14_swarm.py, tests/server/b14_fixture.json`

## Goal

Customer service for buyers and sellers, run by a swarm of narrow agents on Claude. Each agent has one job, its own small typed input and output, only the tools that job needs, and a model sized to the job. Cindy routes and merges and knows no facts of her own. Every step is recorded, streamed through SpacetimeDB and shown in the swarm view. Anything that would move money, publish or report becomes an approval for a person, never an action. This answers Anthropic's "thoughtful use of Claude", Hyphenate's "would you hire it?", and Microsoft's "responsible design".

## Read first

- `docs/v2/contracts.md`:
  - section 3 (`support.asked`, `swarm.step`, `support.answered`, `support.escalated`, `listing.requested`, `listing.drafted`, `listing.indexed`, `storefront.drafted`, the 20-second key timeout),
  - section 5 (B14),
  - section 6 (the roster: agent IDs, kinds, models, tools).
  
  After I2-core: `docs/common/api-contract.md` B14 and `events.md`.
- `docs/v2/brief.md`, "The agent swarm: one small job each" (the "Never does" column)
- `docs/plans/S3-catalog.md`: the scripted runs (`run_01` to `run_05`) your live runs replace, the policy topics, the roster in `src/mock/agents.ts`
- `docs/plans/B12-search.md` (the `search`, `converse` and `index_one` functions), `docs/plans/B13-live.md` (the bridge), `docs/plans/B11-embed.md` (`compose.py`, `encode_passages`)
- `docs/plans/B02-explain.md` and `server/routers/b02_explain.py`: how v1 calls Claude with `messages.parse()` and checks the answer
- In the vault docs folder: `docs/anthropic-sdk-python/` (`README.md`, `MIGRATION.md`, `api.md`) and `docs/claude-api/structured-outputs.md`. The SDK changed major versions, so read before writing calls.
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Claude calls** (`server/b14_swarm/llm.py`):
  - One function, `parse(agent_id, system, content, output_model, timeout_s)`. It uses the model the roster gives that agent and the key from the server config (`CINDIA_ANTHROPIC_API_KEY` first, then `ANTHROPIC_API_KEY`).
  - `client.messages.parse()` with the Pydantic model as `output_format`.
  - No `temperature`, `top_p`, `top_k`, no enabled thinking, no prefill.
  - A fake client can be injected for tests.
  - It maps a timeout to `upstream_timeout`, an API error to `upstream_error` and a parse failure to `invalid_model_output`.
  - It never logs a prompt, a response or a key.
- **The roster** (`roster.py`) mirrors `contracts.md` section 6 exactly: kind, model, tools, job. `allowed(agent_id, tool)` is the only way a tool gets called.
- **Tools** (`tools.py`). Each reads only the request's `records`, or calls a sibling upgrade's module, and returns plain data, never prose:
  - `cindia_search(text, keywords, filters)`: B12's `search()`. If B12 isn't importable, it returns `unknown`.
  - `elastic_agent(text)`: B12's `converse()`.
  - `community_page(communityId)`: the community record.
  - `verification_record(communityId, makerId)`: the verification block, plus whether the maker is in the community.
  - `order_lookup(orderId)`: the order, its payout and receipt state.
  - `policy(topicId)`: the policy topic, its text and its numbers.
  - `arrival_window(pieceId, fromDate)`: code, computing earliest and latest arrival dates from the piece's `leadTimeDays` and the shipping topic's transit days, so no model does date arithmetic. `fromDate` is the demo's date from the records (`2026-09-01`), never the wall clock.
  - `embed(texts)`: B11.
  - `index_write(entry, piece, community)`: B11's passage rule and vector, then B12's `index_one()` with `status: "draft"`.
- **The step recorder** (`steps.py`):
  - `RunRecorder(runId, threadId, side)` times each step and builds its `swarm.step` payload: `agentId`, `kind`, a short `summary` in English and Chinese written by code from the step's typed result (never the model's raw text), `toolName`, `ms`, and `model` (none for code agents).
  - It calls the B13 bridge (`start_run`, `add_step`, `finish_run`) when it's importable and available, and collects every step for the response.
  - Live IDs: `run_live_N`, `stp_live_N`.
- **The agents** (`server/b14_swarm/agents/`), one file each, holding its input model, its output model, its prompt, its model ID and its tools from the roster. Each prompt is short, in plain words, and says: answer only from what you're given, and if it doesn't say, answer `unknown` with the reason.

| File | Output (Pydantic) | Server check after the call |
|---|---|---|
| `intake.py` | `intents` (from `find`, `piece_question`, `order_status`, `shipping`, `returns`, `authenticity`, `culture`, `payout`, `listing_help`, `other`), `pieceIds`, `orderIds`, `budgetCents?`, `recipient?`, `dateAsked?`, `lang`, `needsPerson`, `reason` | every ID is in the request's records |
| `cindy.py` | `specialists` (in order), `parallel` (which can run side by side), `routeNote` | only agents allowed on that side: buyer `finder`, `curator`, `steward`, `clerk`. Seller `clerk`, `bookkeeper`, `steward`. Unknown names are dropped. The Writer is always added last, by code |
| `finder.py` | `keywords` (at most 8), `filters`, `useElasticAgent` | then code calls `cindia_search` (and `elastic_agent` when asked) and returns candidates with scores. The model never names a piece |
| `curator.py` | `picks` (at most 6, each `pieceId` with a reason in both languages) | every pick is among the Finder's candidates |
| `steward.py` | `status` (`answered` or `unknown`), the answer in both languages, `source` (`verification.by`, `verification.note`, `community.about` or `community.protocols`), and `quote` | `quote` must appear word for word in that source's text. If not, the answer becomes `unknown`: "I'll ask the maker and get back to you." |
| `clerk.py` | `status`, the answer in both languages, `sourceIds` (policy topics and orders it used) | every source ID exists, and every date it states comes from `arrival_window` or a record |
| `bookkeeper.py` (code) | the maker's payout, held amount and payout date, read from `makerPayouts` and `makerStatements` | none, since it's code |
| `writer.py` | the reply in both languages, and `refIds` | `refIds` is a subset of the IDs the specialists returned, and every dollar amount and date in the reply appears in their facts. A failed check retries once with the reason. A second failure uses a plain template reply built from the facts, labeled rule-based in its step |
| `lister.py` | title and summary in both languages, and `facets` (object, materials, techniques, motifs, colors, `hoursFromNotes?`) | every number it states appears in the notes |
| `describer.py` | what's visible in the picture: object, colors, motifs, a note in both languages | runs only when the request carries an image. Vision input, never a claim about meaning |
| `tagger.py` | `vibe` (2 to 4 moods, 1 to 3 occasions, 1 to 3 recipients, lowercase English) | the words come from the catalog's existing vibe vocabulary, sent in the request, plus at most two new ones |
| `checker.py` | exactly one check each of `protocol`, `facts` and `price`, each with `ok` and a note in both languages | checks carry IDs `chk_live_N` |
| `indexer.py` (code) | the draft IndexEntry, its passage and vector, written with `index_write` | runs only after the Checker |
| `designer.py` | 4 to 6 storefront blocks (`kind` and `props`, text props as `_en` and `_zh`) | every piece ID in a block belongs to that community, and props are only strings, numbers and string arrays |

- **The runs** (`run.py`). Every run has a 19-second budget, checked before each step. When less than 3 seconds remain, the Writer works with the facts so far. When less than 1.5 seconds remain, the template reply is used.
  - **Support:**
    1. `intake`,
    2. `cindy`,
    3. the specialists (side by side where Cindy marks them parallel, through a thread pool),
    4. `writer`.
    
    It ends in `support.answered` (`agentId: "writer"`). When Intake says `needsPerson`, or a specialist can't answer something that matters (a damaged piece, a refund, a complaint), it ends in `support.escalated` plus an `approval.requested` of kind `support_action` (`apr_live_N`), and the Writer says a person will follow up.
  - **Listing:**
    1. `cindy`,
    2. `lister`,
    3. `describer` (with an image only),
    4. `tagger`,
    5. `checker`,
    6. `indexer`.
    
    It ends in `listing.drafted`, then `listing.indexed` when B12 wrote the draft, then an `approval.requested` of kind `listing_publish`.
  - **Storefront:** `cindy`, then `designer`. It ends in `storefront.drafted`.
  - **No run ever emits** `approval.granted`, `approval.declined`, `followup.sent`, `payout.sent` or `money.moved`.
- **Endpoints** (`server/routers/b14_swarm.py`, `router = APIRouter(prefix="/api/b14")`, `ANTHROPIC` key required, 503 `key_missing` without it):
  - `POST /api/b14/support` `{ "trigger", "threadId", "side", "text", "lang", "contextIds", "records" }`
  - `POST /api/b14/listing` `{ "trigger", "listingId", "makerId", "notes", "lang", "community", "maker", "vibeVocabulary", "image?" }`
  - `POST /api/b14/storefront` `{ "trigger", "storefrontId", "community", "pieces" }`
  
  Each returns every `swarm.step` event in order, then the run's final events, in under 19 seconds. Envelope: `source: "live"`, `key: "b14-swarm"`, IDs `evt_live_` from a counter starting at 1400001, `at` copied from the trigger or 0. A support request's `records` holds `pieces`, `communities`, `people`, `orders`, `payouts`, `makerPayouts`, `makerStatements`, `policyTopics` and `searchIndex` from `src/mock`.
- **Adapter** (`src/sources/live/b14-swarm.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b14` and `keys.anthropic` is true.
  - `produce(event, state)`:
    - **A person's `support.asked`:** post `/api/b14/support` with the records above and return the events.
    - **A person's `listing.requested`:** post `/api/b14/listing` with the listing, the maker, the community and the vibe vocabulary from `src/mock`.
    - **A keyed event of a scripted run in the tour** (`swarm.step`, `support.answered`, `listing.drafted` or `storefront.drafted` with `run_01`, `run_02` or `run_03`):
      - The first such event of a run starts one live call for that run, with the question or the listing from the store, and caches its promise by `runId`.
      - Every keyed event of that run awaits the same promise and returns the whole live list. The store's reducers drop the repeats by ID, and none of the scripted steps of that run play.
      - A failed call throws, so each event falls back to its scripted twin.
    - Every fetch aborts at 19.5 seconds, under the registry's 20-second key timeout.
- **Speed target:** the tour's support question, from first keyed step to `support.answered`, in under 9 seconds at the median, so it lands inside `d04-support` (21 to 33 seconds). Run Steward and Clerk side by side, and keep each prompt short.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b14_swarm.py`, with a fake Anthropic client that returns canned parsed outputs, and B11, B12 and B13 faked. No test calls out, except the one marked `live`.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `llm.py` and `steps.py`: the one Claude call path, the error mapping, the recorder with the bridge hookup. Tests: no forbidden parameter is ever sent, the bridge is called when available and skipped when not, nothing logged contains the fake key or the fake output | `server/b14_swarm/__init__.py`, `server/b14_swarm/llm.py`, `server/b14_swarm/steps.py` | none | opus |
| T2 | `roster.py` and `tools.py`, with per-agent tool permission and `arrival_window`. Tests: the roster matches `src/mock/agents.ts` (through `artifacts/mock/mock.json` when present, else the fixture), a forbidden tool call raises, and arrival dates for `pc_01` from `2026-09-01` match a hand calculation | `server/b14_swarm/roster.py`, `server/b14_swarm/tools.py`, `tests/server/b14_fixture.json` | T1 | opus |
| T3 | `intake.py` and `cindy.py`. Golden tests on the tour's question and on a refund complaint, plus routing limits per side | `server/b14_swarm/agents/__init__.py`, `server/b14_swarm/agents/intake.py`, `server/b14_swarm/agents/cindy.py` | T2 | opus |
| T4 | `finder.py` and `curator.py`. Tests: candidates come only from the tool, a pick outside them is dropped | `server/b14_swarm/agents/finder.py`, `server/b14_swarm/agents/curator.py` | T3 | opus |
| T5 | `steward.py`, `clerk.py` and `bookkeeper.py`. Tests: a quote not in the record turns into "I'll ask the maker", the clerk's dates come from `arrival_window`, the bookkeeper's figures equal the records | `server/b14_swarm/agents/steward.py`, `server/b14_swarm/agents/clerk.py`, `server/b14_swarm/agents/bookkeeper.py` | T3 | opus |
| T6 | `writer.py` and `run.py`'s support run: the order, the parallel specialists, the budget, escalation into an approval. Tests: the tour's question ends in a valid `support.answered` citing only given IDs, a reply with an invented amount is rejected then replaced, a slow fake agent still answers inside 19 seconds through the template, a complaint ends in `support.escalated` and `approval.requested` | `server/b14_swarm/agents/writer.py`, `server/b14_swarm/run.py` | T4, T5 | opus |
| T7 | `lister.py`, `describer.py`, `tagger.py`, `checker.py`, `indexer.py` and the listing run. Tests on `lst_01`'s notes: three checks, the draft indexed with `status: "draft"`, a `listing_publish` approval, no publish | `server/b14_swarm/agents/lister.py`, `server/b14_swarm/agents/describer.py`, `server/b14_swarm/agents/tagger.py`, `server/b14_swarm/agents/checker.py`, `server/b14_swarm/agents/indexer.py` | T6 | opus |
| T8 | `designer.py` and the storefront run. Tests: blocks only use the community's pieces, props shapes | `server/b14_swarm/agents/designer.py` | T6 | sonnet |
| T9 | The three endpoints, request models, the error shapes. A safety test sweeps every run's output and finds no forbidden event type. One `live` test (skipped without the Anthropic key) asks the tour's question once and checks the answer validates and cites only given IDs | `server/routers/b14_swarm.py` | T7, T8 | opus |
| T10 | The live adapter: requests from people, the per-run cache for the tour's keyed events, the 19.5-second abort | `src/sources/live/b14-swarm.ts` | T9 | opus |

## Acceptance

- Given the tour's question about `pc_01`, when `POST /api/b14/support` runs live, then:
  - the steps come back in the order intake, cindy, steward and clerk, writer, then a valid `support.answered`,
  - the reply cites only `pc_01`, `com_gu`, `mkr_01` and a policy topic,
  - its dates come from `arrival_window`,
  - it lands in under 9 seconds at the median over three runs.
- Given a question the community page doesn't answer ("What does the peony mean to the studio?"), when the swarm runs, then the Steward answers `unknown` and the reply says it will ask the maker.
- Given a complaint about a damaged piece, when the swarm runs, then it ends in `support.escalated` and an `approval.requested` of kind `support_action`, and nothing is refunded.
- Given `lst_01`'s notes, when `POST /api/b14/listing` runs, then it returns the steps, a `listing.drafted` with three checks (`price` not ok), a draft index entry and a `listing_publish` approval.
- Given any run, when its events are swept, then none is `approval.granted`, `approval.declined`, `followup.sent`, `payout.sent` or `money.moved`.
- Given B13 running, when a support run happens, then its steps stream on `/api/b13/stream` while the run is still going.
- Given no Anthropic key, when any endpoint is called, then it answers 503 `key_missing`, and the drawers keep the scripted runs with the Simulated badge.
- `npm run test:server` passes, and G5 for `b14` passes: the tour in live mode shows `b14-swarm` live in `d04-support` and `d15-listing`.

## Out of scope

- The money team's own endpoints (B01, B02, B03, B06, B10) and the watch agents (B15). They keep their routers and show in the roster.
- Sending anything to anyone: replies show in the drawer only.
- Memory across visits.
- Indigenous-language replies: the Writer answers in English or Chinese, and says so when asked for another language.

## Contract additions needed

- `approval.requested` gains an optional `approval` object (`kind`, `subjectIds`, `amountCents?`, `overLimit`, `proposedBy: "cindy"`, `summary: Text`) for approvals created live, whose `apr_live_N` IDs `getById()` can't find.
- Live ID formats: `run_live_N`, `stp_live_N`, `apr_live_N`, `chk_live_N`, and `pc_live_N` for a draft listing's index entry.
- The shipping policy topic (`pol_01`) carries `data: { transitDaysMin, transitDaysMax }` for `arrival_window`. S3-catalog T7 writes it.
- The listing request's `vibeVocabulary` field, and `image` (base64 PNG or JPEG, optional).
- `tests/demo/beats.ts`: no allowed-empty entries are needed for `b14-swarm` if the 9-second target holds. If it doesn't, the integrator may list `swarm.step` there.
