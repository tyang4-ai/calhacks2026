# Cindia · components

Handoff drop 2 · direction B · Warp and weft · Oct 24, 2026

Every component the ten kept screens use, as built on the Components page of Cindia · Design. Each entry gives the kit file it restyles, the anatomy with sizes, the tokens, the states, and its Figma node. Colors are named by the token after `--c-color-`, so `indigo` means `var(--c-color-indigo)`. Text styles are named as in `tokens.md`: Label/16 is 16 px at weight 600, Caption/14 is 14 px regular, Mono/14 is Source Code Pro at 14 px. Nothing here changes a prop, a test ID or a route. Where a screen needs something the kit doesn't have, it's listed under "Needs" at the end.

Figma links open https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb with `?node-id=` and the node below, the colon written as a dash.

## Map

| Figma component | Node | Kit file | What changes |
|---|---|---|---|
| Beam (Shop, Sell) | 7:185 | `TopNav`, `SideSwitch`, the shell's process bar | Restyle, sizes kept |
| ProcessBlock (State × Selected, 8 variants) | 7:40 | `ProcessBlock.tsx` | Restyle, attention mark added |
| Button (Primary, Quiet, Seal, Disabled) | 7:50 | `Button.tsx` | Restyle, 40 px |
| Chip (Default, Selected, Removable) | 7:58 | `Chip.tsx` | Restyle |
| Badge (Live, Simulated, Demo data, Rule-based, Estimate) | 7:70 | `Badge.tsx` | Restyle |
| Tag (Neutral, Match, Sample, Limit) | 11:120 | new, see Needs | New |
| MakerMark | 7:72 | `MakerMark.tsx` | Restyle |
| Seal | 7:75 | `Seal.tsx` | Restyle, no turn |
| Icon (16 names) | 11:65 to 11:113, 26:2022 | new, see Needs | New, files in `design/assets/icons/` |
| VerificationLine (Method × Size) | 11:154 | `VerificationLine.tsx` | Restyle |
| PieceCard (Tile, Compact) | 11:265 | `PieceCard.tsx` | Restyle, compact size |
| ShareBar (Panel, Receipt) | 15:306 | `ShareBar.tsx` | Restyle |
| Checkbox (Checked, Unchecked) | 11:190 | kit styles, see Needs | New look |
| Field (Default, Filled) | 11:195 | kit styles, see Needs | New look |
| SearchBar | 11:196 | `SearchBar.tsx` | Restyle |
| ModePicker (3 variants) | 16:495 | `Tabs.tsx` as a segmented control, see Needs | Restyle |
| PanelHeader | 13:28 | `Panel.tsx` title row | Restyle |
| ChatBubble (Person, Agent, Rule-based, Handover) | 13:54 | `ChatBubble.tsx` | Restyle |
| AgentStep (Done, Active, Waiting) | 19:1069 | new, see Needs | New |
| SellHeader | 21:1370 | the shell's Sell surface | Layout |
| SellNav (11 variants) | 21:1872 | the shell's Sell surface | Layout |
| EvidenceCard (Contract, Statement, Bank record) | 23:1570 | `EvidenceCard.tsx` | Restyle |
| RecordRow (Header, Matched, Flagged, Waiting) | 23:1634 | `LedgerTable.tsx` rows | Restyle |
| ScoreBar (Neutral, Jade, Amber, Seal) | 28:2256 | `ScoreBar.tsx` | Restyle |
| Illustration (8) | 9:74 to 10:133 | `public/images/`, I3-redesign T5 | New art for five pieces |

## The beam

**Beam**, 1440 by 120: the top bar (56) over the process bar (64), both on `beam`, with a 1 px `beam-line` between them. Variants Shop and Sell differ only in the switch and the Ask Cindy button.
- Left: the word Cindia (22 px, 700, `beam-text`) at 48 px, then the SideSwitch 16 px after it.
- SideSwitch: two segments, 36 px tall, Label/16, a `beam-soft` outline and 2 px corners. The selected side is filled `beam-text` with `ink` text. Maker pages select Sell, storefront pages select Shop.
- Center: empty on Shop and Sell. A maker page shows the maker's name and role ("陆芸 · 匠人") in Label/16 `beam-soft`.
- Right: Ask Cindy (Sell only), Help, and the language toggle, each a 36 px button with a `beam-soft` outline and `beam-text` label, 12 px apart, ending at 48 px.
- The process bar: ten ProcessBlocks in the contract's order, 127.2 px wide and 8 px apart between the 48 px margins.

**ProcessBlock**, 127.2 by 48, on `beam-raised` with a 1 px `beam-line` border and 2 px corners, 8 px padding.
- Line 1: the label, Label/14 `beam-text`. Line 2: the status, Caption/14: the count, a middle dot, then Live or Simulated. A count of zero is left out, so an idle block reads just "Simulated". Model reads "Not trained yet" until `model.trained`.
- The thread, 3 px, 4 px above the bottom edge:

| State | Thread | Mark (top right) | Status color |
|---|---|---|---|
| Idle | `beam-soft`, dotted (`2 6`) | none | `beam-soft` |
| Working | `beam-live`, drawn partway, pulsing every 1200 ms on the player clock | none | `beam-live` |
| Done | `beam-done`, full length | "✓" in `beam-done` | `beam-soft` |
| Attention | `beam-flag`, dashed (`8 6`) | "!" in `beam-flag` | `beam-flag` |

- Selected (its view is open): a 3 px `beam-text` rule on the top edge and the label in 700.
- The counts follow the F-process table: answers, steps, orders, moves, matches, pending approvals, statements issued, "4/4" for proof, hits. The screens use the tour's figures: 2 answers, 8 steps, 1 order, 5 then 8 moves, 23 matches, 3 statements.
- The sheet `screens/process-bar--states.png` shows all five looks at twice the size.

## Controls

**Button**, 40 px tall, 2 px corners, label in Label/16 centered, width hugs the label with 16 px padding.
- Primary: `indigo` fill, `paper` label. Quiet: `paper` fill, 1 px `edge` border, `ink` label. Seal: `seal` fill, `paper` label. Disabled: `mat` fill, `ink-soft` label.
- Approve always uses Seal, because approving is what puts the seal down. Nothing else uses it.
- Focus: a 2 px `indigo` ring, 2 px out.

**Chip**, 30 px, 2 px corners, Label/14.
- Default: `paper` with a 1 px `edge` border. Selected: `indigo-wash` with an `indigo` border and `indigo` label. Removable: the label, then the close icon at 16 px in `ink-soft`, 4 px apart. The whole chip is the remove target.

**Tag**, a small woven label: Label/14, 2 px by 8 px padding, 2 px corners.
- Neutral: `paper`, 1 px `edge` border, `ink-soft` text. Used for the Illustration tag on every picture and for the workbook's sheet names.
- Match: `indigo-wash`, `indigo` text. A facet a result shares with the request.
- Sample: `ink-wash`, `ink` text. Any placeholder content on a screen.
- Limit: `amber-wash`, the flag icon and `amber` text. "Over your $500 limit".

**Badge**, 26 px, bilingual labels from the glossary ("Simulated 模拟", "Live 实时", "Demo data 演示数据", "Rule-based 规则程序", "Estimate 估算"). Simulated has no fill and a dashed `edge` border (`4 3`), so it reads as provisional.

**Checkbox**, a 20 px box with 2 px corners, 12 px from its label.
- Unchecked: `paper` with a 1.5 px `edge` border. Checked: `indigo` fill with the check icon in `paper`.
- The label is Label/16 and says what happens ("Add $5.00 to the Gu apprentice stipend"), with a Caption/14 note under it.

**Field**, 40 px, `paper`, 1 px `edge` border, 2 px corners, 12 px padding, Body/16. The placeholder is `ink-soft`.

**SearchBar**, 888 by 56 (eight Shop columns), `paper` with a 1 px `edge` border and 2 px corners: the search icon in `ink-soft`, the words in Body/18, and `search-submit` as a Primary button 8 px from the right end. The keyword chips sit 12 px under it, Removable, 8 px apart.

**ModePicker** (`search-surprise-mode`), three equal segments, 36 px: Keyword, Pure random, Fair random. Unselected: `paper`, 1 px `edge` border, Caption/14 `ink`. Selected: `indigo-wash`, `indigo` border, Label/14 `indigo`. Borders overlap by 1 px.

## Panels and frames

**Panel**: `paper`, a 1 px `line` border, 2 px corners, 24 px padding, no shadow. A table may add a `mat` header band.

**PanelHeader**: the title in Title/21 `ink`, the badge at the right. The badge is Simulated while any of the panel's source keys is scripted and Live otherwise. Swap the badge, never recolor it.

**Drawer** (support, ask, audit), 440 by 780 at x 1000, y 120, `paper` with the overlay shadow, over a 40% `ink` scrim on the page area only. The beam stays clear.
- Title row, 56 px: the title in both languages (Title/21, "Help 客服"), the badge, then a 40 px close button with a 1 px `edge` border.
- The support drawer then has the agent steps (see AgentStep), the conversation (`support-thread`) with 20 px padding and 12 px gaps, and the input row (`support-input` as a Field, `support-send` as Primary) under a hairline.

**ProcessView**, 1200 by 720 at x 120, y 150, `paper`, overlay shadow, over the same scrim.
- Title row, 64 px: the process name (Title/24), the badge, one line of what the view shows (Caption/14 `ink-soft`), and `process-view-close` at the right.
- Body, from y 64 to about 552: the drawing on the left and its table on the right.
- `process-log` under a hairline: "Event log", then rows in Mono/14 with time in seconds, type, source and key, newest last, about five rows.

**SellHeader**, 1440 by 48 on `mat`: the studio in both languages (18 px, 700: "顾绣工作室 Gu Embroidery Studio"), "Cindy ·" in Label/16 and her latest `agent.acted` line in Body/16 `ink-soft`, truncated at the end, and the Demo data badge at the right.

**SellNav** (`shell-nav-<view>`), 184 by 732 on `paper` with a 1 px `line` rule on its right: 12 px top padding, then eleven 44 px rows in the routes order (Overview, Listings, Storefront, Projects, Money map, Month, Close, Proof, Dashboard, Approvals, Counterfeit watch), Body/16 at 24 px. A count in Mono/14 `ink-soft` sits at the right when there is one. Selected: `mat` fill, a 3 px `indigo` rule at the left, Label/16.

## Cards and records

**PieceCard**, 318 wide, `paper`, 1 px `line` border, 2 px corners. The Illustration tag (Tag, Neutral) always sits 8 px in from the picture's top left. Sample pieces add a Sample tag 6 px to its right.
- Tile, 318 by 474: a 318 px square picture, then 16 px padding with 8 px gaps: the title (Label/18), the maker row (MakerMark and "name · community" in Caption/14 `ink-soft`), the price (Label/18), and the VerificationLine, Short.
- Compact (`search-result-<pieceId>`), 318 by 338: a 190 px picture box with the 190 px illustration centered on `paper`, then 10 px by 16 px padding with 4 px gaps: the title and the price on one row (Label/16), the maker row, and the reason (`search-reason-<pieceId>`): the shared facets as Match tags and one sentence in Caption/14 `ink-soft`.

**VerificationLine** (`buyer-verification` on the piece page), the check icon in `jade` 8 px from the text.
- Full, 432 wide: the method in Label/14 `jade`, who attests in Caption/14 `ink`, and the note in Caption/14 `ink-soft`.
- Short: the check and the method only.
- Methods: Heritage listing (`ich_listing`), Community attestation (`community_attestation`), Registry check (`registry_check`). The method is always written out.

**ShareBar** (`buyer-split-bar`), Panel (384) and Receipt (596) widths.
- A 24 px bar of four segments with 2 px gaps, in this order: maker share (`jade`), materials (`clay`), Cindia fee (`indigo`), card fee (`edge`). Widths are proportional to the amounts.
- Under it, the maker share row: a 12 px swatch, "Maker share" and the amount (`buyer-split-maker-share`) in Label/16 `jade`.
- Then three equal columns for the costs: swatch and label in Caption/14 `ink-soft` over the amount in Body/16.

**EvidenceCard** (`reconcile-evidence-contract`, `-statement`, `-bank`), 392 wide (four Sell columns), `paper`, 1 px `line` border, 20 px padding, 12 px gaps.
- The kind in Label/14 `ink-soft` and the record ID in Mono/14 at the right, the title in Label/18, a sub line in Caption/14.
- Rows: the key figure first, in a band with a 3 px left rule and a wash: `jade` and `jade-wash` for the record Cindy trusts, `seal` and `seal-wash` for the ones that disagree. The figure is Mono/16 in the same color. Other rows sit under hairlines, with figures in Mono/16 and words in Body/16.
- The footer says it in words with an icon: "Trust this record" (check, `jade`), or what disagrees (flag, `seal`).

**RecordRow**, 800 by 44 (eight Sell columns), 16 px padding: date, record ID and amount in Mono/14 (the amount right-aligned), the kind as a Chip-like label, the channel in Body/16, and the status as an icon and a word.
- Header: `mat`, Label/14.
- Matched: the check in `jade`. Waiting: the clock in `amber`. Flagged: the flag in `seal`, a `seal-wash` row and a 3 px `seal` rule at the left.

**ScoreBar**, a 160 by 8 track in `line` with the fill in the tone's color (`indigo` by default) and the figure in Mono/14 10 px to its right. The fill is the score times 160.

**MakerMark**, a 24 px square with a 1 px `ink` border and the surname character in Noto Serif SC. The maker page shows it at 48 px.

**Seal**, a 72 px square in `seal` with the character (准) in Seal/32 and the date (10月1日) under it, both in `paper`. It never turns. It presses in over 220 ms (scale 1.06 to 1, opacity 0 to 1) and lands in the card's seal slot.

## Conversation and agents

**ChatBubble**, 2 px corners, 12 px by 16 px padding, 6 px gaps.
- Person: `indigo-wash`, right-aligned, up to 320 px. "You" in Label/14 `indigo` over the words in Body/16.
- Agent: `paper` with a 1 px `line` border, 384 px. The agent's name (`support-agent`) in Label/14 over the words. While the copy is a stand-in, a Sample tag sits next to the name.
- Rule-based: the same, with the Rule-based badge next to the name.
- Handover (`support-handoff`): full width, `amber-wash`, the clock icon in `amber` and one sentence in Body/16.

**AgentStep**, one agent in a run, 78 wide. Five or six in a row make the step strip at the top of the support drawer, with a "Now" line under them.
- A 20 px row with the run's thread through it (3 px) and a 12 px knot in the middle, then the agent's name centered in Label/14.
- Done: a `jade` knot with a 2 px `paper` outline and a solid `jade` thread. Active: an `indigo` knot inside a 20 px `indigo` ring, the name in `indigo`, the thread solid behind and dotted ahead, pulsing on the player clock. Waiting: a hollow knot with a 2 px `edge` stroke, a dotted `edge` thread, the name in `ink-soft`.
- A code agent shows "Rule-based" under its name.
- The "Now" line: a dot in `indigo` and what the active agent is doing ("Clerk is reading the shipping policy."), then, once answered, a check in `jade`, "Answered by Writer after 8 steps." and a "How it works" link that opens `?process=swarm`.

**AgentGraph** (`process-swarm-graph`), drawn in the swarm view's left 520 px.
- Cindy at the center, an 80 px circle. The run's specialists on the four diagonals, 106 px out on each axis, in roster order from the top left, as 64 px circles. Each label sits on the outer side, the name in Label/14 over the model in Caption/14.
- Inside each circle: the numbers of the steps that agent took, in Mono/14.
- Edges, 3 px, from circle edge to circle edge: `jade` once used, `indigo` for the latest handoff. A tool name sits beside its edge in Mono/14 `ink-soft`.
- The latest step's node lights: an `indigo-wash` fill, a 3 px `indigo` ring, the name in `indigo`.
- Step rows (`process-swarm-step-<stepId>`) on the right: the number, the agent, the kind and the tool in Mono/14, the model in Caption/14, the time in ms, and the summary on its own line in Caption/14. The latest row has an `indigo-wash` band. `process-swarm-run-picker` sits in the header, next to the Sample tag while the summaries are stand-ins.

**EmbeddingMap** (`process-search-map`), a `ground` panel with 2 px corners.
- Other pieces: 9 px hollow dots with a 1.5 px `edge` stroke. The six results: 12 px `indigo` dots, each labeled in Caption/14 `ink`, with hairline leaders where labels stack.
- The query: a 24 px star with a 2 px `seal` stroke, labeled "Your request". Scripted points are approximate, so the star stays hollow and its label adds "approximate". A live map fills the star.
- Links from the star to each result, 1.5 px `indigo`.
- The communities are named in Caption/14 `ink-soft` beside their clusters. Color doesn't separate the eight communities, because the chart palette stops at five series.
- A Sample tag reads "Sample positions" until B11's points exist, and a key line at the bottom says what the marks mean.
- `process-search-scores` on the right: each result's title in Label/14, its ScoreBar and figure, then the community and the matched keywords in Caption/14. The engine and the model ID close the list.

## Money pictures

**Money lattice** (`money-map-canvas`).
- Each party is a 2 px warp. A party in this month's moves uses `edge`, the rest use `line`. They're spread evenly from 288 to 1352 px, named on top in Label/14 with the role under it in Caption/14, all top-aligned.
- Each move is a row, in time order, with its date in Mono/14 at the left. The thread runs from the payer's warp to the payee's (`money-map-thread-<moveId>`): 4 px, a 10 px dot at the payer and a 10 px arrowhead at the payee.
- A label sits on the thread's midpoint, above it: `paper` with a hairline, the kind in Caption/14 `ink-soft` and the amount in Mono/14.
- Thread colors by kind: sale `chart-1`, fees `chart-2`, settlement to the studio `jade`, the project contribution and its pass-through `chart-3`, maker pay `chart-5`. The kind word and the amount always come with the color.
- The balance (`money-map-balance`) at the top right: "Studio account balance" in Label/14, the figure in Figure/48, the as-of date in Caption/14.

**Receipt thread**, along the left edge of the receipt.
- A 4 px rail with four 14 px stops: You, Cindia, Studio, the maker. Each is named in Label/14 at the left of the rail, with what it took or passed on under the name in Mono/14 ($185.00, $18.00 fee, $156.48, $134.48).
- Until the payout, the last stretch is dotted in `edge` and the maker's stop is hollow. Paid to the maker turns it solid `jade`, fills the stop, and sets the maker's name in `jade`. It draws over 700 ms when the status changes.

**Approval card** (`approvals-item-<approvalId>`), 800 wide, 16 px by 24 px padding.
- The kind and the approval ID, the title (Label/18) and the amount (Title/24). The Limit tag goes under them when it applies.
- The body: the follow-up's subject, or the maker rows with each held amount in `amber`. Then "Cindy proposed this. Only you can approve it." in Caption/14, and the actions (Approve as Seal, Decline as Quiet).
- A 72 px seal slot sits at the top right, 24 px in: a dashed `edge` square reading "Your seal" while waiting. Approving puts the Seal (`approvals-seal-<approvalId>`) into that slot and replaces the actions with "Approved" and the date, who approved it and what followed. The selected card has a 2 px `indigo` border.

## Illustrations

Eight thread drawings, each on an 800 by 800 `viewBox` with a `paper` ground and warp lines every 80 px. Satin and fill stitches run in the piece's facet colors, with one 5 px outline. They have no text, no images and no outside references, and all are under 11 KB.
- Pieces, named by piece ID for I3-redesign T5: `design/assets/illustrations/pc_01.svg` (Peony fan), `pc_02.svg` (Plum blossom bookmarks), `pc_04.svg` (Lotus at dawn), `pc_07.svg` (Peony sachet), `pc_11.svg` (Chrysanthemum fan).
- Samples for the search screens, until S3's pieces land, in `design/assets/illustrations/samples/`: a flower-stripe scarf, a woven band and a beaded bracelet. Each is generic and copies no community's design. On screens they always carry the Sample tag.
- The Figma components are the same files, byte for byte, checked by hash on import.

## Icons

Sixteen line icons on a 20 px grid, with a 1.5 px stroke and square caps and joins. All are stroke-only except the dot. Each comes with a word on screen: check, flag, clock, dot, chevron, close, search, shuffle, question, arrow, external, lock, thread, seal, send, sheet. The files are in `design/assets/icons/`, drawn in `ink`. Recolor them with `currentColor` in code.

## Needs

Things the screens use that the kit doesn't have yet. Each is small, and none changes a test ID.
- **AgentStep**, for the support drawer's step strip (`shop.drawer.support`, `studio.drawer.support`). Props: the run's steps in order, each with agent name, state (`done`, `active`, `waiting`) and kind. The support feature could also build it from kit parts.
- **Tag**, or four more `Badge` variants: `illustration`, `match`, `sample` and `limit`. `PieceCard` already draws its Illustration tag, and the search reasons, the gallery's Sample labels and the approvals limit use the rest.
- **Icon**, one component taking a name from the sixteen in `design/assets/icons/`.
- **Checkbox and Field** styles in `kit.css`, for the project add-on, the support input and the listing notes.
- **ModePicker**: `Tabs` restyled as a segmented control, or a `SegmentedControl` with the same props, for `search-surprise-mode`.
- **Strings**, for the kit and the shell, in both languages:
  - the three VerificationLine methods: Heritage listing 非遗名录, Community attestation 社区认证, Registry check 名册核验,
  - the SideSwitch in Chinese: 选购 for Shop and 售卖 for Sell,
  - "Not trained yet" in Chinese: 尚未训练.
