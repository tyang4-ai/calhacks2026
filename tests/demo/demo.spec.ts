// The 60-second demo on the production build. S1 version: the stage, play and reset, one screenshot.
// I1 replaces this with the beat-by-beat run from demo-script.md.
import { test } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import { openStage, playAndReset } from "./harness";

test("the demo stage plays and resets", async ({ page }) => {
  const watch = watchPage(page);
  await openStage(page);
  await playAndReset(page);
  watch.expectClean();
});
