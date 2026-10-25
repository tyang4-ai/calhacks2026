---
name: cut
description: Cuts a feature or upgrade that failed its gate after two fix rounds, or that the clock rules out. Puts its files back to the last green tag, or that tag's SHA when the tag is missing, records the cut and keeps the build green.
argument-hint: "[plan id]"
---

# Cut a feature or upgrade

The plan is `$ARGUMENTS`.

1. **Find the restore point.** Look up the plan's last green tag in `status.md`: `w1-<slug>`, `w2-<slug>` or `v2-<slug>` for a feature or migration, `demo-ok-bNN` for an upgrade.
   - In v2 the tags stay local, and a rebuilt VM loses them. When `git rev-parse -q --verify <tag>` finds nothing, use that tag's SHA from the Tags table in `status.md`, and recreate the tag with `git tag -a <tag> <sha> -m "<tag>"`.
   - For a folder that R0 or I2-core's fallout step changed (the v1 features, `src/mock/`, the v1 upgrades), never restore from a point older than `v2-core`. An older tag would bring back v1's names or break the widened types. If the plan has no v2 tag of its own, its restore point is `v2-core`.
   - If it never went green, there is no restore point, and its files were never committed.
2. **Stop its agents.** If its lead or builder is still running, stop it with TaskStop.
3. **Set the work aside.** Move its current files to `artifacts/cut/<plan id>-<HHMM>/`. For a feature that's `src/features/<slug>/` and `tests/features/<slug>-*`, for every slug a migration plan owns. For an upgrade, the files in its plan's `SCOPE`. Moving keeps the work and leaves nothing for a restore to overwrite.
   - For `B13-live`, once its T7 is committed, leave `src/sources/live/b08-approvals.ts` and `src/sources/live/b08-approvals.test.ts` in place, because M-approvals' owner screen needs them. Copy them into that folder instead, then drop any uncommitted change to them with `git restore -- src/sources/live/b08-approvals.ts src/sources/live/b08-approvals.test.ts`.
4. **Restore,** only when there is a restore point, with the command from `conventions.md` and the tag or its SHA as the source:
   - Feature: `git restore --source <tag or sha> -- src/features/<slug>/ tests/features/<slug>-*`, once per slug
   - Upgrade: the same command with the files step 3 moved
   With no restore point, skip this step. The feature is simply gone from the site.
5. **Record** in `docs/harness/status.md`: mark its row `CUT`, add one line to Cut and simulated saying what's missing, for the README and Devpost, and add a Log line.
6. **Tell the others.** If a running lead depends on it, send that lead a message with SendMessage: what was cut and what to do instead. A cut `M-` plan also has to be set aside in the demo (`cutFeatures()` in `tests/demo/beats.ts` reads `M-` rows as their slugs).
7. **Check the site.** Run `npm run test:smoke`. Once a demo tag exists (`demo-ok-1` in v1, `v2-shell` in v2), also run `npm run build` and `npm run test:demo`. If the demo fails because a beat needs the cut feature, spawn the integrator to make the demo stage skip that beat.
8. **Commit.** Stage only the cut paths and `docs/harness/` (other agents may have work in progress), then `git commit -m "<plan id>: cut, restored to <tag> (<short sha>)"`, or `"<plan id>: cut, never green"` when there was no restore point. Then `git pull --rebase origin main` and `git push origin main`, the branch only.
