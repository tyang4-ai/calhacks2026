// F-money-map T4: follows d05-money from start to end on /studio/map. Each move's thread appears
// when it fires and is fully sewn by the end of the beat, and the balance lands at 18.5 s.
// Checks by test ID only.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

async function seekTo(page: Page, ms: number) {
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
}

const thread = (page: Page, id: string) => page.getByTestId("money-map-canvas").getByTestId(`money-map-thread-${id}`);

test("d05-money from start to end", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/studio/map");
  await waitForHooks(page);

  const slot = page.locator('[data-slot="studio.map.main"]');
  await expect(slot).toHaveAttribute("data-slot-state", "filled");
  await expect(slot.getByTestId("simulated-badge")).toBeVisible();

  // 15.0 s: the beat starts. No thread yet and no balance.
  await seekTo(page, 15000);
  await expect(page.getByTestId("money-map-canvas")).toBeVisible();
  await expect(page.locator('[data-testid^="money-map-thread-"]')).toHaveCount(0);
  await expect(page.getByTestId("money-map-balance")).not.toContainText("$");

  // 16.0 s: the sale is on its way, the fee not yet.
  await seekTo(page, 16000);
  await expect(thread(page, "mv_0001")).toHaveCount(1);
  await expect(thread(page, "mv_0002")).toHaveCount(0);

  // 17.0 s: the sale is sewn, the card fee is peeling off.
  await seekTo(page, 17000);
  await expect(thread(page, "mv_0001")).toHaveAttribute("data-progress", "1.00");
  await expect(thread(page, "mv_0002")).toHaveCount(1);
  await expect(thread(page, "mv_0003")).toHaveCount(0);

  // 20.0 s: the end of the beat. All three sewn with their amounts, and the balance is in.
  await seekTo(page, 20000);
  const expected: Record<string, string> = { mv_0001: "$180.00", mv_0002: "$5.52", mv_0003: "$156.48" };
  for (const [id, amount] of Object.entries(expected)) {
    await expect(thread(page, id)).toHaveAttribute("data-progress", "1.00");
    await expect(thread(page, id)).toContainText(amount);
  }
  await expect(page.getByTestId("money-map-node-cindia")).toContainText("$18.00");
  await expect(page.getByTestId("money-map-balance")).toContainText("$");

  watch.expectClean();
});
