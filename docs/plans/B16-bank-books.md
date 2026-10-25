# B16-bank-books · The books checked against the bank, on Nessie

Priority: P1 · Wave: V2 · Depends on: B04-bank (its Nessie module and its seeded operating account), B01-match (`reconcile_month`), I2-core (the `b16-bank-books` source key, `onEvent` from `src/core/store`, `nessieId` on `flag.raised`), R0-reskin (the co-op's names on B04's account) · Folder: `server/b16_bank_books/` · Source key: `b16-bank-books` · Makes real: the $340 catch found against Nessie's bank records, the community fund move as a Nessie deposit, the milestone release as a Nessie withdrawal (C-5) · Estimate: 1.5 h

**SCOPE:** `server/routers/b16_bank_books.py, server/b16_bank_books/, src/sources/live/b16-bank-books.ts, tests/server/test_b16_bank_books.py, tests/server/b16_fixture.json`

## Goal

The Capital One track asks how complete and how central Nessie is. In v1, B04 keeps the co-op's operating account on Nessie, but the matcher reads its bank records from `src/mock`, so the catch never touches Nessie, and v2's new money never reaches it. B16 closes both gaps in live mode:

- **The catch, against the bank.** When the month's short payment is flagged, B16 reads the co-op's deposits and withdrawals back from Nessie, runs B01's matcher over them, and confirms the gallery paid $340 less than the contract says, against Nessie's own record of the deposit. The flag then carries that deposit's Nessie ID.
- **The fund moves, on the bank.** The community fund contribution posts as a deposit on the co-op's community fund account, and a milestone release posts as a withdrawal from the account where Cindia holds a commission's money.

Every number stays v1's and the data's (fix-plan 1.1). Nessie is a sandbox bank with no real money (fix-plan 1.6, A2 L29), and every name on it is fictional.

The tour is always scripted (fix-plan 1.2). B16 replaces no tour event. In live mode it watches the store, checks or posts what already played, and adds a live twin that carries the Nessie ID, so the scripted figures land on time and then show that the bank agrees.

## Read first

- `docs/v2/fix-plan.md` sections 1.1, 1.2, 1.4 and 1.6. Where it disagrees with `docs/v2/contracts.md`, the fix plan wins until FX1 lands its contract changes.
- `docs/common/api-contract.md` B01 and B04 (the Nessie rules: `?key=`, deposits and withdrawals only, read back after every create), and `docs/v2/contracts.md` section 3 (`money.moved` kinds `project_fund` and `milestone`, figure 13) and section 11 (the milestone grant's scripted answer)
- `docs/plans/B04-bank.md`, `server/routers/b04_nessie.py` (the client B16 imports) and `server/routers/b04_bank.py` (the account it reads, `ACCOUNT_NICKNAME`, and how its seed writes each line's description as `<memo> (<id>)`)
- `docs/plans/B01-match.md` and `server/routers/b01_match.py` (`reconcile_month`, and how the route keeps the trigger's `flagId`)
- `docs/spec/nessie/ch13-nessie-openapi-spec.yaml` and `docs/v2/apis-and-accounts.md`, the Nessie section
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Nessie access:** B16 imports `server/routers/b04_nessie.py` for every call (its key handling, base URL discovery, `Budget`, timeouts and errors) and never writes its own client. It finds the co-op's operating account the way B04 does, by `b04_bank.ACCOUNT_NICKNAME`, and the co-op's customer from that account's `customer_id`. It needs `NESSIE_KEY` (503 `key_missing` without it).
- **Accounts:** B04's operating account, untouched, so v1's balances stay exact. B16 adds two accounts under the same fictional customer, found or created by nickname:
  - `Community fund prj_01`: the co-op's community fund, opened at 0.
  - `Commissions held by Cindia`: where Cindia holds a commission's money until each milestone is approved. B16's seed opens it with one deposit of `wip_01`'s `priceCents` from the request, described `Commission wip_01 paid in`, dated `2026-09-01`.

  Withdrawals for the milestone come from this account, so the operating account's balance, which B04 checks against `balanceAsOf()`, never moves.
- **Reading the bank side** (`books.py`): each Nessie deposit and withdrawal on the operating account becomes a `BankTxn` (`data-model.md`):
  - `id` is the scripted ID in the `(…)` at the end of the description B04's seed wrote, or `nessie_<_id>` when there's none,
  - `direction` is `in` for deposits and `out` for withdrawals, `date` is `transaction_date`'s day, `amountCents` is `amount`,
  - `memo` is the description without the ID, and `refId` is the payout, purchase or maker payout ID that ends the memo when there is one, otherwise the scripted ID.
  - A cancelled record is left out, as B04 does.
- **Endpoints** (`server/routers/b16_bank_books.py`, `router = APIRouter(prefix="/api/b16")`, all needing `NESSIE_KEY`), in v1's line format:

  **`GET /api/b16/status`** · `NESSIE_KEY` · under 300 ms, answered from a cache that a background thread refreshes every 30 seconds in live mode (one account list, then the two new accounts' deposits and withdrawals) · returns `{ "operating": boolean, "seeded": boolean, "fundAccountId": string | null, "heldAccountId": string | null, "fundBalanceCents": number | null, "heldBalanceCents": number | null }`. `operating` is true when B04's operating account exists and its opening deposit is there. `seeded` is true when both B16 accounts exist and the held account's opening deposit is there. Not an events response. It never returns the key or a URL.

  **`POST /api/b16/seed`** · `NESSIE_KEY` · up to 20 seconds, called once by the adapter's `health()` in live mode, after B04's seed · Request: `{ "trigger": null, "commission": { "wipId": "wip_01", "priceCents": 0 } }`, from `worksInProgress` in `src/mock` · finds the co-op's customer through B04's account, finds or creates the two accounts, and posts the held account's opening deposit once, reading the list back after each create. Idempotent by nickname and description, and single flight. Returns `{ "events": [] }`. Without B04's account, 404 `not_found`: "The co-op's Nessie account isn't set up yet, so B04 seeds it first."

  **`POST /api/b16/reconcile`** · `NESSIE_KEY` · under 5 seconds · Request: B01's body, `{ "trigger": { "...": "the flag.raised to check" }, "monthId": "2026-09", "records": { "orders": [], "payouts": [], "refunds": [], "statements": [], "contracts": [] } }`. `records.bankTxns` is ignored when sent · reads the operating account's deposits and withdrawals, turns them into `BankTxn`s, and runs `reconcile_month()` imported from `server/routers/b01_match.py` over the request's records plus Nessie's bank side. Returns every `flag.raised` the matcher finds, keyed `b16-bank-books`, each with `nessieId`, the Nessie `_id` of the deposit the statement was checked against. A flag of the trigger's kind on the trigger's statement keeps the trigger's `flagId`, as B01's route does. It returns no `match.made`, because the bank side changes only the consignment check.

  **`POST /api/b16/moves`** · `NESSIE_KEY` · under 6 seconds · Request: `{ "trigger": { "...": "the money.moved to post" } }` · a move of kind `project_fund` whose `to` is a `community_fund` posts as a deposit on the fund account, and a move of kind `milestone` posts as a withdrawal from the held account. Any other move is 400 `bad_request`. The description is `Community fund <refId> (<moveId>)` or `Milestone release <refId> (<moveId>)`, so a replay reuses the record instead of posting it twice. It reads the list back and checks the amount, then returns the trigger's `money.moved` with the same payload plus `nessieId`, keyed `b16-bank-books`.

  One request at a time writes to Nessie (B04's write lock pattern, with B16's own lock). Nessie errors give 502 `upstream_error`, its timeouts 504 `upstream_timeout`. When the bank answer disagrees with the event (a different amount, a missing record), the endpoint returns `{ "events": [] }`, so the scripted figure stays and keeps its Simulated badge.
- **Events:** `source: "live"`, `key: "b16-bank-books"`, `at` copied from the trigger. IDs are `evt_live_` plus a number made of `16`, the process start time in seconds modulo 1,000,000, and a four-digit counter (D1-52). B16 never emits `account.synced`, because the money map's balance follows the newest synced account and must stay the co-op's operating balance.
- **The events B16 keys** (for FX1's contracts): B16 sends only live twins, both keyed `b16-bank-books`:
  - `flag.raised`, the month's `short_payment` flag re-checked against Nessie, with `nessieId`,
  - `money.moved`, the community fund move (`mv_0102` in the tour) and a milestone release, each with `nessieId`.

  **B16's keyed tour events: none.** No timeline event and no Requests row is keyed `b16-bank-books`, so it needs no `ALLOWED_EMPTY_FALLBACKS` entry, and the registry never waits on it during the tour.
- **Adapter** (`src/sources/live/b16-bank-books.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b16` and `keys.nessie` is true, then `GET /api/b16/status`. When `operating` is false, answer false, because B04's adapter seeds that account first. When `seeded` is false, start `POST /api/b16/seed` in the background (fetch timeout 20 seconds) and answer false until it's done, retried after 20 seconds on a failure (B04's pattern).
  - `produce()` returns `[]` at once and makes no network call, so any event that reaches it plays scripted on time (FX5's rule for every v2 adapter).
  - `start(emit)`: listens with `onEvent` from `src/core/store` and acts only after an event is already in the store, so the tour never waits on it. One request at a time in arrival order, each fetch aborting at 7.5 seconds:
    - **The catch:** for a `flag.raised` of kind `short_payment` not keyed `b16-bank-books`, once per `flagId` per page load, it posts `/api/b16/reconcile` with the month's records from `src/mock` (built as the B01 adapter builds them, without `bankTxns`) and the event as the trigger. It emits the returned flag only when it has a `nessieId` and its `expectedCents`, `actualCents`, `deltaCents` and `recordIds` equal the event's, so the demo-critical $340 is exactly the one Nessie confirms.
    - **The fund moves:** for a `money.moved` of kind `project_fund` to a `community_fund`, or of kind `milestone`, that has no `nessieId` and isn't keyed `b16-bank-books`, once per `moveId` per page load, it posts `/api/b16/moves` and emits the returned move only when its payload equals the event's plus `nessieId`.
    - A failure is dropped quietly, because the scripted event already played.
    - It returns a stop function that unsubscribes and keeps the sets of what it posted, so a health flap never posts twice.
  - The registry re-stamps the `at` of `start(emit)` events (I2-core). The month and money reducers keep a record's first `at` and take the newer payload, so the flag and the stitch don't restart, and they gain the Nessie ID.
  - It edits no other adapter. B01's and B04's adapters keep their v1 behavior.
- **Process status:** `bridge.set_process("money", ...)` and `("reconcile", ...)` around a post or a check, when B13's bridge is importable.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b16_bank_books.py`, with Nessie faked through `b04_nessie.set_transport()` and an httpx `MockTransport` holding the seeded account from `tests/server/b16_fixture.json`, and the fake keys from conftest's autouse fixture. No test calls out, except the one marked `live`.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `books.py`: Nessie records to `BankTxn`s, and the reconcile over them with `reconcile_month()`. Tests: the fixture's seeded descriptions map back to the scripted IDs and refIds, a cancelled record is left out, the fixture's month gives `flg_01` with the same expected, actual and delta as the scripted flag (the $340, 34000 cents) and the gallery deposit's `nessieId` | `server/b16_bank_books/__init__.py`, `server/b16_bank_books/books.py`, `tests/server/b16_fixture.json` | B04 and B01 importable | opus |
| T2 | `accounts.py`: the co-op's customer through B04's account, the two accounts found or created by nickname, the held account's opening deposit, the deposit and withdrawal posts with read-back, and the status cache. Tests: a second seed creates nothing, a replayed move reuses its record, a move of another kind is refused, the operating account is never written | `server/b16_bank_books/accounts.py` | T1 | opus |
| T3 | The four endpoints, the write lock, the error shapes and the event envelope. Tests: every response validates against the contract, a bad body is 400, no B04 account gives 404 on seed, a Nessie timeout gives 504, a disagreeing amount gives `{ "events": [] }`, no log line or error carries the key or a URL. One `live` test (skipped without `NESSIE_KEY`) seeds, posts one community fund move, and reconciles the fixture month against the real sandbox | `server/routers/b16_bank_books.py` | T2 | opus |
| T4 | The live adapter: `health()` with the background seed, and the `start(emit)` watch for the catch and the two kinds of move | `src/sources/live/b16-bank-books.ts` | T3 | sonnet |

## Acceptance

- Given the seeded fixture account, when `POST /api/b16/reconcile` runs on September's records without `bankTxns`, then it returns one valid `flag.raised` for `flg_01` with `expectedCents`, `actualCents` and `deltaCents` equal to v1's figures and a `nessieId`, keyed `b16-bank-books`.
- Given live mode with Nessie seeded, when the month's short payment is flagged, then a live twin of the same flag arrives with a `nessieId`, and the flag's figures on screen don't change.
- Given the tour's `mv_0102` in live mode, then one deposit of 500 cents lands on the community fund account, and a live twin of `mv_0102` arrives with its `nessieId`. Replaying the tour posts nothing new.
- Given a person's grant of `apr_05` in live mode, when the scripted milestone answer plays, then one withdrawal of that milestone's amount leaves the held account, and the move's live twin carries its `nessieId`.
- Given any B16 call, then B04's operating account gets no new record, so B04's `account.synced` figures stay exact.
- Given Nessie down or a disagreeing amount, then no twin is emitted and the scripted figures keep their Simulated badge.
- Given no `NESSIE_KEY`, then every endpoint answers 503 `key_missing` and `health()` is false.
- `npm run test:server` passes. **G5 for v2** (fix-plan 1.4) passes as `npm run gate -- G5 b16-bank-books tests/features/money-map-live-bank.spec.ts tests/features/reconcile-live-bank.spec.ts`: `npm run test:server`, then those two live feature specs, which M-desktop's feature-lead writes: `money-map-live-bank.spec.ts` (a person's grant of `apr_05` in live mode, and `/demo?start=d05-pay` in live mode, each bring a move twin with a `nessieId`) and `reconcile-live-bank.spec.ts` (`/demo?start=d07-month` in live mode brings the flag's twin with a `nessieId` and the same figures), with every event valid, and the scripted tour still passing with `b16-bank-books` in live mode.

## Out of scope

- Moving real money, or anything on a real bank.
- Purchases and transfers, which Nessie can't create.
- Changing B01's, B04's or B08's routers or adapters. B16 reads B04's account and imports B01's matcher, and that's all.
- A Nessie account per maker. Maker payouts stay v1's withdrawals from the operating account.

## Contract additions needed

FX1 writes these into `docs/v2/contracts.md`. I2-core merges them.
- Section 3: `SourceKey` adds `"b16-bank-books"`. `flag.raised` adds `nessieId?: string`, the Nessie deposit the statement was checked against, set only by B16. `money.moved`'s `nessieId?` is set by B04 and by B16. The events B16 keys are live twins of `flag.raised` and `money.moved` (above), and no timeline event or Requests row is keyed `b16-bank-books`.
- Section 5, a new B16 section with the four endpoints above in this line format, the two accounts, and the rule that B16 never writes B04's operating account and never emits `account.synced`.
- Section 11: the milestone grant's `money.moved` (kind `milestone`) is posted by B16 as a withdrawal from `Commissions held by Cindia` in live mode. Its `from` stays Cindia.
- `tests/demo/beats.ts` (I2-tour T6): `REQUIRED_KEYS` has `b16-bank-books: nessie`.
- M-desktop's feature-lead writes `tests/features/money-map-live-bank.spec.ts` and `tests/features/reconcile-live-bank.spec.ts` for this G5, and the evidence card and the money map show "Checked against Nessie" when a flag or a move has a `nessieId` (M-desktop's strings).
- R0-reskin's backend task renames B04's constants (the customer, `ACCOUNT_NICKNAME`, the opening description) to the co-op's, which B16 reads by import.
- The v2 README's plan table and the runbook queue add B16 after B04 is live (FX1, FX9).
