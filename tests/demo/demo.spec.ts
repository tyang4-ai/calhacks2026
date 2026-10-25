// The tour on the production build, at 1x, on the desktop stage: every beat on time, its camera's
// frame shown (none for pitch, 0.66 beside the process panel under a process), its On screen test
// IDs visible in their scope and its figures shown, then the end card. Saves
// artifacts/demo/<beat ID>.png 300 ms before each beat ends, and artifacts/demo/report.json with
// durationMs and endedAtWallMs.
import { test } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import { openStage, playDemo, tourTimeout } from "./harness";

test("the tour plays every beat on time", async ({ page }) => {
  // The config's 150 seconds is shorter than the tour: the page's durationMs plus 90 seconds.
  test.setTimeout(600_000);
  const watch = watchPage(page);
  await openStage(page);
  test.setTimeout(await tourTimeout(page));
  await playDemo(page);
  watch.expectClean();
});
