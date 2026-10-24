# B10-derived · Numbers computed from the ledger (F3, F5, F10, F11, F13, F16)

Priority: P2 · Wave: P2 · Depends on: G4 · Folder: server/routers/ · Source key: `b10-derived` · Makes real: F-buyer (the price split and the receipt), F-maker-statement, F-impact, F-audit, F-dashboard · Estimate: 2 h

**SCOPE:** `server/routers/b10_derived.py, src/sources/live/b10-derived.ts, tests/server/test_b10_derived.py, tests/server/b10_records.json`

## Goal

Every number the buyer and the makers see is computed from the records with the money rules, instead of typed into the dataset: the price split, the paid receipt, each maker's statement and the impact numbers. Microsoft and Hyphenate judge whether the numbers come from somewhere.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, and B10
- `docs/common/events.md`: Buyer (`split.shown`, `receipt.updated`), The close (`statement.issued`, `impact.updated`), Sources and live replacement
- `docs/common/data-model.md`: Money rules, MakerStatement, Impact, Demo-critical figures 1 and 8
- `docs/plans/F-buyer.md`, `docs/plans/F-maker-statement.md` and `docs/plans/F-impact.md`
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoint:** `POST /api/b10/derive`. No key.
- **Money rules** in Python, one function per channel, mirroring `data-model.md`. Rates in basis points, half-up rounding once per line.
- **Returns the trigger's own event, recomputed:**
  - `split.shown`: the card fee, platform fee, materials and maker share for the piece on its channel.
  - `receipt.updated`: `paid_to_maker` with `paidDate` once that maker's payout is `sent`, `received` before.
  - `statement.issued` and `impact.updated`: recomputed, with the same IDs.
- **What reaches the screen:** `split.shown` and `receipt.updated` carry their numbers, so they show live results at once. `statement.issued` and `impact.updated` carry only IDs today, so their recomputed numbers reach the screen only once `events.md` gives them payload fields. List that under `needs:`, and meanwhile check in the tests that the recomputed numbers equal the dataset's.
- **Adapter** (`src/sources/live/b10-derived.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b10`.
  - `produce(event)`: post the trigger and the records from `src/mock` and return the result.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The money rules, the four derivations and the route | `server/routers/b10_derived.py` | none | opus |
| T2 | Fixture and tests | `tests/server/b10_records.json`, `tests/server/test_b10_derived.py` | T1 | opus |
| T3 | The live adapter | `src/sources/live/b10-derived.ts` | T1 | opus |

## Acceptance

- `pc_01` on `ch_cindia` splits into a card fee of 552, a platform fee of 1800, materials of 2200 and a maker share of 13448.
- `ord_001`'s receipt reads `paid_to_maker` on `2026-10-02` once `mpo_01` is sent, and `received` before.
- Each maker statement's total equals the sum of its lines, and the held amounts are 9500 for `mkr_01`, 8000 for `mkr_02` and 16500 for `mkr_03`.
- Every gallery line uses the contract's 4000 bps for the maker share, so the held amounts add up to the 34000 short.
- In live mode the buyer's price split and receipt show the server's numbers, and their `Simulated` badge goes away for `b10-derived`.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- Changing any money rule. A rule that looks wrong goes under `needs:`.
- The audit trail's drawer and the dashboard's tiles. They read the same records, and this upgrade only checks their numbers.
