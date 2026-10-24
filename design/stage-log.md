# Cindia · stage log

Figma track, Cal Hacks 13.0. Four stages, 200 words at most per stage. Times are Pacific, Saturday Oct 24, 2026, read from `TZ=America/Los_Angeles date`. The design lead is a Claude Code agent working for Gordon Yang through the Figma MCP server.

## 1 · Ideation

13:45 to 14:25, 40 minutes · rating 3 of 5 · done up to the moodboards, waiting for Gordon's pick

**Tools.** FigJam, written through the Figma MCP server's `use_figma` tool (the Plugin API). Two boards with dozens of cards are faster to script than to drag, and every card can quote the brief exactly. Python checked what Figma can't: WCAG contrast for 78 color pairs, a color-blindness simulation, and glyph coverage of 12 open font files against the catalog's names.

**Output.** *01 Research*: five people, three tracks' criteria, 15 linked references, the judge's one-minute story, eight principles, open questions. *02 Moodboards*: three directions, each with a checked palette, a type specimen, a generated texture, an original fan illustration and the same product vignette, then a comparison and a recommendation.

**Friction.** The track doc only opened through the Google Drive connector. The sandbox can't reach figma.com, so screenshots came back inline and images were embedded in scripts instead of uploaded. The Starter plan allows a View seat 20 MCP calls a month. Call 20 finished the comparison, and its screenshot was refused.

**Into the build.** Gordon's pick becomes the style tiles and tokens.json in handoff drop 1.

## 2 · Prototyping

Not started. Next after drop 1: flows, wireframes, components, mockups, illustrations and a clickable prototype of the main path.

## 3 · Handoff

14:28 to 14:52, 24 minutes so far · rating 4 of 5 · drop 1 done, drop 2 to come

**Tools.** Files came first, so the build never waits on Figma. A Python generator writes tokens.json and tokens.md from one list of 113 tokens, and fails the run if any of 80 contrast pairs drops below 4.5:1 for text or 3:1 for marks. It caught two chart colors at 2.7:1 and 2.9:1 on the page ground before they shipped. The chart palette came from the dataviz skill's validator, searching orderings until every check passed. Then Figma Design through `use_figma`: 79 variables with `var(--c-…)` code syntax and scopes, 17 text styles, an overlay shadow and a style-tile page bound to them.

**Friction.** Edu verification lifted the 20-call cap for the new file. Three tiles came out clipped, because `resize()` fixes an auto-layout frame's height, and the icons lost their strokes, because Figma's SVG import ignores attributes on the root element. Two fix calls. Measuring the labels showed ten equal process blocks fit with 8 px padding.

**Into the build.** I3-redesign pastes the `css` block into `src/ui/tokens.css` and makes the eleven kit changes listed in tokens.md.

## 4 · Code generation

Not started. The integrator restyles the kit from the drops in `I3-redesign`, and features follow without edits.

---

## Evidence for stage 1

This section backs up the entries above and is not part of their word count.

### Figma files

| File | Link | What's in it |
|---|---|---|
| Cindia · 01 Research (FigJam) | https://www.figma.com/board/T3lxV76Wc6petCKoRE0TNu | What Cindia is, why it matters (World Bank, FDIC, ICT News), the buyer, the maker (陆芸 Lu Yun), the studio owner (沈若兰 Shen Ruolan), the judge at a table, the community as a stakeholder, the Visa, Hyphenate and Figma criteria, the judge's one-minute story, 15 references (described and linked, never copied), 8 principles, the screen rules, 4 open questions with defaults |
| Cindia · 02 Moodboards (FigJam) | https://www.figma.com/board/KAOXGbhwnS0A0tJ8j5ABj7 | How the directions were checked, A · Museum label, B · Warp and weft, C · Daylight market (idea, palette, type, texture and imagery, the product vignette), a side-by-side table and the recommendation, with a sticky for Gordon's pick |

| Cindia · Design (Figma Design) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb | Created at 14:45 for stage 3. The Color and Size variable collections, 17 text styles, the overlay shadow, and the Style tiles page (`design/style-tiles.png`) |

All three files sit in Gordon's drafts on his Figma team, which moved from the Starter tier to the student tier after his Edu verification. None is shared yet: "Anyone with the link" has to be set in Figma by Gordon, because the MCP server has no sharing tool.

### Timeline

| Time | What happened | Tools |
|---|---|---|
| 13:45 | Read the v2 brief, contracts sections 4, 7 and 9, the glossary, the design system and the nine app screenshots | Read |
| 13:48 | Track rules: WebFetch got only the Google Docs page shell, so the doc was read through the Google Drive connector | WebFetch, Google Drive |
| about 13:52 | Font coverage (12 files from the google/fonts repo), WCAG contrast, color-blindness simulation | Python, fontTools |
| about 13:56 | Checked the 15 reference links | WebSearch |
| about 13:58 | Created *Cindia · 01 Research* and its session | create_new_file, create_session |
| 14:06 | People zone built, first screenshot | use_figma, get_screenshot |
| 14:08 | Judges, references, principles and open questions built | use_figma |
| 14:09 | The judge's one-minute story added as a connected flow | use_figma |
| 14:13 | Paper and plain-weave texture tiles and three fan illustrations generated, seed 7 | Python, PIL, SVG |
| about 14:14 | Created *Cindia · 02 Moodboards*. Uploading from the sandbox to Figma was refused | create_new_file, upload_assets |
| 14:18 | Direction A built and checked | use_figma, get_screenshot |
| 14:22 | Direction B built and checked | use_figma, get_screenshot |
| 14:24 | Direction C built and checked | use_figma, get_screenshot |
| 14:25 | Comparison table and recommendation built. The next two calls hit the monthly MCP limit | use_figma |
| 14:28 | Gordon picked B, through the coordinator | |
| 14:30 | Chart palette: dye-inspired hues stepped into the validator's band, then every ordering searched | dataviz validate_palette.js |
| 14:40 | tokens.json and tokens.md generated. The contrast asserts stopped the first run on two chart colors | Python |
| 14:44 | layout.md and HANDOFF.md written. Drop 1 complete as files | Write |
| 14:45 | whoami showed the team on the student tier. Created *Cindia · Design*. The first write went through | whoami, create_new_file, use_figma |
| 14:47 | Style tiles: color, space and lines, elevation, then type, chart, motion, then the beam and kit, icons, illustration | use_figma |
| 14:50 | Review: equal process blocks fixed, clipped tiles and icon strokes fixed | get_screenshot, use_figma |
| 14:52 | Final screenshot saved as `design/style-tiles.png` | get_screenshot |

### Figma MCP calls

| Tool | Stage 1 calls | Stage 3 calls | Counts toward the limit |
|---|---|---|---|
| use_figma | 12 | 7 | yes |
| get_screenshot | 8 | 3 | yes |
| create_new_file | 2 | 1 | no, exempt |
| create_session | 1 | 0 | no |
| whoami | 2 | 1 | no, exempt |
| upload_assets | 1 | 0 | its upload URL was unreachable from the sandbox |
| get_figma_skill | 13 | 2 | no, skill docs |

The limit for a View or Collab seat is up to 20 calls a month. An Education plan (Edu verified) gets the Professional limits for Full and Dev seats: up to 200 calls a day and 10 a minute. Source: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/. After Gordon's verification the team shows the student tier and the calls went through again, though whoami still lists his seat as View.

### Rework and dead ends

- The sandbox can't reach www.figma.com or mcp.figma.com. Screenshot URLs and upload POSTs fail. Screenshots were taken with `enableBase64Response` (copies in `design/ideation/`), SVG art went in through `createNodeFromSvg`, and the PNG texture tiles through `figma.base64Decode` and `figma.createImage`, all inside `use_figma` scripts.
- The texture tiles were first 25 to 33 KB as base64, too big to embed cheaply. They were cut to 7 to 9 KB seamless tiles. The thread-drawn fan went from 30 KB of line elements to 5 KB by drawing each color as one path.
- After the screenshots, three small layout fixes: A's language toggle was clipped at the right edge (moved in), B's process-block status lines overflowed in mono (set in Source Sans 3), C's last process pill was clipped (label shortened to "Proof · idle"). The vignette PNGs in `design/ideation/` show the state before these fixes.
- The comparison section was built by call 20 and never screenshotted, so it is the one part of the boards not checked by eye.

### Checks behind the moodboards

- **Contrast:** 72 pairs across the three palettes plus 6 tints on B's dark beam, all passing. Text 4.5:1 or better, control borders 3:1 or better, hairlines carry no text. Data: `design/ideation/checks.json`.
- **Color blindness:** each palette's flag and money-in colors stay apart under deuteranopia (ΔE 25 to 31) but get close under protanopia (ΔE 10 to 13), so every state carries an icon and a word as well as a color.
- **Fonts:** every candidate covers the catalog's names (Diné, Māori, Sámi, Sápmi, pōtae, whāriki). Only Inter and Source Sans 3 also cover the wider set for names makers may write later (Sámi ŧ đ ŋ, Diné ą ǫ ł, Maa ɔ ɛ ɨ ʉ, pinyin tones). No Latin font covers Inuktitut syllabics, so every stack ends with Noto Sans Canadian Aboriginal. All fonts are under the SIL Open Font License.
- **Images:** only our own swatches, type samples and textures generated from code. No photos, no artworks, no screenshots of other products.

### What's next

- Gordon picked B at 14:28, and drop 1 is done.
- Stage 2 and drop 2 need roughly 150 to 200 more calls (flows, components, about 40 screens, the prototype, Slides, PNG exports), within the Education plan's 200 a day and 10 a minute.
