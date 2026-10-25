# Anthropic · Claude for Public Benefit

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. Where something is not built yet, this page says **planned** and links its plan.

## What its judges look for

The prize is "[Anthropic] Claude for Public Benefit", and it is on the Devpost prizes page now ([Cal Hacks 13.0 on Devpost](https://cal-hacks-13-0.devpost.com), checked live by Gordon at 11:45 PM on Oct 24). The criteria come from the hacker guide row and Anthropic's Slack post, copied in [`docs/reference/sponsors/ch13-sponsor-anthropic.md`](../../docs/reference/sponsors/ch13-sponsor-anthropic.md).

- **A named community.** "Students" is too broad. Anthropic's post says "The narrower, the better."
- **A real problem.** You have lived it, or you talked to someone who has.
- **It works.** One thing done well and usable on Monday beats a broad demo. The Slack post adds that they want a fully working product, and a clear plan to measure its impact on the community.
- **Thoughtful use of Claude.** Claude does something that matters to the solution, and you know where it could go wrong for the people using it.

## What Cindia does for this track

**The named community.** The Diné Weaving and Silver Co-op, a fictional co-op of Diné (Navajo) makers on the Navajo Nation in Arizona. Its manager is Ruth B. and its makers are Grace N., Lena T. and Mae K. They make wool weavings and silver and turquoise jewelry. Three more fictional Native American communities sit beside it in the catalog: an Ojibwe beadwork co-op, an Acoma pottery studio and a Seminole patchwork co-op. We haven't worked with these communities yet, and a real launch starts with them.

Cindia is a platform for underrepresented makers, starting with Native American makers. Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Cindia does the selling, the marketing and the books for them, and it's fair by design: the price split is shown, search ranks by fit and not by ads, and Surprise me leans toward makers who sold less.

**The problem, with sources** (from [`docs/v2/brief.md`](../../docs/v2/brief.md), which links each one):
- Fixed broadband at the FCC's 100/20 Mbps benchmark hadn't been deployed to more than 23% of people living on Tribal lands, the FCC reported in March 2024 ([FCC](https://docs.fcc.gov/public/attachments/DOC-401205A1.pdf)).
- In 2023, 12.2% of American Indian or Alaska Native households had no bank account, against 4.2% of all US households ([FDIC 2023 survey](https://fdic.gov/household-survey/2023-fdic-national-survey-unbanked-and-underbanked-households-executive-summary)).
- In August 2026 a San Francisco seller admitted selling over $92,000 of counterfeit Native American jewelry through an eBay store, imported from Asia ([Indian Arts and Crafts Board](https://www.doi.gov/iacb/san-francisco-woman-convicted-selling-counterfeit-native-american-jewelry)).

[GORDON: who you talked to about this problem, and what they said. The criterion is "you have lived it, or you talked to someone who has." Who are they, and what did they tell you in their own words? The Anthropic mentors asked "if we don't help them, who will?"]

**What works on Monday.** One thing, done well: the co-op drops its gallery statement into the scenario panel and gets the matches and the short payment. It is a CSV with the columns `date,orderId,pieceId,saleCents,commissionBps,netCents`. It runs on the server with no key (B05, G5 13 of 13, tag `demo-ok-b05`). It checks the statement against the demo month's orders and contract. Loading a co-op's own orders is not built.

**Thoughtful use of Claude.** Claude is the swarm's reasoning, and code does everything that must be exact.
- 21 agent roles, each with one narrow job, its own typed input and output, and only the tools that job needs. Fifteen run on Claude: `claude-haiku-5-5` for Cindy, Intake, Finder, Clerk, Tagger and Claims, and `claude-sonnet-5-5` for Curator, Steward, Writer, Lister, Describer, Checker, Explainer, Reporter and Designer. The server self-test ([`scripts/server_selftest.py`](../../scripts/server_selftest.py), part of `npm run test:server`) fails on any other model ID. That test is built.
- Six roles are plain code, labeled "rule-based" in the swarm view: Indexer, Matcher, Bookkeeper, Scorer, Scout and Comparer. They exist so that matching, the books, scoring, crawling and comparing never depend on a model's guess.
- Cindy routes and merges and has no facts of her own. The Steward answers only from the community's page, the verification record and the piece's own story. Code fills every amount, date and quote. A person approves anything that moves money or publishes anything.
- Claude also writes the training queries for our own embedding model, about the fictional catalog, with an eval-leak guard that keeps the test queries out of training.
- The full roster, with why each agent exists, is in the [README](../../README.md#the-backend). Status: the swarm is **planned** ([`B14-swarm`](../../docs/plans/B14-swarm.md)). In v1, Claude explains the catch (B02), answers the manager's questions (B07) and finds gifts (B09).

## Where it could go wrong

Each guard links to the file or test as the plans and code stand at 8:00 PM. "Planned" means the plan exists and the code doesn't.

| Risk | Who it hurts | The guard | The test that proves the guard |
|---|---|---|---|
| The Steward invents what a piece or a pattern means | The community, whose culture gets spoken for | The Steward picks one numbered source sentence, and code inserts that exact sentence with its source named. If no sentence answers, the reply is "Our records don't say, and I won't guess, so I'll ask Grace N." and the question goes to the maker. A content check blocks meaning words in every output. Planned: [`B14-swarm`](../../docs/plans/B14-swarm.md) | Planned, in `tests/server/test_b14_swarm.py` (task T5: an index outside the list becomes "unknown", and the quote equals the record's sentence. Task T6: "What does the pattern on this rug mean?" ends in the "I'll ask" reply). Also planned: the data scan in [`S3-catalog`](../../docs/plans/S3-catalog.md) |
| The Writer invents an amount or a date | The buyer, who plans on it | The Writer writes placeholders and code fills every number and date from the records. Arrival dates come from `arrival_window`, a code tool, so no model does date arithmetic. Planned: [`B14-swarm`](../../docs/plans/B14-swarm.md). Built today for v1: B02 rejects a model answer whose amount or record ID differs from the request, in [`b02_explain.py`](../../server/routers/b02_explain.py) | Planned, T6 ("a typed-in amount is rejected, then replaced") and T2 (arrival dates match a hand calculation). Built today: `test_wrong_delta_is_invalid_model_output` and `test_wrong_record_is_invalid_model_output` in [`test_b02_explain.py`](../../tests/server/test_b02_explain.py) |
| The watch wrongly accuses a seller | A real seller, and the co-op's name | A listing counts as a possible copy only with evidence about this maker: it names the co-op or a maker, repeats an 8-word run of a piece's story, or claims a Cindia verification it lacks. A bare claim is listed as something the watch can't judge, with no report button. The report is a template with no accusing words, naming no seller, and nothing is sent. The watch crawls only our fictional sandbox market. Planned: [`B15-watch`](../../docs/plans/B15-watch.md) | Planned, in `tests/server/test_b15_watch.py` (T3: "Authentic Native American made" with no maker is "claim only". T4: the draft holds none of the accusing words in either language) |
| Prompt injection in a found listing | The manager, who might approve a bad report | Found text is cut to 300 characters and passed to a model only inside a delimited block that the system prompt calls untrusted. A claimed quote must appear word for word in the result, or it counts as no claim. The report is a template and a person decides. Planned: [`B15-watch`](../../docs/plans/B15-watch.md) | Planned, T3 ("a quote not in the result means no claim") and T5 in `tests/server/test_b15_watch.py` |
| An agent moves money, publishes or reports by itself | The makers and the co-op | Cindy proposes and the seal decides. Built today: B08 lets only the decision route settle an approval, and a second decision returns the first. Planned: no swarm run may emit an approval, a payout or a money move ([`B14-swarm`](../../docs/plans/B14-swarm.md)) | Built today: `test_only_the_decision_route_decides` and `test_second_decision_returns_the_first` in [`test_b08_approvals.py`](../../tests/server/test_b08_approvals.py). Planned: the sweep test in T9 of `test_b14_swarm.py` |
| Cindia speaks for a community | The community, whose voice it isn't | Community pages are labeled placeholders ("Placeholder written by the Cindia team. In a real launch, the community writes this page."). What the demo keeps out is labeled as the Cindia team's choice and not the nation's rule. Verification is labeled demo verification with no real check. Labels L3, L4, L8, L9 and L30 are in the [glossary](../../docs/common/glossary.md). There is no machine translation into Native languages. Planned: [`F-communities`](../../docs/plans/F-communities.md) | Planned: the label checks in F-communities' acceptance, and the data scan for nation names used as product words ([`S3-catalog`](../../docs/plans/S3-catalog.md)) |
| A buyer reads another buyer's order | The other buyer | Buyer-side requests carry only the orders on screen, and the server drops the rest. The Clerk answers only for those orders, never returns a person's name, and says "I can only look up the order on your screen." for any other ID. Planned: [`B14-swarm`](../../docs/plans/B14-swarm.md) | Planned, T2 in `test_b14_swarm.py` (a buyer asking about `ord_002` with only `ord_001` in context gets that reply and no `ord_002` data) |
| Live questions leave the platform for Claude | The buyer who typed them | Scripted mode makes no request beyond localhost. Live mode is a switch, and the public site has none. Under the live input the screen says "Live: your question goes to Claude (Anthropic) to answer. Please don't type personal details." Only `server/` calls Claude, and keys never reach the browser. Built today: the offline rule. Planned: the live label ([`F-support`](../../docs/plans/F-support.md)) | Built today: [`tests/offline/offline.spec.ts`](../../tests/offline/offline.spec.ts) plays the demo with every request beyond localhost blocked. Planned: the label check in F-support's acceptance |

## Impact measurement plan

The impact view already shows three numbers for the co-op's September ([`src/mock/impact.ts`](../../src/mock/impact.ts)). A one-co-op pilot would measure each one before and after, with the co-op's own records, and report them to the co-op first.

| Number | What it is | How the pilot measures it |
|---|---|---|
| The maker's share | The share of each Cindia sale that reaches the maker, from the shown price split. In the demo, Grace N. gets $134.48 of a $180 weaving | Before: what each maker took home per sale on her old channels, from the co-op's own records. After: the share on every pilot sale, read off the split the buyer saw. Report the average and the spread by maker |
| Days from close to payout | How long makers wait after the month closes. The demo computes 2 days, from a Sep 30 close to an Oct 2 payout | Before: the days between each month's close and each maker's pay in the co-op's old records. After: the same gap for each pilot month, read from the ledger. Report both gaps for every maker |
| Bookkeeping hours saved | The manager's time back each month. **An estimate**, labeled one on screen, because nobody has measured it yet | Before: the manager logs her hours on the books for a few months. After: she logs them each pilot month. The number stays labeled an estimate until the logs exist, and the makers are asked too |

The demo's "before" figures are illustrative, and the data file says so. Nothing here claims a measured result.

## Where to look

- [`docs/v2/brief.md`](../../docs/v2/brief.md): what Cindia is, the problem with its sources, and the agent roster.
- [`server/routers/b02_explain.py`](../../server/routers/b02_explain.py): Claude explains the catch, with server checks on every ID and amount. Built, live check pending tonight.
- [`server/routers/b07_ask.py`](../../server/routers/b07_ask.py): Claude answers the manager's questions with tools and a chart. Built, live check pending tonight.
- [`server/routers/b09_concierge.py`](../../server/routers/b09_concierge.py): v1's gift finder. The v2 tour no longer uses it.
- `server/b14_swarm/` (the agents and their checks): **planned**, see [`docs/plans/B14-swarm.md`](../../docs/plans/B14-swarm.md).
- `server/b11_embed/pairs.py` (Claude writes the training queries, with the eval-leak guard): **planned**, see [`docs/plans/B11-embed.md`](../../docs/plans/B11-embed.md).
- The build harness: [`CLAUDE.md`](../../CLAUDE.md), [`.claude/`](../../.claude/) and [`docs/harness/`](../../docs/harness/). A team of Claude Code agents wrote the code, each inside its own paths, behind gates.

## How to run that part

- Scripted, no key: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo.
- The scenario panel (no key): start the API with `npm run server`, switch on Live, and open the Month view (`/studio/month` today). Drop a CSV into the panel.
- Claude features: set `CINDIA_ANTHROPIC_API_KEY` in the environment (or `ANTHROPIC_API_KEY` in `.env` on a Windows machine), restart `npm run server`, and check that `GET /api/health` shows `anthropic` as true. `npm run test:server` runs the backend tests, and the live ones skip when the key is missing.
- Nothing prints or returns a key.

## The moment in the tour

Planned (`I2-tour`). The tour times come from [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2.
- `d04-support`, 86 to 104 s: a buyer asks whether the maker wove the piece herself. The swarm view lights up agent by agent, a guard checks the answer, and the reply names whose record it is.
- `p02-why`, 20 to 40 s: the problem and the community, on a pitch card.
- `d15-listing`, 120 to 130 s: the Checker runs three checks on a listing draft, and one fails on purpose, labeled as a planted test.

## What's live and what's simulated

- **Live, with a passed gate:** B05 (the scenario panel, no key).
- **Built, live check pending tonight:** B02 (the catch explained), B07 (Ask Cindy) and B09 (the v1 gift finder). Until they pass, they play scripted with the Simulated badge.
- **Planned:** the swarm (B14), the embedding model (B11), search (B12) and the copy watch (B15). The impact view's numbers are computed from the demo data, and its "before" figures and hours saved are labeled estimates.
- **Simulated by design:** the people, the communities and the stories. The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
