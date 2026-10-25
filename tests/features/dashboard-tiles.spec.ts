// F-dashboard T2: the dashboard tiles (every Acceptance line in docs/plans/F-dashboard.md).
// Event times and payloads come from the playing timeline, amounts from src/mock. Seek-based only.
import { expect, test, type Page } from "@playwright/test";
import { formatBps, formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { monthId, orders, refunds } from "../../src/mock";
import { UI } from "../../src/features/dashboard/strings";
import { SELL_VIEWPORT, expectInsideFrame, expectReadableText, openSell, watchPage } from "./sell-views-lib";

// M-desktop: the dashboard on /sell/dashboard at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

interface TimelineEvent {
  type: string;
  at: number;
  payload: Record<string, unknown>;
}

interface Closed {
  monthId: string;
  salesCents: number;
  feesCents: number;
  makerPayCents: number;
  heldCents: number;
}

interface Synced {
  accountId: string;
  balanceCents: number;
  asOf: string;
}

const TILE_IDS = ["dashboard-tile-revenue", "dashboard-tile-cash", "dashboard-tile-flags", "dashboard-tile-maker-share"] as const;

async function open(page: Page) {
  await openSell(page, "dashboard");
  await page.evaluate(() => window.__cindia!.player.pause());
  await expect(page.getByTestId("dashboard-tiles")).toBeVisible();
}

async function seekTo(page: Page, ms: number) {
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function timeline(page: Page): Promise<TimelineEvent[]> {
  const events = await page.evaluate(() => window.__cindia!.player.getTimeline()?.events ?? []);
  expect(events.length, "a timeline is loaded").toBeGreaterThan(0);
  return (events as TimelineEvent[]).toSorted((a, b) => a.at - b.at);
}

function first(events: TimelineEvent[], type: string, where: (e: TimelineEvent) => boolean = () => true): TimelineEvent {
  const e = events.find((x) => x.type === type && where(x));
  expect(e, `a ${type} in the timeline`).toBeDefined();
  return e!;
}

/** The latest event of a type at or before ms. */
function latestBy(events: TimelineEvent[], type: string, ms: number): TimelineEvent {
  const list = events.filter((x) => x.type === type && x.at <= ms);
  expect(list.length, `a ${type} at or before ${ms}`).toBeGreaterThan(0);
  return list[list.length - 1];
}

const valueIn = (page: Page, id: string) => page.getByTestId(id).locator('[data-role="value"]');

async function barCents(page: Page): Promise<number[]> {
  return page
    .getByTestId("dashboard-revenue-chart")
    .locator("li[data-channel]")
    .evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-cents"))));
}

/** September's sales less the refund, from the dataset. */
function expectedSales(): number {
  const gross = orders.filter((o) => o.date.startsWith(monthId)).reduce((s, o) => s + o.grossCents, 0);
  const refunded = refunds.filter((r) => r.date.startsWith(monthId)).reduce((s, r) => s + r.amountCents, 0);
  return gross - refunded;
}

/** makerPay / sales in basis points, rounded half up. */
const shareBps = (part: number, whole: number) => Math.round((part * 10000) / whole);

async function expectFinal(page: Page, events: TimelineEvent[], ms: number) {
  const closed = latestBy(events, "month.closed", ms).payload as unknown as Closed;
  const synced = latestBy(events, "account.synced", ms).payload as unknown as Synced;
  const flags = new Set(events.filter((e) => e.type === "flag.raised" && e.at <= ms).map((e) => e.payload.flagId as string));

  for (const id of TILE_IDS) await expect(page.getByTestId(id), id).toBeVisible();

  // Revenue: three bars, adding up to the month's sales less the refund.
  const bars = await barCents(page);
  expect(bars).toHaveLength(3);
  const sum = bars.reduce((s, c) => s + c, 0);
  expect(sum, "bars add up to month.closed salesCents").toBe(closed.salesCents);
  expect(sum, "bars add up to September's sales less the refund").toBe(expectedSales());
  await expect(valueIn(page, "dashboard-tile-revenue")).toHaveText(formatCents(sum));
  await expect(page.getByTestId("dashboard-revenue-chart").locator(".recharts-bar-rectangle")).toHaveCount(3);

  // Cash.
  await expect(valueIn(page, "dashboard-tile-cash")).toHaveText(formatCents(synced.balanceCents));
  await expect(page.getByTestId("dashboard-tile-cash")).toContainText(formatDate(synced.asOf, "en"));

  // Flags.
  await expect(valueIn(page, "dashboard-tile-flags")).toHaveText(String(flags.size));

  // Maker share.
  await expect(valueIn(page, "dashboard-tile-maker-share")).toHaveText(formatCents(closed.makerPayCents));
  await expect(page.getByTestId("dashboard-tile-maker-share").locator('[data-role="share"]')).toHaveText(
    formatBps(shareBps(closed.makerPayCents, closed.salesCents)),
  );
  await expect(page.getByTestId("dashboard-tile-maker-share").locator('[data-role="held"]')).toHaveText(formatCents(closed.heldCents));
}

test("before the first account.synced no tiles show, only the empty line", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  const synced = first(events, "account.synced");
  // The plan says no tile has its event before account.synced. If this fails, the plan's line needs a look.
  for (const type of ["ledger.posted", "flag.raised", "month.closed"]) {
    expect(events.some((e) => e.type === type && e.at < synced.at), `${type} before account.synced`).toBe(false);
  }
  await seekTo(page, synced.at - 1);
  for (const id of TILE_IDS) await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.getByTestId("dashboard-tiles")).toContainText(UI.empty.en);
  watch.expectClean();
});

test("account.synced brings the cash tile with its balanceCents", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  const synced = first(events, "account.synced");
  await seekTo(page, synced.at);
  const p = synced.payload as unknown as Synced;
  await expect(valueIn(page, "dashboard-tile-cash")).toHaveText(formatCents(p.balanceCents));
  await expect(page.getByTestId("dashboard-tile-cash")).toContainText(`${UI.asOf.en} ${formatDate(p.asOf, "en")}`);
  await expect(page.getByTestId("dashboard-tiles")).not.toContainText(UI.empty.en);
  watch.expectClean();
});

test("the first ledger.posted brings the revenue tile with one bar per channel", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  const posted = first(events, "ledger.posted");
  await seekTo(page, posted.at - 1);
  await expect(page.getByTestId("dashboard-tile-revenue")).toHaveCount(0);
  await seekTo(page, posted.at);
  await expect(page.getByTestId("dashboard-tile-revenue")).toBeVisible();
  await expect(page.getByTestId("dashboard-revenue-chart")).toBeVisible();
  await expect(page.getByTestId("dashboard-revenue-chart").locator("li[data-channel]")).toHaveCount(3);
  await expect(page.getByTestId("dashboard-revenue-chart").locator("svg.recharts-surface").first()).toBeVisible();
  watch.expectClean();
});

test("flag.raised for flg_01 brings the flags tile with one open flag", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  const raised = first(events, "flag.raised", (e) => e.payload.flagId === "flg_01");
  await seekTo(page, raised.at - 1);
  await expect(page.getByTestId("dashboard-tile-flags")).toHaveCount(0);
  await seekTo(page, raised.at);
  await expect(valueIn(page, "dashboard-tile-flags")).toHaveText("1");
  await expect(page.getByTestId("dashboard-tile-flags")).toContainText(UI.openOne.en);
  watch.expectClean();
});

test("month.closed brings the maker share tile with makerPayCents and its share of sales", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  const closedEvent = first(events, "month.closed");
  await seekTo(page, closedEvent.at - 1);
  await expect(page.getByTestId("dashboard-tile-maker-share")).toHaveCount(0);
  await seekTo(page, closedEvent.at);
  const c = closedEvent.payload as unknown as Closed;
  const tile = page.getByTestId("dashboard-tile-maker-share");
  await expect(valueIn(page, "dashboard-tile-maker-share")).toHaveText(formatCents(c.makerPayCents));
  await expect(tile.locator('[data-role="share"]')).toHaveText(formatBps(shareBps(c.makerPayCents, c.salesCents)));
  await expect(tile).toContainText(UI.ofSales.en);
  watch.expectClean();
});

test("once the month has closed the revenue bars add up to September's sales less the refund", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  const closedEvent = first(events, "month.closed");
  await seekTo(page, closedEvent.at);
  const c = closedEvent.payload as unknown as Closed;
  const sum = (await barCents(page)).reduce((s, x) => s + x, 0);
  expect(sum).toBe(c.salesCents);
  expect(sum).toBe(expectedSales());
  watch.expectClean();
});

test("one seek past the close shows all four tiles at once with their final values", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  const closedEvent = first(events, "month.closed");
  const target = closedEvent.at + 500;
  await seekTo(page, target);
  // Finished at once: every tile wrapper is fully shown, no motion in flight.
  for (const id of TILE_IDS) {
    const opacity = await page.getByTestId(id).evaluate((el) => getComputedStyle(el.parentElement!).opacity);
    expect(opacity, `${id} opacity right after the seek`).toBe("1");
  }
  await expectFinal(page, events, target);
  watch.expectClean();
});

test("in scripted mode the dashboard shows the simulated badge", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  await seekTo(page, first(events, "month.closed").at + 500);
  const panel = page.locator('[data-slot="studio.dashboard.main"]');
  await expect(panel.getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("M-desktop: past the close the four tiles flow into the wider view and sit inside the frame", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  const events = await timeline(page);
  await seekTo(page, first(events, "month.closed").at + 500);
  await expectInsideFrame(page, [...TILE_IDS]);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.dashboard.main"]');
  await expect(page.locator('[data-slot="studio.dashboard.main"]').getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});
