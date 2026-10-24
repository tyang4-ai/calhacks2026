# D-sponsors · README, what's real, the Devpost skeleton and one folder per sponsor track

Priority: P1 · Wave: any (8:00 PM Saturday, then again at the freeze) · Depends on: `docs/harness/status.md` as it stands when the scribe runs · Folder: `README.md`, `docs/devpost/`, `sponsors/` · Made real by: nothing (writing only)

**SCOPE:** `README.md, docs/devpost/, sponsors/`

## Goal

A judge or a sponsor who opens the repo finds their track in one click and sees exactly what to look at, how to run it and what's real. Gordon gets a Devpost skeleton with every fact already in place and clearly marked spaces for his own words, so he writes the story himself and doesn't have to dig for numbers.

## Read first

- `docs/harness/status.md`: the gates, the Features and Upgrades tables (v1 and v2), the Tags table, Cut and simulated, Needs Gordon, the Public site line. This is the source of truth for what's real.
- `docs/v2/fix-plan.md` sections 1.1 to 1.8: the platform framing, the 3-minute demo, the edge over Etsy, the three pillars and the other tracks, Backend if time, mock data only, training, the public site.
- `docs/v2/brief.md` (what Cindia is, "Why not Etsy", "What each track sees", "Data care", every figure with its source link) and `docs/v2/README.md` (the plan list)
- `docs/v2/contracts.md` section 12: the on-screen labels L1 to L30. L30 is quoted below.
- `docs/spec/cindia-pitch.md`: Gordon's own earlier drafts of his story. You may point to them, but you don't rewrite them.
- The plans in `docs/plans/` for the files each track should look at, and `docs/common/api-contract.md` for the endpoints
- The sponsor notes in `docs/reference/sponsors/` and the Devpost notes in `docs/reference/ch13-devpost.md`, for each track's criteria
- `server/b11_embed/report.json`, when it exists: the only source for the search model's numbers
- `docs/common/demo-script.md` for beat IDs and times once `I2-tour` has replaced it. Before that, the tour table in `docs/v2/fix-plan.md` section 1.2.
- `docs/common/definition-of-done.md`, "Writing (scribe)"

## Style

- Plain words and short sentences. No em dashes and no semicolons in prose.
- None of these words or phrases: tapestry, realm, foster, esteemed, thrilled, unwavering, bridge the gap, at the intersection of.
- Cindia is a platform. Never an app or an application.
- Write "Native American", and the nation names "Diné (Navajo)", "Ojibwe", "Acoma Pueblo" and "Seminole". Never "Indian American", which means Americans of South Asian descent, and never a nation's name as a product word ("a Navajo rug").
- Evidence first: "Cindy matched 23 of 23 payouts" beats "powerful matching".
- Never a number that isn't in `status.md`, a plan, a test, `report.json`, the brief or the spec. Every outside fact (the Etsy and eBay facts below) is quoted with the source link the brief gives, never from memory.
- Never a key, an environment variable's value, or a URL with credentials. Variable names are fine.
- Every person and community in the demo is fictional. Say so wherever they appear. Name only the four communities in the catalog. Other communities appear only as "next", and only with their own organizations.

## The lines every file shares

Use these exactly, so the README, the Devpost, the sponsor folders and the tour never disagree.

- **What Cindia is.** Cindia is a platform for underrepresented makers, starting with Native American makers. Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Cindia does the selling, the marketing and the books for them, and it's fair by design: the price split is shown, search ranks by fit and not by ads, and Surprise me leans toward makers who sold less.
- **The named community.** The fictional Diné Weaving and Silver Co-op on the Navajo Nation, its owner Ruth B. and its makers Grace N., Lena T. and Mae K. Three more fictional communities sit beside it in the catalog: an Ojibwe beadwork co-op, an Acoma pottery studio and a Seminole patchwork co-op. Lead with the co-op in every file. The judges for Anthropic want "the narrower, the better".
- **L30, word for word.** "Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them." It goes in the README, `whats-real.md` and `devpost.md`.
- **The seats line.** Copy it word for word from the tour's end card (`src/app/demo/EndCard.tsx`, or I2-tour's plan if the card isn't built yet). Never write a new one. It goes in the README, the Devpost and `sponsors/hyphenate/`.
- **The eval set.** "Held-out test queries, written separately by our data agent." If Gordon wrote or edited some, say how many, as `report.json` reports them in their own row. Never "hand-written".
- **The edge over Etsy** (`docs/v2/fix-plan.md` section 1.3, with the brief's links): Etsy pays the shop. Cindia pays the makers, and proves it. Use its six points in this order: it does the work for them, it pays each maker and not one shop account, it runs the books across channels, provenance comes from the community and not the seller, it's fair by design with the math shown, and the storefront is theirs. Then the line "We don't claim lower fees. Cindia's own fee is 10%."

## What to write

### `README.md`

- What Cindia is and the named community, from the shared lines above, in three or four sentences.
- **Why not Etsy:** the edge over Etsy, as six short bullets, with the brief's source links for the two outside facts.
- **Run it:**
  - the public site: the URL on the Public site line of `status.md`, or `[GORDON: the public site link]` if it's empty. Say it plays the scripted tour only and sells nothing,
  - scripted on your own machine: `npm ci`, `npm run build`, `npm run preview`, then open `/demo?mode=present` and `/shop`,
  - live: the environment variable names from `docs/v2/contracts.md` section 1, never their values, plus `npm run server`, `spacetime start --listen-addr 127.0.0.1:3000`, and `node scripts/laptop-setup.mjs` for a Windows demo machine.
- **The tour and its controls:** the 3-minute order (the pitch cards, the buyer minute, the seller minute), presenter mode (`/demo?mode=present`, Space or the right arrow plays the next beat, the left arrow replays the current one), auto-play on `/demo` for the video, chapter 2 after the end card, and `?start=<beatId>`.
- **The backend:** the three pillars from `docs/v2/fix-plan.md` section 1.4 (the swarm of small Claude agents, our own embedding model that embeds every seller entry, and one database that holds everything), each in two lines with its plan linked. The README says why each agent exists, and that six of them are plain code, from the roster in `docs/v2/contracts.md` section 6.
- The seats line.
- A short map of the folders, and the test commands.
- A "For sponsors" table linking each `sponsors/` folder.
- The what's-real summary, linked to `docs/devpost/whats-real.md`, with L30 under it.

### `docs/devpost/whats-real.md`

- One table: each feature and upgrade, live or simulated, the gate and tag it passed (with the SHA from the Tags table), and its key or service.
- The Cut and simulated list exactly as `status.md` has it.
- "Backend if time" from `docs/v2/fix-plan.md` section 1.5, as a second table: what the pitch says, what the demo has, and which of those the build made true, from `status.md`.
- L30, then one line on data care: every maker, community, piece, order and story lives in `src/mock/`, and SpacetimeDB, Elastic, the training pairs and the vectors are built only from it (`docs/v2/fix-plan.md` section 1.6).
- The search model's numbers from `report.json`, or "Not trained yet". Call the eval set what the shared line says.

### `docs/devpost/devpost.md`

The Devpost skeleton, with these sections. Facts go in. Gordon's own words go only where a marker says so, written exactly as `[GORDON: <what goes here, with one or two questions to start him>]`.
- **Inspiration:** `[GORDON: ...]` only, pointing to his earlier draft in `docs/spec/cindia-pitch.md`. Start him with: why underrepresented makers, and why Native American makers first? The Anthropic mentors asked "if we don't help them, who will?"
- **What it does:** facts, as short bullets: what Cindia is, the buyer side, the seller side, the swarm, the process blocks, the tour. Then the edge over Etsy in two lines.
- **How we built it:** the three pillars, the stack from `package.json` and `server/requirements.txt`, our own embedding model and how it was tested (the eval set as the shared line says), Elastic, SpacetimeDB, Apify, Nessie, the Claude models per agent (Haiku and Sonnet only), and the build harness of Claude Code agents with gates.
- **Challenges:** facts from `docs/harness/lessons.md`, then `[GORDON: ...]`.
- **Accomplishments:** gate results, the planted-error score, the search model's numbers.
- **What we learned:** `[GORDON: ...]` only.
- **What's next:** co-design with Native-led arts organizations comes first, and Cindia would use the marks and processes communities already run instead of issuing its own. Then the items from "Backend if time" that weren't built, the storefront builder beyond the preview, and other underrepresented makers, each community only with its own organizations.
- L30.
- **Built with:** a plain list.
- **Tracks:** one line per track, linked to its `sponsors/` folder.
- **Links:** the repo, the public site, `[GORDON: video link]`, and the project image at `docs/devpost/project-image.png` (the orchestrator copies the catch screenshot there at the freeze).

### `sponsors/<track>/README.md`

One folder per track, plus `sponsors/README.md` indexing them. Each README has the same parts:
1. The track's name.
2. What its judges look for: a line or two per criterion in your own words, with a short quote only where a criterion's exact wording matters, and a link to the Devpost prizes page as the source.
3. What Cindia does for this track.
4. Where to look: relative links to the exact files and plans.
5. How to run that part.
6. The moment in the tour (beat ID and time).
7. What's live and what's simulated for this track, from `status.md`.

| Folder | Track | What its judges look for (from the hacker guide, the sponsor notes and Devpost) | Look at |
|---|---|---|---|
| `anthropic` | Claude for Public Benefit | A named community, not a broad group. A real problem the builder lived or heard first hand. It works, one thing done well and usable on Monday. Thoughtful use of Claude, knowing where it could go wrong for the people using it. A clear plan to measure impact on the community | `server/b14_swarm/` (the agents and their checks), `server/b11_embed/pairs.py` (Claude writes the training queries, with the eval-leak guard), `server/routers/b02_explain.py` and `b07_ask.py`, the brief, the harness in `.claude/` and `docs/harness/`. `server/routers/b09_concierge.py` is v1's concierge, which the tour no longer uses. Say so |
| `hyphenate` | The Hyphenated Enterprise: Autonomous Systems for Finance | Is it real enough. Would you hire it, for which seats, with limited access, a clean record and knowing when to ask. Did we see something new. The moment it catches what others missed. They also want a demo video that opens with the moment, a live demo, one line on the seats, and proof of what's real | `src/features/reconcile/`, `server/routers/b01_match.py`, `b03_proof.py`, `b08_approvals.py`, `src/features/approvals/`, `src/features/proof/`, `src/features/process/` (the reconcile and approvals views that open during `d07-month` and `d09-approve`), the swarm's roster |
| `visa` | Reimagining Shopping | Innovation, user experience, technical execution, commerce impact, trust and responsibility | `src/features/search/`, `server/b12_search/`, `src/features/buyer/` (the token, the split with the gallery comparison, the receipt), `src/features/support/` |
| `microsoft` | Built for the Real World | Customer understanding, measurable usefulness, path from prototype to production, responsible design, end to end functionality | `server/routers/b06_workbook.py`, `src/features/close/`, `src/features/impact/`, `server/b11_embed/report.json`, the approvals, every `src/sources/live/` adapter (the swap points) |
| `capital-one` | Best Use of Nessie | Completeness, creativity, complexity | `server/routers/b04_bank.py`, `server/routers/b04_nessie.py`, `docs/plans/B16-bank-books.md` and the files it names, `src/features/money-map/` |
| `meta` | Bringing People Closer Together with AI | How it strengthens human connection, how essential and well integrated the AI is, originality, a strong working demo | `src/features/support/` (the "ask the maker" run), `src/features/seller-hub/` (the maker's page), `src/features/buyer/` (Grace N.'s note on the paid receipt), `src/features/communities/`, `src/features/storefront/` |
| `elastic` | Best use of the Elastic Agent Builder on a Serverless instance | The track's name says it: Agent Builder on Serverless. Show the agent, the index and our own vectors in it | `server/b12_search/` (`elastic.py`, `agent.py`), `server/b14_swarm/` (the Finder routes find questions to `cindia-finder` in code), `server/b11_embed/` |
| `spacetimedb` | Spacetime | SpacetimeDB as the core real-time backend: live shared state, instant sync between users, agents and systems, live dashboards, marketplaces | `server/b13_spacetime/` (the module, the bridge, the polling endpoint), `src/sources/live/b13-live.ts`, `src/features/process/` (the `data` view and presence on the process bar) |
| `apify` | Best use of Apify | Apify used in a meaningful way, and the quality of the project | `server/b15_watch/` (`scout.py` and the crawler it runs over the sandbox market), `src/features/watch/`, the sandbox market at `/market/` on the public site |
| `figma` | Best Figma Workflow Hack | A demo video of 3 minutes at most, a stage log of 200 words at most per stage (ideation, prototyping, handoff, code generation), and Figma Slides with the Figma files embedded, a link to the code, and every file shared with anyone who has the link | `design/` (`HANDOFF.md`, `stage-log.md`, the Figma links), `docs/plans/I3-redesign.md` |
| `mlh-godaddy` | Best Domain Name from GoDaddy Registry | A domain registered through GoDaddy Registry | The public site (`docs/plans/D-deploy.md`) and `[GORDON: the domain, and that it points at the public site]` |

**What each track's README must also hold:**

- **anthropic.** Lead with the co-op. Then a "Where it could go wrong" table with four columns: the risk, who it hurts, the guard, and the test that proves the guard. The guard and test columns link to the file or test as the plans and code stand when you write, and say "planned" when a guard isn't built yet. Cover at least these rows:

  | Risk | Who it hurts |
  |---|---|
  | The Steward invents what a piece or a pattern means | the community, whose culture gets spoken for |
  | The Writer invents an amount or a date | the buyer, who plans on it |
  | The watch wrongly accuses a seller | a real seller, and the co-op's name |
  | Prompt injection in a found listing | the owner, who might approve a bad report |
  | An agent moves money, publishes or reports by itself | the makers and the co-op |
  | Cindia speaks for a community | the community, whose voice it isn't |
  | A buyer reads another buyer's order | the other buyer |
  | Live questions leave the platform for Claude | the buyer who typed them |

  Then an **impact measurement plan:** the three numbers the impact view already shows (the maker's share, days from close to payout, bookkeeping hours saved, the last one labeled an estimate), each with how a one-co-op pilot would measure it before and after. Then the one thing usable on Monday: the co-op drops its gallery statement into the scenario panel and gets the matches and the short payment (B05, live with no key). Say that Haiku and Sonnet run the swarm, that six roles are plain code, and why each agent exists.
- **hyphenate.** The seats line. The moment (`d08-catch`) and the process views that open in `d07-month` and `d09-approve`. Two lines on time and on working with others, written as design and marked with what the demo shows: the held amounts carry into the next month, and after a decline Cindy keeps the money held and asks again with the owner's reason. The demo shows the held $95 on Grace N.'s statement. Say plainly that it doesn't show a second month, unless `status.md` says the scripted re-proposal was built.
- **visa.** Built around Visa's six questions, one heading each: what challenge it solves, who benefits, how AI improves the experience, how it works, why it matters, and where it could go next. Commerce impact maps to the data: $134.48 of $180 goes to the maker (figure 1), fair random leans toward makers with fewer sales, the split shows the gallery comparison before anyone pays, and the receipt turns to "Paid to the maker". Trust: the card becomes a token, the project add-on starts off and the buyer turns it on, and every simulated panel says so.
- **microsoft.** A "Path from prototype to production" section: what's live today (from `status.md`), the swap points (each source key and its adapter in `src/sources/live/`), what a one-co-op pilot needs (a real bank behind B04's interface, sign-in and roles, per-community data controls, Claude cost per month from the step log, monitoring through the process log), and the pilot's targets (days from close to payout, hours saved).
- **capital-one.** What B04 posts to Nessie, and what B16 adds: in live mode the matcher reads the bank side back from Nessie, so the $340 catch is found against Nessie, and the fund moves post as a deposit and a withdrawal. Say Nessie is a sandbox bank, so no real money moves. If B16 isn't green, say what's still read from the mock data.
- **meta.** The maker's voice: Grace N.'s note on the paid receipt, and the "ask the maker" run, where a buyer's question reaches the maker's page and her own answer comes back, labeled as her words.
- **elastic.** The index, our own vectors in it, hybrid search, and `cindia-finder` answering find questions, routed in code and labeled "Elastic Agent Builder" in the swarm view. `[GORDON: a Kibana screenshot of the agent and its tool, saved as sponsors/elastic/agent-builder.png]`. The provenance note: the index records who writes each layer in a real launch. In this demo the Cindia team wrote all of it, and the Describer never ran, because nothing uploads a photo.
- **spacetimedb.** What the database holds (the catalog seeded from the mock data, listings, orders, approvals, swarm runs and steps, process status and the screens watching), the polling endpoint, the `data` process view, and presence on the process bar.
- **apify.** The copy watch: Scout crawls the sandbox market (static fictional listings, some of them look-alikes of the co-op's pieces, one that only claims to be Native-made), and the watch view lists every result Apify returned, not only the hits. Say the watch never searches the real web.
- **figma.** The three hand-ins and where each one is: the stage log (`design/stage-log.md`, one entry per stage of 200 words at most), the Figma Slides deck, which mirrors the three pitch cards of `/demo` with the Figma files embedded and a link to the code (`[GORDON: the Slides link, shared as Anyone with the link]`), and the workflow video of 3 minutes at most (`[GORDON: the workflow video link]`). Link the stage log's sections that exist, and say which stages are still to come.
- **mlh-godaddy.** The domain, what it points at (the public site, scripted only, with the sandbox market), and the Public site line from `status.md`.

If a folder's code doesn't exist yet when the scribe runs (an upgrade still building, or cut), say so in that README, and link the plan instead of the code.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The what's-real list | `docs/devpost/whats-real.md` | none | sonnet |
| T2 | The README | `README.md` | T1 | sonnet |
| T3 | The Devpost skeleton | `docs/devpost/devpost.md` | T1 | opus |
| T4 | Sponsor folders, part 1: anthropic, hyphenate, visa, microsoft, capital-one, meta | `sponsors/anthropic/README.md`, `sponsors/hyphenate/README.md`, `sponsors/visa/README.md`, `sponsors/microsoft/README.md`, `sponsors/capital-one/README.md`, `sponsors/meta/README.md` | T1 | opus |
| T5 | Sponsor folders, part 2: elastic, spacetimedb, apify, figma, mlh-godaddy, and the index | `sponsors/elastic/README.md`, `sponsors/spacetimedb/README.md`, `sponsors/apify/README.md`, `sponsors/figma/README.md`, `sponsors/mlh-godaddy/README.md`, `sponsors/README.md` | T1 | sonnet |
| T6 | At the freeze: refresh every file above from the final `status.md` and the Tags table. Add one line per track to `sponsors/README.md`: its hard requirement met or not, from the final what's-real list, so Gordon selects only the tracks that are met on Devpost. Link the project image in `devpost.md` | all of the above | the freeze, after the project image is copied | sonnet |

## Acceptance

- Given `status.md`, when the what's-real list is compared with its Cut and simulated section and its Upgrades tables, then they agree line for line.
- Given every relative link in `README.md`, `docs/devpost/` and `sponsors/`, when each is checked with Glob, then it points to a file or folder that exists, or the text says it's still being built and links its plan.
- Given the Devpost skeleton, when it's read, then every section that needs Gordon's voice holds only a `[GORDON: ...]` marker, and every fact traces to `status.md`, a plan, a test, `report.json`, the brief or the spec.
- Given `README.md`, `whats-real.md` and `devpost.md`, when each is searched for L30, then each holds it word for word.
- Given the seats line in the README, the Devpost and `sponsors/hyphenate/`, when each is compared with the end card's, then all four match.
- Given `sponsors/anthropic/README.md`, when it's read, then it holds the "Where it could go wrong" table with every row above, each guard and test linked or marked "planned", and the impact measurement plan.
- Given `sponsors/visa/README.md`, when it's read, then it has one heading for each of Visa's six questions.
- Given any of these files, when it's searched, then it holds no key or variable value, no em dash, no semicolon in prose, none of the banned words, no "Indian American", no "app" for Cindia, no nation's name as a product word, and no community outside the catalog except as "next".
- Given the eval set anywhere in these files, then it's called "held-out test queries, written separately by our data agent", with Gordon's own count if he wrote some.
- At the freeze, `sponsors/README.md` holds one met-or-not line per track.
- The Writing checklist in `docs/common/definition-of-done.md` passes.

## Out of scope

- Writing Gordon's story, the inspiration or the lessons in his voice.
- Submitting anything, posting anywhere, recording or editing either video, making the Slides deck or the Kibana screenshot.
- Code, tests or contracts.

## Contract additions needed

- `docs/common/conventions.md`, Folders and owners: `sponsors/` owned by the scribe. The edit guard's area for the scribe role already includes `sponsors/`.
