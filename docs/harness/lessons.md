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
