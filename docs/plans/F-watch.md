# F-watch · Counterfeit watch

Priority: P1 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/watch/ · Made real by: B15, B11

SCOPE: src/features/watch/, tests/features/watch-*

## Goal
The owner presses Scan now, and Cindy's watch team searches public web results for listings that look like the maker's pieces or claim to be handmade by the community with no verification. Each hit shows side by side with the maker's own piece, with a similarity score and the claim it makes. The screen says plainly: "Possible look-alike. Cindy doesn't accuse anyone. You decide." If the owner wants to act, Cindy has drafted a report, and only the owner can approve it.

## Read first
- `docs/v2/brief.md`: counterfeit watch, the swarm table (Scout, Comparer, Claims, Reporter), the principles
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: CounterfeitCandidate `cft_01` to `cft_04`, figure 14, `apr_03`
  - section 3: `watch.started`, `watch.scanned`, `counterfeit.flagged`, the Requests table row for `watch.started`
  - section 4: slot `studio.watch.main`, test IDs `watch-*`, the camera `sell-watch`
  - section 5: B15, so the screen tells the truth about what the scan does
  - section 8: beat `d14-watch`
- `docs/common/design-system.md` and contracts section 7: `SideBySide`, `ScoreBar`, `PieceCard`, `Badge`, `Button`, `Panel`
- `docs/common/glossary.md`: counterfeit watch, similarity, approval, proposed by Cindy, demo data

## Interfaces
- **Reads events** through `useCindia()`: `watch.started`, `watch.scanned`, `counterfeit.flagged` (the `watch` key), `approval.requested`, `approval.granted` and `approval.declined` (the `approvals` key), and `sources`. The similarity, title, URL, snippet and claim render from the `counterfeit.flagged` payload.
- **Reads data** with `getById()`: `std_gu` (`makerIds`), the maker, the maker's pieces (catalog entries with that `makerId`, with `title`, `facets`, `image`, `priceCents`), the maker's community (`craft`), the piece each hit resembles (`pieceId`), and each Approval (`kind`, `subjectIds`).
- **Emits,** with `source: "user"` through `userEvent()`: `watch.started` (`scanId: "wsc_user_<n>"`, `makerId`, `queries`) from Scan now. The timeline's own `watch.started` plays the tour.
- **The queries** are built with no randomness: for the maker's first three pieces in catalog order, the piece's English title, the community's craft and the piece's first motif, joined with spaces. At most three.
- **Which scan the screen follows:** the newest `watch.started` in the store. Its hits are the `counterfeit.flagged` events with that `scanId`, highest similarity first.
- **Never shows the found page:** no iframe, no image loaded from a found URL, and the URL is shown as text, never as a link. Only the title, the URL text and the snippet appear.
- **Navigation:** the report button moves to `/sell/approvals?ref=<approvalId>` through `navigate()` (contract additions 1 and 2).
- **Exports:** `src/features/watch/index.ts` default-exports `{ id: "watch", slots: { "studio.watch.main": WatchView } }`.
- **Source key on the badge:** `b15-watch`.
- **Test IDs:**
  - From the contracts: `watch-scan`, `watch-results`, `watch-item-<cftId>`, `watch-similarity-<cftId>`, `watch-report-<cftId>`.
  - Internal to this feature: `watch-maker` (the maker picker), `watch-queries` (the queries the scan will send), `watch-status`, `watch-engine`, `watch-claim-<cftId>`, `watch-empty`, `watch-fairness` (the "Cindy doesn't accuse anyone" line).
- **Labels from the glossary:** counterfeit watch, similarity, proposed by Cindy, approval, demo data.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the scan bar, the status lines, the engine names ("Apify web search", "Scripted sample"), the fairness line, the report button's states, English and Chinese side by side | src/features/watch/strings.ts | none | lead |
| T1 | Spec helper: seek to a timeline event, open `/sell/watch`, seed events with `window.__cindia.emit` | tests/features/watch-lib.ts | none | sonnet |
| T2 | The scan bar: maker picker, the queries, Scan now, status and engine | src/features/watch/scanQueries.ts, src/features/watch/scanQueries.test.ts, src/features/watch/ScanBar.tsx, tests/features/watch-scan.spec.ts | T0, T1 | sonnet |
| T3 | The hit card: found listing beside the maker's piece, similarity, claim, fairness line | src/features/watch/HitCard.tsx, tests/features/watch-hit.spec.ts | T0, T1 | opus |
| T4 | The results list and the report button | src/features/watch/WatchResults.tsx, src/features/watch/reportLink.ts, tests/features/watch-results.spec.ts | T0, T1 | sonnet |
| T5 | Assemble the view and fill the slot (lead) | src/features/watch/WatchView.tsx, src/features/watch/index.ts, tests/features/watch-flow.spec.ts | T2 to T4 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 is small and runs next.
- T2 to T4 own disjoint files and run two at a time.

**T1.** `watch-lib.ts` exports:
- `seekToEvent(page, type, match, offsetMs)`, which reads `window.__cindia.player.getTimeline()`,
- `openWatch(page)`,
- `seed(page, events)`, which emits through `window.__cindia.emit`.

**T2.** `scanQueries.ts` builds the queries from a maker ID as described above. It's a pure function, with unit tests for `mkr_01` and for a maker with fewer than three pieces. `ScanBar` shows:
- the maker picker (`watch-maker`) over `std_gu.makerIds`, starting at `mkr_01`,
- the queries (`watch-queries`),
- Scan now (`watch-scan`), which emits `watch.started` and is disabled while the newest scan has no `watch.scanned` yet,
- `watch-status`: "Searching public web results" from `watch.started` until its `watch.scanned`, then the number of results checked and the hits found,
- `watch-engine`: "Apify web search" when `watch.scanned.engine` is `apify`, "Scripted sample" when it's `scripted`.

**T3.** `HitCard` (`watch-item-<cftId>`) is a kit `SideBySide`:
- **Left:** the found listing's title, its URL as plain selectable text, and the snippet.
- **Right:** the maker's piece through the kit `PieceCard` (its illustration, title and price).
- **Between them:** the kit `ScoreBar` with the similarity (`watch-similarity-<cftId>`, as a whole percent such as 91% similar).
- **Below:** the claim (`watch-claim-<cftId>`) in the slot's language, and the fairness line (`watch-fairness`): "Possible look-alike. Cindy doesn't accuse anyone. You decide."

No color carries meaning alone: the score has its number, and the claim has its label.

**T4.** `WatchResults` (`watch-results`) lists the newest scan's hits as `HitCard`s, highest similarity first. `watch-empty` reads "No look-alikes found in this scan" when the scan finished with none.

`reportLink.ts` finds, for a hit, a requested Approval of kind `report_listing` whose `subjectIds` include the hit's `cftId`. `watch-report-<cftId>` ("Review Cindy's report") then:
- moves to `/sell/approvals?ref=<approvalId>` when that approval exists (`apr_03` for `cft_01`),
- is disabled with "Waiting for Cindy's draft" before that,
- opens `/sell/approvals` for a live hit no approval names yet,
- reads approved or declined after the owner's decision.

**T5.** `WatchView` lays out the scan bar on top and the results below in one kit `Panel` declaring `b15-watch`, sized for the Sell frame at 1440 by 900. `watch-flow.spec.ts` plays the tour's scan from `watch.started` to `approval.requested` for `apr_03`, with event-anchored seeks (or the same events seeded before the tour carries them), and checks `d14-watch`'s IDs inside `frame-studio`.

## Acceptance
Every spec opens `/sell/watch`, moves the timeline with `seekToEvent` or seeds events with `seed`, and checks by test ID only, at 1440 by 900.

1. **Given** no scan yet, **then** `watch-queries` shows three queries built from `mkr_01`'s first three pieces, starting with the Peony fan's, and `watch-results` is empty.
2. **When** the owner presses `watch-scan`, **then** the store holds a `watch.started` with `source: "user"`, a `wsc_user_` ID, `makerId: "mkr_01"` and those queries. `watch-status` shows the search under way, and within 3 seconds in real time `watch-engine` reads "Scripted sample" and the scripted hits appear.
3. **Given** the tour's scan (or the same events seeded), 300 ms after `counterfeit.flagged` for `cft_01`, **then**:
   - `watch-item-cft_01` shows the found listing's title, URL text and snippet beside `pc_01`'s card,
   - `watch-similarity-cft_01` reads 91%,
   - `watch-claim-cft_01` shows its claim and `watch-fairness` shows the fairness line,
   - all inside `frame-studio`. These are `d14-watch`'s IDs.
4. **Given** the same moment, **then** inside `watch-item-cft_01` there is no `a` element whose `href` is the found URL, no `iframe`, and no `img` whose `src` is on the found site.
5. **Given** 300 ms after `approval.requested` for `apr_03`, **when** the owner clicks `watch-report-cft_01`, **then** the page is `/sell/approvals?ref=apr_03` and the store wasn't reset. Before that request, the button is disabled.
6. **Given** a finished scan with no hits, **then** `watch-empty` shows.
7. **Given** scripted mode, **then** the panel shows `simulated-badge`.
8. **Given** `demo-lang-toggle` switched to Chinese, **then** every label and the claim are Chinese, and the found listing's title and snippet stay as found.

## Out of scope
- Running the web search, scoring similarity or reading claims in the browser. That's B15 on the server, or the scripted sample.
- Visiting, embedding or screenshotting found pages, contacting sellers, or sending a report. The owner's approval is where it stops in this build.
- Watching images. B15 compares titles and snippets with the embedding model.

## Contract additions needed
1. **Navigation for features:** `navigate(path)` in `src/core/` and a kit `Link` (prop `to`) that moves between routes without reloading the store. M-buyer, F-seller-hub and F-storefront list the same one.
2. **`/sell/approvals?ref=<approvalId>`** selects that approval (M-approvals addition 1).
3. **Scan IDs:** a person's scans use `wsc_user_<n>`, and the tour's scan is `wsc_01`.
4. **The scripted scan ends with Cindy's proposal:** the scripted answer to a person's `watch.started` (the Requests row) and the tour's `d14-watch` carry the Reporter's `followup.drafted` (`fup_02`, for `apr_03`), then `approval.requested` for `apr_03` after the `counterfeit.flagged` events. `apr_03`'s `subjectIds` is `["cft_01"]`. The live B15 run returns its own report approval the same way.
