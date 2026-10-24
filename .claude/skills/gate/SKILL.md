---
name: gate
description: Runs one gate (G1 to G6, and v2's G1b, G2b and G4v2) the same way every time. Checks, a verifier review, evidence, the status update, then commit, push and a local tag recorded in status.md on a pass, or the failure policy on a fail. The orchestrator uses it after every stage, feature and upgrade.
argument-hint: "[G1-G6, G1b, G2b or G4v2] [slug, or several slugs for a migration plan's G3]"
---

# Run a gate

The gate is `$ARGUMENTS`. Its checklist is under Gates in `docs/common/definition-of-done.md` (v2's gates are in `docs/v2/contracts.md` section 10 until `I2-core` merges them). Read that section first.

1. **When.** One Playwright gate at a time: G1b, G3, G4, G4v2, G5 and G6 never overlap, because they share `dist/`, port 4173 or the dev server. A gate sees every agent's half-written files, so:
   - G1b and G2b run at a moment no data-smith or integrator is mid-edit (the v2 runbook, V1 steps 5 and 7),
   - G4v2 runs with no other agent active at all.
2. **Checks.** If `package.json` has a `gate` script, run `npm run gate -- $ARGUMENTS`. It writes `artifacts/gates/<gate>-<HHMM>.md`. Otherwise run each command in the gate's checklist yourself and write that file, one evidence line per check.
   - A migration plan's G3 takes every slug it owns: `npm run gate -- G3 money-map reconcile scenario close impact proof dashboard ask-cindy audit` for `M-desktop`. If the script still takes one slug, run it once per slug and write one report that holds them all.
   - G2b's checks are `npm run check:data` and `npm run check:scope -- src/mock/ tests/data/ src/sources/`, plus a check that `public/images/` holds a file for each of the 54 pieces.
   - G1b, G4v2, G5 and G6 time the tour test alone: `endedAtWallMs` in `artifacts/demo/report.json` against the timeline's `durationMs` plus the load allowance `scripts/gate.mjs` sets. Never the whole Playwright run.
   - G5 for a v2 upgrade (B11 to B16) passes when `npm run test:server` passes, the upgrade's live feature spec answers a person's own request end to end with every event valid, and the scripted tour still passes with that source in live mode, with the tour's keyed events for that source listed in `ALLOWED_EMPTY_FALLBACKS` (`docs/v2/fix-plan.md` section 1.4). v1 upgrades keep v1's G5 on the Phase A demo.
3. **Review.** Spawn one verifier (subagent type `verifier`) whose prompt starts with:
   ```text
   ROLE: verifier
   PLAN: docs/common/definition-of-done.md
   TASK: <gate>
   ```
   For G3, use the feature's or migration's plan as `PLAN`, for G5 the upgrade's plan, and for R0 and D-deploy their own plans. For G4, G4v2 and G6, the verifier also reviews the screenshots in `artifacts/demo/` against `demo-script.md` (the tour table in `docs/v2/fix-plan.md` section 1.2 until `I2-tour` replaces it).
4. **Decide.** The gate passes only when every check passed and the verifier's verdict is PASS.
5. **Record** in `docs/harness/status.md`: the gate row (result, time, report path, tag), the feature or upgrade row when there is one, and a Log line. Refresh `UPDATED`.
6. **On a pass:**
   - After G1, set `SHARED_LOCK: on`. After G6, set `STAGE: FROZEN`. Set `NEXT` to the next runbook step.
   - Stage only what this gate covers. Run `git status --short` first and leave other agents' files unstaged.
     - R0: the paths in the four SCOPE lines of `docs/plans/R0-reskin.md`, and `docs/harness/`
     - G1b: the SCOPE paths of `docs/plans/I2-shell.md` and `docs/plans/I2-kit.md`, and `docs/harness/`
     - G2b: `src/mock/ tests/data/ docs/harness/` (the placeholder images went in earlier, with I2-art's T0)
     - G3: for each slug, `src/features/<slug>/ tests/features/<slug>-*`, plus any other path on the plan's SCOPE line (such as `tests/features/sell-views-lib.ts`), and `docs/harness/`
     - G4v2 after `I2-tour`: the paths on both of I2-tour's SCOPE lines (the integrator's and the data-smith's), and `docs/harness/`. After a design drop: I3-redesign's SCOPE paths and `docs/harness/`
     - G5: the upgrade's `SCOPE` paths and `docs/harness/`
     - D-deploy: its SCOPE paths and `docs/harness/`
     - G1, G2, G4 and G6, when no other agent is running: `git add -A`
   - `git commit -m "<gate>: <what passed>"`.
   - `git pull --rebase origin main`, then `git push origin main`. Push the branch only. In the cloud session the GitHub proxy refuses tag pushes, so never `--follow-tags` and never a tag name.
   - Then tag the pushed commit locally: `git tag -a <tag> -m "<gate> passed"`, with the tag the checklist names: v1's `g1-scaffold`, `g2-data`, `w1-<slug>`, `w2-<slug>`, `w1`, `demo-ok-1`, `demo-ok-bNN` and `final`, and v2's `v2-reskin`, `v2-core`, `v2-shell`, `v2-data`, `v2-<slug>` (an `M-` plan's slug is its ID without `M-`), `v2-deploy`, `demo-ok-b11` to `demo-ok-b16`, `demo-ok-v2` and `demo-ok-v2-dN`.
   - Add a row to the Tags table in `status.md`: `| <tag> | <full SHA from git rev-parse <tag>^{commit}> | <gate> | <time> |`. Commit it alone (`git commit -m "status: tag <tag>" docs/harness/status.md`), pull with rebase and push the branch. A rebuilt VM loses local tags, and this table is how they come back. Gordon pushes them from Windows at the freeze.
7. **On a fail,** follow the failure policy:
   1. Send the verifier's report to the agent that built the piece. It gets two fix rounds, diagnosing before it changes code. Then run the gate again.
   2. Still failing after two rounds: run the cut skill for that plan, and the wave goes on.
   3. Stage gates (G1, G2, G4, G6, and v2's R0, G1b, G2b and G4v2) can't be cut. After two rounds, spawn a fresh agent of the same role with the verifier's report for one more round. Still red: add it under Needs Gordon, send a push if you can, and keep going on anything that doesn't depend on it. If nothing can go on, run the freeze (runbook R7) on the last green tag, by its SHA from the Tags table.
   4. Root cause in shared code or a contract: spawn the integrator with the `needs:` lines, log the change in `docs/harness/decisions.md`, and message the leads still running.
   5. Nothing red gets committed, and no test gets weakened to pass a gate.
8. **Summary.** Print this in the conversation every time, pass or fail, because `/goal` reads the conversation, not files:

```text
GATE <gate> <slugs if any>: PASS | FAIL
checks: <passed>/<total>
verifier: PASS | FAIL, <report path>
report: artifacts/gates/<file>
tag: <tag> at <short SHA>, or none
next: <runbook step>
```
