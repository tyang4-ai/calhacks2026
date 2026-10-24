---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "SpacetimeDB"
captured: 2026-10-24
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-24
date-modified: 2026-10-24
---

# SpacetimeDB · Best Use of Spacetime (co-host)

Everything I found for SpacetimeDB's Cal Hacks 13.0 track, copied Oct 24, 2026 from the Hacker Guide, the pre-event email, Hive and Devpost. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **Prizes (Hacker Guide):** 1st $2,048, 2nd $1,024, 3rd $512. Devpost lists no SpacetimeDB prize (Oct 24).
- **Criteria:** SpacetimeDB as the core real-time backend, "meaningfully used, not just added on the side". Full row below.
- **Sponsor tier:** co-host (Anchor), one of the four presenting sponsors on Devpost.
- **Workshop:** "Move Fast and Don't Break Things Hosted By Spacetime", Sat 4:00 to 5:00 PM in the Theater (Hive).
- **Scrabblebot tournament:** Sun 12:00 to 1:00 AM in the Theatre (Hive). Build a bot that bids on Scrabble letters. Sign up at https://scrabblebot.spacetimedb.com. Prizes $1,024, $512 and $256 (pre-event email 3).
- **Booth:** hands-on help all weekend (pre-event email 3).

## Hacker Guide row (verbatim, unchanged on Oct 24)

> #### Spacetime
>
> **Criteria:** We’d love to see projects where Spacetime is the core real-time backend, especially anything with live shared state, multiplayer interaction, or instant sync between users/agents/systems. That makes it a great fit not just for games, but also for things like chat/community apps, collaborative tools, social experiences, AI agent coordination, live dashboards, trading / financial-style apps, auctions / marketplaces, shared simulations, multiplayer productivity tools, and stream/creator tools. SpacetimeDB’s docs position it around real-time subscriptions, transactional updates, and server-side logic running close to the data, which is why these kinds of apps fit well. We’d be excited by something like a real-time portfolio sim, prediction market, collaborative trading game, shared ops dashboard, multi-user planning tool, or AI systems coordinating in a persistent world state. The main thing we’d want is for SpacetimeDB to be meaningfully used, not just added on the side. A few cool examples already built with / around Spacetime: BitCraft Online / BitCraftPublicElegonPogly - a real-time collaborative stream overlay powered by Spacetime, official chat app tutorials/templates, Video chat app
>
> **Prize:** 1st place: $2,048, 2nd place: $1,024, 3rd place: $512

## From Pre-Event Details #3 (verbatim)

> *Spacetime (Co-Host)* — Spacetime is excited to be an Anchor sponsor of CalHacks 13.0. Spacetime combines your database, backend logic, and real-time sync in one platform so you can spend the weekend building your idea instead of stitching together infrastructure. Stop by our booth for hands-on help and compete in our "Best Use of Spacetime" track for $2,048 for first place, $1,024 for second, and $512 for third. We’re also hosting a separate Scrabblebot tournament, where you’ll create a bot that bids on Scrabble letters and competes against other bots, with 1st place $1,024 and 2nd place and $512 and 3rd place $256 going to the winner!

## What Cindia v2 does for this track

The brief's line: "The swarm and the process blocks running on live shared state."

- **Live shared state:** a SpacetimeDB module in TypeScript with the tables `swarm_run`, `swarm_step`, `process_status` and `screen`, and the reducers `start_run`, `add_step`, `finish_run`, `set_process`, `join_screen` and `leave_screen`.
- **The agent swarm writes to it:** every step of every agent run goes into `swarm_step`, so the swarm graph and the process blocks update live on every open screen.
- **More than one screen:** each browser joins a `screen` row, so two open browsers (a buyer and the studio, or a judge's laptop) count each other and watch the same runs.
- **Not on the side:** the process bar, the swarm view and the two-screen demo read their live state from it. Without it they fall back to scripted events with the Simulated badge.
- **Where it runs:** a local server (`spacetime start`, port 3000). Maincloud is optional.
- **In the repo:** upgrade B13 (`docs/plans/B13-live.md`).

## Docs and APIs we use

Offline copies, pinned to v2.13.0: the repo's `docs/tech/spacetimedb/`. Gotchas: `docs/v2/apis-and-accounts.md`.

- Install: https://spacetimedb.com/install
- Docs: https://spacetimedb.com/docs
- TypeScript quickstart: https://spacetimedb.com/docs/quickstarts/typescript
- HTTP API (reducer calls and SQL): https://spacetimedb.com/docs/http/database
- Source and docs on GitHub: https://github.com/clockworklabs/SpacetimeDB

## Things to know

- In 2.x, table and reducer names in SQL and HTTP calls are snake_case.
- Publish with `spacetime publish -s local cindia`, so the module doesn't go to Maincloud.
- There's no official Python SDK, so the server's bridge uses the HTTP API.
