# UI contract

Read by every feature, the integrator and the verifier. It fixes the routes, the surfaces and their pages, the slots features plug into, the feature module type, navigation, the process bar and views, the demo controls, the camera states and every test ID that something outside one feature relies on. The shell in `src/app/` implements it, and features fill its slots. Desktop only.

## Routes

| Route | Shows |
|---|---|
| `/` | Redirects to `/shop` |
| `/shop` | Shop home: slots `shop.home.main` above `shop.home.communities` |
| `/shop/search` | Results: slot `shop.search.main`. Reads `?q=` and repeated `?k=` |
| `/shop/piece/:pieceId` | The piece page: `shop.piece.main` (left two thirds) and `shop.piece.side` (right third) |
| `/shop/community/:communityId` | `shop.community.main` |
| `/shop/projects`, `/shop/projects/:id` | `shop.projects.main`. The ID is a `prj_` or a `wip_` |
| `/shop/receipt/:orderId` | `shop.receipt.main` |
| `/shop/legacy` | The Phase A legacy page, until I2-tour: `buyer.main` in a centered 480 px column (Camera states) |
| `/store/:slug` | A storefront: `store.main`, full width |
| `/sell/:view` | The Sell site's views: `overview`, `listings`, `storefront`, `projects`, `map`, `month`, `close`, `proof`, `dashboard`, `approvals`, `watch`. `?drawer=ask`, `?drawer=audit&ref=<entity id>`, `?drawer=support`. `/sell/approvals?ref=<approvalId>` selects that approval |
| `/sell/approvals?screen=owner` | The owner's second screen, which B08's adapter polls for |
| `/maker/:makerId` | A maker's page: `maker.main` (left two thirds) and `maker.side` (right third). The demo uses `mkr_01` |
| `/demo` | The guided tour. `?video=1` (video mode), `?mode=present` (presenter mode), `?start=<beatId>` (`?start=catch` is the catch beat) |
| Any route `?process=<processId>` | That process's view over the page: `process.view` |
| `/buyer`, `/studio/:view`, `/owner` | Redirect to `/shop`, `/sell/:view` and `/sell/approvals`, keeping the query string |
| `/dev/kit` | `KitGallery` from `src/ui/gallery.tsx`, inside test ID `dev-kit-gallery` |
| `/market/` | The sandbox market: static pages of fictional listings in `public/market/`, outside the shell (D-deploy). The copy watch crawls only these |

- An unknown route or view redirects to `/shop`. The demo controls stay on every route.
- Every page carries L1 in the top bar. `index.html` has `<meta name="robots" content="noindex">`, and `public/robots.txt` disallows everything.
- **The public build** (`VITE_PUBLIC_SITE=1`, read only by `src/app/site.ts`): every slot gets `publicSite: true`, Pay shows L6 in its place (`buyer-pay-blocked`), and the Live switch is hidden, so the public site stays scripted. Localhost and every gate keep the demo checkout and the Live switch.

## Navigation (`src/core/nav.ts`)

- **Route builders,** each returning the matching path from the Routes table: `shopRoute()`, `searchRoute({ q, k })`, `pieceRoute(pieceId)`, `communityRoute(communityId)`, `projectsRoute(id?)`, `receiptRoute(orderId)`, `storeRoute(slug)`, `sellRoute(view, { drawer?, ref? })`, `makerRoute(makerId)`. Query values are URI-encoded, and `k` repeats once per keyword. `pieceRoute("pc_01")` is `/shop/piece/pc_01`.
- **Calls:** `navigate(path)`, `setProcess(processId | null)` and `openDrawer("ask" | "audit" | "support", ref?)`.
- **`registerNavigator(impl)`** takes `{ navigate, setProcess, openDrawer }` and returns a function that unregisters it. The shell registers a router version on every route and a stage version on `/demo`. Until a navigator is registered, the three calls are safe no-ops: they do nothing and never throw.
- On routes, `openDrawer` sets `?drawer=` (and `ref` for `audit`), and `setProcess` sets or clears `?process=`. On `/demo`, `navigate()` does nothing, and `openDrawer()` and `setProcess()` set a stage override that the next `beat.started` or a seek or reset clears. The beat's own `drawer` and `process` fields drive the tour.
- Features never touch `window.location`. They route between their own screens with internal state, and to other pages through these calls or the kit's `Link` (`to`, `testId?`, `children`: a real anchor that calls `navigate` on a plain click).

## Surfaces and frames

Desktop only. Every surface is a kit `PageFrame`, 1440 by 900, with the top bar (`shell-topnav`, 56 px) and the process bar band (64 px) above the page.

| Surface ID | Frame test ID | Starts in | Pages |
|---|---|---|---|
| `buyer` (the Shop site) | `frame-buyer` | English | Every `/shop` route |
| `studio` (the Sell site) | `frame-studio` | English | Every `/sell` view |
| `maker` | `frame-maker` | The maker's `lang` (English for `mkr_01` to `mkr_03`), with Chinese through the toggle | `/maker/:makerId` |
| `store` | `frame-store` | English | `/store/:slug` |

- `owner` stays a `SurfaceId`, so the approvals feature can tell where it renders, but it has no frame or route of its own: `owner.main` renders as the Sell site's `approvals` view, with `surface: "owner"` and the Sell site's language. `frame-owner` is retired, and `PhoneFrame` leaves the kit's public index.
- On its own route a surface renders its frame at full size. On `/demo` the stage shows one frame at a time (Camera states below).

### The page chrome

- **The top bar (`shell-topnav`, 56 px):** on the left the word Cindia and the Shop and Sell switch (`shell-side-shop` goes to `/shop`, `shell-side-sell` to `/sell/overview`; maker pages count as Sell and store pages as Shop). On the right, L1 in small type, never hidden, then Help (`shell-help`, which calls `openDrawer("support")`), Ask Cindy on Sell pages (`openDrawer("ask")`) and the language toggle. Every frame on the stage has its own top bar, so L1 shows in the tour too.
- **The process bar band,** 64 px under the top bar on every page, holds the slot `process.bar`, or its placeholder `slot-process-bar`. The band has no test ID of its own.
- **The Sell site:** a header under the top bar with the co-op's name in both languages, L2 beside it, and Cindy's latest `agent.acted` line. The left nav (`shell-nav-<view>`, 184 px) lists the views in the order of the Routes table. Then the view area. A view with a side slot gives `main` two thirds of the width and `side` one third.
- **Drawers** slide in from the right, 440 px wide (the kit's `Drawer`), over the page. One drawer at a time. Esc or the close button shuts it, and switching pages removes it.
  - Shop routes and store pages: `?drawer=support` opens `shop.drawer.support`. Help opens it.
  - Sell views and maker pages: `?drawer=support` opens `studio.drawer.support`. Help opens it.
  - Sell views also take `?drawer=ask` (Ask Cindy) and `?drawer=audit&ref=<entity id>` (the audit trail).
- **The process overlay:** `?process=<processId>` on any route opens a centered overlay, 1200 by 720, over a scrim, holding the slot `process.view` with `SlotProps.processId`, or its placeholder `slot-process-view`. The panel and the scrim carry no `process-` test ID. Esc, a click on the scrim or `process-view-close` removes the parameter. An unknown process ID is ignored. The top bar and the process bar stay visible above an open view, and a view never covers an open drawer.

### Sell views

| Sell view | Main slot | Side slot |
|---|---|---|
| `overview` | `studio.overview.main` | |
| `listings` | `studio.listings.main` | |
| `storefront` | `studio.storefront.main` | |
| `projects` | `studio.projects.main` | |
| `map` | `studio.map.main` | |
| `month` | `studio.month.main` | `studio.month.side` |
| `close` | `studio.close.main` | `studio.close.side` |
| `proof` | `studio.proof.main` | `studio.proof.side` |
| `dashboard` | `studio.dashboard.main` | |
| `approvals` | `owner.main`, with `surface: "owner"` and the Sell site's language | |
| `watch` | `studio.watch.main` | |

An entry whose slots are all empty still shows, with its placeholder view.

## Slots

| Slot ID | Page and place | Feature | Wave | Source keys its panels render |
|---|---|---|---|---|
| `buyer.main` | The Phase A legacy page `/shop/legacy` | `buyer` | W1 | `b09-concierge`, `b10-derived`, `b04-bank` |
| `studio.map.main` | Sell view `map` | `money-map` | W1 | `b04-bank` |
| `studio.month.main` | Sell view `month`, left two thirds | `reconcile` | W1 | `b01-match`, `b02-explain` |
| `studio.month.side` | Sell view `month`, right third | `scenario` | W2 | `b05-scenario` |
| `studio.close.main` | Sell view `close`, left two thirds | `close` | W1 | `b06-workbook` |
| `studio.close.side` | Sell view `close`, right third | `impact` | W1 | `b10-derived` |
| `studio.proof.main` | Sell view `proof`, left two thirds | `proof` | W1 | `b03-proof` |
| `studio.dashboard.main` | Sell view `dashboard` | `dashboard` | W2 | `b10-derived` |
| `studio.drawer.ask` | The ask drawer | `ask-cindy` | W1 | `b07-ask` |
| `studio.drawer.audit` | The audit drawer | `audit` | W2 | `b10-derived` |
| `owner.main` | Sell view `approvals` | `approvals` | W1 | `b08-approvals`, `b02-explain`, `b04-bank`, `b14-swarm`, `b15-watch` |
| `maker.main` | Maker page, left two thirds | `maker-statement` | W1 | `b10-derived` |
| `process.bar` | Under the top bar on every page | `process` | V2 | all keys |
| `process.view` | The process overlay (`?process=`), and the right third of the stage in a tour beat with `process` | `process` | V2 | the keys of that process (The process bar and views) |
| `shop.home.main` | Shop home, hero and featured | `search` | V2 | `b12-search`, `b11-embed` |
| `shop.home.communities` | Shop home, communities and projects strip | `communities` | V2 | none |
| `shop.search.main` | Results page | `search` | V2 | `b12-search`, `b11-embed` |
| `shop.piece.main` | Piece page, left two thirds | `buyer` | V2 | `b10-derived`, `b04-bank` |
| `shop.piece.side` | Piece page, right third: "Ask about this piece" | `support` | V2 | `b14-swarm`, `b13-live` |
| `shop.community.main` | Community page | `communities` | V2 | none |
| `shop.projects.main` | Projects and works in progress | `communities` | V2 | `b08-approvals` |
| `shop.receipt.main` | Receipt page | `buyer` | V2 | `b10-derived` |
| `shop.drawer.support` | The Shop support drawer (Help on Shop and store pages) | `support` | V2 | `b14-swarm`, `b13-live` |
| `store.main` | A storefront page | `storefront` | V2 | none |
| `studio.overview.main` | Sell › Overview | `seller-hub` | V2 | `b10-derived` |
| `studio.listings.main` | Sell › Listings | `seller-hub` | V2 | `b14-swarm`, `b12-search` |
| `studio.storefront.main` | Sell › Storefront builder | `storefront` | V2 | `b14-swarm` |
| `studio.projects.main` | Sell › Projects and works in progress | `communities` | V2 | `b08-approvals` |
| `studio.proof.side` | Sell › Proof, right third: the search model's score | `search` | V2 | `b11-embed` |
| `studio.watch.main` | Sell › Counterfeit watch | `watch` | V2 | `b15-watch` |
| `studio.drawer.support` | The Sell support drawer (Help on Sell views and maker pages) | `support` | V2 | `b14-swarm`, `b13-live` |
| `maker.side` | Maker page, right third: their listings, works in progress and questions from buyers | `seller-hub` | V2 | `b14-swarm` |

- **An empty slot** renders a quiet placeholder with the test ID `slot-` plus the slot ID with dots turned into dashes, for example `slot-studio-month-side`. It says what will go there, in the surface's language.
- A feature fills only the slots in its rows. Two features never share a slot.
- v1's slots stay with their features. `buyer.main` is retired when the buyer feature has moved to `shop.piece.main` and `shop.receipt.main`: M-buyer's last task deletes it, the concierge test IDs and the phone-flow specs after G4v2.

## Feature modules

```ts
type SurfaceId = "buyer" | "studio" | "owner" | "maker" | "store";
type SlotId =
  | "buyer.main"
  | "studio.map.main" | "studio.month.main" | "studio.month.side"
  | "studio.close.main" | "studio.close.side" | "studio.proof.main"
  | "studio.dashboard.main" | "studio.drawer.ask" | "studio.drawer.audit"
  | "owner.main" | "maker.main"
  | "process.bar" | "process.view"
  | "shop.home.main" | "shop.home.communities" | "shop.search.main"
  | "shop.piece.main" | "shop.piece.side" | "shop.community.main"
  | "shop.projects.main" | "shop.receipt.main" | "shop.drawer.support"
  | "store.main"
  | "studio.overview.main" | "studio.listings.main" | "studio.storefront.main"
  | "studio.projects.main" | "studio.proof.side" | "studio.watch.main"
  | "studio.drawer.support" | "maker.side";

interface SlotProps {
  surface: SurfaceId;
  lang: "en" | "zh";          // already resolved by the shell, see Language
  makerId?: string;           // the maker page (from /maker/:makerId, mkr_01 on /demo), and studio.drawer.support on a maker page
  refId?: string;             // the audit drawer (?drawer=audit&ref=), and owner.main from /sell/approvals?ref=<approvalId>
  processId?: ProcessId;      // process.bar (the open process, or undefined) and process.view
  pieceId?: string;           // the piece page, and shop.drawer.support while a piece page is open
  orderId?: string;           // the receipt page, and shop.drawer.support while a receipt is open
  slug?: string;              // the storefront page, and shop.drawer.support on a store page
  communityId?: string;       // the community page
  projectId?: string;         // the projects page, undefined on the list
  side?: "buyer" | "seller";  // the support drawers: buyer on shop.drawer.support, seller on studio.drawer.support
  searchParams?: { q?: string; k: string[] };  // shop.search.main: k is always an array, empty when the URL has none
  publicSite?: boolean;       // true on every slot of the public build only
}

interface FeatureModule {
  id: string;                 // the feature's slug, the same as its folder name
  slots: Partial<Record<SlotId, React.ComponentType<SlotProps>>>;
}

type SellView = "overview" | "listings" | "storefront" | "projects" | "map" | "month"
  | "close" | "proof" | "dashboard" | "approvals" | "watch";   // SELL_VIEWS, in route order
type StudioView = "map" | "month" | "close" | "proof" | "dashboard";  // v1's five, until I2-tour
```

- Each `src/features/<slug>/index.ts` default-exports one `FeatureModule`. The types come from `src/core/featureTypes.ts`, since features import only from `src/core/`, `src/ui/` and `src/sources/`.
- The shell forwards the whole props object to each slot, never a hand-picked list. A feature that sells shows L6 in place of Pay when `publicSite` is true.
- **Loading:** the shell finds every module with `import.meta.glob("../features/*/index.ts")` and loads each one lazily. A module whose `id` doesn't match its folder is skipped with a console warning, and the smoke test fails on it. A slot whose feature folder doesn't exist yet renders its placeholder.
- **Isolation:** each slot renders inside its own error boundary and `Suspense`. A feature that throws shows a small "This panel failed to load" note in its slot, with the test ID `slot-error-` plus the slot ID with dots turned into dashes, and the rest of the page keeps working. The smoke test fails if any `slot-error-` element is on screen.
- Features read state only through `useCindia(selector)` and write only through `emit(event)`, both from `src/core/`. They never import from another feature's folder.
- The routes above belong to the shell. Features reach them only through `src/core/nav.ts`.

## The process bar and views

| Process | Block label (en, zh) | Keys it watches |
|---|---|---|
| `search` | Vibe search, 按感觉搜索 | `b12-search`, `b11-embed` |
| `swarm` | Agent swarm, 智能体团队 | `b14-swarm`, `b13-live` |
| `checkout` | Checkout, 结账 | none (simulated card, always labeled) |
| `money` | Money, 资金 | `b04-bank` |
| `reconcile` | Reconcile, 对账 | `b01-match`, `b02-explain` |
| `approvals` | Approvals, 审批 | `b08-approvals` |
| `close` | Close, 月结 | `b06-workbook`, `b10-derived` |
| `proof` | Proof, 验证 | `b03-proof`, `b11-embed` |
| `watch` | Counterfeit watch, 仿冒监测 | `b15-watch` |
| `model` | Model, 模型 | `b11-embed` |
| `data` | Data, 数据 | `b13-live`, `b12-search`, `b11-embed` |

- The processes are `PROCESS_IDS` from `events.md`, in this order.
- A block's status is `idle` (no events yet), `working` (an event in the last 2 seconds on the player clock, while the player plays), `done`, or `attention` (an open flag, a pending approval or a counterfeit hit). It shows a count, and a Live mark when all its keys are live. The bar shows one summary, Live: N of 11, and one Simulated badge while any key is scripted.
- **Presence.** In live mode, while `b13-live` is live, the bar shows "N screens watching" from the newest `data.synced`. In scripted mode it isn't rendered.
- Clicking a block sets `?process=<id>`. Esc or `process-view-close` clears it. Every view ends with the raw event log for its event types (`process-log`), newest last: time, type, source, key. The views and block counts read the store's `log`.
- **The data view** lists the database's tables (the catalog, listings, orders, approvals, swarm runs and steps, process status and screens), each with its row count and newest rows. In live mode they come from `data.synced`, and in scripted mode from the mock data and the store.
- **Layout:** in the tour, a beat with `process` scales its frame to 0.66 on the left and shows the process view in the right third. That panel holds the `process.view` slot and has no test ID of its own. A person's `?process=` is the centered overlay in "The page chrome".
- The process feature renders every `process-` test ID. The shell renders only the slot containers and their placeholders, `slot-process-bar` and `slot-process-view`.

## Demo controls (F18, built in S1)

A small bar fixed to the bottom right of every route, test ID `demo-controls`. It collapses to a single button and expands on hover or focus. Video mode hides it.

| Control | Test ID | Does | Key |
|---|---|---|---|
| Play | `demo-play` | `player.play()` | Space |
| Pause | `demo-pause` | `player.pause()` | Space |
| Reset | `demo-reset` | `player.reset()`, then reloads the `demo` timeline | R |
| Speed | `demo-speed` | Cycles 1x, 2x, 4x, 8x with `player.setSpeed()` | S |
| Scripted or live | `demo-mode-toggle` | Sets the store's `mode`. Shows "Scripted" or "Live", and in live mode a dot per source key: filled when its adapter is healthy. Hidden on the public build | M |
| Language | `demo-lang-toggle` | Switches every surface, see Language | L |
| Start at the catch | `demo-start-at-catch` | Seeks to the start of the catch beat and plays (`d07-catch` in v1's demo, `d08-catch` in the tour), see `demo-script.md` | C |
| Offline indicator | `demo-offline` | Shows "Offline" when the browser has no network. Scripted mode keeps working, and live mode falls back to scripted events | none |

- Play and pause are one button that swaps its label and its test ID with the player state, so exactly one of the two test IDs is on screen.
- The keys work on every route, except while a text input has focus. In presenter mode Space and the right arrow play the next beat instead (Modes and starts).
- On any route other than `/demo`, the controls drive the same player, so a tester can play the demo timeline while looking at one page.

## Camera states (`/demo`)

The stage, test ID `demo-stage`, is the kit's `PAGE_WIDTH` by `PAGE_HEIGHT` (1440 by 900), scaled to fit the window and letterboxed on the paper ground. Each camera shows one frame at full stage size, and `beat.started.process` may add a process view over it. Moving between cameras takes 600 ms on the player clock (instant under reduced motion). The stage reads the camera from `beat.started`.

```ts
type TourCameraId = "pitch" | "shop-home" | "shop-search" | "shop-piece" | "shop-receipt"
  | "sell-map" | "sell-month" | "sell-catch" | "sell-approvals" | "sell-close" | "sell-proof"
  | "sell-watch" | "sell-listings" | "sell-storefront" | "maker" | "store"
  | "shop-legacy";                                     // until I2-tour removes it
type LegacyCameraId = "buyer" | "buyer-studio" | "studio-month" | "studio-catch"
  | "studio-owner" | "studio-close" | "maker" | "receipt";   // v1's eight
type CameraId = TourCameraId | LegacyCameraId;           // until I2-tour drops the legacy ones
// TOUR_CAMERA_IDS and LEGACY_CAMERA_IDS list each set, and CAMERA_IDS is both, which validate.ts uses for beat.started.camera.
// LEGACY_CAMERA_TO_TOUR and toTourCamera(id) carry the Phase A mapping below. A tour camera maps to itself.
```

| Camera | Frame and page |
|---|---|
| `pitch` | The beat's pitch card, full frame, with no Shop or Sell frame, top bar or process bar. The words come from `src/app/demo/pitch.ts`, which Gordon writes. Until he does, each card holds placeholder text marked [GORDON] in `pitch.ts`, with no label on screen, and shows L1 at its foot, since the pitch camera has no top bar |
| `shop-home` | `frame-buyer` on `/shop` |
| `shop-search` | `frame-buyer` on `/shop/search` for the latest query: `shop.search.main` gets no `searchParams.q`, or only the latest query's own text with its keywords |
| `shop-piece` | `frame-buyer` on `/shop/piece/<the open piece>`, from `store.buyer.openPieceId` |
| `shop-receipt` | `frame-buyer` on `/shop/receipt/ord_001` |
| `shop-legacy` | `frame-buyer` on `/shop/legacy`, until I2-tour |
| `sell-map`, `sell-month`, `sell-approvals`, `sell-close`, `sell-proof`, `sell-watch`, `sell-listings`, `sell-storefront` | `frame-studio` on that view |
| `sell-catch` | `frame-studio` on `month`, zoomed 1.35 to the flag and its evidence, as v1's `studio-catch` |
| `maker` | `frame-maker` on `/maker/mkr_01` |
| `store` | `frame-store` on `/store/dine-weavers` |

**The Phase A mapping,** so v1's beats keep passing on the desktop shell until I2-tour. The v1 timeline keeps its own camera IDs, and the stage maps each through `toTourCamera()`:

| v1 camera | Shown as |
|---|---|
| `buyer`, `receipt` | `shop-legacy` (`frame-buyer` on `/shop/legacy`) |
| `buyer-studio` | `sell-map` |
| `studio-month` | `sell-month` |
| `studio-catch` | `sell-catch` |
| `studio-owner` | `sell-approvals` |
| `studio-close` | `sell-close` |
| `maker` | `maker` |

- **The Phase A legacy page:** the route `/shop/legacy` always renders `buyer.main` in a centered 480 px column inside `frame-buyer`, whatever fills `shop.home.main` or `shop.receipt.main`. The column keeps the 844 px phone height and scales down to fit the page area. Filling `shop.home.main` never changes what the v1 demo sees.
- **The Phase A legacy boxes** show on the stage only while the camera is a legacy camera: v1's five Sell views in a 1192 by 744 box (v1's console view area), and `owner.main` and `maker.main` in a 390 by 844 column, each centered and scaled down to fit, never up. Routes never use these boxes.
- I2-tour deletes the legacy route, camera and boxes (`src/app/routes.tsx`, `ShopSurface.tsx`).
- All frames stay mounted on `/demo` for the whole run. A frame its camera doesn't show sits at opacity 0, `inert`, so features keep their state and tests can still find its test IDs. Tests judge whether a frame shows by its opacity, not by Playwright's `toBeVisible()`.
- Before the first `beat.started`, and after a reset, the camera is `buyer` (shown as `shop-legacy`). `demo-stage` carries the current tour camera in `data-camera`.
- `sell-catch` zooms to the box around `reconcile-flag`, its evidence cards and `reconcile-explanation`, measured as it shows on screen (inside the legacy box in Phase A), or to the view's center while the flag isn't there.
- The shown frame's process view is the stage override, or else `store.demo.process`. Its drawer is the override, or else `store.demo.drawer`. The override clears at the next `beat.started` and on every seek or reset. `/demo` ignores `?drawer=` and `?process=` in its own URL.
- `demo-beat-label` is a quiet caption on the stage with the current beat's short title, hidden in video mode.
- On `/demo` the shell's checks look only inside the frame on screen.

### Modes and starts

Until I2-tour, `/demo` plays v1's 60-second demo, and video mode, start at the catch and the end card keep the behavior and times in `demo-script.md`. The tour's modes:
- `/demo` auto-plays every beat and ends on the end card. The tests use it.
- **Video mode** (`?video=1`): a 5-second cold open at 153.999, the last millisecond of `d08-catch`, on `sell-catch` with v1's line. Then the spine with each pitch card held for 10 seconds instead of 20 (the player seeks to the next beat), the buyer and seller minutes at 1x, no controls or beat label, and the end card for 5 seconds. About 2 minutes 40 seconds, under Figma's 3-minute limit. Chapter 2 isn't in the video.
- **Presenter mode,** `/demo?mode=present`, pauses at the end of every beat. Space or the right arrow plays the next beat, and the left arrow replays the current one. After `d12-receipt` it shows the end card, and the right arrow continues into chapter 2.
- `?start=<beatId>` seeks to that beat's first event and plays from there, pausing at its end in presenter mode. `?start=catch` and the `demo-start-at-catch` control seek to `d08-catch`.
- **The end card** (`demo-end-card`) carries the search proof with L28, the planted-error score, the list of live sources with L29, L30, and one seats line: "Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money."

## Language

- The store's `lang` starts as `auto`. With `auto`, each surface uses its own starting language from the Surfaces table: English for Shop, Sell and store pages, and the maker's own `lang` on a maker page (English when the maker isn't found). `owner.main` uses the Sell site's resolved language.
- The language toggle cycles `auto`, then `en` (every surface in English), then `zh` (every surface in Chinese), then back to `auto`.
- The shell resolves this into `SlotProps.lang`. Features never read the store's `lang` themselves.
- Every label comes from `glossary.md` (its domain words and its on-screen labels L1 to L30) or from the entity's `Text` fields in `data-model.md`. Amounts are dollars in both languages.

## Simulated badge

- Each feature panel is a kit `Panel` that declares the source keys it renders, from the Slots table.
- The panel shows the kit's `Simulated` badge, test ID `simulated-badge`, while `sources[key]` in the store is `"scripted"` for any of those keys.
- In scripted mode every panel shows the badge. A live adapter that delivers clears it for its key only.
- The process bar shows one summary badge for all its blocks, and a block shows only its Live mark, never a badge of its own.

## Test hooks

- In every build, `window.__cindia` exposes `{ player, store, emit }` from `src/core/`, so Playwright can read the clock, seek and check state. Nothing else is exposed.
- Tests find elements only by test ID. Never by text, class or position. Specs seek by event, never by a fixed time (`seekToEvent` in `conventions.md`).

## Test IDs

Test IDs are `<slug>-<element>` in kebab case. A repeated element adds its entity ID: `reconcile-match-mat_001`. Shell IDs start with `demo-`, `frame-`, `shell-` or `slot-`. The tables list the test IDs that something outside their feature relies on, such as the tour's On screen IDs and the label test IDs in `glossary.md`. A feature may add internal test IDs in its own plan, but nothing outside that feature may rely on them.

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
| `demo-offline` | Offline indicator in the demo controls |
| `demo-end-card` | The end card |
| `slot-error-<slot>` | The note a slot shows when its feature fails to load, with the slot ID's dots as dashes |
| `demo-start-at-catch` | Start at the catch |
| `frame-buyer`, `frame-studio`, `frame-maker`, `frame-store` | The four surface frames. `frame-owner` is retired |
| `slot-<slot id, dots as dashes>` | An empty slot's placeholder, `slot-process-bar` and `slot-process-view` included |
| `simulated-badge` | The kit's Simulated badge, one per panel that shows it |
| `shell-topnav` | The top bar, holding L1 |
| `shell-side-shop`, `shell-side-sell` | The Shop and Sell switch |
| `shell-help` | Help, which opens the support drawer |
| `shell-nav-<view>` | One entry in the Sell site's left nav |
| `dev-kit-gallery` | The kit gallery on `/dev/kit` |
| `pitch-card-what`, `pitch-card-why`, `pitch-card-how` | The three pitch cards, rendered by the stage (I2-tour) |

### Features

| Test ID | Feature | Element |
|---|---|---|
| `buyer-concierge-input` | buyer | The concierge's text box, on the legacy page until M-buyer retires it |
| `buyer-concierge-results` | buyer | The three curated pieces, on the legacy page until M-buyer retires it |
| `buyer-story-card` | buyer | The open piece's maker story card |
| `buyer-process-timeline` | buyer | The process steps with their hours, inside the story card |
| `buyer-split-bar` | buyer | The price split bar (`ShareBar`) |
| `buyer-split-maker-share` | buyer | The maker share amount on the split bar |
| `buyer-split-compare` | buyer | The gallery comparison under the split (figure 16) |
| `buyer-verification` | buyer | The verification line on the piece page |
| `buyer-pay-button` | buyer | Pay |
| `buyer-pay-blocked` | buyer | L6 in place of `buyer-pay-button`, on the public build only |
| `buyer-project-addon` | buyer | The project contribution at checkout |
| `buyer-token` | buyer | The card token shown after tokenizing |
| `buyer-receipt` | buyer | The receipt |
| `buyer-receipt-status` | buyer | The receipt's status line, "Received" or "Paid to the maker" |
| `buyer-receipt-promise` | buyer | Under the received status: "We'll show you when Grace N. is paid." |
| `buyer-receipt-maker-note` | buyer | The maker's note on the paid receipt |
| `money-map-canvas` | money-map | The map of parties and threads |
| `money-map-balance` | money-map | The co-op account's balance |
| `money-map-balance-nessie` | money-map | Internal: the label under the balance once `b04-bank` is live, naming Nessie as its source |
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
| `ask-cindy-refs` | ask-cindy | Internal: the records the latest answer names (its `refIds`), one list item each |
| `impact-maker-share` | impact | Maker share of each sale |
| `impact-days-to-payout` | impact | Days from close to payout, before and after |
| `impact-hours-saved` | impact | Bookkeeping hours saved, marked as an estimate |
| `process-bar` | process | The process bar |
| `process-block-<processId>` | process | One block |
| `process-live-summary` | process | "Live: N of 11" |
| `process-presence` | process | "N screens watching", live mode only |
| `process-view` | process | The open process view |
| `process-view-close` | process | Closes the view |
| `process-pane-<processId>` | process | The root of each view's body |
| `process-log` | process | The raw event log at the end of a view |
| `process-search-map` | process | The embedding map in the search view |
| `process-swarm-graph` | process | The agent graph in the swarm view |
| `process-swarm-step-<stepId>` | process | One step in the swarm view |
| `process-money-diagram` | process | The money view's diagram |
| `process-model-card` | process | The model view's training summary |
| `process-data-tables` | process | The data view's tables and row counts |
| `search-input` | search | The vibe search box, on `/shop` and on `/shop/search` |
| `search-chip-<n>` | search | Keyword chip number n, from 1, in order |
| `search-submit` | search | Search |
| `search-results` | search | The results grid |
| `search-result-<pieceId>` | search | One result card |
| `search-reason-<pieceId>` | search | Why it matched |
| `search-engine` | search | Which engine answered, with the model's score when a report exists |
| `search-surprise` | search | Surprise me, on `/shop` and on `/shop/search` |
| `search-surprise-mode` | search | The mode picker: keyword, pure random, fair random |
| `search-surprise-result` | search | The drawn piece, with the method named, on `/shop` and on `/shop/search` |
| `search-surprise-rule` | search | The fair rule in one line ("Makers with fewer sales this month get a bigger chance") |
| `search-proof` | search | Sell › Proof side panel: the model's score table |
| `search-proof-row-<system>` | search | One row: keyword, base, custom, hybrid |
| `community-card-<communityId>` | communities | A community card |
| `community-page` | communities | A community page |
| `community-verification` | communities | How its makers would be verified |
| `community-protocols` | communities | What this demo keeps out, under L9 |
| `project-card-<projectId>` | communities | A project card |
| `project-progress-<projectId>` | communities | Raised against goal |
| `project-fund-<projectId>` | communities | Fund this project |
| `wip-milestone-<milestoneId>` | communities | One milestone of a work in progress |
| `wip-release-<milestoneId>` | communities | Sell side: release a milestone (proposes an approval) |
| `support-drawer` | support | Either support drawer |
| `support-input` | support | The message box |
| `support-send` | support | Send |
| `support-thread` | support | The conversation |
| `support-reply` | support | The latest reply |
| `support-agent` | support | The name of the agent whose words the latest reply is |
| `support-handoff` | support | The notice that a person is taking over |
| `support-forwarded-<questionId>` | support | The notice in the buyer's thread that the question went to the maker |
| `support-maker-answer-<questionId>` | support | The maker's own words, shown in the buyer's thread with her name |
| `seller-overview` | seller-hub | Sell › Overview |
| `seller-listing-notes` | seller-hub | The maker's notes box |
| `seller-listing-draft` | seller-hub | The drafted listing |
| `seller-listing-translated-<lang>` | seller-hub | L27 beside the draft's version in the language the notes weren't written in, `<lang>` that version's language |
| `seller-listing-check-<checkId>` | seller-hub | One check on the draft |
| `seller-listing-indexed` | seller-hub | The indexed line: the model, the index and the new dot |
| `seller-listing-approve` | seller-hub | Propose publishing (an approval) |
| `seller-maker-side` | seller-hub | The maker page's side panel |
| `seller-maker-questions` | seller-hub | Questions from buyers on the maker page |
| `seller-maker-question-<questionId>` | seller-hub | One forwarded question |
| `seller-maker-reply-<questionId>`, `seller-maker-send-<questionId>` | seller-hub | The maker's reply box and Send |
| `seller-maker-answer-<questionId>` | seller-hub | Her sent answer |
| `storefront-builder` | storefront | Sell › Storefront |
| `storefront-block-<blockId>` | storefront | One block in the builder |
| `storefront-preview` | storefront | The live preview |
| `storefront-publish` | storefront | Publish. It reads "Publish", is the owner's own decision, and emits `storefront.published` directly |
| `store-page` | storefront | A storefront page at `/store/:slug` |
| `store-footer` | storefront | The storefront's footer, with L13 |
| `watch-scan` | watch | Scan now |
| `watch-results` | watch | The hits, then every checked result |
| `watch-item-<cftId>` | watch | One hit, side by side with the co-op's piece |
| `watch-live-<cftId>` | watch | L21 on a live hit, one whose `counterfeit.flagged` came from a live source |
| `watch-similarity-<cftId>` | watch | Its text match (L19) |
| `watch-report-<cftId>` | watch | Propose a report (an approval) |
| `watch-dismiss-<cftId>` | watch | L23, with the same weight as the report button |
| `watch-fairness` | watch | The fairness line with L20 |
| `watch-claim-only-<n>` | watch | L22 on a claim-only result, which has no report button. `<n>` is the result's place in `watch.scanned`'s `results`, from 1 |
