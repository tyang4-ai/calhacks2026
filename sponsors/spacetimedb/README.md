# SpacetimeDB · Best Use of Spacetime

Written at 8:00 PM PT on Saturday, Oct 24, 2026. Every maker, community and story named here is fictional. **Everything for this track is planned at 8:00 PM.** Nothing in `server/b13_spacetime/` exists yet, so this page links the plan and not the code.

## What its judges look for

The prize ($2,048, $1,024 and $512) is in the hacker guide and is not on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com). The notes are copied in [`docs/reference/sponsors/ch13-sponsor-spacetimedb.md`](../../docs/reference/sponsors/ch13-sponsor-spacetimedb.md). SpacetimeDB should be the core real-time backend. They name live shared state, instant sync between users, agents and systems, live dashboards, marketplaces and AI agent coordination. In their words: "meaningfully used, not just added on the side."

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers, and SpacetimeDB is its one database. It is the system of record. Elastic is the search index built from it ([`B13-live`](../../docs/plans/B13-live.md), pillar three in [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.4).

**What the database holds.**
- `catalog`: the 54 fictional pieces, seeded from the mock data, plus each published listing.
- `listings`, `orders` and `approvals`.
- `runs` and `steps`: every run of the agent swarm and every step in it.
- `processes`: the status of each of the 11 process blocks.
- `screens`: which screens are open and watching.
- `changes`: one row per change, which the feed reads.

**How it is used, not added on the side.**
- Every step of every swarm run is written to the database as it happens. A browser polls `GET /api/b13/changes?after=<seq>` every 500 ms and gets the new steps, so the swarm view lights up on every open screen, not only on the one that asked.
- Each screen joins as a row. The process bar shows "N screens watching", so two open browsers (a buyer and the Sell side, or a judge's laptop beside the demo laptop) count each other.
- A new Data view in the process bar lists the tables, their row counts and their newest rows. In live mode it comes from the database. In scripted mode it comes from the mock data and says so.
- Live steps are shared with every open screen, and the screen says so ("Live steps are shared with every open screen in this demo.").

**Care.** The tables are private. Only the publisher's identity can write through the server's bridge, so the browser never touches the database. The server runs it on this machine only (`127.0.0.1:3000`). Maincloud stays off. The server falls back to scripted events if the database is down.

**Short polling, not streaming.** There is no official Python SDK, so the server's bridge uses the HTTP API, and the browser polls. The plan picks polling over server-sent events ([`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.9).

## Where to look

All of these are **planned**.
- [`docs/plans/B13-live.md`](../../docs/plans/B13-live.md): `server/b13_spacetime/` (the module, the bridge, the feed and the polling endpoint), and `src/sources/live/b13-live.ts`, the adapter.
- [`docs/plans/F-process.md`](../../docs/plans/F-process.md): `src/features/process/`, the process bar, the Data view and presence.
- [`docs/v2/contracts.md`](../../docs/v2/contracts.md) section 5 ("B13 · the database") has the endpoints and the tables.

## How to run that part

Planned. This is the design.
1. Start the local server: `spacetime start --listen-addr 127.0.0.1:3000`. Never a bare `spacetime start`, so nothing beyond this machine can reach it.
2. Publish the module to the local server: `spacetime publish -s local cindia`.
3. Write the publisher's token to `.env` without printing it: `python server/b13_spacetime/save_token.py`.
4. `npm run server`, then check that `GET /api/b13/status` says the database is up and seeded.
5. Open two browsers on the demo, switch on Live in both, and watch the process bar count two screens.

On a Windows demo machine, `node scripts/laptop-setup.mjs` (planned, [`D-deploy`](../../docs/plans/D-deploy.md)) does steps 1 to 4. Before judging, `spacetime call -s local cindia clear_runs` clears earlier runs so the swarm view starts empty.

## The moment in the tour

Planned (`I2-tour`). Times are from [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.2.
- `d15-listing`, 120 to 130 s: a maker's notes become a draft listing. The Data view opens at 127 s and shows the tables and the new row. This one tour event, `data.synced`, is keyed to the database. In scripted mode it is built from the mock data, and in live mode the adapter returns nothing for it, so the scripted one plays.
- The live view with two screens is shown in "try it yourself" after the tour, because the tour is always scripted.

## What's live and what's simulated

- The local SpacetimeDB server runs on the build machine. `/api/health` showed `services.spacetime` true at 7:30 PM. No module is published, and nothing has passed a gate.
- **Planned:** the module, the bridge, the polling endpoint, the Data view and presence.
- **Not planned as part of the core build:** moving the approval queue onto SpacetimeDB, so the manager's seal crosses two screens through it. This is on the "Backend if time" list and has not been started ([`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md)). Approvals (B08) stay in the server's memory until then.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
