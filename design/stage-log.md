# Cindia · stage log

Figma track, Cal Hacks 13.0. The track's four stages, then the pitch and the video, at most 200 words each. Times are Pacific, Saturday Oct 24, 2026 unless marked Sunday, read from `TZ=America/Los_Angeles date`. The design lead is a Claude Code agent working for Gordon Yang through the Figma MCP server.

## 1 · Ideation

13:45 to 14:25, 40 minutes · rating 3 of 5 · done up to the moodboards, waiting for Gordon's pick

**Tools.** FigJam, written through the Figma MCP server's `use_figma` tool (the Plugin API). Two boards with dozens of cards are faster to script than to drag, and every card can quote the brief exactly. Python checked what Figma can't: WCAG contrast for 78 color pairs, a color-blindness simulation, and glyph coverage of 12 open font files against the catalog's names.

**Output.** *01 Research*: five people, three tracks' criteria, 15 linked references, the judge's one-minute story, eight principles, open questions. *02 Moodboards*: three directions, each with a checked palette, a type specimen, a generated texture, an original fan illustration and the same product vignette, then a comparison and a recommendation.

**Friction.** The track doc only opened through the Google Drive connector. The sandbox can't reach figma.com, so screenshots came back inline and images were embedded in scripts instead of uploaded. The Starter plan allows a View seat 20 MCP calls a month. Call 20 finished the comparison, and its screenshot was refused.

**Into the build.** Gordon's pick becomes the style tiles and tokens.json in handoff drop 1.

## 2 · Prototyping

14:59 to 16:17, then 16:19 to 18:02 after the scope change, about 3 hours in all · rating 4 of 5 · 24 screens done, prototype links not wired yet

**Tools.** Figma Design through `use_figma`, one script per screen or component batch, every color bound to a variable and every text to a style. 25 components and sets, 16 icons and 15 illustrations were built as screens needed them. The illustrations are Python-drawn SVGs, imported behind a hash check. At 16:19 the scope moved to Native American makers. The core screens took the Diné co-op's content, and seven new screens followed. A pass against the plans that landed meanwhile fixed five gaps: the piece page fold, one Simulated badge on the process bar, pitch cards that read `pitch.ts`, verification as the data model has it, and verification on result cards.

**Friction.** Twelve scripts failed, six per round, each fixed in the next call. The Plugin API skipped hidden layers in instance searches, kept a stale text render until a clone replaced it, and reset layer names with overrides. Name lookups twice caught the wrong layer.

**Into the build.** The 24 screens with `components.md`, `changes.md` and `flows.md`, for I3-redesign.

## 3 · Handoff

14:28 to 14:52, 16:12 to 16:17 and 18:02 to 18:14, about 41 minutes · rating 4 of 5 · drops 1 and 3 done

**Tools.** Files came first, so the build never waits on Figma. A Python generator writes tokens.json and tokens.md from one list of 113 tokens, and fails the run if any of 80 contrast pairs drops below 4.5:1 for text or 3:1 for marks. It caught two chart colors at 2.7:1 and 2.9:1 before they shipped. The chart palette came from the dataviz skill's validator. Then Figma Design through `use_figma`: 79 variables with `var(--c-…)` code syntax and scopes, text styles, an overlay shadow and style tiles bound to them. Drop 3's docs map every screen to its beat and node.

**Friction.** Edu verification lifted the 20-call cap for the new file. Three tiles came out clipped, because `resize()` fixes an auto-layout frame's height, and the icons lost their strokes, because Figma's SVG import ignores attributes on the root element. The plans changed during the build, so the drop was checked against them again.

**Into the build.** I3-redesign pastes the `css` block into `src/ui/tokens.css`, makes the kit changes in tokens.md, then restyles the kit and the pitch cards.

## 4 · Code generation

Sunday 2:58 to 4:25 AM, about 90 minutes · rating 4 of 5 · drop 3 live on every page

**Tools.** No Figma call at this stage, by design: the build read the handoff files, so it never waited on Figma. Two integrator agents in the build session split the work, one on the shell and one on the kit. Every Figma variable carries `var(--c-…)` code syntax, so each became a CSS custom property with the same name, and `scripts/check-contrast.mjs` checked all 79 text pairs again in code. The shell half landed at 3:22 AM (113 tokens, 14 font files, the top bar, the pitch and end cards), and the kit half at 3:38 AM.

**Friction.** The screens were drawn at full frame, but most tour beats show the product at two thirds of its size beside a process panel, a layout the drops never drew. The review found small text there and a score table 24 px past its card. The piece drawings came from the build's own art script, so the illustration import was skipped.

**Into the build.** The tour passed its gate 5 of 5 on drop 3 at 4:07 AM, with three tour runs and one offline, tagged `demo-ok-v2-d3`.

## 5 · Pitch and video

Sunday from 12:26 AM, then 4:44 to 4:53 AM, about 25 minutes · rating 4 of 5 · deck and storyboard done, video in the edit

**Tools.** Figma Slides through `use_figma` for the deck the track asks for: the catch as the cold open, the three pitch cards read from `pitch.ts`, and links to the site, the code and the files. Then Figma Design for the video's storyboard, on its own page in Cindia · Design. It has 18 cards in scene order, each with:
- a copy of the matching screen
- its start time and length
- the voiceover line
- the edit note

A tag component names every hold, trim and optional scene in words, so color never carries the meaning alone. The cards follow `docs/v2/voiceover.md`, and the video conversation cuts from both.

**Friction.** `rescale()` dropped the text styles inside the 15 shrunk screen copies. A duplicated slide kept its old links until they were removed by hand. The sandbox can't download Figma's screenshots, so checks came back inline.

**Into the build.** The storyboard is the plan for the 2:59 cut, and the deck's slide "The video, planned in Figma" links to it.

---

## Evidence

This section backs up the entries above and is not part of their word count.

### Figma files

| File | Link | What's in it |
|---|---|---|
| Cindia · 01 Research (FigJam) | https://www.figma.com/board/T3lxV76Wc6petCKoRE0TNu | Written before the scope change. What Cindia is, why it matters (World Bank, FDIC, ICT News), the buyer, the earlier studio's maker and owner, the judge at a table, the community as a stakeholder, the Visa, Hyphenate and Figma criteria, the judge's one-minute story, 15 references (described and linked, never copied), 8 principles, the screen rules, 4 open questions with defaults |
| Cindia · 02 Moodboards (FigJam) | https://www.figma.com/board/KAOXGbhwnS0A0tJ8j5ABj7 | How the directions were checked, A · Museum label, B · Warp and weft, C · Daylight market (idea, palette, type, texture and imagery, the product vignette), a side-by-side table and the recommendation, with a sticky for Gordon's pick |
| Cindia · Design (Figma Design) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb | Created at 14:45 for stage 3. The Color and Size variable collections, 18 text styles, the overlay shadow, and four pages: Style tiles (`design/style-tiles.png`), Wireframes, Components, Screens (the 24 frames in `design/screens/`) and Video storyboard, added Oct 25 at 04:44 (https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb?node-id=89-129) |
| Cindia · Pitch (Figma Slides) | https://www.figma.com/slides/edmnscKXlUVzaIAIti6Eqh | Created Oct 25 at 00:30. Slides that mirror `/demo`'s pitch: the catch as the cold open, the three pitch cards with the tagline "Describe the vibe. Gift the piece. Pay the person.", a slide linking the video storyboard, and links to the site, the code and the three files above |

All four files sit in Gordon's drafts on his Figma team, which moved from the Starter tier to the student tier after his Edu verification. All four are shared as "Anyone with the link can view", checked in Figma on Oct 25 at 12:25 AM. The MCP server has no sharing tool, so that check was done in the browser.

### Timeline

| Time | What happened | Tools |
|---|---|---|
| 13:45 | Read the v2 brief, contracts sections 4, 7 and 9, the glossary, the design system and the nine v1 screenshots | Read |
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
| 14:59 | Thread illustration generator written: eight pieces as SVG, no text, no images, under 11 KB each | Python |
| 15:00 | Wireframes, Components and Screens pages. 14 grayscale wireframes of the ten kept screens | use_figma |
| 15:01 | First components: ProcessBlock (8 variants), Beam (Shop and Sell), Button, Chip, Badge, MakerMark, Seal | use_figma |
| 15:03 | Illustrations imported with simplified shapes. Replaced at 15:11 and 15:14 by the exact files, hash-checked | use_figma |
| 15:23 | Shop components: 15 icons, Tag, VerificationLine, Checkbox, Field, SearchBar, PieceCard, Label/18 style | use_figma |
| 15:29 | Piece page script refused on a hidden layer and rolled back. Rerun at 15:31 built both states | use_figma |
| 15:32 | `shop-piece-pc_01--checkout.png` and `--token.png` exported | get_screenshot |
| 15:35 | Receipt script refused by `combineAsVariants`. Rerun at 15:36 built both states and the wide ShareBar | use_figma |
| 15:38 | Search script refused on a nested position. Rerun at 15:39 built results and the home hero | use_figma |
| 15:40 | Review: the remove mark added to keyword chips, Sample tags aligned, the search column restacked | get_screenshot, use_figma |
| 15:41 | `shop-search--results.png`, `shop-home--hero.png` and both receipt states exported | get_screenshot |
| 15:44 | Support drawer and the AgentStep strip, in two states. The scrim needed its 40% on the layer, not the paint | use_figma, get_screenshot |
| 15:47 | SellHeader and SellNav. The first script asked for a Chinese font weight that doesn't exist. The money map built at 15:48, and its labels were re-laid at 15:49 | use_figma, get_screenshot |
| 15:51 | EvidenceCard, RecordRow and the catch. Review moved names and dates out of mono | use_figma, get_screenshot |
| 15:54 | Approvals, waiting and sealed. Review gave each card a seal slot, so the seal never covers a figure | use_figma, get_screenshot |
| 15:57 | Close with the impact panel. Review pulled a badge back inside its panel | use_figma, get_screenshot |
| 16:00 | The maker page, then in Chinese | use_figma, get_screenshot |
| 16:02 | ScoreBar and the process bar states sheet. Review added the missing "!" to attention blocks | use_figma, get_screenshot |
| 16:04 | The swarm view. Review moved the graph to the diagonals so the labels clear the edges | use_figma, get_screenshot |
| 16:07 | The search view. Review re-placed the labels and fixed score bars that ignored their values | use_figma, get_screenshot |
| 16:08 | Block statuses set to the F-process count rules on every screen, then all 14 earlier screens re-exported | use_figma, get_screenshot |
| 16:12 | Node IDs collected. Drop 2's docs written | use_figma, Write |
| 16:19 | Scope change from Gordon, through the coordinator: Native American makers, the Diné Weaving and Silver Co-op, four communities, the cultural rules, seven new screens | |
| about 16:25 | Read the fix plan, the cultural review's labels and rules, and the contracts for the new scope | Read |
| 16:35 | First drawings for the four communities generated in Python and imported behind a hash check | Python, use_figma |
| about 16:40 | Core screens re-skinned: names, `pc_01`, the gallery comparison, the receipt's promise and note, and Grace N.'s statement in English | use_figma, get_screenshot |
| 16:56 | R0's and S3's plans landed. Their titles, figure 11 and the scripted runs became the source for the screens | Read |
| 17:01 | The final 15 drawings, named by piece ID, imported and copied to `design/assets/illustrations/` | Python, use_figma |
| 17:05 to 17:25 | New screens: three pitch cards, the presenter hint, the listing beat, the data view, the community page and the store page | use_figma, get_screenshot |
| 17:30 | Ten plans read against the screens: buyer, process, tour, search, support, seller hub, communities, storefront, approvals and the maker statement | Read |
| 17:40 | Process bar on every screen: Counterfeit watch, the status words, one Simulated badge and the Live mark. The first pass found no nested blocks, and a second pass that walked each beam worked | use_figma, get_screenshot |
| 17:44 | Pitch cards rebuilt as `pitch.ts`'s title and four lines | use_figma, get_screenshot |
| 17:47 | VerificationLine set to nation attestation, with L4 in the full variant | use_figma |
| 17:49 | Piece page rebuilt to fit the fold, in all four states | use_figma, get_screenshot |
| 17:52 | The support drawer's steps list | use_figma, get_screenshot |
| 17:54 | The receipt note, the maker's four pieces and held line, the store blocks, the community verification and its storefront link | use_figma, get_screenshot |
| 17:55 | Compact cards got their verification line, and a 142 px picture to keep six above the fold | use_figma, get_screenshot |
| 17:56 to 18:01 | Every screen re-exported. Leftover verification overrides cleared, and the swarm view's background replaced with the new piece page | use_figma, get_screenshot |
| 18:02 | HANDOFF, components, changes, flows, layout and tokens updated for drop 3 | Write |
| 18:09 | Style tiles: the earlier studio's type samples, seal, chip and drawing replaced with the co-op's, and the live beam component placed in the kit tile. Re-exported as `design/style-tiles.png` | use_figma, get_screenshot |
| Oct 25, 00:26 | Banners at the top of 01 Research and 02 Moodboards: written and drawn before the scope change, with a pointer to Cindia · Design | use_figma |
| Oct 25, 00:29 | Pitch-card frames on Screens updated to Gordon's approved text, with the tagline as the what card's first line | use_figma |
| Oct 25, 00:30 | Cindia · Pitch created in Figma Slides: the catch, the three cards and a links slide, built from the pitch-card frames' type and colors, then checked for overlaps and screenshotted | create_new_file, use_figma |
| Oct 25, 04:44 | The what card's frame set to the 3:25 AM tagline and its new last line. The Why and How frames already matched `pitch.ts` | use_figma |
| Oct 25, about 04:45 to 04:52 | Video storyboard page: 18 scene cards from the voiceover script, 15 screen copies at 480 by 300, a Hold, Trim and Optional tag set, checked by screenshot | use_figma, get_screenshot |
| Oct 25, 04:53 | Deck slide 2 set to the new tagline. Slide "The video, planned in Figma" added after the How slide, linking the storyboard | use_figma |
| Oct 25, 05:07 to 05:11 | The Why card's approved last line set on its frame, the storyboard's p02 thumbnail and the deck's Why slide, each checked by screenshot | use_figma, get_screenshot |

### Figma MCP calls

Counted from the agent's transcript. The last minutes of the scope change round are estimated.

| Tool | Stage 1 | Stage 3 | Stage 2, to 16:17 | Scope change, 16:19 to 18:12 | Counts toward the limit |
|---|---|---|---|---|---|
| use_figma | 12 | 7 | 41, six failed and were redone | about 83, six failed and were redone | yes |
| get_screenshot | 8 | 3 | 45 | about 97 | yes |
| create_new_file | 2 | 1 | 0 | 0 | no, exempt |
| create_session | 1 | 0 | 0 | 0 | no |
| whoami | 2 | 1 | 0 | 0 | no, exempt |
| upload_assets | 1 | 0 | 0 | 0 | its upload URL was unreachable from the sandbox |
| get_figma_skill | 13 | 2 | 0 | 0 | no, skill docs |

The limit for a View or Collab seat is up to 20 calls a month. An Education plan (Edu verified) gets the Professional limits for Full and Dev seats: up to 200 calls a day and 10 a minute. Source: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/. After Gordon's verification the team shows the student tier and the calls went through again, though whoami still lists his seat as View. The Pacific day's total passed 200 during the scope change round and calls still went through. A daily count that resets at midnight UTC, 17:00 Pacific, would explain it. That isn't confirmed.

### Rework and dead ends

- The sandbox can't reach www.figma.com or mcp.figma.com. Screenshot URLs and upload POSTs fail. Screenshots were taken with `enableBase64Response` (copies in `design/ideation/`), SVG art went in through `createNodeFromSvg`, and the PNG texture tiles through `figma.base64Decode` and `figma.createImage`, all inside `use_figma` scripts.
- The texture tiles were first 25 to 33 KB as base64, too big to embed cheaply. They were cut to 7 to 9 KB seamless tiles. The thread-drawn fan went from 30 KB of line elements to 5 KB by drawing each color as one path.
- After the moodboard screenshots, three small layout fixes: A's language toggle was clipped at the right edge (moved in), B's process-block status lines overflowed in mono (set in Source Sans 3), C's last process pill was clipped (label shortened to "Proof · idle"). The vignette PNGs in `design/ideation/` show the state before these fixes.
- The comparison section was built by call 20 and never screenshotted, so it is the one part of the boards not checked by eye.
- The first scope change drawings were replaced at 17:01 by a set named by piece ID, so every piece on the screens has its own file.
- A shell command that deleted files through a variable was blocked by the session's safety check, and was redone with literal paths.
- `resetOverrides()` cleared old verification text on the screens, and also reset the layer names, which were set back by hand.
- The first piece page that fit the fold still left the verification at 904 px. Moving the hours into the header and setting the craft line at 14 px brought everything up to 860 px.

### Checks behind the moodboards

- **Contrast:** 72 pairs across the three palettes plus 6 tints on B's dark beam, all passing. Text 4.5:1 or better, control borders 3:1 or better, hairlines carry no text. Data: `design/ideation/checks.json`.
- **Color blindness:** each palette's flag and money-in colors stay apart under deuteranopia (ΔE 25 to 31) but get close under protanopia (ΔE 10 to 13), so every state carries an icon and a word as well as a color.
- **Fonts:** every candidate covers the catalog's names, including Diné. Only Inter and Source Sans 3 also cover the wider set for names makers may write later (Diné ą ǫ ł, pinyin tones and others). No Latin font covers Inuktitut syllabics, so every stack ends with Noto Sans Canadian Aboriginal. All fonts are under the SIL Open Font License.
- **Images:** only our own swatches, type samples, textures and drawings generated from code. No photos, no artworks, no screenshots of other products.

### Checks behind drop 3

- **Drawings:** 15 SVGs, each under 6 KB, with no `text`, `image`, `href`, `script` or `foreignObject`. Patterns are stripes, steps, diamonds, zigzags and bands. Flowers appear only on `pc_14`, the Ojibwe beadwork. No Yei figures, katsina, feathers, sandpainting designs or whirling-log shapes.
- **Labels:** L1 on every Shop and Sell screen and on each pitch card, L2 in every Sell header, L3 and L4 on every verification line, L5 under the story, L7 beside the add-on and the project, L8 on the about box and the story block, L9 under the protocols title, L11 at the top of the drawer, L13 in the store footer, L27 beside the translated title, L28 on the model card.
- **Words:** no nation's name as a product word, Cindia called a platform, and every maker a given name with a family initial.

### What's next

- Gordon picked B at 14:28, and drop 1 is done.
- Drop 3 is done at about 18:14: 24 PNGs, 15 drawings, the style tiles, and the updated `components.md`, `changes.md`, `flows.md`, `layout.md` and `tokens.md`.
- Still to do in Figma: the prototype links and the screens `HANDOFF.md` lists as not drawn. The Slides deck that mirrors the pitch cards was made on Oct 25 at 00:30.
