# Figma · Best Figma Workflow Hack

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md), [`design/stage-log.md`](../../design/stage-log.md) and [`design/HANDOFF.md`](../../design/HANDOFF.md). Every maker, community and story named here is fictional.

**Met or not: not yet.** The stage log is written (four stages and a fifth entry for the pitch and video), the Slides deck is made, and the Figma files are shared. The workflow video, 3 minutes at most, isn't linked, and it is a hard requirement. It is met when Gordon adds the video link.

## What its judges look for

The Devpost prize is "[Figma] Best Figma Workflow Hack" ($1,000), the one Figma prize on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) (checked live by Gordon at 11:45 PM on Oct 24). Figma's track doc calls the track "Idea To Demo": take a real project from idea to working demo, use Figma's tools at the stages where they help, and hand in an honest record of how. The criteria are in that doc, copied in [`docs/reference/sponsors/ch13-sponsor-figma.md`](../../docs/reference/sponsors/ch13-sponsor-figma.md).

- **Workflow design.** A clear path from idea to demo, with each stage accounted for and tools chosen for a reason. Could another team follow the process without the builder in the room?
- **Adoptability.** Would a team use this workflow on its next project? Does it remove real friction?
- **Output quality.** Does the demo work and do what the team says?
- **Presentation and pitch.** A clear story from the problem to the demo to how it was built.
- **Innovation and creativity.**

The stage log is judged for being intentional, traceable, honest about friction and reusable.

**What to hand in:** a demo video of 3 minutes at most, a stage log of 200 words at most per stage (ideation, prototyping, handoff, code generation), and Figma Slides with the Figma files embedded and a link to the code. Every Figma file has to be shared with anyone who has the link, and the account has to be Edu verified.

**One prize, not four.** Figma's own doc lists Best Design ($500), Most Creative ($500), Best Figma Workflow ($2,000) and Best Stage Log ($2,000), and an earlier fetch of Devpost showed five prizes of $1,000 each. Gordon's live check supersedes both: Figma has one prize on Devpost now, "[Figma] Best Figma Workflow Hack". Select that one when you submit.

## What Cindia does for this track

A design lead, a Claude Code agent with the Figma MCP server, worked through the stages for Gordon and kept the stage log as it went. Cindia is a platform for underrepresented makers, starting with Native American makers, and the screens show the fictional Diné Weaving and Silver Co-op, a co-op of Diné (Navajo) makers on the Navajo Nation.

- **Ideation.** Two FigJam boards: research (people, three tracks' criteria, references, the judge's one-minute story, principles) and moodboards (three directions, each with a palette checked for contrast and color blindness). Gordon picked direction B, "Warp and weft".
- **Prototyping.** 24 screens in Figma Design, built from the plans as they landed, every color bound to a variable and every text to a style. 25 components and sets, 16 icons and 15 illustrations. At 4:19 PM on Saturday the scope moved to Native American makers, and the core screens took the Diné co-op's content.
- **Handoff.** A Python generator writes 113 design tokens and fails if any of 80 contrast pairs falls below 4.5:1 for text or 3:1 for marks. Then 79 variables, text styles and style tiles in Figma Design, all bound to those tokens.
- **Code generation.** Done. Design drop 3 is applied: two integrator agents split the work, one on the shell (landed at 3:22 AM) and one on the kit (3:38 AM), and every Figma variable became a CSS custom property with the same name. The contrast check ran again in code over all 79 text pairs. The tour passed G4v2 5 of 5 on the new look at 4:07 AM (tag `demo-ok-v2-d3`), and a four-lens screen review found no confirmed blocker ([`docs/plans/I3-redesign.md`](../../docs/plans/I3-redesign.md)). The feature layout rounds the drop also listed weren't done. They are on the not-built list in [`status.md`](../../docs/harness/status.md).
- **Pitch and video.** A Slides deck that mirrors the tour's three pitch cards and opens on the catch, and a storyboard page of 18 scene cards in Cindia · Design for the video.

## The three hand-ins, and where each one is

| Hand-in | Where | State at the freeze |
|---|---|---|
| Stage log, 200 words at most per stage | [`design/stage-log.md`](../../design/stage-log.md) | Written: "1 · Ideation", "2 · Prototyping", "3 · Handoff", "4 · Code generation" and "5 · Pitch and video". The log's header sets the 200-word limit per entry. The words weren't counted for this page. The prototype links between frames aren't wired |
| Figma Slides with the Figma files embedded and a link to the code | https://www.figma.com/slides/edmnscKXlUVzaIAIti6Eqh | Made on Oct 25 at 12:30 AM. It has the catch as the cold open, the three pitch cards with the tagline, a slide linking the video storyboard, and links to the site, the code and the files. [GORDON: open the deck in a private window to confirm it opens without signing in. The stage log says all four Figma files were set to Anyone with the link and checked at 12:25 AM, but the deck was made five minutes after that check. Is it shared the same way?] |
| Workflow video, 3 minutes at most | [GORDON: the workflow video link] | Not linked. The stage log says the deck and the storyboard are done and the video is in the edit. The storyboard is the plan for a 2:59 cut |

The stage log's "Evidence" section at the end backs the entries up with a timeline, the Figma call counts, the rework and dead ends, and the checks. It is not part of the word count.

## The Figma files

From [`design/HANDOFF.md`](../../design/HANDOFF.md) and the stage log. All four sit in Gordon's drafts on his Figma team, and the stage log says they are shared as "Anyone with the link can view", checked on Oct 25 at 12:25 AM.

| File | Link | State |
|---|---|---|
| Cindia · 01 Research (FigJam) | https://www.figma.com/board/T3lxV76Wc6petCKoRE0TNu | Done. Written before the scope change, with a banner that says so |
| Cindia · 02 Moodboards (FigJam) | https://www.figma.com/board/KAOXGbhwnS0A0tJ8j5ABj7 | Done. Direction B is the pick |
| Cindia · Design (Figma Design) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb | Style tiles, wireframes, components, the 24 screens and the video storyboard page |
| Cindia · Pitch (Figma Slides) | https://www.figma.com/slides/edmnscKXlUVzaIAIti6Eqh | The deck above |

## Where to look

- [`design/stage-log.md`](../../design/stage-log.md): the stage log and its evidence.
- [`design/HANDOFF.md`](../../design/HANDOFF.md): what is in each drop, the screens in tour order with their Figma nodes, and what is still to do.
- [`design/tokens.md`](../../design/tokens.md), [`design/components.md`](../../design/components.md), [`design/flows.md`](../../design/flows.md), [`design/layout.md`](../../design/layout.md) and [`design/changes.md`](../../design/changes.md): the handoff files.
- [`design/style-tiles.png`](../../design/style-tiles.png) and the 24 screens in [`design/screens/`](../../design/screens/).
- [`docs/plans/I3-redesign.md`](../../docs/plans/I3-redesign.md): how each drop is applied to the code. Drop 3 is applied.

## How to run that part

- Open the stage log and the four Figma files above. No key is needed to read the repo's design files.
- To see the code that the design feeds: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo?mode=present. The public site plays the same tour at https://cindia.design/demo.
- Still to do in Figma ([`design/HANDOFF.md`](../../design/HANDOFF.md)): wire the prototype links, and draw the screens it lists as not drawn.

## The moment in the tour

The Figma Slides deck mirrors the three pitch cards of `/demo` (`p01-what`, `p02-why` and `p03-how`, 0 to 60 s), and the demo video opens on the catch (`d08-catch`, 146 to 154 s). `/demo?video=1` plays that cut: a 5-second cold open on the catch, then the spine with shorter pitch cards, about 2 minutes 40 seconds. The beats are in [`docs/common/demo-script.md`](../../docs/common/demo-script.md).

## What's done and what's still to come

- **Done:** the stage log for ideation, prototyping, handoff, code generation and the pitch. Two FigJam boards. The design file with 24 screens and a video storyboard. 113 tokens with contrast checks. The Slides deck. Design drop 3 applied to the code and gated.
- **Still to come, and Gordon's:** the workflow video and its link, and confirming the deck's sharing.
- **Still to come, in Figma:** the prototype links, and the screens not drawn yet.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
