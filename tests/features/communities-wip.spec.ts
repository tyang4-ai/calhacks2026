// F-communities T4: a work in progress and its milestones on the Shop side. Acceptance 7, and the
// Shop side of 9: once apr_05 is granted and its wip.milestone_paid has arrived, mls_02 shows paid
// with its amount. The person's wip.milestone_reached here is the event Sell's release button
// emits; the scripted answers come from the sources registry. Expected values come from src/mock/.
import { expect, test, type Page } from "@playwright/test";
import { apr_05, usd, worksInProgress } from "../../src/mock/index";
import { formatDate } from "../../src/ui/formatDate";
import { watchPage } from "../smoke/lib";
import { communitiesState, emitUser, grantApr05, openPage, setLang, WORDS } from "./communities-lib";

const wip = worksInProgress.find((w) => w.id === apr_05.subjectIds[0])!;
const released = wip.milestones.find((m) => m.milestoneId === apr_05.subjectIds[1])!;

/** The first dollar amount in a milestone's row, in cents. */
async function rowAmount(page: Page, milestoneId: string): Promise<number> {
  const text = await page.getByTestId(`wip-milestone-${milestoneId}`).innerText();
  const m = /\$([\d,]+)\.(\d\d)/.exec(text);
  if (!m) throw new Error(`no amount in wip-milestone-${milestoneId}: ${text}`);
  return Number(m[1].replace(/,/g, "")) * 100 + Number(m[2]);
}

test("7: the commission shows one milestone per milestone with its status, and the amounts add up to the price", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, `/shop/projects/${wip.id}`);
  const view = page.getByTestId("communities-wip-page");
  await expect(view).toBeVisible();
  await expect(view).toContainText(wip.title.en);
  await expect(view).toContainText(usd(wip.priceCents));
  const rows = view.locator('[data-testid^="wip-milestone-"]');
  await expect(rows).toHaveCount(wip.milestones.length);
  const ids = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(wip.milestones.map((m) => `wip-milestone-${m.milestoneId}`));
  for (const m of wip.milestones) {
    const row = page.getByTestId(`wip-milestone-${m.milestoneId}`);
    await expect(row).toHaveAttribute("data-status", m.status);
    await expect(row).toContainText(m.label.en);
  }
  expect(wip.milestones.map((m) => m.status)).toEqual(["paid", "pending", "pending"]);
  let total = 0;
  for (const m of wip.milestones) total += await rowAmount(page, m.milestoneId);
  expect(total).toBe(wip.priceCents);
  // Shop mode is read-only.
  await expect(page.locator('[data-testid^="wip-release-"]')).toHaveCount(0);
  watch.expectClean();
});

test("9 (Shop): once apr_05 is granted and its payment arrives, mls_02 shows paid with its amount", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, `/shop/projects/${wip.id}`);
  await emitUser(page, "wip.milestone_reached", { wipId: wip.id, milestoneId: released.milestoneId, date: apr_05.decisionDate });
  await expect.poll(async () => (await communitiesState(page)).approvals.items[apr_05.id]?.requested ?? false).toBe(true);
  const row = page.getByTestId(`wip-milestone-${released.milestoneId}`);
  await expect(row).toHaveAttribute("data-status", "reached");

  await grantApr05(page);
  await expect(row).toHaveAttribute("data-status", "paid");
  const paid = (await communitiesState(page)).wip.milestones[released.milestoneId];
  expect(paid.amountCents).toBe(apr_05.amountCents);
  await expect(row).toContainText(WORDS.paid.en);
  await expect(row).toContainText(usd(apr_05.amountCents!));
  await expect(row).toContainText(formatDate(paid.date, "en"));
  await expect(page.locator('[data-testid^="wip-release-"]')).toHaveCount(0);
  watch.expectClean();
});

test("11: in Chinese the commission and its milestone labels show their Chinese text, and amounts stay dollars", async ({ page }) => {
  await openPage(page, `/shop/projects/${wip.id}`);
  await setLang(page, "zh");
  const view = page.getByTestId("communities-wip-page");
  await expect(view).toContainText(wip.title.zh);
  for (const m of wip.milestones) await expect(page.getByTestId(`wip-milestone-${m.milestoneId}`)).toContainText(m.label.zh);
  await expect(page.getByTestId(`wip-milestone-${released.milestoneId}`)).toContainText("$");
});
