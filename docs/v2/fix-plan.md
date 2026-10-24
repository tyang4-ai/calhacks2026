# v2 fix plan · proposal

**Status: PROPOSAL, written Oct 24 at 4:00 PM PT. Nothing here has been applied yet.** Gordon approves it first. Then fix agents apply it to the plans, the contracts and the harness, a fresh agent re-checks the result, and the build session starts.

Sources: Gordon's 12 points (3:05 PM) and the seven reviews in `docs/v2/reviews/` (A1 novelty, A2 culture and trust, B1 architecture, B2 backend and ML, C tracks, D1 contracts and data, D2 connections). A finding is written as review and number, so `B1-4` is finding 4 in `B1-architecture.md`.

## 1. Decisions

### 1.1 Scope: narrow it (Gordon picks A, B or C)

Yes, "Indigenous and heritage makers" is too big. Seven Peoples on five continents means seven sets of facts to get right, seven communities spoken for, and a pitch with no center. Anthropic's track says "the narrower, the better" (C, Anthropic row).

| Option | The named community | Who else is in the catalog | Cost |
|---|---|---|---|
| A | The Gu studio | Chinese heritage crafts only. Native American makers are the first "next" | Lowest risk. Drops the Indigenous framing you asked for |
| **B, recommended** | The Gu studio stays the worked example and the money story | Native American makers, as the one Indigenous group: three communities. Every other People is "next" | Medium. Data plans change, the v1 money demo doesn't |
| C | Native American makers replace the Gu studio | Native American only | Highest. The green v1 money story, the Chinese maker statement and your Shanghai story all get rebuilt around a community you haven't worked with |

Why B: it keeps what's already green and what you've lived, and it gives the impact side a legal backbone. US law already says who may sell as Native-made (the Indian Arts and Crafts Act), and the problem is current and local: in August 2026 a San Francisco eBay seller admitted selling over $92,000 of jewelry imported from Asia as Native-made (U.S. Attorney, District of Arizona, Aug 5, 2026). The pitch then has two halves of one system: **pay the makers** (the Gu studio's books) and **prove it's theirs** (Native American makers).

The catalog under B (counts stay where they are, so fewer IDs move):

| Community | ID | Craft | Place | Pieces | Makers |
|---|---|---|---|---|---|
| The Gu Embroidery Studio | `com_gu` | Gu embroidery, a heritage craft, never called Indigenous | Shanghai, China | `pc_01` to `pc_12` (v1, unchanged) | `mkr_01` to `mkr_03` |
| A Diné weaving and silver co-op | `com_dine` | Wool rugs, silver and turquoise jewelry | Navajo Nation, Arizona, USA | `pc_13` to `pc_26` | `mkr_04` to `mkr_08` |
| An Ojibwe beadwork co-op | `com_ojibwe` | Floral beadwork: earrings, pouches, barrettes | Minnesota, USA | `pc_27` to `pc_40` | `mkr_09` to `mkr_13` |
| An Acoma pottery studio | `com_acoma` | Coil-built, hand-painted pottery | New Mexico, USA | `pc_41` to `pc_54` | `mkr_14` to `mkr_17` |

- Communities, owners, storefronts and projects go from eight to four: `own_01` to `own_04`, `sto_01` to `sto_04`, `prj_01` to `prj_04`. Pieces stay at 54 and makers at 17.
- Māori, Sámi, Inuit, Quechua, Maasai and Miao move to "next", each only with that community's own organizations. They leave the data, the art, the eval set and the slugs.
- **Words.** "Indian American" in English means Americans of South Asian descent. 印第安人 is "Native American" or "American Indian". The UI says "Native American" and nation names ("Diné (Navajo)", "Ojibwe", "Acoma Pueblo"). The Chinese UI says 美洲原住民 and 纳瓦霍（Diné）, 奥吉布瓦（Ojibwe）, 阿科马（Acoma）.
- The verification line for the three nations follows A2 R6: in a real launch, makers would be enrolled members of their nation or certified by it as Indian artisans, as the Act defines, and Cindia keeps only a yes or no. "No real check was done for this demo."

Under A, the three Native communities become two more Chinese heritage crafts plus the Miao co-op as heritage (A2-5). Under C, this plan is rewritten.

### 1.2 The 3-minute demo

Three minutes, in this order (Gordon's point 3):

1. **The pitch, 1 minute: what it is, why, the tech.** Three full-screen pitch cards at the start of `/demo`, so the whole pitch runs in one window. The Figma Slides deck for the Figma track mirrors the same three cards. Gordon writes the words tonight in `src/app/demo/pitch.ts`.
2. **The buyer minute.** Vibe search, the piece and where the money goes, a question answered by the swarm with a guard firing, pay, the receipt that promises to show when the maker is paid.
3. **The seller minute.** A maker's notes become a listing that our model embeds into the index, then the money: map, month, the catch, approve and seal, close, the maker's statement in Chinese, and the buyer's receipt turning to "Paid to the maker".

Rules:
- **Everything in the tour is scripted** (Gordon's point 4). It never waits on a network, and it plays the same every time.
- **Presenter mode.** `/demo?mode=present` pauses at the end of every beat. Space or the right arrow plays the next beat, the left arrow replays the current one. Gordon talks at his own pace and can stop for a judge. `/demo` without it auto-plays, for the video and the tests.
- **"Try it yourself."** After the tour, Gordon flips the Live switch and a judge types their own search or support question. Live mode answers people's own requests only. The tour's events stay scripted in both modes.
- **Chapter 2, for questions.** After the end card, the right arrow continues into Surprise me, the proofs, the counterfeit watch and the storefront. Any beat opens directly with `/demo?start=<beatId>`.

The new tour table. It replaces `docs/v2/contracts.md` section 8. Beat IDs stay the same where the beat survives, so plans that name a beat still point at the right one.

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

### 1.3 Our edge over Etsy

**Etsy pays the shop. Cindia pays the makers, and proves it.** Etsy is a marketplace. Cindia is the books and the proof behind the makers, on every channel, Etsy included.

1. **It pays each maker, not one shop account.** A studio or co-op on Etsy gets one payout and splits it by hand. Cindia splits every sale to each maker, holds and explains what's owed, gives each maker a statement in her own language, and turns the buyer's receipt to "Paid to the maker".
2. **It runs the books across channels.** The gallery's consignment, the studio's own site, Cindia's marketplace and Etsy all reconcile into one set of books, and Cindy catches the gallery paying $340 short.
3. **Provenance comes from the community, not the seller.** On Etsy the "Handmade" label is the seller's word, and since July 2024 items made by an outside production partner sit beside handmade ones under "Designed by" (TechCrunch, July 9, 2024). On Cindia, each piece shows who made it and under whose authority: China's heritage list for Gu embroidery, a nation's own enrollment or certification under the Indian Arts and Crafts Act for Native makers.
4. **Discovery that doesn't bury small makers.** Search by feeling on a model trained for these crafts, and a Surprise me that leans toward makers who sold less this month.
5. **The storefront is theirs.** Each seller has a page at their own link and keeps the customer relationship.

We don't claim lower fees. Cindia's own fee is 10%.

### 1.4 The backend: three pillars, and the other tracks

The backend rests on three things (Gordon's point 1):

1. **A swarm of small Claude agents** (`B14-swarm`). 21 roles, each with one job, typed input and output, and only `claude-haiku-5-5` and `claude-sonnet-5-5`. No Opus and no Fable anywhere in the product: a test fails on any other model ID, and `MODEL_TOP` leaves `server/config.py`. Six of the roles are plain code, and the README says why each agent exists. A person approves anything that moves money.
2. **Our own embedding model, which embeds every seller entry** (`B11-embed`, `B12-search`). `multilingual-e5-small` fine-tuned on Claude-written queries about the catalog. The Indexer embeds each new listing the moment it's drafted (into `cindia-drafts`) and moves it into `cindia-pieces` when the owner approves. In the tour, `listing.indexed` shows the new vector and its dot on the map.
3. **One database that holds everything** (`B13-live`, now "the database"). SpacetimeDB is the system of record: the catalog (seeded from the mock data), listings, orders, approvals, swarm runs and steps, process status and the screens watching. Elastic is the search index built from it, with the Agent Builder agent `cindia-finder` called from code for find questions (C-3). A new `data` process view shows the tables, their row counts and the newest rows, live from SpacetimeDB in live mode and from the mock data in scripted mode.

The other tracks stay, each with the one fix its review asked for:

| Track | What carries it | Fix |
|---|---|---|
| Visa | Checkout token, the split with the gallery comparison, the receipt, consent | Project add-on off by default (C-10), the comparison line (A1-10) |
| Capital One | B04 on Nessie | New `B16-bank-books`: in live mode, B01 reads the bank side back from Nessie, so the $340 catch is found against Nessie, and the fund moves post as a deposit and a withdrawal (C-5) |
| Hyphenate | The money spine, the process views | Reconcile and approvals views open during `d07` and `d09` (C-12), one seats line on the end card |
| Microsoft | Swap points and fallbacks | A "path to production" page (C-14) |
| Meta | The maker's voice | Lu Yun's note on the paid receipt (A1-7), the "ask the maker" run in Chinese and English (C-13) |
| Elastic | B12 hybrid search, `cindia-finder` | Find questions routed to Agent Builder in code, labeled in the swarm view (C-3) |
| SpacetimeDB | B13, the database | As pillar 3, plus presence on the process bar (C-4) |
| Apify | B15, the copy watch | Shows every result Apify returned, crawls our sandbox market (section 1.6) |
| Figma | The design pipeline | Stage log, the Slides deck that mirrors the pitch cards, the workflow video (C-2) |
| MLH | The domain | Points at the public site (section 1.8) |
| Anthropic | The swarm, the guards | "Where it could go wrong" table and the impact measurement plan (C-7) |

**G5 changes for v2 upgrades** (B2-4). Since the tour is always scripted, a v2 upgrade (B11 to B16) passes G5 when: `npm run test:server` passes, its live feature spec answers a person's own request end to end with every event valid, and the scripted tour still passes with the source in live mode (the tour's keyed events for that source are listed in `ALLOWED_EMPTY_FALLBACKS`). v1 upgrades keep v1's G5 on the Phase A demo.

### 1.5 Backend if time

Gordon's point 1: the pitch keeps its claims as written, and the parts the build hasn't made true yet go here. The cloud build works this list after everything above is green, in this order. The on-screen labels stay truthful either way (Simulated badges, the what's-real list), which is also what keeps Q&A safe.

| The pitch says | What the demo has | What "if time" builds |
|---|---|---|
| "Cindy turns your words into keywords" | A rule-based keyword extractor in both modes | In live mode the Finder (Haiku) returns the chips and filters with `search.answered`, the rule-based one stays the instant preview (C-9) |
| "Tested on queries written by hand" | 50 held-out queries written by the data agent | Gordon writes or edits 15 of them (about 10 minutes), reported as their own row (B2-7) |
| "The Describer reads each photo" | No photo upload | A photo on the listing form, the Describer's layer, image vectors |
| "Every screen reads from SpacetimeDB" | The listed tables, the data view, presence | B08's approval queue moves onto SpacetimeDB, so the seal crosses two screens through it |
| "Judges can try it live online" | The public site plays scripted | A hosted live API (section 1.8) |
| "Each seller builds their own storefront" | A mock block editor | A real builder |
| "Cindy asks the maker for you" | One scripted run | The live loop, translated by Claude |
| "A bigger model trained on a GPU" | The cloud CPU run | A longer run on the Akbari machine (section 1.7) |
| "An Apify actor others can use" | B15 calls an Apify crawler | Wrap Scout and Comparer as our own actor for Best Actor (C-6) |

### 1.6 Mock data only

Gordon's point 10. Nothing real goes into the data, the databases or the embeddings, in scripted mode, in live mode or on the public site.

- Every maker, community, piece, order, story, storefront, approval and statement is fictional and lives in `src/mock/`. The real crafts are described only with A2's safe craft facts (and the new ones for Ojibwe and Acoma, researched and sourced by the data fix).
- SpacetimeDB, Elastic, the model's training pairs, `vectors.json` and every test fixture are built only from `src/mock/` through `npm run export:mock`. The training queries are Claude-written about those fictional pieces, and the model card says so.
- **The copy watch never searches the real web.** Apify's Google search scraper is dropped. B15's Scout runs an Apify crawler over a **sandbox market**: static pages of fictional listings (some of them look-alikes of our pieces) that ship with the public site at `/market/`. Until the public site is up, B15 runs on its fixture and the watch stays scripted. Every URL in data and fixtures is on the sandbox market, `example.com` or `example.org`.
- Nessie is a sandbox bank with no real money (A2 L29).
- No real person, shop, co-op, gallery, trading post or authenticity mark is named anywhere (A2 R2, R7).
- A test scans `src/mock/`, the fixtures, `pairs.jsonl` and the model card for URLs outside the allowed hosts and for the names in `contentRules.peopleNames` used as product words.

### 1.7 Training the model

I can't SSH into the Akbari machine (section 4), so:
- **Default: the cloud VM trains it** inside B11 once the catalog and the training pairs exist. B2-5's settings make it fit: frozen word embeddings, a 128-token cap, `NO_DUPLICATES` batches, filtered hard negatives, a 3-step memory probe, a background run with a checkpoint each epoch. Expect 15 to 30 minutes on 2 vCPUs. It needs Full network for the base model.
- **Optional: Gordon trains on the Akbari machine.** B11 commits its inputs (`server/b11_embed/data/mock.json` and `pairs.jsonl`, both synthetic) and a script, `scripts/train-akbari.sh`, that clones the repo, builds a venv, trains on the GPU (or the CPUs if the driver still fails) and publishes to the Hugging Face repo. Gordon runs one command there with his own `HF_TOKEN` set in that shell.
- **Either way the hand-off is the Hugging Face repo.** `train.py` publishes the model and `report.json` (private, with its sha256), and `fetch_model.py` pulls the newest onto the cloud VM and the demo laptop (B2-3, D2-5). A model, `vectors.json` and an index that don't share one fingerprint are refused.

### 1.8 The public site

- **Scripted build only.** Every page has the site-wide fictional notice (A2 L1), `noindex` and a `robots.txt` that disallows everything, and Pay works only on Gu pieces (A2-2). It also serves the sandbox market at `/market/`.
- Gordon uploads `dist/` to Cloudflare Pages tonight (about 5 minutes), so B15 has its market and the domain has a target, and again from the final build after the freeze. A new plan, `D-deploy`, holds the steps, the `_redirects` file for deep links and the demo-laptop setup script (C-1).
- A hosted live API is in "Backend if time": FastAPI on a Hugging Face Space with Gordon's keys as Space secrets, rate-limited, behind the same Live switch.

### 1.9 Choices this plan settles where the reviews offered two

| Question | Pick | From |
|---|---|---|
| B13's transport | Short polling, `GET /api/b13/changes?after=<seq>` every 500 ms. No SSE | B2-1 |
| F-process view roots | `process-pane-<processId>` | B1-5, D1-18 |
| How a live run's IDs stay unique | A 6-character page tag the browser makes at load, in `src/sources/ids.ts`: `stp_user_<tag>_<n>`. Scripted answers keep `*_user_<n>` | B2-2, D1-21 |
| SpacetimeDB access | Bound to `127.0.0.1:3000`, private tables, the publisher's token as `SPACETIME_TOKEN` | B2-20 (over D2-36) |
| The tour's live B14 and B15 runs | None. The tour is scripted, so no prefetch | B2-4, A2-1 |
| The gate's time limit | The tour test alone, from `report.json` `endedAtWallMs`, against the timeline's `durationMs` plus a load allowance | B1-4 |
| Tags on the cloud | Push the branch only, record each tag and SHA in `status.md`, cut by SHA. Gordon pushes the tags from Windows at the freeze | D2-2 |
| SheetJS | No vendoring. V0 stops until Full network is on | D2-1 |
| The design-lead role in the edit guard | Not added. Only the planning session writes `design/` | B1-41 |
| Similarity on the watch | "Text match 0.91", a normalized score with its threshold measured in B15 | A2 L19, B2-9 |

## 2. The fixes, by file

Each fix agent owns the files in its row and nothing else. It applies every finding from the seven reviews (all severities) whose location is in its files, unless section 1 overrides it, plus the new work listed. Where a finding spans two agents' files, each applies its own side, using the names in section 1.9.

| Agent | Files | Findings to apply | New work from section 1 |
|---|---|---|---|
| **FX1 contracts** | `docs/v2/contracts.md`, `docs/v2/brief.md`, `docs/v2/README.md`, `docs/v2/apis-and-accounts.md` | A1-4, 6 (as section 1.5). A2's contract items ("Who changes what") and L1 to L30 as a new section 12. B1-38. B2-2, 20, 34. C-11, 12. D1-9, 12, 17, 19, 20, 25, 26, 28 to 54 where in the contracts. D2-17, 18, 21, 22, 35 | Section 2: the four communities, owners, storefronts, projects and slugs (1.1). Section 3: `data` in `ProcessId`, `question.forwarded` and `question.answered` (C-13), `pieceId` on `card.tokenized` (B1-34). Section 4: the `pitch` camera, `/demo?mode=present`, `?start=<beatId>`, presence. Section 5: B13's polling endpoint, B16, B15's sandbox market. Section 6: Haiku and Sonnet only. Section 8: the table in 1.2. Section 10: G5 for v2 (1.4), G4v2 timing. Section 1: `SPACETIME_TOKEN`, `PUBLIC_SITE_URL`. The brief: scope B, "Why not Etsy" (1.3), "Backend if time" (1.5), "Data care" (1.6), the 3-minute demo, "next" communities. README: plan table with M-desktop as P0 before I2-tour (C-11), B16, D-deploy |
| **FX2 core** | `docs/plans/I2-core.md` | B1-1 to 4, 6, 8, 9, 11, 13 to 15, 32, 33, 34, 38, 39, 40, 44. D1-1 to 3, 5, 6, 9 to 12, 16, 21, 22, 28, 35, 36, 47, 49, 53. D2-9, 10, 18, 20, 25, 29 to 31. B2-10 (main.py logging), 22, 23, 31, 34. A2-10 | The fallout step for the type widening (B1-1). `src/core/nav.ts`. `pageTag()` in `src/sources/ids.ts`. The `data` process and the two new event types. `MODEL_TOP` out of `server/config.py`. `--timeout-graceful-shutdown 3` in `scripts/server.mjs`. The secrets scan reads the v2 names from the environment |
| **FX3 shell and kit** | `docs/plans/I2-shell.md`, `I2-kit.md`, `I2-art.md`, `I3-redesign.md` | B1-2, 3, 5, 7, 16, 17, 18, 22, 23, 28, 31, 35. D1-1, 4, 24, 29, 40, 48. A2-2, 3, 23. D2-7 (the harness half in I2-shell T6) | A2 L1 and L2, `noindex`, `robots.txt`. The `demo` prop on `VerificationLine` and `PieceCard`. `StatTile` in the kit. I2-art draws the four communities' crafts (no Yei figures, no katsina, no feathers, no whirling log). Placeholder SVGs for all 54 pieces before G2b |
| **FX4 data** | `docs/plans/S3-catalog.md` | B1-8 to 10, 12, 13, 20 to 22. D1-5, 10, 11, 14, 15, 17, 26, 27, 33, 37, 38, 43, 49 to 51. A2-4 to 8, 12, 18, 20, 22 and R1 to R28 rewritten for the four communities. A1-5, 7, 9, 10, 14. C-3, 13, 22. B2-7, 9 | Scope B (1.1) with sourced safe craft facts for Ojibwe beadwork and Acoma pottery, researched now with links. Figures 11 and 12 re-stated for the new catalog (figure 12's keyword becomes `flower`). `run_01` gets its `check` step and the L15 reply. A second buyer question ("What do the peonies mean to her?") that ends in "I'll ask Lu Yun", a find question that goes through Agent Builder, the "ask the maker" run. `run_02` ends with `listing.indexed` and its scripted catch is an unsupported heritage claim (A1-14). Lu Yun's receipt note. The gallery split for the comparison. `contentRules.ts`. Mock-only rules (1.6). The data tasks split as B1-20 says |
| **FX5 tour** | `docs/plans/I2-tour.md` | A1-1, 2, 4, 11, 12. B1-3, 21, 24 (`cutFeatures`), 26, 27. D1-8, 13, 23, 34. B2-11. C-12. D2-34. A2 L25, L28 to L30 | The table in 1.2, the pitch cards and `src/app/demo/pitch.ts`, presenter mode, chapter 2, `?start=<beatId>`, the end card's seats line. `REQUIRED_KEYS` and `REQUIRED_SERVICES` for B11 to B16. Depends on M-desktop (C-11). Three spawns, as B1-26 says |
| **FX6 buyer features** | `docs/plans/F-search.md`, `M-buyer.md`, `F-support.md`, `F-communities.md`, `F-storefront.md` | B1-12, 18, 25, 27 to 29, 36, 43. D1-7, 34, 44, 46, 50. A1-2, 16, 17. A2-2, 3, 9, 10, 14, 17, 21, 22 and their labels. C-10, 13 | Scope B pages. Pay for Gu pieces only (move the `pc_20` acceptance to `pc_02`). The split comparison line, the receipt promise and maker note. Every acceptance line seeks by event, never by time. The "ask the maker" reply in English with Lu Yun's own words |
| **FX7 seller features** | `docs/plans/F-process.md`, `M-approvals.md`, `F-seller-hub.md`, `F-watch.md`, `M-maker-statement.md`, `M-desktop.md` | B1-5, 11, 15, 27, 28, 36, 37, 42. D1-16, 18, 31, 32, 54. A1-13, 15. A2-13, 15 and their labels. B2-14, 15. C-3, 4, 6, 13 | The `data` process view (`process-data-tables`) and presence on the bar. "Live: N of 11" on the bar. `seller-listing-indexed` in scripted mode. The maker side of "ask the maker", in Chinese. F-watch lists every checked result, not only hits. M-desktop becomes P0 |
| **FX8 backend** | `docs/plans/B11-embed.md`, `B12-search.md`, `B13-live.md`, `B14-swarm.md`, `B15-watch.md`, new `B16-bank-books.md`, `docs/tech/apify/` | Every B2 finding in B11 to B15. D1-19 (B08's owner route, as a B13 task), 20, 21, 25, 26, 41, 45, 52. D2-11 to 13, 19, 23, 26, 27, 32, 33, 36 (decided as 1.9). A2-1, 8, 9, 11, 12, 14, 16, 19, 20. C-3 to 6, 9 (as "if time"), 13 | 1.4 pillars: B13 holds the catalog, listings, orders, approvals, swarm, process status and screens, with polling. B14 Haiku and Sonnet only, with the test. B11 cloud training, `scripts/train-akbari.sh`, the HF hand-off and fingerprints. B15 crawls the sandbox market, with an offline page on the Apify crawler it uses saved to `docs/tech/apify/`. B16 as in 1.4. Every server read path says where it reads keys (`CINDIA_ANTHROPIC_API_KEY` first) |
| **FX9 harness** | `docs/harness/v2-runbook.md`, `CLAUDE.md`, `.claude/hooks/command-guard.mjs`, `.claude/hooks/test-hooks.mjs`, `.claude/agents/feature-lead.md`, `.claude/agents/scribe.md`, `.claude/skills/gate/SKILL.md`, `.claude/skills/cut/SKILL.md`, `.claude/skills/heartbeat/SKILL.md`, `.claude/rules/backend.md`, `docs/plans/D-sponsors.md`, new `docs/plans/D-deploy.md` | B1-1 (runbook step), 4, 19, 20, 24, 26, 27, 30. B2-21. D2-1, 2, 4, 6, 10, 14, 23, 24, 28, 35. C-1, 2, 7, 14 to 20, 24. A2-12, 18, 19 (scribe items) | V0 step 0: stop until the network check passes. Heartbeat restarts servers 5173, 8000 and 3000. G4v2 runs alone. The kickoff (section 6). D-deploy: the public site, the sandbox market, `_redirects`, the demo-laptop script and its checklist. D-sponsors: the Etsy edge, the Native-American scope and L30, the seats line, the Anthropic risk table. The runbook queue adds B16 and D-deploy |

Then **FX10, the re-check**, a fresh agent that hasn't seen the fixes being written. It reads this plan, the seven reviews and every changed file, and reports any name, ID, time, owner or count that two files state differently, and any blocker still open. I fix what it finds, and it checks once more.

## 3. How it gets applied

1. Gordon approves (or edits) this plan.
2. FX1 to FX9 run at the same time in the planning session. Each reports with the standard report block.
3. FX10 re-checks. I fix what it finds. FX10 checks again.
4. I run `node .claude/hooks/test-hooks.mjs`, commit `v2 fix: plans and contracts after review`, mark this file APPLIED and push.
5. Gordon starts the build session (section 6). From then on the planning session only pushes `design/`, `docs/tech/` and `docs/v2/`.

About an hour from approval to push.

## 4. What I won't do

- **SSH into the Akbari machine.** This cloud session has no route to the lab network, your SSH keys aren't reachable from the desktop bridge, and I won't type a password for you. So training defaults to the cloud, with a one-command script for you at the lab (1.7). The WAVE tutorial note in your vault holds a plaintext password, which is worth deleting.
- **Generate or type API keys, or create accounts, in Chrome.** Keys stay with you. Typing them into the cloud environment's settings is yours too. What I can do in Chrome, each time with your OK: set the three Figma files to "Anyone with the link", and open the exact settings page for anything else and stop before the click.

## 5. What Gordon does

**Before you leave (about 10 minutes):**
1. Answer the questions in chat and approve this plan.
2. In claude.ai/code, edit the cloud environment the build will use: network access **Full**, and add the variables `CINDIA_ANTHROPIC_API_KEY`, `NESSIE_KEY`, `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `APIFY_TOKEN` and `HF_TOKEN`. Leave `ANTHROPIC_API_KEY` unset there. Right now this session's environment has none of them, and every outside host it needs answers 000.
3. Stop the desktop orchestrator session.
4. After I push the fixes, start the build session (section 6). Your phone works for this.
5. Say yes if you want me to set the three Figma files to "Anyone with the link".

**Tonight, at the lab or after:**
- Write the three pitch cards (`src/app/demo/pitch.ts`) and your Devpost sections. The scribe's skeleton lands at 8:00 PM.
- Upload the public build to Cloudflare Pages (D-deploy), and register the MLH domain pointing at it.
- Optional: run `scripts/train-akbari.sh` at the lab, and write or edit 15 eval queries.
- Message one Gu embroidery maker or seller and ask for a quote you may use (A1, "the best return of all").
- Look at `artifacts/art/contact-sheet.png` for two minutes before the tour gate (A2-23).
- Delete `cindia-repo-export.tgz` from the vault's `resources` folder (I left it there to copy the docs over).
- Reserve an ethernet cable.

**Sunday:** be checked in by 8:00 AM, record the video, submit by 8:50 AM, push the tags from Windows (D2-2), and judge in presenter mode.

## 6. Kickoff for the build session

Start a new Claude Code cloud session with the GitHub repo `tyang4-ai/calhacks2026` as its source and the environment from step 2, then send:

```text
You are the orchestrator for the Cindia v2 build. The desktop session is stopped. Read CLAUDE.md, docs/harness/status.md, docs/harness/v2-runbook.md and docs/v2/fix-plan.md, then run the v2 runbook from V0 and keep going unattended until the 6:00 AM freeze.
```
