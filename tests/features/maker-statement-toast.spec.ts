// F-maker-statement G4 fix: the paid toast must never cover the held note in d10-statement.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";
import { UI } from "../../src/features/maker-statement/strings";

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function openMaker(page: Page) {
  await page.goto("/maker/mkr_01");
  await waitForHooks(page);
  await expect(page.locator('[data-slot="maker.main"]')).toHaveAttribute("data-slot-state", "filled");
}

function toast(page: Page) {
  return page.locator('[data-slot="maker.main"]').getByRole("status").filter({ hasText: UI.paidToast.en });
}

test("after statement.issued and payout.sent the paid toast shows at the top and does not overlap the held note", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, 47500);

  const held = page.getByTestId("maker-statement-held");
  await expect(held).toContainText("$95.00");
  await expect(page.getByTestId("maker-statement-paid")).toBeVisible();
  await expect(toast(page)).toBeVisible();

  const t = (await toast(page).boundingBox())!;
  const h = (await held.boundingBox())!;
  expect(t).toBeTruthy();
  expect(h).toBeTruthy();
  const overlaps = t.x < h.x + h.width && h.x < t.x + t.width && t.y < h.y + h.height && h.y < t.y + t.height;
  expect(overlaps, `toast ${JSON.stringify(t)} overlaps held note ${JSON.stringify(h)}`).toBe(false);
  // The toast sits above the held note, at the top of the phone.
  expect(t.y + t.height).toBeLessThanOrEqual(h.y);
  watch.expectClean();
});

test("playing d10-statement, the toast is gone and the held note is clear by the end-of-beat frame", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player as unknown as { pause(): void; seek(ms: number): void; setSpeed(x: number): void; play(): void };
    p.pause();
    p.seek(47000);
    p.setSpeed(4);
    p.play();
  });
  await expect(toast(page)).toBeVisible();
  await page.waitForFunction(() => window.__cindia!.player.now() >= 49700);
  await page.evaluate(() => window.__cindia!.player.pause());

  await expect(toast(page)).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-held")).toBeVisible();
  await expect(page.getByTestId("maker-statement-held")).toContainText("$95.00");
  watch.expectClean();
});

test("the toggle turns the paid toast Chinese and it still clears the held note", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, 47500);
  await expect(toast(page)).toBeVisible();

  // The toggle cycles auto, en, zh: the page starts in English, so two taps give Chinese.
  const toggle = page.getByTestId("demo-lang-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-lang", "en");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-lang", "zh");
  const zhToast = page.locator('[data-slot="maker.main"]').getByRole("status").filter({ hasText: UI.paidToast.zh });
  await expect(zhToast).toBeVisible();
  await expect(toast(page)).toHaveCount(0);

  const t = (await zhToast.boundingBox())!;
  const h = (await page.getByTestId("maker-statement-held").boundingBox())!;
  expect(t.y + t.height).toBeLessThanOrEqual(h.y);
  watch.expectClean();
});
