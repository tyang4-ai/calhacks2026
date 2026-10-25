# Cindia for sponsors

One folder per sponsor track, so a judge or a sponsor finds their track in one click and sees what to look at, how to run it and what is real. Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026 (D-sponsors task T6), from [`docs/harness/status.md`](../docs/harness/status.md).

Cindia is a platform for underrepresented makers, starting with Native American makers. It does the selling, the marketing and the books for them. The demo follows the fictional Diné Weaving and Silver Co-op on the Navajo Nation. Three more fictional Native American communities sit beside it in the catalog.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.

## The tracks, and whether each one is met

Prize details come from the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com), the hacker guide and each sponsor's notes in [`docs/reference/`](../docs/reference/). Gordon checked the Devpost prize names live at 11:45 PM on Oct 24. "[Anthropic] Claude for Public Benefit" and "[Spacetime] Best Use of Spacetime" are on the page, and "[Figma] Best Figma Workflow Hack" ($1,000) is Figma's one prize.

**Select a track on Devpost only when its line says Met.** The last column is the call, from the final what's-real list ([`docs/devpost/whats-real.md`](../docs/devpost/whats-real.md)).

| Track | Folder | The hard requirement | State at the freeze | Met or not |
|---|---|---|---|---|
| [Anthropic] Claude for Public Benefit | [`anthropic/`](anthropic/README.md) | A named community, a working product, and a plan to measure impact | The community is named (the fictional Diné co-op). The swarm is green (G5 7 of 7 on the tour). The impact plan is written. One item for Gordon: who he talked to | **Met.** Gordon adds the "lived it or heard it" line |
| Hyphenate, The Hyphenated Enterprise | [`hyphenate/`](hyphenate/README.md) | A demo video that opens with the catch, a live demo, one line on the seats, and proof of what is real | The catch, the approvals and the proof are green and play in the tour. The seats line is on the end card. The video is Gordon's | **Met on the build.** Gordon links the video, which opens with the catch |
| Visa, Reimagining Shopping | [`visa/`](visa/README.md) | The six questions answered by Sunday morning | Answered on the page. Search, the split with the gallery comparison, the token and the receipt are green | **Met** |
| Microsoft, Built for the Real World | [`microsoft/`](microsoft/README.md) | A production-minded agent that works end to end | The Excel close, the impact numbers and the swarm are green. The path-to-production section is written | **Met** |
| Capital One, Best Use of Nessie | [`capital-one/`](capital-one/README.md) | Nessie used meaningfully | B04 posts the sale and the payouts, and B16 checks the $340 catch against Nessie's records and posts the fund move. Both are built and live-tested. Neither passed a G5 | **Met in use, not gated.** Say "live-tested on Nessie's sandbox", never "gated" |
| Meta, Bringing People Closer Together with AI | [`meta/`](meta/README.md) | A working demo of AI that brings people closer | The maker's note on the receipt and the ask-the-maker beat (`d17-ask-maker`) are green. The maker's answer is scripted. Live, the swarm forwards the question, and her reply coming back live isn't built | **Met on the tour,** with the scripted answer said plainly |
| Elastic, Agent Builder on Serverless | [`elastic/`](elastic/README.md) | An Agent Builder agent on a Serverless project | The index, our own vectors and hybrid search are green (G5 7 of 7). The agent `cindia-finder` answered in 7.1 s in B12's live run. B14's G5 saw its step time out at 9.4 s, and the last committed eval file reads `agentBuilder: false`. One item for Gordon: the Kibana screenshot | **Met if `GET /api/b12/status` reads `agentBuilder: true`.** Check it before selecting |
| [Spacetime] Best Use of Spacetime | [`spacetimedb/`](spacetimedb/README.md) | SpacetimeDB as the core real-time backend | The module, the bridge, the polling feed, the data view and presence are green (G5 7 of 7). Moving the approval queue onto it wasn't built | **Met** |
| Apify, Best use of Apify | [`apify/`](apify/README.md) | Apify used in a meaningful way | The watch is built. The claims check and the Reporter are live. The live Apify call got a 403 at the freeze, in both trees, and B15's G5 failed. The watch plays scripted | **Not met at the freeze.** The live Apify call didn't pass. Gordon decides whether to select it |
| [Figma] Best Figma Workflow Hack | [`figma/`](figma/README.md) | A video of 3 minutes at most, a stage log, and Slides with the files embedded and shared with anyone who has the link | The stage log has five entries. The Slides deck is made, and the four Figma files are shared. The workflow video isn't linked | **Not yet.** It is met when Gordon adds the workflow video |
| [MLH] Best Domain Name from GoDaddy Registry | [`mlh-godaddy/`](mlh-godaddy/README.md) | A domain registered through GoDaddy Registry | The domain is cindia.design (a GoDaddy Registry domain) and the public site is live at https://cindia.design | **Met** (Gordon's registration, Oct 25) |

Two Cal Hacks prizes have no folder: Cal Hacks Best Solo Hack and Cal Hacks Best People-First Social Impact Hack. Gordon wants both selected on Devpost. Cindia is a solo build, and its community is Native American makers (the fictional Diné Weaving and Silver Co-op leads the demo).

## What each page holds

Every page has the same parts, in this order:
1. The track's name.
2. What its judges look for, with a source.
3. What Cindia does for this track.
4. Where to look, as links to the exact files and plans.
5. How to run that part.
6. The moment in the tour, with the beat ID and time. The beats are in [`docs/common/demo-script.md`](../docs/common/demo-script.md).
7. What is live and what is simulated, from `status.md`.

Some pages add parts: the Anthropic page has the "Where it could go wrong" table and the impact plan, and the Microsoft page has the path from prototype to production.

## Open items for Gordon

These are the markers in the pages. Search the repo for the word GORDON followed by a colon to find them all.
- Who he talked to about this problem ([`anthropic/`](anthropic/README.md)).
- A Kibana screenshot of the Agent Builder agent, saved as `sponsors/elastic/agent-builder.png` ([`elastic/`](elastic/README.md)).
- Whether the Figma Slides deck opens without signing in, and the workflow video link ([`figma/`](figma/README.md)).
- The demo video link ([`docs/devpost/devpost.md`](../docs/devpost/devpost.md)).
- Whether to select the Apify track, given the 403 ([`apify/`](apify/README.md)).
- His own sections of the Devpost skeleton: inspiration, how we built it, challenges, accomplishments and what we learned.

The public site link and the domain are no longer open: the site is live at https://cindia.design (the tour is at https://cindia.design/demo), and the tagline is "Describe the vibe. Gift the piece. Pay the person." A new upload from the final build follows the freeze.
