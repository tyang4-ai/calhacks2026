// F-maker-statement T2: the lines and the held note on the maker's phone, end of d10-statement.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

const END_OF_D10 = 50000;

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

/** The statement.issued payload for mkr_01, read from the store. */
async function statementFor(page: Page, makerId: string) {
  return page.evaluate((id) => {
    const s = window.__cindia!.store.getState() as unknown as {
      close: {
        statements: Record<string, { lines: { orderId: string; pieceId: string; makerShareCents: number }[]; heldCents: number }>;
        statementByMaker: Record<string, string>;
      };
    };
    const sid = s.close.statementByMaker[id];
    return sid ? s.close.statements[sid] : null;
  }, makerId);
}

test("Acceptance 3: one line per payload line, and ord_001 reads Small grey, red and black wool weaving with $134.48", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, END_OF_D10);
  const statement = await statementFor(page, "mkr_01");
  expect(statement).not.toBeNull();
  const lines = page.getByTestId("maker-statement-lines");
  await expect(lines).toBeVisible();
  await expect(lines.locator('[data-testid^="maker-statement-line-"]')).toHaveCount(statement!.lines.length);
  for (const line of statement!.lines) {
    await expect(page.getByTestId(`maker-statement-line-${line.orderId}`)).toBeVisible();
  }
  const ord1 = page.getByTestId("maker-statement-line-ord_001");
  await expect(ord1).toContainText("Small grey, red and black wool weaving");
  await expect(ord1).toContainText("$134.48");
  watch.expectClean();
});

test("Acceptance 4 (held): the held note shows $95.00 and Held until the gallery pays what it owes", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, END_OF_D10);
  const held = page.getByTestId("maker-statement-held");
  await expect(held).toBeVisible();
  await expect(held).toContainText("$95.00");
  await expect(held).toContainText("Held until the gallery pays what it owes");
  watch.expectClean();
});

test("Acceptance 6 (lines): in Chinese the title is 灰红黑三色小幅羊毛编织, the amount is unchanged, and the held note is Chinese", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, END_OF_D10);
  // The toggle cycles auto, en, zh. The maker's page starts in English, so two clicks give Chinese.
  const toggle = page.getByTestId("demo-lang-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-lang", "en");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-lang", "zh");
  const ord1 = page.getByTestId("maker-statement-line-ord_001");
  await expect(ord1).toContainText("灰红黑三色小幅羊毛编织");
  await expect(ord1).toContainText("$134.48");
  const held = page.getByTestId("maker-statement-held");
  await expect(held).toContainText("$95.00");
  await expect(held).toContainText("待画廊补齐欠款后发放");
  watch.expectClean();
});
