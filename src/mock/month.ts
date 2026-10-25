// September 2026 for the Diné Weaving and Silver Co-op: every record, plus the early-October ones that belong
// to September (the late site payout and the maker payouts on Oct 2). Every figure is computed from
// the money rules in data-model.md, so totals reconcile to the cent. The one planted problem in the
// money itself is the gallery charging 5000 bps instead of the contract's 4000 (err_01). The other
// three planted errors (err_02 to err_04) are shapes the matcher must handle, not wrong amounts.
import type {
  Approval,
  BankTxn,
  ChannelId,
  ChannelPayout,
  Flag,
  FollowUp,
  LedgerAccount,
  LedgerEntry,
  MakerPayout,
  MakerStatement,
  Match,
  MatchKind,
  Order,
  Purchase,
  Refund,
  Statement,
  Text,
} from "../core/types";
import { pieces } from "./catalog";
import { galleryContract } from "./channels";
import { studio } from "./people";
import { bps, cardFee, pad, shortDate, sum, usd } from "./util";

export const monthId = "2026-09";
/** The last day of September's books. Payouts dated after it count in October. */
export const closeDate = "2026-09-30";
/** The day the makers are paid. */
export const makerPayoutDate = "2026-10-02";
/** The studio account's balance before Sep 1, a figure chosen for the demo: $12,500.00. */
export const openingBalanceCents = 1250000;
/** What the gallery's statement charges on every line, against the contract's 4000. The planted error. */
export const STATEMENT_COMMISSION_BPS = 5000;

const pieceById = new Map(pieces.map((p) => [p.id, p]));
function piece(id: string) {
  const p = pieceById.get(id);
  if (!p) throw new Error(`unknown piece ${id}`);
  return p;
}

// ---------------------------------------------------------------------------------------------
// Orders: ord_001 to ord_012 on Cindia, ord_013 to ord_026 on the studio site, ord_027 to ord_030
// at the gallery (demo-critical figure 3). Featured pieces sell once. Series pieces sell more.

const ORDER_SPECS: [ChannelId, string, string][] = [
  // channel, piece, date
  ["ch_cindia", "pc_01", "2026-09-01"], // ord_001, the buyer's order (figure 1)
  ["ch_cindia", "pc_07", "2026-09-02"],
  ["ch_cindia", "pc_09", "2026-09-04"],
  ["ch_cindia", "pc_02", "2026-09-06"],
  ["ch_cindia", "pc_12", "2026-09-09"],
  ["ch_cindia", "pc_10", "2026-09-11"],
  ["ch_cindia", "pc_08", "2026-09-13"],
  ["ch_cindia", "pc_07", "2026-09-15"],
  ["ch_cindia", "pc_09", "2026-09-17"],
  ["ch_cindia", "pc_02", "2026-09-19"],
  ["ch_cindia", "pc_12", "2026-09-25"],
  ["ch_cindia", "pc_10", "2026-09-27"], // ord_012
  ["ch_site", "pc_02", "2026-09-03"], // ord_013
  ["ch_site", "pc_09", "2026-09-05"],
  ["ch_site", "pc_07", "2026-09-08"], // ord_015, bundled (figure 5)
  ["ch_site", "pc_08", "2026-09-09"], // ord_016, bundled
  ["ch_site", "pc_10", "2026-09-10"], // ord_017, bundled
  ["ch_site", "pc_12", "2026-09-12"],
  ["ch_site", "pc_02", "2026-09-14"],
  ["ch_site", "pc_12", "2026-09-16"], // ord_020, refunded on Sep 21 (figure 6)
  ["ch_site", "pc_09", "2026-09-20"], // ord_021, its payout nets out the refund
  ["ch_site", "pc_11", "2026-09-22"],
  ["ch_site", "pc_07", "2026-09-24"],
  ["ch_site", "pc_10", "2026-09-26"],
  ["ch_site", "pc_08", "2026-09-28"], // ord_025, paid out Oct 2 (figure 7)
  ["ch_site", "pc_02", "2026-09-29"], // ord_026, paid out Oct 2
  ["ch_gallery", "pc_03", "2026-09-06"], // ord_027 (figure 4)
  ["ch_gallery", "pc_04", "2026-09-13"],
  ["ch_gallery", "pc_05", "2026-09-19"],
  ["ch_gallery", "pc_06", "2026-09-25"], // ord_030
];

const REFUNDED_ORDER = "ord_020";

function buildOrder(i: number, [channelId, pieceId, date]: [ChannelId, string, string]): Order {
  const p = piece(pieceId);
  const gross = p.priceCents;
  const card = channelId === "ch_gallery" ? 0 : cardFee(gross);
  const platform = channelId === "ch_cindia" ? bps(gross, 1000) : 0;
  const commission = channelId === "ch_gallery" ? bps(gross, galleryContract.commissionBps) : 0;
  const id = `ord_${pad(i + 1, 3)}`;
  return {
    id,
    channelId,
    pieceId,
    buyerId: `buy_${pad((i % 20) + 1, 2)}`,
    date,
    grossCents: gross,
    cardFeeCents: card,
    platformFeeCents: platform,
    commissionCents: commission,
    materialsCents: p.materialsCents,
    makerShareCents: gross - card - platform - commission - p.materialsCents,
    status: id === REFUNDED_ORDER ? "refunded" : "paid",
  };
}

export const orders: Order[] = ORDER_SPECS.map((s, i) => buildOrder(i, s));

const orderById = new Map(orders.map((o) => [o.id, o]));
function order(id: string): Order {
  const o = orderById.get(id);
  if (!o) throw new Error(`unknown order ${id}`);
  return o;
}

/** The maker who made an order's piece. */
export function makerOf(orderId: string): string {
  return piece(order(orderId).pieceId).makerId;
}

// ---------------------------------------------------------------------------------------------
// Refund: ord_020 refunded in full on Sep 21, netted out of the next site payout.

const refundDraft = { id: "rfd_001", orderId: REFUNDED_ORDER, date: "2026-09-21", amountCents: order(REFUNDED_ORDER).grossCents };

// ---------------------------------------------------------------------------------------------
// Channel payouts. Cindia settles each sale the same day. The site's card processor pays a couple
// of days later, one order per payout except the bundle, the refund netting and the late payout.
// The gallery pays once, the amount on its statement.

interface PayoutSpec {
  channelId: ChannelId;
  date: string;
  orderIds: string[];
  refundIds: string[];
}

const SITE_PAYOUTS: [string, string[], string[]][] = [
  ["2026-09-05", ["ord_013"], []],
  ["2026-09-07", ["ord_014"], []],
  ["2026-09-12", ["ord_015", "ord_016", "ord_017"], []], // bundled (err_02)
  ["2026-09-14", ["ord_018"], []],
  ["2026-09-16", ["ord_019"], []],
  ["2026-09-18", ["ord_020"], []],
  ["2026-09-23", ["ord_021"], ["rfd_001"]], // refund netted (err_03)
  ["2026-09-24", ["ord_022"], []],
  ["2026-09-26", ["ord_023"], []],
  ["2026-09-28", ["ord_024"], []],
  ["2026-10-02", ["ord_025", "ord_026"], []], // carried over (err_04)
];

const CHANNEL_ORDER: Record<ChannelId, number> = { ch_cindia: 0, ch_site: 1, ch_gallery: 2 };

const payoutSpecs: PayoutSpec[] = ([
  ...orders.filter((o) => o.channelId === "ch_cindia").map((o): PayoutSpec => ({ channelId: o.channelId, date: o.date, orderIds: [o.id], refundIds: [] })),
  ...SITE_PAYOUTS.map(([date, orderIds, refundIds]) => ({ channelId: "ch_site" as const, date, orderIds, refundIds })),
  { channelId: "ch_gallery", date: closeDate, orderIds: ["ord_027", "ord_028", "ord_029", "ord_030"], refundIds: [] },
] as PayoutSpec[]).toSorted((a, b) => (a.date === b.date ? CHANNEL_ORDER[a.channelId] - CHANNEL_ORDER[b.channelId] : a.date < b.date ? -1 : 1));

// The gallery statement comes first, since the gallery's payout is the amount it states.
const galleryOrders = orders.filter((o) => o.channelId === "ch_gallery");
const statementLines = galleryOrders.map((o) => {
  const commissionCents = bps(o.grossCents, STATEMENT_COMMISSION_BPS);
  return {
    orderId: o.id,
    pieceId: o.pieceId,
    saleCents: o.grossCents,
    commissionBps: STATEMENT_COMMISSION_BPS,
    commissionCents,
    netCents: o.grossCents - commissionCents,
  };
});

export const galleryStatement: Statement = {
  id: "stm_gallery_2026_09",
  channelId: "ch_gallery",
  monthId,
  issuedDate: closeDate,
  lines: statementLines,
  totalSaleCents: sum(statementLines.map((l) => l.saleCents)),
  totalCommissionCents: sum(statementLines.map((l) => l.commissionCents)),
  totalNetCents: sum(statementLines.map((l) => l.netCents)),
};

export const statements: Statement[] = [galleryStatement];

function buildPayout(i: number, s: PayoutSpec): ChannelPayout {
  const os = s.orderIds.map(order);
  const gross = sum(os.map((o) => o.grossCents));
  const fees =
    s.channelId === "ch_gallery"
      ? galleryStatement.totalCommissionCents // the commission as the gallery charged it
      : sum(os.map((o) => o.cardFeeCents + o.platformFeeCents));
  const refund = s.refundIds.includes(refundDraft.id) ? refundDraft.amountCents : 0;
  return {
    id: `pay_${pad(i + 1, 3)}`,
    channelId: s.channelId,
    date: s.date,
    grossCents: gross,
    feesCents: fees,
    refundCents: refund,
    netCents: gross - fees - refund,
    orderIds: [...s.orderIds],
    refundIds: [...s.refundIds],
    monthId: s.date > closeDate ? "2026-10" : monthId,
  };
}

export const payouts: ChannelPayout[] = payoutSpecs.map((s, i) => buildPayout(i, s));

function payoutWith(pred: (p: ChannelPayout) => boolean): ChannelPayout {
  const p = payouts.find(pred);
  if (!p) throw new Error("payout not found");
  return p;
}

/** The payout that carries an order's money. */
export function payoutForOrder(orderId: string): ChannelPayout {
  return payoutWith((p) => p.orderIds.includes(orderId));
}

export const galleryPayout = payoutWith((p) => p.channelId === "ch_gallery");
export const bundledPayout = payoutWith((p) => p.channelId === "ch_site" && p.orderIds.length > 1 && p.date <= closeDate);
export const refundPayout = payoutWith((p) => p.refundIds.length > 0);
export const latePayout = payoutWith((p) => p.date > closeDate);

export const refunds: Refund[] = [{ ...refundDraft, nettedInPayoutId: refundPayout.id }];

// ---------------------------------------------------------------------------------------------
// Materials bought for the month from a fictional wool and silver supplier.

const SUPPLIER: Text = { en: "Morning Loom Supply Co.", zh: "晨织供应社" };

const PURCHASE_SPECS: [string, number, string][] = [
  ["2026-09-03", 18500, "Wool weaving yarn, 4 kg"],
  ["2026-09-15", 7200, "Silver sheet and wire"],
  ["2026-09-24", 4600, "Turquoise stones and ear wires"],
];

// ---------------------------------------------------------------------------------------------
// Maker payouts (figure 8). Each pays a maker's share of their September orders whose money arrived
// by the close. The refunded order pays nothing, and the late orders wait for October. Gallery
// orders pay on what the gallery paid: the gap to the contract (10% of each sale) is held.

function heldForOrder(o: Order): number {
  if (o.channelId !== "ch_gallery") return 0;
  const line = galleryStatement.lines.find((l) => l.orderId === o.id);
  return line ? line.commissionCents - o.commissionCents : 0;
}

function arrivedOrders(makerId: string): Order[] {
  return orders.filter((o) => makerOf(o.id) === makerId && o.status === "paid" && payoutForOrder(o.id).date <= closeDate);
}

export const makerPayouts: MakerPayout[] = studio.makerIds.map((makerId, i) => {
  const os = arrivedOrders(makerId);
  const held = sum(os.map(heldForOrder));
  return {
    id: `mpo_${pad(i + 1, 2)}`,
    makerId,
    monthId,
    amountCents: sum(os.map((o) => o.makerShareCents)) - held,
    orderIds: os.map((o) => o.id),
    heldCents: held,
    status: "proposed",
  };
});

/** Each maker's statement lists the same orders as their payout. The total is the share earned. Total less held is the payout. */
export const makerStatements: MakerStatement[] = makerPayouts.map((mp, i) => {
  const lines = mp.orderIds.map((id) => {
    const o = order(id);
    return { orderId: o.id, pieceId: o.pieceId, makerShareCents: o.makerShareCents };
  });
  return {
    id: `mst_${pad(i + 1, 2)}`,
    makerId: mp.makerId,
    monthId,
    lines,
    totalCents: sum(lines.map((l) => l.makerShareCents)),
    heldCents: mp.heldCents,
    payoutDate: makerPayoutDate,
  };
});

// ---------------------------------------------------------------------------------------------
// Bank transactions: one deposit per payout on its date, one withdrawal per purchase, and the three
// maker payouts on Oct 2. Numbered in date order.

const CHANNEL_PAYER: Record<ChannelId, Text> = {
  ch_cindia: { en: "Cindia", zh: "Cindia" },
  ch_site: { en: "Harborline Payments (card processor)", zh: "Harborline Payments（收单机构）" },
  ch_gallery: { en: "Fogline Gallery", zh: "雾线画廊" },
};

interface TxnDraft {
  date: string;
  direction: "in" | "out";
  amountCents: number;
  counterparty: Text;
  memo: string;
  refId: string;
  rank: number;
}

const txnDrafts: TxnDraft[] = [
  ...payouts.map((p) => ({
    date: p.date,
    direction: "in" as const,
    amountCents: p.netCents,
    counterparty: CHANNEL_PAYER[p.channelId],
    memo: `${p.channelId === "ch_gallery" ? "Gallery payment" : p.channelId === "ch_cindia" ? "Cindia settlement" : "Card processor payout"} ${p.id}`,
    refId: p.id,
    rank: 0,
  })),
  ...PURCHASE_SPECS.map(([date, amountCents, memo], i) => ({
    date,
    direction: "out" as const,
    amountCents,
    counterparty: SUPPLIER,
    memo,
    refId: `pur_${pad(i + 1, 3)}`,
    rank: 1,
  })),
  ...makerPayouts.map((mp) => ({
    date: makerPayoutDate,
    direction: "out" as const,
    amountCents: mp.amountCents,
    counterparty: { en: `Maker payout ${mp.makerId}`, zh: `匠人结算 ${mp.makerId}` },
    memo: `Maker payout ${mp.id}`,
    refId: mp.id,
    rank: 2,
  })),
];

export const bankTxns: BankTxn[] = txnDrafts
  .toSorted((a, b) => (a.date === b.date ? a.rank - b.rank : a.date < b.date ? -1 : 1))
  .map((t, i) => ({
    id: `txn_${pad(i + 1, 3)}`,
    date: t.date,
    direction: t.direction,
    amountCents: t.amountCents,
    counterparty: t.counterparty,
    memo: t.memo,
    refId: t.refId,
  }));

function txnFor(refId: string): BankTxn {
  const t = bankTxns.find((x) => x.refId === refId);
  if (!t) throw new Error(`no bank txn for ${refId}`);
  return t;
}

export const galleryDeposit: BankTxn = txnFor(galleryPayout.id);

export const purchases: Purchase[] = PURCHASE_SPECS.map(([date, amountCents, memo], i) => {
  const id = `pur_${pad(i + 1, 3)}`;
  return { id, date, supplier: SUPPLIER, amountCents, memo, txnId: txnFor(id).id };
});

/** The studio account's balance at the end of a day, from the opening balance and the bank records. */
export function balanceAsOf(date: string): number {
  return (
    openingBalanceCents +
    sum(bankTxns.filter((t) => t.date <= date).map((t) => (t.direction === "in" ? t.amountCents : -t.amountCents)))
  );
}

// ---------------------------------------------------------------------------------------------
// Ledger: one balanced journal per payout, gallery order, gallery payment, purchase and maker
// payout. Cindia and site sales are booked when their money lands, so the sale, its fees and the
// cash sit in one journal. Gallery sales are booked when they happen, at the contract's commission,
// into receivable_gallery, which keeps the 34000 still owed after the gallery's short payment.

interface Line {
  account: LedgerAccount;
  debitCents: number;
  creditCents: number;
  memo: string;
}

/** One balanced journal: the lines posted together in one ledger.posted, all sharing refId. */
export interface Journal {
  refId: string;
  date: string;
  entryIds: string[];
}

const SALES_ACCOUNT: Record<ChannelId, LedgerAccount> = {
  ch_cindia: "sales_cindia",
  ch_site: "sales_site",
  ch_gallery: "sales_gallery",
};

const dr = (account: LedgerAccount, cents: number, memo: string): Line => ({ account, debitCents: cents, creditCents: 0, memo });
const cr = (account: LedgerAccount, cents: number, memo: string): Line => ({ account, debitCents: 0, creditCents: cents, memo });

const journalDrafts: { refId: string; date: string; rank: number; lines: Line[] }[] = [];

for (const p of payouts) {
  if (p.channelId === "ch_gallery") {
    journalDrafts.push({
      refId: p.id,
      date: p.date,
      rank: 2,
      lines: [dr("cash", p.netCents, `Gallery payment ${p.id}`), cr("receivable_gallery", p.netCents, `Gallery payment ${p.id}`)],
    });
    continue;
  }
  const lines: Line[] = [dr("cash", p.netCents, `Payout ${p.id}`)];
  for (const id of p.orderIds) {
    const o = order(id);
    if (o.cardFeeCents) lines.push(dr("card_fees", o.cardFeeCents, `Card fee ${o.id}`));
    if (o.platformFeeCents) lines.push(dr("platform_fees", o.platformFeeCents, `Cindia fee ${o.id}`));
  }
  for (const rid of p.refundIds) lines.push(dr("refunds", refundDraft.amountCents, `Refund ${rid} for ${refundDraft.orderId}`));
  for (const id of p.orderIds) lines.push(cr(SALES_ACCOUNT[p.channelId], order(id).grossCents, `Sale ${id}`));
  journalDrafts.push({ refId: p.id, date: p.date, rank: 1, lines });
}

for (const o of galleryOrders) {
  journalDrafts.push({
    refId: o.id,
    date: o.date,
    rank: 0,
    lines: [
      dr("receivable_gallery", o.grossCents - o.commissionCents, `Consignment sale ${o.id}, owed by the contract`),
      dr("gallery_commission", o.commissionCents, `Gallery commission ${o.id}, 40% by contract`),
      cr("sales_gallery", o.grossCents, `Sale ${o.id}`),
    ],
  });
}

PURCHASE_SPECS.forEach(([date, amountCents, memo], i) => {
  const id = `pur_${pad(i + 1, 3)}`;
  journalDrafts.push({ refId: id, date, rank: 3, lines: [dr("materials", amountCents, memo), cr("cash", amountCents, memo)] });
});

for (const mp of makerPayouts) {
  journalDrafts.push({
    refId: mp.id,
    date: makerPayoutDate,
    rank: 4,
    lines: [dr("maker_pay", mp.amountCents, `Maker payout ${mp.id}`), cr("cash", mp.amountCents, `Maker payout ${mp.id}`)],
  });
}

const sortedJournals = journalDrafts.toSorted((a, b) => (a.date === b.date ? a.rank - b.rank : a.date < b.date ? -1 : 1));

export const ledger: LedgerEntry[] = [];
export const journals: Journal[] = [];
for (const j of sortedJournals) {
  const entryIds: string[] = [];
  for (const l of j.lines) {
    const id = `led_${pad(ledger.length + 1, 4)}`;
    ledger.push({ id, date: j.date, account: l.account, debitCents: l.debitCents, creditCents: l.creditCents, refId: j.refId, memo: l.memo });
    entryIds.push(id);
  }
  journals.push({ refId: j.refId, date: j.date, entryIds });
}

/** The journal posted for a record (a payout, gallery order, purchase or maker payout). */
export function journalFor(refId: string): Journal | undefined {
  return journals.find((j) => j.refId === refId);
}

// ---------------------------------------------------------------------------------------------
// Cindy's matches: one per payout except the gallery's, which gets the flag instead.

function matchKind(p: ChannelPayout): MatchKind {
  if (p.date > closeDate) return "carried_over";
  if (p.refundIds.length > 0) return "refund_netted";
  if (p.orderIds.length > 1) return "bundled";
  return "one_to_one";
}

export const matches: Match[] = payouts
  .filter((p) => p.channelId !== "ch_gallery")
  .map((p, i) => ({
    id: `mat_${pad(i + 1, 3)}`,
    kind: matchKind(p),
    recordIds: [p.id, ...p.orderIds, ...p.refundIds],
    // The month whose reconciliation made the match. A carried_over match counts in 2026-10, which
    // its match.made event says in intoMonthId.
    monthId,
  }));

export function matchForPayout(payoutId: string): Match {
  const m = matches.find((x) => x.recordIds[0] === payoutId);
  if (!m) throw new Error(`no match for ${payoutId}`);
  return m;
}

// ---------------------------------------------------------------------------------------------
// The catch (err_01): the contract says 40%, the statement charges 50%, the bank shows the
// statement's net. The contract is the record to trust.

const expectedNet = galleryStatement.totalSaleCents - sum(galleryOrders.map((o) => o.commissionCents));
const depositDay = shortDate(galleryDeposit.date);

export const galleryFlag: Flag = {
  id: "flg_01",
  kind: "short_payment",
  recordIds: [galleryContract.id, galleryStatement.id, galleryDeposit.id],
  expectedCents: expectedNet,
  actualCents: galleryDeposit.amountCents,
  deltaCents: expectedNet - galleryDeposit.amountCents,
  trustRecordId: galleryContract.id,
  explanation: {
    en:
      `The gallery's September statement charged ${STATEMENT_COMMISSION_BPS / 100}% commission on all four sales and paid ${usd(galleryStatement.totalNetCents)}. ` +
      `The signed contract says ${galleryContract.commissionBps / 100}%, which leaves the co-op ${usd(expectedNet)} on ${usd(galleryStatement.totalSaleCents)} of sales. ` +
      `The bank shows ${usd(galleryDeposit.amountCents)} on ${depositDay.en}, matching the statement, not the contract. ` +
      `I trust the contract, so the gallery owes ${usd(expectedNet - galleryDeposit.amountCents)}.`,
    zh:
      `画廊9月对账单对四笔销售都按${STATEMENT_COMMISSION_BPS / 100}%收取佣金，实付${usd(galleryStatement.totalNetCents)}。` +
      `已签合同约定${galleryContract.commissionBps / 100}%，按${usd(galleryStatement.totalSaleCents)}的销售额，合作社应得${usd(expectedNet)}。` +
      `银行流水显示${depositDay.zh}到账${usd(galleryDeposit.amountCents)}，与对账单一致，与合同不符。` +
      `我以合同为准，画廊还欠${usd(expectedNet - galleryDeposit.amountCents)}。`,
  },
};

export const flags: Flag[] = [galleryFlag];

// ---------------------------------------------------------------------------------------------
// The follow-up and the two approvals. Cindy proposes both and approves neither.

export const followUp: FollowUp = {
  id: "fup_01",
  approvalId: "apr_01",
  to: { en: "Fogline Gallery, accounts", zh: "雾线画廊 财务部" },
  subject: {
    en: `September statement: commission at ${STATEMENT_COMMISSION_BPS / 100}% instead of ${galleryContract.commissionBps / 100}%`,
    zh: `9月对账单：佣金按${STATEMENT_COMMISSION_BPS / 100}%计，合同为${galleryContract.commissionBps / 100}%`,
  },
  body: {
    en:
      `Hello,\n\nThank you for the September statement and the payment of ${usd(galleryDeposit.amountCents)} on ${depositDay.en}. ` +
      `The statement charges ${STATEMENT_COMMISSION_BPS / 100}% commission on each sale, but our contract of Mar 2, 2026 sets it at ${galleryContract.commissionBps / 100}%. ` +
      `At ${galleryContract.commissionBps / 100}%, the co-op's share of ${usd(galleryStatement.totalSaleCents)} in sales is ${usd(expectedNet)}, so ${usd(expectedNet - galleryDeposit.amountCents)} is still owed. ` +
      `Could you send the difference by Oct 16?\n\nThank you,\n${studio.name.en}`,
    zh:
      `您好：\n\n感谢寄来9月对账单，并于${depositDay.zh}付款${usd(galleryDeposit.amountCents)}。` +
      `对账单每笔按${STATEMENT_COMMISSION_BPS / 100}%收取佣金，但我们2026年3月2日签订的合同约定为${galleryContract.commissionBps / 100}%。` +
      `按${galleryContract.commissionBps / 100}%计算，${usd(galleryStatement.totalSaleCents)}销售额中合作社应得${usd(expectedNet)}，尚欠${usd(expectedNet - galleryDeposit.amountCents)}。` +
      `烦请于10月16日前补付差额。\n\n谢谢！\n${studio.name.zh}`,
  },
};

export const followUps: FollowUp[] = [followUp];

const DECISION_DATE = "2026-10-01";

export const approvals: Approval[] = [
  {
    id: "apr_01",
    kind: "follow_up",
    subjectIds: [followUp.id],
    proposedBy: "cindy",
    amountCents: galleryFlag.deltaCents,
    overLimit: false,
    decisionDate: DECISION_DATE,
    status: "pending",
  },
  {
    id: "apr_02",
    kind: "maker_payouts",
    subjectIds: makerPayouts.map((m) => m.id),
    proposedBy: "cindy",
    amountCents: sum(makerPayouts.map((m) => m.amountCents)),
    overLimit: makerPayouts.some((m) => m.amountCents > studio.payoutLimitCents),
    decisionDate: DECISION_DATE,
    status: "pending",
  },
];

// ---------------------------------------------------------------------------------------------
// The close totals that month.closed carries (events.md).

/** Gross of the month's orders, less refunds. */
export const salesCents = sum(orders.map((o) => o.grossCents)) - sum(refunds.map((r) => r.amountCents));
/** Card fees, Cindia fees and the gallery's commission as charged on its statement. */
export const feesCents =
  sum(orders.map((o) => o.cardFeeCents + o.platformFeeCents)) + galleryStatement.totalCommissionCents;
/** The approved maker payouts. */
export const makerPayCents = sum(makerPayouts.map((m) => m.amountCents));
/** What's held back from the makers until the gallery pays what it owes. */
export const heldCents = sum(makerPayouts.map((m) => m.heldCents));
