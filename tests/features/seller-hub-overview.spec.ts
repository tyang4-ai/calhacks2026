// F-seller-hub T2: the overview's tiles and their figures.
// - Acceptance 1: 300 ms after the timeline's flag.raised for flg_01, money waiting reads the flag's
//   $340.00, open flags reads 1, and sales reads the gross of the orders arrived so far, less the
//   refund once rfd_001 has arrived. A click on the waiting tile opens /sell/month without a reload.
// - Acceptance 2: approvals waiting rises by 2 with apr_01 and apr_02 and falls by 2 after both
//   grants. A seeded counterfeit.flagged makes possible copies read 1.
// - Acceptance 10: the overview panel shows simulated-badge in scripted mode.
// Seeks by event only, selects by test ID only. Expected values come from src/mock/.
import { expect, test, type Page } from "@playwright/test";
import type { CindiaState } from "../../src/core/state";
import { counterfeitCandidates, flags, orders, refunds } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { OVERVIEW } from "../../src/features/seller-hub/strings";
import { watchPage } from "../smoke/lib";
import { FRAME_VIEWPORT, openSell, seed, seekToEvent, storeState } from "./seller-hub-lib";

test.use({ viewport: FRAME_VIEWPORT });

const FLG_01 = flags.find((f) => f.id === "flg_01")!;
const RFD_001 = refunds.find((r) => r.id === "rfd_001")!;

function tile(page: Page, id: string) {
  return page.getByTestId(`seller-overview-tile-${id}`);
}

function value(page: Page, id: string) {
  return tile(page, id).locator('[data-role="value"]');
}

/** The sales figure the store's arrived records give, from the mock's orders and refunds. */
function expectedSales(s: CindiaState): number {
  let cents = 0;
  for (const id of s.month.recordIds) {
    const r = s.month.records[id];
    if (r.recordType === "order") cents += orders.find((o) => o.id === id)?.grossCents ?? 0;
    if (r.recordType === "refund") cents -= refunds.find((x) => x.id === id)?.amountCents ?? 0;
  }
  return cents;
}

test("300 ms after the catch: money waiting, open flags and sales so far, and the waiting tile opens the month", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "overview");
  await seekToEvent(page, "flag.raised", { flagId: FLG_01.id }, 300);

  await expect(value(page, "waiting")).toHaveText(formatCents(FLG_01.deltaCents));
  expect(formatCents(FLG_01.deltaCents)).toBe("$340.00");
  await expect(value(page, "flags")).toHaveText("1");

  const s = await storeState(page);
  expect(s.month.recordIds, "rfd_001 has arrived by the catch").toContain(RFD_001.id);
  await expect(value(page, "sales")).toHaveText(formatCents(expectedSales(s)));

  // The waiting tile opens the month in place: same document, the store keeps the flag.
  await page.evaluate(() => ((window as unknown as { sellerHubMarker: number }).sellerHubMarker = 1));
  await tile(page, "waiting").click();
  await expect(page).toHaveURL(/\/sell\/month$/);
  expect(await page.evaluate(() => (window as unknown as { sellerHubMarker?: number }).sellerHubMarker)).toBe(1);
  const after = await storeState(page);
  expect(after.month.flagIds).toContain(FLG_01.id);
  watch.expectClean();
});

test("sales take the refund out once rfd_001 arrives", async ({ page }) => {
  await openSell(page, "overview");
  await seekToEvent(page, "record.arrived", { recordId: RFD_001.id }, -1);
  const before = await storeState(page);
  expect(before.month.recordIds).not.toContain(RFD_001.id);
  const beforeCents = expectedSales(before);
  await expect(value(page, "sales")).toHaveText(formatCents(beforeCents));

  await seekToEvent(page, "record.arrived", { recordId: RFD_001.id }, 0);
  const after = await storeState(page);
  expect(after.month.recordIds).toContain(RFD_001.id);
  expect(expectedSales(after)).toBe(beforeCents - RFD_001.amountCents);
  await expect(value(page, "sales")).toHaveText(formatCents(beforeCents - RFD_001.amountCents));
});

test("approvals waiting rises by 2 with apr_01 and apr_02 and falls by 2 after both grants", async ({ page }) => {
  await openSell(page, "overview");
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, -1);
  const base = Number(await value(page, "approvals").textContent());

  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 0);
  await expect(value(page, "approvals")).toHaveText(String(base + 2));

  await seekToEvent(page, "approval.granted", { approvalId: "apr_02" }, 0);
  await expect(value(page, "approvals")).toHaveText(String(base));

  // The approvals tile opens the approvals view.
  await expect(tile(page, "approvals")).toHaveAttribute("href", "/sell/approvals");
});

test("a seeded counterfeit.flagged makes possible copies read 1, and the tile opens the watch", async ({ page }) => {
  await openSell(page, "overview");
  await seekToEvent(page, "flag.raised", { flagId: FLG_01.id }, 300);
  await expect(value(page, "hits")).toHaveText("0");
  const c = counterfeitCandidates[0];
  await seed(page, [
    {
      type: "counterfeit.flagged",
      payload: { cftId: c.id, scanId: "wsc_01", pieceId: c.pieceId, url: c.url, title: c.title, snippet: c.snippet, similarity: c.similarity, claim: c.claim },
    },
  ]);
  await expect(value(page, "hits")).toHaveText("1");
  await expect(tile(page, "hits")).toHaveAttribute("href", "/sell/watch");
  await expect(tile(page, "sales")).toHaveAttribute("href", "/sell/month");
  await expect(tile(page, "flags")).toHaveAttribute("href", "/sell/month");
});

test("the overview panel shows the Simulated badge, its tiles in the frame, and Chinese labels with the same amounts", async ({ page }) => {
  await openSell(page, "overview");
  await seekToEvent(page, "flag.raised", { flagId: FLG_01.id }, 300);
  const overview = page.getByTestId("frame-studio").getByTestId("seller-overview");
  await expect(overview.getByTestId("simulated-badge")).toBeVisible();
  for (const id of ["sales", "waiting", "approvals", "flags", "hits"] as const) {
    await expect(overview.getByTestId(`seller-overview-tile-${id}`)).toBeInViewport();
    await expect(tile(page, id)).toContainText(OVERVIEW.tiles[id].en);
  }
  const waitingEn = await value(page, "waiting").textContent();
  const salesEn = await value(page, "sales").textContent();

  // Acceptance 11: Chinese labels, the same amounts.
  for (let i = 0; i < 3; i++) {
    if ((await page.evaluate(() => window.__cindia!.store.getState().lang)) === "zh") break;
    await page.getByTestId("demo-lang-toggle").click();
  }
  for (const id of ["sales", "waiting", "approvals", "flags", "hits"] as const) {
    await expect(tile(page, id)).toContainText(OVERVIEW.tiles[id].zh);
    await expect(tile(page, id)).not.toContainText(OVERVIEW.tiles[id].en);
  }
  await expect(value(page, "waiting")).toHaveText(waitingEn!);
  await expect(value(page, "sales")).toHaveText(salesEn!);
});
