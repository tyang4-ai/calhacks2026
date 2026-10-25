// F-reconcile T2, on M-desktop's /sell/month at 1440 by 900: the month timeline. Acceptance 1
// (records in date order, counters rising, newest rows in view mid-month), 3 (no flag and no
// statement before the catch) and 8 (same rows after any seek). Every moment comes from the
// timeline's own events (monthAnchors), never a fixed time.
import { expect, test, type Page } from "@playwright/test";
import { SELL_VIEWPORT, monthAnchors, openSell, seekTo, waitForHooks, watchPage, type MonthAnchors } from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

interface MonthSnapshot {
  records: Record<string, { recordId: string; recordType: string; date: string }>;
  recordIds: string[];
  matches: Record<string, { matchId: string; recordIds: string[] }>;
  matchIds: string[];
}

/** Early in the month (just after it starts) and mid-month (halfway to its last match). */
const early = (a: MonthAnchors) => a.start + 800;
const midMonth = (a: MonthAnchors) => Math.round(a.start + (a.lastMatch - a.start) / 2);

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

test("mid-month the timeline shows the month's records in date order, counters risen, newest rows in view", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "month");
  const a = await monthAnchors(page);

  await seekTo(page, early(a));
  await expect(page.getByTestId("reconcile-timeline")).toBeVisible();
  const before = await monthState(page);
  const ordersBefore = before.recordIds.filter((id) => before.records[id]!.recordType === "order").length;
  await expect.poll(() => counter(page, "order")).toBe(ordersBefore);

  await seekTo(page, midMonth(a));
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

test("after the month's last match there is no flag and no statement yet", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "month");
  const a = await monthAnchors(page);
  await seekTo(page, Math.min(a.lastMatch + 300, a.flag - 1));
  await expect(page.getByTestId("reconcile-timeline")).toBeVisible();
  await expectRowsMatchStore(page);
  await expect(page.getByTestId("reconcile-flag")).toHaveCount(0);
  const m = await monthState(page);
  expect(m.recordIds.filter((id) => m.records[id]!.recordType === "statement")).toEqual([]);
  await expect.poll(() => counter(page, "statement")).toBe(0);
  watch.expectClean();
});

test("the same rows render mid-month after seeking away and back, and after a reload", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "month");
  const a = await monthAnchors(page);
  await seekTo(page, midMonth(a));
  await expectRowsMatchStore(page);
  const first = await rowTestIds(page);
  expect(first.length).toBeGreaterThan(0);

  await seekTo(page, a.explained + 300);
  await expectRowsMatchStore(page);
  await seekTo(page, midMonth(a));
  await expect.poll(() => rowTestIds(page)).toEqual(first);

  await page.reload();
  await waitForHooks(page);
  await seekTo(page, midMonth(a));
  await expect.poll(() => rowTestIds(page)).toEqual(first);
  watch.expectClean();
});
