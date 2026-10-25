# Cindia v2 · contract changes

Every name v2 adds or changes. Until plan `I2-core` is green, this file is the source for v2 names. `I2-core` merges it into `docs/common/` (conventions, glossary, data-model, events, ui-contract, api-contract, design-system, demo-script, definition-of-done) in one commit together with the shared code that implements it. Every section goes in, section 11 and section 12 included, each part into the file its heading names. From then on `docs/common/` is the truth again, and this file is history. Background and reasons: `docs/v2/brief.md`. The plans and their order: `docs/v2/README.md`.

Rule for v1: nothing in v1 changes unless this file says so. Plan `R0-reskin` moves v1's whole money story to the Diné Weaving and Silver Co-op (section 2). It changes names, words and art, and no number: every v1 demo-critical figure (`data-model.md`, items 1 to 10) keeps its value. The one v1 ID that changes is the studio's, `std_gu`, which becomes `std_dine` everywhere. R0 lands in one commit with every v1 check green (section 10).

## 1. Machines, environments, ports and keys

- **Build machine:** a Claude Code cloud session on the GitHub repo (Linux, Node 22, Python 3.13, 2 vCPUs, about 7 GB of RAM, no GPU). Its environment is set to Full network access, or to Custom with the hosts below and **Also include default list** ticked, because npm, PyPI, crates.io and GitHub's release hosts ride on the default list. The Windows desktop and laptop are demo machines and can also run any live step (D-deploy's demo-laptop checklist). npm scripts stay `cmd.exe`-safe, because the demo runs on Windows.
- **Ports:** 5173 (Vite dev), 4173 (preview), 8000 (FastAPI), and **3000, the local SpacetimeDB server**, started once by the orchestrator in the background with `spacetime start --listen-addr 127.0.0.1:3000`, so nothing beyond the machine can reach it. Nothing else listens.
- **Hosts the build needs** (for a Custom allowlist): `*.elastic.cloud`, `api.apify.com`, `api.nessieisreal.com`, `prod-api.nessieisreal.com`, `qa-api.nessieisreal.com`, `huggingface.co`, `*.huggingface.co`, `*.hf.co`, `install.spacetimedb.com`, `spacetimedb-client-binaries.s3.amazonaws.com`, `cdn.sheetjs.com`, `download.pytorch.org`, `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`. Only if B13's module is Rust: `static.rust-lang.org`, `index.crates.io` and `static.crates.io` (rustc and cargo come with the image). `*.spacetimedb.com` matters only for Maincloud, which stays off for the demo. GitHub, npm, PyPI and the Anthropic API are reachable by default.
- **The public site** is the scripted build on Cloudflare Pages, which Gordon uploads from Windows (D-deploy). The cloud session never deploys. B15's crawler reads the site's sandbox market from Apify's side, so the cloud VM needs no route to it.

**Environment variables.** `server/config.py` reads the process environment first, then `.env`. It never prints or returns a value.

| Name | Where it's set | Used by |
|---|---|---|
| `CINDIA_ANTHROPIC_API_KEY` | Cloud environment variable. Not `ANTHROPIC_API_KEY`, which would change how the cloud session itself is billed. Never a network secret | `server/` |
| `ANTHROPIC_API_KEY` | `.env` on the Windows machines only | `server/`, read only when `CINDIA_ANTHROPIC_API_KEY` is unset |
| `NESSIE_KEY` | Cloud environment variable or `.env`. Never a network secret, because it travels in the query string | `server/` B04, B16 |
| `ELASTIC_URL`, `KIBANA_URL` | Cloud environment variable or `.env`. Not secret | `server/` B12 |
| `ELASTIC_API_KEY` | Cloud environment variable or `.env`. Leave it unset when a network secret carries the key | `server/` B12 |
| `ELASTIC_AUTH` | `proxy` in the cloud when a network secret attaches the Elastic key, otherwise unset. Proxy mode exists only in the cloud | `server/config.py` |
| `APIFY_TOKEN` | Cloud environment variable or `.env`. Leave it unset when a network secret carries the token | `server/` B15 |
| `APIFY_AUTH` | `proxy` in the cloud when a network secret attaches the Apify token, otherwise unset | `server/config.py` |
| `HF_TOKEN` | Cloud environment variable, `.env`, or the shell on the lab machine. A fine-grained token with write access to the one model repo | `server/b11_embed/publish.py` (publish) and `fetch_model.py` (pull onto the cloud VM and the demo laptop). Needed for live search on Windows and after a VM rebuild. uvicorn never uses it |
| `CINDIA_HF_REPO` | Cloud environment variable or `.env`. Not secret. The private Hugging Face repo, `<account>/cindia-embed` | `server/b11_embed/` publish and fetch |
| `SPACETIME_URL`, `SPACETIME_DB` | Optional. Defaults `http://127.0.0.1:3000` and `cindia` | `server/` B13 |
| `SPACETIME_TOKEN` | Written to `.env` by the step that publishes the module (B13's plan, D-deploy's setup script), without printing it. Never typed by hand | `server/config.py`, for B13's bridge. The tables are private, and only this identity, the module's publisher, may call the writing reducers |
| `CINDIA_MODEL_DIR` | Optional. Default `models/cindia-embed-v1`, which `.gitignore` lists | `server/` B11, B12, B15 |
| `PUBLIC_SITE_URL` | Cloud environment variable or `.env`, once Gordon has uploaded the public site. Not secret. The site's base URL, Cloudflare Pages or the MLH domain | `server/` B15: the sandbox market is `<PUBLIC_SITE_URL>/market/`. Unset, B15 runs on its fixture and the watch stays scripted |
| `VITE_PUBLIC_SITE` | `1` only for the public build, which `npm run build:public` makes (D-deploy). A public-build flag, not a secret, read only by `src/app/site.ts` | the shell: no Pay and no Live switch on the public build |

- **Network secrets** (cloud only) keep a key outside the VM. Elastic: header `Authorization`, prefix `ApiKey` (not the default `Bearer`), allowed hosts `*.elastic.cloud`, which covers both project endpoints (on a Team plan without the admin role, two secrets, one per host). Apify: header `Authorization`, prefix `Bearer`, host `api.apify.com`. The Anthropic key and the Nessie key can't use one: the proxy never attaches a secret to `api.anthropic.com`, and Nessie reads its key from the query string.
- The keys `GET /api/health` reports become `{ anthropic, nessie, elastic, apify, hf }`, each a boolean. A key counts as set when its variable is set or its `*_AUTH=proxy` flag is, and `elastic` also needs `ELASTIC_URL`. A new `services` object reports `{ spacetime: boolean, model: boolean }`: SpacetimeDB answers, and the trained model is on disk. Whether `PUBLIC_SITE_URL` is set comes from `GET /api/b15/status` (section 5).
- `server/config.py` exposes the names above, plus `HF_REPO` (from `CINDIA_HF_REPO`), `MODEL_DEFAULT` (`claude-sonnet-5-5`), `MODEL_FAST` (`claude-haiku-5-5`), `ALLOWED_MODELS` (exactly those two) and `CLAUDE_BASE_URL` (`https://api.anthropic.com`, a constant, never from the environment, passed by every Claude client).
- The command guard blocks reads of `.env`, `printenv`-style commands, and any command that names a variable ending in `_KEY`, `_TOKEN` or `_SECRET`. The G6 secrets scan reads the key values from `.env` and from the process environment, in memory only. Never echo a variable that holds a key.

## 2. Data model additions (`data-model.md`)

Units, ID rules and the v1 entities stay. R0 re-skins v1's studio: `std_dine`, "Diné Weaving and Silver Co-op", craft "Wool weavings, silver and turquoise jewelry", place "Navajo Nation, Arizona". Its owner Shen Ruolan becomes Ruth B., and the makers Lu Yun, Han Jing and Zhou Mei become Grace N., Lena T. and Mae K. The gallery stays Fogline Gallery, San Francisco. `pc_01` becomes a small wool weaving in grey, red and black by Grace N., with the same 26 hours, $22 of materials and $180 price, and the other eleven pieces become weavings and silver pieces at their v1 numbers. `docs/plans/R0-reskin.md` holds the full old-to-new table.

### Communities

Four fictional Native American communities. The Diné co-op is the named community the demo follows.

| ID | Kind | People and place | Craft | Lead | Makers | Pieces | Storefront | Project |
|---|---|---|---|---|---|---|---|---|
| `com_dine` | native_american | Diné Weaving and Silver Co-op (the studio `std_dine`), Navajo Nation, Arizona, USA | Wool weavings, silver and turquoise jewelry | `own_01` | `mkr_01` to `mkr_03` | `pc_01` to `pc_12` | `sto_01`, `dine-weavers` | `prj_01` |
| `com_ojibwe` | native_american | An Ojibwe beadwork co-op, Minnesota, USA | Floral beadwork: earrings, pouches and necklaces | `own_02` | `mkr_04` to `mkr_08` | `pc_13` to `pc_26` | `sto_02`, `ojibwe-beadwork` | `prj_02` |
| `com_acoma` | native_american | An Acoma pottery studio, New Mexico, USA | Coil-built, hand-painted pottery | `own_03` | `mkr_09` to `mkr_13` | `pc_27` to `pc_40` | `sto_03`, `acoma-pottery` | `prj_03` |
| `com_seminole` | native_american | A Seminole patchwork co-op, Florida, USA | Patchwork skirts and jackets | `own_04` | `mkr_14` to `mkr_17` | `pc_41` to `pc_54` | `sto_04`, `seminole-patchwork` | `prj_04` |

- Every community, person, piece, story, storefront, approval and statement is fictional demo data in `src/mock/`. Craft descriptions use only the sourced safe craft lines in `S3-catalog.md`, one per craft, and write nothing beyond them.
- **Words.** "Native American", and nation names "Diné (Navajo)", "Ojibwe", "Acoma Pueblo" and "Seminole". In Chinese: 美洲原住民, and 纳瓦霍（Diné）, 奥吉布瓦（Ojibwe）, 阿科马（Acoma）, 塞米诺尔（Seminole）. Never "Indian American", which means Americans of South Asian descent, and never a nation's name as a product word ("Navajo rug").
- **Kept out of the catalog.** No sacred, ceremonial or medicine object, and nothing that copies a nation's protected design. In particular: no Yei or sandpainting designs, no whirling-log designs, no katsina figures, no feathers of any kind, no headdresses or dance regalia, no ceremonial, prayer or medicine items, no pipes, masks, drums or rattles, no dreamcatchers or totems, and none of ivory, bone, whalebone, baleen, sealskin or fur. The color is "cream", never "ivory", and no stitch or pattern is called "feather". These words appear only in a community's `protocols` and in `contentRules`.
- Gu embroidery and the other Peoples of the earlier plan (Māori, Sámi, Inuit, Quechua, Maasai, Miao) are next, each only with that community's own organizations. None of them is in the data, the art, the eval set, the slugs or the labels.

### New and changed entities

| Entity | ID | Fields |
|---|---|---|
| Community | the four above | `name: Text`, `kind: "native_american"`, `people: Text` (the nation, as the Words line writes it), `place: Text`, `craft: Text`, `about: Text` (two plain third-person sentences about the craft and what the co-op makes, shown as a placeholder under L8, never as the community's own words), `protocols: Text[]` (Cindia's demo exclusions in plain words, shown under L9, never phrased as the nation's rule), `verification: { method: "nation_attestation"; by: Text; note: Text }`, `languages: string[]` (BCP 47 tags, display only), `leadId`, `makerIds`, `studioId?` (`std_dine` for `com_dine` only), `storefrontId`, `projectIds`, `demo: true` |
| Person (changed) | `own_01` to `own_04`, `mkr_01` to `mkr_17`, `buy_01` to `buy_20` | v1 fields, plus `communityId?` (owners and makers), `nativeName?: string` (unset for everyone in v2), `languages?: string[]`, `receiptNote?: Text` (makers: two plain lines for the buyer's paid receipt, demo data). Owners and makers carry a common English given name and a family initial ("Grace N."), with `surnameChar` the initial. Never a full family name or a name in a Native language. `lang` stays `"zh" \| "en"`, and every owner and maker has `"en"`: the maker page opens in English, and Chinese stays the platform's second interface language |
| Piece (changed) | `pc_01` to `pc_54` | v1 fields, plus `communityId`, `facets: { object: Text; materials: string[]; techniques: string[]; motifs: string[]; colors: string[]; sizeCm?: { w: number; h: number }; oneOfAKind: boolean; leadTimeDays: number }`, `vibe: { moods: string[]; occasions: string[]; recipients: string[] }`, `imageAlt: Text`. Facet and vibe words are lowercase English. Titles name the object and its colors or pattern. `heritage` is the community's one safe craft line, the same for each of its pieces. `process` steps are physical (prepare the wool, dye, warp, weave, cast, polish, coil, paint, fire, piece, sew), and their hours still add up. `motifs` are plain visual words and never say what a motif means. `image` is `/images/<pieceId>.svg`, an original illustration, labeled as one, and a placeholder SVG exists for every piece before G2b |
| IndexEntry | one per piece, keyed by `pieceId` | `pieceId`, `communityId`, `makerId`, `storefrontSlug`, `provenance: Record<string, "maker" \| "community" \| "agent:tagger" \| "agent:describer">` (one entry per field group: `facts`, `culture`, `vibe`, `picture`), `approvedBy` (the maker), `pictureNote: Text` (what the Describer would see), `embedText: string` (the passage, built by the rule below), `salesThisMonth: number`, `status: "active" \| "draft"`. `provenance` shows who writes each layer in a real launch. In this demo the Cindia team wrote every layer, and the Describer never ran |
| Project | `prj_01` to `prj_04`, one per community, in community order | `communityId`, `title: Text`, `summary: Text` (what the money pays for and how much, plainly), `goalCents`, `raisedCents`, `addOnCents: 500` (the checkout contribution), `updates: { date; text: Text }[]` |
| WorkInProgress | `wip_01` to `wip_03` | `communityId`, `makerId`, `buyerId`, `title: Text`, `priceCents`, `milestones: { milestoneId; label: Text; shareBps; status: "pending" \| "reached" \| "paid"; date? }[]`. Milestone IDs are `mls_01` onward. The `shareBps` of one commission add up to 10000. `wip_01` is a Diné co-op commission by one of `mkr_01` to `mkr_03`: `mls_01` paid, `mls_02` and `mls_03` pending |
| Storefront | `sto_01` to `sto_04`, in community order | `communityId`, `slug` (`dine-weavers`, `ojibwe-beadwork`, `acoma-pottery`, `seminole-patchwork`), `theme: { accent: string; layout: "story_first" \| "grid_first" }` (accent is a kit color token name, never a raw hex), `blocks: { blockId; kind: "hero" \| "story" \| "pieces" \| "process" \| "projects" \| "visit"; props: Record<string, string \| string[]> }[]` (props as section 11 lists them), `status: "draft" \| "published"`. All four are published. Block IDs are `blk_01` onward |
| ListingDraft | `lst_01` (the demo listing) | `makerId`, `notes: string` (the maker's own words, in English), `lang` |
| AgentSpec | the agent IDs in section 6 | `agentId`, `name: Text`, `job: Text`, `kind: "claude" \| "code"`, `model?: "claude-haiku-5-5" \| "claude-sonnet-5-5"`, `tools: string[]`, `never: Text` |
| SearchQuery (eval) | `sq_001` to `sq_050` | `text`, `lang: "en" \| "zh"`, `grades: Record<pieceId, 1 \| 2>` (2 is a perfect match, 1 a good one), `author: "data_agent" \| "gordon"`. Held-out test queries, written separately by our data agent and never used for training. The pieces they grade are in training, and only the queries are held out. A query Gordon writes or edits carries `author: "gordon"`, and the report scores those as their own row |
| CounterfeitCandidate | `cft_01` to `cft_04` | `url` (its sandbox market page, `/market/<cftId>.html`, or a page on `example.com` or `example.org`), `title`, `snippet`, `pieceId` (the co-op's piece it resembles), `similarity` (normalized, 0 to 1), `claim: Text`, `verdict: "possible_copy" \| "claim_only" \| "neither"`, `seller?: string` (an invented seller name), `priceCents?: number`. D-deploy's market pages print the seller and the price |
| ScriptedRun | `run_01` onward | `runId`, `side`, `threadId`, `trigger`, `steps` (`swarm.step` payloads without `threadId`), `final` (an ordered list of events). The fields are I2-core's `ScriptedRun` type (section 11) |

Approval gains kinds: `"follow_up" | "maker_payouts" | "listing_publish" | "storefront_publish" | "report_listing" | "milestone_release" | "support_action"`. Demo approvals added: `apr_03` (report `cft_01`), `apr_04` (publish `lst_01`), `apr_05` (release `wip_01`'s second milestone). Party gains kind `"community_fund"`, with `id` the project ID.

**Verification.** `verification.note` follows one pattern for all four: "In a real launch, makers would be enrolled members of the [nation] or certified by it as Indian artisans, as the U.S. Indian Arts and Crafts Act defines. Cindia would keep only a yes or no, never the record. No real check was done for this demo." `by` names the nation and the Act. Cards and pages show it as demo verification (L3, L4).

### The embedded passage

`embedText` follows this rule exactly. A missing part is left out, along with its label.

```text
passage: {facets.object.en} | craft: {community.craft.en}, {community.people.en} | materials: {materials, comma-separated} | techniques: {...} | motifs: {...} | colors: {...} | mood: {vibe.moods} | for: {vibe.occasions}, {vibe.recipients} | {first sentence of story.en}
```

- Lists join with `, `. In `for:`, when one of the two lists is empty, only the other is written, and when both are empty the part is left out.
- The first sentence of `story.en` is the text up to and including the first `. `, `! ` or `? `, or the whole text when it has none, trimmed.
- A query is embedded as `query: ` followed by the person's words, then, only when the person added or edited chips, a comma and those chips joined with `, `. The price chip is a filter and is never embedded. `evaluate.py`, `/api/b11/map` and `/api/b12/search` embed queries the same way.
- Each input carries exactly one `passage: ` or `query: ` prefix, written in the text. The code never uses sentence-transformers' `prompts` or `encode_query()`. The prefixes are what the e5 model family expects.

### New demo-critical figures

G2b checks every one of these as well as the ten from v1, which keep their numbers through R0. Figure 2 (the concierge's curated set) is checked on `curatedSet` and on the scripted concierge answer, because the v2 tour has no concierge beat.

11. **The vibe query** in `d01-vibe` is exactly `a warm, bold gift for my mom. she loves red wool. under $200`. Its keywords are exactly `warm`, `bold`, `red`, `wool`, `gift for mom`, `under $200`, in that order (moods, then facet words, then the recipient through the alias `mom`, then the price). The scripted results are six pieces, all priced at 20000 or less, in this order: `pc_01` (Grace N.'s small grey, red and black wool weaving, matching all five word chips), `pc_07` (Lena T.'s red and grey wool mini weaving, four) and `pc_11` (Lena T.'s red and white wool weaving, four), then `pc_14` (red and green floral beaded earrings, Ojibwe, three), `pc_30` (a small black and orange seed pot, Acoma, three) and `pc_43` (a red, yellow and black patchwork skirt, Seminole, three). Each result's `matched` lists exactly the chips that piece carries. Every other piece at 20000 or less carries at most two of the five word chips.
12. **Surprise me** in `d02-surprise` uses keyword `geometric`, method `fair_random` and seed 10, and draws the piece `S3-catalog.md` T6 names: a piece whose maker has had few sales this month. `geometric` is carried only by Acoma and Seminole pieces, twelve at most, so every one of them is a candidate and the candidates come from two communities. mulberry32 seeded with 10 returns 0.5020 first, so the weights do the picking, and `S3-catalog.md` T6 sets `salesThisMonth` so the draw lands there. The scripted draw in `src/sources/surprise.ts` proves it.
13. **The project add-on:** with `ord_001` the buyer adds 500 to `prj_01`, the Diné co-op's project, as `project.funded` `ctb_01`. `ord_001`'s own figures don't change. Cindia passes the full 500 to the fund: `mv_0101` buyer to Cindia and `mv_0102` Cindia to `community_fund` `prj_01`, both with `refId` `ctb_01` and date `2026-09-01`. The add-on starts off, and the switch reads on once a `project.funded` for this checkout is in the store, so the tour shows it on in `d05-pay`. `src/mock/` exports the records as `demoContribution` and `demoFundMoves`, and the tour builds its events from them.
14. **The counterfeit hit:** `cft_01` copies `pc_01`. Its title names the co-op and Grace N., its snippet repeats `pc_01`'s first story sentence, and its claim says Grace N. of the co-op made it, though she never listed it there. Its scripted text match is 0.91 (L19), its verdict `possible_copy`, and `apr_03` proposes reporting it. `cft_02` is the claim-only listing ("Authentic Native American made", no maker named): verdict `claim_only`, shown with L22 and no report button. `cft_04` covers a low score. Every candidate URL is on the sandbox market, `example.com` or `example.org`.
15. **The search proof** is never invented. `src/mock/model.ts` holds `report: null` until B11's first real training run, then the orchestrator has the data-smith copy that report in. The data tests assert that `report` is null or equals `server/b11_embed/report.json` exactly. Panels with no report say "Not trained yet".
16. **The split comparison:** on `pc_01`'s piece page the split shows what Grace N. would get through the gallery under its contract: 18000 gross minus the contract's 4000 bps commission (7200) minus 2200 materials, 8600 cents, against 13448 on Cindia. Code computes both with the money rules in `data-model.md`. Neither is typed in.

### New files in `src/mock/`

| File | Holds |
|---|---|
| `communities.ts` | The four communities |
| `people.ts` (changed) | Adds `own_02` to `own_04` and `mkr_04` to `mkr_17`, and the exports `leads` and `allMakers` |
| `catalog.ts` (changed) | Adds `pc_13` to `pc_54` and the new fields on all 54 |
| `searchIndex.ts` | The 54 IndexEntry records, `keywordAliases` and `vibeVocabulary` (the closed vibe list) |
| `search.ts` | The scripted vibe-search answer for `d01-vibe` and the demo's surprise draw |
| `searchEval.ts` | The 50 held-out eval queries |
| `projects.ts` | Projects, works in progress and their milestones, `apr_05`, `demoContribution` and `demoFundMoves` |
| `storefronts.ts` | The four storefronts |
| `agents.ts` | The agent roster from section 6 |
| `swarm.ts` | The scripted swarm runs (section 11's run list), `demoQuestions` and `makerQuestions` (`qst_01` and its scripted answer `ans_01`) |
| `listings.ts` | `lst_01`, its scripted draft and `apr_04` |
| `watch.ts` | The counterfeit candidates, `scriptedScan`, `fup_02` and `apr_03` |
| `model.ts` | `modelId: "cindia-embed-v1"` and `report` (null until the first real run) |
| `policy.ts` | Shipping, returns and care topics, which the Clerk reads |
| `splits.ts` | `splits`, one `split.shown` payload per piece under the `ch_cindia` rules, with the gallery comparison on the co-op's twelve, and `gallerySplits`, the same comparison by `pieceId` |
| `database.ts` | `demoDataSync`, the scripted `data.synced` payload for `d15-listing` |
| `contentRules.ts` | `contentRules`, the one list the data tests, B11, B14 and B15 check text against (section 11) |
| `timelines/demo.ts` (changed in I2-tour) | The tour from section 8 |

## 3. Events (`events.md`)

The envelope, the store and the player stay. These change:

- `SourceKey` adds `"b11-embed" | "b12-search" | "b13-live" | "b14-swarm" | "b15-watch" | "b16-bank-books"`. B16's adapter is `src/sources/live/b16-bank-books.ts`.
- `beat.started` payload adds `process?: ProcessId`, which opens that process view during the beat, and `drawer?: "support" | "ask" | "audit"`, which opens that drawer. A beat may carry more than one `beat.started` with the same `beatId`.
- `ProcessId` is `"search" | "swarm" | "checkout" | "money" | "reconcile" | "approvals" | "close" | "proof" | "watch" | "model" | "data"`, eleven processes in this order.
- `money.moved` `kind` adds `"project_fund" | "milestone"`. The tour's v2 moves are `mv_0101` and `mv_0102` (figure 13), so v1's `mv_0001` to `mv_0006` keep their numbers. A person's milestone release takes `mv_user_<n>`.
- `card.tokenized` adds `pieceId?`. Every v2 producer sets it, and the buyer store keeps `checkout` and `card` by piece.
- `search.mapped` adds `approx?: boolean`, true when the points come from scripted data.
- `approval.requested` adds `approval?`, an inline approval `{ kind, subjectIds, amountCents?, overLimit, proposedBy: "cindy", summary: Text, decisionDate }` for an approval that isn't in `src/mock/` (IDs `apr_user_<n>`). The approvals reducer stores it, and the approvals feature renders it when `getById()` finds nothing.
- `split.shown` adds `compare?: { channelId: "ch_gallery"; commissionBps; makerShareCents }`, what the maker would get for the same piece through the gallery (figure 16).
- **Per-key timeouts.** The registry gives `produce()` 8 seconds by default, 20 seconds for `b14-swarm` and 60 seconds for `b15-watch`. Each adapter aborts 0.5 seconds earlier.
- Events a live adapter pushes through `start(emit)` take `at` from the player clock when they arrive.
- **Store keys added:** `search`, `surprise`, `support`, `swarm`, `listings`, `projects`, `wip`, `model`, `watch`, `storefront`, `questions`, `sync` (`sync.data`, the newest `data.synced`, and `sync.index`, the newest `index.synced`), `log` (section 11) and `demo.process` and `demo.drawer`. `I2-core` writes a reducer for every new type, with unit tests. Features add none.

### New event types

| Type | Payload | Key |
|---|---|---|
| `search.queried` | `queryId`, `text`, `keywords: string[]`, `lang`, `filters?: { maxPriceCents?: number; communityIds?: string[] }` | |
| `search.answered` | `queryId`, `results: { pieceId; score; closeness?; matched: string[]; reason: Text }[]` (at most 12, best first, `score` scaled so the best is 1, `closeness` the normalized cosine to the query from 0 to 1 when a model answered), `closeMatches?: boolean` (false when no result is close, and the screen says "no close matches"), `engine: "elastic_hybrid" \| "local_hybrid" \| "keyword_scripted"`, `modelId?`, and `keywords?: string[]`, `filters?` and `keywordsBy?: "finder" \| "rules"` (set only when the Finder wrote the chips) | `b12-search` |
| `search.mapped` | `queryId`, `modelId`, `points: { pieceId; x; y }[]` (all pieces), `query: { x; y }`, `method: "pca"`, `approx?` | `b11-embed` |
| `surprise.asked` | `surpriseId`, `keyword?`, `method: "keyword_random" \| "pure_random" \| "fair_random"`, `seed` | |
| `surprise.drawn` | `surpriseId`, `pieceId`, `method`, `seed`, `candidates: { pieceId; weight }[]` (weights sum to 1, section 11) | `b12-search` |
| `support.asked` | `threadId`, `side: "buyer" \| "seller"`, `text`, `lang`, `contextIds: string[]` (the records on screen: a piece, an order or a listing, a store page's community, or a maker page's maker) | |
| `swarm.step` | `runId`, `threadId`, `stepId` (`stp_0001` onward), `agentId`, `kind: "route" \| "call" \| "tool" \| "result" \| "check" \| "handoff" \| "reply"`, `summary: Text`, `toolName?`, `ms`, `model?` | `b14-swarm` |
| `support.answered` | `threadId`, `runId`, `agentId` (the agent whose words these are, usually `writer`), `reply: Text`, `refIds: string[]`, `approvalIds?: string[]` | `b14-swarm` |
| `support.escalated` | `threadId`, `runId`, `reason: Text`, `approvalId` | `b14-swarm` |
| `question.forwarded` | `questionId` (`qst_`), `threadId`, `makerId`, `pieceId`, `text` (the buyer's question, as asked), `lang` | `b14-swarm` |
| `question.answered` | `questionId`, `answerId` (`ans_`), `makerId`, `text` (the maker's own words, exactly as she wrote them, never rewritten by an agent), `lang` | `b14-swarm` |
| `listing.requested` | `listingId`, `makerId`, `notes`, `lang` | |
| `listing.drafted` | `listingId`, `makerId`, `title: Text`, `summary: Text`, `facets` (as on Piece, except that `oneOfAKind` and `leadTimeDays` are optional), `hours?` (from the notes), `vibe` (as on Piece), `checks: { checkId; kind: "protocol" \| "facts" \| "price"; ok: boolean; note: Text }[]` | `b14-swarm` |
| `listing.indexed` | `listingId`, `pieceId`, `modelId`, `embedText`, `index: "cindia-drafts" \| "cindia-pieces"`, `point?: { x; y }` (the new vector's dot on the map), `approx?` | `b14-swarm` for the Indexer's draft. B12's publish sends it keyed `b12-search` |
| `storefront.requested` | `storefrontId` | |
| `storefront.drafted` | `storefrontId`, `blocks` (as on Storefront) | `b14-swarm` |
| `storefront.published` | `storefrontId`, `slug`, `blocks` (as on Storefront: the owner's working copy at publish) | |
| `project.funded` | `contributionId` (`ctb_01` onward), `projectId`, `amountCents`, `buyerId`, `orderId?` | |
| `wip.milestone_reached` | `wipId`, `milestoneId`, `date` | |
| `wip.milestone_paid` | `wipId`, `milestoneId`, `amountCents`, `date` | |
| `model.trained` | `modelId`, `baseModel`, `pairs`, `epochs`, `dims`, `hubUrl?` | `b11-embed` |
| `proof.search_scored` | `modelId`, `k: 5`, `queries`, `systems: { system: "keyword" \| "base" \| "custom" \| "hybrid"; recallAtK; mrr }[]` (`mrr` is MRR at 10) | `b11-embed` |
| `watch.started` | `scanId`, `makerId`, `queries: string[]` | |
| `watch.scanned` | `scanId`, `engine: "apify" \| "scripted"`, `candidates` (a count), `results: { title; url; snippet; similarity: number \| null; verdict: "possible_copy" \| "claim_only" \| "neither" }[]` (every result checked, in the order checked, `similarity` null when no model scored it) | `b15-watch` |
| `counterfeit.flagged` | `cftId`, `scanId`, `pieceId`, `url`, `title`, `snippet`, `similarity`, `claim: Text` | `b15-watch` |
| `data.synced` | `tables: { table; rows; newest: { id; label }[] }[]` (`table` one of `catalog`, `listings`, `orders`, `approvals`, `runs`, `steps`, `processes` and `screens`, with at most three newest rows, each an ID and a label built by code), `screens`, `processes: { processId; status }[]` | `b13-live` |
| `index.synced` | `indexed`, `drafts`, `elastic: boolean`, `agentBuilder: boolean` | `b12-search` |

- `swarm.step` events from B13 carry key `b13-live`, because the B13 adapter delivers them.
- `flag.raised` adds `nessieId?: string`, set only by B16. `money.moved`'s `nessieId?` is set by B04 and by B16. B16 keys only live twins of `flag.raised` and `money.moved`, and no tour event.
- In live mode, background work an adapter starts from `start(emit)` (B13's mirror, B16's checks) is allowed when it never delays or replaces a tour event. It may add a live twin that only adds a field, like `nessieId`.
- The payload rule from v1 applies: `search.answered`, `surprise.drawn`, `support.answered`, `listing.drafted`, `proof.search_scored`, `watch.scanned`, `counterfeit.flagged`, `data.synced` and `index.synced` carry their figures and text, and screens render them from the event.
- `data.synced` comes from the B13 adapter whenever its poll of `GET /api/b13/changes` sees a change. In scripted mode the tour's `d15-listing` beat carries one, built from the mock data (section 11). `index.synced` comes from the B12 adapter after the seed and on each status change.
- `support.escalated` has no scripted producer in the tour. Seeded specs cover its paths.

### Requests from people, added rows

| Request | Key | Scripted answer | Live answer |
|---|---|---|---|
| `search.queried` | `b12-search` | For the demo query with its own chips and filters, the answer in `src/mock/search.ts`. For anything else, the local keyword scorer over `searchIndex` (`src/sources/keywordSearch.ts`), engine `keyword_scripted` | B12 |
| `surprise.asked` | `b12-search` | A seeded draw over the catalog (`src/sources/surprise.ts`, section 11) | B12 |
| `support.asked` | `b14-swarm` | The run in `src/mock/swarm.ts` whose question matches. A run that names a piece answers only when the request's `contextIds` include that piece. Otherwise the fallback run, which replies L16 | B14 |
| `question.answered` | `b14-swarm` | The run whose `question` trigger names the question: the Writer's `support.answered` on the question's thread, quoting the maker's words as she wrote them | B14 |
| `listing.requested` | `b14-swarm` | The run whose notes match `lst_01`'s, re-keyed to the person's listing, or the fallback draft labeled as a sample | B14 |
| `storefront.requested` | `b14-swarm` | The Designer run (`run_03`) for `sto_01`. Any other storefront gets no scripted draft | B14 |
| `watch.started` | `b15-watch` | `watch.scanned` and the candidates in `src/mock/watch.ts`, with a person's hits re-keyed (section 11) | B15 |

The scripted answer starts 1.2 seconds after the request in real time, as in v1. A planned run's step offsets start at 0, and the responder adds the 1.2 seconds, so scripted `swarm.step` events arrive 300 ms apart from 1.2 seconds on, and the final events follow the last step. `project.funded`, `storefront.published` and the `wip.*` events are applied directly. Releasing a milestone goes through an approval, which `b08-approvals` already carries.

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
| `/sell/:view` | Views: `overview`, `listings`, `storefront`, `projects`, `map`, `month`, `close`, `proof`, `dashboard`, `approvals`, `watch`. `?drawer=ask`, `?drawer=audit&ref=<id>`, `?drawer=support`. `/sell/approvals?ref=<approvalId>` selects that approval |
| `/maker/:makerId` | A maker's page: `maker.main`, `maker.side` |
| `/demo` | The guided tour. `?video=1` (video mode), `?mode=present` (presenter mode), `?start=<beatId>` (`?start=catch` is `?start=d08-catch`) |
| Any route `?process=<processId>` | That process's view over the page: `process.view` |
| `/buyer`, `/studio/:view`, `/owner` | Redirect to `/shop`, `/sell/:view` and `/sell/approvals` |
| `/sell/approvals?screen=owner` | The owner's second screen, which B08's adapter polls for |
| `/market/` | The sandbox market: static pages of fictional listings in `public/market/`, outside the shell (D-deploy). The copy watch crawls only these |

An unknown route or view redirects to `/shop`. The demo controls stay on every route. Every page carries L1 in the top bar, `index.html` has `<meta name="robots" content="noindex">`, and `public/robots.txt` disallows everything. On the public build (`VITE_PUBLIC_SITE=1`) every slot gets `publicSite: true`, Pay shows L6 in its place, and the Live switch is hidden. Localhost keeps the demo checkout.

### Surfaces and frames

Desktop only. Every surface is a `PageFrame`, 1440 by 900, with the top bar (`shell-topnav`, 56 px) and the process bar band (64 px) above the page.

| Surface | Frame test ID | Starts in | Pages |
|---|---|---|---|
| `buyer` (the Shop site) | `frame-buyer` | English | Every `/shop` route |
| `studio` (the Sell site) | `frame-studio` | English | Every `/sell` view. The left nav (`shell-nav-<view>`, 184 px) lists the views in the order of the Routes table. The header holds the co-op's name, L2 and Cindy's latest line |
| `maker` | `frame-maker` | The maker's `lang` | `/maker/:makerId` |
| `store` | `frame-store` | English | `/store/:slug` |

- `owner` stays a `SurfaceId` so the approvals feature can tell where it renders, but it no longer has a frame or a route: `owner.main` renders as the Sell site's `approvals` view. `PhoneFrame` leaves the kit's public index, and `frame-owner` is retired.
- Help (`shell-help`) opens `shop.drawer.support` on Shop and store pages and `studio.drawer.support` on Sell views and the maker page.
- Until `I2-tour`, v1's buyer beats play on the legacy page (section 11, Shell and the tour).

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
| `maker.side` | Maker page, right third: their listings, works in progress and questions from buyers | `seller-hub` | `b14-swarm` |

v1 slots stay with their features. `buyer.main` is retired when the buyer feature migrates to `shop.piece.main` and `shop.receipt.main`. `SlotProps` additions are in section 11.

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
| `data` | Data, 数据 | `b13-live`, `b12-search`, `b11-embed` |

- A block's status is `idle` (no events yet), `working` (an event in the last 2 seconds on the player clock, while the player plays), `done`, or `attention` (an open flag, a pending approval or a counterfeit hit). It shows a count, and a Live mark when all its keys are live. The bar shows one summary, Live: N of 11, and one Simulated badge while any key is scripted (A1-15).
- **Presence.** In live mode, while `b13-live` is live, the bar shows "N screens watching" from the newest `data.synced`. In scripted mode it isn't rendered.
- Clicking a block sets `?process=<id>`. Esc or `process-view-close` clears it. Every view ends with the raw event log for its event types (`process-log`), newest last: time, type, source, key.
- **The data view** lists the database's tables (the catalog, listings, orders, approvals, swarm runs and steps, process status and screens), each with its row count and newest rows. In live mode they come from `data.synced`, and in scripted mode from the mock data and the store.

### Camera states (`/demo`)

Each camera shows one frame at full stage size (the stage is 1440 by 900, scaled to fit), and `beat.started.process` may add a process view over it.

| Camera | Frame and page |
|---|---|
| `pitch` | The beat's pitch card, full frame, with no Shop or Sell frame, top bar or process bar. The words come from `src/app/demo/pitch.ts`, which Gordon writes. Until he does, each card holds placeholder text marked [GORDON] in `pitch.ts`, with no label on screen, and shows L1 at its foot, since the pitch camera has no top bar |
| `shop-home` | `frame-buyer` on `/shop` |
| `shop-search` | `frame-buyer` on `/shop/search` for the latest query |
| `shop-piece` | `frame-buyer` on `/shop/piece/<the open piece>` |
| `shop-receipt` | `frame-buyer` on `/shop/receipt/ord_001` |
| `sell-map`, `sell-month`, `sell-approvals`, `sell-close`, `sell-proof`, `sell-watch`, `sell-listings`, `sell-storefront` | `frame-studio` on that view |
| `sell-catch` | `frame-studio` on `month`, zoomed to the flag and its evidence, as v1's `studio-catch` |
| `maker` | `frame-maker` on `/maker/mkr_01` |
| `store` | `frame-store` on `/store/dine-weavers` |

**Phase A mapping** (`I2-shell`, so v1's beats keep passing on the desktop shell until `I2-tour`): `buyer` and `receipt` → `shop-legacy` (`frame-buyer` on `/shop/legacy`), `buyer-studio` → `sell-map`, `studio-month` → `sell-month`, `studio-catch` → `sell-catch`, `studio-owner` → `sell-approvals`, `studio-close` → `sell-close`, `maker` → `maker`. `demo-script.md` gets a Phase A column after its Camera column. `I2-tour` removes `shop-legacy`.

**Modes and starts:**
- `/demo` auto-plays every beat and ends on the end card. The tests use it.
- **Video mode** (`?video=1`): a 5-second cold open at 153.999, the last millisecond of `d08-catch`, on `sell-catch` with v1's line. Then the spine with each pitch card held for 10 seconds instead of 20 (the player seeks to the next beat), the buyer and seller minutes at 1x, no controls or beat label, and the end card for 5 seconds. About 2 minutes 40 seconds, under Figma's 3-minute limit. Chapter 2 isn't in the video.
- **Presenter mode,** `/demo?mode=present`, pauses at the end of every beat. Space or the right arrow plays the next beat, and the left arrow replays the current one. After `d12-receipt` it shows the end card, and the right arrow continues into chapter 2.
- `?start=<beatId>` seeks to that beat's first event and plays from there, pausing at its end in presenter mode. `?start=catch` and the `demo-start-at-catch` control seek to `d08-catch`.
- **The end card** carries the search proof with L28, the planted-error score, the list of live sources with L29, L30, and one seats line: "Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money."

### Test IDs added

Shell: `shell-topnav`, `shell-side-shop`, `shell-side-sell` (the Shop and Sell switch), `shell-help` (opens the support drawer), `shell-nav-<view>`, `frame-store`, and the process slots' containers and placeholders, `slot-process-bar` and `slot-process-view`. The shell renders no `process-` test ID of its own. The tour adds `pitch-card-what`, `pitch-card-why` and `pitch-card-how`.

| Test ID | Feature | Element |
|---|---|---|
| `pitch-card-what`, `pitch-card-why`, `pitch-card-how` | the stage (`I2-tour`) | The three pitch cards |
| `process-bar` | process | The process bar |
| `process-block-<processId>` | process | One block |
| `process-live-summary` | process | "Live: N of 11" |
| `process-presence` | process | "N screens watching", live mode only |
| `process-view` | process | The open process view |
| `process-view-close` | process | Closes the view |
| `process-pane-<processId>` | process | The root of each view's body |
| `process-log` | process | The raw event log at the end of a view |
| `process-search-map` | process | The embedding map in the search view |
| `process-swarm-graph` | process | The agent graph in the swarm view |
| `process-swarm-step-<stepId>` | process | One step in the swarm view |
| `process-money-diagram` | process | The money view's diagram |
| `process-model-card` | process | The model view's training summary |
| `process-data-tables` | process | The data view's tables and row counts |
| `search-input` | search | The vibe search box, on `/shop` and on `/shop/search` |
| `search-chip-<n>` | search | Keyword chip number n, from 1, in order |
| `search-submit` | search | Search |
| `search-results` | search | The results grid |
| `search-result-<pieceId>` | search | One result card |
| `search-reason-<pieceId>` | search | Why it matched |
| `search-engine` | search | Which engine answered, with the model's score when a report exists |
| `search-surprise` | search | Surprise me, on `/shop` and on `/shop/search` |
| `search-surprise-mode` | search | The mode picker: keyword, pure random, fair random |
| `search-surprise-result` | search | The drawn piece, with the method named, on `/shop` and on `/shop/search` |
| `search-surprise-rule` | search | The fair rule in one line ("Makers with fewer sales this month get a bigger chance") |
| `search-proof` | search | Sell › Proof side panel: the model's score table |
| `search-proof-row-<system>` | search | One row: keyword, base, custom, hybrid |
| `community-card-<communityId>` | communities | A community card |
| `community-page` | communities | A community page |
| `community-verification` | communities | How its makers would be verified |
| `community-protocols` | communities | What this demo keeps out, under L9 |
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
| `support-forwarded-<questionId>` | support | The notice in the buyer's thread that the question went to the maker |
| `support-maker-answer-<questionId>` | support | The maker's own words, shown in the buyer's thread with her name |
| `buyer-verification` | buyer | The verification line on the piece page |
| `buyer-split-compare` | buyer | The gallery comparison under the split (figure 16) |
| `buyer-project-addon` | buyer | The project contribution at checkout |
| `buyer-receipt-promise` | buyer | Under the received status: "We'll show you when Grace N. is paid." |
| `buyer-receipt-maker-note` | buyer | The maker's note on the paid receipt |
| `seller-overview` | seller-hub | Sell › Overview |
| `seller-listing-notes` | seller-hub | The maker's notes box |
| `seller-listing-draft` | seller-hub | The drafted listing |
| `seller-listing-check-<checkId>` | seller-hub | One check on the draft |
| `seller-listing-indexed` | seller-hub | The indexed line: the model, the index and the new dot |
| `seller-listing-approve` | seller-hub | Propose publishing (an approval) |
| `seller-maker-side` | seller-hub | The maker page's side panel |
| `seller-maker-questions` | seller-hub | Questions from buyers on the maker page |
| `seller-maker-question-<questionId>` | seller-hub | One forwarded question |
| `seller-maker-reply-<questionId>`, `seller-maker-send-<questionId>` | seller-hub | The maker's reply box and Send |
| `seller-maker-answer-<questionId>` | seller-hub | Her sent answer |
| `storefront-builder` | storefront | Sell › Storefront |
| `storefront-block-<blockId>` | storefront | One block in the builder |
| `storefront-preview` | storefront | The live preview |
| `storefront-publish` | storefront | Publish |
| `store-page` | storefront | A storefront page at `/store/:slug` |
| `store-footer` | storefront | The storefront's footer, with L13 |
| `watch-scan` | watch | Scan now |
| `watch-results` | watch | The hits, then every checked result |
| `watch-item-<cftId>` | watch | One hit, side by side with the co-op's piece |
| `watch-similarity-<cftId>` | watch | Its text match (L19) |
| `watch-report-<cftId>` | watch | Propose a report (an approval) |
| `watch-dismiss-<cftId>` | watch | L23, with the same weight as the report button |
| `watch-fairness` | watch | The fairness line with L20 |

## 5. API (`api-contract.md`)

The v1 rules stay: `/api/bNN/` prefixes, `{ "events": [...] }` responses, the error shape, no keys in logs, and the Claude rules (no `temperature`, `top_p`, `top_k`, no enabled thinking, no prefill, structured outputs through `messages.parse()` or strict tools, every ID and amount checked against the request). These rules widen:

1. **Timeouts:** per key, as section 3 gives them: `produce()` gets 8 seconds by default, 20 for `b14-swarm` and 60 for `b15-watch`, the adapter aborts 0.5 seconds earlier, and each endpoint finishes at least 0.5 seconds before that.
2. **Nothing in the browser calls an outside service:** Claude, Nessie, Elastic, Apify, Hugging Face, or SpacetimeDB on port 3000. Only `server/` does.
3. **Errors:** `key_missing` names any key the upgrade needs, and `upstream_timeout` and `upstream_error` cover every outside service, SpacetimeDB included. One new code: `busy`, status 503, when the server is already running two swarm runs or one scan, so the scripted answer plays.
4. **What the server reads:** only what the request carries, except that B11, B12, B14 and B15 (and their tests) also read `artifacts/mock/mock.json`, which `npm run export:mock` writes from `src/mock/`. B11 trains from its committed copy, `server/b11_embed/data/mock.json`. B14 and B15 read `contentRules` from it.

Also for every v2 router:
- `side` in a request is a UI hint, not an access boundary. Buyer-side requests carry the pieces, communities, policy, index entries, the roster, the makers of the pieces on screen and only the orders in `contextIds`, and never payouts or maker statements.
- Limits: `text` at most 1,000 characters, an `image` at most 4 MB and PNG or JPEG by its magic bytes, a body at most 2 MB, all else `bad_request`.
- Web text (B15's found titles and snippets) is untrusted. It is cut to 300 characters and passed to a model only inside a delimited data block that the system prompt names as untrusted, and only `http` and `https` URLs are kept.
- `evt_live_` IDs never repeat across server restarts: each router writes `evt_live_` followed by its two-digit number, the server's start time as six digits (Unix seconds modulo 1,000,000) and a four-digit count from 0001, as one number. B13's IDs come from the row instead (B13 below).
- uvicorn runs with `HF_HUB_OFFLINE=1`, and no server module calls out at import time. `server/main.py` keeps the `httpx` loggers at WARNING, and when a router fails to load it logs the missing module's name.
- Models: only `claude-haiku-5-5` and `claude-sonnet-5-5`. A test fails on any other model ID.

### B11 · the embedding model (`b11-embed`)

- **Training is a script, not an endpoint:** `python server/b11_embed/train.py`. It reads `server/b11_embed/data/mock.json`, writes training pairs to `server/b11_embed/pairs.jsonl` (committed), fine-tunes the base model, scores it on `searchEval` against keyword search, the base model and hybrid, and writes:
  - the model to `CINDIA_MODEL_DIR` (not committed),
  - `server/b11_embed/report.json` (committed), with the model's sha256, a hash of the 54 passages and their fingerprint,
  - `server/b11_embed/vectors.json` (committed: the fingerprint, the PCA, and per piece the vector and its 2D coordinates).
- **Where it trains:** the cloud VM by default (B11's settings make it fit 2 vCPUs, 15 to 30 minutes), or Gordon's lab GPU machine with `scripts/train-akbari.sh`.
- **The hand-off is the Hugging Face repo.** With `HF_TOKEN` and `CINDIA_HF_REPO` set, `publish.py` publishes the model, its card and `report.json` to the private repo. `python server/b11_embed/fetch_model.py` pulls the newest onto the cloud VM and the demo laptop. A model, `vectors.json` and an Elastic index that don't share one fingerprint are refused: `trained` is false, and B12 reseeds an index whose fingerprint differs.
- **Base model:** `intfloat/multilingual-e5-small` (384 dimensions), so Chinese and English queries share one space. The builder may pick another open model if this one won't train in the cloud, and records why in its report.
- **Training pairs:** a build-time prompt to `claude-sonnet-5-5` writes 20 buyer-style queries per piece about the fictional catalog, in mixed voices, about a fifth in Chinese, plus filtered hard negatives. A query that hits `contentRules` is dropped and counted. Every pair is kept in `pairs.jsonl` for audit. Eval queries never enter training. The model card says the data is synthetic queries about fictional pieces and names what the model is not for: classifying, ranking or verifying real makers or their work.
- **`GET /api/b11/model`** · no key · under 200 ms · returns `{ "trained": boolean, "warm": boolean, "modelId": string | null, "baseModel": string | null, "dims": number | null, "fingerprint": string | null, "problem": string | null }` (not an events response). The first call starts loading the model in a background thread. The B11, B12 and B15 adapters' `health()` need `trained` and `warm`.
- **`POST /api/b11/report`** · no key · under 1 second · `{ "trigger": ... }` → `model.trained` and `proof.search_scored` from `report.json`.
- **`POST /api/b11/map`** · no key · under 2 seconds once warm · `{ "trigger": ..., "queryId": ..., "text": ..., "keywords": [] }` → `search.mapped` (all pieces' PCA points plus the query's). Called by the B11 adapter and by the B12 adapter for a person's search. `[]` while the model isn't trained or warm.
- **Fallback:** the scripted `model.trained`, `proof.search_scored` and `search.mapped` from `src/mock/model.ts`, or nothing when the report is null.

### B12 · search (`b12-search`)

- **`POST /api/b12/seed`** · Elastic key or `ELASTIC_AUTH=proxy` · answers at once and seeds in a server thread for up to 60 seconds, started by the adapter's `health()` in live mode, single flight · `{ "trigger": null, "passagesHash": string }` → `{ "events": [] }`. It seeds from the server's own `mock.json` and B11's `vectors.json`, never from the body, which carries only the hash to compare. It answers 400 `bad_request` when there are no vectors with B11's current fingerprint, or when the hash differs from the server's. It creates `cindia-pieces-v1` behind alias `cindia-pieces` and `cindia-drafts-v1` behind alias `cindia-drafts`, and writes one document per piece: the facet fields, the community fields, `embedText`, `vector` (`dense_vector`, 384 dimensions, cosine, `index_options.type: int8_hnsw`) and the fingerprint. `resource_already_exists_exception` counts as success. It then creates or updates the Agent Builder agent `cindia-finder` and runs one test conversation, inside the same 60 seconds.
- **`GET /api/b12/status`** · no key · under 1 second, always from a cache a background thread refreshes every 30 seconds in live mode · `{ "elastic": boolean, "indexed": number, "drafts": number, "fingerprint": string | null, "agentBuilder": boolean, "seeding": boolean, "seedError": string | null }` (not an events response). `seeding` is true until a seed finishes, and `seedError` is null or one plain sentence. It never runs a conversation. The adapter's `health()` reads it and emits `index.synced` when it changes.
- **`POST /api/b12/publish`** · Elastic key or proxy flag · under 3 seconds · `{ "trigger", "listingId", "pieceId", "approvalId" }` → one `listing.indexed` (`index: "cindia-pieces"`, keyed `b12-search`). When the owner has granted a person's listing, it copies the draft from `cindia-drafts` into `cindia-pieces` and deletes the draft. A missing draft is 404 `not_found`.
- **`POST /api/b12/search`** · no key needed, Elastic optional · under 4 seconds · `{ "trigger", "queryId", "text", "keywords", "lang", "filters" }` → `search.answered`:
  - It embeds the query with the B11 model (section 2's rule).
  - It runs a hybrid query in Elastic: a kNN retriever on `vector` and a `standard` retriever with a `multi_match` over the facet fields, `embedText` and the titles, fused with RRF, with the filters applied. Engine `elastic_hybrid`. The whole Elastic path has one 2.5-second budget.
  - Otherwise it runs the same fusion locally over `vectors.json` with a BM25 scorer. Engine `local_hybrid`. Both fusions take only pieces the keyword side matched.
  - Each result's `matched` lists the query keywords found in its facets, `reason` is one short sentence built from those facets (no model call), and `closeness` is the cosine nearness.
- **`POST /api/b12/surprise`** · no key · under 2 seconds · `{ "trigger", "surpriseId", "keyword", "method", "seed" }` → `surprise.drawn`, drawn exactly as `src/sources/surprise.ts` draws (section 11).
- **Drafts:** the Indexer writes a drafted listing to `cindia-drafts` (B12's `index_draft`), and `publish` moves it to `cindia-pieces` once the owner grants its `listing_publish` approval. Before that, no search and no Agent Builder answer returns it. B12's module functions are `search`, `surprise`, `converse`, `index_draft` and `publish`.
- **Elastic Agent Builder:** `cindia-finder` has an `index_search` tool over `cindia-pieces` (tool ID `cindia.search_pieces`). B14 routes find questions to it in code, never by the model's choice, and keeps only the piece IDs it returns. The swarm view labels that step "Elastic Agent Builder". A token-limit error counts as `agentBuilder: false`.
- **Fallback:** the scripted answers in the Requests table.

### B13 · the database (`b13-live`)

SpacetimeDB is the platform's system of record. Elastic is the search index built from it.

- **The module** in `server/b13_spacetime/module/` (TypeScript), database `cindia`, holds the eight tables the data view shows, `catalog` (the 54 pieces, seeded from `mock.json`, plus each published listing's piece), `listings`, `orders`, `approvals`, `runs`, `steps`, `processes` and `screens`, plus `changes` (one row per change, which the feed polls) and `config`. Every row is keyed by an auto-increment `seq`, with the record ID as a plain column. The tables are private, and the writing reducers accept only the publisher's identity (`SPACETIME_TOKEN`). Columns and reducers are as `docs/plans/B13-live.md` writes them, including `clear_runs`, a demo-prep step that deletes every run and step.
- **Running it:** the orchestrator installs the CLI, starts `spacetime start --listen-addr 127.0.0.1:3000` in the background, publishes with `spacetime publish -s local cindia`, and runs `server/b13_spacetime/save_token.py`, which writes `SPACETIME_TOKEN` to `.env` without printing it. Maincloud stays off for the demo.
- **`server/b13_spacetime/bridge.py`** gives the other upgrades their writes (runs, steps, process status, recorded events, the seed), each with a 0.8-second timeout and a 30-second back-off after a failure, sent through one ordered background thread. When SpacetimeDB is unreachable, or `SPACETIME_TOKEN` is unset, each call is a no-op that logs one line.
- **The feed** (`feed.py`): one poller per server process reads `changes` every 500 ms and keeps a snapshot, each table's row count and newest three rows, the process rows, the screens seen in the last 15 seconds, and the newest 500 steps. The endpoints answer from it.
- **`GET /api/b13/changes?after=<seq>&screen=<screenId>&role=<role>`** · no key · under 300 ms · polled every 500 ms by the B13 adapter in live mode · returns `{ "events": CindiaEvent[], "seq": number }`:
  - a `swarm.step` (key `b13-live`) for each step whose change `seq` is above `after`, then one `data.synced` when anything changed above `after`,
  - with `after=0`, a screen's first poll, steps only for runs still going or finished in the last 60 seconds, so a fresh screen never replays an old run, and always one `data.synced`,
  - `seq`, the newest change the answer covers, for the next poll,
  - `screen` is `scr_` plus 6 to 12 letters or digits and `role` is `buyer`, `seller` or `tour`, or the answer is 400 `bad_request`. The call refreshes that screen's row at most every 5 seconds.
  - Event IDs are `evt_live_` plus `131` for a step or `132` for a `data.synced`, the database's epoch modulo 1,000,000 (six digits) and the change's `seq` (nine digits), so a resent row keeps its ID and `log` holds it once.
- **`GET /api/b13/status`** · no key · under 300 ms · `{ "spacetime": boolean, "db": string, "seeded": boolean, "screens": number, "tables": { "table": string, "rows": number }[], "seq": number }` (not an events response). `seeded` is true once `catalog` holds the 54 pieces.
- **`POST /api/b13/seed`** · no key · up to 10 seconds, single flight · `{ "trigger": null }` → `{ "events": [] }`. Builds the catalog, the scripted orders and the scripted approvals from the server's own `artifacts/mock/mock.json`, never from the request.
- **`POST /api/b13/record`** · no key · under 1 second · `{ "trigger": null, "events": CindiaEvent[] }` (at most 50 events and 256 KB) → `{ "events": [] }`. Mirrors orders, approvals and listing states into the database. It checks every ID against section 11's patterns, keeps no text but the catalog's own titles, and ignores every other event type.
- `seed` and `record` answer 503 `upstream_error` without the token or with SpacetimeDB down. `changes` and `status` always answer from the snapshot.
- **The adapter** `src/sources/live/b13-live.ts`:
  - `health()`: `/api/health` lists `b13` with `services.spacetime` true, then `/api/b13/status` says `spacetime`. While `seeded` is false it starts the seed in the background and answers false.
  - `start(emit)` polls `/changes` with the screen ID `scr_` plus the page tag and the role from the route (`/shop` buyer, `/sell` and `/maker` seller, `/demo` tour), from the moment live mode turns on until it turns off. The registry stamps each event's `at` on arrival.
  - Steps of a run another page started (its `runId` carries another page's tag) reach the swarm view with that page's tag added to their `threadId`, so they never land on this page's own threads.
- **Fallback:** without B13, swarm steps arrive in B14's response or from the scripted runs, and the data view shows the mock data.

### B14 · the agent swarm (`b14-swarm`)

- **`POST /api/b14/support`** · `CINDIA_ANTHROPIC_API_KEY` · under 19 seconds · `{ "trigger", "threadId", "runId", "idTag", "idStart", "side", "text", "lang", "contextIds", "records" }`, where `records` carries what the request's side may see (the rules above). Returns every `swarm.step` in order, then one of:
  - `support.answered`,
  - `support.escalated` with an `approval.requested` (kind `support_action`, inline approval), when a person must take over,
  - for a meaning or authenticity question the records can't answer, `support.answered` with L14 and a `question.forwarded` to the piece's maker.
- **`POST /api/b14/question`** · `CINDIA_ANTHROPIC_API_KEY` · under 19 seconds · `{ "trigger", "questionId", "answerId", "threadId", "runId", "idTag", "idStart", "makerId", "text", "lang" }`, where `trigger` is the maker's `question.answered`. Returns the steps and the Writer's `support.answered` on the question's thread, quoting her words exactly.
- **`POST /api/b14/listing`** · `CINDIA_ANTHROPIC_API_KEY` · under 19 seconds · `{ "trigger", "listingId", "runId", "idTag", "idStart", "makerId", "notes", "lang", "community", "maker", "vibeVocabulary", "image"? }` runs Lister, then Describer (only with an image), Tagger, Checker and Indexer. Returns the steps, `listing.drafted`, `listing.indexed` (`cindia-drafts`, once B12 is live) and an `approval.requested` `apr_user_<tag>_<n>` whose inline approval is a `listing_publish` for the person's listing.
- **`POST /api/b14/storefront`** · `CINDIA_ANTHROPIC_API_KEY` · under 19 seconds · `{ "trigger", "storefrontId", "runId", "idTag", "idStart", "community", "pieces" }` runs the Designer. Returns the steps and `storefront.drafted`, with block IDs `blk_user_<tag>_<n>` and props as single strings (section 11).
- **How a run works:**
  1. Cindy (orchestrator) reads Intake's result and picks the specialists from the roster.
  2. Each specialist gets only its own tools and the records it needs, and answers through `messages.parse()` with its own small Pydantic model. Calls use `max_retries=0`, a `max_tokens` per agent, and a timeout no longer than the run's time left minus a reserve for the Writer.
  3. The Writer turns the specialists' facts into the reply. Amounts and dates are filled in by code from the facts, and a quote appears word for word with its source named.
  4. `content_check()` runs on what the Lister, Tagger, Writer, Curator, Designer and Describer write, against `contentRules`.
  5. Every step goes to the bridge (so B13 holds it) and into the response.
  6. A specialist that can't answer from its records returns `unknown` with a reason, and the Writer says so plainly.
  7. Anything that would move money, publish or report becomes an `approval.requested` (kinds `support_action`, `listing_publish`, `storefront_publish`), never an action. No run emits `approval.granted`, `payout.sent` or `money.moved`.
- **IDs:** `idTag` is the page tag, and `idStart` the first number the browser reserved. A live run's person-scoped IDs are `<prefix>_user_<tag>_<n>` for `run`, `stp`, `chk`, `apr`, `pc`, `blk` and `qst`.
- **The tour stays scripted.** Live mode answers people's own requests only, so B14 replaces no tour run and prefetches nothing.
- **Fallback:** the scripted runs in `src/mock/swarm.ts`.

### B15 · the copy watch (`b15-watch`)

- **`POST /api/b15/watch`** · `APIFY_TOKEN` or `APIFY_AUTH=proxy`, and `PUBLIC_SITE_URL` · answers at once · `{ "trigger", "runId", "idTag", "idStart", "scanId", "makerId", "queries" }` → status 202 with `{ "scanId", "status": "running" }` (not an events response). It starts the scan in a server thread, or joins the one already running for the same scan ID and queries, single flight and cached by scan. A maker outside `com_dine` gets 400 `bad_request`, and without `PUBLIC_SITE_URL` it answers 503 `upstream_error`.
- **`GET /api/b15/watch/{scanId}`** · no key · under 200 ms · `{ "status": "running" | "done" | "failed", "events": CindiaEvent[], "error": { "code", "message" } | null }`. `events` is empty until `done`. The adapter's `produce()` polls it every second until `done` or `failed`, inside its 59.5-second abort, and a failed scan throws, so the scripted scan plays.
- **`GET /api/b15/status`** · no key · under 200 ms · `{ "market": boolean, "threshold": number, "measured": boolean, "model": boolean }` (not an events response). `market` is true when `PUBLIC_SITE_URL` is set. The adapter's `health()` needs `/api/health` to list `b15` with `keys.apify` true, then `market`. It doesn't wait on B11.
- **The scan:**
  - Scout runs Apify's Cheerio Scraper (`apify/cheerio-scraper`, called as `apify~cheerio-scraper` through `run-sync-get-dataset-items` with `clean=true`) over the sandbox market at `<PUBLIC_SITE_URL>/market/`, with a 45-second budget. Its start URL is the market's index, and it follows only links inside `/market/`. It never fetches any other site, and it never contacts anyone. `docs/tech/apify/cheerio-scraper.md` has the input and output.
  - Comparer scores each result's title and snippet against the co-op's pieces as a normalized similarity, `(c - b) / (1 - b)`, with the B11 model, or the base model or B11's BM25 when B11 has no model. B15 measures the threshold on a fixture of look-alike and unrelated titles and writes it, with its precision, into its report.
  - A possible copy names the co-op or one of its makers, repeats an 8-word run of a piece's story, or claims a Cindia verification it lacks. A bare craft or origin claim is never a possible copy: it's `claim_only`, shown with L22 and no report button.
  - Claims (`claude-haiku-5-5`) reads what each look-alike claims, only at or above the threshold, in parallel, 5 seconds each.
  - The events: `watch.scanned` with every checked result, then per possible copy a `counterfeit.flagged`, the Reporter's `followup.drafted` (a template, the model only choosing which claim words to quote), and an `approval.requested` (kind `report_listing`, inline approval). Approving a live report asks the owner to confirm they checked the listing themselves.
- **The tour's `d14-watch` always plays the scripted scan.** Live scans run only from Scan now.
- **Fallback:** the scripted scan in `src/mock/watch.ts`. The server's tests use a fixture of fictional listings on `example.com` and `example.org`.

### B16 · the bank books (`b16-bank-books`)

In live mode B16 checks the books against Nessie: B01's matcher finds the $340 catch against Nessie's own bank records, the community fund move posts as a Nessie deposit, and a milestone release posts as a Nessie withdrawal. It uses B04's Nessie module and the co-op's operating account, and adds two accounts on the same fictional customer: a community fund account, and `Commissions held by Cindia`, where Cindia holds a commission's money until each milestone is approved. It never writes B04's operating account and never emits `account.synced`, so the money map's balance stays the operating account's.

- **`GET /api/b16/status`** · `NESSIE_KEY` · under 300 ms, from a cache a background thread refreshes every 30 seconds in live mode · `{ "operating": boolean, "seeded": boolean, "fundAccountId": string | null, "heldAccountId": string | null, "fundBalanceCents": number | null, "heldBalanceCents": number | null }` (not an events response).
- **`POST /api/b16/seed`** · `NESSIE_KEY` · up to 20 seconds, called once by the adapter's `health()` in live mode, after B04's seed, single flight · `{ "trigger": null, "commission": { "wipId": "wip_01", "priceCents": 0 } }` → `{ "events": [] }`. Finds or creates the two accounts and posts the held account's opening deposit once. Without B04's account, 404 `not_found`.
- **`POST /api/b16/reconcile`** · `NESSIE_KEY` · under 5 seconds · B01's body (`records.bankTxns` is ignored) → every `flag.raised` the matcher finds against Nessie's bank side, keyed `b16-bank-books`, each with `nessieId`. A flag of the trigger's kind on the trigger's statement keeps the trigger's `flagId`.
- **`POST /api/b16/moves`** · `NESSIE_KEY` · under 6 seconds · `{ "trigger": { "...": "the money.moved to post" } }` → the trigger's `money.moved` with the same payload plus `nessieId`, keyed `b16-bank-books`. A `project_fund` move to a `community_fund` posts as a deposit on the fund account, and a `milestone` move as a withdrawal from the held account, whose `from` stays Cindia. Any other move is 400 `bad_request`.
- One request at a time writes to Nessie. When the bank's answer disagrees with the event, the endpoint returns `{ "events": [] }`, so the scripted figure and its Simulated badge stay.
- **Events:** `flag.raised` adds `nessieId?: string`, set only by B16. `money.moved`'s `nessieId?` is set by B04 and by B16. B16 sends only these live twins.
- **B16's keyed tour events: none.** No timeline event and no Requests row is keyed `b16-bank-books`, so it needs no `ALLOWED_EMPTY_FALLBACKS` entry.
- **The adapter** (`src/sources/live/b16-bank-books.ts`): `health()` needs `/api/health` to list `b16` with `keys.nessie` true, then `/api/b16/status` with `operating` true, and starts the seed in the background while `seeded` is false. `start(emit)` posts the month's `short_payment` flag to `/api/b16/reconcile` once per `flagId`, and each fund or milestone move to `/api/b16/moves` once per `moveId`. `REQUIRED_KEYS` has `b16-bank-books: nessie`.
- **Fallback:** the scripted flag and moves, with their Simulated badge.

### B08 in v2

B08's owner screen polls on `/sell/approvals?screen=owner`, so the Sell site on the console machine doesn't count as the owner. After it forwards a person's decision, the adapter returns `[]`, so the scripted answer to that decision (a milestone's payment, for one) plays. `B13-live.md` owns this change. Moving the approval queue onto SpacetimeDB is in the brief's "Backend if time".

### Health

`GET /api/health` adds the keys and `services` from section 1, and `routers` lists `b11` to `b16` as they load.

## 6. The agent roster (`src/mock/agents.ts`, used by B14 and the swarm view)

21 roles. Fifteen run on Claude, only `claude-haiku-5-5` and `claude-sonnet-5-5`. No Opus and no Fable anywhere in the platform, and `MODEL_TOP` leaves `server/config.py`. Six are plain code.

| agentId | kind | model | tools | Job |
|---|---|---|---|---|
| `cindy` | claude | `claude-haiku-5-5` | `route` | Picks which agents run and in what order, then merges their results. No facts of her own |
| `intake` | claude | `claude-haiku-5-5` | none | Reads the request: intent, budget, recipient, language, the IDs it mentions |
| `finder` | claude | `claude-haiku-5-5` | `cindia_search`, `elastic_agent` | Turns the request into keywords and filters, runs the search, returns candidates and scores. Find questions go to `elastic_agent` (Elastic Agent Builder), chosen in code |
| `curator` | claude | `claude-sonnet-5-5` | none | Puts the final few in order. Each reason is B12's code-built one |
| `steward` | claude | `claude-sonnet-5-5` | `community_page`, `verification_record` | Answers authenticity and meaning only from the community's page, the verification record and the piece's own story and heritage line, quoting its source, and says "I'll ask the maker" otherwise |
| `clerk` | claude | `claude-haiku-5-5` | `order_lookup`, `policy` | Order status, shipping, returns. Read-only. Arrival dates come from `arrival_window`, which the run calls as code, so no model does date arithmetic. On the buyer side it looks up only the orders on screen (L17) |
| `writer` | claude | `claude-sonnet-5-5` | none | Writes the reply in the person's language from the facts the others returned, and relays a maker's answer in her own words |
| `lister` | claude | `claude-sonnet-5-5` | none | Drafts a listing in English and Chinese from the maker's notes, and marks the version the maker didn't write (L27) |
| `describer` | claude | `claude-sonnet-5-5` | `image` | Describes what's visible in a picture, in plain shape and color words |
| `tagger` | claude | `claude-haiku-5-5` | `community_page` | Proposes vibe keywords for the maker to approve |
| `checker` | claude | `claude-sonnet-5-5` | `community_page` | Checks a draft against the community's protocols and the maker's facts. `content_check()` backs it in code (L26) |
| `indexer` | code | | `embed`, `index_write` | Builds the index entry and its vector, writes it to `cindia-drafts` |
| `matcher` | code | | `b01` | Matches payouts to orders |
| `explainer` | claude | `claude-sonnet-5-5` | `b02` | Explains the catch |
| `bookkeeper` | code | | `b06`, `b10` | Derives the books and the workbook |
| `scorer` | code | | `b03` | Scores the planted errors |
| `scout` | code | | `apify_crawl` | Crawls the sandbox market through Apify |
| `comparer` | code | | `embed` | Scores look-alikes |
| `claims` | claude | `claude-haiku-5-5` | none | Checks what a found listing claims |
| `reporter` | claude | `claude-sonnet-5-5` | none | Picks the claim words for the report template, for the owner |
| `designer` | claude | `claude-sonnet-5-5` | `community_page` | Drafts a storefront |

The swarm view labels `code` agents "rule-based". The `never` field on each spec is the "Never does" column of the brief.

## 7. Kit additions (`design-system.md`, built in `I2-kit`)

Until Figma drop 1 lands, every new component uses the existing silk-and-ink tokens. After it lands, `I3-redesign` changes the tokens and the kit, and features follow without edits wherever they used only kit components and tokens.

`PageFrame` (exports `PAGE_WIDTH` and `PAGE_HEIGHT`), `TopNav`, `SideSwitch` (Shop and Sell), `Link` (`to`, `testId?`, `children`: a real anchor that calls `navigate` on a plain click), `ProcessBlock`, `ProcessView` (frame with title, Live or Simulated badge, body, event log), `EventLog`, `SearchBar` (text and editable keyword chips), `Chip`, `PieceCard` (illustration, title, maker mark, community, price, verification line), `CommunityCard`, `ProjectCard` (progress bar), `MilestoneTimeline`, `VerificationLine`, `ChatThread`, `ChatBubble` (agent name and kind), `AgentGraph` (SVG nodes and edges, steps animate on the player clock), `EmbeddingMap` (SVG scatter of points with the query star and links to the top results), `ScoreBar`, `StatTile`, `Drawer` (generic, 440 px, from the right), `Tabs`, `BlockEditor` (a list of blocks with move up, move down and edit), `SideBySide` (two cards with a similarity bar between them). `Badge` gains `live`, `demo`, `rule` and `estimate` variants. `PieceCard` and `VerificationLine` take a `demo` prop, which shows L3 and L4. Motion still follows the player clock.

## 8. The tour (`demo-script.md`, replaced in `I2-tour`)

Three minutes, in this order:

1. **The pitch, 1 minute: what it is, why, the tech.** Three full-screen pitch cards at the start of `/demo`, so the whole pitch runs in one window. The Figma Slides deck for the Figma track mirrors the same three cards. Gordon writes the words tonight in `src/app/demo/pitch.ts`.
2. **The buyer minute.** Vibe search, the piece and where the money goes, a question answered by the swarm with a guard firing, pay, and a receipt that promises to show when Grace N. is paid.
3. **The seller minute.** A maker's notes become a listing that our model embeds into the index, then the money: map, month, the catch, approve and seal, close, Grace N.'s statement, and the buyer's receipt turning to "Paid to the maker".

Rules:
- **Everything in the tour is scripted.** It never waits on a network, and it plays the same every time.
- **Presenter mode.** `/demo?mode=present` pauses at the end of every beat. Space or the right arrow plays the next beat, and the left arrow replays the current one. Gordon talks at his own pace and can stop for a judge. `/demo` without it auto-plays, for the video and the tests.
- **"Try it yourself."** After the tour, Gordon flips the Live switch and a judge types their own search or support question. Live mode answers people's own requests only. The tour's events stay scripted in both modes.
- **Chapter 2, for questions.** After the end card, the right arrow continues into Surprise me, the proofs, the counterfeit watch and the storefront. Any beat opens directly with `/demo?start=<beatId>`.

| Beat | Time (s) | Camera | Process | What happens (events) | On screen (test IDs) |
|---|---|---|---|---|---|
| `p01-what` | 0 to 20 | `pitch` | | `beat.started` only | `pitch-card-what` |
| `p02-why` | 20 to 40 | `pitch` | | `beat.started` only | `pitch-card-why` |
| `p03-how` | 40 to 60 | `pitch` | | `beat.started` only | `pitch-card-how` |
| `d01-vibe` | 60 to 74 | `shop-home`, then `shop-search` at 63.5 | `search` from 66.5 | 60.2 `model.trained` and `proof.search_scored` (only when the report exists, A1-4), 60.4 `search.queried` (figure 11), 62.6 `search.answered`, 66.0 `search.mapped` | `search-input`, `search-chip-1` to `search-chip-6`, `search-results`, `search-result-pc_01`, `search-engine`, `process-search-map` |
| `d03-piece` | 74 to 86 | `shop-piece` | | 74.3 `piece.opened` `pc_01`, 76.5 `split.shown` with the gallery comparison (A1-10) | `buyer-story-card`, `buyer-verification`, `buyer-split-bar`, `buyer-split-maker-share`, `buyer-split-compare` |
| `d04-support` | 86 to 104 | `shop-piece` | `swarm` from 90 | 86.4 `support.asked`, 87.6 to 95.5 `swarm.step` (intake, cindy, steward, a `check` step, clerk, writer, A1-7), 96.0 `support.answered` | `support-drawer`, `support-reply`, `support-agent`, `process-swarm-graph` |
| `d05-pay` | 104 to 120 | `shop-piece` | `checkout` from 107 | v1's `d04-pay` events, plus 106.0 `project.funded` `ctb_01` | `buyer-pay-button`, `buyer-project-addon`, `buyer-token`, `buyer-receipt-status`, `buyer-receipt-promise` |
| `d15-listing` | 120 to 130 | `sell-listings` | `swarm` from 122, `data` from 127 | 120.3 `listing.requested` `lst_01`, 121.0 to 126.0 `swarm.step` (lister, tagger, checker, indexer), 126.5 `listing.drafted`, 127.0 `listing.indexed`, 128.0 `approval.requested` `apr_04` | `seller-listing-notes`, `seller-listing-draft`, `seller-listing-check-<checkId>`, `seller-listing-indexed`, `process-data-tables` |
| `d06-money` | 130 to 136 | `sell-map` | | v1's `d05-money` events, plus `mv_0101`, `mv_0102` | `money-map-canvas`, `money-map-thread-mv_0001`, `money-map-thread-mv_0003`, `money-map-balance` |
| `d07-month` | 136 to 146 | `sell-month` | `reconcile` from 142 (C-12) | v1's `d06-month` at 0.3 s a day | as v1 `d06-month` |
| `d08-catch` | 146 to 154 | `sell-catch` | | v1's `d07-catch` | as v1 `d07-catch` |
| `d09-approve` | 154 to 161 | `sell-approvals` | `approvals` from 155 (C-12) | v1's `d08-approve` | as v1 `d08-approve` |
| `d10-close` | 161 to 166 | `sell-close` | | v1's `d09-close` | as v1 `d09-close` |
| `d11-maker` | 166 to 172 | `maker` | | v1's `d10-statement`, with the held line (A1-12) | as v1 `d10-statement` |
| `d12-receipt` | 172 to 180 | `shop-receipt` | | v1's `d11-receipt` `receipt.updated`, then 179.0 `proof.scored` off camera | `buyer-receipt`, `buyer-receipt-status`, `buyer-receipt-maker-note` |
| `d02-surprise` | 180 to 186 | `shop-search` | | 180.4 `surprise.asked` (figure 12), 181.6 `surprise.drawn` | `search-surprise`, `search-surprise-result`, `search-surprise-rule` |
| `d13-proof` | 186 to 192 | `sell-proof` | `model` from 189 | `proof.search_scored` again only if absent | `proof-score`, `search-proof`, `process-model-card` |
| `d14-watch` | 192 to 200 | `sell-watch` | | 192.3 `watch.started`, 194.5 `watch.scanned`, 195.0 `counterfeit.flagged` `cft_01`, 195.5 `followup.drafted` `fup_02` keyed `b15-watch`, 196.5 `approval.requested` `apr_03` | `watch-results`, `watch-item-cft_01`, `watch-similarity-cft_01` |
| `d16-store` | 200 to 205 | `store` | | none | `store-page` |

- `durationMs` is 205000. The spine is `p01` to `d12`. Chapter 2 is `d02`, `d13`, `d14` and `d16`. Presenter mode shows the end card after `d12`.
- `?start=catch` keeps working and seeks to `d08-catch`. Video mode's cold open seeks to `d08-catch`.
- The `pitch` camera is a full-frame card with no Shop or Sell frame. The three cards are placeholders until Gordon writes them.
- `data` is a new `ProcessId` (section 1.4).
- The "ask the maker" run (C-13) is a chapter 2 beat `d17-ask-maker` only if F-support and F-seller-hub ship it. Otherwise it's a question Gordon clicks during Q&A.
- Figure 11's query is rewritten to fit the new `pc_01` honestly, with six chips that still include `gift for mom` and `under $200`. The data fix picks the words.

## 9. Glossary additions (`glossary.md`)

| Word | Code name | English label | Chinese label | Meaning |
|---|---|---|---|---|
| platform | Cindia | Platform | 平台 | What Cindia is: it does the selling, the marketing and the books for makers. Never called an app |
| Native American | `kind: "native_american"` | Native American | 美洲原住民 | The makers Cindia starts with. Never "Indian American" |
| Diné (Navajo) | `com_dine` | Diné (Navajo) | 纳瓦霍（Diné） | The nation of the named co-op, on the Navajo Nation in Arizona |
| Ojibwe | `com_ojibwe` | Ojibwe | 奥吉布瓦（Ojibwe） | The nation of the beadwork co-op in Minnesota |
| Acoma Pueblo | `com_acoma` | Acoma Pueblo | 阿科马（Acoma） | The nation of the pottery studio in New Mexico |
| Seminole | `com_seminole` | Seminole | 塞米诺尔（Seminole） | The nation of the patchwork co-op in Florida |
| community | `Community` | Community | 社区 | A people's co-op or studio whose makers sell on Cindia |
| co-op | `std_dine` | Co-op | 合作社 | The Diné Weaving and Silver Co-op, v1's studio after R0 |
| demo data | `demo: true` | Demo data | 演示数据 | Fictional people and stories, labeled as such |
| demo verification | `demo` prop | Demo verification | 演示认证 | A verification line for a fictional maker. No real check was done |
| verification | `verification` | How makers would be verified | 匠人认证方式 | Who would attest that the maker belongs to the nation, and how |
| protocols | `protocols` | Kept out of this demo | 本演示未收录 | What Cindia's demo leaves out. In a real launch the community sets these rules |
| vibe search | `search` | Vibe search | 按感觉搜索 | Search by describing a feeling |
| keyword | chip | Keyword | 关键词 | A word Cindia's rule-based extractor picked out of the request, editable |
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
| ask the maker | `question.forwarded` | Ask the maker | 问匠人 | A buyer's question the records can't answer, put to the maker on her page |
| the maker's own words | `question.answered` | In her own words | 匠人原话 | The maker's answer, shown exactly as she wrote it |
| listing | `ListingDraft` | New listing | 新作品上架 | A maker's new piece, drafted from their notes |
| counterfeit watch | `watch` | Counterfeit watch | 仿冒监测 | The scan of the sandbox market for copies of the co-op's pieces |
| text match | `similarity` | Text match | 文本相似度 | How close a found listing's title and snippet are to a piece's description. Not a picture match |
| possible copy | `verdict: "possible_copy"` | Possible copy | 疑似仿冒 | A result that names the co-op or a maker, copies a piece's story, or claims a verification it lacks |
| claim only | `verdict: "claim_only"` | Claims only | 仅有声明 | A result that claims to be Native-made with nothing Cindia can check |
| sandbox market | `/market/` | Sandbox market | 沙盒市场 | Static pages of fictional listings on the public site, the only place the watch crawls |
| process | `ProcessId` | How it works | 运行过程 | The process blocks and their views |
| the data view | `data` | Data | 数据 | The process view with the database's tables, their row counts and newest rows |
| presenter mode | `?mode=present` | Presenter mode | 演讲模式 | The tour pauses at the end of each beat, and Space or the right arrow plays the next |
| pitch card | `pitch` | Pitch card | 路演卡片 | One of the three full-screen cards that open the tour: what, why, how |
| live | `source: "live"` | Live | 实时 | Came from a real service in this run |
| model | `model` | Search model | 搜索模型 | Cindia's own embedding model |
| index | `IndexEntry` | Index | 索引 | What Cindia keeps about each piece to find it |
| test queries | `SearchQuery` | Test queries | 测试查询 | The 50 held-out queries the search model is scored on |

## 10. Gates and tags (`definition-of-done.md`)

| Gate | After | Commands | Tag |
|---|---|---|---|
| R0 | `R0-reskin`, before everything else in V1 | `npm run check`, `npm run check:data`, `npm run test:smoke`, `npm run build`, `npm run test:demo` 3 times (v1's 60-second demo on the new names), `npm run test:offline`, `npm run test:server`, the verifier's screenshot review, and the old-names search in `R0-reskin.md`. Every v1 check green, every number unchanged. `scripts/gate.mjs` learns the time rule below only in `I2-core`, so the orchestrator applies it here from `report.json` itself | `v2-reskin` |
| core | `I2-core`'s first spawn with the fallout step, committed together | `npm run check`, `npm run test:server` | `v2-core` |
| G1b | `I2-core`, `I2-shell`, `I2-kit` | `npm run check`, `npm run test:smoke`, `npm run build`, `npm run test:demo` once with the Phase A mapping, `npm run test:offline`, a verifier review | `v2-shell` |
| G2b | `S3-catalog` | `npm run check:data` (v1's figures 1 to 10 and v2's 11 to 16), `npm run check:scope -- src/mock/ tests/data/ src/sources/`, `npm run art -- --check`, a verifier review. It runs when no integrator is mid-task | `v2-data` |
| G3 | each v2 feature or migration | as v1. A migration that owns several folders passes with all its slugs listed | `v2-<slug>` |
| G4v2 | `I2-tour` | `npm run build`, `npm run test:demo` 3 times on the tour, `npm run test:offline`, the verifier's screenshot review against section 8. It runs with no other agent active | `demo-ok-v2` |
| G5 | each of B11 to B16 | below | `demo-ok-b11` to `demo-ok-b16` |
| D-deploy | `D-deploy` | its Acceptance commands, a verifier review | `v2-deploy` |
| G6 | the freeze | as v1, with the secrets scan reading the v2 names | `final` |

- **Time limits.** Every gate that plays the demo times the tour test alone and passes when `artifacts/demo/report.json`'s `endedAtWallMs` is at most the loaded timeline's `durationMs` plus 15 seconds: 75 seconds for v1's 60-second demo, 220 seconds for the 205-second tour. R0, G1b, G4v2, G5 and G6 all use this rule.
- **G5 for v2 upgrades** (B11 to B16) runs `npm run test:server`, the upgrade's contract and live tests, its named live feature specs, then `npm run test:demo` once in live mode and `npm run test:offline`. It passes when the server tests pass, the live feature spec answers a person's own request end to end with every event valid, and the scripted tour still passes with the source in live mode. The tour's keyed events for that source are listed in `ALLOWED_EMPTY_FALLBACKS`. v1 upgrades keep v1's G5 on the Phase A demo.
- **Git in the cloud** (`conventions.md`, Git, in place of `git push origin main --follow-tags`): the GitHub proxy refuses tag pushes, so the orchestrator pushes with `git push origin main` only, makes each tag locally after the push, and records the tag and its full commit SHA in the Tags table of `status.md`. A cut restores from the SHA when the tag is missing, and never restores a folder that R0 or the fallout step touched from anything older than `v2-core`. Gordon creates and pushes the tags from Windows at the freeze. A design drop may add `demo-ok-v2-dN`.

## 11. Additions from the plans (Oct 24, 2:40 PM)

The plan writers found these gaps. Each one is settled here, and where two plans proposed different names, this section picks one. Where it disagrees with sections 1 to 10, it wins.

### Navigation and slot props (`I2-core`, `I2-shell` → `ui-contract.md`)

- `src/core/nav.ts` exports:
  - route builders: `shopRoute()`, `searchRoute({ q, k })`, `pieceRoute(pieceId)`, `communityRoute(communityId)`, `projectsRoute(id?)`, `receiptRoute(orderId)`, `storeRoute(slug)`, `sellRoute(view, { drawer?, ref? })`, `makerRoute(makerId)`,
  - `navigate(path)`, `setProcess(processId | null)`, `openDrawer("ask" | "audit" | "support", ref?)`,
  - `registerNavigator(impl)`, which the shell calls once, with safe no-op defaults until it does.
  
  Features never touch `window.location`. On `/demo`, `navigate()` does nothing, and `openDrawer()` and `setProcess()` set a stage override that the next `beat.started` or a seek clears. The beat's own `drawer` and `process` fields drive the tour.
- The kit adds `Link` with a `to` prop, a real anchor built on `navigate`.
- `SlotProps` adds:
  - `searchParams?: { q?: string; k: string[] }` on `/shop/search`, where `k` is always an array, empty when the URL has none,
  - `processId?` (both `process.bar`, the open process, and `process.view`),
  - `pieceId?` (the piece page, and `shop.drawer.support` while a piece page is open),
  - `orderId?` (the receipt page, and `shop.drawer.support` while a receipt is open),
  - `slug?` (the storefront page, and `shop.drawer.support` on a store page),
  - `makerId?` (the maker page, and `studio.drawer.support` on a maker page),
  - `communityId?`, `projectId?`, `side?`,
  - `refId?` (the audit drawer, and `owner.main` from `/sell/approvals?ref=<approvalId>`),
  - `publicSite?: boolean`, true on every slot of the public build only.
- The shell forwards the whole props object to each slot. `?drawer=support` works on Shop routes, on store pages (`shop.drawer.support`) and on maker pages (`studio.drawer.support`) too.
- `owner.main` adds keys `b14-swarm` and `b15-watch` to its Simulated rule.

### Store and types (`I2-core` → `events.md`, `data-model.md`)

- **New store keys:**
  - `log`: one `{ id, type, at, source, key }` per event, idempotent by `id`, keeping the newest 400. A status event (`data.synced`, `index.synced`) replaces the log's earlier entry of its own type instead of adding one, so live polling never pushes the tour's events out. The process views and block counts read it.
  - `demo.process` and `demo.drawer`. `I2-core` owns both, with `beat.started.process` and `beat.started.drawer`, their schema and their reducer. `I2-tour` only sets them on the tour's beats.
  - `questions`, by `questionId`: the forwarded question and, once it arrives, the maker's answer.
  - `sync`: `sync.data`, the newest `data.synced`, and `sync.index`, the newest `index.synced`.
- **New types in `src/core/types.ts`:** `ScriptedRun` (`runId`, `side`, `threadId`, `trigger`, `steps`, `final`), `PlannedEvent`, `ModelReport`, `DemoSearch`, `DemoSurprise`, `ScriptedScan`, `PolicyTopic`, `Policy` and `InlineApproval`, with the fields `I2-core.md` gives them:
  - `ScriptedRun.trigger` is `{ kind: "support"; matches: string[]; pieceId?; makerId? }` (a run with `pieceId` or `makerId` answers only when the request's `contextIds` include it), `{ kind: "listing"; listingId; notes }`, `{ kind: "storefront"; storefrontId }` or `{ kind: "question"; questionId }`. `final` is an ordered list of events, approvals and follow-ups included.
  - `ScriptedScan` is `{ scanId, makerId, queries, cftIds, followUpId?, approvalId? }`.
  - `DemoSearch.query` has no `queryId`. The tour adds `qry_01`.
- **Views and cameras:** `SellView` and `SELL_VIEWS`, with `StudioView` staying the v1 five until `I2-tour`. `TourCameraId` (with `pitch`, and `shop-legacy` until `I2-tour`), `LegacyCameraId`, `LEGACY_CAMERA_TO_TOUR` and `toTourCamera()`. `CameraId` covers both until `I2-tour`.
- **Page size:** `PAGE_WIDTH` 1440 and `PAGE_HEIGHT` 900 belong to the kit, exported from `src/ui/PageFrame.tsx` (`I2-kit`).

### IDs, one scheme for every plan (`data-model.md`)

| Who makes it | IDs |
|---|---|
| The tour and the scripted data | `qry_01`, `srp_01`, `thr_00` to `thr_05` (`thr_00` is the fallback runs' placeholder thread), `wsc_01` (the tour's scan), `run_01` to `run_10`, `pc_55` (the piece `lst_01` drafts in the tour, event-only until `apr_04` is granted), `stp_0001` onward, `chk_01` onward (listing checks), `ctb_01` onward, `qst_01` onward (questions put to a maker), `ans_01` onward (a maker's scripted answers), `blk_01` onward, `mls_01` onward, `pol_01` onward |
| A person, through `userEvent()` payloads | `qry_user_<n>`, `srp_user_<n>`, `thr_user_<n>`, `wsc_user_<n>`, `lst_user_<n>`, `ctb_user_<n>`, `ord_user_<n>`, `ans_user_<n>` (a maker's answer on her page) |
| A scripted answer to a person | `run_user_<n>`, `stp_user_<n>`, `chk_user_<n>`, `pc_user_<n>`, `cft_user_<n>`, `fup_user_<n>`, `apr_user_<n>`, `mv_user_<n>`, `qst_user_<n>`, `blk_user_<n>`, and `act_reply_<n>` for its `agent.acted` lines |
| A live answer to a person | the same prefixes with the page tag: `<prefix>_user_<tag>_<n>`, for example `stp_user_k3x9qa_1` |

- `src/sources/ids.ts` hands out the numbers. A scripted answer's numbers start at 1 for each prefix, are reserved the moment the answer is planned (so two pending answers never share one), and start over when the player's epoch changes. A live run reserves its numbers with `liveIdStart(prefix, count)` and sends the first as `idStart`. Live numbers never start over within a page.
- `pageTag()` in `src/sources/ids.ts` is a 6-character tag of lowercase letters and digits, made once per page load. Only live adapters use it, so scripted mode never uses a random value.
- The source helpers `I2-core` writes: `timeoutFor(key)`, `pageTag()`, `answerId(prefix)` and `liveIdStart(prefix, count)` (`ids.ts`), `extractKeywords()` (`keywords.ts`), `scoreKeywords()` and `keywordVocab()` (`keywordSearch.ts`), `drawSurprise()` and `mulberry32()` (`surprise.ts`), and `planRun(run, request, ids)` (`scriptedSwarm.ts`).
- Event IDs: `evt_` (the timeline), `evt_user_` (a person), `evt_reply_<n>` (a scripted answer), `evt_live_` (a live answer, section 5).

### Events and requests (`events.md`)

- **Listing runs** use the `listingId` as `threadId`. Notes equal to `lst_01.notes` (normalized) get `lst_01`'s run, re-keyed to the person's IDs. The tour's run ends with `listing.drafted`, `listing.indexed` and `approval.requested` `apr_04`. A person's run ends with its own `apr_user_<n>`, whose inline approval is a `listing_publish` for the person's listing, and never re-emits `apr_04`.
- **The watch run:** the tour's carries `followup.drafted` `fup_02` (the Reporter's draft), then `approval.requested` `apr_03`. A person's scripted scan re-keys its hits to `cft_user_<n>`, its draft to `fup_user_<n>` and its approval to `apr_user_<n>`, so the tour's `cft_01` and `apr_03` stay as they were.
- **The "ask the maker" run:** the buyer's meaning question gets the L14 reply and a `question.forwarded` to the piece's maker. Her `question.answered` on the maker page is a request, and its answer is the Writer's `support.answered` on the original thread, quoting her words exactly. `planRun` puts a person's own answer text where `run_09`'s scripted reply quotes `ans_01`. If the chapter 2 beat `d17-ask-maker` ships, it carries `drawer: "support"`, and its On screen IDs are `support-forwarded-<questionId>` and `support-maker-answer-<questionId>`.
- **New Requests rows:**

| Request | Key | Scripted answer |
|---|---|---|
| a person's `piece.opened` | `b10-derived` | `split.shown` from `splits[pieceId]` (`pc_01` equal to figure 1, with figure 16's comparison) |
| a person's `checkout.started` on any piece but the timeline's | none, through a keyless path | `card.tokenized` (the piece's `pieceId`, a token made from the piece ID with no randomness, last four 4242), `order.placed` `ord_user_<n>` on `ch_cindia`, `receipt.updated` received. These orders stay out of the month, the ledger and the money map |
| a person's `wip.milestone_reached` (date always `2026-10-01`) | `b08-approvals` | `agent.acted` (propose) and `approval.requested` `apr_05` for `wip_01`'s second milestone. Any other milestone gets only the `agent.acted` line |
| `approval.granted` on a `milestone_release` | `b08-approvals` | `wip.milestone_paid` and a `money.moved` of kind `milestone`, Cindia to the maker, `mv_user_<n>`, dated `2026-10-02`. In live mode B16 posts it as a withdrawal from `Commissions held by Cindia`, and its `from` stays Cindia |
| `storefront.requested` | `b14-swarm` | the Designer run for `sto_01`, the run's own storefront. Any other storefront gets no scripted draft |

- `REQUEST_KEYS` lists every request row in sections 3 and 11. `support.escalated` and `question.forwarded` are answers, never requests.
- **Publishing a person's listing:** when the owner grants a `listing_publish` approval for an `lst_user_` listing in live mode, the B12 adapter's `start(emit)` posts `/api/b12/publish` once and emits the returned `listing.indexed` (`index: "cindia-pieces"`, keyed `b12-search`). Scripted mode adds nothing after the grant.

### Data (`S3-catalog` → `data-model.md`)

- **Exports** from `src/mock/` (every file re-exported by `src/mock/index.ts`):
  - existing: `pieces` (`catalog.ts`)
  - `communities` (`communities.ts`)
  - `leads`, `allMakers` (`people.ts`)
  - `searchIndex`, `keywordAliases` (`searchIndex.ts`)
  - `demoSearch`, `demoSurprise` (`search.ts`)
  - `searchEval` (`searchEval.ts`)
  - `projects`, `worksInProgress`, `demoContribution`, `demoFundMoves` (`projects.ts`)
  - `storefronts` (`storefronts.ts`)
  - `agents`, `getAgent(agentId)` (`agents.ts`)
  - `swarmRuns`, `fallbackSupportRun`, `fallbackListingRun`, `demoQuestions` (`swarm.ts`)
  - `listings` (`listings.ts`)
  - `counterfeitCandidates`, `scriptedScan` (`watch.ts`)
  - `modelId`, `report` (`model.ts`)
  - `policy` (`policy.ts`)
  - `splits` and `gallerySplits` (`splits.ts`): `splits` is a `Record<pieceId, split.shown payload>`, and `gallerySplits` a record by `pieceId` with `makerShareCents` under `ctr_gallery_01`'s 40% (`pc_01` is 8600). `buyer-split-compare` reads `gallerySplits`
  - `receiptNotes` (`people.ts`), a record by `makerId` of each maker's `receiptNote`
  - `makerQuestions` (`swarm.ts`), `vibeVocabulary` (`searchIndex.ts`), `demoDataSync` (`database.ts`)
  - `contentRules` (`contentRules.ts`)
- **`getById()`** also finds `com_`, `prj_`, `wip_`, `mls_`, `sto_`, `lst_`, `cft_`, `pol_`, `qst_`, `apr_03` to `apr_05`, `fup_02` and the new people. Agents have no prefix: features use `getAgent()`. A person's `ord_user_<n>` lives only in the store (`buyer.orders`).
- **`contentRules`** is `{ bannedObjects, stereotypeWords, meaningWords, accusingWords, peopleNames, allowedHosts }`:
  - `bannedObjects`: section 2's "Kept out of the catalog" list,
  - `stereotypeWords`: exotic, tribal, primitive, ethnic, mystical, spiritual, shamanic, sacred, ceremonial, spirit, totem, boho, native-inspired, authentic, ancient, timeless, warrior, princess, chief, powwow, smudge, healing, energy, Aztec, Inca,
  - `meaningWords`: symbolizes, represents, protects, brings luck, 象征, 寓意,
  - `accusingWords` in English and Chinese: fraud, scam, illegal, fake, counterfeit, knockoff, copy, stolen, infringe, violate, 假冒, 仿冒, 冒充, 山寨, 盗版, 侵权, 欺诈, 违法,
  - `peopleNames`: by community, each nation's names in English and Chinese, plus Indigenous, Native, Indian, 原住民 and 土著,
  - `allowedHosts`: `example.com` and `example.org`, with `/market/` paths allowed as relative URLs.
  
  The data tests scan every v2 `Text` against it, except `communities[].protocols`. A test scans `src/mock/`, the server fixtures, `pairs.jsonl` and the model card for URLs outside `allowedHosts` and for a nation's name used as a product word.
- **`demoQuestions`** is `{ side: "buyer" | "seller"; text: Text }[]`, and every entry has its own scripted run. The buyer's first is the d04 question, the second a meaning question that ends in the "ask the maker" run, and the third a find question that goes through Agent Builder. The seller's are the payout question (`run_04`) and "Why is part of my September pay held?" (`run_10`).
- **Approval subjects:**
  - `apr_03.subjectIds` is `["cft_01"]`,
  - `apr_04.subjectIds` is `["lst_01"]`,
  - `apr_05.subjectIds` is `["wip_01", "mls_02"]`, with `amountCents` that milestone's share of the price.
- **`fup_02`** is the Reporter's draft about `cft_01`.
- **Storefront block props,** single strings or string lists, never `_en` and `_zh` pairs:
  - hero: `tagline` (a plain craft line),
  - story: `title`, `body` (it renders the community's `about` under L8),
  - pieces: `pieceIds`,
  - projects: `projectIds`,
  - visit: `address` (the region only, never a street address) and `hours` ("Visits by arrangement"). No phone or email, for every storefront.
  
  A live Designer draft's block IDs are `blk_user_<tag>_<n>`. `/store/<slug>` shows a draft storefront with the label "Draft. Not published yet." at the top.
- **Keyword chips:** `extractKeywords(text)` lives in `src/sources/keywords.ts`, is exported from `src/sources/index.ts`, is deterministic, and returns `{ keywords: string[]; filters: { maxPriceCents?: number } }`. `keywordSearch.ts` keeps the scorer and `keywordVocab()`.
  - Matching goes `under $N` first, then multi-word terms and aliases, then single-word aliases, then single words. A word that is an alias key always resolves through its alias, and every matched word is used up.
  - Order: moods, then facet words, then occasions and recipients, then price, in text order within each group.
  - `keywordAliases` never map a stereotype word to anything. The scripted keyword scorer also applies `filters`.
- **The surprise draw:** `src/sources/surprise.ts` (`I2-core` T5) exports `mulberry32(seed)` and the draw, which B12 ports exactly.
  - Candidates: for `keyword_random` and `fair_random`, the keyword's top 12 by score, then `pieceId`, scoring above 0. For `pure_random`, or with no keyword, all 54.
  - Raw weights are 1 for `keyword_random` and `pure_random`, and `1 / (1 + salesThisMonth)` for `fair_random`. The draw takes `r = rng() * total` and walks the raw weights with a plain loop in candidate order.
  - The payload's weights are the raw weights divided by their total, so they sum to 1.
  - The data's `salesThisMonth` values make figure 12's seed land on its piece. A person's seed is 1 plus the number of `surprise.asked` events already in the store.

### Shell and the tour (`ui-contract.md`, `demo-script.md`)

- **Phase A legacy page:**
  - Until `I2-tour`, the route `/shop/legacy` always renders `buyer.main` in a centered 480 px column that keeps the 844 px phone height, scaled to fit.
  - Phase A maps v1 cameras `buyer` and `receipt` to the legacy camera `shop-legacy` (`frame-buyer` on `/shop/legacy`). Filling `shop.home.main` never changes what the v1 demo sees.
  - The Phase A legacy boxes show on the stage only while the camera is a legacy camera: v1's Sell views in a 1192 by 744 box, `owner.main` and `maker.main` in a 390 by 844 column, all scaled to fit.
  - `I2-tour` deletes the route and the camera (`src/app/routes.tsx` and `ShopSurface.tsx`), and `M-buyer`'s last task deletes `buyer.main`, the concierge test IDs and the phone-flow specs after G4v2.
- **Process views:**
  - In the tour, a beat with `process` scales its frame to 0.66 on the left and shows the process view in the right third. The panel holds the `process.view` slot and has no test ID of its own.
  - A person's `?process=` is a centered overlay, 1200 by 720.
  - The top bar and the process bar stay visible above an open view, and a view never covers an open drawer.
- **Test IDs and layout:**
  - The process feature renders every `process-` test ID. The shell renders only the slot containers and their placeholders, `slot-process-bar` and `slot-process-view`.
  - `/dev/kit` renders `KitGallery` from `src/ui/gallery.tsx` (test ID `dev-kit-gallery`).
  - The Sell nav is 184 px, and the Sell header holds the co-op's name, L2 and Cindy's latest line.
  - On `/demo` the shell's checks look only inside the frame on screen.
- **`storefront-publish`** reads "Publish". It is the owner's own decision and emits `storefront.published` directly.
- **Tour additions:**
  - d04 carries `drawer: "support"`.
  - d15 also carries one scripted `data.synced` at 127.0, built from the mock data, so the data view has its numbers.
  - The timeline takes `ctb_01`, `mv_0101` and `mv_0102` from `demoContribution` and `demoFundMoves`.
- **Kit additions:** `Badge` variants `live`, `demo`, `rule`, `estimate`. `StatTile`.

### Tests (`definition-of-done.md`)

- `tests/smoke/lib.ts` (`I2-shell`) exports `seekToEvent(page, type, match, offsetMs)`, which finds the first event of that type whose payload matches in `player.getTimeline()` and seeks to its `at` plus the offset.
- Every v2 spec seeks by event, never by a fixed time, because `I2-tour` moves the beats.
- A feature's own `<slug>-lib.ts` may re-export it but never copies it.
- Acceptance lines check arrival with the default expect timeout and check the 1.2-second and 300 ms spacing from the events' `at`, never from a short wall-clock window.

### Server and scripts (`api-contract.md`, `conventions.md`)

- **Server:**
  - `server/config.py` reads the v2 names in section 1 and adds `elastic_headers()`, `apify_headers()` and `spacetime_headers()`, each returning its auth header, or an empty dict in proxy mode or with no token. Upgrades use these instead of reading keys themselves. It holds `ALLOWED_MODELS` and `CLAUDE_BASE_URL` (section 1), and `MODEL_TOP` leaves it.
  - `has_key()` reads config's resolved values, never `os.environ`.
  - `server/services.py` adds `spacetime_reachable()` and `model_present()`.
  - `tests/server/conftest.py` adds `needs_service()`, and an autouse fixture that swaps every key in `config` for a fake and clears the `*_AUTH` flags, except in tests marked `live`. Live tests never assert on headers or print requests.
  - `server/requirements.txt` carries `--extra-index-url https://download.pytorch.org/whl/cpu`, and no `elasticsearch` package (B12 uses `httpx`).
  - `scripts/server.mjs` starts uvicorn with `--timeout-graceful-shutdown 3` and `HF_HUB_OFFLINE=1`.
- **Scripts:**
  - `artifacts/mock/mock.json` holds one key per non-function export of `src/mock/index.ts`, plus `_generatedAt`.
  - npm scripts `export:mock` and `art` (with `--check`), plus `scripts/check-contrast.mjs`.
  - `scripts/gate.mjs` learns G1b, G2b and G4v2, with section 10's time rule.
  - D-deploy adds `npm run build:public` (`scripts/build-public.mjs`, the build with `VITE_PUBLIC_SITE=1`, which writes `dist/public-build.json`), `scripts/make-market.mjs` (the sandbox market's pages in `public/market/`, from `mock.json`), `scripts/check-public.mjs` (checks the public build and `public/_redirects`) and `scripts/laptop-setup.mjs` (the demo laptop's setup and its rehearsal checklist).

### Glossary

| Word | Code name | English label | Chinese label | Meaning |
|---|---|---|---|---|
| community fund | `Party.kind: "community_fund"` | Community fund | 社区基金 | Where project contributions go, in full |

### From the data and backend plans (Oct 24, 3:00 PM)

- **The scripted runs** (`src/mock/swarm.ts`): the list below, from `S3-catalog.md`. Every run has the fields of I2-core's `ScriptedRun`.

| Run | Thread | Side | Trigger | What it is | Final events, in order |
|---|---|---|---|---|---|
| `run_01` | `thr_01` | buyer | support, `pieceId` `pc_01` | The d04 question | `support.answered` |
| `run_02` | `lst_01` | seller | listing `lst_01`, its notes | The d15 listing | `listing.drafted`, `listing.indexed`, `approval.requested` `apr_04` |
| `run_03` | `sto_01` | seller | storefront `sto_01` | The Designer drafts the co-op's storefront | `storefront.drafted` |
| `run_04` | `thr_02` | seller | support | "When do I get paid for September?" | `support.answered` |
| `run_05` | `thr_00` | buyer | none (fallback) | `fallbackSupportRun`, L16 | `support.answered` |
| `run_06` | `thr_00` | seller | none (fallback) | `fallbackListingRun`, a draft labeled as a sample | `listing.drafted` |
| `run_07` | `thr_03` | buyer | support, `pieceId` `pc_01` | The meaning question that goes to the maker | `support.answered` (L14), `question.forwarded` `qst_01` |
| `run_08` | `thr_04` | buyer | support, `pieceId` `pc_01` | The find question through Elastic Agent Builder | `support.answered` |
| `run_09` | `thr_03` | buyer | question `qst_01` | The "ask the maker" relay of Grace N.'s answer | `support.answered` quoting her words |
| `run_10` | `thr_05` | seller | support | "Why is part of my September pay held?" | `support.answered` |
- **Where the new approvals live:** `apr_03` and `fup_02` in `watch.ts`, `apr_04` in `listings.ts`, `apr_05` in `projects.ts`. `getById()` finds them, and the approvals feature reads them the same way as `apr_01` and `apr_02`.
- **`Policy`** is a list of topics (`pol_01` onward), each with `title: Text`, `body: Text` and an optional `data` record. `pol_01` (shipping) holds `{ transitDaysMin: 6, transitDaysMax: 10 }`.
- **B14 requests** carry `runId` and `idStart`, and the listing request adds `vibeVocabulary` and an optional `image`.
- **`listing.indexed`** is keyed `b14-swarm`, because the listing run's Indexer produces it, and B12's adapter answers that one with `[]`. B12's publish sends its own, keyed `b12-search`.
- **B12's module functions** are `search`, `surprise`, `converse`, `index_draft` and `publish`. `ALLOWED_EMPTY_FALLBACKS` adds `b12-search` for `search.answered` and `surprise.drawn`.
- **B13:** the table columns and reducer arguments are as `docs/plans/B13-live.md` writes them. A Rust module needs the hosts `static.rust-lang.org`, `index.crates.io` and `static.crates.io`.
- **B15:**
  - `ALLOWED_EMPTY_FALLBACKS` (`tests/demo/beats.ts`) lists the tour's keyed events for every v2 source (section 10): `b15-watch` for `watch.scanned`, `counterfeit.flagged` and `followup.drafted`, `b14-swarm` for `swarm.step`, `support.answered`, `listing.drafted`, `listing.indexed`, `question.forwarded` and `question.answered`, and `b12-search` for `search.answered` and `surprise.drawn`. `REQUIRED_KEYS` has `b14-swarm: anthropic`, `b15-watch: apify` and `b16-bank-books: nessie`, and `REQUIRED_SERVICES` has `model` for `b11-embed` and `b12-search` and `spacetime` for `b13-live`.
  - The tour's `followup.drafted` `fup_02` is keyed `b15-watch` (`I2-tour`'s timeline task).
  - A scan's `threadId` is its `scanId`.
  - The similarity is normalized, `(c - b) / (1 - b)`. B15 measures its threshold into `server/b15_watch/threshold.json` (the lowest with precision at least 0.9), and until then uses 0.75, marked "not measured".
  - There is no background tour scan and no `tourIds`. A live hit never takes `cft_01`.
- **`nativeName`** stays unset for everyone in v2. No Native-language text appears beyond standard craft terms.
- **Ownership:** `sponsors/` is the scribe's, and the edit guard allows it. `design/` is written only by the planning session's design lead and pushed by the planning session. The build session never writes it, and the edit guard has no design-lead role.

## 12. On-screen labels (`glossary.md`, and each feature's `strings.ts`)

Short labels in English and Chinese. Each owner copies both into its feature's `strings.ts` word for word, and Gordon checks the Chinese for L1, L4, L8 and L9 himself. L1 carries the site-wide truth, so the badges can stay small. Add no badges beyond these. A label renders inside the test ID its row names, and tests read it there.

| ID | English | Chinese | Where (test ID) | Owner |
|---|---|---|---|---|
| L1 | Demo. Every maker, community and story here is fictional. Nothing is for sale. | 演示版。这里的每位匠人、每个社区和每个故事都是虚构的。所有物品均不出售。 | The top bar's right side, small, on every page and in the tour (`shell-topnav`) | I2-shell |
| L2 | Demo: the Sell side is open so you can look around. In a real launch, only the co-op sees or approves anything here. | 演示：卖家后台对所有人开放，方便您浏览。正式上线后，只有合作社能查看或批准这里的内容。 | The Sell header, beside the co-op's name | I2-shell |
| L3 | Demo verification | 演示认证 | The start of the verification line on every `PieceCard` and result card from a `demo` community | I2-kit |
| L4 | Demo: this shows how verification would work. No real check was done. | 演示：这里展示认证将如何进行。并未做过真实核查。 | `buyer-verification`, `community-verification` | I2-kit, M-buyer, F-communities |
| L5 | Fictional maker and story, written by the Cindia team. | 虚构的匠人和故事，由 Cindia 团队撰写。 | The piece page, under the story, beside the Demo data badge (`buyer-story-card`) | M-buyer |
| L6 | This is the public demo. Nothing here can be bought. | 这是公开演示版。这里的物品都无法购买。 | The piece page, in place of Pay, on the public build only | M-buyer |
| L7 | Demo project. No money is collected. | 演示项目。不会收取任何款项。 | Beside every `project-fund-<projectId>` and `buyer-project-addon`, before the click | F-communities, M-buyer |
| L8 | Placeholder written by the Cindia team. In a real launch, the community writes this page. | 由 Cindia 团队撰写的占位内容。正式上线后，由社区自己撰写此页面。 | The community page's `about` box (`community-page`), the storefront's story block | F-communities, F-storefront |
| L9 | Kept out of this demo. In a real launch, the community sets these rules. For this demo, the Cindia team left these out. | 本演示未收录。正式上线后，由社区制定这些规则。本演示中，这些内容由 Cindia 团队排除在外。 | `community-protocols`: the first sentence is the title, the rest the line under it | F-communities, glossary |
| L10 | Demo receipt. Nothing was sold. | 演示收据。没有发生任何交易。 | The receipt for any `ord_user_` order (`buyer-receipt`) | M-buyer |
| L11 | AI agents answer here, using only Cindia's records. A person approves anything that moves money. | 这里由 AI 智能体回答，只使用 Cindia 的记录。任何涉及资金的操作都需由人批准。 | The top of `support-drawer`, both sides | F-support |
| L12 | Live: your question goes to Claude (Anthropic) to answer. Please don't type personal details. | 实时模式：您的问题将发送给 Claude（Anthropic）来回答。请不要输入个人信息。 | Under `support-input`, live mode only | F-support |
| L13 | Fictional storefront, made for a demo. | 虚构的店铺，为演示而制作。 | `store-footer`, after the preview line | F-storefront |
| L14 | Our records don't say, and I won't guess, so I'll ask Grace N. Her answer will show here in her own words. | 我们的记录里没有答案，我不会乱猜，所以我会去问 Grace N.。她的回答会以她自己的原话显示在这里。 | The reply (`support-reply`) when a meaning or authenticity question goes to the maker, with the piece's maker named | B14 Writer template, S3 T8 |
| L15 | The co-op attests that Grace N. wove this herself. That's the co-op's record. | 合作社证明这件作品由 Grace N. 亲手织成。这是合作社的记录。 | `run_01`'s reply (`support-reply`), and the pattern for every authenticity reply | S3 T8, B14 |
| L16 | In this demo, scripted answers cover the small grey, red and black wool weaving. Switch to Live to ask about this piece. | 在本演示中，脚本回答只涵盖灰红黑三色小幅羊毛编织。切换到实时模式即可询问这件作品。 | The fallback reply (`support-reply`) when the open piece isn't the run's piece | S3 T8 (`fallbackSupportRun`) |
| L17 | I can only look up the order on your screen. | 我只能查询您屏幕上的这笔订单。 | The buyer-side reply (`support-reply`) for any other order ID | B14 Clerk |
| L18 | Live steps are shared with every open screen in this demo. | 本演示中，实时步骤会同步给所有打开的屏幕。 | The swarm process view (`process-pane-swarm`), live mode | F-process |
| L19 | Text match 0.91. How close the listing's title and snippet are to this piece's description. Not a picture match. | 文本相似度 0.91。表示该商品的标题和摘要与这件作品描述的接近程度。不是图片比对。 | `watch-similarity-<cftId>`, the last two sentences as its hint | F-watch |
| L20 | Not verified by Cindia. That alone doesn't make it fake. | 未经 Cindia 认证。仅凭这一点不能说明它是假货。 | After the fairness line, in `watch-fairness` and in the approvals hit card | F-watch, M-approvals |
| L21 | Found on the sandbox market just now. Not checked by a person. | 刚刚在沙盒市场上发现。尚未经人工核查。 | Each live hit card (`watch-live-<cftId>`) | F-watch |
| L22 | Claims to be Native-made. We can't check that. | 声称是美洲原住民手作。我们无法核实。 | A claim-only result, which has no report button (`watch-claim-only-<n>`) | F-watch |
| L23 | Looks fine, dismiss | 看起来没问题，忽略 | The button beside `watch-report-<cftId>` (`watch-dismiss-<cftId>`) | F-watch |
| L24 | Nothing was sent. In this demo, reports never leave Cindia. | 什么都没有发送。在本演示中，举报永远不会离开 Cindia。 | `report_listing`'s "what happens next" after a grant | M-approvals |
| L25 | Cindy looks for listings that use the co-op's name or copy its words. The owner decides, and nothing is sent. | Cindy 会查找使用合作社名称或照搬其文字的商品。由店主决定，不会发送任何内容。 | The `d14-watch` narration | I2-tour |
| L26 | Names another community's craft. A maker lists only their own community's work. | 提到了其他社区的手艺。匠人只能上架自己社区的作品。 | The protocol check's note (`seller-listing-check-<checkId>`) when it fails for that reason | B14 Checker |
| L27 | Translated by the Lister agent. The maker hasn't checked this version. | 由上架智能体翻译。匠人尚未核对此版本。 | Beside the version the maker didn't write, in the approvals listing card and in `seller-listing-translated-<lang>` | M-approvals, F-seller-hub |
| L28 | 50 test queries over the same 54 fictional pieces, written separately by our data agent and never used for training. A small test, not a benchmark. | 50 条测试查询，覆盖同样的 54 件虚构作品，由我们的数据智能体另行编写，从未用于训练。这是一个小测试，不是基准评测。 | `search-proof`, `process-model-card`, the end card (`demo-end-card`) | F-search, F-process, I2-tour |
| L29 | Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved. | “实时”表示本次运行中由真实服务作答。Nessie 是沙盒银行，没有真实资金流动。 | The end card (`demo-end-card`), the money process view (`process-pane-money`) | I2-tour, F-process |
| L30 | Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them. | 这里的每个社区、每位匠人和每个故事都是虚构的。这些手艺是真实的传统。我们还没有与这些社区合作，正式上线将从与他们合作开始。 | The end card (`demo-end-card`), `README.md`, `docs/devpost/whats-real.md`, the Devpost | I2-tour, scribe |
