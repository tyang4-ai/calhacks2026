# Cindia · tokens

Handoff drop 1 · direction B · Warp and weft · Oct 24, 2026

Every token the restyle needs, with its value, what it replaces and what it's for. The same values are in `design/tokens.json`: its `css` object is ready to paste into `src/ui/tokens.css`, and its `tokens` tree is in Design Tokens Community Group style for anyone importing them elsewhere. 113 tokens: 19 existing names get new values, 26 keep theirs, 68 are new. Every new name follows `--c-<group>-<name>`. No existing name is removed, so features that use only kit components and tokens keep working without edits.

## The look in one paragraph

Warp and weft: records run as weft, people as warp, and money is the thread that crosses them. Pages sit on undyed ground with carded panels and hairline warp rules. A dark walnut beam across the top holds the top bar and the process bar on every page, so the map of the system is always in view. Colors are natural dyes (indigo, madder, weld, lichen, walnut) that textile traditions on every continent share and no single community owns. Type is Source Sans 3 for everything, Source Code Pro for figures in tables and logs, Noto Sans SC for Chinese. The seal stays: square, madder, and only a person's approval puts it there.

## What changes in the kit

Token values alone restyle most of the kit. These eleven changes need code in `src/ui/`, all inside I3-redesign:

1. **PageFrame** paints `--c-color-ground`. Panels, cards, inputs and drawers keep `--c-color-paper`, which is now the carded white.
2. **TopNav and the process bar sit on the beam.** Background `--c-color-beam`, text `--c-color-beam-text`, secondary text `--c-color-beam-soft`, the line between the two rows `--c-color-beam-line`. The top bar keeps its 56 px and the process bar its 64 px.
3. **SideSwitch on the beam:** a `--c-color-beam-soft` outline with 2 px corners. The selected side is filled `--c-color-beam-text` with `--c-color-ink` text in weight 600, so the selection reads by fill and weight, not color alone.
4. **ProcessBlock** sits on `--c-color-beam-raised` with a `--c-color-beam-line` border. Line 1 is the label (14 px, weight 600). Line 2 is the count and the word Live or Simulated (14 px). The state is a 3 px thread along the bottom edge, plus a mark:
   - idle: `--c-color-beam-soft`, dotted (`--c-thread-dash-idle`), no mark,
   - working: `--c-color-beam-live`, drawn partway and pulsing on the player clock (`--c-motion-pulse`),
   - done: `--c-color-beam-done`, full length, with a check,
   - attention: `--c-color-beam-flag`, dashed (`--c-thread-dash-attention`), with "!" and the open count.
   Selected (its view open): a 3 px `--c-color-beam-text` rule on top and the label in weight 700.
5. **Button:** `primary` is an `--c-color-indigo` fill with `--c-color-paper` text (it was ink). `quiet` is a paper fill, an `--c-color-edge` border and ink text. `seal` is unchanged in role: madder fill, paper text, the one urgent action per screen. All have 2 px corners and a 40 px height.
6. **Panel** drops the scroll mount: `--c-space-mat` is 0, leaving a paper face, a 1 px `--c-color-line` border and 2 px corners. A panel that holds a table may add a header band in `--c-color-mat`.
7. **Chip** has 2 px corners and an `--c-color-edge` border, like a woven label. Selected is an `--c-color-indigo-wash` fill with an `--c-color-indigo` border.
8. **Seal motion** presses in without the turn: scale 1.06 to 1 and opacity 0 to 1 over `--c-motion-seal`, rotation 0. The seal character and `MakerMark` use `--c-font-seal`.
9. **Thread:** a money thread is a solid line that draws itself along its path (dash offset from the path length to 0 over `--c-motion-stitch`), 4 px on the money map (`--c-stroke-thread-map`). A short-paid thread is `--c-color-seal` and dashed. The amount label sits at the midpoint in `--c-font-mono`.
10. **Figures:** amounts inside tables, ledgers and event logs, IDs and log timestamps use `--c-font-mono` at weight 500. Amounts in sentences, cards and hero figures stay in `--c-font-body`, whose digits are already tabular. Every amount still goes through `Money`.
11. **Focus:** every focusable control shows a 2 px `--c-color-indigo` ring with a 2 px offset.

`chartTheme` takes its series from `--c-chart-1` to `--c-chart-5` in order, grid lines from `--c-chart-grid`, axis text from `--c-chart-axis` and values from `--c-chart-value`.

## Fonts

- Add `@fontsource-variable/source-sans-3` and `@fontsource-variable/source-code-pro`, both 5.3.1 (OFL-1.1), the same release line as the Noto Sans SC package already installed. Import `wght.css` from each in `src/ui/fonts.ts`. These two packages need the orchestrator's OK, because the dependency list is frozen after G1.
- From the installed `@fontsource/noto-sans-sc`, also import `700.css` for Chinese headings.
- Keep `@fontsource/noto-serif-sc` 600 for the seal and the maker mark. Its 700 import, Inter and Fraunces can go once nothing uses them. Nothing breaks if they stay.
- Every family stack ends with "Noto Sans Canadian Aboriginal" so a maker-written name in syllabics can render where the font is present. No bundled Latin font covers syllabics. The catalog has none today.
- Coverage was checked against the font files: Source Sans 3 covers every name in the catalog and the wider set makers may write later (Sámi ŧ đ ŋ, Diné ą ǫ ł, Maa ɔ ɛ ɨ ʉ, pinyin tones). Source Code Pro lacks the capital Maa letters, so it never sets names.

## Storefront accents

`Storefront.theme.accent` is a short name used as `var(--c-color-<accent>)`, with `var(--c-color-<accent>-wash)` for large fills. Eight names are valid: `ink`, `seal`, `jade`, `amber`, `indigo`, `plum`, `teal`, `clay`. The four in today's mock data (`jade`, `seal`, `amber`, `ink`) keep working with their new values. A community picks its own accent in the storefront builder (`storefront-accent`). Cindia never assigns one, and the community's name is always written next to it, so a color never stands for a people. Each accent passes 4.5:1 as text on paper, on the ground and on its own wash, and paper text passes 4.5:1 on it.

## Chart palette

Five series colors, validated with the dataviz skill's `validate_palette.js` on both the paper and the ground surfaces: lightness band, chroma floor, color-blind separation (worst adjacent ΔE 13.5), normal-vision separation (worst adjacent ΔE 16.8) and 3:1 contrast against both surfaces. Assign them in order and never cycle them. The first three also pass when every pair is compared (color-blind ΔE 14.9, normal 16.8), so pies, scatter plots and any chart with three series can use them. Series 4 and 5 are for bars, stacks and labeled lines only. Past five series, fold the rest into Other. Status keeps its own tokens and is never a series color: `--c-color-jade` for money in, `--c-color-amber` for waiting, `--c-color-seal` for flags, each with an icon and a word.

## Icons

Line icons on a 20 px grid with a 1.5 px stroke, square caps and joins and no fills, in ink or the state's color. Every state icon comes with a word. The set for drop 2: check (done, matched), flag mark "!" in a square (needs attention), clock (waiting), dot (live), chevron, close, search, shuffle (Surprise me), question mark (Help), language (文 A), arrow, external link, lock (the card token), thread (money), seal outline.

## Illustrations

Pieces are drawn in thread, the same line language as the diagrams:
- an 800 by 800 `viewBox` on a paper ground, with warp lines every 80 px (2 px, `--c-color-line`),
- weavings as weft rows in the piece's own colors (8 px rows, 10 px apart), jewelry and pottery as plain shapes, beadwork as rows of round beads, patchwork as bands of small blocks,
- patterns in plain geometry only: stripes, steps, diamonds, zigzags and bands, with flowers only on Ojibwe beadwork,
- one 5 px outline in the piece's darkest color,
- no text, no embedded images, no outside references, under 30 KB, and the same file every time for the same piece (I2-art's rules).
The `PieceCard` draws the Illustration tag on top. Nothing is copied from a real piece or a community's protected designs. Nothing sacred, ceremonial or clichéd is drawn: no Yei figures, katsina, feathers, sandpainting designs or whirling-log shapes.

## Elevation

| Level | What | How |
|---|---|---|
| 0 | The page | `--c-color-ground` |
| 1 | Panels and cards | `--c-color-paper`, 1 px `--c-color-line` border, no shadow |
| 2 | The process overlay and drawers | `--c-color-paper`, `--c-shadow-overlay`, over `--c-color-scrim` |
| Beam | Top bar and process bar | `--c-color-beam`, always on top. The process overlay and drawers open under it |

## Motion

The thread draws in 700 ms with an ease in and out, like a passing shuttle. Records weave in one row after another, 40 ms apart. A matched row closes its gap in 160 ms. The seal presses in over 220 ms. Clicks answer in 160 ms. A working process block pulses once every 1200 ms. All motion follows the event player's clock, never wall time. Under reduced motion every duration is 0: threads appear finished, the seal appears in place, and nothing pulses (`reducedMotion` in tokens.json).

## Every token

### Color

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-color-paper` | `#FAF7F0` | changed | `#F6F1E7` | Carded. Panels, cards, inputs, drawers, and text on dark fills |
| `--c-color-mat` | `#E4DCCD` | changed | `#EDE4D3` | Loom. Table header rows, selected rows, the selected nav item, the Sell header strip |
| `--c-color-ink` | `#211C18` | changed | `#1C1A17` | Walnut. Text and icons. Also a storefront accent |
| `--c-color-ink-soft` | `#554E47` | changed | `#5A5249` | Iron. Secondary text, captions, axis labels |
| `--c-color-line` | `#D3C9B9` | changed | `#D9CFBF` | Warp. Hairlines and grid rules, never text |
| `--c-color-seal` | `#A0302A` | changed | `#B23A2E` | Madder. The seal, flags, money out short, the one urgent action. Also a storefront accent |
| `--c-color-jade` | `#3A6246` | changed | `#2F6B4F` | Lichen. Money that arrived or matched, maker share. Also a storefront accent |
| `--c-color-amber` | `#765600` | changed | `#8A5A0B` | Weld. Waiting: pending payout, needs review. Also a storefront accent |
| `--c-color-seal-wash` | `#F2DCD7` | changed | `#F3DFDA` | Madder wash. Flagged rows and evidence panels |
| `--c-color-jade-wash` | `#DDE7DE` | changed | `#DFEAE2` | Lichen wash. Matched rows |
| `--c-color-ground` | `#EEE8DC` | new |  | Undyed. The page ground behind panels. PageFrame paints it |
| `--c-color-edge` | `#857A6C` | new |  | Control borders: inputs, quiet buttons, chips, the switch. 3:1 or better |
| `--c-color-indigo` | `#22406F` | new |  | Primary buttons, links, focus rings, the Live badge, working state. Also a storefront accent |
| `--c-color-indigo-wash` | `#E1E6EF` | new |  | Live badge ground, selected chip, the working row |
| `--c-color-amber-wash` | `#F0E5C4` | new |  | Waiting rows |
| `--c-color-ink-wash` | `#E4DCCD` | new |  | Wash for the ink accent on storefronts (same value as mat) |
| `--c-color-plum` | `#6A3B63` | new |  | Storefront accent |
| `--c-color-plum-wash` | `#EEE2EB` | new |  | Storefront accent wash |
| `--c-color-teal` | `#1D5E63` | new |  | Storefront accent |
| `--c-color-teal-wash` | `#DCEAEA` | new |  | Storefront accent wash |
| `--c-color-clay` | `#8E4626` | new |  | Storefront accent |
| `--c-color-clay-wash` | `#F2E1D6` | new |  | Storefront accent wash |
| `--c-color-beam` | `#211C18` | new |  | The beam: the 56 px top bar and the 64 px process bar on every page |
| `--c-color-beam-raised` | `#2B2520` | new |  | Process block ground on the beam |
| `--c-color-beam-line` | `#7A7066` | new |  | Dividers and block borders on the beam, 3:1 or better |
| `--c-color-beam-text` | `#FAF7F0` | new |  | Text on the beam |
| `--c-color-beam-soft` | `#C9BFB1` | new |  | Secondary text on the beam, the Simulated label, idle threads |
| `--c-color-beam-live` | `#A9BDE2` | new |  | Live label and the working thread on the beam |
| `--c-color-beam-done` | `#8FC09D` | new |  | Done thread and check on the beam |
| `--c-color-beam-flag` | `#EE9A90` | new |  | Needs-attention thread, mark and count on the beam |
| `--c-color-beam-wait` | `#DFBD63` | new |  | Waiting text on the beam |
| `--c-color-scrim` | `rgba(33, 28, 24, 0.40)` | new |  | Behind the process overlay and open drawers |

### Chart

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-chart-1` | `#284E99` | new |  | Series 1, indigo. Safe with 2 and 3 on every pair |
| `--c-chart-2` | `#AF5A21` | new |  | Series 2, clay |
| `--c-chart-3` | `#B56CA6` | new |  | Series 3, orchid |
| `--c-chart-4` | `#718C39` | new |  | Series 4, moss. Adjacent-pair charts only (bars, stacks, labeled lines) |
| `--c-chart-5` | `#017D9F` | new |  | Series 5, sea. Adjacent-pair charts only |
| `--c-chart-grid` | `#D3C9B9` | new |  | Grid lines (same as line) |
| `--c-chart-axis` | `#554E47` | new |  | Axis labels and ticks (same as ink-soft) |
| `--c-chart-value` | `#211C18` | new |  | Values and direct labels (same as ink) |

### Type families

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-font-body` | `"Source Sans 3 Variable", "Noto Sans SC", "Noto Sans Canadian Aboriginal", system-ui, sans-serif` | changed | `"Inter Variable", "Noto Sans SC", system-ui, sans-serif` | All body text and UI. Digits are tabular by default |
| `--c-font-heading-en` | `"Source Sans 3 Variable", "Noto Sans SC", system-ui, sans-serif` | changed | `"Fraunces Variable", "Noto Serif SC", Georgia, serif` | English headings, weight 700 |
| `--c-font-heading-zh` | `"Noto Sans SC", "Source Sans 3 Variable", sans-serif` | changed | `"Noto Serif SC", "Fraunces Variable", serif` | Chinese headings, weight 700 |
| `--c-font-body-zh` | `"Noto Sans SC", "Source Sans 3 Variable", system-ui, sans-serif` | changed | `"Noto Sans SC", "Inter Variable", system-ui, sans-serif` | Chinese body text, weights 400 and 500 |
| `--c-font-mono` | `"Source Code Pro Variable", "Noto Sans SC", ui-monospace, monospace` | new |  | Amounts in tables and ledgers, IDs, event logs, timestamps. Never names |
| `--c-font-seal` | `"Noto Serif SC", serif` | new |  | Only the seal character and the MakerMark |

### Weights

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-weight-regular` | `400` | new |  | Body |
| `--c-weight-medium` | `500` | new |  | Mono figures, Chinese emphasis |
| `--c-weight-semibold` | `600` | new |  | Labels, buttons, table headers, block names |
| `--c-weight-bold` | `700` | new |  | Headings in both languages, hero figures |

### Type scale

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-text-14` | `14px` | same |  | Smallest text anywhere: captions, badges, log rows |
| `--c-text-16` | `16px` | same |  | Body |
| `--c-text-18` | `18px` | same |  | Card titles, lead text |
| `--c-text-21` | `21px` | same |  | Panel titles |
| `--c-text-24` | `24px` | same |  | Section titles |
| `--c-text-36` | `36px` | same |  | Page titles |
| `--c-text-48` | `48px` | same |  | The one big figure on a money screen, the catch amount |
| `--c-text-64` | `64px` | new |  | Hero figure, one per screen at most: the maker’s month income |

### Line height

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-leading-body` | `1.5` | same |  | Body text |
| `--c-leading-body-zh` | `1.7` | same |  | Chinese body text |
| `--c-leading-heading` | `1.2` | same |  | Headings |
| `--c-leading-mono` | `1.4` | new |  | Log rows and ledger cells |

### Space

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-space-4` | `4px` | same |  | Spacing scale |
| `--c-space-8` | `8px` | same |  | Spacing scale |
| `--c-space-12` | `12px` | same |  | Spacing scale |
| `--c-space-16` | `16px` | same |  | Spacing scale |
| `--c-space-24` | `24px` | same |  | Spacing scale |
| `--c-space-32` | `32px` | same |  | Spacing scale |
| `--c-space-48` | `48px` | same |  | Spacing scale |
| `--c-space-64` | `64px` | same |  | Spacing scale |
| `--c-space-panel-console` | `24px` | same |  | Panel padding on the desktop |
| `--c-space-panel-phone` | `16px` | same |  | Legacy. Phone frames are retired |
| `--c-space-mat` | `0px` | changed | `6px` | No scroll mount in B. Panels are a carded face with a 1 px warp border |

### Sizes

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-size-page-w` | `1440px` | new |  | PageFrame width |
| `--c-size-page-h` | `900px` | new |  | PageFrame height |
| `--c-size-topnav` | `56px` | new |  | Top bar height (shell-topnav) |
| `--c-size-processbar` | `64px` | new |  | Process bar height (process-bar) |
| `--c-size-beam` | `120px` | new |  | Top bar plus process bar |
| `--c-size-process-block-h` | `48px` | new |  | Process block height, inside the 64 px bar |
| `--c-size-sell-nav` | `184px` | new |  | Sell left nav width (shell-nav-<view>) |
| `--c-size-sell-header` | `48px` | new |  | Sell header strip: studio name and Cindy’s latest line |
| `--c-size-drawer` | `440px` | new |  | Drawer width, from the right, under the beam |
| `--c-size-overlay-w` | `1200px` | new |  | Process overlay width |
| `--c-size-overlay-h` | `720px` | new |  | Process overlay height |
| `--c-size-control-h` | `40px` | new |  | Buttons and inputs |
| `--c-size-row-h` | `44px` | new |  | Table and list rows |

### Grid

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-grid-columns` | `12` | new |  | Columns on every surface |
| `--c-grid-margin-shop` | `48px` | new |  | Shop, maker and store page margins |
| `--c-grid-gutter-shop` | `24px` | new |  | Shop gutters (12 columns of 90 px) |
| `--c-grid-margin-sell` | `24px` | new |  | Sell view margins, inside the nav |
| `--c-grid-gutter-sell` | `16px` | new |  | Sell gutters (12 columns of 86 px) |

### Corners

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-radius-panel` | `2px` | same |  | Panels and cards |
| `--c-radius-control` | `2px` | changed | `6px` | Buttons, inputs, the switch |
| `--c-radius-chip` | `2px` | changed | `999px` | Keyword chips and tags read as woven labels, not pills |
| `--c-radius-phone` | `36px` | same |  | Legacy. Phone frames are retired |
| `--c-radius-seal` | `0` | same |  | The seal stays square |
| `--c-radius-dot` | `999px` | new |  | Status dots and map points only |

### Strokes

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-stroke-hairline` | `1px` | new |  | Borders and rules |
| `--c-stroke-rule` | `3px` | new |  | Left rule on flagged rows, the selected nav item, the active block |
| `--c-stroke-thread` | `3px` | new |  | Process block threads and small diagrams |
| `--c-stroke-thread-map` | `4px` | new |  | Money threads on the money map and in the money view |
| `--c-stroke-focus` | `2px` | new |  | Focus ring in indigo, 2 px offset |

### Thread patterns

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-thread-dash-attention` | `8 6` | new |  | Thread pattern for needs attention |
| `--c-thread-dash-idle` | `2 6` | new |  | Thread pattern for idle |

### Shadows

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-shadow-phone` | `0 12px 32px rgba(28, 26, 23, 0.18)` | same |  | Legacy. Unused once phone frames are gone |
| `--c-shadow-overlay` | `0 16px 40px rgba(33, 28, 24, 0.28)` | new |  | The process overlay and drawers. Nothing else casts a shadow |

### Motion

| Token | Value | Status | Was | Use |
|---|---|---|---|---|
| `--c-motion-stitch` | `700ms` | changed | `900ms` | A money thread drawing along its path, like a passing shuttle |
| `--c-motion-stitch-ease` | `cubic-bezier(0.45, 0, 0.55, 1)` | changed | `cubic-bezier(0, 0, 0.2, 1)` | Ease in and out |
| `--c-motion-seal` | `220ms` | same |  | The seal pressing in: scale 1.06 to 1, opacity 0 to 1, no turn |
| `--c-motion-ui` | `160ms` | same |  | Anything a person clicked |
| `--c-motion-weave-stagger` | `40ms` | new |  | Gap between rows weaving in as records arrive |
| `--c-motion-tighten` | `160ms` | new |  | A matched row closing its gap |
| `--c-motion-pulse` | `1200ms` | new |  | One cycle of a working block’s thread, on the player clock |

## Contrast

80 pairs, computed from the hex values with the WCAG 2 formula. Text needs 4.5:1 and marks, borders and chart series need 3:1. All pass. Lowest text pair: --c-color-amber on --c-color-mat, 4.97:1. Lowest non-text pair: --c-chart-3 on --c-color-ground, 3.04:1. Hairlines (`--c-color-line`) never carry text.

| Foreground | Background | Ratio | Needs |
|---|---|---|---|
| `--c-color-ink` #211C18 | `--c-color-paper` #FAF7F0 | 15.78:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-ground` #EEE8DC | 13.84:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-mat` #E4DCCD | 12.39:1 | 4.5:1 |
| `--c-color-ink-soft` #554E47 | `--c-color-paper` #FAF7F0 | 7.65:1 | 4.5:1 |
| `--c-color-ink-soft` #554E47 | `--c-color-ground` #EEE8DC | 6.70:1 | 4.5:1 |
| `--c-color-ink-soft` #554E47 | `--c-color-mat` #E4DCCD | 6.01:1 | 4.5:1 |
| `--c-color-seal` #A0302A | `--c-color-paper` #FAF7F0 | 6.65:1 | 4.5:1 |
| `--c-color-seal` #A0302A | `--c-color-ground` #EEE8DC | 5.83:1 | 4.5:1 |
| `--c-color-seal` #A0302A | `--c-color-mat` #E4DCCD | 5.22:1 | 4.5:1 |
| `--c-color-jade` #3A6246 | `--c-color-paper` #FAF7F0 | 6.51:1 | 4.5:1 |
| `--c-color-jade` #3A6246 | `--c-color-ground` #EEE8DC | 5.71:1 | 4.5:1 |
| `--c-color-jade` #3A6246 | `--c-color-mat` #E4DCCD | 5.11:1 | 4.5:1 |
| `--c-color-amber` #765600 | `--c-color-paper` #FAF7F0 | 6.33:1 | 4.5:1 |
| `--c-color-amber` #765600 | `--c-color-ground` #EEE8DC | 5.55:1 | 4.5:1 |
| `--c-color-amber` #765600 | `--c-color-mat` #E4DCCD | 4.97:1 | 4.5:1 |
| `--c-color-indigo` #22406F | `--c-color-paper` #FAF7F0 | 9.66:1 | 4.5:1 |
| `--c-color-indigo` #22406F | `--c-color-ground` #EEE8DC | 8.47:1 | 4.5:1 |
| `--c-color-indigo` #22406F | `--c-color-mat` #E4DCCD | 7.59:1 | 4.5:1 |
| `--c-color-plum` #6A3B63 | `--c-color-paper` #FAF7F0 | 8.12:1 | 4.5:1 |
| `--c-color-plum` #6A3B63 | `--c-color-ground` #EEE8DC | 7.12:1 | 4.5:1 |
| `--c-color-plum` #6A3B63 | `--c-color-mat` #E4DCCD | 6.37:1 | 4.5:1 |
| `--c-color-teal` #1D5E63 | `--c-color-paper` #FAF7F0 | 6.93:1 | 4.5:1 |
| `--c-color-teal` #1D5E63 | `--c-color-ground` #EEE8DC | 6.07:1 | 4.5:1 |
| `--c-color-teal` #1D5E63 | `--c-color-mat` #E4DCCD | 5.44:1 | 4.5:1 |
| `--c-color-clay` #8E4626 | `--c-color-paper` #FAF7F0 | 6.43:1 | 4.5:1 |
| `--c-color-clay` #8E4626 | `--c-color-ground` #EEE8DC | 5.64:1 | 4.5:1 |
| `--c-color-clay` #8E4626 | `--c-color-mat` #E4DCCD | 5.05:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-ink-wash` #E4DCCD | 12.39:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-ink-wash` #E4DCCD | 12.39:1 | 4.5:1 |
| `--c-color-paper` #FAF7F0 | `--c-color-ink` #211C18 | 15.78:1 | 4.5:1 |
| `--c-color-seal` #A0302A | `--c-color-seal-wash` #F2DCD7 | 5.42:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-seal-wash` #F2DCD7 | 12.86:1 | 4.5:1 |
| `--c-color-paper` #FAF7F0 | `--c-color-seal` #A0302A | 6.65:1 | 4.5:1 |
| `--c-color-jade` #3A6246 | `--c-color-jade-wash` #DDE7DE | 5.49:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-jade-wash` #DDE7DE | 13.31:1 | 4.5:1 |
| `--c-color-paper` #FAF7F0 | `--c-color-jade` #3A6246 | 6.51:1 | 4.5:1 |
| `--c-color-amber` #765600 | `--c-color-amber-wash` #F0E5C4 | 5.39:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-amber-wash` #F0E5C4 | 13.43:1 | 4.5:1 |
| `--c-color-paper` #FAF7F0 | `--c-color-amber` #765600 | 6.33:1 | 4.5:1 |
| `--c-color-indigo` #22406F | `--c-color-indigo-wash` #E1E6EF | 8.26:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-indigo-wash` #E1E6EF | 13.48:1 | 4.5:1 |
| `--c-color-paper` #FAF7F0 | `--c-color-indigo` #22406F | 9.66:1 | 4.5:1 |
| `--c-color-plum` #6A3B63 | `--c-color-plum-wash` #EEE2EB | 6.91:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-plum-wash` #EEE2EB | 13.44:1 | 4.5:1 |
| `--c-color-paper` #FAF7F0 | `--c-color-plum` #6A3B63 | 8.12:1 | 4.5:1 |
| `--c-color-teal` #1D5E63 | `--c-color-teal-wash` #DCEAEA | 6.00:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-teal-wash` #DCEAEA | 13.67:1 | 4.5:1 |
| `--c-color-paper` #FAF7F0 | `--c-color-teal` #1D5E63 | 6.93:1 | 4.5:1 |
| `--c-color-clay` #8E4626 | `--c-color-clay-wash` #F2E1D6 | 5.41:1 | 4.5:1 |
| `--c-color-ink` #211C18 | `--c-color-clay-wash` #F2E1D6 | 13.28:1 | 4.5:1 |
| `--c-color-paper` #FAF7F0 | `--c-color-clay` #8E4626 | 6.43:1 | 4.5:1 |
| `--c-color-ink-soft` #554E47 | `--c-color-seal-wash` #F2DCD7 | 6.23:1 | 4.5:1 |
| `--c-color-ink-soft` #554E47 | `--c-color-indigo-wash` #E1E6EF | 6.53:1 | 4.5:1 |
| `--c-color-edge` #857A6C | `--c-color-paper` #FAF7F0 | 3.93:1 | 3.0:1 |
| `--c-color-edge` #857A6C | `--c-color-ground` #EEE8DC | 3.44:1 | 3.0:1 |
| `--c-color-beam-text` #FAF7F0 | `--c-color-beam` #211C18 | 15.78:1 | 4.5:1 |
| `--c-color-beam-text` #FAF7F0 | `--c-color-beam-raised` #2B2520 | 14.14:1 | 4.5:1 |
| `--c-color-beam-soft` #C9BFB1 | `--c-color-beam` #211C18 | 9.30:1 | 4.5:1 |
| `--c-color-beam-soft` #C9BFB1 | `--c-color-beam-raised` #2B2520 | 8.34:1 | 4.5:1 |
| `--c-color-beam-live` #A9BDE2 | `--c-color-beam` #211C18 | 8.89:1 | 4.5:1 |
| `--c-color-beam-live` #A9BDE2 | `--c-color-beam-raised` #2B2520 | 7.97:1 | 4.5:1 |
| `--c-color-beam-done` #8FC09D | `--c-color-beam` #211C18 | 8.20:1 | 4.5:1 |
| `--c-color-beam-done` #8FC09D | `--c-color-beam-raised` #2B2520 | 7.34:1 | 4.5:1 |
| `--c-color-beam-flag` #EE9A90 | `--c-color-beam` #211C18 | 7.77:1 | 4.5:1 |
| `--c-color-beam-flag` #EE9A90 | `--c-color-beam-raised` #2B2520 | 6.96:1 | 4.5:1 |
| `--c-color-beam-wait` #DFBD63 | `--c-color-beam` #211C18 | 9.32:1 | 4.5:1 |
| `--c-color-beam-wait` #DFBD63 | `--c-color-beam-raised` #2B2520 | 8.35:1 | 4.5:1 |
| `--c-color-beam-line` #7A7066 | `--c-color-beam` #211C18 | 3.49:1 | 3.0:1 |
| `--c-color-beam-line` #7A7066 | `--c-color-beam-raised` #2B2520 | 3.12:1 | 3.0:1 |
| `--c-color-ink` #211C18 | `--c-color-beam-text` #FAF7F0 | 15.78:1 | 4.5:1 |
| `--c-chart-1` #284E99 | `--c-color-paper` #FAF7F0 | 7.43:1 | 3.0:1 |
| `--c-chart-1` #284E99 | `--c-color-ground` #EEE8DC | 6.52:1 | 3.0:1 |
| `--c-chart-2` #AF5A21 | `--c-color-paper` #FAF7F0 | 4.56:1 | 3.0:1 |
| `--c-chart-2` #AF5A21 | `--c-color-ground` #EEE8DC | 4.00:1 | 3.0:1 |
| `--c-chart-3` #B56CA6 | `--c-color-paper` #FAF7F0 | 3.47:1 | 3.0:1 |
| `--c-chart-3` #B56CA6 | `--c-color-ground` #EEE8DC | 3.04:1 | 3.0:1 |
| `--c-chart-4` #718C39 | `--c-color-paper` #FAF7F0 | 3.56:1 | 3.0:1 |
| `--c-chart-4` #718C39 | `--c-color-ground` #EEE8DC | 3.12:1 | 3.0:1 |
| `--c-chart-5` #017D9F | `--c-color-paper` #FAF7F0 | 4.43:1 | 3.0:1 |
| `--c-chart-5` #017D9F | `--c-color-ground` #EEE8DC | 3.88:1 | 3.0:1 |
