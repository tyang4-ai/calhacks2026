# C-tracks · Do the v2 plans meet each track's rules?

Reviewer C, Saturday Oct 24, 2026, 2:45 PM PT.

**Read:** `docs/v2/brief.md`, `docs/v2/README.md`, `docs/v2/contracts.md` (all of it, section 8 for the tour), every `F-`, `M-` and `B1*` plan, `I2-tour`, `I3-redesign`, `S3-catalog`, `D-sponsors`, `docs/spec/cindia-pitch.md`. For Capital One also `B01-match.md` and `B04-bank.md`. Also `docs/harness/status.md`, the new `design/stage-log.md`, `.claude/agents/scribe.md`, and the event notes in the vault: `ch13-devpost.md`, `ch13-hacker-guide.md`, `ch13-slack.md`, `ch13-schedule.md`, and the Anthropic, Hyphenate, Microsoft, Visa and Capital One sponsor notes. The vault has nothing on Elastic, SpacetimeDB, Apify, Figma, Meta or MLH beyond the Hacker Guide, so for those the criteria in the review request are the source.

**State at review time:** v2 hasn't started building. `status.md` is still the v1 board (`demo-ok-4`). B02, B07 and B09 wait on the Anthropic key and B04 on `NESSIE_KEY`, both since 2:01 AM.

## Scorecard

| Track | Hard requirement met | Strength | The single most valuable fix |
|---|---|---|---|
| Anthropic, Claude for Public Benefit | yes | ok | Write the "where it could go wrong" table (risk, who it hurts, guard, test) and the impact measurement plan into `sponsors/anthropic/` and the pitch, and lead with the Gu studio (finding 7) |
| Hyphenate, Autonomous Systems for Finance | yes | strong | Open the reconcile and approvals process views during `d07-month` and `d09-approve`, so the finance seats show their record of work, live or simulated per event (finding 12) |
| Visa, Reimagining Shopping | yes | ok | In live mode let the Finder agent write the chips and filters, so "Cindy turns my words into keywords" is true, or say "rule-based" everywhere (finding 9) |
| Microsoft, Built for the Real World | yes | ok | Write the "path from prototype to production" page: what's live today, the swap points, what a one-studio pilot needs, and its measured targets (finding 14) |
| Capital One, Best Use of Nessie | partly | weak | Get `NESSIE_KEY` in, then have the matcher read the bank side back from Nessie, so the $340 catch is found against Nessie and not the dataset (finding 5) |
| Meta, Bringing People Closer Together with AI | yes | ok | Close the "I'll ask the maker" loop: the buyer's question reaches the maker's page in Chinese and her own reply comes back in English (finding 13) |
| Elastic, Agent Builder on a Serverless instance | partly | weak | Give `cindia-finder` a visible job in a recorded flow, routed in code, and show "Elastic Agent Builder" as the tool in the swarm view (finding 3) |
| SpacetimeDB | partly | weak | Put the shared state the demo is about on SpacetimeDB: the approval queue and the seal across two screens, the process status, and presence on screen (finding 4) |
| Apify | partly | ok | Show every result Apify returned (title, URL text, similarity, verdict), not only hits, and stop gating the scan on B11's model (finding 6) |
| Figma, Best Figma Workflow Hack | partly | weak | Gordon verifies Education now, which lifts the MCP call limit that has stopped the design pipeline, then one plan lists the Slides deck, sharing and the video (finding 2) |
| MLH, Best Domain Name from GoDaddy Registry | partly | weak | Host the scripted build (static and offline-safe) and point the domain at `/demo` (finding 16) |
| Cal Hacks judging and Best Solo Hack | partly | strong | A demo-laptop setup task done Saturday night (model, Python packages, SpacetimeDB, keys, a health check), with the scripted fallback rehearsed (finding 1) |

## Per track

Each table gives the criterion, what the plans give (plan and task, or tour beat from contracts section 8), and the gap. Finding numbers point to the findings table.

### Anthropic · Claude for Public Benefit

| Criterion | What the plans give | Gap |
|---|---|---|
| 1. A named community | The Gu embroidery studio in Shanghai, its owner and three makers (brief, "The named community"). The money story follows it: `pc_01` by `mkr_01` in `d03-piece`, the catch in `d08-catch`, 本月收入 in `d11-maker` | The v2 headline is "Indigenous and heritage makers everywhere" (brief, "In one line"). Anthropic's Slack post says "the narrower, the better". The README and the pitch must lead with the studio and present the seven Indigenous communities as catalog range |
| 2. A real problem | Time, legacy and trust with sourced figures (brief, "Why it matters"). Gordon grew up in Shanghai (pitch) | Nothing records a conversation with a maker or a seller. The spec's open decision "which real artisan to quote" is still open (finding 8) |
| 3. It works | v1 is green to `demo-ok-4`. B05 takes a real statement file live with no key. Every panel falls back to scripted events and says so. B14 aims to answer `d04-support` in under 9 seconds | No plan names the "one thing usable on Monday". The best candidate is already built: the studio drops its gallery statement into the scenario panel and gets the matches and the short payment. B02, B07 and B09 wait on the key, so Claude is simulated in the money story until it lands |
| 4. Thoughtful use of Claude | 15 of the 21 roster agents run on Claude, each with one job, its own tools and a Pydantic output through `messages.parse()` (B14). Server checks back them: the Steward's quote must appear word for word or it answers "I'll ask the maker" (B14 T5), the Writer's amounts and dates must come from the facts (B14 T6), no run can emit a grant or a money move (B14 T9). Claude writes the training pairs with an eval-leak guard (B11 T3). Claude Code agents with gates built the app (`.claude/`, `docs/harness/`), which covers "in development" from the Slack post | No deliverable says where it could go wrong for makers, buyers and communities, or how impact would be measured with the real studio. Criterion 4 and the Slack post ask for both (finding 7). Anthropic's workshop was about "when adding one more [agent] is a bad idea", so the README should say why each agent exists and that 6 are plain code |

- **Hard requirement:** met. The Gu studio is a named community at the right size.
- **Most valuable fix:** finding 7. It's writing, it uses guards the plans already build, and it answers criterion 4 in its own words.

### Hyphenate · The Hyphenated Enterprise: Autonomous Systems for Finance

| Criterion | What the plans give | Gap |
|---|---|---|
| Is it real enough? | A messy month: a bundled payout, a refund netted, a payout carried over, and the gallery short $340 against contract, statement and bank (F-reconcile, B01 live). Four planted errors with an answer key, caught 4 of 4 (F-proof, B03 live). A judge's own file through B05 (live) | One month only. "What happened in March should change June" from the track brief has nothing (finding 20) |
| Would you hire it? | Seats in the brief: bookkeeper, collections, support. Limited access: the roster's tools and `allowed()` (B14 T2). Segregation: Cindy proposes, the owner approves, over $500 always needs the owner. A record: the audit drawer (F-audit), the process views' event logs (F-process T5), the swarm view. Knowing when to ask: approvals, `support.escalated` | The tour opens process views only on `d01`, `d04`, `d05`, `d13` and `d15`, so the record judges watch is the support agents', not the bookkeeper's or the collector's (finding 12). The money team never appears in the swarm view, because B14 leaves B01, B02, B03, B06 and B10 out. The brief names three seats and the pitch two roles |
| Did we see something new? | A Shanghai embroidery studio's consignment books run by agents, traced to the buyer's receipt | Strong as is |
| The moment | `d08-catch` (55 to 63 s). Video mode opens on it (I2-tour T4). `?start=catch` for the table. Ask Cindy answers "Why did you flag the gallery payment?" with the three records (F-ask-cindy) | "Defends a decision when questioned" is live only with the Anthropic key (B07 waits), and the Explainer too (B02). A decline just reads declined (M-approvals T4), so "handle the answer" isn't shown (finding 20) |
| Submission asks | Video opening with the moment (I2-tour T4), a live demo, the seats line (pitch), proof: planted errors, the end card's live sources, `whats-real.md` | The end card has no seats line. M-desktop, which fits the money map, the month, the catch and the close to the desktop frame, is P1 and last in the queue (finding 11) |

- **Hard requirement:** met. Every submission ask has a planned home.
- **Most valuable fix:** finding 12. It's two `beat.started` events in I2-tour T1, and it turns "a clean record of its work" into something judges watch during the moment.

### Visa · Reimagining Shopping

The Hacker Guide weights Innovation 25, User Experience 25, Technical Execution 20, Commerce Impact 15, Trust 15. Visa's starter pack gives 25, 20, 20, 20, 15. Wallace said the guide wins. Visa provides no APIs.

| Criterion | What the plans give | Gap |
|---|---|---|
| Innovation | Search by feeling with editable chips (F-search T1 to T3) on our own fine-tuned model (B11). Surprise me with fair random (F-search T4). The split before paying (M-buyer T3). The receipt that turns to "Paid to the maker" (M-buyer T5). Beats `d01` to `d05` and `d12` | Strong concept |
| User experience | Six results above the fold at 1440 by 900 (F-search T7). Chips you can remove and add. The support drawer beside the piece (F-support T4). A restyle from Figma (I3-redesign) | The restyle waits on Figma drops, which are blocked (finding 2) |
| Technical execution | B11 fine-tune scored on recall at 5 against keyword, base and hybrid. B12 hybrid RRF on Elastic with a local fallback. B14's swarm | The brief and the `d01` narration credit the Finder agent with the chips, but F-search uses the rule-based `extractKeywords()` in both modes and B12's reasons make no model call. No generative AI touches discovery (finding 9) |
| Commerce impact | Figures in the data: the maker gets $134.48 of $180 (figure 1), fair random leans to makers with fewer sales, the project add-on, the receipt | Nothing plans to present these as merchant outcomes or engagement. No metric for conversion (finding 19) |
| Trust and responsibility | The card becomes a token. The checkout view lists what's stored and what never is (F-process T4). Every result says why it matched. Simulated badges. The Steward answers only from the record | The project add-on is on by default (M-buyer T4), a consent problem that Visa's pack names directly (finding 10) |

- **Hard requirement:** met. No Visa API is asked for, and the AI does real work in search and support.
- **Most valuable fix:** finding 9. It makes the core shopping moment use Claude for real and keeps the pitch honest.

### Microsoft · Built for the Real World

| Criterion | What the plans give | Gap |
|---|---|---|
| Customer understanding | The owner, the makers and the buyer, with what each needs (brief, "Who uses it"). The studio's real workflow: consignment, gallery payouts, maker pay. Personas on the Figma research board | No customer's own words (finding 8) |
| Measurable usefulness | Maker share, days from close to payout with a before value, and hours saved, labeled as estimates (F-impact). Caught 4 of 4 (F-proof). Recall at 5 for the search model (B11) | The estimates have no stated way to be measured with a real studio (finding 7 covers the wording) |
| Path from prototype to production | Each source swaps scripted for live with the same screens, health checks and fallbacks (every B plan). Gates and tests. "Why it scales" (brief) | No artifact says it in one place (finding 14) |
| Responsible design | Approvals and the seal. The $500 limit. The audit trail. B14's sweep that no run emits a grant or a money move. Labels on everything simulated. Cultural care rules | Strong as is |
| End-to-end functionality | The tour runs from the buyer's search to the maker paid and the receipt, with a real .xlsx with formulas (F-close, B06 live) | The finance beats are polished last (finding 11) |

- **Hard requirement:** met. It's a production-minded agent system in finance.
- **Most valuable fix:** finding 14. One page covers the one criterion with no evidence.

### Capital One · Best Use of Nessie

| Criterion | What the plans give | Gap |
|---|---|---|
| Completeness | B04: find or create the customer and a Checking account, seed September once, post the sale as a deposit and the maker payouts as withdrawals, read the balance back for `money-map-balance` | It has never run live (B04 waits on `NESSIE_KEY`). One account only. v2's new money, `mv_0101` and `mv_0102` to the community fund and the milestone release, never reaches Nessie |
| Creativity | A heritage studio's operating account with consignment payouts | Fine |
| Complexity | Base URL discovery, read-back after each create (creates return a string), an idempotent seed | The matcher reconciles the bank records from `src/mock` (B01's adapter), so Nessie plays no part in the catch (finding 5) |

- **Hard requirement:** partly. The code exists and passes 25 mocked tests, but Nessie has never been called with a real key.
- **Most valuable fix:** finding 5. It makes "the books reconcile against a bank, not a spreadsheet" (the pitch's line) true and puts Nessie inside the moment.

### Meta · Bringing People Closer Together with AI

| Criterion | What the plans give | Gap |
|---|---|---|
| Strengthens human connection | The maker's story and hours (`d03`), community pages in their own words (F-communities T2), projects to fund and commissions in stages (F-communities T3 to T5), the add-on (`d05`), the maker's statement (`d11`), the receipt (`d12`), storefronts (`d16`) | The connection runs one way. The Steward's "I'll ask the maker" has no path to the maker, and the handoff goes to the owner as an approval (F-support, out of scope) (finding 13) |
| AI essential and well integrated | The swarm answers about the maker from the community's record (`d04`). Vibe search | The AI answers for the maker instead of connecting the buyer to her |
| Originality | The money trail from buyer to maker, fair discovery | Fine |
| Working demo | The scripted tour and the offline test | Fine |

- **Hard requirement:** met. A working demo is the only fixed ask.
- **Most valuable fix:** finding 13. Claude translating between a buyer in English and a maker in Chinese is the clearest "closer together" moment Cindia can show.

### Elastic · Best use of the Elastic Agent Builder on a Serverless instance

| Criterion | What the plans give | Gap |
|---|---|---|
| A Serverless instance | B12: index `cindia-pieces-v1` behind an alias, no shard settings, our own 384-number vectors with `int8_hnsw`, one RRF request over kNN and `multi_match` with filters, a local fallback | Needs Gordon's Serverless project and keys. B12's adapter is healthy only when B11 says `trained`, so no model means no Elastic at all |
| Agent Builder | B12 T4: `ensure_agent()` makes `cindia-finder` with a search tool over `cindia-pieces`, `converse()` drops unknown piece IDs, `agentBuilder` in `GET /api/b12/status` | No tour run calls it. `run_01` is cindy, intake, steward, clerk and writer. `run_02` is lister, tagger, checker and indexer. The Finder calls it only when the model sets `useElasticAgent` in a live free-form question. Nothing on screen says Agent Builder answered (finding 3) |

- **Hard requirement:** partly. Serverless and our vectors are real in the plans, but Agent Builder, the track's title, never does visible work.
- **Most valuable fix:** finding 3.

### SpacetimeDB

| Criterion | What the plans give | Gap |
|---|---|---|
| The core real-time backend | B13: a module with `swarm_run`, `swarm_step`, `process_status` and `screen`, six reducers, a bridge B14 and B15 call, and a server-sent events stream to the browser | It mirrors swarm steps that B14's HTTP response already carries. Nothing calls `set_process` or reads `process_status`, because F-process computes every block's status in the browser from `log`. The screen count lives only in `GET /api/b13/status`. The browser never subscribes to SpacetimeDB: a FastAPI poller reads its SQL endpoint every 250 ms if subscriptions don't work from Python. B13 is P1, and its G5 needs B14 live (finding 4) |
| Live shared state, multiplayer, instant sync between users, agents and systems | B13's acceptance: two browsers see the same steps and count 2 screens | Not in the tour, the end card or the video plan. The brief promises "process status, the screens that are watching", which no plan delivers |

- **Hard requirement:** partly. The track says "meaningfully used, not just added on the side", and the plan is a side stream.
- **Most valuable fix:** finding 4.

### Apify

| Criterion | What the plans give | Gap |
|---|---|---|
| Apify used in a meaningful way | B15's Scout runs Apify's Google search scraper (run-sync, 3 queries, 10 results each, a 45-second budget). The Comparer scores with our model, Claims checks the claim, the Reporter drafts a calm note, and the owner decides (`apr_03`). Beat `d14-watch` | B15 and F-watch are P1. B15 returns nothing when B11 has no model. The screen lists only `counterfeit.flagged` hits, and `watch.scanned` carries only a count, so on a day with no look-alike the tour shows the scripted `example.com` hit with a Simulated badge and Apify's real output never shows (finding 6) |
| Project quality | A real problem (the brief's sourced counterfeit figure, the Indian Arts and Crafts Act line in `com_dine`'s verification), no accusations, found pages never visited | Fine |
| Best Actor ($400, an actor built for this event) | Not planned | Optional: wrap Scout and Comparer as an actor and publish it (finding 6) |

- **Hard requirement:** partly. Apify is central to one feature, but that feature can play without ever showing Apify's data.
- **Most valuable fix:** finding 6.

### Figma · Best Figma Workflow Hack

| Criterion | What the plans give | Gap |
|---|---|---|
| A demo video, 3 minutes at most | Nothing. I2-tour's video is the product tour | A workflow video is needed |
| A stage log, 200 words at most per stage | `design/stage-log.md` (pushed 2:29 PM): ideation logged at 40 minutes, rated 3 of 5, with tools and output, 194 words. Linked FigJam boards | Prototyping, handoff and code generation are "Not started" |
| Figma Slides with the Make or prototype files embedded, shared as "Anyone with the link" (required) | The stage log's "What stage 2 needs" mentions Slides | No plan task owns the deck. The MCP limit is spent: the Starter plan's 20 calls a month ran out at call 20, and stages 2 and 3 need about 150 to 200. The MCP server can't set sharing, so Gordon must (finding 2) |
| Education verification | The stage log notes it lifts the limits | Gordon's to do |
| Code generation stage | I3-redesign maps `tokens.json` onto `tokens.css` and restyles the kit (T1 to T6) | Runs only after drops that are now blocked |

- **Hard requirement:** partly. The log has started in the right shape, but the required Slides deck has no owner and the pipeline is stopped.
- **Most valuable fix:** finding 2, starting with Gordon's Education verification.

### MLH · Best Domain Name from GoDaddy Registry

| Criterion | What the plans give | Gap |
|---|---|---|
| A domain registered through GoDaddy Registry | Gordon registers it (v2 README). D-sponsors leaves `[GORDON: the domain and what it points to]` | Nothing plans what it points to. The session never deploys (definition of done, kickoff) (finding 16) |

- **Hard requirement:** partly, until Gordon registers it.
- **Most valuable fix:** finding 16. A domain on a working scripted demo also gives every async sponsor judge a link to click.

### Cal Hacks judging and Best Solo Hack

Devpost lists five criteria: application, intentionality, functionality, creativity, technical complexity. "Intentionality" isn't in the brief's track list. The Hacker Guide says a live demo is required and that you must stay at your table for the whole window.

| Criterion | What the plans give | Gap |
|---|---|---|
| Application | Who uses it and why (brief, "Who uses it", "Why it matters") | Fine |
| Intentionality | The principles: desktop, everything visual, a person approves money, label what's simulated, cultural care (brief) | Makers and owners in Shanghai live on phones. v2 drops v1's phone moment. One pitch line on why desktop for judging and phone-first at launch covers it |
| Functionality | Gates keep `main` green, the offline test, scripted fallbacks, video mode, start at the catch | The demo laptop isn't prepared for live mode (finding 1). Venue Wi-Fi had trouble Friday and hotspots are banned |
| Creativity | Search by feeling on our own model, the process blocks, the swarm, the money map, the counterfeit watch | Strong |
| Technical complexity | A fine-tuned model, hybrid search, a SpacetimeDB stream, a typed swarm, Nessie, Apify, and the Claude Code harness with gates | Strong |
| Best Solo Hack | Gordon is solo | Strong. Also select Best People-First Hack if Devpost lists it |

- **Hard requirement:** partly. The live demo, video, image and repo are required, and the video, the image and a live-ready laptop don't exist yet.
- **Most valuable fix:** finding 1.

## Event-level items

| Item | Where the plans cover it | Gap |
|---|---|---|
| Video | I2-tour T4: video mode opens on the catch for 5 seconds and ends on a card with live sources, the planted-error score, the search proof and the repo URL. Gordon records it | A scripted take shows Simulated on every sponsor panel. Record a live take on a machine where `/api/health` reads all true, with live mode switched on a minute early so B04's and B12's seeds and B15's scan finish. Figma needs its own workflow video, 3 minutes at most |
| Project image | Nothing | Devpost requires one (finding 15) |
| GitHub repo | `origin` is `tyang4-ai/calhacks2026` | Gordon makes it public, or shares it with judges, before submitting |
| README | D-sponsors T2 at 8:00 PM and T6 at the freeze | Today's README is a v1 stub. T2 fixes that. It should also link the hosted demo (finding 16) |
| What's real and what's simulated | D-sponsors T1 from `status.md`, the end card from `store.sources`, the Simulated badge rule | `status.md` has no v2 tables yet and an empty Cut and simulated section. V0 step 3 adds the tables, and T1 can only be as good as the board |
| `sponsors/` folders | D-sponsors T4 and T5, one README per track with seven fixed parts. The edit guard allows `sponsors/**` | The scribe's agent file still forbids it (finding 17). The anthropic row links a retired UI (finding 18). The folders can only show what the fixes above make real |
| Devpost draft | D-sponsors T3 skeleton at 8:00 PM | The Hacker Guide recommends a draft on Devpost by Saturday night |
| Track selection | D-sponsors "Tracks" lists every track | Wallace: follow a sponsor track's criteria to sign up for it. Select only tracks whose hard requirement the final what's-real list shows as met (finding 24) |

## Findings

| # | Severity | Where | What's wrong | The fix |
|---|---|---|---|---|
| 1 | blocker | No plan (the demo laptop) | The judging demo runs on Gordon's Windows laptop, but no plan puts the trained model there (`models/cindia-embed-v1` is gitignored and the Hugging Face publish in B11 T8 is optional), installs v2's Python packages (torch), installs SpacetimeDB or publishes its module, or fills `.env`. `server/main.py` skips a router that fails to import, so B11, B12 and B15 quietly fall back and Elastic, Apify, SpacetimeDB and the model view all read Simulated at the table | Add a demo-laptop task: a Node script or README section that pulls `main`, builds the venv, gets the model (publish with B11 T8 and download it, or retrain from the committed `pairs.jsonl`), installs SpacetimeDB and publishes `cindia` (or uses Maincloud), checks `.env`, and prints `/api/health`. Gordon runs it Saturday night on a good network, not on venue Wi-Fi Sunday |
| 2 | blocker | Figma track, `design/stage-log.md`, no design-lead plan | The design pipeline has stopped: the Starter plan's 20 MCP calls a month are used, and stages 2 and 3 need about 150 to 200. No plan owns the required Slides deck, its "Anyone with the link" sharing, or the 3-minute video. I3-redesign, and with it Visa's UX, waits on the same drops | Gordon verifies Education now and picks direction A, B or C. Add a short design-lead plan (or a v2 runbook section): stage log entries 2 to 4 written when each stage ends, a Slides deck with the prototype or Make file embedded, sharing set by Gordon, and a workflow video under 3 minutes |
| 3 | blocker | B12 T4, B14 `finder.py`, contracts section 8 | Agent Builder never does visible work. `cindia-finder` is created, but no tour run uses the Finder, and the Finder calls the agent only when the model sets `useElasticAgent`. Nothing on screen names Agent Builder | Add a buyer follow-up such as "anything like this under $100?" to `demoQuestions` with a scripted run (Intake, Cindy, Finder, Curator, Writer). In B14, route find intents to `elastic_agent` in code, not by the model's choice. Label the step "Elastic Agent Builder" in the swarm view, record it in the video, and put a Kibana screenshot of the agent and its tool in `sponsors/elastic/` |
| 4 | blocker | B13, F-process T1, brief "Storage" | SpacetimeDB is a side stream. It mirrors steps B14's response already carries, `process_status` and `set_process` are never used, the screen count never shows, the browser never subscribes, B13 is P1, and its G5 needs B14 live | Make it hold the shared state the demo is about: the approval queue (Cindy proposes, the owner seals on a second screen, every screen updates through SpacetimeDB), the process status (servers call `set_process`, the bar reads it in live mode), and presence ("2 screens watching" on the process bar). Lift B13 to P0. If time is short, do presence and process status first. Let a B15 scan count as the live writer for B13's G5 when B14 is blocked. Ask the Spacetime team at their 4:00 PM workshop what they'd count as core |
| 5 | major | B04, B01's adapter, M-desktop T2 | Nessie has never run live (no `NESSIE_KEY`). The matcher reads bank records from `src/mock`, so the $340 catch never touches Nessie. v2's fund contribution and milestone release aren't posted. The pitch's "every sale, payout and maker payment runs through Nessie" would be false | Gordon sets `NESSIE_KEY` in the cloud environment and the laptop. In live mode, B01 reads the gallery deposit and the other bank records back from the seeded account. Post `mv_0102` and the milestone release as a deposit and a withdrawal on a fund account and a maker account |
| 6 | major | B15, F-watch T2 and T4 | Apify's output is invisible unless a hit passes 0.75 with an unverified claim, and the scan returns nothing when B11 has no model. On a quiet web day the judge sees only the scripted `example.com` hit | Add the checked results (title, URL text, calibrated similarity, claim verdict) to the scan's events and list them under the hits in F-watch and the watch view. Let the Comparer fall back to the base model or B11's BM25. Optionally aim the Scout at marketplaces with `site:` queries, and wrap Scout and Comparer as an Apify actor for Best Actor |
| 7 | major | D-sponsors T4 (`sponsors/anthropic/`), pitch | No deliverable says where Cindia could go wrong for the people using it, or how impact would be measured with the real studio, though criterion 4 and Anthropic's Slack post ask for both | Require a table in `sponsors/anthropic/README.md`, echoed in the Devpost: risk, who it hurts, the guard, the test. For example: the Steward inventing meaning (quote check, B14 T5), the Writer inventing an amount or a date (B14 T6, `arrival_window`), a wrong accusation of a seller (calibrated score, no accusing words, the owner decides, B15 T4), prompt injection in found listings (Claims returns booleans plus a quote that must appear verbatim, and nothing is sent), money moving (B14 T9's sweep), speaking for a community (labeled demo text, communities write their own pages at launch). Add the measurement plan from F-impact's three numbers and the "one thing usable on Monday" (the scenario panel with the studio's own statement) |
| 8 | major | Anthropic criterion 2, Microsoft customer understanding, pitch | No real maker's words. The spec's open decision "which real artisan to quote" is still open, and the v2 headline reaches past what Gordon has lived | Gordon talks to one Gu embroidery maker or seller (WeChat or Xiaohongshu) before judging and quotes them with permission. Every pitch and README opens with the Gu studio |
| 9 | major | Brief "Vibe search", F-search T1, B12 `reasons.py`, I2-tour narration for `d01` | The brief and the `d01` line ("Cindy turns them into keywords") credit the Finder agent, but chips come from the rule-based `extractKeywords()` in both modes and reasons make no model call | In live mode, have the Finder (Haiku) return the chips and filters with `search.answered` (a contract field), labeled as the Finder's, with the rule-based extractor kept as the instant preview and the scripted path. If there's no time, change the brief, the narration and the what's-real list to "rule-based keywords" |
| 10 | major | M-buyer T4 | The project add-on is on by default. A pre-ticked contribution at checkout is a consent problem, and Visa's pack lists user consent under trust | Start it off. The switch reads on once a `project.funded` for this checkout is in the store, so the tour still shows it on at `d05-pay` |
| 11 | major | v2 README plan table, I2-tour "Depends on", v2 runbook V3 | M-desktop is P1, last in the feature queue, and not a dependency of I2-tour, though `d06` to `d10` are the moment for Hyphenate, Microsoft and Capital One. G1b keeps those beats visible, not fitted to the desktop frame, and the money map won't draw the community fund until M-desktop T2 lands | Make M-desktop P0, run its T2 and T3 right after M-approvals, and add it to I2-tour's dependencies |
| 12 | major | I2-tour T1 (events table), I2-tour T4 (end card) | No process view opens during a finance beat, so the tour shows only the support agents' record of work. The end card has no seats line, and the brief (three seats) and the pitch (two roles) disagree | Add `beat.started` with `process: "reconcile"` late in `d07-month` and with `process: "approvals"` in `d09-approve`. Pick one seats line and put it on the end card, in the README and in the Devpost |
| 13 | major | F-support, B14 `steward.py`, F-seller-hub `maker.side` | "I'll ask the maker" has no path to the maker. The only handoff is an approval for the owner | When the Steward answers `unknown`, put the question on the maker's page in Chinese, let her answer in her own words, and have the Writer send it back in English, labeled as her words with Cindy's translation. One scripted run makes it demoable |
| 14 | major | D-sponsors T4 (`sponsors/microsoft/`) | "Path from prototype to production" has no artifact | Add the section: what's live today (from `status.md`), the swap points (each source key and its adapter), what a one-studio pilot needs (a real bank behind B04's interface, sign-in and roles, per-community data controls, Claude cost per month from the step log, monitoring through the process log), and the pilot's targets (days from close to payout, hours saved) |
| 15 | major | D-sponsors, freeze steps | No plan makes the Devpost project image, which Devpost requires. The scribe has no Bash, so it can't copy a screenshot | At the freeze the orchestrator copies the `d08-catch` beat screenshot from `artifacts/demo/`, or the design lead's cover, to `docs/devpost/`, and Gordon uploads it |
| 16 | major | MLH track, kickoff "Phone preview", spec "Hosting" | The domain has nothing to point at, and sponsors who judge asynchronously have no working link | After the freeze, Gordon deploys `dist/` from the final tag to a static host (the spec names Cloudflare Pages), with an SPA fallback so `/demo` and deep links load, then points the domain at it and links it from the README, the Devpost and `sponsors/` |
| 17 | minor | `.claude/agents/scribe.md` | The agent file says the scribe may write only `README.md` and `docs/devpost/`, and names `draft.md` and the marker `[Gordon writes this]`. D-sponsors adds `sponsors/`, `devpost.md`, `whats-real.md` and `[GORDON: ...]` | The orchestrator updates the agent file to match D-sponsors |
| 18 | minor | D-sponsors, anthropic row | It points Anthropic judges to `server/routers/b09_concierge.py`, whose UI M-buyer T7 removes after G4v2 | Point to `server/b14_swarm/` and `server/b11_embed/pairs.py`, and say B09 is v1 |
| 19 | minor | D-sponsors, visa row | The Visa README isn't asked to answer Visa's six Sunday questions, and commerce impact has no framing | Build `sponsors/visa/README.md` around the six questions (challenge, who benefits, how AI helps, how it works, why it matters, what's next), and map commerce impact to the data: $134.48 of $180 to the maker, fair random for makers with fewer sales, the paid receipt |
| 20 | minor | Hyphenate "Time" and "Working with others" | Nothing shows a past month changing what Cindy does, or what she does after a decline | One line each in `sponsors/hyphenate/`: the held amounts carry into next month, and after a decline Cindy keeps the money held and asks again with the owner's reason. A scripted re-proposal only if time allows |
| 21 | minor | `docs/spec/cindia-pitch.md` | The pitch is v1: five tracks, a 60-second demo, "keep the buyer part under 15 seconds" (v2 spends 39 seconds before the money), "Claude reads every contract and statement" (B01 is code), and "every maker payment runs through Nessie" (finding 5) | Gordon rewrites the closing lines, adds lines for Elastic, SpacetimeDB, Apify, Meta and Figma, and keeps a short path for a 2-minute slot: start at the catch, or play the tour at 1.5x |
| 22 | minor | S3-catalog T7 and T8 | The Designer run is on `sto_07`, but contracts section 11 and F-storefront use `sto_01`, the Gu studio's builder | Follow section 11: `run_03` on `sto_01` |
| 23 | minor | CLAUDE.md "When stuck", B12, B13, B15 | Builders are pointed to `docs/v2/apis-and-accounts.md` and `docs/tech/` and told not to write API paths from memory, but neither is on `main` (`docs/tech/` holds only a placeholder in the working tree) | The planning session lands both before B12 T4, B13 T1 and B15 T1 start |
| 24 | minor | D-sponsors T6 | Nothing checks, at the freeze, which tracks actually met their hard requirement | T6 adds one line per track to `sponsors/README.md`: met or not, from the final what's-real list, so Gordon selects only those on Devpost |

## What Gordon must do himself

**Now, Saturday afternoon**
- Set the cloud environment to Full network access (or the allowlist in contracts section 1). The SpacetimeDB, Hugging Face and PyTorch installs need it.
- Put the keys in as cloud environment variables, and in `.env` on the laptop: `CINDIA_ANTHROPIC_API_KEY` (redeem the $50 hacker credits into the right Console org first), `NESSIE_KEY`, `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `APIFY_TOKEN`, `HF_TOKEN`. Never paste them into a chat.
- Elastic: create a Serverless project, turn on Agent Builder in it and check its model connector works, and make an API key that can write the index and the agent.
- Apify: sign up with coupon `APIFY_CAL_HACKS` for $200 in credits.
- Hugging Face: a write token, so B11 can publish the model the laptop downloads.
- Figma: verify Education, pick moodboard direction A, B or C, and set "Anyone with the link" on both FigJam boards (the design lead can't).
- SpacetimeDB: decide between a local server on the laptop and Maincloud (`spacetime login` in a browser). The SpacetimeDB workshop is at 4:00 PM in the Theater.
- Talk to one Gu embroidery maker or seller and get a quote you may use (finding 8).

**Saturday night**
- Create the Devpost entry from the 8:00 PM skeleton, as the Hacker Guide recommends.
- Prepare the laptop for live mode (finding 1): venv and packages, the model, SpacetimeDB, `.env`, then `/api/health` reading all true. Reserve an ethernet cable in the app and bring a USB-C ethernet adapter. Hotspots are banned.
- Register the domain through MLH's GoDaddy Registry offer.
- Rewrite the pitch's closing lines for v2's tracks (finding 21).
- Check Meta's Round 2 rules, since advancing is subject to eligibility checks.

**Sunday, 6:00 to 9:00 AM**
- Be checked in at the venue by 8:00 AM.
- Record the video in live mode, opening on the catch, under 3 minutes, uploaded unlisted, with a local copy. Record the Figma workflow video too.
- Deploy the frozen build and point the domain at it (finding 16).
- Finish the Devpost: his own sections, the project image, the video link, the repo link, the hosted demo link, and only the tracks whose hard requirement is met (finding 24). Check how Figma wants its video, stage log and Slides link submitted. Make the repo public.
- Submit by 8:50 AM. The deadline at 9:00 is hard.

**Judging, 10:30 AM to 12:30 PM**
- Stay at the table the whole window. As a solo team, leaving means not being judged.
- Rehearse three paths: the full tour, start at the catch (Hyphenate), and the judge's own file plus "why did you flag this?" in Ask Cindy (Hyphenate's "a scenario of our own"). Keep the scripted mode ready for when the Wi-Fi drops.

## Order to apply the fixes

By prize at stake and effort, cheapest first within each step:
1. Gordon's keys, network and Education verification. They unblock findings 1 to 6 at once.
2. The writing fixes for the scribe: findings 7, 14, 17, 18, 19, 24. Small.
3. The timeline fixes in I2-tour T1: findings 10 and 12. Small.
4. The ordering fix: finding 11. No code.
5. The backend and contract fixes: findings 3, 5, 6, 9. Medium each.
6. The larger features: findings 4 and 13. Do presence and process status first for finding 4.
7. The freeze steps: findings 1 (on the laptop), 15, 16.

## Scorecard

| Track | Hard requirement met | Strength | The single most valuable fix |
|---|---|---|---|
| Anthropic, Claude for Public Benefit | yes | ok | Write the "where it could go wrong" table and the impact measurement plan into `sponsors/anthropic/` and the pitch, and lead with the Gu studio (finding 7) |
| Hyphenate, Autonomous Systems for Finance | yes | strong | Open the reconcile and approvals process views during `d07-month` and `d09-approve` (finding 12) |
| Visa, Reimagining Shopping | yes | ok | In live mode let the Finder agent write the chips and filters, or say "rule-based" everywhere (finding 9) |
| Microsoft, Built for the Real World | yes | ok | Write the "path from prototype to production" page (finding 14) |
| Capital One, Best Use of Nessie | partly | weak | Get `NESSIE_KEY` in and have the matcher read the bank side back from Nessie (finding 5) |
| Meta, Bringing People Closer Together with AI | yes | ok | Close the "I'll ask the maker" loop across Chinese and English (finding 13) |
| Elastic, Agent Builder on a Serverless instance | partly | weak | Give `cindia-finder` a visible, code-routed job in a recorded flow (finding 3) |
| SpacetimeDB | partly | weak | Put the approval queue, the process status and presence on SpacetimeDB (finding 4) |
| Apify | partly | ok | Show every result Apify returned, and stop gating the scan on B11 (finding 6) |
| Figma, Best Figma Workflow Hack | partly | weak | Gordon verifies Education now, then one plan owns the Slides deck, sharing and the video (finding 2) |
| MLH, Best Domain Name from GoDaddy Registry | partly | weak | Host the scripted build and point the domain at `/demo` (finding 16) |
| Cal Hacks judging and Best Solo Hack | partly | strong | A demo-laptop setup task done Saturday night, with the scripted fallback rehearsed (finding 1) |
