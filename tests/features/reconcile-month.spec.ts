// F-reconcile T2: the month timeline. Acceptance 1 (records in date order, counters rising, newest
// rows in view at 25 s), 3 (no flag and no statement before d07) and 8 (same rows after any seek).
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

interface MonthSnapshot {
  records: Record<string, { recordId: string; recordType: string; date: string }>;
  recordIds: string[];
  matches: Record<string, { matchId: string; recordIds: string[] }>;
  matchIds: string[];
}

async function open(page: Page) {
  await page.goto("/studio/month");
  await waitForHooks(page);
}

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    const c = window.__cindia!;
    c.player.pause();
    c.player.seek(t);
  }, ms);
}

async function monthState(page: Page): Promise<MonthSnapshot> {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { month: MonthSnapshot };
    return JSON.parse(JSON.stringify(s.month)) as MonthSnapshot;
  });
}

// The streaming table's rows: unmatched records, one-to-one matches (reconcile-match-<id>) and the
// special matches, whose table rows carry reconcile-row-<id> while the pinned strip holds their
// reconcile-match-<id>.
const rowsIn = (page: Page) =>
  page
    .getByTestId("reconcile-list")
    .locator('[data-testid^="reconcile-record-"], [data-testid^="reconcile-match-"], [data-testid^="reconcile-row-"]');

const matchIdOf = (tid: string) => tid.replace(/^reconcile-(match|row)-/, "");

async function rowTestIds(page: Page): Promise<string[]> {
  return rowsIn(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-testid") ?? ""));
}

/** Waits until the rendered rows are exactly the store's records, folded into its matches. */
async function expectRowsMatchStore(page: Page) {
  await expect
    .poll(async () => {
      const m = await monthState(page);
      const ids = new Set(await rowTestIds(page));
      return m.recordIds.every((rid) => {
        if (ids.has(`reconcile-record-${rid}`)) return true;
        return m.matchIds.some(
          (mid) => (ids.has(`reconcile-match-${mid}`) || ids.has(`reconcile-row-${mid}`)) && m.matches[mid]!.recordIds.includes(rid),
        );
      });
    })
    .toBe(true);
}

async function counter(page: Page, type: string): Promise<number> {
  const el = page.getByTestId(`reconcile-counter-${type}`);
  await expect(el).toBeVisible();
  const text = (await el.textContent()) ?? "";
  const n = /(\d+)/.exec(text);
  expect(n, `a number in reconcile-counter-${type}`).not.toBeNull();
  return Number(n![1]);
}

test("at 25 s the timeline shows the month's records in date order, counters risen, newest rows in view", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);

  await seek(page, 21000);
  await expect(page.getByTestId("reconcile-timeline")).toBeVisible();
  const before = await monthState(page);
  const ordersBefore = before.recordIds.filter((id) => before.records[id]!.recordType === "order").length;
  await expect.poll(() => counter(page, "order")).toBe(ordersBefore);

  await seek(page, 25000);
  const timeline = page.getByTestId("reconcile-timeline");
  await expect(timeline).toBeVisible();
  const m = await monthState(page);
  const ordersNow = m.recordIds.filter((id) => m.records[id]!.recordType === "order").length;
  await expect.poll(() => counter(page, "order")).toBe(ordersNow);
  expect(ordersNow).toBeGreaterThan(0);
  expect(ordersNow).toBeGreaterThan(ordersBefore);

  // Every record arrived is shown, alone or inside a match that names it.
  await expectRowsMatchStore(page);

  // Rows are in date order: a record row at its date, a match row at its payout's date.
  const ids = await rowTestIds(page);
  expect(ids.length).toBeGreaterThan(0);
  const dates = ids.map((tid) => {
    if (tid.startsWith("reconcile-record-")) return m.records[tid.slice("reconcile-record-".length)]!.date;
    const match = m.matches[matchIdOf(tid)]!;
    return m.records[match.recordIds[0]!]!.date;
  });
  for (let i = 1; i < dates.length; i++) expect(dates[i]! >= dates[i - 1]!, `row ${i} (${ids[i]}) is not before row ${i - 1}`).toBe(true);

  // The newest rows stay in view.
  await expect(rowsIn(page).last()).toBeInViewport();
  watch.expectClean();
});

test("at the end of d06-month there is no flag and no statement yet", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  await seek(page, 29900);
  await expect(page.getByTestId("reconcile-timeline")).toBeVisible();
  await expectRowsMatchStore(page);
  await expect(page.getByTestId("reconcile-flag")).toHaveCount(0);
  const m = await monthState(page);
  expect(m.recordIds.filter((id) => m.records[id]!.recordType === "statement")).toEqual([]);
  await expect.poll(() => counter(page, "statement")).toBe(0);
  watch.expectClean();
});

test("the same rows render at 25 s after seeking away and back, and after a reload", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  await seek(page, 25000);
  await expectRowsMatchStore(page);
  const first = await rowTestIds(page);
  expect(first.length).toBeGreaterThan(0);

  await seek(page, 37900);
  await expectRowsMatchStore(page);
  await seek(page, 25000);
  await expect.poll(() => rowTestIds(page)).toEqual(first);

  await page.reload();
  await waitForHooks(page);
  await seek(page, 25000);
  await expect.poll(() => rowTestIds(page)).toEqual(first);
  watch.expectClean();
});
