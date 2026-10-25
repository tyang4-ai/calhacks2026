# v2 · outside APIs and accounts

Every outside API and account the Cindia platform uses in v2: what it's for, who calls it, the account, the variable names from `docs/v2/contracts.md` section 1, how the key travels, the hosts, the limits and the gotchas. Checked against the official docs on Oct 24, 2026. The doc copies are in `docs/tech/` (index: `docs/tech/README.md`).

Read by the orchestrator before it sets up keys and network, by every backend-builder before it calls a service, and by Gordon for the accounts only he can make. Everything these services hold is mock data from `src/mock/`. Nothing real goes into them.

## At a glance

| Service | Used by | Variables | Key travels as | Network secret can carry it | Hosts |
|---|---|---|---|---|---|
| Claude API | B02, B07, B09 (v1), B11 pair writing, B14 swarm, B15 Claims and Reporter | `CINDIA_ANTHROPIC_API_KEY` (cloud), `ANTHROPIC_API_KEY` (Windows `.env`) | Header (the SDK sends `Authorization: Bearer`) | No. The proxy never attaches secrets to `api.anthropic.com` | `api.anthropic.com` |
| Capital One Nessie | B04 (v1), B16 | `NESSIE_KEY` | Query string `?key=` | No. Secrets are headers only | `api.nessieisreal.com`, `prod-api.nessieisreal.com`, `qa-api.nessieisreal.com` |
| Elastic Serverless (Elasticsearch) | B12 index and hybrid search, B14 Indexer through B12 | `ELASTIC_URL`, `ELASTIC_API_KEY` or `ELASTIC_AUTH=proxy` | Header `Authorization: ApiKey <encoded key>` | Yes, with the prefix changed to `ApiKey` | the project's Elasticsearch endpoint under `elastic.cloud` |
| Elastic Agent Builder (Kibana API) | B12 agent `cindia-finder`, B14 Finder through B12 | `KIBANA_URL`, same key | Same header, plus `kbn-xsrf: true` on writes | Yes, the same secret if it lists `*.elastic.cloud` | the project's Kibana endpoint under `elastic.cloud` |
| SpacetimeDB (local) | B13 the database, B14 and B15 through the bridge | `SPACETIME_URL`, `SPACETIME_DB`, `SPACETIME_TOKEN` | `Authorization: Bearer <token>`, the publisher's token | Not needed (localhost skips the proxy) | `127.0.0.1:3000` |
| Apify | B15 Scout (Cheerio Scraper over the sandbox market) | `APIFY_TOKEN` or `APIFY_AUTH=proxy`, and `PUBLIC_SITE_URL` | Header `Authorization: Bearer <token>` | Yes, the default Bearer type | `api.apify.com` |
| Hugging Face Hub | B11 base model download, model publish and fetch | `HF_TOKEN`, `CINDIA_HF_REPO` | Header `Authorization: Bearer hf_...` | Probably, not tested. The variable is safer | `huggingface.co`, `*.huggingface.co`, `*.hf.co` |
| Cloudflare Pages | The public site and its sandbox market, uploaded by Gordon from Windows | `PUBLIC_SITE_URL` once it's up, `VITE_PUBLIC_SITE=1` for the build | Gordon's dashboard sign-in. Nothing in the repo | Not relevant | `*.pages.dev`, and the MLH domain |
| Figma MCP server | The planning session's design lead only | none | OAuth through the claude.ai connector | Not relevant | `mcp.figma.com` (through Anthropic's servers) |
| GitHub | the repo, pushes, `git clone` of public repos | none | The cloud GitHub proxy swaps in Gordon's credential | Not needed | `github.com`, `raw.githubusercontent.com`, `*.githubusercontent.com` |

## How the cloud session reaches these services

From the Claude Code docs on cloud sessions and cloud environments (https://code.claude.com/docs/en/claude-code-on-the-web and https://code.claude.com/docs/en/cloud-environments), with copies in `docs/tech/claude-code/`.

- **Network level.** An environment is None, Trusted (the default), Full or Custom. None of the v2 service hosts are on the Trusted list. Trusted does include GitHub, `raw.githubusercontent.com`, npm, PyPI, crates.io and `*.amazonaws.com`. So the build needs Full, or Custom with the hosts in contracts section 1 and "Also include default list" ticked. A change to the network level reaches running sessions within about a minute.
- **Environment variables** are plain `.env` lines in the environment's settings. Every command in the session can read them, and so can anyone who uses the environment. A running session keeps the values it last read until its VM restarts (after an idle pause or a rebuild). To use a new value at once, start a new session.
- **Network secrets** keep a key outside the VM. The agent proxy adds it to requests for the hosts you list, after the request leaves the VM.
  - The default secret type is Bearer: header `Authorization`, prefix `Bearer`. The header name and the prefix can be changed, and the prefix can be cleared for headers like `X-Api-Key`.
  - Hosts can use a leading `*.` wildcard. On a Team plan without an organization admin role, the short form takes one host and no wildcard.
  - A host that has a secret is reachable even when the network level wouldn't allow it.
  - The proxy never attaches a secret to `api.anthropic.com`, to GitHub, to the package registries, or to requests made by the setup script.
  - A secret can't be edited. Delete it and add it again.
  - The docs describe only header secrets (and username and password). Nothing puts a secret in a query string, so Nessie's `?key=` can't use one.
  - Proxy mode (`ELASTIC_AUTH=proxy`, `APIFY_AUTH=proxy`) exists only in the cloud. On Windows, `.env` holds the real keys.
- **The proxy itself.** All outbound traffic goes through `HTTPS_PROXY`, and TLS is re-signed by the proxy's CA (`/root/.ccr/ca-bundle.crt`, already in `SSL_CERT_FILE` and `REQUESTS_CA_BUNDLE`). A client that ignores `HTTPS_PROXY` gets no network and no secret. `httpx` and `requests` read the proxy settings by default, which is why B12 calls Elastic with `httpx` and the server installs no `elasticsearch` client. Node's built-in `fetch` needs `NODE_USE_ENV_PROXY=1` (Node 22.21 or later), per the session's proxy notes in `/root/.ccr/README.md`. The proxy doesn't carry WebSocket upgrades.
- **What the session could reach today.** At 1:22 PM the proxy refused `huggingface.co`, `api.apify.com`, `cloud.elastic.co`, `api.nessieisreal.com` and `maincloud.spacetimedb.com`. At 2:50 PM it also refused `install.spacetimedb.com` and `spacetimedb-client-binaries.s3.amazonaws.com`, and at 4:20 PM `api.census.gov`. GitHub release downloads worked (302 to `release-assets.githubusercontent.com`). `api.github.com` answered 403 for repos not attached to the session, as the docs describe. So the environment was not yet on Full or a complete Custom list.
- **VM size.** The planning session's VM has 2 vCPUs and about 7 GB of RAM, and the build session's is likely the same. There's no GPU, so B11 trains on CPU in the cloud.
- **Tags.** The GitHub proxy refuses pushes of anything but a branch, so the cloud session pushes `main` only and records each tag and its SHA in `status.md`. Gordon pushes the tags from Windows at the freeze (contracts section 10).

## Claude API (Anthropic)

- **For:** every Claude call in v1 and v2: the catch explanation (B02), Ask Cindy (B07), the v1 concierge (B09), the training pairs for B11, the agent swarm (B14), and B15's Claims and Reporter.
- **Account:** Gordon's own Claude Console org, where he redeemed the $50 Cal Hacks credit (link in the vault's `ch13-sponsor-anthropic` note). The key is made in the Console.
- **Variables:** `CINDIA_ANTHROPIC_API_KEY` as a cloud environment variable. `ANTHROPIC_API_KEY` only in `.env` on the Windows machines, because setting it in the cloud would change how the cloud session itself is billed.
- **Auth:** a header. The Python SDK 2.x sends `Authorization: Bearer <key>`. Every client passes `base_url` from `config.CLAUDE_BASE_URL` (`https://api.anthropic.com`), so the session's own `ANTHROPIC_BASE_URL` never moves the platform's calls.
- **Network secret:** no. Cloud docs: secrets are never attached to `api.anthropic.com`. That's why the contracts use a plain environment variable.
- **Hosts:** `api.anthropic.com`, reachable at every network level.
- **Models:** the platform uses only `claude-haiku-5-5` and `claude-sonnet-5-5` (`config.ALLOWED_MODELS`), and a test fails on any other model ID. Gordon's tech-stack note (Oct 22) lists prices per million tokens, input and output: Haiku 5.5 from $0.10 and $0.50, Sonnet 5.5 $2 and $10.
- **Limits:** the Console shows the org's rate limits and credit.
- **Docs:** `docs/tech/claude-api/` (models, structured outputs, tool use, errors, the Oct 21 migration) and `docs/tech/anthropic-sdk-python/`. The rules that matter are also in `docs/common/api-contract.md` and `docs/harness/lessons.md`.
- **Gotchas:** no `temperature`, `top_p` or `top_k`, no `thinking: {"type": "enabled"}`, no prefilled assistant turn (API change of Oct 21, 2026). Lessons from v1: SDK 2.1.0 runs on `httpx2`, a forced `tool_choice` may 400 on Sonnet 5.5, and `messages.parse()` raises a pydantic error on malformed JSON. A `stop_reason` of `refusal` or `max_tokens` leaves `parsed_output` empty, so it maps to the `unknown` path.

## Capital One Nessie

- **For:** the co-op's bank account. In v1, B04 posts the sale as a deposit and the maker payouts as withdrawals. In v2, B16 reads the bank side back from Nessie in live mode, so B01 finds the $340 catch against Nessie, and it posts the fund moves as a deposit and a withdrawal (Capital One track). Nessie is a sandbox bank, so no real money moves.
- **Account:** nessieisreal.com, signed in with GitHub. The key is on the profile page. Gordon has it from v1.
- **Variable:** `NESSIE_KEY`, as a cloud environment variable or in `.env`.
- **Auth:** query string, `?key=<key>` on every request. httpx logs full URLs at INFO, so the server keeps the `httpx`, `httpx2` and `httpcore` loggers at WARNING (contracts section 5).
- **Network secret:** no, secrets are headers only.
- **Hosts:** `api.nessieisreal.com`, `prod-api.nessieisreal.com`, `qa-api.nessieisreal.com`. The spec also lists a "Direct QA server", `https://sopko4r0aj.execute-api.us-east-1.amazonaws.com/qa`, which sits under `*.amazonaws.com` on the Trusted list. Untested as a fallback.
- **Limits:** none published.
- **Docs:** `docs/spec/nessie/ch13-nessie-openapi-spec.yaml` and `docs/spec/nessie/ch13-sponsor-capital-one.md` in this repo.
- **Gotchas (from v1):** purchases and transfers can't be created, so money moves as deposits and withdrawals. A create call answers with a plain string, so read the list back. The account `balance` may not follow deposits, so compute it from the lists.

## Elastic Cloud Serverless (Elasticsearch)

- **For:** the search index (B12), built from the platform's data: one document per piece with our own 384-number vector, hybrid search (kNN plus keywords, fused with RRF), and a drafts index for new listings until the owner approves them. This is the Elastic track.
- **Account:** Elastic Cloud, https://cloud.elastic.co/registration. A new organization gets a free 14-day trial with up to three Serverless projects. Create an **Elasticsearch** project. The Vector Database type allows only the `vectordb_document` index mode and is tuned for large vector sets, which 54 pieces don't need. Then open the project's Connection details for the Elasticsearch endpoint and the Kibana endpoint, and create an API key there.
- **The key's privileges.** The simplest key has no role descriptors and keeps its creator's privileges, which is fine on a trial project used only for this. A scoped key needs, on indices `cindia-pieces*` and `cindia-drafts*`, the privileges `create_index`, `write`, `manage`, `read` and `view_index_metadata`, and, for Agent Builder, the application `kibana-.kibana` with `feature_agentBuilder.all` and `feature_actions.read` on `space:default`. A key with read-only index access gets a 403 on the seed. Examples: `docs/tech/elastic-agent-builder/api-keys.md`.
- **Variables:** `ELASTIC_URL` (the Elasticsearch endpoint, not secret), `ELASTIC_API_KEY`, or `ELASTIC_AUTH=proxy` with a network secret. `keys.elastic` counts only when `ELASTIC_URL` is set too.
- **Auth:** header `Authorization: ApiKey <encoded key>`. Copy the encoded form the console shows. Serverless has no username and password login for clients.
- **Network secret:** yes. Header name `Authorization`, prefix `ApiKey` (change it from the default `Bearer`), allowed websites `*.elastic.cloud`, which covers both endpoints. On a Team plan without the admin role, add two secrets, one per endpoint.
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
  - Elastic has no keyword retriever. The lexical half of the hybrid is a `standard` retriever with a query such as `multi_match`.
  - `_cluster/*`, `_nodes/*` and most `_cat/*` APIs answer 410 `api_not_available_exception`. Use `GET /` for a health check and `GET /cindia-pieces/_count` for the count.
  - Shard, replica and other infrastructure settings are rejected. Set none.
  - Writes are batched over about 200 ms. After seeding, refresh (`refresh="wait_for"` on the bulk, or `POST /<index>/_refresh`) before the first search.
  - `num_candidates` must be at least `k` and at most 10,000. RRF's `rank_window_size` must be at least `size`.
  - There is no CORS, so only `server/` talks to Elastic. That's already the rule.

## Elastic Agent Builder (Kibana API)

- **For:** the agent `cindia-finder`, which B12 creates during its seed and which B14 routes find questions to in code. The swarm view labels that step "Elastic Agent Builder". The Elastic track's name is "Best use of the Elastic Agent Builder on a Serverless instance".
- **Account:** the same Serverless project. Agent Builder is on by default in every project type, with an Elastic Managed LLM as its model, so no model key is needed.
- **Variables:** `KIBANA_URL` (not secret) and the same key as Elasticsearch. One project API key works for both the Elasticsearch and the Kibana APIs.
- **Auth:** `Authorization: ApiKey <encoded key>` on every call, plus `kbn-xsrf: true` on POST, PUT and DELETE. Paths start with `/api/agent_builder/`. A space other than the default needs `/s/<space_id>` in front.
- **Network secret:** the Elastic secret above, if it lists `*.elastic.cloud`. `kbn-xsrf` isn't secret, so the code sends it.
- **Hosts:** the project's Kibana endpoint.
- **Limits:** Elasticsearch projects get 1,000 free Agent Builder executions a month. An execution is one turn, and a turn over 50,000 input tokens counts as more than one. Error answers aren't billed. Trial projects restrict LLM token use, so a token-limit error counts as `agentBuilder: false`.
- **Docs:** `docs/tech/elastic-agent-builder/`. Start with `kibana-api.md`, then `api-tools.md`, `api-agents.md` and `api-converse.md` for exact schemas.
- **Gotchas:**
  - Tool types are `esql`, `index_search`, `workflow` and `mcp`. An index search tool is `{"type": "index_search", "configuration": {"pattern": "cindia-pieces"}}`, and its only input is `nlQuery`. It picks one index per query.
  - Custom tool IDs can't start with a protected prefix such as `platform.core.`, `search.`, `security.` or `observability.`. `cindia.search_pieces` is safe.
  - Creating an agent needs `id`, `name`, `description` and `configuration.tools[].tool_ids`. Agents are private to their creator unless `access_control` says otherwise, which is fine for one API key.
  - `POST /api/agent_builder/converse` waits for the whole agent run, model calls and tool calls included. The docs give no latency figure, so measure one call before trusting B12's 6-second timeout. `/converse/async` streams instead.
  - Nothing in the docs lets the agent embed a query with our own model. Its searches are full-text and ES|QL over the index fields, not the kNN hybrid of `/api/b12/search`. This is our reading of the tool docs, not a statement in them.

## SpacetimeDB

- **For:** the platform's one database (B13): the catalog, listings, orders, approvals, the swarm's runs and steps, each process's status and the screens watching. The data view, presence on the process bar and the swarm view's live steps read it. This is the SpacetimeDB track.
- **Account:** none for the local server. Maincloud stays off for the demo.
- **Variables:** `SPACETIME_URL` (default `http://127.0.0.1:3000`), `SPACETIME_DB` (default `cindia`), `SPACETIME_TOKEN` (the publisher's token).
- **Auth:** the tables are private, and only the module's publisher may call the writing reducers and read them. After `spacetime publish`, `server/b13_spacetime/save_token.py` reads the CLI's token from `spacetime login show --token` and writes `SPACETIME_TOKEN` to `.env` without printing it. The bridge sends it as `Authorization: Bearer <token>`.
- **Network secret:** not needed. The local server is on localhost, which skips the proxy.
- **Hosts:** `127.0.0.1:3000`. The installer needs `install.spacetimedb.com`, GitHub release assets and `spacetimedb-client-binaries.s3.amazonaws.com` (Build-time downloads, below).
- **Limits:** none locally.
- **Docs:** `docs/tech/spacetimedb/` (install, TypeScript modules, tables, indexes and access, reducers, subscriptions, publish, the HTTP API, SQL, the CLI, the TypeScript SDK, the 2.0 changes). Pinned to v2.13.0.
- **Gotchas:**
  - Start it with `spacetime start --listen-addr 127.0.0.1:3000` on every machine, so nothing on venue Wi-Fi can reach it. It runs in the foreground, so start it in the background. It speaks plain HTTP: the docs say "SSL is not supported in standalone mode".
  - The install script at v2.13.0 (`crates/update/spacetime-install.sh`) downloads its first binary from `github.com/clockworklabs/SpacetimeDB/releases/latest/download/`, with `spacetimedb-client-binaries.s3.amazonaws.com` as a mirror. That binary then asks `api.github.com/repos/clockworklabs/SpacetimeDB/releases` for the CLI, and falls back to the same mirror. In the cloud session `api.github.com` answers 403 for repos not attached, so allow the mirror (the default list has `*.amazonaws.com`), or attach `clockworklabs/SpacetimeDB` to the session as a read repo. On a 403 from a release download, fetch the asset from `release-assets.githubusercontent.com` with curl.
  - Don't rely on the CLI's default server. The `spacetime dev` page says the database "will be available at https://maincloud.spacetimedb.com", and `spacetime init` has a `--local` flag. Publish with `spacetime publish -s local cindia`, or run `spacetime server set-default local` first.
  - Version 2.13.0 supports TypeScript modules (`spacetime dev --template basic-ts` or `spacetime init`). The npm package is `spacetimedb`. `@clockworklabs/spacetimedb-sdk` is deprecated.
  - Canonical table and reducer names are the snake_case form of the TypeScript key or export. Naming them in snake_case from the start avoids surprises.
  - A reducer call is `POST /v1/database/cindia/call/<reducer>` with a JSON array of the arguments in declared order. It waits for durability by default (`confirmed=true`).
  - SQL is `POST /v1/database/cindia/sql` with the raw SQL text as the body. It answers `[{"schema": ..., "rows": [...]}]`, and each row is an array in column order. The SQL has no ORDER BY, so sort by `seq` in Python.
  - `t.u64()` columns are `bigint` in a TypeScript module. Insert `0n` to trigger auto-increment. Over HTTP JSON they are plain numbers.
  - Auto-increment values are not promised to be gap-free. Transactions run one at a time today, so polling for `seq` above the last one works now. The docs reserve the right to run them concurrently later.
  - There is no official Python SDK. B13 polls the SQL endpoint from one server-side feed, and the browser polls B13's own `GET /api/b13/changes`. The docs say the HTTP endpoints "have not been optimized for performance to the same extent as the WebSocket API", which is fine for two polls a second on localhost.

## Apify

- **For:** the copy watch (B15 Scout). The Scout runs Apify's Cheerio Scraper (`apify/cheerio-scraper`) over Cindia's own sandbox market at `<PUBLIC_SITE_URL>/market/`: static pages of fictional listings, some of them look-alikes of the co-op's pieces. It never searches the real web. This is the Apify track.
- **Account:** console.apify.com. Sign up at https://console.apify.com/sign-up?couponId=APIFY_CAL_HACKS, or enter `APIFY_CAL_HACKS` under Billing > Subscription, for $200 of credit (Cal Hacks pre-event email 2). The free plan alone gives $5 a month. The API token is on Settings > API & Integrations. A scoped token can be limited to running Actors. Set a monthly usage limit on the account, so a leaked token can't spend the credit.
- **Variables:** `APIFY_TOKEN`, or `APIFY_AUTH=proxy` with a network secret, and `PUBLIC_SITE_URL`. Without `PUBLIC_SITE_URL` the watch plays on its fixture.
- **Auth:** `Authorization: Bearer <token>`. Never `?token=` in the URL, although the Actor's API page shows that form.
- **Network secret:** yes. The default Bearer type, allowed website `api.apify.com`.
- **Hosts:** `api.apify.com`. `console.apify.com` is browser only. The crawl itself runs on Apify's side, so the cloud VM needs no route to the public site.
- **Limits:**
  - The sync call waits at most 300 seconds, then answers 408. B15's own budget is 45 seconds.
  - Rate limits: 250,000 requests a minute per user overall, 60 a second per resource, 400 a second for run endpoints. A 429 means back off and retry.
  - The free plan allows 25 concurrent runs and 16 GB of memory across running jobs.
  - Price: a compute unit is 1 GB of memory for an hour, and Apify's help article gives an average of about 3,000 Cheerio pages per compute unit, so a 30-page crawl of the sandbox market costs a small fraction of a cent (our arithmetic, in `docs/tech/apify/cheerio-scraper.md`).
- **Docs:** `docs/tech/apify/` (auth and limits, run-sync-get-dataset-items, the Cheerio Scraper's input, output and price).
- **Gotchas:**
  - The path is `POST https://api.apify.com/v2/actors/apify~cheerio-scraper/run-sync-get-dataset-items`. A tilde replaces the slash in the Actor name. `/v2/acts/` is the deprecated alias. The POST body is the Actor's input.
  - Success is status 201, with a JSON array of dataset items, one per object the `pageFunction` returns.
  - Add `clean=true`, or every item also carries `#error` and `#debug` fields, and `timeout=<seconds>` to bound the run. The docs don't say whether a run that hits the timeout still returns what it saved, so treat that as an error with maybe a short list.
  - `startUrls` is the market's index. `linkSelector` and `globs` keep the crawl inside `/market/`.
  - The public site's `robots.txt` disallows every crawler, so search engines stay off it. `respectRobotsTxtFile` stays at its default `false`, because the Scout crawls only our own site.

## Hugging Face Hub

- **For:** downloading the base model `intfloat/multilingual-e5-small` for B11 training, and the hand-off of the trained model: `publish.py` publishes it to a private repo, and `fetch_model.py` pulls it onto the cloud VM and the demo laptop.
- **Account:** huggingface.co, free. A fine-grained token from Settings > Access Tokens with write access to the one model repo.
- **The repo:** private, named `cindia-embed`, under Gordon's account. Its ID goes in `CINDIA_HF_REPO` (`<account>/cindia-embed`). It stays private until Gordon says public.
- **The flow:**
  1. `train.py` trains on the cloud VM (or on the lab GPU machine with `scripts/train-akbari.sh`) and writes the model, `report.json` and `vectors.json` with one fingerprint.
  2. With `HF_TOKEN` and `CINDIA_HF_REPO` set, `publish.py` creates the repo with `private=True` if it's missing and uploads only the model files, the model card and `report.json` (`allow_patterns`), with the weights' sha256.
  3. `python server/b11_embed/fetch_model.py` downloads the newest revision into `CINDIA_MODEL_DIR` and checks its sha256. A model, `vectors.json` and an Elastic index that don't share one fingerprint are refused.
  4. The demo laptop runs the fetch inside D-deploy's setup script.
- **Variables:** `HF_TOKEN` and `CINDIA_HF_REPO`. Public downloads of the base model work without a token. uvicorn runs with `HF_HUB_OFFLINE=1`, so the server never calls the hub at run time.
- **Auth:** `Authorization: Bearer hf_...`. `huggingface_hub` sends `HF_TOKEN` on every hub call once it's set.
- **Network secret:** probably, since it's a Bearer header, but untested. `huggingface_hub` may look for a local token before a write. The plain variable is the safer route.
- **Hosts:** `huggingface.co`, `*.huggingface.co`, `*.hf.co`. Model downloads may redirect to file storage hosts, which those wildcards are meant to cover.
- **Limits:** none that matter at this size.
- **Docs:** `docs/tech/huggingface-hub/` and `docs/tech/sentence-transformers/`. The base model's notes are in `docs/tech/sentence-transformers/multilingual-e5-small.md`.
- **Gotchas:**
  - Current releases: sentence-transformers 6.2.0 (it needs transformers 5.x and huggingface-hub 1.x or later), huggingface_hub 2.3.0, torch 2.14.1.
  - v6 moved the import paths, for example `sentence_transformers.sentence_transformer.losses`. The old ones still work with a deprecation warning.
  - `push_to_hub(tags=...)` was removed in 5.4. Append to `model.model_card_data.tags` instead. Training runs with `push_to_hub=False`, so only `publish.py` publishes.
  - The docs' training example sets `fp16=True`. On the CPU-only VM, set `fp16=False` and `bf16=False`.
  - Train MultipleNegativesRankingLoss with `batch_sampler=BatchSamplers.NO_DUPLICATES`.
  - Every E5 input needs its `query: ` or `passage: ` prefix. Add it in the text, never also through the trainer's `prompts`.
  - E5 cosine scores sit between 0.7 and 1.0 by design, which is why B12 and B15 normalize their scores.
  - The download may go through `hf_xet`, a Rust client that may not trust the proxy's certificate bundle. On a certificate error, rerun with `HF_HUB_DISABLE_XET=1`.

## Cloudflare Pages (the public site)

- **For:** the public site: the scripted build only, with the fictional notice on every page, nothing for sale, `noindex` and a `robots.txt` that disallows everything, plus the sandbox market at `/market/`. B15 crawls that market, and the MLH domain points at the site.
- **Account:** Gordon's own Cloudflare account, free. The cloud session never deploys and never signs in.
- **How:** `npm run build:public` (D-deploy) builds `dist/` with `VITE_PUBLIC_SITE=1`, then Gordon uploads `dist/` with Direct Upload (drag and drop in the dashboard, about 5 minutes) tonight and again from the final build after the freeze. `public/_redirects` serves the site's deep links. Once the site is up, `PUBLIC_SITE_URL` goes into the cloud environment and the laptop's `.env`.
- **Hosts:** the project's `*.pages.dev` address, and the MLH domain once it points there.
- **Docs:** `docs/tech/cloudflare-pages/` (`direct-upload.mdx`, `redirects.mdx`), and `docs/plans/D-deploy.md` for the steps.
- **Gotchas:** a Direct Upload project can't switch to Git integration later. Cloudflare applies `_redirects` rules before it looks for a file, so the rules never match `/assets/`, `/images/`, `/market/` or `/robots.txt`.

## Build-time downloads

Hosts the build needs that aren't a service account:

| Host | For | Notes |
|---|---|---|
| `download.pytorch.org` | CPU torch wheels (`--extra-index-url`, contracts section 11) | Not on the Trusted list. Without it, pip quietly installs PyPI's CUDA torch, several GB, so check that `torch.__version__` ends in `+cpu` |
| `cdn.sheetjs.com` | `npm ci` (the SheetJS tarball, v1) | Not on the Trusted list |
| `cdn.playwright.dev`, `playwright.download.prss.microsoft.com` | `npx playwright install chromium` | Not on the Trusted list |
| `install.spacetimedb.com`, `github.com` releases, `api.github.com`, `spacetimedb-client-binaries.s3.amazonaws.com` | The SpacetimeDB installer | See the SpacetimeDB gotchas |
| `static.rust-lang.org`, `index.crates.io`, `static.crates.io` | Only if B13 falls back to a Rust module | On the Trusted list. rustc and cargo come with the image |
| `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org` | npm and pip | Reachable at every level, never get secrets |

## Accounts Gordon handles himself

- **The cloud environment** (claude.ai/code, the environment's settings):
  - Network access: Full, or Custom with every host in contracts section 1 and "Also include default list" ticked.
  - Environment variables: `CINDIA_ANTHROPIC_API_KEY`, `NESSIE_KEY`, `ELASTIC_URL`, `KIBANA_URL`, then either `ELASTIC_API_KEY` or `ELASTIC_AUTH=proxy`, either `APIFY_TOKEN` or `APIFY_AUTH=proxy`, `HF_TOKEN` and `CINDIA_HF_REPO`, and `PUBLIC_SITE_URL` once the public site is up. Leave `ANTHROPIC_API_KEY` unset there.
  - Network secrets, if used: Elastic (header `Authorization`, prefix `ApiKey`, `*.elastic.cloud`) and Apify (Bearer, `api.apify.com`).
  - A running session reads new variables only after its VM restarts, so start a new session after changing them.
- **Elastic Cloud:** the trial sign-up, the Elasticsearch project, the API key (privileges above), and the two endpoint URLs.
- **Apify:** the account with the `APIFY_CAL_HACKS` credit, a monthly usage limit, and the API token.
- **Hugging Face:** an account, the private repo `cindia-embed`, and a fine-grained write token for it.
- **Cloudflare Pages:** the account and the uploads of `dist/` (D-deploy).
- **The demo laptop:** run `node scripts/laptop-setup.mjs` Saturday night on a good network, then its rehearsal checklist, both in `docs/plans/D-deploy.md`. The laptop's `.env` holds the real keys, since proxy mode exists only in the cloud.
- **Nessie and the Claude Console:** done in v1. Make a fresh Claude key for the cloud variable if the old one lives only in `.env`.
- **Devpost** (https://cal-hacks-13-0.devpost.com): be checked in at the venue by Sunday 8:00 AM and submit by 9:00 AM. The submission needs a project image, the GitHub repo and the video. Pick every track whose hard requirement the final what's-real list shows as met. Best Solo Hack is automatic. A draft by Saturday night is safest (Hacker Guide).
- **Figma Education:** Figma's rules say "Make sure you are Edu verified". The Education plan gives students Figma Design, Make, Slides and Figma Agent for free. The Figma files must be shared with "Anyone", and the submission needs a demo video of at most 3 minutes, a stage log (at most 200 words per stage) and a Figma Slides deck with the files embedded and a link to the code.
- **The MLH GoDaddy Registry domain:** register it through MLH's GoDaddy Registry offer (`mlh.link/GoDaddyRegistry`, and MLH's prizes page has a "Claim promo code" button). Point it at the public site, then enter "[MLH] Best Domain Name from GoDaddy Registry" on Devpost. The free extensions weren't visible to this check.
- **YouTube:** upload the recorded video (Unlisted works) and paste the link into Devpost. Hyphenate wants it to open with "the moment" (the catch), and Figma caps it at 3 minutes.
- **The tags:** at the freeze, create the tags from the Tags table in `status.md` on Windows and push them.

## Checked against the contracts

`docs/v2/contracts.md` sections 1 and 5 match these docs. Nessie's `?key=` and the Anthropic key can't be network secrets, so both stay plain variables. The `query: ` and `passage: ` prefixes and the 384 dimensions match the E5 docs. TypeScript modules work in the CLI that installs today (2.13.0), and snake_case table and reducer names match 2.x canonical names. Apify's Bearer header matches `config.apify_headers()`, and the Elastic secret's `ApiKey` prefix matches `config.elastic_headers()` in proxy mode.
