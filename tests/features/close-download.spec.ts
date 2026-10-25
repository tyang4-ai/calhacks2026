// F-close T3: the real download. Seek past workbook.ready, click close-download, catch the file,
// open it with SheetJS in Node, and check the sheet names, the formulas and the figures against
// the dataset in src/mock/.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import * as XLSX from "xlsx";
import type { Payloads } from "../../src/core/events";
import {
  GALLERY_CELLS,
  LEDGER_CELLS,
  MAKER_CELLS,
  TOTAL_CELLS,
  centsToDollars,
  pnlCell,
  profitAndLossLines,
} from "../../src/features/close/buildWorkbook";
import { galleryDeposit, ledger, makerStatements, orders } from "../../src/mock/index";
import { SELL_VIEWPORT, openSell, seekToEvent, watchPage } from "./sell-views-lib";

// M-desktop: the close view on /sell/close at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

/** Well past workbook.ready: its drop-in has finished. */
const PAST_WORKBOOK_MS = 1400;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

async function openPastWorkbook(page: Page): Promise<Payloads["workbook.ready"]> {
  await openSell(page, "close");
  await seekToEvent(page, "workbook.ready", {}, PAST_WORKBOOK_MS);
  await expect(page.getByTestId("close-download")).toBeEnabled();
  const payload = await page.evaluate(
    () =>
      (window.__cindia!.store.getState() as unknown as { close: { workbook: Payloads["workbook.ready"] | null } }).close
        .workbook,
  );
  expect(payload, "workbook.ready reached the store").not.toBeNull();
  return payload!;
}

async function downloadWorkbook(page: Page, outPath: string) {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("close-download").click()]);
  await download.saveAs(outPath);
  const wb = XLSX.read(readFileSync(outPath), { type: "buffer", cellFormula: true });
  return { download, wb };
}

function num(ws: XLSX.WorkSheet, addr: string): number {
  const cell = ws[addr] as XLSX.CellObject | undefined;
  expect(cell, `cell ${addr}`).toBeDefined();
  expect(cell!.t, `cell ${addr} type`).toBe("n");
  return cell!.v as number;
}

test("the download is the payload's file, with its sheets in the payload's order", async ({ page }, testInfo) => {
  const watch = watchPage(page);
  const payload = await openPastWorkbook(page);
  const { download, wb } = await downloadWorkbook(page, testInfo.outputPath(payload.fileName));
  expect(download.suggestedFilename()).toBe(payload.fileName);
  expect(payload.fileName).toBe("cindia-close-2026-09.xlsx");
  expect(wb.SheetNames).toEqual(payload.sheets);
  expect(wb.SheetNames).toEqual(["Ledger", "Reconciliation", "Profit and loss", "Makers"]);
  watch.expectClean();
});

test("every total in the file is a live formula, and the figures match the dataset", async ({ page }, testInfo) => {
  const watch = watchPage(page);
  const payload = await openPastWorkbook(page);
  const { wb } = await downloadWorkbook(page, testInfo.outputPath(payload.fileName));

  // Every total cell holds a formula.
  for (const [sheet, cells] of Object.entries(TOTAL_CELLS)) {
    const ws = wb.Sheets[sheet];
    expect(ws, `sheet ${sheet}`).toBeDefined();
    for (const addr of cells) {
      const cell = ws[addr] as XLSX.CellObject | undefined;
      expect(cell?.f, `${sheet}!${addr} has a formula`).toBeTruthy();
    }
  }

  // Ledger totals equal the dataset's ledger sums.
  const lws = wb.Sheets["Ledger"];
  expect(num(lws, LEDGER_CELLS.debitTotal)).toBeCloseTo(centsToDollars(sum(ledger.map((e) => e.debitCents))), 2);
  expect(num(lws, LEDGER_CELLS.creditTotal)).toBeCloseTo(centsToDollars(sum(ledger.map((e) => e.creditCents))), 2);
  expect((lws[LEDGER_CELLS.debitTotal] as XLSX.CellObject).f).toMatch(/^SUM\(/);

  // The catch: the gallery expected 2040, actual 1700, delta 340, and expected is gross * (1 - rate).
  const rws = wb.Sheets["Reconciliation"];
  const galleryOrders = orders.filter((o) => o.channelId === "ch_gallery");
  const expectedCents = sum(galleryOrders.map((o) => o.grossCents - o.commissionCents));
  expect(num(rws, GALLERY_CELLS.expected)).toBeCloseTo(centsToDollars(expectedCents), 2);
  expect(num(rws, GALLERY_CELLS.actual)).toBeCloseTo(centsToDollars(galleryDeposit.amountCents), 2);
  expect(num(rws, GALLERY_CELLS.delta)).toBeCloseTo(centsToDollars(expectedCents - galleryDeposit.amountCents), 2);
  expect(num(rws, GALLERY_CELLS.expected)).toBe(2040);
  expect(num(rws, GALLERY_CELLS.actual)).toBe(1700);
  expect(num(rws, GALLERY_CELLS.delta)).toBe(340);
  expect((rws[GALLERY_CELLS.expected] as XLSX.CellObject).f).toBeTruthy();
  expect((rws[GALLERY_CELLS.delta] as XLSX.CellObject).f).toBeTruthy();

  // Profit and loss cells equal profitAndLossLines() in dollars.
  const pws = wb.Sheets["Profit and loss"];
  for (const line of profitAndLossLines()) {
    expect(num(pws, pnlCell(line.key)), `P&L ${line.key}`).toBeCloseTo(centsToDollars(line.cents), 2);
  }

  // Makers: mkr_01's total sums a range that holds ord_001's 134.48 maker share.
  const mws = wb.Sheets["Makers"];
  const ord001 = orders.find((o) => o.id === "ord_001")!;
  expect(centsToDollars(ord001.makerShareCents)).toBe(134.48);
  const m1 = MAKER_CELLS["mkr_01"];
  expect(m1, "mkr_01 block").toBeDefined();
  const totalF = (mws[m1.total] as XLSX.CellObject).f!;
  const range = /^SUM\(D(\d+):D(\d+)\)$/.exec(totalF);
  expect(range, `mkr_01 total formula ${totalF}`).not.toBeNull();
  const [first, last] = [Number(range![1]), Number(range![2])];
  let found = false;
  for (let r = first; r <= last; r++) {
    const order = mws[`B${r}`] as XLSX.CellObject | undefined;
    if (order?.v === "ord_001") {
      expect(num(mws, `D${r}`)).toBe(134.48);
      found = true;
    }
  }
  expect(found, "ord_001 is inside mkr_01's total").toBe(true);
  const st1 = makerStatements.find((s) => s.makerId === "mkr_01")!;
  expect(num(mws, m1.total)).toBeCloseTo(centsToDollars(sum(st1.lines.map((l) => l.makerShareCents))), 2);
  expect(num(mws, m1.held)).toBeCloseTo(centsToDollars(st1.heldCents), 2);
  expect(num(mws, m1.payout)).toBeCloseTo(centsToDollars(sum(st1.lines.map((l) => l.makerShareCents)) - st1.heldCents), 2);

  watch.expectClean();
});
