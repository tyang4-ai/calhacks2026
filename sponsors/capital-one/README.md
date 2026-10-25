# Capital One · Best Use of Nessie

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md). Every maker, community and story named here is fictional.

**Met or not:** met in use, not gated. Nessie was used live in two upgrades, B04 (the sale and the payouts) and B16 (the catch and the fund moves). Neither passed a G5 on the tour. Say "live-tested on Nessie's sandbox", never "gated".

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

**What B16 adds** ([`docs/plans/B16-bank-books.md`](../../docs/plans/B16-bank-books.md)). **Built, live specs pass (6 of 6 with B16 live), no G5.**
- **The catch, against the bank.** In live mode the matcher reads the co-op's deposits and withdrawals back from Nessie, so the $340 catch is found against Nessie's own record of the gallery's deposit. The flag carries that deposit's Nessie ID, and its figures equal the scripted flag's.
- **The fund move.** The community fund contribution (`mv_0102` in the tour) posts as a deposit of $5.00 on a fund account, and a milestone release posts as a withdrawal from an account where Cindia holds a commission's money.
- **The operating account stays exact.** B16 never writes the operating account, so B04's balances stay exact.
- **Measured live:** seed 8.3 s, reconcile 1.2 s, fund move 1.9 s (`status.md`, B16 row).
- **How it shows.** The tour is always scripted, so B16 adds a live twin after a scripted event has played, and the twin carries the Nessie ID. A twin is emitted only when its figures equal the scripted ones.

**What is still read from the mock data.** In scripted mode, and in the tour, every figure comes from `src/mock/`. In live mode B04 and B16 post to and read from Nessie.

**Nessie is a sandbox bank, so no real money moves.** The screen says so ("Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved.").

## Where to look

- [`server/routers/b04_bank.py`](../../server/routers/b04_bank.py): the four routes, the seed and the event mapping.
- [`server/routers/b04_nessie.py`](../../server/routers/b04_nessie.py): the Nessie client (base URL discovery, key handling, timeouts, read-back after every create). B16 imports it and writes no client of its own.
- [`src/sources/live/b04-bank.ts`](../../src/sources/live/b04-bank.ts): the adapter that swaps the scripted sale and payouts for the live ones.
- [`tests/server/test_b04_bank.py`](../../tests/server/test_b04_bank.py): tests against a fake Nessie, plus a read-only live test.
- [`server/b16_bank_books/`](../../server/b16_bank_books/) (`books.py` turns Nessie's records into bank records and runs the matcher over them, `accounts.py` finds or creates the fund and held accounts), the router [`server/routers/b16_bank_books.py`](../../server/routers/b16_bank_books.py) and the adapter [`src/sources/live/b16-bank-books.ts`](../../src/sources/live/b16-bank-books.ts).
- [`tests/server/test_b16_bank_books.py`](../../tests/server/test_b16_bank_books.py), and the live feature specs [`tests/features/reconcile-live-bank.spec.ts`](../../tests/features/reconcile-live-bank.spec.ts) and [`tests/features/money-map-live-bank.spec.ts`](../../tests/features/money-map-live-bank.spec.ts).
- [`src/features/money-map/`](../../src/features/money-map/): the picture of money moving between the buyer, Cindia, the co-op and the makers. Green.

## How to run that part

1. Put `NESSIE_KEY` in the environment (the cloud environment) or in `.env` (a Windows machine). Never paste a key into a chat.
2. `npm run server`, then check that `GET /api/health` shows `nessie` as true.
3. Switch on Live in the demo controls. Switching on Live seeds the account first (about 30 posts, up to 30 seconds), so wait about 30 seconds before you play the demo. B16 then seeds its two accounts.
4. Play `/demo`. The sale and the payouts post to Nessie, the balance comes back from it, and the catch and the fund move get their live twins with a Nessie ID.
5. `npm run test:server` runs the backend tests. The live Nessie tests skip when the key is missing.

## The moment in the tour

Beat IDs and times are from [`docs/common/demo-script.md`](../../docs/common/demo-script.md). The tour itself is always scripted. The live Nessie postings show up as live twins of the tour's events.
- `d05-pay`, 104 to 120 s: the sale. With Live on, one deposit of $156.48 lands in the account.
- `d06-money`, 130 to 136 s: the money map. The thread from Cindia to the co-op is the settlement, and the balance comes from Nessie. The $5.00 community fund move (`mv_0102`) plays at 134.8 s.
- `d07-month`, 136 to 146 s: the month, and the catch. With B16, the flag carries a Nessie ID.
- `d09-approve`, 154 to 161 s: the three maker payouts, posted as withdrawals once approved.

## What's live and what's simulated

- **Built and live-tested, no G5 pass:** B04. In the cloud G5 on Oct 24 at 6:55 PM it passed 12 of 13 checks, and in the worktree at 12:45 AM it passed 11 of 13. Both misses were v1 harness timing checks (live run 1 missed the receipt status because Nessie's first sale took 1,755 ms, and a later run failed a clock step). B04's own live calls held, and its live pytest passed.
- **Built and live-tested, no G5 pass:** B16 (the catch against Nessie and the fund and milestone moves). The G5 didn't fit before the freeze.
- **Simulated by design:** the bank itself. Nessie is a sandbox, and every name on it is fictional. The tour plays scripted in both modes.

The full list is in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md).

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
