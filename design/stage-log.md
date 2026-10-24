# Cindia · stage log

Figma track, Cal Hacks 13.0. Four stages, 200 words at most per stage. Times are Pacific, Saturday Oct 24, 2026, read from `TZ=America/Los_Angeles date`. The design lead is a Claude Code agent working for Gordon Yang through the Figma MCP server.

## 1 · Ideation

13:45 to 14:25, 40 minutes · rating 3 of 5 · done up to the moodboards, waiting for Gordon's pick

**Tools.** FigJam, written through the Figma MCP server's `use_figma` tool (the Plugin API). Two boards with dozens of cards are faster to script than to drag, and every card can quote the brief exactly. Python checked what Figma can't: WCAG contrast for 78 color pairs, a color-blindness simulation, and glyph coverage of 12 open font files against the catalog's names.

**Output.** *01 Research*: five people, three tracks' criteria, 15 linked references, the judge's one-minute story, eight principles, open questions. *02 Moodboards*: three directions, each with a checked palette, a type specimen, a generated texture, an original fan illustration and the same product vignette, then a comparison and a recommendation.

**Friction.** The track doc only opened through the Google Drive connector. The sandbox can't reach figma.com, so screenshots came back inline and images were embedded in scripts instead of uploaded. The Starter plan allows a View seat 20 MCP calls a month. Call 20 finished the comparison, and its screenshot was refused.

**Into the build.** Gordon's pick becomes the style tiles and tokens.json in handoff drop 1.

## 2 · Prototyping

Not started. It begins after the pick: style tiles, wireframes, components, mockups and a clickable prototype of the main path.

## 3 · Handoff

Not started. Drop 1 (tokens.json, tokens.md, layout.md) follows the style tiles. Drop 2 brings components, screens, assets and flows.

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

Both files sit in Gordon's drafts on the Starter team. Neither is shared yet: "Anyone with the link" has to be set in Figma by Gordon, because the MCP server has no sharing tool.

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

### Figma MCP calls

| Tool | Calls | Counts toward the limit |
|---|---|---|
| use_figma | 12 | yes |
| get_screenshot | 8 | yes |
| create_new_file | 2 | no, exempt |
| create_session | 1 | no |
| whoami | 2 | no, exempt |
| upload_assets | 1 | its upload URL was unreachable from the sandbox |
| get_figma_skill | 13 | no, skill docs |

The limit for a View or Collab seat is up to 20 calls a month. An Education plan (Edu verified) gets the Professional limits for Full and Dev seats: up to 200 calls a day and 10 a minute. Source: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/

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

### What stage 2 needs

- Gordon's pick: A, B or C.
- More MCP calls. Stages 2 and 3 need roughly 150 to 200 calls (style tiles, components, about 40 screens, the prototype, Slides, PNG exports). Edu verification, which the track requires anyway, moves the team to the Education plan's 200 a day.
