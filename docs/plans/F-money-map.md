# F-money-map · Money map (F6)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/money-map/ · Made real by: B04

## Goal
A judge sees the buyer's $180.00 travel as thread: into Cindia, the card fee peeling off, the rest landing in the studio's bank account, and later the makers getting paid. It is the one memorable motion in the product, so it has to be clear and calm.

## Read first
- `docs/common/events.md`: the Money section (`money.moved`, `account.synced`, `Party`), the store, sources and the Simulated rule
- `docs/common/data-model.md`: the money rules, Studio, Person, demo-critical figures 1 and 8
- `docs/common/ui-contract.md`: `studio.map.main`, the console's `map` view, the `buyer-studio` camera, the money-map test IDs
- `docs/common/design-system.md`: `Thread` (the stitch and its motion token), `Money`, `MakerMark`, `Panel`, `Badge`, color rules
- `docs/common/demo-script.md`: beat `d05-money`, and `d08-approve` for the maker-pay moves
- `docs/common/glossary.md`: money map, thread, balance, payout, maker payout

## Interfaces
- **Reads events** through `useCindia()`: `money.moved` (every move in arrival order) and `account.synced` (the latest one). Also reads `sources`. The language comes from `SlotProps.lang`.
- **Reads data** with `getById()`: the studio `std_gu`, the makers named in a move's `Party` (`mkr_01` to `mkr_03`, name and `surnameChar`), and the move's `refId` when a label needs it (for example `pay_001`).
- **Emits:** nothing.
- **Exports:** `src/features/money-map/index.ts` default-exports `{ id: "money-map", slots: { "studio.map.main": MoneyMap } }`, typed with `FeatureModule` from `src/core/featureTypes.ts`.
- **Source key on the badge:** `b04-bank`. While it is `"scripted"`, the panel shows `simulated-badge`. Once it is `"live"`, the badge goes and the balance is labeled as the studio's account on Nessie.
- **Test IDs:** `money-map-canvas`, `money-map-balance`, `money-map-thread-<moveId>` (one per `money.moved`, for example `money-map-thread-mv_0001`). Internal to this feature: `money-map-node-<party kind>` for party nodes, with the maker's ID added for makers (`money-map-node-maker-mkr_01`).
- **Labels from the glossary:** money map, money flow, balance, payout, maker payout, card fee, Cindia fee, plus the party names (buyer, card network, studio, gallery, card processor, supplier, and each maker by name). Cindia as a party has no glossary row yet: label it "Cindia" in both languages, the way the glossary writes Cindy, keep it in `strings.ts` (T0), and list it under `needs:` so the integrator can add the row. Don't block on it.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): every short string these screens need that the glossary lacks, English and Chinese side by side | src/features/money-map/strings.ts | none | lead |
| T1 | Party layout and nodes | src/features/money-map/partyLayout.ts, src/features/money-map/PartyNodes.tsx, tests/features/money-map-nodes.spec.ts | T0 | opus |
| T2 | One thread per move | src/features/money-map/threadGroups.ts, src/features/money-map/MoveThreads.tsx, tests/features/money-map-threads.spec.ts | T1 (the anchor points from `partyLayout.ts`) | opus |
| T3 | Balance and account label | src/features/money-map/AccountBalance.tsx, tests/features/money-map-balance.spec.ts | T0 | opus |
| T4 | Assemble the map and fill the slot (lead) | src/features/money-map/MoneyMap.tsx, src/features/money-map/index.ts, tests/features/money-map-flow.spec.ts | T1 to T3 | lead |

**How the tasks fit:** the lead writes T0 before spawning any builder, because `design-system.md` puts a feature's short UI strings in its own `strings.ts`. A builder that needs a string T0 lacks lists it under `needs:`, and the lead adds it. Builders run `npm run check:scope` on their files and write their spec. The specs run for the first time once T4 fills the slot, and the lead sends any failure back to the builder who owns the file.

**T1.** `partyLayout.ts` is a pure function from a party (`Party.kind` and `id`) to a fixed point on a 1000 by 600 canvas and back to its anchor for threads. Money comes in from the left (buyer, Cindia, the card processor, the gallery), the studio account sits in the middle, the three makers stand on the right, the card network sits above Cindia so fees peel upward, and the supplier sits below the studio. `PartyNodes` draws each party that appears in at least one move, plus the studio and the three makers from the start, with `MakerMark` for makers. A node shows money that stayed with it (in minus out) when that isn't zero, so Cindia's $18.00 fee shows without a thread of its own.

**T2.** `threadGroups.ts` groups moves by their two parties, in arrival order. `MoveThreads` draws one kit `Thread` per move with `money-map-thread-<moveId>`, from the source anchor to the destination anchor, with the amount at its midpoint. Moves between the same two parties share one path: the newest is drawn full, older ones stay on the path faded, and the label shows the pair's running total. The stitch follows the player clock through the kit's motion helpers, so a `seek()` past a move shows its thread fully sewn.

**T3.** `AccountBalance` shows the latest `account.synced` in `money-map-balance`: the balance with `Money` and the as-of date. Before the first sync it shows the studio's name and a quiet "no balance yet" line. When `sources["b04-bank"]` is `"live"` it adds the account-on-Nessie label.

**T4.** `MoneyMap` puts the canvas (`money-map-canvas`), the nodes, the threads and the balance in one kit `Panel` that declares `b04-bank`. `index.ts` exports the module. `money-map-flow.spec.ts` follows `d05-money` from start to end.

## Acceptance
Every spec opens `/studio/map`, moves the demo timeline with `window.__cindia.player.seek(ms)` to the moment named (beat times are in `demo-script.md`), and checks by test ID only.

1. **Given** the start of `d05-money`, **then** `money-map-canvas` shows the studio and the three makers, and no thread yet.
2. **Given** the end of `d05-money`, **then** `money-map-thread-mv_0001` (buyer to Cindia, $180.00), `money-map-thread-mv_0002` (Cindia to the card network, $5.52) and `money-map-thread-mv_0003` (Cindia to the studio, $156.48) are all drawn and fully sewn, and the Cindia node shows the $18.00 it kept.
3. **Given** the end of `d05-money`, **then** `money-map-balance` shows the balance and date from the `account.synced` at 18.5 seconds.
4. **Given** the end of `d08-approve`, **then** `money-map-thread-mv_0004`, `mv_0005` and `mv_0006` run from the studio to each maker, each with the amount of that maker's payout.
5. **Given** two moves between the same two parties, **then** both test IDs exist on one path, and the label shows their total.
6. **Given** scripted mode, **then** the panel shows `simulated-badge`. **Given** `sources["b04-bank"]` set to `"live"` through `window.__cindia.emit()` of a live `account.synced`, **then** the badge is gone and the Nessie label shows.
7. **Given** a `seek()` to any moment, **then** the same screen renders every time, with no randomness and no wall-clock time.

## Out of scope
- Calling Nessie or any bank (B04 does that in `src/sources/live/b04-bank.ts`).
- Charts, tables or a transaction list. The ledger belongs to F-reconcile and F-close.
- Panning, zooming or dragging nodes. The camera does the zooming on `/demo`.
