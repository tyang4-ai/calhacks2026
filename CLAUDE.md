# Cindia · build manual

Every session and every subagent in this repo loads this file. If you are the main session, read `docs/harness/status.md`, then follow `docs/harness/runbook.md` from the step it marks as `NEXT`. Once `STAGE` is `V2`, or `NEXT` names a V step, follow `docs/harness/v2-runbook.md` instead. If you are a subagent, your delegation message and your plan file are your instructions, and this file sets the rules.

## The project in five lines

- **Cindia** (Craft Inheritance Network, Direct from Independent Artisans) is the index and back office for Indigenous and heritage makers. Buyers find pieces by describing a feeling (vibe search on our own embedding model), each seller gets a storefront at their own link, and a swarm of small agents led by **Cindy** answers customers and runs the makers' money. A person approves anything that moves money.
- **The named community** is the Gu embroidery (顾绣) studio in Shanghai with its owner and three makers. Seven fictional Indigenous communities sit beside it in the catalog. Gu embroidery is a heritage craft and is never called Indigenous. Why and what: `docs/v2/brief.md`.
- Gordon Yang is building it solo at Cal Hacks 13.0. **The desktop site, the guided tour (`/demo`) and the idea matter more than the product.** Desktop only.
- **v1** (Phase 1 frontend on scripted events, Phase 2 upgrades B01 to B10) is green as `demo-ok-4`. **v2** adds the plans in `docs/v2/README.md` on top of it, with every new name in `docs/v2/contracts.md` until `I2-core` merges them into `docs/common/`. Screens render events, and backend upgrades replace event sources.
- **Deadlines, Pacific time:** building stops Sunday Oct 25 at 6:00 AM. Devpost closes at 9:00 AM. The build runs in a Claude Code cloud session on the GitHub repo.

## How the build runs

v1: S0 preflight → S1 scaffold → G1 → S2 mock data → G2 → W1 P0 features → G3 → I1 demo stage → G4 → W2 P1 features and P2 backend upgrades side by side, each with its gate. Done.

v2: V0 hand-off and cloud preflight → V1 shared code and data (G1b, G2b) → V2 features, migrations and upgrades B11 to B15 (G3, G5) → V3 the tour (G4v2) → V4 design drops from Figma → freeze → G6

- A **gate** is a set of checks with recorded evidence, defined in `docs/common/definition-of-done.md`. Nothing moves past a failed gate.
- After each passed gate the orchestrator commits, tags (`g1-scaffold`, `g2-data`, `w1-<slug>`, `demo-ok-1`, `demo-ok-b04` and so on), pushes and updates `status.md`.
- `main` always holds the last green build. A demo that runs beats a feature that doesn't.

## Who does what

| Agent | Job | May write |
|---|---|---|
| orchestrator (main session) | Runs the runbook, spawns agents, runs git, installs packages, keeps status | anything, but mostly `docs/harness/` |
| scaffolder | S1: shell, event engine, UI kit, demo controls, server skeleton, check and test scripts | shared code, root config, the server skeleton, `scripts/`, `tests/smoke/`, `tests/demo/`, `tests/offline/`, `public/` |
| data-smith | S2: mock dataset, answer key, scripted timelines | `src/mock/`, `tests/data/` |
| feature-lead | One feature: splits it into tasks, spawns builders and a verifier, assembles, reports | `src/features/<slug>/`, `tests/features/<slug>-*` |
| builder | One task from a plan file | the files in its `SCOPE` |
| verifier | Runs checks, reviews screenshots, traces boundaries. Never fixes anything | `artifacts/` |
| integrator | I1 demo stage, plus any change to shared code or contracts after G1 | shared code, root config, the server skeleton, `docs/common/`, `scripts/`, `tests/smoke/`, `tests/demo/`, `tests/offline/`, `public/` |
| backend-builder | One Phase 2 upgrade | its router in `server/routers/`, files under `server/` with its own `bNN` prefix, its adapter in `src/sources/live/`, its tests in `tests/server/` |
| scribe | README, the what's-real list, a Devpost skeleton for Gordon, one folder per sponsor track | `README.md`, `docs/devpost/`, `sponsors/` |
| design lead | A general-purpose agent with the Figma tools: research, moodboards, style tiles, mockups, prototype, the handoff drops | `design/` |

The full path table is in `docs/common/conventions.md`. Every delegation message starts with the header defined there (`ROLE`, `PLAN`, `TASK`, `SCOPE`).

## Rules for every agent

1. **Stay in your paths.** Your `SCOPE` line is the list of files you may write. Shared code (`src/app/`, `src/core/`, `src/ui/`, `src/sources/` outside `live/`), the server skeleton (`server/*.py`, `server/routers/__init__.py`, `server/requirements.txt`, `tests/server/conftest.py`), contracts (`docs/common/`), `package.json` and root config are frozen after G1. If you need a change there, stop and put it under `needs:` in your report. A hook blocks writes outside your paths.
2. **The contracts are the truth.** Event names and payloads come from `docs/common/events.md`, fields and IDs from `data-model.md`, routes, slots and test IDs from `ui-contract.md`, endpoints from `api-contract.md`. Never invent a name one of them should define. Read them from disk when you start, because they can change during the build.
3. **No installs and no git writes.** Only the orchestrator runs git commands that change anything. Only the orchestrator, the scaffolder and the integrator add packages.
4. **Never start a server.** The orchestrator runs the dev server on port 5173, the API on 8000 and, in v2, SpacetimeDB on 3000. Gates start the production preview on 4173 themselves.
5. **Scripted mode runs offline.** In scripted mode the app makes no requests beyond localhost. Live data reaches the browser only through the backend.
6. **Keys stay out of the repo.** On Windows they live in `.env`. In the cloud session they come from the cloud environment's variables or network secrets (`docs/v2/contracts.md` section 1). Never print, log or commit a key, never echo a variable that holds one, and never give one a `VITE_` prefix. Only `server/` reads keys.
7. **Label what's simulated.** Every panel that still runs on scripted events shows the UI kit's `Simulated` badge.
8. **Evidence, not claims.** Done means the checks in your definition of done ran and passed, and your report shows each command and its result.
9. **Diagnose first, two fix rounds at most.** Find the root cause before changing code. Never make a check pass by weakening a test, a type or a lint rule. After two failed rounds, report `status: failed` with what you learned.
10. **Never wait on Gordon.** He's away most of the build. When a choice only he can make blocks you, use the default the docs give, list it under `needs:`, and keep going. **Check the clock** (`TZ=America/Los_Angeles date`): from 5:00 AM Sunday only running work finishes, and at 6:00 AM everything stops for the freeze.

## Commands

The scaffolder creates these in S1. The names are fixed here so every plan can rely on them.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173, proxying `/api` to port 8000. The orchestrator starts it once |
| `npm run check` | Type check, lint, unit tests and event-schema validation for the whole repo |
| `npm run check:scope -- <path> [<path> ...]` | The same checks, reporting only problems in the files or folders given |
| `npm run check:data` | Integrity tests for the mock dataset and the answer key |
| `npm run test:smoke` | Playwright: every route renders with no console errors |
| `npm run test:feature -- <slug>` | Playwright: one feature's acceptance tests, against the dev server |
| `npm run test:demo` | Playwright: plays the 60-second demo on the production build and saves a screenshot per beat |
| `npm run test:offline` | The demo with every request beyond localhost blocked, failing on any attempt |
| `npm run gate -- <gate> [<slug>]` | Runs one gate's checks (G1 to G6, with a feature or upgrade slug for G3 and G5) and writes `artifacts/gates/<gate>-<time>.md` |
| `npm run build`, `npm run preview` | Production build, served on http://localhost:4173 |
| `npm run server` | FastAPI on http://localhost:8000 (Phase 2). The orchestrator starts it once |
| `npm run test:server` | Backend tests (Phase 2) |
| `npm run export:mock` | v2, from `I2-core`: writes `src/mock/` as JSON to `artifacts/mock/mock.json`, for the Python side |
| `npm run art` | v2, from `I2-art`: draws the piece illustrations into `public/images/` |
| `python server/b11_embed/train.py` | v2, from `B11-embed`: trains and scores the embedding model. Use the `.venv` Python |

Two exist from the start: `node .claude/hooks/test-hooks.mjs` (hook self-test) and `node scripts/preflight.mjs` (G0 checks).

## Report format

Every subagent ends its work with this block, and nothing after it:

```text
REPORT
item: <plan id>/<task id>
status: done | failed | blocked
files: <each file created or changed>
checks: <command> → <result>, one per line
needs: <a change only someone else can make, or none>
lessons: <a gotcha the next agent should know, or none>
```

## Where things are

```
docs/common/        shared contracts and conventions: read before you work
docs/v2/            the v2 brief, contract changes, plan order, outside APIs and accounts
docs/tech/          offline copies of the library and outside API docs
docs/reference/     the Devpost page, hacker guide, schedule and sponsor notes
docs/harness/       runbook, v2 runbook, status, decisions, lessons, hooks spec, kickoff
docs/plans/         one plan file per stage, feature and upgrade
docs/spec/          the v1 product spec and pitch, for background
design/             the design lead's Figma handoff drops
sponsors/           one folder per sponsor track, for their judges
src/app/ src/core/ src/ui/ src/sources/    shared code, frozen after G1
src/mock/           mock data and scripted timelines
src/features/<slug>/  one folder per feature
server/             FastAPI, one router per upgrade
tests/ scripts/ artifacts/
.claude/            agents, skills, rules, hooks, settings (orchestrator only)
```

## When stuck

- Library docs are in `docs/tech/`: v2's outside APIs (Elastic, SpacetimeDB, Apify, sentence-transformers, Hugging Face Hub, Figma) and the v1 stack (Claude API, Anthropic SDKs, Claude Code, FastAPI, Vite, Tailwind, Recharts, Motion, SheetJS, openpyxl, Cloudflare Pages). `docs/tech/README.md` says which page answers what, and `docs/tech/ch13-tech-stack.md` gives the v1 versions, setup and breaking changes. The event, Devpost and sponsor notes are in `docs/reference/`. The Explore subagent can search them for you.
- Every outside API, its account, its env names and its auth: `docs/v2/apis-and-accounts.md`.
- Gotchas found earlier in this build are in `docs/harness/lessons.md`.
- The Claude API changed on Oct 21, 2026: no `temperature`, `top_p` or `top_k`, no `thinking: {"type": "enabled"}`, no prefilled assistant turns. Model IDs are `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-5-5`.
- Nessie takes its key as `?key=` and has no way to create purchases or transfers. Use deposits and withdrawals instead.

## Always loaded

@docs/common/conventions.md
@docs/common/glossary.md
