---
name: gate
description: Runs one gate (G1 to G6) the same way every time. Checks, a verifier review, evidence, the status update, then commit, tag and push on a pass, or the failure policy on a fail. The orchestrator uses it after every stage, feature and upgrade.
argument-hint: "[G1-G6] [slug for G3 and G5]"
---

# Run a gate

The gate is `$ARGUMENTS`. Its checklist is under Gates in `docs/common/definition-of-done.md`. Read that section first.

1. **Checks.** If `package.json` has a `gate` script, run `npm run gate -- $ARGUMENTS`. It writes `artifacts/gates/<gate>-<HHMM>.md`. Otherwise run each command in the gate's checklist yourself and write that file, one evidence line per check.
2. **Review.** Spawn one verifier (subagent type `verifier`) whose prompt starts with:
   ```text
   ROLE: verifier
   PLAN: docs/common/definition-of-done.md
   TASK: <gate>
   ```
   For G3, use the feature's plan as `PLAN`, and for G5 the upgrade's plan. For G4 and G6, the verifier also reviews the screenshots in `artifacts/demo/` against `demo-script.md`.
3. **Decide.** The gate passes only when every check passed and the verifier's verdict is PASS.
4. **Record** in `docs/harness/status.md`: the gate row (result, time, report path, tag), the feature or upgrade row when there is one, and a Log line. Refresh `UPDATED`.
5. **On a pass:**
   - After G1, set `SHARED_LOCK: on`. After G6, set `STAGE: FROZEN`. Set `NEXT` to the next runbook step.
   - `git add -A`
   - `git commit -m "<gate>: <what passed>"`
   - `git tag -a <tag> -m "<gate> passed"`, with the tag the checklist names (`g1-scaffold`, `g2-data`, `w1-<slug>`, `w2-<slug>`, `w1`, `demo-ok-1`, `demo-ok-bNN`, `final`)
   - `git push origin main --follow-tags`
6. **On a fail,** follow the failure policy:
   1. Send the verifier's report to the agent that built the piece. It gets two fix rounds, diagnosing before it changes code. Then run the gate again.
   2. Still failing after two rounds: run the cut skill for that plan, and the wave goes on.
   3. Root cause in shared code or a contract: spawn the integrator with the `needs:` lines, log the change in `docs/harness/decisions.md`, and message the leads still running.
   4. Nothing red gets committed, and no test gets weakened to pass a gate.
7. **Summary.** Print this in the conversation every time, pass or fail, because `/goal` reads the conversation, not files:

```text
GATE <gate> <slug if any>: PASS | FAIL
checks: <passed>/<total>
verifier: PASS | FAIL, <report path>
report: artifacts/gates/<file>
tag: <tag, or none>
next: <runbook step>
```
