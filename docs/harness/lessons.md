# Lessons

Gotchas from agent reports, so the next agent doesn't hit them again. Only the orchestrator writes here. One line each, newest last.

Format: `- <plan id>: <the gotcha and the fix, in one sentence>`

## Known before the build

- all: Tailwind v4 has no config file. It needs the `@tailwindcss/vite` plugin and `@import "tailwindcss";` in the CSS.
- all: The animation package is `motion`, imported from `"motion/react"`, not `framer-motion`.
- all: Recharts needs `react-is` installed at the same version as React.
- all: The Claude API rejects `temperature`, `top_p`, `top_k`, `thinking: {"type": "enabled"}` and prefilled assistant turns since Oct 21, 2026.
- all: Nessie takes its key as `?key=` in the query string, can't create purchases or transfers, and some create calls return only a string, so GET the list to find the new record.
- all: SheetJS Community Edition can't write charts. Charts in the Excel export come from openpyxl on the backend.
- all: FastAPI file uploads need `python-multipart`.
- all: On Windows, hooks get file paths with backslashes. The guards normalize them, so write paths with forward slashes everywhere else.

## During the build

- S1-scaffold: Answers to people's requests are wall-clock timers outside the player timeline, emitted into the store with `at` = `player.now()`; each drops itself if `player.epoch()` changed, so seek stays deterministic.
- S1-scaffold: `tests/server/__init__.py` without `tests/__init__.py` makes pytest import the test folder as package `server`, shadowing the real one, so the file doesn't exist; upgrade tests use `from conftest import needs_key`.
- S1-scaffold: The command guard misreads heredocs containing `<` as redirects, so write files with the Write tool.
- S1-scaffold: Live adapters import `LiveAdapter` from `src/sources/types.ts`, not `src/sources/index.ts`, because the registry eagerly globs `src/sources/live/` and the index would make an import cycle.
- S1-scaffold: The demo controls row is only faded out when collapsed, so Playwright can click `demo-play` directly; clicking the page's bottom-right corner may hit the hidden bar.
- S1-scaffold: The kit's money formatter is `src/ui/formatCents.ts`; a `money.ts` next to `Money.tsx` clashes on Windows' case-insensitive disk.
- S1-scaffold: The API error shape is `from server import ApiError` (in `server/__init__.py`).
- S2-mock-data: Vitest 5's fsModuleCache serves stale transforms of files that use `import.meta.glob`, so new files under a globbed folder stay invisible to tests until `npx vitest --clearCache` ; typed calls `import.meta.glob<T>(` dodge its skip check, so `vitest.config.ts` sets `test.fsModuleCache: false`.
- S2-mock-data: A helper `.ts` in `src/mock/timelines/` would load as a timeline, so shared timeline helpers live in `src/mock/`.
- F-close: `month.closed` `feesCents` counts the gallery commission as charged (170000), while the ledger books the contract's 136000 and keeps 34000 in `receivable_gallery`.
- F-approvals: `npm run test:feature` ran no tests because `--project features` was passed as two arguments; until the integrator fix lands, use `node scripts/run-playwright.mjs features --reporter=list <specs>`.
- F-approvals: Writing stubs with fixed exports plus the assembly before spawning builders lets every builder run its spec against the real route from the start.
- F-money-map: `npx playwright test tests/features/<slug>- --project features` with `CINDIA_OUTPUT_DIR` set to your own folder also works around the test:feature bug.
- F-buyer: A Motion layout transition still runs after `player.seek()`, so compare `player.epoch()` and use duration 0 when it changed.
- F-buyer: Leads have reported verifier and builder results before those reports arrived; only state a result you have read.
- F-approvals: Smoke and feature runs against the dev server can fail from another lead's unfinished edit (HTTP 500 plus the Vite overlay); read `error-context.md` before calling a failure flaky.
- all: Feature specs that import `src/` modules type-check under `tsconfig.node.json`, which now includes `vite/client` types.
- all: Gate reports are named `<gate>-<HHMM>.md`, so two gates in the same minute overwrite each other; the evidence lines in `status.md` and `artifacts/gates/logs/` keep each result.
- F-maker-statement: `statement.issued` has no `monthId`, so the month label comes from `getById<MakerStatement>(id).monthId` with `state.month.monthId` as fallback; Money's tone class sets the color, so pass `style.color` to keep a held amount seal red.
- F-ask-cindy: The scripted answer to a person's `ask.asked` runs on a 1.2 s wall-clock timer that drops itself when the player epoch changes, so tests must seek before sending a question, never after.
- F-impact: The kit's `formatBps` drops trailing zeros (7400 becomes "74%"), so a feature that needs one decimal place keeps its own formatter.
- all: Builder hand-backs sometimes don't reach the lead; leads check files on disk and rerun the checks themselves.
- F-close: The store doesn't keep `workbook.ready`'s `at`, so the drop-in motion notes the player time when the payload first appears and renders finished after a seek (epoch changed) or while paused; the P&L sheet follows the ledger's contract commission, so its fees never equal `month.closed` `feesCents`.
- I1-demo-stage: `player.seek(ms)` replays events at exactly `ms`, so stopping "at 20.0" already shows d06's camera; stop at 19.999.
- I1-demo-stage: A module that seeks or resets the player itself must ignore its own epoch change, or it cancels itself (`startAtCatch.ts` and `videoMode.ts` set an `acting` flag).
- I1-demo-stage: Hidden demo frames stay mounted at opacity 0 and inert, so tests judge them by opacity, not `toBeVisible()`; the stage loads every feature module on mount so a camera move never waits on a lazy chunk.
- all: Playwright prints "(1.0m)" for runs over 60 s, which `scripts/gate.mjs` `playwrightSeconds()` doesn't parse, so G4 falls back to wall time.
- G4: `report.json` offFrame listed IDs outside the frame but the demo test didn't fail on them, so a green test:demo didn't mean every beat's figures were visible.
- F-maker-statement: The kit `Toast` sits at the bottom of its containing block with no placement prop, so on a phone it covers the last thing in the view; time a toast against the beat's screenshot (300 ms before the beat ends).
- all: The command guard reads paths out of Bash heredoc bodies, so edit in-scope files with Edit or Write.
- F-approvals: The owner phone clips the inbox's scroll list, so its clientHeight is taller than what shows; measure the visible part through clipping ancestors (divide out the demo stage's scale) before scrolling.
- F-reconcile: Feature tests that play the timeline in real time time out when 8 workers share the machine with other agents' runs; step through with seeks, or give real-time waits 45 s or more.
- I1-demo-stage: Put test IDs on the element that is actually on screen; the demo test checks the ID's box against every clipping ancestor and samples it for covering elements.
- all: A finished subagent may not be resumable by SendMessage ("No transcript found"); spawn a fresh agent with the full brief instead.
- F-approvals: In the owner phone the visible inbox list is about 697 px tall once margins come off; measure card heights with a scratch spec before choosing a layout.
- P2: `uvicorn --reload` on Windows didn't pick up new router files in `server/routers/`, so the orchestrator restarts the API after each new router and checks `/api/health` lists it before any live call. Stopping the npm task leaves the uvicorn process and its worker running, so stop them by PID.
- B03-proof: `reconcile_month()` returns `{type, date, payload}` items, not bare payloads.
- all: Gates that build or hit the dev server see every agent's half-written files, so a red check can come from another running agent; read the failing file's path before blaming the item under test.
- G5: A screenshot can't prove a live source played, because the scripted fallback renders the same pixels; the live-mode demo run must assert the store's `sources` for the upgrade's key.
- B01-match: Read JSON fixtures with `encoding="utf-8"`; Windows' default cp1252 can't decode the dataset's Chinese text.
- B06-workbook: openpyxl doesn't calculate formulas, so server tests evaluate their few formula shapes themselves; to dump `src/mock` to JSON, bundle `src/mock/index.ts` with `node_modules/rolldown` into the scratchpad.
- B08-approvals: Long-poll with a threading.Condition in sync routes so TestClient can test a wait woken from a second thread; reset the in-memory store in an autouse fixture.
- B10-derived: `makerPayouts` in src/mock have no date, so the receipt's `paidDate` comes from the `payout.sent` payload or the `maker_pay` ledger entry.
- G5: Every healthy upgrade with timeline events must play live in each G5 run, so a broken built-but-ungated adapter fails later G5s; `b05-scenario` and `b07-ask` have no timeline events, so their live proof comes from feature tests.
- B05-scenario: The scenario panel lists records only from `record.arrived`, which B05's endpoint doesn't return, so the adapter adds them; give each router its own `evt_live_` range (B05 starts at 500001).
- F-buyer: For a box that grows with its text, set its height from scrollHeight in useLayoutEffect keyed on the value, with no transition, so a seek never shows a jump.
- F-reconcile: Fit a scroll list to whole rows by summing `tr.offsetHeight` from the bottom in a useLayoutEffect; offsetHeight ignores the demo stage's scale and Motion transforms.
- I1-demo-stage: The studio-catch zoom is fixed at 1.35 by ui-contract.md, so reframing comes from placement: align the content area's top-left corner (`main[data-view]`) to the stage corner.
- F-scenario: Feature specs that test a scripted fallback in live mode break once the API loads that upgrade's router; hide the router from /api/health with page.route (`tests/features/scenario-lib.ts`) and test the live path in its own spec. A 4xx from /api also logs Chromium's own console error, which watchPage counts.
- F-approvals: B08 state is global and final per approval ID, so a live two-screen test renames apr_01 and apr_02 to run-unique IDs with page.route and decides whatever is left at the end; any GET of the pending list sets ownerConnected for 10 s.
- F-reconcile: The kit Panel's face fills its slot only as a flex column (className "[&>div]:flex [&>div]:flex-col", content flex 1, minHeight 0, overflowY auto); in an auto-layout table an ellipsis cell's max-width also sets its minimum width.
- all: Live specs `test.skip` when their router is missing, and gate output counts only passed and failed, so compare pass counts with the expected total before trusting a green live run.
