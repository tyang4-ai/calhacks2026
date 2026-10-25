# What's real and what's simulated

Written by the scribe at 8:00 PM PT on Saturday, Oct 24, 2026, from [`docs/harness/status.md`](../harness/status.md) as it stood at 7:58 PM. The freeze pass (D-sponsors task T6) rewrites it at 6:00 AM on Sunday from the final status.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.

## The rule

- **Real** means the feature or upgrade ran against a live service or live server code inside a gate, and the gate's evidence is recorded in `status.md`.
- **Simulated** means the screen plays scripted events from [`src/mock/`](../../src/mock/) and shows the Simulated badge.
- **Planned** means nobody has built it yet. Planned is never counted as real.
- The people, the communities, the pieces, the orders and the stories are fictional demo data in every mode.
- The guided tour (`/demo`) is always scripted, even when a source is live. Live evidence comes from the gates and from "try it yourself" after the tour (`docs/v2/fix-plan.md` section 1.2).

## Where the build stands

- v1 is green as `demo-ok-4`. That is the fallback if v2 fails.
- v2 is in progress. The re-skin to the fictional Diné Weaving and Silver Co-op, a co-op of Diné (Navajo) makers (R0, tag `v2-reskin`) and the v2 contracts and core types (I2-core, tag `v2-core`) are done.
- The desktop shell, the UI kit, the 54-piece catalog, vibe search, the agent swarm, the database, the copy watch and the 3-minute tour are all planned and being built tonight.
- Live keys are set in the cloud environment for Anthropic, Nessie, Elastic, Apify and Hugging Face. `/api/health` read all five as true at 7:30 PM. The v1 upgrades that use them (B02, B04, B07, B09) get their live checks tonight.

## Gates passed

| Gate | Result | When (Oct 24) | Evidence in `status.md` | Tag |
|---|---|---|---|---|
| G0 | PASS | 2:01 AM | 0 blockers, 1 warning (no `.env` then) | none |
| G1 | PASS | 2:33 AM | 5 of 5, verifier PASS | `g1-scaffold` |
| G2 | PASS | 2:58 AM | 2 of 2, verifier PASS | `g2-data` |
| G3 (W1) | PASS | 3:27 AM | wave gate, 9 of 9 P0 features green | `w1` |
| G4 | PASS | 4:15 AM | 5 of 5, 60-second runs, verifier PASS | `demo-ok-1` |
| G4 polish | PASS | 6:12 AM and 6:22 AM | verifier rounds 3 and 4 PASS | `demo-ok-2`, `demo-ok-3` |
| G5, B01 | PASS | 4:43 AM | 13 of 13, live at 20.5 s, no fallback | `demo-ok-b01` |
| G5, regression with all ten routers | PASS | 7:00 AM | 13 of 13, 60-second runs, B01, B03, B06, B08 and B10 live | `demo-ok-4` |
| R0 | PASS | 6:46 PM | 11 of 11 checks, 3 verifiers PASS | `v2-reskin` |
| core | PASS | 7:58 PM | 4 of 4 checks, 3 verifiers PASS | `v2-core` |
| G6 | not run | | | |

## Tags and their commits

From the Tags table in `status.md`. The cloud session keeps tags local, and Gordon pushes them from Windows at the freeze. A tag with no SHA in that table is listed in the other tables by name only.

| Tag | Commit SHA | Gate |
|---|---|---|
| `demo-ok-2` | 934fff4f849b247ddc621fc559c32285f7c3433d | G4 (v1 polish) |
| `demo-ok-3` | 43e7a4b21342fb616a6ebb42304a672f74b2e4f4 | G4 (v1 polish) |
| `demo-ok-4` | 781207120f7614209b8bd5004784d2b8e4091065 | G5 regression (v1) |
| `demo-ok-b05` | 70a60ec384c76b66ae228a2cfbb0a71f87d823f9 | G5 B05 |
| `demo-ok-b06` | ab7634d5f30ad74b62de909d7aaed30b6bf5fc91 | G5 B06 |
| `demo-ok-b08` | 617ffb00c2b01a30685eb5b076c600d1f0a27970 | G5 B08 |
| `demo-ok-b10` | fc2576af406e02a2c1d35033b3248e5a8fbb078d | G5 B10 |
| `v2-reskin` | 2b0823ede8b197784bb4e52a9deed9c956d9cd55 | R0 |
| `v2-core` | b5f9b24f1c78ba38074680fea245e8911c23c485 | core |

## v1 upgrades, B01 to B10

The server routers are in [`server/routers/`](../../server/routers/) and the browser adapters are in [`src/sources/live/`](../../src/sources/live/).

| Upgrade | What it does | State at 8:00 PM | Gate and tag | Key or service | Evidence |
|---|---|---|---|---|---|
| B01-match | Matches payouts to orders and finds the short payment | Live | G5 13/13, `demo-ok-b01` | none | Live at 20.5 s in the demo run, no fallback |
| B02-explain | Claude explains the catch and drafts the follow-up | Built, live check pending tonight | none yet | `CINDIA_ANTHROPIC_API_KEY` | `status.md` says "server 136 passed (18 mocked + 1 live skipped)". The live test is skipped without a key |
| B03-proof | Scores the planted errors | Live | G5 13/13, `demo-ok-b03` | none | Live at 59.0 s, verifier PASS |
| B04-bank | Posts the sale and the maker payouts to a Nessie account | Live run seen, gate not passed | G5 12/13, rerun queued, no tag | `NESSIE_KEY` | Cloud G5 on Oct 24 at 6:55 PM: server 232 passed, scripted 3/3 and offline pass. Live run 1 missed the receipt status because Nessie's first sale took 1,755 ms. Runs 2 and 3 passed |
| B05-scenario | Judges a statement the visitor drops in | Live | G5 13/13, `demo-ok-b05` | none | Live with no timeline events, proved by the flow tests and the live browser spec |
| B06-workbook | Builds the month's books as an Excel file | Live | G5 13/13, `demo-ok-b06` | none | Live at 44.6 s, verifier PASS |
| B07-ask | Claude answers the manager's questions with a card or chart | Built, live check pending tonight | none yet | `CINDIA_ANTHROPIC_API_KEY` | `status.md` says "server 31 mocked passed + 1 live skipped". Its live proof needs an `ask-cindy-live` spec |
| B08-approvals | Carries the manager's approve and decline to the console | Live, scripted grant allowed | G5 13/13, `demo-ok-b08` | none | When no owner screen is connected the scripted grant plays, by design |
| B09-concierge | v1's gift finder. The v2 tour no longer uses it | Built, live check pending tonight | none yet | `CINDIA_ANTHROPIC_API_KEY` | `status.md` says "server 36 mocked passed + 1 live skipped" |
| B10-derived | Splits, receipts, maker statements and impact numbers | Live | G5 13/13, `demo-ok-b10` | none | Live at 8.3 s, figures match to the cent |

Sending the follow-up stays simulated. `followup.sent` is never replaced by a live source (`docs/plans/B02-explain.md`).

## v1 features, kept in v2

All twelve passed G3 at 3 of 3 with a verifier PASS. After R0 they run on the Diné co-op's names with every v1 number unchanged.

| Feature | Folder | Gate tag | Fed live by | What plays live today |
|---|---|---|---|---|
| F-buyer | [`src/features/buyer/`](../../src/features/buyer/) | `w1-buyer` | B09, B10, B04 | Splits and receipts (B10). The sale posting (B04) and the gift finder (B09) are not gated yet |
| F-money-map | [`src/features/money-map/`](../../src/features/money-map/) | `w1-money-map` | B04 | Nothing gated yet. Scripted with the Simulated badge |
| F-reconcile | [`src/features/reconcile/`](../../src/features/reconcile/) | `w1-reconcile` | B01, B02 | The matches and the catch (B01). The explanation (B02) is not gated yet |
| F-approvals | [`src/features/approvals/`](../../src/features/approvals/) | `w1-approvals` | B02, B08 | The approve and decline path (B08). Claude's follow-up draft (B02) is not gated yet |
| F-maker-statement | [`src/features/maker-statement/`](../../src/features/maker-statement/) | `w1-maker-statement` | B10 | Live |
| F-close | [`src/features/close/`](../../src/features/close/) | `w1-close` | B06 | Live |
| F-proof | [`src/features/proof/`](../../src/features/proof/) | `w1-proof` | B03 | Live |
| F-ask-cindy | [`src/features/ask-cindy/`](../../src/features/ask-cindy/) | `w1-ask-cindy` | B07 | Nothing gated yet. Scripted with the Simulated badge |
| F-impact | [`src/features/impact/`](../../src/features/impact/) | `w1-impact` | B10 | Live. Hours saved is an estimate and is labeled one |
| F-audit | [`src/features/audit/`](../../src/features/audit/) | `w2-audit` | B10 | Live |
| F-dashboard | [`src/features/dashboard/`](../../src/features/dashboard/) | `w2-dashboard` | B10 | Live |
| F-scenario | [`src/features/scenario/`](../../src/features/scenario/) | `w2-scenario` | B05 | Live |

## v2 work

| Plan | What it is | State at 8:00 PM | Gate and tag | Key or service |
|---|---|---|---|---|
| R0-reskin | v1's studio becomes the Diné Weaving and Silver Co-op. Every number stays | Done | R0, `v2-reskin` | none |
| I2-core | The v2 contracts, types, config and `npm run export:mock` | First spawn done | core, `v2-core` | none |
| I2-kit | The v2 UI kit | Planned | G1b, tag `v2-shell` | none |
| I2-shell | The desktop shell, the Shop and Sell switch, the notice on every page | Planned | G1b | none |
| S3-catalog | The 54-piece catalog, the 50 test queries, the scripted swarm runs | Planned | G2b, tag `v2-data` | none |
| I2-art | The illustrations for the 54 pieces | Planned | G2b (placeholders), then a contact-sheet review | none |
| F-search, M-buyer, F-support, F-process, F-communities, F-seller-hub | The Shop, vibe search, help, the process bar, community pages, the Sell hub | Planned | G3 each | see B11 to B14 |
| M-approvals, M-desktop | The approvals and the finance views moved to the desktop shell | Planned | G3 each | none |
| F-watch, F-storefront, M-maker-statement | The copy watch view, the storefront preview, the maker page in English | Planned | G3 each | see B15 |
| D-deploy | The public build, the sandbox market and the demo-laptop script | Planned. Gordon uploads the site himself | tag `v2-deploy` | none |
| I2-tour | The 3-minute tour | Planned | G4v2, tag `demo-ok-v2` | none |
| I3-redesign | The Figma design drops applied to the kit | Planned | after G4v2 | none |
| B11-embed | Our own embedding model, trained on the catalog | Planned | G5, tag `demo-ok-b11` | `HF_TOKEN`, `CINDIA_HF_REPO` |
| B12-search | Hybrid search in Elastic Serverless, and the `cindia-finder` agent | Planned | G5, tag `demo-ok-b12` | `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY` |
| B13-live | SpacetimeDB as the one database, polled by the browser | Planned | G5, tag `demo-ok-b13` | a local SpacetimeDB on port 3000 and `SPACETIME_TOKEN` |
| B14-swarm | The swarm of small Claude agents | Planned | G5, tag `demo-ok-b14` | `CINDIA_ANTHROPIC_API_KEY` |
| B15-watch | The copy watch, crawling the sandbox market through Apify | Planned. Runs on its fixture until the public site is up | G5, tag `demo-ok-b15` | `APIFY_TOKEN`, `PUBLIC_SITE_URL` |
| B16-bank-books | The $340 catch found against Nessie's own records, and the fund moves posted there | Planned, after B04 is live | G5, tag `demo-ok-b16` | `NESSIE_KEY` |

The plans are in [`docs/plans/`](../plans/) and the order is in [`docs/v2/README.md`](../v2/README.md).

## Cut and simulated

The Cut and simulated section of `status.md` is empty at 8:00 PM. Nothing is cut yet. This list is built from the Features and Upgrades tables instead, and the freeze pass compares it with the section again.

**Cut:** nothing.

**Simulated today, with the Simulated badge:**
- The money map's balance, and the sale and payout postings, until B04 passes its gate.
- Claude's explanation of the catch and its follow-up draft, until B02 passes its gate.
- Ask Cindy's answers, until B07 passes its gate.
- The gift finder (v1), until B09 passes its gate.
- Every v2 screen that doesn't exist yet. It will play scripted events, and its live source stays planned.

**Simulated by design, even when everything is green:**
- The checkout. The screen says "Demo checkout, no real charge", and the card number becomes a token.
- Sending. The follow-up to the gallery and any counterfeit report never leave Cindia.
- The bank. Nessie is a sandbox bank, so no real money moves.
- The verification line on every piece. No real check was done.
- The community pages. The Cindia team wrote placeholder text, and in a real launch each community writes its own.
- The guided tour. It plays scripted events in both modes.

## Backend if time

The pitch keeps its claims as written (`docs/v2/fix-plan.md` section 1.5). This table says what the demo has, what the build adds if time allows, and what got built. Nothing in it has been started at 8:00 PM.

| The pitch says | What the demo has | What "if time" builds | Built so far |
|---|---|---|---|
| "Cindy turns your words into keywords" | A rule-based keyword extractor in both modes | In live mode the Finder (Haiku) returns the chips and filters, and the rule-based extractor stays as the instant preview | Not started |
| "Tested on queries written by hand" | 50 held-out test queries, written separately by our data agent | Gordon writes or edits 15 of them, scored as their own row | Not started. Until then the pitch says what the demo has |
| "The Describer reads each photo" | No photo upload | A photo on the listing form, the Describer's layer, image vectors | Not started |
| "Every screen reads from SpacetimeDB" | The listed tables, the data view and presence | The approval queue moves onto SpacetimeDB, so the seal crosses two screens through it | Not started. The tables and the data view are B13's plan, also not started |
| "Judges can try it live online" | The public site, https://cindia.design, plays the scripted tour at https://cindia.design/demo, with no Pay and no Live switch | A hosted live API | Not started. The public site is live and scripted (Gordon uploaded it from commit `b01fc1b`) |
| "Each seller builds their own storefront" | A mock block editor, labeled a preview | A real builder | Not started |
| "Cindy asks the maker for you" | One scripted run | The live loop | Not started |
| "A bigger model trained on a GPU" | The cloud CPU run | A longer run on the lab GPU machine | Not started |
| "An Apify actor others can use" | B15 calls an Apify crawler | Scout and Comparer wrapped as our own actor | Not started |

## The search model's numbers

Not trained yet. `server/b11_embed/report.json` doesn't exist, because B11 hasn't started. This section takes its numbers from that file and from nowhere else.

When it exists, it will hold four systems (keyword search, the untuned base model, our fine-tuned model and a local hybrid), each scored by Recall at 5 and MRR at 10, overall and for English and Chinese separately, with 95% intervals. The queries are held-out test queries, written separately by our data agent. The 50 queries cover the same 54 fictional pieces the model trained on, so it is a small test and not a benchmark. If Gordon writes or edits some of the queries, the report scores them as their own row and this page will give his count.

## The planted-error score

The matcher catches 4 of 4 errors planted in the month's records (`docs/common/data-model.md`, figure 10). B03 passed G5 at 13 of 13 and played live at 59.0 s.

## Data care

Every maker, community, piece, order and story lives in [`src/mock/`](../../src/mock/). SpacetimeDB, Elastic, the training pairs and the vectors are built only from it (`docs/v2/fix-plan.md` section 1.6). Nessie is a sandbox bank. The copy watch will crawl only our own sandbox market and never the real web.

## Every community, maker and story here is fictional

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
