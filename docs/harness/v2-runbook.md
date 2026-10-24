# v2 runbook · cloud orchestrator

You are the main session, running as a Claude Code cloud session on the GitHub repo. v1 is done and green (`demo-ok-4`). This runbook takes the build through v2: Indigenous and heritage makers, vibe search on our own embedding model, the agent swarm, the process blocks, desktop only. Read these first, in order: `docs/v2/brief.md` (what and why), `docs/v2/contracts.md` (every new name), `docs/v2/README.md` (the plan list and its order). The standing rules of `docs/harness/runbook.md` still apply (you coordinate and agents build, delegation headers, evidence, commits, never wait on Gordon) except where this file changes them.

## What changes from the v1 runbook

- **The machine is the cloud session.** The Windows desktop is only a demo and live-run machine now. Never run two orchestrators: V0 checks that the desktop handed off.
- **Concurrency:** at most 3 agents writing code at once (leads, backend-builders and integrators together), because the cloud VM is small. A lead runs at most 2 builders. A training run counts as one agent. Only one Playwright-heavy gate at a time.
- **Heartbeat:** a cloud session pauses when it's idle, and a session cron doesn't fire while it's paused. So the heartbeat is a `send_later` message to this session every 20 minutes, prompt `/heartbeat`, if that tool exists. Each heartbeat schedules the next one. If `send_later` isn't available, use CronCreate (`*/15 * * * *`, prompt `/heartbeat`). Never keep two.
- **Cutoffs:** no 4:30 AM rule. Start any item that can pass its gate before 6:00 AM. From 5:00 AM only finish what's running, fix and polish. The freeze is still at 6:00 AM Sunday (R7 of the v1 runbook, unchanged), because Gordon records the video and submits by 9:00 AM.
- **Tags:** v2 items tag as `docs/v2/contracts.md` section 10 says.
- **`main` stays demoable.** `demo-ok-4` is the v1 fallback. Every v2 commit passes its gate, and the Phase A mapping keeps the v1 story playing on the desktop shell until the tour lands.

## V0 · Hand-off and cloud preflight (STAGE: V2)

1. Run `date` (Pacific time) and `git pull --ff-only origin main`.
2. **Hand-off check.** The newest commits on `origin/main` must include the desktop's `handoff: desktop to cloud` commit, or Gordon must have said in this conversation that the desktop session is stopped. If neither, put it under Needs Gordon, then wait for the next heartbeat. Don't build until it's true.
3. Set `STAGE: V2`, `NEXT: V1`, `UPDATED`, and add a Log line in `status.md`. Add a "v2 Features" and a "v2 Upgrades" table from `docs/v2/README.md`.
4. **Toolchain.** Check that Node is 22.12 or later and Python 3.12 or later. Then:
   - `npm ci`, which needs `cdn.sheetjs.com`.
   - `python3 -m venv .venv` and `.venv/bin/python -m pip install -r server/requirements.txt`.
   - `npx playwright install chromium`, the repo's own Playwright version.
   - The SpacetimeDB CLI from `install.spacetimedb.com`, into the user's home, never a global system path.
   
   Log each install in `decisions.md`. A host that refuses means the cloud environment's network is still on Trusted. Put "set this session's cloud environment to Full network access" under Needs Gordon, then carry on with everything that doesn't need that host.
5. Run `node .claude/hooks/test-hooks.mjs`. A failure that comes from Linux paths gets fixed in the hooks (you own `.claude/`) and logged in `lessons.md`. Use `GUARDS: off` only as the last resort.
6. **Servers,** each once and in the background:
   - `npm run dev` (5173).
   - `npm run server` (8000).
   - `spacetime start` (3000), once the CLI is in.
   
   Confirm `curl -s http://localhost:8000/api/health` answers. It reports which keys are set as booleans. That's the only way to check keys. Never echo a variable.
7. Create the heartbeat (above).
8. **v1 keyed upgrades.** If health shows `anthropic` or `nessie` set, the four built-and-waiting upgrades (B02, B07 and B09 on Anthropic, B04 on Nessie) get their G5. Run them one at a time while no shared-code agent is running, before or right after G1b. They're checks, not builds.

## V1 · Shared code and data

1. Spawn the integrator for `I2-core` (`docs/plans/I2-core.md`, the SCOPE line its plan gives). It merges `docs/v2/contracts.md` into `docs/common/` and writes the types, reducers, validation, sources, server config and `export:mock`. When it reports, run `npm run check` and `npm run test:smoke`, commit `I2-core: v2 contracts and core`, push. Tell nothing else to start before this lands.
2. Then start in parallel, within the cap of 3:
   - the integrator for `I2-kit` task T1 (the frame components), then T2,
   - the data-smith for `S3-catalog`,
   - once I2-kit's T1 is in, the integrator for `I2-shell`.
   
   Two integrators may run at once only with SCOPE lines that don't overlap. The plans give them.
3. When `I2-shell` and `I2-kit` are done, run **G1b** with the gate skill. Tag `v2-shell`, push.
4. When `S3-catalog` is done, run **G2b**. Tag `v2-data`, push. Then spawn the integrator for `I2-art` (the piece illustrations).
5. `B11-embed` and `B13-live` may start as soon as `I2-core` is in. They live in `server/` and their own adapters. B11's training run needs `S3-catalog` and `npm run export:mock`.

## V2 · Features and upgrades

**Features,** after G1b and G2b, in this order, as v1's R4: `F-search`, `M-buyer`, `F-support`, `F-process`, `F-communities`, `M-approvals`, `F-seller-hub`, `F-watch`, `F-storefront`, `M-maker-statement`, `M-desktop`.
- Each gets a feature-lead with `PLAN: docs/plans/<plan>.md`, `TASK: all`, and the SCOPE line its plan gives. A migration plan may own more than one feature folder.
- G3 on each. Tags `v2-<slug>`.
- After each green feature, rerun `npm run test:demo` once and `npm run test:offline` (the Phase A demo, later the tour) when no other Playwright gate is running.

**Upgrades,** as v1's R6:
- `B11-embed` first.
- Then `B13-live` and `B12-search`.
- Then `B14-swarm`.
- Then `B15-watch`.

Each gets a backend-builder with the SCOPE its plan lists, then G5. Tags `demo-ok-b11` to `demo-ok-b15`.
- **B11's training run** happens inside the B11 task (`python server/b11_embed/train.py`). When it has produced `report.json`, spawn the data-smith for `S3-catalog` task T9, which copies the real report into `src/mock/model.ts`. Then rerun G2b's data check.
- **An upgrade whose service isn't reachable or whose key isn't set:** finish it against mocks, mark it `blocked` with the reason under Needs Gordon, and move on. The scripted source keeps the demo whole.

## V3 · The tour

When `F-search`, `M-buyer`, `F-support`, `F-process`, `M-approvals`, `F-seller-hub`, `F-watch` and `F-storefront` are green or cut:
1. Spawn the integrator for `I2-tour` together with the data-smith for its timeline task. The plan splits their SCOPEs.
2. Run **G4v2** with the gate skill. Tag `demo-ok-v2`, push.

## V4 · The design drops

Gordon's design session pushes `design/` to branch `design`.
1. On every heartbeat, run `git fetch origin design` and read `design/HANDOFF.md` on that branch for the drop number.
2. For a new drop, copy the folder onto `main` with `git checkout origin/design -- design/`, commit `design: drop N`, push.
3. Spawn the integrator for `I3-redesign` with that drop.
4. Rerun G4v2 and tag `demo-ok-v2-dN`.
5. If drop 2 lists layout changes in `design/changes.md`, give each affected feature's lead one polish round: G3, then a G4v2 rerun.

If the Figma connector is enabled in this session, you may also read Figma context yourself and save it under `design/` for the integrator. Agents other than you have no MCP tools.

## Scribe

- **At 8:00 PM,** spawn the scribe with `PLAN: docs/plans/D-sponsors.md`, `TASK: all`, `SCOPE: README.md, docs/devpost/, sponsors/`. It writes the README, the what's-real list, the Devpost skeleton and one folder per sponsor track.
- **At the freeze,** run it again (v1's R7).

## When Gordon comes back

When he writes, answer first with a short status:
- what's green,
- what's running,
- what's blocked and why,
- what he needs to do (keys, network, the Figma session, Devpost),
- the newest tag.

Then the details if he asks. Keep the pitch and Devpost work in his voice (the scribe drafts, he edits).

## When something goes wrong (added to the v1 table)

| Problem | Do this |
|---|---|
| A host refuses (`000` from curl) | The cloud environment's network blocks it. Needs Gordon: Full network access, or the host in a Custom allowlist (`docs/v2/contracts.md` section 1). Keep going with mocks |
| The VM runs out of memory during a build or a training run | Drop to 2 agents, rerun the step alone, and log it |
| `send_later` heartbeat stopped arriving | Create it again, check with the scheduled tasks list, keep exactly one |
| A design drop conflicts with a feature's layout | The design wins on look, the contracts win on names and test IDs. Log the choice in `decisions.md` |
