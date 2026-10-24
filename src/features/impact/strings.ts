// Every string the impact screens show, English and Chinese side by side.
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
  impact: { en: "Impact", zh: "影响" },
  makerShare: { en: "Maker share", zh: "匠人所得" },
  daysToPayout: { en: "Days from close to payout", zh: "月结到发放天数" },
  hoursSaved: { en: "Bookkeeping hours saved", zh: "节省记账小时" },
  estimate: { en: "Estimate", zh: "估算" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  /** Under the maker share number. */
  makerShareHint: { en: "of each Cindia sale", zh: "每笔Cindia销售" },
  /** The unit after the days number. */
  days: { en: "days", zh: "天" },
  /** Before the before value of days to payout, e.g. "Before: 45 days". */
  before: { en: "Before", zh: "之前" },
  /** Separator between a label and its value, e.g. "Before: 45 days". */
  colon: { en: ": ", zh: "：" },
  /** The unit after the hours number. */
  hours: { en: "hours", zh: "小时" },
  /** Under the hours number. */
  perMonth: { en: "each month", zh: "每月" },
  /** Shown in place of a number before impact.updated. */
  dash: { en: "–", zh: "–" },
  /** Shown under the numbers before impact.updated. */
  notYet: { en: "These numbers appear when the month closes.", zh: "月结后显示这些数字。" },
  /** The one-line estimate note, shown while the payload's estimate is true. */
  estimateNote: {
    en: "These are estimates until a real studio's month replaces them.",
    zh: "这些是估算，等真实工作室的月度数据到来后替换。",
  },
} as const satisfies Record<string, Text>;
