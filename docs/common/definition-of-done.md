# Definition of done

What "done" means for each unit of work. An item is done when every line of its checklist ran and passed, and the evidence is in its report. Read the section for your role before you start.

## Evidence lines

Every check you claim gets one line, in your REPORT under `checks:` and in any report file you write:

```text
<command> → exit <code>, <counts or result>
```

Examples:

```text
npm run check:scope -- src/features/money-map/ → exit 0, 0 errors, 0 warnings
npm run test:feature -- money-map → exit 0, 6 passed, 0 failed
artifacts/demo/d03-split.png → matches beat 3, money-map-flow-line visible
```

- No line, no claim. "Should pass" is not evidence.
- A check you couldn't run still gets a line that says why: `npm run test:feature -- money-map → not run, dev server down`.
- A test that passes only on a rerun counts as a fail, with a note that it's flaky.

## Where reports go

| Report | Path | Written by |
|---|---|---|
| Gate report | `artifacts/gates/<gate>-<HHMM>.md` | `npm run gate`, or the orchestrator by hand |
| Verifier report | `artifacts/verify/<plan id>-<task or gate>-<HHMM>.md` | verifier |
| Demo screenshots | `artifacts/demo/` | `npm run test:demo` |
| Preflight | `artifacts/preflight.md` | `node scripts/preflight.mjs` |
| Hook logs | `artifacts/hooks/` | the hooks |

`artifacts/` isn't committed. `status.md` keeps the path of every gate report.

## Task (builder)

- [ ] Every file in the task row exists, and nothing outside your `SCOPE` changed.
- [ ] Every event type, payload field, data field, route, slot and test ID you used is defined in the contracts. You invented no names.
- [ ] No name or amount typed in that belongs in `src/mock/`. No key or secret anywhere.
- [ ] `npm run check:scope -- <your SCOPE entries>` → exit 0.
- [ ] The test command the plan names for your task → exit 0. If the task has none, say so, and the lead's feature test covers it.
- [ ] No test, type or lint rule weakened, skipped or deleted.
- [ ] The REPORT block, with one evidence line per check.

## Feature (feature lead, G3)

**The lead:**
- [ ] Every task in the plan is done, or reported failed with what was learned.
- [ ] `src/features/<slug>/index.ts` exports the feature module from `ui-contract.md` and fills the slots the plan names.
- [ ] `npm run check:scope -- src/features/<slug>/ tests/features/<slug>-*` → exit 0.
- [ ] `npm run test:feature -- <slug>` → exit 0, and every Acceptance line in the plan has a passing test.
- [ ] `npm run test:smoke` → exit 0. The rest of the app still works.
- [ ] Every panel still fed by scripted events shows the `Simulated` badge.
- [ ] The feature has no top-level side effects and imports nothing from another feature's folder, so the shell can load it lazily inside its error boundary.

**The verifier (`TASK: G3`):**
- [ ] Reruns the three commands above and records each result.
- [ ] Boundary trace: every event type, payload field, data field, route, slot and test ID used in `src/features/<slug>/` is defined in a contract. The report lists each one with the doc that defines it.
- [ ] No import from another feature's folder. Shared code comes only from `src/core/`, `src/ui/` and `src/sources/`.
- [ ] No request to a host other than localhost in scripted mode.
- [ ] Verdict PASS or FAIL.

**The wave:** after every feature in W1 is green or CUT, the orchestrator runs `npm run check`, `npm run test:smoke` and `npm run build`, all → exit 0, and tags `w1`.

## Stage plans

| Stage | Agent | Done when |
|---|---|---|
| S1 scaffold | scaffolder | The S1 plan's Acceptance lines pass and every G1 command passes |
| S2 mock data | data-smith | The S2 plan's Acceptance lines pass and every G2 command passes |
| I1 demo stage | integrator | The I1 plan's Acceptance lines pass, `npm run test:demo` → exit 0 once on the production build, and `npm run test:offline` → exit 0 |

## Gates

Each gate runs through the gate skill: `npm run gate -- <gate> [<slug>]` when the script exists, then a verifier review, then the status update. A gate passes only when every check passed and the verifier says PASS.

### G0 Preflight, once at kickoff

**Commands:** `node scripts/preflight.mjs`, `node .claude/hooks/test-hooks.mjs`

**Passes when** the preflight finds no blocker and every hook case passes. The preflight checks:
- Node 22.12 or later, npm, Python 3.12 or later, Git for Windows (Git Bash), and `gh` signed in
- Claude Code updated with `claude update`, at or above the version `scripts/preflight.mjs` names, and signed in to the claude.ai plan, which Remote Control needs
- `ANTHROPIC_API_KEY` not set in the shell that launched Claude Code
- Playwright's Chromium installed
- Ports 5173, 4173 and 8000 free
- `.env` present with `ANTHROPIC_API_KEY` and `NESSIE_KEY`, checked for presence only and never printed. A missing key doesn't block Phase 1. It blocks the upgrades that call Claude or Nessie and goes under Needs Gordon
- The vault docs folder readable, the clock on Pacific time, and at least 5 GB free
- `.env` and `artifacts/` listed in `.gitignore`

**Then:** the results go into the Environment section of `status.md`. No tag.

### G1 Scaffold, after S1

**Commands:** `npm run check`, `npm run build`, `npm run test:smoke`, `node .claude/hooks/test-hooks.mjs`

**Passes when:**
- Every route renders with no console errors.
- Every slot shows its placeholder test ID.
- The hook self-test passes, including the case where a builder's edit to a frozen file is blocked.
- Every command in the CLAUDE.md Commands table exists in `package.json` under exactly that name.

**Then:** `SHARED_LOCK: on`. Tag `g1-scaffold`.

### G2 Data, after S2

**Commands:** `npm run check:data`, `npm run check`

**Passes when:**
- Totals reconcile to the cent, except the planted errors `data-model.md` lists.
- The answer key names exactly those planted errors, no more and no fewer.
- Every scripted event validates against `events.md`.
- The figures `data-model.md` marks as demo-critical match.
- Nothing in `src/mock/` uses unseeded randomness or the wall clock (the verifier greps for `Math.random`, `Date.now` and `new Date()` with no fixed value).

**Then:** tag `g2-data`.

### G3 Feature, after each feature, then the whole wave

**Commands:** `npm run check:scope -- src/features/<slug>/ tests/features/<slug>-*`, `npm run test:feature -- <slug>`, `npm run test:smoke`, plus the verifier's boundary trace. Other features may still be half-built while this gate runs, so the per-feature gate never runs the whole-repo `npm run check`.

**Passes when** the Feature checklist above passes: the feature's acceptance tests pass, the rest of the app still works, and every event and field it uses exists in the contracts. A smoke failure that traces to a different feature still being built doesn't fail this gate. The verifier names the file each failure comes from.

**Then:** tag `w1-<slug>` for a W1 feature or `w2-<slug>` for a W2 feature. After the W1 wave, tag `w1`.

### G4 Demo, end of Phase 1

**Commands:** `npm run build`, then `npm run test:demo` three times in a row on the production build, `npm run test:offline`, and the verifier's screenshot review

**Passes when:**
- 3 clean runs in a row, each under 75 seconds.
- No request beyond localhost.
- Each beat's screenshot in `artifacts/demo/` matches its beat in `demo-script.md`: the view, the test IDs on screen and the numbers shown.

**Then:** tag `demo-ok-1`. The session never deploys anything. Gordon can put a phone preview online himself (`docs/harness/kickoff.md`).

### G5 Upgrade, after each of B01 to B10

**Commands:** `npm run test:server`, the upgrade's contract test against `api-contract.md`, one live call first as a pre-smoke, then G4 in scripted mode and in live mode

**Passes when** the live path works and the scripted fallback still passes G4.

The live-mode runs must show the upgrade's key as live: its adapter is healthy at the start, the store's `sources[<key>]` is `"live"` after the run with no scripted fallback, and `artifacts/demo/report.json` records each key's source. The gate passes the slug to the harness as `CINDIA_DEMO_UPGRADE`, and every other key whose adapter is healthy and has keyed events in the timeline must play live too.

G4, G5 and G6 all build `dist/` and use port 4173, so only one of them runs at a time.

**Then:** tag `demo-ok-bNN`, for example `demo-ok-b04`.

### G6 Freeze, at 6:00 AM Sunday

**Commands:** G4 on the final build, a secrets scan, `git status`, the push, and a check of `README.md` against `status.md`

**Passes when:**
- G4 passes on the final build.
- Secrets scan: `node scripts/secrets-scan.mjs` → exit 0. It checks tracked files and `dist/` for the key values and key patterns and prints file names only. Never search for keys any other way, since a recursive search can print `.env`.
- `git status` is clean and `main` is pushed.
- The README and the what's-real list match the Cut and simulated section of `status.md`.

**Then:** `STAGE: FROZEN`. Tag `final`.

## Upgrade (backend-builder, before G5)

- [ ] The router is at `server/routers/bNN_<slug>.py`, and `server/main.py` picks it up without being edited.
- [ ] The adapter is at `src/sources/live/bNN-<slug>.ts`, and the sources registry finds it without being edited.
- [ ] Requests and responses match `api-contract.md` exactly, including the error shape.
- [ ] Keys are read only through the server config module. Nothing prints, logs or returns a key.
- [ ] Every live call has a timeout. On any failure the adapter falls back to scripted events, and the panel keeps its `Simulated` badge until live data arrives.
- [ ] `npm run test:server` → exit 0. The live test ran when its key was present, or was skipped because it was missing, and the report says which.
- [ ] `npm run check:scope -- <your SCOPE entries>` → exit 0 and `npm run test:smoke` → exit 0. A smoke failure from a feature still being built is noted, not fixed.
- [ ] The REPORT block. The orchestrator then runs G5.

## Writing (scribe)

- [ ] Every fact, number and claim traces to `status.md`, a plan, a test or the spec.
- [ ] The what's-real list matches the Cut and simulated section of `status.md`.
- [ ] Plain words and short sentences. No em dashes and no semicolons in prose.
