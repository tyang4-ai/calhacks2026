// F-maker-statement T1: the statement header on /maker/mkr_01. Total (Acceptance 2), payout date
// (Acceptance 4), paid (Acceptance 5) and the header in English (Acceptance 6).
import { expect, test, type Page } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { GLOSSARY } from "../../src/features/maker-statement/strings";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { waitForHooks, watchPage } from "../smoke/lib";

const MAKER_ID = "mkr_01";
/** The end of d10-statement (demo-script.md: 47.0 to 50.0). */
const END_OF_D10 = 50000;
/** Before statement.issued at 47.4 s. */
const BEFORE_STATEMENT = 46000;

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function openMaker(page: Page) {
  await page.goto(`/maker/${MAKER_ID}`);
  await waitForHooks(page);
  await expect(page.locator('[data-slot="maker.main"]')).toHaveAttribute("data-slot-state", "filled");
}

/** The statement.issued payload the store holds for this maker. */
async function statementFor(page: Page): Promise<Payloads["statement.issued"]> {
  const st = await page.evaluate((makerId) => {
    const s = window.__cindia!.store.getState() as unknown as {
      close: { statementByMaker: Record<string, string>; statements: Record<string, unknown> };
    };
    const id = s.close.statementByMaker[makerId];
    return id ? s.close.statements[id] : null;
  }, MAKER_ID);
  expect(st, "statement.issued for the maker is in the store").toBeTruthy();
  return st as Payloads["statement.issued"];
}

test("before statement.issued no total shows", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, BEFORE_STATEMENT);
  await expect(page.getByTestId("maker-statement-total")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-paid")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 2: at the end of d10-statement the total reads 本月收入 with the payload's totalCents", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, END_OF_D10);
  const st = await statementFor(page);
  const total = page.getByTestId("maker-statement-total");
  await expect(total).toBeVisible();
  await expect(total).toContainText(GLOSSARY.makerStatement.zh);
  await expect(total).toContainText(formatCents(st.totalCents));
  watch.expectClean();
});

test("Acceptance 4: the payout date reads 2026年10月2日", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, END_OF_D10);
  const st = await statementFor(page);
  const date = page.getByTestId("maker-statement-payout-date");
  await expect(date).toHaveText(formatDate(st.payoutDate, "zh"));
  await expect(date).toHaveText("2026年10月2日");
  watch.expectClean();
});

test("Acceptance 5: paid shows because payout.sent for the maker fired in d08-approve", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, END_OF_D10);
  const payoutMakers = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      approvals: { payouts: Record<string, { makerId: string }> };
    };
    return Object.values(s.approvals.payouts).map((p) => p.makerId);
  });
  expect(payoutMakers).toContain(MAKER_ID);
  await expect(page.getByTestId("maker-statement-paid")).toHaveText(GLOSSARY.paid.zh);
  watch.expectClean();
});

test("Acceptance 6: in English the header labels and date are English and the total is unchanged", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, END_OF_D10);
  const st = await statementFor(page);
  const toggle = page.getByTestId("demo-lang-toggle");
  // The toggle cycles auto, en, zh: one click from auto gives English everywhere.
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-lang", "en");
  const total = page.getByTestId("maker-statement-total");
  await expect(total).toContainText(GLOSSARY.makerStatement.en);
  await expect(total).not.toContainText(GLOSSARY.makerStatement.zh);
  await expect(total).toContainText(formatCents(st.totalCents));
  await expect(page.getByTestId("maker-statement-payout-date")).toHaveText("Oct 2, 2026");
  await expect(page.getByTestId("maker-statement-paid")).toHaveText(GLOSSARY.paid.en);
  watch.expectClean();
});
