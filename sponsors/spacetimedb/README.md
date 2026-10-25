# SpacetimeDB · Best Use of Spacetime

Refreshed at the freeze, 5:00 AM PT on Sunday, Oct 25, 2026, from [`docs/harness/status.md`](../../docs/harness/status.md). Every maker, community and story named here is fictional.

**Met or not:** met. B13 is green: G5 7 of 7 on the tour in the main tree (`demo-ok-b13`), with a live round trip through the database. Moving the approval queue onto SpacetimeDB wasn't built.

## What its judges look for

The prize is "[Spacetime] Best Use of Spacetime" ($2,048, $1,024 and $512 in the hacker guide), and it is on the [Cal Hacks 13.0 Devpost page](https://cal-hacks-13-0.devpost.com) (checked live by Gordon at 11:45 PM on Oct 24). The notes are copied in [`docs/reference/sponsors/ch13-sponsor-spacetimedb.md`](../../docs/reference/sponsors/ch13-sponsor-spacetimedb.md). SpacetimeDB should be the core real-time backend. They name live shared state, instant sync between users, agents and systems, live dashboards, marketplaces and AI agent coordination. In their words: "meaningfully used, not just added on the side."

## What Cindia does for this track

Cindia is a platform for underrepresented makers, starting with Native American makers, and SpacetimeDB is its one database. It is the system of record. Elastic is the search index built from it ([`B13-live`](../../docs/plans/B13-live.md), pillar three in [`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.4).

**What the database holds.** The module has ten private tables ([`server/b13_spacetime/module/src/index.ts`](../../server/b13_spacetime/module/src/index.ts)). The data view shows eight of them:
- `catalog`: the 54 fictional pieces, seeded from the mock data, plus each published listing.
- `listings`, `orders` and `approvals`. The live seed holds 54 catalog rows, 30 orders and 5 approvals (`status.md`, B13 row).
- `runs` and `steps`: every run of the agent swarm and every step in it.
- `processes`: the status of each of the 11 process blocks.
- `screens`: which screens are open and watching.
- The other two are `changes`, one row per change, which the feed reads, and `config`, which the module's `init` writes once with the publisher's identity and the publish time.

**How it is used, not added on the side.**
- Every step of every swarm run is written to the database as it happens. A browser polls `GET /api/b13/changes?after=<seq>` every 500 ms and gets the new steps, so the swarm view lights up on every open screen, not only on the one that asked.
- Each screen joins as a row. The process bar shows "N screens watching", so two open browsers (a buyer and the Sell side, or a judge's laptop beside the demo laptop) count each other.
- The Data view in the process bar lists the tables, their row counts and their newest rows. In live mode it comes from the database. In scripted mode it comes from the mock data and says so.
- Live steps are shared with every open screen, and the screen says so ("Live steps are shared with every open screen in this demo.").
- B14's swarm and B15's watch write their steps and process status through B13's bridge ([`test_the_steps_reach_the_real_b13_bridge_queue`](../../tests/server/test_b14_swarm.py) and `test_bridge_gets_the_watch_process_and_the_steps` in [`test_b15_watch.py`](../../tests/server/test_b15_watch.py)).

**Care.** The tables are private. Only the publisher's identity can write through the server's bridge, so the browser never touches the database. The server runs it on this machine only (`127.0.0.1:3000`). Maincloud stays off. The server falls back to scripted events if the database is down.

**Short polling, not streaming.** There is no official Python SDK, so the server's bridge uses the HTTP API, and the browser polls. The plan picks polling over server-sent events ([`docs/v2/fix-plan.md`](../../docs/v2/fix-plan.md) section 1.9).

## Where to look

- [`server/b13_spacetime/`](../../server/b13_spacetime/): the module (`module/`), the bridge (`bridge.py`), the feed (`feed.py`), the seed (`seed.py`) and the token saver (`save_token.py`). The README there has the commands.
- [`server/routers/b13_live.py`](../../server/routers/b13_live.py): `GET /api/b13/changes`, `GET /api/b13/status`, `POST /api/b13/seed` and `POST /api/b13/record`.
- [`src/sources/live/b13-live.ts`](../../src/sources/live/b13-live.ts): the adapter.
- [`src/features/process/`](../../src/features/process/): the process bar, the Data view and presence ([`docs/plans/F-process.md`](../../docs/plans/F-process.md)).
- [`tests/server/test_b13_live.py`](../../tests/server/test_b13_live.py) (including the live round trip) and [`tests/features/process-live-data.spec.ts`](../../tests/features/process-live-data.spec.ts).
- [`docs/plans/B13-live.md`](../../docs/plans/B13-live.md) has the plan, and [`docs/v2/contracts.md`](../../docs/v2/contracts.md) section 5 ("B13 · the database") has the endpoints and the tables.

## How to run that part

1. Start the local server: `spacetime start --listen-addr 127.0.0.1:3000`. Never a bare `spacetime start`, so nothing beyond this machine can reach it.
2. Publish the module to the local server: `spacetime publish -s local cindia`.
3. Write the publisher's token to `.env` without printing it: `python server/b13_spacetime/save_token.py`.
4. `npm run server`, then check that `GET /api/b13/status` says the database is up and seeded.
5. Open two browsers on the demo, switch on Live in both, and watch the process bar count two screens.

On a Windows demo machine, `node scripts/laptop-setup.mjs` ([`D-deploy`](../../docs/plans/D-deploy.md)) does steps 1 to 4. It passed its dry run, and per `status.md` it hasn't been run on the demo laptop yet. Before judging, `spacetime call -s local cindia clear_runs` clears earlier runs so the swarm view starts empty.

## The moment in the tour

Beat IDs and times are from [`docs/common/demo-script.md`](../../docs/common/demo-script.md).
- `d15-listing`, 120 to 130 s: a maker's notes become a draft listing. The Data view opens at 127 s and shows the tables and the new row. This one tour event, `data.synced`, is keyed to the database. In scripted mode it is built from the mock data, and in live mode the adapter returns nothing for it, so the scripted one plays.
- The live view with two screens is shown in "try it yourself" after the tour, because the tour is always scripted.

## What's live and what's simulated

- **Live, gated on the tour:** B13 (G5 7 of 7, `demo-ok-b13`, test:server 874, B13 pytest 60 plus 2 live, the `process-live-data` spec, a live tour run of 220.0 s and an offline run). The live check read `spacetime` true and the round trip passed.
- **Not built:** moving the approval queue onto SpacetimeDB, so the manager's seal crosses two screens through it (B13's T8, on the "Backend if time" list in [`docs/devpost/whats-real.md`](../../docs/devpost/whats-real.md)). Approvals (B08) stay in the server's memory.
- **Simulated by design:** the tour. It plays scripted events in both modes. Live data reaches the Data view and the swarm view when a person makes a request after it.

> Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.
