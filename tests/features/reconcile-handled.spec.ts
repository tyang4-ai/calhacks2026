// F-reconcile G4 fix: after d06-month plays through, the three special matches (bundled, refund
// netted, carried over) sit in the "Cindy handled" strip, inside the timeline's visible bounds and
// the viewport, while the streaming list has scrolled to its newest rows.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

// The demo's d06 screenshot is taken 300 ms before the beat ends at 30.0.
const SHOT_MS = 29700;

interface MatchLite {
  matchId: string;
  kind: string;
}

async function specialMatchIds(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const month = window.__cindia!.store.getState().month as unknown as { matchIds: string[]; matches: Record<string, MatchLite> };
    const out: Record<string, string> = {};
    for (const id of month.matchIds) {
      const m = month.matches[id]!;
      if (m.kind !== "one_to_one" && !out[m.kind]) out[m.kind] = m.matchId;
    }
    return out;
  });
}

async function expectInside(inner: Locator, outer: Locator, label: string) {
  const a = await inner.boundingBox();
  const b = await outer.boundingBox();
  expect(a, `${label} has a box`).not.toBeNull();
  expect(b, "the timeline has a box").not.toBeNull();
  expect(a!.height, `${label} has height`).toBeGreaterThan(0);
  expect(a!.y, `${label} top inside the timeline`).toBeGreaterThanOrEqual(b!.y - 1);
  expect(a!.y + a!.height, `${label} bottom inside the timeline`).toBeLessThanOrEqual(b!.y + b!.height + 1);
  expect(a!.x, `${label} left inside the timeline`).toBeGreaterThanOrEqual(b!.x - 1);
  expect(a!.x + a!.width, `${label} right inside the timeline`).toBeLessThanOrEqual(b!.x + b!.width + 1);
}

async function expectSpecialsInView(page: Page) {
  const ids = await specialMatchIds(page);
  expect(Object.keys(ids).sort(), "the three special kinds in the store").toEqual(["bundled", "carried_over", "refund_netted"]);
  const timeline = page.getByTestId("reconcile-timeline");
  await expect(page.getByTestId("reconcile-handled")).toBeVisible();
  for (const [kind, matchId] of Object.entries(ids)) {
    // The strip row carries the contract ID; the table row for the same match carries the internal one.
    const row = page.getByTestId(`reconcile-match-${matchId}`);
    await expect(row, `${kind}: one reconcile-match ID`).toHaveCount(1);
    await expect(page.getByTestId("reconcile-handled").getByTestId(`reconcile-match-${matchId}`), `${kind} in the strip`).toHaveCount(1);
    await expect(page.getByTestId("reconcile-list").getByTestId(`reconcile-row-${matchId}`), `${kind} table row`).toHaveCount(1);
    await expect(row, `${kind} pinned`).toBeVisible();
    await expect(row, `${kind} in the viewport`).toBeInViewport({ ratio: 1 });
    await expectInside(row, timeline, kind);
  }
  const strip = page.getByTestId("reconcile-handled");
  await expect(strip).toContainText("ord_015");
  await expect(strip).toContainText("ord_017");
  await expect(strip).toContainText("rfd_001");
  await expect(strip).toContainText("$95.00");
  await expect(strip).toContainText("ord_025");
  await expect(strip).toContainText("Oct 2");
  // Each strip row holds the figure d06's Figures column names for it.
  await expect(page.getByTestId(`reconcile-match-${ids.bundled}`)).toContainText("3 orders");
  await expect(page.getByTestId(`reconcile-match-${ids.refund_netted}`)).toContainText("$95.00");
  await expect(page.getByTestId(`reconcile-match-${ids.carried_over}`)).toContainText("Oct 2");
  // Every match in the store has exactly one reconcile-match ID on the page.
  const all = await page.evaluate(() => (window.__cindia!.store.getState().month as unknown as { matchIds: string[] }).matchIds);
  for (const mid of all) await expect(page.getByTestId(`reconcile-match-${mid}`), mid).toHaveCount(1);
  // The streaming list still keeps its newest row in view.
  await expect(
    page.getByTestId("reconcile-list").locator('[data-testid^="reconcile-record-"], [data-testid^="reconcile-match-"], [data-testid^="reconcile-row-"]').last(),
  ).toBeInViewport();
}

test("after d06-month plays through, the bundled, refund-netted and carried-over matches stay in view", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/studio/month");
  await waitForHooks(page);
  // Step through d06 in 300 ms seeks, so rows arrive and the list scrolls as in playback, without
  // depending on requestAnimationFrame keeping pace under test load.
  for (let ms = 20000; ms <= SHOT_MS; ms += 300) {
    await page.evaluate((t) => {
      const c = window.__cindia!;
      c.player.pause();
      c.player.seek(t);
    }, ms);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  }
  await expect(page.getByTestId("reconcile-flag")).toHaveCount(0);
  await expectSpecialsInView(page);
  watch.expectClean();
});

test("the pinned strip renders the same after a seek straight to the d06 screenshot", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/studio/month");
  await waitForHooks(page);
  await page.evaluate((ms) => {
    const c = window.__cindia!;
    c.player.pause();
    c.player.seek(ms);
  }, SHOT_MS);
  await expectSpecialsInView(page);
  watch.expectClean();
});
