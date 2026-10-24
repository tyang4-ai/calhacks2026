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
