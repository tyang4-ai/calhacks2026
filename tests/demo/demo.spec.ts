// The 60-second demo on the production build, at 1x, on the desktop stage: every beat on time, its
// camera's one frame shown at full size through the Phase A mapping, its On screen test IDs visible
// inside that frame and its figures shown. Saves artifacts/demo/<beat ID>.png 300 ms before each
// beat ends, and artifacts/demo/report.json with durationMs and endedAtWallMs.
import { test } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import { openStage, playDemo } from "./harness";

test("the 60-second demo plays every beat on time", async ({ page }) => {
  const watch = watchPage(page);
  await openStage(page);
  await playDemo(page);
  watch.expectClean();
});
