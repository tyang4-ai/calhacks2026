# M-desktop · The v1 Sell views at desktop size (v2 migration of nine features)

Priority: P0 · Wave: V2 · Depends on: G1b, G2b (acceptance 1 reads the fund parties' projects from S3) · Runs right after M-approvals, with T2 and T3 first, and I2-tour waits for it (C-11) · Folders: src/features/money-map/, reconcile/, scenario/, close/, impact/, proof/, dashboard/, ask-cindy/, audit/ · Made real by: B01 to B10, unchanged, and B16 (in live mode B01 reads the bank side back from Nessie, and the fund moves post there)

SCOPE: src/features/money-map/, src/features/reconcile/, src/features/scenario/, src/features/close/, src/features/impact/, src/features/proof/, src/features/dashboard/, src/features/ask-cindy/, src/features/audit/, tests/features/money-map-*, tests/features/reconcile-*, tests/features/scenario-*, tests/features/close-*, tests/features/impact-*, tests/features/proof-*, tests/features/dashboard-*, tests/features/ask-cindy-*, tests/features/audit-*, tests/features/sell-views-lib.ts

## Goal
Every v1 Sell view (money map, the month, the judge's scenario, the close, impact, proof, the dashboard, Ask Cindy and the audit trail) fills the 1440 by 900 Sell frame cleanly, with nothing clipped and nothing sized for the old 1280 by 800 console. These views carry the seller minute of the 3-minute tour (`d06-money` to `d10-close`), where the Diné Weaving and Silver Co-op's money moves, the month is matched, the gallery's $340 short payment is caught and the month closes, so this migration is P0 (C-11). The money map also draws v2's new money: the buyer's contribution reaching a community fund, and a milestone payment on a commission. Every v1 figure, test ID and Simulated badge stays.

## Read first
- `docs/v2/fix-plan.md`: section 1.1 (the re-skin keeps every v1 number), section 1.2 (the seller minute), section 1.4 (B16)
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 3: `money.moved` kinds `project_fund` and `milestone`, `mv_0101` onward
  - section 2: Party kind `community_fund`, figure 13, the four projects `prj_01` to `prj_04`
  - section 4: the `studio` surface (Sell site, left nav, `/sell/:view`, drawers), `studio.proof.side` (F-search), cameras `sell-map`, `sell-month`, `sell-catch`, `sell-close`, `sell-proof`
  - section 7: kit `Drawer` (440 px), `PageFrame`
  - section 8: beats `d06-money`, `d07-month`, `d08-catch`, `d10-close` and, in chapter 2, `d13-proof`
  - section 11: the milestone grant's answer (one `money.moved` of kind `milestone`, Cindia to the maker), the process view's 0.66 scale in the tour
- `docs/plans/R0-reskin.md`: the names these views show after the re-skin
- The v1 plans of the nine features in `docs/plans/` (`F-money-map.md`, `F-reconcile.md`, `F-scenario.md`, `F-close.md`, `F-impact.md`, `F-proof.md`, `F-dashboard.md`, `F-ask-cindy.md`, `F-audit.md`) and their acceptance
- `docs/common/design-system.md`: spacing, mounted panels, `Thread`, `LedgerTable`, `EvidenceCard`, motion on the player clock
- `docs/common/glossary.md`: every label these views already use, plus community fund

## Interfaces
- **Reads and emits** exactly what each feature does in v1. Three additions:
  - money-map reads the new `money.moved` kinds,
  - money-map reads the project from `getById()` (title) for a `community_fund` party,
  - money-map and reconcile show "Checked against Nessie" wherever a `money.moved` or a `flag.raised` carries `nessieId` (B16, and B04 for its own moves). No other figure changes.
- **Exports:** all nine `index.ts` files stay as they are. The slots don't change.
- **The Phase A stage:** until I2-tour removes the legacy boxes, I2-shell shows the five v1 Sell views (`map`, `month`, `close`, `proof`, `dashboard`) in a 1192 by 744 box, v1's console view area, on the `/demo` stage only, so the v1 demo keeps playing. Routes never use that box, so this plan builds and tests at the full Sell frame, 1440 by 900.
- **Source keys on the badges:** unchanged, except that the reconcile and money-map panels add `b16-bank-books`, B16's own `SourceKey` (contracts section 3).
- **Test IDs:** every v1 one is kept. New internal ones in money-map: `money-map-node-community_fund-<projectId>` (a fund's node, from the existing `money-map-node-<key>` pattern) and the existing `money-map-thread-<moveId>` for `mv_0101` onward and for the milestone move.
- **Labels:** v1's, plus "Community fund" for the new party (contracts section 11's glossary row), and "Checked against Nessie" (已与Nessie银行记录核对) for a move or a flag with `nessieId`.
- **Fallout placeholders:** I2-core's fallout step (B1-1) left placeholder entries for the new party kinds, move kinds and source keys in `money-map/strings.ts` (`partyNames`, `moveKindNames`), `money-map/partyLayout.ts` (`FIXED`) and `proof/strings.ts` (`SOURCE_LABELS`). T0, T2 and T5 replace them with real labels and spots.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the community fund node and the two new move kinds' labels in money-map, "Checked against Nessie" in money-map and reconcile, the v2 source labels in proof, and any desktop string another folder needs, English and Chinese side by side | src/features/money-map/strings.ts, src/features/reconcile/strings.ts, src/features/scenario/strings.ts, src/features/close/strings.ts, src/features/impact/strings.ts, src/features/proof/strings.ts, src/features/dashboard/strings.ts, src/features/ask-cindy/strings.ts, src/features/audit/strings.ts | none | lead |
| T1 | Spec helper: re-export `seekToEvent` from `tests/smoke/lib.ts`, open a Sell view or drawer by its v2 route, check a test ID is inside `frame-studio` | tests/features/sell-views-lib.ts | none | sonnet |
| T2 | Money map at desktop size, the community fund parties and the new move kinds | src/features/money-map/MoneyMap.tsx, src/features/money-map/partyLayout.ts, src/features/money-map/PartyNodes.tsx, src/features/money-map/MoveThreads.tsx, src/features/money-map/threadGroups.ts, src/features/money-map/AccountBalance.tsx, tests/features/money-map-balance.spec.ts, tests/features/money-map-flow.spec.ts, tests/features/money-map-nodes.spec.ts, tests/features/money-map-threads.spec.ts, tests/features/money-map-desktop.spec.ts | T0, T1 | opus |
| T3 | The month and the scenario at desktop size, with the catch fitting the zoom | src/features/reconcile/CatchPanel.tsx, src/features/reconcile/EvidenceTrio.tsx, src/features/reconcile/HandledStrip.tsx, src/features/reconcile/MatchRow.tsx, src/features/reconcile/MonthTimeline.tsx, src/features/reconcile/ReconcileView.tsx, src/features/reconcile/matchLabels.ts, src/features/reconcile/recordRows.ts, src/features/scenario/DropZone.tsx, src/features/scenario/ScenarioPanel.tsx, src/features/scenario/ScenarioResults.tsx, src/features/scenario/useSample.ts, tests/features/reconcile-catch.spec.ts, tests/features/reconcile-flow.spec.ts, tests/features/reconcile-handled.spec.ts, tests/features/reconcile-matches.spec.ts, tests/features/reconcile-month.spec.ts, tests/features/scenario-drop.spec.ts, tests/features/scenario-lib.ts, tests/features/scenario-live.spec.ts, tests/features/scenario-sample.spec.ts | T0, T1 | opus |
| T4 | The close and impact at desktop size | src/features/close/ClosePanel.tsx, src/features/close/CloseTotals.tsx, src/features/close/WorkbookCard.tsx, src/features/impact/CountUp.tsx, src/features/impact/EstimateNote.tsx, src/features/impact/ImpactNumbers.tsx, src/features/impact/ImpactPanel.tsx, tests/features/close-download.spec.ts, tests/features/close-panel.spec.ts, tests/features/impact-estimate.spec.ts, tests/features/impact-numbers.spec.ts | T0, T1 | sonnet |
| T5 | Proof (now two thirds, beside F-search's side panel) and the dashboard at desktop size | src/features/proof/ErrorList.tsx, src/features/proof/ProofPanel.tsx, src/features/proof/Scoreboard.tsx, src/features/proof/SourceList.tsx, src/features/dashboard/Dashboard.tsx, src/features/dashboard/RevenueTile.tsx, src/features/dashboard/StatTile.tsx, tests/features/proof-errors.spec.ts, tests/features/proof-score.spec.ts, tests/features/proof-sources.spec.ts, tests/features/dashboard-tiles.spec.ts | T0, T1 | sonnet |
| T6 | The Ask Cindy and audit drawers at the kit Drawer width | src/features/ask-cindy/AnswerCard.tsx, src/features/ask-cindy/AnswerChart.tsx, src/features/ask-cindy/AskDrawer.tsx, src/features/ask-cindy/AskInput.tsx, src/features/audit/AuditDrawer.tsx, src/features/audit/StartList.tsx, src/features/audit/TrailView.tsx, tests/features/ask-cindy-answer.spec.ts, tests/features/ask-cindy-ask.spec.ts, tests/features/audit-drawer.spec.ts, tests/features/audit-trail.spec.ts | T0, T1 | sonnet |
| T7 | The sweep (lead): B16's two live feature specs, then run all nine folders' specs and smoke together, fix seams between views, report | tests/features/money-map-live-bank.spec.ts, tests/features/reconcile-live-bank.spec.ts (the nine `index.ts` files are unchanged) | T2 to T6 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 runs next, since every spec imports it.
- T2 to T6 own disjoint files, so they run two at a time (the v2 cap). T2 and T3 go first, because the seller minute's money and catch beats depend on them (C-11).
- Every spec in the nine folders moves from `/studio/<view>` to `/sell/<view>`, and from fixed beat times to `seekToEvent`, because I2-tour moves every beat while the events and figures stay.

**T1.** `sell-views-lib.ts` exports three helpers:
- `seekToEvent(page, type, match, offsetMs)`, re-exported from `tests/smoke/lib.ts`, never copied (B1-28, D1-34),
- `openSell(page, view, query?)`: it opens `/sell/<view>`, with `?drawer=` when given, and waits for the view's slots to fill,
- `expectInsideFrame(page, testIds)`: it checks each box sits fully inside `frame-studio` and every clipping ancestor.

**T2.** The money map fills its view.
- The SVG keeps its viewBox and scales to the view area, never a fixed pixel size.
- The HTML nodes sit in the same units, so labels stay put at any scale.
- `partyLayout.ts` adds a spot for each `community_fund` party (key `community_fund-<projectId>`), for up to four funds (`prj_01` to `prj_04`, one per community), placed where their threads don't cross the co-op's. Above the co-op, near Cindia, is one option. The tour draws `prj_01` only.
- `MoveThreads` draws:
  - `project_fund` moves (buyer to Cindia, then Cindia to the fund) with the kit `Thread` in the `in` tone,
  - a `milestone` move as one move, Cindia to the maker, drawn when it arrives after the owner grants the release, in the `in` tone (B1-42, D1-37). No buyer-to-Cindia thread and no pending thread for a milestone. Its move ID is `mv_user_<n>` (contracts section 11).
- `PartyNodes` labels each fund with "Community fund" and the project's title.
- A thread whose `money.moved` carries `nessieId` shows "Checked against Nessie" beside its amount, as words, so color never carries it.
- Nothing about the six v1 moves or the balance changes.
- `money-map-desktop.spec.ts` checks `d06-money`'s IDs, plus `money-map-thread-mv_0101` and `money-map-thread-mv_0102` when the timeline has them, inside the frame.

**T3.** The month view gives reconcile two thirds and the scenario a third, as v1, on the wider frame.
- `MonthTimeline` and `HandledStrip` stretch to the width without clipping the bundled, refund-netted and carried-over rows during the month beat. Late in `d07-month` the tour scales the Sell frame to 0.66 to show the reconcile process view beside it (C-12), so the rows must stay inside the frame at that scale too.
- `CatchPanel` keeps `reconcile-flag`, the three evidence cards and `reconcile-explanation` in one compact box, at most 1060 by 660 px of frame. The `sell-catch` camera zooms to 1.35 on that box, so the whole of it still fits the 1440 by 900 stage.
- When the flag's `flag.raised` carries `nessieId` (B16's live twin), `EvidenceTrio`'s bank card shows "Checked against Nessie" under its figures. The figures stay the payload's.
- The scenario's drop zone and results fit their third.
- `scenario-lib.ts` keeps its sample helpers, now on `/sell/month`.

**T4.** The close view's main panel (close) and side panel (impact) fit two thirds and a third of the wider view. `close-workbook`, `close-totals`, `close-download` and the three impact numbers with their estimate labels sit inside the frame at the end of the close beat. `buildWorkbook.ts` doesn't change.

**T5.**
- `ProofPanel` lays out the scoreboard, the error list and the source list for two thirds of the view, because F-search now fills `studio.proof.side` with the search model's score. With that slot empty, the shell's placeholder sits beside it. `proof-score` and `proof-item-err_01` to `proof-item-err_04` sit inside the frame at the end of the proof beat.
- The dashboard's tiles flow into a grid for the wider frame. `figures.ts` doesn't change. The dashboard keeps its own `StatTile.tsx`, and may switch to the kit's `StatTile` once I2-kit has it, as long as `dashboard-tiles.spec.ts` passes unchanged.

**T6.** Both drawers use the kit `Drawer`'s width from the shell (440 px). No width is hard-coded in the feature.
- `AnswerChart` sizes to the drawer.
- Long answers and the audit trail scroll inside the drawer body, never the page.
- The specs open `/sell/close?drawer=ask` and `/sell/close?drawer=audit&ref=<id>`.

**T7.** The lead runs, together:
- `npm run test:feature` for each of the nine slugs,
- `npm run check:scope -- tests/features/sell-views-lib.ts`, because no slug's `<slug>-*` pattern covers the shared helper,
- `npm run test:smoke`,
- a search of the nine folders for leftover console sizes (1280, 800, 400, 390, 844 used as widths or heights).

Every hit is either removed by its task's builder or explained in the report. The plan's G3 takes the nine slugs together, as the gate learns to from B1-24.

## Acceptance
Every spec opens `/sell/<view>` (or the drawer's query), moves the timeline with `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts`, never a fixed time, and checks by test ID only, at 1440 by 900. Arrival is asserted with Playwright's default expect timeout, never a wall-clock window (B1-27).

1. **Given** 300 ms after the timeline's `account.synced` for `acct_studio` in the money beat, **then** `money-map-canvas`, `money-map-thread-mv_0001`, `money-map-thread-mv_0003` and `money-map-balance` are inside `frame-studio`. **Given** `seekToEvent(page, "money.moved", { moveId: "mv_0102" }, 300)`, once the timeline carries the fund moves (the tour fires `mv_0101` and `mv_0102` after `account.synced`), **then** `money-map-thread-mv_0101`, `money-map-thread-mv_0102` and `money-map-node-community_fund-prj_01` show, with $5.00 on the threads.
2. **Given** a seeded `money.moved` of kind `milestone` from Cindia to a maker, **then** the map draws exactly one new thread for it, from Cindia to that maker's node, and no buyer-to-Cindia thread for it. **Given** seeded `project_fund` moves to `prj_01` and `prj_03`, **then** both fund nodes are inside the frame and no fund thread crosses the co-op's threads.
3. **Given** 300 ms after the last `match.made` of the month beat, **then** the bundled, refund-netted and carried-over match rows are inside the frame.
4. **Given** 300 ms after the timeline's `flag.explained` for `flg_01`, **then** `reconcile-flag`, `reconcile-evidence-contract`, `reconcile-evidence-statement`, `reconcile-evidence-bank` and `reconcile-explanation` sit inside one box no larger than 1060 by 660 px, and the figures read contract 40%, statement 50%, bank $1,700.00, owed $2,040.00, short $340.00.
5. **Given** 300 ms after the timeline's `impact.updated`, **then** `close-workbook`, `close-totals`, `impact-maker-share`, `impact-days-to-payout` and `impact-hours-saved` are inside the frame, with the estimates labeled.
6. **Given** 300 ms after the timeline's `proof.scored`, **then** `proof-score` reads "Caught 4 of 4" and `proof-item-err_01` to `proof-item-err_04` are inside the left two thirds of the proof view.
7. **Given** `/sell/close?drawer=ask`, **when** the owner asks the first canned question, **then** `ask-cindy-answer` and `ask-cindy-chart` fit inside the drawer with no horizontal scroll. **Given** `/sell/close?drawer=audit&ref=ord_001`, **then** the trail fits the drawer.
8. **Given** scripted mode, **then** every one of these panels shows `simulated-badge`, as in v1.
9. **Given** the Phase A demo and then the tour, **then** every v1 spec of the nine features passes on the `/sell` routes with event-anchored seeks and the re-skinned names from R0.
10. **Given** live mode with `b16-bank-books` live, **when** a person grants `apr_05`, and when `/demo?start=d05-pay` plays, **then** each brings a `money.moved` twin with a `nessieId`, every event valid, and that move's thread shows "Checked against Nessie". This is `money-map-live-bank.spec.ts`. **Given** `/demo?start=d07-month` in live mode, **then** the flag's twin arrives with a `nessieId` and v1's figures, and the bank evidence card shows "Checked against Nessie". This is `reconcile-live-bank.spec.ts`. Both are B16's live feature specs, run as `npm run gate -- G5 b16-bank-books tests/features/money-map-live-bank.spec.ts tests/features/reconcile-live-bank.spec.ts`. Both skip with a named reason when `/api/health` doesn't list `b16` or `keys.nessie` is false, so G3 passes before B16 lands.
11. **Given** a move or a flag without `nessieId`, **then** no "Checked against Nessie" shows on it.

## Out of scope
- New views, new events, or any change to the figures. These views only move to the new frame.
- The search model's score beside proof (F-search) and the process views (F-process).
- Posting the fund moves to Nessie and reading the bank side back. B16 does that on the server, and these views render the same events.
- The design drops' restyle (I3-redesign changes tokens and kit, and these views follow).

## Contract additions needed
1. Already settled, kept here for the record: the glossary row "Community fund", 社区基金, code `Party.kind: "community_fund"` (contracts section 11), and the milestone grant's one move, Cindia to the maker (section 11, Requests rows). Its move ID is `mv_user_<n>` (contracts section 11).
