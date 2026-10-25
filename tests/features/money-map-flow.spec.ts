// F-money-map T4, on M-desktop's /sell/map at 1440 by 900: follows the money beat from start to end.
// Each move's thread appears when it fires and is fully sewn once 900 ms have passed on the player
// clock, and the balance lands with account.synced. Seeks by event, and every check about spacing
// reads the events' own times. Checks by test ID only.
import { expect, test, type Page } from "@playwright/test";
import { SELL_VIEWPORT, inFrame, openSell, seekToEvent, timelineAt, watchPage } from "./sell-views-lib";

/** The kit Thread sews a move in 900 ms on the player clock (STITCH_MS in src/ui/motion.ts). */
const STITCH_MS = 900;

test.use({ viewport: SELL_VIEWPORT });

const thread = (page: Page, id: string) => inFrame(page, "money-map-canvas").getByTestId(`money-map-thread-${id}`);

async function seekTo(page: Page, ms: number) {
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
}

test("the money beat from start to end", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "map");

  const slot = page.locator('[data-slot="studio.map.main"]');
  await expect(slot).toHaveAttribute("data-slot-state", "filled");
  await expect(slot.getByTestId("simulated-badge")).toBeVisible();

  const at1 = (await timelineAt(page, "money.moved", { moveId: "mv_0001" }))!;
  const at2 = (await timelineAt(page, "money.moved", { moveId: "mv_0002" }))!;
  const at3 = (await timelineAt(page, "money.moved", { moveId: "mv_0003" }))!;
  const sync = (await timelineAt(page, "account.synced", { accountId: "acct_studio" }))!;
  expect(at1).toBeLessThan(at2);
  expect(at2).toBeLessThan(at3);
  expect(at3).toBeLessThan(sync);

  // Just before the first move: no thread yet and no balance.
  await seekToEvent(page, "money.moved", { moveId: "mv_0001" }, -1);
  await expect(inFrame(page, "money-map-canvas")).toBeVisible();
  await expect(page.locator('[data-testid^="money-map-thread-"]')).toHaveCount(0);
  await expect(inFrame(page, "money-map-balance")).not.toContainText("$");

  // Just before the card fee: the sale is on its way, the fee not yet.
  await seekToEvent(page, "money.moved", { moveId: "mv_0002" }, -1);
  await expect(thread(page, "mv_0001")).toHaveCount(1);
  await expect(thread(page, "mv_0002")).toHaveCount(0);

  // Just before the settlement: the card fee is peeling off, and the sale is sewn once its 900 ms have run.
  await seekToEvent(page, "money.moved", { moveId: "mv_0003" }, -1);
  if (at3 - 1 - at1 >= STITCH_MS) await expect(thread(page, "mv_0001")).toHaveAttribute("data-progress", "1.00");
  await expect(thread(page, "mv_0002")).toHaveCount(1);
  await expect(thread(page, "mv_0003")).toHaveCount(0);

  // After the sync, with the settlement sewn: all three with their amounts, and the balance is in.
  await seekTo(page, Math.max(sync + 300, at3 + STITCH_MS));
  const expected: Record<string, string> = { mv_0001: "$180.00", mv_0002: "$5.52", mv_0003: "$156.48" };
  for (const [id, amount] of Object.entries(expected)) {
    await expect(thread(page, id)).toHaveAttribute("data-progress", "1.00");
    await expect(thread(page, id)).toContainText(amount);
  }
  await expect(inFrame(page, "money-map-node-cindia")).toContainText("$18.00");
  await expect(inFrame(page, "money-map-balance")).toContainText("$");

  watch.expectClean();
});
