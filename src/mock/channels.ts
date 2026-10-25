// The three sales channels and the gallery's consignment contract. The gallery is fictional.
import type { Channel, Contract } from "../core/types";

export const channels: Channel[] = [
  { id: "ch_cindia", name: { en: "Cindia", zh: "Cindia" }, kind: "marketplace" },
  { id: "ch_site", name: { en: "Co-op website", zh: "合作社网站" }, kind: "own_site" },
  { id: "ch_gallery", name: { en: "Fogline Gallery, San Francisco", zh: "雾线画廊（旧金山）" }, kind: "consignment" },
];

export const galleryContract: Contract = {
  id: "ctr_gallery_01",
  channelId: "ch_gallery",
  commissionBps: 4000,
  statementDay: 30,
  signedDate: "2026-03-02",
  terms: {
    en: "Fogline Gallery sells the co-op's pieces on consignment and keeps a commission of 40% of each sale price. The gallery sends a statement of the month's sales on the 30th of each month and pays the co-op the balance with the statement.",
    zh: "雾线画廊寄售合作社作品，每件按售价收取40%佣金。画廊于每月30日寄出当月销售对账单，并随对账单向合作社支付余款。",
  },
};

export const contracts: Contract[] = [galleryContract];
