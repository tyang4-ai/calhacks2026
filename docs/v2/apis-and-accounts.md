# v2 · outside APIs and accounts

Every outside API and account Cindia v2 uses: what it's for, who calls it, the account, the variable names from `docs/v2/contracts.md` section 1, how the key travels, the hosts, the limits and the gotchas. Checked against the official docs on Oct 24, 2026, about 3:00 PM PT. The doc copies are in `docs/tech/` (index: `docs/tech/README.md`).

Read by the orchestrator before it sets up keys and network, by every backend-builder before it calls a service, and by Gordon for the accounts only he can make.

## At a glance

| Service | Used by | Variables | Key travels as | Network secret can carry it | Hosts |
|---|---|---|---|---|---|
| Claude API | B02, B07, B09 (v1), B11 pair writing, B14 swarm, B15 Claims and Reporter | `CINDIA_ANTHROPIC_API_KEY` (cloud), `ANTHROPIC_API_KEY` (Windows `.env`) | Header (the SDK sends `Authorization: Bearer`) | No. The proxy never attaches secrets to `api.anthropic.com` | `api.anthropic.com` |
| Capital One Nessie | B04 (v1) | `NESSIE_KEY` | Query string `?key=` | No. Secrets are headers only | `api.nessieisreal.com`, `prod-api.nessieisreal.com`, `qa-api.nessieisreal.com` |
| Elastic Serverless (Elasticsearch) | B12 index and hybrid search, B14 Indexer through B12 | `ELASTIC_URL`, `ELASTIC_API_KEY` or `ELASTIC_AUTH=proxy` | Header `Authorization: ApiKey <encoded key>` | Yes, with the prefix changed to `ApiKey` | the project's Elasticsearch endpoint under `elastic.cloud` |
| Elastic Agent Builder (Kibana API) | B12 agent `cindia-finder`, B14 Finder through B12 | `KIBANA_URL`, same key | Same header, plus `kbn-xsrf: true` on writes | Yes, the same secret if it lists `*.elastic.cloud` | the project's Kibana endpoint under `elastic.cloud` |
| SpacetimeDB (local) | B13 live state, B14 and B15 through the bridge | `SPACETIME_URL`, `SPACETIME_DB` | None needed locally. Optional `Authorization: Bearer <token>` | Not needed (localhost skips the proxy) | `127.0.0.1:3000`. Maincloud, if used: `maincloud.spacetimedb.com` |
| Apify | B15 Scout | `APIFY_TOKEN` or `APIFY_AUTH=proxy` | Header `Authorization: Bearer <token>` (or `?token=`, less safe) | Yes, the default Bearer type | `api.apify.com` |
| Hugging Face Hub | B11 base model download, optional model publish | `HF_TOKEN` (optional) | Header `Authorization: Bearer hf_...` | Probably, not tested. The env variable is safer for the one publish | `huggingface.co`, `*.huggingface.co`, `*.hf.co` |
| Figma MCP server | The planning session's design lead only | none | OAuth through the claude.ai connector | Not relevant | `mcp.figma.com` (through Anthropic's servers) |
| GitHub | the repo, pushes, `git clone` of public repos | none | The cloud GitHub proxy swaps in Gordon's credential | Not needed | `github.com`, `raw.githubusercontent.com`, `*.githubusercontent.com` |

## How the cloud session reaches these services

From the Claude Code docs on cloud sessions and cloud environments (https://code.claude.com/docs/en/claude-code-on-the-web and https://code.claude.com/docs/en/cloud-environments).

- **Network level.** An environment is None, Trusted (the default), Full or Custom. None of the v2 service hosts are on the Trusted list. Trusted does include GitHub, `raw.githubusercontent.com`, npm, PyPI and `*.amazonaws.com`. So the build needs Full, or Custom with the hosts in this file and "Also include default list" ticked. A change to the network level reaches running sessions within about a minute.
- **Environment variables** are plain `.env` lines in the environment's settings. Every command in the session can read them, and so can anyone who uses the environment. A running session keeps the values it last read until its VM restarts (after an idle pause or a rebuild). To use a new value at once, start a new session.
- **Network secrets** keep a key outside the VM. The agent proxy adds it to requests for the hosts you list, after the request leaves the VM.
  - The default secret type is Bearer: header `Authorization`, prefix `Bearer`. The header name and the prefix can be changed, and the prefix can be cleared for headers like `X-Api-Key`.
  - Hosts can use a leading `*.` wildcard. On a Team plan without an organization admin role, the short form takes one host and no wildcard.
  - A host that has a secret is reachable even when the network level wouldn't allow it.
  - The proxy never attaches a secret to `api.anthropic.com`, to GitHub, to the package registries, or to requests made by the setup script.
  - A secret can't be edited. Delete it and add it again.
  - The docs describe only header secrets (and username and password). Nothing puts a secret in a query string, so Nessie's `?key=` can't use one.
- **The proxy itself.** All outbound traffic goes through `HTTPS_PROXY`, and TLS is re-signed by the proxy's CA (`/root/.ccr/ca-bundle.crt`, already in `SSL_CERT_FILE` and `REQUESTS_CA_BUNDLE`). A client that ignores `HTTPS_PROXY` gets no network and no secret. `httpx` and `requests` read the proxy settings by default. The Elasticsearch Python client's default node class (urllib3) does not, so build it with `node_class="requests"`, or call Elasticsearch with `httpx` as the B12 plan does. Node's built-in `fetch` needs `NODE_USE_ENV_PROXY=1`.
- **What the session could reach today.** At 1:22 PM the proxy refused `huggingface.co`, `api.apify.com`, `cloud.elastic.co`, `api.nessieisreal.com` and `maincloud.spacetimedb.com`. At 2:50 PM it also refused `install.spacetimedb.com` and `spacetimedb-client-binaries.s3.amazonaws.com`. GitHub release downloads worked (302 to `release-assets.githubusercontent.com`). `api.github.com` answered 403 for repos not attached to the session, as the docs describe. So the environment was not yet on Full or a complete Custom list.
- **VM size.** About 4 vCPUs, 16 GB of RAM and 30 GB of disk. The docs list no GPU, so B11 trains on CPU.
- **Docs:** none in `docs/tech/`. The source pages are the two URLs at the top of this section.

## Claude API (Anthropic)

- **For:** every Claude call in v1 and v2: the catch explanation (B02), Ask Cindy (B07), the v1 concierge (B09), the training pairs for B11, the agent swarm (B14), and B15's Claims and Reporter.
- **Account:** Gordon's own Claude Console org, where he redeemed the $50 Cal Hacks credit (link in the vault's `ch13-sponsor-anthropic` note). The key is made in the Console.
- **Variables:** `CINDIA_ANTHROPIC_API_KEY` as a cloud environment variable. `ANTHROPIC_API_KEY` only in `.env` on the Windows machines, because setting it in the cloud would change how the cloud session itself is billed.
- **Auth:** a header. The Python SDK 2.x sends `Authorization: Bearer <key>`.
- **Network secret:** no. Cloud docs: secrets are never attached to `api.anthropic.com`. That's why contracts use a plain environment variable.
- **Hosts:** `api.anthropic.com`, reachable at every network level.
- **Limits:** the Console shows the org's rate limits and credit. Gordon's tech-stack note (Oct 22) lists prices per million tokens, input and output: Haiku 5.5 from $0.10 and $0.50, Sonnet 5.5 $2 and $10, Opus 5.5 $4 and $20.
- **Docs:** not in `docs/tech/`. The v1 copies (`claude-api/`, `anthropic-sdk-python/`) are in the vault folder `resources/tech/docs/`, which the cloud session can't read. The rules that matter are in `docs/common/api-contract.md` and `docs/harness/lessons.md`.
- **Gotchas:** no `temperature`, `top_p` or `top_k`, no `thinking: {"type": "enabled"}`, no prefilled assistant turn (API change of Oct 21, 2026). Model IDs are `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-5-5`. Lessons from v1: SDK 2.1.0 runs on `httpx2`, a forced `tool_choice` may 400 on Sonnet 5.5, and `messages.parse()` raises a pydantic error on malformed JSON.

## Capital One Nessie

- **For:** the studio's bank account in v1 (B04). v2 keeps it for every sale, payout and maker payment (Capital One track).
- **Account:** nessieisreal.com, signed in with GitHub. The key is on the profile page. Gordon has it from v1.
- **Variable:** `NESSIE_KEY`, as a cloud environment variable or in `.env`.
- **Auth:** query string, `?key=<key>` on every request.
- **Network secret:** no, secrets are headers only.
- **Hosts:** `api.nessieisreal.com`, `prod-api.nessieisreal.com`, `qa-api.nessieisreal.com`. The spec also lists a "Direct QA server", `https://sopko4r0aj.execute-api.us-east-1.amazonaws.com/qa`, which sits under `*.amazonaws.com` on the Trusted list. Untested as a fallback.
- **Limits:** none published.
- **Docs:** `docs/spec/nessie/ch13-nessie-openapi-spec.yaml` and `docs/spec/nessie/ch13-sponsor-capital-one.md` in this repo.
- **Gotchas (from v1):** purchases and transfers can't be created, so money moves as deposits and withdrawals. A create call answers with a plain string, so read the list back. The account `balance` may not follow deposits, so compute it from the lists.

## Elastic Cloud Serverless (Elasticsearch)

- **For:** the search index (B12): one document per piece with our own 384-number vector, and hybrid search (kNN plus keywords, fused with RRF). This is the Elastic track.
- **Account:** Elastic Cloud, https://cloud.elastic.co/registration. A new organization gets a free 14-day trial with up to three Serverless projects. Create an **Elasticsearch** project. The Vector Database type allows only the `vectordb_document` index mode and is tuned for large vector sets, which 54 pieces don't need. Then open the project's Connection details for the Elasticsearch endpoint and the Kibana endpoint, and create an API key there.
- **Variables:** `ELASTIC_URL` (the Elasticsearch endpoint, not secret), `ELASTIC_API_KEY`, or `ELASTIC_AUTH=proxy` with a network secret.
- **Auth:** header `Authorization: ApiKey <encoded key>`. Copy the encoded form the console shows. Serverless has no username and password login for clients.
- **Network secret:** yes. Header name `Authorization`, prefix `ApiKey` (change it from the default `Bearer`), allowed websites `*.elastic.cloud`, which covers both endpoints.
- **Hosts:** the two project endpoints, both under `elastic.cloud`. `cloud.elastic.co` is the console and is only needed in a browser.
- **Limits:**
  - Trial: 14 days, three active Serverless projects, Search Power at most 100, limited scaling, and restricted LLM and model token use.
  - Billing is by VCUs (search, ingest, ML), storage and tokens. Ingest VCUs drop to zero after 15 minutes without ingest. Search keeps a baseline.
  - 15,000 indices per project.
- **Docs:** `docs/tech/elasticsearch/` (dense_vector, kNN, retrievers and RRF, the Python client and its bulk helpers, Serverless connection, API keys, trial limits, Serverless differences and billing).
- **Gotchas:**
  - A float `dense_vector` with 384 or more dimensions defaults to `bbq_hnsw`. Set `"index_options": {"type": "int8_hnsw"}` in the mapping.
  - With `similarity: cosine`, `_score` is `(1 + cosine) / 2`.
  - Vectors are left out of `_source` in search responses by default. Ask with `fields` or `_source.exclude_vectors: false` if you need them back.
  - `_cluster/*`, `_nodes/*` and most `_cat/*` APIs answer 410 `api_not_available_exception`. Use `GET /` for a health check and `GET /cindia-pieces/_count` for the count.
  - Shard, replica and other infrastructure settings are rejected. Set none.
  - Writes are batched over about 200 ms. After seeding, refresh (`refresh="wait_for"` on the bulk, or `POST /<index>/_refresh`) before the first search.
  - `num_candidates` must be at least `k` and at most 10,000. RRF's `rank_window_size` must be at least `size`.
  - There is no CORS, so only `server/` talks to Elastic. That's already the rule.

## Elastic Agent Builder (Kibana API)

- **For:** the agent `cindia-finder`, which B12 creates and B14's Finder can ask structured questions. The Elastic track's name is "Best use of the Elastic Agent Builder on a Serverless instance".
- **Account:** the same Serverless project. Agent Builder is on by default in every project type, with an Elastic Managed LLM as its model, so no model key is needed.
- **Variables:** `KIBANA_URL` (not secret) and the same key as Elasticsearch. One project API key works for both the Elasticsearch and the Kibana APIs.
- **Auth:** `Authorization: ApiKey <encoded key>` on every call, plus `kbn-xsrf: true` on POST, PUT and DELETE. Paths start with `/api/agent_builder/`. A space other than the default needs `/s/<space_id>` in front.
- **Network secret:** the Elastic secret above, if it lists `*.elastic.cloud`. `kbn-xsrf` isn't secret, so the code sends it.
- **Hosts:** the project's Kibana endpoint.
- **Limits:** Elasticsearch projects get 1,000 free Agent Builder executions a month. An execution is one turn, and a turn over 50,000 input tokens counts as more than one. Error answers aren't billed. Trial projects restrict LLM token use.
- **Docs:** `docs/tech/elastic-agent-builder/`. Start with `kibana-api.md`, then `api-tools.md`, `api-agents.md` and `api-converse.md` for exact schemas.
- **Gotchas:**
  - Tool types are `esql`, `index_search`, `workflow` and `mcp`. An index search tool is `{"type": "index_search", "configuration": {"pattern": "cindia-pieces"}}`, and its only input is `nlQuery`. It picks one index per query.
  - Custom tool IDs can't start with a protected prefix such as `platform.core.`, `search.`, `security.` or `observability.`. A name like `cindia.search_pieces` is safe.
  - Creating an agent needs `id`, `name`, `description` and `configuration.tools[].tool_ids`. Agents are private to their creator unless `access_control` says otherwise, which is fine for one API key.
  - `POST /api/agent_builder/converse` waits for the whole agent run, model calls and tool calls included. The docs give no latency figure, so measure one call before trusting B12's 6-second timeout. `/converse/async` streams instead.
  - Nothing in the docs lets the agent embed a query with our own model. Expect its searches to be full-text and ES|QL over the index fields, not the kNN hybrid of `/api/b12/search`. This is our reading of the tool docs, not a statement in them.

## SpacetimeDB

- **For:** the live shared state of the swarm and the process blocks (B13): tables `swarm_run`, `swarm_step`, `process_status`, `screen`, and the reducers in contracts section 5. This is the SpacetimeDB track.
- **Account:** none for the local server. Maincloud is optional and needs `spacetime login`, which opens a browser for a GitHub or Google sign-in. That makes it Gordon's call, not a cloud-session task.
- **Variables:** `SPACETIME_URL` (default `http://127.0.0.1:3000`), `SPACETIME_DB` (default `cindia`).
- **Auth:** none needed locally. Without an `Authorization` header, each HTTP request gets a fresh anonymous identity, which can call reducers and read public tables. A token from `POST /v1/identity` can be reused as `Authorization: Bearer <token>`.
- **Network secret:** not needed. The local server is on localhost, which skips the proxy.
- **Hosts:** `127.0.0.1:3000`. The installer needs more than contracts list (see Differences, item 1). Maincloud is `maincloud.spacetimedb.com`.
- **Limits:** none locally. Maincloud's free tier pauses idle databases and wakes them in about a second.
- **Docs:** `docs/tech/spacetimedb/` (install, TypeScript modules, tables, reducers, subscriptions, publish, the HTTP API, SQL, the CLI, the TypeScript SDK, the 2.0 changes). Pinned to v2.13.0.
- **Gotchas:**
  - Version 2.13.0 supports TypeScript modules (`spacetime dev --template basic-ts` or `spacetime init`). The npm package is `spacetimedb`. `@clockworklabs/spacetimedb-sdk` is deprecated.
  - Canonical table and reducer names are the snake_case form of the TypeScript key or export. The quickstart's `sayHello` is called as `say_hello`. Naming them `start_run` and so on from the start avoids surprises.
  - A reducer call is `POST /v1/database/cindia/call/<reducer>` with a JSON array of the arguments in declared order. It waits for durability by default (`confirmed=true`).
  - SQL is `POST /v1/database/cindia/sql` with the raw SQL text as the body. It answers `[{"schema": ..., "rows": [...]}]`, and each row is an array in column order.
  - Only public tables are visible to anonymous SQL and subscriptions. Mark all four tables `public: true`.
  - `t.u64()` columns are `bigint` in a TypeScript module. Insert `0n` to trigger auto-increment. Over HTTP JSON they are plain numbers.
  - Auto-increment values are not promised to be gap-free. Transactions run one at a time today, so polling for `seq` above the last one works now. The docs reserve the right to run them concurrently later.
  - Don't rely on the CLI's default server. The `spacetime dev` page says the database "will be available at https://maincloud.spacetimedb.com", and `spacetime init` has a `--local` flag to "Use local deployment instead of Maincloud". Publish with `spacetime publish -s local cindia`, or run `spacetime server set-default local` first.
  - `spacetime start` runs in the foreground, so start it in the background. It speaks plain HTTP: the docs say "SSL is not supported in standalone mode".
  - There is no official Python SDK. From Python, poll the SQL endpoint, open the `v1.json.spacetimedb` WebSocket on `/v1/database/cindia/subscribe` yourself, or run `spacetime subscribe` (marked unstable) as a subprocess. The docs say the HTTP endpoints "have not been optimized for performance to the same extent as the WebSocket API", which is fine for four polls a second on localhost.

## Apify

- **For:** the counterfeit watch (B15 Scout): Google search results for a maker's pieces through the actor `apify/google-search-scraper`. This is the Apify track.
- **Account:** console.apify.com. Sign up at https://console.apify.com/sign-up?couponId=APIFY_CAL_HACKS, or enter `APIFY_CAL_HACKS` under Billing > Subscription, for $200 of credit (Cal Hacks pre-event email 2). The free plan alone gives $5 a month. The API token is on Settings > API & Integrations. A scoped token can be limited to running Actors.
- **Variables:** `APIFY_TOKEN`, or `APIFY_AUTH=proxy` with a network secret.
- **Auth:** `Authorization: Bearer <token>` (recommended), or `?token=` in the URL (less safe).
- **Network secret:** yes. The default Bearer type, allowed website `api.apify.com`.
- **Hosts:** `api.apify.com`. `console.apify.com` is browser only.
- **Limits:**
  - The sync call waits at most 300 seconds, then answers 408.
  - Rate limits: 250,000 requests a minute per user overall, 60 a second per resource, 400 a second for run endpoints. A 429 means back off and retry.
  - The free plan allows 25 concurrent runs and 16 GB of memory across running jobs.
  - The Google scraper costs from $1.80 per 1,000 result pages, so a three-query scan of one page each costs about half a cent.
- **Docs:** `docs/tech/apify/` (auth and limits, run-sync-get-dataset-items, the Google search scraper).
- **Gotchas:**
  - The path is `POST https://api.apify.com/v2/actors/apify~google-search-scraper/run-sync-get-dataset-items`. A tilde replaces the slash in the Actor name. `/v2/acts/` is the deprecated alias.
  - Success is status 201, with a JSON array of dataset items.
  - The body is the Actor input. `queries` is one string with one query per line. Use `maxPagesPerQuery: 1` for about 10 results per query. The Actor has no `resultsPerPage` input.
  - The output has one item per results page per query. The results are in `organicResults`, each with `title`, `url` and `description` (the snippet), plus `position`, `displayedUrl` and others.
  - The `timeout` query parameter (seconds) limits the run. The docs don't say whether a run that hits it still returns what it saved, so treat that as an error with maybe a short list.
  - Leave the paid add-ons off (AI Mode, AI Overview, paid results and the rest).

## Hugging Face Hub

- **For:** downloading the base model `intfloat/multilingual-e5-small` for B11 training, and, if `HF_TOKEN` is set, publishing the fine-tuned model and its card.
- **Account:** huggingface.co, free. For publishing, a token with write access from Settings > Access Tokens.
- **Variable:** `HF_TOKEN`, optional. Public downloads work without it. The Sentence Transformers docs suggest logging in anyway for higher Hub rate limits.
- **Auth:** `Authorization: Bearer hf_...`.
- **Network secret:** probably, since it's a Bearer header, but untested. `huggingface_hub` may look for a local token before a write. For the one publish, the plain variable is the safer route.
- **Hosts:** `huggingface.co`, `*.huggingface.co`, `*.hf.co` (file storage runs on Xet hosts under `hf.co`).
- **Limits:** none that matter at this size.
- **Docs:** `docs/tech/huggingface-hub/` and `docs/tech/sentence-transformers/`. The base model's notes are in `docs/tech/sentence-transformers/multilingual-e5-small.md`.
- **Gotchas:**
  - Current releases: sentence-transformers 6.2.0 (it needs transformers 5.x and huggingface-hub 1.x or later), huggingface_hub 2.3.0, torch 2.14.1.
  - v6 moved the import paths, for example `sentence_transformers.sentence_transformer.losses`. The old ones still work with a deprecation warning.
  - `push_to_hub(tags=...)` was removed in 5.4. Append to `model.model_card_data.tags` instead.
  - The docs' training example sets `fp16=True`. On the CPU-only VM, set `fp16=False` and `bf16=False`.
  - Train MultipleNegativesRankingLoss with `batch_sampler=BatchSamplers.NO_DUPLICATES`.
  - Every E5 input needs its `query: ` or `passage: ` prefix. Add it in the text or through the trainer's `prompts`, never both.
  - E5 cosine scores sit between 0.7 and 1.0 by design, which is why contracts section 11 calibrates B15's similarity.

## Build-time downloads

Hosts the build needs that aren't a service account:

| Host | For | Notes |
|---|---|---|
| `download.pytorch.org` | CPU torch wheels (`--extra-index-url`, contracts section 11) | Not on the Trusted list |
| `cdn.sheetjs.com` | `npm ci` (the SheetJS tarball, v1) | Not on the Trusted list |
| `cdn.playwright.dev`, `playwright.download.prss.microsoft.com` | `npx playwright install chromium` | Not on the Trusted list |
| `install.spacetimedb.com`, `github.com` releases, `api.github.com`, `spacetimedb-client-binaries.s3.amazonaws.com` | The SpacetimeDB installer | See Differences, item 1 |
| `static.rust-lang.org`, `sh.rustup.rs` | Only if B13 falls back to a Rust module | Contracts section 11 |
| `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org` | npm and pip | Reachable at every level, never get secrets |

## Accounts Gordon handles himself

- **The cloud environment** (claude.ai/code, the environment's settings):
  - Network access: Full, or Custom with every host in this file and "Also include default list" ticked.
  - Environment variables: `CINDIA_ANTHROPIC_API_KEY`, `NESSIE_KEY`, `ELASTIC_URL`, `KIBANA_URL`, then either `ELASTIC_API_KEY` or `ELASTIC_AUTH=proxy`, either `APIFY_TOKEN` or `APIFY_AUTH=proxy`, and `HF_TOKEN` only to publish the model.
  - Network secrets, if used: Elastic (header `Authorization`, prefix `ApiKey`, `*.elastic.cloud`) and Apify (Bearer, `api.apify.com`).
  - A running session reads new variables only after its VM restarts, so start a new session after changing them.
- **Elastic Cloud:** the trial sign-up, the Elasticsearch project, the API key, and the two endpoint URLs.
- **Apify:** the account with the `APIFY_CAL_HACKS` credit, and the API token.
- **Hugging Face:** an account and a write token, only if the model gets published.
- **Nessie and the Claude Console:** done in v1. Make a fresh Claude key for the cloud variable if the old one lives only in `.env`.
- **Devpost** (https://cal-hacks-13-0.devpost.com): be checked in at the venue by Sunday 8:00 AM and submit by 9:00 AM. The submission needs a project image, the GitHub repo and the video. Pick every track on the submission form. Best Solo Hack is automatic. A draft by Saturday night is safest (Hacker Guide).
- **Figma Education:** Figma's rules say "Make sure you are Edu verified". The Education plan gives students Figma Design, Make, Slides and Figma Agent for free. The Figma files must be shared with "Anyone", and the submission needs a demo video of at most 3 minutes, a stage log (at most 200 words per stage) and a Figma Slides deck with the files embedded and a link to the code.
- **The MLH GoDaddy Registry domain:** register it through MLH's GoDaddy Registry offer (`mlh.link/GoDaddyRegistry`, and MLH's prizes page has a "Claim promo code" button). Then enter "[MLH] Best Domain Name from GoDaddy Registry" on Devpost and point the domain at the demo or the Devpost page. The free extensions weren't visible to this check.
- **YouTube:** upload the recorded video (Unlisted works) and paste the link into Devpost. Hyphenate wants it to open with "the moment" (the catch), and Figma caps it at 3 minutes.

## Differences from docs/v2/contracts.md

Places where the official docs say something other than what `docs/v2/contracts.md` assumes. contracts.md is unchanged. The fix for each is up to the orchestrator.

1. **SpacetimeDB install hosts (section 1).** Contracts list `install.spacetimedb.com` and `*.spacetimedb.com`. The install script at v2.13.0 (`crates/update/spacetime-install.sh`) downloads its first binary from `github.com/clockworklabs/SpacetimeDB/releases/latest/download/`, with `spacetimedb-client-binaries.s3.amazonaws.com` as a mirror. That binary then asks `api.github.com/repos/clockworklabs/SpacetimeDB/releases` for the CLI, and falls back to the same S3 mirror. In the cloud session `api.github.com` answers 403 for repos not attached, and the mirror was refused today. So the install can fail even with the two listed hosts allowed. Fix: allow `spacetimedb-client-binaries.s3.amazonaws.com` (or tick the default list, which has `*.amazonaws.com`), or attach `clockworklabs/SpacetimeDB` to the session as a read repo. `*.spacetimedb.com` matters only for Maincloud.
2. **The Elastic network secret (sections 1 and 11).** Contracts assume a network secret can attach the Elastic key (`ELASTIC_AUTH=proxy`). It can, but not with the defaults: a secret's default prefix is `Bearer`, and Elastic wants `ApiKey <encoded key>`. The secret has to list `*.elastic.cloud` (or both endpoints) so the Kibana calls get it too. On a Team plan without an organization admin role, the short form takes one host only.
3. **dense_vector quantization (section 5, B12).** Contracts say "384 dimensions, cosine, int8 HNSW". The docs say a float vector with 384 or more dimensions defaults to `bbq_hnsw`. int8 HNSW happens only when the mapping sets `index_options.type: int8_hnsw`. The B12 plan already sets it.
4. **"A keyword retriever" (section 5, B12).** Elastic has no keyword retriever. The lexical half is a `standard` retriever with a query such as `multi_match`. The B12 plan already says `standard`.
5. **The Agent Builder search tool (section 5, B12).** Contracts call it "a search tool over `cindia-pieces`". The API's tool types are `esql`, `index_search`, `workflow` and `mcp`, and custom tool IDs can't use protected prefixes such as `search.` or `platform.core.`. Agent Builder searches with its own query generation on the Elastic Managed LLM, and the docs give it no way to embed a query with our model. So `cindia-finder` answers from full-text and ES|QL search, not from our vectors. (That last point is our reading of the docs.)
6. **The snippet field (sections 2 and 5, B15).** `CounterfeitCandidate.snippet` and "title, URL and snippet" assume a field named snippet. The Actor returns it as `description`, inside `organicResults`, with one dataset item per results page. Map `description` to `snippet`.
7. **"At most 10 results per query" (section 5, B15).** The Actor has no input for a result count. Apify's own LangChain integration says so and pages with `maxPagesPerQuery`, about 10 results a page. `queries` is a single newline-separated string, not a list. Send `maxPagesPerQuery: 1` and cut to 10 on our side.
8. **The Apify call (section 5, B15).** Contracts say only "run-sync". The canonical endpoint is `POST /v2/actors/apify~google-search-scraper/run-sync-get-dataset-items`. It answers 201 on success, and 408 when the run takes more than 300 seconds. The run's `timeout` parameter ends the run itself, and the docs don't promise the saved items come back when it fires.
9. **Publishing locally (section 5, B13).** Contracts say the module is published as `cindia` on the local server. The docs show `spacetime dev` publishing to Maincloud and `spacetime init` needing `--local`. Use `spacetime publish -s local cindia`, or set `local` as the default server first.

Checked and consistent: Nessie's `?key=` and the Anthropic key can't be network secrets, which matches contracts keeping both as plain variables. The `query: ` and `passage: ` prefixes and the 384 dimensions match the E5 docs. Section 11's calibrated similarity fits the model card's warning about high cosine scores. TypeScript modules work in the CLI that installs today (2.13.0). Snake_case table and reducer names match 2.x canonical names. Apify's Bearer header matches `config.apify_headers()`.
