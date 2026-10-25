// M-maker-statement T2: the header on /maker/mkr_01 at 1440 by 900. The maker, her community and
// the Demo data badge, the month, "This month's income" with the payload's total (Acceptance 2), the
// payout date, paid (Acceptance 3), and the header in Chinese (Acceptance 5). Every seek is anchored
// on an event, never a fixed time.
import { expect, test } from "@playwright/test";
import { GLOSSARY } from "../../src/features/maker-statement/strings";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate, formatMonth } from "../../src/ui/formatDate";
import { watchPage } from "../smoke/lib";
import {
  DINE,
  FRAME_VIEWPORT,
  GRACE,
  MAKER_ID,
  MPO_01,
  MST_01,
  eventAt,
  openMaker,
  seekToStatement,
  statementFor,
  toChinese,
} from "./maker-statement-lib";

test.use({ viewport: FRAME_VIEWPORT });

test("before statement.issued the header shows only the maker: no total, payout date or paid", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, -300);
  const header = page.getByTestId("maker-statement-header");
  await expect(header).toContainText(GRACE.name.en);
  await expect(page.getByTestId("maker-statement-total")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-payout-date")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-paid")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 2: the header shows Grace N., the Diné Weaving and Silver Co-op with the Demo data badge, and the month", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  const header = page.getByTestId("maker-statement-header");
  await expect(header).toBeVisible();
  await expect(header).toContainText(GRACE.name.en);
  await expect(header).toContainText(DINE.name.en);
  await expect(header).toContainText("Diné Weaving and Silver Co-op");
  await expect(header.locator('[data-variant="demo"]')).toBeVisible();
  await expect(header).toContainText(formatMonth(MST_01.monthId, "en"));
  // Nobody has a nativeName in v2, so its line doesn't render.
  expect(GRACE.nativeName).toBeUndefined();
  await expect(page.getByTestId("maker-statement-native-name")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 2: the total reads This month's income with the payload's totalCents, the largest text on the page", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  const st = await statementFor(page);
  expect(st, "statement.issued for mkr_01 is in the store").not.toBeNull();
  const total = page.getByTestId("maker-statement-total");
  await expect(total).toBeVisible();
  await expect(total).toContainText(GLOSSARY.makerStatement.en);
  await expect(total).toContainText(formatCents(st!.totalCents));
  expect(st!.totalCents).toBe(MST_01.totalCents);

  // The total's figure is the largest text in the main column.
  const sizes = await page.locator('[data-slot="maker.main"]').evaluate((slot) => {
    const totalEl = slot.querySelector('[data-testid="maker-statement-total"]')!;
    let totalPx = 0;
    let otherPx = 0;
    for (const el of slot.querySelectorAll("*")) {
      const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
      if (!own) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (totalEl.contains(el)) totalPx = Math.max(totalPx, px);
      else otherPx = Math.max(otherPx, px);
    }
    return { totalPx, otherPx };
  });
  expect(sizes.totalPx).toBeGreaterThan(sizes.otherPx);
  watch.expectClean();
});

test("Acceptance 2: the payout date reads Oct 2, 2026 from the payload", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  const st = await statementFor(page);
  const date = page.getByTestId("maker-statement-payout-date");
  await expect(date).toHaveText(formatDate(st!.payoutDate, "en"));
  await expect(date).toHaveText("Oct 2, 2026");
  watch.expectClean();
});

test("Acceptance 3: paid reads Paid, because payout.sent for mpo_01 fired earlier in the timeline", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  const paidAt = await eventAt(page, "payout.sent", { makerPayoutId: MPO_01.id });
  const statementAt = await eventAt(page, "statement.issued", { makerId: MAKER_ID });
  expect(paidAt, "the timeline has payout.sent for mpo_01").not.toBeNull();
  expect(statementAt, "the timeline has statement.issued for mkr_01").not.toBeNull();
  expect(paidAt!).toBeLessThan(statementAt!);
  expect(MPO_01.makerId).toBe(MAKER_ID);

  await seekToStatement(page, 300);
  const payoutMakers = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { approvals: { payouts: Record<string, { makerId: string }> } };
    return Object.values(s.approvals.payouts).map((p) => p.makerId);
  });
  expect(payoutMakers).toContain(MAKER_ID);
  await expect(page.getByTestId("maker-statement-paid")).toHaveText(GLOSSARY.paid.en);
  watch.expectClean();
});

test("Acceptance 5: in Chinese the header labels and date are Chinese and the total is unchanged", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  const st = await statementFor(page);
  await toChinese(page);
  const total = page.getByTestId("maker-statement-total");
  await expect(total).toContainText(GLOSSARY.makerStatement.zh);
  await expect(total).not.toContainText(GLOSSARY.makerStatement.en);
  await expect(total).toContainText(formatCents(st!.totalCents));
  await expect(page.getByTestId("maker-statement-payout-date")).toHaveText("2026年10月2日");
  await expect(page.getByTestId("maker-statement-paid")).toHaveText(GLOSSARY.paid.zh);
  const header = page.getByTestId("maker-statement-header");
  await expect(header).toContainText(DINE.name.zh);
  await expect(header).toContainText(formatMonth(MST_01.monthId, "zh"));
  watch.expectClean();
});
