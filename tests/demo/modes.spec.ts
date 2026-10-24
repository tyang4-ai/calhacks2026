// The stage's other modes, at 8x where the player clock allows it so the file finishes well
// inside the 60-second run beside it: video mode (?video=1), start at the catch, and reset.
// The cold open, the rewind card and the end card are real-time holds, so they keep their length.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";
import { openStage, screenshot } from "./harness";

const now = (page: Page) => page.evaluate(() => window.__cindia!.player.now());
const playing = (page: Page) => page.evaluate(() => window.__cindia!.player.isPlaying());
const stageCamera = (page: Page) => page.getByTestId("demo-stage").getAttribute("data-camera");

test("video mode: 5-second cold open on the catch, the run from d01-ask with no controls or label, then the end card", async ({ page }) => {
  test.setTimeout(90_000);
  const watch = watchPage(page);
  await page.goto("/demo?video=1");
  await waitForHooks(page);
  const t0 = Date.now();
  // Cold open: paused at 38.0 on the studio-catch camera, the flag and its line on screen.
  const coldOpen = page.locator('[data-video-phase="cold-open"]');
  await expect(coldOpen).toBeVisible();
  await expect(coldOpen).toContainText("The gallery paid $340 less than the contract says");
  expect(await now(page)).toBe(38000);
  expect(await playing(page)).toBe(false);
  expect(await stageCamera(page)).toBe("studio-catch");
  await expect(page.getByTestId("reconcile-flag")).toBeVisible();
  await expect(page.getByTestId("demo-controls")).toHaveCount(0);
  await expect(page.getByTestId("demo-beat-label")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await screenshot(page, "d00-cold-open");
  await page.evaluate(() => window.__cindia!.player.setSpeed(8));

  // The run starts from d01-ask after about 5 seconds.
  await expect(coldOpen).toHaveCount(0, { timeout: 8000 });
  const coldMs = Date.now() - t0;
  expect(coldMs).toBeGreaterThanOrEqual(4000);
  expect(coldMs).toBeLessThan(7000);
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().demo as { beatId: string | null })).toMatchObject({ beatId: expect.stringMatching(/^d0[1-3]-/) });
  expect(await now(page)).toBeLessThan(30000);
  await expect(page.getByTestId("demo-controls")).toHaveCount(0);
  await expect(page.getByTestId("demo-beat-label")).toHaveCount(0);

  // End card after 60.0, for about 5 seconds.
  const card = page.getByTestId("demo-end-card");
  await expect(card).toBeVisible({ timeout: 20000 });
  const shown = Date.now();
  expect(await now(page)).toBe(60000);
  await expect(card).toContainText("github.com/tyang4-ai/calhacks2026");
  await expect(card).toContainText("caught 4 of 4");
  await screenshot(page, "d12-end-card");
  await expect(card).toHaveCount(0, { timeout: 8000 });
  const cardMs = Date.now() - shown;
  expect(cardMs).toBeGreaterThanOrEqual(4000);
  expect(cardMs).toBeLessThan(7000);
  watch.expectClean();
});

test("start at the catch: 30.0 to 60.0, the rewind card, then 0.0 to the end of d05-money (20.0) and pause", async ({ page }) => {
  test.setTimeout(60_000);
  const watch = watchPage(page);
  await openStage(page);
  await page.evaluate(() => window.__cindia!.player.setSpeed(8));
  // Record the clock on every player change, to prove the order of the two halves.
  await page.evaluate(() => {
    const w = window as unknown as { cindiaClocks: number[] };
    w.cindiaClocks = [];
    window.__cindia!.player.subscribe(() => w.cindiaClocks.push(window.__cindia!.player.now()));
  });
  await page.getByTestId("demo-start-at-catch").click();
  await page.mouse.move(800, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => now(page)).toBeGreaterThanOrEqual(30000);
  const rewind = page.locator('[data-catch-phase="rewind"]');
  await expect(rewind).toBeVisible({ timeout: 15000 });
  await expect(rewind).toContainText("Rewind to the buyer");
  expect(await now(page)).toBe(60000);
  await expect(rewind).toHaveCount(0, { timeout: 4000 });
  await expect.poll(() => playing(page), { timeout: 15000 }).toBe(false);
  // Paused on the last millisecond of d05-money, so its buyer-studio camera stays up.
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(19999);
  expect(await page.evaluate(() => window.__cindia!.store.getState().demo)).toMatchObject({ beatId: "d05-money", camera: "buyer-studio" });
  await expect(page.getByTestId("money-map-balance")).toBeVisible();
  await screenshot(page, "start-at-catch-pause");
  const clocks = await page.evaluate(() => (window as unknown as { cindiaClocks: number[] }).cindiaClocks);
  const firstLow = clocks.findIndex((c) => c < 30000);
  // Every clock before the rewind is in 30.0 to 60.0, every one after it is in 0.0 to 20.0. At 8x
  // one frame can step past 20.0 before the stop seeks back to it, so allow one frame of 8x there.
  expect(clocks.slice(0, firstLow).every((c) => c >= 30000 && c <= 60000)).toBe(true);
  expect(clocks.slice(firstLow).every((c) => c >= 0 && c < 20000 + 8 * 60)).toBe(true);
  expect(clocks.at(-1)).toBe(19999);
  expect(clocks.slice(0, firstLow)).toContain(60000);
  watch.expectClean();
});

test("reset at any point: clock 0, the store empty, the camera buyer", async ({ page }) => {
  const watch = watchPage(page);
  await openStage(page);
  await page.evaluate(() => window.__cindia!.player.seek(41000));
  await expect.poll(() => stageCamera(page)).toBe("studio-owner");
  await page.getByTestId("demo-play").click();
  await page.getByTestId("demo-reset").click();
  expect(await now(page)).toBe(0);
  const s = await page.evaluate(() => {
    const st = window.__cindia!.store.getState() as unknown as {
      demo: { beatId: string | null; camera: string | null };
      buyer: { orderIds: string[] };
      money: { moveIds: string[] };
      month: { matchIds: string[]; flagIds: string[] };
      approvals: { approvalIds: string[] };
    };
    return { demo: st.demo, counts: [st.buyer.orderIds.length, st.money.moveIds.length, st.month.matchIds.length, st.month.flagIds.length, st.approvals.approvalIds.length] };
  });
  expect(s.counts).toEqual([0, 0, 0, 0, 0]);
  expect(s.demo.beatId).toBeNull();
  expect(await stageCamera(page)).toBe("buyer");
  await expect(page.getByTestId("demo-play")).toBeVisible();
  watch.expectClean();
});
