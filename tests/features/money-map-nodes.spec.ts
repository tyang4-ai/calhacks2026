// F-money-map T1: the party nodes. Acceptance 1 (start of d05-money) and the Cindia part of
// acceptance 2 (end of d05-money). Checks by test ID only.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

async function seekTo(page: Page, ms: number) {
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
}

test.describe("money map nodes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/studio/map");
    await waitForHooks(page);
  });

  test("at the start of d05-money the studio and three makers show, with no thread yet", async ({ page }) => {
    const watch = watchPage(page);
    await seekTo(page, 15000);
    const canvas = page.getByTestId("money-map-canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas.getByTestId("money-map-node-studio")).toBeVisible();
    for (const id of ["mkr_01", "mkr_02", "mkr_03"]) {
      await expect(canvas.getByTestId(`money-map-node-maker-${id}`)).toBeVisible();
    }
    await expect(page.locator('[data-testid^="money-map-thread-"]')).toHaveCount(0);
    watch.expectClean();
  });

  test("at the end of d05-money the Cindia node shows the $18.00 it kept", async ({ page }) => {
    const watch = watchPage(page);
    await seekTo(page, 20000);
    const cindia = page.getByTestId("money-map-canvas").getByTestId("money-map-node-cindia");
    await expect(cindia).toBeVisible();
    await expect(cindia).toContainText("$18.00");
    watch.expectClean();
  });
});
