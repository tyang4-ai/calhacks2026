// The 60-second demo, beat by beat from docs/common/demo-script.md. The month timeline plays inside
// it, shifted by 20200 ms. Derived figures (split, receipts, statement, impact, follow-up) are
// taken from the records, so they always match src/mock/.
import type { Timeline } from "../../core/player";
import type { CameraId } from "../../core/featureTypes";
import { curatedSet } from "../catalog";
import { actId, draft, finalize, type Draft } from "../events";
import { impact } from "../impact";
import {
  approvals,
  balanceAsOf,
  feesCents,
  followUp,
  heldCents,
  journalFor,
  makerPayCents,
  makerPayoutDate,
  makerPayouts,
  makerStatements,
  monthId,
  orders,
  payoutForOrder,
  salesCents,
  galleryPayout,
} from "../month";
import { answerKey } from "../answerKey";
import { pieces } from "../catalog";
import { MONTH_ACT_COUNT, monthTimeline } from "./month";

export const MONTH_SHIFT_MS = 20200;
export const DEMO_QUERY = "a gift under $200 for my mom, she loves peonies";

/** The beats: ID, start in ms, camera (demo-script.md). */
export const BEATS: [string, number, CameraId][] = [
  ["d01-ask", 0, "buyer"],
  ["d02-story", 4000, "buyer"],
  ["d03-split", 8000, "buyer"],
  ["d04-pay", 11000, "buyer"],
  ["d05-money", 15000, "buyer-studio"],
  ["d06-month", 20000, "studio-month"],
  ["d07-catch", 30000, "studio-catch"],
  ["d08-approve", 38000, "studio-owner"],
  ["d09-close", 43000, "studio-close"],
  ["d10-statement", 47000, "maker"],
  ["d11-receipt", 50000, "receipt"],
];

const ord = orders[0]; // ord_001
const pc = pieces.find((p) => p.id === ord.pieceId);
if (!pc) throw new Error("ord_001's piece is missing");
const settlement = payoutForOrder(ord.id); // pay_001
const mst01 = makerStatements[0];
const [apr01, apr02] = approvals;

const STUDIO = { kind: "studio" as const, id: "std_gu" };

const closingRefs = [galleryPayout.id, ...makerPayouts.map((m) => m.id)];
const closingEntryIds = closingRefs.flatMap((r) => journalFor(r)?.entryIds ?? []);

const own: Draft[] = [
  ...BEATS.map(([beatId, at, camera]) => draft("beat.started", at, { beatId, camera })),

  // d01-ask
  draft("concierge.asked", 300, { query: DEMO_QUERY, lang: "en" }),
  draft("concierge.answered", 1800, { query: DEMO_QUERY, pieceIds: [...curatedSet.pieceIds], reasons: { ...curatedSet.reasons } }),
  // d02-story
  draft("piece.opened", 4200, { pieceId: pc.id }),
  // d03-split
  draft("split.shown", 8300, {
    pieceId: pc.id,
    grossCents: ord.grossCents,
    cardFeeCents: ord.cardFeeCents,
    platformFeeCents: ord.platformFeeCents,
    materialsCents: ord.materialsCents,
    makerShareCents: ord.makerShareCents,
  }),
  // d04-pay
  draft("checkout.started", 11300, { pieceId: pc.id, grossCents: ord.grossCents }),
  draft("card.tokenized", 12500, { token: "tok_7Q2M9X4KD1PA", brand: "visa", last4: "4242" }),
  draft("order.placed", 13500, {
    orderId: ord.id,
    pieceId: ord.pieceId,
    channelId: ord.channelId,
    buyerId: ord.buyerId,
    grossCents: ord.grossCents,
    date: ord.date,
  }),
  draft("receipt.updated", 14000, { orderId: ord.id, status: "received", makerId: pc.makerId, makerShareCents: ord.makerShareCents }),
  // d05-money
  draft("money.moved", 15500, {
    moveId: "mv_0001",
    kind: "sale",
    from: { kind: "buyer", id: ord.buyerId },
    to: { kind: "cindia" },
    amountCents: ord.grossCents,
    refId: ord.id,
    date: ord.date,
  }),
  draft("money.moved", 16500, {
    moveId: "mv_0002",
    kind: "fee",
    from: { kind: "cindia" },
    to: { kind: "card_network" },
    amountCents: ord.cardFeeCents,
    refId: ord.id,
    date: ord.date,
  }),
  draft("money.moved", 17500, {
    moveId: "mv_0003",
    kind: "settlement",
    from: { kind: "cindia" },
    to: STUDIO,
    amountCents: settlement.netCents,
    refId: settlement.id,
    date: settlement.date,
  }),
  draft("account.synced", 18500, { accountId: "acct_studio", balanceCents: balanceAsOf(settlement.date), asOf: settlement.date }),

  // d07-catch (the month timeline brings the statement, deposit, flag and explanation)
  draft("agent.acted", 35500, {
    actId: actId(MONTH_ACT_COUNT + 1),
    kind: "draft",
    text: {
      en: "I drafted a follow-up to the gallery asking for the difference. It needs your approval.",
      zh: "我起草了一封给画廊的跟进邮件，请其补付差额。需要您批准。",
    },
    refId: followUp.id,
  }),
  draft("followup.drafted", 35700, {
    followUpId: followUp.id,
    approvalId: followUp.approvalId,
    to: { ...followUp.to },
    subject: { ...followUp.subject },
    body: { ...followUp.body },
  }),
  draft("approval.requested", 36000, { approvalId: apr01.id }),

  // d08-approve
  draft("agent.acted", 38300, {
    actId: actId(MONTH_ACT_COUNT + 2),
    kind: "propose",
    text: {
      en: "I proposed this month's payouts to the three makers, holding back what the gallery still owes. Only you can approve them.",
      zh: "我拟好了三位匠人本月的结算，画廊欠款部分暂缓发放。只有您能批准。",
    },
    refId: apr02.id,
  }),
  draft("approval.requested", 38600, { approvalId: apr02.id }),
  draft("approval.granted", 39800, { approvalId: apr01.id, by: "own_01", date: apr01.decisionDate }),
  draft("followup.sent", 40300, { followUpId: followUp.id, approvalId: followUp.approvalId }),
  draft("approval.granted", 41000, { approvalId: apr02.id, by: "own_01", date: apr02.decisionDate }),
  ...makerPayouts.map((m) => draft("payout.sent", 41600, { makerPayoutId: m.id, makerId: m.makerId, amountCents: m.amountCents, date: makerPayoutDate })),
  ...makerPayouts.map((m, i) =>
    draft("money.moved", 41800, {
      moveId: `mv_${String(4 + i).padStart(4, "0")}`,
      kind: "maker_pay",
      from: STUDIO,
      to: { kind: "maker", id: m.makerId },
      amountCents: m.amountCents,
      refId: m.id,
      date: makerPayoutDate,
    }),
  ),

  // d09-close
  draft("ledger.posted", 43300, { entryIds: closingEntryIds }),
  draft("month.closed", 43800, { monthId, salesCents, feesCents, makerPayCents, heldCents }),
  draft("workbook.ready", 44600, {
    monthId,
    fileName: "cindia-close-2026-09.xlsx",
    sheets: ["Ledger", "Reconciliation", "Profit and loss", "Makers"],
  }),
  draft("impact.updated", 45500, {
    impactId: impact.id,
    makerShareBps: impact.makerShareBps,
    daysCloseToPayout: impact.daysCloseToPayout,
    daysCloseToPayoutBefore: impact.daysCloseToPayoutBefore,
    bookkeepingHoursSaved: impact.bookkeepingHoursSaved,
    estimate: impact.estimate,
  }),

  // d10-statement
  draft("statement.issued", 47400, {
    makerStatementId: mst01.id,
    makerId: mst01.makerId,
    lines: mst01.lines.map((l) => ({ ...l })),
    totalCents: mst01.totalCents,
    heldCents: mst01.heldCents,
    payoutDate: mst01.payoutDate,
  }),

  // d11-receipt
  draft("receipt.updated", 51000, {
    orderId: ord.id,
    status: "paid_to_maker",
    makerId: pc.makerId,
    makerShareCents: ord.makerShareCents,
    paidDate: makerPayoutDate,
  }),
  draft("proof.scored", 59000, {
    caught: answerKey.length,
    total: answerKey.length,
    results: answerKey.map((e) => ({ errorId: e.id, caught: true })),
  }),
];

const shifted: Draft[] = monthTimeline.events.map((e) => ({
  type: e.type,
  at: e.at + MONTH_SHIFT_MS,
  payload: e.payload,
  ...(e.key ? { key: e.key } : {}),
}));

export const demoTimeline: Timeline = { id: "demo", durationMs: 60000, events: finalize([...own, ...shifted], "evt_") };

export default demoTimeline;
