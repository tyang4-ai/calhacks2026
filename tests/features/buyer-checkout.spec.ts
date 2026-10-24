// F-buyer T3: the price split (acceptance 3), the simulated checkout and its token (acceptance 4),
// the pay step fitting the phone (acceptance 8), and the pay button emitting checkout.started.
import { expect, test, type Page } from "@playwright/test";
import { formatCents } from "../../src/ui/formatCents";
import { waitForHooks, watchPage } from "../smoke/lib";

const SPLIT_END = 10700; // just before d03-split ends at 11000
const PAY_END = 14700; // just before d04-pay ends at 15000

interface Split {
  pieceId: string;
  grossCents: number;
  cardFeeCents: number;
  platformFeeCents: number;
  materialsCents: number;
  makerShareCents: number;
}

async function openBuyerAt(page: Page, ms: number) {
  await page.goto("/buyer");
  await waitForHooks(page);
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

function scripted<T>(page: Page, type: string): Promise<T | null> {
  return page.evaluate((ty) => {
    const e = window.__cindia!.player.getTimeline()?.events.find((ev) => ev.type === ty);
    return (e?.payload ?? null) as unknown;
  }, type) as Promise<T | null>;
}

/** Parses "$1,234.56" or "-$3.00" into cents. */
function toCents(text: string): number {
  const neg = text.includes("-");
  const n = Math.round(Number(text.replace(/[^0-9.]/g, "")) * 100);
  return neg ? -n : n;
}

test("@T3 buyer-split-bar shows four parts adding to $180.00 with the maker share $134.48", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, SPLIT_END);
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

test("@T3 the pay step fits the phone: split bar, maker share and pay button in view", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, SPLIT_END);
  await expect(page.getByTestId("buyer-split-bar")).toBeInViewport();
  await expect(page.getByTestId("buyer-split-maker-share")).toBeInViewport();
  await expect(page.getByTestId("buyer-pay-button")).toBeInViewport();
  await expect(page.getByTestId("buyer-simulated-note")).toBeInViewport();
  watch.expectClean();
});

test("@T3 tapping buyer-pay-button puts a checkout.started in the store", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, SPLIT_END);
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
  await openBuyerAt(page, PAY_END);
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

  const note = page.getByTestId("buyer-simulated-note");
  await expect(note).toBeVisible();
  await expect(note).toContainText(/simulated/i);
  await expect(note).toContainText(/no card is charged/i);
  watch.expectClean();
});
