---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "Elastic"
captured: 2026-10-24
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-24
date-modified: 2026-10-24
---

# Elastic · Best use of the Elastic Agent Builder on a Serverless instance

Everything I found for Elastic's Cal Hacks 13.0 track, copied Oct 24, 2026 from Devpost, the Hacker Guide, the pre-event email and Elastic's write-up of last year's track. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **Prizes (Devpost):** 1st, Meta Quest 3S headsets ($1,200 in cash value). 2nd, Bose QuietComfort headphones ($1,436 in cash value).
- **Criteria:** the Hacker Guide still says "Coming soon!" (Oct 24, about 2 PM). The prize name is the rule: build with Elastic Agent Builder on a Serverless project.
- **Workshop:** "Build an Agent That Does the Research: Context Engineering with Elasticsearch", Fri 8:00 to 9:00 PM at Gate 3 (Hive). Missed by arriving Saturday.
- **Account:** a free 14-day Elastic Cloud trial at https://cloud.elastic.co/registration. Pick the Elasticsearch project type.

## Devpost prizes (verbatim)

- **[Elastic] 1st Place Best use of the Elastic Agent Builder on a Serverless instance** · $1,200 in cash: 1st Place Meta Quest 3S headsets
- **[Elastic] 2nd Place Best use of the Elastic Agent Builder on a Serverless instance** · $1,436 in cash: 2nd Place Bose QuietComfort headphones

## Hacker Guide row (verbatim, unchanged on Oct 24)

> #### Elastic
>
> **Criteria:** Coming soon!
>
> **Prize:** 1st Place: Meta Quest 3S headsets; 2nd Place: Bose QuietComfort headphones

## From Pre-Event Details #2 (Oct 15, verbatim)

> *Elastic –* Elastic, the Search AI Company, enables everyone to find the answers they need in real time, using all their data, at scale. Elastic’s solutions for search, observability, and security are built on the Elastic Search AI Platform — the development platform used by thousands of companies, including more than 50% of the Fortune 500.

## What Elastic liked at Cal Hacks 12.0

From "Top Elastic Agent Builder projects and learnings from Cal Hacks 12.0" by JD Armada, Elasticsearch Labs, Nov 25, 2025 (https://www.elastic.co/search-labs/blog/agent-builder-projects-learnings-cal-hacks-12-0). Read through a fetch tool, so this is a summary:

- 29 submissions in 36 hours.
- First place, AgentOverflow, "Stack Overflow rebuilt for the LLM and agent era": structured solutions indexed in Elasticsearch and found with hybrid search. It stood out for turning Elasticsearch into a structured memory layer for LLMs.
- Runner-up, MarketMind: six Agent Builder agents, each scoring one layer of a market, with complex ES|QL.
- Lessons: most teams were new to Elastic and still built working agents. LLMs mixed up ES|QL and SQL until they got the docs as markdown. Some ES|QL behaves differently on Serverless.

## What Cindia v2 does for this track

The brief's line: "Our own embeddings in Elastic with hybrid search, and an Agent Builder agent."

- **The index:** one document per piece (`cindia-pieces-v1` behind the alias `cindia-pieces`): the maker's facts, the community's context, the vibe words the maker approved, and our own 384-number vector in a `dense_vector` field (cosine, int8 HNSW).
- **Hybrid search:** vibe search sends one retrievers request. An `rrf` retriever fuses a `knn` retriever on our vectors with a `standard` keyword query over the facets, with the price and community filters. The screen says which engine answered.
- **Our own model:** the vectors come from Cindia's fine-tuned multilingual model (B11), so English and Chinese queries share one space.
- **Agent Builder:** the server creates the agent `cindia-finder` through the Kibana API, with a search tool over `cindia-pieces`. The swarm's Finder asks it structured questions, such as "wool pieces under $100 from Peru".
- **Fallback:** without Elastic, the same fusion runs locally, and the screen says so.
- **In the repo:** upgrade B12 (`docs/plans/B12-search.md`), with B11 for the model.

## Docs and APIs we use

Offline copies: the repo's `docs/tech/elasticsearch/` and `docs/tech/elastic-agent-builder/`. Keys, hosts and gotchas: `docs/v2/apis-and-accounts.md`.

- dense_vector mapping: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector
- kNN search: https://www.elastic.co/docs/solutions/search/vector/knn
- RRF retriever: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rrf-retriever
- Serverless API keys: https://www.elastic.co/docs/deploy-manage/api-keys/serverless-project-api-keys
- Agent Builder Kibana APIs: https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api
- Kibana API reference for Agent Builder: https://www.elastic.co/docs/api/doc/kibana/group/endpoint-agent-builder

## Things to know

- A float vector with 384 dimensions defaults to `bbq_hnsw`, so the mapping has to ask for `int8_hnsw`.
- The trial lasts 14 days and limits LLM token use, which Agent Builder chats spend.
- An Elasticsearch project includes 1,000 free Agent Builder executions a month.
- The key goes in the header as `Authorization: ApiKey <key>`, and Kibana writes also need `kbn-xsrf: true`.
