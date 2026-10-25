# What's real and what's simulated

Final pass by the scribe (D-sponsors task T6), written at the freeze on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../harness/status.md) as it stood at 5:00 AM PT. Where a line below says what a status row says, the row is the source.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.

## The rule

- **Real** means the feature or upgrade ran against a live service or live server code, and the evidence is recorded in `status.md`. A gate pass is the strongest evidence. A live call that passed without a gate is called that, never "gated".
- **Simulated** means the screen plays scripted events from [`src/mock/`](../../src/mock/) and shows the Simulated badge.
- **Not built** is never counted as real. Nothing in the v2 plan list was cut. The items that didn't get built are under "Cut and simulated" and "Backend if time".
- The people, the communities, the pieces, the orders and the stories are fictional demo data in every mode.
- The guided tour (`/demo`) is always scripted, even when a source is live. Live evidence comes from the gates and from "try it yourself" after the tour (`docs/v2/fix-plan.md` section 1.2). A G5 run with a live tour proves the live source answers while the scripted tour still plays on time.

## Where the build stands

- **v1 is green** as `demo-ok-4` (7812071). It is the fallback if v2 fails.
- **v2 is built.** The re-skin to the fictional Diné Weaving and Silver Co-op (R0, `v2-reskin`), the core types, the desktop shell and kit, the 54-piece catalog, every v2 feature and migration, the public build and the 3-minute tour are green. The tour passed G4v2 5 of 5 (220.0 s three times, plus an offline run) and again on design drop 3 (`demo-ok-v2-d3`, 988d0c1).
- **Backend upgrades B11 to B16.** B12, B13 and B14 are green with a G5 of 7 of 7 on the tour. B15 is built, and its Claude steps (the claims check on Haiku and the Reporter on Sonnet) are live. Its G5 failed at the freeze because Apify answers status 403 to the live crawl, which status.md calls an Apify account or token problem and not code. So the watch plays scripted and B15 is not gated. B11 is built, trained, scored and published, and B16 is built with its live specs passing, both live-tested. Neither B11 nor B16 had a G5 before the freeze.
- **The public site is live** at https://cindia.design (also https://cindia-cfn.pages.dev). It is the scripted public build. The tour is at https://cindia.design/demo. A final upload follows the freeze.
- **G6** runs right after this pass. Its result goes in `status.md`.

## Gates passed

From the Gates table in `status.md`. Times are Pacific. Oct 24 unless a date is given.

| Gate | Result | When | Evidence in `status.md` | Tag |
|---|---|---|---|---|
| G0 | PASS | 2:01 AM | 0 blockers, 1 warning (no `.env` then) | none |
| G1 | PASS | 2:33 AM | 5 of 5, verifier PASS | `g1-scaffold` |
| G2 | PASS | 2:58 AM | 2 of 2, verifier PASS | `g2-data` |
| G3 (W1) | PASS | 3:27 AM | wave gate, 9 of 9 P0 features green | `w1` |
| G4 | PASS | 4:15 AM | 5 of 5, 60-second runs, verifier PASS | `demo-ok-1` |
| G4 polish | PASS | 6:12 AM and 6:22 AM | verifier rounds 3 and 4 PASS | `demo-ok-2` (934fff4), `demo-ok-3` (43e7a4b) |
| G5, B01 | PASS | 4:43 AM | 13 of 13, live at 20.5 s, no fallback | `demo-ok-b01` |
| G5, regression with all ten routers | PASS | 7:00 AM | 13 of 13, 60-second runs | `demo-ok-4` (7812071) |
| R0 | PASS | 6:46 PM | 11 of 11 checks, 3 verifiers PASS | `v2-reskin` (2b0823e) |
| core | PASS | 7:58 PM | 4 of 4 checks, 3 verifiers PASS | `v2-core` (b5f9b24) |
| G5, B09 (worktree) | PASS | 8:23 PM | 13 of 13, verifier PASS | `demo-ok-b09` (e8423db) |
| G2b | PASS | 9:37 PM | 3 of 3 checks, verifier PASS | `v2-data` (84f0e9f) |
| G1b | PASS | 10:05 PM | worktree rerun: check, build, smoke 123, demo 60.006 s, offline. Verifier recheck PASS after the 14 px fix | `v2-shell` (310e917) |
| G3, one per v2 feature | PASS | 10:05 PM to 1:00 AM | each 3 of 3 with a verifier. The next table lists them | `v2-<slug>` |
| I2-art | PASS | 10:58 PM | verifier PASS, art check 54 valid | `v2-art` (67be93b) |
| D-deploy | PASS | 11:25 PM | public build checks 17, market tests 13, laptop dry-run 9 steps, secrets scan 0 findings, two verifiers PASS | `v2-deploy` (4dd9243) |
| G4v2 | PASS | Oct 25, 2:52 AM | 5 of 5: tour 220.0 s within 235 s three times, offline. Recheck PASS | `demo-ok-v2` (c4c8352) |
| G4v2, design drop 3 | PASS | Oct 25, 4:25 AM | 5 of 5: tour 220.0 s three times, offline. The screen review's readable lens failed on one item (the Model card's score table runs 24 px past its card on d13). Both skeptics found it real and not blocking | `demo-ok-v2-d3` (988d0c1) |
| G5, B12 (worktree) | PASS | Oct 25, 4:20 AM | 7 of 7: test:server 872, B12 pytest 52 plus the live test, the search-live spec, build, live tour 220.0 s, offline | `demo-ok-b12` (988d0c1) |
| G5, B14 (worktree) | PASS | Oct 25, 4:33 AM | 7 of 7: test:server 872, B14 pytest 134 plus 2 live, the support-live spec, build, live tour 220.0 s, offline | `demo-ok-b14` (988d0c1) |
| G5, B13 (main tree) | PASS | Oct 25, 4:45 AM | 7 of 7: test:server 874, B13 pytest 60 plus 2 live, the process-live-data spec, build, live tour 220.0 s, offline | `demo-ok-b13` (988d0c1) |
| G5, B04 (worktree, keyed) | FAIL 11 of 13 | Oct 25, 12:45 AM | Live pytest 2 passed, scripted demo 3 of 3, offline, live-mode runs 1 and 2 passed. Run 3 failed two v1 harness timing checks. B04's own live calls held. No rerun on the tour fit before the freeze | none |
| G5, B15 (worktree, then main tree) | FAIL | Oct 25, 5:02 AM | The worktree had no Apify credential. In the main tree test:server and the live pytest fail on `test_live_crawl_of_the_sandbox_market` with Apify status 403, and the watch-live spec stays scripted. Stopped at the freeze. Status.md says check that the Apify token may run `apify~cheerio-scraper` and that the plan allows run-sync | none |
| G5, B11 and B16 | not run | | Their G5 runs didn't fit before the freeze. Both are built and live-tested | none |
| G6 | runs right after this pass | | | |

The G3 passes, each with a verifier, in the order they landed: support (`v2-support`, d7c780d), search (`v2-search`, 7891b23), communities (`v2-communities`, 633cc5c), buyer (`v2-buyer`, a87ab88), seller-hub (`v2-seller-hub`, f97a7ab), watch (`v2-watch`, fd0ce47), storefront (`v2-storefront`, 13c87c4), maker-statement (`v2-maker-statement`, cd13c21), process (`v2-process`, 123e1c6, after fix round 1) and approvals (`v2-approvals`, 5c39089, after fix round 1). M-desktop's G3 passed 3 of 3 in a worktree and carries `v2-desktop` (c4c8352).

## Tags and their commits

From the Tags table in `status.md`. The cloud session keeps tags local, and Gordon pushes them from Windows. The older v1 tags (`g1-scaffold`, `g2-data`, `w1-<slug>`, `w2-<slug>`, `demo-ok-1`, `demo-ok-b01`, `demo-ok-b03`) have no SHA row in that table, so they appear by name only.

| Tag | Commit SHA | Gate |
|---|---|---|
| `demo-ok-2` | 934fff4f849b247ddc621fc559c32285f7c3433d | G4 (v1 polish) |
| `demo-ok-3` | 43e7a4b21342fb616a6ebb42304a672f74b2e4f4 | G4 (v1 polish) |
| `demo-ok-4` | 781207120f7614209b8bd5004784d2b8e4091065 | G5 b10 regression (v1) |
| `demo-ok-b05` | 70a60ec384c76b66ae228a2cfbb0a71f87d823f9 | G5 B05 (v1) |
| `demo-ok-b06` | ab7634d5f30ad74b62de909d7aaed30b6bf5fc91 | G5 B06 (v1) |
| `demo-ok-b08` | 617ffb00c2b01a30685eb5b076c600d1f0a27970 | G5 B08 (v1) |
| `demo-ok-b10` | fc2576af406e02a2c1d35033b3248e5a8fbb078d | G5 B10 (v1) |
| `v2-reskin` | 2b0823ede8b197784bb4e52a9deed9c956d9cd55 | R0 |
| `v2-core` | b5f9b24f1c78ba38074680fea245e8911c23c485 | core |
| `demo-ok-b09` | e8423db82e25182b94b4e128be7ea6cbe1a90495 | G5 b09 |
| `v2-data` | 84f0e9fd94a5f5d9f21d29e29b1cdbb36d4671e5 | G2b |
| `v2-shell` | 310e917c09523cbae65449f39adde7098ce03f39 | G1b |
| `v2-support` | d7c780d6ddd8b793cc24b6c7fe03cf507d70d112 | G3 support |
| `v2-search` | 7891b23c5cbb43e429ed6f3aee65b3e95bd52880 | G3 search |
| `v2-communities` | 633cc5cfc3c5b68eb109e420f6175eafebab2308 | G3 communities |
| `v2-art` | 67be93b5d9325639081cbbbddaae99547dd3f12e | I2-art |
| `v2-buyer` | a87ab88eed9fd6276ddfbd5b27fc8dc43d92bb57 | G3 buyer |
| `v2-deploy` | 4dd9243b439e8a7007444fbd0b754edde86d59c8 | D-deploy |
| `v2-seller-hub` | f97a7ab66e3ec439ebe38a039b2a6f5871ea8ed0 | G3 seller-hub |
| `v2-watch` | fd0ce474bb352e8243615d62b5860ef3e7e10e90 | G3 watch |
| `v2-storefront` | 13c87c41d88c7c878416ee33c7e86a4b8005becf | G3 storefront |
| `v2-maker-statement` | cd13c2191ff5c2cd476a9de67b3d33164d5e9d0b | G3 maker-statement |
| `v2-process` | 123e1c6ccaa681223a26e66739d2b68fb7d7276f | G3 process |
| `v2-approvals` | 5c39089ec351815fbdd31344045007e9327dba72 | G3 approvals |
| `demo-ok-v2` | c4c83526e6bb18825ea008e47984537f784b01aa | G4v2 (the tour) |
| `v2-desktop` | c4c83526e6bb18825ea008e47984537f784b01aa | G3 desktop (worktree) |
| `demo-ok-v2-d3` | 988d0c160260920a457fd69142e1d76702a6b14d | G4v2 on design drop 3 |
| `demo-ok-b12` | 988d0c160260920a457fd69142e1d76702a6b14d | G5 b12-search (worktree, on the tour) |
| `demo-ok-b14` | 988d0c160260920a457fd69142e1d76702a6b14d | G5 b14-swarm (worktree, on the tour) |
| `demo-ok-b13` | 988d0c160260920a457fd69142e1d76702a6b14d | G5 b13-live (main tree, on the tour, only docs commits after 988d0c1) |

## v1 upgrades, B01 to B10

The server routers are in [`server/routers/`](../../server/routers/) and the browser adapters are in [`src/sources/live/`](../../src/sources/live/). These passed G5 on v1's timeline when the tag is listed. The tour replaced v1's timeline at G4v2.

| Upgrade | What it does | State at the freeze | Gate and tag | Key or service |
|---|---|---|---|---|
| B01-match | Matches payouts to orders and finds the short payment | Live. G5 13 of 13, live at 20.5 s, no fallback | `demo-ok-b01` | none |
| B02-explain | Claude explains the catch and drafts the follow-up | Built. Its live calls passed, v1's timing harness did not under load. No G5 pass, no tag | none | `CINDIA_ANTHROPIC_API_KEY` |
| B03-proof | Scores the planted errors | Live. G5 13 of 13, live at 59.0 s, verifier PASS | `demo-ok-b03` | none |
| B04-bank | Posts the sale and the maker payouts to a Nessie account | Built. Live sale and payouts on Nessie (sandbox). G5 12 of 13 in the cloud, then 11 of 13 in the worktree. Both misses were v1 harness timing, and B04's own live calls held. No tag | none | `NESSIE_KEY` |
| B05-scenario | Judges a statement the visitor drops in | Live. G5 13 of 13, proved with the flow tests and the live browser spec, verifier PASS | `demo-ok-b05` (70a60ec) | none |
| B06-workbook | Builds the month's books as an Excel file | Live. G5 13 of 13, live at 44.6 s, verifier PASS | `demo-ok-b06` (ab7634d) | none |
| B07-ask | Claude answers the manager's questions with a card or chart | Built. Its live calls passed, v1's timing harness did not under load. No G5 pass, no tag | none | `CINDIA_ANTHROPIC_API_KEY` |
| B08-approvals | Carries the manager's approve and decline to the console | Live, scripted grant allowed when no owner screen is connected. G5 13 of 13, verifier PASS | `demo-ok-b08` (617ffb0) | none |
| B09-concierge | v1's gift finder. The tour no longer uses it | Live. G5 13 of 13 on the cloud worktree, first live answer at 2.4 s, catalog limited to the co-op's twelve pieces | `demo-ok-b09` (e8423db) | `CINDIA_ANTHROPIC_API_KEY` |
| B10-derived | Splits, receipts, maker statements and impact numbers | Live. G5 13 of 13, live at 8.3 s, figures match to the cent | `demo-ok-b10` (fc2576a) | none |

Sending the follow-up stays simulated. `followup.sent` is never replaced by a live source (`docs/plans/B02-explain.md`).

Two rows of the v1 Upgrades table in `status.md` still read "built and committed, awaiting key" (B02 and B07). That text dates from before the cloud keys were set. The Cut and simulated section below is final at the freeze and is the one this list follows.

## v1 features, kept in v2

All twelve passed G3 at 3 of 3 with a verifier PASS, and after R0 they run on the Diné co-op's names with every v1 number unchanged. M-desktop moved them onto the desktop pages (`v2-desktop`, c4c8352).

| Feature | Folder | Gate tag | Fed live by | What plays live today |
|---|---|---|---|---|
| F-buyer | [`src/features/buyer/`](../../src/features/buyer/) | `w1-buyer`, then `v2-buyer` (a87ab88) | B10, B04 | Splits and receipts (B10, gated). The sale posting (B04) passed its live calls and has no G5 pass. B09's gift finder is not in the tour |
| F-money-map | [`src/features/money-map/`](../../src/features/money-map/) | `w1-money-map` | B04, B16 | B04's postings passed live calls, not gated. B16 adds live twins of the fund move (built, live specs pass, no G5) |
| F-reconcile | [`src/features/reconcile/`](../../src/features/reconcile/) | `w1-reconcile` | B01, B02, B16 | The matches and the catch (B01, gated). B02's explanation passed live calls, not gated. B16 re-checks the catch against Nessie (built, live specs pass, no G5) |
| F-approvals | [`src/features/approvals/`](../../src/features/approvals/) | `w1-approvals` | B02, B08 | The approve and decline path (B08, gated). Claude's follow-up draft (B02) passed live calls, not gated |
| F-maker-statement | [`src/features/maker-statement/`](../../src/features/maker-statement/) | `w1-maker-statement` | B10 | Live |
| F-close | [`src/features/close/`](../../src/features/close/) | `w1-close` | B06 | Live |
| F-proof | [`src/features/proof/`](../../src/features/proof/) | `w1-proof` | B03 | Live |
| F-ask-cindy | [`src/features/ask-cindy/`](../../src/features/ask-cindy/) | `w1-ask-cindy` | B07 | B07's live calls passed, not gated |
| F-impact | [`src/features/impact/`](../../src/features/impact/) | `w1-impact` | B10 | Live. Hours saved is an estimate and is labeled one |
| F-audit | [`src/features/audit/`](../../src/features/audit/) | `w2-audit` | B10 | Live |
| F-dashboard | [`src/features/dashboard/`](../../src/features/dashboard/) | `w2-dashboard` | B10 | Live |
| F-scenario | [`src/features/scenario/`](../../src/features/scenario/) | `w2-scenario` | B05 | Live |

## v2 features and migrations

All green. Every one passed G3 or its own gate. The "Live source" column says what feeds it.

| Plan | What it is | Gate and tag | Live source |
|---|---|---|---|
| R0-reskin | v1's studio becomes the Diné Weaving and Silver Co-op. Every number stays | R0 11 of 11 checks, `v2-reskin` (2b0823e) | none |
| I2-core | The v2 contracts, types, config and `npm run export:mock` | core 4 of 4, `v2-core` (b5f9b24) | none |
| I2-kit, I2-shell | The UI kit and the desktop shell with the Shop and Sell switch and the notice on every page | G1b, `v2-shell` (310e917) | none |
| S3-catalog | The 54-piece catalog, four communities, the 50 test queries, the scripted swarm runs | G2b 3 of 3, `v2-data` (84f0e9f) | none |
| I2-art | The illustrations for the 54 pieces. Seven are placeholders after Gordon's art check (pc_27, pc_32, pc_35, pc_37, pc_38, pc_39 and pc_48) | verifier PASS, `v2-art` (67be93b) | none |
| F-search | Vibe search, Surprise me, results with reasons | `v2-search` (7891b23) | B11, B12 |
| M-buyer | The Shop's piece page, split with the gallery comparison, checkout token, receipt with the promise and Grace N.'s note. The v1 phone flow is gone | `v2-buyer` (a87ab88) | B10, B04 |
| F-support | The help drawer answered by the swarm, with the guard shown | `v2-support` (d7c780d) | B14 |
| F-process | The process bar of 11 blocks and their views, the data view and presence | `v2-process` (123e1c6) | B11, B12, B13, B14, B15 |
| F-communities | Community pages, projects and works in progress | `v2-communities` (633cc5c) | none |
| M-approvals | Approvals on the desktop shell, with the seal | `v2-approvals` (5c39089) | B08 |
| M-desktop | The money map, month, close and the other finance views on the desktop shell. Its three live specs that B16 broke were fixed | `v2-desktop` (c4c8352) | B01 to B06, B10, B16 |
| F-seller-hub | The Sell side: listings from a maker's notes, with the agents' checks | `v2-seller-hub` (f97a7ab) | B14, B13 |
| F-watch | The counterfeit watch view | `v2-watch` (fd0ce47) | B15, but its live crawl is blocked by Apify's 403, so the watch plays scripted |
| F-storefront | The storefront preview and its block editor | `v2-storefront` (13c87c4) | B14 |
| M-maker-statement | The maker's page in English | `v2-maker-statement` (cd13c21) | B10 |
| D-deploy | The public build, the sandbox market and the demo-laptop script. Gordon uploaded the site | `v2-deploy` (4dd9243) | none |
| I2-tour | The 3-minute tour: 20 beats, 220 seconds | G4v2 5 of 5, `demo-ok-v2` (c4c8352) | none, always scripted |
| I3-redesign | Design drop 3 applied to the kit and the shell | G4v2 5 of 5, `demo-ok-v2-d3` (988d0c1) | none |

The Features table in `status.md` still shows M-buyer as "T7 running" and M-desktop as "lead fixing". Both rows are older than the work. The log shows M-buyer's T7 done (33 buyer specs), M-desktop's three live specs fixed (6 of 6 with B16 live), and the Cut and simulated section says the phone flow is gone.

## v2 upgrades, B11 to B16

| Upgrade | What it does | State at the freeze | Gate and tag | Key or service | Evidence |
|---|---|---|---|---|---|
| B11-embed | Our own embedding model, fine-tuned on the fictional catalog | Built, trained and published. Live through B12's adapter. G5 not run before the freeze | none | `HF_TOKEN`, `CINDIA_HF_REPO` | Pairs written by Claude (Haiku, one Sonnet retry). Published to the private Hugging Face repo at 11:57 PM. Numbers below |
| B12-search | Hybrid search in Elastic Serverless, and the `cindia-finder` agent | Green. G5 7 of 7 on the tour in the worktree | `demo-ok-b12` (988d0c1) | `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY` | Elastic hybrid live: seed about 30 s, query 0.61 s, Agent Builder 7.1 s. Elastic eval recall at 5 is 0.819 and MRR at 10 is 0.887. T7 not built. The first G5 run failed only its live tour at a load of 7.7 |
| B13-live | SpacetimeDB as the one database, polled by the browser | Green. G5 7 of 7 on the tour in the main tree | `demo-ok-b13` (988d0c1) | a local SpacetimeDB on port 3000 and `SPACETIME_TOKEN` | Live: spacetime true, seeded 54 pieces, 30 orders and 5 approvals, and the live round trip passes. T1 to T7 committed |
| B14-swarm | The swarm of small Claude agents | Green. G5 7 of 7 on the tour in the worktree | `demo-ok-b14` (988d0c1) | `CINDIA_ANTHROPIC_API_KEY` | d04 live median 5.87 s with L15 quoted, listing 6.6 s, storefront 3.3 s. The Agent Builder step times out at 9.4 s, and find answers then come from B12 search at about 17 s |
| B15-watch | The copy watch, crawling the sandbox market through Apify | Built. The claims check (Haiku) and the Reporter (Sonnet) are live. The live crawl is blocked by Apify's 403, so the watch plays scripted. G5 failed at the freeze, so it is not gated | none | `APIFY_TOKEN`, `PUBLIC_SITE_URL` | Haiku claims and the Sonnet Reporter (3.3 s) answered live. The market is at https://cindia.design/market/. The Apify crawl answers 403 in both trees, an Apify account or token-permission problem and not code. Threshold 0.22 measured. T7 not built |
| B16-bank-books | The $340 catch found against Nessie's own records, and the fund moves posted there | Built. Live specs pass, 6 of 6 with B16 live. G5 not run before the freeze | none | `NESSIE_KEY` | Nessie live: seed 8.3 s, reconcile 1.2 s, fund move 1.9 s. A person's move now draws finished while paused (a money-map fix) |

The plans are in [`docs/plans/`](../plans/) and the order is in [`docs/v2/README.md`](../v2/README.md).

## Cut and simulated

This is the Cut and simulated section of `status.md`, final at the freeze (Oct 25, 5:00 AM PT).

**Cut:** no plan was cut. Not built by the freeze:
- B12's T7 and B15's T7 (optional tasks).
- Drop 3's feature layout rounds from `design/changes.md` and the review (`artifacts/gates/G4v2-d3-review.json`): the search result cards (only three of six results show on d01, and L3 sits under the frame's edge on the first two), the piece page and receipt layout, the support drawer's step strip, seller-hub's three columns, the money map lattice, the catch line's 48 px amount, the store hero, maker-statement, communities, the presenter hint and the drawer scrim. The kit and the shell carry drop 3, and these pages keep their v2 layouts in the new look.
- Gordon's English-only step 2: the Chinese text is still in the code and the mock data, and nothing renders it (decisions.md 11:55 PM allows this).
- M-buyer's contract change 6 in part: the phone flow is gone, and the unfilled `buyer.main` slot ID stays in the shared list until after the freeze.
- pc_27, pc_32, pc_35, pc_37, pc_38, pc_39 and pc_48 show their placeholders (Gordon's art check), including pc_38 on the surprise beat.

**Live, gated on the tour (G5 with a live tour run):** B12 vibe search on Elastic (`demo-ok-b12`), B13 SpacetimeDB (`demo-ok-b13`), B14 the agent swarm on Claude (`demo-ok-b14`). B15 the counterfeit watch: its G5 failed at the freeze because Apify answers 403 to the live crawl (an Apify account or token problem), its Claude steps are live, and the watch plays scripted. v1's B01, B03, B05, B06, B08, B09 and B10 passed G5 on v1's timeline (`demo-ok-b01`, `demo-ok-b03`, `demo-ok-b05`, `demo-ok-b06`, `demo-ok-b08`, `demo-ok-b09`, `demo-ok-b10`).

**Live in the cloud, built and tested, without a G5 on the tour:** B11, Cindia's own embedding model (trained, scored and published to the private Hugging Face repo, recall at 5 0.789 against 0.784 for keywords, hybrid 0.825), and B16, the bank books on Nessie (its live specs pass, 6 of 6 with B16 live). Each has its server tests and its live pytest passing. Its G5 on the tour didn't fit before the freeze. B02 (the catch's explanation), B04 (the bank) and B07 (Ask Cindy) passed their live calls but not v1's timing harness under load (B04 11 of 13 at 12:45 AM).

**Simulated by design, even when everything is green:**
- The guided tour: it plays scripted events in both modes, so it always runs. A person's own request in live mode reaches the real services.
- The public site (https://cindia.design): the scripted public build, with no Pay and no Live switch.
- The checkout ("Demo checkout, no real charge", the card number becomes a token).
- Sending: the follow-up to the gallery and any counterfeit report never leave Cindia.
- The bank: Nessie is a sandbox bank, so no real money moves.
- The verification line on every piece: no real check was done.
- The community pages: placeholder text by the Cindia team. In a real launch each community writes its own.
- Every maker, community and story is fictional (L30).

## Backend if time

The pitch keeps its claims as written (`docs/v2/fix-plan.md` section 1.5). This table says what the demo has, what the build adds if time allows, and what got built by the freeze.

| The pitch says | What the demo has | What "if time" builds | Built by the freeze |
|---|---|---|---|
| "Cindy turns your words into keywords" | A rule-based keyword extractor in both modes | In live mode the Finder (Haiku) returns the chips and filters, and the rule-based extractor stays as the instant preview | Not built. B12's T7 is on the not-built list. The Finder does run inside the swarm (B14, green), but the search box still uses the rule-based extractor |
| "Tested on queries written by hand" | 50 held-out test queries, written separately by our data agent | Gordon writes or edits 15 of them, scored as their own row | Not built. `report.json` has no row for queries Gordon wrote. The pitch says what the demo has |
| "The Describer reads each photo" | No photo upload | A photo on the listing form, the Describer's layer, image vectors | Not built. The Describer is in the roster and nothing uploads a photo, so it never runs |
| "Every screen reads from SpacetimeDB" | The listed tables, the data view and presence (B13, green) | The approval queue moves onto SpacetimeDB, so the seal crosses two screens through it | The tables, the data view and presence are built and gated. The approval queue move (B13's T8) is not built. B08 keeps approvals in the server's memory |
| "Judges can try it live online" | The public site, https://cindia.design, plays the scripted tour at https://cindia.design/demo, with no Pay and no Live switch | A hosted live API | Not built. The public site is live and scripted |
| "Each seller builds their own storefront" | A block editor, labeled a preview (F-storefront, green) | A real builder | Not built |
| "Cindy asks the maker for you" | One scripted run (`d17-ask-maker`) | The live loop | Partly. When the records can't answer, the live swarm forwards the question to the maker (B14's tests cover it). The maker's reply coming back live is not built, and B14 has no route for it. The scripted relay plays in both modes |
| "A bigger model trained on a GPU" | The cloud CPU run, 45.8 minutes | A longer run on the lab GPU machine | Not built |
| "An Apify actor others can use" | B15 calls Apify's Cheerio Scraper | Scout and Comparer wrapped as our own actor | Not built. B15's T7 is on the not-built list |

## The search model's numbers

These come from [`server/b11_embed/report.json`](../../server/b11_embed/report.json) and from nowhere else. The model is `cindia-embed-v1`, fine-tuned from `intfloat/multilingual-e5-small` (384 dimensions). It was published to the private Hugging Face repo `Fireclaw2396/cindia-embed` at revision 5ad57138.

**The test:** held-out test queries, written separately by our data agent. There are 50 of them (40 English and 10 Chinese), over the same 54 fictional pieces the model trained on, and none was used for training. Only the queries are held out. A guard dropped 40 generated training queries that matched a test query. Nobody on the team wrote or edited any of the 50, so `report.json` has no separate row for that. It is a small test, not a benchmark.

| System | Recall at 5 | MRR at 10 |
|---|---|---|
| Keyword search (BM25) | 0.784 | 0.875 |
| The untuned base model | 0.722 | 0.781 |
| Cindia's model | 0.789 | 0.892 |
| Local hybrid (Cindia's model plus BM25, reciprocal rank fusion) | 0.825 | 0.940 |

What the intervals say (95%, paired bootstrap, from `report.json`):
- Cindia's model against keyword search: within noise on both measures (recall at 5 +0.005, interval -0.088 to +0.101). It does not beat keyword search on this test.
- Cindia's model against the untuned base model: it wins on MRR at 10 (+0.111, interval +0.022 to +0.206). On recall at 5 the gap is within noise (+0.067, interval -0.018 to +0.156).
- The local hybrid against Cindia's model: it wins on MRR at 10 (+0.048, interval +0.002 to +0.105). On recall at 5 the gap is within noise (+0.035).
- By language, Cindia's model scores 0.797 recall at 5 on the 40 English queries (keyword 0.813, hybrid 0.849) and 0.758 on the 10 Chinese queries (keyword 0.672, base 0.425, hybrid 0.728).
- The live Elastic hybrid is a different system. On the same 50 queries it scored recall at 5 of 0.819 and MRR at 10 of 0.887 (B12, `server/b12_search/eval.json`).
- On 108 training-pipeline queries held back for development, recall at 5 was 0.917 for the base model and 0.963 for Cindia's model. They come from the same authoring pipeline as the training queries, so they say less than the test set.

**How it was trained:** 1,045 query-piece lines written by Claude about the 54 fictional pieces (831 English, 214 Chinese), 3 epochs at batch 16, 177 steps, on CPU in 45.8 minutes. The content filter dropped 0 queries. The batch was 16 and not 32 because the memory probe measured a peak of 5.18 GB at batch 32.

**Text match in the watch:** the real text match of the sandbox market's look-alike listing `cft_01` against the co-op's piece is 0.74 (the B11 row's note in `status.md`).

## The planted-error score

The matcher catches 4 of 4 errors planted in the month's records (`docs/common/data-model.md`, figure 10). B03 passed G5 at 13 of 13 and played live at 59.0 s. The tour shows it as "Caught 4 of 4 planted errors" on the end card.

## Data care

Every maker, community, piece, order and story lives in [`src/mock/`](../../src/mock/). SpacetimeDB, Elastic, the training pairs and the vectors are built only from it (`docs/v2/fix-plan.md` section 1.6). Nessie is a sandbox bank. The copy watch crawls only our own sandbox market and never the real web.

## Every community, maker and story here is fictional

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
