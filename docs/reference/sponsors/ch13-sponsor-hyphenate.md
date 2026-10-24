---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "Hyphenate"
captured: 2026-10-23
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-21
date-modified: 2026-10-24
---

# Hyphenate · The Hyphenated Enterprise: Autonomous Systems for Finance

Everything Hyphenate published for Cal Hacks 13.0, first copied Oct 21, 2026 and updated Oct 23 with Slack and Hive. Re-checked Oct 24: Devpost, the Hacker Guide row and the track doc are unchanged. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **Prizes:** $8,000 / $5,000 / $3,000 for the top 3 teams. Every member of the top 5 teams gets an expedited interview.
- **Events (Hive):** workshop Fri 7:00 to 8:00 PM (no room posted), mixer Sat 2:00 to 3:30 PM at Gate 6. Winners' photos on Sun 4:00 to 5:00 PM are in the Hyphenate Lounge.
- **Workshop recording:** the Oct 21 Zoom workshop is at https://fathom.video/share/UQKfEaP_BUs_ACNWzcPNP_XhmV843z-Y. The slides were linked in the same Slack message (#cohost-hyphenate, Oct 21).
- **Entering the track:** nothing to register. Pick the track on Devpost when submitting (Rudraksh Awasthi, Hyphenate, Oct 22).
- **Workshop title:** Beyond Agentic Harnesses: Engineering the Autonomous Enterprise (online Oct 21, in person Oct 23 at 7 PM)
- **Booth:** all weekend (track help, job chats, hoodies)
- **Jobs:** New Grad SWE 2027 and SWE Intern (Summer 2027 or earlier), with applications through the Cal Hacks links prioritized (see the email below)

## Judging (Hacker Guide row, verbatim)

> Every submission is judged on the same four questions: 1. **Is it real enough?** Realistic data, a messy problem, and proof that it works. 2. **Would you hire it?** For which seats, and would it earn them: limited access, a clean record of its work, and knowing when to ask? 3. **Did we see something new?** A company, problem or approach we haven't seen made autonomous before. 4. **The moment.** When it catches what others missed, recovers from something going wrong, or defends a decision when questioned. Teams should bring a demo video that opens with their moment, a live demo at judging (we may ask them to try a scenario of our own), one line on the seats their system fills, and proof it works: what's real, what's simulated, and how they know.

## Devpost prizes

- [Hyphenate] 1st Place The Hyphenated Enterprise: Autonomous Systems for Finance, $8,000 in cash
- [Hyphenate] 2nd Place, $5,000 in cash
- [Hyphenate] 3rd Place, $3,000 in cash
- "Cash prizes of 8000$, 5000$, 3000$ for the top 3 teams and expedited interview process for top 5 teams"


## Slack #cohost-hyphenate (verbatim)

**Rajaswa Patil (Hyphenate), Oct 21, 11:58 AM:**

> Hyphenate workshop is tonight at 6 PM PT / 9 PM ET on Zoom: Beyond Agentic Harnesses: Engineering the Autonomous Enterprise
> Getting an agent to do a task is the easy part. Getting it to run real work inside a company, across a dozen systems and people, with every decision still holding up months later, is the fun part. We'll show you how we do it in finance!
> It's also the best head start on our track, The Hyphenated Enterprise: Autonomous Systems for Finance ($8K / $5K / $3K)

**Workshop host, Oct 21, 7:52 PM:**

> Hey hackers! Thank you for attending the Hyphenate Workshop today, here's the meeting recording: fathom.video/share/UQKfEaP_BUs_ACNWzcPNP_XhmV843z-Y and the slides

**Rudraksh Awasthi (Hyphenate), Oct 22, 6:55 PM, answering how to register for the track:**

> You just participate normally and during submission they will ask you to select your track on devpost/wherever they ask you to submit

## What Cindia v2 does for this track

The brief's line: "The catch, the seats it fills (bookkeeper, collections, support), limited access, the swarm's record of work, what's real and what's simulated, the proof score."

- **The catch:** reconciling the month, Cindy finds that the gallery paid $340 less than the consignment contract says. She lays the three records side by side as evidence, says which one to trust and why, and drafts a follow-up to the gallery. It goes out only after the owner approves it with the seal.
- **The seats it fills:**
  - Bookkeeper: matches payouts to orders, derives the books and closes the month into a real Excel workbook.
  - Collections: flags the short payment, drafts the follow-up, and holds part of a maker's share until the gallery pays what it owes.
  - Support: the swarm answers buyers and sellers (orders, payouts, listings, policy) and hands over to a person when it should.
- **Limited access:** each agent gets only the tools its one job needs and hands back a typed result. The Clerk is read-only. Matcher, Bookkeeper and Scorer are plain code. Cindy proposes, and nothing moves money without the owner's seal.
- **Record of work:** the swarm view shows every step's input, output, tool, model and time. The audit trail traces each number back to its record, rule or person.
- **Real and simulated:** every panel still on scripted events shows the Simulated badge. The scribe's what's-real list counts something as real only once it ran against a live service in its gate. The people and communities are fictional demo data.
- **Proof score:** the matcher catches 4 of 4 errors planted in the month's records. The proof panel also scores the search model's recall at 5 against keyword search, the base model and the hybrid.
- **The numbers:** a $180 peony fan, $134.48 to the maker, the gallery $340 short.

---

## Full track brief (copy of the Google Doc "CalHacks_Hyphenate_Track")

Source: https://docs.google.com/document/d/1u4iN8R97ILY3kfHTPKC82zdutHrGx4ze5eCAP-J92w4/edit

**CALHACKS 2026 · HYPHENATE TRACK · $8,000 · $5,000 · $3,000 FOR 1ST, 2ND AND 3RD**

### The Hyphenated Enterprise: Autonomous Systems for Finance

Build the system a finance team would bring on board. No finance background needed.

Agents can already take a task off someone's plate when prompted. The frontier is autonomy inside a company: systems that pick up work on their own, across the software and the people that run it, with decisions that are explainable when someone asks and accountable whenever someone looks back.

Finance is where this gets hard fastest. A single refund changes revenue, cash, a customer's balance and next quarter's forecast. Every number has to agree with every other number, and nothing moves without the right person's sign-off.

Pick a company and one corner of its finance team: a few seats that work closely together, like the accountant who applies customer payments and the person who chases the late ones. Then build the autonomous system you'd hire to fill them, and the company it works in: the software it uses, the people it answers to, and the mistakes hiding in its data. Be as imaginative as you like about who the company is (a Formula 1 team, a music festival, a three-person startup, a colony on Mars) and strict about how it works underneath.

### What makes it hard

The hard parts usually come from the company around the system:

- **Sources that disagree.** The bank, the ledger and the contract each tell a slightly different story. Acting well means knowing which one to trust, and saying why.
- **Time.** Finance runs for months, not minutes. What happened in March should change what the system does in June.
- **Working with others.** Approvers are busy, colleagues (human or automated) hand work over half done, and the controller sometimes says no. The system has to ask at the right moment and handle the answer.
- **Limits.** No company gives one employee access to everything, and an autonomous system shouldn't get it either. Whoever requests a payment can't be the one who approves it.
- **Explainable and accountable.** Anyone reviewing the system's work should see why it made each call, and every call should trace back to the data, rule or person behind it, no matter how long ago it was made.

### Sample workflows

A few of the many functions a finance team runs. Pick a corner of one, or of one that isn't listed. Each line is only an outline: the exceptions and judgment calls that make the work hard are yours to discover, by digging in or by finding the Hyphenate team at our booth or around the venue.

- **Revenue Accounting.** Contracts with bundles, ramps and mid-term amendments become revenue schedules that stay right when a deal changes, from the order to the journal entry.
- **Accounts Receivable.** Invoices go out with the right sales tax, payments come back short, late or bundled together, and someone decides who to chase, how hard, and when a dispute needs a person.
- **Cash & Treasury.** Every bank transaction matched to what it pays for, cash positioned across banks and currencies each morning, and a forecast that updates as actuals land.
- **Accounts Payable.** Bills arrive in every format, approvals stall, and a vendor's bank details change the day before a large payment.
- **Accruals.** Costs for work done but not yet billed get estimated, confirmed with vendors, and reversed when the bill finally arrives.
- **Expenses.** Prepaids, fixed assets, leases, inventory and capitalized R&D, each spread over the periods it benefits, with depreciation and write-downs that follow policy.
- **Payroll.** Payroll runs and stock grants turned into the right entries every period, by department and entity.
- **Close & Consolidation.** Reconciliations, flux, controls and sign-offs that finalize a month, subsidiaries that roll up cleanly, and auditors' requests answered with evidence from the books.
- **FP&A.** Budgets, forecasts and budget against actuals, with every variance traced to what drove it, plus margin and pricing analysis the business can act on.
- **Reporting.** Financial statements, management reports, SaaS metrics and board packs, all tied back to one ledger built from every source system.

### How we judge

Every submission gets the same four questions.

| | |
|---|---|
| **Is it real enough?** Realistic data, a messy problem, and proof that it works. | **Would you hire it?** For which seats, and would it earn them: limited access, a clean record of its work, and knowing when to ask? |
| **Did we see something new?** A company, problem or approach we haven't seen made autonomous before. | **The moment.** When it catches what others missed, recovers from something going wrong, or defends a decision when questioned. |

### What to submit

Judges see hundreds of projects, so put the evidence up front. Along with your code, bring:

- **A demo video** that opens with your moment.
- **A live demo** at judging, running for real. We may ask you to try a scenario of our own.
- **One line** on the seats your system would fill.
- **Proof it works:** what's real, what's simulated, and how you know, whether that's a test set, planted errors with an answer key, or a benchmark score.

### Workshops

Beyond Agentic Harnesses: Engineering the Autonomous Enterprise. Online on October 21 [time], and in person on October 23 at 7 pm, an hour after hacking starts. Come for a head start on the problems above.

### Places to start

**See it for real.** The platform video and product pages on [hyphenate.ai](https://hyphenate.ai/) show what an autonomous finance system looks like inside a working finance team.

Your system can only show what its world lets it. These free references are a starting point: borrow a schema, run a sandbox as it is, or start from a dataset, and build the rest of the company yourself.

- **Sandboxes.** [Stripe](https://docs.stripe.com/sandboxes), [Increase](https://increase.com/documentation/sandbox), [Lago](https://getlago.com/docs/guide/lago-self-hosted/docker), [Odoo](https://hub.docker.com/_/odoo), [ERPNext](https://github.com/frappe/frappe_docker)
- **Ledgers.** [Formance Ledger](https://github.com/formancehq/ledger), [Blnk](https://docs.blnkfinance.com/home/install), [TigerBeetle](https://docs.tigerbeetle.com/start/), [Beancount and Fava](https://github.com/beancount/fava)
- **Mocks.** [Mockoon](https://github.com/mockoon/mockoon/blob/main/packages/cli/README.md), [Prism](https://github.com/stoplightio/prism), [stripe-mock](https://github.com/stripe/stripe-mock)
- **Data.** [SEC EDGAR](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), public GitHub repositories
- **Benchmarks.** [AccountingBench](https://x.com/yunyu_l/status/1946261507723173935), [APEX-Accounting](https://huggingface.co/datasets/mercor/apex-accounting), [Finance Agent Benchmark](https://huggingface.co/datasets/vals-ai/finance_agent_benchmark), [DABstep](https://huggingface.co/datasets/adyen/DABstep), [BenchRec](https://www.kaggle.com/datasets/benchmarkteam/benchrec-real-world-cash-reconciliation-dataset), [Invoice Sandbox Benchmark](https://github.com/ciru-ai/invoice-sandbox-benchmark)
- **People.** A model can play the approver, the colleague or the auditor.
- **Models and frameworks.** Use whatever you like.

### Key concepts

- **Double-entry bookkeeping.** Every transaction is recorded as a debit in one account and a matching credit in another, so the books always balance.
- **General ledger.** The company's master record: every entry, sorted into accounts.
- **Chart of accounts.** The list of accounts a company sorts its entries into.
- **Journal entry.** A dated record that moves amounts between accounts, with a reason attached.
- **Subledger.** The detailed records for one area, such as customers, vendors or assets, which roll up into the general ledger.
- **System of record.** The source a company treats as the truth for a given piece of data.
- **Reconciliation.** Confirming that two records of the same thing agree, and explaining any difference.
- **Period close.** Finalizing the books for a month or quarter, after which that period's entries are locked.
- **Materiality.** How large a difference has to be before it matters.
- **Internal controls.** The checks a company puts in place so that mistakes and fraud get caught.
- **Segregation of duties.** No single person, or system, can both start and approve the same action.
- **Audit trail.** A record of who did what, when and why.
- **Controller.** The person who owns the accuracy of the books and signs off on them.

Hyphenate builds autonomous finance. If this is the kind of problem you'd like to work on full time, come talk to us.

---

## Email: "Cal Hacks 13.0 - Meet Hyphenate! $16,000 track, guaranteed interviews" (Oct 16, 2026)

From edward@hackberkeley.org

> We're so excited to introduce Hyphenate, an Anchor sponsor at Cal Hacks 13.0!
>
> We're Hyphenate, an Anchor sponsor of Cal Hacks 13.0. We build autonomous finance: AI agents that run the books for real companies. We just raised a big Series A, we're hiring, and we've got a track, a workshop, a mixer and a lot of hoodies waiting for you this weekend.
>
> **THE HYPHENATE TRACK**
>
> Build the autonomous system a finance team would hire. Pick any company (a Formula 1 team, a music festival, a colony on Mars) and one corner of its finance team, then build the system that fills those seats. No finance background needed.
>
> 1st $8,000 · 2nd $5,000 · 3rd $3,000, per team
> Top 5 teams: every member gets an expedited, shortened interview for internships and full-time roles
> Full brief and judging criteria: https://docs.google.com/document/d/1u4iN8R97ILY3kfHTPKC82zdutHrGx4ze5eCAP-J92w4/edit?usp=sharing
>
> **EVENTS**
>
> Friday, 7:00 PM, Theater: track workshop and office hours. How to scope a winning entry, Q&A with our engineers, build help.
>
> Saturday, 12:00–2:00 PM: invite-only lunch with our founding engineers for the class of 2027 (see below to apply).
>
> Saturday, 2:00–4:00 PM, Mixer Area (Gate 6): boba and cookies mixer. Open to everyone, no sign-up.
>
> All weekend, Hyphenate booth: track help, job chats, and embroidered hoodies while they last.
>
> **RECRUITING: TWO THINGS TO DO**
>
> Graduating in 2027? Apply for a seat at Saturday's special lunch with our founding engineers. Limited spots: https://forms.gle/rWUowPtpAcdeQsTQ9
>
> Apply for a role (All the applications submitted through CalHacks will be prioritized)
> New Grad Software Engineer (2027): https://jobs.ashbyhq.com/hyphenate/67d0c7d0-fddb-4b8d-aed8-0647337a988e?utm_source=calhacks
> Software Engineering Intern (Summer 2027 or earlier): https://jobs.ashbyhq.com/hyphenate/3ff6e57d-5430-4836-b6f0-19044d8ee6d8?utm_source=calhacks
>
> See you Friday,
> The Hyphenate team
> hyphenate.ai

## From Pre-Event Details #2 (Oct 15)

> *Hyphenate (Co-Host) –* Hyphenate builds autonomous finance: AI agents that run the books for real companies. Our track at Cal Hacks asks you to build the autonomous system a finance team would hire, for any company you can imagine, no finance background needed. $8,000 / $5,000 / $3,000 for the top three teams, and every member of the top five teams gets an expedited, shortened interview for internships and full-time roles. Full brief: Cal_Hacks_Hyphenate_Track (https://docs.google.com/document/d/1u4iN8R97ILY3kfHTPKC82zdutHrGx4ze5eCAP-J92w4/edit?usp=sharing)
