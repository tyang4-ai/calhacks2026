// Every string the proof panel shows, English and Chinese side by side.
// Domain labels copy their rows in docs/common/glossary.md word for word. The rest are the feature's
// own short UI strings (design-system.md, "Words on screen"). Amounts arrive already formatted by
// the kit (formatCents from src/ui/), so this file never formats money itself.
import type { SourceKey } from "../../core/events";
import type { PlantedErrorKind, Text } from "../../core/types";

export type Lang = "en" | "zh";

/** Picks one language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

// ---------------------------------------------------------------------------------------------
// From the glossary (label table). Keep these word for word.

export const GLOSSARY = {
  proof: { en: "Proof", zh: "验证" },
  plantedError: { en: "Test case", zh: "测试用例" },
  match: { en: "Matched", zh: "已核对" },
  flag: { en: "Flag", zh: "异常" },
  cindy: { en: "Cindy", zh: "Cindy" },
  contract: { en: "Contract", zh: "合同" },
  statement: { en: "Statement", zh: "对账单" },
  bankRecord: { en: "Bank record", zh: "银行流水" },
  payout: { en: "Payout", zh: "结款" },
  order: { en: "Order", zh: "订单" },
  refund: { en: "Refund", zh: "退款" },
  estimate: { en: "Estimate", zh: "估算" },
} as const satisfies Record<string, Text>;

/** The four planted error kinds, from the glossary's flag and match kind rows. */
export const KIND_LABELS: Record<PlantedErrorKind, Text> = {
  short_payment: { en: "Short payment", zh: "少付款" },
  bundled: { en: "Bundled payout", zh: "合并结款" },
  refund_netted: { en: "Refund taken out", zh: "退款已抵扣" },
  carried_over: { en: "Carried to next month", zh: "结转下月" },
};

/** The score line, from the glossary's score row: "Caught 4 of 4", 识别4/4. */
export function caughtOf(caught: number, total: number): Text {
  return { en: `Caught ${caught} of ${total}`, zh: `识别${caught}/${total}` };
}

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  /** The panel's subtitle under the title. */
  intro: {
    en: "Four known problems are hidden in September's records. This is how many Cindy's matcher caught.",
    zh: "九月的记录里藏了四个已知问题。这里显示Cindy的核对程序识别了几个。",
  },
  /** proof-score before proof.scored has arrived. */
  notScored: { en: "Not scored yet", zh: "尚未评分" },
  notScoredHint: {
    en: "The score appears once the month's records have been matched.",
    zh: "本月记录核对完成后显示评分。",
  },
  // The error list
  errorsTitle: { en: "The four test cases", zh: "四个测试用例" },
  records: { en: "Records", zh: "相关记录" },
  expected: { en: "A correct matcher reports", zh: "正确的核对结果" },
  why: { en: "Why it's there", zh: "设置原因" },
  caught: { en: "Caught", zh: "已识别" },
  missed: { en: "Missed", zh: "未识别" },
  /** An item's verdict before proof.scored. */
  pending: { en: "Waiting for the score", zh: "等待评分" },
  // The real or simulated list
  sourcesTitle: { en: "What's real and what's simulated", zh: "哪些是真实的，哪些是模拟的" },
  sourcesHint: {
    en: "Simulated parts play scripted events. A part turns real when its live source delivers.",
    zh: "模拟部分播放预设事件。实时数据源送达后，该部分变为真实。",
  },
  real: { en: "Real", zh: "真实" },
  simulated: { en: "Simulated", zh: "模拟" },
  part: { en: "Part", zh: "部分" },
  state: { en: "State", zh: "状态" },
} as const satisfies Record<string, Text>;

/** Short record-type labels by ID prefix, for the records an error involves. */
export const RECORD_PREFIX_LABELS: Record<string, Text> = {
  ctr: GLOSSARY.contract,
  stm: GLOSSARY.statement,
  txn: GLOSSARY.bankRecord,
  pay: GLOSSARY.payout,
  ord: GLOSSARY.order,
  rfd: GLOSSARY.refund,
};

/** The record-type label for an ID such as "ord_015", or undefined for an unknown prefix. */
export function recordTypeLabel(id: string): Text | undefined {
  return RECORD_PREFIX_LABELS[id.split("_")[0] ?? ""];
}

/** What a correct matcher reports, one line per kind. Amounts and dates arrive formatted. */
export const EXPECTED = {
  shortPayment(expected: string, actual: string, delta: string): Text {
    return {
      en: `A short-payment flag: owed ${expected}, paid ${actual}, short ${delta}.`,
      zh: `一条少付款异常：应付${expected}，实付${actual}，少付${delta}。`,
    };
  },
  bundled(orderCount: number): Text {
    return {
      en: `One bundled match covering all ${orderCount} orders.`,
      zh: `一条合并结款核对，覆盖全部${orderCount}笔订单。`,
    };
  },
  refundNetted(): Text {
    return {
      en: "One match with the refund taken out of the payout.",
      zh: "一条核对，退款已从结款中抵扣。",
    };
  },
  carriedOver(month: string): Text {
    return {
      en: `One match carried to next month, counted in ${month}.`,
      zh: `一条结转下月的核对，计入${month}。`,
    };
  },
};

/** What each part of the system is, for the real or simulated list, one per source key. */
export const SOURCE_LABELS: Record<SourceKey, Text> = {
  "b01-match": { en: "Matching payouts to orders", zh: "结款与订单核对" },
  "b02-explain": { en: "Cindy's explanations and follow-up drafts", zh: "Cindy的解释与跟进邮件草稿" },
  "b03-proof": { en: "This proof score", zh: "本页验证评分" },
  "b04-bank": { en: "Bank account and money moves", zh: "银行账户与资金流动" },
  "b05-scenario": { en: "Testing your own file", zh: "用您自己的文件测试" },
  "b06-workbook": { en: "Excel report", zh: "Excel报表" },
  "b07-ask": { en: "Ask Cindy", zh: "问Cindy" },
  "b08-approvals": { en: "Approvals on the owner's second screen", zh: "店主第二块屏幕上的审批" },
  "b09-concierge": { en: "Gift finder", zh: "选购助手" },
  "b10-derived": { en: "Price split, receipts, statements and impact", zh: "价格拆分、收据、结算单与影响" },
  // v2's sources (M-desktop T0), named as the process bar names their processes.
  "b11-embed": { en: "Our own search model", zh: "我们自己的搜索模型" },
  "b12-search": { en: "Vibe search", zh: "按感觉搜索" },
  "b13-live": { en: "Live shared state between screens", zh: "屏幕之间的实时共享状态" },
  "b14-swarm": { en: "Cindy's agent swarm", zh: "Cindy的智能体团队" },
  "b15-watch": { en: "Counterfeit watch", zh: "仿冒监测" },
  "b16-bank-books": { en: "Fund and milestone moves checked against Nessie", zh: "基金与阶段付款经Nessie核对" },
};
