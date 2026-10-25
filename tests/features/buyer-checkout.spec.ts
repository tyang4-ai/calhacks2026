// F-buyer T3, moved by M-buyer T1 to the desktop piece page /shop/piece/pc_01 with event-anchored
// seeks: the price split (acceptance 3), the simulated checkout and its token (acceptance 4), the
// price column fitting the frame (acceptance 8, now 1440 by 900), and the pay button emitting
// checkout.started. T7 deletes this spec after G4v2; the desktop specs repeat what it checks.
import { expect, test, type Page } from "@playwright/test";
import { formatCents } from "../../src/ui/formatCents";
import { watchPage } from "../smoke/lib";
import { expectInsideFrame, openPage, seekToEvent, toCents } from "./buyer-lib";

const PIECE = "pc_01";

interface Split {
  pieceId: string;
  grossCents: number;
  cardFeeCents: number;
  platformFeeCents: number;
  materialsCents: number;
  makerShareCents: number;
}

/** The piece page, 300 ms after the timeline's split.shown for the piece (inside v1's d03-split). */
async function openAtSplit(page: Page) {
  await openPage(page, `/shop/piece/${PIECE}`);
  await seekToEvent(page, "split.shown", { pieceId: PIECE }, 300);
}

/** The piece page, 300 ms after the timeline's received receipt (the end of v1's d04-pay). */
async function openAtPaid(page: Page) {
  await openPage(page, `/shop/piece/${PIECE}`);
  await seekToEvent(page, "receipt.updated", { status: "received" }, 300);
}

function scripted<T>(page: Page, type: string): Promise<T | null> {
  return page.evaluate((ty) => {
    const e = window.__cindia!.player.getTimeline()?.events.find((ev) => ev.type === ty);
    return (e?.payload ?? null) as unknown;
  }, type) as Promise<T | null>;
}

test("@T3 buyer-split-bar shows four parts adding to $180.00 with the maker share $134.48", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  const split = await scripted<Split>(page, "split.shown");
  expect(split).not.toBeNull();

  const bar = page.getByTestId("buyer-split-bar");
  await expect(bar).toBeVisible();
  const amounts = bar.locator(".c-money");
  await expect(amounts).toHaveCount(4);
  const texts = await amounts.allTextContents();
  const total = texts.map(toCents).reduce((a, b) => a + b, 0);
  expect(total).toBe(18000);
  expect(total).toBe(split!.grossCents);

  await expect(page.getByTestId("buyer-split-maker-share")).toHaveText("$134.48");
  await expect(page.getByTestId("buyer-split-maker-share")).toHaveText(formatCents(split!.makerShareCents));
  watch.expectClean();
});

test("@T3 the price column fits the frame: split bar, maker share and pay button in view", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  await expect(page.getByTestId("buyer-split-bar")).toBeInViewport();
  await expect(page.getByTestId("buyer-split-maker-share")).toBeInViewport();
  await expect(page.getByTestId("buyer-pay-button")).toBeInViewport();
  await expect(page.getByTestId("buyer-simulated-note")).toBeInViewport();
  for (const id of ["buyer-split-bar", "buyer-split-maker-share", "buyer-pay-button", "buyer-simulated-note"]) await expectInsideFrame(page, id);
  watch.expectClean();
});

test("@T3 tapping buyer-pay-button puts a checkout.started in the store", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  const split = await scripted<Split>(page, "split.shown");
  const before = await page.evaluate(() => (window.__cindia!.store.getState() as unknown as { buyer: { checkout: unknown } }).buyer.checkout);
  expect(before).toBeNull();

  await page.getByTestId("buyer-pay-button").click();
  await page.waitForFunction(
    () => (window.__cindia!.store.getState() as unknown as { buyer: { checkout: unknown } }).buyer.checkout !== null,
  );
  const checkout = await page.evaluate(
    () => (window.__cindia!.store.getState() as unknown as { buyer: { checkout: { pieceId: string; grossCents: number } } }).buyer.checkout,
  );
  expect(checkout).toEqual({ pieceId: split!.pieceId, grossCents: split!.grossCents });
  watch.expectClean();
});

test("@T3 buyer-token shows the tok_ token and last four digits, and the checkout says it is simulated", async ({ page }) => {
  const watch = watchPage(page);
  await openAtPaid(page);
  const card = await scripted<{ token: string; last4: string }>(page, "card.tokenized");
  expect(card).not.toBeNull();
  expect(card!.token.startsWith("tok_")).toBe(true);

  const token = page.getByTestId("buyer-token");
  await expect(token).toBeVisible();
  await expect(token).toContainText(card!.token);
  await expect(token).toContainText(/tok_/);
  await expect(token).toContainText("4242");
  await expect(token).toContainText(card!.last4);
  await expect(token).toBeInViewport();
  await expectInsideFrame(page, "buyer-token");

  const note = page.getByTestId("buyer-simulated-note");
  await expect(note).toBeVisible();
  await expect(note).toContainText(/simulated/i);
  await expect(note).toContainText(/no card is charged/i);
  watch.expectClean();
});
