# Elastic · Best use of the Elastic Agent Builder on a Serverless instance

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. **Everything for this track is planned at 8:00 PM.** Nothing in `server/b12_search/` exists yet, so this page links the plan and not the code.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com): first place Meta Quest 3S headsets, second place Bose QuietComfort headphones. The hacker guide's criteria row still said "Coming soon!" on Oct 24, so the prize name is the rule: build with Elastic Agent Builder on a Serverless project. The notes are copied in [`docs/reference/sponsors/ch13-sponsor-elastic.md`](../../docs/reference/sponsors/ch13-sponsor-elastic.md). Show three things: the agent, the index, and our own vectors in it.

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers. Buyers find pieces by describing a feeling, such as "a warm, bold gift for my mom. she loves red wool. under $200". Elastic is the search index behind that. The demo's catalog is 54 fictional pieces from four fictional Native American communities, led by the Diné Weaving and Silver Co-op, a co-op of Diné (Navajo) makers.

- **The index.** One document per piece in `cindia-pieces` (an alias over `cindia-pieces-v1`): the maker's facts, the community's context, the vibe words the maker approved, and our own 384-number vector in a `dense_vector` field (cosine, `int8_hnsw`). The vector comes from Cindia's own embedding model ([`B11-embed`](../../docs/plans/B11-embed.md)).
- **Hybrid search.** One request fuses a kNN retriever on our vectors with a keyword retriever over the facets, with reciprocal rank fusion, and applies the price and community filters. The whole Elastic path has a 2.5-second budget, and the screen says which engine answered.
- **The agent.** The server creates the Agent Builder agent `cindia-finder` with a search tool over `cindia-pieces` (tool ID `cindia.search_pieces`). Find questions go to it. The swarm's code routes them there, never by a model's choice, and keeps only the piece IDs it returns. The swarm view labels that step "Elastic Agent Builder".
- **Drafts stay out of search.** The Indexer embeds a new listing into `cindia-drafts` the moment it is drafted. The listing moves into `cindia-pieces` only when the manager approves it. Until then no search and no Agent Builder answer returns it.
- **Without Elastic,** the same fusion runs locally over the stored vectors, and the screen says so.
- **The provenance note.** Each index entry records who writes each layer in a real launch: the maker, the community, or an agent the maker approves. In this demo the Cindia team wrote all of it, and the Describer agent never ran, because nothing uploads a photo.

[GORDON: a Kibana screenshot of the agent and its tool, saved as sponsors/elastic/agent-builder.png]

## Where to look

All of these are **planned**.
- [`docs/plans/B12-search.md`](../../docs/plans/B12-search.md): `server/b12_search/` (`elastic.py` for the index and the hybrid query, `agent.py` for `cindia-finder`) and its tests.
- [`docs/plans/B14-swarm.md`](../../docs/plans/B14-swarm.md): `server/b14_swarm/`, where the Finder routes find questions to Agent Builder in code.
- [`docs/plans/B11-embed.md`](../../docs/plans/B11-embed.md): `server/b11_embed/`, which trains the model and writes the vectors that go into the index.
- [`docs/plans/F-search.md`](../../docs/plans/F-search.md): the screens.

## How to run that part

Planned. This is the design.
1. Set `ELASTIC_URL`, `KIBANA_URL` and `ELASTIC_API_KEY` in the cloud environment or in `.env` (names only here, and a value is never printed). In the cloud, `ELASTIC_AUTH=proxy` lets a network secret carry the key instead.
2. Train or fetch the model, so there are vectors (`python server/b11_embed/train.py` or `python server/b11_embed/fetch_model.py`).
3. `npm run server`. In live mode the search adapter starts the seed in the background (up to 60 seconds). It creates the two indexes, writes one document per piece, then creates the agent and runs one test conversation.
4. `GET /api/b12/status` says whether Elastic is reachable, how many pieces are indexed and whether the agent works.
5. Search with Live on and read the engine label on the results.

## The moment in the tour

Planned (`I2-tour`). Times are from [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2.
- `d01-vibe`, 60 to 74 s: the buyer types the feeling and gets six pieces. The results show which engine answered. The tour is always scripted, so the live Elastic answer shows when someone searches for themselves after it.
- The "Elastic Agent Builder" step shows in the swarm view when a find question runs. That is a scripted question Gordon can click in Q&A, or a live one.

## What's live and what's simulated

- `/api/health` read `elastic` as true at 7:30 PM, so the key and URL are set in the cloud environment. That is not a gate. Nothing for this track has passed one.
- **Planned:** the index, hybrid search, `cindia-finder`, and the model whose vectors fill the index.
- **Simulated today:** the tour's search answer is scripted from the mock data, and it says so.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
