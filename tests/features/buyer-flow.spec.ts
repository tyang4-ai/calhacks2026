// F-buyer T5: the buyer phone walks the five buyer beats in order, one step at a time, with the
// Simulated badge on every beat. Each test seeks the demo timeline to just before a beat ends.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";

const BEAT_END = {
  "d01-ask": 4000,
  "d02-story": 8000,
  "d03-split": 11000,
  "d04-pay": 15000,
  "d11-receipt": 60000,
} as const;

type Beat = keyof typeof BEAT_END;

async function openAt(page: Page, beat: Beat) {
  await page.goto("/buyer");
  await waitForSlots(page);
  await waitForHooks(page);
  await page.evaluate((ms) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(ms);
  }, BEAT_END[beat] - 300);
}

/** The test IDs that make each step, all of which must sit inside the phone with nothing scrolled away. */
const STEP_IDS: Record<Exclude<Beat, "d11-receipt">, string[]> = {
  "d01-ask": ["buyer-concierge-input", "buyer-concierge-results", "buyer-result-pc_01", "buyer-result-pc_07", "buyer-result-pc_11"],
  "d02-story": ["buyer-story-card", "buyer-process-timeline"],
  "d03-split": ["buyer-split-bar", "buyer-split-maker-share", "buyer-pay-button"],
  "d04-pay": ["buyer-token", "buyer-receipt-status"],
};

/** Every test ID that belongs to one step, so the test can check no other step is on screen. */
const ALL_STEP_IDS = [
  "buyer-concierge-results",
  "buyer-story-card",
  "buyer-split-bar",
  "buyer-receipt",
];

async function expectInsidePhone(page: Page, testId: string) {
  const el = page.getByTestId(testId);
  await expect(el, `${testId} visible`).toBeVisible();
  await expect(el, `${testId} in view`).toBeInViewport({ ratio: 1 });
  const phone = await page.getByTestId("frame-buyer").boundingBox();
  const box = await el.boundingBox();
  expect(phone && box, `${testId} has a box`).toBeTruthy();
  expect(box!.y, `${testId} top inside the phone`).toBeGreaterThanOrEqual(phone!.y - 1);
  expect(box!.y + box!.height, `${testId} bottom inside the phone`).toBeLessThanOrEqual(phone!.y + phone!.height + 1);
}

test.describe("buyer flow @T5", () => {
  test("d01-ask shows the request and three curated pieces in order @T5", async ({ page }) => {
    const watch = watchPage(page);
    await openAt(page, "d01-ask");
    await expect(page.getByTestId("buyer-concierge-input")).toHaveValue("a gift under $200 for my mom, she loves red wool");
    const results = page.getByTestId("buyer-concierge-results").locator('[data-testid^="buyer-result-"]');
    await expect(results).toHaveCount(3);
    expect(await results.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual([
      "buyer-result-pc_01",
      "buyer-result-pc_07",
      "buyer-result-pc_11",
    ]);
    watch.expectClean();
  });

  test("d02-story shows the grey, red and black weaving's maker story and process @T5", async ({ page }) => {
    await openAt(page, "d02-story");
    const card = page.getByTestId("buyer-story-card");
    await expect(card).toContainText("Small grey, red and black wool weaving");
    await expect(card).toContainText("Grace N.");
    await expect(card).toContainText("N");
    await expect(card).toContainText("26");
    await expect(page.getByTestId("buyer-process-timeline")).toBeVisible();
    await expect(page.getByTestId("buyer-concierge-results")).toHaveCount(0);
  });

  test("d03-split shows the split and the maker share @T5", async ({ page }) => {
    await openAt(page, "d03-split");
    await expect(page.getByTestId("buyer-split-bar")).toBeVisible();
    await expect(page.getByTestId("buyer-split-maker-share")).toHaveText("$134.48");
    await expect(page.getByTestId("buyer-story-card")).toHaveCount(0);
  });

  test("d04-pay shows the token and a received receipt for ord_001 @T5", async ({ page }) => {
    await openAt(page, "d04-pay");
    await expect(page.getByTestId("buyer-token")).toContainText(/tok_[A-Z0-9]{12}/);
    await expect(page.getByTestId("buyer-token")).toContainText("4242");
    await expect(page.getByTestId("buyer-receipt-status")).toHaveText(/^Received/);
    const state = await page.evaluate(() => {
      const b = window.__cindia!.store.getState().buyer as { orderIds: string[]; receipts: Record<string, { status: string }> };
      return { orderIds: b.orderIds, status: b.receipts.ord_001?.status };
    });
    expect(state).toEqual({ orderIds: ["ord_001"], status: "received" });
  });

  test("d11-receipt flips to paid to the maker with share and date @T5", async ({ page }) => {
    await openAt(page, "d11-receipt");
    const receipt = page.getByTestId("buyer-receipt");
    await expect(page.getByTestId("buyer-receipt-status")).toContainText("Paid to the maker");
    await expect(receipt).toContainText("Paid to the maker");
    await expect(receipt).toContainText("Grace N.");
    await expect(receipt).toContainText("$134.48");
    await expect(receipt).toContainText("Oct 2, 2026");
  });

  for (const beat of Object.keys(BEAT_END) as Beat[]) {
    test(`${beat} shows the Simulated badge in scripted mode @T5`, async ({ page }) => {
      await openAt(page, beat);
      await expect(page.getByTestId("frame-buyer").getByTestId("simulated-badge")).toBeVisible();
    });
  }

  for (const beat of Object.keys(STEP_IDS) as (keyof typeof STEP_IDS)[]) {
    test(`${beat} shows one step with nothing important out of view @T5`, async ({ page }) => {
      await openAt(page, beat);
      for (const id of STEP_IDS[beat]) await expectInsidePhone(page, id);
      let steps = 0;
      for (const id of ALL_STEP_IDS) steps += await page.getByTestId(id).count();
      // The receipt step shows the receipt alone; every other step shows its one element.
      expect(steps, "exactly one step on the phone").toBe(1);
    });
  }

  test("tapping the mini weaving after d01-ask opens its story @T5", async ({ page }) => {
    await openAt(page, "d01-ask");
    await page.getByTestId("buyer-result-pc_07").click();
    await expect(page.getByTestId("buyer-story-card")).toContainText("Red and grey wool mini weaving");
    const opened = await page.evaluate(() => (window.__cindia!.store.getState().buyer as { openPieceId: string | null }).openPieceId);
    expect(opened).toBe("pc_07");
  });
});
