# I3-redesign · Apply a Figma design drop

Priority: P1 · Wave: V4, once per design drop · Depends on: a drop on branch `design`, copied onto `main` under `design/` by the orchestrator · Area: `src/ui/`, the shell's layout, `public/images/`, `docs/common/design-system.md` · Owner: integrator · Gate: a G4v2 rerun and the verifier's screenshot review against `design/screens/`, tag `demo-ok-v2-dN`

SCOPE: src/ui/, src/app/, src/index.css, public/images/, docs/common/design-system.md, scripts/check-contrast.mjs, tests/smoke/, tests/demo/

## Goal

The design session's drop becomes the app's look. The tokens, the kit and the shell's layout change in one place, and every feature that uses only kit components and tokens follows without an edit. Names, routes, events and test IDs never change here. The contracts win on those, and the design wins on how things look.

- **Drop 1** brings `design/tokens.json`, `design/tokens.md` and `design/layout.md`.
- **Drop 2** brings `design/components.md`, `design/screens/`, `design/assets/`, `design/flows.md` and `design/changes.md`.

The orchestrator spawns this plan once per drop. Each spawn does only the tasks its drop has files for.

## Read first

- `design/HANDOFF.md` on `main`: the drop number, the Figma links, what's in the drop.
- `design/tokens.md` and `tokens.json`, `design/layout.md` (drop 1). `design/components.md`, `design/screens/`, `design/assets/`, `design/changes.md` (drop 2).
- `docs/common/design-system.md`: today's tokens and rules, which you rewrite to match.
- `docs/common/ui-contract.md`: sizes, frames, test IDs, the process bar. None of these change.
- `src/ui/tokens.css`, `src/ui/kit.css`, `src/ui/fonts.ts`, `src/index.css`, the kit components, the shell's chrome and surfaces in `src/app/`.

The design session works in Figma, and you work from its files in `design/`. When the orchestrator has the Figma connector, it may have saved more context under `design/`. Use whatever is there. You have no Figma tools yourself.

## Interfaces

- **Reads:** `design/` only (read-only for every agent).
- **Tokens:**
  - Every token in `design/tokens.json` maps onto a `--c-<group>-<name>` custom property in `src/ui/tokens.css`.
  - An existing name keeps its name and takes the new value (for example `--c-color-paper`).
  - A new token gets a new name in the same pattern.
  - `tokens.md` gives the mapping. Where it doesn't, map by role, and list each such choice in the report.
  - No component may keep a raw value that a token now covers.
- **Contrast:** `node scripts/check-contrast.mjs` reads the color pairs that `design-system.md` lists as text on a ground, and exits 1 if any falls under 4.5 to 1. Large headings may go to 3 to 1 where the design says so.
- **Fonts:** if the design picks families that aren't installed, list each Fontsource package under needs, for the orchestrator to install. Then wire them in `src/ui/fonts.ts` with the weights the design uses. Until they're in, keep today's fonts. The fonts must cover Simplified Chinese and Latin Extended, including macrons and accents.
- **Kit:** each component restyles per `design/components.md` (shape, spacing, states, variants), keeping its props and its `testId` handling. A component the design adds that the kit lacks goes under needs, with the screens that use it.
- **Shell layout:** the top bar, the process bar, the Sell nav, the page templates and the drawer follow `design/layout.md`. The sizes in `ui-contract.md` (the 1440 by 900 page, the 56 px top bar, the 64 px process bar, the 440 px drawer) change only if `layout.md` asks, and then `ui-contract.md` changes through the orchestrator.
- **Illustrations:** if `design/assets/` has piece illustrations named `<pieceId>.svg`, they replace I2-art's files in `public/images/`. Each must still pass `npm run art -- --check` (under 30 KB, no text, no scripts, no outside references). A file that fails stays out and is listed in the report.
- **Layout changes in features:** `design/changes.md` items that touch a feature's own layout go in the report under needs, one line per feature, for that feature's polish round. You don't edit `src/features/`.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Drop 1. Map `design/tokens.json` onto `src/ui/tokens.css` and `src/index.css`. Write `scripts/check-contrast.mjs` and pass it | src/ui/tokens.css, src/index.css, scripts/check-contrast.mjs | drop 1 | sonnet |
| T2 | Drop 1. Fonts: list missing Fontsource packages under needs. After the orchestrator installs them, wire `src/ui/fonts.ts` | src/ui/fonts.ts | T1 | sonnet |
| T3 | Drop 1. The shell's layout per `design/layout.md`: the top bar, the process bar, the Sell nav and header, the page templates, the drawer, the process overlay | src/app/chrome/AppChrome.tsx, src/app/chrome/ProcessOverlay.tsx, src/app/chrome/Drawers.tsx, src/app/surfaces/ShopSurface.tsx, src/app/surfaces/SellSurface.tsx, src/app/surfaces/MakerSurface.tsx, src/app/surfaces/StoreSurface.tsx | T1 | opus |
| T4 | Drop 2. Restyle the kit component by component per `design/components.md`: frames first, then cards, then agent and data views, then badges and chat. The gallery (`/dev/kit`) shows each in its new look | src/ui/ (every component file, kit.css, gallery.tsx) | drop 2, T1 | opus |
| T5 | Drop 2. Piece illustrations from `design/assets/` into `public/images/`, checked with `npm run art -- --check` | public/images/ | drop 2 | sonnet |
| T6 | Each drop. Rewrite `docs/common/design-system.md` to the new look (the idea, color, type, space, motion, kit list, words on screen), keeping its rules on contrast, the second cue, reduced motion and the player clock. Run `npm run test:smoke` and `npm run test:demo` once, then save the screenshots for the verifier's review against `design/screens/`. Fix the demo tests' visual expectations only where a size the contract allows has changed | docs/common/design-system.md, tests/smoke/, tests/demo/ | T3 or T4 | sonnet |

## Acceptance

- Given drop 1, when T1 to T3 are done, then:
  - `node scripts/check-contrast.mjs` exits 0,
  - `npm run check` and `npm run test:smoke` exit 0,
  - `/dev/kit` shows the kit in the new tokens.
- Given drop 2, when T4 and T5 are done, then:
  - every kit component matches its entry in `design/components.md` in the gallery,
  - every piece shows its new illustration, or I2-art's with the reason listed,
  - `npm run art -- --check` exits 0.
- Given either drop, when the orchestrator reruns G4v2 (`npm run build`, `npm run test:demo` three times, `npm run test:offline`), then it passes with the same On screen IDs and figures as before the drop.
- Given the verifier's review of `artifacts/demo/<beat>.png` against `design/screens/`, then each beat's page matches its design screen in layout, color and type, or the differences are listed with their cause: a feature's own layout, which goes to that feature's polish round, or a contract size kept on purpose.
- Given `git diff` for this item, then no file under `src/features/`, `src/mock/`, `src/core/` or `docs/common/` except `design-system.md` changed. No test ID or route changed.

## Out of scope

- Feature layouts. The report lists them as needs, and each feature's lead gets one polish round under G3.
- Contract changes to names, routes, events, slots or test IDs.
- Installing packages. Fonts go under needs.
- Editing anything in `design/`. It's read-only.

## Contract additions needed

- `scripts/check-contrast.mjs`, the contrast check, as a command the gate may call. `design-system.md` lists the text and ground pairs it reads.
- The tag `demo-ok-v2-dN` for a G4v2 rerun after drop N. It's in `docs/harness/v2-runbook.md` but not in contracts section 10.
