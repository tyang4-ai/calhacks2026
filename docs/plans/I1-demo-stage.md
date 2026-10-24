# I1-demo-stage · The 60-second demo stage

Priority: P0 · Wave: I1 · Depends on: the W1 wave gate (G3) · Folder: src/app/demo/ · Owner: integrator · Gate: G4

## Goal

`/demo` plays the whole 60-second story by itself: the buyer's $180 followed into the studio and out to the maker, with the camera moving between the four surfaces. It also records cleanly for the video and can start at the catch for Hyphenate's judges.

## Read first

- `docs/common/demo-script.md`: every beat, its time, camera, events and what must be on screen.
- `docs/common/ui-contract.md`: Routes, Surfaces, Camera states, Demo controls, Test hooks, Test IDs.
- `docs/common/events.md`: the player and the store, `beat.started`.
- `docs/common/design-system.md`: Motion (camera moves use the player clock, reduced motion).
- `docs/common/definition-of-done.md`: the I1 stage plan and G4.

## Interfaces

- **Reads:** `beat.started` (`store.demo.beatId`, `store.demo.camera`), the player (`load`, `play`, `pause`, `reset`, `seek`, `now`), `store.sources` and `store.proof` for the end card.
- **Emits:** nothing. The `demo` timeline in `src/mock/timelines/demo.ts` carries every event.
- **Exports:** `DemoStage`, the component for the `/demo` route.
- **Test IDs:** `demo-stage`, `demo-beat-label`, `demo-end-card`, `frame-buyer`, `frame-studio`, `frame-owner`, `frame-maker`, and the controls' `demo-start-at-catch`.

## Tasks

The integrator does every task itself, in order.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | Stage and cameras: the 1600 by 900 canvas scaled to the window, the four frames placed and scaled per camera state, 600 ms moves on the player clock, instant under reduced motion. For `studio-catch`, zoom to the box of `reconcile-flag` inside `frame-studio`, or to the center when that element is missing | src/app/demo/DemoStage.tsx, src/app/demo/cameras.ts, src/app/demo/stage.module.css | none | integrator |
| T2 | Beat runner: load the `demo` timeline into the player when `/demo` mounts (once), follow `store.demo.camera`, show the beat's short title in `demo-beat-label` | src/app/demo/useDemoTimeline.ts, src/app/demo/BeatLabel.tsx | T1 | integrator |
| T3 | Video mode for `?video=1`: hide the controls and the beat label, the 5-second cold open (seek to 38.0 without animation, camera `studio-catch`, the one line from `demo-script.md`), then reset and play, then the 5-second end card after 60.0 | src/app/demo/videoMode.ts, src/app/demo/ColdOpen.tsx, src/app/demo/EndCard.tsx | T2 | integrator |
| T4 | Start at the catch, from `demo-start-at-catch` or `?start=catch`: seek to 30.0, play to 60.0, show "Rewind to the buyer" for 1 second, seek to 0.0, play to 20.0 and pause | src/app/demo/startAtCatch.ts, src/app/controls/DemoControls.tsx | T2 | integrator |
| T5 | Route: replace the S1 placeholder for `/demo` with `DemoStage` | src/app/routes.tsx | T1 | integrator |
| T6 | Demo test: play the 60 seconds at 1x on the production build (port 4173). Wait on `window.__cindia.player.now()`, save `artifacts/demo/<beat ID>.png` 300 ms before each beat ends, and check each beat's On screen test IDs and figures from `demo-script.md`. A beat whose feature is listed as cut in `status.md` is marked cut, not failed | tests/demo/demo.spec.ts, tests/demo/beats.ts | T2, T5 | integrator |
| T7 | Offline test: the same run with every request beyond localhost aborted by `page.route`. It fails if any such request is attempted | tests/offline/offline.spec.ts | T6 | integrator |

The delegation header's `SCOPE` line for this plan is: `src/app/demo/, src/app/controls/DemoControls.tsx, src/app/routes.tsx, tests/demo/, tests/offline/`.

## Acceptance

1. **Given** the production build on port 4173, **when** `/demo` loads and plays at 1x, **then** every `beat.started` fires within 100 ms of its time in `demo-script.md`, and the run ends by 60.5 s.
2. **Given** the run, **when** each beat is 300 ms from its end, **then** its screenshot shows the camera's frames where `ui-contract.md` puts them, and every test ID in that beat's On screen column is visible.
3. **Given** three runs in a row with `npm run test:demo`, **then** all three pass and each takes under 75 seconds, page load included.
4. **Given** `npm run test:offline`, **then** the run passes and no request beyond localhost was attempted.
5. **Given** `/demo?video=1`, **then** the flag and the line "The gallery paid $340 less than the contract says" show for 5 seconds, the run then starts at `d01-ask` with no controls or beat label on screen, and `demo-end-card` shows for 5 seconds after 60.0.
6. **Given** a click on `demo-start-at-catch`, **then** the player plays 30.0 to 60.0, shows "Rewind to the buyer", plays 0.0 to 20.0 and pauses there.
7. **Given** a feature cut before I1, **then** its beat still plays with the slot placeholder on screen, and the demo test reports that beat as cut.
8. **Given** `demo-reset` at any point, **then** the clock is at 0, the store is empty, and the camera is `buyer`.

## Out of scope

- No new event types, test IDs or timeline events. A gap in the contracts goes to the orchestrator as a `needs:` line, and the integrator changes the contract and logs it.
- No changes inside `src/features/`. A beat that looks wrong because of a feature goes back to that feature's lead.
- No deploys and no hosted video. Gordon records and uploads the video himself.
