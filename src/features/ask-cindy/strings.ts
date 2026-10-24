// Every string the Ask Cindy drawer shows, English and Chinese side by side.
// Domain labels copy their rows in docs/common/glossary.md word for word. The rest are the feature's
// own short UI strings (design-system.md, "Words on screen"). Cindy speaks in first person.
import type { Text } from "../../core/types";

export type Lang = "en" | "zh";

/** Picks one language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

// ---------------------------------------------------------------------------------------------
// From the glossary (label table). Keep these word for word.

export const GLOSSARY = {
  askCindy: { en: "Ask Cindy", zh: "问Cindy" },
  cindy: { en: "Cindy", zh: "Cindy" },
  flag: { en: "Flag", zh: "异常" },
  piece: { en: "Piece", zh: "作品" },
  order: { en: "Order", zh: "订单" },
  contract: { en: "Contract", zh: "合同" },
  statement: { en: "Statement", zh: "对账单" },
  bankRecord: { en: "Bank record", zh: "银行流水" },
  payout: { en: "Payout", zh: "结款" },
  refund: { en: "Refund", zh: "退款" },
  makerPayout: { en: "Maker payout", zh: "匠人结算" },
  makerStatement: { en: "This month's income", zh: "本月收入" },
  match: { en: "Matched", zh: "已核对" },
  ledger: { en: "Ledger", zh: "账本" },
  approval: { en: "Needs your approval", zh: "待您批准" },
  followUp: { en: "Follow-up", zh: "跟进邮件" },
  makerShare: { en: "Maker share", zh: "匠人所得" },
} as const satisfies Record<string, Text>;

/**
 * The record kind label for an ID in an answer's refIds, by the ID prefix in data-model.md.
 * Unknown prefixes fall back to the raw ID only (no kind label).
 */
export const RECORD_KIND_BY_PREFIX: Record<string, Text> = {
  pc_: GLOSSARY.piece,
  ord_: GLOSSARY.order,
  ctr_: GLOSSARY.contract,
  stm_: GLOSSARY.statement,
  txn_: GLOSSARY.bankRecord,
  pay_: GLOSSARY.payout,
  rfd_: GLOSSARY.refund,
  mpo_: GLOSSARY.makerPayout,
  mst_: GLOSSARY.makerStatement,
  flg_: GLOSSARY.flag,
  mat_: GLOSSARY.match,
  led_: GLOSSARY.ledger,
  apr_: GLOSSARY.approval,
  fup_: GLOSSARY.followUp,
};

/** The kind label for one record ID, or undefined when the prefix is unknown. */
export function recordKind(id: string): Text | undefined {
  const prefix = Object.keys(RECORD_KIND_BY_PREFIX).find((p) => id.startsWith(p));
  return prefix ? RECORD_KIND_BY_PREFIX[prefix] : undefined;
}

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const STRINGS = {
  /** Placeholder in the question box. */
  inputPlaceholder: { en: "Ask about this month's money", zh: "问问本月的账" },
  /** Accessible label for the question box. */
  inputLabel: { en: "Your question for Cindy", zh: "您想问Cindy的问题" },
  send: { en: "Send", zh: "发送" },
  /** Heading above the three canned questions. */
  suggestionsHeading: { en: "Try asking", zh: "试试这样问" },
  /** Shown while a question waits for its answer. */
  thinking: { en: "I'm checking the records…", zh: "我正在查看记录…" },
  /** Heading above the records an answer names. */
  refsHeading: { en: "Records I used", zh: "我查看的记录" },
  /** The thread before anything has been asked. */
  empty: {
    en: "Ask me about this month's sales, the gallery payment or a maker's pay.",
    zh: "可以问我本月的销售、画廊付款或匠人的收入。",
  },
  /** Speaker label on the owner's own questions. */
  you: { en: "You", zh: "您" },
  /** Speaker label on Cindy's answers. */
  cindySays: { en: "Cindy", zh: "Cindy" },
  /** Note under the chart: amounts are dollars, formatted from cents. */
  chartNote: { en: "Amounts in US dollars", zh: "金额单位：美元" },
  /** Accessible label for the chart. */
  chartLabel: { en: "Chart for Cindy's answer", zh: "Cindy回答的图表" },
} as const satisfies Record<string, Text>;
