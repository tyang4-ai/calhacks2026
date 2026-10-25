# I2-shell · The desktop shell, the process bar mount and the Phase A stage

Priority: P0 · Wave: V1 · Depends on: R0-reskin, I2-core (first spawn, with `src/core/nav.ts`), I2-kit T1 · Area: `src/app/`, `index.html`, `public/robots.txt`, `tests/smoke/`, `tests/demo/`, `tests/offline/` · Owner: integrator · Gate: G1b, with I2-core and I2-kit

SCOPE: src/app/, src/main.tsx, src/index.css, index.html, public/robots.txt, tests/smoke/, tests/demo/, tests/offline/

## Goal

Every v2 route renders a finished-looking desktop page:
- the top bar with the Shop and Sell switch, Help and the site-wide demo notice (A2 L1),
- the process bar,
- the page's slots, each showing its placeholder until a feature fills it.

Old links redirect. `/demo` keeps playing the v1 story, with R0's names, on full-size desktop frames through the Phase A camera mapping. No build gets indexed by search engines, and the public build can't sell anything (fix-plan 1.8). G1b passes with `npm run test:demo` and `npm run test:offline` green, so `main` stays demoable from the first v2 commit.

## Read first

- `docs/common/ui-contract.md` after I2-core: Routes, Surfaces and frames, the Phase A legacy page, Slots, `SlotProps`, the process bar and views, Camera states with the Phase A mapping, Test IDs (shell rows).
- `docs/common/design-system.md` after I2-core: desktop sizes, the kit list.
- `docs/common/demo-script.md`: the v1 beats with their Phase A desktop cameras, video mode, start at the catch.
- `docs/common/events.md`: `beat.started` with `process` and `drawer`, the store keys `demo` and `log`.
- `src/core/nav.ts` from I2-core: the route builders, `navigate`, `setProcess`, `openDrawer` and `registerNavigator`.
- The on-screen labels L1, L2 and L6 (`docs/v2/contracts.md` section 12, merged into `docs/common/glossary.md` by I2-core). The label table wins on wording in both languages.
- `docs/v2/fix-plan.md` sections 1.1 (names) and 1.8 (the public site).
- The current shell:
  - `src/app/routes.tsx`, `surfaces/`, `Slot.tsx`, `featureLoader.ts`, `lang.ts`, `strings.ts`, `useDrawer.ts`, `stageScale.ts`, `studioInfo.ts`,
  - `src/app/demo/` (all of it), `src/app/controls/DemoControls.tsx`.
- The current tests: `tests/smoke/`, `tests/demo/beats.ts`, `harness.ts`, `demo.spec.ts`, `modes.spec.ts`, `tests/offline/offline.spec.ts`. R0 has already put the co-op's names into `beats.ts`.
- The kit from I2-kit T1: `PageFrame` with `PAGE_WIDTH` and `PAGE_HEIGHT`, `TopNav`, `SideSwitch`, `ProcessBlock`, `Drawer`, `Tabs`, `Link`.

## Interfaces

**Reads:**
- `store.lang`, `store.agent` (Cindy's latest line for the Sell header), `store.demo` (`beatId`, `camera`, `process`, `drawer`), and `store.log` (the ID of the newest `beat.started`, for the stage override),
- `store.buyer.openPieceId` and `store.search.latestQueryId`, to give the stage's Shop frame its page,
- the studio's name (`std_dine`, which R0 put in place of `std_gu` in `studioInfo.ts`) and each maker's `lang` from `src/mock/` through `import.meta.glob`, as `studioInfo.ts` already does,
- `import.meta.env.VITE_PUBLIC_SITE`, read in one place, `src/app/site.ts`.

**Emits:** nothing. On routes, navigation, drawers and the process overlay live in the URL. On `/demo` they live in the stage.

**Navigation through `src/core/nav.ts`** (B1-2, B1-18). I2-core owns the module and its no-op defaults. T1 registers two navigators with `registerNavigator`:
- **On every route but `/demo`**, the router navigator. `navigate(path)` is a react-router navigation with no page load. `openDrawer(drawer, ref?)` sets `?drawer=`, and `ref` for `audit`. `setProcess(processId)` sets `?process=`, and `setProcess(null)` clears it.
- **On `/demo`**, the stage navigator, registered while the stage is mounted. `navigate` does nothing, because the timeline drives the page. `openDrawer` and `setProcess` set a stage override for the shown frame. The override clears at the next `beat.started` (the stage watches the newest `beat.started` ID in `store.log`) and on every seek or reset (the player's epoch changes).
- The shell's own buttons (the switch, Help, Ask Cindy) call the same functions, so they behave the same way on `/demo`. `/demo` ignores `?drawer=` and `?process=` in its own URL.

**Routes:** every row of the Routes table, with `react-router`.
- `/` and every unknown route or view redirect to `/shop`.
- `/buyer`, `/studio/:view` and `/owner` redirect to `/shop`, `/sell/:view` and `/sell/approvals`, keeping the query string.
- `/dev/kit` loads `src/ui/gallery.tsx` through `import.meta.glob` and renders its `KitGallery` inside `dev-kit-gallery` (B1-31). Until I2-kit T4 adds the gallery, the page shows one line saying it's coming, and the build still passes.

**Slot props** (B1-7, B1-17, D1-24, D1-29):
- `Slot.tsx` passes the whole `SlotProps` object to the feature, never a hand-picked list.
- The slot wrapper carries `data-slot-props`, the JSON of the props it passed (every prop but functions), on filled and empty slots alike, so a smoke test can see what a feature gets.
- `src/app/slotProps.ts` builds each slot's props from the route and the stage, as a pure function with unit tests.

| Slot | Props from the shell, beyond `surface` and `lang` |
|---|---|
| `shop.search.main` | `searchParams: { q, k }` from `?q=` and every `?k=`, with `k` an empty list when there's none. On `/demo`, the stage's rule in "The stage, Phase A" |
| `shop.piece.main`, `shop.piece.side` | `pieceId` |
| `shop.community.main` | `communityId` |
| `shop.projects.main` | `projectId`, undefined on the list |
| `shop.receipt.main` | `orderId` |
| `shop.drawer.support` | `side: "buyer"`, plus `pieceId` while a piece page is open, `orderId` while a receipt is open, and `slug` on a store page |
| `studio.drawer.support` | `side: "seller"`, plus `makerId` on a maker page |
| `studio.drawer.audit` | `refId` from `?ref=` |
| `owner.main` | `surface: "owner"`, the Sell site's language, and `refId` from `?ref=<approvalId>` on `/sell/approvals`, with no drawer needed |
| `process.bar` | `processId`, the open process or undefined |
| `process.view` | `processId` |
| `maker.main`, `maker.side` | `makerId` |
| `store.main` | `slug` |
| every slot | `publicSite: true` on the public build only |

**Surfaces,** in `src/app/surfaces/`, each a `PageFrame` with its frame test ID. Each takes what it shows as props, the drawer included, so the stage can set it without a URL:

| Surface | Component | Props | Layout |
|---|---|---|---|
| Shop (`frame-buyer`) | `ShopSurface` | `page: "home" \| "search" \| "piece" \| "community" \| "projects" \| "receipt" \| "legacy"`, the route's IDs, `drawer: "support" \| null` | `home`: `shop.home.main` above `shop.home.communities`. `search`: `shop.search.main`. `piece`: `shop.piece.main` (two thirds) and `shop.piece.side` (one third). `community`: `shop.community.main`. `projects`: `shop.projects.main`. `receipt`: `shop.receipt.main`. `legacy`: the Phase A legacy page |
| Sell (`frame-studio`) | `SellSurface` (replaces `StudioSurface`) | `view: SellView`, `drawer`, `refId`, `legacy` | A header under the top bar with the studio's name in both languages, L2 beside it, and Cindy's latest line. The left nav (`shell-nav-<view>`, 184 px) in the Routes order. The view area. Drawers `ask`, `audit` and `support`. View slots in the table below |
| Maker (`frame-maker`) | `MakerSurface` | `makerId`, `drawer`, `legacy` | `maker.main` (two thirds) and `maker.side` (one third). The `studio.drawer.support` drawer |
| Store (`frame-store`) | `StoreSurface` | `slug`, `drawer` | `store.main`, full width. The `shop.drawer.support` drawer |

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
| `approvals` | `owner.main`, with `SlotProps.surface: "owner"` and the Sell site's language | |
| `watch` | `studio.watch.main` | |

**Chrome on every page:**
- **The top bar (`shell-topnav`):**
  - left: the word Cindia and the `SideSwitch` (`shell-side-shop` goes to `/shop`, `shell-side-sell` to `/sell/overview`). Maker pages count as Sell and store pages as Shop.
  - right: L1 in small type, never hidden: "Demo. Every maker, community and story here is fictional. Nothing is for sale." (演示版。这里的每位匠人、每个社区和每个故事都是虚构的。所有物品均不出售。) Then Help (`shell-help`, which calls `openDrawer("support")`), Ask Cindy on Sell pages (`openDrawer("ask")`), and the language toggle.
  - Every frame on the stage has its own top bar, so L1 shows in the tour too.
- **The process bar** is a 64 px band under the top bar that holds the slot `process.bar`, or its placeholder `slot-process-bar`. The band has no test ID of its own. F-process renders `process-bar` inside the slot (B1-5, D1-4).
- **`?process=<processId>`** on any route opens the overlay over the page, under the process bar:
  - a centered panel, 1200 by 720, over a scrim,
  - holding the slot `process.view` with `SlotProps.processId`, or its placeholder `slot-process-view`.

  The panel and the scrim carry no `process-` test ID. F-process renders `process-view`, `process-view-close` and `process-log` inside the slot. Esc and a click on the scrim remove the parameter, so the overlay still closes while F-process is cut. An unknown process ID is ignored. Every ID in `PROCESS_IDS` works, `data` included.
- **Drawers:**
  - Shop routes and store pages: `?drawer=support` opens `shop.drawer.support`.
  - Sell routes and maker pages: `?drawer=support` opens `studio.drawer.support`.
  - Sell routes also take `?drawer=ask` and `?drawer=audit&ref=`.

  One drawer at a time, using the kit's `Drawer`. Switching pages removes the parameter. An open drawer sits above the process overlay, never under it.

**The public build** (fix-plan 1.8, A2-2):
- `src/app/site.ts` exports `PUBLIC_SITE`, true only when the build ran with `VITE_PUBLIC_SITE=1`. It's a plain flag, not a secret, and no other file reads it.
- On that build, every slot gets `publicSite: true`. The features that sell show L6, "This is the public demo. Nothing here can be bought." (这是公开演示版。这里的物品都无法购买。), where Pay was (M-buyer). Features never read `import.meta.env` themselves.
- On that build, the demo controls hide the Live switch, so the public site stays scripted.
- Builds without the flag (localhost, every gate) keep the demo checkout and the Live switch.
- On every build, `index.html` has `<meta name="robots" content="noindex">`, and `public/robots.txt` reads `User-agent: *` then `Disallow: /`.

**The Phase A legacy page** (contracts section 11, replacing the transition rule):
- The route `/shop/legacy` always renders `buyer.main` in a centered 480 px column inside `frame-buyer`, whatever fills `shop.home.main` or `shop.receipt.main`. The column keeps the v1 phone's height, 844 px, and scales down to fit the page area, so the bottom of the v1 flow is never clipped.
- Phase A maps the v1 cameras `buyer` and `receipt` to the legacy camera `shop-legacy` (`frame-buyer` on `/shop/legacy`), so the v1 demo keeps passing while F-search and M-buyer land.
- `/shop` and `/shop/receipt/:orderId` render only their v2 slots, with placeholders while those are empty.

**The Phase A legacy boxes** (B1-23). On the stage, while `store.demo.camera` is a `LegacyCameraId` (the v1 timeline), each v1 view renders at its v1 size, centered, and scaled down to fit the space the v2 page gives it, never up:
- the five v1 Sell views (`map`, `month`, `close`, `proof`, `dashboard`) in a 1192 by 744 box, v1's console view area (the 1280 by 800 console less its 56 px top bar and 88 px rail),
- `owner.main` on the approvals view and `maker.main` on the maker page in a 390 by 844 column, v1's phone.

Routes never use these boxes, so the V2 migrations build and test at full desktop size. `sell-catch`'s zoom is measured from the flag's box as it shows on screen, inside the legacy box. I2-tour removes the boxes with the legacy cameras.

**Language:**
- `SURFACE_START_LANG` gives `buyer`, `studio` and `store` English.
- The maker surface starts in the maker's own `lang` from `src/mock/people.ts`, and English when a maker isn't found. R0 makes `mkr_01` to `mkr_03` English, so the maker page opens in English (fix-plan 1.1). Chinese stays a second interface language through the toggle.
- `owner` keeps its entry, but its slot uses the Sell site's resolved language.
- Every new string, L1 and L2 included, sits in `src/app/strings.ts` in both languages. L1 and L2 take their English and Chinese word for word from contracts section 12's table, which wins on wording. L2 reads "Demo: the Sell side is open so you can look around. In a real launch, only the co-op sees or approves anything here." (演示：卖家后台对所有人开放，方便您浏览。正式上线后，只有合作社能查看或批准这里的内容。)

**The stage, Phase A:**
- The stage is the kit's `PAGE_WIDTH` by `PAGE_HEIGHT` (1440 by 900), scaled to fit and letterboxed on paper.
- All four frames stay mounted. Each `TourCameraId` but `pitch` shows exactly one frame at scale 1, and the others sit at opacity 0 and `inert`. The one exception is `sell-catch`, which zooms 1.35 to the box around `reconcile-flag` and its evidence, as v1's `studio-catch` did.
- The stage reads `store.demo.camera` and maps it through I2-core's `toTourCamera()`, which sends `buyer` and `receipt` to `shop-legacy` (B1-3). The stage keeps no mapping of its own, and the v1 timeline keeps its own camera IDs.
- The stage passes each frame its page:
  - `shop-legacy` sets the legacy page,
  - `shop-home`, `shop-search`, `shop-piece` and `shop-receipt` set `ShopSurface`'s page (the piece from `store.buyer.openPieceId`, the order `ord_001`),
  - on the search page, `shop.search.main` gets no `searchParams.q`, or only the latest query's own text (from `store.search.latestQueryId`) with its keywords, never any other text. F-search emits a `search.queried` for a `q` that differs from the latest query's text, so under this rule it never emits one on the stage,
  - `sell-*` set the Sell view,
  - `maker` sets `mkr_01`,
  - `store` sets `dine-weavers`.
- The shown frame's process view is the stage override, or else `store.demo.process`. Its drawer is the override, or else `store.demo.drawer`. The v1 timeline sets neither, so in Phase A only the override opens one. The process view opens as the same overlay, inside the shown frame.
- `demo-stage` keeps `data-camera`, set to the tour camera.
- Moves take 600 ms on the player clock and are instant under reduced motion.
- Video mode, the cold open, start at the catch, the end card and `demo-beat-label` keep v1's behavior and times.
- The `pitch` camera, the pitch cards and the tour's split layout are I2-tour's. Until then `pitch` shows no frame.

## Tasks

The integrator does every task itself, in order.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Routes and redirects, the two navigators through `registerNavigator`, the slot props builder with `?ref=` and the route IDs, `/dev/kit` through `import.meta.glob`, the URL helpers for drawers and the process overlay, and `site.ts`, each with unit tests for its pure parts | src/app/routes.tsx, src/app/App.tsx, src/app/useDrawer.ts, src/app/useProcessParam.ts, src/app/navigators.ts, src/app/slotProps.ts, src/app/slotProps.test.ts, src/app/site.ts, src/app/site.test.ts | I2-core, I2-kit T1 | opus |
| T2 | The four surfaces on `PageFrame`, each with its `drawer` prop: `ShopSurface` (with the `/shop/legacy` page), `SellSurface` with its header, L2, nav and view table, `MakerSurface`, `StoreSurface`. The legacy boxes. Retire `PhoneSurfaces.tsx` and `StudioSurface.tsx` once nothing imports them | src/app/surfaces/index.ts, src/app/surfaces/ShopSurface.tsx, src/app/surfaces/SellSurface.tsx, src/app/surfaces/MakerSurface.tsx, src/app/surfaces/StoreSurface.tsx, src/app/surfaces/LegacyBox.tsx, src/app/surfaces/views.ts, src/app/surfaces/PhoneSurfaces.tsx, src/app/surfaces/StudioSurface.tsx, src/app/studioInfo.ts | T1 | opus |
| T3 | Chrome: the top bar with the switch, L1, Help, Ask Cindy and language, then the process bar band, the process overlay and the drawers. `Slot.tsx` forwards the whole props object and writes `data-slot-props`. The public build: `publicSite` on every slot and the Live switch hidden. The `noindex` tag and `robots.txt`. Strings for every new label in both languages, the slot placeholders included | src/app/chrome/AppChrome.tsx, src/app/chrome/ProcessOverlay.tsx, src/app/chrome/Drawers.tsx, src/app/strings.ts, src/app/lang.ts, src/app/Slot.tsx, src/app/featureLoader.ts, src/app/controls/DemoControls.tsx, index.html, public/robots.txt | T2 | sonnet |
| T4 | The stage, Phase A: 1440 by 900, one frame per camera through `toTourCamera()`, `shop-legacy`, the pages per camera with the search page's `searchParams` rule, the legacy boxes while the camera is a legacy one, `sell-catch`'s zoom inside the page frame, the stage navigator and its override with the clearing rule, the process overlay and the drawer in the shown frame. Keep video mode, start at the catch and the end card working on the v1 timeline | src/app/demo/DemoStage.tsx, src/app/demo/cameras.ts, src/app/demo/cameras.test.ts, src/app/demo/stageOverride.ts, src/app/demo/stageOverride.test.ts, src/app/demo/stage.module.css, src/app/demo/BeatLabel.tsx, src/app/stageScale.ts, src/app/demo/EndCard.tsx | T2, T3 | opus |
| T5 | Smoke tests and the shared helpers (details below) | tests/smoke/routes.spec.ts, tests/smoke/shell.spec.ts, tests/smoke/lib.ts | T3 | sonnet |
| T6 | Demo and offline tests for Phase A (details below) | tests/demo/beats.ts, tests/demo/harness.ts, tests/demo/demo.spec.ts, tests/demo/modes.spec.ts, tests/offline/offline.spec.ts | T4 | opus |
| T7 | Run every v1 feature spec (`npm run test:feature -- <slug>` for all twelve). Don't edit `tests/features/`. List each failing spec in the report with its cause (a phone frame, `/owner`, a removed route), so the orchestrator routes it to M-buyer, M-approvals, M-maker-statement or M-desktop | none (report only) | T6 | sonnet |

**T5.**
- Every v2 route from the Acceptance list renders with `shell-topnav` holding L1, and every Sell view shows L2.
- Each drawer opens from the URL, on maker and store pages too.
- The slot props, read from `data-slot-props`: `pieceId` on `/shop/piece/pc_01`, `refId` on `/sell/approvals?ref=apr_01`, `pieceId` and `side` in the Shop support drawer on a piece page, `orderId` in it on a receipt, and `processId` on both process slots.
- `?process=` for every process ID, with Esc and a scrim click closing it, and no element outside a slot carrying a `process-` test ID.
- The switch, the redirects, `/robots.txt`, the `noindex` tag, and no `slot-error-` anywhere.
- The language test covers the four v2 frames. On `auto` all four start in English, then the toggle cycles.
- `lib.ts`:
  - `seekToEvent(page, type, match, offsetMs)` (B1-28). It reads `window.__cindia.player.getTimeline()`, finds the first event of `type` whose payload holds every field in `match`, pauses, seeks to that event's `at` plus `offsetMs` (default 0) and returns that time. It throws an error naming the type and the match when the timeline has no such event. Feature libs re-export it and never copy it.
  - the v2 slot IDs and the eleven process IDs, from the contracts,
  - `expectSlots(page, slots, scope?)`, where `scope` is a frame locator, so a `/demo` check counts each slot once in the shown frame (B1-35).
- The old twelve-image check leaves `routes.spec.ts`. I2-art T0's `tests/smoke/images.spec.ts` checks all 54.

**T6.**
- The frames are `frame-buyer`, `frame-studio`, `frame-maker` and `frame-store`, at 1440 wide.
- Each beat's camera goes through the Phase A mapping, imported from `src/core/featureTypes.ts` rather than copied, and the frame shown at full size is checked.
- `readScreen` and the recorder look each test ID up inside the shown frame, never the first match in the document (B1-35). The beat label stays a page-level lookup.
- `report.json` keeps the `durationMs` field that I2-core T7 added at the end of `playDemo()`. The end-of-run check is relative to it: the run's real time against that `durationMs` plus 500 ms, not a fixed 60.5 s, so the same harness serves the tour (fix-plan 1.9).
- The real-time `beat.started` check allows 250 ms, because the cloud VM runs other agents' checks at the same time (B1-27). The player-clock check stays at 100 ms. The orchestrator logs both in `decisions.md` as a planned change.
- `REQUIRED_KEYS` adds `b14-swarm: "anthropic"` and `b15-watch: "apify"`, typed as the five keys of `/api/health` (D2-7).
- `REQUIRED_SERVICES` is new: `b11-embed` and `b12-search` need `model`, and `b13-live` needs `spacetime`. `b15-watch` has no entry, because it doesn't wait on the model (B15-watch). The harness reads `services` from `/api/health` beside `keys`. It doesn't wait for an adapter whose service is down, and G5 for that upgrade fails with a message naming the service.
- Every other v1 check stays: times, On screen IDs, figures, cut handling, live mode for G5.

## Acceptance

- Given I2-core, I2-kit and this plan, when the orchestrator runs G1b (`npm run check`, `npm run test:smoke`, `npm run build`, `npm run test:demo` once, `npm run test:offline`, a verifier review), then every command exits 0.
- Given `/shop`, `/shop/search?q=wool&k=wool`, `/shop/piece/pc_01`, `/shop/community/com_dine`, `/shop/projects`, `/shop/projects/prj_01`, `/shop/receipt/ord_001`, `/store/dine-weavers`, `/maker/mkr_01` and `/sell/<each of the eleven views>`, when each renders, then:
  - `shell-topnav` is visible with L1 in it, and so is the page's frame,
  - `process-bar` or its placeholder `slot-process-bar` is visible,
  - every slot on the page is filled or shows its `slot-` placeholder,
  - there are no console errors.
- Given any Sell view, then its header shows the studio's name with L2 beside it.
- Given `/buyer`, `/studio/month?drawer=ask` and `/owner`, then they land on `/shop`, `/sell/month?drawer=ask` and `/sell/approvals`.
- Given a click on `shell-side-sell` from `/shop`, then the page is `/sell/overview`. A click on `shell-side-shop` returns to `/shop`.
- Given `shell-help` on `/shop/piece/pc_01`, then `?drawer=support` is set and `shop.drawer.support` is open with `side: "buyer"` and `pieceId: "pc_01"`. On a Sell page or a maker page it opens `studio.drawer.support` with `side: "seller"`. On a store page it opens `shop.drawer.support`.
- Given `/shop/receipt/ord_001?drawer=support`, then the drawer's slot props hold `orderId: "ord_001"`.
- Given `/sell/approvals?ref=apr_01`, then `owner.main`'s slot props hold `refId: "apr_01"`, and no drawer is open.
- Given `/shop/piece/pc_01`, then `shop.piece.main` and `shop.piece.side` hold `pieceId: "pc_01"`, whether filled or empty.
- Given `?process=swarm` on any page, then the overlay shows the `process.view` slot (its placeholder `slot-process-view` until F-process lands), and both process slots hold `processId: "swarm"`. Esc or a click on the scrim removes the parameter.
- Given `/robots.txt`, then it reads `User-agent: *` and `Disallow: /`. Given any page, then its head holds `<meta name="robots" content="noindex">`.
- Given `site.test.ts` and `slotProps.test.ts`, then `PUBLIC_SITE` is true only for `VITE_PUBLIC_SITE=1`, and with the flag on, every slot's props hold `publicSite: true`.
- Given the v1 timeline on `/demo`, when `npm run test:demo` plays it, then:
  - each beat shows its Phase A tour camera's frame at full size,
  - the v1 views sit in their legacy boxes, unclipped and uncovered,
  - every On screen ID and figure from `demo-script.md` passes, looked up in the shown frame,
  - `artifacts/demo/report.json`'s `endedAtWallMs` is within the timeline's `durationMs` plus the gate's load allowance (fix-plan 1.9).
- Given `/demo` paused in a Shop beat, when `shell-help` in the shown frame is clicked, then that frame's support drawer opens, the URL doesn't change, and the next `beat.started` closes it. A `navigate()` call or a kit `Link` click on `/demo` changes nothing.
- Given `/demo?video=1` and `/demo?start=catch`, then they behave as in v1, on the desktop frames.
- Given the stage on its search page, then `shop.search.main`'s `data-slot-props` hold no `q`, or the latest query's own text, and the store gains no `search.queried` with `source: "user"`.
- Given a `test:demo` run, then `artifacts/demo/report.json` holds `durationMs` and `endedAtWallMs`, and the end-of-run check reads that `durationMs`.
- Given `/maker/mkr_01` with the language on `auto`, then the maker page is in English, the maker's own `lang` after R0, and the toggle switches it to Chinese.
- Given `/dev/kit`, then `dev-kit-gallery` shows every kit component with no console errors.
- Given `seekToEvent(page, "beat.started", { beatId: "d07-catch" })`, then the player is paused at that event's `at`. Given an event the timeline lacks, then it throws an error naming the type and the match.
- Given T7's report, then every v1 feature spec is either passing or listed with its cause and the migration plan that fixes it.

## Out of scope

- Features. Slots stay empty until their leads fill them. The process blocks and views are F-process.
- The v2 tour: its timeline, the `pitch` camera and the pitch cards, the split layout, and the removal of `/shop/legacy`, the legacy cameras and the legacy boxes, which are I2-tour.
- Any edit to `tests/features/`, `src/features/` or `src/core/`. A needed core change goes under needs.
- Restyling to the Figma design, which is I3-redesign.
- Deploying the public site and its sandbox market, which is D-deploy.

## Contract additions needed

None. Each is settled in `docs/v2/contracts.md`:
- section 1: `VITE_PUBLIC_SITE`, the public-build flag (value `1`, not a secret, read only by `src/app/site.ts`),
- section 4: the `store` camera's page, `/store/dine-weavers`, and the shell rendering only the slot containers `slot-process-bar` and `slot-process-view` for the process test IDs,
- section 11, Navigation and slot props: `registerNavigator` in `src/core/nav.ts` and the `/demo` behavior (`navigate` does nothing, and `openDrawer` and `setProcess` set a stage override that the next `beat.started` or a seek clears), `SlotProps.publicSite?`, `refId` on `owner.main`, `?drawer=support` on Shop routes, on store pages (`shop.drawer.support`, with `slug`) and on maker pages (`studio.drawer.support`, with `makerId`), and `pieceId` and `orderId` on `shop.drawer.support`,
- section 11, Shell and the tour: the Phase A legacy page with its 844 px column scaled to fit, the Phase A legacy boxes, the overlay's size, `/dev/kit` with `dev-kit-gallery`, and the Sell nav and header,
- section 11, Tests: `seekToEvent(page, type, match, offsetMs)` (D1-34).
