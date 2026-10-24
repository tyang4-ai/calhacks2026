// F-reconcile T4: the month view plays d06-month into d07-catch, and the panel is marked Simulated
// in scripted mode (Acceptance 7). Selects by test ID only.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";

interface MonthSlice {
  matchIds: string[];
  flagIds: string[];
  flags: Record<string, { explanation?: { en: string; zh: string } }>;
}

const month = (page: Page) => page.evaluate(() => window.__cindia!.store.getState().month as unknown as MonthSlice);
const now = (page: Page) => page.evaluate(() => window.__cindia!.player.now());

async function open(page: Page) {
  await page.goto("/studio/month");
  await waitForHooks(page);
  await waitForSlots(page);
  await expect(page.getByTestId("reconcile-timeline")).toBeVisible();
}

test("scripted mode: the reconcile panel shows the Simulated badge", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b01-match"]).toBe("scripted");
  expect(sources["b02-explain"]).toBe("scripted");
  const slot = page.locator('[data-slot="studio.month.main"]');
  await expect(slot.getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("d06-month plays into d07-catch: matches build up, then the flag, evidence and explanation land", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player as unknown as { pause(): void; seek(ms: number): void; setSpeed(x: number): void; play(): void };
    p.pause();
    p.seek(20000);
    p.setSpeed(4);
    p.play();
  });

  // Inside d06: matches appear, no flag yet.
  await page.waitForFunction(() => window.__cindia!.player.now() >= 29000, null, { timeout: 15000 });
  await page.evaluate(() => window.__cindia!.player.pause());
  expect(await now(page)).toBeLessThan(30300);
  const mid = await month(page);
  expect(mid.matchIds.length).toBeGreaterThan(0);
  for (const id of mid.matchIds) await expect(page.getByTestId(`reconcile-match-${id}`)).toBeVisible();
  await expect(page.getByTestId("reconcile-flag")).toHaveCount(0);

  // Through d07: the catch lands on top of the timeline.
  await page.evaluate(() => window.__cindia!.player.play());
  await page.waitForFunction(() => window.__cindia!.player.now() >= 37000, null, { timeout: 15000 });
  await page.evaluate(() => window.__cindia!.player.pause());
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
