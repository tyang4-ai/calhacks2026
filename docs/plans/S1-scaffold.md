# S1-scaffold · App skeleton, event engine, UI kit, scripts

Priority: P0 · Wave: S1 · Depends on: G0 · Folder: shared code, root config, server skeleton, `scripts/`, `tests/smoke/`, `tests/demo/`, `tests/offline/`, `public/` · Made real by: none

## Goal

Every route renders an empty but finished-looking shell in the Silk and ink look, with the four device frames, the demo controls and a placeholder in every slot. Features plug in later without touching any of it, and every command in CLAUDE.md works.

## Read first

- `docs/common/conventions.md`, all of it, especially the folder table and "Tests that run side by side"
- `docs/common/events.md`: the envelope, every event type, the player, the store, sources and live replacement
- `docs/common/data-model.md`: entities and units, for `src/core/types.ts`
- `docs/common/design-system.md`: tokens, type, motion, the UI kit list
- `docs/common/ui-contract.md`: routes, surfaces, slots, the feature module, test IDs, camera states
- `docs/harness/hooks-spec.md`: what `check:scope` must accept
- `ch13-tech-stack.md` in the vault docs folder: versions and setup
- G1 in `docs/common/definition-of-done.md`

## Interfaces

- **Reads:** nothing at runtime. `src/mock/` doesn't exist until S2, so nothing in S1 imports it directly. Timelines and the `getById()` lookup are found with `import.meta.glob`, which returns nothing until S2 adds them, so the build passes before S2.
- **Exports from `src/core/`:** the types (`CindiaEvent`, `EventType`, `Payloads`, `SourceKey`, `Text`, every entity in `data-model.md`), `validateEvent()`, `player`, `emit()`, `useCindia()`, `getState()`, and the feature types `FeatureModule`, `SlotProps`, `SlotId`, `SurfaceId` and `CameraId`. Features import shared code only from `src/core/`, `src/ui/` and `src/sources/`, so the feature types live in core, not in `src/app/`.
- **Exports from `src/sources/`:** `setMode()`, `useMode()`, the `LiveAdapter` type, and `loadTimeline(id)`.
- **Exports from `src/ui/`:** every component in the design-system kit list, `formatCents()`, `chartTheme`, and the motion helpers that take the player's time.
- **Feature module:** `{ id: string; slots: Partial<Record<SlotId, ComponentType<SlotProps>>> }`, with `SlotProps` `{ surface: SurfaceId; lang: "en" | "zh" }`. The shell finds `src/features/*/index.ts` with `import.meta.glob` and loads each feature lazily inside its own error boundary.
- **Routes:** `/` redirects to `/demo`, then `/demo`, `/buyer`, `/studio/:view` (`map`, `month`, `close`, `proof`, `dashboard`), `/owner`, `/maker/:makerId`.
- **Slots:** `buyer.main`, `studio.map.main`, `studio.month.main`, `studio.month.side`, `studio.close.main`, `studio.close.side`, `studio.proof.main`, `studio.dashboard.main`, `studio.drawer.ask`, `studio.drawer.audit`, `owner.main`, `maker.main`.
- **Test IDs (from `ui-contract.md`):** an empty slot shows `slot-<slot id with dots as dashes>`, for example `slot-studio-month-main`. Frames `frame-buyer`, `frame-studio`, `frame-owner`, `frame-maker`. Controls `demo-controls`, `demo-play`, `demo-pause`, `demo-reset`, `demo-speed`, `demo-mode-toggle`, `demo-lang-toggle`, `demo-start-at-catch`. The badge `simulated-badge`, which can appear once per panel. Every other test ID comes from `ui-contract.md`.

## Tasks

The scaffolder does these in order. Each task's files belong to it alone.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Project files and installs | `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`, `src/vite-env.d.ts` | G0 | opus |
| T2 | Core: types, validation, player, store, reducers | `src/core/**` | T1 | opus |
| T3 | Sources: registry, scripted source, live replacement, mode | `src/sources/*.ts` and their tests (not `src/sources/live/`) | T2 | opus |
| T4 | UI kit and fonts | `src/ui/**`, `src/index.css` | T1 | opus |
| T5 | App shell, routes, frames, slots, feature loader, demo controls | `src/main.tsx`, `src/app/**`, `public/**` | T2, T3, T4 | opus |
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
- `src/core/featureTypes.ts`: `FeatureModule`, `SlotProps`, `SlotId`, `SurfaceId`, `CameraId`, from `ui-contract.md`.
- `src/core/validate.ts`: `validateEvent(e)` checks the type, the envelope and every payload field and its type, with no new dependency. It returns a list of problems.
- `src/core/player.ts`: the `Player` interface from `events.md`. Its own clock on `requestAnimationFrame`, speeds 1, 2, 4 and 8, `seek()` that replays events up to a time without animation. In Node tests it runs on a fake clock.
- `src/core/store.ts`: `emit()`, `useCindia()` on `useSyncExternalStore`, `getState()`, `reset()`. State keys exactly as `events.md` lists them.
- `src/core/reducers/`: one reducer per event type in `events.md`, grouped by area (buyer, money, month, agent, approvals, close, proof, ask, demo, scenario). Each is idempotent per entity ID. A second `approval.granted` for the same approval changes nothing.
- `src/core/*.test.ts`: for every event type, a test that applies it once and twice and checks the state. Tests for the player's play, pause, reset, seek and speed. Tests for `validateEvent()` on a good and a bad event of every type.

### T3 · Sources

- `src/sources/registry.ts`: finds adapters in `src/sources/live/*.ts` with `import.meta.glob`. An empty folder is fine. In live mode, for an event with a `key` that has a healthy adapter, it calls `produce()` with an 8-second timeout and emits the result with `source: "live"`. On an error, a timeout or an empty result, it emits the scripted event and logs why. It records `sources[key]` in the store.
- `src/sources/scripted.ts`: plays a timeline through the player into `emit()`.
- `src/sources/timelines.ts`: `loadTimeline(id)` finds `src/mock/timelines/<id>.ts` with `import.meta.glob`. Missing timelines give an empty timeline, so the app runs before S2.
- `src/sources/mode.ts`: `setMode("scripted" | "live")`, `useMode()`. The app starts in scripted mode, and a `?mode=live` query sets live mode for tests.
- `src/sources/*.test.ts`: a fake adapter that succeeds, one that times out (fake timers), one that throws and one that returns nothing. Only the first replaces the scripted event.

### T4 · UI kit and fonts

- `src/ui/tokens.css`: every color, space, corner and motion token in `design-system.md` as `--c-<group>-<name>`.
- `src/index.css`: `@import "tailwindcss";`, then the tokens and the font imports. Tailwind's theme maps to the tokens, so features can use either.
- `src/ui/fonts.ts`: imports only the weights `design-system.md` lists, from the Fontsource packages. Nothing loads from the network.
- One file per kit component in `design-system.md`: `Panel`, `Button`, `Money`, `Thread`, `Seal`, `MakerMark`, `Badge` (with the `Simulated` variant reading "Simulated 模拟"), `Flag`, `EvidenceCard`, `ShareBar`, `LedgerTable`, `Toast`, `PhoneFrame`, `ConsoleFrame`, `LangToggle`, plus `chartTheme.ts`, `money.ts` (`formatCents()`, the only money formatter), and `motion.ts` (helpers that take the player's time). Props follow `ui-contract.md`.
- Every component takes a `testId` prop and puts it on its root element as `data-testid`.
- `SimulatedBadge` takes the source keys its panel renders, reads `sources` from the store, and shows itself while any of them is `"scripted"`. Its test ID is `simulated-badge`.
- `prefers-reduced-motion` is honored as `design-system.md` says.

### T5 · App shell

- `src/main.tsx` mounts the app. `src/app/routes.tsx` holds the routes above, with `react-router`.
- `src/app/Slot.tsx`: renders the feature that fills the slot, inside an error boundary, or the empty placeholder with its `slot-...` test ID. It wraps both in an element with `data-slot="<slot id>"`, so tests can find a slot whether it's filled or not. The error fallback uses the test ID `ui-contract.md` gives.
- `src/app/featureLoader.ts`: `import.meta.glob("/src/features/*/index.ts")`, lazy, one error boundary per feature, so one broken feature never takes down another.
- Surfaces in `src/app/surfaces/`: the buyer phone, the studio console with its five views and two drawers, the owner phone and the maker phone, each in its kit frame with its `frame-...` test ID, and each slot in the place `ui-contract.md` gives.
- `src/app/DemoStage.tsx`: the `/demo` route shows all four frames side by side with the demo controls. I1 adds the camera states and the beats later.
- `src/app/DemoControls.tsx` (F18): play, pause, reset, speed, scripted or live, 中文 or English, and start at the catch, with the test IDs above. Start at the catch seeks to the `beat.started` event of the beat `demo-script.md` marks as the catch, and does nothing while no timeline is loaded.
- An offline indicator, with the test ID `ui-contract.md` gives, that shows scripted mode works with no network.
- Placeholder images `public/images/pc_01.svg` to `public/images/pc_12.svg`: a plain silk-colored square with a thin ink border and the words "Photo coming", so pieces render without a broken image or a console error until Gordon supplies photos. The mock data points at these paths.
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
- `run-playwright.mjs <project>`: for `smoke` and `features`, it uses the dev server when `http://localhost:5173` answers. If it doesn't, it builds and serves the preview on 4173 for the run, then stops it. For `demo` and `offline`, it always builds and serves the preview on 4173, then stops it. Each run sets its own output folder under `test-results/`.
- `test-feature.mjs <slug>`: runs `tests/features/<slug>-*.spec.ts` through `run-playwright.mjs features`.
- `gate.mjs <gate> [slug]`: runs the commands `definition-of-done.md` lists for that gate and writes `artifacts/gates/<gate>-<HHMM>.md`, one evidence line per check. G1 also checks that every command in the CLAUDE.md table exists in `package.json`. G3 with a slug is the per-feature gate, and without one the wave gate. G4 times each of three `test:demo` runs against 75 seconds. G5 runs the upgrade's server tests, its contract test and its live test, then G4 in scripted and in live mode. G6 adds `node scripts/secrets-scan.mjs` and a clean `git status`. Exit 1 on any failed check.
- `server.mjs`: starts `.venv` Python with `-m uvicorn server.main:app --reload --host 127.0.0.1 --port 8000`, using `.venv\Scripts\python.exe` on Windows and `.venv/bin/python` elsewhere.
- `test-server.mjs`: runs `pytest tests/server -q` with the `.venv` Python, treats "no tests collected" as a pass, then runs `scripts/server_selftest.py`, which checks `GET /api/health` with FastAPI's TestClient.
- No Bash-only syntax anywhere, per `conventions.md`.

### T7 · Playwright

- `playwright.config.ts`: projects `smoke`, `features`, `demo` and `offline`. The base URL comes from `run-playwright.mjs`. No `webServer` block, since the wrapper starts the preview. Chromium only, never downloaded by a test.
- `tests/smoke/`: every route renders with no console errors. On every surface, every slot's `data-slot` element is present and shows either its feature or its placeholder, never the error fallback. Before any feature exists, every placeholder test ID is visible. Fonts load from localhost only.
- `tests/demo/`: a harness the integrator fills in I1. In S1 it opens `/demo`, checks the controls and frames, presses play and reset, and saves one screenshot to `artifacts/demo/`.
- `tests/offline/`: the same run with every request whose host isn't `localhost` or `127.0.0.1` blocked, failing on any attempt.

### T8 · Server skeleton

- `server/main.py`: the FastAPI app. `GET /api/health` returns `{ "ok": true }`. It imports every module in `server/routers/` and includes each one's `router`, so an upgrade never edits this file. It turns errors into the error shape in `api-contract.md`.
- `server/config.py`: loads `.env` from the repo root with python-dotenv and offers `get_key(name)` and `has_key(name)`. It never prints, logs or returns a key in a response.
- `server/requirements.txt`, pinned: `fastapi[standard]==0.159.1`, `anthropic==2.1.0`, `openpyxl==3.1.5`, and `httpx`, `python-dotenv` and `pytest` at the versions that install.
- Create `.venv` with `python -m venv .venv` (on Windows, `py -3 -m venv .venv` if `python` isn't on the PATH), then install the requirements with `.venv`'s own Python: `-m pip install -r server/requirements.txt`.
- `tests/server/conftest.py`: a `client` fixture with TestClient, and a `live` marker that skips when the key it names is missing.

## Acceptance

- Given a fresh clone with the S1 work in place, when the scaffolder runs `npm run check`, `npm run build` and `npm run test:smoke`, then each exits 0.
- Given no dev server is running, when `npm run test:smoke` runs, then it serves the preview build on 4173 itself, passes, and stops the preview.
- Given every route, when it renders, then there are no console errors and every empty slot shows its `slot-...` test ID inside its `data-slot` element.
- Given the `/demo` route, when the page loads, then `frame-buyer`, `frame-studio`, `frame-owner`, `frame-maker` and `demo-controls` are visible, and play, pause, reset, speed, mode and language respond.
- Given a fake live adapter that times out, when its event plays in live mode, then the scripted event is emitted after 8 seconds and the panel keeps `simulated-badge`.
- Given `node .claude/hooks/test-hooks.mjs`, when it runs, then every case passes, including a builder's write to a frozen file being denied.
- Given `npm run test:server`, when it runs, then it exits 0 and the health self-test passes.
- Given `npm run gate -- G1`, when it runs, then it writes `artifacts/gates/G1-<HHMM>.md` and finds every CLAUDE.md command in `package.json`.

## Out of scope

- Features, mock data, timelines, contracts and live adapters.
- The demo beats and camera moves, which are I1.
- Starting the dev server or the API, which the orchestrator does.
- Any change to `.claude/`, `CLAUDE.md`, `docs/`, `scripts/preflight.mjs` or `scripts/secrets-scan.mjs`.
