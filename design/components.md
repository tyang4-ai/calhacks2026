# Cindia · components

Handoff drop 3 · direction B · Warp and weft · Oct 24, 2026

Every component the drop 3 screens use, as built on the Components page of Cindia · Design. Each entry gives the kit file it restyles, the anatomy with sizes, the tokens, the states, and its Figma node. Colors are named by the token after `--c-color-`, so `indigo` means `var(--c-color-indigo)`. Text styles are named as in `tokens.md`: Label/16 is 16 px at weight 600, Caption/14 is 14 px regular, Mono/14 is Source Code Pro at 14 px. Nothing here changes a prop, a test ID or a route. Where a screen needs something the kit doesn't have, it's listed under "Needs" at the end.

Figma links open https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb with `?node-id=` and the node below, the colon written as a dash.

## Map

| Figma component | Node | Kit file | What changes |
|---|---|---|---|
| Beam (Shop, Sell) | 7:185 | `TopNav`, `SideSwitch`, the shell's process bar | Restyle, eleven blocks and the summary |
| ProcessBlock (State × Selected, 8 variants) | 7:40 | `ProcessBlock.tsx` | Restyle, status word, attention mark, Live mark |
| Button (Primary, Quiet, Seal, Disabled) | 7:50 | `Button.tsx` | Restyle, 40 px |
| Chip (Default, Selected, Removable) | 7:58 | `Chip.tsx` | Restyle |
| Badge (Live, Simulated, Demo data, Rule-based, Estimate) | 7:70 | `Badge.tsx` | Restyle |
| Tag (Neutral, Match, Sample, Limit) | 11:120 | new, see Needs | New |
| MakerMark | 7:72 | `MakerMark.tsx` | Restyle |
| Seal | 7:75 | `Seal.tsx` | Restyle, no turn |
| Icon (16 names) | 11:65 to 11:113, 26:2022 | new, see Needs | New, files in `design/assets/icons/` |
| VerificationLine (Nation attestation × Full, Short) | 11:154 | `VerificationLine.tsx` | Restyle, with the `demo` lines |
| PieceCard (Tile, Compact) | 11:265 | `PieceCard.tsx` | Restyle, compact size |
| ShareBar (Panel, Receipt) | 15:306 | `ShareBar.tsx` | Restyle |
| Checkbox (Checked, Unchecked) | 11:190 | kit styles, see Needs | New look |
| Field (Default, Filled) | 11:195 | kit styles, see Needs | New look |
| SearchBar | 11:196 | `SearchBar.tsx` | Restyle |
| ModePicker (3 variants) | 16:495 | `Tabs.tsx` as a segmented control, see Needs | Restyle |
| PanelHeader | 13:28 | `Panel.tsx` title row | Restyle |
| ChatBubble (Person, Agent, Rule-based, Handover) | 13:54 | `ChatBubble.tsx` | Restyle |
| AgentStep (Done, Active, Waiting) | 19:1069 | new, see Needs | New |
| SellHeader | 21:1370 | the shell's Sell surface | Layout, with L2 |
| SellNav (11 variants) | 21:1872 | the shell's Sell surface | Layout |
| EvidenceCard (Contract, Statement, Bank record) | 23:1570 | `EvidenceCard.tsx` | Restyle |
| RecordRow (Header, Matched, Flagged, Waiting) | 23:1634 | `LedgerTable.tsx` rows | Restyle |
| ScoreBar (Neutral, Jade, Amber, Seal) | 28:2256 | `ScoreBar.tsx` | Restyle |
| PresenterHint | 52:121 | the stage, presenter mode | New |
| Illustration (15) | listed under Illustrations | `public/images/`, I3-redesign T5 | New art for 15 pieces |

## The beam

**Beam**, 1440 by 120: the top bar (56) over the process bar (64), both on `beam`, with a 1 px `beam-line` between them. Variants Shop and Sell differ only in the switch and the Ask Cindy button.
- Left: the word Cindia (22 px, 700, `beam-text`) at 48 px, then the SideSwitch 16 px after it.
- SideSwitch: two segments, 36 px tall, Label/16, a `beam-soft` outline and 2 px corners. The selected side is filled `beam-text` with `ink` text. Maker pages select Sell, storefront pages select Shop.
- Center: empty on Shop and Sell. A maker page shows the maker's name and role ("Grace N. · Maker") in Label/16 `beam-soft`.
- Right: L1 in Caption/14 `beam-soft`, right-aligned on two lines ("Demo. Every maker, community and story here is fictional. Nothing is for sale."), then Ask Cindy (Sell only), Help and the language toggle, each a 36 px button with a `beam-soft` outline and `beam-text` label, 12 px apart, ending at 48 px.
- The process bar: eleven ProcessBlocks in the contract's order, from x 48 with 6 px gaps. Ten are 104 px wide and Counterfeit watch is 124, so its label fits at 14 px.
- The summary, from x 1276 to 1392: "Live: N of 11" in Label/14 `beam-text` (`process-live-summary`), and under it one Simulated badge drawn for the beam: a dashed `beam-soft` border and `beam-text` label. In live mode the badge line gives way to "N screens watching" (`process-presence`) while B13 is live. In scripted mode the presence line isn't drawn.

**ProcessBlock**, 104 by 48, on `beam-raised` with a 1 px `beam-line` border and 2 px corners, 8 px padding.
- Line 1: the label, Label/14 `beam-text`.
- Line 2: the count, a middle dot, then the status word in Caption/14: Idle, Working, Done or Attention. A count of zero is left out, so an idle block reads just "Idle". Model reads Idle until `model.trained`. Blocks never say Simulated, because the summary says it once.
- The thread, 3 px, 4 px above the bottom edge:

| State | Thread | Mark (top right) | Status color |
|---|---|---|---|
| Idle | `beam-soft`, dotted (`2 6`) | none | `beam-soft` |
| Working | `beam-live`, drawn partway, pulsing every 1200 ms on the player clock | none | `beam-live` |
| Done | `beam-done`, full length | "✓" in `beam-done` | `beam-soft` |
| Attention | `beam-flag`, dashed (`8 6`) | "!" in `beam-flag` | `beam-flag` |

- Selected (its view is open): a 3 px `beam-text` rule on the top edge and the label in 700.
- Live (`process-block-live-<processId>`): a 6 px `beam-live` dot at the top right, 14 px left of any mark. The layer is "Live mark", hidden by default.
- The counts follow the F-process table. The screens use the tour's figures: 1 search, 10 then 17 steps, 1 order, 7 then 10 moves, 23 matches, 1 or 2 pending approvals, 3 statements.
- The sheet `screens/process-bar--states.png` shows the four states, the Selected look and the Live mark at twice the size.

## Controls

**Button**, 40 px tall, 2 px corners, label in Label/16 centered, width hugs the label with 16 px padding.
- Primary: `indigo` fill, `paper` label. Quiet: `paper` fill, 1 px `edge` border, `ink` label. Seal: `seal` fill, `paper` label. Disabled: `mat` fill, `ink-soft` label.
- Approve always uses Seal, because approving is what puts the seal down. Nothing else uses it.
- Focus: a 2 px `indigo` ring, 2 px out.

**Chip**, 30 px, 2 px corners, Label/14.
- Default: `paper` with a 1 px `edge` border. Selected: `indigo-wash` with an `indigo` border and `indigo` label. Removable: the label, then the close icon at 16 px in `ink-soft`, 4 px apart. The whole chip is the remove target.

**Tag**, a small woven label: Label/14, 2 px by 8 px padding, 2 px corners.
- Neutral: `paper`, 1 px `edge` border, `ink-soft` text. Used for the Illustration tag on every picture, the workbook's sheet names, the data view's newest rows and the listing's facets.
- Match: `indigo-wash`, `indigo` text. A facet a result shares with the request, and the listing's vibe words.
- Sample: `ink-wash`, `ink` text. Any placeholder content on a screen.
- Limit: `amber-wash`, the flag icon and `amber` text. "Over your $500 limit".

**Badge**, 26 px, bilingual labels from the glossary ("Simulated 模拟", "Live 实时", "Demo data 演示数据", "Rule-based 规则程序", "Estimate 估算"). Simulated has no fill and a dashed `edge` border (`4 3`), so it reads as provisional. Demo data has a 1 px `ink` border.

**Checkbox**, a 20 px box with 2 px corners, 12 px from its label.
- Unchecked: `paper` with a 1.5 px `edge` border. Checked: `indigo` fill with the check icon in `paper`.
- The label is Label/16 and says what happens ("Add $5.00 to Looms for two new weavers"), with a Caption/14 note under it. L7 sits under the note before any click.

**Field**, 40 px, `paper`, 1 px `edge` border, 2 px corners, 12 px padding, Body/16. The placeholder is `ink-soft`.

**SearchBar**, 888 by 56 (eight Shop columns), `paper` with a 1 px `edge` border and 2 px corners: the search icon in `ink-soft`, the words in Body/18, and `search-submit` as a Primary button 8 px from the right end. The keyword chips sit 12 px under it, Removable, 8 px apart.

**ModePicker** (`search-surprise-mode`), three equal segments, 36 px: Keyword, Pure random, Fair random. Unselected: `paper`, 1 px `edge` border, Caption/14 `ink`. Selected: `indigo-wash`, `indigo` border, Label/14 `indigo`. Borders overlap by 1 px.

## Panels and frames

**Panel**: `paper`, a 1 px `line` border, 2 px corners, 24 px padding, no shadow. A table may add a `mat` header band.

**PanelHeader**: the title in Title/21 `ink`, the badge at the right. The badge is Simulated while any of the panel's source keys is scripted and Live otherwise. Swap the badge, never recolor it.

**Drawer** (support, ask, audit), 440 by 780 at x 1000, y 120, `paper` with the overlay shadow, over a 40% `ink` scrim on the page area only. The beam stays clear.
- Title row, 56 px: the title (Title/21, "Help"), the badge, then a 40 px close button with a 1 px `edge` border.
- The support drawer then has L11 (`support-records-note`) in Caption/14 `ink-soft`, the agent steps (see AgentStep), the conversation (`support-thread`) with 20 px padding and 12 px gaps, and the input row (`support-input` as a Field, `support-send` as Primary) under a hairline.
- While a run works, `support-working` sits under the question: a 2 px `edge` rule on its left and the steps so far (`support-steps`), one row each, the number in Mono/14, then the agent's name in Label/14 and its summary in Caption/14 `ink-soft`. The latest row has an `indigo-wash` band with its number and name in `indigo`. When the reply lands, the reply takes its place.

**ProcessView**, 1200 by 720 at x 120, y 150, `paper`, overlay shadow, over the same scrim.
- Title row, 64 px: the process name (Title/24), the badge, one line of what the view shows (Caption/14 `ink-soft`), and `process-view-close` at the right.
- Body, from y 64 to about 590: the drawing or tables on the left and their companion on the right.
- `process-log` under a hairline: "Event log", then rows in Mono/14 with time in seconds, type, source and key, newest last, about five rows.

**SellHeader**, 1440 by 48 on `mat`: the co-op's name in 18 px, 700 at 24 px ("Diné Weaving and Silver Co-op"), "Cindy ·" in Label/16 and her latest `agent.acted` line in Body/16 `ink-soft`, truncated at the end, and L2 at the right in Caption/14 `ink-soft`, right-aligned on two lines. The Demo data badge is hidden here, since L2 says it in words.

**SellNav** (`shell-nav-<view>`), 184 by 732 on `paper` with a 1 px `line` rule on its right: 12 px top padding, then eleven 44 px rows in the routes order (Overview, Listings, Storefront, Projects, Money map, Month, Close, Proof, Dashboard, Approvals, Counterfeit watch), Body/16 at 24 px. A count in Mono/14 `ink-soft` sits at the right when there is one. Selected: `mat` fill, a 3 px `indigo` rule at the left, Label/16.

## Cards and records

**PieceCard**, 318 wide, `paper`, 1 px `line` border, 2 px corners. The Illustration tag (Tag, Neutral) always sits 8 px in from the picture's top left. Sample pieces add a Sample tag 6 px to its right.
- Tile, 318 by 474: a 318 px square picture, then 16 px padding with 8 px gaps: the title (Label/18, two lines at most), the maker row (MakerMark and "name · community" in Caption/14 `ink-soft`, one line, ending in an ellipsis when it runs long), the price (Label/18), and the VerificationLine, Short.
- Compact (`search-result-<pieceId>`), 318 by 314: a 142 px picture box with the 142 px illustration centered on `paper`, then 10 px by 16 px padding with 4 px gaps: the title and the price on one row (Label/16), the maker row, the reason (`search-reason-<pieceId>`: the shared facets as Match tags and one sentence in Caption/14 `ink-soft`), and the VerificationLine, Short.

**VerificationLine** (`buyer-verification`, `community-verification`), the dot icon in `jade` 8 px from the text. The method is always written out, and with `demo` it starts with L3.
- Full, 432 wide: "Demo verification · Nation attestation" in Label/14 `jade`, who would attest in Caption/14 `ink` ("The Navajo Nation, under the U.S. Indian Arts and Crafts Act, in a real launch"), the note in Caption/14 `ink-soft`, then L4 in Caption/14 `ink-soft`.
- Short: the dot and "Demo verification · Nation attestation" only.

**Story card** (`buyer-story-card`), a Panel 432 wide with 14 px padding and 8 px gaps, on the piece page.
- The header row: a 140 by 166 picture box that crops the illustration to the piece, with the Illustration tag at 6, 6, then the title (Title/21), the Chinese title (16 px, `ink-soft`), the maker row (MakerMark, the name in Label/16, the Demo data badge), the community's name as a link (Caption/14 `indigo`, underlined) and "26 hours of work" (Label/14).
- Then the story (Body/16), L5 (`buyer-story-demo-note`, Caption/14 `ink-soft`), the steps (`buyer-process-timeline`) and the craft line.
- The steps: one column per step, 8 px apart. Each has a 10 px `ink` knot on a 2 px `edge` weft, the hours in Label/14, then the step in Caption/14 `ink-soft`.
- The craft line: "About the craft." in 600, then the line in Caption/14 `ink-soft`.

**ShareBar** (`buyer-split-bar`), Panel (384) and Receipt (596) widths.
- A 24 px bar of four segments with 2 px gaps, in this order: maker share (`jade`), materials (`clay`), Cindia fee (`indigo`), card fee (`edge`). Widths are proportional to the amounts.
- Under it, the maker share row: a 12 px swatch, "Maker share" and the amount (`buyer-split-maker-share`) in Label/16 `jade`.
- Then three equal columns for the costs: swatch and label in Caption/14 `ink-soft` over the amount in Body/16.
- On the piece page, `buyer-split-compare` closes the panel under a hairline: "Through the gallery: $86.00. On Cindia: $134.48." in Body/16, the second sentence in `jade`, then "After $22.00 of materials. The gallery keeps 40%." in Caption/14 `ink-soft`.

**EvidenceCard** (`reconcile-evidence-contract`, `-statement`, `-bank`), 392 wide (four Sell columns), `paper`, 1 px `line` border, 20 px padding, 12 px gaps.
- The kind in Label/14 `ink-soft` and the record ID in Mono/14 at the right, the title in Label/18, a sub line in Caption/14.
- Rows: the key figure first, in a band with a 3 px left rule and a wash: `jade` and `jade-wash` for the record Cindy trusts, `seal` and `seal-wash` for the ones that disagree. The figure is Mono/16 in the same color. Other rows sit under hairlines, with figures in Mono/16 and words in Body/16.
- The footer says it in words with an icon: "Trust this record" (check, `jade`), or what disagrees (flag, `seal`).

**RecordRow**, 800 by 44 (eight Sell columns), 16 px padding: date, record ID and amount in Mono/14 (the amount right-aligned), the kind as a Chip-like label, the channel in Body/16, and the status as an icon and a word.
- Header: `mat`, Label/14.
- Matched: the check in `jade`. Waiting: the clock in `amber`. Flagged: the flag in `seal`, a `seal-wash` row and a 3 px `seal` rule at the left.

**ScoreBar**, a 160 by 8 track in `line` with the fill in the tone's color (`indigo` by default) and the figure in Mono/14 10 px to its right. The fill is the score times 160.

**MakerMark**, a 24 px square with a 1 px `ink` border and the maker's initial (`surnameChar`) centered. The maker page shows it at 48 px.

**Seal**, a 72 px square in `seal` with the owner's initials ("RB", Ruth B.) in Seal/32 and the date ("Oct 1") under it, both in `paper`. It never turns. It presses in over 220 ms (scale 1.06 to 1, opacity 0 to 1) and lands in the card's seal slot.

**Maker note** (`buyer-receipt-maker-note`), a Panel 318 wide at the right of the paid receipt: the MakerMark, the maker's name in Title/21 and the Demo data badge, then her note in Body/16, as the data writes it.

## Conversation and agents

**ChatBubble**, 2 px corners, 12 px by 16 px padding, 6 px gaps.
- Person: `indigo-wash`, right-aligned, up to 320 px. "You" in Label/14 `indigo` over the words in Body/16.
- Agent: `paper` with a 1 px `line` border, 384 px. The agent's name (`support-agent`) in Label/14 over the words. While the copy is a stand-in, a Sample tag sits next to the name.
- Rule-based: the same, with the Rule-based badge next to the name.
- Handover (`support-handoff`): full width, `amber-wash`, the clock icon in `amber` and one sentence in Body/16.

**AgentStep**, one agent in a run, about 65 wide. Six in a row make the step strip at the top of the support drawer, with a "Now" line under them.
- A 20 px row with the run's thread through it (3 px) and a 12 px knot in the middle, then the agent's name centered in Label/14.
- Done: a `jade` knot with a 2 px `paper` outline and a solid `jade` thread. Active: an `indigo` knot inside a 20 px `indigo` ring, the name in `indigo`, the thread solid behind and dotted ahead, pulsing on the player clock. Waiting: a hollow knot with a 2 px `edge` stroke, a dotted `edge` thread, the name in `ink-soft`.
- The strip for `run_01`: Cindy, Intake, Steward, Check, Clerk, Writer. Check is the Steward's rule-based quote check.
- The "Now" line: a dot in `indigo` and what the active agent is doing ("Clerk is reading the shipping policy."), then, once answered, a check in `jade`, "Answered by Writer after 10 steps." and a "How it works" link that opens `?process=swarm`.

**AgentGraph** (`process-swarm-graph`), drawn in the swarm view's left 520 px.
- Cindy at the center, an 80 px circle. The run's specialists on the four diagonals as 64 px circles. Each label sits on the outer side, the name in Label/14 over the model in Caption/14.
- Inside each circle: the numbers of the steps that agent took, in Mono/14.
- Edges, 3 px, from circle edge to circle edge: `jade` once used, `indigo` for the latest handoff. A tool name sits beside its edge in Mono/14 `ink-soft`. A rule-based check sits under its tool as "✓ Quote check · rule-based" in `jade`.
- The latest step's node lights: an `indigo-wash` fill, a 3 px `indigo` ring, the name in `indigo`.
- Step rows (`process-swarm-step-<stepId>`) on the right: the number, the agent, the kind and the tool in Mono/14, the model in Caption/14, the time in ms, and the summary on its own line in Caption/14. The latest row has an `indigo-wash` band. `process-swarm-run-picker` sits in the header, next to the Sample tag while the summaries are stand-ins.

**EmbeddingMap** (`process-search-map`), a `ground` panel with 2 px corners.
- Every piece is a 9 px dot colored by its community (chart 1 to 4, in community order), with each community named beside its cluster in Label/14 after a dot of its color.
- The six results: 14 px dots with a 2 px `ink` ring, numbered as in the list.
- The query: a 24 px star with a 2 px `seal` stroke, labeled "Your request · approximate" while the positions are scripted. A live map fills the star.
- Links from the star to each result, 1.5 px `ink-soft`.
- A Sample tag reads "Sample positions" until B11's points exist, and a key line at the bottom says what the marks mean.
- `process-search-scores` on the right: each result's number and title in Label/14, its ScoreBar and figure, then the community and the matched keywords in Caption/14. The engine and the model ID close the list.

**Data view** (`process-pane-data`), the ProcessView with three groups.
- `process-data-tables`, the left 640 px: "SpacetimeDB · cindia" and "8 tables, private, on this machine", then one row per table (`process-data-table-<table>`): the table name in Mono/16, the row count in Mono/16 right-aligned, and the newest three rows as Neutral tags. A row the beat just changed uses an `indigo-wash` tag. A note under the table says the counts come from the mock data.
- `process-data-index`, the right column: "Elastic" and one card per index, the name in Mono/16 and the doc count at the right. The index the beat just wrote has an `indigo-wash` fill and a "new" mark. Under the cards, a small embedding map with the new draft as a ringed `indigo` dot.
- `process-data-model`: the model ID in Mono/16, "Not trained yet" in Label/14 `amber` at the right, what it is in Caption/14, then L28.

## The tour

**Pitch card** (`pitch-card-what`, `-why`, `-how`), 1440 by 900 on `beam`, with no Shop or Sell frame.
- A dashed weft along the top at y 100, from x 96 to 1344, in `beam-done` with a 12 px knot at its left end.
- "1 of 3" in Label/16 `beam-soft` at y 168.
- The title from `pitch.ts` in Headline/64 `beam-text`.
- The lines from `pitch.ts`, up to four, each in Title/36 `beam-text` beside a 14 px knot, 28 px apart. The knots are `beam-live`, `beam-done`, `beam-wait` and `beam-flag`, in that order.
- L1 in Caption/14 `beam-soft` at the bottom left, and the PresenterHint at the bottom right.

**PresenterHint**, 432 by 42 on `beam-raised` with a 1 px `beam-soft` border and 2 px corners: the pause mark, "Paused after this beat" in Label/14 `beam-text`, then the keys as 24 px outlined boxes ("→" or "Space") with "next beat", and "←" with "replay", in Caption/14 `beam-soft`. It shows only in presenter mode, at the bottom right of whatever frame is up.

## Money pictures

**Money lattice** (`money-map-canvas`).
- Each party is a 2 px warp. A party in this month's moves uses `edge`, the rest use `line`. They're spread evenly from 288 to 1352 px, named on top in Label/14 with the role under it in Caption/14, all top-aligned: Avery Brooks (Buyer), Cindia (Marketplace), Visa (Card network), Looms for two new weavers (Community fund), Diné Weaving and Silver Co-op (Co-op), Grace N., Lena T. and Mae K. (Maker), Fogline Gallery (Gallery), Morning Loom Supply Co. (Supplier).
- Each move is a row, in time order, with its date in Mono/14 at the left. The thread runs from the payer's warp to the payee's (`money-map-thread-<moveId>`): 4 px, a 10 px dot at the payer and a 10 px arrowhead at the payee.
- A label sits on the thread's midpoint, above it: `paper` with a hairline, the kind in Caption/14 `ink-soft` and the amount in Mono/14.
- Thread colors by kind: sale `chart-1`, fees `chart-2`, settlement to the co-op `jade`, the project contribution and its pass-through `chart-3`, maker pay `chart-5`. The kind word and the amount always come with the color.
- The balance (`money-map-balance`) at the top right: "Co-op account balance" in Label/14, the figure in Figure/48, the as-of date in Caption/14.

**Receipt thread**, along the left edge of the receipt.
- A 4 px rail with four 14 px stops: You, Cindia, Co-op, the maker. Each is named in Label/14 at the left of the rail, with what it took or passed on under the name in Mono/14 ($185.00, $18.00 fee, $156.48, $134.48).
- Until the payout, the last stretch is dotted in `edge` and the maker's stop is hollow. Paid to the maker turns it solid `jade`, fills the stop, and sets the maker's name in `jade`. It draws over 700 ms when the status changes.
- Under Received, `buyer-receipt-promise` reads "We'll show you when Grace N. is paid." in Body/16.

**Approval card** (`approvals-item-<approvalId>`), 800 wide, 16 px by 24 px padding.
- The kind and the approval ID, the title (Label/18) and the amount (Title/24). The Limit tag goes under them when it applies.
- The body: the follow-up's subject, or the maker rows with each held amount in `amber`. Then "Cindy proposed this. Only you can approve it." in Caption/14, and the actions (Approve as Seal, Decline as Quiet).
- A 72 px seal slot sits at the top right, 24 px in: a dashed `edge` square reading "Your seal" while waiting. Approving puts the Seal (`approvals-seal-<approvalId>`) into that slot and replaces the actions with "Approved" and the date, who approved it and what followed. The selected card has a 2 px `indigo` border.

## Illustrations

Fifteen drawings, each on an 800 by 800 `viewBox` with a `paper` ground and warp lines every 80 px. Weavings are drawn as weft rows in the piece's colors, jewelry and pottery as plain shapes with one outline, beadwork as rows of round beads, patchwork as bands of small blocks. Patterns are plain geometry: stripes, steps, diamonds, zigzags and bands. Flowers appear only on the Ojibwe beadwork. There are no Yei figures, katsina, feathers, sandpainting designs or whirling-log shapes, and nothing copies a real piece. They have no text, no images, no links and no scripts, and all are under 6 KB.

| Piece | Title | File | Figma node |
|---|---|---|---|
| `pc_01` | Small grey, red and black wool weaving | `pc_01.svg` | 9:74 |
| `pc_02` | Stamped silver earrings | `pc_02.svg` | 49:187 |
| `pc_03` | Brown, white and grey wool rug | `pc_03.svg` | 49:198 |
| `pc_04` | Red, black and white wool rug with stepped diamonds | `pc_04.svg` | 10:74 |
| `pc_05` | Indigo and white striped wool weaving | `pc_05.svg` | 43:121 |
| `pc_06` | Grey and white zigzag wool weaving | `pc_06.svg` | 49:206 |
| `pc_07` | Red and grey wool mini weaving | `pc_07.svg` | 9:87 |
| `pc_08` | Thin silver ring with stamped chevrons | `pc_08.svg` | 49:214 |
| `pc_09` | Silver and turquoise pendant necklace | `pc_09.svg` | 49:222 |
| `pc_10` | Silver and turquoise drop earrings | `pc_10.svg` | 9:101 |
| `pc_11` | Red and white wool weaving | `pc_11.svg` | 10:88 |
| `pc_12` | Narrow stamped silver cuff bracelet | `pc_12.svg` | 38:91 |
| `pc_14` | Red and green floral beaded earrings (Ojibwe) | `pc_14.svg` | 10:133 |
| `pc_30` | Small black and orange seed pot (Acoma) | `pc_30.svg` | 9:123 |
| `pc_43` | Red, yellow and black patchwork skirt (Seminole) | `pc_43.svg` | 9:111 |

The Figma components are the same files, byte for byte, checked by hash on import. On screens, `pc_14`, `pc_30` and `pc_43` carry a Sample tag until S3 confirms their titles and makers.

## Icons

Sixteen line icons on a 20 px grid, with a 1.5 px stroke and square caps and joins. All are stroke-only except the dot. Each comes with a word on screen: check, flag, clock, dot, chevron, close, search, shuffle, question, arrow, external, lock, thread, seal, send, sheet. The files are in `design/assets/icons/`, drawn in `ink`. Recolor them with `currentColor` in code.

## Needs

Things the screens use that the kit doesn't have yet. Each is small, and none changes a test ID.
- **AgentStep**, for the support drawer's step strip (`shop.drawer.support`, `studio.drawer.support`). Props: the run's steps in order, each with agent name, state (`done`, `active`, `waiting`) and kind. The support feature could also build it from kit parts.
- **Tag**, or four more `Badge` variants: `illustration`, `match`, `sample` and `limit`.
- **Icon**, one component taking a name from the sixteen in `design/assets/icons/`.
- **Checkbox and Field** styles in `kit.css`, for the project add-on, the support input and the listing notes.
- **ModePicker**: `Tabs` restyled as a segmented control, or a `SegmentedControl` with the same props, for `search-surprise-mode`.
- **ProcessBlock width**: I2-kit caps a block at 120 px. Counterfeit watch needs 124 for its label at 14 px. Either the cap moves to 124 for that block, or the block takes its width from its label.
- **A beam Simulated badge**: the summary's badge on the dark beam, as a `tone="beam"` prop on `Badge` or a style in the process bar.
- **PresenterHint**, a small stage component that shows only in presenter mode.
- **Strings**, for the kit and the shell, in both languages. The Chinese here is proposed:
  - the status words: Idle 空闲, Working 运行中, Done 完成, Attention 需处理,
  - the verification method for `nation_attestation`: Nation attestation 部族认证,
  - the SideSwitch in Chinese: 选购 for Shop and 售卖 for Sell,
  - "Not trained yet": 尚未训练,
  - the presenter hint: "Paused after this beat" 本段已暂停, "next beat" 下一段, "replay" 重播,
  - "1 of 3" on the pitch cards: 第 1 张，共 3 张,
  - the community page's storefront link: "See the co-op's storefront" 查看合作社的店铺页面.
