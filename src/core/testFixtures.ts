// One valid payload per event type, with the demo's figures, for the core and sources unit tests.
// Not imported by the app.
import type { CindiaEvent, EventType, Payloads, SourceKey } from "./events";
import { EVENT_KEYS } from "./events";

export const SAMPLE_PAYLOADS: { [T in EventType]: Payloads[T] } = {
  "concierge.asked": { query: "a gift under $200 for my mom, she loves red wool", lang: "en" },
  "concierge.answered": {
    query: "a gift under $200 for my mom, she loves red wool",
    pieceIds: ["pc_01", "pc_07", "pc_11"],
    reasons: {
      pc_01: { en: "Red wool, under $200", zh: "红色羊毛，200美元以内" },
      pc_07: { en: "A small red weaving", zh: "红色小幅编织" },
      pc_11: { en: "A weaving like the first", zh: "同款编织" },
    },
  },
  "piece.opened": { pieceId: "pc_01" },
  "split.shown": {
    pieceId: "pc_01",
    grossCents: 18000,
    cardFeeCents: 552,
    platformFeeCents: 1800,
    materialsCents: 2200,
    makerShareCents: 13448,
  },
  "checkout.started": { pieceId: "pc_01", grossCents: 18000 },
  "card.tokenized": { token: "tok_7Q2M9X4KD1PA", brand: "visa", last4: "4242" },
  "order.placed": {
    orderId: "ord_001",
    pieceId: "pc_01",
    channelId: "ch_cindia",
    buyerId: "buy_01",
    grossCents: 18000,
    date: "2026-09-01",
  },
  "receipt.updated": { orderId: "ord_001", status: "received", makerId: "mkr_01", makerShareCents: 13448 },
  "money.moved": {
    moveId: "mv_0001",
    kind: "sale",
    from: { kind: "buyer", id: "buy_01" },
    to: { kind: "cindia" },
    amountCents: 18000,
    refId: "ord_001",
    date: "2026-09-01",
  },
  "account.synced": { accountId: "acct_studio", balanceCents: 1215648, asOf: "2026-09-01" },
  "month.started": { monthId: "2026-09" },
  "record.arrived": { recordId: "pay_001", recordType: "payout", date: "2026-09-01" },
  "match.made": { matchId: "mat_001", kind: "one_to_one", recordIds: ["pay_001", "ord_001"] },
  "flag.raised": {
    flagId: "flg_01",
    kind: "short_payment",
    recordIds: ["ctr_gallery_01", "stm_gallery_2026_09", "txn_020"],
    expectedCents: 204000,
    actualCents: 170000,
    deltaCents: 34000,
  },
  "flag.explained": {
    flagId: "flg_01",
    trustRecordId: "ctr_gallery_01",
    explanation: { en: "The contract says 40%.", zh: "合同写的是40%。" },
  },
  "ledger.posted": { entryIds: ["led_0001", "led_0002"] },
  "month.closed": { monthId: "2026-09", salesCents: 900000, feesCents: 150000, makerPayCents: 500000, heldCents: 34000 },
  "agent.acted": { actId: "act_0001", kind: "match", text: { en: "Matched 3 orders to one payout.", zh: "三笔订单对上一笔结款。" } },
  "approval.requested": { approvalId: "apr_01" },
  "approval.granted": { approvalId: "apr_01", by: "own_01", date: "2026-10-01" },
  "approval.declined": { approvalId: "apr_01", by: "own_01", reason: { en: "Not yet", zh: "暂不" } },
  "followup.drafted": {
    followUpId: "fup_01",
    approvalId: "apr_01",
    to: { en: "The gallery", zh: "画廊" },
    subject: { en: "September statement", zh: "九月对账单" },
    body: { en: "Please send the $340.00 difference.", zh: "请补齐340美元差额。" },
  },
  "followup.sent": { followUpId: "fup_01", approvalId: "apr_01" },
  "payout.sent": { makerPayoutId: "mpo_01", makerId: "mkr_01", amountCents: 40000, date: "2026-10-02" },
  "workbook.ready": {
    monthId: "2026-09",
    fileName: "cindia-close-2026-09.xlsx",
    sheets: ["Ledger", "Reconciliation", "Profit and loss", "Makers"],
  },
  "statement.issued": {
    makerStatementId: "mst_01",
    makerId: "mkr_01",
    lines: [{ orderId: "ord_001", pieceId: "pc_01", makerShareCents: 13448 }],
    totalCents: 13448,
    heldCents: 9500,
    payoutDate: "2026-10-02",
  },
  "impact.updated": {
    impactId: "imp_2026_09",
    makerShareBps: 7400,
    daysCloseToPayout: 2,
    daysCloseToPayoutBefore: 30,
    bookkeepingHoursSaved: 12,
    estimate: true,
  },
  "proof.scored": {
    caught: 4,
    total: 4,
    results: [
      { errorId: "err_01", caught: true },
      { errorId: "err_02", caught: true },
      { errorId: "err_03", caught: true },
      { errorId: "err_04", caught: true },
    ],
  },
  "ask.asked": { questionId: "ask_01", text: "这个月哪件作品最赚钱?", lang: "zh" },
  "ask.answered": {
    questionId: "ask_01",
    answer: { en: "The brown, white and grey rug.", zh: "棕白灰三色地毯。" },
    chart: {
      type: "bar",
      title: { en: "Sales by piece", zh: "各作品销售额" },
      labels: ["pc_03", "pc_04"],
      series: [{ name: { en: "Sales", zh: "销售额" }, valuesCents: [120000, 95000] }],
    },
    refIds: ["ord_027"],
  },
  "scenario.loaded": { scenarioId: "scn_01", fileName: "gallery-october.csv", recordIds: ["scn_001"] },
  "beat.started": { beatId: "d01-ask", camera: "buyer" },
};

let n = 0;

/** A scripted event of the given type, with the key events.md gives it. */
export function sample<T extends EventType>(
  type: T,
  overrides: Partial<Payloads[T]> = {},
  env: Partial<Omit<CindiaEvent<T>, "type" | "payload">> = {},
): CindiaEvent<T> {
  n += 1;
  const key: SourceKey | undefined = EVENT_KEYS[type];
  const e: CindiaEvent<T> = {
    id: `evt_${String(n).padStart(4, "0")}`,
    type,
    at: 1000,
    source: "scripted",
    payload: { ...SAMPLE_PAYLOADS[type], ...overrides } as Payloads[T],
    ...env,
  };
  if (key && !("key" in env)) e.key = key;
  return e;
}
