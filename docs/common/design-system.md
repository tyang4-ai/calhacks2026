# Design system · Warp and weft

Read by the integrator (it keeps `src/ui/` and the shell in step with this file) and every feature. Features use the UI kit and these tokens only. They never define their own colors, fonts or motion. The values live in `src/ui/tokens.css` and nowhere else.

## The idea

Design drop 3, direction B, Warp and weft, picked by Gordon on Oct 24 (`design/HANDOFF.md`). Records run as weft, people as warp, and money is the thread that crosses them.

- **Pages sit on undyed ground.** The page is `--c-color-ground`. Panels, cards, inputs and drawers are carded white (`--c-color-paper`) with a hairline edge and 2 px corners.
- **The beam.** A dark walnut band across the top of every page holds the top bar and the process bar, 120 px in all, so the map of the system is always in view. The pitch cards and the end card use the beam as their whole ground.
- **One memorable thing: money moves as thread.** Every flow of money (buyer to co-op, co-op to maker, gallery to co-op, buyer to a community fund) is a line that draws itself along its path, like a passing shuttle. Nothing else on screen animates on its own, except a process block that is `working`.
- **The seal means a person decided.** The owner's approval leaves a square madder seal on the item, with the owner's initials and the date. Cindy never stamps anything. Its proposals stay unsealed until the owner approves, which is the responsible-AI story in one image.
- **Natural dyes.** Indigo, madder, weld, lichen and walnut, which textile traditions on every continent share and no single community owns. A color never stands for a people: a community's accent is its own pick, always written beside its name.
- **Projector first.** Judging happens at a table on a laptop screen, often at an angle. Text meets 4.5:1 contrast, the smallest text is 14 px, and nothing important relies on color alone.
- **Figma drops.** A drop under `design/` changes the tokens and the kit in one place (I3-redesign), and features follow without edits wherever they used only kit components and tokens.

## Desktop pages

Desktop only. Phone frames are retired.

| Element | Size |
|---|---|
| `PageFrame`, the desktop page | 1440 by 900 on `--c-color-ground`. `src/ui/PageFrame.tsx` exports `PAGE_WIDTH` (1440) and `PAGE_HEIGHT` (900). The kit owns them, and the shell's stage and the demo tests import them from there |
| The beam | 120 px on `--c-color-beam`: the top bar and the process bar. It never scrolls |
| The top bar (`TopNav`) | 56 px. The word Cindia at the 48 px margin, then the Shop and Sell switch. At the right: L1 on two lines in `--c-color-beam-soft`, Ask Cindy on Sell pages, Help. A `--c-color-beam-line` hairline under it. No language toggle |
| The process bar band | 64 px, under the top bar. Eleven `ProcessBlock`s, 104 px wide (Counterfeit watch 124), 48 px tall, 8 px from the band's top and bottom, then "Live: N of 11" over one Simulated badge |
| The Sell header | 48 px on `--c-color-mat`: the co-op's name (21 px, 700), "Cindy ·" and her latest line whole on up to two lines, and L2 at the right on two lines |
| The Sell site's left nav | 184 px on paper, 44 px rows, 16 px labels. The selected view has the mat fill, a 3 px indigo rule on its left and weight 600 |
| A drawer (`Drawer`) | 440 px wide, from the right, under the beam (x 1000, y 120, 780 tall), paper with `--c-shadow-overlay` |
| The process overlay | 1200 by 720, centered under the beam (x 120, y 150), paper with `--c-shadow-overlay` and 2 px corners, over `--c-color-scrim`, which covers the page but not the beam |

- **Grids.** Shop, maker pages and storefronts: 12 columns, 48 px margins, 24 px gutters (1344 px of content). Sell, right of the nav: 12 columns, 24 px margins, 16 px gutters (1208 px). Tokens `--c-grid-*`.
- **The surface area** is the 780 px under the beam. A page may scroll inside it. Whatever a tour camera needs sits in the first 780 px.
- On the stage, a tour beat with a process scales its frame to 0.66 in the left two thirds and shows the process view in a 480 by 900 paper panel filling the right third, with an edge hairline and the overlay shadow (`ui-contract.md`, Camera states). Text sizes are judged in the frame's own pixels.
- **The pitch cards and the end card** fill the stage on `--c-color-beam` in beam-text type: a thread across the top, "n of 3", the title at 64 px and up to four lines at 36 px, each after a dot in one of the beam's state colors, and L1 at the foot in `--c-color-beam-soft`. The Cindia card's tagline is 48 px in `--c-color-beam-done`. The words come only from `src/app/demo/pitch.ts`.
- **The beat label** is a small paper tag at the bottom left of the stage. It moves to the top right on the pitch camera and on `sell-catch`, and to the top right under the beam on the `store` camera, so it never covers L1, a top bar or a figure.

## Color

| Token | Hex | Use |
|---|---|---|
| `--c-color-ground` | `#EEE8DC` | The page ground, under every panel |
| `--c-color-paper` | `#FAF7F0` | Carded panels, cards, inputs, drawers, the process overlay |
| `--c-color-mat` | `#E4DCCD` | The Sell header, table header bands, selected rows and nav items |
| `--c-color-ink` | `#211C18` | Text and icons |
| `--c-color-ink-soft` | `#554E47` | Secondary text, captions, axis labels |
| `--c-color-ink-wash` | `#E4DCCD` | The ink accent's wash |
| `--c-color-line` | `#D3C9B9` | Hairlines and borders only, never text |
| `--c-color-edge` | `#857A6C` | The edge of a control (quiet buttons, chips, inputs) that must show at 3:1. Never text |
| `--c-color-indigo` | `#22406F` | Primary buttons, links, the focus ring, the selected nav rule |
| `--c-color-indigo-wash` | `#E1E6EF` | Selected chips, the latest step in a list |
| `--c-color-seal` | `#A0302A` | Madder. The approval seal, flags, money going out short, the one urgent button per screen |
| `--c-color-seal-wash` | `#F2DCD7` | A flagged row or evidence panel |
| `--c-color-jade` | `#3A6246` | Lichen. Money that arrived or matched, maker share, verification lines |
| `--c-color-jade-wash` | `#DDE7DE` | A matched row |
| `--c-color-amber` | `#765600` | Weld. Waiting states: pending payout, held, needs review |
| `--c-color-amber-wash` | `#F0E5C4` | A waiting note, a handover to a person |
| `--c-color-plum`, `--c-color-teal`, `--c-color-clay` and their `-wash` | `#6A3B63`, `#1D5E63`, `#8E4626` | Storefront accents only |
| `--c-color-beam` | `#211C18` | The beam, the pitch cards and the end card |
| `--c-color-beam-raised` | `#2B2520` | A process block on the beam |
| `--c-color-beam-line` | `#7A7066` | Hairlines and block borders on the beam. Never text |
| `--c-color-beam-text` | `#FAF7F0` | Text on the beam |
| `--c-color-beam-soft` | `#C9BFB1` | Secondary text and outlines on the beam |
| `--c-color-beam-live`, `-done`, `-flag`, `-wait` | `#A9BDE2`, `#8FC09D`, `#EE9A90`, `#DFBD63` | A process block's state on the beam: working or live, done, attention, waiting |
| `--c-color-scrim` | `rgba(33, 28, 24, 0.40)` | The scrim behind the process overlay and drawers, never text |

- **Storefront accents.** `Storefront.theme.accent` is one of `ink`, `seal`, `jade`, `amber`, `indigo`, `plum`, `teal`, `clay`, used as `var(--c-color-<accent>)` with `var(--c-color-<accent>-wash)` for large fills. Text on a wash is ink. A community picks its own, and its name is always written next to it.
- **Charts** take `--c-chart-1` to `--c-chart-5` in order and never cycle them (`--c-chart-grid`, `--c-chart-axis`, `--c-chart-value` for the frame). Series 4 and 5 are for bars, stacks and labeled lines only. Past five series, fold the rest into Other. Status keeps jade, amber and seal, each with an icon and a word, and is never a series color.
- Seal madder appears at most once per screen as a large area. Flags use it as a thin left rule plus the wash.
- **The second cue.** A color always comes with a second cue: an icon, a word or a position. A process block's state is its thread's pattern plus a mark and a word (Idle, Working, Done, Attention), never its color alone.

## Contrast pairs

Every pair the design lets text (or a mark that carries meaning) sit on. `node scripts/check-contrast.mjs` reads this table, takes each value from `src/ui/tokens.css`, and exits 1 if a pair falls under its need: 4.5 to 1 for text, 3 to 1 for a mark that isn't text (a 3 px rule, a border that shows a control's edge, a chart series). No text uses a 3 to 1 pair. A new pairing goes in this table before it goes on screen. The design's own copy of these checks is `checks` in `design/tokens.json`.

| Text or mark | Ground | Need | Design's ratio | What it is |
|---|---|---|---|---|
| `--c-color-ink` | `--c-color-paper` | 4.5 | 15.78 | Text |
| `--c-color-ink` | `--c-color-ground` | 4.5 | 13.84 | Text |
| `--c-color-ink` | `--c-color-mat` | 4.5 | 12.39 | Text |
| `--c-color-ink-soft` | `--c-color-paper` | 4.5 | 7.65 | Text |
| `--c-color-ink-soft` | `--c-color-ground` | 4.5 | 6.70 | Text |
| `--c-color-ink-soft` | `--c-color-mat` | 4.5 | 6.01 | Text |
| `--c-color-seal` | `--c-color-paper` | 4.5 | 6.65 | Text |
| `--c-color-seal` | `--c-color-ground` | 4.5 | 5.83 | Text |
| `--c-color-seal` | `--c-color-mat` | 4.5 | 5.22 | Text |
| `--c-color-jade` | `--c-color-paper` | 4.5 | 6.51 | Text |
| `--c-color-jade` | `--c-color-ground` | 4.5 | 5.71 | Text |
| `--c-color-jade` | `--c-color-mat` | 4.5 | 5.11 | Text |
| `--c-color-amber` | `--c-color-paper` | 4.5 | 6.33 | Text |
| `--c-color-amber` | `--c-color-ground` | 4.5 | 5.55 | Text |
| `--c-color-amber` | `--c-color-mat` | 4.5 | 4.97 | Text |
| `--c-color-indigo` | `--c-color-paper` | 4.5 | 9.66 | Text |
| `--c-color-indigo` | `--c-color-ground` | 4.5 | 8.47 | Text |
| `--c-color-indigo` | `--c-color-mat` | 4.5 | 7.59 | Text |
| `--c-color-plum` | `--c-color-paper` | 4.5 | 8.12 | Text |
| `--c-color-plum` | `--c-color-ground` | 4.5 | 7.12 | Text |
| `--c-color-plum` | `--c-color-mat` | 4.5 | 6.37 | Text |
| `--c-color-teal` | `--c-color-paper` | 4.5 | 6.93 | Text |
| `--c-color-teal` | `--c-color-ground` | 4.5 | 6.07 | Text |
| `--c-color-teal` | `--c-color-mat` | 4.5 | 5.44 | Text |
| `--c-color-clay` | `--c-color-paper` | 4.5 | 6.43 | Text |
| `--c-color-clay` | `--c-color-ground` | 4.5 | 5.64 | Text |
| `--c-color-clay` | `--c-color-mat` | 4.5 | 5.05 | Text |
| `--c-color-ink` | `--c-color-ink-wash` | 4.5 | 12.39 | Text |
| `--c-color-paper` | `--c-color-ink` | 4.5 | 15.78 | Text |
| `--c-color-seal` | `--c-color-seal-wash` | 4.5 | 5.42 | Text |
| `--c-color-ink` | `--c-color-seal-wash` | 4.5 | 12.86 | Text |
| `--c-color-paper` | `--c-color-seal` | 4.5 | 6.65 | Text |
| `--c-color-jade` | `--c-color-jade-wash` | 4.5 | 5.49 | Text |
| `--c-color-ink` | `--c-color-jade-wash` | 4.5 | 13.31 | Text |
| `--c-color-paper` | `--c-color-jade` | 4.5 | 6.51 | Text |
| `--c-color-amber` | `--c-color-amber-wash` | 4.5 | 5.39 | Text |
| `--c-color-ink` | `--c-color-amber-wash` | 4.5 | 13.43 | Text |
| `--c-color-paper` | `--c-color-amber` | 4.5 | 6.33 | Text |
| `--c-color-indigo` | `--c-color-indigo-wash` | 4.5 | 8.26 | Text |
| `--c-color-ink` | `--c-color-indigo-wash` | 4.5 | 13.48 | Text |
| `--c-color-paper` | `--c-color-indigo` | 4.5 | 9.66 | Text |
| `--c-color-plum` | `--c-color-plum-wash` | 4.5 | 6.91 | Text |
| `--c-color-ink` | `--c-color-plum-wash` | 4.5 | 13.44 | Text |
| `--c-color-paper` | `--c-color-plum` | 4.5 | 8.12 | Text |
| `--c-color-teal` | `--c-color-teal-wash` | 4.5 | 6.00 | Text |
| `--c-color-ink` | `--c-color-teal-wash` | 4.5 | 13.67 | Text |
| `--c-color-paper` | `--c-color-teal` | 4.5 | 6.93 | Text |
| `--c-color-clay` | `--c-color-clay-wash` | 4.5 | 5.41 | Text |
| `--c-color-ink` | `--c-color-clay-wash` | 4.5 | 13.28 | Text |
| `--c-color-paper` | `--c-color-clay` | 4.5 | 6.43 | Text |
| `--c-color-ink-soft` | `--c-color-seal-wash` | 4.5 | 6.23 | Text |
| `--c-color-ink-soft` | `--c-color-indigo-wash` | 4.5 | 6.53 | Text |
| `--c-color-edge` | `--c-color-paper` | 3 | 3.93 | Mark, not text |
| `--c-color-edge` | `--c-color-ground` | 3 | 3.44 | Mark, not text |
| `--c-color-beam-text` | `--c-color-beam` | 4.5 | 15.78 | Text |
| `--c-color-beam-text` | `--c-color-beam-raised` | 4.5 | 14.14 | Text |
| `--c-color-beam-soft` | `--c-color-beam` | 4.5 | 9.30 | Text |
| `--c-color-beam-soft` | `--c-color-beam-raised` | 4.5 | 8.34 | Text |
| `--c-color-beam-live` | `--c-color-beam` | 4.5 | 8.89 | Text |
| `--c-color-beam-live` | `--c-color-beam-raised` | 4.5 | 7.97 | Text |
| `--c-color-beam-done` | `--c-color-beam` | 4.5 | 8.20 | Text |
| `--c-color-beam-done` | `--c-color-beam-raised` | 4.5 | 7.34 | Text |
| `--c-color-beam-flag` | `--c-color-beam` | 4.5 | 7.77 | Text |
| `--c-color-beam-flag` | `--c-color-beam-raised` | 4.5 | 6.96 | Text |
| `--c-color-beam-wait` | `--c-color-beam` | 4.5 | 9.32 | Text |
| `--c-color-beam-wait` | `--c-color-beam-raised` | 4.5 | 8.35 | Text |
| `--c-color-beam-line` | `--c-color-beam` | 3 | 3.49 | Mark, not text |
| `--c-color-beam-line` | `--c-color-beam-raised` | 3 | 3.12 | Mark, not text |
| `--c-color-ink` | `--c-color-beam-text` | 4.5 | 15.78 | Text |
| `--c-chart-1` | `--c-color-paper` | 3 | 7.43 | Mark, not text |
| `--c-chart-1` | `--c-color-ground` | 3 | 6.52 | Mark, not text |
| `--c-chart-2` | `--c-color-paper` | 3 | 4.56 | Mark, not text |
| `--c-chart-2` | `--c-color-ground` | 3 | 4.00 | Mark, not text |
| `--c-chart-3` | `--c-color-paper` | 3 | 3.47 | Mark, not text |
| `--c-chart-3` | `--c-color-ground` | 3 | 3.04 | Mark, not text |
| `--c-chart-4` | `--c-color-paper` | 3 | 3.56 | Mark, not text |
| `--c-chart-4` | `--c-color-ground` | 3 | 3.12 | Mark, not text |
| `--c-chart-5` | `--c-color-paper` | 3 | 4.43 | Mark, not text |
| `--c-chart-5` | `--c-color-ground` | 3 | 3.88 | Mark, not text |

## Type

| Role | Family | Weights | Notes |
|---|---|---|---|
| Everything: body, UI, headings | Source Sans 3 (`--c-font-body`, `--c-font-heading-en`) | 400, 500, 600, 700 (one variable file) | Headings in 700. Its digits are tabular, so amounts in sentences, cards and hero figures stay in it |
| Figures in tables, ledgers and event logs, IDs, timestamps | Source Code Pro (`--c-font-mono`) | 500 (one variable file) | Never names: it lacks some letters makers may write |
| The seal's initials and `MakerMark` | Noto Serif SC (`--c-font-seal`) | 600, Latin subset only | |

- **Bundle the fonts.** Scripted mode makes no requests beyond localhost, so the fonts ship with the site from Fontsource packages (`src/ui/fonts.ts`). No Google Fonts link.
- **English only.** The site renders no Chinese (Gordon, Oct 24), so no Chinese font file ships. The `-zh` family tokens stay defined for now and fall back to Source Sans 3.
- **Scale (px):** 14, 16, 18, 21, 24, 36, 48, 64 (`--c-text-*`). Body 16 with line height 1.5, headings 1.2, mono 1.4.
- **Sentence case everywhere.** No all-caps labels, no letter-spaced eyebrows above headings.
- **Amounts** are US dollars on every surface: `$180.00`. Negative amounts show a minus sign and seal madder. Formatting comes only from the kit's `Money` component, from integer cents.

## Space, lines and corners

- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64. Panels pad 24. Panels sit 24 apart on Shop and 16 apart on Sell. Sections are 32 apart. Rows are 44 tall (`--c-size-row-h`) and controls 40 (`--c-size-control-h`).
- **Panels** are a paper face, a 1 px `line` border and 2 px corners. The scroll mount is gone (`--c-space-mat` is 0). A panel that holds a table may add a header band in `mat`. Don't put cards inside cards.
- **Corners:** 2 px for panels, buttons, inputs and chips, 0 for the seal, round only for dots (`--c-radius-dot`).
- **Strokes:** 1 px hairlines, a 3 px rule for the selected nav item and a flag, a 3 px thread (4 px on the money map), a 2 px focus ring. Dashes: `--c-thread-dash-attention` (8 6) and `--c-thread-dash-idle` (2 6).
- **Shadows:** only floating things have one, `--c-shadow-overlay`: the process overlay, the stage's process panel, a drawer, the demo controls. Panels on the page have none.

## Motion

| Token | Value | Used for |
|---|---|---|
| `--c-motion-stitch` | 700 ms, `--c-motion-stitch-ease` (ease in and out) | A money thread drawing itself from source to destination |
| `--c-motion-weave-stagger` | 40 ms | Records weaving in, one row after another |
| `--c-motion-tighten` | 160 ms | A matched row closing its gap |
| `--c-motion-seal` | 220 ms | The seal pressing in: scale 1.06 to 1 and opacity 0 to 1, no turn |
| `--c-motion-ui` | 160 ms | Opening, expanding and confirming things a person clicked |
| `--c-motion-pulse` | 1200 ms | A working process block's pulse |

- **Motion follows the event player's clock,** never wall time, so `npm run test:demo` sees the same frame every run. The kit's motion helpers take the player's time as input. That covers the thread, a `working` process block's pulse, `AgentGraph`'s steps and edges, and every camera move.
- **Reduced motion.** With `prefers-reduced-motion`, every motion token is 0 ms (`tokens.css`), threads appear finished, the seal appears in place, and nothing pulses.

## UI kit (`src/ui/`)

Each component takes a `testId` prop. Design drop 3 restyles each per `design/components.md`, keeping its props.

| Component | What it is |
|---|---|
| `Panel` | The paper panel above. Title in the heading font, optional actions on the right |
| `Button` | `primary` (indigo fill, paper text), `quiet` (paper fill, edge border, ink text; on the beam a beam-soft outline and beam text), `seal` (madder fill, paper text, for the one urgent action). 2 px corners, 40 px tall |
| `Money` | Formats integer cents. Props: `cents`, `tone` (`neutral`, `in`, `out`, `pending`) |
| `formatDate` | `formatDate(iso, lang)` turns `2026-10-02` into "Oct 2, 2026", in UTC, never from the wall clock |
| `Thread` | The animated money flow between two anchor points, with its amount at the midpoint in mono |
| `Seal` | A square madder stamp with the owner's initials ("RB" for Ruth B.) and the date, for approvals. The date is never under 14 px |
| `MakerMark` | A small square ink mark with the maker's initial, used instead of photo avatars |
| `Badge` | Small outlined label. The `Simulated` variant reads "Simulated", dashed, and the process bar shows it once for the whole bar. The `live` ("Live"), `demo` ("Demo data"), `rule` ("Rule-based") and `estimate` ("Estimate") variants take their labels from the glossary. On the beam it takes the beam's colors |
| `Flag` | A 3 px madder left rule plus the wash, with a short reason line |
| `EvidenceCard` | One source document side by side with others: contract, statement, bank record, each with its key figure marked |
| `ShareBar` | One price split into parts (maker share, materials, Cindia fee, card fee) with their amounts |
| `LedgerTable` | Dense table with right-aligned amounts in mono, a `mat` header band and row states (matched, flagged, pending) |
| `Toast` | Bottom-anchored notice, for approval requests and payouts |
| `ConsoleFrame` | v1's console frame, still exported. `PhoneFrame` is retired from the public index |
| `LangToggle` | Still exported, rendered nowhere: the site is English only |
| `chartTheme` | Recharts settings from the `--c-chart-*` tokens, Source Sans 3 tabular numbers |
| `PageFrame` | The 1440 by 900 desktop page on the ground. Exports `PAGE_WIDTH` and `PAGE_HEIGHT` |
| `TopNav` | The 56 px top bar on the beam, with left, center and right parts |
| `SideSwitch` | The Shop and Sell switch on the beam: a beam-soft outline, the selected side filled beam-text with ink words in 600 |
| `Link` | `to`, `testId?`, `children`, and optional `variant` (`text`, an underlined inline link and the default, or `block`, which wraps a card or tile with no underline), `className`, `style`, `title` and `ariaLabel`: a real anchor that calls `navigate` from `src/core/nav.ts` on a plain click and keeps the browser's own behavior for any other click |
| `ProcessBlock` | One block of the process bar on `beam-raised`: the label, then the count and the status word, and a 3 px thread along the foot whose pattern shows the state (dotted idle, pulsing working, full with a check when done, dashed with "!" for attention). A 6 px `beam-live` dot when all its keys are live |
| `ProcessView` | The frame of a process view: title, Live or Simulated badge, a one-line "what this shows", body, event log |
| `EventLog` | The raw event log in mono, newest last, times as seconds on the player clock |
| `SearchBar` | The search text and its editable keyword chips |
| `Chip` | One chip: 2 px corners, an edge border. Selected is an indigo-wash fill with an indigo border |
| `PieceCard` | Illustration, title, maker mark, community, price, verification line. With `demo`, the verification line starts with L3 |
| `CommunityCard` | A community: name, people, place, craft |
| `ProjectCard` | A project with its progress bar |
| `MilestoneTimeline` | A work in progress's milestones and their status |
| `VerificationLine` | How a maker would be verified, in jade with a dot. With `demo`, it starts with L3 and adds L4 under it |
| `ChatThread` | A conversation, with an input row |
| `ChatBubble` | One message, with the agent's name and kind ("Rule-based" for a `code` agent) |
| `AgentGraph` | SVG nodes and edges for the agent swarm. Steps animate on the player clock |
| `EmbeddingMap` | SVG scatter of points with the query star and links to the top results. An approximate query point is drawn hollow |
| `ScoreBar` | A value from 0 to 1 as a bar |
| `StatTile` | A titled figure with lines under it and an optional madder rule for attention. Wrap it in a `Link` to make it open a view |
| `Drawer` | Generic, 440 px (`width`), from the right. Esc and its close button (test ID `closeTestId`) close it |
| `Tabs` | A row of tabs |
| `BlockEditor` | A list of blocks with move up, move down and edit |
| `SideBySide` | Two cards with a similarity bar between them |

- `src/ui/gallery.tsx` exports `KitGallery`: every component in each of its states, with sample props labeled "Sample", shown at `/dev/kit`.
- The kit's own words live in `src/ui/strings.ts`. The site is English only (Gordon, Oct 24): the kit renders the English, and the Chinese stays in the file until step 2 of that decision removes it.
- **Focus.** Every focusable control shows a 2 px `--c-color-indigo` ring with a 2 px offset (`--c-color-beam-live` on the beam).

## Words on screen

- Plain verbs and the user's own words: "Approve payout", "Pay makers", "Send follow-up". An action keeps its name through the flow, so "Approve payout" leads to "Payout approved".
- Cindy speaks in first person, short and specific: "The gallery paid $340 less than the contract says. Here are the three records." It never claims certainty it doesn't have.
- Errors say what happened and what to do next. They don't apologize.
- Cindia is a platform, never an app. Craft and community words follow the content rules in `data-model.md`.
- Domain words come from the label table in `glossary.md`. The on-screen labels L1 to L30 in `glossary.md` are copied word for word, and no badge is added beyond them. Other short UI strings (button text, empty states, notes) live in the feature's own `strings.ts`. Every page renders English only, there is no language toggle, and new strings are English only (where a type needs a zh value, it reuses the English). A new domain word goes under `needs:`.
