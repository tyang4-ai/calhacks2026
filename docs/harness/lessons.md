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
