# Design system · Silk and ink

Read by the scaffolder (it builds `src/ui/` from this file) and by every feature. Features use the UI kit and these tokens only. They never define their own colors, fonts or motion.

## The idea

Cindia's screens look like the studio's own materials: a silk ground, ink lettering, a cinnabar seal and the thread that holds it all together. Gordon chose this look on Oct 23.

- **One memorable thing: money moves as thread.** Every flow of money (buyer to studio, studio to maker, gallery to studio) is drawn as a running stitch that sews itself along its path. Nothing else on screen animates on its own.
- **The seal means a person decided.** The owner's approval leaves a square cinnabar seal on the item. Cindy never stamps anything. Its proposals stay unsealed until the owner approves, which is the responsible-AI story in one image.
- **Everything else stays quiet:** flat paper, hairline lines, no gradients, no drop shadows except on the phone frames.
- **Projector first.** Judging happens at a table on a laptop screen, often at an angle. Text meets 4.5:1 contrast, the smallest text is 14 px, and nothing important relies on color alone.

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

- Seal red appears at most once per screen as a large area. Flags use it as a thin left rule plus the wash.
- A color always comes with a second cue: an icon, a label or a position.

## Type

| Role | Family | Weights | Notes |
|---|---|---|---|
| Chinese headings, maker names, the seal character | Noto Serif SC | 600, 700 | Simplified Chinese |
| English headings | Fraunces | 600, optical size on | |
| All body text and UI | Inter | 400, 500, 600 | `font-variant-numeric: tabular-nums` for every amount |
| Chinese body text | Noto Sans SC | 400, 500 | The fallback after Inter, so mixed lines render in one rhythm |

- **Bundle the fonts.** Scripted mode makes no requests beyond localhost, so the fonts ship with the app (Fontsource packages, installed in S1). No Google Fonts link.
- **Scale (px):** 14, 16, 18, 21, 24, 36, 48. Body 16 with line height 1.5. Chinese body text gets line height 1.7. Headings use line height 1.2.
- **Sentence case everywhere.** No all-caps labels, no letter-spaced eyebrows above headings.
- **Amounts** are US dollars on every surface, the Chinese ones included: `$180.00`. Negative amounts show a minus sign and seal red. Formatting comes only from the kit's `Money` component, from integer cents.

## Space, lines and corners

- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64. Panels pad 24 on the console and 16 on phones.
- **Mounted panels.** A console panel is mounted like a scroll: a 1 px `line` border, a 6 px `mat` inner band, then the paper face. This frame is how the console groups things. Don't put cards inside cards.
- **Corners differ by what a thing is:** paper panels 2 px, buttons and inputs 6 px, chips 999 px, phone frames 36 px, the seal 0.
- **Shadows:** only the phone frames get one, `0 12px 32px rgba(28, 26, 23, 0.18)`.

## Motion

| Token | Value | Used for |
|---|---|---|
| `--c-motion-stitch` | 900 ms, ease-out | A money thread sewing itself from source to destination |
| `--c-motion-seal` | 220 ms | The seal landing: from 1.15 scale and 0 opacity to 1, with a -4 degree turn |
| `--c-motion-ui` | 160 ms | Opening, expanding and confirming things a person clicked |

- The stitch is an SVG path with a dashed stroke whose offset animates, so it reads as a running stitch, not a progress bar.
- **Motion follows the event player's clock,** never wall time, so `npm run test:demo` sees the same frame every run. The kit's motion helpers take the player's time as input.
- With `prefers-reduced-motion`, threads appear finished and the seal appears without the turn.

## UI kit (`src/ui/`)

The scaffolder builds these in S1, with the props the S1 plan sets, and each takes a `testId` prop.

| Component | What it is |
|---|---|
| `Panel` | The mounted panel above. Title in the heading font, optional actions on the right |
| `Button` | `primary` (ink fill, paper text), `quiet` (ink text, line border), `seal` (seal fill, paper text, for the one urgent action) |
| `Money` | Formats integer cents. Props: `cents`, `tone` (`neutral`, `in`, `out`, `pending`) |
| `formatDate` | `formatDate(iso, lang)` turns `2026-10-02` into "Oct 2, 2026" or "2026年10月2日", in UTC, never from the wall clock |
| `Thread` | The animated money flow between two anchor points, with an amount label at its midpoint |
| `Seal` | A square cinnabar stamp with one Chinese character and a date, for approvals |
| `MakerMark` | A small square ink seal with the maker's surname character, used instead of photo avatars |
| `Badge` | Small outlined label. The `Simulated` variant reads "Simulated 模拟" and sits in the top right of every panel fed by scripted events |
| `Flag` | Seal-red left rule plus wash, with a short reason line |
| `EvidenceCard` | One source document side by side with others: contract, statement, bank record, each with its key figure highlighted |
| `ShareBar` | One price split into parts (maker share, materials, Cindia fee, card fee) with their amounts |
| `LedgerTable` | Dense table with right-aligned amounts, a `mat` header row and row states (matched, flagged, pending) |
| `Toast` | Bottom-anchored notice on phones, for approval requests and payouts |
| `PhoneFrame`, `ConsoleFrame` | The device frames the four surfaces render in |
| `LangToggle` | 中文 and English switch. Maker surfaces start in Chinese |
| `chartTheme` | Recharts settings: ink axes, `line` grid, jade and seal series, Inter tabular numbers |

## Words on screen

- Plain verbs and the user's own words: "Approve payout", "Pay makers", "Send follow-up". An action keeps its name through the flow, so "Approve payout" leads to "Payout approved".
- Cindy speaks in first person, short and specific: "The gallery paid $340 less than the contract says. Here are the three records." It never claims certainty it doesn't have.
- Errors say what happened and what to do next. They don't apologize.
- Domain words come from the label table in `glossary.md`, in both languages. Other short UI strings (button text, empty states, notes) live in the feature's own `strings.ts` with English and Chinese side by side. A new domain word goes under `needs:`.
