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
| Demo run report | `artifacts/demo/report.json`: each key's source, the fallbacks, `durationMs` (the played timeline's own) and `endedAtWallMs` | `npm run test:demo` |
| The dataset as JSON | `artifacts/mock/mock.json` | `npm run export:mock` |
| Preflight | `artifacts/preflight.md` | `node scripts/preflight.mjs` |
| Hook logs | `artifacts/hooks/` | the hooks |

`artifacts/` isn't committed. `status.md` keeps the path of every gate report.

## Task (builder)

- [ ] Every file in the task row exists, and nothing outside your `SCOPE` changed.
- [ ] Every event type, payload field, data field, route, slot and test ID you used is defined in the contracts. You invented no names.
- [ ] No name or amount typed in that belongs in `src/mock/`. No key or secret anywhere.
- [ ] `npm run check:scope -- <your SCOPE entries>` → exit 0.
- [ ] The test command the plan names for your task → exit 0. If the task has none, say so, and the lead's feature test covers it.
- [ ] Every spec you wrote seeks by event and checks spacing from the events' `at`, as `conventions.md` (Specs) says.
- [ ] No test, type or lint rule weakened, skipped or deleted.
- [ ] The REPORT block, with one evidence line per check.

## Feature (feature lead, G3)

**The lead:**
- [ ] Every task in the plan is done, or reported failed with what was learned.
- [ ] `src/features/<slug>/index.ts` exports the feature module from `ui-contract.md` and fills the slots the plan names.
- [ ] `npm run check:scope -- src/features/<slug>/ tests/features/<slug>-*` → exit 0, for every slug the plan owns.
- [ ] `npm run test:feature -- <slug> [<slug> ...]` → exit 0, and every Acceptance line in the plan has a passing test.
- [ ] `npm run test:smoke` → exit 0. The rest of the site still works.
- [ ] Every panel still fed by scripted events shows the `Simulated` badge.
- [ ] Every on-screen label from `glossary.md` (L1 to L30) the feature owns is copied word for word, in both languages, inside the test ID its row names.
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
| R0 re-skin | data-smith, integrator, feature-lead, backend-builder | Every R0 check below passes, every number unchanged, and the old-names search in `R0-reskin.md` finds nothing |
| I2-core | integrator, then the fallout step's feature-lead and data-smith | The I2-core plan's Acceptance lines pass and every core check below passes |
| I2-kit, I2-shell | integrator | Their plans' Acceptance lines pass and G1b passes with I2-core |
| S3-catalog | data-smith | The S3 plan's Acceptance lines pass and every G2b command passes |
| I2-tour | integrator and data-smith | The I2-tour plan's Acceptance lines pass and G4v2 passes |
| D-deploy | integrator, then Gordon for the upload | Its Acceptance commands pass and a verifier reviews them |

## Gates

Each gate runs through the gate skill: `npm run gate -- <gate> [<slug> ...]` when the script has the gate, then a verifier review, then the status update. A gate passes only when every check passed and the verifier says PASS.

- `scripts/gate.mjs` takes G1, G1b, G2, G2b, G3, G4, G4v2, G5 and G6, in any case, and writes `artifacts/gates/<gate>-<HHMM>.md` with the gate's own spelling. R0, core and D-deploy have no entry: the orchestrator runs the commands in their rows itself, as the gate skill says.
- **The time rule.** Every gate that plays the demo times the tour test alone. After each `npm run test:demo`, the gate reads `artifacts/demo/report.json`. The check passes when the file was written by this run and its `endedAtWallMs` is at most its `durationMs`, the loaded timeline's own, plus 15 seconds: 75 seconds for v1's 60-second demo, 220 seconds for the 205-second tour. Playwright's whole-run time, which also counts `modes.spec.ts` and the browser start, is recorded for information and never judged. R0, core, G1b, G4, G4v2, G5 and G6 all use this one rule.

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

**Commands:** `npm run check:scope -- src/features/<slug>/ tests/features/<slug>-*` over every slug's folder and specs, `npm run test:feature -- <slug> [<slug> ...]` with every slug, `npm run test:smoke`, plus the verifier's boundary trace. Other features may still be half-built while this gate runs, so the per-feature gate never runs the whole-repo `npm run check`.

**Passes when** the Feature checklist above passes: the feature's acceptance tests pass, the rest of the site still works, and every event and field it uses exists in the contracts. A smoke failure that traces to a different feature still being built doesn't fail this gate. The verifier names the file each failure comes from. A migration that owns several folders (M-desktop's nine) passes with all its slugs listed in one call.

**Then:** tag `w1-<slug>` for a W1 feature, `w2-<slug>` for a W2 feature, or `v2-<slug>` for a v2 feature or migration. After the W1 wave, tag `w1`.

### G4 Demo, end of Phase 1

**Commands:** `npm run build`, then `npm run test:demo` three times in a row on the production build, `npm run test:offline`, and the verifier's screenshot review

**Passes when:**
- 3 clean runs in a row, each within the time rule (75 seconds for the 60-second demo).
- No request beyond localhost.
- Each beat's screenshot in `artifacts/demo/` matches its beat in `demo-script.md`: the view, the test IDs on screen and the numbers shown.

**Then:** tag `demo-ok-1`, and `demo-ok-2` onward for a polished rerun. The session never deploys anything. Gordon can put a preview online himself (`docs/harness/kickoff.md`).

### G5 Upgrade, after each of B01 to B10

**Commands:** `npm run test:server`, the upgrade's contract test against `api-contract.md`, one live call first as a pre-smoke, then G4 in scripted mode and in live mode, on whatever demo timeline is current (the Phase A demo until I2-tour)

**Passes when** the live path works and the scripted fallback still passes G4.

The live-mode runs must show the upgrade's key as live: its adapter is healthy at the start, the store's `sources[<key>]` is `"live"` after the run with no scripted fallback, and `artifacts/demo/report.json` records each key's source. The gate passes the slug to the harness as `CINDIA_DEMO_UPGRADE`, and every other key whose adapter is healthy and has keyed events in the timeline must play live too. A key may list event types it's allowed to return nothing for in the demo (`ALLOWED_EMPTY_FALLBACKS` in `tests/demo/beats.ts`, `b08-approvals` for `approval.granted` and `approval.declined`, and `b04-bank` for `money.moved` (mv_0001 and mv_0002 return nothing because Nessie records only the settlement), per their plans), and then it counts as live when it went live at least once and its only fallbacks were those, which `report.json` records. A throw, a timeout or nothing returned for any other type still fails.

G1b, G4, G4v2, G5 and G6 all build `dist/` and use port 4173, so only one of them runs at a time.

**Then:** tag `demo-ok-bNN`, for example `demo-ok-b04`.

### G6 Freeze, at 6:00 AM Sunday

**Commands:** G4 on the final build (G4v2 once the tour is in), timed by the time rule, a secrets scan, `git status`, the push, and a check of `README.md` against `status.md`

**Passes when:**
- G4 (or G4v2) passes on the final build.
- Secrets scan: `node scripts/secrets-scan.mjs` → exit 0. It checks tracked files and `dist/` for the key values of every name in `conventions.md`'s variable table that holds a secret (`CINDIA_ANTHROPIC_API_KEY`, `ANTHROPIC_API_KEY`, `NESSIE_KEY`, `ELASTIC_API_KEY`, `APIFY_TOKEN`, `HF_TOKEN`, `SPACETIME_TOKEN`), read from `.env` and from the process environment, and for the key patterns (Anthropic, `apify_api_`, `hf_`, JWTs). It prints file and variable names only, never a value. Never search for keys any other way, since a recursive search can print `.env`.
- `git status` is clean and `main` is pushed, by the Git rule in `conventions.md` (in the cloud: the branch only, with every tag and its SHA in `status.md` for Gordon to push from Windows).
- The README and the what's-real list match the Cut and simulated section of `status.md`.

**Then:** `STAGE: FROZEN`. Tag `final`.

## v2 gates and tags

| Gate | After | Commands | Tag |
|---|---|---|---|
| R0 | `R0-reskin`, before everything else in V1 | `npm run check`, `npm run check:data`, `npm run test:smoke`, `npm run build`, `npm run test:demo` 3 times (v1's 60-second demo on the co-op's names), `npm run test:offline`, `npm run test:server`, the verifier's screenshot review, and the old-names search in `R0-reskin.md`. Every v1 check green, every number unchanged. The orchestrator applies the time rule from `report.json` itself | `v2-reskin` |
| core | `I2-core`'s first spawn with the fallout step, committed together | `npm run check`, `npm run test:smoke`, `npm run test:demo` (v1's 60-second demo on the co-op's names), `npm run test:server` | `v2-core` |
| G1b | `I2-core`, `I2-shell`, `I2-kit` | `npm run check`, `npm run test:smoke`, `npm run build`, `npm run test:demo` once with the Phase A mapping, `npm run test:offline`, a verifier review | `v2-shell` |
| G2b | `S3-catalog` | `npm run check:data` (figures 1 to 10 and 11 to 16), `npm run check:scope -- src/mock/ tests/data/ src/sources/`, `npm run art -- --check`, a verifier review. It runs when no integrator is mid-task, and never as a whole-repo check while other V1 agents are mid-edit | `v2-data` |
| G3 | each v2 feature or migration | as above. A migration that owns several folders passes with all its slugs listed | `v2-<slug>` |
| G4v2 | `I2-tour` | `npm run build`, `npm run test:demo` 3 times on the tour, `npm run test:offline`, the verifier's screenshot review against `demo-script.md`. It runs with no other agent active | `demo-ok-v2` |
| G5 | each of B11 to B16 | below | `demo-ok-b11` to `demo-ok-b16` |
| D-deploy | `D-deploy` | its Acceptance commands, a verifier review | `v2-deploy` |
| G6 | the freeze | as above, with the secrets scan reading every v2 name | `final` |

- A design drop that passes G4v2 again may add `demo-ok-v2-dN`.

### G5 for B11 to B16

**Commands:** `npm run gate -- G5 <slug> tests/features/<spec>.spec.ts [...]`, such as `npm run gate -- G5 b14-swarm tests/features/support-live.spec.ts`, with at least one live feature spec path after the slug. It runs `npm run test:server`, the upgrade's contract tests and its live test as v1 runs them, each named spec through `npm run test:feature`, then `npm run build`, `npm run test:demo` once with the source in live mode, timed by the time rule, and `npm run test:offline`.

**Passes when:**
- the server tests pass,
- the live feature spec answers a person's own request end to end, with every event valid,
- the scripted tour still passes with the source in live mode.

The tour stays scripted, so the source's keyed tour events are allowed to come back empty. `ALLOWED_EMPTY_FALLBACKS` in `tests/demo/beats.ts` lists them, each entry marked `tourScripted: true`:
- `b11-embed` for `search.mapped`, `model.trained` and `proof.search_scored`,
- `b12-search` for `search.answered` and `surprise.drawn`,
- `b13-live` for `data.synced` (`d15-listing`'s, the one tour event keyed `b13-live`, which the B13 adapter answers with `[]` at once),
- `b14-swarm` for `swarm.step`, `support.answered`, `listing.drafted`, `listing.indexed`, `question.forwarded` and `question.answered`,
- `b15-watch` for `watch.scanned`, `counterfeit.flagged` and `followup.drafted`.

B16 keys no tour event and gets no entry. `REQUIRED_KEYS` in `tests/demo/beats.ts` has `b14-swarm: anthropic`, `b15-watch: apify` and `b16-bank-books: nessie`, and `REQUIRED_SERVICES` has `model` for `b11-embed` and `b12-search` and `spacetime` for `b13-live`, so the live-mode health wait skips an adapter whose key or service is missing. v1's upgrades keep v1's G5 above.

## Upgrade (backend-builder, before G5)

- [ ] The router is at `server/routers/bNN_<slug>.py`, and `server/main.py` picks it up without being edited. The upgrade's other files are in `server/bNN_<slug>/` or carry its prefix.
- [ ] The adapter is at `src/sources/live/bNN-<slug>.ts`, and the sources registry finds it without being edited.
- [ ] Requests and responses match `api-contract.md` exactly, including the error shape.
- [ ] Keys are read only through the server config module and its header helpers. Nothing prints, logs or returns a key.
- [ ] Every live call has a timeout. On any failure the adapter falls back to scripted events, and the panel keeps its `Simulated` badge until live data arrives.
- [ ] Only `claude-haiku-5-5` and `claude-sonnet-5-5` appear, and every Claude client passes `CLAUDE_BASE_URL`.
- [ ] `npm run test:server` → exit 0, the self-test included. The live test ran when its key was present, or was skipped because it was missing, and the report says which.
- [ ] `npm run check:scope -- <your SCOPE entries>` → exit 0 and `npm run test:smoke` → exit 0. A smoke failure from a feature still being built is noted, not fixed.
- [ ] The REPORT block. The orchestrator then runs G5.

## Writing (scribe)

- [ ] Every fact, number and claim traces to `status.md`, a plan, a test or the spec.
- [ ] The what's-real list matches the Cut and simulated section of `status.md`.
- [ ] L30 appears word for word in `README.md`, `docs/devpost/whats-real.md` and the Devpost skeleton.
- [ ] Plain words and short sentences. No em dashes and no semicolons in prose.
