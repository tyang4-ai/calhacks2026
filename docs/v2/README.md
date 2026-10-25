# v2 · plans and order

Read with `docs/v2/brief.md` (what and why), `docs/v2/contracts.md` (names) and `docs/harness/v2-runbook.md` (how the orchestrator runs it). The decisions behind this list are in `docs/v2/fix-plan.md` section 1. Every v2 plan file lives in `docs/plans/` next to the v1 ones and follows the template in `docs/plans/README.md`.

## Decisions behind v2 (Gordon, Oct 24 afternoon)

- **Framing:** Cindia is a platform for underrepresented makers, starting with Native American makers. Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have, so Cindia does the selling, the marketing and the books for them. It's called a platform, never an app.
- **The named community** is the fictional Diné Weaving and Silver Co-op on the Navajo Nation, Arizona: v1's studio, re-skinned in R0 with every v1 number kept. Three more fictional Native American communities sit beside it in the catalog: an Ojibwe beadwork co-op, an Acoma pottery studio and a Seminole patchwork co-op. Other communities are next, each only with that community's own organizations.
- **Mock data only.** Nothing real goes into the data, the databases or the embeddings, in any mode or on the public site.
- **The demo is 3 minutes:** three pitch cards, the buyer minute and the seller minute, always scripted, with a presenter mode that pauses at each beat. Live mode answers people's own requests after the tour.
- **The backend rests on three pillars:** a swarm of small Claude agents on Haiku and Sonnet only, our own embedding model that embeds every seller entry, and one database, SpacetimeDB, that holds everything, with Elastic as the search index built from it.
- **Projects** means both community projects anyone can fund and works in progress (commissions paid in stages).
- **Extra tracks:** Apify (the copy watch, crawling our own sandbox market) and the MLH GoDaddy domain, which points at the public site. Gordon registers the domain himself.
- **The public site** is the scripted build on Cloudflare Pages, uploaded by Gordon. It sells nothing and search engines are kept out.
- **Desktop only.** Judges see the desktop site and a recorded video, which Gordon makes himself.
- **The agent swarm** is many narrow agents, one job each, with an orchestrator that only routes.
- **Cindia core is the index and the management.** Each seller gets a storefront at their own link with a block page builder. The builder is post-MVP, so v2 ships a working mock labeled as a preview.
- **Scale and depth win over time worries.** Nothing is dropped for time. Everything lands only through its gate, so `main` is always demoable. What the build can't make true in time is listed in the brief's "Backend if time".
- **The build runs in a Claude Code cloud session** on the repo, so it keeps going while Gordon is away. The model trains on the cloud VM by default, and the hand-off to every machine is the private Hugging Face repo.

## The plans

| Plan ID | Agent | Wave | Depends on | Priority |
|---|---|---|---|---|
| R0-reskin | data-smith, integrator, feature-lead and backend-builder, one commit | V1, step 0 | V0 | P0 |
| I2-core | integrator | V1 | R0-reskin | P0 |
| I2-kit | integrator | V1 | I2-core | P0 |
| I2-shell | integrator | V1 | I2-core, I2-kit T1 | P0 |
| S3-catalog | data-smith | V1 | I2-core | P0 |
| I2-art | integrator | V1 | S3-catalog | P1 |
| F-search | feature-lead | V2 | G1b, G2b | P0 |
| M-buyer | feature-lead | V2 | G1b, G2b | P0 |
| F-support | feature-lead | V2 | G1b, G2b | P0 |
| F-process | feature-lead | V2 | G1b, G2b | P0 |
| F-communities | feature-lead | V2 | G1b, G2b | P0 |
| M-approvals | feature-lead | V2 | G1b, G2b, and B13's B08 owner-route task before its G3 | P0 |
| M-desktop | feature-lead | V2 | G1b, G2b, right after M-approvals | P0 |
| F-seller-hub | feature-lead | V2 | G1b, G2b | P0 |
| F-watch | feature-lead | V2 | G1b, G2b | P1 |
| F-storefront | feature-lead | V2 | G1b, G2b | P1 |
| M-maker-statement | feature-lead | V2 | G1b, G2b | P1 |
| B11-embed | backend-builder | V2 | I2-core (code), S3-catalog (training) | P0 |
| B13-live | backend-builder | V2 | I2-core, S3-catalog (the data it seeds) | P0 |
| B12-search | backend-builder | V2 | B11-embed T5 and T6. The G5s for B11 and B12 run back to back after B12's tasks | P0 |
| B16-bank-books | backend-builder | V2 | B04-bank live (v1 G5 green), B01-match, R0-reskin, `NESSIE_KEY` | P1 |
| B14-swarm | backend-builder | V2 | B13-live, B12-search | P0 |
| B15-watch | backend-builder | V2 | B11-embed. Live scans need the public site (D-deploy), and it plays on its fixture until then | P1 |
| D-deploy | integrator, then Gordon for the upload | V2 | G1b, G2b | P0 |
| I2-tour | integrator and data-smith | V3 | the V2 features above, M-desktop and M-maker-statement included, green or cut | P0 |
| I3-redesign | integrator | V4 | a drop under `design/` on `main` (or on branch `design`, copied over), only after G4v2 | P1 |
| D-sponsors | scribe | any, 8:00 PM and the freeze | status.md | P1 |

**Queue order:**
- V1: `R0-reskin` first, alone, then `I2-core` with its fallout step, then `I2-kit`, `I2-shell` and `S3-catalog`, then `I2-art`.
- V2 features, P0: `F-search`, `M-buyer`, `F-support`, `F-process`, `F-communities`, `M-approvals`, `M-desktop`, `F-seller-hub`. Then P1: `F-watch`, `F-storefront`, `M-maker-statement`. `M-desktop` runs right after `M-approvals` because `d06` to `d10` are the finance tracks' moment, and `F-seller-hub` is P0 because its `d15-listing` beat is in the tour's spine.
- V2 upgrades: `B11-embed` through T8, then `B12-search`, then G5 for `b11-embed` and `b12-search` back to back. `B13-live` starts beside them as early as the cap allows, because its B08 owner-route task gates M-approvals' G3. Then `B16-bank-books` once B04 is live, then `B14-swarm`, then `B15-watch`.
- `D-deploy` as soon as G1b and G2b are green, beside the features.
- V3 `I2-tour`, then V4 `I3-redesign` for each design drop.

## New feature folders

`src/features/search/`, `src/features/support/`, `src/features/process/`, `src/features/communities/`, `src/features/seller-hub/`, `src/features/storefront/`, `src/features/watch/`. Migrations keep their folders: `buyer`, `approvals`, `maker-statement`, and for `M-desktop`: `money-map`, `reconcile`, `scenario`, `close`, `impact`, `proof`, `dashboard`, `ask-cindy`, `audit`.

## How each agent's job stays small

The product's agent swarm and the build's agents follow the same rule, one narrow job each:
- A builder task owns a few files and ends in something checkable.
- A product agent owns one decision and returns a typed result.
- The orchestrators (the build's and Cindy) only route and merge.
