# Conventions

Every agent loads this file through CLAUDE.md. Each fact here lives only here. If another doc disagrees with this one, this one wins, and the integrator fixes the other doc.

## Machines, ports and time

- **Build machine:** Gordon's Windows desktop. The repo lives at `C:\dev\calhacks2026`, outside the Obsidian vault.
- **Ports:** 5173 for the Vite dev server, 4173 for the production preview, 8000 for the FastAPI backend. Nothing else listens.
- **Clock:** Pacific time. Run `date` to check it. The cutoffs in CLAUDE.md rule 10 use this clock.

## Commands

The command names are fixed in CLAUDE.md. Two more exist from the start:

| Command | What it does |
|---|---|
| `node .claude/hooks/test-hooks.mjs` | Self-test for the edit guard, command guard, context hook and stop check. Prints one line per case and exits 1 on any failure |
| `node scripts/preflight.mjs` | G0 checks. Writes `artifacts/preflight.md` and exits 1 when a blocker is found |

Rules for npm scripts, because they run in `cmd.exe` on Windows:
- No Bash-only syntax: no `rm -rf`, no `FOO=1 cmd`, no single-quoted arguments, no `&` to background a process.
- Anything more than one plain command goes in a Node script under `scripts/`, called as `node scripts/<name>.mjs`.
- `cmd.exe` doesn't expand `*`, so any script that takes paths (`check:scope`, `test:feature`) expands patterns like `tests/features/money-map*` itself.

## Environment variables

| Name | Where | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env` | `server/` only |
| `NESSIE_KEY` | `.env` | `server/` only |

- `.env` sits at the repo root and is never committed. `.env.example` lists the names with empty values.
- Only `server/` reads `.env`. A name starting with `VITE_` is shipped to the browser, so a secret never gets that prefix.
- Never print, log, echo or read a key into the conversation. The command guard blocks commands that read `.env`.
- `ANTHROPIC_API_KEY` must not be set in the shell that launches Claude Code. If it is, Claude Code bills the API key instead of the claude.ai plan, and Remote Control stops working. The preflight checks this.

## Folders and owners

| Path | Owner | Notes |
|---|---|---|
| `CLAUDE.md`, `.claude/`, `.gitignore`, `.gitattributes` | orchestrator | Agents never edit these |
| `docs/harness/` | orchestrator | Runbook, status board, decisions, lessons, hooks spec, kickoff |
| `docs/common/` | integrator | The contracts. Frozen after G1, except for logged changes |
| `docs/plans/` | orchestrator | One plan file per stage, feature and upgrade |
| `docs/spec/` | orchestrator | Product spec and pitch, background only |
| `docs/devpost/`, `README.md` | scribe | |
| `src/app/`, `src/core/`, `src/ui/`, `src/sources/` (except `live/`) | scaffolder in S1, then integrator | Shared code, frozen after G1 |
| `src/sources/live/` | backend-builder | One adapter file per upgrade |
| `src/mock/` | data-smith | Dataset, answer key, scripted timelines |
| `src/features/<id>/` | that feature's lead and its builders | |
| Server skeleton: `server/*.py` (files directly in `server/`), `server/routers/__init__.py`, `server/requirements.txt`, `tests/server/conftest.py` | scaffolder in S1, then integrator | Shared, frozen after G1. `main.py` loads every router it finds. There's no `tests/server/__init__.py`, because with one pytest imports the folder as package `server` and hides the real one |
| `server/routers/`, other files under `server/` | backend-builder | One router per upgrade, plus files its plan names with its own `bNN` prefix |
| `tests/smoke/`, `tests/demo/`, `tests/offline/` | scaffolder in S1, then integrator | |
| `tests/data/` | data-smith | |
| `tests/features/` | feature leads and builders | Files named `<feature-slug>-<what>.spec.ts` |
| `tests/server/` | backend-builder | Upgrade tests import shared helpers with `from conftest import needs_key` |
| `scripts/` | scaffolder in S1, then integrator | Check, gate and test scripts in Node |
| Root config: `package.json`, `package-lock.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `.oxlintrc.json` or `eslint.config.js` (the S1 plan picks one), `.prettierrc*`, `playwright.config.ts`, `index.html` | scaffolder in S1, then integrator | Frozen after G1 |
| `artifacts/` | anyone | Gate reports, screenshots, hook logs. Not committed |

## The delegation header

Every message that spawns a scaffolder, data-smith, feature-lead, builder, integrator, backend-builder or scribe starts with these lines, in this order:

```text
ROLE: builder
PLAN: docs/plans/F-buyer.md
TASK: T1
SCOPE: src/features/buyer/ConciergeChat.tsx, src/features/buyer/CuratedGrid.tsx, tests/features/buyer-concierge.spec.ts
```

- `ROLE` matches the agent's name. `TASK` is `all` when the agent owns the whole plan.
- `SCOPE` lists the only paths the agent may write, comma-separated, repo-relative, with forward slashes. A path that ends in `/` covers the folder and everything under it. `*` matches within one path segment, as in `tests/features/buyer-*`. Keep the whole list on the one `SCOPE` line.
- The edit guard reads the first `SCOPE:` line of the delegation message. Entries outside the role's own area (the table above) are ignored, so a header can narrow an agent's paths but never widen them.
- A verifier's header has `ROLE: verifier` and no `SCOPE`. It writes only to `artifacts/`.

## Status markers

The first lines of `docs/harness/status.md` are machine-read. Only the orchestrator changes them.

```text
STAGE: S0
NEXT: R1
SHARED_LOCK: off
STOP_CHECK: on
GUARDS: on
UPDATED: 2026-10-24 00:00 PT
```

- `STAGE`: one of `PLANNING`, `S0`, `S1`, `S2`, `W1`, `I1`, `W2+P2`, `FREEZE`, `FROZEN`. The `/goal` line ends the build at `STAGE: FROZEN`.
- `NEXT`: the runbook step to do next.
- `SHARED_LOCK`: `on` after G1 passes. While it's on, the edit guard lets only the integrator and the orchestrator write shared code, root config and contracts.
- `STOP_CHECK`: `off` turns off the builder stop check (see `docs/harness/hooks-spec.md`).
- `GUARDS`: `off` turns off the edit guard and command guard. Emergency only. Never use `disableAllHooks` instead, because it also turns off `/goal`.

## Naming

| Thing | Rule | Example |
|---|---|---|
| Plan IDs | `S1-scaffold`, `S2-mock-data`, `I1-demo-stage`, `F-<slug>`, `B01-<slug>` to `B10-<slug>` | `F-money-map`, `B04-bank` |
| Feature folders | `src/features/<slug>/`, where the slug is the plan ID without `F-` | `src/features/money-map/` |
| Feature entry | `src/features/<slug>/index.ts` exports the feature module from `ui-contract.md` | |
| React components | PascalCase file and export | `MoneyMap.tsx` |
| Hooks | `useThing.ts` | `useEventStream.ts` |
| Other modules | camelCase | `formatCents.ts` |
| Event types | lowercase `noun.verb_past` with a dot, listed in `events.md` | `approval.requested` |
| Test IDs | `data-testid="<slug>-<element>"`, kebab-case, listed in `ui-contract.md` | `money-map-balance` |
| CSS custom properties | `--c-<group>-<name>`, defined only in `src/ui/` | `--c-color-ink` |
| Backend routers | `server/routers/bNN_<slug>.py` | `server/routers/b04_bank.py` |
| Live adapters | `src/sources/live/bNN-<slug>.ts`, one per source key in `events.md` | `src/sources/live/b04-bank.ts` |
| Tags | `g1-scaffold`, `g2-data`, `w1-<slug>`, `w1`, `demo-ok-1`, `w2-<slug>`, `demo-ok-bNN`, `final` | `demo-ok-b04` |
| Commits | `<plan ID or gate>: <what changed>`, one line, plain words | `G2: mock data passes integrity tests` |

Money is stored and passed as integer cents. Formatting to dollars happens only in the UI kit.

## Dependencies

- The scaffolder installs the stack in S1, at the versions in `ch13-tech-stack.md`, and commits the lockfile.
- After G1 the dependency list is frozen. A new package needs a `needs:` line in a report. The orchestrator decides, the integrator installs it, and `decisions.md` records why.
- Never install globally. Never use `npx` to fetch a package that isn't in `package.json`.

## Git

- Only the orchestrator runs git commands that change anything: add, commit, tag, push, checkout, restore, reset, stash, merge.
- One branch, `main`. It always holds the last green build. Nothing red gets committed.
- Push after every passed gate: `git push origin main --follow-tags`. Never force-push.
- Tags are annotated: `git tag -a g1-scaffold -m "G1 passed"`.
- To cut a feature, restore its folder from its last green tag: `git restore --source <tag> -- src/features/<slug>/ tests/features/<slug>-*`.

## Tests that run side by side

Several agents run checks at the same time, so the S1 scaffold sets these up:
- Playwright writes each run to its own folder under `test-results/` (an `outputDir` per run), because a run wipes its output folder when it starts.
- Vite's dev and preview servers use `strictPort: true`, so a stale process makes them fail loudly instead of moving to another port.
- `npm run server` runs uvicorn with `--reload`, so a new router loads without a restart.
- G4, G5 and G6 build `dist/` and use port 4173, so only one of them runs at a time.
- Smoke and feature tests reach the dev server on 5173 when it answers. Only the test wrapper (`scripts/run-playwright.mjs`) and gate scripts start the preview on 4173. Agents never start a server themselves.

## Windows

- Paths in docs, plans and the delegation header use forward slashes. Hooks normalize backslashes before comparing.
- Scripts are Node (`.mjs`) so they behave the same in Git Bash, PowerShell and `cmd.exe`.
- Line endings: `.gitattributes` sets LF for text files.
- Playwright's Chromium is installed once at preflight. Tests never download browsers.
