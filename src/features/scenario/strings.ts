// Every string the scenario panel shows, English and Chinese side by side (F-scenario T0).
// Domain labels copy their rows in docs/common/glossary.md word for word. The rest are the feature's
// own short UI strings (design-system.md, "Words on screen"). Cindy speaks in first person.
import type { RecordType } from "../../core/events";
import type { Text } from "../../core/types";

export type Lang = "en" | "zh";

/** Picks one language from a Text. */
export function t(text: Text, lang: Lang): string {
  return text[lang];
}

/** Fills `{name}` placeholders in one language of a Text. */
export function fill(text: Text, lang: Lang, values: Record<string, string>): string {
  return text[lang].replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

// ---------------------------------------------------------------------------------------------
// From the glossary (label table). Keep these word for word.

export const GLOSSARY = {
  cindy: { en: "Cindy", zh: "Cindy" },
  statement: { en: "Statement", zh: "对账单" },
  match: { en: "Matched", zh: "已核对" },
  flag: { en: "Flag", zh: "异常" },
  theCatch: { en: "Short payment", zh: "少付款" },
  contract: { en: "Contract", zh: "合同" },
  commission: { en: "Commission", zh: "佣金" },
  bankRecord: { en: "Bank record", zh: "银行流水" },
  evidence: { en: "Evidence", zh: "证据" },
  order: { en: "Order", zh: "订单" },
  payout: { en: "Payout", zh: "结款" },
  refund: { en: "Refund", zh: "退款" },
  piece: { en: "Piece", zh: "作品" },
  gallery: { en: "Gallery", zh: "画廊" },
  sales: { en: "Sales", zh: "销售额" },
} as const satisfies Record<string, Text>;

/** The label for each record type a record.arrived carries. */
export const RECORD_TYPE_LABEL: Record<RecordType, Text> = {
  order: GLOSSARY.order,
  payout: GLOSSARY.payout,
  refund: GLOSSARY.refund,
  statement: GLOSSARY.statement,
  bank_txn: GLOSSARY.bankRecord,
};

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const STRINGS = {
  /** Panel title. */
  title: { en: "Try a statement", zh: "试一份对账单" },
  /** One line under the title. */
  intro: {
    en: "Drop in a gallery statement and I'll check it against the contract and the bank.",
    zh: "放入一份画廊对账单，我会对照合同和银行流水逐条核对。",
  },

  // Drop zone (T1)
  dropPrompt: { en: "Drop a .csv or .json statement here", zh: "将 .csv 或 .json 对账单拖到这里" },
  dropActive: { en: "Let go to add the file", zh: "松开即可添加文件" },
  chooseFile: { en: "Choose a file", zh: "选择文件" },
  /** Accessible label for the hidden file input. */
  fileInputLabel: { en: "Statement file (.csv or .json)", zh: "对账单文件（.csv 或 .json）" },
  /** Label before the dropped file's name. */
  fileLabel: { en: "File", zh: "文件" },
  /** Scripted mode: a dropped file is not read. */
  scriptedFileNote: {
    en: "Reading your own file comes with the live upgrade. Use the sample statement to see me work through one now.",
    zh: "读取您自己的文件需要实时模式。现在可以用样例对账单，看我逐条核对。",
  },
  /** Live mode: a file over 200 KB. */
  tooBigNote: {
    en: "This file is over 200 KB, so I didn't read it. Try a smaller statement, or use the sample.",
    zh: "文件超过200 KB，我没有读取。请换一份小一些的对账单，或使用样例。",
  },
  /** Any file that isn't .csv or .json. */
  wrongTypeNote: {
    en: "I read .csv and .json statements. Choose one of those, or use the sample.",
    zh: "我能读取 .csv 和 .json 对账单。请选择这两种格式之一，或使用样例。",
  },
  /** Live mode: the file could not be read in the browser. */
  readFailedNote: {
    en: "The file couldn't be opened. Try choosing it again, or use the sample.",
    zh: "文件无法打开。请重新选择，或使用样例。",
  },
  /** Live mode: the file was sent. */
  sentNote: { en: "Sent. I'm reading your file.", zh: "已发送，我正在读取您的文件。" },

  // Sample and results (T2)
  useSample: { en: "Use the sample statement", zh: "使用样例对账单" },
  /** While the request waits for its answer. */
  reading: { en: "I'm reading the statement…", zh: "我正在读取对账单…" },
  /** Heading above the results list. */
  resultsHeading: { en: "What I found", zh: "我的核对结果" },
  /** Before anything is loaded. */
  empty: {
    en: "No statement yet. Drop one in, or use the sample.",
    zh: "还没有对账单。放入一份，或使用样例。",
  },
  /** Live request answered by the scripted fallback. */
  fallbackNote: {
    en: "The live reader didn't answer, so these are the sample statement's results.",
    zh: "实时读取没有响应，以下是样例对账单的结果。",
  },
  /** Results table columns. */
  colRecord: { en: "Record", zh: "记录" },
  colDate: { en: "Date", zh: "日期" },
  colAmount: { en: "Amount", zh: "金额" },
  colStatus: { en: "Status", zh: "状态" },
  /** Status of a record with no match and no flag yet. */
  unmatched: { en: "Not matched yet", zh: "尚未核对" },
  /** Status of a record named in a flag. */
  flagged: { en: "Flagged", zh: "有异常" },
  /** Flag reason line; {amount} is the formatted delta. */
  flagReason: {
    en: "The gallery paid {amount} less than the contract says.",
    zh: "画廊付款比合同约定少了{amount}。",
  },
  /** Figure labels on the flag's evidence. */
  expected: { en: "The contract says", zh: "合同约定" },
  actual: { en: "The bank received", zh: "银行实收" },
  difference: { en: "Difference", zh: "差额" },
  /** A statement line that charges more commission than the contract. */
  overCommission: {
    en: "Charges {rate} commission, the contract says {contractRate}",
    zh: "按{rate}收取佣金，合同约定{contractRate}",
  },
} as const satisfies Record<string, Text>;
