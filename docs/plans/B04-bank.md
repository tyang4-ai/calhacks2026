# B04-bank · The studio's account on Nessie (F4, F6, F11)

Priority: P2 · Wave: P2 · Depends on: G4 · Folder: server/routers/ · Source key: `b04-bank` · Makes real: F-buyer (the sale posting), F-money-map, the maker payouts · Estimate: 1.5 h

**SCOPE:** `server/routers/b04_bank.py, server/routers/b04_nessie.py, src/sources/live/b04-bank.ts, tests/server/test_b04_bank.py, tests/server/b04_history.json`

## Goal

The studio's money lives in a real Nessie account. September's history is seeded once. In the demo, the buyer's sale posts as a deposit, the maker payouts go out as withdrawals, and the money map's balance is read back from Nessie. This is Capital One's minimum for real use of Nessie.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, and B04
- `docs/common/events.md`: Money, Approvals (`payout.sent`), Sources and live replacement
- `docs/common/data-model.md`: BankTxn, Money rules, Demo-critical figures 1 and 8
- `docs/plans/F-money-map.md` and `docs/plans/F-buyer.md`
- In the vault docs folder: `ch13-tech-stack.md` (Nessie), and `resources/sponsors/ch13-sponsor-capital-one.md` for every endpoint and schema
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoints:** `GET /api/b04/status`, `POST /api/b04/seed`, `POST /api/b04/sale`, `POST /api/b04/payouts`, as in `api-contract.md`. Needs `NESSIE_KEY`.
- **Nessie client** (`server/routers/b04_nessie.py`, a helper module with no `router` of its own):
  - Finds the base URL once per process: the first of `https://api.nessieisreal.com`, `https://prod-api.nessieisreal.com` and `https://qa-api.nessieisreal.com` that answers `GET /accounts`.
  - Passes the key as `?key=` on every call. Every call has a 5-second timeout.
  - After each create, reads the list back to find the new record, since create calls answer with a plain string.
  - Deposits and withdrawals only. Each one has `medium: "balance"`, `transaction_date`, `status: "completed"`, `amount` in cents and a `description`.
- **Seeding:** idempotent. It finds or creates the customer "Gu Embroidery Studio" (a fictional US mailing address) and a Checking account nicknamed "Gu studio operating", then posts September's history once. It does nothing when that account already has deposits.
- **Replaces:** the keyed `order.placed`, the sale's `money.moved`, `account.synced`, `payout.sent` and the `maker_pay` `money.moved`.
- **Adapter** (`src/sources/live/b04-bank.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b04` and `keys.nessie` is true. Then `GET /api/b04/status`. If the account isn't seeded, post `/api/b04/seed` with September's bank history from `src/mock`. This can take up to 30 seconds and happens when live mode is switched on, never inside the demo's 8-second window.
  - `produce(event)`:
    - On the sale (`order.placed` for `ord_001`, or its settlement `money.moved`): post `/api/b04/sale` once and cache it. Each of the two events gets its live twin from that one response.
    - On the first `payout.sent`: post all three maker payouts to `/api/b04/payouts` once. Each `payout.sent` gets its live twin from the cache.
    - On `account.synced`: return the latest synced balance from a sale or payout response, or `[]` before any live call.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The Nessie client | `server/routers/b04_nessie.py` | none | opus |
| T2 | The four routes, the seed logic and the event mapping | `server/routers/b04_bank.py` | T1 | opus |
| T3 | Tests against a fake Nessie (httpx `MockTransport`): seed, idempotent reseed, sale, payouts, a Nessie timeout giving 504, a missing key giving 503. One read-only live test lists accounts. One live probe tries `POST /accounts/{id}/purchases` once and records the status code, without printing anything else | `tests/server/b04_history.json`, `tests/server/test_b04_bank.py` | T2 | opus |
| T4 | The live adapter | `src/sources/live/b04-bank.ts` | T2 | opus |

## Acceptance

- With the key: seeding creates the customer, the account and September's history once. A second seed changes nothing.
- The sale creates one deposit of 15648 cents, and `account.synced` carries Nessie's balance and account ID.
- The payouts create three withdrawals, and the balance afterwards equals the balance before minus their sum.
- Without the key: 503 `key_missing`, `health()` is false, and the money map stays scripted with its `Simulated` badge.
- No key in any log line, response or test output.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- Purchases and transfers, beyond the one probe.
- Posting each of the month's thirty orders live during the demo.
- Any other bank.
