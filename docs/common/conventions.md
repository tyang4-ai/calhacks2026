# Conventions

Every agent loads this file through CLAUDE.md. Each fact here lives only here. If another doc disagrees with this one, this one wins, and the integrator fixes the other doc.

## Machines, ports and time

- **Build machine:** a Claude Code cloud session on the GitHub repo (Linux, Node 22, Python 3.13, 2 vCPUs, about 7 GB of RAM, no GPU). Its environment is set to Full network access, or to Custom with the hosts below and **Also include default list** ticked, because npm, PyPI, crates.io and GitHub's release hosts ride on the default list.
- **Demo machines:** Gordon's Windows desktop and laptop, with the repo at `C:\dev\calhacks2026`, outside the Obsidian vault. Either can also run any live step (D-deploy's demo-laptop checklist, `node scripts/laptop-setup.mjs`). npm scripts stay `cmd.exe`-safe, because the demo runs on Windows.
- **Ports:** 5173 for the Vite dev server, 4173 for the production preview, 8000 for the FastAPI backend, and 3000 for the local SpacetimeDB server, which the orchestrator starts once in the background with `spacetime start --listen-addr 127.0.0.1:3000`, so nothing beyond the machine can reach it. Nothing else listens.
- **Hosts the build needs** (for a Custom allowlist): `*.elastic.cloud`, `api.apify.com`, `api.nessieisreal.com`, `prod-api.nessieisreal.com`, `qa-api.nessieisreal.com`, `huggingface.co`, `*.huggingface.co`, `*.hf.co`, `install.spacetimedb.com`, `spacetimedb-client-binaries.s3.amazonaws.com`, `cdn.sheetjs.com`, `download.pytorch.org`, `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`. Only if B13's module is Rust: `static.rust-lang.org`, `index.crates.io` and `static.crates.io` (rustc and cargo come with the image). `*.spacetimedb.com` matters only for Maincloud, which stays off for the demo. GitHub, npm, PyPI and the Anthropic API are reachable by default.
- **The public site** is the scripted build on Cloudflare Pages, which Gordon uploads from Windows (D-deploy). The cloud session never deploys. B15's crawler reads the site's sandbox market from Apify's side, so the cloud VM needs no route to it.
- **Clock:** Pacific time. Run `TZ=America/Los_Angeles date` to check it. The cutoffs in CLAUDE.md rule 10 use this clock.

## Commands

The command names are fixed in CLAUDE.md. Two more exist from the start:

| Command | What it does |
|---|---|
| `node .claude/hooks/test-hooks.mjs` | Self-test for the edit guard, command guard, context hook and stop check. Prints one line per case and exits 1 on any failure |
| `node scripts/preflight.mjs` | G0 checks. Writes `artifacts/preflight.md` and exits 1 when a blocker is found |

And these scripts, each owned by the plan named:

| Command | What it does |
|---|---|
| `npm run export:mock` | `node scripts/export-mock.mjs` (I2-core). Loads `src/mock/index.ts` through Vite's `createServer` in middleware mode with no HMR and no websocket, so it opens no port, then writes `artifacts/mock/mock.json` in UTF-8: one top-level key per export of `src/mock/index.ts` whose value isn't a function, plus `_generatedAt`. It prints one line per key with its item count and exits 0. `getById()` is a function and never reaches the JSON, so `allApprovals` and `allFollowUps` are how the server finds every approval and follow-up |
| `npm run art` | I2-art: draws the piece illustrations into `public/images/`. `-- --placeholders` writes a placeholder for each of the 54 pieces, `-- --sheet` builds the contact sheet in `artifacts/art/`, and `-- --check` checks the drawings |
| `npm run build:public` | D-deploy: `scripts/build-public.mjs`, the build with `VITE_PUBLIC_SITE=1`, which writes `dist/public-build.json` |
| `npm run test:feature -- <slug or spec> [...]` | One or more slugs or spec paths. An argument ending in `.spec.ts` runs that one file, such as `tests/features/support-live.spec.ts`. Any other argument is a slug and expands to `tests/features/<slug>-*.spec.ts`. A bare spec name like `support-live` is a slug too, matches nothing, and the script exits 1 naming it |
| `node scripts/secrets-scan.mjs [<path> ...]` | G6's secrets scan. It reads the key values from `.env` and from the process environment for every name in the table below that holds a secret, in memory only, never printing a value, and checks for Anthropic, Apify (`apify_api_`), Hugging Face (`hf_`) and JWT patterns. Extra paths are scanned too, so B11 can scan the model folder and its card before a publish |
| `node scripts/check-contrast.mjs` | I3-redesign: reads the color pairs `design-system.md` lists as text on a ground, and exits 1 if any falls under 4.5 to 1 |
| `node scripts/make-market.mjs` | D-deploy: writes the sandbox market's pages in `public/market/` from `mock.json` |
| `node scripts/check-public.mjs` | D-deploy: checks the public build and `public/_redirects` |
| `node scripts/laptop-setup.mjs` | D-deploy: the demo laptop's setup and its rehearsal checklist. Gordon runs it on Windows, never in the cloud |

Rules for npm scripts, because they run in `cmd.exe` on Windows:
- No Bash-only syntax: no `rm -rf`, no `FOO=1 cmd`, no single-quoted arguments, no `&` to background a process.
- Anything more than one plain command goes in a Node script under `scripts/`, called as `node scripts/<name>.mjs`.
- `cmd.exe` doesn't expand `*`, so any script that takes paths (`check:scope`, `test:feature`) expands patterns like `tests/features/money-map*` itself.

## Environment variables

`server/config.py` reads the process environment first, then `.env`. It never prints or returns a value.

| Name | Where it's set | Used by |
|---|---|---|
| `CINDIA_ANTHROPIC_API_KEY` | Cloud environment variable. Not `ANTHROPIC_API_KEY`, which would change how the cloud session itself is billed. Never a network secret | `server/` |
| `ANTHROPIC_API_KEY` | `.env` on the Windows machines only | `server/`, read only when `CINDIA_ANTHROPIC_API_KEY` is unset |
| `NESSIE_KEY` | Cloud environment variable or `.env`. Never a network secret, because it travels in the query string | `server/` B04, B16 |
| `ELASTIC_URL`, `KIBANA_URL` | Cloud environment variable or `.env`. Not secret | `server/` B12 |
| `ELASTIC_API_KEY` | Cloud environment variable or `.env`. Leave it unset when a network secret carries the key | `server/` B12 |
| `ELASTIC_AUTH` | `proxy` in the cloud when a network secret attaches the Elastic key, otherwise unset. Proxy mode exists only in the cloud | `server/config.py` |
| `APIFY_TOKEN` | Cloud environment variable or `.env`. Leave it unset when a network secret carries the token | `server/` B15 |
| `APIFY_AUTH` | `proxy` in the cloud when a network secret attaches the Apify token, otherwise unset | `server/config.py` |
| `HF_TOKEN` | Cloud environment variable, `.env`, or the shell on the lab machine. A fine-grained token with write access to the one model repo | `server/b11_embed/publish.py` (publish) and `fetch_model.py` (pull onto the cloud VM and the demo laptop). Needed for live search on Windows and after a VM rebuild. uvicorn never uses it |
| `CINDIA_HF_REPO` | Cloud environment variable or `.env`. Not secret. The private Hugging Face repo, `<account>/cindia-embed` | `server/b11_embed/` publish and fetch |
| `SPACETIME_URL`, `SPACETIME_DB` | Optional. Defaults `http://127.0.0.1:3000` and `cindia` | `server/` B13 |
| `SPACETIME_TOKEN` | Written to `.env` by the step that publishes the module (B13's plan, D-deploy's setup script), without printing it. Never typed by hand | `server/config.py`, for B13's bridge. The tables are private, and only this identity, the module's publisher, may call the writing reducers |
| `CINDIA_MODEL_DIR` | Optional. Default `models/cindia-embed-v1`, which `.gitignore` lists | `server/` B11, B12, B15 |
| `PUBLIC_SITE_URL` | Cloud environment variable or `.env`, once Gordon has uploaded the public site. Not secret. The site's base URL, Cloudflare Pages or the MLH domain | `server/` B15: the sandbox market is `<PUBLIC_SITE_URL>/market/`. Unset, B15 runs on its fixture and the watch stays scripted |
| `VITE_PUBLIC_SITE` | `1` only for the public build, which `npm run build:public` makes (D-deploy). A public-build flag, not a secret, read only by `src/app/site.ts` | the shell: no Pay and no Live switch on the public build |

- `.env` sits at the repo root and is never committed. `.env.example` lists the names with empty values.
- Only `server/` reads `.env`. A name starting with `VITE_` is shipped to the browser, so a secret never gets that prefix.
- **Network secrets** (cloud only) keep a key outside the VM. Elastic: header `Authorization`, prefix `ApiKey` (not the default `Bearer`), allowed hosts `*.elastic.cloud`, which covers both project endpoints (on a Team plan without the admin role, two secrets, one per host). Apify: header `Authorization`, prefix `Bearer`, host `api.apify.com`. The Anthropic key and the Nessie key can't use one: the proxy never attaches a secret to `api.anthropic.com`, and Nessie reads its key from the query string.
- Never print, log, echo or read a key into the conversation. The command guard blocks reads of `.env`, `printenv`-style commands, and any command that names a variable ending in `_KEY`, `_TOKEN` or `_SECRET`. Never echo a variable that holds a key.
- `ANTHROPIC_API_KEY` must not be set in the shell that launches Claude Code. If it is, Claude Code bills the API key instead of the claude.ai plan, and Remote Control stops working. The preflight checks this, and it's why the cloud uses `CINDIA_ANTHROPIC_API_KEY`.
- Every outside API, its account and its auth: `docs/v2/apis-and-accounts.md`.

## Folders and owners

| Path | Owner | Notes |
|---|---|---|
| `CLAUDE.md`, `.claude/`, `.gitignore`, `.gitattributes` | orchestrator | Agents never edit these |
| `docs/harness/` | orchestrator | Runbook, v2 runbook, status board, decisions, lessons, hooks spec, kickoff |
| `docs/common/` | integrator | The contracts. Frozen after G1, except for logged changes |
| `docs/plans/` | orchestrator | One plan file per stage, feature, migration and upgrade |
| `docs/spec/` | orchestrator | Product spec and pitch, background only |
| `docs/v2/` | orchestrator | The v2 brief, fix plan, reviews, plan order, and outside APIs and accounts. `contracts.md` is history: its names live in `docs/common/` |
| `design/` | orchestrator, through the planning session's design lead | The Figma handoff drops. Written only from the planning session, which pushes it. The build session never writes it, and the edit guard has no design-lead role |
| `docs/devpost/`, `README.md` | scribe | |
| `sponsors/` | scribe | One folder per sponsor track, for their judges. The edit guard allows it |
| `src/app/`, `src/core/`, `src/ui/`, `src/sources/` (except `live/`) | scaffolder in S1, then integrator | Shared code, frozen after G1 |
| `src/sources/live/` | backend-builder | One adapter file per upgrade |
| `src/mock/` | data-smith | Dataset, answer key, scripted timelines, scripted runs |
| `src/features/<id>/` | that feature's lead and its builders | |
| Server skeleton: `server/*.py` (files directly in `server/`), `server/routers/__init__.py`, `server/requirements.txt`, `tests/server/conftest.py` | scaffolder in S1, then integrator | Shared, frozen after G1. `main.py` loads every router it finds. There's no `tests/server/__init__.py`, because with one pytest imports the folder as package `server` and hides the real one |
| `server/routers/`, other files under `server/` | backend-builder | One router per upgrade, plus files its plan names with its own `bNN` prefix |
| `server/bNN_<slug>/` | backend-builder | An upgrade's own folder, with its own prefix, such as `server/b11_embed/` and `server/b13_spacetime/` |
| `tests/smoke/`, `tests/demo/`, `tests/offline/` | scaffolder in S1, then integrator | |
| `tests/data/` | data-smith | |
| `tests/features/` | feature leads and builders | Files named `<feature-slug>-<what>.spec.ts` |
| `tests/server/` | backend-builder | Upgrade tests import shared helpers with `from conftest import needs_key` |
| `scripts/` | scaffolder in S1, then integrator | Check, gate and test scripts in Node |
| `public/` | scaffolder in S1, then integrator | Static files. `public/images/` holds the piece illustrations (I2-art) and `public/market/` the sandbox market (D-deploy) |
| Root config: `package.json`, `package-lock.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `.oxlintrc.json` or `eslint.config.js` (the S1 plan picks one), `.prettierrc*`, `playwright.config.ts`, `index.html` | scaffolder in S1, then integrator | Frozen after G1 |
| `models/` | nobody commits it | The trained model, `CINDIA_MODEL_DIR`. Listed in `.gitignore`. Only `fetch_model.py` or a training run fills it |
| `artifacts/` | anyone | Gate reports, screenshots, hook logs. Not committed |
| `artifacts/mock/` | `npm run export:mock` | `mock.json`, which the server reads. Not committed |

- Vite's watcher ignores `.venv`, `models`, `server` and `artifacts`, so torch's files never load it.

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

- `STAGE`: one of `PLANNING`, `S0`, `S1`, `S2`, `W1`, `I1`, `W2+P2`, `V2` (the whole v2 build), `FREEZE`, `FROZEN`. The `/goal` line ends the build at `STAGE: FROZEN`.
- `NEXT`: the runbook step to do next.
- `SHARED_LOCK`: `on` after G1 passes. While it's on, the edit guard lets only the integrator and the orchestrator write shared code, root config and contracts.
- `STOP_CHECK`: `off` turns off the builder stop check (see `docs/harness/hooks-spec.md`).
- `GUARDS`: `off` turns off the edit guard and command guard. Emergency only. Never use `disableAllHooks` instead, because it also turns off `/goal`.

## Naming

| Thing | Rule | Example |
|---|---|---|
| Plan IDs | `S1-scaffold`, `S2-mock-data`, `S3-catalog`, `I1-demo-stage`, `R0-reskin`, `I2-<slug>`, `I3-redesign`, `F-<slug>`, `M-<slug>` (a migration of a v1 feature), `B01-<slug>` to `B16-<slug>`, `D-<slug>` | `F-money-map`, `B04-bank`, `M-buyer`, `I2-core` |
| Feature folders | `src/features/<slug>/`, where the slug is the plan ID without `F-` or `M-` | `src/features/money-map/` |
| Feature entry | `src/features/<slug>/index.ts` exports the feature module from `ui-contract.md` | |
| React components | PascalCase file and export | `MoneyMap.tsx` |
| Hooks | `useThing.ts` | `useEventStream.ts` |
| Other modules | camelCase | `formatCents.ts` |
| Event types | lowercase `noun.verb_past` with a dot, listed in `events.md` | `approval.requested` |
| Test IDs | `data-testid="<slug>-<element>"`, kebab-case, listed in `ui-contract.md` | `money-map-balance` |
| CSS custom properties | `--c-<group>-<name>`, defined only in `src/ui/` | `--c-color-ink` |
| Backend routers | `server/routers/bNN_<slug>.py`, with the upgrade's other files in `server/bNN_<slug>/` | `server/routers/b04_bank.py`, `server/b11_embed/train.py` |
| Live adapters | `src/sources/live/bNN-<slug>.ts`, one per source key in `events.md` | `src/sources/live/b16-bank-books.ts` |
| Tags | v1: `g1-scaffold`, `g2-data`, `w1-<slug>`, `w1`, `demo-ok-1` (then `demo-ok-2` and on for polished G4 reruns), `w2-<slug>`, `demo-ok-bNN`. v2: `v2-reskin`, `v2-core`, `v2-shell`, `v2-data`, `v2-<slug>`, `demo-ok-b11` to `demo-ok-b16`, `v2-deploy`, `demo-ok-v2`, `demo-ok-v2-dN` for a design drop. Then `final` | `demo-ok-b04`, `v2-search` |
| Commits | `<plan ID or gate>: <what changed>`, one line, plain words | `G2: mock data passes integrity tests` |

Money is stored and passed as integer cents. Formatting to dollars happens only in the UI kit.

## Dependencies

- The scaffolder installed the stack in S1, at the versions in `ch13-tech-stack.md`, and committed the lockfile. Python packages are pinned in `server/requirements.txt` and installed into `.venv` with its own Python.
- After G1 the dependency list is frozen. A new package needs a `needs:` line in a report. The orchestrator decides, the integrator installs it, and `decisions.md` records why.
- Never install globally. Never use `npx` to fetch a package that isn't in `package.json`.

## Git

- Only the orchestrator runs git commands that change anything: add, commit, tag, push, checkout, restore, reset, stash, merge.
- One branch, `main`. It always holds the last green build. Nothing red gets committed.
- Push after every passed gate. Never force-push.
  - **On Windows:** `git push origin main --follow-tags`.
  - **In the cloud session:** the GitHub proxy refuses tag pushes, so the orchestrator pushes with `git push origin main` only, makes each tag locally after the push, and records the tag and its full commit SHA in the Tags table of `status.md`. Gordon creates and pushes the tags from Windows at the freeze.
- Tags are annotated: `git tag -a g1-scaffold -m "G1 passed"`.
- To cut a feature, restore its folder from its last green tag: `git restore --source <tag> -- src/features/<slug>/ tests/features/<slug>-*`. When the tag isn't there, restore from its SHA in `status.md`. Never restore a folder that R0 or I2-core's fallout step touched from anything older than `v2-core`.

## Tests that run side by side

Several agents run checks at the same time, so the S1 scaffold sets these up:
- Playwright writes each run to its own folder under `test-results/` (an `outputDir` per run), because a run wipes its output folder when it starts.
- Vite's dev and preview servers use `strictPort: true`, so a stale process makes them fail loudly instead of moving to another port.
- `npm run server` runs uvicorn with `--reload`, so a new router loads without a restart.
- G1b, G4, G4v2, G5 and G6 build `dist/` and use port 4173, so only one of them runs at a time.
- Smoke and feature tests reach the dev server on 5173 when it answers. Only the test wrapper (`scripts/run-playwright.mjs`) and gate scripts start the preview on 4173. Agents never start a server themselves.

## Specs

- `tests/smoke/lib.ts` (I2-shell) exports `seekToEvent(page, type, match, offsetMs)`, which finds the first event of that type whose payload matches in `player.getTimeline()` and seeks to its `at` plus the offset.
- Every spec written for the desktop pages seeks by event, never by a fixed time, because I2-tour moves the beats.
- A feature's own `<slug>-lib.ts` may re-export `seekToEvent` but never copies it.
- Acceptance lines check arrival with the default expect timeout, and check the 1.2-second and 300 ms spacing from the events' `at`, never from a short wall-clock window.

## Windows

- Paths in docs, plans and the delegation header use forward slashes. Hooks normalize backslashes before comparing.
- Scripts are Node (`.mjs`) so they behave the same in Git Bash, PowerShell and `cmd.exe`.
- Line endings: `.gitattributes` sets LF for text files.
- Playwright's Chromium is installed once at preflight. Tests never download browsers.
