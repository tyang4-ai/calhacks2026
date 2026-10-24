// F-close T2: the close panel at beat d09-close. Totals, the workbook card, the download button and
// the Profit and loss preview. The real file download is checked in close-download.spec.ts (T3).
import { expect, test, type Page } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { profitAndLossLines } from "../../src/features/close/buildWorkbook";
import { heldCents } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { waitForHooks, watchPage } from "../smoke/lib";

const MONTH_CLOSED_AT = 43800;
const WORKBOOK_AT = 44600;

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function openClose(page: Page) {
  await page.goto("/studio/close");
  await waitForHooks(page);
  await expect(page.locator('[data-slot="studio.close.main"]')).toHaveAttribute("data-slot-state", "filled");
}

async function scriptedWorkbook(page: Page): Promise<Payloads["workbook.ready"]> {
  return page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline();
    const e = tl!.events.find((x) => x.type === "workbook.ready");
    return e!.payload as Payloads["workbook.ready"];
  });
}

test("Acceptance 1: after month.closed the totals equal the payload and held reads $340.00", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  await seek(page, MONTH_CLOSED_AT + 100);
  const closed = await page.evaluate(
    () => (window.__cindia!.store.getState() as unknown as { month: { closed: Payloads["month.closed"] | null } }).month.closed,
  );
  expect(closed).not.toBeNull();
  const totals = page.getByTestId("close-totals");
  await expect(totals).toBeVisible();
  for (const cents of [closed!.salesCents, closed!.feesCents, closed!.makerPayCents, closed!.heldCents]) {
    await expect(totals).toContainText(formatCents(cents));
  }
  expect(closed!.heldCents).toBe(heldCents);
  await expect(totals).toContainText("$340.00");
  watch.expectClean();
});

test("Acceptance 2: before workbook.ready there's no card and the download is disabled", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  await seek(page, WORKBOOK_AT - 100);
  await expect(page.getByTestId("close-download")).toBeVisible();
  await expect(page.getByTestId("close-workbook")).toHaveCount(0);
  await expect(page.getByTestId("close-download")).toBeDisabled();
  await expect(page.getByTestId("close-preview")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 3: past workbook.ready the card shows the file name and the four sheets, finished at once", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  await seek(page, WORKBOOK_AT + 10);
  const payload = await scriptedWorkbook(page);
  const card = page.getByTestId("close-workbook");
  await expect(card).toBeVisible();
  await expect(card).toContainText("cindia-close-2026-09.xlsx");
  expect(payload.fileName).toBe("cindia-close-2026-09.xlsx");
  expect(payload.sheets).toEqual(["Ledger", "Reconciliation", "Profit and loss", "Makers"]);
  for (const name of payload.sheets) await expect(card).toContainText(name);
  await expect(card).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("close-download")).toBeEnabled();
  watch.expectClean();
});

test("Acceptance 5: a workbook.ready with a url turns the download into a link to it", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  await seek(page, WORKBOOK_AT + 10);
  const url = "/api/b06/files/cindia-close-2026-09.xlsx";
  await page.evaluate((u) => {
    const c = window.__cindia!;
    c.emit({
      id: "evt_live_9001",
      type: "workbook.ready",
      at: c.player.now(),
      source: "live",
      key: "b06-workbook",
      payload: {
        monthId: "2026-09",
        fileName: "cindia-close-2026-09.xlsx",
        sheets: ["Ledger", "Reconciliation", "Profit and loss", "Makers"],
        url: u,
      },
    });
  }, url);
  const link = page.getByTestId("close-download");
  await expect(link).toHaveAttribute("href", url);
  await expect(link).toHaveAttribute("download", "cindia-close-2026-09.xlsx");
  expect(await link.evaluate((el) => el.tagName)).toBe("A");
  watch.expectClean();
});

test("Acceptance 8: the preview shows the Profit and loss rows with the file's values, in order", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  await seek(page, WORKBOOK_AT + 10);
  const preview = page.getByTestId("close-preview");
  await expect(preview).toBeVisible();
  const text = await preview.innerText();
  let from = 0;
  for (const line of profitAndLossLines()) {
    const at = text.indexOf(formatCents(line.cents), from);
    expect(at, `${line.key} ${formatCents(line.cents)}`).toBeGreaterThanOrEqual(from);
    from = at + 1;
  }
  watch.expectClean();
});

test("Acceptance 9: in scripted mode the panel shows the Simulated badge", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  await expect(page.locator('[data-slot="studio.close.main"]').getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});
