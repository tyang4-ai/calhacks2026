# Hyphenate · The Hyphenated Enterprise: Autonomous Systems for Finance

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md). Every maker, community and story named here is fictional.

**Met or not:** met on the build. The catch, the approvals, the proof and the seats line are green and play in the tour. The demo video that opens with the catch is Gordon's to record and link.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) ($8,000, $5,000 and $3,000 for the top three). The criteria are in the hacker guide and in Hyphenate's [track doc](https://docs.google.com/document/d/1u4iN8R97ILY3kfHTPKC82zdutHrGx4ze5eCAP-J92w4/edit), copied in [`docs/reference/sponsors/ch13-sponsor-hyphenate.md`](../../docs/reference/sponsors/ch13-sponsor-hyphenate.md). Every submission gets the same four questions:

1. **Is it real enough?** Realistic data, a messy problem, and proof that it works.
2. **Would you hire it?** For which seats, and would it earn them: limited access, a clean record of its work, and knowing when to ask.
3. **Did we see something new?** A company, problem or approach they haven't seen made autonomous before.
4. **The moment.** When it catches what others missed, recovers from something going wrong, or defends a decision when questioned.

They also ask teams to bring a demo video that opens with the moment, a live demo at judging (they may try a scenario of their own), one line on the seats the system fills, and proof of what is real and what is simulated.

## What Cindia does for this track

**The company.** A fictional Diné Weaving and Silver Co-op on the Navajo Nation in Arizona, run by its manager Ruth B., with makers Grace N., Lena T. and Mae K. Its sales come through three channels: the Cindia marketplace, its own website and Fogline Gallery in San Francisco, which sells on consignment. Cindia is a platform for underrepresented makers, starting with Native American makers, and it does the selling, the marketing and the books for them.

**The seats** (word for word from the tour's end card, `SEATS_LINE` in [`src/app/demo/EndCard.tsx`](../../src/app/demo/EndCard.tsx)).

> Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money.

- **Bookkeeper.** Matches every payout to the orders it pays for, derives the books and closes the month into a real Excel file.
- **Collections.** Flags the short payment, drafts the follow-up to the gallery, and holds part of each maker's pay until the gallery pays what it owes.
- **Support.** The agent swarm answers buyers and sellers from the records and hands over to a person when it should. Green ([`B14-swarm`](../../docs/plans/B14-swarm.md), G5 7 of 7 on the tour).

**The moment.** The gallery paid $340 less than its consignment contract says. Cindy lays three records side by side: the contract (40% commission, so $2,040.00 is owed), the gallery's statement (it charged 50%) and the bank deposit ($1,700.00 on Sep 30). She says which record to trust and why, and drafts the follow-up. Nothing goes out until the manager approves it with the seal.

**Messy, with sources that disagree.** The month holds 30 orders on three channels, one payout that covers three orders, a refund taken out of a later payout, and a payout that lands after the close and carries into the next month ([`docs/common/data-model.md`](../../docs/common/data-model.md), figures 3 to 7).

**Limited access.** Each agent gets only the tools its one job needs and returns a typed result. Matching, the books and scoring are plain code. The Clerk is read-only. Cindy proposes and never approves her own proposals. A payout over $500 always needs the manager. For the swarm, `test_a_forbidden_tool_call_raises` and `test_the_safety_sweep_finds_no_forbidden_event_in_any_run` in [`test_b14_swarm.py`](../../tests/server/test_b14_swarm.py) check the limits.

**A clean record of its work.** The audit trail traces each number back to its record, rule or person ([`src/features/audit/`](../../src/features/audit/), green). The swarm view in the process bar shows every step's agent, input, output, tool, model and time ([`src/features/process/`](../../src/features/process/), green).

**Knowing when to ask.** Two lines on time and on working with others. They are written as design, and the demo does not show a second month.
- **Time.** The held amounts carry into the next month. The demo shows the held $95 on Grace N.'s statement, with the reason: the gallery paid short, so part of her pay waits. It does not show a second month.
- **Working with others.** After a decline, Cindy keeps the money held and asks again with the manager's reason. Declining with a typed reason is built ([`F-approvals`](../../src/features/approvals/) and B08). Asking again is design only, and no scripted re-proposal exists.

**Proof of what's real.** The proof panel scores the matcher against the answer key. The matcher catches 4 of 4 errors planted in the month's records (`src/mock/answerKey.ts`, `tests/data/answer-key.test.ts`). The list of what is real and what is simulated is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

**Bring your own scenario.** A judge can drop a statement CSV into the scenario panel and get the matches and any short payment, live, with no key (B05). The columns are `date,orderId,pieceId,saleCents,commissionBps,netCents`.

## Where to look

- [`src/features/reconcile/`](../../src/features/reconcile/): the month, the matches, the catch and its evidence. Green.
- [`server/routers/b01_match.py`](../../server/routers/b01_match.py): the matcher that finds the short payment. Live, G5 13 of 13.
- [`server/routers/b03_proof.py`](../../server/routers/b03_proof.py): scores the planted errors. Live, G5 13 of 13.
- [`server/routers/b08_approvals.py`](../../server/routers/b08_approvals.py) and [`src/features/approvals/`](../../src/features/approvals/): Cindy proposes, the manager approves or declines, the seal lands. Live, G5 13 of 13.
- [`src/features/proof/`](../../src/features/proof/): the planted-error score. Green.
- [`src/features/process/`](../../src/features/process/): the process bar and its views. The reconcile and approvals views open during `d07-month` and `d09-approve`, and the swarm view opens in `d04-support`. Green ([`F-process`](../../docs/plans/F-process.md), `v2-process`).
- [`server/routers/b16_bank_books.py`](../../server/routers/b16_bank_books.py): re-checks the $340 catch against Nessie's own bank records. Built and live-tested, no G5.
- The swarm's roster: [`docs/v2/contracts.md`](../../docs/v2/contracts.md) section 6, and the table in the [README](../../README.md#the-backend). The swarm is green, see [`server/b14_swarm/`](../../server/b14_swarm/).

## How to run that part

- Scripted, no key: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo?mode=present. Add `?start=catch` to open on the catch. The public site plays the same tour at https://cindia.design/demo.
- Live money team, no key: `npm run server` starts the API on port 8000, then switch on Live in the demo controls. B01, B03, B05, B06, B08 and B10 need no key.
- A real owner screen for B08: restart the API (`npm run server`) right before the demo. B08 keeps approvals in memory and decisions are final, so an earlier run's approvals would answer at once ([`docs/harness/status.md`](../../docs/harness/status.md), Demo notes).
- Checks: `npm run test:server`, and `npm run test:demo` for the tour.

## The moment in the tour

Beat IDs and times are from [`docs/common/demo-script.md`](../../docs/common/demo-script.md). The tour is built (G4v2 passed 5 of 5, tour 220.0 s three times).
- **`d08-catch`, 146 to 154 s.** The catch. The video opens here: `/demo?video=1` starts with a 5-second cold open on this beat. Gordon's video is not linked yet.
- **`d07-month`, 136 to 146 s.** The month plays at 0.3 s a day. The reconcile view opens at 142 s and shows the records arriving, the matches and the flag.
- **`d09-approve`, 154 to 161 s.** The approvals view opens at 155 s and shows what Cindy proposed and what the manager sealed.
- **`d12-receipt`, 172 to 180 s.** The proof score comes in at 179 s, off camera, and the end card carries the seats line and the list of live sources.

## What's live and what's simulated

- **Live, with a passed gate:** B01 (matching), B03 (the planted-error proof), B05 (your own statement), B06 (the Excel report), B08 (approvals) and B10 (splits, receipts, statements and impact), each G5 13 of 13 on v1's timeline. B14 (the support seat) is live with a G5 of 7 of 7 on the tour.
- **Built, live calls passed, no G5 pass:** B02 (Claude explains the catch and drafts the follow-up), B04 (the Nessie account) and B16 (the catch checked against Nessie). Where a live source didn't play, the panel plays scripted with the Simulated badge.
- **Simulated by design:** sending the follow-up to the gallery (it never leaves Cindia), the checkout, the bank (Nessie is a sandbox), the tour itself and the people.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
