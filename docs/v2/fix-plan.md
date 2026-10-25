# v2 fix plan

**Status: APPROVED by Gordon at 4:25 PM PT on Oct 24, with his changes: Native American makers only (scope C), the "underrepresented makers" framing, and Cindia called a platform. Being applied now.** Fix agents apply it to the plans, the contracts and the harness. A fresh agent re-checks the result, and the build session starts.

**Build sessions: don't start V0 until this status line says APPLIED.** Until then the plans on `main` are mid-edit.

Sources: Gordon's 12 points (3:05 PM), his answers (4:25 PM), and the seven reviews in `docs/v2/reviews/` (A1 novelty, A2 culture and trust, B1 architecture, B2 backend and ML, C tracks, D1 contracts and data, D2 connections). A finding is written as review and number, so `B1-4` is finding 4 in `B1-architecture.md`.

## 1. Decisions

### 1.1 Scope: Native American makers

**Cindia is a platform for underrepresented makers, starting with Native American makers.** Gordon's framing, from the Anthropic mentors: if we don't help them, who will? Yes, it works like Etsy. But selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Cindia does the selling, the marketing and the books for them, and it's fair by design: the price split is shown, search ranks by fit and not by ads, and Surprise me leans toward makers who sold less.

The catalog:

| Community | IDs | Craft | Place | Pieces | Makers | Owner, storefront, project |
|---|---|---|---|---|---|---|
| **Diné Weaving and Silver Co-op**, the named community. It is v1's studio, re-skinned | `com_dine`, studio `std_dine` | Wool weavings, silver and turquoise jewelry | Navajo Nation, Arizona, USA | `pc_01` to `pc_12` | `mkr_01` to `mkr_03` | `own_01`, `sto_01`, `prj_01` |
| An Ojibwe beadwork co-op | `com_ojibwe` | Floral beadwork: earrings, pouches, barrettes | Minnesota, USA | `pc_13` to `pc_26` | `mkr_04` to `mkr_08` | `own_02`, `sto_02`, `prj_02` |
| An Acoma pottery studio | `com_acoma` | Coil-built, hand-painted pottery | New Mexico, USA | `pc_27` to `pc_40` | `mkr_09` to `mkr_13` | `own_03`, `sto_03`, `prj_03` |
| A Seminole patchwork co-op | `com_seminole` | Patchwork skirts, jackets and bags | Florida, USA | `pc_41` to `pc_54` | `mkr_14` to `mkr_17` | `own_04`, `sto_04`, `prj_04` |

- Storefront slugs: `dine-weavers`, `ojibwe-beadwork`, `acoma-pottery`, `seminole-patchwork`.
- Pieces stay at 54 and makers at 17. Communities, owners, storefronts and projects go from eight to four.
- Gu embroidery and every other People (Māori, Sámi, Inuit, Quechua, Maasai, Miao) move to "next", each only with that community's own organizations. They leave the data, the art, the eval set, the slugs and the labels.

**The v1 re-skin (new step R0, before everything else in V1).** v1's whole money story moves to the Diné co-op:
- **Every number stays.** Prices, materials, hours, fees, payouts, the gallery's 40% commission, the $340 short payment, the $95 held, and figures 1 to 10 don't change. Only names, words and art change, so v1's checks keep passing once their expected strings are updated.
- **Names.** The studio "Gu Embroidery Studio" becomes "Diné Weaving and Silver Co-op", and its ID `std_gu` becomes `std_dine` everywhere. The owner Shen Ruolan becomes Ruth B. The makers Lu Yun, Han Jing and Zhou Mei become Grace N., Lena T. and Mae K. (A2 R9: a common English given name and a family initial). The gallery stays Fogline Gallery, San Francisco.
- **Pieces.** `pc_01`, the "Peony fan", becomes a small wool weaving in grey, red and black by Grace N., with the same 26 hours, $22 of materials and $180 price. The other eleven become weavings and silver pieces at their v1 numbers. Process steps become physical weaving and silver steps (A2 R13).
- **Heritage and verification.** The heritage line becomes A2's safe Diné line. The verification line follows A2 R6: in a real launch, makers would be enrolled members of the Navajo Nation or certified by it as Indian artisans, as the Indian Arts and Crafts Act defines, and Cindia keeps only a yes or no. "No real check was done for this demo."
- **Language.** The maker's statement is in English. The platform keeps Chinese as a second interface language, and the maker page opens in English.
- The data fix writes the full old-to-new table into a new plan, `docs/plans/R0-reskin.md`, with one task per owner (data-smith, integrator, feature-lead, backend-builder), all landing in one commit with every v1 check green.

**Words.** In English: "Native American", and nation names "Diné (Navajo)", "Ojibwe", "Acoma Pueblo", "Seminole". Never "Indian American", which means Americans of South Asian descent, and never a nation's name as a product word (A2 R10). In Chinese: 美洲原住民, and 纳瓦霍（Diné）, 奥吉布瓦（Ojibwe）, 阿科马（Acoma）, 塞米诺尔（Seminole）.

**Platform.** The brief, the contracts, the pitch cards, the README and the Devpost call Cindia a platform, never an app or an application.

### 1.2 The 3-minute demo

Three minutes, in this order (Gordon's point 3):

1. **The pitch, 1 minute: what it is, why, the tech.** Three full-screen pitch cards at the start of `/demo`, so the whole pitch runs in one window. The Figma Slides deck for the Figma track mirrors the same three cards. Gordon writes the words tonight in `src/app/demo/pitch.ts`.
2. **The buyer minute.** Vibe search, the piece and where the money goes, a question answered by the swarm with a guard firing, pay, and a receipt that promises to show when Grace N. is paid.
3. **The seller minute.** A maker's notes become a listing that our model embeds into the index, then the money: map, month, the catch, approve and seal, close, Grace N.'s statement, and the buyer's receipt turning to "Paid to the maker".

Rules:
- **Everything in the tour is scripted** (Gordon's point 4). It never waits on a network, and it plays the same every time.
- **Presenter mode.** `/demo?mode=present` pauses at the end of every beat. Space or the right arrow plays the next beat, and the left arrow replays the current one. Gordon talks at his own pace and can stop for a judge. `/demo` without it auto-plays, for the video and the tests.
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
- Figure 11's query is rewritten to fit the new `pc_01` honestly, with six chips that still include `gift for mom` and `under $200`. The data fix picks the words.

### 1.3 Our edge over Etsy

**Etsy pays the shop. Cindia pays the makers, and proves it.** Etsy is a marketplace that sellers have to learn and work. Cindia is a platform that does the selling, the marketing and the books for the makers, on every channel, Etsy included.

1. **It does the work for them.** A maker writes a few lines of notes, and Cindia's agents draft the listing, index it, answer buyers and run the books. No shop to manage, no ads to buy.
2. **It pays each maker, not one shop account.** A co-op on Etsy gets one payout and splits it by hand. Cindia splits every sale to each maker, holds and explains what's owed, gives each maker a plain statement, and turns the buyer's receipt to "Paid to the maker".
3. **It runs the books across channels.** The gallery's consignment, the co-op's own site, Cindia's marketplace and Etsy all reconcile into one set of books, and Cindy catches the gallery paying $340 short.
4. **Provenance comes from the community, not the seller.** On Etsy the "Handmade" label is the seller's word, and since July 2024 items made by an outside production partner sit beside handmade ones under "Designed by" (TechCrunch, July 9, 2024). On Cindia, each piece shows who made it and under whose authority: the maker's own nation, under the Indian Arts and Crafts Act. Fakes are a live problem: in August 2026 a San Francisco eBay seller admitted selling over $92,000 of jewelry imported from Asia as Native-made (U.S. Attorney, District of Arizona, Aug 5, 2026).
5. **Fair by design, and the math is shown.** Search ranks by fit, not by ads. Surprise me leans toward makers who sold less this month, with the weights in the open. The split is on the page before anyone pays.
6. **The storefront is theirs.** Each seller has a page at their own link and keeps the customer relationship.

We don't claim lower fees. Cindia's own fee is 10%.

### 1.4 The backend: three pillars, and the other tracks

The backend rests on three things (Gordon's point 1):

1. **A swarm of small Claude agents** (`B14-swarm`). 21 roles, each with one job and typed input and output, using only `claude-haiku-5-5` and `claude-sonnet-5-5`. No Opus and no Fable anywhere in the platform: a test fails on any other model ID, and `MODEL_TOP` leaves `server/config.py`. Six of the roles are plain code, and the README says why each agent exists. A person approves anything that moves money.
2. **Our own embedding model, which embeds every seller entry** (`B11-embed`, `B12-search`). `multilingual-e5-small` fine-tuned on Claude-written queries about the catalog. The Indexer embeds each new listing the moment it's drafted (into `cindia-drafts`) and moves it into `cindia-pieces` when the owner approves. In the tour, `listing.indexed` shows the new vector and its dot on the map.
3. **One database that holds everything** (`B13-live`, now "the database"). SpacetimeDB is the system of record: the catalog (seeded from the mock data), listings, orders, approvals, swarm runs and steps, process status and the screens watching. Elastic is the search index built from it, with the Agent Builder agent `cindia-finder` called from code for find questions (C-3). A new `data` process view shows the tables, their row counts and the newest rows: live from SpacetimeDB in live mode, from the mock data in scripted mode.

The other tracks stay, each with the one fix its review asked for:

| Track | What carries it | Fix |
|---|---|---|
| Visa | Checkout token, the split with the gallery comparison, the receipt, consent | Project add-on off by default (C-10), the comparison line (A1-10) |
| Capital One | B04 on Nessie | New `B16-bank-books`: in live mode, B01 reads the bank side back from Nessie, so the $340 catch is found against Nessie, and the fund moves post as a deposit and a withdrawal (C-5) |
| Hyphenate | The money spine, the process views | Reconcile and approvals views open during `d07` and `d09` (C-12), one seats line on the end card |
| Microsoft | Swap points and fallbacks | A "path to production" page (C-14) |
| Meta | The maker's voice | Grace N.'s note on the paid receipt (A1-7), the "ask the maker" run (C-13) |
| Elastic | B12 hybrid search, `cindia-finder` | Find questions routed to Agent Builder in code, labeled in the swarm view (C-3) |
| SpacetimeDB | B13, the database | As pillar 3, plus presence on the process bar (C-4) |
| Apify | B15, the copy watch | Shows every result Apify returned, and crawls our sandbox market (section 1.6) |
| Figma | The design pipeline | Stage log, the Slides deck that mirrors the pitch cards, the workflow video (C-2) |
| MLH | The domain | Points at the public site (section 1.8) |
| Anthropic | The swarm, the guards | "Where it could go wrong" table and the impact measurement plan (C-7) |

**G5 for v2 upgrades** (B2-4). Since the tour is always scripted, a v2 upgrade (B11 to B16) passes G5 when `npm run test:server` passes, its live feature spec answers a person's own request end to end with every event valid, and the scripted tour still passes with the source in live mode (the tour's keyed events for that source are listed in `ALLOWED_EMPTY_FALLBACKS`). v1 upgrades keep v1's G5 on the Phase A demo.

### 1.5 Backend if time

Gordon's point 1: the pitch keeps its claims as written, and the parts the build hasn't made true yet go here. The cloud build works this list after everything above is green, in this order. On-screen labels stay truthful either way (Simulated badges, the what's-real list), which is also what keeps Q&A safe.

| The pitch says | What the demo has | What "if time" builds |
|---|---|---|
| "Cindy turns your words into keywords" | A rule-based keyword extractor in both modes | In live mode the Finder (Haiku) returns the chips and filters with `search.answered`, and the rule-based one stays the instant preview (C-9) |
| "Tested on queries written by hand" | 50 held-out queries written by the data agent | Gordon writes or edits 15 of them (about 10 minutes), reported as their own row (B2-7) |
| "The Describer reads each photo" | No photo upload | A photo on the listing form, the Describer's layer, image vectors |
| "Every screen reads from SpacetimeDB" | The listed tables, the data view, presence | B08's approval queue moves onto SpacetimeDB, so the seal crosses two screens through it |
| "Judges can try it live online" | The public site plays scripted | A hosted live API (section 1.8) |
| "Each seller builds their own storefront" | A mock block editor | A real builder |
| "Cindy asks the maker for you" | One scripted run | The live loop |
| "A bigger model trained on a GPU" | The cloud CPU run | A longer run on the Akbari machine (section 1.7) |
| "An Apify actor others can use" | B15 calls an Apify crawler | Wrap Scout and Comparer as our own actor for Best Actor (C-6) |

### 1.6 Mock data only

Gordon's point 10. Nothing real goes into the data, the databases or the embeddings, in scripted mode, in live mode or on the public site.

- Every maker, community, piece, order, story, storefront, approval and statement is fictional and lives in `src/mock/`. Real crafts are described only with sourced safe craft facts: A2's line for Diné weaving, and new lines for Diné silverwork, Ojibwe beadwork, Acoma pottery and Seminole patchwork, researched and sourced by the data fix.
- SpacetimeDB, Elastic, the model's training pairs, `vectors.json` and every test fixture are built only from `src/mock/` through `npm run export:mock`. The training queries are Claude-written about those fictional pieces, and the model card says so.
- **The copy watch never searches the real web.** Apify's Google search scraper is dropped. B15's Scout runs an Apify crawler over a **sandbox market**: static pages of fictional listings, some of them look-alikes of our pieces, that ship with the public site at `/market/`. Until the public site is up, B15 runs on its fixture and the watch stays scripted. Every URL in data and fixtures is on the sandbox market, `example.com` or `example.org`.
- A claim-only listing on the sandbox market ("Authentic Native American made", no maker named) is the example of what the watch can't judge: "Claims to be Native-made. We can't check that." It gets no report button (A2-1, L22).
- Nessie is a sandbox bank with no real money (A2 L29).
- No real person, shop, co-op, gallery, trading post or authenticity mark is named anywhere (A2 R2, R7).
- A test scans `src/mock/`, the fixtures, `pairs.jsonl` and the model card for URLs outside the allowed hosts and for a nation's name used as a product word.

### 1.7 Training the model

**The cloud session can't SSH into the Akbari machine.** Its only way out is a web proxy that reaches listed websites over HTTPS. The machine sits on SCU's private lab network (172.16.x), which nothing outside can route to, and SSH isn't web traffic. Tailscale on that machine would need Gordon's tailnet key in the cloud and the lab's OK to put a cloud agent on a shared research machine, and the proxy likely can't carry it anyway. So:
- **Default: the cloud VM trains it** inside B11 once the catalog and the training pairs exist. B2-5's settings make it fit: frozen word embeddings, a 128-token cap, `NO_DUPLICATES` batches, filtered hard negatives, a 3-step memory probe, and a background run with a checkpoint each epoch. Expect 15 to 30 minutes on 2 vCPUs. It needs Full network for the base model.
- **Optional: Gordon trains on the Akbari machine** while he's at the lab. B11 commits its inputs (`server/b11_embed/data/mock.json` and `pairs.jsonl`, both synthetic) and a script, `scripts/train-akbari.sh`, that clones the repo, builds a venv, trains on the GPU (or the CPUs if the driver still fails) and publishes to the Hugging Face repo. Gordon runs one command there with his own `HF_TOKEN` set in that shell.
- **Either way the hand-off is the Hugging Face repo.** `train.py` publishes the model and `report.json` (private, with its sha256), and `fetch_model.py` pulls the newest onto the cloud VM and the demo laptop (B2-3, D2-5). A model, `vectors.json` and an index that don't share one fingerprint are refused.

### 1.8 The public site

- **Scripted build only** (Gordon's answer). Every page has the site-wide fictional notice (A2 L1), `noindex` and a `robots.txt` that disallows everything. No piece can be bought on the public build: Pay shows A2 L6 there, while localhost keeps the demo checkout (A2-2). It also serves the sandbox market at `/market/`.
- Gordon uploads `dist/` to Cloudflare Pages tonight (about 5 minutes), so B15 has its market and the domain has a target, and again from the final build after the freeze. A new plan, `D-deploy`, holds the steps, the `_redirects` file for deep links and the demo-laptop setup script (C-1).
- A hosted live API stays in "Backend if time".

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
| Who the watch looks for | Copies of the Diné co-op's own pieces: a result must name the co-op or a maker, repeat an 8-word run of a piece's story, or claim a Cindia verification it lacks | A2-1 |

## 2. The fixes, by file

Each fix agent owns the files in its row and nothing else. It applies every finding from the seven reviews (all severities) whose location is in its files, unless section 1 overrides it, plus the new work listed. Where a finding spans two agents' files, each applies its own side, using the names in sections 1.1 and 1.9. A2's rules R1 to R28 and labels L1 to L30 apply with the four Native American communities in place of the old eight.

| Agent | Files | Findings to apply | New work from section 1 |
|---|---|---|---|
| **FX1 contracts** | `docs/v2/contracts.md`, `docs/v2/brief.md`, `docs/v2/README.md`, `docs/v2/apis-and-accounts.md` | A1-4, 6 (as section 1.5). A2's contract items ("Who changes what") and L1 to L30 as a new section 12. B1-38. B2-2, 20, 34. C-11, 12. D1-9, 12, 17, 19, 20, 25, 26, and 28 to 54 where in the contracts. D2-17, 18, 21, 22, 35 | Section 2: the four communities and every ID and slug in 1.1, `std_dine`, the new names. Section 3: `data` in `ProcessId`, `question.forwarded` and `question.answered` (C-13), `pieceId` on `card.tokenized` (B1-34). Section 4: the `pitch` camera, `/demo?mode=present`, `?start=<beatId>`, presence. Section 5: B13's polling endpoint, B16, B15's sandbox market. Section 6: Haiku and Sonnet only. Section 8: the table in 1.2. Section 10: G5 for v2 (1.4), G4v2 timing. Section 1: `SPACETIME_TOKEN`, `PUBLIC_SITE_URL`. The brief: the platform for underrepresented makers (1.1), "Why not Etsy" (1.3), "Backend if time" (1.5), "Data care" (1.6), the 3-minute demo, the "next" communities, with every figure checked against a current source and linked. README: plan table with R0 first, M-desktop as P0 before I2-tour (C-11), B16, D-deploy |
| **FX2 core** | `docs/plans/I2-core.md` | B1-1 to 4, 6, 8, 9, 11, 13 to 15, 32, 33, 34, 38, 39, 40, 44. D1-1 to 3, 5, 6, 9 to 12, 16, 21, 22, 28, 35, 36, 47, 49, 53. D2-9, 10, 18, 20, 25, 29 to 31. B2-10 (main.py logging), 22, 23, 31, 34. A2-10 | Runs after R0, with the new names. The fallout step for the type widening (B1-1). `src/core/nav.ts`. `pageTag()` in `src/sources/ids.ts`. The `data` process and the two new event types. `MODEL_TOP` out of `server/config.py`. `--timeout-graceful-shutdown 3` in `scripts/server.mjs`. The secrets scan reads the v2 names from the environment |
| **FX3 shell and kit** | `docs/plans/I2-shell.md`, `I2-kit.md`, `I2-art.md`, `I3-redesign.md` | B1-2, 3, 5, 7, 16, 17, 18, 22, 23, 28, 31, 35. D1-1, 4, 24, 29, 40, 48. A2-2, 3, 23. D2-7 (the harness half in I2-shell T6) | A2 L1 and L2, `noindex`, `robots.txt`, no Pay on the public build. The `demo` prop on `VerificationLine` and `PieceCard`. `StatTile` in the kit. I2-art draws all 54 pieces, `pc_01` to `pc_12` included, for the four crafts: weaving and silver, floral beadwork, pottery, patchwork. Never Yei figures, katsina, feathers, the whirling-log shape or sandpainting designs. Placeholder SVGs for all 54 before G2b |
| **FX4 data** | `docs/plans/S3-catalog.md`, new `docs/plans/R0-reskin.md` | B1-8 to 10, 12, 13, 20 to 22. D1-5, 10, 11, 14, 15, 17, 26, 27, 33, 37, 38, 43, 49 to 51. A2-4 to 8, 12, 18, 20, 22, and R1 to R28 rewritten for the four communities. A1-5, 7, 9, 10, 14. C-3, 13, 22. B2-7, 9 | R0-reskin (1.1): the full old-to-new table and one task per owner, from a grep of `src/`, `tests/`, `server/`, `docs/common/` and `public/`. S3 for scope C, with sourced safe craft facts for Diné silverwork, Ojibwe beadwork, Acoma pottery and Seminole patchwork, researched now and linked. Figures 11 and 12 re-stated for the new catalog. `run_01` gets its `check` step and the L15 reply. A second buyer question about meaning that ends in "I'll ask Grace N.", a find question that goes through Agent Builder, and the "ask the maker" run. `run_02` ends with `listing.indexed`, and its scripted catch is an unsupported claim the notes don't make (A1-14). Grace N.'s receipt note. The gallery split for the comparison. `contentRules.ts`. The mock-only rules (1.6). The data tasks split as B1-20 says |
| **FX5 tour** | `docs/plans/I2-tour.md` | A1-1, 2, 4, 11, 12. B1-3, 21, 24 (`cutFeatures`), 26, 27. D1-8, 13, 23, 34. B2-11. C-12. D2-34. A2 L25, L28 to L30 | The table in 1.2, the pitch cards and `src/app/demo/pitch.ts`, presenter mode, chapter 2, `?start=<beatId>`, the end card's seats line. `REQUIRED_KEYS` and `REQUIRED_SERVICES` for B11 to B16. Depends on M-desktop (C-11). Three spawns, as B1-26 says |
| **FX6 buyer features** | `docs/plans/F-search.md`, `M-buyer.md`, `F-support.md`, `F-communities.md`, `F-storefront.md` | B1-12, 18, 25, 27 to 29, 36, 43. D1-7, 34, 44, 46, 50. A1-2, 16, 17. A2-2, 3, 9, 10, 14, 17, 21, 22 and their labels. C-10, 13 | Scope C pages and names. Pay off on the public build. The split comparison line, the receipt promise and Grace N.'s note. Every acceptance line seeks by event, never by time. The buyer side of "ask the maker" |
| **FX7 seller features** | `docs/plans/F-process.md`, `M-approvals.md`, `F-seller-hub.md`, `F-watch.md`, `M-maker-statement.md`, `M-desktop.md` | B1-5, 11, 15, 27, 28, 36, 37, 42. D1-16, 18, 31, 32, 54. A1-13, 15. A2-13, 15 and their labels. B2-14, 15. C-3, 4, 6, 13 | The `data` process view (`process-data-tables`) and presence on the bar. "Live: N of 11" on the bar. `seller-listing-indexed` in scripted mode. The maker side of "ask the maker". F-watch lists every checked result, not only hits. The maker statement in English. M-desktop becomes P0 |
| **FX8 backend** | `docs/plans/B11-embed.md`, `B12-search.md`, `B13-live.md`, `B14-swarm.md`, `B15-watch.md`, new `docs/plans/B16-bank-books.md`, `docs/tech/apify/` | Every B2 finding in B11 to B15. D1-19 (B08's owner route, as a B13 task), 20, 21, 25, 26, 41, 45, 52. D2-11 to 13, 19, 23, 26, 27, 32, 33, 36 (decided as 1.9). A2-1, 8, 9, 11, 12, 14, 16, 19, 20. C-3 to 6, 9 (as "if time"), 13 | The 1.4 pillars: B13 holds the catalog, listings, orders, approvals, swarm, process status and screens, with polling. B14 on Haiku and Sonnet only, with the test, and prompts with the new names. B11's cloud training, `scripts/train-akbari.sh`, the HF hand-off and fingerprints. B15 crawls the sandbox market, with an offline page on the Apify crawler it uses saved to `docs/tech/apify/`. B16 as in 1.4. Every server plan says where it reads keys (`CINDIA_ANTHROPIC_API_KEY` first) |
| **FX9 harness** | `docs/harness/v2-runbook.md`, `CLAUDE.md`, `.claude/hooks/command-guard.mjs`, `.claude/hooks/test-hooks.mjs`, `.claude/agents/feature-lead.md`, `.claude/agents/scribe.md`, `.claude/skills/gate/SKILL.md`, `.claude/skills/cut/SKILL.md`, `.claude/skills/heartbeat/SKILL.md`, `.claude/rules/backend.md`, `docs/plans/D-sponsors.md`, new `docs/plans/D-deploy.md` | B1-1 (runbook step), 4, 19, 20, 24, 26, 27, 30. B2-21. D2-1, 2, 4, 6, 10, 14, 23, 24, 28, 35. C-1, 2, 7, 14 to 20, 24. A2-12, 18, 19 (scribe items) | V0 step 0: stop until the network check passes. V1 step 0: R0, the re-skin. The heartbeat restarts servers 5173, 8000 and 3000. G4v2 runs alone. CLAUDE.md's five lines for scope C and the platform. D-deploy: the public site, the sandbox market, `_redirects`, the demo-laptop script and its checklist. D-sponsors: the platform for underrepresented makers, the Etsy edge, L30, the seats line, the Anthropic risk table. The runbook queue adds R0, B16 and D-deploy |

Then **FX10, the re-check**: a fresh agent that hasn't seen the fixes being written. It reads this plan, the seven reviews and every changed file, and reports any name, ID, time, owner or count that two files state differently, and any blocker still open. I fix what it finds, and it checks once more.

## 3. How it gets applied

1. FX1 to FX9 run at the same time in the planning session. Each reports with the standard report block.
2. FX10 re-checks. I fix what it finds. FX10 checks again.
3. I run `node .claude/hooks/test-hooks.mjs`, commit `v2 fix: plans and contracts after review`, mark this file APPLIED and push.
4. Gordon starts the build session (section 6). From then on the planning session only pushes `design/`, `docs/tech/` and `docs/v2/`.

About an hour from approval to push.

## 4. What I won't do

- **SSH into the Akbari machine.** Section 1.7 says why. Training defaults to the cloud, with a one-command script for Gordon at the lab. The WAVE tutorial note in Gordon's vault holds a plaintext password, which is worth deleting.
- **Generate or type API keys, or create accounts, in Chrome.** Keys stay with Gordon, and typing them into the cloud environment's settings is his step too. What I can do in Chrome, each time with his OK: set the three Figma files to "Anyone with the link", or open the exact settings page for anything else and stop before the click.

## 5. What Gordon does

**Before he leaves (about 10 minutes):**
1. In claude.ai/code, edit the cloud environment the build will use: network access **Full**, and add the variables `CINDIA_ANTHROPIC_API_KEY`, `NESSIE_KEY`, `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `APIFY_TOKEN` and `HF_TOKEN`. Leave `ANTHROPIC_API_KEY` unset there. As of 4:00 PM this session's environment had none of them, and every outside host it needs was blocked.
2. Stop the desktop orchestrator session.
3. After the fixes are pushed, start the build session (section 6). A phone works for this.
4. Say yes if he wants the three Figma files set to "Anyone with the link".

**Tonight, at the lab or after:**
- Write the three pitch cards (`src/app/demo/pitch.ts`) and his Devpost sections. The scribe's skeleton lands at 8:00 PM.
- Upload the public build to Cloudflare Pages (D-deploy), and register the MLH domain pointing at it.
- Optional: run `scripts/train-akbari.sh` at the lab, and write or edit 15 eval queries.
- Look at `artifacts/art/contact-sheet.png` for two minutes before the tour gate (A2-23).
- Delete `cindia-repo-export.tgz` from the vault's `resources` folder (left there from copying the docs over).
- Reserve an ethernet cable.

**Sunday:** be checked in by 8:00 AM, record the video, submit by 8:50 AM, push the tags from Windows (D2-2), and judge in presenter mode.

## 6. Kickoff for the build session

Start a new Claude Code cloud session with the GitHub repo `tyang4-ai/calhacks2026` as its source and the environment from step 1, then send:

```text
You are the orchestrator for the Cindia v2 build. The desktop session is stopped. First run git pull origin main. If the status line at the top of docs/v2/fix-plan.md doesn't say APPLIED yet, use send_later to send yourself this same message in 10 minutes, then stop. Once it says APPLIED, read CLAUDE.md, docs/harness/status.md, docs/harness/v2-runbook.md and docs/v2/fix-plan.md, then run the v2 runbook from V0 and keep going unattended until the 6:00 AM freeze. Gordon is away and won't answer questions, so follow the docs' defaults and list anything only he can do under Needs Gordon in status.md.
```

This version waits on its own, so the session can be started before the fixes are pushed.
