// F-buyer T4, moved by M-buyer T1 to the desktop receipt page /shop/receipt/ord_001 with
// event-anchored seeks: the receipt reads "Received" for ord_001 after the timeline's received
// receipt (acceptance 4), flips to "Paid to the maker" with the maker's name, share and paid date
// after the paid one (acceptance 5), and fits the frame at both (acceptance 8, now 1440 by 900).
// T7 deletes this spec after G4v2; buyer-receipt-page.spec.ts repeats what it checks.
import { expect, test, type Page } from "@playwright/test";
import type { Order, Person, Piece } from "../../src/core/types";
import { getById } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { watchPage } from "../smoke/lib";
import { expectInsideFrame, openPage, seekToEvent, storeSlice } from "./buyer-lib";

const ORDER_ID = "ord_001";

async function openReceiptAt(page: Page, status: "received" | "paid_to_maker") {
  await openPage(page, `/shop/receipt/${ORDER_ID}`);
  await seekToEvent(page, "receipt.updated", { orderId: ORDER_ID, status }, 300);
}

test("@T4 after the received receipt, the receipt reads Received for ord_001", async ({ page }) => {
  const watch = watchPage(page);
  await openReceiptAt(page, "received");

  const receipt = page.getByTestId("buyer-receipt");
  await expect(receipt).toBeVisible();
  const status = receipt.getByTestId("buyer-receipt-status");
  await expect(status).toHaveText(/^Received/);
  await expect(status).not.toContainText("Paid to the maker");

  const { buyer } = await storeSlice(page);
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

test("@T4 after the paid receipt, the receipt reads Paid to the maker with name, share and date", async ({ page }) => {
  const watch = watchPage(page);
  await openReceiptAt(page, "paid_to_maker");

  const receipt = page.getByTestId("buyer-receipt");
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText("Paid to the maker");
  const status = receipt.getByTestId("buyer-receipt-status");
  await expect(status).toHaveText(/^Paid to the maker/);

  const { buyer } = await storeSlice(page);
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

test("@T4 the receipt fits the frame after the received and the paid receipt", async ({ page }) => {
  const watch = watchPage(page);
  for (const status of ["received", "paid_to_maker"] as const) {
    await openReceiptAt(page, status);
    await expect(page.getByTestId("buyer-receipt-status")).toBeVisible();
    await expectInsideFrame(page, "buyer-receipt");
  }
  watch.expectClean();
});
