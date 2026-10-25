// F-process T7: the data view. Acceptance 14 and 15 (d15-listing's process-data-tables checks).
import { expect, test } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { swarmRuns } from "../../src/mock/index";
import { LISTING_STATE_LABELS } from "../../src/features/process/strings";
import { emitAtClock, open, runEvents, seekToEvent, timelineHas, watchPage } from "./process-lib";

const TABLES = ["catalog", "listings", "orders", "approvals", "runs", "steps", "processes", "screens"];

test("a fresh store: 54 catalog rows, 11 processes, cindia-pieces 54 and cindia-drafts 0, under the Simulated badge", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=data");
  const tables = page.getByTestId("process-data-tables");
  const rows = tables.locator('[data-testid^="process-data-table-"]');
  expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual(TABLES.map((t) => `process-data-table-${t}`));
  const rowsOf = (table: string) => page.getByTestId(`process-data-table-${table}`).locator('[data-role="rows"]');
  await expect(rowsOf("catalog")).toHaveText("54");
  await expect(rowsOf("processes")).toHaveText("11");
  await expect(rowsOf("approvals")).toHaveText("5");
  await expect(rowsOf("screens")).toHaveText("1");
  const index = page.getByTestId("process-data-index");
  await expect(index.locator('[data-index="cindia-pieces"]')).toHaveAttribute("data-docs", "54");
  await expect(index.locator('[data-index="cindia-drafts"]')).toHaveAttribute("data-docs", "0");
  await expect(page.getByTestId("process-data-model")).toBeVisible();
  await expect(page.getByTestId("process-view").getByTestId("simulated-badge")).toHaveCount(1);
  await expect(page.getByTestId("process-data-tables")).toHaveAttribute("data-live", "false");
  watch.expectClean();
});

test("the listing indexed: lst_01 first as indexed, cindia-drafts 1 with the payload's piece, and the data block reads 55", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/listings?process=data");
  let indexed: Payloads["listing.indexed"];
  if (await timelineHas(page, "listing.indexed", { listingId: "lst_01" })) {
    await seekToEvent(page, "listing.indexed", { listingId: "lst_01" }, 300);
    indexed = await page.evaluate(() => (window.__cindia!.store.getState() as unknown as { listings: { indexed: Record<string, Payloads["listing.indexed"]> } }).listings.indexed.lst_01);
  } else {
    await seekToEvent(page, "beat.started", {}, 0);
    const run02 = swarmRuns.find((r) => r.runId === "run_02")!;
    indexed = run02.final.find((f) => f.type === "listing.indexed")!.payload as Payloads["listing.indexed"];
    await emitAtClock(page, [
      { type: "listing.requested", payload: { listingId: "lst_01", makerId: "mkr_02", notes: "notes", lang: "en" } },
      ...runEvents(run02, { upTo: "listing.indexed" }),
    ]);
  }
  const listings = page.getByTestId("process-data-table-listings");
  const first = listings.locator("[data-row-id]").first();
  await expect(first).toHaveAttribute("data-row-id", "lst_01");
  await expect(first).toContainText(LISTING_STATE_LABELS.indexed.en);
  const index = page.getByTestId("process-data-index");
  await expect(index.locator('[data-index="cindia-drafts"]')).toHaveAttribute("data-docs", "1");
  await expect(index.locator('[data-role="newest-indexed"]')).toHaveAttribute("data-piece-id", indexed.pieceId);
  await expect(index.locator('[data-role="newest-indexed"]')).toHaveAttribute("data-model-id", indexed.modelId);
  await expect(page.getByTestId("process-block-count-data")).toHaveText("55");
  watch.expectClean();
});
