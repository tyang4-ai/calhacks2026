---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "Figma"
captured: 2026-10-24
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-24
date-modified: 2026-10-24
---

# Figma · Idea To Demo

Everything I found for Figma's Cal Hacks 13.0 track, copied Oct 24, 2026 from Figma's track doc, Devpost, the Hacker Guide and the pre-event email. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **The track:** "Idea To Demo". Build a real project from idea to working demo during the hackathon, use Figma's tools at the stages where they help, and hand in a stage log of which tool did what.
- **Prizes (Figma's track doc):** Best Design $500, Most Creative $500, Best Figma Workflow $2,000, Best Stage Log $2,000. Every winner is invited to a session with an Early Career Recruiter at Figma.
- **Prizes (Devpost, as fetched Oct 24):** five prizes of $1,000 each in Amazon gift cards, each with a session with Figma's Early Career Recruiting team. The pre-event email says "$5K in Amazon gift cards". Both versions add up to $5,000, but the names don't match (see the Devpost section).
- **What to hand in:** a demo video of 3 minutes at most, a stage log of 200 words at most per stage, and Figma Slides (required) with the Figma files embedded and a link to the code. Every Figma file shared with "Anyone". The account must be Edu verified.
- **Judging:** workflow design, adoptability, output quality, presentation and pitch, innovation and creativity.
- **Workshop:** "From Canvas to Shipped: How to Differentiate in the Age of AI", Fri Oct 23, 7:00 to 8:00 PM at Gate 3 (Hive). Already over.

## Devpost prizes (verbatim, as fetched Oct 24)

- **[Figma] Best Use Case of Figma** · $1,000 in cash: Amazon Gift Cards (distributed by CalHacks orgs.), Session with Figma Early Career Recruiting Team [to be scheduled]
- **[Figma] Best Use Case of Figma Agent** · $1,000 in cash: Amazon Gift Cards (distributed by CalHacks orgs.), Session with Figma Early Career Recruiting Team [to be scheduled]
- **[Figma] Most Creative Use Case of Figma Agent** · $1,000 in cash: Amazon Gift Cards (distributed by CalHacks orgs.), Session with Figma Early Career Recruiting Team [to be scheduled]
- **[Figma] Best Design** · $1,000 in cash: Amazon Gift Cards (distributed by CalHacks orgs.), Session with Figma Early Career Recruiting Team [to be scheduled]
- **[Figma] Most Creative** · $1,000 in cash: Amazon Gift Cards (distributed by CalHacks orgs.), Session with Figma Early Career Recruiting Team [to be scheduled]

The live page and Figma's doc disagree. The planning session saw "Best Figma Workflow Hack, $1,000" on Devpost on Oct 24, while fetches that afternoon still showed the five lines above. Figma's doc is the only source that gives criteria, so build for it. When submitting, select whichever Figma prizes Devpost lists at that point.

## Hacker Guide row (verbatim, unchanged on Oct 24)

> #### TBD (Figma)
>
> **Criteria:** https://docs.google.com/document/d/1HjzThDGveSLiilIdEPEHq12ZVLZ5eS0T8CQC5_m_-rg/edit?usp=sharing
>
> **Prize:** Amazon Gift Cards (distributed by CalHacks orgs); session with Figma Early Career Recruiting Team [to be scheduled]

## From Pre-Event Details #2 (Oct 15, verbatim)

> *Figma –* Figma is the collaborative design platform where teams go from idea to product — the Figma for Education plan gives students and educators free access to all of Figma’s tools, including Figma Design, Dev Mode, Figma Slides, FigJam, Figma Make, and Figma Agent!
>
> Figma Agent is now available through the Education Plan; with Figma Agent, you can turn an idea into a prototype or quicken your workflow, using text prompts or your existing Figma designs. Join our workshop on Friday, October 23rd to learn more.
>
> Build with Figma at Cal Hacks 13.0 to compete for the Figma track prizes: $5K in Amazon gift cards plus access to our intimate speaker sessions with our Early Career Team.

## What Cindia v2 does for this track

The brief's line: "The design pipeline from research to code, with the stage log."

- **Who does it:** a design lead (a Claude Code agent with the Figma MCP server) works through the track's four stages for Gordon and keeps the stage log as it goes, in the repo's `design/stage-log.md`.
- **Ideation:** two FigJam boards, written through the MCP server's `use_figma` tool. *01 Research* has five people, three tracks' criteria, 15 references, the judge's one-minute story and eight principles. *02 Moodboards* has three directions, each with a palette checked for contrast and color blindness. Gordon picked B, "Warp and weft".
- **Handoff, drop 1 (Sat Oct 24, 2:44 PM):** style tiles in the Cindia · Design file, bound to 79 variables and 17 text styles, plus `design/tokens.json`, `tokens.md` and `layout.md` in the repo. A Python generator writes all 113 tokens and fails if any of 80 contrast pairs falls below 4.5:1 for text or 3:1 for marks.
- **Prototyping, drop 2 (to come):** flows, wireframes, components, mockups, illustrations and a clickable prototype of the main path.
- **Code generation:** the integrator's `I3-redesign` plan applies each drop to the UI kit. Features use only kit components and tokens, so they follow without edits.
- **The submission:** the scribe's `sponsors/figma/` folder (plan `D-sponsors`) gathers the video, the stage log and the Figma Slides. The Slides open on the catch, like the video.

## Figma files so far

From the repo's `design/HANDOFF.md`, Oct 24.

| File | Link | State |
|---|---|---|
| Cindia · 01 Research (FigJam) | https://www.figma.com/board/T3lxV76Wc6petCKoRE0TNu | Done |
| Cindia · 02 Moodboards (FigJam) | https://www.figma.com/board/KAOXGbhwnS0A0tJ8j5ABj7 | Done. B is the pick |
| Cindia · Design (Figma Design) | https://www.figma.com/design/v4nmWkfTRKvWgwf8QiDjCb | Style tiles done. Components and screens come in drop 2 |

## Docs and APIs we use

Offline copy: the repo's `docs/tech/figma-mcp/tools-and-setup.md`.

- Figma MCP server tools and prompts: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
- Figma's MCP server guide (setup, skills, best practices): https://github.com/figma/mcp-server-guide
- The remote server: `https://mcp.figma.com/mcp`
- Figma's example stage log deck: https://www.figma.com/slides/hViyGFvaHxTBqzYKkaYPho

## Things to know

- The Starter plan gives a View seat 20 MCP calls a month. Edu verification lifted that cap for the new file.
- The cloud session can't reach figma.com, so screenshots come back inline and images go into scripts instead of being uploaded.
- In `use_figma`, `resize()` fixes an auto-layout frame's height, which clipped three tiles. Figma's SVG import ignores attributes on the root element, so the icons lost their strokes. Each took a fix call.
- Call `create_session` with the file key before any other file tool, and load the `figma-use` skill before `use_figma` (the server's own instructions).

## Checklist

- [ ] Figma account Edu verified
- [ ] Every Figma file shared with "Anyone"
- [ ] Stage log: for each stage, the tools and why, the minutes, a 1 to 5 rating and how the output reached the project, in 200 words at most
- [ ] Figma Slides with the stage log, the demo, the embedded Figma files and the repo link (Figma's example deck is a starting point)
- [ ] Demo video, 3 minutes at most
- [ ] Select the Figma prizes on Devpost

---

## Full track doc (copy of the Google Doc "Cal Hacks <> Figma")

Source: https://docs.google.com/document/d/1HjzThDGveSLiilIdEPEHq12ZVLZ5eS0T8CQC5_m_-rg (the criteria link in the Hacker Guide's Figma row). Read Oct 24, 2026 through the Google Drive connector. Formatting is cleaned up from the export, and the words are unchanged.

**Prize Track · Idea To Demo** · Figma, Cal Hacks 13.0

**Context:** Every team builds differently. Some start in a design tool, some start in code, and many bounce between the two. Figma now offers more than a canvas: Make can turn a prompt into a working prototype, and Figma agent can read and write designs and pass them to code.

This challenge is about building a real project the way you normally would, then showing us where each tool fits in your process.

**Your Mission:** Take an idea to a working demo within the hackathon. Use any mix of tools you like. Figma’s tools and agent capabilities are available to you, and you decide at which stages they earn a place.

Projects might include:

- A web or mobile app built from a rough idea
- A redesign of software that frustrates you, delivered as a working demo
- A tool you’ve wanted for your own workflow
- Anything else you can take from idea to demo in the time given

You’ll submit the demo plus a short **stage log** (workflow artifact) recording which tools you used at each step of the build.

### Considerations

- Build what you were already going to build. Your project can be ambitious or modest, and we’re not judging on scope or technical difficulty. We care most about a clear problem, an honest account of how you built it and a demo that works.
- Strong submissions show intentional tool choices: why each tool was used at each stage and what got passed from one stage to the next.
- Your real process probably isn’t a straight line from design to code. You might start in code, jump to a prototype halfway, or loop back to ideation after testing with a friend. **Show the path you actually took and how you used Figma’s tools to iterate.**

### Submission Requirements

**Please make sure your Figma files are accessible to “Anyone”.**

Final submission should consist of three deliverables:

- Demo video (3 minutes maximum)
- Workflow Artifact / **Stage Log** (200 words max per stage)
- Figma Slides demonstrating your work & workflow (required)
  - \[Stage log\] State which Figma product you used & why.
    - [Example here](https://www.figma.com/slides/hViyGFvaHxTBqzYKkaYPho) — feel free to edit and add on as needed
  - \[Demo Video\] Showcase your build in a quick demo
  - \[Working Code & Prototype\] Must embed your Figma files (Make(s) and/or Figma prototypes) showcasing how you used Figma and a link to your working code/repository.
- **Make sure you are Edu verified**

**The stage log** covers four stages, and you may explain the stages you used Figma in:

| Stage | |
|---|---|
| Ideation | Exploring and shaping the idea |
| Prototyping | Making something you could click through or try |
| Handoff | Moving a design or spec toward implementation |
| Code generation | Producing the working code |

For each stage, tell us:

- Which Figma tool(s) you used (Figma Design, Make, a Figma agent, etc.) & why
- About how many minutes you spent
- How well it worked, from 1 to 5
- How the output made it into your final project

**Additional Info:**

### What makes a good workflow?

- **Intentional:** Each tool is there for a reason, not because it was required.
- **Traceable:** We can see where an idea turned into a design, and where a design turned into code.
- **Honest about friction:** The log notes rework, dead ends, and tools you abandoned.
- **Reusable:** Another team could run a similar process on a different idea.

### Judging Criteria & Prizes

#### Judging Criteria

**Workflow Design:** Is there a clear path from idea to demo, with each stage (ideation, prototyping, handoff, code generation) accounted for? Are tools chosen on purpose, with reasons tied to what each stage needed?

Does the stage log show time spent, what worked, and what broke? Could another team follow this process without the builder in the room?

**Adoptability:** Would a team plausibly use this workflow on their next project? Does it remove real friction, with a measurable before and after (time saved, steps cut, fewer rounds of rework)? Is it realistic given the tools and access people actually have?

**Output Quality:** Does the demo work and do what the team says it does? Is the result thoughtfully designed and usable by a real person? Is the quality of the output clear enough to judge how well the tools performed, not just how well the team did?

**Presentation / Pitch:** How clearly does the team communicate the problem, the idea, and how they built it? Does the walkthrough follow a logical, engaging narrative from idea to demo? Is the workflow easy to follow, including the stage log and the decisions behind it? Does the pitch persuasively convey what the project is for and who it serves?

**Innovation & Creativity:** Is the project novel? Does the project push boundaries?

#### Prizes

- Best Design — $500
- Most Creative — $500
- **Best Figma Workflow:** best use of Figma Design, Make, or a Figma agent in a real build — $2000
- **Best Stage Log:** the clearest, most repeatable workflow of how a project was built — $2000

**All winners will be invited to an exclusive session with an Early Career Recruiter at Figma**
