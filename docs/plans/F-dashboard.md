# F-dashboard · The dashboard (F13)

Priority: P1 · Wave: W2 · Depends on: G4 · Folder: src/features/dashboard/ · Made real by: B10

## Goal
As the month closes, a dashboard assembles tile by tile: revenue by channel, maker share, cash and open flags. It reads like a BI report the owner never had to build.

## Read first
- `docs/common/data-model.md`: Units and rules, the Order, Refund, Flag and Channel rows, Money rules, Demo-critical figures 3, 4 and 6.
- `docs/common/events.md`: `ledger.posted`, `flag.raised`, `account.synced`, `month.closed`, the store, and the player clock.
- `docs/common/ui-contract.md`: the `studio.dashboard.main` slot and its source key, the `dashboard` view, Language, Simulated badge, Test hooks.
- `docs/common/design-system.md`: `Panel`, `Money`, `ShareBar`, `chartTheme`, and the motion rule (one assembling motion per tile, on the player clock).
- `docs/common/glossary.md`: balance, flag, maker share, held.

## Interfaces
- Reads:
  - Events: `ledger.posted`, `flag.raised`, `account.synced` (`balanceCents`, `asOf`), `month.closed` (`salesCents`, `feesCents`, `makerPayCents`, `heldCents`).
  - Data: September's orders and the refund through `src/mock/` exports and `getById()`, and the three channels for their names.
  - Store keys: `month`, `money`, `clock`. The language comes from `SlotProps.lang`.
  - UI kit: `Panel` (declaring `b10-derived`), `Money`, `ShareBar`, `chartTheme` for Recharts.
- Emits: nothing.
- Exports: `{ id: "dashboard", slots: { "studio.dashboard.main": Dashboard } }` from `src/features/dashboard/index.ts`.
- Test IDs, all internal to this feature: `dashboard-tiles`, `dashboard-tile-revenue`, `dashboard-revenue-chart`, `dashboard-tile-maker-share`, `dashboard-tile-cash`, `dashboard-tile-flags`.
- Source key: `b10-derived`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Figures: pure selectors for revenue by channel (September's gross by channel, less the refund), maker pay and its share of sales from `month.closed`, cash from the latest `account.synced`, and the count of open flags. Unit tests check the channel totals add up to September's sales less the refund | `src/features/dashboard/figures.ts`, `src/features/dashboard/figures.test.ts` | none | opus |
| T2 | Tiles: the revenue tile with one bar per channel (Recharts with `chartTheme`), and one stat tile component used for maker share (with a `ShareBar`), cash and open flags. Each tile appears once its event has arrived | `src/features/dashboard/RevenueTile.tsx`, `src/features/dashboard/StatTile.tsx`, `tests/features/dashboard-tiles.spec.ts` | T1 | opus |
| T3 | Assemble the grid in event order with one motion per tile, and wire the slot (lead) | `src/features/dashboard/Dashboard.tsx`, `src/features/dashboard/index.ts` | T2 | lead |

Builders run their own spec with `npm run test:feature -- dashboard`, moving the player with `window.__cindia.player.seek()`.

## Acceptance
- Given the player is before `month.started`, then `dashboard-tiles` shows no tiles and a short line that the dashboard builds as the month closes.
- When the player passes the month's first `ledger.posted`, then `dashboard-tile-revenue` appears and `dashboard-revenue-chart` has one bar per channel.
- When the month has closed, then the revenue bars add up to September's sales less the refund, from the dataset.
- When `account.synced` arrives, then `dashboard-tile-cash` shows its `balanceCents` through `Money`.
- When `flag.raised` arrives for `flg_01`, then `dashboard-tile-flags` shows one open flag.
- When `month.closed` arrives, then `dashboard-tile-maker-share` shows `makerPayCents` and its share of `salesCents`.
- After a `seek()` past the close, all four tiles show at once with their final values.
- In scripted mode the dashboard shows `simulated-badge`.

## Out of scope
- The Power BI Desktop file (the spec's stretch goal), filters, drill-downs and other months.
- Computing the figures on the server. That's B10.
