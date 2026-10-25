# Cindia · changes

Handoff drop 3 · direction B · Warp and weft · Oct 24, 2026

What the screens change beyond the kit restyle. I3-redesign doesn't edit `src/features/`, so it lists each feature's items under needs, one line per feature, for that feature's polish round. Nothing here renames a route, slot, event, field or test ID. Each item names the screen in `design/screens/` that shows it. Where a plan sets a different arrangement, the item says so, and the lead picks in the polish round.

## By feature

### shell (every screen)

- **Top bar:** L1 sits at the right on two lines in Caption/14, before Ask Cindy, Help and the language toggle.
- **Sell header:** the co-op's name, Cindy's latest line, and L2 at the right on two lines. The Demo data badge isn't drawn there, because L2 says it in words.
- **Maker page beam:** Sell selected, and "Grace N. · Maker" in the center.

### process (every screen, `process-bar--states.png`, `process-swarm--view.png`, `process-search--view.png`, `process-data--view.png`)

- **The bar:** eleven blocks from x 48 with 6 px gaps, 104 px wide except Counterfeit watch at 124. Line 2 is the count and the status word (Idle, Working, Done, Attention). Blocks never say Simulated.
- **The summary:** "Live: N of 11" over one Simulated badge, from x 1276. "N screens watching" replaces the badge line in live mode only.
- **The Live mark:** a 6 px `beam-live` dot at a block's top right, when all its keys are live.
- **The swarm view:** the graph with Cindy at the center and the specialists on the diagonals, the rule-based quote check named under the Steward's tool, and ten step rows with the latest in `indigo-wash`.
- **The search view:** every piece colored by its community, with the four communities named, the six results ringed and numbered, and the scores with each result's community and matched keywords.
- **The data view:** the eight tables with counts and newest rows, the two Elastic indexes with `cindia-drafts` marked new, a small map with the draft, and the model card with L28.

### search (`shop-home--hero.png`, `shop-search--results.png`)

- **Result cards:** the compact card is 318 by 314, with a 142 px picture, the reason, and the verification line starting with L3. Six fit above the fold.
- **Results page:** the request column on the left (the words, the chips, the filters, the engine line) with Surprise me under it, and the six results on the right. F-search T7 puts the refine bar above the grid and Surprise me on the right. This arrangement keeps all six results and their verification lines above the fold.
- **Home:** "Describe a feeling", the SearchBar and its chips across eight columns, Surprise me in the last four, then the featured cards in community order. The grid holds eight cards, two from each community, and the screen shows the first row.

### buyer (`shop-piece-pc_01--checkout.png`, `--token.png`, `shop-receipt-ord_001--received.png`, `--paid-to-maker.png`)

- **The story card** (`buyer-story-card`), left column: a 140 by 166 picture cropped to the piece, the title in both languages, Grace N. with her MakerMark and the Demo data badge, the co-op's name as a link to its community page, "26 hours of work", the story, L5, the four steps with their hours (`buyer-process-timeline`), and "About the craft." with the craft line.
- **The verification** (`buyer-verification`) under the card: L3 with the method, who would attest, the note, and L4.
- **The price column:** the price (`buyer-split-price`, Title/36), then "Where your money goes" with the split and the comparison (`buyer-split-compare`), then checkout.
- **Fit:** in both states the page ends by 860 px, so all six of acceptance 1's IDs sit inside the frame.
- **Before paying:** the add-on unchecked with "All of it goes to the community fund." and L7, the masked card, "Total $180.00", Pay, and the simulated note.
- **After paying:** "Paid $185.00, with $5.00 to Looms for two new weavers", the token box, Received with "View receipt", "The co-op has your payment.", `buyer-receipt-promise`, and the simulated note.
- **The receipt:** Received shows the promise. Paid to the maker shows "The maker got their share: $134.48 to Grace N. on Oct 2, 2026." and `buyer-receipt-maker-note` at the right, with her MakerMark, her name and the Demo data badge over her note.

### support (`shop-piece-pc_01--support-drawer.png`, `--support-answered.png`)

- **The drawer:** L11 at the top, then the step strip (Cindy, Intake, Steward, Check, Clerk, Writer) with its Now line, then the conversation.
- **While working:** `support-working` under the question lists the steps so far (`support-steps`), the latest in `indigo-wash`.
- **Answered:** the Writer's reply in place of the list, "Answered by Writer after 10 steps." and "How it works", which opens `?process=swarm`.
- **Ask about this piece** (`shop.piece.side`): after the answer, the same thread, a line naming where the Writer's facts came from, and the input row. Before the question, the side shows the suggestions (`support-piece-suggest-<n>`), which aren't drawn.

### seller-hub (`sell-listings--d15.png`, `maker-mkr_01--en.png`)

- **Listings:** three columns. The maker (`seller-listing-maker`, Lena T.), her notes (`seller-listing-notes`) and "Draft with Cindy". The steps (`seller-listing-steps`, `run_02`'s seven rows, the Indexer marked rule-based). The draft (`seller-listing-draft`): the title, the Chinese title with L27, the summary with the planted sentence underlined in `amber`, the facets as Neutral tags and the vibe words as Match tags, the three checks with an icon and a word, the indexed line naming the model and `cindia-drafts`, then "Review Cindy's proposal" with "Cindy proposed this. Only you can approve it."
- **The maker side** (`seller-maker-side`): "Pieces for sale" with all four of Grace N.'s pieces and their prices (`seller-maker-pieces`), then the commission in progress, tagged Sample.

### money-map (`sell-map--default.png`)

- **The lattice:** ten parties, the co-op's account balance at the top right, and the first five moves of the month: the sale, the card fee, the settlement to the co-op, the project contribution and its pass-through to the fund.

### reconcile (`sell-month--catch.png`)

- **At the catch:** the flag line, "The gallery paid $340.00 less than the contract says." with the amount in Figure/48 `seal`, the three EvidenceCards, and Cindy's explanation with "Open Approvals".

### approvals (`sell-approvals--waiting.png`, `--sealed.png`)

- **The cards:** the follow-up and the maker payouts, each with its seal slot. Sealing puts "RB" and "Oct 1" in the slot.
- **The side panel:** "Why part is held" with the held note and the split by maker, "See the flag in Month", and "Your limit". After sealing, who sealed and when.
- **Not drawn:** `apr_04` (the listing) and `apr_05` (the commission milestone) also wait in the queue at `d09-approve`, and `approvals-listing` isn't drawn.

### close and impact (`sell-close--impact.png`)

- **Totals, the Excel report card, the payouts and Impact** as before, with the co-op's names.
- **Needs a data change:** `Impact.estimate` is one flag for all four numbers, but only `daysCloseToPayoutBefore` and `bookkeepingHoursSaved` are estimates. Proposal: an `estimateFields` list on `Impact`, or the feature labels those two by name.

### maker-statement (`maker-mkr_01--en.png`)

- **In English:** the 48 px MakerMark, "Grace N." and the month, with the Simulated and Demo data badges.
- **The money:** "This month's income" over $1,244.18, the amount paid out, the payout date and Paid.
- **The held note** (`maker-statement-held`): Held $95.00 on an `amber-wash` band with the glossary's held note, then "The gallery paid less than its contract says, so part of your share waits until it pays." in Caption/14 `seal`. It sits under the total, above the lines, so the whole statement fits inside the frame. M-maker-statement T3 puts it under the table.
- **The lines:** the piece's title and the maker's share. T3's order date column isn't drawn.

### communities (`shop-community-com_dine--page.png`)

- **The header:** the co-op's name, the Demo data badge, and the people, place and craft line.
- **The about box** (`community-page`): the `about` text in a dashed placeholder box with L8 (`communities-about-note`).
- **Kept out of this demo.** (`community-protocols`): the rest of L9 under the title, and the protocols as Neutral tags.
- **Makers and pieces:** the three makers with their counts, then the pieces three across, with `communities-storefront-link` ("See the co-op's storefront") at the right of the pieces heading.
- **The right column:** `community-verification` with L3 and L4, the project card with its progress, "Add $5.00" and L7, and the three other communities.
- **Length:** the page runs to 1185 px, so the screen shows all of it.

### storefront (`store-dine-weavers--page.png`)

- **The store bar:** the co-op's name, Pieces, About and Visit, "A storefront on Cindia", and the accent rule under it.
- **The blocks in order:** the hero (the name and place, the tagline, the craft line and the picture), the pieces (four tiles), the story ("About the co-op" with the Demo data badge and L8), the process steps (`pc_01`'s four steps with their hours), the project with its progress and raised line, and the visit block (the region and "Visits by arrangement").
- **The footer** (`store-footer`): the preview line, then L13.
- **Length:** the page runs to 1685 px.

### tour (`pitch-card--what.png`, `--why.png`, `--how.png`)

- **The pitch cards:** the title and the four lines from `pitch.ts`, each line beside a colored knot, L1 at the foot, and the presenter hint at the bottom right. The words on the screens are I2-tour's placeholders.
- **The presenter hint:** shown in presenter mode only, at the bottom right of every frame.

## Sample content on the screens

These stand in for text that S3's catalog and the swarm runs will write. On the screens each carries a Sample tag:
- Writer's reply after its first two sentences, which follow S3's `run_01` reply, and `run_01`'s step summaries and timings.
- The three pieces from the other communities: `pc_14` (Sarah P., $58.00), `pc_30` (Nora G., $150.00) and `pc_43` (Brenda C., $140.00), with their titles and art.
- The matched keywords for `pc_07` and `pc_11`, the search scores (0.91 to 0.70) and the map positions.
- The Surprise me result.
- The community's `about` text, its protocols, the storefront tagline, and the project's $1,240 raised.
- Grace N.'s receipt note.
- The maker page's commission in progress.
- The data view's step count of 52 and its newest rows, which follow S3's `demoDataSync` rules.

Everything else comes from R0's and S3's plans: the co-op, its people and pieces, the prices, the split, the gallery comparison, the token, the dates, the gallery's figures, the approvals, the payouts, the close totals and Impact.

## Not drawn

- The month's records table during `d07-month`.
- The proof page (`d13-proof`), the counterfeit watch (`d14-watch`) and the Surprise me result after a draw (`d02-surprise`).
- The projects pages, the storefront builder and the Sell overview.
- The end card.
- The checkout, money, reconcile, approvals, close, proof, watch and model process views.
- The tour's split layout, with the frame at 0.66 and the process panel in the right third. The process views here show the centered overlay a person opens with `?process=`.
- The search source markers (`search-source-<pieceId>-<n>`) and `search-provenance-note`.
