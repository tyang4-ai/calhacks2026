# I2-shell · The desktop shell, the process bar mount and the Phase A stage

Priority: P0 · Wave: V1 · Depends on: I2-core (first spawn), I2-kit T1 · Area: `src/app/`, `tests/smoke/`, `tests/demo/`, `tests/offline/` · Owner: integrator · Gate: G1b, with I2-core and I2-kit

SCOPE: src/app/, src/main.tsx, src/index.css, tests/smoke/, tests/demo/, tests/offline/

## Goal

Every v2 route renders a finished-looking desktop page:
- the top bar with the Shop and Sell switch and Help,
- the process bar,
- the page's slots, each showing its placeholder until a feature fills it.

Old links redirect. `/demo` keeps playing the v1 story, now on full-size desktop frames through the Phase A camera mapping. G1b passes with `npm run test:demo` and `npm run test:offline` green, so `main` stays demoable from the first v2 commit.

## Read first

- `docs/common/ui-contract.md` after I2-core: Routes, Surfaces and frames, the transition rule, Slots, `SlotProps`, the process bar and views, Camera states with the Phase A mapping, Test IDs (shell rows).
- `docs/common/design-system.md` after I2-core: desktop sizes, the kit list.
- `docs/common/demo-script.md`: the v1 beats with their Phase A desktop cameras, video mode, start at the catch.
- `docs/common/events.md`: `beat.started` with `process`, and `store.demo`.
- The current shell:
  - `src/app/routes.tsx`, `surfaces/`, `Slot.tsx`, `lang.ts`, `strings.ts`, `useDrawer.ts`, `stageScale.ts`, `studioInfo.ts`,
  - `src/app/demo/` (all of it), `src/app/controls/DemoControls.tsx`.
- The current tests: `tests/smoke/`, `tests/demo/beats.ts`, `harness.ts`, `demo.spec.ts`, `modes.spec.ts`, `tests/offline/offline.spec.ts`.
- The kit from I2-kit T1: `PageFrame`, `TopNav`, `SideSwitch`, `ProcessBlock`, `Drawer`, `Tabs`.

## Interfaces

**Reads:**
- `store.lang`, `store.agent` (Cindy's latest line for the Sell header), `store.demo` (`beatId`, `camera`, `process`),
- `store.buyer.openPieceId` and `store.search.latestQueryId`, to give the stage's Shop frame its page,
- `pieces` and the people in `src/mock/` through `import.meta.glob` (a maker's `lang`, the studio's name), as `studioInfo.ts` already does.

**Emits:** nothing. Navigation and drawers live in the URL only.

**Routes:** every row of the Routes table, with `react-router`.
- `/` and every unknown route or view redirect to `/shop`.
- `/buyer`, `/studio/:view` and `/owner` redirect to `/shop`, `/sell/:view` and `/sell/approvals`, keeping the query string.
- `/dev/kit` renders the kit's `KitGallery` inside `dev-kit-gallery`.

**Surfaces,** in `src/app/surfaces/`, each a `PageFrame` with its frame test ID. Each takes what it shows as props, so the stage can set it without a URL:

| Surface | Component | Props | Layout |
|---|---|---|---|
| Shop (`frame-buyer`) | `ShopSurface` | `page: "home" \| "search" \| "piece" \| "community" \| "projects" \| "receipt"` and the route's IDs | `home`: `shop.home.main` above `shop.home.communities`. `search`: `shop.search.main` with `SlotProps.searchParams`. `piece`: `shop.piece.main` (two thirds) and `shop.piece.side` (one third). `community`: `shop.community.main`. `projects`: `shop.projects.main` with `projectId` (undefined on the list). `receipt`: `shop.receipt.main` with `orderId` |
| Sell (`frame-studio`) | `SellSurface` (replaces `StudioSurface`) | `view: SellView`, `drawer`, `refId` | A header under the top bar with the studio's name in both languages and Cindy's latest line. The left nav (`shell-nav-<view>`, 184 px) in the Routes order. The view area. Drawers `ask`, `audit` and `support`. View slots in the table below |
| Maker (`frame-maker`) | `MakerSurface` | `makerId` | `maker.main` (two thirds) and `maker.side` (one third) |
| Store (`frame-store`) | `StoreSurface` | `slug` | `store.main`, full width |

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
  - right: Help (`shell-help`, which sets `?drawer=support` on the current route and opens that side's support drawer), Ask Cindy on Sell pages (sets `?drawer=ask`), and the language toggle.
- **The process bar (`process-bar`)** under the top bar holds the slot `process.bar`, or its placeholder.
- **`?process=<processId>`** on any route opens the overlay `process-view` over the page, under the process bar:
  - a centered panel, 1200 by 720, over a scrim,
  - holding the slot `process.view` with `SlotProps.processId`,
  - with `process-view-close`.
  
  Esc and the close button remove the parameter. An unknown process ID is ignored.
- **Drawers:**
  - Shop routes: `?drawer=support` opens `shop.drawer.support` with `side: "buyer"`.
  - Sell routes: `?drawer=ask`, `?drawer=audit&ref=`, and `?drawer=support` (`studio.drawer.support`, `side: "seller"`).
  
  One drawer at a time, using the kit's `Drawer`. Switching pages removes the parameter.

**The transition rule:**
- While `shop.home.main` has no feature and `buyer.main` does, the Shop `home` page renders `buyer.main` in a centered 480 px column instead.
- The `receipt` page does the same while `shop.receipt.main` has no feature.

`slotHasFeature()` from the feature loader decides.

**Language:**
- `SURFACE_START_LANG` gives `buyer`, `studio` and `store` English.
- The maker surface starts in the maker's own `lang` from `src/mock/people.ts` (Chinese for `mkr_01` to `mkr_03`, English when a maker isn't found).
- `owner` keeps its entry, but its slot uses the Sell site's resolved language.

**The stage, Phase A:**
- The stage is 1440 by 900 (`STAGE_WIDTH`, `STAGE_HEIGHT`), scaled to fit and letterboxed on paper.
- All four frames stay mounted. Each `TourCameraId` shows exactly one frame at scale 1, and the others sit at opacity 0 and `inert`. The one exception is `sell-catch`, which zooms 1.35 to the box around `reconcile-flag` and its evidence, as v1's `studio-catch` did.
- The stage reads `store.demo.camera` and maps it through `toTourCamera()`. The v1 timeline keeps its own camera IDs.
- The stage passes each frame its page:
  - `shop-home`, `shop-search`, `shop-piece` and `shop-receipt` set `ShopSurface`'s page (the piece from `store.buyer.openPieceId`, the order `ord_001`),
  - `sell-*` set the Sell view,
  - `maker` sets `mkr_01`,
  - `store` sets `gu-studio`.
- When `store.demo.process` is set, the stage opens the same process overlay inside the shown frame, and closes it when the next `beat.started` clears it.
- `demo-stage` keeps `data-camera`, set to the tour camera.
- Moves take 600 ms on the player clock and are instant under reduced motion.
- Video mode, the cold open, start at the catch, the end card and `demo-beat-label` keep v1's behavior and times.

## Tasks

The integrator does every task itself, in order.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Routes and redirects, route params into `SlotProps`, `/dev/kit`, and the URL helpers for drawers and the process overlay | src/app/routes.tsx, src/app/useDrawer.ts, src/app/useProcessParam.ts, src/app/App.tsx | I2-core, I2-kit T1 | opus |
| T2 | The four surfaces on `PageFrame`: `ShopSurface` (with the transition rule), `SellSurface` with its header, nav and view table, `MakerSurface`, `StoreSurface`. Retire `PhoneSurfaces.tsx` and `StudioSurface.tsx` once nothing imports them | src/app/surfaces/index.ts, src/app/surfaces/ShopSurface.tsx, src/app/surfaces/SellSurface.tsx, src/app/surfaces/MakerSurface.tsx, src/app/surfaces/StoreSurface.tsx, src/app/surfaces/views.ts, src/app/surfaces/PhoneSurfaces.tsx, src/app/surfaces/StudioSurface.tsx, src/app/studioInfo.ts | T1 | opus |
| T3 | Chrome: the top bar with the switch, Help, Ask Cindy and language; the process bar mount; the process overlay; the drawers. Strings for every new label in both languages, the slot placeholders included | src/app/chrome/AppChrome.tsx, src/app/chrome/ProcessOverlay.tsx, src/app/chrome/Drawers.tsx, src/app/strings.ts, src/app/lang.ts, src/app/Slot.tsx, src/app/featureLoader.ts | T2 | sonnet |
| T4 | The stage, Phase A: 1440 by 900, one frame per camera, `toTourCamera()`, the pages per camera, `sell-catch`'s zoom inside the page frame, the process overlay from `store.demo.process`. Keep video mode, start at the catch and the end card working on the v1 timeline | src/app/demo/DemoStage.tsx, src/app/demo/cameras.ts, src/app/demo/cameras.test.ts, src/app/demo/stage.module.css, src/app/demo/BeatLabel.tsx, src/app/stageScale.ts, src/app/demo/EndCard.tsx | T2, T3 | opus |
| T5 | Smoke tests: every v2 route (all eleven Sell views, a piece, a community, both projects routes, a receipt, a store, a maker, `/dev/kit`), each drawer from the URL, `?process=` for each process ID, the Shop and Sell switch, the redirects from `/buyer`, `/studio/month` and `/owner`, and no `slot-error-` anywhere | tests/smoke/routes.spec.ts, tests/smoke/shell.spec.ts, tests/smoke/lib.ts | T3 | sonnet |
| T6 | Demo and offline tests for Phase A: the frames are `frame-buyer`, `frame-studio`, `frame-maker` and `frame-store` at 1440 wide. Each beat's camera is mapped to its tour camera, and the frame shown at full size is checked. Every other v1 check stays: times, On screen IDs, figures, cut handling, live mode for G5 | tests/demo/beats.ts, tests/demo/harness.ts, tests/demo/demo.spec.ts, tests/demo/modes.spec.ts, tests/offline/offline.spec.ts | T4 | opus |
| T7 | Run every v1 feature spec (`npm run test:feature -- <slug>` for all twelve). Don't edit `tests/features/`. List each failing spec in the report with its cause (a phone frame, `/owner`, a removed route), so the orchestrator routes it to M-buyer, M-approvals, M-maker-statement or M-desktop | none (report only) | T6 | sonnet |

## Acceptance

- Given I2-core, I2-kit and this plan, when the orchestrator runs G1b (`npm run check`, `npm run test:smoke`, `npm run build`, `npm run test:demo` once, `npm run test:offline`, a verifier review), then every command exits 0.
- Given `/shop`, `/shop/search?q=peony&k=peony`, `/shop/piece/pc_01`, `/shop/community/com_gu`, `/shop/projects`, `/shop/projects/prj_01`, `/shop/receipt/ord_001`, `/store/gu-studio`, `/maker/mkr_01` and `/sell/<each of the eleven views>`, when each renders, then:
  - `shell-topnav`, `process-bar` and its frame are visible,
  - every slot on the page is filled or shows its `slot-` placeholder,
  - there are no console errors.
- Given `/buyer`, `/studio/month?drawer=ask` and `/owner`, then they land on `/shop`, `/sell/month?drawer=ask` and `/sell/approvals`.
- Given a click on `shell-side-sell` from `/shop`, then the page is `/sell/overview`. A click on `shell-side-shop` returns to `/shop`.
- Given `shell-help` on a Shop page, then `?drawer=support` is set and the `shop.drawer.support` slot is open. On a Sell page, it opens `studio.drawer.support`.
- Given `?process=swarm` on any page, then `process-view` shows the `process.view` slot. `process-view-close` or Esc removes the parameter.
- Given the v1 timeline on `/demo`, when `npm run test:demo` plays it, then:
  - each beat shows its Phase A tour camera's frame at full size,
  - every On screen ID and figure from `demo-script.md` passes,
  - the run takes under 75 seconds, as in v1.
- Given `/demo?video=1` and `/demo?start=catch`, then they behave as in v1, on the desktop frames.
- Given `/maker/mkr_01` with the language on `auto`, then the maker page is in Chinese, and the Sell site in English.
- Given `/dev/kit`, then `dev-kit-gallery` shows every kit component with no console errors.
- Given T7's report, then every v1 feature spec is either passing or listed with its cause and the migration plan that fixes it.

## Out of scope

- Features. Slots stay empty until their leads fill them. The process blocks and views are F-process.
- The v2 tour beats, its timeline and the removal of the transition rule and the legacy cameras, which are I2-tour.
- Any edit to `tests/features/`, `src/features/` or `src/core/`. A needed core change goes under needs.
- Restyling to the Figma design, which is I3-redesign.

## Contract additions needed

- `?drawer=support` on Shop routes (`shop.drawer.support`, `side: "buyer"`).
- The route `/dev/kit` and the test ID `dev-kit-gallery`.
- The process overlay's size (1200 by 720, centered under the process bar). It's a layout choice, written into `ui-contract.md` so the design session can see it.
- The Sell nav width (184 px) and the Sell header under the top bar, with the studio's name and Cindy's latest line, as v1's top bar had them.
- The stage pages for each tour camera (the piece from `store.buyer.openPieceId`, the order `ord_001`, the slug `gu-studio`), so the tour's cameras need no extra payload.
