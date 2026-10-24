# B03-proof · The proof panel scores the matcher (F15)

Priority: P2 · Wave: P2 · Depends on: G4, B01 green · Folder: server/routers/ · Source key: `b03-proof` · Makes real: F-proof · Estimate: 1 h

**SCOPE:** `server/routers/b03_proof.py, src/sources/live/b03-proof.ts, tests/server/test_b03_proof.py, tests/server/b03_month.json`

## Goal

"Caught 4 of 4" becomes a score the server earns. It runs B01's matcher over the month and checks each planted error against the answer key. Hyphenate asks for proof that it works, and this is it.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, B01 and B03
- `docs/common/events.md`: Proof, Ask Cindy, the scenario (`proof.scored`), Sources and live replacement
- `docs/common/data-model.md`: Planted errors and the answer key
- `docs/plans/B01-match.md` and `docs/plans/F-proof.md`
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoint:** `POST /api/b03/score`. No key.
- **Uses:** `reconcile_month()` imported from `server/routers/b01_match.py`. B03 never changes the matcher. A matcher bug goes under `needs:` for B01.
- **When an error counts as caught:**
  - `err_01`: a `short_payment` flag on the answer key's records with its expected, actual and delta amounts. The trusted record isn't part of `flag.raised`, so the score can't check it
  - `err_02`: a `bundled` match whose records are exactly the three orders and their payout
  - `err_03`: a `refund_netted` match that includes `rfd_001`
  - `err_04`: a `carried_over` match on the late payout with `ord_025` and `ord_026`. `match.made` has no month field, so the kind stands for "into `2026-10`"
- **Returns:** one `proof.scored` with `caught`, `total` and one result per planted error.
- **Adapter** (`src/sources/live/b03-proof.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b01` and `b03`.
  - `produce(event)`: for the keyed `proof.scored`, post the month's records and the answer key from `src/mock` and return the result.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The route and the caught rules | `server/routers/b03_proof.py` | B01 green | opus |
| T2 | Fixture and tests, including a tampered month (the refund removed) that must score 3 of 4 with `err_03` not caught | `tests/server/b03_month.json`, `tests/server/test_b03_proof.py` | T1 | opus |
| T3 | The live adapter | `src/sources/live/b03-proof.ts` | T1 | opus |

## Acceptance

- The fixture month scores `caught: 4`, `total: 4`.
- The tampered month scores 3 of 4 and marks `err_03` as not caught, which shows the score is real.
- In live mode the proof panel shows the server's score, and its `Simulated` badge goes away for `b03-proof`.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- New planted errors, changes to the answer key, and any change to the matcher.
