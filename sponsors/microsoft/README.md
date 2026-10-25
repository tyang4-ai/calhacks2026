# Microsoft · Built for the Real World

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md). Every maker, community and story named here is fictional.

**Met or not:** met. The close, the impact numbers, the proof and the swarm are green, and the path from prototype to production is written below.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) ($3,800 for the grand prize, plus a second award, the Customer Impact Award, with the same criteria). The challenge, from the hacker guide and Microsoft's Slack post, is to build a production-minded AI agent that solves a meaningful problem in finance, productivity, healthcare or another high-impact domain. The notes are copied in [`docs/reference/sponsors/ch13-sponsor-microsoft.md`](../../docs/reference/sponsors/ch13-sponsor-microsoft.md). Five capabilities decide it:

1. **Customer understanding.** Do you know who uses it and what they need?
2. **Measurable usefulness.** Can you show it helps, in numbers?
3. **Path from prototype to production.** Could this become a real system, and what would it take?
4. **Responsible design.** Where could it go wrong, and what stops it?
5. **End-to-end functionality.** Does the whole thing work, start to finish?

## What Cindia does for this track

- **Customer understanding.** Cindia is a platform for underrepresented makers, starting with Native American makers. Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Each user has a named need: the buyer wants something that means something and to know the maker was paid, the maker wants to be paid on time with a statement she can read, and the co-op's manager wants to make and not do the books. The demo follows the fictional Diné Weaving and Silver Co-op on the Navajo Nation, with its manager Ruth B. and its makers Grace N., Lena T. and Mae K. ([`docs/v2/brief.md`](../../docs/v2/brief.md), "Who uses it").
- **Measurable usefulness.** The proof panel scores the matcher against planted errors, and it catches 4 of 4. The impact view shows the maker's share, the days from close to payout and the bookkeeping hours saved, with the hours labeled an estimate. The proof also scores the search model on 50 held-out test queries, written separately by our data agent: recall at 5 is 0.789 for our model, 0.784 for keyword search, 0.722 for the untuned base model and 0.825 for the local hybrid. Our model ties keyword search within noise. A small test, not a benchmark ([`report.json`](../../server/b11_embed/report.json)).
- **End-to-end functionality.** The month's books become a real Excel file, built on the server with openpyxl: four sheets (Ledger, Reconciliation, Profit and loss, Makers), formula totals and a native bar chart. The close is the last step of a flow that starts at the buyer's search and ends at the receipt turning to "Paid to the maker". The whole flow plays in the 3-minute tour, which passed G4v2 5 of 5.
- **Responsible design.** A person approves anything that moves money or publishes anything. Each agent gets only the tools its job needs. Every simulated panel carries the Simulated badge. No real community's data trains anything, and every person in the demo is fictional. The risks and their tests are on the [Anthropic page](../anthropic/README.md#where-it-could-go-wrong).

## Path from prototype to production

**What's live today** (from [`docs/harness/status.md`](../../docs/harness/status.md)):
- Live, gated on the tour: B12 (search on Elastic), B13 (SpacetimeDB) and B14 (the agent swarm), each G5 7 of 7.
- Live, gated on v1's timeline: B01 (matching), B03 (the planted-error proof), B05 (your own statement), B06 (the Excel report), B08 (approvals), B09 (the gift finder) and B10 (splits, receipts, statements and impact).
- Built and live-tested, no G5 on the tour: B11 (the embedding model), B16 (the bank books on Nessie), and B02, B04 and B07.
- Built, partly live: B15 (the copy watch). The claims check and Reporter are live. The live Apify crawl got a 403 and its G5 failed, so the watch plays scripted.

**The swap points.** Every screen reads events from the store, and each backend upgrade replaces one scripted event source. A screen never changes when its source goes live. If a source fails, its adapter falls back to scripted events and the panel keeps its Simulated badge. These are the adapters in [`src/sources/live/`](../../src/sources/live/):

| Source key | Adapter | What it replaces |
|---|---|---|
| `b01-match` | [`b01-match.ts`](../../src/sources/live/b01-match.ts) | Payout matching and the catch |
| `b02-explain` | [`b02-explain.ts`](../../src/sources/live/b02-explain.ts) | The explanation and the follow-up draft (Claude) |
| `b03-proof` | [`b03-proof.ts`](../../src/sources/live/b03-proof.ts) | The planted-error score |
| `b04-bank` | [`b04-bank.ts`](../../src/sources/live/b04-bank.ts) | The sale, the payouts and the balance (Nessie) |
| `b05-scenario` | [`b05-scenario.ts`](../../src/sources/live/b05-scenario.ts) | A statement the visitor drops in |
| `b06-workbook` | [`b06-workbook.ts`](../../src/sources/live/b06-workbook.ts) | The Excel file |
| `b07-ask` | [`b07-ask.ts`](../../src/sources/live/b07-ask.ts) | Ask Cindy (Claude) |
| `b08-approvals` | [`b08-approvals.ts`](../../src/sources/live/b08-approvals.ts) | The manager's approve and decline |
| `b09-concierge` | [`b09-concierge.ts`](../../src/sources/live/b09-concierge.ts) | v1's gift finder (Claude) |
| `b10-derived` | [`b10-derived.ts`](../../src/sources/live/b10-derived.ts) | Splits, receipts, statements and impact |
| `b11-embed` | [`b11-embed.ts`](../../src/sources/live/b11-embed.ts) | The model's score and the embedding map |
| `b12-search` | [`b12-search.ts`](../../src/sources/live/b12-search.ts) | Search and Surprise me (Elastic) |
| `b13-live` | [`b13-live.ts`](../../src/sources/live/b13-live.ts) | The database feed and the data view (SpacetimeDB) |
| `b14-swarm` | [`b14-swarm.ts`](../../src/sources/live/b14-swarm.ts) | The help drawer, listings and storefronts (Claude) |
| `b15-watch` | [`b15-watch.ts`](../../src/sources/live/b15-watch.ts) | The counterfeit watch (Apify) |
| `b16-bank-books` | [`b16-bank-books.ts`](../../src/sources/live/b16-bank-books.ts) | The catch and the fund moves checked on Nessie |

**What a one-co-op pilot needs.** None of this is built, and each item is a design step:
- A real bank behind B04's interface. Today it is Nessie, a sandbox bank, and the adapter would point at the co-op's real account.
- Sign-in and roles. Today the Sell side is open to everyone for the demo, and the screen says so. A pilot lets only the co-op see or approve anything there.
- Per-community data controls. In a real launch each community controls what is indexed about it and writes its own page.
- Claude cost per month. The swarm view records each step's model and time, so the cost can be worked out from the step log. There is no measured figure yet.
- Monitoring through the process log. Each process view ends with the raw event log, and the process bar shows each source's status ([`F-process`](../../docs/plans/F-process.md), green).
- A hosted live API. The public site is scripted, and a hosted live API wasn't built.

**The pilot's targets.** Days from close to payout and bookkeeping hours saved, each measured before and after with the co-op's own records. The method is in the [Anthropic page's impact plan](../anthropic/README.md#impact-measurement-plan).

## Where to look

- [`server/routers/b06_workbook.py`](../../server/routers/b06_workbook.py): builds the Excel close. Live, G5 13 of 13.
- [`src/features/close/`](../../src/features/close/): the close panel, the totals and the workbook card. Green.
- [`src/features/impact/`](../../src/features/impact/): the impact numbers. Green, live through B10.
- [`server/b11_embed/report.json`](../../server/b11_embed/report.json): the search model's score against the baselines, with intervals.
- [`src/features/approvals/`](../../src/features/approvals/): Cindy proposes and the manager decides. Green.
- [`src/features/process/`](../../src/features/process/): the process bar and views, which show each source's status.
- Every adapter in [`src/sources/live/`](../../src/sources/live/): the swap points above.

## How to run that part

- Scripted, no key: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo?mode=present. The close and the impact numbers play in `d10-close`. The public site plays the same tour at https://cindia.design/demo.
- Live Excel file, no key: `npm run server`, switch on Live, play the close, and download the file the server built.
- `npm run test:server` runs the backend tests. `npm run check` runs the type check, lint and unit tests.

## The moment in the tour

Beat IDs and times are from [`docs/common/demo-script.md`](../../docs/common/demo-script.md).
- `d10-close`, 161 to 166 s: the month closes into the Excel file, and the impact numbers appear.
- `d13-proof`, 186 to 192 s (chapter 2): the proof scores, with the search model's card.
- The end card, after `d12-receipt`: which sources were live in this run, and which were simulated.

## What's live and what's simulated

- **Live, with a passed gate:** B06 (the Excel file), B10 (the impact numbers) and B03 (the proof).
- **Estimates, labeled on screen:** the "before" days and the bookkeeping hours saved. The data file calls them illustrative.
- **Not built:** every item under "What a one-co-op pilot needs". This page's "Path from prototype to production" section is the path-to-production page the brief asks for. No plan builds a separate page inside the platform.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
