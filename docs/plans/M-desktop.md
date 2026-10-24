# M-desktop · The v1 Sell views at desktop size (v2 migration of nine features)

Priority: P1 · Wave: V2 · Depends on: G1b · Folders: src/features/money-map/, reconcile/, scenario/, close/, impact/, proof/, dashboard/, ask-cindy/, audit/ · Made real by: B01 to B10, unchanged

SCOPE: src/features/money-map/, src/features/reconcile/, src/features/scenario/, src/features/close/, src/features/impact/, src/features/proof/, src/features/dashboard/, src/features/ask-cindy/, src/features/audit/, tests/features/money-map-*, tests/features/reconcile-*, tests/features/scenario-*, tests/features/close-*, tests/features/impact-*, tests/features/proof-*, tests/features/dashboard-*, tests/features/ask-cindy-*, tests/features/audit-*, tests/features/sell-views-lib.ts

## Goal
Every v1 Sell view (money map, the month, the judge's scenario, the close, impact, proof, the dashboard, Ask Cindy and the audit trail) fills the 1440 by 900 Sell frame cleanly, with nothing clipped and nothing sized for the old 1280 by 800 console. The money map also draws v2's new money: the buyer's contribution reaching the community fund, and milestone payments on commissions. Every v1 figure, test ID and Simulated badge stays.

## Read first
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 3: `money.moved` kinds `project_fund` and `milestone`, `mv_0101` onward
  - section 2: Party kind `community_fund`, figure 13
  - section 4: the `studio` surface (Sell site, left nav, `/sell/:view`, drawers), `studio.proof.side` (F-search), cameras `sell-map`, `sell-month`, `sell-catch`, `sell-close`, `sell-proof`
  - section 7: kit `Drawer` (440 px), `PageFrame`
  - section 8: beats `d06-money`, `d07-month`, `d08-catch`, `d10-close`, `d13-proof`
- The v1 plans of the nine features in `docs/plans/` (`F-money-map.md`, `F-reconcile.md`, `F-scenario.md`, `F-close.md`, `F-impact.md`, `F-proof.md`, `F-dashboard.md`, `F-ask-cindy.md`, `F-audit.md`) and their acceptance
- `docs/common/design-system.md`: spacing, mounted panels, `Thread`, `LedgerTable`, `EvidenceCard`, motion on the player clock
- `docs/common/glossary.md`: every label these views already use, plus community project

## Interfaces
- **Reads and emits** exactly what each feature does in v1. Two additions, both in money-map: it reads the new `money.moved` kinds, and it reads the project from `getById()` (title) for a `community_fund` party.
- **Exports:** all nine `index.ts` files stay as they are. The slots don't change.
- **Source keys on the badges:** unchanged.
- **Test IDs:** every v1 one is kept. New internal ones in money-map: `money-map-node-community_fund-<projectId>` (the fund's node, from the existing `money-map-node-<key>` pattern) and the existing `money-map-thread-<moveId>` for `mv_0101` onward.
- **Labels:** v1's, plus "Community fund" for the new party (contract addition 1).

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the community fund node and the two new move kinds' labels in money-map, and any desktop string another folder needs, English and Chinese side by side | src/features/money-map/strings.ts, src/features/reconcile/strings.ts, src/features/scenario/strings.ts, src/features/close/strings.ts, src/features/impact/strings.ts, src/features/proof/strings.ts, src/features/dashboard/strings.ts, src/features/ask-cindy/strings.ts, src/features/audit/strings.ts | none | lead |
| T1 | Spec helper: seek to a timeline event, open a Sell view or drawer by its v2 route, check a test ID is inside `frame-studio` | tests/features/sell-views-lib.ts | none | sonnet |
| T2 | Money map at desktop size, the community fund party and the new move kinds | src/features/money-map/MoneyMap.tsx, src/features/money-map/partyLayout.ts, src/features/money-map/PartyNodes.tsx, src/features/money-map/MoveThreads.tsx, src/features/money-map/threadGroups.ts, src/features/money-map/AccountBalance.tsx, tests/features/money-map-balance.spec.ts, tests/features/money-map-flow.spec.ts, tests/features/money-map-nodes.spec.ts, tests/features/money-map-threads.spec.ts, tests/features/money-map-desktop.spec.ts | T0, T1 | opus |
| T3 | The month and the scenario at desktop size, with the catch fitting the zoom | src/features/reconcile/CatchPanel.tsx, src/features/reconcile/EvidenceTrio.tsx, src/features/reconcile/HandledStrip.tsx, src/features/reconcile/MatchRow.tsx, src/features/reconcile/MonthTimeline.tsx, src/features/reconcile/ReconcileView.tsx, src/features/reconcile/matchLabels.ts, src/features/reconcile/recordRows.ts, src/features/scenario/DropZone.tsx, src/features/scenario/ScenarioPanel.tsx, src/features/scenario/ScenarioResults.tsx, src/features/scenario/useSample.ts, tests/features/reconcile-catch.spec.ts, tests/features/reconcile-flow.spec.ts, tests/features/reconcile-handled.spec.ts, tests/features/reconcile-matches.spec.ts, tests/features/reconcile-month.spec.ts, tests/features/scenario-drop.spec.ts, tests/features/scenario-lib.ts, tests/features/scenario-live.spec.ts, tests/features/scenario-sample.spec.ts | T0, T1 | opus |
| T4 | The close and impact at desktop size | src/features/close/ClosePanel.tsx, src/features/close/CloseTotals.tsx, src/features/close/WorkbookCard.tsx, src/features/impact/CountUp.tsx, src/features/impact/EstimateNote.tsx, src/features/impact/ImpactNumbers.tsx, src/features/impact/ImpactPanel.tsx, tests/features/close-download.spec.ts, tests/features/close-panel.spec.ts, tests/features/impact-estimate.spec.ts, tests/features/impact-numbers.spec.ts | T0, T1 | sonnet |
| T5 | Proof (now two thirds, beside F-search's side panel) and the dashboard at desktop size | src/features/proof/ErrorList.tsx, src/features/proof/ProofPanel.tsx, src/features/proof/Scoreboard.tsx, src/features/proof/SourceList.tsx, src/features/dashboard/Dashboard.tsx, src/features/dashboard/RevenueTile.tsx, src/features/dashboard/StatTile.tsx, tests/features/proof-errors.spec.ts, tests/features/proof-score.spec.ts, tests/features/proof-sources.spec.ts, tests/features/dashboard-tiles.spec.ts | T0, T1 | sonnet |
| T6 | The Ask Cindy and audit drawers at the kit Drawer width | src/features/ask-cindy/AnswerCard.tsx, src/features/ask-cindy/AnswerChart.tsx, src/features/ask-cindy/AskDrawer.tsx, src/features/ask-cindy/AskInput.tsx, src/features/audit/AuditDrawer.tsx, src/features/audit/StartList.tsx, src/features/audit/TrailView.tsx, tests/features/ask-cindy-answer.spec.ts, tests/features/ask-cindy-ask.spec.ts, tests/features/audit-drawer.spec.ts, tests/features/audit-trail.spec.ts | T0, T1 | sonnet |
| T7 | The sweep (lead): run all nine folders' specs and smoke together, fix seams between views, report | none (the nine `index.ts` files are unchanged) | T2 to T6 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 runs next, since every spec imports it.
- T2 to T6 own disjoint files, so they run two at a time (the v2 cap) in any order. T2 and T3 go first, because the tour's money and catch beats depend on them.
- Every spec in the nine folders moves from `/studio/<view>` to `/sell/<view>`, and from fixed beat times to `seekToEvent`, because I2-tour moves every beat while the events and figures stay.

**T1.** `sell-views-lib.ts` exports three helpers:
- `seekToEvent(page, type, match, offsetMs)`: it reads `window.__cindia.player.getTimeline()` and seeks to the first matching event's `at` plus the offset.
- `openSell(page, view, query?)`: it opens `/sell/<view>`, with `?drawer=` when given, and waits for the view's slots to fill.
- `expectInsideFrame(page, testIds)`: it checks each box sits fully inside `frame-studio` and every clipping ancestor.

**T2.** The money map fills its view.
- The SVG keeps its viewBox and scales to the view area, never a fixed pixel size.
- The HTML nodes sit in the same units, so labels stay put at any scale.
- `partyLayout.ts` adds a spot for each `community_fund` party (key `community_fund-<projectId>`), placed where its threads don't cross the studio's. Above the studio, near Cindia, is one option.
- `MoveThreads` draws:
  - `project_fund` moves (buyer to Cindia, Cindia to the fund) with the kit `Thread` in the `in` tone,
  - `milestone` moves (buyer to Cindia, then Cindia to the maker on release) in the `pending` tone until the release, then `in`.
- `PartyNodes` labels the fund with "Community fund" and the project's title.
- Nothing about the six v1 moves or the balance changes.
- `money-map-desktop.spec.ts` checks `d06-money`'s IDs, plus `money-map-thread-mv_0101` and `money-map-thread-mv_0102` when the timeline has them, inside the frame.

**T3.** The month view gives reconcile two thirds and the scenario a third, as v1, on the wider frame.
- `MonthTimeline` and `HandledStrip` stretch to the width without clipping the bundled, refund-netted and carried-over rows during the month beat.
- `CatchPanel` keeps `reconcile-flag`, the three evidence cards and `reconcile-explanation` in one compact box, at most 1060 by 660 px of frame. The `sell-catch` camera zooms to 1.35 on that box, so the whole of it still fits the 1440 by 900 stage.
- The scenario's drop zone and results fit their third.
- `scenario-lib.ts` keeps its sample helpers, now on `/sell/month`.

**T4.** The close view's main panel (close) and side panel (impact) fit two thirds and a third of the wider view. `close-workbook`, `close-totals`, `close-download` and the three impact numbers with their estimate labels sit inside the frame at the end of the close beat. `buildWorkbook.ts` doesn't change.

**T5.**
- `ProofPanel` lays out the scoreboard, the error list and the source list for two thirds of the view, because F-search now fills `studio.proof.side` with the search model's score. With that slot empty, the shell's placeholder sits beside it. `proof-score` and `proof-item-err_01` to `proof-item-err_04` sit inside the frame at the end of the proof beat.
- The dashboard's tiles flow into a grid for the wider frame. `figures.ts` doesn't change.

**T6.** Both drawers use the kit `Drawer`'s width from the shell (440 px). No width is hard-coded in the feature.
- `AnswerChart` sizes to the drawer.
- Long answers and the audit trail scroll inside the drawer body, never the page.
- The specs open `/sell/close?drawer=ask` and `/sell/close?drawer=audit&ref=<id>`.

**T7.** The lead runs, together:
- `npm run test:feature` for each of the nine slugs,
- `npm run test:smoke`,
- a search of the nine folders for leftover console sizes (1280, 800, 400, 390, 844 used as widths or heights).

Every hit is either removed by its task's builder or explained in the report.

## Acceptance
Every spec opens `/sell/<view>` (or the drawer's query), moves the timeline with `seekToEvent`, and checks by test ID only, at 1440 by 900.

1. **Given** 300 ms after the timeline's `account.synced` for `acct_studio` in the money beat, **then** `money-map-canvas`, `money-map-thread-mv_0001`, `money-map-thread-mv_0003` and `money-map-balance` are inside `frame-studio`. **When** the timeline also carries `mv_0101` and `mv_0102`, **then** `money-map-thread-mv_0101`, `money-map-thread-mv_0102` and `money-map-node-community_fund-prj_01` show, with $5.00 on the threads.
2. **Given** 300 ms after the last `match.made` of the month beat, **then** the bundled, refund-netted and carried-over match rows are inside the frame.
3. **Given** 300 ms after the timeline's `flag.explained` for `flg_01`, **then** `reconcile-flag`, `reconcile-evidence-contract`, `reconcile-evidence-statement`, `reconcile-evidence-bank` and `reconcile-explanation` sit inside one box no larger than 1060 by 660 px, and the figures read contract 40%, statement 50%, bank $1,700.00, owed $2,040.00, short $340.00.
4. **Given** 300 ms after the timeline's `impact.updated`, **then** `close-workbook`, `close-totals`, `impact-maker-share`, `impact-days-to-payout` and `impact-hours-saved` are inside the frame, with the estimates labeled.
5. **Given** 300 ms after the timeline's `proof.scored`, **then** `proof-score` reads "Caught 4 of 4" and `proof-item-err_01` to `proof-item-err_04` are inside the left two thirds of the proof view.
6. **Given** `/sell/close?drawer=ask`, **when** the owner asks the first canned question, **then** `ask-cindy-answer` and `ask-cindy-chart` fit inside the drawer with no horizontal scroll. **Given** `/sell/close?drawer=audit&ref=ord_001`, **then** the trail fits the drawer.
7. **Given** scripted mode, **then** every one of these panels shows `simulated-badge`, as in v1.
8. **Given** the Phase A demo and then the tour, **then** every v1 spec of the nine features passes on the `/sell` routes with event-anchored seeks.

## Out of scope
- New views, new events, or any change to the figures. These views only move to the new frame.
- The search model's score beside proof (F-search) and the process views (F-process).
- The design drops' restyle (I3-redesign changes tokens and kit, and these views follow).

## Contract additions needed
1. **Glossary:** "Community fund", 社区基金, code `Party.kind: "community_fund"`, meaning the money a community project has received. It's the money map's node label.
