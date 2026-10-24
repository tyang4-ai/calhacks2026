import type { BuyerState } from "../state";
import { addId, areaReducer, put, same } from "./util";

export const buyerReducer = areaReducer<BuyerState>({
  "concierge.asked": (s, e) => same(s, { ...s, conciergeQuery: e.payload.query, conciergeLang: e.payload.lang }),
  "concierge.answered": (s, e) =>
    same(s, {
      ...s,
      concierge: { query: e.payload.query, pieceIds: [...e.payload.pieceIds], reasons: { ...e.payload.reasons } },
    }),
  "piece.opened": (s, e) => same(s, { ...s, openPieceId: e.payload.pieceId }),
  "split.shown": (s, e) => {
    const splits = put(s.splits, e.payload.pieceId, { ...e.payload });
    return same(s, { ...s, splits, latestSplitPieceId: e.payload.pieceId });
  },
  "checkout.started": (s, e) => same(s, { ...s, checkout: { ...e.payload } }),
  "card.tokenized": (s, e) => same(s, { ...s, card: { ...e.payload } }),
  "order.placed": (s, e) => {
    const orders = put(s.orders, e.payload.orderId, { ...e.payload });
    const orderIds = addId(s.orderIds, e.payload.orderId);
    return orders === s.orders && orderIds === s.orderIds ? s : { ...s, orders, orderIds };
  },
  "receipt.updated": (s, e) => {
    const receipts = put(s.receipts, e.payload.orderId, { ...e.payload });
    return receipts === s.receipts ? s : { ...s, receipts };
  },
});
