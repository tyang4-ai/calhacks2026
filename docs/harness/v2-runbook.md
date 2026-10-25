# v2 runbook · cloud orchestrator

You are the main session, running as a Claude Code cloud session opened on the GitHub repo itself, so the repo's hooks, agents and skills load. A second cloud session, the planning session, wrote the v2 plans, runs the Figma design lead, and helps Gordon with the pitch. It pushes only `design/`, `docs/tech/` and `docs/v2/`, and never touches `status.md`, plans or code. Pull with `git pull --rebase origin main` before every push, because both sessions push to `main`. v1 is done and green (`demo-ok-4`).

This runbook takes the build through v2. Cindia is a platform for underrepresented makers, starting with Native American makers. v2 re-skins v1's studio as the fictional Diné Weaving and Silver Co-op, then adds vibe search on our own embedding model, the agent swarm, one database that holds everything, the process blocks and a 3-minute tour, desktop only. Read these first, in order:
1. `docs/v2/fix-plan.md` (the decisions made after the review, which win over anything older),
2. `docs/v2/brief.md` (what and why),
3. `docs/v2/contracts.md` (every new name),
4. `docs/v2/README.md` (the plan list and its order).

The standing rules of `docs/harness/runbook.md` still apply (you coordinate and agents build, delegation headers, evidence, commits, never wait on Gordon) except where this file changes them.

## What changes from the v1 runbook

- **The machine is this cloud session.** The Windows desktop and laptop are demo and live-run machines now. Never run two orchestrators: V0 checks that the desktop handed off. The planning session is not an orchestrator.
- **Concurrency:**
  - At most 3 agents writing code at once (leads, backend-builders and integrators together), because the cloud VM is small. R0 is the one exception (V1 step 0).
  - A lead runs at most 2 builders.
  - A training run counts as one agent.
  - One Playwright gate at a time. R0, core, G1b, G3, G4v2, G5, D-deploy and G6 never overlap, and G4v2 runs with no other agent active.
  - Only one task edits `package.json` at a time (I2-core's T7, I2-art's T0, D-deploy's T2, any install). Queue the next one behind it.
- **Heartbeat:** a cloud session pauses when it's idle, and a session cron doesn't fire while it's paused. So the heartbeat is a `send_later` message to this session every 20 minutes, prompt `/heartbeat`, if that tool exists. Each heartbeat schedules the next one. If `send_later` isn't available, use CronCreate (`*/15 * * * *`, prompt `/heartbeat`). Never keep two. The heartbeat also restarts the servers (`.claude/skills/heartbeat/SKILL.md`).
- **Servers belong to this session.** Start each one from the main session with `run_in_background` and the longest timeout (7,200,000 ms). A background command stops at its time limit, the VM pauses when idle, and a rebuilt VM keeps only the conversation, so the heartbeat restarts whatever is down and logs it. A server started before a key changed keeps the old values, so restart `npm run server` after any key change.
- **Cutoffs:** no 4:30 AM rule. Start any item that can pass its gate before 6:00 AM. From 5:00 AM only finish what's running, fix and polish. The freeze is still at 6:00 AM Sunday (R7 of the v1 runbook, plus the steps under Freeze below), because Gordon records the video and submits by 9:00 AM.
- **Tags stay local, and their SHAs go in `status.md`.** The cloud's GitHub proxy refuses every push that isn't a branch, tags included. So:
  - push with `git push origin main` only, never `--follow-tags` or a tag name,
  - create each tag locally after the push, and record it and its commit SHA in the Tags table of `status.md`,
  - cut by SHA when a tag is missing (a rebuilt VM loses local tags),
  - Gordon pushes the tags from Windows at the freeze.
  The gate and cut skills follow this. Tag names are the ones `docs/v2/contracts.md` section 10 gives.
- **`main` stays demoable.** `demo-ok-4` is the v1 fallback. Every v2 commit passes its gate, and the Phase A mapping keeps the v1 story playing on the desktop shell until the tour lands.
- **The tour is always scripted.** It never waits on a network and plays the same every time. Live mode answers people's own requests only. A v2 upgrade's G5 follows `docs/v2/fix-plan.md` section 1.4.

## V0 · Hand-off and cloud preflight (STAGE: V2)

00. **Be on `main`.** A cloud session can start on its own `claude/...` branch. Run `git fetch origin` and `git checkout -B main origin/main` before anything else, and push only with `git push origin main`. If GitHub refuses a push to `main`, push to your own branch and put "merge `<branch>` into `main`" under Needs Gordon.
0. **Network check. Nothing else starts until it passes.** Run this from the main session:
   ```bash
   for h in cdn.sheetjs.com huggingface.co download.pytorch.org install.spacetimedb.com cdn.playwright.dev
   do
     printf '%s ' "$h"
     curl -sS -o /dev/null --max-time 15 -w '%{http_code}\n' "https://$h/" 2>/dev/null
   done
   ```
   Any status counts as an answer except `000`. If a host prints `000`, the cloud environment's network is still on Trusted, and `npm ci`, the Playwright browser and the base model can't download. Put this line under Needs Gordon: "Set the build session's cloud environment to Full network access, or Custom with the hosts in `docs/v2/contracts.md` section 1 and Also include default list ticked. A change reaches this session within about a minute." Send a push if you can, then stop. Every heartbeat reruns this check and carries on from step 1 once every host answers.
1. Run `date` (Pacific time) and `git pull --ff-only origin main`.
2. **Hand-off check.** The newest commits on `origin/main` must include the desktop's `handoff: desktop to cloud` commit, or Gordon must have said in this conversation that the desktop session is stopped. If neither, put it under Needs Gordon, then wait for the next heartbeat. Don't build until it's true.
3. **The board.** Set `STAGE: V2`, `NEXT: V1`, `UPDATED`, and add a Log line in `status.md`. Add:
   - a "v2 Features" table and a "v2 Upgrades" table from `docs/v2/README.md`. `R0-reskin`, the I2 plans, `S3-catalog` and `D-deploy` go in the features table, and `B11-embed` to `B16-bank-books` in the upgrades table,
   - a "Tags" table with the columns `| Tag | SHA | Gate | When |`, one row per tag, the full 40-character SHA,
   - a "Public site" line, empty until Gordon uploads (D-deploy).
   
   Then log two decisions in `decisions.md`, with `docs/v2/fix-plan.md` as the reason (B1-4, B1-27): the demo harness's beat tolerance is 250 ms on the cloud VM (v1 used 100 ms), and every gate that times the tour checks the tour test alone, `endedAtWallMs` in `artifacts/demo/report.json` against the timeline's `durationMs` plus a load allowance, never the whole Playwright run.
4. **Toolchain.** Check that Node is 22.12 or later and Python 3.12 or later. Then:
   - `npm ci`, which needs `cdn.sheetjs.com`.
   - `python3 -m venv .venv` and `.venv/bin/python -m pip install -r server/requirements.txt`.
   - If torch is installed now or by any later install (I2-core's T6, B11's training requirements), check it's the CPU build. `.venv/bin/python -c "import torch; print(torch.__version__)"` must end in `+cpu`. Without `download.pytorch.org` pip quietly takes PyPI's CUDA build, several GB. If it doesn't end in `+cpu`, uninstall torch and install it again from the CPU index, and log it.
   - The Playwright browser, with the image's skip flag unset for this one command: `env -u PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD npx playwright install chromium`. The image presets an older Chromium that may not match the repo's Playwright. Step 6 proves it launches.
   - The SpacetimeDB CLI from `install.spacetimedb.com`, into the user's home, never a global system path. If the installer's release download answers 403, fetch the same asset from `release-assets.githubusercontent.com` with curl and install it by hand, as `docs/tech/spacetimedb/install-and-run-locally.md` describes. Then `spacetime server set-default local`, so no command reaches Maincloud by default.
   
   Log each install in `decisions.md`. A host that refuses means the network changed back. Go back to step 0.
5. Run `node .claude/hooks/test-hooks.mjs`. It must pass in full. A failure that comes from Linux paths gets fixed in the hooks (you own `.claude/`) and logged in `lessons.md`. Use `GUARDS: off` only as the last resort.
6. **Servers,** each from the main session with `run_in_background` and the longest timeout:
   - `npm run dev` (5173).
   - `npm run server` (8000).
   - `spacetime start --listen-addr 127.0.0.1:3000` (3000), once the CLI is in. Never a bare `spacetime start`, which may listen beyond this machine.
   
   Confirm each one answers: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` prints `200`, `curl -s http://localhost:8000/api/health` answers, and `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/v1/ping` prints `200`. Then run `npm run test:smoke` once. It proves Chromium launches.
7. Create the heartbeat (above).
8. **Keys.** `GET /api/health` reports which keys are set, as booleans. That's the only way to check keys. Never echo a variable, and the command guard blocks it anyway. Until I2-core lands, `server/config.py` reads only `ANTHROPIC_API_KEY`, which is never set in the cloud, so `anthropic: false` means nothing yet. Read `nessie` now and `anthropic` only after the I2-core commit (V1 step 1). The four built-and-waiting v1 upgrades get their G5 when their key reads true, one at a time, at a moment no agent is writing code:
   - B04 (Nessie): right after R0's commit, before I2-core spawns.
   - B02, B07 and B09 (Anthropic): right after I2-core's commit, before the next spawn.
   
   They're checks, not builds, and each runs v1's G5 on the demo as it stands. A key that reads false: the row stays `blocked` with the reason under Needs Gordon.

## V1 · Shared code and data

The order below follows the architecture review (B1-1, B1-19, B1-20). Commit each step with only the paths it owns plus `docs/harness/`.

0. **R0, the re-skin (`docs/plans/R0-reskin.md`).** v1's studio becomes the Diné Weaving and Silver Co-op. Every number stays, and only names, words and art change.
   - Spawn its four agents at once, each with the SCOPE line its task in the plan gives: the data-smith (T1), the integrator (T2), a feature-lead (T3) and a backend-builder (T4). The SCOPEs don't overlap, and nothing else runs beside them, so this is the one step allowed past the cap of 3.
   - When the data-smith reports, tell the backend-builder with SendMessage that the new `src/mock/` is in. It rebuilds the server fixtures from that data with a throwaway Vitest dump under `artifacts/r0/`, because `npm run export:mock` arrives only with I2-core T7. Don't run `export:mock` in this step. Step 1 runs it once I2-core is in. Each agent runs its own scoped checks.
   - When all four have reported, run R0's checks as `docs/v2/contracts.md` section 10 gives them: `npm run check`, `npm run check:data`, `npm run test:smoke`, `npm run build`, `npm run test:demo` 3 times (v1's 60-second demo on the new names), `npm run test:offline` and `npm run test:server`, then the verifier's screenshot review. `scripts/gate.mjs` learns the time rule only in I2-core, so apply it yourself: each run's `artifacts/demo/report.json` must have `endedAtWallMs` at most 75,000, which is 75 seconds (v1's 60 plus 15). The report gets a `durationMs` field only from I2-core's T7. Together they cover every check in the plan's Acceptance, and all must pass. Then run the old-names search from the plan's Acceptance, which must find nothing.
   - Log the plan's line in `decisions.md`: the v1 tests' expected names, titles and default languages follow the re-skinned data, and no assertion was removed.
   - Then one commit, `R0: re-skin to the Diné co-op`, holding all four agents' paths. Push the branch, then tag `v2-reskin` and record it in the Tags table. This is also the first v2 push, so check that the branch push went through.
   - A red check: send the failure to the agent that owns the file, two rounds at most. R0 can't be cut, because every later plan uses its names. Still red after two rounds: a fresh agent of the same role for one more round, then Needs Gordon.
1. **I2-core, first spawn.** Spawn the integrator for `I2-core` (`docs/plans/I2-core.md`, the SCOPE line its plan gives), every task except T5. It merges `docs/v2/contracts.md` into `docs/common/` and writes the types, reducers, validation, sources, server config and `export:mock`.
   - **The fallout step (B1-1).** Widening the core types breaks files the integrator may not edit. When the integrator reports, and before the first `npm run check`, spawn I2-core's two fallout tasks at once, each with the delegation header `docs/plans/I2-core.md` gives it: FO1 for a feature-lead (placeholder entries in the v1 feature files the widened types break) and FO2 for a data-smith (the minimal v2 fields on the twelve co-op pieces).
   - When both report, run the core gate's checks (`docs/v2/contracts.md` section 10): `npm run check`, `npm run test:smoke`, `npm run test:demo` and `npm run test:server`. Commit the integrator's and the two fallout tasks' paths together as `I2-core: v2 contracts and core`, push, then tag `v2-core` and record it.
   - Run `npm run export:mock`, which exists from this commit on. The Python side reads R0's names from it.
   - Check the torch build again (V0 step 4), since T6 installs the v2 requirements. uvicorn reloads `config.py`, so read `/api/health` again and run the B02, B07 and B09 G5s now if `anthropic` is true (V0 step 8).
   - Nothing else starts before this lands.
2. **S3's stubs.** Spawn the data-smith for `S3-catalog` task T1 only (the typed stub files). Commit it as soon as `npm run check` passes.
3. **Then, within the cap of 3:**
   - the integrator for `I2-core`'s second spawn, tasks T5 then T8 (the scripted responders, which import those stubs). Commit it on its own `npm run check:scope -- src/sources/` pass, with its paths only,
   - the data-smith for S3's first data spawn: the tasks that don't need T5, which B1-20 names T2 to T5 and T7, as S3's task table splits them,
   - the integrator for `I2-kit` task T1 (the frame components), then the rest of I2-kit,
   - once I2-kit's T1 is in, the integrator for `I2-shell`,
   - the integrator for `I2-art` task T0 (`npm run art -- --placeholders`, a placeholder SVG for each of the 54 pieces, so no card shows a broken image). Commit it on its own, with its paths only, before G1b.
   
   Two integrators may run at once only with SCOPE lines that don't overlap. The plans give them.
4. **S3's second data spawn** (the tasks B1-20 names T6 and T8: the demo search, the eval queries, the swarm runs and the integrity tests) starts only after I2-core's second spawn is committed and after G1b has run, if G1b is due (step 5).
5. **G1b,** when I2-shell, I2-kit and I2-art's T0 are done. A gate sees every agent's half-written files, so run it at a moment no data-smith or integrator is mid-edit: if an S3 spawn is running, wait for it to report, run G1b, then start S3's next spawn. Run it with the gate skill. Tag `v2-shell`.
6. **G2b,** when both S3 spawns are done and no integrator is mid-task. Its checks are `npm run check:data`, `npm run check:scope -- src/mock/ tests/data/ src/sources/` and `npm run art -- --check` (which checks the 54 placeholder files), plus a verifier review. Run it with the gate skill. Tag `v2-data`.
7. Then run `npm run export:mock`, and spawn the integrator for `I2-art` tasks T1 to T3 (the real illustrations and the contact sheet).
8. `B11-embed` and `B13-live` may start as soon as `I2-core` is in, within the cap. They live in `server/` and their own adapters. B11's T3 (the training queries) waits for G2b, because its leak guard checks S3's eval queries, so before G2b give B11's backend-builder T1 and T2 only. Its training run needs `S3-catalog`, `npm run export:mock` and the training requirements (V2 below).

## V2 · Features, upgrades and the public site

**Features,** after G1b and G2b, in this order, as v1's R4:
- P0: `F-search`, `M-buyer`, `F-support`, `F-process`, `F-communities`, `M-approvals`, `M-desktop`, `F-seller-hub`.
- Then P1: `F-watch`, `F-storefront`, `M-maker-statement`.

Notes on the queue:
- `M-desktop` is P0 and runs right after `M-approvals`, before the tour, because `d06` to `d10` are the moment for the finance tracks (C-11). Its lead starts with T2 and T3 (the money map, then the month and the catch at desktop size), before its other tasks. It starts when M-approvals' lead reports and doesn't wait for M-approvals' G3, which waits on B13-live's T7 (the B08 owner route).
- `F-seller-hub` is P0, because its `d15-listing` beat is in the tour's spine.
- B13's T7, B08's owner route (`docs/plans/B13-live.md`), must land before `M-approvals`' G3. If M-approvals reports first, its G3 waits for that task, and the B13 backend-builder runs it next.
- Each gets a feature-lead with `PLAN: docs/plans/<plan>.md`, `TASK: all`, and the SCOPE line its plan gives. A migration plan may own more than one feature folder.
- G3 on each. A migration plan's G3 takes every slug it owns, for example `npm run gate -- G3 money-map reconcile scenario close impact proof dashboard ask-cindy audit` for `M-desktop`. Tags `v2-<slug>`, where an `M-` plan's slug is its ID without `M-` (`v2-desktop`).
- After each green feature, rerun `npm run test:demo` once and `npm run test:offline` (the Phase A demo, later the tour) when no other Playwright gate is running.

**Upgrades,** as v1's R6, each with a backend-builder and the SCOPE its plan lists, then G5 with the gate skill. Tags `demo-ok-b11` to `demo-ok-b16`.
1. `B11-embed` first, through T8. Its G5 waits for B12 (step 2).
2. Then `B12-search`. Its T1 needs B11's T5 and T6, not B11's G5. When B12's backend-builder reports, run G5 for `b11-embed` and then for `b12-search`, back to back, because B11's live spec gets its live `search.mapped` through B12's adapter.
3. `B13-live` beside them, as early as the cap allows (V1 step 8 lets it start once I2-core is in), because its B08 owner-route task gates M-approvals' G3.
4. Then `B16-bank-books`, queued after B04 is live (its v1 G5 green, V0 step 8), because it reads B04's Nessie account. It needs `NESSIE_KEY`.
5. Then `B14-swarm`.
6. Then `B15-watch`. It crawls the sandbox market once the public site is up (D-deploy), and plays on its fixture until then.

Each G5 names its live feature spec by path, and a feature lead writes that spec. G5 waits for the lead that writes its live spec, and a skipped live spec fails G5 (a live spec may skip at G3, before its upgrade lands).

| Upgrade | G5 | Live spec written by |
|---|---|---|
| B11 | `npm run gate -- G5 b11-embed tests/features/search-live-map.spec.ts` | F-search T7 |
| B12 | `npm run gate -- G5 b12-search tests/features/search-live.spec.ts` | F-search T7 |
| B13 | `npm run gate -- G5 b13-live tests/features/process-live-data.spec.ts` | F-process T8 |
| B14 | `npm run gate -- G5 b14-swarm tests/features/support-live.spec.ts` | F-support T5 |
| B15 | `npm run gate -- G5 b15-watch tests/features/watch-live.spec.ts` | F-watch T5 |
| B16 | `npm run gate -- G5 b16-bank-books tests/features/money-map-live-bank.spec.ts tests/features/reconcile-live-bank.spec.ts` | M-desktop T7 |

Your own steps around the upgrades (builders can't install, publish or run servers). Each plan's "Orchestrator steps" section is the source, and these follow it. Use the `.venv` Python for every `python` command.
- **B11, before T3 and after G2b:** `npm run export:mock`, then `python server/b11_embed/data.py --snapshot`, then install the training requirements with `.venv/bin/python -m pip install -r server/b11_embed/requirements-train.txt`, and check the torch build (V0 step 4).
- **B11, T5's run:** confirm `huggingface.co` answers (V0 step 0). Run `python server/b11_embed/train.py --probe` in the foreground and read its peak memory and seconds per step. Then start `python server/b11_embed/train.py` with `run_in_background` and a 60-minute timeout. It counts as one agent, and nothing heavy runs beside it. It saves a checkpoint each epoch, so a killed run resumes.
- **B11, after T5:** spawn the data-smith for `S3-catalog` task T9, which copies the real report into `src/mock/model.ts` and grades `unjudged.json`. Then run `python server/b11_embed/train.py --eval-only`, have T9 copy the report again, rerun `npm run export:mock` before B12's seed, and rerun G2b's data check.
- **B11, after T8 and the `--eval-only` rerun:**
  - Run `python server/b11_embed/publish.py`, then confirm that `server/b11_embed/report.json` has `hubRepo` and `hubRevision`. That report goes in with B11's G5 commit, and `fetch_model.py` checks against it on the demo laptop and after a VM rebuild. If publish refuses because `HF_TOKEN` or `CINDIA_HF_REPO` is unset (`/api/health` reports `hf`), put this under Needs Gordon: "Add `HF_TOKEN` and `CINDIA_HF_REPO` (`<your Hugging Face account>/cindia-embed`) to the build session's cloud environment, so the model can reach the demo laptop." The cloud VM keeps its own copy, so carry on.
  - Write `scripts/train-akbari.sh` yourself, one line that runs `server/b11_embed/train_akbari.sh "$@"`, because a backend-builder can't write `scripts/`. It's for Gordon's optional run at the lab.
- **B11, after any VM rebuild:** run `python server/b11_embed/fetch_model.py`, which pulls the newest published model back.
- **If Gordon trains on the Akbari machine instead** (`scripts/train-akbari.sh`, his own `HF_TOKEN`), run `python server/b11_embed/fetch_model.py` once he says his run is published, then S3's T9 as above. The model, `vectors.json` and the index must share one fingerprint, or B11 refuses them.
- **B13, after T1:** install the module's packages, then rerun T1's module build test (it skips while `module/node_modules` is missing), then publish it to the local server with `spacetime publish -s local cindia`, run from `server/b13_spacetime/module/` the way `server/b13_spacetime/README.md` says. Never the CLI's Maincloud default.
- **B13, once `save_token.py` exists (its T4):** run `python server/b13_spacetime/save_token.py`. It writes the publisher's token to `.env` as `SPACETIME_TOKEN` without printing it. Restart `npm run server` and confirm `GET /api/b13/status` reports `spacetime: true`.
- **B13, after T5:** `POST /api/b13/seed` once, or let the adapter do it in live mode.
- **B13, before every recorded demo:** `spacetime call -s local cindia clear_runs`, so no old run shows in the swarm view.
- **B13's T7** (B08's owner screen at `/sell/approvals?screen=owner`) gates M-approvals' G3. Commit T7's files on their own once its tests pass, so `main` never holds M-approvals' owner spec without the adapter it needs.
- **Before each G5 of B11 to B16:** rerun `npm run export:mock`.
- **An upgrade whose service isn't reachable or whose key isn't set:** finish it against mocks, mark it `blocked` with the reason under Needs Gordon, and move on. The scripted source keeps the demo whole.

**The public site (`docs/plans/D-deploy.md`),** an integrator plan, as soon as G1b and G2b are green, within the cap.
- Its `package.json` edit (T2) never runs beside another integrator task that edits `package.json`, such as I2-art's `art` script. Queue one behind the other.
- When its gate is green, put the upload under Needs Gordon: "Upload the public build to Cloudflare Pages, the steps in `docs/plans/D-deploy.md`, about 5 minutes."
- When Gordon sends the site's URL, write it on the Public site line of `status.md`, and restart `npm run server` with `PUBLIC_SITE_URL=<url>` set for that process. Then run B15's G5 if its row is `blocked` on the market. A variable added to the cloud environment reaches this session only after its VM is rebuilt, so ask him to add it there too, for later rebuilds.
- The laptop script and its checklist (D-deploy) are for Gordon to run on the demo laptop Saturday night, on a good network.

## V3 · The tour

When `F-search`, `M-buyer`, `F-support`, `F-process`, `F-communities`, `M-approvals`, `M-desktop`, `F-seller-hub`, `F-watch`, `F-storefront` and `M-maker-statement` are green or cut:
1. Spawn `I2-tour` in three steps, one after the other, because each needs the one before (B1-26):
   1. the integrator for task T2 (it checks I2-core's `beat.started` fields, the types, validation and state, and writes the tour's tables into `demo-script.md`),
   2. the data-smith for the timeline task (T1), with the SCOPE line the plan gives it,
   3. the integrator for tasks T3 to T8.
   
   From the first spawn until G4v2 passes, `test:demo` and `check:data` can be red, because the timeline and the stage change in steps. So no other gate runs in that window, and nothing from it is committed on its own. While I2-tour runs, queue any other integrator request that touches `src/app/` or `tests/demo/` behind it.
2. **The contact sheet.** Before G4v2, send Gordon `artifacts/art/contact-sheet.png` with SendUserFile, if the tool exists, with one line: "Please look at the 54 piece drawings for two minutes and tell me if any reads as a copy, a sacred design or a cliché." `artifacts/` isn't committed, so this is the only way he sees it. Don't wait for his answer. If he flags a drawing later, the integrator redraws it and G4v2 reruns.
3. Run **G4v2** with the gate skill, with no other agent active and no other Playwright run. Tag `demo-ok-v2`.
4. **Right after G4v2,** start M-buyer's T7, which was queued for this moment: the integrator first removes `buyer.main`, `buyer-concierge-input` and `buyer-concierge-results` from the UI contract (M-buyer's contract change 6), then M-buyer's lead retires the phone flow and its five specs, then G3 for `buyer` again. It runs before any V4 round reruns G3.

## V4 · The design drops

Only after G4v2 is green (B1-26), because I3-redesign's SCOPE overlaps I2-tour's. One integrator at a time.

The planning session runs the design lead through the Figma connector and pushes each drop to `main` under `design/`, with a commit named `design: drop N`. If Gordon runs a design session on his laptop instead, it pushes to branch `design`, and the planning session merges that branch into `main`. You only pull.
1. On every heartbeat, pull and read `design/HANDOFF.md` for the drop number.
2. Never edit `design/` yourself.
3. For a new drop, spawn the integrator for `I3-redesign` with that drop.
4. Rerun G4v2, alone as in V3, and tag `demo-ok-v2-dN`.
5. If drop 2 lists layout changes in `design/changes.md`, give each affected feature's lead one polish round: G3, then a G4v2 rerun.

Agents in this session have no Figma tools. The integrator works from the files in `design/`.

## Scribe

- **At 8:00 PM,** spawn the scribe with `PLAN: docs/plans/D-sponsors.md`, `TASK: all`, `SCOPE: README.md, docs/devpost/, sponsors/`. It writes the README, the what's-real list, the Devpost skeleton and one folder per sponsor track. Commit its output, so Gordon can start the Devpost entry that night.
- **At the freeze,** run it again with `TASK: T6`, after the project image is in (below).

## Freeze

v1's R7, with these steps added:
1. Set `STAGE: FREEZE`. Start nothing new. Give running agents 15 minutes to report, stop the rest, and restore their folders with the cut skill.
2. **The project image.** Copy the tour's catch screenshot, `artifacts/demo/d08-catch.png`, to `docs/devpost/project-image.png`. Every demo run overwrites that folder, so if the newest run failed, run `npm run test:demo` once first. Devpost requires an image, and the scribe has no shell to copy it.
3. Run the scribe with `TASK: T6`.
4. Run G6 with the gate skill. Tag `final`.
5. In the G6 summary, give Gordon:
   - the tags to push from Windows, with this Git Bash loop, which reads the Tags table:
     ```bash
     git pull --ff-only origin main
     grep -E '^\| [a-z0-9-]+ \| [0-9a-f]{40} \|' docs/harness/status.md | awk -F'|' '{gsub(/ /,"",$2); gsub(/ /,"",$3); print $2, $3}' | while read -r tag sha
     do
       git tag -a "$tag" "$sha" -m "$tag"
     done
     git push origin --tags
     ```
   - the public build to upload again from the final commit (`npm run build:public` on Windows, then the D-deploy upload steps),
   - the tracks whose hard requirement the final what's-real list shows as met (`sponsors/README.md`).

## When Gordon comes back

When he writes, answer first with a short status:
- what's green,
- what's running,
- what's blocked and why,
- what he needs to do (network, keys, the public site upload and its URL, the pitch cards in `src/app/demo/pitch.ts`, his Devpost sections, the Figma session, the laptop script, the tags at the freeze),
- the newest tag and its SHA.

Then the details if he asks. Keep the pitch and Devpost work in his voice (the scribe drafts, he edits).

## When something goes wrong (added to the v1 table)

| Problem | Do this |
|---|---|
| A host refuses (`000` from curl) | The cloud environment's network blocks it. Back to V0 step 0: Needs Gordon, Full network access or the host in a Custom allowlist (`docs/v2/contracts.md` section 1). Keep going with mocks only for work that doesn't need that host |
| A push is refused because it holds a tag | Expected in the cloud. Push the branch alone with `git push origin main`, and keep the tag local and in the Tags table |
| A tag is missing when you need it | The VM was rebuilt. Use its SHA from the Tags table (`git restore --source <sha> -- <paths>`), and recreate it with `git tag -a <tag> <sha> -m "<tag>"` |
| The VM was rebuilt | Rerun V0 steps 4 and 6, restore the model with `.venv/bin/python server/b11_embed/fetch_model.py`, republish the B13 module and rerun `save_token.py`, recreate the local tags from the Tags table, and recreate the heartbeat. Log it |
| A server is down | The heartbeat restarts it from the main session with `run_in_background` and logs it. Restart `npm run server` after any key change |
| The VM runs out of memory during a build or a training run | Drop to 2 agents, rerun the step alone, and log it |
| `send_later` heartbeat stopped arriving | Create it again, check with the scheduled tasks list, keep exactly one |
| A design drop conflicts with a feature's layout | The design wins on look, the contracts win on names and test IDs. Log the choice in `decisions.md` |
