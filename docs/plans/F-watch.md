# F-watch · Counterfeit watch

Priority: P1 · Wave: V2 · Depends on: G1b, G2b · Folder: src/features/watch/ · Made real by: B15, B11

SCOPE: src/features/watch/, tests/features/watch-*

## Goal
The owner presses Scan now, and Cindy's watch team checks the listings on a sandbox market of fictional shops for copies of the Diné co-op's own pieces. A result counts as a possible copy only when it names the co-op or one of its makers, repeats an 8-word run of a piece's story, or claims a Cindia verification it doesn't have (fix-plan 1.9). A bare claim to be Native-made is never enough: the screen says "Claims to be Native-made. We can't check that." and offers no report. Each possible copy shows its claim first, then the found listing side by side with the maker's own piece and a text match score. The screen says plainly: "Possible look-alike. Cindy doesn't accuse anyone. You decide." The owner can dismiss it as easily as review Cindy's drafted report, and only the owner can approve a report. Every result the scan checked is listed, not only the hits, so a judge sees the whole crawl.

## Read first
- `docs/v2/brief.md`: counterfeit watch, the swarm table (Scout, Comparer, Claims, Reporter), the principles, data care
- `docs/v2/fix-plan.md`: section 1.6 (the sandbox market, the claim-only example), section 1.9 (who the watch looks for, "Text match 0.91")
- `docs/v2/contracts.md`, which `docs/common/` holds once I2-core is green:
  - section 2: CounterfeitCandidate `cft_01` to `cft_04`, figure 14, `apr_03`
  - section 3: `watch.started`, `watch.scanned` (with the checked results), `counterfeit.flagged`, the Requests table row for `watch.started`
  - section 4: slot `studio.watch.main`, test IDs `watch-*`, the camera `sell-watch`
  - section 5: B15 and its sandbox market, so the screen tells the truth about what the scan does
  - section 8: beat `d14-watch` (chapter 2)
  - section 11: the inline `approval` object, the ID scheme (`wsc_user_<n>`, `cft_user_<n>`)
  - section 12: labels L19 to L23
- `docs/common/design-system.md` and contracts section 7: `SideBySide`, `ScoreBar`, `PieceCard`, `Badge`, `Button`, `Panel`, `Link`
- `docs/common/glossary.md`: counterfeit watch, similarity, approval, proposed by Cindy, demo data

## Interfaces
- **Reads events** through `useCindia()`: `watch.started`, `watch.scanned`, `counterfeit.flagged` (the `watch` key), `approval.requested`, `approval.granted` and `approval.declined` (the `approvals` key), `sources`, and each event's `source` in the store's `log`, to tell a live hit from a scripted one. The similarity, title, URL, snippet and claim render from the `counterfeit.flagged` payload, and the checked results from `watch.scanned`.
- **Reads data** with `getById()`: `std_dine` (`makerIds`), the maker, the maker's pieces (catalog entries with that `makerId`, with `title`, `story`, `facets`, `image`, `priceCents`), the maker's community (`name`, `craft`), the piece each hit resembles (`pieceId`), and each Approval (`kind`, `subjectIds`). When `getById()` finds no Approval (a live `apr_user_<n>`), the inline `approval` object the store kept from its `approval.requested` (D1-16).
- **Emits,** with `source: "user"` through `userEvent()`: `watch.started` (`scanId: "wsc_user_<n>"`, `makerId`, `queries`) from Scan now. The timeline's own `watch.started` plays the tour.
- **The queries** are built with no randomness, for copies of this co-op's own work: the community's English name, the maker's name with the community's craft, and the first eight words of the English story of the maker's first piece in catalog order. At most three.
- **Which scan the screen follows:** the newest `watch.started` in the store. Its hits are the `counterfeit.flagged` events with that `scanId`, highest similarity first, and its checked results are its `watch.scanned`'s list.
- **Never shows the found page:** no iframe, no image loaded from a found URL, and the URL is shown as text, never as a link. Only the title, the URL text and the snippet appear. Every scripted URL is on the sandbox market, `example.com` or `example.org` (fix-plan 1.6).
- **Navigation:** the report button moves to `/sell/approvals?ref=<approvalId>` through `navigate()` from `src/core/nav.ts`.
- **Exports:** `src/features/watch/index.ts` default-exports `{ id: "watch", slots: { "studio.watch.main": WatchView } }`.
- **Source key on the badge:** `b15-watch`.
- **Test IDs:**
  - From the contracts: `watch-scan`, `watch-results`, `watch-item-<cftId>`, `watch-similarity-<cftId>`, `watch-report-<cftId>`.
  - Internal to this feature: `watch-maker` (the maker picker), `watch-queries` (the queries), `watch-status`, `watch-engine`, `watch-claim-<cftId>`, `watch-live-<cftId>` (L21), `watch-dismiss-<cftId>` (L23), `watch-empty`, `watch-fairness` (the fairness line and L20), `watch-checked` (every checked result), `watch-checked-<n>` (one checked result, from 1 in the payload's order), `watch-claim-only-<n>` (L22 on a claim-only result).
- **Labels from the glossary:** counterfeit watch, similarity, proposed by Cindy, approval, demo data. From contracts section 12: L19 to L23.

## Tasks
| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T0 | UI strings (lead): the scan bar, the status lines, the engine names ("Apify crawl of the sandbox market", "Scripted sample"), the fairness line, the verdict words, the report and dismiss buttons' states, English and Chinese side by side, with L19 to L23 as contracts section 12 words them | src/features/watch/strings.ts | none | lead |
| T1 | Spec helper: re-export `seekToEvent` from `tests/smoke/lib.ts`, open `/sell/watch`, seed events with `window.__cindia.emit` | tests/features/watch-lib.ts | none | sonnet |
| T2 | The scan bar: maker picker, the queries, Scan now, status and engine | src/features/watch/scanQueries.ts, src/features/watch/scanQueries.test.ts, src/features/watch/ScanBar.tsx, tests/features/watch-scan.spec.ts | T0, T1 | sonnet |
| T3 | The hit card: the claim first, the found listing beside the maker's piece, the text match, the fairness line, the live label | src/features/watch/HitCard.tsx, tests/features/watch-hit.spec.ts | T0, T1 | opus |
| T4 | The results: hits with the report and dismiss buttons, then every checked result | src/features/watch/WatchResults.tsx, src/features/watch/CheckedList.tsx, src/features/watch/reportLink.ts, tests/features/watch-results.spec.ts | T0, T1 | sonnet |
| T5 | Assemble the view and fill the slot (lead) | src/features/watch/WatchView.tsx, src/features/watch/index.ts, tests/features/watch-flow.spec.ts | T2 to T4 | lead |

**How the tasks fit:**
- The lead writes T0 first.
- T1 is small and runs next.
- T2 to T4 own disjoint files and run two at a time.

**T1.** `watch-lib.ts` exports:
- `seekToEvent(page, type, match, offsetMs)`, re-exported from `tests/smoke/lib.ts`, never copied,
- `openWatch(page)`,
- `seed(page, events)`, which emits through `window.__cindia.emit`.

**T2.** `scanQueries.ts` builds the queries from a maker ID as described above. It's a pure function, with unit tests for `mkr_01` and for a maker with no pieces. `ScanBar` shows:
- the maker picker (`watch-maker`) over `std_dine.makerIds`, starting at `mkr_01`,
- the queries (`watch-queries`): the newest `watch.started`'s own queries once one is in the store (D1-51), so the tour's scan shows the queries it sent. Before any scan, the queries Scan now would send for the picked maker.
- Scan now (`watch-scan`), which emits `watch.started` and is disabled while the newest scan has no `watch.scanned` yet,
- `watch-status`: "Checking listings on the sandbox market" from `watch.started` until its `watch.scanned`, then the number of results checked and the possible copies found,
- `watch-engine`: "Apify crawl of the sandbox market" when `watch.scanned.engine` is `apify`, "Scripted sample" when it's `scripted`.

**T3.** `HitCard` (`watch-item-<cftId>`) shows, top to bottom:
- **The claim first** (`watch-claim-<cftId>`) in the slot's language, as the payload words it (A1-13). For `cft_01` that's the evidence about this co-op, for example that it names Grace N. of the Diné co-op, who didn't list it there.
- **A kit `SideBySide`:**
  - Left: the found listing's title, its URL as plain selectable text, and the snippet.
  - Right: the maker's piece through the kit `PieceCard` (its illustration, title and price).
  - Between them: the kit `ScoreBar` with the score (`watch-similarity-<cftId>`) reading L19's first sentence with the payload's number to two places, "Text match 0.91", and L19's last two sentences as its hint: "How close the listing's title and snippet are to this piece's description. Not a picture match." (A2-13, fix-plan 1.9)
- **The fairness line** (`watch-fairness`): "Possible look-alike. Cindy doesn't accuse anyone. You decide." followed by L20: "Not verified by Cindia. That alone doesn't make it fake."
- **For a live hit** (its `counterfeit.flagged` has a live source), `watch-live-<cftId>` shows L21: "Found on the sandbox market just now. Not checked by a person."

No color carries meaning alone: the score has its number, and the claim has its label.

**T4.** `WatchResults` (`watch-results`) lists the newest scan's hits as `HitCard`s, highest similarity first. Under each card, two buttons of equal size and weight (the same kit `Button` variant):
- `watch-report-<cftId>` ("Review Cindy's report"),
- `watch-dismiss-<cftId>` (L23, "Looks fine, dismiss"). Dismissing is local UI state: the card folds to one line with Undo, nothing is emitted, and the report approval stays as it is (A2-13).

`watch-empty` reads "No possible copies found in this scan" when the scan finished with none.

`reportLink.ts` finds, for a hit, a requested Approval of kind `report_listing` whose `subjectIds` include the hit's `cftId`, from `getById()` or the inline object. `watch-report-<cftId>` then:
- moves to `/sell/approvals?ref=<approvalId>` when that approval exists (`apr_03` for `cft_01`, an `apr_user_<n>` for a live `cft_user_<n>`),
- is disabled with "Waiting for Cindy's draft" before that,
- reads approved or declined after the owner's decision.

`CheckedList` (`watch-checked`) sits under the hits and lists every result the newest scan checked (C-6), from its `watch.scanned`, as `watch-checked-<n>`: the title, the URL as text, the text match, and the verdict in plain words:
- a possible copy: "Possible look-alike, see above",
- a claim-only result (it claims to be Native-made and names no maker or co-op): `watch-claim-only-<n>` with L22, "Claims to be Native-made. We can't check that." It never gets a report button (fix-plan 1.6, A2-1),
- anything else: "No sign it copies the co-op's work".

Before the scan's `watch.scanned`, the list shows nothing. A `watch.scanned` with no results list shows only the count.

**T5.** `WatchView` lays out the scan bar on top and the results below in one kit `Panel` declaring `b15-watch`, sized for the Sell frame at 1440 by 900. `watch-flow.spec.ts` plays the tour's scan from `watch.started` to `approval.requested` for `apr_03`, with event-anchored seeks (or the same events seeded before the tour carries them), and checks `d14-watch`'s IDs inside `frame-studio`.

## Acceptance
Every spec opens `/sell/watch`, moves the timeline with `seekToEvent(page, type, match, offsetMs)` from `tests/smoke/lib.ts` or seeds events with `seed`, never a fixed time, and checks by test ID only, at 1440 by 900. Arrival is asserted with Playwright's default expect timeout, never a wall-clock window (B1-27).

1. **Given** no scan yet, **then** `watch-queries` shows three queries built from `mkr_01`: the co-op's name, Grace N.'s name with the craft, and the first eight words of `pc_01`'s story. `watch-results` is empty.
2. **When** the owner presses `watch-scan`, **then** the store holds a `watch.started` with `source: "user"`, a `wsc_user_` ID, `makerId: "mkr_01"` and those queries. `watch-status` shows the check under way, and then `watch-engine` reads "Scripted sample" and the scripted hits appear.
3. **Given** the tour's scan (or the same events seeded), 300 ms after `counterfeit.flagged` for `cft_01`, **then**:
   - `watch-claim-cft_01` shows its claim above the side by side,
   - `watch-item-cft_01` shows the found listing's title, URL text and snippet beside `pc_01`'s card,
   - `watch-similarity-cft_01` reads "Text match 0.91",
   - `watch-fairness` shows the fairness line and L20,
   - `watch-report-cft_01` and `watch-dismiss-cft_01` are the same size,
   - no `watch-live-cft_01`, since the hit is scripted,
   - all inside `frame-studio`. These are `d14-watch`'s IDs.
4. **Given** the same moment, **then** inside `watch-item-cft_01` there is no `a` element whose `href` is the found URL, no `iframe`, and no `img` whose `src` is on the found site.
5. **Given** the same moment, **then** `watch-queries` shows the tour scan's own queries from its `watch.started`.
6. **Given** the scan's `watch.scanned`, **then** `watch-checked` lists every result it carries, `cft_01` as a possible look-alike and the claim-only result with `watch-claim-only-<n>` reading L22 and no report button.
7. **When** the owner presses `watch-dismiss-cft_01`, **then** the card folds to one line, the store gains no event, and Undo brings the card back.
8. **Given** 300 ms after `approval.requested` for `apr_03`, **when** the owner clicks `watch-report-cft_01`, **then** the page is `/sell/approvals?ref=apr_03` and the store wasn't reset. Before that request, the button is disabled.
9. **Given** a seeded live `counterfeit.flagged` for `cft_user_1` and an `approval.requested` for `apr_user_1` carrying only the inline `approval` object (kind `report_listing`, subject `cft_user_1`), **then** `watch-live-cft_user_1` shows L21 and `watch-report-cft_user_1` moves to `/sell/approvals?ref=apr_user_1`.
10. **Given** a finished scan with no hits, **then** `watch-empty` shows.
11. **Given** scripted mode, **then** the panel shows `simulated-badge`.
12. **Given** `demo-lang-toggle` switched to Chinese, **then** every label and the claim are Chinese, and the found listing's title and snippet stay as found.

## Out of scope
- Running the crawl, scoring similarity or reading claims in the browser. That's B15 on the server, or the scripted sample.
- Searching the real web. B15 crawls only the sandbox market at `/market/` (fix-plan 1.6).
- Visiting, embedding or screenshotting found pages, contacting sellers, or sending a report. The owner's approval is where it stops in this build.
- Watching images. B15 compares titles and snippets with the embedding model.

## Contract additions needed
1. **Every checked result on `watch.scanned`** (C-6): a `results` list beside the `candidates` count, each with the title, the URL text, the snippet, the normalized similarity and a verdict (possible copy, claim only, or neither). F-process's watch view reads the same list.
2. **L21 for the sandbox market** (contracts section 12): A2 wrote "Found on the public web just now". With fix-plan 1.6 the watch never searches the real web, so this plan uses "Found on the sandbox market just now. Not checked by a person." Section 12 wins if it words it differently.
3. Already settled, kept here for the record: `navigate()` and the kit `Link`, `/sell/approvals?ref=<approvalId>`, `wsc_user_<n>` and `wsc_01`, and the watch run ending in `followup.drafted` `fup_02` then `approval.requested` `apr_03` (contracts section 11).
