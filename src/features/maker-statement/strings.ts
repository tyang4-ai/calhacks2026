// Every string the maker's statement shows, English and Chinese side by side.
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
  makerStatement: { en: "This month's income", zh: "本月收入" },
  makerShare: { en: "Maker share", zh: "匠人所得" },
  held: { en: "Held", zh: "暂缓发放" },
  heldNote: { en: "Held until the gallery pays what it owes", zh: "待画廊补齐欠款后发放" },
  makerPayout: { en: "Maker payout", zh: "匠人结算" },
  payoutDate: { en: "Payout date", zh: "发放日期" },
  paid: { en: "Paid", zh: "已发放" },
  noSalesYet: { en: "No sales this month yet", zh: "本月暂无销售" },
  piece: { en: "Piece", zh: "作品" },
  maker: { en: "Maker", zh: "匠人" },
  gallery: { en: "Gallery", zh: "画廊" },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// The feature's own short strings.

export const UI = {
  /** Heading over the list of lines. */
  piecesSold: { en: "Pieces sold", zh: "已售作品" },
  /** Shown next to the payout date before payout.sent arrives. */
  onTheWay: { en: "On the way", zh: "待发放" },
  /** The toast the first time the maker's payout lands. */
  paidToast: { en: "Your payout has been sent", zh: "您的结款已发出" },
  /** The amount actually paid out: the total less what is held. */
  paidOut: { en: "Paid out", zh: "实发金额" },
  /** Fallback when a piece ID isn't in the catalog. */
  unknownPiece: { en: "Piece", zh: "作品" },
  /** The empty state's second line, under "No sales this month yet". */
  emptyHint: { en: "Your statement appears here after the month closes.", zh: "月结后，您的对账会显示在这里。" },
  /** Accessible label for the list of lines. */
  linesLabel: { en: "Pieces sold this month and your share of each", zh: "本月售出的作品及您的所得" },
} as const satisfies Record<string, Text>;
