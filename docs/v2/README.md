# v2 · plans and order

Read with `docs/v2/brief.md` (what and why), `docs/v2/contracts.md` (names) and `docs/harness/v2-runbook.md` (how the orchestrator runs it). Every v2 plan file lives in `docs/plans/` next to the v1 ones and follows the template in `docs/plans/README.md`.

## Decisions behind v2 (Gordon, Oct 24 afternoon)

- **Framing:** Indigenous and heritage makers worldwide. The Gu studio stays the deep dive and the named community. Gu embroidery is never called Indigenous.
- **Projects** means both community projects anyone can fund and works in progress (commissions paid in stages).
- **Databases:**
  - Elastic Serverless holds the index, with our own embeddings and hybrid search, plus an Agent Builder agent.
  - SpacetimeDB holds the live shared state for the swarm and the process blocks.
- **Extra tracks:** Apify (counterfeit watch) and the MLH GoDaddy domain. Gordon registers the domain himself.
- **Desktop only.** Judges see the desktop site and a recorded video, which Gordon makes himself.
- **The agent swarm** is many narrow agents, one job each, with an orchestrator that only routes.
- **Cindia core is the index and the management.** Each seller gets a storefront at their own link with a block page builder. The builder is post-MVP, so v2 ships a working mock labeled as a preview.
- **Scale and depth win over time worries.** Nothing is dropped for time. Everything lands only through its gate, so `main` is always demoable.
- **The build runs in a Claude Code cloud session** on the repo, so it keeps going while Gordon is away.

## The plans

| Plan ID | Agent | Wave | Depends on | Priority |
|---|---|---|---|---|
| I2-core | integrator | V1 | none | P0 |
| I2-kit | integrator | V1 | I2-core | P0 |
| I2-shell | integrator | V1 | I2-core, I2-kit T1 | P0 |
| S3-catalog | data-smith | V1 | I2-core | P0 |
| I2-art | integrator | V1 | S3-catalog | P1 |
| F-search | feature-lead | V2 | G1b, G2b | P0 |
| M-buyer | feature-lead | V2 | G1b, G2b | P0 |
| F-support | feature-lead | V2 | G1b, G2b | P0 |
| F-process | feature-lead | V2 | G1b, G2b | P0 |
| F-communities | feature-lead | V2 | G1b, G2b | P0 |
| M-approvals | feature-lead | V2 | G1b | P0 |
| F-seller-hub | feature-lead | V2 | G1b, G2b | P1 |
| F-watch | feature-lead | V2 | G1b, G2b | P1 |
| F-storefront | feature-lead | V2 | G1b, G2b | P1 |
| M-maker-statement | feature-lead | V2 | G1b | P1 |
| M-desktop | feature-lead | V2 | G1b | P1 |
| B11-embed | backend-builder | V2 | I2-core (code), S3-catalog (training) | P0 |
| B13-live | backend-builder | V2 | I2-core | P1 |
| B12-search | backend-builder | V2 | B11-embed | P0 |
| B14-swarm | backend-builder | V2 | B13-live, B12-search | P0 |
| B15-watch | backend-builder | V2 | B11-embed | P1 |
| I2-tour | integrator and data-smith | V3 | the V2 features above | P0 |
| I3-redesign | integrator | V4 | a design drop on branch `design` | P1 |
| D-sponsors | scribe | any, 8:00 PM and the freeze | status.md | P1 |

Feature order in the queue: `F-search`, `M-buyer`, `F-support`, `F-process`, `F-communities`, `M-approvals`, `F-seller-hub`, `F-watch`, `F-storefront`, `M-maker-statement`, `M-desktop`.

## New feature folders

`src/features/search/`, `src/features/support/`, `src/features/process/`, `src/features/communities/`, `src/features/seller-hub/`, `src/features/storefront/`, `src/features/watch/`. Migrations keep their folders: `buyer`, `approvals`, `maker-statement`, and for `M-desktop`: `money-map`, `reconcile`, `scenario`, `close`, `impact`, `proof`, `dashboard`, `ask-cindy`, `audit`.

## How each agent's job stays small

The product's agent swarm and the build's agents follow the same rule, one narrow job each:
- A builder task owns a few files and ends in something checkable.
- A product agent owns one decision and returns a typed result.
- The orchestrators (the build's and Cindy) only route and merge.
