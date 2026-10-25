# Anthropic · Claude for Public Benefit

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md). Every maker, community and story named here is fictional.

**Met or not:** met. The community is named, the product works (the swarm is green with a G5 of 7 of 7 on the tour), and the impact plan is below. One line is Gordon's to write: who he talked to.

## What its judges look for

The prize is "[Anthropic] Claude for Public Benefit", and it is on the Devpost prizes page ([Cal Hacks 13.0 on Devpost](https://cal-hacks-13-0.devpost.com), checked live by Gordon at 11:45 PM on Oct 24). The criteria come from the hacker guide row and Anthropic's Slack post, copied in [`docs/reference/sponsors/ch13-sponsor-anthropic.md`](../../docs/reference/sponsors/ch13-sponsor-anthropic.md).

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

**What works on Monday.** One thing, done well: the co-op drops its gallery statement into the scenario panel and gets the matches and the short payment. It is a CSV with the columns `date,orderId,pieceId,saleCents,commissionBps,netCents`. It runs on the server with no key (B05, G5 13 of 13, tag `demo-ok-b05`). It checks the statement against the demo month's orders and contract. Loading a co-op's own orders is not built. The second thing a person can do on Monday is ask the help drawer a question about an order or a piece, and the swarm answers from the records (B14, below).

**Thoughtful use of Claude.** Claude is the swarm's reasoning, and code does everything that must be exact.
- 21 agent roles, each with one narrow job, its own typed input and output, and only the tools that job needs. Fifteen run on Claude: `claude-haiku-5-5` for Cindy, Intake, Finder, Clerk, Tagger and Claims, and `claude-sonnet-5-5` for Curator, Steward, Writer, Lister, Describer, Checker, Explainer, Reporter and Designer. The server self-test ([`scripts/server_selftest.py`](../../scripts/server_selftest.py), part of `npm run test:server`) fails on any other model ID, and `test_every_claude_agent_uses_one_of_the_two_models` checks the roster.
- Six roles are plain code, labeled "rule-based" in the swarm view: Indexer, Matcher, Bookkeeper, Scorer, Scout and Comparer. They exist so that matching, the books, scoring, crawling and comparing never depend on a model's guess.
- Cindy routes and merges and has no facts of her own. The Steward answers only from the community's page, the verification record and the piece's own story. Code fills every amount, date and quote. A person approves anything that moves money or publishes anything.
- Claude also writes the training queries for our own embedding model, about the fictional catalog (Haiku, with one Sonnet retry), with an eval-leak guard that dropped 40 generated queries matching a held-out test query ([`server/b11_embed/pairs.py`](../../server/b11_embed/pairs.py), [`report.json`](../../server/b11_embed/report.json)).
- The full roster, with why each agent exists, is in the [README](../../README.md#the-backend). Status: the swarm is **green** ([`B14-swarm`](../../docs/plans/B14-swarm.md), G5 7 of 7 on the tour, tag `demo-ok-b14`). Live timings from the G5: the d04 answer has a median of 5.87 s with the co-op's record quoted, a listing draft takes 6.6 s and a storefront draft 3.3 s. In v1, Claude also explains the catch (B02), answers the manager's questions (B07) and finds gifts (B09).

## Where it could go wrong

Each guard links to the file, and each test is a pytest in `tests/server/` that exists. The B14 and B15 tests run against faked Claude and Apify calls, so they prove the guard, not a live answer.

| Risk | Who it hurts | The guard | The test that proves the guard |
|---|---|---|---|
| The Steward invents what a piece or a pattern means | The community, whose culture gets spoken for | The Steward picks one numbered source sentence, and code inserts that exact sentence with its source named. If no sentence answers, the reply is "Our records don't say, and I won't guess, so I'll ask Grace N." and the question goes to the maker. A content check blocks meaning words in every output. [`steward.py`](../../server/b14_swarm/agents/steward.py), [`content.py`](../../server/b14_swarm/content.py) | In [`test_b14_swarm.py`](../../tests/server/test_b14_swarm.py): `test_steward_sentence_outside_the_list_is_unknown`, `test_steward_quote_equals_the_record_sentence_exactly`, `test_steward_answer_to_a_meaning_question_is_unknown`, `test_a_meaning_question_goes_to_the_maker`, `test_content_check_finds_each_kind`. The catalog's own words are scanned by the rules in [`tests/data/v2-catalog-rules.ts`](../../tests/data/v2-catalog-rules.ts) |
| The Writer invents an amount or a date | The buyer, who plans on it | The Writer writes placeholders and code fills every number and date from the records. Arrival dates come from `arrival_window`, a code tool, so no model does date arithmetic. For v1, B02 rejects a model answer whose amount or record ID differs from the request ([`b02_explain.py`](../../server/routers/b02_explain.py)). [`writer.py`](../../server/b14_swarm/agents/writer.py), [`clerk.py`](../../server/b14_swarm/agents/clerk.py) | `test_a_typed_amount_is_rejected_twice_then_the_template_answers`, `test_the_clerk_gives_dates_only_through_arrival_window_placeholders`, `test_arrival_dates_for_pc_01_match_a_hand_calculation`. For v1: `test_wrong_delta_is_invalid_model_output` and `test_wrong_record_is_invalid_model_output` in [`test_b02_explain.py`](../../tests/server/test_b02_explain.py) |
| The watch wrongly accuses a seller | A real seller, and the co-op's name | A listing counts as a possible copy only with evidence about this maker: it names the co-op or a maker, repeats an 8-word run of a piece's story, or claims a Cindia verification it lacks. A bare claim is listed as something the watch can't judge, with no report button. The report is a template with no accusing words, naming no seller, and nothing is sent. The watch crawls only our fictional sandbox market. [`evidence.py`](../../server/b15_watch/evidence.py), [`reporter.py`](../../server/b15_watch/reporter.py) | In [`test_b15_watch.py`](../../tests/server/test_b15_watch.py): `test_a_bare_craft_claim_is_never_evidence`, `test_evidence_names_the_coop_or_a_maker`, `test_evidence_story_run_needs_eight_words`, `test_inspired_and_claim_only_by_rule`, `test_an_accusing_word_in_the_listing_falls_back`, `test_draft_names_the_piece_and_text_match_and_only_its_own_url`. The live Apify crawl was blocked by a 403 at the freeze, so these run on the fixture |
| Prompt injection in a found listing | The manager, who might approve a bad report | Found text is cut short and passed to a model only inside a delimited block that the system prompt calls untrusted. A claimed quote must appear word for word in the result, or it counts as no claim. The report is a template and a person decides. [`claims.py`](../../server/b15_watch/claims.py) | `test_prompt_holds_the_listing_only_in_the_data_block`, `test_a_closing_tag_in_the_listing_cant_end_the_block`, `test_a_quote_not_in_the_listing_means_no_claim` and `test_a_model_quote_not_in_the_listing_is_dropped` in `test_b15_watch.py`. B14 has `test_the_data_block_keeps_the_persons_words_inside_it` |
| An agent moves money, publishes or reports by itself | The makers and the co-op | Cindy proposes and the seal decides. B08 lets only the decision route settle an approval, and a second decision returns the first. No swarm run may emit an approval, a payout or a money move ([`B14-swarm`](../../docs/plans/B14-swarm.md)) | [`test_b08_approvals.py`](../../tests/server/test_b08_approvals.py): `test_only_the_decision_route_decides` and `test_second_decision_returns_the_first`. In `test_b14_swarm.py`: `test_the_safety_sweep_finds_no_forbidden_event_in_any_run`, `test_a_complaint_ends_with_a_person_and_moves_no_money` and `test_a_forbidden_tool_call_raises` |
| Cindia speaks for a community | The community, whose voice it isn't | Community pages are labeled placeholders ("Placeholder written by the Cindia team. In a real launch, the community writes this page."). What the demo keeps out is labeled as the Cindia team's choice and not the nation's rule. Verification is labeled demo verification with no real check. Labels L3, L4, L8, L9 and L30 are in the [glossary](../../docs/common/glossary.md). There is no machine translation into Native languages. The Checker fails a draft that names another community's craft ([`checker.py`](../../server/b14_swarm/agents/checker.py)) | `test_navajo_style_and_yei_turn_the_protocol_check_not_ok`, `test_another_communitys_craft_fails_the_protocol_check_with_l26` and `test_a_tagline_with_a_stereotype_word_is_rejected` in `test_b14_swarm.py`. The label specs are in [`tests/features/`](../../tests/features/) for [`F-communities`](../../docs/plans/F-communities.md), and the data tests are in [`tests/data/`](../../tests/data/) |
| A buyer reads another buyer's order | The other buyer | Buyer-side requests carry only the orders on screen, and the server drops the rest. The Clerk answers only for those orders, never returns a person's name, and says "I can only look up the order on your screen." for any other ID | `test_a_buyer_asking_about_another_order_gets_l17_and_no_trace_of_it`, `test_order_lookup_on_the_buyer_side_answers_only_the_order_on_screen` and `test_a_buyer_requests_extra_records_are_dropped_before_any_agent` in `test_b14_swarm.py` |
| Live questions leave the platform for Claude | The buyer who typed them | Scripted mode makes no request beyond localhost. Live mode is a switch, and the public site has none. Under the live input the screen says "Live: your question goes to Claude (Anthropic) to answer. Please don't type personal details." ([`strings.ts`](../../src/features/support/strings.ts), [`F-support`](../../docs/plans/F-support.md)). Only `server/` calls Claude, and keys never reach the browser | [`tests/offline/offline.spec.ts`](../../tests/offline/offline.spec.ts) plays the tour with every request beyond localhost blocked (G4v2 offline run passed). The label is covered by [`tests/features/support-ask.spec.ts`](../../tests/features/support-ask.spec.ts) |

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
- [`server/b14_swarm/`](../../server/b14_swarm/): the agents (`agents/`), the roster, the content check and the run. Router: [`server/routers/b14_swarm.py`](../../server/routers/b14_swarm.py). Plan: [`docs/plans/B14-swarm.md`](../../docs/plans/B14-swarm.md).
- [`server/b15_watch/`](../../server/b15_watch/): the copy watch's checks (`evidence.py`, `claims.py`, `reporter.py`). Built, with its live crawl blocked by an Apify 403 at the freeze.
- [`server/b11_embed/pairs.py`](../../server/b11_embed/pairs.py): Claude writes the training queries, with the eval-leak guard. [`docs/plans/B11-embed.md`](../../docs/plans/B11-embed.md).
- [`server/routers/b02_explain.py`](../../server/routers/b02_explain.py): Claude explains the catch, with server checks on every ID and amount. Built, its live calls passed, no G5 pass.
- [`server/routers/b07_ask.py`](../../server/routers/b07_ask.py): Claude answers the manager's questions with tools and a chart. Built, its live calls passed, no G5 pass.
- [`server/routers/b09_concierge.py`](../../server/routers/b09_concierge.py): v1's gift finder (green, `demo-ok-b09`). The tour no longer uses it.
- The build harness: [`CLAUDE.md`](../../CLAUDE.md), [`.claude/`](../../.claude/) and [`docs/harness/`](../../docs/harness/). A team of Claude Code agents wrote the code, each inside its own paths, behind gates.

## How to run that part

- Scripted, no key: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo?mode=present. The public site plays the same tour at https://cindia.design/demo.
- The scenario panel (no key): start the API with `npm run server`, switch on Live, and open the Month view in the Sell side. Drop a CSV into the panel.
- Claude features: set `CINDIA_ANTHROPIC_API_KEY` in the environment (or `ANTHROPIC_API_KEY` in `.env` on a Windows machine), restart `npm run server`, and check that `GET /api/health` shows `anthropic` as true. `npm run test:server` runs the backend tests, and the live ones skip when the key is missing.
- Nothing prints or returns a key.

## The moment in the tour

Beat IDs and times are from [`docs/common/demo-script.md`](../../docs/common/demo-script.md). The tour is always scripted.
- `d04-support`, 86 to 104 s: a buyer asks whether the maker wove the piece herself. The swarm view lights up agent by agent, a guard checks the answer, and the reply names whose record it is.
- `p02-why`, 20 to 40 s: the problem and the community, on a pitch card.
- `d15-listing`, 120 to 130 s: the Checker runs three checks on a listing draft. In the scripted run, one fails on purpose, and its note says it is a planted test ([`S3-catalog`](../../docs/plans/S3-catalog.md)).
- `d17-ask-maker`, 205 to 220 s (chapter 2): when the records can't answer what a pattern means, Cindy won't guess. She asks Grace N., and her answer comes back in her own words.

## What's live and what's simulated

- **Live, gated on the tour:** B14, the agent swarm (G5 7 of 7, `demo-ok-b14`), and B12, vibe search (`demo-ok-b12`).
- **Live, with a passed gate on v1's timeline:** B05 (the scenario panel, no key), B09 (the gift finder) and B01, B03, B06, B08 and B10.
- **Built, live calls passed, no G5 pass:** B02 (the catch explained), B07 (Ask Cindy) and B11 (our own embedding model, trained and published).
- **Built, partly live:** B15, the copy watch. Its claims check (Haiku) and Reporter (Sonnet) are live. The live Apify crawl got a 403, so the watch plays scripted and B15's G5 failed.
- **Simulated by design:** the people, the communities and the stories, the tour, and the maker's answer in `d17-ask-maker`. The impact view's numbers are computed from the demo data, and its "before" figures and hours saved are labeled estimates. The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
