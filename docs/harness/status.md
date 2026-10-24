STAGE: W2+P2
NEXT: R6
SHARED_LOCK: on
STOP_CHECK: on
GUARDS: on
UPDATED: 2026-10-24 04:42 PT

# Status board

The orchestrator owns this file. The six lines above are read by the hooks and by `/goal`. Keep them first and keep their spelling. Everything below is for people and for the orchestrator after a compaction.

## Now

- Kickoff passed (Oct 24, 2:01 AM): 25 plan files and 9 contracts present, hooks 292/292, preflight 0 blockers.
- Heartbeat cron f57ce95e every 15 min (session-only).
- G1 passed 2:35 AM (5/5, verifier PASS). Shared lock on.
- G2 passed 2:58 AM (2/2, verifier PASS; smoke 22/22 after the integrator fix).
- W1 done 3:27 AM: all 9 P0 features green, wave gate PASS, tag w1.
- G4 passed 4:15 AM after two fix rounds (d08 approvals compact card, d10 toast, d06 handled strip, d07 label). Tag demo-ok-1: the build to demo if everything after fails.
- Now: R6, W2 features (audit, dashboard, scenario) and P2 upgrades (no-key ones first). Dev server on 5173.
- G4 polish, not blocking: d00 caption covers the end of the explanation; d06 handled strip rows wrap unevenly; d08 Month panel cut at its bottom; d07 and d00 catch camera crops the top bar and rail; d01 request input text cut off.

## Gates

| Gate | Result | When | Report | Tag |
|---|---|---|---|---|
| G0 | PASS | Oct 24 2:01 AM | `artifacts/preflight.md` (0 blockers, 1 warning: no `.env`) | none |
| G1 | PASS | Oct 24 2:33 AM | `artifacts/gates/G1-0233.md`, `artifacts/gates/G1-verifier.md` | g1-scaffold |
| G2 | PASS | Oct 24 2:58 AM | `artifacts/gates/G2-0252.md`, `artifacts/gates/G2-verifier.md` | g2-data |
| G3 (W1) | PASS | Oct 24 3:27 AM | `artifacts/gates/G3-0327.md` (wave: check, smoke 22/22, build); 9/9 features green | w1 |
| G4 | PASS | Oct 24 4:15 AM | `artifacts/gates/G4-0415.md` 5/5 (60 s runs, strict demo test), `artifacts/gates/G4-verifier-r2.md` PASS (round 1 FAIL: `G4-verifier.md`) | demo-ok-1 |
| G5 | | | | |
| G6 | | | | |

## Features

| Plan | Wave | State | Lead | Last green tag | Notes |
|---|---|---|---|---|---|
| F-buyer | W1 | green | feature-lead | w1-buyer | G3 3/3, verifier PASS |
| F-money-map | W1 | green | feature-lead | w1-money-map | G3 3/3, verifier PASS |
| F-reconcile | W1 | green | feature-lead | w1-reconcile | G3 3/3, verifier PASS |
| F-approvals | W1 | green | feature-lead | w1-approvals | G3 3/3, verifier PASS |
| F-maker-statement | W1 | green | feature-lead | w1-maker-statement | G3 3/3, verifier PASS |
| F-close | W1 | green | feature-lead | w1-close | G3 3/3, verifier PASS |
| F-proof | W1 | green | feature-lead | w1-proof | G3 3/3, verifier PASS |
| F-ask-cindy | W1 | green | feature-lead | w1-ask-cindy | G3 3/3, verifier PASS |
| F-impact | W1 | green | feature-lead | w1-impact | G3 3/3, verifier PASS; mid-count check made unconditional |
| F-audit | W2 | green | feature-lead | w2-audit | G3 3/3, verifier PASS |
| F-dashboard | W2 | running | feature-lead | | |
| F-scenario | W2 | todo |  | | |

States: `todo`, `running`, `green`, `failed`, `CUT`.

## Upgrades

| Plan | State | Live call checked | Last green tag | Notes |
|---|---|---|---|---|
| B01-match | running | | |  |
| B02-explain | blocked | | | needs ANTHROPIC_API_KEY |
| B03-proof | running | | | built, unit 13 passed; G5 waits for B01 (it calls B01's matcher) |
| B04-bank | blocked | | | needs NESSIE_KEY |
| B05-scenario | todo | | |  |
| B06-workbook | running | | |  |
| B07-ask | blocked | | | needs ANTHROPIC_API_KEY |
| B08-approvals | todo | | |  |
| B09-concierge | blocked | | | needs ANTHROPIC_API_KEY |
| B10-derived | todo | | |  |

## Environment

Filled in from `artifacts/preflight.md` at G0.

| Check | Result | Detail |
|---|---|---|
| Node 22.12 or later | ok | node 24.16.0 |
| npm | ok | npm 11.13.0 |
| Python 3.12 or later | ok | py 3.14.6 |
| Git | ok | git version 2.54.0.windows.1 |
| Git Bash (Claude Code runs Bash through it) | ok | C:\Program Files\Git\bin\bash.exe |
| gh signed in | ok | signed in |
| Claude Code 2.1.295 or later | ok | claude 2.1.310 |
| Playwright Chromium downloaded | ok | C:\Users\22317\AppData\Local\ms-playwright\chromium-1228 |
| Port 5173 free | ok | free |
| Port 4173 free | ok | free |
| Port 8000 free | ok | free |
| .env present | WARNING | missing. Copy C:\dev\secrets\cindia.env to .env. Phase 1 can run without it |
| ANTHROPIC_API_KEY not set in the shell | ok | not set |
| Vault tech docs readable | ok | B:\Alioth\Notes\Hackathons\my-entries\2026-10-cal-hacks-13\resources\tech |
| Clock on Pacific time | ok | system zone America/Los_Angeles, Pacific now Oct 24, 2026, 1:59 AM |
| At least 5 GB free | ok | 561.5 GB free |
| .gitignore lists .env and artifacts/ | ok | yes |
| origin is tyang4-ai/calhacks2026 | ok | https://github.com/tyang4-ai/calhacks2026 |
| On branch main | ok | main |
| Working tree clean | ok | clean |
| CLAUDE.md present | ok | yes |
| .claude/settings.json present | ok | yes |
| .claude/hooks/edit-guard.mjs present | ok | yes |
| docs/harness/runbook.md present | ok | yes |
| docs/harness/status.md present | ok | yes |

## Needs Gordon

Each item names the default already in use, so the build never waits.

| Since | Question | Default in use |
|---|---|---|
| Oct 24 2:01 AM | `.env` is missing, so there's no `ANTHROPIC_API_KEY` or `NESSIE_KEY`. Copy `C:\dev\secrets\cindia.env` to `.env` | The upgrades that need these keys stay scripted: B02, B07, B09 (Anthropic) and B04 (Nessie) are blocked; B01, B03, B05, B06, B08, B10 run without keys |

## Cut and simulated

Everything that ends up cut or still on scripted events, for the README and Devpost.

## Log

Newest last. One line per event: time, what happened, evidence path.

- 2026-10-24 02:01 PT · kickoff passed · `artifacts/preflight.md`
- 2026-10-24 02:04 PT · heartbeat created (cron f57ce95e, */15) · CronList
- 2026-10-24 02:04 PT · G0 recorded, stage S1, scaffolder spawned · `artifacts/preflight.md`
- 2026-10-24 02:35 PT · G1 passed 5/5, verifier PASS, shared lock on, tag g1-scaffold · `artifacts/gates/G1-0233.md`
- 2026-10-24 02:38 PT · dev server started on 5173 (200); data-smith spawned for S2; integrator spawned for the conventions.md and glossary.md fixes from S1 · status.md
- 2026-10-24 02:45 PT · integrator fixed conventions.md and glossary.md (check PASS, smoke 22/22) · decisions.md
- 2026-10-24 02:55 PT · S2 reported done; G2 checks 2/2; smoke 21/22 (shell.spec c-key assumes empty timeline); integrator fixing smoke and Vitest cache; G2 verifier running · artifacts/gates/G2-0252.md
- 2026-10-24 02:58 PT · integrator fixed the c-key smoke test and set vitest fsModuleCache off; check PASS, smoke 22/22 · artifacts/gates/G2-verifier.md
- 2026-10-24 02:58 PT · G2 passed, tag g2-data; W1 leads started for buyer, money-map, reconcile, approvals · artifacts/gates/G2-0252.md
- 2026-10-24 03:12 PT · F-approvals lead done (verifier PASS); integrator spawned for run-playwright --project bug, smoke ERR_ABORTED and stale placeholder checks; maker-statement lead started · artifacts/verify/F-approvals-G3-0309.md
- 2026-10-24 03:14 PT · F-reconcile lead done (verifier PASS), G3 waits on integrator fix; close lead started · artifacts/verify/F-reconcile-G3-0310.md
- 2026-10-24 03:15 PT · F-money-map lead blocked on the same shared test bugs (feature clean, 9/9 direct); proof lead started; pending for integrator: money-map-balance-nessie test ID in ui-contract.md · artifacts/verify/F-money-map-G3-0312.md
- 2026-10-24 03:16 PT · F-buyer lead done (verifier PASS with caveats), G3 waits on integrator fix; ask-cindy lead started · artifacts/verify/F-buyer-G3-0312.md
- 2026-10-24 03:17 PT · integrator fixed test:feature (--project=), smoke aborts and slot checks; orchestrator added vite/client to tsconfig.node.json; check PASS · decisions.md
- 2026-10-24 03:20 PT · G3 approvals PASS 3/3, verifier PASS, tag w1-approvals · artifacts/gates/G3-0316.md · artifacts/verify/F-approvals-G3-0309.md
- 2026-10-24 03:20 PT · G3 reconcile PASS 3/3, verifier PASS, tag w1-reconcile · artifacts/gates/G3-0317.md · artifacts/verify/F-reconcile-G3-0310.md
- 2026-10-24 03:20 PT · G3 buyer PASS 3/3, verifier PASS, tag w1-buyer · artifacts/gates/G3-0317.md · artifacts/verify/F-buyer-G3-0312.md
- 2026-10-24 03:20 PT · G3 maker-statement PASS 3/3, verifier PASS, tag w1-maker-statement · artifacts/gates/G3-0318.md · artifacts/verify/F-maker-statement-G3-0316.md
- 2026-10-24 03:20 PT · G3 proof PASS 3/3, verifier PASS, tag w1-proof · artifacts/gates/G3-0318.md · artifacts/verify/F-proof-G3-0319.md
- 2026-10-24 03:21 PT · G3 money-map PASS 3/3 (gate output 03:18, report file overwritten by the maker-statement run), verifier rerun PASS, tag w1-money-map · artifacts/verify/F-money-map-G3-rerun.md
- 2026-10-24 03:22 PT · pending for the integrator at I1: add `money-map-balance-nessie` to ui-contract.md; add `setSpeed` to the `window.__cindia.player` type in tests/smoke/lib.ts · reports of F-money-map and F-proof
- 2026-10-24 03:21 PT · G3 ask-cindy PASS 3/3, verifier PASS, tag w1-ask-cindy · artifacts/gates/G3-0320.md, artifacts/verify/F-ask-cindy-G3-1020.md
- 2026-10-24 03:21 PT · pending for the integrator at I1: add `ask-cindy-refs` to ui-contract.md · F-ask-cindy report
- 2026-10-24 03:24 PT · F-impact lead done (verifier PASS); sent back once to make the mid-count check unconditional · artifacts/verify/F-impact-G3-1025.md
- 2026-10-24 03:25 PT · G3 close PASS 3/3, verifier PASS, tag w1-close · artifacts/gates/G3-0324.md, artifacts/verify/F-close-G3-0326.md
- 2026-10-24 03:25 PT · pending for the integrator at I1: add `player.epoch()` and `player.getTimeline()` to the Player interface in events.md · F-close report
- 2026-10-24 03:28 PT · G3 impact PASS 3/3 (feature 10/10 on 3 runs), verifier PASS, tag w1-impact · artifacts/gates/G3-0326.md, artifacts/verify/F-impact-G3-1025.md
- 2026-10-24 03:29 PT · W1 wave gate PASS 3/3, tag w1; stage I1; integrator spawned for I1 · artifacts/gates/G3-0327.md
- 2026-10-24 03:59 PT · I1 built; G4 checks 5/5 (63 s runs) but verifier FAIL: d08 apr_02 seal and payouts below the owner frame, d10 toast covers the held note; fix round 1: approvals, maker-statement, reconcile leads and integrator · artifacts/gates/G4-verifier.md
- 2026-10-24 04:02 PT · maker-statement fix in (toast at top, 1800 ms, overlap test; feature 14/14, smoke 22/22) · decisions.md
- 2026-10-24 04:05 PT · approvals d08 fix in (scroll target card into the visible phone area; feature 19/19, smoke 22/22, verifier PASS) · artifacts/gates/F-approvals-G4fix-verifier.md
- 2026-10-24 04:10 PT · reconcile d06 fix in (Cindy handled strip pins the 3 special matches; feature 12/12 x3, smoke 22/22, verifier PASS round 2) · artifacts/gates/G3-reconcile-g4fix2-verifier.md
- 2026-10-24 04:08 PT · round 1 done; strict demo test now fails d06 (mat_009, mat_017 IDs on scrolled rows) and d08 (apr_01 scrolled off); round 2: fresh approvals and reconcile leads; pending for integrator: ui-contract.md line 120 beat label top right in studio-catch · decisions.md
- 2026-10-24 04:10 PT · reconcile round 2 in (special-match IDs on the strip rows; feature 12/12, smoke 22/22) · F-reconcile report
- 2026-10-24 04:17 PT · approvals round 2 in (decided card compact; feature 19/19, smoke 22/22); G4 rerun checks 5/5, strict demo test, 60 s runs; verifier round 2 running · artifacts/gates/G4-0415.md
- 2026-10-24 04:21 PT · G4 PASS 5/5, verifier round 2 PASS, tag demo-ok-1; stage W2+P2 · artifacts/gates/G4-verifier-r2.md
- 2026-10-24 04:24 PT · R6 started: audit and dashboard leads, B01 and B03 backend-builders; API server started on 8000; B02, B04, B07, B09 blocked on keys; push sent to Gordon · status.md
- 2026-10-24 04:27 PT · B03 built; API restarted (reload missed new routers), health lists b01 and b03; B03 G5 waits for B01 · status.md
- 2026-10-24 04:28 PT · B06 backend-builder started · status.md
- 2026-10-24 04:42 PT · G3 audit PASS 3/3, verifier PASS, tag w2-audit · artifacts/gates/G3-0438.md, artifacts/verify/F-audit-G3-1131.md
