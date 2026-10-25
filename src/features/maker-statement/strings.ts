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
  order: { en: "Order", zh: "订单" },
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
  /** The lines table's middle column: the day the order was placed. */
  orderDate: { en: "Order date", zh: "下单日期" },
  /**
   * The held line under the held note (A1-12): ties the held amount to the catch, the gallery's
   * short payment, in plain words. A feature string; if the glossary gives it a row, its words win.
   */
  heldWhy: {
    en: "The gallery paid less than its contract says, so part of your share waits until it pays.",
    zh: "画廊的付款少于合同约定，所以您的一部分所得要等画廊补齐后再发放。",
  },
} as const satisfies Record<string, Text>;

// ---------------------------------------------------------------------------------------------
// The desktop page's strings (M-maker-statement T0).

/** The header's "maker at" line: the glossary's Maker, then the community's name. */
export function makerAt(communityName: Text, lang: Lang): string {
  return lang === "zh" ? `${communityName.zh} · ${GLOSSARY.maker.zh}` : `${GLOSSARY.maker.en} · ${communityName.en}`;
}

/** The lines table's three column headings: the piece, the order's date, the maker's share. */
export const COLUMNS = {
  piece: GLOSSARY.piece,
  date: UI.orderDate,
  share: GLOSSARY.makerShare,
} as const satisfies Record<string, Text>;
