// Short UI strings for the money map, English and Chinese side by side.
// Domain words come from docs/common/glossary.md. Strings the glossary lacks are marked "local".
import type { MoneyMoveKind, Party } from "../../core/events";

export type Lang = "en" | "zh";
export interface Str {
  en: string;
  zh: string;
}

export const strings = {
  /** Glossary: money map. */
  title: { en: "Money map", zh: "资金流向图" },
  /** Glossary: thread. */
  moneyFlow: { en: "Money flow", zh: "资金线" },
  /** Glossary: balance. */
  balance: { en: "Balance", zh: "账户余额" },
  /** Local: the as-of line under the balance. The date follows. */
  asOf: { en: "As of", zh: "截至" },
  /** Local: before the first account.synced. */
  noBalanceYet: { en: "No balance yet", zh: "暂无余额" },
  /** Local: the label once b04-bank is live. */
  nessieAccount: { en: "Studio account on Nessie", zh: "工作室的Nessie账户" },
  /** Local: money that stayed with a party (in minus out). */
  kept: { en: "Kept", zh: "留存" },
  /** Local: the canvas's accessible label. */
  canvasLabel: { en: "Money moving between the buyer, Cindia, the studio and the makers", zh: "买家、Cindia、工作室与匠人之间的资金流向" },
} satisfies Record<string, Str>;

/**
 * Party names. Glossary rows: buyer, card network, studio, gallery, card processor, supplier, maker.
 * Cindia has no glossary row as a party yet: it reads "Cindia" in both languages (listed under needs:).
 * Makers are labeled by their own names from src/mock/, so this is only the fallback.
 */
export const partyNames: Record<Party["kind"], Str> = {
  buyer: { en: "Buyer", zh: "买家" },
  cindia: { en: "Cindia", zh: "Cindia" },
  card_network: { en: "Card network", zh: "卡组织" },
  studio: { en: "Studio", zh: "工作室" },
  maker: { en: "Maker", zh: "匠人" },
  gallery: { en: "Gallery", zh: "画廊" },
  processor: { en: "Card processor", zh: "收单机构" },
  supplier: { en: "Supplier", zh: "供应商" },
};

/**
 * What each kind of move is called. Glossary: card fee, payout, maker payout, materials, refund.
 * "sale" and "settlement" are local.
 */
export const moveKindNames: Record<MoneyMoveKind, Str> = {
  sale: { en: "Sale", zh: "销售" },
  fee: { en: "Card fee", zh: "刷卡手续费" },
  settlement: { en: "Payout", zh: "结款" },
  payout_in: { en: "Payout", zh: "结款" },
  materials: { en: "Materials", zh: "材料费" },
  maker_pay: { en: "Maker payout", zh: "匠人结算" },
  refund: { en: "Refund", zh: "退款" },
};

/** Glossary: Cindia fee. Shown with what Cindia kept from a sale. */
export const cindiaFee: Str = { en: "Cindia fee", zh: "平台费" };

export function t(s: Str, lang: Lang): string {
  return s[lang];
}
