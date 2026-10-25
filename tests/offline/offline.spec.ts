// The same tour as the demo test, with every request whose host isn't localhost aborted. It fails
// if any such request is attempted, or any WebSocket opens to a host isLocal() rejects, since
// context.route doesn't see WebSockets (D2-34). Screenshots go to artifacts/demo/offline/.
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ARTIFACTS_DEMO, openStage, playDemo, tourTimeout } from "../demo/harness";
import { isLocal, watchPage } from "../smoke/lib";

test("the tour runs with every request beyond localhost blocked", async ({ page, context }) => {
  test.setTimeout(600_000);
  const attempts: string[] = [];
  const sockets: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (isLocal(url)) return route.continue();
    attempts.push(url);
    return route.abort("blockedbyclient");
  });
  page.on("websocket", (ws) => {
    if (!isLocal(ws.url())) sockets.push(ws.url());
  });
  const watch = watchPage(page);
  await openStage(page);
  test.setTimeout(await tourTimeout(page));
  await playDemo(page, path.join(ARTIFACTS_DEMO, "offline"));
  expect(attempts, "requests beyond localhost").toEqual([]);
  expect(sockets, "WebSockets beyond localhost").toEqual([]);
  watch.expectClean();
});
