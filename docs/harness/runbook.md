# Runbook · orchestrator

You are the main session. This is your procedure from kickoff to freeze. Read `docs/harness/status.md` first, find the step named in `NEXT`, and continue from there. After a compaction or a restart, the context hook puts the top of `status.md` in front of you. Re-read the file and this runbook before you act.

## Standing rules

- **You coordinate. Agents build.** Spawn an agent for anything that writes product code, tests or data. Do these yourself: deciding what runs next, every git command that changes something, installing packages outside S1, updating `status.md`, `decisions.md` and `lessons.md`, one-line fixes, and gate bookkeeping.
- **Delegation header.** Every spawn message starts with `ROLE`, `PLAN`, `TASK` and `SCOPE` lines (`docs/common/conventions.md`). `SCOPE` stays on one line. Then the goal in two lines, the plan path to read, and "End with the REPORT block from CLAUDE.md."
- **Spawn in the background** and keep working. You get a notification when an agent finishes.
- **Concurrency:** at most 4 feature leads and backend-builders at once in total. A lead runs at most 3 builders. On a usage-limit warning or repeated rate-limit errors, drop to 2 at once and log it.
- **One production-build gate at a time.** G4, G5 and G6 share `dist/` and port 4173. Never run two of them at once.
- **Heartbeat.** A recurring session task runs `/heartbeat` every 10 to 15 minutes. Gordon starts it with `/loop 10m /heartbeat`, or the kickoff skill creates it. It's what restarts the build when `/goal` can't, because `/goal` skips its check while the dev server runs in the background, and a Remote Control session doesn't resume by itself after a usage limit. After a restart, run CronList and create it again if it's missing (CronCreate, `*/15 * * * *`, prompt `/heartbeat`). Never run two.
- **After every report:** read the REPORT block. Copy any `lessons:` line into `lessons.md` (one line, with the plan ID). Route `needs:` lines: a shared-code or contract change goes to the integrator, a question only Gordon can answer goes under Needs Gordon in `status.md` with the default in use, and anything else you handle yourself.
- **Evidence.** A gate passes only on its recorded checks. Print a short gate summary in the conversation every time, because `/goal` reads the conversation, not files.
- **Status.** Update the marker lines (`STAGE`, `NEXT`, `SHARED_LOCK`, `UPDATED`) before the commit that goes with them, so what's pushed is current. Add a Log line at every step change.
- **Commits.** Stage only the paths the passing item owns, plus `docs/harness/`. `git add -A` only when no other agent is running (the gate skill says which).
- **Phone.** If a `PushNotification` tool is available, send one line when a gate passes, a feature gets cut, or something lands under Needs Gordon.
- **Stay unblocked in auto mode.** Three classifier blocks in a row, or twenty in a session, pause auto mode until a person approves something. Don't deploy, don't force-push, don't delete files that existed before the session, and don't fetch from hosts the build doesn't need.
- **Never wait on Gordon.** Use the documented default and keep going.
- **Check the clock** with `date` at the start of every step.

## Cutoffs (Pacific time)

| When | What changes |
|---|---|
| Sat 6:00 PM | If Phase 1 (G4) isn't green, stop starting new W1 work. Cut every unfinished P0 feature to what passes, then go straight to I1 |
| Sat 8:00 PM | Spawn the scribe for the first README draft and Devpost skeleton (R6) |
| Sun 4:30 AM | No new W2 feature or P2 upgrade starts. Running ones may finish |
| Sun 6:00 AM | Freeze (R7). Stop agents that are still running, restore their folders, run G6 |

## R0 · Planning (STAGE: PLANNING)

The build hasn't started. Plans and contracts are still being written. Don't build anything. The build starts in one of two ways: Gordon types `/kickoff`, or the heartbeat finds `PLANNING: done` in `docs/plans/README.md` after a pull and runs the same kickoff steps. Either way G0 runs and the board moves to R1.

## R1 · S0 preflight (STAGE: S0)

1. The kickoff skill has run `node .claude/hooks/test-hooks.mjs` and `node scripts/preflight.mjs` and filled in Environment. If either failed, fix what you can, put the rest under Needs Gordon, and rerun.
2. Check the heartbeat exists (CronList). Create it if it doesn't.
3. Record G0 in the Gates table with `artifacts/preflight.md` as its evidence.
4. Set `STAGE: S1`, `NEXT: R2`.

## R2 · S1 scaffold (STAGE: S1)

1. Spawn the scaffolder:
   ```text
   ROLE: scaffolder
   PLAN: docs/plans/S1-scaffold.md
   TASK: all
   SCOPE: src/app/, src/core/, src/ui/, src/sources/, src/main.tsx, src/index.css, src/vite-env.d.ts, scripts/, tests/smoke/, tests/demo/, tests/offline/, public/, package.json, package-lock.json, vite.config.ts, vitest.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json, .oxlintrc.json, eslint.config.js, playwright.config.ts, index.html, server/main.py, server/config.py, server/__init__.py, server/routers/__init__.py, server/requirements.txt, tests/server/__init__.py, tests/server/conftest.py
   ```
2. When it reports `done`, run G1 with the gate skill. It sets `SHARED_LOCK: on`, commits, tags `g1-scaffold` and pushes.
3. Start the dev server once, in the background: `npm run dev`. Confirm it answers: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` prints `200`. Vite runs with `strictPort`, so a stale process on 5173 makes it fail loudly instead of moving ports. If it ever stops, restart it the same way and log it.
4. Set `STAGE: S2`, `NEXT: R3`.

## R3 · S2 mock data (STAGE: S2)

1. Spawn the data-smith with `PLAN: docs/plans/S2-mock-data.md`, `TASK: all`, `SCOPE: src/mock/, tests/data/`.
2. Run G2 with the gate skill (tag `g2-data`).
3. Set `STAGE: W1`, `NEXT: R4`.

## R4 · W1 P0 features (STAGE: W1)

1. Take the W1 list from `docs/plans/README.md`, in its order. Add a row per feature to the Features table with state `todo`.
2. Start up to 4 feature leads at once. Each gets:
   ```text
   ROLE: feature-lead
   PLAN: docs/plans/F-<slug>.md
   TASK: all
   SCOPE: src/features/<slug>/, tests/features/<slug>-*
   ```
   Set its row to `running`.
3. When a lead reports `done`, run G3 for it with the gate skill: `npm run gate -- G3 <slug>`, plus a verifier for the boundary trace.
   - Pass: the gate skill commits that feature's paths, tags `w1-<slug>` and pushes. Set the row to `green` and start the next lead in the queue.
   - Fail: send the verifier's report to the lead with SendMessage for a fix round, two rounds at most. Still red: run the cut skill for that feature and start the next one.
   - A root cause in shared code or a contract: spawn the integrator with the report (R8), then rerun the gate.
4. When every W1 row is `green` or `CUT` and no lead is running: run the wave gate `npm run gate -- G3` (whole-repo `npm run check`, `npm run test:smoke`, `npm run build`), tag `w1`, push.
5. Set `STAGE: I1`, `NEXT: R5`.

## R5 · I1 demo stage (STAGE: I1)

1. Spawn the integrator with `PLAN: docs/plans/I1-demo-stage.md`, `TASK: all`, and the integrator's area as `SCOPE` (shared code, `docs/common/`, `tests/demo/`, `tests/offline/`).
2. Run G4 with the gate skill: `npm run test:demo` three times in a row on the production build, `npm run test:offline`, and a verifier reviewing each beat's screenshot against `demo-script.md`.
3. On a pass the gate skill tags `demo-ok-1` and pushes. This is the build Gordon demos if everything after it fails. Never deploy it from the session. Gordon can put a phone preview online himself.
4. Set `STAGE: W2+P2`, `NEXT: R6`.

## R6 · W2 features and P2 upgrades (STAGE: W2+P2)

Run both queues at once within the concurrency cap.

**W2 features:** same as R4 with the W2 list. Tags are `w2-<slug>`. After each green W2 feature, rerun G4 (`npm run test:demo` once plus `npm run test:offline`) so the demo stays green, when no G5 is running.

**P2 upgrades,** B01 to B10 in order, at most 2 running:
1. Spawn a backend-builder with `PLAN: docs/plans/B<NN>-<slug>.md`, `TASK: all`, and the narrow `SCOPE` its plan lists: `server/routers/b<NN>_<slug>.py, src/sources/live/b<NN>-<slug>.ts, tests/server/test_b<NN>_<slug>.py`, plus any other file the plan names under its own `b<NN>` prefix. Never give it all of `server/`: two upgrades run at once, and the server skeleton belongs to the integrator.
2. When it reports `done`, make sure the API is running: `npm run server` in the background (uvicorn with `--reload`, so new routers load without a restart), and confirm `curl -s http://localhost:8000/api/health` answers.
3. Run G5 with the gate skill: `npm run gate -- G5 b<NN>`. It runs the upgrade's tests, the contract test, one live call, then G4 in scripted and live mode. Only one G5 at a time.
4. Pass: the gate skill commits the upgrade's paths, tags `demo-ok-b<NN>` and pushes. Fail: same two rounds as R4, then cut it. The scripted source stays in place, so the demo is unaffected.
5. An upgrade that needs a key that's missing: mark it `blocked`, note it under Needs Gordon, and move to the next one.

**Scribe at 8:00 PM Saturday:** spawn the scribe with `PLAN: docs/harness/status.md`, `TASK: both`, `SCOPE: README.md, docs/devpost/`. Commit its output, so Gordon can start the Devpost draft that night.

When both queues are done, or at 4:30 AM Sunday with nothing running: set `NEXT: R7`.

## R7 · Freeze (STAGE: FREEZE, then FROZEN)

1. Set `STAGE: FREEZE`. Start nothing new.
2. Give running agents 15 minutes to report. Stop any still running with TaskStop, then restore their folders from their last green tags with the cut skill.
3. Spawn the scribe with `PLAN: docs/harness/status.md`, `TASK: both`, `SCOPE: README.md, docs/devpost/` to update `README.md`, the what's-real list and the Devpost skeleton from the Cut and simulated section.
4. Run G6 with the gate skill: `npm run gate -- G6` (G4 on the final build, `node scripts/secrets-scan.mjs`, a clean `git status`, README and what's-real list match `status.md`).
5. On a pass the gate skill sets `STAGE: FROZEN`, commits `G6: final build`, tags `final` and pushes. Print the G6 summary in the conversation: the commit hash, the tags, what's real, what's simulated, and what's cut.
6. On a fail: fix what you can within 20 minutes. Otherwise roll back to the last tag that passed G4 without rewriting history: `git restore --source <tag> --staged --worktree -- .`, commit `G6: roll back to <tag>`, push normally, set `STAGE: FROZEN`, and say so in the summary.

## R8 · Changing shared code or a contract (any stage after G1)

1. Spawn the integrator with the report that found the problem. `PLAN` is the plan whose report raised it, `TASK` is that report's task, and `SCOPE` lists the exact files to change.
2. When it reports, copy each contract change it lists into `decisions.md` with the time and the reason.
3. Run `npm run check:scope` on the changed files and `npm run test:smoke`. Commit the changed paths with `I1: <what changed>`.
4. Send each running lead one line with SendMessage naming the change and the file to re-read.

## When something goes wrong

| Problem | Do this |
|---|---|
| A hook blocks something legitimate | Read `artifacts/hooks/guard.log`. Fix the delegation header's `SCOPE`, or do the change yourself if it's in your area. Log it in `lessons.md`. Last resort: `GUARDS: off` in `status.md`. Never use `disableAllHooks`, which also turns off `/goal` |
| An agent edits outside its paths anyway | Restore the file with git, cut that agent's work, log it. Fallback from the plan: add `isolation: worktree` to the feature-lead card, which needs a restart |
| The dev server is down | Restart `npm run dev` in the background and log it |
| Usage limit reached | A Remote Control session doesn't start the wait by itself. The heartbeat resumes the build after the reset. If Gordon is around, he can run `/rate-limit-options` and pick "Wait here, then continue automatically". Afterwards, drop to 2 agents at once |
| The session starts asking for approvals | Auto mode paused after repeated classifier blocks. Gordon approves one action from the phone, which turns auto mode back on. Log which action was blocked and stop doing it |
| A stage gate (G1, G2, G4, G6) stays red | It can't be cut. Follow the gate skill: a fresh agent for one more round, then Needs Gordon, then freeze on the last green tag if nothing else can go on |
| You compacted or restarted | Re-read `status.md` and this runbook. Check which agents are still running and that the heartbeat exists before spawning new ones |
| A step is ambiguous | Pick the option that keeps the demo green, log it in `decisions.md`, and continue |
