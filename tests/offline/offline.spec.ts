// The same 60-second run as the demo test, with every request whose host isn't localhost aborted.
// It fails if any such request is attempted. Screenshots go to artifacts/demo/offline/.
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ARTIFACTS_DEMO, openStage, playDemo } from "../demo/harness";
import { isLocal, watchPage } from "../smoke/lib";

test("the demo runs with every request beyond localhost blocked", async ({ page, context }) => {
  const attempts: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (isLocal(url)) return route.continue();
    attempts.push(url);
    return route.abort("blockedbyclient");
  });
  const watch = watchPage(page);
  await openStage(page);
  await playDemo(page, path.join(ARTIFACTS_DEMO, "offline"));
  expect(attempts, "requests beyond localhost").toEqual([]);
  watch.expectClean();
});
