---
name: heartbeat
description: Keeps the build moving. Runs every 10 to 15 minutes from a session loop (/loop 10m /heartbeat). Starts the build once planning is pushed, continues the runbook while the build runs, and does nothing once it's frozen.
---

# Heartbeat

1. Read the top of `docs/harness/status.md`.
2. **`STAGE: PLANNING`:**
   - Run `git pull --ff-only origin main`.
   - If `docs/plans/README.md` contains the line `PLANNING: done`, do the kickoff now: follow `.claude/skills/kickoff/SKILL.md` steps 1 to 8. Skip its heartbeat step (this loop is the heartbeat) and its hand-over step. Then continue the runbook from R1 in this same turn.
   - If a kickoff step blocks, put the blocker under Needs Gordon in `status.md` with what to fix, send a push if a `PushNotification` tool is available, and stop.
   - Without that line, reply "Waiting for planning." and stop.
3. **`STAGE: FROZEN`:** reply "Frozen. Nothing to do." and stop.
4. **Any other stage:** check which agents are running and that the dev server answers on port 5173 (once S1 has passed). Then continue the runbook from `NEXT`. If agents are running and nothing needs you, reply with one line on what's running and stop.
