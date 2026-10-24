# Cindia · layout

Handoff drop 1 · direction B · Warp and weft · Oct 24, 2026

How every page is built at 1440 by 900. The sizes the shell already uses (56 px top bar, 64 px process bar, 184 px Sell nav, 440 px drawer, 1200 by 720 process overlay, process blocks under 140 px) are kept exactly, so nothing here changes a route, a slot or a test ID. Token names are from `design/tokens.md`.

## The page

- `PageFrame` is 1440 by 900 on `--c-color-ground`. Desktop only. On other screens the stage scales the whole frame to fit.
- **The beam** runs across the top of every page: the top bar (56 px) and the process bar (64 px), 120 px in all, on `--c-color-beam`. It never scrolls.
- **The surface area** is the 780 px under the beam. A page may scroll inside it. Whatever a tour camera needs to show sits in the first 780 px, above the fold. Each template below says what that is.

## Grids

| Surface | Columns | Column | Gutter | Margins | Content width |
|---|---|---|---|---|---|
| Shop, maker page, storefront | 12 | 90 px | 24 px | 48 px | 1344 px |
| Sell, right of the 184 px nav | 12 | 86 px | 16 px | 24 px | 1208 px |

Spans you'll use most:

| Columns | Shop | Sell |
|---|---|---|
| 3 | 318 px | 290 px |
| 4 | 432 px | 392 px |
| 6 | 660 px | 596 px |
| 8 | 888 px | 800 px |
| 9 | 1002 px | 902 px |
| 12 | 1344 px | 1208 px |

On Sell, faint warp lines (`--c-color-line` at 60% opacity, 1 px) may mark the column edges behind tables and the money map. They are decoration and never carry meaning.

Spacing: panels pad 24 px. Panels sit 24 px apart on Shop and 16 px apart on Sell. Sections are 32 px apart. Rows are 44 px tall and controls 40 px.

## The top bar (`shell-topnav`, 56 px)

```
| 48 | Cindia | 16 | [ Shop | Sell ] |          center          | Ask Cindy | 12 | Help | 12 | 中文 | English | 48 |
```

- **Left:** the word Cindia (22 px, weight 700, `--c-color-beam-text`) at the 48 px margin, then the `SideSwitch` 16 px after it.
  - `shell-side-shop` and `shell-side-sell`, 36 px tall, 16 px labels in weight 600.
  - A `--c-color-beam-soft` outline and 2 px corners. The selected side is filled `--c-color-beam-text` with ink text, so it reads by fill and weight.
  - Maker pages count as Sell and storefront pages as Shop.
- **Center:** empty on Shop and Sell. On a storefront it says "Storefront preview" and the community's name. On a maker page it shows the maker's name. 16 px, `--c-color-beam-soft`.
- **Right,** ending at the 48 px margin. Each is a 36 px button with a `--c-color-beam-soft` outline and a beam-text label:
  - Ask Cindy, on Sell pages only (sets `?drawer=ask`),
  - Help (`shell-help`, sets `?drawer=support`),
  - the language toggle.
- A 1 px `--c-color-beam-line` divides the top bar from the process bar.

## The process bar (`process-bar`, 64 px)

- Ten `ProcessBlock`s in the contract's order: Vibe search, Agent swarm, Checkout, Money, Reconcile, Approvals, Close, Proof, Counterfeit watch, Model. Labels come from contracts section 4, in the page's language.
- Ten equal columns 8 px apart between the 48 px margins: 127.2 px each, under the 140 px limit. Each block is 48 px tall, 8 px from the top and bottom of the bar, with 8 px inner padding. The longest label, Counterfeit watch, measures 108 px at 14 px and fits.
- **A block, top to bottom:**
  - the label, 14 px, weight 600, `--c-color-beam-text`,
  - the count and the word Live (`--c-color-beam-live`) or Simulated (`--c-color-beam-soft`), 14 px,
  - a 3 px thread 4 px above the bottom edge that shows the state. It is dotted when idle, drawn partway and pulsing when working, full with a check when done, and dashed with "!" and the open count when it needs attention.
- The block whose view is open gets a 3 px `--c-color-beam-text` rule on its top edge and its label in weight 700.
- Clicking a block (`process-block-<processId>`) sets `?process=<processId>`.

## The process view (`process-view`)

- A panel 1200 by 720, centered under the beam: x 120, y 150. It sits over `--c-color-scrim`, which covers the page but not the beam, so the other blocks stay clickable to switch views.
- `--c-color-paper`, `--c-shadow-overlay`, 2 px corners.
- **Title row, 64 px:**
  - the process name (24 px, weight 700),
  - the Live or Simulated badge,
  - a one-line "what this shows" in `--c-color-ink-soft`,
  - `process-view-close` at the right. Esc also closes it.
- **Body, about 1152 by 440:** the drawing for that process, for example the embedding map, the agent graph or the money threads, drawn in the thread language.
- **Event log (`process-log`)** under a hairline:
  - `--c-font-mono`, 14 px, newest last, about five rows visible and scrolling,
  - columns: time in seconds on the player clock, type, source, key.

## Drawers

- 440 px wide from the right edge, under the beam: x 1000, y 120, 780 px tall.
- `--c-color-paper` with `--c-shadow-overlay`. The scrim covers the page area only.
- **Title row, 56 px:** the title in both languages, for example Help 客服, and a close button.
- **The support drawer** has the conversation (`support-thread`) and the input row at the bottom (`support-input`, `support-send`).
  - Every agent reply shows the agent's name (`support-agent`) and "Rule-based" for a code agent.
  - A handover to a person shows as a full-width note (`support-handoff`) in `--c-color-amber-wash` with a clock icon and a sentence.
- Ask Cindy and the audit trail use the same frame.

## Shop (`frame-buyer`)

### Home, `/shop`

- **Above the fold:**
  - **Search, columns 1 to 8:**
    - "Describe a feeling" (36 px, weight 700),
    - the `SearchBar` (`search-input`), 56 px tall, paper with an edge border, with `search-submit` as an indigo button at its right end,
    - the keyword chips under it (`search-chip-1` onward).
  - **Surprise me, columns 9 to 12:** one panel holding:
    - `search-surprise`,
    - the mode picker `search-surprise-mode`, a three-part switch: Keyword, Pure random, Fair random,
    - the drawn piece (`search-surprise-result`) as a one-row card that names the method it used.
  - **Featured pieces:** four `PieceCard`s, three columns each (318 px). Each has:
    - a square 318 px picture with the Illustration tag,
    - the title (18 px, 600),
    - the maker row (`MakerMark` and "name · community", 14 px),
    - the price (18 px, 600),
    - the verification line (14 px, jade, with a check).
- **Below:** the communities strip (`shop.home.communities`), four `CommunityCard`s with the kind written as a word, then three `ProjectCard`s (four columns each) with their progress.

### Results, `/shop/search`

- **Columns 1 to 3, the request:**
  - the buyer's words as typed,
  - the editable keyword chips,
  - filters (price, community, with each community's kind as a word),
  - the engine line (`search-engine`), for example "Answered by keyword search · Simulated".
- **Columns 4 to 12, the results (`search-results`):** six results above the fold, three across in two rows.
  - Each `search-result-<pieceId>` is a compact card, 318 by 340, with a 200 px picture box (the square illustration centered on paper).
  - Its footer is the reason line (`search-reason-<pieceId>`): the shared facets as small chips and one sentence.
- The embedding map opens in the search process view, not on the page.

### Piece page, `/shop/piece/:pieceId`

- **`shop.piece.main`, columns 1 to 8:** two inner columns of 432 px.
  - Left: the illustration, 432 px square. The story card (`buyer-story-card`), hours of work and the process steps follow under it, below the fold.
  - Right, top to bottom, all above the fold:
    - the title (36 px, 700),
    - the maker row,
    - the price (36 px, 700),
    - the verification line (`buyer-verification`), saying how and by whom,
    - "Where your money goes" (`buyer-split-bar`, with the maker's share first and in jade),
    - the checkout panel: `buyer-project-addon`, "Add $5.00 to the Gu apprentice stipend", then `buyer-pay-button` and the token line (`buyer-token`), labeled Demo checkout, no real charge.
- **`shop.piece.side`, columns 9 to 12 (432 px):** "Ask about this piece", the support conversation inline, with each reply's agent named.

### Community, `/shop/community/:communityId`

- **Header across 12 columns:**
  - the name (36 px, 700),
  - the kind as a word (Indigenous or Heritage, never a color),
  - people and place,
  - the Demo data badge.
- **Columns 1 to 8:**
  - "In its own words" (`about`), set as the community's text, not Cindia's,
  - the craft,
  - "How makers are verified" (`community-verification`): method, who, note,
  - "What we don't sell" (`community-protocols`) as a plain list,
  - the makers,
  - the pieces, three across.
- **Columns 9 to 12:** its projects with progress, and the link to its storefront.

### Projects, `/shop/projects` and `/shop/projects/:id`

- **The list:** "Community projects" as `ProjectCard`s three across (four columns each, `project-progress-<projectId>` as raised against goal in numbers and a bar). Then "Works in progress", each with its `MilestoneTimeline`.
- **A project:**
  - the summary,
  - the progress,
  - `project-fund-<projectId>`,
  - dated updates.
- **A work in progress:** the milestones (`wip-milestone-<milestoneId>`), each with its share and its status as a word: pending, reached or paid.

### Receipt, `/shop/receipt/:orderId`

- **One column, columns 4 to 9 (660 px), centered:**
  - order and date,
  - the piece row,
  - the price split,
  - the token line ("The card number is never stored"),
  - the project contribution,
  - the status (`buyer-receipt-status`): Received, then Paid to the maker with the amount and the payout date.
- A single thread runs from the buyer to the maker along the left edge of the receipt and draws itself when the status changes.

## Sell (`frame-studio`)

- **The Sell header**, 48 px, under the beam, `--c-color-mat`:
  - the studio's name in both languages (顾绣工作室 Gu Embroidery Studio, 18 px, 700) at 24 px,
  - then "Cindy ·" and her latest line (16 px, `--c-color-ink-soft`),
  - the Demo data badge at the right.
- **The nav (`shell-nav-<view>`)**, 184 px, on paper with a hairline on its right:
  - the eleven views in the Routes order, 44 px rows, 16 px labels,
  - a count in mono at the right where there is one (approvals waiting, open flags, hits),
  - the selected view has a `--c-color-mat` fill, a 3 px indigo left rule and weight 600.
- **The view area** is x 184 to 1440, y 168 to 900 (1256 by 732), on the Sell grid.

| View | Above the fold |
|---|---|
| `overview` | Four stat panels, three columns each: Today's sales, Money waiting, Approvals waiting, Flags. Each has a 36 px figure, a word and a link. Under them, two panels of six columns: Needs your approval, and the latest swarm runs |
| `listings` | Columns 1 to 5: the maker's notes in their own language (`seller-listing-notes`) and "Draft with the agents". Columns 6 to 12: the draft in both languages (`seller-listing-draft`), its checks as rows with a check or "!" and a note (`seller-listing-check-<checkId>`), and `seller-listing-approve` |
| `storefront` | Columns 1 to 4: the block list (`storefront-block-<blockId>`), the accent picker (the eight accents as labeled swatches) and the layout picker. Columns 5 to 12: the live preview (`storefront-preview`) at 60% inside a frame labeled Preview, and `storefront-publish` |
| `projects` | Project cards with progress, and each work in progress's milestones with `wip-release-<milestoneId>` on the one waiting |
| `map` | The money lattice across all 12 columns: each party a vertical warp thread (buyer, Cindia, studio, the three makers, gallery, card network, supplier, community fund), each movement a row in time order, the thread crossing from payer to payee with its amount at the crossing. The balance (`money-map-balance`) at the top right |
| `month` | Main, columns 1 to 8: the records table with its kind chips. Side, columns 9 to 12: "Try a statement". When the catch opens, the flag and its three `EvidenceCard`s (contract, statement, bank record, each with its key figure marked) span all 12 columns, under the line "The gallery paid $340 less than the contract says" at 48 px |
| `close` | Main: the month's totals, the Excel report and profit and loss. Side: Impact, each estimate labeled |
| `proof` | Main: "Caught 4 of 4" as the big figure and the planted errors. Side: the search model's scores (`search-proof`), or "Not trained yet" |
| `dashboard` | Tiles, three columns each, building as the month closes |
| `approvals` | Columns 1 to 8: the waiting approvals, each saying "Cindy proposed this. Only you can approve it." with the $500 limit when it applies. Columns 9 to 12: the selected one's evidence and the seal once sealed |
| `watch` | `watch-scan` at the top. Each hit (`watch-item-<cftId>`) is one row: the found listing (columns 1 to 5), the similarity bar and figure (`watch-similarity-<cftId>`, columns 6 and 7), the maker's piece (columns 8 to 12), then `watch-report-<cftId>` |

The money lattice is B's way of drawing the money map. The node-and-thread map that exists today also works with the B tokens. Switching to the lattice is a layout change for the money-map feature, so it goes into drop 2's `changes.md`, not this drop.

## Maker page (`frame-maker`)

- The page opens in the maker's language (Chinese for the Gu makers), on the Shop grid.
- **`maker.main`, columns 1 to 8:**
  - the `MakerMark` and name (陆芸, 36 px, 700) and the month,
  - "本月收入" (This month's income) over the hero figure (64 px, 700),
  - the payout date and its status as a word,
  - the statement lines (piece and share, figures in mono),
  - anything held, on one line with "!" and the words 暂缓发放 and 待画廊补齐欠款后发放.
- **`maker.side`, columns 9 to 12:** their listings and works in progress (`seller-maker-side`).

## Storefront (`frame-store`)

- The beam stays on top, because every surface is a `PageFrame`. Under it, a 32 px band in `--c-color-mat` says "Storefront preview. The builder is a working mock" with the Demo data badge.
- The blocks run full width in the storefront's order: hero, story, pieces, process, projects, visit us. `story_first` puts the story above the pieces, and `grid_first` puts the pieces first.
- **The community's accent** colors links, buttons and section rules (`var(--c-color-<accent>)`). Its wash fills the hero band and section bands (`var(--c-color-<accent>-wash)`). Text on a wash is always ink.
- The pieces grid is four across (three columns each), and each piece links back to its Shop page.

## The tour (`/demo`)

The stage shows one frame at a time at 1440 by 900, and a process view may open over it. The title and end cards are full frames on `--c-color-beam` with beam-text type. They are designed in drop 2 with the other screens.
