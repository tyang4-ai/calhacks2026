# Elastic · Best use of the Elastic Agent Builder on a Serverless instance

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md). Every maker, community and story named here is fictional.

**Met or not:** met if `GET /api/b12/status` reads `agentBuilder: true`. B12 is green (G5 7 of 7 on the tour, `demo-ok-b12`), and the Agent Builder agent answered in 7.1 s in B12's live run. But in B14's G5 the Finder's Agent Builder step timed out at 9.4 s, and the last committed live eval file ([`server/b12_search/eval.json`](../../server/b12_search/eval.json)) reads `agentBuilder: false`. The code sets that flag when the agent's test conversation fails, and the plan notes that the trial limits LLM tokens. Check the status and take the Kibana screenshot before you select this track.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com): first place Meta Quest 3S headsets, second place Bose QuietComfort headphones. The hacker guide's criteria row still said "Coming soon!" on Oct 24, so the prize name is the rule: build with Elastic Agent Builder on a Serverless project. The notes are copied in [`docs/reference/sponsors/ch13-sponsor-elastic.md`](../../docs/reference/sponsors/ch13-sponsor-elastic.md). Show three things: the agent, the index, and our own vectors in it.

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers. Buyers find pieces by describing a feeling, such as "a warm, bold gift for my mom. she loves red wool. under $200". Elastic is the search index behind that. The demo's catalog is 54 fictional pieces from four fictional Native American communities, led by the Diné Weaving and Silver Co-op, a co-op of Diné (Navajo) makers.

- **The index.** One document per piece in `cindia-pieces` (an alias over `cindia-pieces-v1`): the maker's facts, the community's context, the vibe words the maker approved, and our own 384-number vector in a `dense_vector` field (cosine, `int8_hnsw`). The vector comes from Cindia's own embedding model ([`B11-embed`](../../docs/plans/B11-embed.md), built, trained and published).
- **Hybrid search.** One request fuses a kNN retriever on our vectors with a keyword retriever over the facets, with reciprocal rank fusion, and applies the price and community filters. The whole Elastic path has a 2.5-second budget, and the screen says which engine answered. Measured live: the seed took about 30 s and the tour's query 0.61 s.
- **How good it is.** On the 50 held-out test queries, written separately by our data agent, the live Elastic hybrid scored recall at 5 of 0.819 and MRR at 10 of 0.887 (`eval.json`). The local hybrid scored 0.825 and 0.940. A small test, not a benchmark.
- **The agent.** The server creates the Agent Builder agent `cindia-finder` with a search tool over `cindia-pieces` (tool ID `cindia.search_pieces`). Find questions go to it. The swarm's code routes them there, never by a model's choice, and keeps only the piece IDs it returns. The swarm view labels that step "Elastic Agent Builder". It answered in 7.1 s in B12's live run. In B14's G5 that step timed out at 9.4 s, and the find answer came from B12 search at about 17 s.
- **Drafts stay out of search.** The Indexer embeds a new listing into `cindia-drafts` the moment it is drafted. The listing moves into `cindia-pieces` only when the manager approves. Until then no search and no Agent Builder answer returns it.
- **Without Elastic,** the same fusion runs locally over the stored vectors, and the screen says so.
- **The provenance note.** Each index entry records who writes each layer in a real launch: the maker, the community, or an agent the maker approves. In this demo the Cindia team wrote all of it, and the Describer agent never ran, because nothing uploads a photo.

[GORDON: a Kibana screenshot of the agent and its tool, saved as sponsors/elastic/agent-builder.png]

## Where to look

- [`server/b12_search/`](../../server/b12_search/): `elastic.py` (the indexes, the seed and the hybrid query), `agent.py` (`cindia-finder` and its search tool), `engine.py` and `local.py` (which engine answers, and the local fusion), `surprise.py` (Surprise me) and `eval.json`. Router: [`server/routers/b12_search.py`](../../server/routers/b12_search.py). Plan: [`docs/plans/B12-search.md`](../../docs/plans/B12-search.md).
- [`server/b14_swarm/agents/finder.py`](../../server/b14_swarm/agents/finder.py): the Finder routes find questions to Agent Builder in code (`elastic_agent`). Plan: [`docs/plans/B14-swarm.md`](../../docs/plans/B14-swarm.md).
- [`server/b11_embed/`](../../server/b11_embed/): trains the model and writes the vectors that go into the index. Plan: [`docs/plans/B11-embed.md`](../../docs/plans/B11-embed.md).
- [`src/sources/live/b12-search.ts`](../../src/sources/live/b12-search.ts): the adapter. Screens: [`src/features/search/`](../../src/features/search/), [`docs/plans/F-search.md`](../../docs/plans/F-search.md).
- Tests: [`tests/server/test_b12_search.py`](../../tests/server/test_b12_search.py) (fake Elastic, plus one live test) and [`tests/features/search-live.spec.ts`](../../tests/features/search-live.spec.ts).

## How to run that part

1. Set `ELASTIC_URL`, `KIBANA_URL` and `ELASTIC_API_KEY` in the cloud environment or in `.env` (names only here, and a value is never printed). In the cloud, `ELASTIC_AUTH=proxy` lets a network secret carry the key instead.
2. Train or fetch the model, so there are vectors (`python server/b11_embed/train.py` or `python server/b11_embed/fetch_model.py`).
3. `npm run server`. In live mode the search adapter starts the seed in the background (up to 60 seconds). It creates the two indexes, writes one document per piece, then creates the agent and runs one test conversation.
4. `GET /api/b12/status` says whether Elastic is reachable, how many pieces are indexed and whether the agent works (`agentBuilder`).
5. Search with Live on and read the engine label on the results.

## The moment in the tour

Beat IDs and times are from [`docs/common/demo-script.md`](../../docs/common/demo-script.md). The tour is always scripted, so the live Elastic answer shows when someone searches for themselves after it.
- `d01-vibe`, 60 to 74 s: the buyer types the feeling and gets six pieces. The results show which engine answered, and the process bar's search view maps the pieces and the query.
- The "Elastic Agent Builder" step shows in the swarm view when a find question runs. That is a question Gordon types in Q&A with Live on.

## What's live and what's simulated

- **Live, gated on the tour:** B12, the index, hybrid search and Surprise me (G5 7 of 7, `demo-ok-b12`). Its first G5 run failed only its live tour, at a machine load of 7.7, and passed on the rerun.
- **Live, built and published:** the model whose vectors fill the index (B11, no G5 on the tour).
- **Caveat:** the Agent Builder agent. Live once at 7.1 s, timed out at 9.4 s in B14's G5, and the last eval file reads `agentBuilder: false`. See the top of this page.
- **Not built:** B12's T7, the Finder writing the search box's keywords in live mode. The chips come from a rule-based extractor.
- **Simulated today:** the tour's search answer is scripted from the mock data, and it says so.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
