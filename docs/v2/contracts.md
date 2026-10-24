# Cindia v2 · contract changes

Every name v2 adds or changes. Until plan `I2-core` is green, this file is the source for v2 names. `I2-core` merges it into `docs/common/` (conventions, glossary, data-model, events, ui-contract, api-contract, design-system, demo-script, definition-of-done) in one commit together with the shared code that implements it. From then on `docs/common/` is the truth again, and this file is history. Background and reasons: `docs/v2/brief.md`.

Rule for v1: nothing in v1 changes unless this file says so. Every v1 demo-critical figure (`data-model.md`, items 1 to 10) stays exactly as it is.

## 1. Machines, environments, ports and keys

- **Build machine:** a Claude Code cloud session on the GitHub repo (Linux, Node 22, Python 3.13), with the cloud environment set to Full network access, or Custom with the hosts in the table below. The Windows desktop and laptop are demo machines and can also run any live step. npm scripts stay `cmd.exe`-safe, because the demo runs on Windows.
- **Ports:** 5173 (Vite dev), 4173 (preview), 8000 (FastAPI), and new: **3000, the local SpacetimeDB server** (`spacetime start`, started once by the orchestrator in the background). Nothing else listens.
- **Hosts the build needs** (for a Custom network allowlist): `*.elastic.cloud`, `api.apify.com`, `api.nessieisreal.com`, `prod-api.nessieisreal.com`, `qa-api.nessieisreal.com`, `huggingface.co`, `*.huggingface.co`, `*.hf.co`, `install.spacetimedb.com`, `*.spacetimedb.com`, `cdn.sheetjs.com`, `download.pytorch.org`, `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`. GitHub, npm, PyPI and the Anthropic API are reachable by default.

**Environment variables.** `server/config.py` reads the process environment first, then `.env`. It never prints or returns a value.

| Name | Where it's set | Used by |
|---|---|---|
| `CINDIA_ANTHROPIC_API_KEY` | Cloud environment variable. Not `ANTHROPIC_API_KEY`, which would change how the cloud session itself is billed | `server/` |
| `ANTHROPIC_API_KEY` | `.env` on the Windows machines only | `server/`, read only when `CINDIA_ANTHROPIC_API_KEY` is unset |
| `NESSIE_KEY` | Cloud environment variable or `.env` | `server/` B04 |
| `ELASTIC_URL`, `KIBANA_URL` | Cloud environment variable or `.env`. Not secret | `server/` B12 |
| `ELASTIC_API_KEY` | Cloud environment variable or `.env`. Or leave it unset and set `ELASTIC_AUTH=proxy` when a cloud network secret attaches it | `server/` B12 |
| `APIFY_TOKEN` | Same pattern, with `APIFY_AUTH=proxy` for a network secret | `server/` B15 |
| `HF_TOKEN` | Optional. Only for publishing the model card and weights | `server/` B11 training script |
| `SPACETIME_URL`, `SPACETIME_DB` | Optional. Defaults `http://127.0.0.1:3000` and `cindia` | `server/` B13 |
| `CINDIA_MODEL_DIR` | Optional. Default `models/cindia-embed-v1`, which `.gitignore` lists | `server/` B11, B12, B15 |

- The keys `GET /api/health` reports become `{ anthropic, nessie, elastic, apify, hf }`, each a boolean. A key counts as set when its variable is set or its `*_AUTH=proxy` flag is. A new `services` object reports `{ spacetime: boolean, model: boolean }` (reachable, trained model on disk).
- The command guard keeps blocking reads of `.env` and `printenv`-style commands. Never echo a variable that holds a key.

## 2. Data model additions (`data-model.md`)

Units, ID rules and the v1 entities stay. These are added.

### Communities

| ID | Kind | People and place | Craft | Lead | Makers | Pieces |
|---|---|---|---|---|---|---|
| `com_gu` | heritage | Gu embroidery studio, Shanghai, China (the studio `std_gu`) | Gu embroidery, 顾绣 | `own_01` | `mkr_01` to `mkr_03` | `pc_01` to `pc_12` |
| `com_dine` | indigenous | A Diné (Navajo) weaving cooperative, Navajo Nation, USA | Handwoven wool rugs and sash belts | `own_02` | `mkr_04`, `mkr_05` | `pc_13` to `pc_18` |
| `com_maori` | indigenous | A Māori raranga (flax weaving) collective, Aotearoa New Zealand | Harakeke weaving: kete, pōtae, wall pieces | `own_03` | `mkr_06`, `mkr_07` | `pc_19` to `pc_24` |
| `com_sami` | indigenous | A Sámi duodji workshop, Sápmi, northern Norway | Duodji: birch burl cups, tin-thread bracelets, woven bands | `own_04` | `mkr_08`, `mkr_09` | `pc_25` to `pc_30` |
| `com_inuit` | indigenous | An Inuit carving and print cooperative, Nunavut, Canada | Stone carving and stonecut prints | `own_05` | `mkr_10`, `mkr_11` | `pc_31` to `pc_36` |
| `com_quechua` | indigenous | A Quechua weaving center, Chinchero, Peru | Naturally dyed alpaca and sheep's wool textiles | `own_06` | `mkr_12`, `mkr_13` | `pc_37` to `pc_42` |
| `com_miao` | indigenous | A Miao embroidery cooperative, Guizhou, China | Miao embroidery and batik | `own_07` | `mkr_14`, `mkr_15` | `pc_43` to `pc_48` |
| `com_maasai` | indigenous | A Maasai women's beadwork group, Kajiado, Kenya | Beadwork | `own_08` | `mkr_16`, `mkr_17` | `pc_49` to `pc_54` |

Every community, person and story is fictional demo data. Craft descriptions follow public sources and stay general. No sacred or ceremonial object is in the catalog, and nothing copies a specific community's protected design. In particular: no Yei or sandpainting designs, no tā moko, no korowai, no gákti, no ivory, no ceremonial headdresses.

### New and changed entities

| Entity | ID | Fields |
|---|---|---|
| Community | `com_gu` and the seven above | `name: Text`, `kind: "heritage" \| "indigenous"`, `people: Text`, `place: Text`, `craft: Text`, `about: Text` (the community's own words, demo text, labeled), `protocols: Text[]` (what it doesn't sell or show), `verification: { method: "community_attestation" \| "registry_check" \| "ich_listing"; by: Text; note: Text }`, `languages: string[]` (BCP 47 tags, display only), `leadId`, `makerIds`, `studioId?` (`std_gu` for `com_gu` only), `storefrontId`, `projectIds`, `demo: true` |
| Person (changed) | `own_01` to `own_08`, `mkr_01` to `mkr_17`, `buy_01` to `buy_20` | v1 fields, plus `communityId?` (owners and makers), `nativeName?: string` (written by the community, never machine-made), `languages?: string[]`. `lang` stays `"zh" \| "en"` and sets the UI language of that person's page |
| Piece (changed) | `pc_01` to `pc_54` | v1 fields, plus `communityId`, `facets: { object: Text; materials: string[]; techniques: string[]; motifs: string[]; colors: string[]; sizeCm?: { w: number; h: number }; oneOfAKind: boolean; leadTimeDays: number }`, `vibe: { moods: string[]; occasions: string[]; recipients: string[] }`, `imageAlt: Text`. Facet and vibe words are lowercase English. `image` is `/images/<pieceId>.svg`, an original illustration, labeled as one |
| IndexEntry | one per piece, keyed by `pieceId` | `pieceId`, `communityId`, `makerId`, `storefrontSlug`, `provenance: Record<string, "maker" \| "community" \| "agent:tagger" \| "agent:describer">` (one entry per field group: `facts`, `culture`, `vibe`, `picture`), `approvedBy` (the maker), `pictureNote: Text` (what the Describer saw), `embedText: string` (the passage, built by the rule below), `salesThisMonth: number`, `status: "active" \| "draft"` |
| Project | `prj_01` to `prj_08`, one per community, in community order | `communityId`, `title: Text`, `summary: Text`, `goalCents`, `raisedCents`, `addOnCents: 500` (the checkout contribution), `updates: { date; text: Text }[]` |
| WorkInProgress | `wip_01` to `wip_03` | `communityId`, `makerId`, `buyerId`, `title: Text`, `priceCents`, `milestones: { milestoneId; label: Text; shareBps; status: "pending" \| "reached" \| "paid"; date? }[]`. Milestone IDs are `mls_01` onward. The `shareBps` of one commission add up to 10000 |
| Storefront | `sto_01` to `sto_08`, in community order | `communityId`, `slug` (`gu-studio`, `dine-weavers`, `maori-raranga`, `sami-duodji`, `inuit-coop`, `chinchero-weavers`, `miao-stitch`, `kajiado-beads`), `theme: { accent: string; layout: "story_first" \| "grid_first" }` (accent is a kit color token name, never a raw hex), `blocks: { blockId; kind: "hero" \| "story" \| "pieces" \| "process" \| "projects" \| "visit"; props: Record<string, string \| number \| string[]> }[]`, `status: "draft" \| "published"`. Block IDs are `blk_01` onward |
| ListingDraft | `lst_01` (the demo listing) | `makerId`, `notes: string` (the maker's own words, Chinese for `mkr_02`), `lang` |
| AgentSpec | the agent IDs in section 6 | `agentId`, `name: Text`, `job: Text`, `kind: "claude" \| "code"`, `model?: "claude-haiku-5-5" \| "claude-sonnet-5-5" \| "claude-opus-5-5"`, `tools: string[]`, `never: Text` |
| SearchQuery (eval) | `sq_001` to `sq_050` | `text`, `lang: "en" \| "zh"`, `grades: Record<pieceId, 1 \| 2>` (2 is a perfect match, 1 is a good one). Written by hand, never used for training |
| CounterfeitCandidate | `cft_01` to `cft_04` | `url` (only on `example.com` or `example.org` in scripted data), `title`, `snippet`, `pieceId` (the maker's piece it resembles), `similarity` (0 to 1), `claim: Text` |
| SwarmRun | `run_01` onward | `threadId`, `side`, `steps` (see `swarm.step`) |

Approval gains kinds: `"follow_up" | "maker_payouts" | "listing_publish" | "storefront_publish" | "report_listing" | "milestone_release" | "support_action"`. Demo approvals added: `apr_03` (report `cft_01`), `apr_04` (publish `lst_01`), `apr_05` (release `wip_01`'s second milestone). Party gains kind `"community_fund"`, with `id` the project ID.

### The embedded passage

`embedText` follows this rule exactly. Missing parts are left out, along with their label.

```text
passage: {facets.object.en} | craft: {community.craft.en}, {community.people.en} | materials: {materials, comma-separated} | techniques: {...} | motifs: {...} | colors: {...} | mood: {vibe.moods} | for: {vibe.occasions}, {vibe.recipients} | {first sentence of story.en}
```

A query is embedded as `query: ` followed by the person's words and the chips joined with commas. The `passage: ` and `query: ` prefixes are what the e5 model family expects.

### New demo-critical figures

G2b checks every one of these as well as the ten from v1.

11. **The vibe query** in `d01-vibe` is exactly `a soft, hopeful gift for my mom. she gardens and loves peonies. under $200`. Its keywords are exactly `soft`, `hopeful`, `garden`, `peony`, `gift for mom`, `under $200`. The scripted results are six pieces, all priced at 20000 or less, starting `pc_01`, `pc_07`, `pc_11`, then three pieces from three different Indigenous communities.
12. **Surprise me** in `d02-surprise` uses keyword `peony`, method `fair_random` and seed 7, and draws `pc_46`. `pc_46` is a Miao piece with motif `peony` and the lowest `salesThisMonth` among the keyword's candidates.
13. **The project add-on:** with `ord_001` the buyer adds 500 to `prj_01` (the Gu apprentice stipend), as `project.funded` `ctb_01`. `ord_001`'s own figures don't change. Cindia passes the full 500 to the fund (`mv_0101` buyer to Cindia, `mv_0102` Cindia to `community_fund` `prj_01`).
14. **The counterfeit hit:** `cft_01` resembles `pc_01`. Its scripted similarity is 0.91 and it claims "hand-stitched Gu embroidery" with no verification. `apr_03` proposes reporting it.
15. **The search proof** is never invented. `src/mock/model.ts` holds `report: null` until B11's first real training run, then the orchestrator has the data-smith copy that report in. Panels with no report say "Not trained yet".

### New files in `src/mock/`

| File | Holds |
|---|---|
| `communities.ts` | The eight communities |
| `people.ts` (changed) | Adds `own_02` to `own_08` and `mkr_04` to `mkr_17` |
| `catalog.ts` (changed) | Adds `pc_13` to `pc_54` and the new fields on all 54 |
| `searchIndex.ts` | The 54 IndexEntry records |
| `search.ts` | The scripted vibe-search answer for `d01-vibe` and the demo's surprise draw |
| `searchEval.ts` | The 50 hand-written eval queries |
| `projects.ts` | Projects, works in progress and their milestones |
| `storefronts.ts` | The eight storefronts |
| `agents.ts` | The agent roster from section 6 |
| `swarm.ts` | The scripted swarm runs: the demo's support question, the demo listing, the storefront draft, and the fallback run |
| `listings.ts` | `lst_01` and its scripted draft |
| `watch.ts` | The counterfeit candidates |
| `model.ts` | `modelId: "cindia-embed-v1"` and `report` (null until the first real run) |
| `policy.ts` | Shipping, returns and care policy, which the Clerk reads |
| `timelines/demo.ts` (changed in I2-tour) | The tour from section 8 |

## 3. Events (`events.md`)

The envelope, the store and the player stay. These change:

- `SourceKey` adds `"b11-embed" | "b12-search" | "b13-live" | "b14-swarm" | "b15-watch"`.
- `beat.started` payload adds `process?: ProcessId`, which opens that process view during the beat.
- `ProcessId` is `"search" | "swarm" | "checkout" | "money" | "reconcile" | "approvals" | "close" | "proof" | "watch" | "model"`.
- `money.moved` `kind` adds `"project_fund" | "milestone"`. v2's moves take IDs from `mv_0101` onward, so v1's `mv_0001` to `mv_0006` keep their numbers.
- **Per-key timeouts.** The registry gives `produce()` 8 seconds by default, 20 seconds for `b14-swarm` and 60 seconds for `b15-watch`. Each adapter aborts 0.5 seconds earlier.
- **Store keys added:** `search`, `surprise`, `support`, `swarm`, `listings`, `projects`, `wip`, `model`, `watch`, `storefront`. `I2-core` writes a reducer for every new type, with unit tests. Features add none.

### New event types

| Type | Payload | Key |
|---|---|---|
| `search.queried` | `queryId`, `text`, `keywords: string[]`, `lang`, `filters?: { maxPriceCents?: number; communityIds?: string[] }` | |
| `search.answered` | `queryId`, `results: { pieceId; score; matched: string[]; reason: Text }[]` (at most 12, best first), `engine: "elastic_hybrid" \| "local_hybrid" \| "keyword_scripted"`, `modelId?` | `b12-search` |
| `search.mapped` | `queryId`, `modelId`, `points: { pieceId; x; y }[]` (all pieces), `query: { x; y }`, `method: "pca"` | `b11-embed` |
| `surprise.asked` | `surpriseId`, `keyword?`, `method: "keyword_random" \| "pure_random" \| "fair_random"`, `seed` | |
| `surprise.drawn` | `surpriseId`, `pieceId`, `method`, `seed`, `candidates: { pieceId; weight }[]` | `b12-search` |
| `support.asked` | `threadId`, `side: "buyer" \| "seller"`, `text`, `lang`, `contextIds: string[]` (piece, order or listing IDs on screen) | |
| `swarm.step` | `runId`, `threadId`, `stepId` (`stp_0001` onward), `agentId`, `kind: "route" \| "call" \| "tool" \| "result" \| "check" \| "handoff" \| "reply"`, `summary: Text`, `toolName?`, `ms`, `model?` | `b14-swarm` |
| `support.answered` | `threadId`, `runId`, `agentId` (the agent whose words these are, usually `writer`), `reply: Text`, `refIds: string[]`, `approvalIds?: string[]` | `b14-swarm` |
| `support.escalated` | `threadId`, `runId`, `reason: Text`, `approvalId` | `b14-swarm` |
| `listing.requested` | `listingId`, `makerId`, `notes`, `lang` | |
| `listing.drafted` | `listingId`, `makerId`, `title: Text`, `summary: Text`, `facets`, `vibe` (shapes as on Piece), `checks: { checkId; kind: "protocol" \| "facts" \| "price"; ok: boolean; note: Text }[]` | `b14-swarm` |
| `listing.indexed` | `listingId`, `pieceId`, `modelId`, `embedText` | `b12-search` |
| `storefront.drafted` | `storefrontId`, `blocks` (as on Storefront) | `b14-swarm` |
| `storefront.published` | `storefrontId`, `slug` | |
| `project.funded` | `contributionId` (`ctb_01` onward), `projectId`, `amountCents`, `buyerId`, `orderId?` | |
| `wip.milestone_reached` | `wipId`, `milestoneId`, `date` | |
| `wip.milestone_paid` | `wipId`, `milestoneId`, `amountCents`, `date` | |
| `model.trained` | `modelId`, `baseModel`, `pairs`, `epochs`, `dims`, `hubUrl?` | `b11-embed` |
| `proof.search_scored` | `modelId`, `k: 5`, `queries`, `systems: { system: "keyword" \| "base" \| "custom" \| "hybrid"; recallAtK; mrr }[]` | `b11-embed` |
| `watch.started` | `scanId`, `makerId`, `queries: string[]` | |
| `watch.scanned` | `scanId`, `engine: "apify" \| "scripted"`, `candidates` (a count) | `b15-watch` |
| `counterfeit.flagged` | `cftId`, `scanId`, `pieceId`, `url`, `title`, `snippet`, `similarity`, `claim: Text` | `b15-watch` |

`swarm.step` events from the B13 stream carry key `b13-live`, because the B13 adapter delivers them. The payload rule from v1 applies: `search.answered`, `surprise.drawn`, `support.answered`, `listing.drafted`, `proof.search_scored` and `counterfeit.flagged` carry their figures and text, and screens render them from the event.

### Requests from people, added rows

| Request | Key | Scripted answer | Live answer |
|---|---|---|---|
| `search.queried` | `b12-search` | For the demo query, the answer in `src/mock/search.ts`. For any other text, a local keyword scorer over `searchIndex` (`src/sources/keywordSearch.ts`), engine `keyword_scripted` | B12 |
| `surprise.asked` | `b12-search` | A seeded draw over the catalog (`src/sources/surprise.ts`). `fair_random` weights are `1 / (1 + salesThisMonth)` | B12 |
| `support.asked` | `b14-swarm` | The run in `src/mock/swarm.ts` whose question matches, or the fallback run, which says scripted mode answers the demo questions and Live asks the swarm anything | B14 |
| `listing.requested` | `b14-swarm` | `lst_01`'s scripted draft, or a fallback draft labeled as a sample | B14 |
| `watch.started` | `b15-watch` | `watch.scanned` and the candidates in `src/mock/watch.ts` | B15 |

The scripted answer starts 1.2 seconds after the request in real time, as in v1. Scripted `swarm.step` events then arrive 300 ms apart, so the swarm graph animates, and the final event follows the last step. `project.funded`, `storefront.published` and the `wip.*` events are applied directly. Releasing a milestone goes through an approval, which `b08-approvals` already carries.

## 4. UI (`ui-contract.md`)

### Routes

| Route | Shows |
|---|---|
| `/` | Redirects to `/shop` |
| `/shop` | Shop home: slots `shop.home.main`, `shop.home.communities` |
| `/shop/search` | Results: slot `shop.search.main`. Reads `?q=` and repeated `?k=` |
| `/shop/piece/:pieceId` | The piece page: `shop.piece.main` and `shop.piece.side` |
| `/shop/community/:communityId` | `shop.community.main` |
| `/shop/projects`, `/shop/projects/:id` | `shop.projects.main`. The ID is a `prj_` or a `wip_` |
| `/shop/receipt/:orderId` | `shop.receipt.main` |
| `/store/:slug` | A storefront: `store.main` |
| `/sell/:view` | Views: `overview`, `listings`, `storefront`, `projects`, `map`, `month`, `close`, `proof`, `dashboard`, `approvals`, `watch`. `?drawer=ask`, `?drawer=audit&ref=<id>`, `?drawer=support` |
| `/maker/:makerId` | A maker's page: `maker.main`, `maker.side` |
| `/demo` | The guided tour. `?video=1`, `?start=catch` |
| Any route `?process=<processId>` | That process's view over the page: `process.view` |
| `/buyer`, `/studio/:view`, `/owner` | Redirect to `/shop`, `/sell/:view` and `/sell/approvals` |

An unknown route or view redirects to `/shop`. The demo controls stay on every route.

### Surfaces and frames

Desktop only. Every surface is a `PageFrame`, 1440 by 900, with the top bar (`shell-topnav`, 56 px) and the process bar (`process-bar`, 64 px) above the page.

| Surface | Frame test ID | Starts in | Pages |
|---|---|---|---|
| `buyer` (the Shop site) | `frame-buyer` | English | Every `/shop` route |
| `studio` (the Sell site) | `frame-studio` | English | Every `/sell` view. The left nav (`shell-nav-<view>`) lists the views in the order of the Routes table |
| `maker` | `frame-maker` | The maker's `lang` (Chinese for `mkr_01` to `mkr_03`) | `/maker/:makerId` |
| `store` | `frame-store` | English | `/store/:slug` |

`owner` stays a `SurfaceId` so the approvals feature can tell where it renders, but it no longer has a frame or a route: `owner.main` renders as the Sell site's `approvals` view. `PhoneFrame` leaves the kit's public index, and `frame-owner` is retired.

**Transition rule (until the buyer feature migrates):** while `shop.home.main` has no feature and `buyer.main` does, `/shop` renders `buyer.main` in a centered 480 px column, and `/shop/receipt/:orderId` does the same. That keeps the v1 story playable on the desktop shell from the first v2 commit. The rule is deleted in `I2-tour`.

### Slots added

| Slot ID | Place | Feature | Source keys its panels render |
|---|---|---|---|
| `process.bar` | Under the top bar on every page | `process` | all keys |
| `process.view` | The process overlay (`?process=`) | `process` | the keys of that process (table below) |
| `shop.home.main` | Shop home, hero and featured | `search` | `b12-search`, `b11-embed` |
| `shop.home.communities` | Shop home, communities and projects strip | `communities` | none |
| `shop.search.main` | Results page | `search` | `b12-search`, `b11-embed` |
| `shop.piece.main` | Piece page, left two thirds | `buyer` | `b10-derived`, `b04-bank` |
| `shop.piece.side` | Piece page, right third: "Ask about this piece" | `support` | `b14-swarm`, `b13-live` |
| `shop.community.main` | Community page | `communities` | none |
| `shop.projects.main` | Projects and works in progress | `communities` | `b08-approvals` |
| `shop.receipt.main` | Receipt page | `buyer` | `b10-derived` |
| `shop.drawer.support` | The Shop support drawer (top bar Help) | `support` | `b14-swarm`, `b13-live` |
| `store.main` | A storefront page | `storefront` | none |
| `studio.overview.main` | Sell › Overview | `seller-hub` | `b10-derived` |
| `studio.listings.main` | Sell › Listings | `seller-hub` | `b14-swarm`, `b12-search` |
| `studio.storefront.main` | Sell › Storefront builder | `storefront` | `b14-swarm` |
| `studio.projects.main` | Sell › Projects and works in progress | `communities` | `b08-approvals` |
| `studio.proof.side` | Sell › Proof, right third: the search model's score | `search` | `b11-embed` |
| `studio.watch.main` | Sell › Counterfeit watch | `watch` | `b15-watch` |
| `studio.drawer.support` | The Sell support drawer | `support` | `b14-swarm`, `b13-live` |
| `maker.side` | Maker page, right third: their listings and works in progress | `seller-hub` | none |

v1 slots stay with their features. `buyer.main` is retired when the buyer feature migrates to `shop.piece.main` and `shop.receipt.main`.

`SlotProps` adds `processId?: ProcessId` (the `process.view` slot only), `pieceId?`, `communityId?`, `projectId?`, `orderId?`, `slug?` (from the route), and `side?: "buyer" | "seller"` (the two support drawers).

### The process bar and views

| Process | Block label (en, zh) | Keys it watches |
|---|---|---|
| `search` | Vibe search, 按感觉搜索 | `b12-search`, `b11-embed` |
| `swarm` | Agent swarm, 智能体团队 | `b14-swarm`, `b13-live` |
| `checkout` | Checkout, 结账 | none (simulated card, always labeled) |
| `money` | Money, 资金 | `b04-bank` |
| `reconcile` | Reconcile, 对账 | `b01-match`, `b02-explain` |
| `approvals` | Approvals, 审批 | `b08-approvals` |
| `close` | Close, 月结 | `b06-workbook`, `b10-derived` |
| `proof` | Proof, 验证 | `b03-proof`, `b11-embed` |
| `watch` | Counterfeit watch, 仿冒监测 | `b15-watch` |
| `model` | Model, 模型 | `b11-embed` |

- A block's status is `idle` (no events yet), `working` (an event in the last 2 seconds on the player clock), `done`, or `attention` (an open flag, a pending approval or a counterfeit hit). It shows a count and a Live or Simulated badge (the same rule as panels).
- Clicking a block sets `?process=<id>`. Esc or `process-view-close` clears it. Every view ends with the raw event log for its event types (`process-log`), newest last: time, type, source, key.

### Camera states (`/demo`)

Each camera shows one frame at full stage size (the stage is 1440 by 900, scaled to fit), and `beat.started.process` may add a process view over it.

| Camera | Frame and page |
|---|---|
| `shop-home` | `frame-buyer` on `/shop` |
| `shop-search` | `frame-buyer` on `/shop/search` for the latest query |
| `shop-piece` | `frame-buyer` on `/shop/piece/<the open piece>` |
| `shop-receipt` | `frame-buyer` on `/shop/receipt/ord_001` |
| `sell-map`, `sell-month`, `sell-approvals`, `sell-close`, `sell-proof`, `sell-watch`, `sell-listings`, `sell-storefront` | `frame-studio` on that view |
| `sell-catch` | `frame-studio` on `month`, zoomed to the flag and its evidence, as v1's `studio-catch` |
| `maker` | `frame-maker` on `/maker/mkr_01` |
| `store` | `frame-store` on `/store/gu-studio` |

**Phase A mapping** (`I2-shell`, so v1's beats keep passing on the desktop shell): `buyer` → `shop-home` (and `shop-receipt` for `d11-receipt`), `buyer-studio` → `sell-map`, `studio-month` → `sell-month`, `studio-catch` → `sell-catch`, `studio-owner` → `sell-approvals`, `studio-close` → `sell-close`, `maker` → `maker`. `demo-script.md` updates its camera column with this mapping. Nothing else in it changes until `I2-tour`.

### Test IDs added

Shell: `shell-topnav`, `shell-side-shop`, `shell-side-sell` (the Shop and Sell switch), `shell-help` (opens the support drawer), `shell-nav-<view>`, `frame-store`, `process-bar`, `process-block-<processId>`, `process-view`, `process-view-close`, `process-log`.

| Test ID | Feature | Element |
|---|---|---|
| `search-input` | search | The vibe search box |
| `search-chip-<n>` | search | Keyword chip number n, from 1, in order |
| `search-submit` | search | Search |
| `search-results` | search | The results grid |
| `search-result-<pieceId>` | search | One result card |
| `search-reason-<pieceId>` | search | Why it matched |
| `search-engine` | search | Which engine answered |
| `search-surprise` | search | Surprise me |
| `search-surprise-mode` | search | The mode picker: keyword, pure random, fair random |
| `search-surprise-result` | search | The drawn piece, with the method named |
| `search-proof` | search | Sell › Proof side panel: the model's score table |
| `search-proof-row-<system>` | search | One row: keyword, base, custom, hybrid |
| `community-card-<communityId>` | communities | A community card |
| `community-page` | communities | A community page |
| `community-verification` | communities | How its makers are verified |
| `community-protocols` | communities | What it doesn't sell or show |
| `project-card-<projectId>` | communities | A project card |
| `project-progress-<projectId>` | communities | Raised against goal |
| `project-fund-<projectId>` | communities | Fund this project |
| `wip-milestone-<milestoneId>` | communities | One milestone of a work in progress |
| `wip-release-<milestoneId>` | communities | Sell side: release a milestone (proposes an approval) |
| `support-drawer` | support | Either support drawer |
| `support-input` | support | The message box |
| `support-send` | support | Send |
| `support-thread` | support | The conversation |
| `support-reply` | support | The latest reply |
| `support-agent` | support | The name of the agent whose words the latest reply is |
| `support-handoff` | support | The notice that a person is taking over |
| `buyer-verification` | buyer | The verification line on the piece page |
| `buyer-project-addon` | buyer | The project contribution at checkout |
| `seller-overview` | seller-hub | Sell › Overview |
| `seller-listing-notes` | seller-hub | The maker's notes box |
| `seller-listing-draft` | seller-hub | The drafted listing |
| `seller-listing-check-<checkId>` | seller-hub | One check on the draft |
| `seller-listing-approve` | seller-hub | Propose publishing (an approval) |
| `seller-maker-side` | seller-hub | The maker page's side panel |
| `storefront-builder` | storefront | Sell › Storefront |
| `storefront-block-<blockId>` | storefront | One block in the builder |
| `storefront-preview` | storefront | The live preview |
| `storefront-publish` | storefront | Propose publishing (an approval) |
| `store-page` | storefront | A storefront page at `/store/:slug` |
| `watch-scan` | watch | Scan now |
| `watch-results` | watch | The hits |
| `watch-item-<cftId>` | watch | One hit, side by side with the maker's piece |
| `watch-similarity-<cftId>` | watch | Its similarity score |
| `watch-report-<cftId>` | watch | Propose a report (an approval) |
| `process-search-map` | process | The embedding map in the search view |
| `process-swarm-graph` | process | The agent graph in the swarm view |
| `process-swarm-step-<stepId>` | process | One step in the swarm view |
| `process-money-diagram` | process | The money view's diagram |
| `process-model-card` | process | The model view's training summary |

## 5. API (`api-contract.md`)

The v1 rules stay: `/api/bNN/` prefixes, `{ "events": [...] }` responses, the error shape, timeouts, no keys in logs, and the Claude rules (no `temperature`, `top_p`, `top_k`, no enabled thinking, no prefill, structured outputs through `messages.parse()` or strict tools, every ID and amount checked against the request). The server can still read only what the request carries, except that B11 and B12 also read `artifacts/mock/mock.json`, which `npm run export:mock` writes from `src/mock/` (see `I2-core`).

### B11 · the embedding model (`b11-embed`)

- **Training is a script, not an endpoint:** `python server/b11_embed/train.py`. It reads `artifacts/mock/mock.json`, writes training pairs to `server/b11_embed/pairs.jsonl` (committed), fine-tunes the base model, scores it on `searchEval` against keyword search, the base model and hybrid, and writes:
  - the model to `CINDIA_MODEL_DIR` (not committed),
  - `server/b11_embed/report.json` (committed),
  - `server/b11_embed/vectors.json` (committed: per piece the vector, its 2D PCA coordinates and `modelId`).
  With `HF_TOKEN` set, it publishes the model and a model card.
- **Base model:** `intfloat/multilingual-e5-small` (384 dimensions), so Chinese and English queries share one space. The builder may pick another open model if this one won't train in the cloud. It records why in its report.
- **Training pairs:** a build-time prompt to `claude-sonnet-5-5` writes 20 buyer-style queries per piece, in mixed voices (mood only, occasion only, who it's for, what it looks like, short, long, misspelled, about a fifth in Chinese), plus hard negatives (same object from another craft, same motif on another object). Every pair is kept in `pairs.jsonl` for audit. Eval queries never enter training.
- `GET /api/b11/model` returns `{ "trained": boolean, "modelId": string | null, "baseModel": string | null, "dims": number | null }`. This is not an events response. The adapter's `health()` reads it.
- `POST /api/b11/report` `{ "trigger": ... }` returns `model.trained` and `proof.search_scored` from `report.json`, under 1 second.
- `POST /api/b11/map` `{ "trigger": ..., "queryId": ..., "text": ..., "keywords": [] }` embeds the query and returns `search.mapped` (all pieces' PCA points plus the query's), under 2 seconds.
- **Fallback:** the scripted `model.trained`, `proof.search_scored` and `search.mapped` from `src/mock/model.ts`, or nothing when the report is null.

### B12 · search (`b12-search`)

- `POST /api/b12/seed` `{ "entries": IndexEntry[], "pieces": Piece[] }` (up to 60 seconds, called once by the adapter's `health()` in live mode) creates index `cindia-pieces-v1` behind alias `cindia-pieces` on Elastic Serverless, and writes one document per piece. Each document holds the facet fields, the community fields, `embedText` and `vector` (`dense_vector`, 384 dimensions, cosine, int8 HNSW).
- `GET /api/b12/status` returns `{ "elastic": boolean, "indexed": number, "agentBuilder": boolean }`.
- `POST /api/b12/search` `{ "trigger", "queryId", "text", "keywords", "lang", "filters" }` returns `search.answered`, under 4 seconds:
  - It embeds the query with the B11 model.
  - It runs a hybrid query in Elastic: a kNN retriever on `vector` plus a keyword retriever over the facet fields, `embedText` and the titles, fused with RRF, with the filters applied. Engine `elastic_hybrid`.
  - If Elastic is unreachable, it runs the same fusion locally over `vectors.json` with a BM25 scorer. Engine `local_hybrid`.
  - Each result's `matched` lists the query keywords found in its facets, and `reason` is one short sentence built from those facets (no model call).
- `POST /api/b12/surprise` `{ "trigger", "surpriseId", "keyword", "method", "seed" }` returns `surprise.drawn`, under 2 seconds. `keyword_random` and `fair_random` draw from the keyword's top 12 by hybrid score, `fair_random` weighting by `1 / (1 + salesThisMonth)`. `pure_random` draws from all 54. The draw is seeded, so a seed always gives the same piece.
- **Elastic Agent Builder:** B12 creates an agent `cindia-finder` in Kibana through its API, with a search tool over `cindia-pieces`. The Finder agent in B14 can ask it structured questions ("wool pieces under $100 from Peru"). `agentBuilder` in the status says whether the agent exists and answers.
- **Fallback:** the scripted answers in the Requests table.

### B13 · live shared state on SpacetimeDB (`b13-live`)

- A SpacetimeDB module in `server/b13_spacetime/module/`, TypeScript if the installed CLI supports TypeScript modules, otherwise Rust. Tables: `swarm_run`, `swarm_step`, `process_status`, `screen`. Reducers: `start_run`, `add_step`, `finish_run`, `set_process`, `join_screen`, `leave_screen`. The orchestrator installs the CLI, starts the local server on port 3000 and publishes the module as `cindia`. Maincloud is optional, and the builder documents the command to publish there.
- `server/b13_spacetime/bridge.py` exposes `start_run`, `add_step`, `finish_run` and `set_process` to the other upgrades. When SpacetimeDB is unreachable each call is a no-op that logs one line.
- `GET /api/b13/stream` is a server-sent events stream. Each message's `data` is one `CindiaEvent` (`swarm.step` with key `b13-live`), built from rows as SpacetimeDB delivers them, through a subscription or by polling the SQL endpoint every 250 ms if subscriptions aren't workable from Python.
- `GET /api/b13/status` returns `{ "spacetime": boolean, "db": string, "screens": number }`.
- The adapter `src/sources/live/b13-live.ts` uses `start(emit)`: it opens the stream in live mode and closes it when the mode goes back to scripted. It also joins a `screen` row so two open browsers count each other.
- **Fallback:** without the stream, swarm steps arrive in B14's response or from the scripted runs.

### B14 · the agent swarm (`b14-swarm`)

- `POST /api/b14/support` `{ "trigger", "threadId", "side", "text", "lang", "contextIds", "records" }`, where `records` carries the pieces, communities, orders, policy and index entries the request touches. It returns every `swarm.step` in order and then `support.answered`, or `support.escalated` with an `approval.requested`. Under 19 seconds.
- `POST /api/b14/listing` `{ "trigger", "listingId", "makerId", "notes", "lang", "community", "maker" }` runs Lister, then Describer (when an image is given), Tagger, Checker and Indexer. It returns the steps, `listing.drafted` and, once B12 is live, `listing.indexed`. Under 19 seconds.
- `POST /api/b14/storefront` `{ "trigger", "storefrontId", "community", "pieces" }` runs Designer and returns the steps and `storefront.drafted`. Under 19 seconds.
- **How a run works:**
  1. Cindy (orchestrator) reads Intake's result and picks the specialists from the roster.
  2. Each specialist gets only its own tools and the records it needs, and answers through `messages.parse()` with its own small Pydantic model.
  3. The Writer turns the specialists' facts into the reply.
  4. Every step goes to `bridge.add_step` (so B13 streams it) and into the response.
  5. A specialist that can't answer from its records returns `unknown` with a reason, and the Writer says so plainly.
  6. Anything that would move money, publish or report becomes an `approval.requested` (kinds `support_action`, `listing_publish`, `storefront_publish`), never an action.
- **Fallback:** the scripted runs in `src/mock/swarm.ts`.

### B15 · counterfeit watch (`b15-watch`)

- `POST /api/b15/watch` `{ "trigger", "scanId", "makerId", "queries", "pieces", "entries" }`, under 58 seconds:
  - Scout runs Apify's Google search scraper actor through the Apify API (run-sync, at most 10 results per query, 3 queries, a 45-second budget).
  - Comparer scores each result's title and snippet against the maker's pieces with the B11 model.
  - Claims (`claude-haiku-5-5`) checks whether the listing claims to be handmade by the community or Indigenous-made.
  - It returns `watch.scanned`, then `counterfeit.flagged` for each hit at similarity 0.75 or above with an unverified claim, then `approval.requested` for a report (kind `report_listing`, Reporter's draft as the follow-up text).
  - It keeps only title, URL and snippet, never visits the found pages, and never contacts anyone.
- **Fallback:** the scripted scan in `src/mock/watch.ts`.

### Health

`GET /api/health` adds the keys and `services` from section 1, and `routers` lists `b11` to `b15` as they load.

## 6. The agent roster (`src/mock/agents.ts`, used by B14 and the swarm view)

| agentId | kind | model | tools | Job |
|---|---|---|---|---|
| `cindy` | claude | `claude-haiku-5-5` | `route` | Picks which agents run and in what order, then merges their results. No facts of her own |
| `intake` | claude | `claude-haiku-5-5` | none | Reads the request: intent, budget, recipient, language, the IDs it mentions |
| `finder` | claude | `claude-haiku-5-5` | `cindia_search`, `elastic_agent` | Turns the request into keywords and filters, runs the search, returns candidates and scores |
| `curator` | claude | `claude-sonnet-5-5` | none | Picks and orders the final few, one grounded reason each |
| `steward` | claude | `claude-sonnet-5-5` | `community_page`, `verification_record` | Answers authenticity and meaning from the community's page and the record only, and says "I'll ask the maker" otherwise |
| `clerk` | claude | `claude-haiku-5-5` | `order_lookup`, `policy` | Order status, shipping, returns. Read-only |
| `writer` | claude | `claude-sonnet-5-5` | none | Writes the reply in the person's language from the facts the others returned |
| `lister` | claude | `claude-sonnet-5-5` | none | Drafts a listing in English and Chinese from the maker's notes |
| `describer` | claude | `claude-sonnet-5-5` | `image` | Describes what's visible in a picture |
| `tagger` | claude | `claude-haiku-5-5` | `community_page` | Proposes vibe keywords for the maker to approve |
| `checker` | claude | `claude-sonnet-5-5` | `community_page` | Checks a draft against the community's protocols and the maker's facts |
| `indexer` | code | | `embed`, `index_write` | Builds the index entry and its vector |
| `matcher` | code | | `b01` | Matches payouts to orders |
| `explainer` | claude | `claude-sonnet-5-5` | `b02` | Explains the catch |
| `bookkeeper` | code | | `b06`, `b10` | Derives the books and the workbook |
| `scorer` | code | | `b03` | Scores the planted errors |
| `scout` | code | | `apify_search` | Runs the web search |
| `comparer` | code | | `embed` | Scores look-alikes |
| `claims` | claude | `claude-haiku-5-5` | none | Checks what a found listing claims |
| `reporter` | claude | `claude-sonnet-5-5` | none | Drafts a report for the owner |
| `designer` | claude | `claude-sonnet-5-5` | `community_page` | Drafts a storefront |

The swarm view labels `code` agents "rule-based". The `never` field on each spec is the "Never does" column of the brief.

## 7. Kit additions (`design-system.md`, built in `I2-kit`)

Until Figma drop 1 lands, every new component uses the existing silk-and-ink tokens. After it lands, `I3-redesign` changes the tokens and the kit, and features follow without edits wherever they used only kit components and tokens.

`PageFrame`, `TopNav`, `SideSwitch` (Shop and Sell), `ProcessBlock`, `ProcessView` (frame with title, Live or Simulated badge, body, event log), `EventLog`, `SearchBar` (text and editable keyword chips), `Chip`, `PieceCard` (illustration, title, maker mark, community, price, verification line), `CommunityCard`, `ProjectCard` (progress bar), `MilestoneTimeline`, `VerificationLine`, `ChatThread`, `ChatBubble` (agent name and kind), `AgentGraph` (SVG nodes and edges, steps animate on the player clock), `EmbeddingMap` (SVG scatter of points with the query star and links to the top results), `ScoreBar`, `Drawer` (generic, 440 px, from the right), `Tabs`, `BlockEditor` (a list of blocks with move up, move down and edit), `SideBySide` (two cards with a similarity bar between them). `Badge` gains `Live`, `Demo data` and `Rule-based` variants. Motion still follows the player clock.

## 8. The tour (`demo-script.md`, replaced in `I2-tour`)

About 100 seconds at 1x. Every beat starts with `beat.started` (beat ID, camera, optional process). The finance beats keep every v1 event and figure. Only their times move.

| Beat | Time (s) | Camera | Process | What happens (events) | On screen (test IDs) |
|---|---|---|---|---|---|
| `d01-vibe` | 0 to 9 | `shop-home`, then `shop-search` at 3.5 | `search` from 6.5 | 0.4 `search.queried` (figure 11), 2.6 `search.answered`, 3.5 camera to `shop-search`, 6.0 `search.mapped` | `search-input`, `search-chip-1` to `search-chip-6`, `search-results`, `search-result-pc_01`, `process-search-map` |
| `d02-surprise` | 9 to 14 | `shop-search` | | 9.4 `surprise.asked` (figure 12), 10.6 `surprise.drawn` `pc_46` | `search-surprise`, `search-surprise-result` |
| `d03-piece` | 14 to 21 | `shop-piece` | | 14.3 `piece.opened` `pc_01`, 16.5 `split.shown` (v1 figures) | `buyer-story-card`, `buyer-verification`, `buyer-split-bar`, `buyer-split-maker-share` |
| `d04-support` | 21 to 33 | `shop-piece` | `swarm` from 25 | 21.4 `support.asked` "Did the maker stitch this herself? Can it arrive by October 10?", 22.6 to 29.5 `swarm.step` (cindy, intake, steward, clerk, writer), 30.0 `support.answered` | `support-drawer`, `support-reply`, `support-agent`, `process-swarm-graph` |
| `d05-pay` | 33 to 39 | `shop-piece` | `checkout` from 36 | v1's `d04-pay` events, plus 35.0 `project.funded` `ctb_01` | `buyer-pay-button`, `buyer-project-addon`, `buyer-token`, `buyer-receipt-status` |
| `d06-money` | 39 to 45 | `sell-map` | | v1's `d05-money` events, plus `mv_0101`, `mv_0102` | `money-map-canvas`, `money-map-thread-mv_0001`, `money-map-thread-mv_0003`, `money-map-balance` |
| `d07-month` | 45 to 55 | `sell-month` | | v1's `d06-month` | as v1 `d06-month` |
| `d08-catch` | 55 to 63 | `sell-catch` | | v1's `d07-catch` | as v1 `d07-catch` |
| `d09-approve` | 63 to 68 | `sell-approvals` | | v1's `d08-approve` | as v1 `d08-approve` |
| `d10-close` | 68 to 72 | `sell-close` | | v1's `d09-close` | as v1 `d09-close` |
| `d11-maker` | 72 to 75 | `maker` | | v1's `d10-statement` | as v1 `d10-statement` |
| `d12-receipt` | 75 to 80 | `shop-receipt` | | v1's `d11-receipt` `receipt.updated` | `buyer-receipt`, `buyer-receipt-status` |
| `d13-proof` | 80 to 85 | `sell-proof` | `model` from 83 | 80.4 `proof.scored` 4 of 4, 81.0 `proof.search_scored` (when the report exists) | `proof-score`, `search-proof`, `process-model-card` |
| `d14-watch` | 85 to 92 | `sell-watch` | | 85.3 `watch.started`, 87.5 `watch.scanned`, 88.0 `counterfeit.flagged` `cft_01`, 89.5 `approval.requested` `apr_03` | `watch-results`, `watch-item-cft_01`, `watch-similarity-cft_01` |
| `d15-listing` | 92 to 100 | `sell-listings` | `swarm` from 95 | 92.3 `listing.requested` `lst_01`, 93.0 to 97.5 `swarm.step` (lister, tagger, checker, indexer), 98.0 `listing.drafted` | `seller-listing-notes`, `seller-listing-draft`, `seller-listing-check-<checkId>` |
| `d16-store` | 100 to 104 | `store` | | none | `store-page` |

- `durationMs` is 104000.
- `d07-month` runs v1's month timeline at the same 0.3 seconds per day.
- `/demo?start=catch` seeks to 55.0, plays to the end, rewinds to 0 and pauses at 38.999.
- Video mode's cold open seeks to 63.0 on `sell-catch` with v1's line.
- The end card adds the search proof and the list of live sources.

## 9. Glossary additions (`glossary.md`)

| Word | Code name | English label | Chinese label | Meaning |
|---|---|---|---|---|
| community | `Community` | Community | 社区 | A people or studio whose makers sell on Cindia |
| Indigenous | `kind: "indigenous"` | Indigenous | 原住民 | A community of Indigenous people. Never used for Gu embroidery |
| demo data | `demo: true` | Demo data | 演示数据 | Fictional people and stories, labeled as such |
| verification | `verification` | How makers are verified | 匠人认证方式 | Who attested that the maker belongs to the community, and how |
| protocols | `protocols` | What we don't sell | 我们不出售的 | The community's rules on what stays off the market |
| vibe search | `search` | Vibe search | 按感觉搜索 | Search by describing a feeling |
| keyword | chip | Keyword | 关键词 | A word the Finder pulled from the request, editable |
| why it matched | `reason` | Why it matched | 匹配原因 | The facets a result shares with the request |
| surprise me | `surprise` | Surprise me | 给我惊喜 | A random pick, in one of three ways |
| fair random | `fair_random` | Fair random | 公平随机 | A random pick that leans toward makers with fewer sales |
| project | `Project` | Community project | 社区项目 | Something a community raises money for |
| work in progress | `WorkInProgress` | Work in progress | 定制进行中 | A commission paid in stages |
| milestone | `milestoneId` | Milestone | 阶段 | One stage of a commission, paid when reached and approved |
| storefront | `Storefront` | Storefront | 店铺页面 | A community's own page at its own link |
| storefront builder | `storefront` | Storefront builder | 店铺搭建 | Blocks to arrange and edit a storefront. A preview |
| support | `support` | Help | 客服 | Questions answered by the agent swarm |
| agent swarm | `swarm` | Agent swarm | 智能体团队 | The small agents that each do one job |
| rule-based | `kind: "code"` | Rule-based | 规则程序 | An agent that is plain code, not a model |
| listing | `ListingDraft` | New listing | 新作品上架 | A maker's new piece, drafted from their notes |
| counterfeit watch | `watch` | Counterfeit watch | 仿冒监测 | The scan for look-alikes and false claims |
| similarity | `similarity` | Similarity | 相似度 | How close a found listing is to a maker's piece |
| process | `ProcessId` | How it works | 运行过程 | The process blocks and their views |
| live | `source: "live"` | Live | 实时 | Came from a real service in this run |
| model | `model` | Search model | 搜索模型 | Cindia's own embedding model |
| index | `IndexEntry` | Index | 索引 | What Cindia keeps about each piece to find it |

## 10. Gates and tags (`definition-of-done.md`)

| Gate | After | Commands | Tag |
|---|---|---|---|
| G1b | `I2-core`, `I2-shell`, `I2-kit` | `npm run check`, `npm run test:smoke`, `npm run build`, `npm run test:demo` once with the Phase A mapping, `npm run test:offline`, a verifier review | `v2-shell` |
| G2b | `S3-catalog` | `npm run check:data` (v1's figures 1 to 10 and v2's 11 to 15), `npm run check`, a verifier review | `v2-data` |
| G3 | each v2 feature or migration | as v1 | `v2-<slug>` |
| G4v2 | `I2-tour` | `npm run build`, `npm run test:demo` 3 times on the tour (each run under 130 seconds), `npm run test:offline`, the verifier's screenshot review against section 8 | `demo-ok-v2` |
| G5 | each of B11 to B15 | as v1 | `demo-ok-b11` to `demo-ok-b15` |
| G6 | the freeze | as v1 | `final` |

## 11. Additions from the plans (Oct 24, 2:40 PM)

The plan writers found these gaps. Each one is settled here, and where two plans proposed different names, this section picks one. Where it disagrees with sections 1 to 10, it wins.

### Navigation and slot props (`I2-core`, `I2-shell`)

- `src/core/nav.ts` exports:
  - route builders: `shopRoute()`, `searchRoute({ q, k })`, `pieceRoute(pieceId)`, `communityRoute(communityId)`, `projectsRoute(id?)`, `receiptRoute(orderId)`, `storeRoute(slug)`, `sellRoute(view, { drawer?, ref? })`, `makerRoute(makerId)`,
  - `navigate(path)`, `setProcess(processId | null)`, `openDrawer("ask" | "audit" | "support", ref?)`.
  
  Features never touch `window.location`. On `/demo` the shell decides what each call does.
- The kit adds `Link` with a `to` prop, built on `navigate`.
- `SlotProps` adds:
  - `searchParams?: { q?: string; k: string[] }` on `/shop/search`,
  - `processId?` (both `process.bar` and `process.view`),
  - `pieceId?` (the piece page, and the Shop support drawer while a piece page is open),
  - `communityId?`, `projectId?`, `slug?`, `side?`,
  - `orderId?` (the receipt page),
  - `refId?` (the audit drawer and `owner.main`).
- `/sell/approvals?ref=<approvalId>` selects that approval. `?drawer=support` works on Shop routes too.
- `owner.main` adds keys `b14-swarm` and `b15-watch` to its Simulated rule.

### Store and types (`I2-core`)

- **New store keys:**
  - `log`: one `{ id, type, at, source, key }` per event, idempotent by `id`, keeping the newest 400. The process views and block counts read it.
  - `demo.process` and `demo.drawer`.
- **New types in `src/core/types.ts`:** `ScriptedRun`, `ModelReport`, `DemoSearch`, `DemoSurprise`, `ScriptedScan`, `Policy`.
- **Views and cameras:** `SellView` and `SELL_VIEWS`, with `StudioView` staying the v1 five until `I2-tour`. `TourCameraId`, `LegacyCameraId`, `LEGACY_CAMERA_TO_TOUR` and `toTourCamera()`. `CameraId` covers both until `I2-tour`.
- **Page size:** `PAGE_WIDTH` 1440 and `PAGE_HEIGHT` 900.

### IDs, one scheme for every plan

| Who makes it | IDs |
|---|---|
| The tour and the scripted data | `qry_01`, `srp_01`, `thr_01`, `wsc_01` (the tour's scan), `run_01` (the support run), `run_02` (the listing run), `run_03` (the Designer run), `stp_0001` onward, `chk_01` onward (listing checks), `ctb_01` onward |
| A person, through `userEvent()` payloads | `qry_user_<n>`, `srp_user_<n>`, `thr_user_<n>`, `wsc_user_<n>`, `lst_user_<n>`, `ctb_user_<n>`, `ord_user_<n>` |
| A scripted or live answer to a person | `run_user_<n>`, `stp_user_<n>` |

Numbering starts at 1 for each prefix and counts what's already in the store, so a reset starts over.

### Events and requests

- **Payload additions:**
  - `search.mapped` adds `approx?: boolean`, true when the points come from scripted data.
  - `beat.started` adds `drawer?: "support" | "ask" | "audit"`. A beat may carry more than one `beat.started` with the same `beatId`.
- **New event:** `storefront.requested` `{ storefrontId }`, a person's request keyed `b14-swarm`. The scripted answer is the Designer run (`run_03`, `threadId` the storefront ID) ending in `storefront.drafted`. The live answer is `POST /api/b14/storefront`.
- **Listing runs** use the `listingId` as `threadId`. Notes equal to `lst_01.notes` get `lst_01`'s run, re-keyed to the person's IDs. The run ends with `approval.requested` `apr_04`, at 98.5 in the tour.
- **The watch run** (the person's and the tour's) carries `followup.drafted` `fup_02` (the Reporter's draft), then `approval.requested` `apr_03`.
- **New Requests rows:**

| Request | Key | Scripted answer |
|---|---|---|
| a person's `piece.opened` | `b10-derived` | `split.shown` from `src/mock/splits.ts` (one split per piece under the `ch_cindia` rules, `pc_01` equal to figure 1) |
| a person's `checkout.started` on any piece but the timeline's | none | `card.tokenized` (a token made from the piece ID, no randomness, last four 4242), `order.placed` `ord_user_<n>` on `ch_cindia`, `receipt.updated` received. These orders stay out of the month, the ledger and the money map |
| a person's `wip.milestone_reached` (date always `2026-10-01`) | `b08-approvals` | `agent.acted` (propose) and `approval.requested` `apr_05` for `wip_01`'s second milestone. Any other milestone gets only the `agent.acted` line |
| `approval.granted` on a `milestone_release` | `b08-approvals` | `wip.milestone_paid` and a `money.moved` of kind `milestone`, Cindia to the maker, the next `mv_01xx` ID, dated `2026-10-02` |
| `storefront.requested` | `b14-swarm` | the Designer run |

### Data (`S3-catalog`)

- **Exports** from `src/mock/` (every file re-exported by `src/mock/index.ts`):
  - existing: `pieces` (`catalog.ts`)
  - `communities` (`communities.ts`)
  - `searchIndex`, `keywordAliases` (`searchIndex.ts`)
  - `demoSearch`, `demoSurprise` (`search.ts`)
  - `searchEval` (`searchEval.ts`)
  - `projects`, `worksInProgress` (`projects.ts`)
  - `storefronts` (`storefronts.ts`)
  - `agents`, `getAgent(agentId)` (`agents.ts`)
  - `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun`, `demoQuestions` (`swarm.ts`)
  - `listings` (`listings.ts`)
  - `counterfeitCandidates`, `scriptedScan` (`watch.ts`)
  - `modelId`, `report` (`model.ts`)
  - `policy` (`policy.ts`)
  - `splits` (`splits.ts`)
  - `getById()` also finds `com_`, `prj_`, `wip_`, `sto_`, `lst_`, `cft_` and the new people.
- **`demoQuestions`** is `{ side: "buyer" | "seller"; text: Text }[]`, and the buyer's first entry is the d04 question.
- **Approval subjects:**
  - `apr_03.subjectIds` is `["cft_01"]`,
  - `apr_04.subjectIds` is `["lst_01"]`,
  - `apr_05.subjectIds` is `["wip_01", <its second milestone ID>]`, with `amountCents` that milestone's share of the price.
- **`fup_02`** is the Reporter's draft about `cft_01`.
- **`wip_01`** is a Gu commission (`com_gu`, one of `mkr_01` to `mkr_03`).
- **Storefront block props:**
  - hero: `tagline`,
  - pieces: `pieceIds`,
  - projects: `projectIds`,
  - visit: `address` and `hours`.
- **Keyword chips:** `extractKeywords(text)` lives in `src/sources/keywords.ts`, is exported from `src/sources/index.ts`, is deterministic, and returns `{ keywords: string[]; filters: { maxPriceCents?: number } }`. `keywordSearch.ts` keeps the scorer and `keywordVocab()`.
  - Order: moods, then facet words, then occasions and recipients, then price, in text order within each group.
  - For figure 11, `garden` and `peony` are motif words, and `keywordAliases` maps `mom` to the recipients phrase `gift for mom`.
  - The scripted keyword scorer also applies `filters`.
- **The surprise draw** is mulberry32 seeded with the seed, over the keyword's top 12 sorted by score and then `pieceId`, with fair weights `1 / (1 + salesThisMonth)`. The data's `salesThisMonth` values make seed 7 land on `pc_46`. A person's seed is 1 plus the number of `surprise.asked` events already in the store.

### Shell and the tour

- **Phase A legacy page:**
  - Until `I2-tour`, the route `/shop/legacy` always renders `buyer.main` in a centered 480 px column.
  - Phase A maps v1 cameras `buyer` and `receipt` to the legacy camera `shop-legacy` (`frame-buyer` on `/shop/legacy`).
  - This replaces the transition rule in section 4. Filling `shop.home.main` no longer changes what the v1 demo sees.
  - `I2-tour` deletes the route and the camera, and `M-buyer`'s last task deletes `buyer.main` and the concierge test IDs after G4v2.
- **Process views:**
  - In the tour, a beat with `process` scales its frame to 0.66 on the left and shows the process view in the right third.
  - A person's `?process=` is a centered overlay, 1200 by 720.
  - The top bar and the process bar stay visible above an open view, and a view never covers an open drawer.
- **Test IDs and layout:**
  - The process feature renders `process-bar`, `process-block-<id>`, `process-view`, `process-view-close` and `process-log`. The shell renders only the slot containers and their placeholders, `slot-process-bar` and `slot-process-view`.
  - `/dev/kit` renders `KitGallery` from `src/ui/gallery.tsx` (test ID `dev-kit-gallery`).
  - The Sell nav is 184 px, and the Sell header holds the studio's name and Cindy's latest line.
- **`storefront-publish`** reads "Publish". It is the owner's own decision and emits `storefront.published` directly.
- **Tour additions:**
  - d04 carries `drawer: "support"`.
  - d13 adds `model.trained` at 80.8, only when the report exists.
  - d15's `approval.requested` `apr_04` lands at 98.5.
- **Kit additions:** `Badge` variants `live`, `demo`, `rule`, `estimate`.

### Tests

- `tests/smoke/lib.ts` (`I2-shell`) exports `seekToEvent(page, match)`, which finds the event in `player.getTimeline()` and seeks to it.
- Every v2 spec seeks by event, never by a fixed time, because `I2-tour` moves the beats.
- A feature's own `<slug>-lib.ts` may wrap it but never copies it.

### Server and scripts

- **Server:**
  - `server/config.py` adds `elastic_headers()` and `apify_headers()`, which send nothing when the `*_AUTH=proxy` flag is set.
  - `server/services.py` adds `spacetime_reachable()` and `model_present()`.
  - `tests/server/conftest.py` adds `needs_service()`.
  - `server/requirements.txt` carries `--extra-index-url https://download.pytorch.org/whl/cpu`.
- **Scripts:**
  - `artifacts/mock/mock.json` holds one key per non-function export of `src/mock/index.ts`, plus `_generatedAt`.
  - npm scripts `export:mock` and `art` (with `--check`), plus `scripts/check-contrast.mjs`.
  - `scripts/gate.mjs` learns G1b, G2b and G4v2 (130-second runs). Tags may add `demo-ok-v2-dN` per design drop.

### Glossary

| Word | Code name | English label | Chinese label | Meaning |
|---|---|---|---|---|
| community fund | `Party.kind: "community_fund"` | Community fund | 社区基金 | Where project contributions go, in full |
