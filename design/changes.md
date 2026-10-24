# Cindia · changes

Handoff drop 2 · direction B · Warp and weft · Oct 24, 2026

What the screens change beyond the kit restyle. I3-redesign doesn't edit `src/features/`, so it lists each feature's items under needs, one line per feature, for that feature's polish round. Nothing here renames a route, slot, event, field or test ID. Each item names the screen in `design/screens/` that shows it.

## Settled from drop 1's proposals

- **Compact PieceCard:** 318 by 338, with a 190 px picture box. Drop 1 proposed 340 and 200. Taking 10 px off the picture keeps two rows of results and their header above the fold (`shop-search--results.png`).
- **The money lattice** replaces the node-and-thread money map (`sell-map--default.png`).
- **Seal initials for leads outside the Gu studio** stay a proposal. Every approval on these screens is the Gu studio's, so the seal shows 准.

## By feature

### buyer, the piece page (`shop-piece-pc_01--checkout.png`, `--token.png`)

- **Title row:** the title (Title/36), the Chinese title in `ink-soft` on the same baseline, and the price (Title/36) at the right.
- **Under the title:** the maker row, then the full VerificationLine (`buyer-verification`).
- **"Where your money goes":** a panel holding the Panel-width ShareBar (`buyer-split-bar`).
- **Checkout panel before paying:**
  - its title with the tag "Demo checkout, no real charge",
  - the project add-on as a checked Checkbox (`buyer-project-addon`),
  - the masked card line, "Total $185.00", and Pay (`buyer-pay-button`, Primary, full width),
  - the line "This checkout is simulated. No card is charged."
- **After the token:**
  - the add-on becomes "Paid $185.00, with $5.00 to the Gu apprentice stipend",
  - the token box (`buyer-token`) shows Card token, Visa ending in 4242, the token in mono, and the never-stored note,
  - the status (`buyer-receipt-status`) reads Received, with the clock in `amber` and a "View receipt" link,
  - the simulated line stays.
- **Story card:** `buyer-story-card` sits under the illustration, with hours of work and the process steps (`buyer-process-timeline`). It runs below the fold.
- **Fit:** both states fit above the fold. The right column ends at 831 px before paying and 897 px after.

### buyer, the receipt (`shop-receipt-ord_001--received.png`, `--paid-to-maker.png`)

- **One 660 px column** (Shop columns 4 to 9):
  - "Receipt" with the badge, and the total paid at the top right,
  - the order line with `ord_001` in mono and the buyer's name,
  - the piece row with a 96 px illustration,
  - the Receipt-width ShareBar, the card token, and the project contribution,
  - the status under a hairline.
- **The receipt thread** runs down the left edge (`components.md`, Money pictures). Paid to the maker reads "The maker got their share: $134.48 to Lu Yun on Oct 2, 2026."

### search (`shop-home--hero.png`, `shop-search--results.png`)

- **Results page:**
  - Columns 1 to 3 hold "Your request" (the words, the Removable keyword chips, the filters and the engine line with a dot). Surprise me sits under it, because `d02-surprise` runs on the results page. `layout.md` had Surprise me on the home page only.
  - The results header reads "6 pieces for your words · sorted by how well they match".
  - Two rows of Compact cards sit under the header.
- **Home:**
  - "Describe a feeling", a lead line, the SearchBar and the chips across columns 1 to 8,
  - Surprise me in columns 9 to 12,
  - four featured Tiles under them.
- **Surprise me's result row:** a 64 px thumbnail, the piece, and the method in words ("Fair random: leans toward makers with fewer sales this month.").

### support (`shop-piece-pc_01--support-drawer.png`, `--support-answered.png`)

- **Step strip:** the drawer gets the AgentStep strip and the Now line above the conversation, a new kit component (`components.md`, Needs).
- **Answered:** the answered state adds "How it works", which opens `?process=swarm`.
- **Ask about this piece:** `shop.piece.side` shows the same thread, then a line naming where Writer's facts came from, then the input row.

### money-map (`sell-map--default.png`)

- **The lattice** (`components.md`, Money pictures):
  - ten parties, with the ones that have no moves yet drawn lighter,
  - one row per move in time order, with the kind and the amount on every thread,
  - the balance at the top right.

### reconcile (`sell-month--catch.png`)

- **At the catch, across all 12 columns:**
  - the flag (`reconcile-flag`): "Short payment · Fogline Gallery, September", then "The gallery paid $340.00 less than the contract says." with the amount in Figure/48 `seal`,
  - the three EvidenceCards,
  - Cindy's explanation (`reconcile-explanation`) with "Follow-up drafted. It needs your approval." and an "Open Approvals" link,
  - the records table under them, below the fold.

### approvals (`sell-approvals--waiting.png`, `--sealed.png`)

- **Cards:** each card has the seal slot, Approve as the Seal button, and the maker rows with each held amount.
- **Side panel, "Why part is held":**
  - the held note,
  - the $340.00 split by maker,
  - "See the flag in Month",
  - "Your limit".
- **After sealing:** the seal sits in each card's slot, the actions become "Approved" with the date and what followed, and the side panel says who sealed and when.

### close and impact (`sell-close--impact.png`)

- **Totals:** four tiles (Sales, Fees, Maker pay, Held), each with one line of what it counts.
- **The Excel report card** (`close-workbook`):
  - the file name in mono,
  - the four sheets as Tags,
  - Download .xlsx (`close-download`, Primary) at the right.
- **"Paid to the makers":** three rows, each with the held amount, the payout and "Paid Oct 2".
- **Impact panel:**
  - the maker share as a 36 px `jade` figure,
  - days from close to payout as two threads, Before dotted and Now solid `jade`, with the Estimate badge on Before only,
  - hours saved with the Estimate badge,
  - the estimate note.
- **Needs a data change:** `Impact.estimate` is one flag for all four numbers, but `impact.ts` says only `daysCloseToPayoutBefore` and `bookkeepingHoursSaved` are estimates. Proposal: an `estimateFields` list on `Impact`, or the feature labels those two by name. Until then the feature can keep labeling all four.

### maker-statement and seller-hub (`maker-mkr_01--zh.png`)

- **The page is in Chinese for `mkr_01`.**
- **Header:** the 48 px MakerMark, 陆芸 with "Lu Yun" beside it, the month, and the Simulated and Demo data badges.
- **The money:**
  - 本月收入 over the 64 px figure (`maker-statement-total`),
  - 实发金额 and 发放日期 with 已发放,
  - the held line on an `amber-wash` band with "!" (`maker-statement-held`).
- **The lines:** 已售作品 (`maker-statement-lines`), each piece's Chinese title with its English name after it and the maker's share in mono.
- **`seller-maker-side`:**
  - 在售作品 with two thumbnails and the count,
  - 定制进行中 with three milestones, tagged 示例 (Sample).

### process (`process-bar--states.png`, `process-swarm--view.png`, `process-search--view.png`)

- **Block counts** follow the F-process table, with a zero count left out.
- **Attention** shows "!" at the top right of the block. This is a ProcessBlock change, already in the Figma component.
- **The swarm view:**
  - the AgentGraph on the diagonals with labels on the outer side,
  - step rows with the summary on its own line,
  - the run picker in the header.
- **The search view:**
  - The points are not colored by community. Eight communities would need eight colors, and the chart palette stops at five. The clusters carry the community names instead.
  - The six results are filled, and the star stays hollow while the positions are approximate.
  - The scores are ScoreBars.

### shell

- **Maker page beam:** Sell selected, and the maker's name and role in the center.
- **Missing strings:** the Chinese labels for the switch and for "Not trained yet" (`components.md`, Needs).

## Sample content on the screens

These stand in for text that S3's catalog and the swarm runs will write. On the screens each carries a Sample tag (示例 in Chinese):
- Writer's reply to the d04 question, and run_01's step summaries and timings.
- The three Indigenous results in figure 11 and their reasons: a flower-stripe scarf, a woven band and a beaded bracelet, from "Sample maker" at $120.00, $85.00 and $60.00, under the communities' descriptions in contracts section 2.
- The search scores (0.91 to 0.70) and the map positions.
- The Surprise me result.
- The verification text. The Heritage listing lines follow S3's plan wording for `com_gu` until `communities.ts` exists, and the Community attestation and Registry check variants are written for the Figma gallery.
- The one-sentence reasons for `pc_01`, `pc_07` and `pc_11`.
- The maker page's work in progress.

Everything else comes from `src/mock/` as of 16:00 PT: prices, the split, the token, dates, the gallery's figures, the approvals, the payouts, the close totals and impact.

## Held

The storefront builder, the store page, listings, the counterfeit watch, the projects pages and the community pages are held until the coordinator says, so they're not in this drop.
