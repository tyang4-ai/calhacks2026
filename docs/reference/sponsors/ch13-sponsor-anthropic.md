---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "Anthropic"
captured: 2026-10-23
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-21
date-modified: 2026-10-24
---

# Anthropic · Claude for Public Benefit

Everything Anthropic published for Cal Hacks 13.0, first copied Oct 21, 2026 and updated Oct 23 with the Hacker Guide, Hive and Slack. Re-checked Oct 24: Devpost still lists no Anthropic prize, and the Hacker Guide row is unchanged. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **Prize:** $5,000 in Claude credits, a year of Claude Max 20x, and office hours. The Hacker Guide lists it now. The Slack post adds office hours with the Applied AI team and an invite to visit Anthropic HQ in San Francisco. Devpost still had no Anthropic prize on Oct 23 at 10:45 PM. Wallace said the Hacker Guide beats Devpost, and that newer tracks like Anthropic hadn't reached Devpost yet.
- **Workshop:** "Building Agents & Multi-Agent Teams with Claude," Sat 1:00 to 2:00 PM in the Theater (Hive). The Hacker Guide's workshop table still says "Intro to Claude Code: Boost Your Coding Workflow."
- **Claude Corner:** coffee chats about careers, research and building with Claude (time not posted). Notability's matcha cart sits there Sat 8:00 AM to 12:00 PM.
- **$50 in Claude API credits for every hacker:** https://platform.claude.com/offers/15420110-70c3-451c-b2db-a1e5e140c4c0 (posted by Arinze Obiezue in #cohost-anthropic, Fri Oct 23, 1:41 PM).
  - The credits land in the Claude Console (API) org you're signed into, not in claude.ai. One hacker redeemed into a team org by mistake, so check which org is active first.
  - Some hackers saw a 1 to 2 business day wait. Arinze said later that the credits should have arrived.
  - Problems with credits: reply in that Slack thread or DM Arinze.
- **Sponsor tier:** Anchor (co-host)

## Track details from Slack (Arinze Obiezue, Fri Oct 23, 4:37 PM, verbatim)

> Hey hackers! Just sharing more details about our track, called 'Claude for Public Benefit'
> The challenge for the track is to build something your community needs. Pick a community: people who share a place, an identity, a circumstance, or a need. Find a real problem they face, then build something with Claude that helps. The narrower, the better.
> Some ideas (but we'll prefer if you built things more creative):
>
> help a food bank match donations to need,
> make city council decisions readable for residents,
> help first-gen students through financial aid forms, or
> translate clinic paperwork for families.
>
> What we're looking for
>
> A named community: “Students” is too broad. "Elderly people struggling with mobility" is closer to the right register.
> A real problem: You've lived it or you've talked to someone who has.
> A working high-impact product: We want a fully working product, not a concept of a plan. It should also be clear how you plan to measure its impact on your target community
> Thoughtful use of Claude: Claude is used meaningfully in the product's development and functioning.
>
> Track Prizes
>
> $5,000 in Claude credits
> A year of Claude Max 20x for the winning team
> Office hours with our Applied AI team
> An invite to visit Anthropic HQ in San Francisco

What the Slack post adds to the guide: "an identity" as a kind of community, a new example, a fully working product rather than a concept, a clear plan to measure impact on the community, and Claude mattering in both how the product gets built and how it runs.

## Other Slack answers

- Tyler Lacroix (Anthropic), Oct 20: "Yes all hackers will get $50 of Claude API credits"
- Tyler Lacroix, Oct 21: more info at the opening ceremony
- Arinze Obiezue, Oct 23: the credits are Claude API credits, which is why they show up in the Console and not in claude.ai

## Judging (Hacker Guide row, verbatim)

> 1. **A named community**. "Students" is too broad. "Transfer students at Berkeley trying to find housing" is the right register.
> 2. **A real problem**. You have lived it, or you talked to someone who has.
> 3. **It works**. One thing done well and usable on Monday beats a broad demo.
> 4. **Thoughtful use of Claude**. Claude does something that matters to the solution, and you know where it could go wrong for the people using it.
>
> **Prize:** $5,000 in Claude credits + 1Y Claude Max 20x + Office Hours

## Workshop description (Hive, verbatim)

> In this workshop, three Anthropic engineers show you how to build with multiple Claude agents: how many your project needs, what each one should own, and when adding one more is a bad idea.
>
> You'll see the problems that hit first-time hackers over 36 hours, from workflows that eat your credits to agents overwriting each other's code, with fixes you can use in Claude Code that same night. You'll also get a look at what has recently improved in how Claude agents work together, and how to use it in your build.

## What Cindia v2 does for this track

The brief's line: "A named community (the Gu studio), a real problem, the swarm's narrow agents on Claude, where it could go wrong and how the design guards against it."

- **The named community:** the Gu embroidery (顾绣) studio in Shanghai, Gordon's hometown, with its owner and three makers. Seven fictional Indigenous communities sit beside it in the catalog. Gu embroidery is a Han Chinese heritage craft, and Cindia never calls it Indigenous.
- **The problem:** makers spend their time selling instead of making, young people don't take up a craft that doesn't pay, and buyers can't tell real from fake while middlemen take the margin. The brief's numbers:
  - There are about 476.6 million Indigenous people, 6.2% of the world's population and 18.2% of the people living in extreme poverty (World Bank).
  - In 2023, 12.2% of American Indian or Alaska Native households had no bank account, against 4.2% of all US households (FDIC 2023 survey).
  - In 2000, the chair of the Senate Committee on Indian Affairs estimated that about half of a roughly $1 billion market for Indian-made goods was counterfeit. The brief cites it as an old figure.
- **Narrow agents on Claude:** each agent in the swarm does one job, gets only the tools that job needs and hands back a typed result. Cindy routes and merges and has no facts of her own. `claude-haiku-5-5` runs Cindy, Intake, Finder, Clerk, Tagger and Claims. `claude-sonnet-5-5` runs Curator, Steward, Writer, Lister, Describer, Checker, Explainer, Reporter and Designer. Matching, the books, scoring and the web search are plain code, labeled "rule-based".
- **Where it could go wrong, and the guard:**
  - Money moving on its own: Cindy only proposes. The owner approves anything that moves money or publishes anything, with the seal.
  - Made-up cultural meaning: the Steward answers "is it real?" and "what does it mean?" only from the community's page and the verification record, and says "I'll ask the maker" otherwise.
  - A model's general knowledge standing in for the community: facts come from the maker and culture from the community. Agents only add vibe keywords and a picture description, and the maker approves both.
  - Machine translation into Indigenous languages: none. Cindy works in English and Chinese, and makers write in their own language themselves.
  - False accusations: the counterfeit watch only drafts a report, and the owner decides whether to send it.
  - Training on a community's data: no real community's data trains anything, and the model card says so.
  - Overclaiming: every scripted panel keeps its Simulated badge, and the people and communities are labeled as demo data.
- **What the judges see:** the support drawer names the agent that's answering and hands over to a person when it should. The swarm view lights up each agent as it works, with each step's input, output, tool, model and time.
- **API:** the Claude Messages API, called only from the FastAPI server. The variable names and the Oct 21 API changes are in the repo's `docs/v2/apis-and-accounts.md`.

---

## Email: "Cal Hacks 13.0 - Meet Anthropic!" (Oct 20, 2026, 10:28 PM PT)

From edward@hackberkeley.org

> We're so excited to introduce Anthropic, an Anchor sponsor at Cal Hacks 13.0!
>
> Anthropic (https://www.anthropic.com)
>
> **Introducing Anthropic**
>
> Anthropic is an AI safety and research company, and the team behind Claude. At Cal Hacks 13.0, our track is 'Claude for Public Benefit': pick a community (people who share a place, a circumstance, or a need), find a real problem they face, and build something with Claude that helps.
>
> We're also hosting a Saturday workshop on building agents and multi-agent teams, and holding coffee chats in our Claude Corner about careers, research, and building with Claude. Come find our team at the Anthropic booth!
>
> ***Track: Claude for Public Benefit***
> The winning team will receive $5,000 in Claude credits, 1 year of Claude Max 20x, and office hours with the Anthropic team.
>
> Judging criteria:
> * A named community. "Students" is too broad. "Transfer students at Berkeley trying to find housing" is the right register.
> * A real problem. You have lived it, or you talked to someone who has.
> * It works. One thing done well and usable on Monday beats a broad demo.
> * Thoughtful use of Claude. Claude does something that matters to the solution, and you know where it could go wrong for the people using it.
>
> ***Workshop: Building Agents & Multi-Agent Teams with Claude***
> In this workshop, three Anthropic engineers show you how to build with multiple Claude agents: how many your project needs, what each one should own, and when adding one more is a bad idea. You'll see the problems that hit first-time hackers over 36 hours, from workflows that eat your credits to agents overwriting each other's code, with fixes you can use in Claude Code that same night. You'll also get a look at what has recently improved in how Claude agents work together, and how to use it in your build.
>
> Don't forget to find them at their booth this weekend and come with your craziest ideas!

## Resources

- No starter pack or docs linked in the email, the guide or Slack.
- General Claude developer docs (not event-specific): https://docs.claude.com
- The Claude API changes from Oct 21, 2026 are in [[ch13-tech-stack]].
