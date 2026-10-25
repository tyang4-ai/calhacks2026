// F-buyer T4: the receipt reads "Received" for ord_001 at the end of d04-pay (acceptance 4), flips to
// "Paid to the maker" with the maker's name, share and paid date at the end of d11-receipt
// (acceptance 5), and fits the phone at both beats (acceptance 8).
import { expect, test, type Page } from "@playwright/test";
import type { Order, Person, Piece } from "../../src/core/types";
import { getById } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { waitForHooks, watchPage } from "../smoke/lib";

const PAY_END = 14700; // just before d04-pay ends at 15000
const RECEIPT_END = 59700; // just before d11-receipt ends at 60000
const ORDER_ID = "ord_001";

interface BuyerSlice {
  buyer: {
    orderIds: string[];
    orders: Record<string, { orderId: string; pieceId: string; grossCents: number; date: string }>;
    receipts: Record<string, { orderId: string; status: string; makerId: string; makerShareCents: number; paidDate?: string }>;
  };
}

async function openBuyerAt(page: Page, ms: number) {
  await page.goto("/buyer");
  await waitForHooks(page);
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

function buyerState(page: Page): Promise<BuyerSlice["buyer"]> {
  return page.evaluate(() => (window.__cindia!.store.getState() as unknown as BuyerSlice).buyer);
}

async function expectInViewport(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  const vp = page.viewportSize();
  expect(box, `${testId} has a box`).not.toBeNull();
  expect(vp).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp!.height);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp!.width);
}

test("@T4 at the end of d04-pay the receipt reads Received for ord_001", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, PAY_END);

  const receipt = page.getByTestId("buyer-receipt");
  await expect(receipt).toBeVisible();
  const status = receipt.getByTestId("buyer-receipt-status");
  await expect(status).toHaveText(/^Received/);
  await expect(status).not.toContainText("Paid to the maker");

  const buyer = await buyerState(page);
  expect(buyer.orderIds.at(-1)).toBe(ORDER_ID);
  expect(buyer.receipts[ORDER_ID]?.status).toBe("received");

  const order = getById<Order>(ORDER_ID);
  expect(order).toBeDefined();
  const piece = getById<Piece>(order!.pieceId);
  expect(piece).toBeDefined();
  await expect(receipt).toContainText(ORDER_ID);
  await expect(receipt).toContainText(piece!.title.en);
  await expect(receipt).toContainText(formatCents(buyer.orders[ORDER_ID]!.grossCents));
  await expect(receipt).toContainText(formatDate(buyer.orders[ORDER_ID]!.date, "en"));
  watch.expectClean();
});

test("@T4 at the end of d11-receipt the receipt reads Paid to the maker with name, share and date", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, RECEIPT_END);

  const receipt = page.getByTestId("buyer-receipt");
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText("Paid to the maker");
  const status = receipt.getByTestId("buyer-receipt-status");
  await expect(status).toHaveText(/^Paid to the maker/);

  const buyer = await buyerState(page);
  const r = buyer.receipts[ORDER_ID];
  expect(r?.status).toBe("paid_to_maker");
  const maker = getById<Person>(r!.makerId);
  expect(maker).toBeDefined();
  expect(maker!.name.en).toBe("Grace N.");

  await expect(status).toContainText(maker!.name.en);
  await expect(status).toContainText("$134.48");
  await expect(status).toContainText(formatCents(r!.makerShareCents));
  await expect(status).toContainText("Oct 2, 2026");
  await expect(status).toContainText(formatDate(r!.paidDate!, "en"));
  watch.expectClean();
});

test("@T4 the receipt fits the phone at the end of d04-pay and d11-receipt", async ({ page }) => {
  const watch = watchPage(page);
  for (const ms of [PAY_END, RECEIPT_END]) {
    await openBuyerAt(page, ms);
    await expect(page.getByTestId("buyer-receipt-status")).toBeVisible();
    await expectInViewport(page, "buyer-receipt");
  }
  watch.expectClean();
});
