# Cindia · Devpost skeleton

A skeleton for Gordon to finish in his own voice. The scribe wrote it at 8:00 PM PT on Saturday, Oct 24, 2026, from [`docs/harness/status.md`](../harness/status.md) as it stood at 7:58 PM. The freeze pass (D-sponsors task T6) refreshes every fact at 6:00 AM on Sunday.

**How to read it**
- Each section holds facts as bullets, with the source in brackets. Copy what you want and put it in your words.
- A marker that starts with GORDON in square brackets means the words have to be yours. It comes with a question or two to start you.
- Each fact carries a status: **built** (green in a gate), **built, check pending** (written, live check still to run), or **planned** (nobody has built it yet). Do not write a planned thing as done. [`whats-real.md`](whats-real.md) has the full list.
- Cindia is a platform. Keep calling it one.
- Devpost closes at 9:00 AM PT on Sunday. The hacker guide suggests submitting a draft on Saturday night and editing until the deadline ([`docs/reference/ch13-hacker-guide.md`](../reference/ch13-hacker-guide.md)).

## Project name and tagline

- Name: Cindia. It stands for Craft Inheritance Network, Direct from Independent Artisans. Cindy is the agent inside it. [`docs/spec/cindia-pitch.md`](../spec/cindia-pitch.md)
- The tagline: **Describe the vibe. Gift the piece. Pay the person.** It is line 1 of the Cindia pitch card and the end card repeats it. [`src/app/demo/pitch.ts`](../../src/app/demo/pitch.ts) (`TAGLINE`), Gordon's message of Oct 25, 3:25 AM
- The shared one-liner: Cindia is a platform for underrepresented makers, starting with Native American makers. It does the selling, the marketing and the books for them. [`docs/v2/brief.md`](../v2/brief.md), "In one line"

## Inspiration

[GORDON: Inspiration, in your own words. Your earlier draft is in docs/spec/cindia-pitch.md, written before the scope moved to Native American makers, so use it for your voice and not for the facts. Why underrepresented makers, and why Native American makers first? The Anthropic mentors asked "if we don't help them, who will?" What did you see or hear that made you build for this?]

## What it does

**What Cindia is** (the shared line, [`docs/v2/fix-plan.md`](../v2/fix-plan.md) section 1.1)
- Cindia is a platform for underrepresented makers, starting with Native American makers.
- Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Cindia does the selling, the marketing and the books for them.
- It's fair by design: the price split is shown, search ranks by fit and not by ads, and Surprise me leans toward makers who sold less.
- The demo follows the Diné Weaving and Silver Co-op, a fictional co-op of Diné (Navajo) makers on the Navajo Nation in Arizona. Its manager is Ruth B. and its makers are Grace N., Lena T. and Mae K. It makes wool weavings and silver and turquoise jewelry. Three more fictional communities sit beside it in the catalog: an Ojibwe beadwork co-op in Minnesota, an Acoma pottery studio in New Mexico and a Seminole patchwork co-op in Florida. [`docs/v2/brief.md`](../v2/brief.md)
- Every community, maker and story is fictional. Say so wherever they appear.

**Why it matters, with sources** (all from the brief, which links each one)
- Fixed broadband at the FCC's 100/20 Mbps benchmark hadn't been deployed to more than 23% of people living on Tribal lands, the FCC reported in March 2024. [FCC](https://docs.fcc.gov/public/attachments/DOC-401205A1.pdf)
- In 2023, 12.2% of American Indian or Alaska Native households had no bank account, against 4.2% of all US households. [FDIC 2023 survey](https://fdic.gov/household-survey/2023-fdic-national-survey-unbanked-and-underbanked-households-executive-summary)
- On Aug 5, 2026, the U.S. Attorney's Office for the District of Arizona announced that a San Francisco seller had admitted selling over $92,000 of counterfeit Native American jewelry through an eBay store. The jewelry was imported from Asia, and the case was brought under the Indian Arts and Crafts Act. [Indian Arts and Crafts Board](https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry)
- An old figure, cited as old: in 2000 the chair of the Senate Committee on Indian Affairs estimated that about half of a roughly $1 billion market for Indian-made goods was counterfeit. [ICT, May 31, 2000](https://ictnews.org/archive/counterfeit-market-reaches-half-billion-dollars/)

**The buyer side** (shop)
- Vibe search: a buyer types a feeling, such as "a warm, bold gift for my mom. she loves red wool. under $200". The Finder agent turns it into keywords the buyer can see and edit as chips, our own embedding model finds pieces that match the feeling, and every result says why it matched. Status: planned (B11, B12, F-search). [brief, "Shop"]
- Surprise me: one button, three ways (keyword, pure random, fair random), and the screen says which one it used. Fair random leans toward makers with fewer sales this month, and the weights are on the page. Status: planned.
- The piece page: the maker's story, hours of work, process steps and a verification line that says it is demo verification. "Where your money goes" shows the price split. Of Grace N.'s $180 weaving, $134.48 goes to her, after $22.00 for materials, an $18.00 Cindia fee and a $5.52 card fee. The same piece through the gallery would pay her $86.00. [`docs/common/data-model.md`](../common/data-model.md) figures 1 and 16. Status: the story, the hours and the split are built (v1, with the split live through B10). The verification line and the gallery comparison are planned.
- Checkout: the card number becomes a token, so the number itself is never stored. The screen says "Demo checkout, no real charge". A project contribution at checkout starts off. Status: the token is built (v1). The contribution is planned.
- The receipt: it says "Received" after the sale and turns to "Paid to the maker" when the payout goes out. Grace N.'s own note appears on the paid receipt. Status: the receipt is built (v1, B10 live). The promise line and the note are planned.
- Help, any time: a drawer answered by the agent swarm. It shows which agent is answering and the guard that checked the answer. When the records can't answer a question about meaning, Cindy says she will ask Grace N., and the answer comes back in her own words. Status: planned (B14, F-support).
- Communities, projects and works in progress (commissions paid in stages), and a storefront at its own link for each community. The storefront builder is a labeled preview. Status: planned.

**The seller side** (sell)
- Built in v1 and kept: the money map, the month's reconcile, the catch, approvals with the seal, the close into an Excel file with the impact numbers, Grace N.'s statement, the proof panel, the dashboard, Ask Cindy and the audit trail. [`whats-real.md`](whats-real.md)
- The catch: Cindy flags that the gallery paid $340 less than the consignment contract says, lays the contract, the statement and the bank record side by side, says which record to trust, and drafts a follow-up. Nothing goes out until the manager approves it with the seal. [`docs/common/data-model.md`](../common/data-model.md) figures 4 and 9
- Maker pay: $95 of Grace N.'s pay is held until the gallery pays what it owes. The statement shows the held line. [`docs/v2/fix-plan.md`](../v2/fix-plan.md) section 1.2, `d11-maker`
- Added in v2, all planned: a maker writes a few lines of notes and the agents draft the listing, suggest keywords, check it against the community's rules, and embed it into the index. The manager approves before anything goes live. Also a storefront builder (preview), projects and works in progress, support for sellers, and the counterfeit watch.
- The counterfeit watch crawls our own sandbox market (static fictional listings, never the real web) and lists every result it checked. A possible copy sits next to the co-op's piece with its text match. A bare claim like "Authentic Native American made" is listed as something the watch can't judge, with no report button. The manager decides whether to report, and Cindy never accuses anyone. Status: planned (B15, F-watch).

**The swarm** ([`docs/v2/contracts.md`](../v2/contracts.md) section 6)
- 21 roles, each with one narrow job. Fifteen run on Claude, on `claude-haiku-5-5` and `claude-sonnet-5-5` only. Six are plain code, labeled "rule-based".
- Cindy routes and merges and has no facts of her own. Code fills every number, date and quote.
- A person approves anything that moves money or publishes anything. No agent run is allowed to emit an approval, a payout or a money move.
- Status: the money team runs as v1 routers (B01, B03, B06, B10 live, B02 check pending). The rest is planned (B14).

**The process blocks**
- A bar of 11 clickable blocks across the top of every page. Each shows a live status, a small count and a Live mark when its sources are live. One line sums it up ("Live: N of 11"). Each view draws what is happening and lists the raw events under it. Status: planned (F-process).

**The tour** (planned, `I2-tour`)
- Three minutes: a one-minute pitch (three cards: "Cindia", which opens with the tagline, then "Why" and "How it works", text in [`src/app/demo/pitch.ts`](../../src/app/demo/pitch.ts)), the buyer minute, and the seller minute. It is always scripted, so it never waits on a network.
- It plays online at https://cindia.design/demo.
- Presenter mode (`/demo?mode=present`) pauses at the end of every beat. Chapter 2 covers Surprise me, the proofs, the counterfeit watch and the storefront.
- Today `/demo` plays v1's 60-second demo on the co-op's names.

**The edge over Etsy** (two lines, [`docs/v2/fix-plan.md`](../v2/fix-plan.md) section 1.3)
- Etsy pays the shop. Cindia pays the makers, and proves it.
- It does the work for them, pays each maker and not one shop account, runs the books across channels, takes provenance from the community and not the seller, is fair by design with the math shown, and gives each seller a storefront that is theirs. We don't claim lower fees. Cindia's own fee is 10%.
- Sources: [TechCrunch, July 9, 2024](https://techcrunch.com/2024/07/09/etsy-new-seller-policy-2024-generative-ai) and the [Indian Arts and Crafts Board](https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry).

**The seats line** (word for word from the contract for the tour's end card)

> Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money.

## How we built it

**The three pillars** ([`docs/v2/fix-plan.md`](../v2/fix-plan.md) section 1.4)
1. A swarm of small Claude agents, [`docs/plans/B14-swarm.md`](../plans/B14-swarm.md). The server self-test fails on any model ID other than Haiku and Sonnet, and that test is built. The swarm itself is planned.
2. Our own embedding model that embeds every seller entry, [`B11-embed`](../plans/B11-embed.md) and [`B12-search`](../plans/B12-search.md). The Indexer embeds each new listing the moment it is drafted, into a drafts index, and moves it to the live index when the manager approves. Status: planned.
3. One database that holds everything, [`B13-live`](../plans/B13-live.md). SpacetimeDB is the system of record and Elastic is the search index built from it. Status: planned.

**The stack** (versions from [`package.json`](../../package.json) and [`server/requirements.txt`](../../server/requirements.txt))
- Browser: React 19.3, TypeScript 6, Vite 8.3, Tailwind CSS 4.3, React Router 8.5, Motion 14.6, Recharts 3.10, SheetJS 0.20.3.
- Server: Python, FastAPI 0.159, the Anthropic Python SDK 2.1, openpyxl 3.1, httpx 0.28.
- Search model: sentence-transformers 6.2, torch 2.14 (CPU build), transformers 5.20, Hugging Face Hub 2.3.
- Tests: Vitest 5, Playwright 1.61, pytest 9.1.

**Our own embedding model and how it was tested** ([`docs/plans/B11-embed.md`](../plans/B11-embed.md)). Status: planned. Nothing here has run yet.
- Base model: `intfloat/multilingual-e5-small`, 384 dimensions, so English and Chinese queries share one space. We fine-tune it on Cindia's fictional catalog.
- Training data: `claude-sonnet-5-5` writes about 20 buyer-style queries per piece, about a fifth in Chinese, in mixed voices, plus filtered hard negatives. A query that hits the content rules is dropped and counted. Every pair is kept in `pairs.jsonl` so anyone can audit it.
- Test: held-out test queries, written separately by our data agent. There are 50 of them, over the same 54 fictional pieces, and none was used for training. A guard drops any generated training query that matches a test query. If Gordon writes or edits some of them, the report scores them as their own row and says how many.
- Scoring: Recall at 5 and MRR at 10 for keyword search, the untuned base model, our model and a local hybrid, overall and for English and Chinese separately, with paired-bootstrap intervals. The plan says "a small test, not a benchmark", and the model card names what the model is not for: classifying, ranking or verifying real makers or their work.
- Where it trains: the cloud VM by default (15 to 30 minutes on CPU), or the lab GPU machine. The private Hugging Face repo carries the model between machines.
- The numbers: **Not trained yet.** `server/b11_embed/report.json` doesn't exist. Copy the numbers from that file and nowhere else.

**Elastic** ([`docs/plans/B12-search.md`](../plans/B12-search.md)). Status: planned.
- One document per piece in `cindia-pieces`, with our own 384-number vector in a `dense_vector` field (cosine, int8 HNSW).
- Hybrid search fuses a kNN retriever on our vectors with a keyword retriever, with price and community filters. The screen says which engine answered.
- The Agent Builder agent `cindia-finder` answers find questions. The swarm routes those questions to it in code, and the swarm view labels the step "Elastic Agent Builder".
- Without Elastic, the same fusion runs locally and the screen says so.

**SpacetimeDB** ([`docs/plans/B13-live.md`](../plans/B13-live.md)). Status: planned.
- A local server on `127.0.0.1:3000`. The module holds the catalog (seeded from the mock data), listings, orders, approvals, swarm runs and steps, process status and the screens watching. Its tables are private and only the publisher's identity can write.
- The browser polls `GET /api/b13/changes` every 500 ms. The process bar shows how many screens are watching. The data view shows each table's row count and newest rows.

**Apify** ([`docs/plans/B15-watch.md`](../plans/B15-watch.md)). Status: planned.
- The Scout runs Apify's Cheerio Scraper over our sandbox market, which ships with the public site at `/market/`. The Comparer scores each result with our embeddings. The Claims agent (Haiku) reads what a listing claims, and the Reporter fills a report template. The watch never searches the real web.

**Nessie** ([`docs/plans/B04-bank.md`](../plans/B04-bank.md), [`B16-bank-books`](../plans/B16-bank-books.md)). Status: B04 built with one live rerun queued, B16 planned.
- The sale posts to a Nessie account as a deposit of $156.48 (the $180 after the Cindia fee and the card fee). Maker payouts post as withdrawals, and the money map's balance is read back from the account.
- Nessie can't create purchases or transfers, so we use deposits and withdrawals.
- B16 reads the bank side back from Nessie, so the $340 catch is found against Nessie's own records. Nessie is a sandbox bank, so no real money moves.

**The Claude models, per agent** ([`docs/v2/contracts.md`](../v2/contracts.md) section 6)
- `claude-haiku-5-5` (6 agents): Cindy, Intake, Finder, Clerk, Tagger and Claims.
- `claude-sonnet-5-5` (9 agents): Curator, Steward, Writer, Lister, Describer, Checker, Explainer, Reporter and Designer.
- Plain code (6 agents): Indexer, Matcher, Bookkeeper, Scorer, Scout and Comparer.
- No Opus anywhere in the platform. In v1 today, B02 and B07 call Sonnet and B09 calls Haiku (`server/routers/`).

**The build harness**
- A team of Claude Code agents wrote the code. The roles are orchestrator, scaffolder, data-smith, feature-lead, builder, verifier, integrator, backend-builder, scribe and a design lead. Each agent can write only to its own paths, and hooks block anything else. [`CLAUDE.md`](../../CLAUDE.md)
- Gates stop the build until recorded checks pass, and a verifier reviews screenshots and never fixes anything. The hook self-test passed 338 of 338. [`docs/common/definition-of-done.md`](../common/definition-of-done.md)
- The build used Opus for builders and leads and Sonnet for the verifier and scribe. This is the build, not the platform. [`docs/harness/decisions.md`](../harness/decisions.md)
- The design work ran through the Figma MCP server, with a stage log. [`design/stage-log.md`](../../design/stage-log.md)

[GORDON: How we built it, in your words. What was it like to run a team of agents through the night? What did you decide yourself, and what did you hand to the agents?]

## Challenges

Facts from [`docs/harness/lessons.md`](../harness/lessons.md) and [`status.md`](../harness/status.md). Pick the ones that fit your story.
- **The bank can't do purchases.** Nessie has no way to create purchases or transfers, and its create calls answer with a plain string. We use deposits and withdrawals and read the list back to find the new record. Its account balance may not follow deposits, so we compute the balance from the lists.
- **A slow first call.** In one live run, Nessie's first sale took 1,755 ms, against about 800 ms after that, and the demo's receipt status missed its window. A rerun is queued.
- **The Claude API changed on Oct 21, 2026.** No `temperature`, `top_p` or `top_k`, no enabled thinking and no prefilled assistant turns.
- **Time budgets.** B02's live call took 7.9 s on Sonnet against a 6 s budget, and B09's live call went over 4 s in one of four runs. We raised B09's timeout to 5 s, a contract change.
- **A screenshot can't prove a live source played**, because the scripted fallback draws the same pixels. The live runs now assert the store's `sources` for the upgrade's key.
- **Re-skinning with every number kept.** Long English titles wrapped and pushed the held $95.00 line out of a fixed frame, so the first R0 gate run failed. We shortened list rows to one line and kept every figure.
- **Windows and the cloud.** `os.replace` fails on Windows while another process has the file open, which gave a flaky save in the Excel builder. A unique file per build fixed it.
- **Agents reporting results they hadn't read.** Leads sometimes reported a verifier's or builder's result before it arrived. The rule now is to state only a result you have read.

[GORDON: Challenges, in your words. What nearly broke the demo? What did you decide about telling stories of communities you haven't worked with yet, and what did you do about it?]

## Accomplishments

Checked facts at 8:00 PM. The freeze pass refreshes them.
- **v1 is green as `demo-ok-4`.** All 12 features passed their gates (3 of 3, verifier PASS), and the G4 demo gate passed 5 of 5 on 60-second runs. [`status.md`](../harness/status.md)
- **Six live upgrades passed G5:** B01 matching, B03 the planted-error proof, B05 your own statement, B06 the Excel report, B08 approvals and B10 splits, receipts, statements and impact. The regression run with all ten routers passed 13 of 13.
- **The planted-error score is 4 of 4.** The matcher catches every error planted in the month's records. [`data-model.md`](../common/data-model.md) figure 10
- **The re-skin kept every number.** The R0 gate passed 11 of 11 checks with three verifiers, and the $180 weaving, the $134.48 maker share, the $340 short payment and the $95 held are unchanged. [`status.md`](../harness/status.md)
- **The core gate passed 4 of 4** with three verifiers. The server suite passed 238 tests with 1 skipped, and smoke passed 22 of 22. [`status.md`](../harness/status.md)
- **The search model's numbers: Not trained yet.** Fill this in from `server/b11_embed/report.json` once it exists. Say "held-out test queries, written separately by our data agent", with Gordon's own count if he wrote some.
- **Every simulated panel says so.** The Simulated badge stays on anything still playing scripted events, and [`whats-real.md`](whats-real.md) lists what is live.

[GORDON: Accomplishments, in your words. Which one are you proudest of? What would you show a friend first?]

## What we learned

[GORDON: What we learned, in your words. What surprised you about building for communities you haven't worked with yet, about running a swarm of small agents, or about building alone? What would you do differently on Monday?]

## What's next

- **Co-design comes first.** Work with Native-led arts organizations, and use the marks and processes communities already run instead of issuing a mark of our own. In a real launch, makers would be enrolled members of their nation or certified by it as Indian artisans, as the Indian Arts and Crafts Act defines. Cindia would keep only a yes or no, never the record, and each community would control what is indexed about it. [`docs/v2/brief.md`](../v2/brief.md), "Next: other communities"
- **The "Backend if time" items that weren't built.** At 8:00 PM that is all nine, so the freeze pass will cut this list down to what is still unbuilt. [`whats-real.md`](whats-real.md)
  - Live keywords from the Finder in the search box.
  - Gordon's own 15 test queries, scored as their own row.
  - Photos on the listing form and the Describer's layer.
  - The approval queue moved onto SpacetimeDB.
  - A hosted live API, so judges can try it online.
  - A real storefront builder.
  - The live loop for "ask the maker".
  - A longer training run on the lab GPU machine.
  - An Apify actor that others can use.
- **The storefront builder beyond the preview.** Each seller would build their own storefront.
- **Other underrepresented makers,** each community only with that community's own organizations. The brief cites 476.6 million Indigenous people in the world, 6.2% of the global population and 18.2% of the people living in extreme poverty. [World Bank](https://www.worldbank.org/ext/en/topic/social-development/indigenous-peoples)

## Every community, maker and story here is fictional

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.

## Built with

Planned items are marked. Delete anything that doesn't ship.
- React, TypeScript, Vite, Tailwind CSS, React Router, Motion, Recharts, SheetJS
- Python, FastAPI, openpyxl, httpx
- Claude (`claude-haiku-5-5` and `claude-sonnet-5-5`) through the Anthropic Python SDK
- Claude Code, for the build
- sentence-transformers, PyTorch and the Hugging Face Hub (planned)
- Elastic Serverless and Elastic Agent Builder (planned)
- SpacetimeDB (planned)
- Apify (planned)
- Capital One's Nessie sandbox API
- Figma, through the Figma MCP server, FigJam and Figma Slides
- Playwright, Vitest and pytest
- Cloudflare Pages and a GoDaddy Registry domain, cindia.design (Gordon's steps, done)

## Tracks

Select a track on Devpost only when its hard requirement is met in the final what's-real list. The freeze pass adds a met-or-not line per track to [`sponsors/README.md`](../../sponsors/README.md). Gordon checked the Devpost prize names live at 11:45 PM on Oct 24.
- [Anthropic] Claude for Public Benefit: [`sponsors/anthropic/`](../../sponsors/anthropic/README.md). It is on the Devpost page.
- Hyphenate, The Hyphenated Enterprise: Autonomous Systems for Finance: [`sponsors/hyphenate/`](../../sponsors/hyphenate/README.md)
- Visa, Best use of Reimagining Shopping: [`sponsors/visa/`](../../sponsors/visa/README.md)
- Microsoft, Built for the Real World: [`sponsors/microsoft/`](../../sponsors/microsoft/README.md)
- Capital One, Best Use of Nessie: [`sponsors/capital-one/`](../../sponsors/capital-one/README.md)
- Meta, Bringing People Closer Together with AI: [`sponsors/meta/`](../../sponsors/meta/README.md)
- Elastic, Best use of the Elastic Agent Builder on a Serverless instance: [`sponsors/elastic/`](../../sponsors/elastic/README.md)
- [Spacetime] Best Use of Spacetime: [`sponsors/spacetimedb/`](../../sponsors/spacetimedb/README.md). It is on the Devpost page.
- Apify, Best use of Apify: [`sponsors/apify/`](../../sponsors/apify/README.md)
- [Figma] Best Figma Workflow Hack ($1,000): [`sponsors/figma/`](../../sponsors/figma/README.md). It is the one Figma prize on the Devpost page now.
- [MLH] Best Domain Name from GoDaddy Registry: [`sponsors/mlh-godaddy/`](../../sponsors/mlh-godaddy/README.md). The domain is cindia.design, and .design is a GoDaddy Registry domain.
- Cal Hacks Best Solo Hack: select it. Gordon built Cindia alone. (The Devpost notes in [`docs/reference/ch13-devpost.md`](../reference/ch13-devpost.md) call it automatic, and Gordon's Oct 25 message says to select it.)
- Cal Hacks Best People-First Social Impact Hack: select it. Cindia is built for Native American makers, and the demo follows the fictional Diné Weaving and Silver Co-op.

## Links

- Repo: https://github.com/tyang4-ai/calhacks2026
- Public site: https://cindia.design (also https://cindia-cfn.pages.dev). The tour runs at https://cindia.design/demo. It is the scripted public build, with no Pay and no Live switch, and it sells nothing. Gordon uploaded it from commit `b01fc1b` to the Cloudflare Pages project `cindia`. [`docs/plans/D-deploy.md`](../plans/D-deploy.md)
- Demo video: [GORDON: video link]. Hyphenate wants a video that opens with the catch (`d08-catch`, a $340 short payment). Figma's limit is 3 minutes.
- Project image: `docs/devpost/project-image.png`. The orchestrator copies the catch screenshot there at the freeze, so the file doesn't exist yet.

## Devpost checklist

From [`docs/reference/ch13-devpost.md`](../reference/ch13-devpost.md) and [`ch13-hacker-guide.md`](../reference/ch13-hacker-guide.md):
- [ ] An image of the project and the GitHub repository link
- [ ] A recorded demo video (the judging criteria ask for a clear one for sponsors reading later)
- [ ] The track selections above
- [ ] Submit by 9:00 AM PT on Sunday, and be at your assigned table by 10:30 AM for judging
