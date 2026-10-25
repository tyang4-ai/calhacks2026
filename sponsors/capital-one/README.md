# Capital One · Best Use of Nessie

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. Where something is not built yet, this page says **planned** and links its plan.

## What its judges look for

The prize is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com): $300 Giftogram per person on the winning team, listed as $1,200. The hacker guide gives three criteria, and the track is "intentionally vague" on purpose. Nessie, Capital One's hackathon API with mock banking data, is optional. The notes are copied in [`docs/reference/sponsors/ch13-sponsor-capital-one.md`](../../docs/reference/sponsors/ch13-sponsor-capital-one.md).

- **Completeness.** Is the use of Nessie finished and central, or a bolt-on?
- **Creativity.** Is it a fresh use of mock banking?
- **Complexity.** Does it go beyond one call?

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers, and it runs the makers' books. The fictional Diné Weaving and Silver Co-op, a co-op of Diné (Navajo) makers on the Navajo Nation, keeps its money in a Nessie account, and the platform does the posting, the matching and the maker payouts against it.

**What B04 posts to Nessie** ([`docs/plans/B04-bank.md`](../../docs/plans/B04-bank.md)):
- **The account.** A fictional customer ("Dine Weaving and Silver Co-op", written in plain ASCII because the sandbox finds it by exact string) with a Checking account nicknamed "Dine co-op operating".
- **September's history.** Seeded once, so the account already holds the month's bank records. Seeding does nothing when the account already has deposits.
- **The sale, live.** The buyer's $180 purchase of Grace N.'s weaving posts as one deposit of $156.48 (15648 cents), which is the price after the Cindia fee and the card fee.
- **The maker payouts, live.** The three maker payouts go out as withdrawals once the manager approves them.
- **The balance.** The money map's balance is read back from Nessie. It is computed from the deposit and withdrawal lists, because the account's own `balance` field may not follow deposits.
- **Why deposits and withdrawals.** Nessie has no way to create purchases or transfers, and its create calls answer with a plain string. So the server reads the list back to find the new record. Every call carries the key as `?key=`, has a 5-second timeout, and never logs the key.

**What B16 adds** ([`docs/plans/B16-bank-books.md`](../../docs/plans/B16-bank-books.md)). **Planned.** In live mode the matcher reads the bank side back from Nessie, so the $340 catch is found against Nessie's own record of the gallery's deposit, and the flag carries that deposit's Nessie ID. The community fund contribution posts as a deposit on a fund account. A milestone release posts as a withdrawal from an account where Cindia holds a commission's money. B16 never writes the operating account, so B04's balances stay exact.

**What is still read from the mock data.** B16 is not built, so today the matcher reads its bank records from `src/mock/`, and the $340 catch never touches Nessie. Nessie holds the sale, the payouts and September's seeded history.

**Nessie is a sandbox bank, so no real money moves.** The screen says so ("Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved.").

## Where to look

- [`server/routers/b04_bank.py`](../../server/routers/b04_bank.py): the four routes, the seed and the event mapping.
- [`server/routers/b04_nessie.py`](../../server/routers/b04_nessie.py): the Nessie client (base URL discovery, key handling, timeouts, read-back after every create).
- [`src/sources/live/b04-bank.ts`](../../src/sources/live/b04-bank.ts): the adapter that swaps the scripted sale and payouts for the live ones.
- [`tests/server/test_b04_bank.py`](../../tests/server/test_b04_bank.py): tests against a fake Nessie, plus a read-only live test.
- [`docs/plans/B16-bank-books.md`](../../docs/plans/B16-bank-books.md) and the files it names (`server/b16_bank_books/`, which does not exist yet): the catch against the bank. **Planned.**
- [`src/features/money-map/`](../../src/features/money-map/): the picture of money moving between the buyer, Cindia, the co-op and the makers. Built.

## How to run that part

1. Put `NESSIE_KEY` in the environment (the cloud environment) or in `.env` (a Windows machine). Never paste a key into a chat.
2. `npm run server`, then check that `GET /api/health` shows `nessie` as true.
3. Switch on Live in the demo controls. Switching on Live seeds the account first (about 30 posts, up to 30 seconds), so wait about 30 seconds before you play the demo.
4. Play `/demo`. The sale and the payouts post to Nessie, and the balance comes back from it.
5. `npm run test:server` runs the backend tests. The live Nessie test skips when the key is missing.

## The moment in the tour

Planned (`I2-tour`). Times are from [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2. The tour itself is always scripted. The live Nessie postings show up as live twins of the tour's events.
- `d05-pay`, 104 to 120 s: the sale. With Live on, one deposit of $156.48 lands in the account.
- `d06-money`, 130 to 136 s: the money map. The thread from Cindia to the co-op is the settlement, and the balance comes from Nessie.
- `d07-month`, 136 to 146 s: the month, and the catch. With B16 (planned), the flag carries a Nessie ID.
- `d09-approve`, 154 to 161 s: the three maker payouts, posted as withdrawals once approved.

Today's 60-second demo has the same sale, money map and payouts.

## What's live and what's simulated

- **Built, a live run seen, gate not passed:** B04. In a cloud G5 run on Oct 24 at 6:55 PM it passed 12 of 13 checks. One live run missed the receipt status because Nessie's first sale took 1,755 ms. A rerun is queued. Until it passes, the money map plays scripted with the Simulated badge.
- **Planned:** B16, the catch against Nessie and the fund and milestone moves.
- **Simulated by design:** the bank itself. Nessie is a sandbox, and every name on it is fictional.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
