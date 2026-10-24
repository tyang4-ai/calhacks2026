# F-impact · Impact numbers (F16)

Priority: P0 · Wave: W1 · Depends on: G2 · Folder: src/features/impact/ · Made real by: B10

## Goal
When the month closes, three numbers count up beside the books: the maker's share of each sale, days from close to payout, and bookkeeping hours saved. Each one is labeled an estimate, so Gordon can say how he would measure impact with a real studio.

It's P0 because Anthropic's track asks how the project's impact on its community would be measured.

## Read first
- `docs/common/data-model.md`: the Impact row (`imp_2026_09`), Units and rules (basis points), and `src/mock/impact.ts` in the files table.
- `docs/common/events.md`: `impact.updated`, the store, and the player clock.
- `docs/common/ui-contract.md`: the `studio.close.side` slot and its source key, the `close` view, Language, Simulated badge, Test hooks, and the test IDs below.
- `docs/common/design-system.md`: `Panel`, the type scale, and motion (count-ups follow the player clock and respect reduced motion).
- `docs/common/glossary.md`: impact, maker share, days to payout, hours saved, estimate.
- `docs/common/demo-script.md`: `impact.updated` at 45.5 in `d09-close`, and After the 60 seconds, item 3.

## Interfaces
- Reads:
  - Events: `impact.updated` (`impactId`).
  - Data: the Impact entity through `getById(impactId)`: `makerShareBps`, `daysCloseToPayout`, `daysCloseToPayoutBefore`, `bookkeepingHoursSaved`, `estimate`.
  - Store keys: `impact`, `clock`. The language comes from `SlotProps.lang`.
  - UI kit: `Panel` (declaring `b10-derived`), the motion helpers.
- Emits: nothing.
- Exports: `{ id: "impact", slots: { "studio.close.side": ImpactPanel } }` from `src/features/impact/index.ts`.
- Test IDs: `impact-maker-share`, `impact-days-to-payout`, `impact-hours-saved`. Internal to this feature: `impact-estimate-note`.
- Source key: `b10-derived`.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The three numbers: a count-up driven by the player clock (final at once after a `seek()` or with reduced motion), basis points shown as a percent with one decimal, days shown with the before value beside them, hours as a whole number. Before `impact.updated` each shows a dash, not zero | `src/features/impact/ImpactNumbers.tsx`, `src/features/impact/CountUp.tsx`, `src/features/impact/formatBps.ts`, `tests/features/impact-numbers.spec.ts` | none | opus |
| T2 | The estimate note: the glossary's estimate label on each number while `estimate` is true, and a one-line note that these are estimates until a real studio's month replaces them | `src/features/impact/EstimateNote.tsx`, `tests/features/impact-estimate.spec.ts` | none | opus |
| T3 | Assemble the panel and wire the slot (lead) | `src/features/impact/ImpactPanel.tsx`, `src/features/impact/index.ts` | T1, T2 | lead |

T1 and T2 run side by side. Builders run their own spec with `npm run test:feature -- impact`, moving the player with `window.__cindia.player.seek()`.

## Acceptance
- Given the player has passed `impact.updated`, then `impact-maker-share` shows the Impact entity's `makerShareBps` as a percent with one decimal.
- Then `impact-days-to-payout` shows `daysCloseToPayout`, with `daysCloseToPayoutBefore` beside it as the before value.
- Then `impact-hours-saved` shows `bookkeepingHoursSaved`.
- Given the player is before `impact.updated`, then all three show a dash.
- Given reduced motion, or after a `seek()` past the event, the three show their final values with no count-up.
- While `estimate` is true, `impact-estimate-note` is shown.
- In scripted mode the panel shows `simulated-badge`.
- Every value on screen equals the dataset's field. No number is typed into a component.

## Out of scope
- Computing the numbers from the ledger. That's B10.
- Charts, trends across months, and comparisons with other studios.
