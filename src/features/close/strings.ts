// Every string the close screens show, English and Chinese side by side.
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
  close: { en: "Close the month", zh: "月结" },
  workbook: { en: "Excel report", zh: "Excel报表" },
  sales: { en: "Sales", zh: "销售额" },
  fees: { en: "Fees", zh: "费用" },
  makerPay: { en: "Maker pay", zh: "匠人报酬" },
  held: { en: "Held", zh: "暂缓发放" },
  heldNote: { en: "Held until the gallery pays what it owes", zh: "待画廊补齐欠款后发放" },
  makerPayout: { en: "Maker payout", zh: "匠人结算" },
  ledger: { en: "Ledger", zh: "账本" },
  materials: { en: "Materials", zh: "材料费" },
  cardFee: { en: "Card fee", zh: "刷卡手续费" },
  cindiaFee: { en: "Cindia fee", zh: "平台费" },
  commission: { en: "Commission", zh: "佣金" },
  refund: { en: "Refund", zh: "退款" },
  gallery: { en: "Gallery", zh: "画廊" },
  maker: { en: "Maker", zh: "匠人" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  /** Panel title prefix; the month name follows, from formatMonth(). */
  panelTitle: { en: "Month close", zh: "月结" },
  totalsTitle: { en: "This month's totals", zh: "本月合计" },
  notClosedYet: { en: "The month hasn't closed yet.", zh: "本月尚未月结。" },
  download: { en: "Download .xlsx", zh: "下载 .xlsx" },
  downloadNotReady: { en: "The file is ready once the month closes.", zh: "月结后即可下载。" },
  sheets: { en: "Sheets", zh: "工作表" },
  builtInBrowser: { en: "Built in your browser from the month's books. Every total is a live formula.", zh: "在浏览器中根据本月账目生成，所有合计都是公式。" },
  builtOnServer: { en: "Built by the studio's server.", zh: "由工作室服务器生成。" },
  previewTitle: { en: "Profit and loss", zh: "损益表" },
  previewLine: { en: "Line", zh: "项目" },
  previewAmount: { en: "Amount", zh: "金额" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// Lines of the Profit and loss sheet. The workbook writes the English label; the preview shows the
// panel's language. buildWorkbook.ts decides which lines exist and in what order, by these keys.

export const PNL_LABELS = {
  salesCindia: { en: "Sales, Cindia", zh: "销售额，Cindia" },
  salesSite: { en: "Sales, studio site", zh: "销售额，工作室网站" },
  salesGallery: { en: "Sales, gallery", zh: "销售额，画廊" },
  refunds: { en: "Refunds", zh: "退款" },
  netSales: { en: "Net sales", zh: "净销售额" },
  cardFees: { en: "Card fees", zh: "刷卡手续费" },
  platformFees: { en: "Cindia fees", zh: "平台费" },
  galleryCommission: { en: "Gallery commission", zh: "画廊佣金" },
  materials: { en: "Materials", zh: "材料费" },
  makerPay: { en: "Maker pay", zh: "匠人报酬" },
  totalCosts: { en: "Total costs", zh: "成本合计" },
  netIncome: { en: "Net income", zh: "净收入" },
} as const satisfies Record<string, Text>;

export type PnlKey = keyof typeof PNL_LABELS;
