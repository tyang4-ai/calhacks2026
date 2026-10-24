# docs/tech · offline docs for the v2 backend

Clean markdown copies of the official doc pages the v2 backend builders need. Builders have no web access, so read these instead of writing an API from memory. Every page starts with its source URL, the date it was fetched (Oct 24, 2026) and a short note on what was kept.

How the pages were made:

- Most come straight from each project's own doc sources on GitHub, converted to plain markdown: elastic/docs-content, elastic/elasticsearch, elastic/elasticsearch-py, elastic/kibana (the OpenAPI spec), clockworklabs/SpacetimeDB, apify/apify-docs, UKPLab/sentence-transformers, huggingface/huggingface_hub and figma/mcp-server-guide.
- Pages are pinned to the release a builder will install: sentence-transformers v6.2.0, huggingface_hub v2.3.0, elasticsearch-py v9.5.1, SpacetimeDB v2.13.0. Elastic Serverless and Apify have no versions, so those pages are from the main branch on Oct 24.
- Three pages could only be read through a fetch tool that summarizes: the Apify Store page of the Google search scraper, the E5 model card, and Figma's MCP tools page. Those pages say so, mark what is quoted, and label everything else as a summary.
- SpacetimeDB pages keep only the TypeScript tabs. Agent Builder pages keep only the Dev Tools Console form of each example, and each page says how to turn it into an HTTP call.

The accounts, keys, hosts and gotchas for every service are in `docs/v2/apis-and-accounts.md`.

## Versions at fetch time

| Package | Version | Where |
|---|---|---|
| `elasticsearch` (Python) | 9.5.1 | PyPI |
| `elastic-transport` | 9.4.2 | PyPI |
| `sentence-transformers` | 6.2.0 (Oct 21, 2026) | PyPI |
| `transformers` | 5.20.2 | PyPI |
| `torch` | 2.14.1 | PyPI |
| `huggingface-hub` | 2.3.0 (Oct 23, 2026) | PyPI |
| `datasets`, `accelerate` | 5.1.0, 1.15.0 | PyPI |
| `apify-client` (Python) | 3.3.0 | PyPI |
| SpacetimeDB CLI and server | 2.13.0 (Oct 19, 2026) | GitHub release |
| `spacetimedb` (npm, module library and TypeScript SDK) | 2.13.0 | npm. `@clockworklabs/spacetimedb-sdk` is deprecated |
| SpacetimeDB for Python | none official | `spacetimedb-sdk` on PyPI is a 2023 project at 0.7.0, so use the HTTP API |

## elasticsearch/

| Page | What it answers |
|---|---|
| `dense-vector-mapping.md` | How to map `dense_vector` (dims, `similarity: cosine`, `index_options` with `int8_hnsw`), the default quantization per dimension count, the parameters, and that vectors are left out of `_source` in search responses by default |
| `knn-search.md` | kNN search: approximate kNN with the `knn` option, `k` and `num_candidates`, mapping defaults, indexing considerations, and filtered kNN (pre-filter and post-filter) |
| `retrievers-rrf-hybrid.md` | The retrievers API: general rules (size, from, aggregations, restrictions), the multi-field format, and the `rrf`, `knn` and `standard` retrievers with their parameters and a hybrid example |
| `reciprocal-rank-fusion.md` | The RRF formula, `rank_constant` and `rank_window_size`, supported features, a full worked example, explain and pagination |
| `python-client-connecting.md` | Installing and connecting the Python client with an endpoint URL and an API key, TLS and CA settings, timeouts, retries, node classes |
| `python-client-bulk-helpers.md` | `helpers.bulk`, `streaming_bulk` and `parallel_bulk`: action format, chunking, errors, the full signatures |
| `serverless-project-connection-and-api-keys.md` | Creating a Serverless project, the 14-day trial limits, finding the Elasticsearch endpoint, creating and scoping project API keys, testing the connection |
| `serverless-differences-and-billing.md` | What Serverless doesn't allow (`_cluster/*`, shard settings, some APIs and settings with the errors they return), project limits, how VCUs and Agent Builder executions are billed |

## elastic-agent-builder/

| Page | What it answers |
|---|---|
| `overview-and-get-started.md` | What Agent Builder is (agents, tools, skills, chat), how to reach it on Serverless, the default Elastic Managed LLM, picking a model per request, and the limitations and known issues |
| `kibana-api.md` | Every Agent Builder Kibana API with an example: tools (create, list, get, update, delete, execute), skills, agents, token consumption, converse and conversations, spaces |
| `api-agents.md` | Exact request and response schemas for `/api/agent_builder/agents` (create, get, update, delete, list, access control, consumption), from the OpenAPI spec |
| `api-tools.md` | Exact schemas for `/api/agent_builder/tools`, including the `index_search` and `esql` tool types and `_execute` |
| `api-converse.md` | Exact schemas for `POST /api/agent_builder/converse` and `/converse/async`: every body field and an example response with `steps` and `response.message` |
| `api-tutorial.md` | A step-by-step walk through the APIs: sample index, bulk insert, ES|QL tools, a custom agent, conversations, confirmation prompts |
| `tools-index-search-and-custom.md` | How tools work, built-in versus custom tools, protected tool ID prefixes, and index search tools (`pattern`, `row_limit`, `custom_instructions`, one index per query) |
| `api-keys.md` | API keys for the Agent Builder APIs: read-only, management and development keys with their role descriptors, and troubleshooting a 403 |

## spacetimedb/

| Page | What it answers |
|---|---|
| `install-and-run-locally.md` | Installing the CLI (`curl -sSf https://install.spacetimedb.com \| sh -s -- --yes`), `spacetime login`, `spacetime start` on port 3000, the standalone config, self-hosting notes, troubleshooting |
| `typescript-quickstart.md` | A TypeScript module from `spacetime dev --template basic-ts`, then calling reducers and SQL from the CLI, and a Node.js client |
| `tables.md` | Declaring tables in a TypeScript module (`table`, `schema`, `t.*` column types, public tables), auto-increment and constraints |
| `indexes-and-access.md` | Indexes (btree, unique, multi-column, range queries) and table access permissions |
| `reducers.md` | Defining reducers in TypeScript, transactions, the reducer context (`ctx.db`, `ctx.sender`, `ctx.timestamp`), lifecycle reducers, errors |
| `subscriptions.md` | How subscriptions work, their semantics, and the ways to get rows from Python |
| `publish-local-and-maincloud.md` | Databases, `spacetime dev`, `spacetime publish` to the local server or Maincloud, and the Maincloud how-to |
| `http-api.md` | The HTTP API: bearer tokens and anonymous identities, `POST /v1/identity`, calling a reducer at `/v1/database/:name/call/:reducer`, `POST /v1/database/:name/sql`, the WebSocket subscribe route, and the SATS-JSON value format |
| `sql-reference.md` | The SQL the `/sql` endpoint and subscriptions accept |
| `cli-reference.md` | The CLI commands a builder needs: publish, delete, logs, call, describe, dev, sql, generate, list, login, init, build, server, subscribe, start, version |
| `cheat-sheet.md` | One page of TypeScript module and client syntax |
| `client-overview-and-connection.md` | Client SDK overview, `spacetime generate` bindings, and the connection lifecycle |
| `typescript-client-sdk-1-connect-and-subscribe.md` | The TypeScript SDK, part 1: setup, `DbConnection` builder, subscriptions and the query builder |
| `typescript-client-sdk-2-events-cache-reducers.md` | The TypeScript SDK, part 2: event contexts, the client cache and row callbacks, calling reducers, identities |
| `migrating-to-2.0.md` | What changed from 1.x (accessor versus canonical names, case conversion, SDK changes), for code written from memory |

## apify/

| Page | What it answers |
|---|---|
| `api-authentication-and-limits.md` | API v2 basics: the token as `Authorization: Bearer` (or `?token=`), the `/v2/actors/` prefix, the response and error shapes, rate limits with retry advice, scoped tokens, and the plan limits |
| `run-sync-get-dataset-items.md` | `POST /v2/actors/{actorId}/run-sync-get-dataset-items`: every query parameter, the 300-second limit and its 408, status codes, the tutorial's synchronous flow, and a Python example for the Google scraper |
| `google-search-scraper.md` | The `apify/google-search-scraper` Actor: input keys (`queries`, `maxPagesPerQuery`, `countryCode`, `languageCode`), output items and `organicResults` fields, price, and Apify's own LangChain call as verbatim code |

## sentence-transformers/

| Page | What it answers |
|---|---|
| `training-overview.md` | The v6 training stack: model, dataset formats, loss, `SentenceTransformerTrainingArguments`, evaluators, `SentenceTransformerTrainer`, callbacks, with a full training script |
| `multiple-negatives-ranking-loss.md` | `MultipleNegativesRankingLoss` (inputs, hard negatives, scale, references), `BatchSamplers.NO_DUPLICATES`, `CachedMultipleNegativesRankingLoss`, and the loss overview table |
| `evaluator-information-retrieval.md` | `InformationRetrievalEvaluator`: the signature, its arguments (queries, corpus, relevant docs, k values, prompts) and an example |
| `training-with-prompts-and-args.md` | Training with prompts, so `query: ` and `passage: ` get added per column, and the extra training arguments (`prompts`, `batch_sampler`, `router_mapping`) |
| `mine-hard-negatives.md` | `util.mine_hard_negatives`: signature, arguments and output formats |
| `push-to-hub-and-model-card.md` | `save_pretrained`, `push_to_hub` and `SentenceTransformerModelCardData`, and the v5.4 change that removed `push_to_hub(tags=...)` |
| `v6-migration-notes.md` | What changed in v5.4 and v6 (new import paths, requirements, changed outputs), for code written from memory |
| `multilingual-e5-small.md` | The base model: 12 layers, 384 dims, MIT, 94 languages including Chinese, the required `query: ` and `passage: ` prefixes, why its cosine scores sit between 0.7 and 1.0, the 512-token limit |

## huggingface-hub/

| Page | What it answers |
|---|---|
| `upload.md` | Uploading a file or a folder (`upload_file`, `upload_folder`, `create_commit`) to a model repo |
| `model-cards.md` | Creating, editing and pushing a model card with `ModelCard` and `ModelCardData` |
| `auth-repos-and-env.md` | Logging in and tokens (`HF_TOKEN`), creating a repo and its visibility, and the environment variables a training script needs |

## figma-mcp/

| Page | What it answers |
|---|---|
| `tools-and-setup.md` | Every Figma MCP server tool (read, write, Weave) with file types and where it runs, the skills and the prompt, the tool names in Gordon's connector, and the setup and best practices from figma/mcp-server-guide |
