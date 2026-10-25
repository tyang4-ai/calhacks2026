// F-money-map T1, on M-desktop's /sell/map at 1440 by 900: the party nodes. Acceptance 1 (the start
// of the money beat) and the Cindia part of acceptance 2 (its end). Seeks by event; checks by test ID.
import { expect, test } from "@playwright/test";
import { SELL_VIEWPORT, inFrame, openSell, seekToEvent, watchPage } from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

test.describe("money map nodes", () => {
  test.beforeEach(async ({ page }) => {
    await openSell(page, "map");
  });

  test("just before the first move the co-op and three makers show, with no thread yet", async ({ page }) => {
    const watch = watchPage(page);
    await seekToEvent(page, "money.moved", { moveId: "mv_0001" }, -1);
    const canvas = inFrame(page, "money-map-canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas.getByTestId("money-map-node-studio")).toBeVisible();
    for (const id of ["mkr_01", "mkr_02", "mkr_03"]) {
      await expect(canvas.getByTestId(`money-map-node-maker-${id}`)).toBeVisible();
    }
    await expect(page.locator('[data-testid^="money-map-thread-"]')).toHaveCount(0);
    watch.expectClean();
  });

  test("at the money beat's account.synced the Cindia node shows the $18.00 it kept", async ({ page }) => {
    const watch = watchPage(page);
    await seekToEvent(page, "account.synced", { accountId: "acct_studio" });
    const cindia = inFrame(page, "money-map-canvas").getByTestId("money-map-node-cindia");
    await expect(cindia).toBeVisible();
    await expect(cindia).toContainText("$18.00");
    watch.expectClean();
  });
});
