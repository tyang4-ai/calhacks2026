---
name: heartbeat
description: Keeps the build moving. Runs every 10 to 15 minutes from a session loop in v1 (/loop 10m /heartbeat), and from a send_later message every 20 minutes in the v2 cloud build. Starts the build once planning is pushed, restarts the servers, continues the runbook while the build runs, and does nothing once it's frozen.
---

# Heartbeat

1. Read the top of `docs/harness/status.md`.
2. **`STAGE: PLANNING`:**
   - Run `git pull --ff-only origin main`.
   - If `docs/plans/README.md` contains the line `PLANNING: done`, do the kickoff now: follow `.claude/skills/kickoff/SKILL.md` steps 1 to 8. Skip its heartbeat step (this loop is the heartbeat) and its hand-over step. Then continue the runbook from R1 in this same turn.
   - If a kickoff step blocks, put the blocker under Needs Gordon in `status.md` with what to fix, send a push if a `PushNotification` tool is available, and stop.
   - Without that line, reply "Waiting for planning." and stop.
3. **`STAGE: FROZEN`:** reply "Frozen. Nothing to do." and stop.
4. **In the v2 cloud build,** schedule the next heartbeat first: one `send_later` message to this session in 20 minutes, prompt `/heartbeat`, and never two. If V0 step 0's network check hasn't passed yet, rerun it (`docs/harness/v2-runbook.md`) and stop here while a host still prints `000`.
5. **Servers.** Check each one that the runbook has started so far:
   - the dev server: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` prints `200`,
   - the API: `curl -s http://localhost:8000/api/health` answers,
   - SpacetimeDB, in v2: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/v1/ping` prints `200`.
   
   Restart whatever is down from the main session, never from a subagent, with `run_in_background` and the longest timeout (7,200,000 ms): `npm run dev`, `npm run server` (with `PUBLIC_SITE_URL=<url>` set for that process once the Public site line in `status.md` has a URL), or `spacetime start --listen-addr 127.0.0.1:3000`. A background command stops at its time limit and a paused or rebuilt VM drops it, so this is expected. Add a Log line for each restart. After restarting SpacetimeDB on a rebuilt VM, republish the B13 module as the runbook says.
6. **Mock export, in v2.** If a commit that changed `src/mock/` is newer than `artifacts/mock/mock.json` (compare `git log -1 --format=%ct -- src/mock/` with the file's modified time), or the file is missing, run `npm run export:mock` once no agent is writing `src/mock/`. The Python side (B11 to B15) reads that file.
7. **Any other stage:** check which agents are running, then continue the runbook from `NEXT`. If agents are running and nothing needs you, reply with one line on what's running and stop.
