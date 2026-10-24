---
name: cut
description: Cuts a feature or upgrade that failed its gate after two fix rounds, or that the clock rules out. Puts its files back to the last green tag, records the cut and keeps the app green.
argument-hint: "[plan id]"
---

# Cut a feature or upgrade

The plan is `$ARGUMENTS`.

1. **Find the tag.** Look up its last green tag in `status.md`: `w1-<slug>` or `w2-<slug>` for a feature, `demo-ok-bNN` for an upgrade. If it never went green, there is no tag to restore, and its files were never committed.
2. **Stop its agents.** If its lead or builder is still running, stop it with TaskStop.
3. **Set the work aside.** Move its current files to `artifacts/cut/<plan id>-<HHMM>/`. For a feature that's `src/features/<slug>/` and `tests/features/<slug>*`. For an upgrade, the files in its plan's `SCOPE`. Moving keeps the work and leaves nothing for a restore to overwrite.
4. **Restore,** only when there is a green tag, with the command from `conventions.md`:
   - Feature: `git restore --source <tag> -- src/features/<slug>/ tests/features/<slug>*`
   - Upgrade: the same command with the files in its plan's `SCOPE`
   With no green tag, skip this step. The feature is simply gone from the app.
5. **Record** in `docs/harness/status.md`: mark its row `CUT`, add one line to Cut and simulated saying what's missing, for the README and Devpost, and add a Log line.
6. **Tell the others.** If a running lead depends on it, send that lead a message with SendMessage: what was cut and what to do instead.
7. **Check the app.** Run `npm run test:smoke`. After I1 (once `demo-ok-1` exists), also run `npm run build` and `npm run test:demo`. If the demo fails because a beat needs the cut feature, spawn the integrator to make the demo stage skip that beat.
8. **Commit.** `git add -A`, then `git commit -m "<plan id>: cut, restored to <tag>"`, or `"<plan id>: cut, never green"` when there was no tag. Then `git push origin main --follow-tags`.
