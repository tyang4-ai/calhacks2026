# I3-redesign · Apply a Figma design drop

Priority: P1 · Wave: V4, once per design drop, only after G4v2 · Depends on: G4v2 (`demo-ok-v2`), then a drop the planning session pushed to `main` under `design/` (commit `design: drop N`) · Area: `src/ui/`, the shell's and the stage's layout, the pitch cards, `public/images/`, `docs/common/design-system.md` · Owner: integrator, one at a time · Gate: a G4v2 rerun and the verifier's screenshot review against `design/screens/`, tag `demo-ok-v2-dN` (kept local, with its SHA in the Tags table of `status.md`)

SCOPE: src/ui/, src/app/, src/index.css, public/images/, docs/common/design-system.md, scripts/check-contrast.mjs, tests/smoke/, tests/demo/

## When it runs

- **Only after G4v2 passes** (B1-26). A drop that lands earlier waits on `main` until then. The tour and its gate come first, because a demo that runs beats a better look.
- **One integrator at a time.** This plan's SCOPE overlaps I2-kit, I2-shell, I2-tour and I2-art, so no I3 spawn runs beside any of them, beside another I3 spawn, or beside an integrator change asked for under needs. G4v2 reruns alone.
- **Drops come to `main` under `design/`.** Only the planning session writes `design/` (fix-plan 1.9). The build session and its agents read it and never edit it.

## Goal

The design session's drop becomes the platform's look. The tokens, the kit, the shell's layout and the pitch cards change in one place, and every feature that uses only kit components and tokens follows without an edit. Names, routes, events, test IDs and words never change here. The contracts win on names, the design wins on how things look, and Gordon's words stay his.

- **Drop 1** brings `design/tokens.json`, `design/tokens.md` and `design/layout.md`.
- **Drop 2** brings `design/components.md`, `design/screens/`, `design/assets/`, `design/flows.md` and `design/changes.md`.

The orchestrator spawns this plan once per drop. Each spawn does only the tasks its drop has files for.

## Read first

- `design/HANDOFF.md` on `main`: the drop number, the Figma links, what's in the drop.
- `design/tokens.md` and `tokens.json`, `design/layout.md` (drop 1). `design/components.md`, `design/screens/`, `design/assets/`, `design/changes.md` (drop 2).
- `docs/common/design-system.md`: today's tokens and rules, which you rewrite to match.
- `docs/common/ui-contract.md`: sizes, frames, test IDs, the process bar, the stage's cameras and the pitch cards' test IDs. None of these change.
- `src/ui/tokens.css`, `src/ui/kit.css`, `src/ui/fonts.ts`, `src/index.css`, the kit components, the shell's chrome and surfaces in `src/app/`, and the stage in `src/app/demo/` as I2-tour left it, the pitch cards included.

The design session works in Figma, and you work from its files in `design/`. When the planning session has saved more context under `design/`, use whatever is there. You have no Figma tools yourself.

## Interfaces

- **Reads:** `design/` only (read-only for every agent).
- **Tokens:**
  - Every token in `design/tokens.json` maps onto a `--c-<group>-<name>` custom property in `src/ui/tokens.css`.
  - An existing name keeps its name and takes the new value (for example `--c-color-paper`).
  - A new token gets a new name in the same pattern.
  - `tokens.md` gives the mapping. Where it doesn't, map by role, and list each such choice in the report.
  - No component may keep a raw value that a token now covers.
- **Contrast:** `node scripts/check-contrast.mjs` reads the color pairs that `design-system.md` lists as text on a ground, and exits 1 if any falls under 4.5 to 1. Large headings may go to 3 to 1 where the design says so.
- **Fonts:** the design picks Source Sans 3 and Source Code Pro.
  - They're new packages, so they need Gordon's OK. T2 lists `@fontsource-variable/source-sans-3` and `@fontsource-variable/source-code-pro` under needs. The orchestrator checks the names on npm, asks Gordon, installs them on a yes and records it in `decisions.md`.
  - Until both are in, keep today's Inter and Fraunces. Nobody waits on Gordon (CLAUDE.md rule 10).
  - Once they're in, wire them in `src/ui/fonts.ts` with only the weights the design uses.
  - Chinese text stays on Noto Sans SC and Noto Serif SC, because neither new family covers Chinese. The Latin fonts must cover Latin Extended, accents included.
- **Kit:** each component restyles per `design/components.md` (shape, spacing, states, variants), keeping its props and its `testId` handling. A component the design adds that the kit lacks goes under needs, with the screens that use it.
- **Shell and stage layout:** the top bar, the process bar, the Sell nav and header, the page templates, the drawer, the process overlay and the stage's process panel follow `design/layout.md`. The sizes in `ui-contract.md` (the 1440 by 900 page, the 56 px top bar, the 64 px process bar, the 440 px drawer) change only if `layout.md` asks, and then `ui-contract.md` changes through the orchestrator. The demo labels L1 and L2 stay visible wherever the layout moves them.
- **The pitch cards are part of the design.** The three full-screen cards at the start of `/demo` (`pitch-card-what`, `pitch-card-why`, `pitch-card-how`, built by I2-tour) follow their screens in `design/screens/`: layout, type and color. So does the end card when the drop has a screen for it. I3 never changes their words (`src/app/demo/pitch.ts` is Gordon's), their test IDs or their timing. The Figma Slides deck that mirrors the cards stays the planning session's.
- **Illustrations:** if `design/assets/` has piece illustrations named `<pieceId>.svg`, they replace I2-art's files in `public/images/`.
  - Each must pass `npm run art -- --check` (under 30 KB, no text, no scripts, no outside references).
  - Each must also keep to I2-art's "Never drawn" list. The verifier checks the sheet that `npm run art -- --sheet` rebuilds, and the orchestrator shows it to Gordon.
  - A file that fails either check stays out and is listed in the report.
- **Layout changes in features:** `design/changes.md` items that touch a feature's own layout go in the report under needs, one line per feature, for that feature's polish round. You don't edit `src/features/`.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Drop 1. Map `design/tokens.json` onto `src/ui/tokens.css` and `src/index.css`. Write `scripts/check-contrast.mjs` and pass it | src/ui/tokens.css, src/index.css, scripts/check-contrast.mjs | drop 1 | sonnet |
| T2 | Drop 1. Fonts: list the two Fontsource packages under needs for Gordon's OK. After the orchestrator installs them, wire `src/ui/fonts.ts` | src/ui/fonts.ts | T1 | sonnet |
| T3 | Drop 1. The shell's and the stage's layout per `design/layout.md`: the top bar, the process bar, the Sell nav and header, the page templates, the drawer, the process overlay and the stage's process panel | src/app/chrome/AppChrome.tsx, src/app/chrome/ProcessOverlay.tsx, src/app/chrome/Drawers.tsx, src/app/surfaces/ShopSurface.tsx, src/app/surfaces/SellSurface.tsx, src/app/surfaces/MakerSurface.tsx, src/app/surfaces/StoreSurface.tsx, src/app/demo/stage.module.css | T1 | opus |
| T4 | Drop 2. Restyle the kit component by component per `design/components.md`: frames first, then cards, then agent and data views, then badges and chat. The gallery (`/dev/kit`) shows each in its new look | src/ui/ (every component file, kit.css, gallery.tsx) | drop 2, T1 | opus |
| T5 | Drop 2. Piece illustrations from `design/assets/` into `public/images/`, checked with `npm run art -- --check`, then `npm run art -- --sheet` for the review | public/images/ | drop 2 | sonnet |
| T6 | The drop with the pitch screens. Restyle the three pitch cards, and the end card when it has a screen, in the files I2-tour made for them in `src/app/demo/`, leaving `pitch.ts` untouched | the pitch card component and styles in `src/app/demo/`, src/app/demo/EndCard.tsx | T1 | sonnet |
| T7 | Each drop. Rewrite `docs/common/design-system.md` to the new look (the idea, color, type, space, motion, kit list, words on screen), keeping its rules on contrast, the second cue, reduced motion and the player clock. Run `npm run test:smoke` and `npm run test:demo` once, then save the screenshots for the verifier's review against `design/screens/`. Fix the demo tests' visual expectations only where a size the contract allows has changed | docs/common/design-system.md, tests/smoke/, tests/demo/ | T3, T4 or T6 | sonnet |

## Acceptance

- Given drop 1, when T1 to T3 are done, then:
  - `node scripts/check-contrast.mjs` exits 0,
  - `npm run check` and `npm run test:smoke` exit 0,
  - `/dev/kit` shows the kit in the new tokens.
- Given drop 2, when T4 and T5 are done, then:
  - every kit component matches its entry in `design/components.md` in the gallery,
  - every piece shows its new illustration, or I2-art's with the reason listed,
  - `npm run art -- --check` exits 0.
- Given the pitch screens, when T6 is done, then each pitch card matches its screen in layout, type and color, `pitch-card-what`, `pitch-card-why` and `pitch-card-how` still show in their beats, and `src/app/demo/pitch.ts` is byte-identical to before the drop.
- Given either drop, when the orchestrator reruns G4v2 alone (`npm run build`, `npm run test:demo` three times, `npm run test:offline`), then it passes with the same On screen IDs and figures as before the drop.
- Given the verifier's review of `artifacts/demo/<beat>.png` against `design/screens/`, then each beat's page matches its design screen in layout, color and type, or the differences are listed with their cause: a feature's own layout, which goes to that feature's polish round, or a contract size kept on purpose.
- Given `git diff` for this item, then:
  - no file under `src/features/`, `src/mock/`, `src/core/` or `docs/common/` except `design-system.md` changed,
  - `src/app/demo/pitch.ts` didn't change,
  - no test ID, route or on-screen label's wording changed.

## Out of scope

- Feature layouts. The report lists them as needs, and each feature's lead gets one polish round under G3.
- Contract changes to names, routes, events, slots or test IDs.
- The pitch cards' words, which are Gordon's, and the Slides deck, which is the planning session's.
- Installing packages. Fonts go under needs.
- Editing anything in `design/`. It's read-only.

## Contract additions needed

Settled in `docs/v2/contracts.md` section 11: `scripts/check-contrast.mjs`, and the tag `demo-ok-v2-dN` for a G4v2 rerun after drop N. On the cloud the tag stays local, with its SHA in `status.md`, and Gordon pushes it from Windows at the freeze (fix-plan 1.9).
