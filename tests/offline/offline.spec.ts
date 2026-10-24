// The demo with every request whose host isn't localhost or 127.0.0.1 blocked, failing on any attempt.
import { expect, test } from "@playwright/test";
import { openStage, playAndReset } from "../demo/harness";
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
  await playAndReset(page);
  expect(attempts, "requests beyond localhost").toEqual([]);
  watch.expectClean();
});
