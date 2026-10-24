// The judge's scenario, scn_01: one held-back gallery statement for three early-October sales.
// One line charges 5000 bps against the contract's 4000. Not part of September's totals: only the
// sources registry and the scenario feature use it. Record IDs all start with scn_.
import type { BankTxn, ChannelPayout, Order, Statement } from "../core/types";
import { pieces } from "./catalog";
import { galleryContract } from "./channels";
import { draft, finalize, type Draft } from "./events";
import { bps, sum } from "./util";

export const scenarioId = "scn_01";

const SALES: [string, string, string, number][] = [
  // id, piece, date, commission bps on the statement
  ["scn_ord_01", "pc_09", "2026-10-03", 4000],
  ["scn_ord_02", "pc_12", "2026-10-05", 4000],
  ["scn_ord_03", "pc_10", "2026-10-06", 5000], // charges more than the contract
];

export const scenarioOrders: Order[] = SALES.map(([id, pieceId, date], i) => {
  const p = pieces.find((x) => x.id === pieceId);
  if (!p) throw new Error(`unknown piece ${pieceId}`);
  const commission = bps(p.priceCents, galleryContract.commissionBps);
  return {
    id,
    channelId: "ch_gallery",
    pieceId,
    buyerId: `buy_${String(18 + i).padStart(2, "0")}`,
    date,
    grossCents: p.priceCents,
    cardFeeCents: 0,
    platformFeeCents: 0,
    commissionCents: commission,
    materialsCents: p.materialsCents,
    makerShareCents: p.priceCents - commission - p.materialsCents,
    status: "paid",
  };
});

const lines = SALES.map(([orderId, pieceId, , rate]) => {
  const o = scenarioOrders.find((x) => x.id === orderId);
  if (!o) throw new Error(orderId);
  const commissionCents = bps(o.grossCents, rate);
  return { orderId, pieceId, saleCents: o.grossCents, commissionBps: rate, commissionCents, netCents: o.grossCents - commissionCents };
});

export const scenarioStatement: Statement = {
  id: "scn_stm_01",
  channelId: "ch_gallery",
  monthId: "2026-10",
  issuedDate: "2026-10-09",
  lines,
  totalSaleCents: sum(lines.map((l) => l.saleCents)),
  totalCommissionCents: sum(lines.map((l) => l.commissionCents)),
  totalNetCents: sum(lines.map((l) => l.netCents)),
};

/** The gallery's payment with the statement: the statement's net. */
export const scenarioPayout: ChannelPayout = {
  id: "scn_pay_01",
  channelId: "ch_gallery",
  date: "2026-10-09",
  grossCents: scenarioStatement.totalSaleCents,
  feesCents: scenarioStatement.totalCommissionCents,
  refundCents: 0,
  netCents: scenarioStatement.totalNetCents,
  orderIds: scenarioOrders.map((o) => o.id),
  refundIds: [],
  monthId: "2026-10",
};

export const scenarioDeposit: BankTxn = {
  id: "scn_txn_01",
  date: "2026-10-09",
  direction: "in",
  amountCents: scenarioStatement.totalNetCents,
  counterparty: { en: "Fogline Gallery", zh: "雾线画廊" },
  memo: "Gallery payment, early-October statement",
  refId: scenarioPayout.id,
};

/** The statement as the CSV B05 reads: date,orderId,pieceId,saleCents,commissionBps,netCents. */
export const scenarioCsv: string = [
  "date,orderId,pieceId,saleCents,commissionBps,netCents",
  ...lines.map((l) => {
    const o = scenarioOrders.find((x) => x.id === l.orderId);
    return [o?.date, l.orderId, l.pieceId, l.saleCents, l.commissionBps, l.netCents].join(",");
  }),
].join("\n") + "\n";

export const sampleFileName = "fogline-statement-2026-10-sample.csv";

/** The sample's scn_ record IDs, which the scenario.loaded request carries. */
export const sampleRecordIds: string[] = [scenarioStatement.id, ...scenarioOrders.map((o) => o.id), scenarioPayout.id, scenarioDeposit.id];

const expectedNet = scenarioStatement.totalSaleCents - sum(scenarioOrders.map((o) => o.commissionCents));

const fairLines = lines.filter((l) => l.commissionBps === galleryContract.commissionBps);

const replyDrafts: Draft[] = [
  ...scenarioOrders.map((o, i) => draft("record.arrived", i * 150, { recordId: o.id, recordType: "order", date: o.date })),
  draft("record.arrived", 450, { recordId: scenarioStatement.id, recordType: "statement", date: scenarioStatement.issuedDate }),
  draft("record.arrived", 600, { recordId: scenarioDeposit.id, recordType: "bank_txn", date: scenarioDeposit.date }),
  ...fairLines.map((l, i) =>
    draft("match.made", 900 + i * 200, { matchId: `scn_mat_${String(i + 1).padStart(2, "0")}`, kind: "one_to_one", recordIds: [scenarioStatement.id, l.orderId] }, "b05-scenario"),
  ),
  draft(
    "flag.raised",
    1400,
    {
      flagId: "scn_flg_01",
      kind: "short_payment",
      recordIds: [galleryContract.id, scenarioStatement.id, scenarioDeposit.id],
      expectedCents: expectedNet,
      actualCents: scenarioDeposit.amountCents,
      deltaCents: expectedNet - scenarioDeposit.amountCents,
    },
    "b05-scenario",
  ),
];

/** What a correct matcher produces for the sample, `at` in ms after the request (the registry adds its 1.2 s). */
export const scenarioReplies = finalize(replyDrafts, "evt_scn_");

/** The scenario's records, for getById(). */
export const scenarioRecords: { id: string }[] = [...scenarioOrders, scenarioStatement, scenarioPayout, scenarioDeposit];
