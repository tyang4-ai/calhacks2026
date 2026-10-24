# Runbook · orchestrator

You are the main session. This is your procedure from kickoff to freeze. Read `docs/harness/status.md` first, find the step named in `NEXT`, and continue from there. After a compaction or a restart, the context hook puts the top of `status.md` in front of you. Re-read the file and this runbook before you act.

## Standing rules

- **You coordinate. Agents build.** Spawn an agent for anything that writes product code, tests or data. Do these yourself: deciding what runs next, every git command that changes something, installing packages outside S1, updating `status.md`, `decisions.md` and `lessons.md`, one-line fixes, and gate bookkeeping.
- **Delegation header.** Every spawn message starts with `ROLE`, `PLAN`, `TASK` and `SCOPE` lines (`docs/common/conventions.md`). Then the goal in two lines, the plan path to read, and "End with the REPORT block from CLAUDE.md."
- **Spawn in the background** and keep working. You get a notification when an agent finishes.
- **Concurrency:** at most 4 feature leads and backend-builders at once in total. A lead runs at most 3 builders. On a usage-limit warning or repeated rate-limit errors, drop to 2 at once and log it.
- **After every report:** read the REPORT block. Copy any `lessons:` line into `lessons.md` (one line, with the plan ID). Route `needs:` lines: a shared-code or contract change goes to the integrator, a question only Gordon can answer goes under Needs Gordon in `status.md` with the default in use, and anything else you handle yourself.
- **Evidence.** A gate passes only on its recorded checks. Print a short gate summary in the conversation every time, because `/goal` reads the conversation, not files.
- **Status.** Update the marker lines (`STAGE`, `NEXT`, `SHARED_LOCK`, `UPDATED`) and add a Log line at every step change. Commit `status.md` with each gate commit.
- **Phone.** If a `PushNotification` tool is available, send one line when a gate passes, a feature gets cut, or something lands under Needs Gordon.
- **Never wait on Gordon.** Use the documented default and keep going.
- **Check the clock** with `date` at the start of every step.

## Cutoffs (Pacific time)

| When | What changes |
|---|---|
| Sat 6:00 PM | If Phase 1 (G4) isn't green, stop starting new W1 work. Cut every unfinished P0 feature to what passes, then go straight to I1 |
| Sat 8:00 PM | Spawn the scribe for the first Devpost skeleton and README draft (R6) |
| Sun 4:30 AM | No new W2 feature or P2 upgrade starts. Running ones may finish |
| Sun 6:00 AM | Freeze (R7). Stop agents that are still running, restore their folders, run G6 |

## R0 · Planning (STAGE: PLANNING)

The build hasn't started. Plans and contracts are still being written with Gordon. Don't build anything. When Gordon types `/kickoff`, the kickoff skill runs G0 and moves the board to R1.

## R1 · S0 preflight (STAGE: S0)

1. The kickoff skill has run `node .claude/hooks/test-hooks.mjs` and `node scripts/preflight.mjs` and filled in Environment. If either failed, fix what you can, put the rest under Needs Gordon, and rerun.
2. Record G0 in the Gates table with `artifacts/preflight.md` as its evidence.
3. Set `STAGE: S1`, `NEXT: R2`.

## R2 · S1 scaffold (STAGE: S1)

1. Spawn the scaffolder:
   ```text
   ROLE: scaffolder
   PLAN: docs/plans/S1-scaffold.md
   TASK: all
   SCOPE: src/app/, src/core/, src/ui/, src/sources/, src/main.tsx, src/index.css, src/vite-env.d.ts, scripts/, tests/smoke/, tests/demo/, tests/offline/, public/, package.json, package-lock.json, vite.config.ts, vitest.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json, .oxlintrc.json, eslint.config.js, playwright.config.ts, index.html
   ```
2. When it reports `done`, run G1 with the gate skill.
3. On a pass: tag `g1-scaffold`, push, set `SHARED_LOCK: on`.
4. Start the dev server once, in the background: `npm run dev`. Confirm it answers: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` prints `200`. If it ever stops, restart it the same way and log it.
5. Set `STAGE: S2`, `NEXT: R3`.

## R3 · S2 mock data (STAGE: S2)

1. Spawn the data-smith with `PLAN: docs/plans/S2-mock-data.md`, `TASK: all`, `SCOPE: src/mock/, tests/data/`.
2. Run G2. On a pass: tag `g2-data`, push.
3. Set `STAGE: W1`, `NEXT: R4`.

## R4 · W1 P0 features (STAGE: W1)

1. Take the W1 list from `docs/plans/README.md`, in its order. Add a row per feature to the Features table with state `todo`.
2. Start up to 4 feature leads at once. Each gets:
   ```text
   ROLE: feature-lead
   PLAN: docs/plans/F-<slug>.md
   TASK: all
   SCOPE: src/features/<slug>/, tests/features/<slug>*
   ```
   Set its row to `running`.
3. When a lead reports `done`, run G3 for it: `npm run gate -- G3 <slug>`, plus a verifier for the boundary trace (gate skill).
   - Pass: commit `F-<slug>: passes G3`, tag `w1-<slug>`, push, set the row to `green`, start the next lead in the queue.
   - Fail: send the verifier's report to the lead with SendMessage and give it one more round. A second failure means a second round at most. Still red: run the cut skill for that feature and start the next one.
   - A root cause in shared code or a contract: spawn the integrator with the report (R8), then rerun the gate.
4. When every W1 row is `green` or `CUT`: run the wave gate `npm run gate -- G3`, tag `w1`, push.
5. Set `STAGE: I1`, `NEXT: R5`.

## R5 · I1 demo stage (STAGE: I1)

1. Spawn the integrator with `PLAN: docs/plans/I1-demo-stage.md`, `TASK: all`, and the integrator's area as `SCOPE` (shared code, `docs/common/`, `tests/demo/`, `tests/offline/`).
2. Run G4: `npm run test:demo` three times in a row on the production build, `npm run test:offline`, and a verifier reviewing each beat's screenshot against `demo-script.md`.
3. On a pass: tag `demo-ok-1`, push. This is the build Gordon demos if everything after it fails.
4. Optional phone preview: only if `npx wrangler whoami` shows a login, run `npm run build` and `npx wrangler pages deploy dist --project-name cindia-demo --branch preview`, then put the URL in Now. If the command is blocked or not logged in, skip it and note that under Needs Gordon.
5. Set `STAGE: W2+P2`, `NEXT: R6`.

## R6 · W2 features and P2 upgrades (STAGE: W2+P2)

Run both queues at once within the concurrency cap.

**W2 features:** same as R4 with the W2 list. Tags are `w2-<slug>`. After each green W2 feature, rerun G4 (`npm run test:demo` once plus `npm run test:offline`) so the demo stays green.

**P2 upgrades,** B01 to B10 in order, at most 2 running:
1. Spawn a backend-builder with `PLAN: docs/plans/B<NN>-<slug>.md`, `TASK: all`, `SCOPE: server/, src/sources/live/b<NN>-<slug>.ts, tests/server/`.
2. When it reports `done`, start or restart the API: `npm run server` in the background, and confirm `curl -s http://localhost:8000/api/health` answers.
3. Run G5: `npm run gate -- G5 b<NN>`. It runs the upgrade's tests, the contract test, one live call, then G4 in scripted and live mode.
4. Pass: commit `B<NN>: passes G5`, tag `demo-ok-b<NN>`, push. Fail: same two rounds as R4, then cut it. The scripted source stays in place, so the demo is unaffected.
5. An upgrade that needs a key that's missing: mark it `blocked`, note it under Needs Gordon, and move to the next one.

**Scribe at 8:00 PM Saturday:** spawn the scribe with `PLAN: docs/harness/status.md`, `TASK: devpost`, `SCOPE: README.md, docs/devpost/`. Commit its output, so Gordon can start the Devpost draft that night.

When both queues are done, or at 4:30 AM Sunday with nothing running: set `NEXT: R7`.

## R7 · Freeze (STAGE: FREEZE, then FROZEN)

1. Set `STAGE: FREEZE`. Start nothing new.
2. Give running agents 15 minutes to report. Stop any still running with TaskStop, then restore their folders from their last green tags with the cut skill.
3. Spawn the scribe with `PLAN: docs/harness/status.md`, `TASK: both`, `SCOPE: README.md, docs/devpost/` to update `README.md`, the what's-real list and the Devpost skeleton from the Cut and simulated section.
4. Run G6: `npm run gate -- G6` (G4 on the final build, the secrets scan, a clean `git status`, README and what's-real list match `status.md`).
5. On a pass: commit `G6: final build`, tag `final`, push, set `STAGE: FROZEN`, and print the G6 summary in the conversation. Include the commit hash, the tags, what's real, what's simulated, and what's cut.
6. On a fail: fix what you can within 20 minutes. Otherwise go back to the last tag that passed G4, push it, and say so in the summary.

## R8 · Changing shared code or a contract (any stage after G1)

1. Spawn the integrator with the report that found the problem, `PLAN: docs/plans/I1-demo-stage.md`, `TASK: change`, and the exact files in `SCOPE`.
2. When it reports, copy each contract change it lists into `decisions.md` with the time and the reason.
3. Run `npm run check` and `npm run test:smoke`. Commit `I1: <what changed>`.
4. Send each running lead one line with SendMessage naming the change and the file to re-read.

## When something goes wrong

| Problem | Do this |
|---|---|
| A hook blocks something legitimate | Read `artifacts/hooks/guard.log`. Fix the delegation header's `SCOPE`, or do the change yourself if it's in your area. Log it in `lessons.md` |
| An agent edits outside its paths anyway | Restore the file with git, cut that agent's work, log it. Fallback from the plan: add `isolation: worktree` to the feature-lead card, which needs a restart |
| The dev server is down | Restart `npm run dev` in the background and log it |
| Usage limit reached | The session waits and continues on its own. Afterwards, drop to 2 agents at once |
| You compacted or restarted | Re-read `status.md` and this runbook. Check which agents are still running before spawning new ones |
| A step is ambiguous | Pick the option that keeps the demo green, log it in `decisions.md`, and continue |
