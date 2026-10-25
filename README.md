# Cindia

Cindia is a platform for underrepresented makers, starting with Native American makers. Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Cindia does the selling, the marketing and the books for them, and it's fair by design: the price split is shown, search ranks by fit and not by ads, and Surprise me leans toward makers who sold less.

The demo follows the Diné Weaving and Silver Co-op, a fictional co-op of Diné (Navajo) makers on the Navajo Nation in Arizona. Its manager is Ruth B. and its makers are Grace N., Lena T. and Mae K. Three more fictional communities sit beside it in the catalog: an Ojibwe beadwork co-op, an Acoma pottery studio and a Seminole patchwork co-op.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.

Cindia stands for Craft Inheritance Network, Direct from Independent Artisans. Cindy is the agent inside it. Built at Cal Hacks 13.0 (Oct 23 to 25, 2026) by Gordon Yang, solo.

## Where the build stands

This section was written at 8:00 PM PT on Saturday, Oct 24, from [`docs/harness/status.md`](docs/harness/status.md). The freeze pass rewrites it at 6:00 AM on Sunday.

- **v1 is green** as tag `demo-ok-4`. It is the fallback if v2 fails. It plays a 60-second demo of one $180 sale followed all the way to the makers.
- **v2 is in progress.** The re-skin to the Diné co-op and the v2 contracts and core types are done (tags `v2-reskin` and `v2-core`). The desktop shell, the UI kit, the 54-piece catalog, vibe search on our own embedding model, the agent swarm, the database, the copy watch and the 3-minute tour are planned and being built tonight.
- Anything below marked **planned** does not exist yet. [What's real and what's simulated](docs/devpost/whats-real.md) is the full list.

## Why not Etsy

**Etsy pays the shop. Cindia pays the makers, and proves it.** Etsy is a marketplace that sellers have to learn and work. Cindia is a platform that does the selling, the marketing and the books for the makers, on every channel, Etsy included.

1. **It does the work for them.** A maker writes a few lines of notes, and Cindia's agents draft the listing, index it, answer buyers and run the books. No shop to manage, no ads to buy.
2. **It pays each maker, not one shop account.** A co-op on Etsy gets one payout and splits it by hand. Cindia splits every sale to each maker, holds and explains what's owed, gives each maker a plain statement, and turns the buyer's receipt to "Paid to the maker".
3. **It runs the books across channels.** The gallery's consignment, the co-op's own site, Cindia's marketplace and Etsy all reconcile into one set of books, and Cindy catches the gallery paying $340 short.
4. **Provenance comes from the community, not the seller.** On Etsy the "Handmade" label is the seller's word, and since July 2024 Etsy's "Designed by" label covers items that may be made with an outside production partner, generative AI or other digital tools ([TechCrunch, July 9, 2024](https://techcrunch.com/2024/07/09/etsy-new-seller-policy-2024-generative-ai)). On Cindia, each piece shows who made it and under whose authority: the maker's own nation, under the Indian Arts and Crafts Act. Fakes are a live problem. In August 2026 a San Francisco eBay seller admitted selling over $92,000 of jewelry imported from Asia as Native-made ([U.S. Attorney, District of Arizona, Aug 5, 2026](https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry)).
5. **Fair by design, and the math is shown.** Search ranks by fit, not by ads. Surprise me leans toward makers who sold less this month, with the weights in the open. The split is on the page before anyone pays.
6. **The storefront is theirs.** Each seller has a page at their own link and keeps the customer relationship.

We don't claim lower fees. Cindia's own fee is 10%.

## Run it

### The public site

[GORDON: the public site link]

The public site plays the scripted tour only and sells nothing. It is a separate build (`npm run build:public`, planned in [`docs/plans/D-deploy.md`](docs/plans/D-deploy.md)) that Gordon uploads to Cloudflare Pages. It will also serve the sandbox market at `/market/`.

### Scripted, on your own machine

You need Node 22 or later. Nothing here needs a key, and in scripted mode the browser makes no request beyond localhost.

```text
npm ci
npm run build
npm run preview
```

Then open http://localhost:4173/demo. Today that plays v1's 60-second demo on the co-op's names. These pages are **planned** and arrive with the shell and the tour (`I2-shell`, `I2-tour`): `/demo?mode=present` for the 3-minute tour and `/shop` for the Shop.

For development, `npm run dev` starts Vite on port 5173, proxying `/api` to port 8000.

### Live, with the backend

Live mode swaps the scripted event sources for the FastAPI server, one source at a time. Only `server/` reads keys. The browser never does.

1. Make a Python 3.12 or later virtual environment in `.venv` and install `server/requirements.txt`.
2. Copy `.env.example` to `.env` and fill in the values. These are the names, and `server/config.py` never prints a value:
   - `CINDIA_ANTHROPIC_API_KEY` (or `ANTHROPIC_API_KEY` on a Windows machine)
   - `NESSIE_KEY`
   - `ELASTIC_URL`, `KIBANA_URL` and `ELASTIC_API_KEY`
   - `APIFY_TOKEN`
   - `HF_TOKEN` and `CINDIA_HF_REPO`
   - `PUBLIC_SITE_URL`, once the public site is up
   - `SPACETIME_TOKEN`, which a script writes for you
3. Start the API with `npm run server` (port 8000). `GET /api/health` lists which routers loaded and which keys are set.
4. **Planned (B13).** Start SpacetimeDB on this machine only with `spacetime start --listen-addr 127.0.0.1:3000`.
5. **Planned (B11).** Pull the trained search model with `python server/b11_embed/fetch_model.py`.
6. **Planned (D-deploy).** On a Windows demo machine, `node scripts/laptop-setup.mjs` does the setup in one go (the Python environment, the packages, the model, SpacetimeDB and the API) and prints the health check. Run it with `--check` to see only the health.
7. Flip the Live switch in the demo controls.

## The tour and its controls

The tour is the 3-minute pitch. It is always scripted, so it never waits on a network and plays the same every time. Live mode answers people's own requests after the tour ("try it yourself"), and the tour's own events stay scripted.

**Planned (`I2-tour`).** Three minutes, in this order (beat IDs and times are from [`docs/v2/fix-plan.md`](docs/v2/fix-plan.md) section 1.2):

| Part | Beats | Seconds | What happens |
|---|---|---|---|
| The pitch, 1 minute | `p01-what`, `p02-why`, `p03-how` | 0 to 60 | Three full-screen pitch cards: what it is, why, the tech. Gordon writes the words |
| The buyer minute | `d01-vibe`, `d03-piece`, `d04-support`, `d05-pay` | 60 to 120 | Vibe search, the piece and where the money goes, a question answered by the swarm with a guard firing, pay, and a receipt that promises to show when Grace N. is paid |
| The seller minute | `d15-listing`, `d06-money`, `d07-month`, `d08-catch`, `d09-approve`, `d10-close`, `d11-maker`, `d12-receipt` | 120 to 180 | A maker's notes become a listing that our model embeds into the index. Then the money: map, month, the catch, approve and seal, close, Grace N.'s statement, and the receipt turning to "Paid to the maker" |
| Chapter 2, for questions | `d02-surprise`, `d13-proof`, `d14-watch`, `d16-store` | 180 to 205 | Surprise me, the proofs, the counterfeit watch and the storefront, after the end card |

Controls:
- **Presenter mode:** `/demo?mode=present` pauses at the end of every beat. Space or the right arrow plays the next beat, and the left arrow replays the current one. After `d12-receipt` it shows the end card, and the right arrow continues into chapter 2.
- **Auto-play:** `/demo` without the parameter plays every beat straight through and ends on the end card. The tests and the video use it.
- **Video mode:** `/demo?video=1` opens on the catch for five seconds, then plays the spine with shorter pitch cards.
- **Any beat:** `/demo?start=<beatId>` opens that beat. `?start=catch` opens `d08-catch`.

Today `/demo` plays v1's 60-second demo, and `?video=1` and `?start=catch` already work on it (`tests/demo/modes.spec.ts`).

> Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money.

## The backend

The backend rests on three pillars. All three are **planned** at 8:00 PM, except the v1 money team, which is built.

1. **A swarm of small Claude agents** ([`docs/plans/B14-swarm.md`](docs/plans/B14-swarm.md)). Each agent has one job, its own typed input and output, and only the tools that job needs. They run on `claude-haiku-5-5` and `claude-sonnet-5-5`, and nothing else. Cindy only routes and merges and has no facts of her own. Code fills every number, date and quote, so an agent can't invent one. Anything that would move money, publish or report becomes an approval for a person.
2. **Our own embedding model, which embeds every seller entry** ([`docs/plans/B11-embed.md`](docs/plans/B11-embed.md) and [`docs/plans/B12-search.md`](docs/plans/B12-search.md)). `multilingual-e5-small`, fine-tuned on queries that Claude wrote about the fictional catalog. The Indexer embeds each new listing the moment it is drafted, and search runs in Elastic Serverless with our own vectors. We test the model on held-out test queries, written separately by our data agent.
3. **One database that holds everything** ([`docs/plans/B13-live.md`](docs/plans/B13-live.md)). SpacetimeDB is the system of record: the catalog, listings, orders, approvals, the swarm's runs and steps, each process's status and the screens watching. Elastic is the search index built from it.

There are 21 agent roles. Fifteen run on Claude, six on Haiku and nine on Sonnet. Six are plain code, labeled "rule-based" in the swarm view so no one mistakes them for a model. The roster is in [`docs/v2/contracts.md`](docs/v2/contracts.md) section 6, and the table says why each one exists.

| Agent | Runs on | Why it exists |
|---|---|---|
| Cindy | Haiku | Picks which agents run and in what order. She has no facts of her own, so she can't make one up |
| Intake | Haiku | Reads the request (intent, budget, recipient, language, IDs) so the others get clean input |
| Finder | Haiku | Turns a request into keywords and filters and runs the search. Find questions go to the Elastic Agent Builder agent, chosen in code |
| Curator | Sonnet | Puts the final few pieces in order. Each reason is built by code from the piece's facets |
| Steward | Sonnet | Answers "is it real?" and "what does it mean?" only from the community's page, the verification record and the piece's own story. It quotes its source or says "I'll ask the maker" |
| Clerk | Haiku | Order status, shipping and returns, read-only. Arrival dates come from code |
| Writer | Sonnet | Writes the reply in the person's language from the facts the others found. Code fills amounts and dates |
| Lister | Sonnet | Turns a maker's notes into a draft listing in English and Chinese, and marks the version she didn't write |
| Describer | Sonnet | Describes what is visible in a photo. It runs only when a photo is uploaded, and nothing uploads one yet |
| Tagger | Haiku | Proposes vibe keywords for the maker to approve |
| Checker | Sonnet | Checks a draft against the community's rules and the maker's facts. A check in code backs it |
| Indexer | code | Builds the index entry and its vector and writes it to the drafts index |
| Matcher | code | Matches payouts to orders |
| Explainer | Sonnet | Explains the catch in plain words |
| Bookkeeper | code | Derives the books and the Excel workbook |
| Scorer | code | Scores the planted errors |
| Scout | code | Crawls the sandbox market through Apify |
| Comparer | code | Scores look-alike listings with our embeddings |
| Claims | Haiku | Reads what a found listing claims |
| Reporter | Sonnet | Picks the claim words for a report template. The manager decides whether to send it |
| Designer | Sonnet | Drafts a storefront from the community page. Publishing stays the manager's |

**Built today:** the money team's roles run as the v1 routers B01 (Matcher), B02 (Explainer), B03 (Scorer) and B06 with B10 (Bookkeeper). B02 is built and waits on its live check. The other agents arrive with B14 and B15.

## The stack

| Layer | What we use |
|---|---|
| Browser | React 19.3, TypeScript 6, Vite 8.3, Tailwind CSS 4.3, React Router 8.5, Motion 14.6, Recharts 3.10, SheetJS 0.20.3 |
| Server | Python, FastAPI 0.159, the Anthropic Python SDK 2.1, openpyxl 3.1, httpx 0.28 |
| Search model (planned) | sentence-transformers 6.2, torch 2.14 (CPU build), transformers 5.20, Hugging Face Hub 2.3, NumPy 2.5 |
| Services (planned) | SpacetimeDB (CLI 2.13, local server), Elastic Serverless with Agent Builder, Apify, Capital One's Nessie sandbox bank, Cloudflare Pages |
| Tests | Vitest 5, Playwright 1.61, pytest 9.1 |
| Build | Claude Code agents with gates, described below |

Versions come from [`package.json`](package.json) and [`server/requirements.txt`](server/requirements.txt).

## How it's built

A team of Claude Code agents wrote the code, and each one stays inside its own files:
- [`CLAUDE.md`](CLAUDE.md) is the build manual every agent reads.
- [`docs/harness/`](docs/harness/) holds the runbook, the status board, the decision log and the lessons.
- [`docs/common/`](docs/common/) holds the shared contracts every agent builds against.
- [`docs/plans/`](docs/plans/) holds one plan per feature and upgrade.
- [`.claude/`](.claude/) holds the agent roles, the skills and the hooks that block writes outside an agent's paths.

Nothing moves past a gate until its checks pass with recorded evidence. The roles are the orchestrator, scaffolder, data-smith, feature-lead, builder, verifier, integrator, backend-builder, scribe and the design lead.

## Map of the repo

| Path | What is in it |
|---|---|
| [`src/app/`](src/app/), [`src/core/`](src/core/), [`src/ui/`](src/ui/) | The shell, the event store and the UI kit |
| [`src/sources/`](src/sources/) | The scripted source, and one live adapter per upgrade in [`src/sources/live/`](src/sources/live/) |
| [`src/features/`](src/features/) | One folder per feature (twelve from v1, the v2 folders are planned) |
| [`src/mock/`](src/mock/) | All the fictional data and the scripted timelines |
| [`server/`](server/) | FastAPI and one router per upgrade in [`server/routers/`](server/routers/) |
| [`tests/`](tests/) | Data, smoke, feature, demo, offline and server tests |
| [`scripts/`](scripts/) | Check, gate, test and server scripts |
| [`design/`](design/) | The Figma handoff drops, the stage log and the style tiles |
| [`docs/`](docs/) | Contracts, plans, the v2 brief, the harness, the sponsor notes and the Devpost files |
| [`sponsors/`](sponsors/) | One folder per sponsor track |

## Tests

| Command | What it does |
|---|---|
| `npm run check` | Type check, lint, unit tests and event-schema validation |
| `npm run check:data` | Integrity tests for the mock dataset and the answer key |
| `npm run test:smoke` | Every route renders with no console errors |
| `npm run test:feature -- <slug>` | The acceptance tests of one feature |
| `npm run test:demo` | Plays the demo on the production build and saves a screenshot per beat |
| `npm run test:offline` | The demo with every request beyond localhost blocked |
| `npm run test:server` | The backend tests. The live tests skip when a key is missing |
| `npm run gate -- <gate>` | One gate's checks, with a report in `artifacts/gates/` |
| `npm run export:mock` | Writes `src/mock/` as JSON for the Python side |

## For sponsors

Each folder says what its judges look for, what Cindia does for that track, where to look, how to run that part and what is live. The [index](sponsors/README.md) has the full list.

| Track | Folder | Look at first |
|---|---|---|
| Anthropic, Claude for Public Benefit | [`sponsors/anthropic/`](sponsors/anthropic/README.md) | A named community, the swarm's narrow agents, the "where it could go wrong" table and the impact plan |
| Hyphenate, Autonomous Systems for Finance | [`sponsors/hyphenate/`](sponsors/hyphenate/README.md) | The catch: the gallery paid $340 short, and Cindy proposes while a person approves |
| Visa, Reimagining Shopping | [`sponsors/visa/`](sponsors/visa/README.md) | Vibe search, the price split, the card token and the receipt |
| Microsoft, Built for the Real World | [`sponsors/microsoft/`](sponsors/microsoft/README.md) | The Excel close, the impact numbers and the path from prototype to production |
| Capital One, Best Use of Nessie | [`sponsors/capital-one/`](sponsors/capital-one/README.md) | Sales and maker payouts on a Nessie account |
| Meta, Bringing People Closer Together with AI | [`sponsors/meta/`](sponsors/meta/README.md) | The maker's own words, reaching the buyer |
| Elastic, Agent Builder on Serverless | [`sponsors/elastic/`](sponsors/elastic/README.md) | Hybrid search with our own vectors, and the `cindia-finder` agent |
| SpacetimeDB, Spacetime | [`sponsors/spacetimedb/`](sponsors/spacetimedb/README.md) | One database that holds everything, and the data view |
| Apify, Best use of Apify | [`sponsors/apify/`](sponsors/apify/README.md) | The copy watch crawling our sandbox market |
| Figma, workflow | [`sponsors/figma/`](sponsors/figma/README.md) | The stage log, the handoff files and the Slides deck |
| MLH, Best Domain Name from GoDaddy Registry | [`sponsors/mlh-godaddy/`](sponsors/mlh-godaddy/README.md) | The domain, pointing at the public site |

## What's real and what's simulated

The full list, with the gate, tag and key for every feature and upgrade, is in [`docs/devpost/whats-real.md`](docs/devpost/whats-real.md). At 8:00 PM on Saturday:

- **Live, with a passed gate:** B01 (matching), B03 (the planted-error proof), B05 (your own statement), B06 (the Excel report), B08 (approvals) and B10 (splits, receipts, statements and impact).
- **Built, waiting for a live check tonight:** B02 (Claude explains the catch), B04 (Nessie, one rerun queued), B07 (Ask Cindy) and B09 (the v1 gift finder).
- **Planned:** everything in v2 beyond the re-skin and the core types, including the model, search, the swarm, the database and the copy watch.
- **Simulated by design:** the checkout (no real charge), sending anything, the bank (Nessie is a sandbox), the verification line (no real check was done) and the whole guided tour.
- **Search model's numbers:** not trained yet.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
