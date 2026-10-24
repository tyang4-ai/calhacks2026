// The 60-second demo on the production build, at 1x: every beat on time, its camera's frames in
// place, its On screen test IDs visible and its figures shown. Saves artifacts/demo/<beat ID>.png
// 300 ms before each beat ends, and artifacts/demo/report.json.
import { test } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import { openStage, playDemo } from "./harness";

test("the 60-second demo plays every beat on time", async ({ page }) => {
  const watch = watchPage(page);
  await openStage(page);
  await playDemo(page);
  watch.expectClean();
});
