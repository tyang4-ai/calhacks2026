// Every string the audit screens show, English and Chinese side by side.
// Domain labels copy their rows in docs/common/glossary.md word for word. The rest are the feature's
// own short UI strings (design-system.md, "Words on screen").
import type { Text } from "../../core/types";

export type Lang = "en" | "zh";

/** Picks one language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

// ---------------------------------------------------------------------------------------------
// From the glossary (label table). Keep these word for word.

export const GLOSSARY = {
  auditTrail: { en: "Where this number comes from", zh: "数字来源" },
  makerPayout: { en: "Maker payout", zh: "匠人结算" },
  order: { en: "Order", zh: "订单" },
  payout: { en: "Payout", zh: "结款" },
  refund: { en: "Refund", zh: "退款" },
  flag: { en: "Flag", zh: "异常" },
  shortPayment: { en: "Short payment", zh: "少付款" },
  contract: { en: "Contract", zh: "合同" },
  statement: { en: "Statement", zh: "对账单" },
  bankRecord: { en: "Bank record", zh: "银行流水" },
  ledger: { en: "Ledger", zh: "账本" },
  held: { en: "Held", zh: "暂缓发放" },
  commission: { en: "Commission", zh: "佣金" },
  makerShare: { en: "Maker share", zh: "匠人所得" },
  materials: { en: "Materials", zh: "材料费" },
  cindiaFee: { en: "Cindia fee", zh: "平台费" },
  cardFee: { en: "Card fee", zh: "刷卡手续费" },
  fees: { en: "Fees", zh: "费用" },
  sales: { en: "Sales", zh: "销售额" },
  trust: { en: "Trust this record", zh: "以此为准" },
  refundNetted: { en: "Refund taken out", zh: "退款已抵扣" },
  payoutDate: { en: "Payout date", zh: "发放日期" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  /** Over the start list. */
  pickFigure: { en: "Pick a figure to trace", zh: "选择要追溯的数字" },
  /** Back from a trail to the start list. */
  allFigures: { en: "All figures", zh: "全部数字" },
  /** Over the trail, before the record's ID. */
  tracing: { en: "Tracing", zh: "追溯" },
  /** When a ref names no record, or a record with no trail. */
  noTrail: { en: "No trail found for this record.", zh: "找不到这条记录的来源。" },
  /** The mark on the bank record, the last step. */
  sourceOfTruth: { en: "Source of truth", zh: "以此为准的原始记录" },
  /** Under the source-of-truth mark. */
  sourceOfTruthNote: {
    en: "The bank shows what actually moved. Every step above traces to it.",
    zh: "银行流水记录真实到账的钱，以上每一步都追溯到这里。",
  },
  /** A ledger entry's kind label. */
  ledgerEntry: { en: "Ledger entry", zh: "账本分录" },
  /** The buyer's order, in the start list. */
  buyersOrder: { en: "The buyer's order", zh: "买家的订单" },
  /** Shown before the month's records have arrived. */
  beforeClose: {
    en: "The month is still open. Trails show the full month's records.",
    zh: "本月尚未月结，来源显示整月的记录。",
  },
  /** Field labels for amounts on a step. */
  amount: { en: "Amount", zh: "金额" },
  gross: { en: "Gross", zh: "总额" },
  net: { en: "Net", zh: "净额" },
  debit: { en: "Debit", zh: "借方" },
  credit: { en: "Credit", zh: "贷方" },
  expected: { en: "Expected by contract", zh: "合同应付" },
  actual: { en: "Actually paid", zh: "实际支付" },
  shortBy: { en: "Short by", zh: "少付" },
  totalSale: { en: "Total sales", zh: "销售总额" },
  totalCommission: { en: "Commission charged", zh: "收取佣金" },
  totalNet: { en: "Net stated", zh: "对账单净额" },
  /** Bank directions. */
  deposit: { en: "Deposit", zh: "入账" },
  withdrawal: { en: "Withdrawal", zh: "出账" },
  /** Label before a date. */
  date: { en: "Date", zh: "日期" },
  /** Label before a record's memo. */
  memo: { en: "Memo", zh: "备注" },
  /** Label before a counterparty. */
  counterparty: { en: "From or to", zh: "对方" },
  /** Label before a ledger account. */
  account: { en: "Account", zh: "科目" },
  /** Label before a contract's commission rate. */
  commissionRate: { en: "Commission rate", zh: "佣金比例" },
  /** Signed date of a contract. */
  signed: { en: "Signed", zh: "签订" },
  /** Step count, after the number, e.g. "12 steps". */
  steps: { en: "steps", zh: "步" },
} as const satisfies Record<string, Text>;

/** Ledger account names, for a ledger entry's account (data-model.md, Ledger accounts). */
export const ACCOUNTS = {
  cash: { en: "Cash", zh: "现金" },
  sales_cindia: { en: "Sales on Cindia", zh: "Cindia销售额" },
  sales_site: { en: "Sales on the co-op site", zh: "合作社网站销售额" },
  sales_gallery: { en: "Gallery sales", zh: "画廊销售额" },
  card_fees: { en: "Card fees", zh: "刷卡手续费" },
  platform_fees: { en: "Cindia fees", zh: "平台费" },
  gallery_commission: { en: "Gallery commission", zh: "画廊佣金" },
  materials: { en: "Materials", zh: "材料费" },
  maker_pay: { en: "Maker pay", zh: "匠人报酬" },
  receivable_gallery: { en: "Owed by the gallery", zh: "画廊应付款" },
  refunds: { en: "Refunds", zh: "退款" },
} as const satisfies Record<string, Text>;
