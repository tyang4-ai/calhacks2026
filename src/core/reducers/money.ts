import type { MoneyState } from "../state";
import { addId, areaReducer, put, same } from "./util";

export const moneyReducer = areaReducer<MoneyState>({
  "money.moved": (s, e) => {
    const prev = s.moves[e.payload.moveId];
    // Keep the first firing time, so a repeat or a live replacement doesn't restart the stitch.
    const at = prev ? prev.at : e.at;
    const moves = put(s.moves, e.payload.moveId, { ...e.payload, at });
    const moveIds = addId(s.moveIds, e.payload.moveId);
    return moves === s.moves && moveIds === s.moveIds ? s : { ...s, moves, moveIds };
  },
  "account.synced": (s, e) => {
    const prev = s.accounts[e.payload.accountId];
    const at = prev && prev.balanceCents === e.payload.balanceCents && prev.asOf === e.payload.asOf ? prev.at : e.at;
    const accounts = put(s.accounts, e.payload.accountId, { balanceCents: e.payload.balanceCents, asOf: e.payload.asOf, at });
    return same(s, { ...s, accounts, latestAccountId: e.payload.accountId });
  },
});
