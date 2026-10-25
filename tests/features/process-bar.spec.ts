// F-process T1: the process bar. Acceptance 1 to 4, and the bar's one-row layout.
import { expect, test } from "@playwright/test";
import { demoSearch } from "../../src/mock/index";
import { emitAtClock, expectStatus, open, PROCESS_IDS, pendingInStore, seekToEvent, timelineHas, watchPage } from "./process-lib";

test("a fresh store in scripted mode: eleven idle blocks in order, no Live marks, Live: 0 of 11, one Simulated badge, no presence", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop");
  const bar = page.getByTestId("process-bar");
  await expect(bar).toHaveCount(1);
  const blocks = bar.locator(':scope > [data-testid^="process-block-"]');
  await expect(blocks).toHaveCount(11);
  expect(await blocks.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual(PROCESS_IDS.map((id) => `process-block-${id}`));
  for (const id of PROCESS_IDS) await expectStatus(page, id, "idle");
  await expect(page.locator('[data-testid^="process-block-live-"]')).toHaveCount(0);
  await expect(page.getByTestId("process-live-summary")).toHaveText("Live: 0 of 11");
  await expect(bar.getByTestId("simulated-badge")).toHaveCount(1);
  await expect(page.getByTestId("process-presence")).toHaveCount(0);
  watch.expectClean();
});

test("the bar fits the 1440 px page in one 64 px row, each block at least 108 px wide", async ({ page }) => {
  await open(page, "/sell/month");
  const frame = (await page.getByTestId("frame-studio").boundingBox())!;
  const bar = (await page.getByTestId("process-bar").boundingBox())!;
  expect(bar.height).toBeLessThanOrEqual(64);
  const boxes = await page
    .getByTestId("process-bar")
    .locator(':scope > [data-testid^="process-block-"]')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as { x: number; y: number; width: number; height: number; right: number }));
  for (const b of boxes) {
    expect(b.width).toBeGreaterThanOrEqual(108);
    expect(b.width).toBeLessThanOrEqual(120.5);
    expect(Math.abs(b.y - boxes[0].y)).toBeLessThan(1);
  }
  const summary = (await page.getByTestId("process-live-summary").boundingBox())!;
  expect(summary.x).toBeGreaterThanOrEqual(boxes[10].right - 1);
  expect(summary.x + summary.width).toBeLessThanOrEqual(Math.min(frame.x + frame.width, bar.x + bar.width + 0.5));
  const badge = (await page.getByTestId("process-bar").getByTestId("simulated-badge").boundingBox())!;
  expect(badge.x + badge.width).toBeLessThanOrEqual(Math.min(frame.x + frame.width, bar.x + bar.width + 0.5));
  expect(badge.y + badge.height).toBeLessThanOrEqual(bar.y + bar.height + 0.5);
});

test("search reads working 600 ms after the search while the player plays, then done once it pauses, and stays done", async ({ page }) => {
  await open(page, "/shop");
  if (await timelineHas(page, "search.queried")) {
    await seekToEvent(page, "search.queried", {}, 600);
    await page.evaluate(() => window.__cindia!.player.play());
  } else {
    // The tour doesn't carry the search yet: play from the start, then the search arrives on the clock.
    await page.evaluate(() => {
      const p = window.__cindia!.player;
      p.pause();
      p.seek(0);
      p.play();
    });
    await emitAtClock(page, [{ type: "search.queried", payload: { ...demoSearch.query, queryId: "qry_01" } }]);
  }
  await expectStatus(page, "search", "working");
  await page.evaluate(() => window.__cindia!.player.pause());
  await expectStatus(page, "search", "done");
  // Paused, the clock stands still, so the status never flips back.
  await page.waitForTimeout(2200);
  await expectStatus(page, "search", "done");
});

test("reconcile needs attention after the flag until the follow-up is sent", async ({ page }) => {
  await open(page, "/shop");
  const flagAt = await seekToEvent(page, "flag.raised", {}, 300);
  const sentAt = await page.evaluate(() => window.__cindia!.player.getTimeline()!.events.find((e) => e.type === "followup.sent")!.at);
  expect(flagAt).toBeLessThan(sentAt);
  await expectStatus(page, "reconcile", "attention");
  await seekToEvent(page, "followup.sent", {}, 300);
  await expectStatus(page, "reconcile", "done");
});

test("approvals needs attention while one is pending, and counts the pending approvals in the store", async ({ page }) => {
  await open(page, "/shop");
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);
  await expectStatus(page, "approvals", "attention");
  const pending = await pendingInStore(page);
  expect(pending).toBeGreaterThan(0);
  await expect(page.getByTestId("process-block-count-approvals")).toHaveText(String(pending));
});

test("clicking a block opens its view and marks it pressed", async ({ page }) => {
  await open(page, "/shop");
  await page.getByTestId("process-block-money").click();
  await expect(page).toHaveURL(/[?&]process=money/);
  await expect(page.getByTestId("process-block-money")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("process-block-search")).toHaveAttribute("aria-pressed", "false");
});
