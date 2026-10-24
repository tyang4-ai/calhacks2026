# B14-swarm · The agent swarm: small agents, one job each

Priority: P0 · Wave: V2 · Depends on: B12-search (the Finder's tools and the Indexer's draft index), B11-embed (vectors), B13-live (the bridge, optional at run time), S3-catalog (`contentRules`, policy, the roster) · Folder: `server/b14_swarm/` · Source key: `b14-swarm` · Makes real: F-support for a person's own questions (both drawers), the swarm view in live mode, a person's listing in F-seller-hub, a person's storefront draft in F-storefront · Estimate: 5 h

**SCOPE:** `server/routers/b14_swarm.py, server/b14_swarm/, src/sources/live/b14-swarm.ts, tests/server/test_b14_swarm.py, tests/server/b14_fixture.json`

## Goal

Customer service for buyers and sellers, run by a swarm of narrow agents on Claude, one of the platform's three backend pillars (fix-plan 1.4). Each agent has one job, its own small typed input and output, only the tools that job needs, and a model sized to the job: `claude-haiku-5-5` or `claude-sonnet-5-5`, and nothing else anywhere in the platform. Cindy routes and merges and knows no facts of her own. Every step is recorded, written to SpacetimeDB and shown in the swarm view. Code fills every number, date and quote, so an agent can't invent one. Anything that would move money, publish or report becomes an approval for a person, never an action. This answers Anthropic's "thoughtful use of Claude", Hyphenate's "would you hire it?", and Microsoft's "responsible design".

The tour is always scripted (fix-plan 1.2). B14 answers people's own questions, listings and storefront requests in "try it yourself", and never replaces the tour's runs. There is no prefetch (fix-plan 1.9).

## Read first

- `docs/v2/fix-plan.md` sections 1.2, 1.4, 1.6 and 1.9. Where it disagrees with `docs/v2/contracts.md`, the fix plan wins until FX1 lands its contract changes.
- `docs/v2/contracts.md`:
  - section 3 (`support.asked`, `swarm.step`, `support.answered`, `support.escalated`, `listing.requested`, `listing.drafted`, `listing.indexed`, `storefront.drafted`, `question.forwarded`, `question.answered`, the 20-second key timeout),
  - section 5 (B14),
  - section 6 (the roster: agent IDs, kinds, models, tools),
  - section 11 (the ID scheme and the page tag, `storefront.requested`, the listing and Designer runs' threads, block props, the mock exports),
  - section 12 (the labels, L11 to L17 and L26 here).

  After I2-core: `docs/common/api-contract.md` B14 and `events.md`.
- `docs/v2/brief.md`, "The agent swarm: one small job each" (the "Never does" column)
- `docs/plans/S3-catalog.md`: the scripted runs a person's live run stands beside (`swarmRuns`, the fallbacks), `policy`, `contentRules` and the roster in `agents`
- `docs/plans/B12-search.md` (`search`, `converse`, `index_draft`), `docs/plans/B13-live.md` (the bridge), `docs/plans/B11-embed.md` (`compose.py`, `encode_passages`)
- `docs/plans/B02-explain.md`, `server/routers/b02_explain.py` and `server/routers/b09_concierge.py`: how v1 calls Claude with `messages.parse()`, `max_retries=0`, thinking off and low effort, and a worker thread that's abandoned on timeout
- `docs/tech/claude-api/` (models overview, the Oct 21, 2026 migration, structured outputs including refusals and `max_tokens` stops, errors) and `docs/tech/anthropic-sdk-python/` (`README.md`, `MIGRATION.md`, `api.md`, `helpers.md`). The SDK changed major versions, so read before writing calls.
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Models: Haiku and Sonnet only** (fix-plan 1.4). `llm.py` checks every model against `config.ALLOWED_MODELS`, which holds exactly `claude-haiku-5-5` and `claude-sonnet-5-5`, and raises on any other ID before a call is made. `roster.py` assigns each Claude agent one of the two. I2-core's server self-test fails on any other model ID in `server/`, `src/` or `scripts/`, and B14's own test covers `parse()` and the roster (Tasks T1).
- **Claude calls** (`server/b14_swarm/llm.py`):
  - One function, `parse(agent_id, system, content, output_model, timeout_s)`. It uses the model the roster gives that agent, the key from `server/config.py` (`CINDIA_ANTHROPIC_API_KEY` first, then `ANTHROPIC_API_KEY`), and `base_url=config.CLAUDE_BASE_URL` on the client (D2-25). Nothing else reads a key.
  - `client.messages.parse()` with the Pydantic model as `output_format`, `max_retries=0` on the client, and the agent's own `max_tokens` from the roster (B2-12).
  - Thinking disabled and effort low, as v1's B09 sends them (lesson B09). If a first live call returns 400, drop those two settings first. Never `temperature`, `top_p`, `top_k`, enabled thinking or a prefill.
  - Each call runs in a worker thread with a timeout that's the smaller of the agent's own and the run's time left minus a 3-second reserve for the Writer. A call that times out is abandoned, never awaited (B02's pattern).
  - A `stop_reason` of `refusal` or `max_tokens`, or an empty `parsed_output`, maps to the agent's `unknown` path with a plain reason, never to an error page (B2-32).
  - It maps a timeout to `upstream_timeout`, an API error to `upstream_error` and a parse failure to `invalid_model_output`.
  - It never logs a prompt, a response or a key. A fake client can be injected for tests.
- **The roster** (`roster.py`) mirrors `contracts.md` section 6 exactly: kind, model, tools, job, plus each agent's `max_tokens` and timeout. `allowed(agent_id, tool)` is the only way a tool gets called.
- **Records per side** (B2-17, A2-14). `side` is a UI hint, not an access boundary, so the server enforces it:
  - **Buyer:** pieces, communities, policy, index entries, the roster, the makers of the pieces in `contextIds`, and only the orders in `contextIds`. No payouts, maker payouts, maker statements or other people.
  - **Seller:** the above plus orders, payouts, maker payouts and maker statements.
  - The router drops anything a buyer request carries beyond its list before any agent sees it.
- **Tools** (`tools.py`). Each reads only the request's records, or calls a sibling upgrade's module imported inside the function, and returns plain data, never prose:
  - `cindia_search(text, keywords, filters)`: B12's `search()`. If B12 isn't importable, it returns `unknown`.
  - `elastic_agent(text)`: B12's `converse()`, which returns only piece IDs. For every `find` intent the run calls it from code, never by a model's choice, and the step's `toolName` is `elastic_agent`, so the swarm view labels it "Elastic Agent Builder" (C-3).
  - `community_page(communityId)`: the community record.
  - `verification_record(communityId, makerId)`: the verification block, plus whether the maker is in the community.
  - `order_lookup(orderId)`: the order, its payout and receipt state. On the buyer side it answers only for orders in `contextIds` and never returns a person's name. Any other ID gets the reply L17 ("I can only look up the order on your screen.").
  - `policy(topicId)`: the policy topic, its text and its numbers.
  - `arrival_window(pieceId, fromDate)`: earliest and latest arrival dates from the piece's `leadTimeDays` and the shipping topic's transit days, so no model does date arithmetic. The run calls it as code and hands the dates to the Clerk as facts, so the roster's Clerk tools stay `order_lookup` and `policy` (D1-41). `fromDate` is the demo date from the records, never the wall clock.
  - `embed(texts)`: B11.
  - `index_draft(entry, piece, community)`: B11's passage rule and vector, then B12's `index_draft()` into `cindia-drafts`, so a draft is never searchable before the owner approves.
- **The content check** (`content.py`, A2-8, A2-11, A2-16). `content_check(text, maker_community, records)` reads `contentRules` from `artifacts/mock/mock.json` (`bannedObjects`, `stereotypeWords`, `meaningWords`, `accusingWords`, `peopleNames`) and returns the words it found and why. It runs on every Lister, Tagger, Writer, Curator, Designer and Describer output, and fails on:
  - a banned object, a stereotype word, or a meaning word ("symbolizes", "represents", 象征, 寓意 and the rest),
  - a People's name, nation or craft other than the maker's own community's (`peopleNames`), or a nation's name used as a product word ("Navajo rug"),
  - a word with diacritics that the records don't contain, or a greeting or sentence in a language other than English and Chinese,
  - a craft term in the English text that doesn't appear unchanged in the Chinese text (R19).
- **The step recorder** (`steps.py`):
  - `RunRecorder(runId, threadId, side)` times each step and builds its `swarm.step` payload: `agentId`, `kind`, a short `summary` in English and Chinese, `toolName`, `ms`, and `model` (none for code agents).
  - **Summaries hold only names, kinds, enum values, IDs, counts and fixed phrases** ("Found 6 pieces", "Quoted the verification note", "Asked Elastic Agent Builder"), written by code from the step's typed result. Never the model's text, a quote, Intake's `reason` or the person's words, because steps reach every open screen (B2-15). A test feeds every agent's fake output with marker text and proves no summary carries it.
  - It sends `start_run`, `add_step`, `finish_run` and `set_process("swarm", ...)` to the B13 bridge's ordered queue when it's importable and available, and collects every step for the response.
  - **IDs** follow contracts section 11 and fix-plan 1.9. The adapter sends `runId` (`run_user_<tag>_<n>`), `idTag` (`pageTag()` from `src/sources/ids.ts`) and `idStart`, the first number per prefix that `liveIdStart(prefix, count)` reserved when the request was sent: 40 steps, 3 checks, 1 approval, 1 piece, 6 blocks and 1 question per run. The server numbers from there: steps `stp_user_<tag>_<n>`, checks `chk_user_<tag>_<n>`, approvals `apr_user_<tag>_<n>`, a draft's index document `pc_user_<tag>_<n>`, storefront blocks `blk_user_<tag>_<n>`, forwarded questions `qst_user_<tag>_<n>`. Two pending answers never share a number, and a reload never repeats one.
- **The agents** (`server/b14_swarm/agents/`), one file each, holding its input model, its output model, its prompt, its model ID and its tools from the roster. Each prompt is short, in plain words, names the co-op and its makers as the records do (the Diné Weaving and Silver Co-op, Grace N., Lena T., Mae K.), and says: answer only from what you're given, and if it doesn't say, answer `unknown` with the reason. Text from the person goes in a delimited data block, never into the instructions.

| File | Output (Pydantic) | Server check after the call |
|---|---|---|
| `intake.py` | `intents` (from `find`, `piece_question`, `order_status`, `shipping`, `returns`, `authenticity`, `culture`, `payout`, `listing_help`, `other`), `pieceIds`, `orderIds`, `budgetCents?`, `recipient?`, `dateAsked?` (month and day only), `lang`, `needsPerson`, `reason` | every ID is in the request's records. Code resolves `dateAsked`'s year from the demo date |
| `cindy.py` | `specialists` (in order), `parallel` (which can run side by side), `routeNote` | the specialists must come from the route table for Intake's intents and the side: buyer `finder`, `curator`, `steward`, `clerk`. Seller `clerk`, `bookkeeper`, `steward`. Unknown names are dropped. When her call fails or runs slow, code uses the route table and the step says rule-based. The Writer is always added last, by code |
| `finder.py` | `keywords` (at most 8), `filters` | code then calls `cindia_search` and, for a `find` intent, `elastic_agent`, and returns candidates with scores. The model never names a piece |
| `curator.py` | `order`: at most 6 piece IDs, best first | every ID is among the Finder's candidates. Each pick's reason is B12's code-built one, so the Curator writes no prose (A2-9) |
| `steward.py` | `status` (`answered` or `unknown`) and `sentence`, the index of one numbered sentence it was given | its sources come as numbered sentences, each labeled with where it's from: `verification.note`, `verification.by`, `community.about`, `community.protocols` (Cindia's demo exclusions), `piece.heritage`, `piece.story`. The index must exist. Code inserts that exact sentence with its source named, so a quote can never drift (B2-13, A2-9) |
| `clerk.py` | `status`, the answer in both languages with placeholders such as `{arrival_earliest}`, `{arrival_latest}` and `{transit_days}`, and `sourceIds` (policy topics and orders it used) | every source ID exists, and every placeholder is one code can fill from `arrival_window` or a record |
| `bookkeeper.py` (code) | the maker's payout, held amount and payout date, read from `makerPayouts` and `makerStatements` | seller side only |
| `writer.py` | the reply in both languages with placeholders (`{price}`, `{arrival_earliest}`, `{arrival_latest}`, `{quote}` and the rest), and `refIds` | `refIds` is a subset of the IDs the specialists returned. Every number and date in the reply is a placeholder that code fills per language from the facts. When the Steward answered, the reply holds `{quote}`, which code fills with the exact sentence and its source. Outside the quote it holds no meaning word and none of "guarantee", "certified" or "100%". An authenticity reply follows L15's pattern: who attests, and that it's their record. `content_check()` passes. A failed check retries once with the reason. A second failure uses a plain template reply built from the facts, labeled rule-based in its step |
| `lister.py` | title and summary in both languages, `facets` (`object`, `materials`, `techniques`, `motifs`, `colors`, and `oneOfAKind?` and `leadTimeDays?` when the notes say), and `hours?` | every number it states appears in the notes, after Chinese numerals are normalized to digits. `content_check()` runs, and a hit turns the protocol check not ok and names the word |
| `describer.py` | what's visible in the picture: object, colors, plain-shape motifs, a note in both languages | runs only when the request carries an image. Plain visual words only, never a meaning or a named motif. `content_check()` passes. No step claims it ran when there's no image |
| `tagger.py` | `vibe` (2 to 4 moods, 1 to 3 occasions, 1 to 3 recipients, lowercase English) | the words come from the catalog's vibe vocabulary sent in the request, plus at most two new ones, and every new word passes `content_check()` |
| `checker.py` | exactly one check each of `protocol`, `facts` and `price`, each with `ok` and a note in both languages | checks carry IDs `chk_user_<tag>_<n>`. Code overrides the model: the protocol check is not ok when `content_check()` found anything in the draft, with L26 as the note when the draft names another community's People or craft (A2-11) |
| `indexer.py` (code) | the draft IndexEntry, its passage and vector, written with `index_draft` into `cindia-drafts` | runs only after the Checker |
| `designer.py` | 4 to 6 storefront blocks, each `{ blockId, kind, props }` | `blockId` is `blk_user_<tag>_<n>`. Props are single strings, numbers or string arrays named as contracts section 11 gives them (hero `tagline`, pieces `pieceIds`, projects `projectIds`, and the visit block's region and "Visits by arrangement", never an address, phone or hours, R22). Every piece ID belongs to that community. The tagline passes `content_check()` (D1-25, A2-22) |

- **The runs** (`run.py`). Every run has a 19-second budget, checked before each step. When less than 3 seconds remain, the Writer works with the facts so far. When less than 1.5 seconds remain, the template reply is used.
  - **Support:**
    1. `intake`,
    2. `cindy`,
    3. the specialists (side by side where Cindy marks them parallel, through a thread pool), with `arrival_window` and `elastic_agent` called as code where the intents need them,
    4. `writer`.

    It ends in `support.answered` (`agentId: "writer"`). Three other endings:
    - **A culture question the records don't answer** (the Steward says `unknown` on a `culture` intent): `question.forwarded` to the piece's maker (`questionId` `qst_user_<tag>_<n>`, `threadId`, `makerId`, `pieceId`, the person's `text` and `lang`), then `support.answered` with L14. The maker's reply coming back live is "Backend if time" (fix-plan 1.5), and the scripted "ask the maker" run covers it.
    - **An authenticity question the records don't answer:** `support.escalated` and an `approval.requested` of kind `support_action` ("Ask the maker: <question>"), and the reply is L14.
    - **When Intake says `needsPerson`, or the question is about damage, a refund or a complaint:** `support.escalated` and an `approval.requested` of kind `support_action` (`apr_user_<tag>_<n>`, with the `approval` object), and the Writer says a person will follow up. Any `amountCents` comes from the records, never from the person's words.
  - **Listing,** with the `listingId` as its `threadId`:
    1. `cindy`,
    2. `lister`,
    3. `describer` (with an image only),
    4. `tagger`,
    5. `checker`,
    6. `indexer`.

    It ends in `listing.drafted`, then `listing.indexed` (the draft in `cindia-drafts`, with its `pieceId`, `modelId` and `embedText`), then an `approval.requested` of kind `listing_publish` with the `approval` object. B12 moves the draft into `cindia-pieces` when the owner approves.
  - **Storefront,** with the storefront ID as its `threadId`: `cindy`, then `designer`. It ends in `storefront.drafted`. Publishing stays the owner's own `storefront.published`.
  - **No run ever emits** `approval.granted`, `approval.declined`, `followup.sent`, `payout.sent`, `money.moved` or `storefront.published`.
  - **Speed target:** a person's buyer question answered in under 9 seconds at the median, and every run inside 19.
- **Endpoints** (`server/routers/b14_swarm.py`, `router = APIRouter(prefix="/api/b14")`, the Anthropic key required, 503 `key_missing` without it):
  - `POST /api/b14/support` `{ "trigger", "runId", "idTag", "idStart", "threadId", "side", "text", "lang", "contextIds", "records" }`
  - `POST /api/b14/listing` `{ "trigger", "runId", "idTag", "idStart", "listingId", "makerId", "notes", "lang", "community", "maker", "vibeVocabulary", "image?" }`
  - `POST /api/b14/storefront` `{ "trigger", "runId", "idTag", "idStart", "storefrontId", "community", "pieces" }`

  Each returns every `swarm.step` event in order, then the run's final events, in under 19 seconds. Envelope: `source: "live"`, `key: "b14-swarm"`, `at` copied from the trigger or 0. IDs are `evt_live_` plus a number made of `14`, the process start time in seconds modulo 1,000,000, and a four-digit counter (D1-52).
  - **Limits** (B2-32): `text` at most 1,000 characters, `notes` at most 2,000, `image` at most 4 MB and PNG or JPEG by its magic bytes, a request body of at most 2 MB for support and storefront and 6 MB for a listing with an image. At most two runs at once across the server. A third answers 503 `busy`, so the scripted answer plays.
- **Adapter** (`src/sources/live/b14-swarm.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b14` and `keys.anthropic` is true.
  - `produce(event, state)`:
    - **A person's `support.asked`:** post `/api/b14/support` with that side's records only (above), `runId`, `idTag` and `idStart`, and return the events.
    - **A person's `listing.requested`:** post `/api/b14/listing` with the listing, the maker, the community and the vibe vocabulary from `src/mock`.
    - **A person's `storefront.requested`:** post `/api/b14/storefront` with that storefront's community and pieces.
    - **The tour's keyed events** (`swarm.step`, `support.answered`, `listing.drafted`, `listing.indexed`, `question.forwarded` and `question.answered` of the scripted runs): `[]`, so the tour plays scripted in both modes. `ALLOWED_EMPTY_FALLBACKS` lists those types for `b14-swarm` (I2-tour T6).
    - Every fetch aborts at 19.5 seconds, under the registry's 20-second key timeout.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b14_swarm.py`, with a fake Anthropic client that returns canned parsed outputs, B11, B12 and B13 faked, and the fake keys from conftest's autouse fixture. No test calls out, except the one marked `live`.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `llm.py`, `steps.py` and `content.py`: the one Claude call path with the speed settings, the refusal and `max_tokens` mapping, the error mapping, the recorder with the bridge queue, and the content check. Tests: no forbidden parameter is ever sent, `max_retries` is 0, a slow fake call is abandoned inside its timeout, a refusal becomes `unknown`, the bridge is called when available and skipped when not, nothing logged contains the fake key or the fake output, summaries never carry marker text, and **the model-ID test**: `parse()` refuses any ID outside `config.ALLOWED_MODELS`, every Claude agent in `roster.py` and in `mock.json`'s roster uses one of the two, and the client is built with `config.CLAUDE_BASE_URL` | `server/b14_swarm/__init__.py`, `server/b14_swarm/llm.py`, `server/b14_swarm/steps.py`, `server/b14_swarm/content.py` | none | opus |
| T2 | `roster.py` and `tools.py`, with per-agent tool permission, per-side records, the scoped `order_lookup` and `arrival_window`. Tests: the roster matches `src/mock/agents.ts` (through `artifacts/mock/mock.json` when present, else the fixture), a forbidden tool call raises, arrival dates for `pc_01` from the demo date match a hand calculation, and a buyer asking about `ord_002` with `contextIds: ["ord_001"]` gets L17 and no `ord_002` data | `server/b14_swarm/roster.py`, `server/b14_swarm/tools.py`, `tests/server/b14_fixture.json` | T1 | opus |
| T3 | `intake.py` and `cindy.py`. Golden tests on the d04 question and on a refund complaint, routing limits per side, and the rule-based route when Cindy's fake call fails | `server/b14_swarm/agents/__init__.py`, `server/b14_swarm/agents/intake.py`, `server/b14_swarm/agents/cindy.py` | T2 | opus |
| T4 | `finder.py` and `curator.py`. Tests: candidates come only from the tools, a `find` intent always calls `elastic_agent` from code with `toolName` `elastic_agent`, a pick outside the candidates is dropped, reasons are B12's | `server/b14_swarm/agents/finder.py`, `server/b14_swarm/agents/curator.py` | T3 | opus |
| T5 | `steward.py`, `clerk.py` and `bookkeeper.py`. Tests: a sentence index outside the list turns into `unknown`, the inserted quote equals the record's sentence exactly, the Clerk's dates come only through placeholders filled from `arrival_window`, the bookkeeper's figures equal the records | `server/b14_swarm/agents/steward.py`, `server/b14_swarm/agents/clerk.py`, `server/b14_swarm/agents/bookkeeper.py` | T3 | opus |
| T6 | `writer.py` and `run.py`'s support run: the order, the parallel specialists, the budget, the three endings. Tests: the d04 question ends in a valid `support.answered` citing only given IDs with the verification sentence quoted word for word, a reply with "guaranteed authentic" or a typed-in amount is rejected then replaced, a reply opening in another language fails the content check, a slow fake agent still answers inside 19 seconds through the template, "What does the pattern on this rug mean?" ends in `question.forwarded` and L14, a complaint ends in `support.escalated` and a `support_action` approval with no money moved | `server/b14_swarm/agents/writer.py`, `server/b14_swarm/run.py` | T4, T5 | opus |
| T7 | `lister.py`, `describer.py`, `tagger.py`, `checker.py`, `indexer.py` and the listing run. Tests on `lst_01`'s notes: three checks, the draft in `cindia-drafts` with `status: "draft"`, a `listing_publish` approval, no publish. Notes "Navajo style rug, Yei pattern" turn the protocol check not ok. Notes from a Diné maker for "Ojibwe style beaded earrings" fail it with L26. A notes number written in Chinese numerals passes the facts check | `server/b14_swarm/agents/lister.py`, `server/b14_swarm/agents/describer.py`, `server/b14_swarm/agents/tagger.py`, `server/b14_swarm/agents/checker.py`, `server/b14_swarm/agents/indexer.py` | T6 | opus |
| T8 | `designer.py` and the storefront run. Tests: blocks only use the community's pieces, `blk_user_<tag>_<n>` IDs, single-string props named as section 11 gives them, the visit block holds no address or hours, a tagline with a stereotype word is rejected | `server/b14_swarm/agents/designer.py` | T6 | sonnet |
| T9 | The three endpoints, request models, the limits and the two-run semaphore, the per-side records filter, the error shapes. A safety test sweeps every run's output and finds no forbidden event type. One `live` test (skipped without the Anthropic key) asks the d04 question once and checks the answer validates, cites only given IDs and quotes the record exactly | `server/routers/b14_swarm.py` | T7, T8 | opus |
| T10 | The live adapter: requests from people with per-side records and reserved IDs, `[]` for the tour, the 19.5-second abort | `src/sources/live/b14-swarm.ts` | T9 | opus |

## Acceptance

- Given a person's own d04 question about `pc_01` in live mode, when `POST /api/b14/support` runs, then:
  - the steps come back in the order intake, cindy, steward and clerk, writer, then a valid `support.answered`,
  - the reply cites only `pc_01`, `com_dine`, `mkr_01` and a policy topic,
  - its authenticity line quotes the co-op's verification sentence word for word and names whose record it is (L15's pattern),
  - its dates are the ones `arrival_window` computed,
  - it lands in under 9 seconds at the median over three runs.
- Given "What does the pattern on this rug mean?", when the swarm runs, then the Steward answers `unknown`, a `question.forwarded` goes to `pc_01`'s maker, and the reply is L14.
- Given a complaint about a damaged piece, when the swarm runs, then it ends in `support.escalated` and an `approval.requested` of kind `support_action`, and nothing is refunded.
- Given a buyer request with `contextIds: ["ord_001"]` that asks about `ord_002`, then no `ord_002` data or person's name is in any step or the reply.
- Given `lst_01`'s notes, when `POST /api/b14/listing` runs, then it returns the steps, a `listing.drafted` with three checks (`price` not ok), a `listing.indexed` for a draft in `cindia-drafts`, and a `listing_publish` approval.
- Given any run, when its events are swept, then none is `approval.granted`, `approval.declined`, `followup.sent`, `payout.sent`, `money.moved` or `storefront.published`, and no summary holds model or person text.
- Given a model ID other than `claude-haiku-5-5` or `claude-sonnet-5-5` anywhere in `server/` or the roster, then `npm run test:server` fails.
- Given B13 running, when a person's support run happens, then its steps reach `/api/b13/changes` while the run is still going.
- Given no Anthropic key, when any endpoint is called, then it answers 503 `key_missing`, and the drawers keep the scripted runs with the Simulated badge. Given two runs already going, a third answers 503 `busy`.
- Given the tour in live mode, when its keyed `b14-swarm` events arrive, then the adapter returns `[]` and the scripted runs play.
- `npm run test:server` passes. **G5 for v2** (fix-plan 1.4) passes as `npm run gate -- G5 b14-swarm support-live`: `npm run test:server`, then the live feature spec `tests/features/support-live.spec.ts` (F-support's feature-lead writes it), where a person's own buyer question in live mode is answered end to end in the drawer with every event valid, and the scripted tour still passing with `b14-swarm` in live mode.

## Out of scope

- The money team's own endpoints (B01, B02, B03, B06, B10) and the watch agents (B15). They keep their routers and show in the roster.
- Sending anything to anyone: replies show in the drawer only.
- Memory across visits.
- Replies in any language but English and Chinese. The Writer says so when asked for another language, and never greets or writes in one.
- The live loop back from the maker (fix-plan 1.5, "if time").

## Contract additions needed

FX1 writes these into `docs/v2/contracts.md`. I2-core merges them.
- Section 6: `AgentSpec.model` is `"claude-haiku-5-5" | "claude-sonnet-5-5"` only. No Opus and no other ID anywhere in the platform.
- Section 3: `question.forwarded` `{ questionId, threadId, makerId, pieceId, text, lang }` and `question.answered` `{ questionId, answerId, makerId, text, lang }`, keyed `b14-swarm`, IDs `qst_` and `ans_` (decided with FX7). `listing.drafted` facets make `oneOfAKind` and `leadTimeDays` optional and the payload adds `hours?` (D1-26). Drafted storefront blocks carry `blockId` and single-string props as section 11 names them (D1-25).
- Section 5, B14: the request field `idTag` beside `runId` and `idStart`. Live person-scoped IDs are `<prefix>_user_<tag>_<n>` for `run`, `stp`, `chk`, `apr`, `pc`, `blk` and `qst` (fix-plan 1.9). Buyer requests carry only the buyer-side records listed above, and the server drops the rest. B14 and B15 read `contentRules` from `artifacts/mock/mock.json`, as B11 and B12 read it (A2-8). The `arrival_window` tool is called by the run as code, so the Clerk's roster tools don't change (D1-41). The limits above.
- The error table adds `busy`, status 503, when the server is already running its most runs at once.
- `tests/demo/beats.ts` (I2-tour T6): `ALLOWED_EMPTY_FALLBACKS` adds `b14-swarm` for `swarm.step`, `support.answered`, `listing.drafted`, `listing.indexed`, `question.forwarded` and `question.answered`. `REQUIRED_KEYS` has `b14-swarm: anthropic`.
- `approval.requested` keeps its optional `approval` object (contracts section 11) for `apr_user_<tag>_<n>`.
- F-support's feature-lead writes `tests/features/support-live.spec.ts` for this G5.
