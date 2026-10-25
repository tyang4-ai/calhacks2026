// F-process T4: the checkout and money views. Acceptance 11 and 12.
import { expect, test } from "@playwright/test";
import { demoFundMoves } from "../../src/mock/index";
import { NEVER_ITEMS, STORED_ITEMS } from "../../src/features/process/strings";
import { emitAtClock, glossaryLabel, open, seekToEvent, timelineHas, watchPage } from "./process-lib";

test("past the card token and the order, the checkout flow shows the token and ord_001, and lists what Cindia never keeps", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=checkout");
  const tokenAt = await page.evaluate(() => window.__cindia!.player.getTimeline()!.events.find((e) => e.type === "card.tokenized")!.at);
  const orderAt = await seekToEvent(page, "order.placed", { orderId: "ord_001" }, 300);
  expect(tokenAt).toBeLessThan(orderAt);
  const flow = page.getByTestId("process-checkout-flow");
  await expect(flow).toContainText("tok_7Q2M9X4KD1PA");
  await expect(flow).toContainText("ord_001");
  await expect(flow.locator('[data-role="token"]')).toHaveAttribute("data-lit", "true");
  await expect(flow.locator('[data-role="order"]')).toHaveAttribute("data-lit", "true");
  for (const item of NEVER_ITEMS) await expect(page.getByTestId("process-checkout-never")).toContainText(item.en);
  for (const item of STORED_ITEMS) await expect(page.getByTestId("process-checkout-stored")).toContainText(item.en);
  await expect(page.getByTestId("process-checkout-never")).toContainText("The card number");
  // checkout has no source keys: the card is always simulated.
  await expect(page.getByTestId("process-view").getByTestId("simulated-badge")).toHaveCount(1);
  watch.expectClean();
});

test("before the token, the flow waits", async ({ page }) => {
  await open(page, "/shop?process=checkout");
  await seekToEvent(page, "checkout.started", {}, 100);
  const flow = page.getByTestId("process-checkout-flow");
  await expect(flow.locator('[data-role="token"]')).toHaveAttribute("data-lit", "false");
  await expect(flow.locator('[data-role="order"]')).toHaveAttribute("data-lit", "false");
});

test("the money diagram draws a thread per move, the fund moves included, with the balance and L29", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=money");
  if (await timelineHas(page, "money.moved", { moveId: "mv_0102" })) {
    await seekToEvent(page, "money.moved", { moveId: "mv_0102" }, 300);
  } else {
    await seekToEvent(page, "account.synced", {}, 300);
    await emitAtClock(page, demoFundMoves.map((m) => ({ type: "money.moved" as const, payload: m, key: "b04-bank" as const })));
  }
  const diagram = page.getByTestId("process-money-diagram");
  for (const id of ["mv_0001", "mv_0002", "mv_0003", "mv_0101", "mv_0102"]) await expect(diagram.locator(`[data-move-id="${id}"]`)).toHaveCount(1);
  await expect(diagram.locator('[data-move-id][data-to="community_fund:prj_01"]')).toHaveCount(1);
  await expect(diagram.locator('[data-party="community_fund:prj_01"]')).toHaveCount(1);
  await expect(page.getByTestId("process-money-balance")).toHaveAttribute("data-account-id", "acct_studio");
  await expect(page.getByTestId("process-money-sandbox")).toHaveText(glossaryLabel("L29").en);
  watch.expectClean();
});

test("L29 reads word for word in Chinese too", async ({ page }) => {
  await open(page, "/shop?process=money");
  await page.getByTestId("demo-lang-toggle").click();
  await page.getByTestId("demo-lang-toggle").click();
  await expect(page.getByTestId("process-money-sandbox")).toHaveText(glossaryLabel("L29").zh);
});
