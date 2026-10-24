---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "src/**/*.css"
  - "tests/**/*.ts"
---

# Frontend rules

Stack: React 19.3 with TypeScript at the version the Vite template pins, Vite 8.3, Tailwind CSS 4.3, Motion 14.6, Recharts 3.10, SheetJS 0.20.3. Versions and setup are in `ch13-tech-stack.md` in the vault docs folder.

- **Tailwind v4:** the `@tailwindcss/vite` plugin plus `@import "tailwindcss";` in the main CSS file. There's no `tailwind.config.js` and no `@tailwind` directives. If classes do nothing, check those two first.
- **Design tokens** are CSS custom properties named `--c-<group>-<name>`, defined only in `src/ui/`.
- **Motion:** the package is `motion`, imported from `"motion/react"`. Never `framer-motion`.
- **Recharts** needs `react-is` at the same version as React.
- **SheetJS** comes from the cdn.sheetjs.com 0.20.3 tarball, not npm's 0.18.5. The free edition writes formulas but not charts or styles. A formula goes in a cell's `f` field without the leading `=`, and a cell outside `ws["!ref"]` isn't written until you extend the range. A native Excel chart needs openpyxl on the backend.
- **No Claude SDK in the browser,** and never `dangerouslyAllowBrowser`. The browser talks to the backend through `/api`, which Vite proxies to port 8000.
- **Env vars:** only names starting with `VITE_` reach the browser, and no secret ever gets that prefix.
- **Scripted mode makes no request beyond localhost.** Data comes from `src/mock/` through the scripted source, and events go through the store API in `src/core/`. Features never call `fetch`. Live data arrives only through an adapter in `src/sources/live/`.
- **UI kit first:** use the component from `src/ui/` whenever one exists, including the `Simulated` badge on every panel still fed by scripted events.
- **Money** arrives as integer cents and is formatted only by the UI kit.
- **Test IDs** come only from `ui-contract.md`. Use `data-testid` exactly as listed.
- **Determinism:** nothing the demo shows uses unseeded randomness, `Date.now()` or the wall clock. Demo time comes from the scripted timeline. Animations finish inside the beat times in `demo-script.md`.
- **Features plug in:** a feature exports one module from `src/features/<slug>/index.ts`, imports nothing from another feature's folder, and has no top-level side effects, because the shell loads it lazily inside an error boundary.
- **Playwright tests** select by `data-testid`, wait for a test ID or an event instead of a fixed sleep, and never download browsers.
