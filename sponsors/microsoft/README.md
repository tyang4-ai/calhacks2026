# Microsoft · Built for the Real World

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. Where something is not built yet, this page says **planned** and links its plan.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) ($3,800 for the grand prize, plus a second award, the Customer Impact Award, with the same criteria). The challenge, from the hacker guide and Microsoft's Slack post, is to build a production-minded AI agent that solves a meaningful problem in finance, productivity, healthcare or another high-impact domain. The notes are copied in [`docs/reference/sponsors/ch13-sponsor-microsoft.md`](../../docs/reference/sponsors/ch13-sponsor-microsoft.md). Five capabilities decide it:

1. **Customer understanding.** Do you know who uses it and what they need?
2. **Measurable usefulness.** Can you show it helps, in numbers?
3. **Path from prototype to production.** Could this become a real system, and what would it take?
4. **Responsible design.** Where could it go wrong, and what stops it?
5. **End-to-end functionality.** Does the whole thing work, start to finish?

## What Cindia does for this track

- **Customer understanding.** Cindia is a platform for underrepresented makers, starting with Native American makers. Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have. Each user has a named need: the buyer wants something that means something and to know the maker was paid, the maker wants to be paid on time with a statement she can read, and the co-op's manager wants to make and not do the books. The demo follows the fictional Diné Weaving and Silver Co-op on the Navajo Nation, with its manager Ruth B. and its makers Grace N., Lena T. and Mae K. ([`docs/v2/brief.md`](../../docs/v2/brief.md), "Who uses it").
- **Measurable usefulness.** The proof panel scores the matcher against planted errors, and it catches 4 of 4. The impact view shows the maker's share, the days from close to payout and the bookkeeping hours saved, with the hours labeled an estimate. When the search model is trained, the proof also scores it on held-out test queries, written separately by our data agent. Not trained yet.
- **End-to-end functionality.** The month's books become a real Excel file, built on the server with openpyxl: four sheets (Ledger, Reconciliation, Profit and loss, Makers), formula totals and a native bar chart. The close is the last step of a flow that starts at the buyer's search and ends at the receipt turning to "Paid to the maker".
- **Responsible design.** A person approves anything that moves money or publishes anything. Each agent gets only the tools its job needs. Every simulated panel carries the Simulated badge. No real community's data trains anything, and every person in the demo is fictional.

## Path from prototype to production

**What's live today** (from [`docs/harness/status.md`](../../docs/harness/status.md)):
- Live, with a passed gate: B01 (matching), B03 (the planted-error proof), B05 (your own statement), B06 (the Excel report), B08 (approvals) and B10 (splits, receipts, statements and impact).
- Built, live check pending tonight: B02, B04, B07 and B09.
- Planned: B11 to B16 (the model, search, the database, the swarm, the copy watch and the bank-books check).

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
| `b11-embed` to `b16-bank-books` | planned, see [`docs/v2/README.md`](../../docs/v2/README.md) | The model, search, the database, the swarm, the copy watch and the bank-books check |

**What a one-co-op pilot needs.** None of this is built, and each item is a design step:
- A real bank behind B04's interface. Today it is Nessie, a sandbox bank, and the adapter would point at the co-op's real account.
- Sign-in and roles. Today the Sell side is open to everyone for the demo, and the screen says so. A pilot lets only the co-op see or approve anything there.
- Per-community data controls. In a real launch each community controls what is indexed about it and writes its own page.
- Claude cost per month. The swarm view records each step's model and time, so the cost can be worked out from the step log. There is no measured figure yet.
- Monitoring through the process log. Each process view ends with the raw event log, and the process bar shows each source's status. Planned ([`F-process`](../../docs/plans/F-process.md)).

**The pilot's targets.** Days from close to payout and bookkeeping hours saved, each measured before and after with the co-op's own records. The method is in the [Anthropic page's impact plan](../anthropic/README.md#impact-measurement-plan).

## Where to look

- [`server/routers/b06_workbook.py`](../../server/routers/b06_workbook.py): builds the Excel close. Live, G5 13 of 13.
- [`src/features/close/`](../../src/features/close/): the close panel, the totals and the workbook card. Built.
- [`src/features/impact/`](../../src/features/impact/): the impact numbers. Built, live through B10.
- `server/b11_embed/report.json`: the search model's score against the baselines. **Not trained yet.** The file doesn't exist. See [`docs/plans/B11-embed.md`](../../docs/plans/B11-embed.md).
- [`src/features/approvals/`](../../src/features/approvals/): Cindy proposes and the manager decides. Built.
- Every adapter in [`src/sources/live/`](../../src/sources/live/): the swap points above.

## How to run that part

- Scripted, no key: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo. The close and the impact numbers play at the end of v1's 60-second demo.
- Live Excel file, no key: `npm run server`, switch on Live, play the close, and download the file the server built.
- `npm run test:server` runs the backend tests. `npm run check` runs the type check, lint and unit tests.

## The moment in the tour

Planned (`I2-tour`). Times are from [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2.
- `d10-close`, 161 to 166 s: the month closes into the Excel file, and the impact numbers appear.
- `d13-proof`, 186 to 192 s (chapter 2): the proof scores.
- The end card, after `d12-receipt`: which sources were live in this run, and which were simulated.

## What's live and what's simulated

- **Live, with a passed gate:** B06 (the Excel file), B10 (the impact numbers) and B03 (the proof).
- **Estimates, labeled on screen:** the "before" days and the bookkeeping hours saved. The data file calls them illustrative.
- **Planned:** the model's score, and every item under "What a one-co-op pilot needs". This page's "Path from prototype to production" section is the path-to-production page the brief asks for. No plan builds a separate page inside the platform.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
