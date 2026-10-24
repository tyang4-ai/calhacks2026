// September's close workbook, built in the browser from src/mock/ with SheetJS. A pure function:
// no fetch, no wall clock, no randomness. Every date comes from the dataset as an ISO string.
//
// Amounts go in as dollars (cents / 100) in numeric cells. Every total is a live formula (`f`,
// without the leading "="), and its computed value is in `v` too, so the in-app preview and any
// reader that doesn't recalculate see the right number.
//
// Sheet order follows `sheetOrder` (the workbook.ready payload's `sheets`). Names that aren't one of
// SHEET_NAMES are ignored, and a repeated name is written once. If no known name is left, the
// default SHEET_NAMES order is used, because a workbook with no sheets can't be written.
import * as XLSX from "xlsx";
import type { CellObject, WorkBook, WorkSheet } from "xlsx";
import type { LedgerAccount, Person } from "../../core/types";
import {
  bankTxns,
  galleryContract,
  galleryDeposit,
  galleryPayout,
  galleryStatement,
  getById,
  ledger,
  makerPayouts,
  makerStatements,
  monthId,
  orders,
  payouts,
} from "../../mock";
import { PNL_LABELS, type PnlKey } from "./strings";

/** The four sheets beat d09-close names, in the demo's order. The payload's `sheets` decides the order used. */
export const SHEET_NAMES = ["Ledger", "Reconciliation", "Profit and loss", "Makers"] as const;
export type SheetName = (typeof SHEET_NAMES)[number];

/** One line of the Profit and loss sheet: its label key, its value in cents, and whether it's a total. */
export interface PnlLine {
  key: PnlKey;
  cents: number;
  total: boolean;
}

/** Cents to the dollars a cell holds. */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

const MONEY_FORMAT = "#,##0.00";
const RATE_FORMAT = "0%";

// ---------------------------------------------------------------------------------------------
// A tiny cell writer that tracks the used range, so !ref always covers every cell written.

interface SheetDraft {
  ws: WorkSheet;
  maxRow: number;
  maxCol: number;
}

function draft(): SheetDraft {
  return { ws: {}, maxRow: 0, maxCol: 0 };
}

function put(d: SheetDraft, addr: string, cell: CellObject): void {
  const { r, c } = XLSX.utils.decode_cell(addr);
  d.ws[addr] = cell;
  d.maxRow = Math.max(d.maxRow, r);
  d.maxCol = Math.max(d.maxCol, c);
}

function text(d: SheetDraft, addr: string, v: string): void {
  put(d, addr, { t: "s", v });
}

function money(d: SheetDraft, addr: string, cents: number): void {
  put(d, addr, { t: "n", v: centsToDollars(cents), z: MONEY_FORMAT });
}

/** A formula cell holding money, with its computed value (from cents) in `v`. */
function moneyFormula(d: SheetDraft, addr: string, f: string, cents: number): void {
  put(d, addr, { t: "n", v: centsToDollars(cents), f, z: MONEY_FORMAT });
}

function finish(d: SheetDraft): WorkSheet {
  d.ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: d.maxRow, c: d.maxCol } });
  return d.ws;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------------------------
// Ledger: one row per ledger entry, with debit and credit totals.

/** Row 1 is the header, entries start on row 2, the totals row follows the last entry. */
const LEDGER_TOTAL_ROW = ledger.length + 2;

/** The Ledger sheet's total cells. */
export const LEDGER_CELLS = {
  debitTotal: `D${LEDGER_TOTAL_ROW}`,
  creditTotal: `E${LEDGER_TOTAL_ROW}`,
} as const;

function ledgerSheet(): WorkSheet {
  const d = draft();
  ["Entry", "Date", "Account", "Debit", "Credit", "Record", "Memo"].forEach((h, c) =>
    text(d, XLSX.utils.encode_cell({ r: 0, c }), h),
  );
  ledger.forEach((e, i) => {
    const row = i + 2;
    text(d, `A${row}`, e.id);
    text(d, `B${row}`, e.date);
    text(d, `C${row}`, e.account);
    money(d, `D${row}`, e.debitCents);
    money(d, `E${row}`, e.creditCents);
    text(d, `F${row}`, e.refId);
    text(d, `G${row}`, e.memo);
  });
  const last = LEDGER_TOTAL_ROW - 1;
  text(d, `A${LEDGER_TOTAL_ROW}`, "Total");
  moneyFormula(d, LEDGER_CELLS.debitTotal, `SUM(D2:D${last})`, sum(ledger.map((e) => e.debitCents)));
  moneyFormula(d, LEDGER_CELLS.creditTotal, `SUM(E2:E${last})`, sum(ledger.map((e) => e.creditCents)));
  return finish(d);
}

// ---------------------------------------------------------------------------------------------
// Reconciliation. Row 2 is the gallery (data-model figure 4): gross, the contract's rate, the
// expected net as gross * (1 - rate), the bank deposit, and the delta. Below it, every other
// channel payout against the orders it pays for, with the bank deposit that carried it.

/** The gallery line's cells, fixed so the download test can find them. */
export const GALLERY_CELLS = {
  gross: "B2",
  rate: "C2",
  expected: "D2",
  actual: "E2",
  delta: "F2",
} as const;

const galleryGrossCents = galleryStatement.totalSaleCents;
const galleryExpectedCents = galleryGrossCents - sum(orders.filter((o) => o.channelId === "ch_gallery").map((o) => o.commissionCents));
const galleryActualCents = galleryDeposit.amountCents;

const PAYOUT_HEADER_ROW = 4;
const otherPayouts = payouts.filter((p) => p.id !== galleryPayout.id);
const PAYOUT_TOTAL_ROW = PAYOUT_HEADER_ROW + otherPayouts.length + 1;

function depositCents(payoutId: string): number {
  return sum(bankTxns.filter((t) => t.refId === payoutId && t.direction === "in").map((t) => t.amountCents));
}

/** The totals row under the payouts table. */
export const RECONCILIATION_CELLS = {
  ...GALLERY_CELLS,
  grossTotal: `D${PAYOUT_TOTAL_ROW}`,
  feesTotal: `E${PAYOUT_TOTAL_ROW}`,
  refundTotal: `F${PAYOUT_TOTAL_ROW}`,
  netTotal: `G${PAYOUT_TOTAL_ROW}`,
  depositTotal: `H${PAYOUT_TOTAL_ROW}`,
  deltaTotal: `I${PAYOUT_TOTAL_ROW}`,
} as const;

function reconciliationSheet(): WorkSheet {
  const d = draft();
  ["Gallery", "Gross", "Contract rate", "Expected net", "Actual (bank)", "Delta", "Records"].forEach((h, c) =>
    text(d, XLSX.utils.encode_cell({ r: 0, c }), h),
  );
  text(d, "A2", `${galleryStatement.id} (${monthId})`);
  money(d, GALLERY_CELLS.gross, galleryGrossCents);
  put(d, GALLERY_CELLS.rate, { t: "n", v: galleryContract.commissionBps / 10000, z: RATE_FORMAT });
  moneyFormula(d, GALLERY_CELLS.expected, "B2*(1-C2)", galleryExpectedCents);
  money(d, GALLERY_CELLS.actual, galleryActualCents);
  moneyFormula(d, GALLERY_CELLS.delta, "D2-E2", galleryExpectedCents - galleryActualCents);
  text(d, "G2", `${galleryContract.id}, ${galleryStatement.id}, ${galleryDeposit.id}`);

  ["Payout", "Channel", "Date", "Orders gross", "Fees", "Refund", "Expected net", "Bank deposit", "Delta", "Orders", "Month"].forEach(
    (h, c) => text(d, XLSX.utils.encode_cell({ r: PAYOUT_HEADER_ROW - 1, c }), h),
  );
  otherPayouts.forEach((p, i) => {
    const row = PAYOUT_HEADER_ROW + 1 + i;
    const deposit = depositCents(p.id);
    const net = p.grossCents - p.feesCents - p.refundCents;
    text(d, `A${row}`, p.id);
    text(d, `B${row}`, p.channelId);
    text(d, `C${row}`, p.date);
    money(d, `D${row}`, p.grossCents);
    money(d, `E${row}`, p.feesCents);
    money(d, `F${row}`, p.refundCents);
    moneyFormula(d, `G${row}`, `D${row}-E${row}-F${row}`, net);
    money(d, `H${row}`, deposit);
    moneyFormula(d, `I${row}`, `G${row}-H${row}`, net - deposit);
    text(d, `J${row}`, p.orderIds.join(", "));
    text(d, `K${row}`, p.monthId);
  });
  const first = PAYOUT_HEADER_ROW + 1;
  const last = PAYOUT_TOTAL_ROW - 1;
  const totals: [keyof typeof RECONCILIATION_CELLS, string, number][] = [
    ["grossTotal", "D", sum(otherPayouts.map((p) => p.grossCents))],
    ["feesTotal", "E", sum(otherPayouts.map((p) => p.feesCents))],
    ["refundTotal", "F", sum(otherPayouts.map((p) => p.refundCents))],
    ["netTotal", "G", sum(otherPayouts.map((p) => p.grossCents - p.feesCents - p.refundCents))],
    ["depositTotal", "H", sum(otherPayouts.map((p) => depositCents(p.id)))],
    ["deltaTotal", "I", sum(otherPayouts.map((p) => p.grossCents - p.feesCents - p.refundCents - depositCents(p.id)))],
  ];
  text(d, `A${PAYOUT_TOTAL_ROW}`, "Total");
  for (const [key, col, cents] of totals) moneyFormula(d, RECONCILIATION_CELLS[key], `SUM(${col}${first}:${col}${last})`, cents);
  return finish(d);
}

// ---------------------------------------------------------------------------------------------
// Profit and loss.
//
// Basis: the studio's books, i.e. every entry in `ledger` (src/mock/month.ts), summed by account.
// - Sales are credits to the sales accounts. They include ord_025 and ord_026, whose payout lands
//   on Oct 2 (carried over for cash), because the sales are September's. This equals month.closed
//   salesCents.
// - Refunds are shown as a negative line, so Net sales = SUM of the four lines above it.
// - Gallery commission is what the ledger books: the contract's 40% (136000 cents). month.closed
//   feesCents counts the commission as the gallery charged it (170000), so this sheet's fees are
//   34000 lower than feesCents on purpose. The 34000 still owed sits in receivable_gallery, and the
//   expected / actual / delta figures live on the Reconciliation sheet.
// - Materials are the month's supplier purchases as booked, not the per-order materials.
// - Maker pay is the approved maker payouts (paid Oct 2, booked for September's close).

function accountNet(account: LedgerAccount, side: "debit" | "credit"): number {
  const es = ledger.filter((e) => e.account === account);
  const dr = sum(es.map((e) => e.debitCents));
  const cr = sum(es.map((e) => e.creditCents));
  return side === "debit" ? dr - cr : cr - dr;
}

const SALES_KEYS = ["salesCindia", "salesSite", "salesGallery", "refunds"] as const satisfies readonly PnlKey[];
const COST_KEYS = ["cardFees", "platformFees", "galleryCommission", "materials", "makerPay"] as const satisfies readonly PnlKey[];

/** The Profit and loss lines, in sheet order, with the same values the sheet's cells hold. */
export function profitAndLossLines(): PnlLine[] {
  const sales: Record<(typeof SALES_KEYS)[number], number> = {
    salesCindia: accountNet("sales_cindia", "credit"),
    salesSite: accountNet("sales_site", "credit"),
    salesGallery: accountNet("sales_gallery", "credit"),
    refunds: -accountNet("refunds", "debit"),
  };
  const costs: Record<(typeof COST_KEYS)[number], number> = {
    cardFees: accountNet("card_fees", "debit"),
    platformFees: accountNet("platform_fees", "debit"),
    galleryCommission: accountNet("gallery_commission", "debit"),
    materials: accountNet("materials", "debit"),
    makerPay: accountNet("maker_pay", "debit"),
  };
  const netSales = sum(SALES_KEYS.map((k) => sales[k]));
  const totalCosts = sum(COST_KEYS.map((k) => costs[k]));
  return [
    ...SALES_KEYS.map((key) => ({ key, cents: sales[key], total: false })),
    { key: "netSales", cents: netSales, total: true },
    ...COST_KEYS.map((key) => ({ key, cents: costs[key], total: false })),
    { key: "totalCosts", cents: totalCosts, total: true },
    { key: "netIncome", cents: netSales - totalCosts, total: true },
  ];
}

/** Where each P&L line sits: row 1 is the header, line i is on row i + 2, label in A, amount in B. */
export function pnlCell(key: PnlKey): string {
  const i = profitAndLossLines().findIndex((l) => l.key === key);
  if (i < 0) throw new Error(`no P&L line ${key}`);
  return `B${i + 2}`;
}

function profitAndLossSheet(): WorkSheet {
  const d = draft();
  text(d, "A1", `Profit and loss, ${monthId}`);
  text(d, "B1", "Amount");
  const lines = profitAndLossLines();
  const rowOf = (key: PnlKey) => lines.findIndex((l) => l.key === key) + 2;
  const salesRange = `B${rowOf(SALES_KEYS[0])}:B${rowOf(SALES_KEYS[SALES_KEYS.length - 1])}`;
  const costRange = `B${rowOf(COST_KEYS[0])}:B${rowOf(COST_KEYS[COST_KEYS.length - 1])}`;
  const formulas: Partial<Record<PnlKey, string>> = {
    netSales: `SUM(${salesRange})`,
    totalCosts: `SUM(${costRange})`,
    netIncome: `B${rowOf("netSales")}-B${rowOf("totalCosts")}`,
  };
  lines.forEach((l, i) => {
    const row = i + 2;
    text(d, `A${row}`, PNL_LABELS[l.key].en);
    const f = formulas[l.key];
    if (l.total) {
      if (!f) throw new Error(`P&L total ${l.key} has no formula`);
      moneyFormula(d, `B${row}`, f, l.cents);
    } else {
      money(d, `B${row}`, l.cents);
    }
  });
  return finish(d);
}

// ---------------------------------------------------------------------------------------------
// Makers: one block per maker. A title row, a header, one row per order with the maker share,
// then Total (SUM of the lines), Held, Payout (Total - Held) and Payout date. A blank row between.

export interface MakerCells {
  total: string;
  held: string;
  payout: string;
  payoutDate: string;
}

function makerLayout(): Record<string, MakerCells & { firstLine: number; lastLine: number; titleRow: number }> {
  const out: Record<string, MakerCells & { firstLine: number; lastLine: number; titleRow: number }> = {};
  let row = 1;
  for (const st of makerStatements) {
    const titleRow = row;
    const firstLine = titleRow + 2;
    const lastLine = firstLine + st.lines.length - 1;
    const totalRow = lastLine + 1;
    out[st.makerId] = {
      titleRow,
      firstLine,
      lastLine,
      total: `D${totalRow}`,
      held: `D${totalRow + 1}`,
      payout: `D${totalRow + 2}`,
      payoutDate: `D${totalRow + 3}`,
    };
    row = totalRow + 5;
  }
  return out;
}

const MAKER_LAYOUT = makerLayout();

/** Each maker's total, held, payout and payout date cells on the Makers sheet, by maker ID. */
export const MAKER_CELLS: Record<string, MakerCells> = Object.fromEntries(
  Object.entries(MAKER_LAYOUT).map(([id, { total, held, payout, payoutDate }]) => [id, { total, held, payout, payoutDate }]),
);

function makersSheet(): WorkSheet {
  const d = draft();
  for (const st of makerStatements) {
    const at = MAKER_LAYOUT[st.makerId];
    const mp = makerPayouts.find((m) => m.makerId === st.makerId);
    const person = getById<Person>(st.makerId);
    text(d, `A${at.titleRow}`, `${st.makerId} ${person ? person.name.en : ""}`.trim());
    text(d, `B${at.titleRow}`, `${st.id}${mp ? `, ${mp.id}` : ""}`);
    ["Maker", "Order", "Piece", "Maker share"].forEach((h, c) => text(d, XLSX.utils.encode_cell({ r: at.titleRow, c }), h));
    st.lines.forEach((l, i) => {
      const row = at.firstLine + i;
      text(d, `A${row}`, st.makerId);
      text(d, `B${row}`, l.orderId);
      text(d, `C${row}`, l.pieceId);
      money(d, `D${row}`, l.makerShareCents);
    });
    const totalCents = sum(st.lines.map((l) => l.makerShareCents));
    const totalRow = Number(at.total.slice(1));
    text(d, `C${totalRow}`, "Total");
    moneyFormula(d, at.total, st.lines.length ? `SUM(D${at.firstLine}:D${at.lastLine})` : "0", totalCents);
    text(d, `C${totalRow + 1}`, "Held");
    money(d, at.held, st.heldCents);
    text(d, `C${totalRow + 2}`, "Payout");
    moneyFormula(d, at.payout, `${at.total}-${at.held}`, totalCents - st.heldCents);
    text(d, `C${totalRow + 3}`, "Payout date");
    text(d, at.payoutDate, st.payoutDate);
  }
  return finish(d);
}

// ---------------------------------------------------------------------------------------------

const BUILDERS: Record<SheetName, () => WorkSheet> = {
  Ledger: ledgerSheet,
  Reconciliation: reconciliationSheet,
  "Profit and loss": profitAndLossSheet,
  Makers: makersSheet,
};

/** Every total cell, by sheet. Each holds a formula. */
export const TOTAL_CELLS: Record<SheetName, string[]> = {
  Ledger: [LEDGER_CELLS.debitTotal, LEDGER_CELLS.creditTotal],
  Reconciliation: [
    GALLERY_CELLS.expected,
    GALLERY_CELLS.delta,
    RECONCILIATION_CELLS.grossTotal,
    RECONCILIATION_CELLS.feesTotal,
    RECONCILIATION_CELLS.refundTotal,
    RECONCILIATION_CELLS.netTotal,
    RECONCILIATION_CELLS.depositTotal,
    RECONCILIATION_CELLS.deltaTotal,
  ],
  "Profit and loss": profitAndLossLines()
    .filter((l) => l.total)
    .map((l) => pnlCell(l.key)),
  Makers: Object.values(MAKER_CELLS).flatMap((m) => [m.total, m.payout]),
};

function isSheetName(name: string): name is SheetName {
  return (SHEET_NAMES as readonly string[]).includes(name);
}

/** Builds September's workbook from src/mock/, with its sheets in `sheetOrder`. */
export function buildWorkbook(sheetOrder: readonly string[] = SHEET_NAMES): WorkBook {
  const known = [...new Set(sheetOrder.filter(isSheetName))];
  const order = known.length ? known : [...SHEET_NAMES];
  const wb = XLSX.utils.book_new();
  for (const name of order) XLSX.utils.book_append_sheet(wb, BUILDERS[name](), name);
  return wb;
}
