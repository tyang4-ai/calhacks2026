// F-reconcile T1 (acceptance 2), on M-desktop's /sell/month at 1440 by 900: after the month's last
// match.made every match has its row, and the bundled, refund-netted and carried-over matches name
// their records, amount and date. Seeks by event.
import { expect, test } from "@playwright/test";
import type { ChannelPayout, Refund } from "../../src/core/types";
import { getById } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { SELL_VIEWPORT, monthAnchors, openSell, seekTo, watchPage } from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

interface MatchLite {
  matchId: string;
  kind: string;
  recordIds: string[];
}

test("every match.made has its reconcile-match row, and the special kinds name their records", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "month");
  const a = await monthAnchors(page);
  await seekTo(page, Math.min(a.lastMatch + 300, a.flag - 1));

  const matches = await page.evaluate(() => {
    const month = window.__cindia!.store.getState().month as { matchIds: string[]; matches: Record<string, MatchLite> };
    return month.matchIds.map((id) => month.matches[id]);
  });
  expect(matches.length, "match.made events by the end of the month").toBeGreaterThan(0);

  for (const m of matches) {
    await expect(page.getByTestId(`reconcile-match-${m.matchId}`)).toBeVisible();
  }

  const byKind = (kind: string) => {
    const m = matches.find((x) => x.kind === kind);
    expect(m, `a ${kind} match in the store`).toBeDefined();
    return m!;
  };

  // Bundled: one payout, ord_015 to ord_017, under the bundled payout label.
  const bundled = page.getByTestId(`reconcile-match-${byKind("bundled").matchId}`);
  for (const id of ["ord_015", "ord_016", "ord_017"]) await expect(bundled).toContainText(id);
  await expect(bundled).toContainText("Bundled payout");

  // Refund netted: rfd_001 and its amount taken out.
  const refund = getById<Refund>("rfd_001");
  expect(refund, "rfd_001 in the mock data").toBeDefined();
  const refundRow = page.getByTestId(`reconcile-match-${byKind("refund_netted").matchId}`);
  await expect(refundRow).toContainText("rfd_001");
  await expect(refundRow).toContainText(formatCents(refund!.amountCents));

  // Carried over: ord_025 and ord_026, landing on the payout's date (Oct 2).
  const carried = byKind("carried_over");
  const carriedPayout = getById<ChannelPayout>(carried.recordIds[0]);
  expect(carriedPayout, "the carried-over match's payout in the mock data").toBeDefined();
  const carriedRow = page.getByTestId(`reconcile-match-${carried.matchId}`);
  for (const id of ["ord_025", "ord_026"]) await expect(carriedRow).toContainText(id);
  await expect(carriedRow).toContainText(formatDate(carriedPayout!.date, "en"));

  watch.expectClean();
});
