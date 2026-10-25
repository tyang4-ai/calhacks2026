# Figma · Idea To Demo

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. Where something is not done yet, this page says so.

## What its judges look for

The track is "Idea To Demo": take a real project from idea to working demo, use Figma's tools at the stages where they help, and hand in an honest record of how. The criteria are in Figma's track doc, copied in [`docs/reference/sponsors/ch13-sponsor-figma.md`](../../docs/reference/sponsors/ch13-sponsor-figma.md). The [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) lists the Figma prizes, but its names and Figma's doc disagree (see below).

- **Workflow design.** A clear path from idea to demo, with each stage accounted for and tools chosen for a reason. Could another team follow the process without the builder in the room?
- **Adoptability.** Would a team use this workflow on its next project? Does it remove real friction?
- **Output quality.** Does the demo work and do what the team says?
- **Presentation and pitch.** A clear story from the problem to the demo to how it was built.
- **Innovation and creativity.**

The stage log is judged for being intentional, traceable, honest about friction and reusable.

**What to hand in:** a demo video of 3 minutes at most, a stage log of 200 words at most per stage (ideation, prototyping, handoff, code generation), and Figma Slides with the Figma files embedded and a link to the code. Every Figma file has to be shared with anyone who has the link, and the account has to be Edu verified.

**The prize names don't match.** Figma's doc lists Best Design ($500), Most Creative ($500), Best Figma Workflow ($2,000) and Best Stage Log ($2,000). A fetch of Devpost on Oct 24 showed five prizes of $1,000 each, and the planning session saw one called "Best Figma Workflow Hack" the same day. Check the Devpost page in a browser and select whichever Figma prizes it lists when you submit.

## What Cindia does for this track

A design lead, a Claude Code agent with the Figma MCP server, worked through the four stages for Gordon and kept the stage log as it went. Cindia is a platform for underrepresented makers, starting with Native American makers, and the screens show the fictional Diné Weaving and Silver Co-op, a co-op of Diné (Navajo) makers on the Navajo Nation.

- **Ideation.** Two FigJam boards: research (people, three tracks' criteria, references, the judge's one-minute story, principles) and moodboards (three directions, each with a palette checked for contrast and color blindness). Gordon picked direction B, "Warp and weft".
- **Handoff.** A Python generator writes 113 design tokens and fails if any of 80 contrast pairs falls below 4.5:1 for text or 3:1 for marks. Then 79 variables, text styles and style tiles in Figma Design, all bound to those tokens.
- **Prototyping.** 24 screens in Figma Design, built from the plans as they landed, every color bound to a variable and every text to a style. 25 components and sets, 16 icons and 15 illustrations. At 4:19 PM the scope moved to Native American makers, and the core screens took the Diné co-op's content.
- **Code generation.** Not started. The integrator applies each design drop to the UI kit in [`docs/plans/I3-redesign.md`](../../docs/plans/I3-redesign.md), and features follow without edits because they use only kit components and tokens.

## The three hand-ins, and where each one is

| Hand-in | Where | State at 8:00 PM |
|---|---|---|
| Stage log, 200 words at most per stage | [`design/stage-log.md`](../../design/stage-log.md) | Stages 1 (ideation), 2 (prototyping) and 3 (handoff) are written. Stage 4 (code generation) is not started. The prototype links between frames are not wired yet |
| Figma Slides with the Figma files embedded and a link to the code | [GORDON: the Slides link, shared as Anyone with the link] | Not made yet. The deck mirrors the three pitch cards of `/demo`, opens on the catch like the video, and embeds the files below |
| Workflow video, 3 minutes at most | [GORDON: the workflow video link] | Not recorded yet |

The stage log's sections that exist are "1 · Ideation", "2 · Prototyping" and "3 · Handoff". The "Evidence" section at the end backs them up with a timeline, the Figma call counts, the rework and dead ends, and the checks. It is not part of the word count.

## The Figma files

From [`design/HANDOFF.md`](../../design/HANDOFF.md). The stage log says none is shared yet. Gordon has to set each to "Anyone with the link" in Figma, because the MCP server has no sharing tool.

| File | Link | State |
|---|---|---|
| Cindia · 01 Research (FigJam) | https://www.figma.com/board/T3lxV76Wc6petCKoRE0TNu | Done. Written before the scope change |
| Cindia · 02 Moodboards (FigJam) | https://www.figma.com/board/KAOXGbhwnS0A0tJ8j5ABj7 | Done. Direction B is the pick |
| Cindia · Design (Figma Design) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb | Style tiles, wireframes, components and the 24 screens |

## Where to look

- [`design/stage-log.md`](../../design/stage-log.md): the stage log and its evidence.
- [`design/HANDOFF.md`](../../design/HANDOFF.md): what is in each drop, the screens in tour order with their Figma nodes, and what is still to do.
- [`design/tokens.md`](../../design/tokens.md), [`design/components.md`](../../design/components.md), [`design/flows.md`](../../design/flows.md) and [`design/layout.md`](../../design/layout.md): the handoff files.
- [`design/style-tiles.png`](../../design/style-tiles.png) and the 24 screens in [`design/screens/`](../../design/screens/).
- [`docs/plans/I3-redesign.md`](../../docs/plans/I3-redesign.md): how each drop is applied to the code (planned, after the tour is done).

## How to run that part

- Open the stage log and the three Figma files above. No key is needed to read the repo's design files.
- To see the code that the design feeds: `npm ci`, `npm run build`, `npm run preview`, then open http://localhost:4173/demo.
- Still to do in Figma ([`design/HANDOFF.md`](../../design/HANDOFF.md)): wire the prototype links, make the Slides deck, and draw the screens it lists as not drawn.

## The moment in the tour

The Figma Slides deck mirrors the three pitch cards of `/demo` (`p01-what`, `p02-why` and `p03-how`, 0 to 60 s), and the demo video opens on the catch (`d08-catch`, 146 to 154 s). The tour is planned (`I2-tour`), and its times are in [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2. The design drop's screens are drawn for each beat.

## What's done and what's still to come

- **Done:** the stage log for ideation, prototyping and handoff. Two FigJam boards. The design file with 24 screens. 113 tokens with contrast checks.
- **Still to come:** the stage log's code generation entry, the prototype links, the Slides deck, the workflow video, and sharing every file with "Anyone with the link".
- **Applying the design to the code** is planned and waits until the tour is done.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
