# UI contract

Read by every feature, the integrator and the verifier. It fixes the routes, the four surfaces, the slots features plug into, the feature module type, the demo controls, the camera states and every test ID that something outside one feature relies on. The shell in `src/app/` implements it in S1, and features fill its slots.

## Routes

| Route | Shows |
|---|---|
| `/` | Redirects to `/demo` |
| `/demo` | The demo stage (I1): several surfaces in frames, moved by the camera. `?video=1` turns on video mode, `?start=catch` starts at the catch |
| `/buyer` | The buyer phone on its own |
| `/studio/:view` | The studio console on its own, on one of its views: `map`, `month`, `close`, `proof`, `dashboard`. `?drawer=ask` or `?drawer=audit&ref=<entity id>` opens a drawer |
| `/owner` | The owner phone on its own |
| `/maker/:makerId` | One maker's phone. The demo uses `mkr_01` |

An unknown route or view redirects to `/demo`. The demo controls overlay every route.

## Surfaces

| Surface ID | Frame | Size (px) | Starts in | Holds |
|---|---|---|---|---|
| `buyer` | `PhoneFrame`, test ID `frame-buyer` | 390 by 844 | English | Slot `buyer.main` |
| `studio` | `ConsoleFrame`, test ID `frame-studio` | 1280 by 800 | English | The view rail, one view at a time, two drawers |
| `owner` | `PhoneFrame`, test ID `frame-owner` | 390 by 844 | Chinese | Slot `owner.main` |
| `maker` | `PhoneFrame`, test ID `frame-maker` | 390 by 844 | Chinese | Slot `maker.main` |

On its own route a surface renders its frame at full size, centered on the paper ground. On `/demo` the stage places and scales the frames (camera states below).

### The studio console

- **Top bar (56 px):** the studio's name in both languages, Cindy's latest `agent.acted` line, the "Ask Cindy" button that opens the ask drawer, and the language toggle.
- **View rail (left, 88 px):** one entry per view, in this order: Money (`map`), Month (`month`), Close (`close`), Proof (`proof`), Dashboard (`dashboard`). An entry whose slots are all empty still shows, with its placeholder view.
- **The view area** shows one view. A view's layout is fixed by the shell. A view with a `side` slot gives `main` two thirds of the width and `side` one third.
- **Drawers** slide in from the right, 400 px wide, over the view: `ask` for Ask Cindy and `audit` for the audit trail. One drawer at a time. Esc or the close button shuts it.

## Slots

| Slot ID | Surface and place | Feature | Wave | Source keys its panels render |
|---|---|---|---|---|
| `buyer.main` | The whole buyer phone | `buyer` | W1 | `b09-concierge`, `b10-derived`, `b04-bank` |
| `studio.map.main` | View `map` | `money-map` | W1 | `b04-bank` |
| `studio.month.main` | View `month`, left two thirds | `reconcile` | W1 | `b01-match`, `b02-explain` |
| `studio.month.side` | View `month`, right third | `scenario` | W2 | `b05-scenario` |
| `studio.close.main` | View `close`, left two thirds | `close` | W1 | `b06-workbook` |
| `studio.close.side` | View `close`, right third | `impact` | W1 | `b10-derived` |
| `studio.proof.main` | View `proof` | `proof` | W1 | `b03-proof` |
| `studio.dashboard.main` | View `dashboard` | `dashboard` | W2 | `b10-derived` |
| `studio.drawer.ask` | The ask drawer | `ask-cindy` | W1 | `b07-ask` |
| `studio.drawer.audit` | The audit drawer | `audit` | W2 | `b10-derived` |
| `owner.main` | The whole owner phone | `approvals` | W1 | `b08-approvals`, `b02-explain`, `b04-bank` |
| `maker.main` | The whole maker phone | `maker-statement` | W1 | `b10-derived` |

- **An empty slot** renders a quiet placeholder with the test ID `slot-` plus the slot ID with dots turned into dashes, for example `slot-studio-month-side`. It says what will go there, in the surface's language.
- A feature fills only the slots in its row. Two features never share a slot.

## Feature modules

```ts
type SurfaceId = "buyer" | "studio" | "owner" | "maker";
type SlotId =
  | "buyer.main"
  | "studio.map.main" | "studio.month.main" | "studio.month.side"
  | "studio.close.main" | "studio.close.side" | "studio.proof.main"
  | "studio.dashboard.main" | "studio.drawer.ask" | "studio.drawer.audit"
  | "owner.main" | "maker.main";

interface SlotProps {
  surface: SurfaceId;
  lang: "en" | "zh";        // already resolved by the shell, see Language
}

interface FeatureModule {
  id: string;               // the feature's slug, the same as its folder name
  slots: Partial<Record<SlotId, React.ComponentType<SlotProps>>>;
}
```

- Each `src/features/<slug>/index.ts` default-exports one `FeatureModule`. The types come from `src/core/featureTypes.ts`, since features import only from `src/core/`, `src/ui/` and `src/sources/`.
- **Loading:** the shell finds every module with `import.meta.glob("../features/*/index.ts")` and loads each one lazily. A module whose `id` doesn't match its folder is skipped with a console warning, and the smoke test fails on it.
- **Isolation:** each slot renders inside its own error boundary and `Suspense`. A feature that throws shows a small "This panel failed to load" note in its slot, with the test ID `slot-error-` plus the slot ID with dots turned into dashes, and the rest of the surface keeps working. The smoke test fails if any `slot-error-` element is on screen.
- Features read state only through `useCindia(selector)` and write only through `emit(event)`, both from `src/core/`. They never import from another feature's folder.
- Features route between their own screens with internal state, not URLs. The routes above belong to the shell.

## Demo controls (F18, built in S1)

A small bar fixed to the bottom right of every route, test ID `demo-controls`. It collapses to a single button and expands on hover or focus. Video mode hides it.

| Control | Test ID | Does | Key |
|---|---|---|---|
| Play | `demo-play` | `player.play()` | Space |
| Pause | `demo-pause` | `player.pause()` | Space |
| Reset | `demo-reset` | `player.reset()`, then reloads the `demo` timeline | R |
| Speed | `demo-speed` | Cycles 1x, 2x, 4x, 8x with `player.setSpeed()` | S |
| Scripted or live | `demo-mode-toggle` | Sets the store's `mode`. Shows "Scripted" or "Live", and in live mode a dot per source key: filled when its adapter is healthy | M |
| Language | `demo-lang-toggle` | Switches every surface, see Language | L |
| Start at the catch | `demo-start-at-catch` | Seeks to the start of `d07-catch` and plays, see `demo-script.md` | C |
| Offline indicator | `demo-offline` | Shows "Offline" when the browser has no network. Scripted mode keeps working, and live mode falls back to scripted events | none |

- Play and pause are one button that swaps its label and its test ID with the player state, so exactly one of the two test IDs is on screen.
- The keys work on every route, except while a text input has focus.
- On any route other than `/demo`, the controls drive the same player, so a tester can play the demo timeline while looking at one surface.

## Camera states (`/demo`)

The stage, test ID `demo-stage`, is a 1600 by 900 canvas scaled to fit the window, letterboxed on the paper ground. A camera state says which frames are visible, where, and at what scale. Moving between states takes 600 ms on the player clock (instant under reduced motion). The stage reads the camera from `beat.started`.

| Camera | Visible frames (scale) | Studio view and drawer |
|---|---|---|
| `buyer` | Buyer phone centered (1.0) | Not shown |
| `buyer-studio` | Buyer phone left (0.9), studio right (0.85) | `map` |
| `studio-month` | Studio centered (1.0) | `month` |
| `studio-catch` | Studio (1.35), zoomed to the reconcile panel's flag and evidence | `month` |
| `studio-owner` | Studio left (0.9), owner phone right (0.8) | `month` |
| `studio-close` | Studio centered (1.0) | `close` |
| `maker` | Maker phone `mkr_01` centered (1.0), studio dimmed behind it (0.85) | `close` |
| `receipt` | Buyer phone centered (1.0) | Not shown |

`demo-beat-label` is a quiet caption at the top left of the stage with the current beat's short title, hidden in video mode.

## Language

- The store's `lang` starts as `auto`. With `auto`, each surface uses its own starting language from the Surfaces table.
- The language toggle cycles `auto`, then `en` (every surface in English), then `zh` (every surface in Chinese), then back to `auto`.
- The shell resolves this into `SlotProps.lang`. Features never read the store's `lang` themselves.
- Every label comes from `glossary.md` or from the entity's `Text` fields in `data-model.md`. Amounts are dollars in both languages.

## Simulated badge

- Each feature panel is a kit `Panel` that declares the source keys it renders, from the Slots table.
- The panel shows the kit's `Simulated` badge, test ID `simulated-badge`, while `sources[key]` in the store is `"scripted"` for any of those keys.
- In scripted mode every panel shows the badge. A live adapter that delivers clears it for its key only.

## Test hooks

- In every build, `window.__cindia` exposes `{ player, store, emit }` from `src/core/`, so Playwright can read the clock, seek and check state. Nothing else is exposed.
- Tests find elements only by test ID. Never by text, class or position.

## Test IDs

Test IDs are `<slug>-<element>` in kebab case. A repeated element adds its entity ID: `reconcile-match-mat_001`. Shell IDs start with `demo-`, `frame-` or `slot-`. A feature may add internal test IDs in its own plan, but nothing outside that feature may rely on them.

### Shell and kit

| Test ID | Element |
|---|---|
| `demo-stage` | The demo stage canvas on `/demo` |
| `demo-beat-label` | The current beat's caption on the stage |
| `demo-controls` | The demo controls bar |
| `demo-play`, `demo-pause` | The play or pause button, whichever is showing |
| `demo-reset` | Reset |
| `demo-speed` | The speed button, its text is the current speed |
| `demo-mode-toggle` | Scripted or live switch |
| `demo-lang-toggle` | Language switch |
| `demo-start-at-catch` | Start at the catch |
| `frame-buyer`, `frame-studio`, `frame-owner`, `frame-maker` | The four surface frames |
| `slot-<slot id, dots as dashes>` | An empty slot's placeholder |
| `simulated-badge` | The kit's Simulated badge, one per panel that shows it |

### Features

| Test ID | Feature | Element |
|---|---|---|
| `buyer-concierge-input` | buyer | The concierge's text box |
| `buyer-concierge-results` | buyer | The three curated pieces |
| `buyer-story-card` | buyer | The open piece's maker story card |
| `buyer-process-timeline` | buyer | The process steps with their hours, inside the story card |
| `buyer-split-bar` | buyer | The price split bar (`ShareBar`) |
| `buyer-split-maker-share` | buyer | The maker share amount on the split bar |
| `buyer-pay-button` | buyer | Pay |
| `buyer-token` | buyer | The card token shown after tokenizing |
| `buyer-receipt` | buyer | The receipt |
| `buyer-receipt-status` | buyer | The receipt's status line, "Received" or "Paid to the maker" |
| `money-map-canvas` | money-map | The map of parties and threads |
| `money-map-balance` | money-map | The studio account's balance |
| `money-map-thread-<moveId>` | money-map | One money thread, per `money.moved` |
| `reconcile-timeline` | reconcile | The month's records arriving in date order |
| `reconcile-match-<matchId>` | reconcile | One match, per `match.made` |
| `reconcile-flag` | reconcile | The short-payment flag |
| `reconcile-evidence-contract` | reconcile | Evidence card: the gallery contract |
| `reconcile-evidence-statement` | reconcile | Evidence card: the gallery's statement |
| `reconcile-evidence-bank` | reconcile | Evidence card: the bank deposit |
| `reconcile-explanation` | reconcile | Cindy's explanation of the flag |
| `approvals-item-apr_01` | approvals | The follow-up approval card |
| `approvals-item-apr_02` | approvals | The maker payouts approval card |
| `approvals-approve-<approvalId>` | approvals | The approve button on one card |
| `approvals-seal-<approvalId>` | approvals | The seal that lands on a granted card |
| `maker-statement-total` | maker-statement | This month's income total |
| `maker-statement-lines` | maker-statement | The pieces sold and the maker's share of each |
| `maker-statement-held` | maker-statement | The held amount and why |
| `close-workbook` | close | The workbook card that drops in at the close |
| `close-download` | close | Downloads the .xlsx |
| `close-totals` | close | The month's totals |
| `proof-score` | proof | The score, "Caught 4 of 4" |
| `proof-item-<errorId>` | proof | One planted error and whether it was caught |
| `ask-cindy-input` | ask-cindy | The question box |
| `ask-cindy-answer` | ask-cindy | The latest answer |
| `ask-cindy-chart` | ask-cindy | The answer's chart, when it has one |
| `impact-maker-share` | impact | Maker share of each sale |
| `impact-days-to-payout` | impact | Days from close to payout, before and after |
| `impact-hours-saved` | impact | Bookkeeping hours saved, marked as an estimate |
