# Design system · Silk and ink

Read by the scaffolder (it built `src/ui/` from this file), the integrator (it keeps the kit in step with it) and every feature. Features use the UI kit and these tokens only. They never define their own colors, fonts or motion.

## The idea

Cindia's screens use a paper ground, ink lettering, a red seal and the thread that holds it all together. Gordon chose this look on Oct 23.

- **One memorable thing: money moves as thread.** Every flow of money (buyer to co-op, co-op to maker, gallery to co-op, buyer to a community fund) is drawn as a running stitch that sews itself along its path. Nothing else on screen animates on its own, except a process block that is `working`.
- **The seal means a person decided.** The owner's approval leaves a square cinnabar seal on the item. Cindy never stamps anything. Its proposals stay unsealed until the owner approves, which is the responsible-AI story in one image.
- **Everything else stays quiet:** flat paper, hairline lines, no gradients, no drop shadows.
- **Projector first.** Judging happens at a table on a laptop screen, often at an angle. Text meets 4.5:1 contrast, the smallest text is 14 px, and nothing important relies on color alone.
- **Figma drops.** When a design drop under `design/` lands, I3-redesign changes the tokens and the kit in one place, and features follow without edits wherever they used only kit components and tokens. Until then every component uses the silk-and-ink tokens below.

## Desktop pages

Desktop only. Phone frames are retired.

| Element | Size |
|---|---|
| `PageFrame`, the desktop page | 1440 by 900. `src/ui/PageFrame.tsx` exports `PAGE_WIDTH` (1440) and `PAGE_HEIGHT` (900). The kit owns them, and the shell's stage and the demo tests import them from there |
| The top bar (`TopNav`) | 56 px high, with a hairline bottom |
| The process bar band | 64 px high, under the top bar. Eleven `ProcessBlock`s, each at most 120 px wide, fit one row |
| A drawer (`Drawer`) | 440 px wide, from the right |
| The Sell site's left nav | 184 px wide |
| The process overlay | 1200 by 720, centered |

- `PhoneFrame` leaves the kit's public index. `ConsoleFrame` stays exported for now.
- Until I2-tour, v1's phone views show on the stage in a 390 by 844 column and v1's console views in a 1192 by 744 box, scaled to fit (`ui-contract.md`, Phase A legacy boxes).

## Color

| Token | Hex | Use | Contrast on paper |
|---|---|---|---|
| `--c-color-paper` | `#F6F1E7` | Page and panel ground | |
| `--c-color-mat` | `#EDE4D3` | The inner mat of mounted panels, table header rows, selected rows | |
| `--c-color-ink` | `#1C1A17` | Text, icons, primary buttons | 15.4 |
| `--c-color-ink-soft` | `#5A5249` | Secondary text, captions, axis labels | 6.8 |
| `--c-color-line` | `#D9CFBF` | Hairlines and borders only, never text | 1.4 |
| `--c-color-seal` | `#B23A2E` | The approval seal, flags, money going out short, the one urgent button per screen | 5.3 |
| `--c-color-jade` | `#2F6B4F` | Money that arrived or matched, maker share | 5.6 |
| `--c-color-amber` | `#8A5A0B` | Waiting states: pending payout, needs review | 5.3 |
| `--c-color-seal-wash` | `#F3DFDA` | Background of a flagged row or evidence panel | |
| `--c-color-jade-wash` | `#DFEAE2` | Background of a matched row | |
| `--c-color-scrim` | `#1C1A17` at 32% (`rgb(28 26 23 / 0.32)`) | The scrim behind the process overlay, never text | |

- Seal red appears at most once per screen as a large area. Flags use it as a thin left rule plus the wash.
- A color always comes with a second cue: an icon, a label or a position.

## Type

| Role | Family | Weights | Notes |
|---|---|---|---|
| Chinese headings, maker names, the seal character | Noto Serif SC | 600, 700 | Simplified Chinese |
| English headings | Fraunces | 600, optical size on | |
| All body text and UI | Inter | 400, 500, 600 | `font-variant-numeric: tabular-nums` for every amount |
| Chinese body text | Noto Sans SC | 400, 500 | The fallback after Inter, so mixed lines render in one rhythm |

- **Bundle the fonts.** Scripted mode makes no requests beyond localhost, so the fonts ship with the site (Fontsource packages, installed in S1). No Google Fonts link.
- **Scale (px):** 14, 16, 18, 21, 24, 36, 48. Body 16 with line height 1.5. Chinese body text gets line height 1.7. Headings use line height 1.2.
- **Sentence case everywhere.** No all-caps labels, no letter-spaced eyebrows above headings.
- **Amounts** are US dollars on every surface, the Chinese ones included: `$180.00`. Negative amounts show a minus sign and seal red. Formatting comes only from the kit's `Money` component, from integer cents.

## Space, lines and corners

- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64. Panels pad 24 on desktop pages, and 16 inside v1's phone views until they move to the desktop pages.
- **Mounted panels.** A console panel is mounted like a scroll: a 1 px `line` border, a 6 px `mat` inner band, then the paper face. This frame is how the pages group things. Don't put cards inside cards.
- **Corners differ by what a thing is:** paper panels 2 px, buttons and inputs 6 px, chips 999 px, the seal 0. The retired phone frames had 36 px.
- **Shadows:** none on the desktop pages. The retired phone frames had the only one, `0 12px 32px rgba(28, 26, 23, 0.18)`.

## Motion

| Token | Value | Used for |
|---|---|---|
| `--c-motion-stitch` | 900 ms, ease-out | A money thread sewing itself from source to destination |
| `--c-motion-seal` | 220 ms | The seal landing: from 1.15 scale and 0 opacity to 1, with a -4 degree turn |
| `--c-motion-ui` | 160 ms | Opening, expanding and confirming things a person clicked |

- The stitch is an SVG path with a dashed stroke whose offset animates, so it reads as a running stitch, not a progress bar.
- **Motion follows the event player's clock,** never wall time, so `npm run test:demo` sees the same frame every run. The kit's motion helpers take the player's time as input. That covers a `working` process block's pulse, `AgentGraph`'s steps and edges, and every camera move.
- With `prefers-reduced-motion`, threads appear finished, the seal appears without the turn, and nothing pulses.

## UI kit (`src/ui/`)

Each component takes a `testId` prop. The scaffolder built the first set in S1, and I2-kit builds the rest, sized for the 1440 by 900 page, with the props its plan sets.

| Component | What it is |
|---|---|
| `Panel` | The mounted panel above. Title in the heading font, optional actions on the right |
| `Button` | `primary` (ink fill, paper text), `quiet` (ink text, line border), `seal` (seal fill, paper text, for the one urgent action) |
| `Money` | Formats integer cents. Props: `cents`, `tone` (`neutral`, `in`, `out`, `pending`) |
| `formatDate` | `formatDate(iso, lang)` turns `2026-10-02` into "Oct 2, 2026" or "2026年10月2日", in UTC, never from the wall clock |
| `Thread` | The animated money flow between two anchor points, with an amount label at its midpoint |
| `Seal` | A square cinnabar stamp with one Chinese character and a date, for approvals. The date is the month and day on one line at 14 px, never smaller. A seal too small to hold it, such as the 48 px compact seal with a Chinese date, shows its character alone |
| `MakerMark` | A small square ink seal with the maker's surname character, used instead of photo avatars |
| `Badge` | Small outlined label. The `Simulated` variant reads "Simulated 模拟" and sits in the top right of every panel fed by scripted events. The `live` ("Live 实时"), `demo` ("Demo data 演示数据"), `rule` ("Rule-based 规则程序") and `estimate` ("Estimate 估算") variants take their labels from the glossary |
| `Flag` | Seal-red left rule plus wash, with a short reason line |
| `EvidenceCard` | One source document side by side with others: contract, statement, bank record, each with its key figure highlighted |
| `ShareBar` | One price split into parts (maker share, materials, Cindia fee, card fee) with their amounts |
| `LedgerTable` | Dense table with right-aligned amounts, a `mat` header row and row states (matched, flagged, pending) |
| `Toast` | Bottom-anchored notice, for approval requests and payouts |
| `ConsoleFrame` | v1's console frame, still exported. `PhoneFrame` is retired from the public index |
| `LangToggle` | 中文 and English switch. Every surface starts in English |
| `chartTheme` | Recharts settings: ink axes, `line` grid, jade and seal series, Inter tabular numbers |
| `PageFrame` | The 1440 by 900 desktop page on the paper ground. Exports `PAGE_WIDTH` and `PAGE_HEIGHT` |
| `TopNav` | The 56 px top bar, with left, center and right parts |
| `SideSwitch` | The Shop and Sell switch, the selected side marked by fill and weight |
| `Link` | `to`, `testId?`, `children`, and optional `variant` (`text`, an underlined inline link and the default, or `block`, which wraps a card or tile with no underline), `className`, `style`, `title` and `ariaLabel`: a real anchor that calls `navigate` from `src/core/nav.ts` on a plain click and keeps the browser's own behavior for any other click |
| `ProcessBlock` | One block of the process bar: label, status as an icon and a word, count, and a Live mark when all its keys are live |
| `ProcessView` | The frame of a process view: title, Live or Simulated badge, body, event log |
| `EventLog` | The raw event log, newest last, times as seconds on the player clock |
| `SearchBar` | The search text and its editable keyword chips |
| `Chip` | One chip |
| `PieceCard` | Illustration, title, maker mark, community, price, verification line. With `demo`, the verification line starts with L3 |
| `CommunityCard` | A community: name, people, place, craft |
| `ProjectCard` | A project with its progress bar |
| `MilestoneTimeline` | A work in progress's milestones and their status |
| `VerificationLine` | How a maker would be verified. With `demo`, it starts with L3 and adds L4 under it |
| `ChatThread` | A conversation, with an input row |
| `ChatBubble` | One message, with the agent's name and kind ("Rule-based" for a `code` agent) |
| `AgentGraph` | SVG nodes and edges for the agent swarm. Steps animate on the player clock |
| `EmbeddingMap` | SVG scatter of points with the query star and links to the top results. An approximate query point is drawn hollow |
| `ScoreBar` | A value from 0 to 1 as a bar |
| `StatTile` | A titled figure with lines under it and an optional seal-colored rule for attention. Wrap it in a `Link` to make it open a view |
| `Drawer` | Generic, 440 px (`width`), from the right. Esc and its close button (test ID `closeTestId`) close it |
| `Tabs` | A row of tabs |
| `BlockEditor` | A list of blocks with move up, move down and edit |
| `SideBySide` | Two cards with a similarity bar between them |

- `src/ui/gallery.tsx` exports `KitGallery`: every component in each of its states, with sample props labeled "Sample", shown at `/dev/kit`.
- The kit's own words live in `src/ui/strings.ts`, in both languages.

## Words on screen

- Plain verbs and the user's own words: "Approve payout", "Pay makers", "Send follow-up". An action keeps its name through the flow, so "Approve payout" leads to "Payout approved".
- Cindy speaks in first person, short and specific: "The gallery paid $340 less than the contract says. Here are the three records." It never claims certainty it doesn't have.
- Errors say what happened and what to do next. They don't apologize.
- Cindia is a platform, never an app. Craft and community words follow the content rules in `data-model.md`.
- Domain words come from the label table in `glossary.md`, in both languages. The on-screen labels L1 to L30 in `glossary.md` are copied word for word, in both languages, and no badge is added beyond them. Other short UI strings (button text, empty states, notes) live in the feature's own `strings.ts` with English and Chinese side by side. A new domain word goes under `needs:`.
