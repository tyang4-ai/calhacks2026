---
name: kickoff
description: Starts the build. Gordon runs it once with /kickoff after planning is finished. Checks the plans, contracts, hooks and machine, records the results in status.md and prints the /goal line.
disable-model-invocation: true
---

# Kickoff

Run these steps in order. At the first blocker, stop, say exactly what to fix, and change nothing else.

1. **Stage.** Read the top of `docs/harness/status.md`. It must say `STAGE: PLANNING`. Anything else means the build already started, so stop and say so.
2. **Plans.** Read `docs/plans/README.md`. Every plan file it lists must exist in `docs/plans/`. Name any that are missing.
3. **Contracts.** These must exist in `docs/common/`: `conventions.md`, `glossary.md`, `data-model.md`, `events.md`, `ui-contract.md`, `design-system.md`, `demo-script.md`, `api-contract.md`, `definition-of-done.md`. Name any that are missing.
4. **Hooks.** Run `node .claude/hooks/test-hooks.mjs`. Every case must pass.
5. **Machine.** Run `node scripts/preflight.mjs`. It writes `artifacts/preflight.md` and exits 1 on a blocker. A missing API key is not a blocker. Add it to the Needs Gordon table in `status.md` with the default "the upgrades that need this key stay scripted".
6. **Record.** Copy the preflight results table into the Environment section of `status.md`.
7. **Markers.** Set `STAGE: S0`, `NEXT: R1` and `UPDATED: <now, PT>`. Add a Log line: the time, "kickoff passed", and `artifacts/preflight.md`.
8. **Commit.** `git add -A`, then `git commit -m "G0: kickoff checks pass"`, then `git push origin main`.
9. **Heartbeat.** Create a recurring session task with CronCreate, cron `*/15 * * * *`, with this prompt:
   ```text
   Heartbeat. Read the top of docs/harness/status.md. If STAGE is PLANNING or FROZEN, reply "idle" and stop. Otherwise check which agents are running, then continue the runbook from NEXT.
   ```
   It keeps the build moving when `/goal` can't: `/goal` skips its check while the dev server runs in the background, and after a usage limit a Remote Control session doesn't resume on its own. If CronCreate isn't available, tell Gordon to type `/loop 15m` followed by the same prompt.
10. **Hand over.** Print this line exactly, so Gordon can paste it:

```text
/goal Run the build in docs/harness/runbook.md until docs/harness/status.md reads STAGE: FROZEN and the G6 summary is printed in this conversation, or until it is past 6:00 AM PT Sunday and the freeze steps are done.
```

Then stop. The build starts when Gordon sends the goal.

## When something blocks

Say which step failed, quote the failing line (from the hook test output or `artifacts/preflight.md`), and give the fix in one sentence. Never print the contents of `.env`. For a missing tool, name the install command Gordon should run himself.
