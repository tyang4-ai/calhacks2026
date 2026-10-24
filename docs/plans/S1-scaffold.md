# S1-scaffold · App skeleton, event engine, UI kit, scripts

Priority: P0 · Wave: S1 · Depends on: G0 · Folder: shared code, root config, server skeleton, `scripts/`, `tests/smoke/`, `tests/demo/`, `tests/offline/`, `public/` · Made real by: none

## Goal

Every route renders an empty but finished-looking shell in the Silk and ink look, with the four device frames, the demo controls and a placeholder in every slot. Features plug in later without touching any of it, and every command in CLAUDE.md works.

## Read first

- `docs/common/conventions.md`, all of it, especially the folder table and "Tests that run side by side"
- `docs/common/events.md`: the envelope, every event type, the player, the store, sources, live replacement and requests from people
- `docs/common/data-model.md`: entities, units and IDs, for `src/core/types.ts`
- `docs/common/design-system.md`: tokens, type, motion, the UI kit list
- `docs/common/ui-contract.md`: routes, surfaces, the studio console, slots, the feature module, demo controls, camera states, language, test hooks and test IDs
- `docs/common/demo-script.md`: beat IDs and times, video mode and start at the catch
- `docs/harness/hooks-spec.md`: what `check:scope` must accept
- `ch13-tech-stack.md` in the vault docs folder: versions and setup
- G1 in `docs/common/definition-of-done.md`

## Interfaces

- **Reads:** nothing at runtime. `src/mock/` doesn't exist until S2, so nothing in S1 imports it directly. Timelines and the mock exports the registry needs are found with `import.meta.glob`, which returns nothing until S2 adds them, so the build passes before S2.
- **Exports from `src/core/`:** the types (`CindiaEvent`, `EventType`, `Payloads`, `SourceKey`, `Text`, every entity in `data-model.md`), `validateEvent()`, `player`, `emit()`, `useCindia()`, `getState()`, and the feature types `FeatureModule`, `SlotProps`, `SlotId`, `SurfaceId` and `CameraId` in `src/core/featureTypes.ts`. Features import shared code only from `src/core/`, `src/ui/` and `src/sources/`, so the feature types live in core.
- **Exports from `src/sources/`:** `setMode()`, `useMode()`, `useSourceHealth()`, the `LiveAdapter` type, and `loadTimeline(id)`.
- **Exports from `src/ui/`:** every component in the design-system kit list, `formatCents()`, `chartTheme`, and the motion helpers that take the player's time.
- **Mock exports the registry reads** (S2 writes them): `curatedSet` from `src/mock/catalog.ts`, `cannedAnswers` and `fallbackAnswer` from `src/mock/ask.ts`, and `scenarioReplies` from `src/mock/scenario.ts`.
- **Feature module:** exactly as `ui-contract.md` gives it. The shell finds `src/features/*/index.ts` with `import.meta.glob`, takes each default export, and loads each feature lazily inside its own error boundary and `Suspense`.
- **Routes, slots, frames, controls and camera IDs:** exactly as `ui-contract.md` lists them.
- **Test hooks:** `window.__cindia = { player, store, emit }` in every build, where `store` is `{ getState, subscribe, reset }`. Nothing else is exposed.

## Tasks

The scaffolder does these in order. Each task's files belong to it alone.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Project files and installs | `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`, `src/vite-env.d.ts` | G0 | opus |
| T2 | Core: types, validation, player, store, reducers, test hooks | `src/core/**` | T1 | opus |
| T3 | Sources: registry, scripted source, live replacement, requests, mode | `src/sources/*.ts` and their tests (not `src/sources/live/`) | T2 | opus |
| T4 | UI kit and fonts | `src/ui/**`, `src/index.css` | T1 | opus |
| T5 | App shell: routes, surfaces, slots, feature loader, demo controls | `src/main.tsx`, `src/app/**`, `public/**` | T2, T3, T4 | opus |
| T6 | Scripts and npm scripts | `scripts/*.mjs`, `scripts/lib/**`, `scripts/server_selftest.py` (not `preflight.mjs` or `secrets-scan.mjs`) | T1 | opus |
| T7 | Playwright config and test harnesses | `playwright.config.ts`, `tests/smoke/**`, `tests/demo/**`, `tests/offline/**` | T5, T6 | opus |
| T8 | Server skeleton | `server/__init__.py`, `server/main.py`, `server/config.py`, `server/routers/__init__.py`, `server/requirements.txt`, `tests/server/__init__.py`, `tests/server/conftest.py` | T1 | opus |

### T1 · Project files and installs

- **Don't run `npm create vite`.** It prompts in a folder that isn't empty, and it fetches a package the command guard blocks. Write the react-ts template's files by hand instead: `package.json` with `"type": "module"`, the three tsconfig files with the template's settings (strict, `noEmit`, project references), `index.html` with `<div id="root">` and `lang="en"`, and `.oxlintrc.json`.
- Install with exact versions (`--save-exact`). Where the stack note gives a version, use it. Where it doesn't, take the latest that installs cleanly with the pinned ones, and the lockfile records it:
  ```text
  npm install --save-exact react@19.3.1 react-dom@19.3.1 react-is@19.3.1 motion@14.6.0 recharts@3.10.1 https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz react-router @fontsource-variable/inter @fontsource-variable/fraunces @fontsource/noto-serif-sc @fontsource/noto-sans-sc
  npm install --save-exact -D vite@8.3.5 @vitejs/plugin-react typescript@6 @types/react @types/react-dom tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vitest @playwright/test oxlint
  npx playwright install chromium
  ```
- No other packages. No state library, no CSS framework beyond Tailwind, no schema library.
- `vite.config.ts`: the React and Tailwind plugins, `server: { port: 5173, strictPort: true, proxy: { "/api": "http://localhost:8000" } }`, `preview: { port: 4173, strictPort: true }`.
- `vitest.config.ts`: Node environment, includes `src/**/*.test.ts` and `tests/data/**/*.test.ts`, `passWithNoTests: true`.

### T2 · Core

- `src/core/types.ts`: every entity and field in `data-model.md`, with `Text` and the ID string types.
- `src/core/events.ts`: `EventType`, `Payloads`, `CindiaEvent`, `Source`, `SourceKey`, `Party`, `ChartSpec`, exactly as `events.md` writes them.
- `src/core/featureTypes.ts`: `FeatureModule`, `SlotProps`, `SlotId`, `SurfaceId` and `CameraId`, exactly as `ui-contract.md` writes them.
- `src/core/validate.ts`: `validateEvent(e)` checks the type, the envelope and every payload field and its type, with no new dependency. It returns a list of problems.
- `src/core/player.ts`: the `Player` interface from `events.md`. Its own clock on `requestAnimationFrame`, speeds 1, 2, 4 and 8, `seek()` that replays events up to a time without animation. In Node tests it runs on a fake clock.
- `src/core/store.ts`: `emit()`, `useCindia()` on `useSyncExternalStore`, `getState()`, `subscribe()`, `reset()`. State keys exactly as `events.md` lists them. `lang` is `"auto" | "en" | "zh"` and starts at `"auto"`. `mode` starts at `"scripted"`.
- `src/core/reducers/`: one reducer per event type in `events.md`, grouped by area (buyer, money, month, agent, approvals, close, proof, ask, demo, scenario). Each is idempotent per entity ID. A second `approval.granted` for the same approval changes nothing.
- `src/core/testHooks.ts`: `installTestHooks()` sets `window.__cindia = { player, store, emit }`, with `store` as `{ getState, subscribe, reset }`. `src/main.tsx` calls it in every build.
- `src/core/*.test.ts`: for every event type, a test that applies it once and twice and checks the state. Tests for the player's play, pause, reset, seek and speed. Tests for `validateEvent()` on a good and a bad event of every type.

### T3 · Sources

- `src/sources/registry.ts`: finds adapters in `src/sources/live/*.ts` with `import.meta.glob`. An empty folder is fine. In live mode, for an event with a `key` that has a healthy adapter, it calls `produce()` with an 8-second timeout and emits the result with `source: "live"`. On an error, a timeout or an empty result, it emits the scripted event and logs why. It records `sources[key]` in the store.
- `src/sources/requests.ts`: answers requests from people, per the "Requests from people" table in `events.md`. When `concierge.asked`, `ask.asked` or `scenario.loaded` arrives with `source: "user"`:
  - In scripted mode, it emits the scripted answer 1.2 seconds later on the player clock: `concierge.answered` from `curatedSet`, `ask.answered` from the matching entry in `cannedAnswers` (or `fallbackAnswer` when none matches), or the `scenarioReplies` events.
  - In live mode, it tries the adapter for the request's key first, with the same 8-second timeout, and falls back to the scripted answer.
  - It ignores requests with `source: "scripted"`, whose answers are already in the timeline.
  - A question matches a canned answer when it equals one of the answer's questions after trimming, lowercasing and removing punctuation, in either language.
- `src/sources/scripted.ts`: plays a timeline through the player into `emit()`.
- `src/sources/timelines.ts`: `loadTimeline(id)` finds `src/mock/timelines/<id>.ts` with `import.meta.glob`. Missing timelines give an empty timeline, so the app runs before S2.
- `src/sources/mode.ts`: `setMode("scripted" | "live")`, `useMode()`, and `useSourceHealth()`, which polls each adapter's `health()` while live mode is on. A `?mode=live` query sets live mode for tests.
- `src/sources/*.test.ts`: a fake adapter that succeeds, one that times out (fake timers), one that throws and one that returns nothing. Only the first replaces the scripted event. For requests: the scripted answer arrives 1.2 seconds later, a live adapter's answer replaces it, a failing adapter falls back to it, and a scripted request gets no answer.

### T4 · UI kit and fonts

- `src/ui/tokens.css`: every color, space, corner and motion token in `design-system.md` as `--c-<group>-<name>`.
- `src/index.css`: `@import "tailwindcss";`, then the tokens and the font imports. Tailwind's theme maps to the tokens, so features can use either.
- `src/ui/fonts.ts`: imports only the weights `design-system.md` lists, from the Fontsource packages. Nothing loads from the network.
- One file per kit component in `design-system.md`: `Panel`, `Button`, `Money`, `Thread`, `Seal`, `MakerMark`, `Badge` (with the `Simulated` variant reading "Simulated 模拟"), `Flag`, `EvidenceCard`, `ShareBar`, `LedgerTable`, `Toast`, `PhoneFrame`, `ConsoleFrame`, `LangToggle`, plus `chartTheme.ts`, `money.ts` (`formatCents()`, the only money formatter), and `motion.ts` (helpers that take the player's time).
- Every component takes a `testId` prop and puts it on its root element as `data-testid`.
- `Panel` takes the source keys its content renders. It shows the `Simulated` badge (test ID `simulated-badge`) while any of those keys is `"scripted"` in the store's `sources`.
- `prefers-reduced-motion` is honored as `design-system.md` says.

### T5 · App shell

- **Routes,** in `src/app/routes.tsx` with `react-router`: every route in `ui-contract.md`. An unknown route or studio view redirects to `/demo`. `/demo` renders a placeholder the integrator replaces in I1: the four frames side by side, scaled to fit, inside an element with the test ID `demo-stage`.
- **URL parameters,** read by the shell:
  - `/demo?video=1` hides the demo controls (I1 adds the cold open and the end card).
  - `/demo?start=catch` seeks to the `beat.started` of `d07-catch` and plays, the same as `demo-start-at-catch`. It does nothing while no timeline is loaded.
  - `/studio/:view?drawer=ask` opens the ask drawer, and `?drawer=audit&ref=<entity id>` opens the audit drawer for that entity. Drawers open and close from the URL only, with no store state. Esc, the close button and switching views remove the parameter. One drawer at a time.
- **Surfaces** in `src/app/surfaces/`, each in its kit frame with its `frame-...` test ID, at the sizes in `ui-contract.md`: the buyer phone, the owner phone, the maker phone (`/maker/:makerId`), and the studio console with its top bar (the studio's name, Cindy's latest `agent.acted` line, the Ask Cindy button that sets `?drawer=ask`, the language toggle), its view rail in the contract's order, its view area (main two thirds and side one third where a view has a side slot), and its two 400 px drawers.
- **Language:** the shell resolves the store's `lang` for each surface. With `"auto"`, the buyer and studio surfaces get `"en"`, and the owner and maker surfaces get `"zh"`. With `"en"` or `"zh"`, every surface gets that one. The toggles cycle `auto`, `en`, `zh`. Slots get the resolved value as `SlotProps.lang`.
- **Slots:** `src/app/Slot.tsx` renders the feature that fills the slot inside an error boundary and `Suspense`, or the empty placeholder with its `slot-...` test ID, saying what will go there in the surface's language. A feature that throws shows "This panel failed to load" in its slot, and the rest of the surface keeps working. The wrapper carries `data-slot="<slot id>"` and `data-slot-state="empty" | "filled" | "error"`, which only the shell's own smoke test reads.
- **Feature loader,** `src/app/featureLoader.ts`: `import.meta.glob("../features/*/index.ts")`, lazy. A module whose `id` doesn't match its folder is skipped with a console warning.
- **Demo controls (F18),** `src/app/controls/DemoControls.tsx`: every control, test ID and key in `ui-contract.md`. Play and pause are one button that swaps its label and test ID. The keys work on every route except while a text input has focus. The bar collapses to one button and expands on hover or focus. In live mode the mode toggle shows a dot per source key, filled when its adapter is healthy. On every route the controls drive the same player with the `demo` timeline loaded.
- **Placeholder images** `public/images/pc_01.svg` to `public/images/pc_12.svg`: a plain silk-colored square with a thin ink border and the words "Photo coming", so pieces render without a broken image or a console error until Gordon supplies photos. The mock data points at these paths.
- `src/main.tsx` mounts the app and calls `installTestHooks()`.
- No feature code, no mock data, no fetch calls.

### T6 · Scripts

Every name in the CLAUDE.md Commands table goes into `package.json` under exactly that name:

| Script | Runs |
|---|---|
| `dev` | `vite` |
| `check` | `node scripts/check.mjs` |
| `check:scope` | `node scripts/check-scope.mjs` |
| `check:data` | `vitest run tests/data` |
| `test:smoke` | `node scripts/run-playwright.mjs smoke` |
| `test:feature` | `node scripts/test-feature.mjs` |
| `test:demo` | `node scripts/run-playwright.mjs demo` |
| `test:offline` | `node scripts/run-playwright.mjs offline` |
| `gate` | `node scripts/gate.mjs` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |
| `server` | `node scripts/server.mjs` |
| `test:server` | `node scripts/test-server.mjs` |

- `check.mjs`: the TypeScript build check, `oxlint`, `vitest run`, and validation of every timeline in `src/mock/timelines/` (none before S2). It prints one summary line per step and exits 1 if any step fails.
- `check-scope.mjs`: takes one or more files, folders or globs. It expands `*` itself, since `cmd.exe` doesn't. It runs the same steps and reports only problems in files under those paths: TypeScript diagnostics filtered by file, `oxlint` on those paths, the Vitest tests in or related to them, and timeline validation when a path is under `src/mock/`. A path that doesn't exist yet counts as no files and gets a note, not an error.
- `run-playwright.mjs <project>`: the only script besides `gate.mjs` that starts the preview. For `smoke` and `features`, it uses the dev server when `http://localhost:5173` answers. If it doesn't, it builds, serves the preview on 4173 for the run, then stops it. For `demo` and `offline`, it always builds and serves the preview on 4173, then stops it. Each run sets its own output folder under `test-results/`.
- `test-feature.mjs <slug>`: runs `tests/features/<slug>-*.spec.ts` through `run-playwright.mjs features`.
- `gate.mjs <gate> [slug]`: runs the commands `definition-of-done.md` lists for that gate and writes `artifacts/gates/<gate>-<HHMM>.md`, one evidence line per check. G1 also checks that every command in the CLAUDE.md table exists in `package.json`. G3 with a slug is the per-feature gate, and without one the wave gate. G4 times each of three `test:demo` runs against 75 seconds. G5 runs the upgrade's server tests, its contract test and its live test, then G4 in scripted and in live mode. G6 adds `node scripts/secrets-scan.mjs` and a clean `git status`. Exit 1 on any failed check.
- `server.mjs`: starts `.venv` Python with `-m uvicorn server.main:app --reload --host 127.0.0.1 --port 8000`, using `.venv\Scripts\python.exe` on Windows and `.venv/bin/python` elsewhere.
- `test-server.mjs`: runs `pytest tests/server -q` with the `.venv` Python, treats "no tests collected" as a pass, then runs `scripts/server_selftest.py`, which checks `GET /api/health` with FastAPI's TestClient.
- No Bash-only syntax anywhere, per `conventions.md`.

### T7 · Playwright

- `playwright.config.ts`: projects `smoke`, `features`, `demo` and `offline`. The base URL comes from `run-playwright.mjs`. No `webServer` block, since the wrapper starts the preview. Chromium only, never downloaded by a test.
- `tests/smoke/`: every route renders with no console errors, including `/studio/<each view>`, both drawers from the URL, and `/maker/mkr_01`. On every surface, every slot's wrapper is `empty` or `filled`, never `error`. Before any feature exists, every placeholder test ID is visible. Fonts and images load from localhost only. `window.__cindia` exists.
- `tests/demo/`: a harness the integrator fills in I1. In S1 it opens `/demo`, checks `demo-stage`, the four frames and the controls, presses play and reset, and saves one screenshot to `artifacts/demo/`.
- `tests/offline/`: the same run with every request whose host isn't `localhost` or `127.0.0.1` blocked, failing on any attempt.
- Tests find elements by test ID, wait for a test ID or a store state through `window.__cindia`, and never sleep for a fixed time.

### T8 · Server skeleton

- `server/main.py`: the FastAPI app. `GET /api/health` returns `{ "ok": true }`. It imports every module in `server/routers/` and includes each one's `router`, so an upgrade never edits this file. It turns errors into the error shape in `api-contract.md`.
- `server/config.py`: loads `.env` from the repo root with python-dotenv and offers `get_key(name)` and `has_key(name)`. It never prints, logs or returns a key in a response.
- `server/requirements.txt`, pinned: `fastapi[standard]==0.159.1`, `anthropic==2.1.0`, `openpyxl==3.1.5`, and `httpx`, `python-dotenv` and `pytest` at the versions that install.
- Create `.venv` with `python -m venv .venv` (on Windows, `py -3 -m venv .venv` if `python` isn't on the PATH), then install the requirements with `.venv`'s own Python: `-m pip install -r server/requirements.txt`.
- `tests/server/conftest.py`: a `client` fixture with TestClient, and a `live` marker that skips when the key it names is missing.

## Acceptance

- Given a fresh clone with the S1 work in place, when the scaffolder runs `npm run check`, `npm run build` and `npm run test:smoke`, then each exits 0.
- Given no dev server is running, when `npm run test:smoke` runs, then it serves the preview build on 4173 itself, passes, and stops the preview.
- Given every route in `ui-contract.md`, when it renders, then there are no console errors and every empty slot shows its `slot-...` test ID.
- Given `/demo`, when the page loads, then `demo-stage`, `frame-buyer`, `frame-studio`, `frame-owner`, `frame-maker` and `demo-controls` are visible, and play, pause, reset, speed, mode and language respond to clicks and to their keys.
- Given the store's `lang` at `auto`, when `/demo` renders, then the buyer and studio surfaces are in English and the owner and maker surfaces in Chinese. One press of `demo-lang-toggle` turns every surface English, and a second turns every surface Chinese.
- Given `/studio/month?drawer=ask`, when the page loads, then the ask drawer is open, and Esc closes it and removes the parameter.
- Given a fake live adapter that times out, when its event plays in live mode, then the scripted event is emitted after 8 seconds and the panel keeps `simulated-badge`.
- Given an `ask.asked` with `source: "user"` in scripted mode, when 1.2 seconds pass on the player clock, then an `ask.answered` arrives.
- Given `node .claude/hooks/test-hooks.mjs`, when it runs, then every case passes, including a builder's write to a frozen file being denied.
- Given `npm run test:server`, when it runs, then it exits 0 and the health self-test passes.
- Given `npm run gate -- G1`, when it runs, then it writes `artifacts/gates/G1-<HHMM>.md` and finds every CLAUDE.md command in `package.json`.

## Out of scope

- Features, mock data, timelines, contracts and live adapters.
- The demo stage's camera states, beat label, cold open and end card, which are I1.
- Starting the dev server or the API, which the orchestrator does.
- Any change to `.claude/`, `CLAUDE.md`, `docs/`, `scripts/preflight.mjs` or `scripts/secrets-scan.mjs`.
