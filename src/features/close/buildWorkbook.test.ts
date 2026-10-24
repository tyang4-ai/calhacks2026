import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { CellObject, WorkBook } from "xlsx";
import type { Order } from "../../core/types";
import { galleryFlag, getById, heldCents, ledger, makerPayCents, makerStatements, salesCents } from "../../mock";
import {
  GALLERY_CELLS,
  LEDGER_CELLS,
  MAKER_CELLS,
  SHEET_NAMES,
  TOTAL_CELLS,
  buildWorkbook,
  centsToDollars,
  pnlCell,
  profitAndLossLines,
} from "./buildWorkbook";
import { PNL_LABELS } from "./strings";

function cell(wb: WorkBook, sheet: string, addr: string): CellObject {
  const ws = wb.Sheets[sheet];
  expect(ws, `sheet ${sheet}`).toBeDefined();
  const c = ws[addr] as CellObject | undefined;
  expect(c, `${sheet}!${addr}`).toBeDefined();
  return c as CellObject;
}

function inRef(wb: WorkBook, sheet: string, addr: string): boolean {
  const range = XLSX.utils.decode_range(wb.Sheets[sheet]["!ref"] ?? "A1");
  const { r, c } = XLSX.utils.decode_cell(addr);
  return r >= range.s.r && r <= range.e.r && c >= range.s.c && c <= range.e.c;
}

function roundTrip(wb: WorkBook): WorkBook {
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return XLSX.read(buf, { type: "array" });
}

const ord001 = getById<Order>("ord_001");

describe("buildWorkbook", () => {
  it("has the four sheets in the demo's order by default", () => {
    expect(buildWorkbook().SheetNames).toEqual([...SHEET_NAMES]);
  });

  it("follows a reordered sheetOrder, ignoring unknown and repeated names", () => {
    const order = ["Makers", "Profit and loss", "Ledger", "Reconciliation"];
    expect(buildWorkbook(order).SheetNames).toEqual(order);
    expect(buildWorkbook(["Makers", "Nope", "Makers", "Ledger"]).SheetNames).toEqual(["Makers", "Ledger"]);
    expect(buildWorkbook([]).SheetNames).toEqual([...SHEET_NAMES]);
  });

  it("puts a formula in every total cell, inside the sheet's range, with its value in v", () => {
    const wb = buildWorkbook();
    for (const name of SHEET_NAMES) {
      expect(TOTAL_CELLS[name].length).toBeGreaterThan(0);
      for (const addr of TOTAL_CELLS[name]) {
        const c = cell(wb, name, addr);
        expect(typeof c.f, `${name}!${addr} formula`).toBe("string");
        expect(c.f?.startsWith("=")).toBe(false);
        expect(c.t).toBe("n");
        expect(typeof c.v).toBe("number");
        expect(inRef(wb, name, addr), `${name}!${addr} in !ref`).toBe(true);
      }
    }
  });

  it("writes amounts as numeric dollars, not strings", () => {
    const wb = buildWorkbook();
    const first = ledger[0];
    const debit = cell(wb, "Ledger", "D2");
    expect(debit.t).toBe("n");
    expect(debit.v).toBe(centsToDollars(first.debitCents));
    expect(cell(wb, "Ledger", "A2").v).toBe(first.id);
    expect(cell(wb, "Ledger", "B2").v).toBe(first.date);
    expect(inRef(wb, "Ledger", `G${ledger.length + 1}`)).toBe(true);
  });

  it("balances the ledger: debit and credit totals are SUMs and equal", () => {
    const wb = buildWorkbook();
    const dr = cell(wb, "Ledger", LEDGER_CELLS.debitTotal);
    const cr = cell(wb, "Ledger", LEDGER_CELLS.creditTotal);
    expect(dr.f).toMatch(/^SUM\(D2:D\d+\)$/);
    expect(cr.f).toMatch(/^SUM\(E2:E\d+\)$/);
    expect(dr.v).toBe(cr.v);
  });

  it("shows the gallery's expected (a formula), actual and delta from figure 4", () => {
    const wb = buildWorkbook();
    const expected = cell(wb, "Reconciliation", GALLERY_CELLS.expected);
    const actual = cell(wb, "Reconciliation", GALLERY_CELLS.actual);
    const delta = cell(wb, "Reconciliation", GALLERY_CELLS.delta);
    expect(expected.f).toBe("B2*(1-C2)");
    expect(expected.v).toBe(centsToDollars(galleryFlag.expectedCents));
    expect(actual.f).toBeUndefined();
    expect(actual.v).toBe(centsToDollars(galleryFlag.actualCents));
    expect(typeof delta.f).toBe("string");
    expect(delta.v).toBe(centsToDollars(galleryFlag.deltaCents));
    // The figures data-model.md pins: 2,040.00, 1,700.00 and 340.00.
    expect([expected.v, actual.v, delta.v]).toEqual([2040, 1700, 340]);
    // The formula's inputs give the same expected net.
    const gross = cell(wb, "Reconciliation", GALLERY_CELLS.gross).v as number;
    const rate = cell(wb, "Reconciliation", GALLERY_CELLS.rate).v as number;
    expect(Math.round(gross * (1 - rate) * 100)).toBe(galleryFlag.expectedCents);
  });

  it("includes ord_001's maker share in mkr_01's total, as a SUM", () => {
    expect(ord001).toBeDefined();
    const wb = buildWorkbook();
    const ws = wb.Sheets.Makers;
    const at = MAKER_CELLS.mkr_01;
    const total = cell(wb, "Makers", at.total);
    expect(total.f).toMatch(/^SUM\(D\d+:D\d+\)$/);
    const range = XLSX.utils.decode_range((total.f as string).slice(4, -1));
    const lineValues: number[] = [];
    let hasOrd001 = false;
    for (let r = range.s.r; r <= range.e.r; r++) {
      lineValues.push(ws[XLSX.utils.encode_cell({ r, c: 3 })].v as number);
      if (ws[XLSX.utils.encode_cell({ r, c: 1 })].v === "ord_001") {
        hasOrd001 = true;
        expect(ws[XLSX.utils.encode_cell({ r, c: 3 })].v).toBe(centsToDollars(ord001!.makerShareCents));
      }
    }
    expect(hasOrd001).toBe(true);
    expect(centsToDollars(ord001!.makerShareCents)).toBe(134.48);
    const st = makerStatements.find((s) => s.makerId === "mkr_01")!;
    expect(total.v).toBe(centsToDollars(st.totalCents));
    expect(Math.round(lineValues.reduce((a, b) => a + b, 0) * 100)).toBe(st.totalCents);
  });

  it("makes every maker's payout Total - Held and dates it from the dataset", () => {
    const wb = buildWorkbook();
    let held = 0;
    let paid = 0;
    for (const st of makerStatements) {
      const at = MAKER_CELLS[st.makerId];
      const payout = cell(wb, "Makers", at.payout);
      expect(payout.f).toBe(`${at.total}-${at.held}`);
      expect(payout.v).toBe(centsToDollars(st.totalCents - st.heldCents));
      expect(cell(wb, "Makers", at.payoutDate).v).toBe(st.payoutDate);
      held += st.heldCents;
      paid += st.totalCents - st.heldCents;
    }
    expect(held).toBe(heldCents);
    expect(paid).toBe(makerPayCents);
  });
});

describe("profitAndLossLines", () => {
  it("matches the Profit and loss sheet's labels and values, line by line", () => {
    const wb = buildWorkbook();
    const lines = profitAndLossLines();
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach((l, i) => {
      expect(cell(wb, "Profit and loss", `A${i + 2}`).v).toBe(PNL_LABELS[l.key].en);
      const amount = cell(wb, "Profit and loss", pnlCell(l.key));
      expect(amount.v).toBe(centsToDollars(l.cents));
      expect(typeof amount.f === "string").toBe(l.total);
    });
  });

  it("adds up: net sales equal month.closed sales, and net income is net sales less costs", () => {
    const lines = profitAndLossLines();
    const by = Object.fromEntries(lines.map((l) => [l.key, l.cents]));
    expect(by.netSales).toBe(salesCents);
    expect(by.makerPay).toBe(makerPayCents);
    expect(by.netSales).toBe(by.salesCindia + by.salesSite + by.salesGallery + by.refunds);
    expect(by.totalCosts).toBe(by.cardFees + by.platformFees + by.galleryCommission + by.materials + by.makerPay);
    expect(by.netIncome).toBe(by.netSales - by.totalCosts);
  });
});

describe("round trip through .xlsx", () => {
  it("keeps sheet order, formulas and values", () => {
    const order = ["Reconciliation", "Makers", "Ledger", "Profit and loss"];
    const wb = buildWorkbook(order);
    const back = roundTrip(wb);
    expect(back.SheetNames).toEqual(order);
    for (const name of SHEET_NAMES) {
      for (const addr of TOTAL_CELLS[name]) {
        const before = cell(wb, name, addr);
        const after = cell(back, name, addr);
        expect(after.f, `${name}!${addr}`).toBe(before.f);
        expect(after.v).toBe(before.v);
      }
    }
    expect(cell(back, "Reconciliation", GALLERY_CELLS.expected).f).toBe("B2*(1-C2)");
  });
});
