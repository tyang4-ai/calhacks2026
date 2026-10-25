// F-reconcile T4, on M-desktop's /sell/month at 1440 by 900: the month view plays the month into the
// catch, and the panel is marked Simulated in scripted mode (acceptance 7, and M-desktop's 8). The
// timeline is stepped through by seeks to its own events, never played on the wall clock.
import { expect, test, type Page } from "@playwright/test";
import { SELL_VIEWPORT, monthAnchors, openSell, seekTo, watchPage } from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

interface MonthSlice {
  matchIds: string[];
  flagIds: string[];
  flags: Record<string, { explanation?: { en: string; zh: string } }>;
}

const month = (page: Page) => page.evaluate(() => window.__cindia!.store.getState().month as unknown as MonthSlice);

async function open(page: Page) {
  await openSell(page, "month");
  await expect(page.getByTestId("reconcile-timeline")).toBeVisible();
}

test("scripted mode: the reconcile and scenario panels show the Simulated badge", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b01-match"]).toBe("scripted");
  expect(sources["b02-explain"]).toBe("scripted");
  expect(sources["b16-bank-books"]).toBe("scripted");
  await expect(page.locator('[data-slot="studio.month.main"]').getByTestId("simulated-badge")).toBeVisible();
  await expect(page.locator('[data-slot="studio.month.side"]').getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("the month plays into the catch: matches build up, then the flag, evidence and explanation land", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const a = await monthAnchors(page);

  // Inside the month: matches appear, no flag yet.
  for (let ms = a.start; ms < a.lastMatch; ms += 1000) await seekTo(page, ms);
  await seekTo(page, Math.min(a.lastMatch + 300, a.flag - 1));
  const mid = await month(page);
  expect(mid.matchIds.length).toBeGreaterThan(0);
  for (const id of mid.matchIds) await expect(page.getByTestId(`reconcile-match-${id}`)).toBeVisible();
  await expect(page.getByTestId("reconcile-flag")).toHaveCount(0);

  // Through the catch: it lands on top of the timeline.
  await seekTo(page, a.flag + 300);
  await expect(page.getByTestId("reconcile-flag")).toBeVisible();
  await seekTo(page, a.explained + 300);
  await expect(page.getByTestId("reconcile-flag")).toBeVisible();
  await expect(page.getByTestId("reconcile-flag")).toContainText("$340.00");
  for (const card of ["contract", "statement", "bank"]) await expect(page.getByTestId(`reconcile-evidence-${card}`)).toBeVisible();
  const end = await month(page);
  const explanation = end.flags[end.flagIds[0]]?.explanation;
  expect(explanation).toBeTruthy();
  await expect(page.getByTestId("reconcile-explanation")).toContainText(explanation!.en);

  // The catch sits above the timeline.
  const flagBox = await page.getByTestId("reconcile-flag").boundingBox();
  const timelineBox = await page.getByTestId("reconcile-timeline").boundingBox();
  expect(flagBox && timelineBox && flagBox.y < timelineBox.y).toBe(true);
  watch.expectClean();
});
