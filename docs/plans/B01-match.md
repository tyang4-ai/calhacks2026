# B01-match · The matcher (F7, F8)

Priority: P2 · Wave: P2 · Depends on: G4 · Folder: server/routers/ · Source key: `b01-match` · Makes real: F-reconcile · Estimate: 2 h

**SCOPE:** `server/routers/b01_match.py, src/sources/live/b01-match.ts, tests/server/test_b01_match.py, tests/server/b01_month.json`

## Goal

Cindy's matching becomes real. A Python matcher reads September's orders, payouts, refunds, the gallery statement and the bank records, and finds the same matches and the same $340 flag the month view shows. The screens don't change. Hyphenate and Microsoft judge how real this is, and B03 and B05 reuse the matcher.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, and B01
- `docs/common/events.md`: The month, Sources and live replacement
- `docs/common/data-model.md`: Money rules, Demo-critical figures, Planted errors and the answer key
- `docs/plans/F-reconcile.md`: which events the month view renders
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoint:** `POST /api/b01/reconcile`, exactly as in `api-contract.md`. No key.
- **Replaces:** every scripted `match.made` and `flag.raised` with key `b01-match` in `src/mock/timelines/month.ts`.
- **Returns:** `match.made` and `flag.raised` events, scripted `matchId` and `flagId` kept for the same anchor record.
- **Python API for other upgrades:** `reconcile_month(month_id: str, records: dict) -> list[dict]` in `server/routers/b01_match.py`. A pure function with no I/O, returning event payloads in date order. B03 and B05 import it.
- **Adapter** (`src/sources/live/b01-match.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b01`.
  - `produce(event)`: on the first keyed event of a month, post the month's records from `src/mock` once and cache the promise. For each keyed event, return the live event with the same `matchId` or `flagId`, or `[]` when the matcher has none, so the scripted one plays.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `reconcile_month()` and the route: one-to-one, bundled (2 to 4 orders before the payout date), refund netted, carried over (payout after the month's last day), and the consignment check against the contract and the bank | `server/routers/b01_match.py` | none | opus |
| T2 | Fixture from the demo-critical figures, and contract tests | `tests/server/b01_month.json`, `tests/server/test_b01_match.py` | T1 | opus |
| T3 | The live adapter, with the 7.5-second fetch abort and the per-month cache | `src/sources/live/b01-match.ts` | T1 | opus |

## Acceptance

- Given the fixture month, `POST /api/b01/reconcile` returns:
  - one `bundled` match covering `ord_015`, `ord_016` and `ord_017`
  - one `refund_netted` match on `[pay_017, ord_021, rfd_001]`: the payout carries `ord_021` less the refund `rfd_001` for `ord_020`, as the answer key gives it
  - one `carried_over` match for the late payout of `ord_025` and `ord_026` (`match.made` has no month field, so the kind is what says it counts in `2026-10`)
  - one `short_payment` flag whose `recordIds` are `ctr_gallery_01`, `stm_gallery_2026_09` and the gallery's bank deposit, with `expectedCents` 204000, `actualCents` 170000 and `deltaCents` 34000. Which record to trust isn't part of `flag.raised`. B02's `flag.explained` carries it
  - a `one_to_one` match for every Cindia order
- Every returned event validates against `events.md`, with `source: "live"` and `key: "b01-match"`.
- A body without `records` returns 400 with the error shape and code `bad_request`.
- In live mode the month view shows the same matches and the flag, and its `Simulated` badge goes away for `b01-match`.
- `npm run test:server` passes, the scripted demo still passes `npm run test:demo`, and G4 passes in live mode.

## Out of scope

- Matching across months other than the late payout, other currencies, editing records.
- Any change to the month view or to `src/mock`. A dataset problem goes under `needs:`.
