import type { BuyerState } from "../state";
import { addId, areaReducer, copy, put, same, stamped } from "./util";

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
  // The latest checkout and card stay for v1's readers. Each is also kept by piece, so a person's
  // checkout of another piece never changes the tour's.
  "checkout.started": (s, e) => {
    const id = e.payload.pieceId;
    const checkouts = put(s.checkouts, id, stamped(s.checkouts[id], copy(e.payload), e.at));
    return same(s, { ...s, checkout: { ...e.payload }, checkouts });
  },
  "card.tokenized": (s, e) => {
    // Filed under its own pieceId, or under the latest checkout's piece when the event has none.
    const id = e.payload.pieceId ?? s.checkout?.pieceId;
    const cards = id ? put(s.cards, id, stamped(s.cards[id], copy(e.payload), e.at)) : s.cards;
    return same(s, { ...s, card: { ...e.payload }, cards });
  },
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
