// Every string the dashboard shows, English and Chinese side by side.
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
  sales: { en: "Sales", zh: "销售额" },
  makerShare: { en: "Maker share", zh: "匠人所得" },
  makerPay: { en: "Maker pay", zh: "匠人报酬" },
  balance: { en: "Balance", zh: "账户余额" },
  flag: { en: "Flag", zh: "异常" },
  shortPayment: { en: "Short payment", zh: "少付款" },
  held: { en: "Held", zh: "暂缓发放" },
  refund: { en: "Refund", zh: "退款" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  /** The panel title. */
  title: { en: "Dashboard", zh: "数据看板" },
  /** Shown in place of the tiles before the first tile's event arrives. */
  empty: {
    en: "The dashboard builds itself, tile by tile, as the month closes.",
    zh: "看板会随着月结逐块生成。",
  },
  /** The revenue tile's title. */
  revenueTitle: { en: "Revenue by channel", zh: "各渠道收入" },
  /** Under the revenue total: the bars are gross less the refund. */
  revenueNote: { en: "September, less the refund", zh: "9月，已扣除退款" },
  /** The chart's accessible label. */
  revenueChartLabel: { en: "Revenue by channel, bar chart", zh: "各渠道收入柱状图" },
  /** Before the revenue total, e.g. "Total: $12,345.00". */
  total: { en: "Total", zh: "合计" },
  /** After the maker share percentage, e.g. "61% of sales". */
  ofSales: { en: "of sales", zh: "占销售额" },
  /** The cash tile's title. */
  cashTitle: { en: "Cash", zh: "现金" },
  /** Before the balance date, e.g. "As of Sep 1, 2026". */
  asOf: { en: "As of", zh: "截至" },
  /** The flags tile's title. */
  flagsTitle: { en: "Open flags", zh: "未处理异常" },
  /** After the open flag count: one. */
  openOne: { en: "open flag", zh: "项未处理" },
  /** After the open flag count: more than one, or none. */
  openMany: { en: "open flags", zh: "项未处理" },
  /** Shown on a tile whose event hasn't arrived yet. */
  waiting: { en: "Waiting for the month", zh: "等待本月数据" },
  /** Separator between a label and its value, e.g. "Held: $340.00". */
  colon: { en: ": ", zh: "：" },
} as const satisfies Record<string, Text>;
