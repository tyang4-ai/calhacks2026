// The reconcile feature's words, English and Chinese side by side.
// GLOSSARY holds labels copied exactly from docs/common/glossary.md. UI holds the short strings the
// glossary lacks (design-system.md, "Words on screen"). Amounts and dates are never typed in here:
// templates take them already formatted by the kit (Money, formatCents, formatDate).
import type { RecordType } from "../../core/events";
import type { MatchKind, Text } from "../../core/types";

/** Labels from glossary.md, word for word. */
export const GLOSSARY = {
  match: { en: "Matched", zh: "已核对" },
  bundled: { en: "Bundled payout", zh: "合并结款" },
  refundNetted: { en: "Refund taken out", zh: "退款已抵扣" },
  carriedOver: { en: "Carried to next month", zh: "结转下月" },
  flag: { en: "Flag", zh: "异常" },
  shortPayment: { en: "Short payment", zh: "少付款" },
  evidence: { en: "Evidence", zh: "证据" },
  trust: { en: "Trust this record", zh: "以此为准" },
  contract: { en: "Contract", zh: "合同" },
  commission: { en: "Commission", zh: "佣金" },
  statement: { en: "Statement", zh: "对账单" },
  bankRecord: { en: "Bank record", zh: "银行流水" },
  payout: { en: "Payout", zh: "结款" },
  order: { en: "Order", zh: "订单" },
  refund: { en: "Refund", zh: "退款" },
  gallery: { en: "Gallery", zh: "画廊" },
  cindy: { en: "Cindy", zh: "Cindy" },
} as const satisfies Record<string, Text>;

/** The label for each record type in record.arrived. */
export const RECORD_TYPE_LABELS: Record<RecordType, Text> = {
  order: GLOSSARY.order,
  payout: GLOSSARY.payout,
  refund: GLOSSARY.refund,
  statement: GLOSSARY.statement,
  bank_txn: GLOSSARY.bankRecord,
};

/** The order the per-type counters show in. */
export const RECORD_TYPE_ORDER: readonly RecordType[] = ["order", "payout", "refund", "bank_txn", "statement"];

/** The chip label for each match kind. one_to_one shows no chip, only the jade check and "Matched". */
export const MATCH_KIND_LABELS: Record<MatchKind, Text> = {
  one_to_one: GLOSSARY.match,
  bundled: GLOSSARY.bundled,
  refund_netted: GLOSSARY.refundNetted,
  carried_over: GLOSSARY.carriedOver,
};

/** Short UI strings the glossary lacks. */
export const UI = {
  panelTitle: { en: "The month", zh: "本月对账" },
  timelineTitle: { en: "Records as they arrive", zh: "陆续到达的记录" },
  waiting: { en: "Waiting for the month to start", zh: "等待本月开始" },
  noRecordsYet: { en: "No records yet", zh: "暂无记录" },
  handledTitle: { en: "Cindy handled", zh: "Cindy已处理" },
  // LedgerTable columns.
  colDate: { en: "Date", zh: "日期" },
  colType: { en: "Record", zh: "记录" },
  colParty: { en: "From", zh: "来自" },
  colDetail: { en: "Details", zh: "明细" },
  colAmount: { en: "Amount", zh: "金额" },
  // The catch.
  catchTitle: { en: "Records that disagree", zh: "记录不一致" },
  expected: { en: "Owed by contract", zh: "按合同应付" },
  paid: { en: "Paid", zh: "实付" },
  short: { en: "Short", zh: "少付" },
  owedToStudio: { en: "Owed to the co-op", zh: "合作社应得" },
  statementNet: { en: "Net paid", zh: "实付净额" },
  deposit: { en: "Deposit", zh: "到账金额" },
  depositDate: { en: "Date", zh: "日期" },
  sales: { en: "Sales", zh: "销售额" },
  signed: { en: "Signed", zh: "签订日期" },
  issued: { en: "Issued", zh: "出具日期" },
  explanationTitle: { en: "Cindy's explanation", zh: "Cindy的说明" },
  explaining: { en: "Cindy is checking the three records", zh: "Cindy正在核对三份记录" },
  /** M-desktop's label: under the bank card's figures when the flag's flag.raised carries nessieId (B16). */
  checkedNessie: { en: "Checked against Nessie", zh: "已与Nessie银行记录核对" },
} as const satisfies Record<string, Text>;

/** "12 of 20 payouts matched" */
export function payoutsMatched(matched: number, total: number): Text {
  return { en: `${matched} of ${total} payouts matched`, zh: `已核对${matched}笔结款，共${total}笔` };
}

/** Bundled reason: "one payout, 3 orders". */
export function bundledReason(orderCount: number): Text {
  return { en: `one payout, ${orderCount} orders`, zh: `一笔结款，${orderCount}笔订单` };
}

/** Refund reason: "the $95.00 refund taken out". `amount` comes formatted from the kit. */
export function refundReason(amount: string): Text {
  return { en: `the ${amount} refund taken out`, zh: `已扣除${amount}退款` };
}

/** Carried-over reason: "lands Oct 2, counts in October". `date` and `month` come formatted from the kit. */
export function carriedReason(date: string, month: string): Text {
  return { en: `lands ${date}, counts in ${month}`, zh: `${date}到账，计入${month}` };
}

/** One-to-one reason: "one payout, one order". */
export const ONE_TO_ONE_REASON: Text = { en: "one payout, one order", zh: "一笔结款，一笔订单" };

/** The flag's reason line: "The gallery paid $340.00 less than the contract says". `amount` comes formatted. */
export function shortReason(amount: string): Text {
  return { en: `The gallery paid ${amount} less than the contract says`, zh: `画廊比合同少付了${amount}` };
}

export function t(text: Text, lang: "en" | "zh"): string {
  return text[lang];
}
