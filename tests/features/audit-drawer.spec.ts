// F-audit T3: the audit drawer and its start list (acceptance 1, 2, 3, 4 and 7). Expected IDs and
// amounts come from the dataset in src/mock/, never typed in.
import { expect, test, type Page } from "@playwright/test";
import { flags, makerPayouts, orders } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { waitForHooks, watchPage } from "../smoke/lib";

const buyersOrder = orders.toSorted((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))[0];
const flag = flags[0];

/** The figures the start list must show, each with the dataset field its amount comes from. */
const FIGURES: { id: string; cents: number }[] = [
  ...makerPayouts.map((mp) => ({ id: mp.id, cents: mp.amountCents })),
  { id: flag.id, cents: flag.deltaCents },
  { id: buyersOrder.id, cents: buyersOrder.grossCents },
];

/** Opens a URL, then pauses and seeks just past month.closed. */
async function openAfterClose(page: Page, url: string) {
  await page.goto(url);
  await waitForHooks(page);
  const at = await page.evaluate(() => {
    const e = window.__cindia!.player.getTimeline()?.events.find((ev) => ev.type === "month.closed");
    return e ? e.at : null;
  });
  expect(at, "a month.closed in the timeline").not.toBeNull();
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, at! + 1);
  await expect(page.getByTestId("audit-drawer")).toBeVisible();
}

test("the dataset has the figures the plan names", () => {
  expect(FIGURES.map((f) => f.id)).toEqual(["mpo_01", "mpo_02", "mpo_03", "flg_01", "ord_001"]);
});

test("after the close the start list lists each figure with its amount", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page, "/studio/close?drawer=audit");
  const list = page.getByTestId("audit-start-list");
  await expect(list).toBeVisible();
  for (const f of FIGURES) {
    const item = page.getByTestId(`audit-start-${f.id}`);
    await expect(item).toBeVisible();
    await expect(item).toContainText(formatCents(f.cents));
  }
  await expect(list.locator('[data-testid^="audit-start-"]')).toHaveCount(FIGURES.length);
  watch.expectClean();
});

test("the drawer shows the Simulated badge in scripted mode", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page, "/studio/close?drawer=audit");
  await expect(page.getByTestId("audit-drawer").getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("clicking a maker payout shows its trail through the order to the bank record", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page, "/studio/close?drawer=audit");
  await page.getByTestId("audit-start-mpo_01").click();
  const trail = page.getByTestId("audit-trail");
  await expect(trail).toBeVisible();
  await expect(trail.getByTestId("audit-step-ord_001")).toBeVisible();
  const bank = trail.getByTestId("audit-bank-record");
  await expect(bank).toBeVisible();
  // The bank record is the trail's last step.
  const lastIsBank = await trail.evaluate((el) => {
    const steps = el.querySelectorAll('[data-testid^="audit-step-"], [data-testid="audit-bank-record"]');
    return steps.length > 0 && steps[steps.length - 1].getAttribute("data-testid") === "audit-bank-record";
  });
  expect(lastIsBank, "the trail ends with the bank record").toBe(true);
  await expect(page.getByTestId("audit-start-list")).toHaveCount(0);
  watch.expectClean();
});

test("a ref in the URL opens straight on that record's trail", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page, "/studio/close?drawer=audit&ref=mpo_01");
  const trail = page.getByTestId("audit-trail");
  await expect(trail).toBeVisible();
  await expect(trail.getByTestId("audit-step-ord_001")).toBeVisible();
  await expect(trail.getByTestId("audit-bank-record")).toBeVisible();
  watch.expectClean();
});

test("clicking the flag shows the contract, the statement and the bank deposit", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page, "/studio/close?drawer=audit");
  await page.getByTestId(`audit-start-${flag.id}`).click();
  const trail = page.getByTestId("audit-trail");
  await expect(trail).toBeVisible();
  const [contractId, statementId, txnId] = flag.recordIds;
  await expect(trail.getByTestId(`audit-step-${contractId}`)).toBeVisible();
  await expect(trail.getByTestId(`audit-step-${statementId}`)).toBeVisible();
  const bank = trail.getByTestId("audit-bank-record");
  await expect(bank).toBeVisible();
  await expect(bank).toHaveAttribute("data-record-id", txnId);
  await expect(trail).toContainText(formatCents(flag.expectedCents));
  await expect(trail).toContainText(formatCents(flag.actualCents));
  watch.expectClean();
});
