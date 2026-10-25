// The search model: its training summary and its score, each the newest payload.
import type { ModelState } from "../state";
import { areaReducer, copy, same } from "./util";

export const modelReducer = areaReducer<ModelState>({
  "model.trained": (s, e) => same(s, { ...s, trained: copy(e.payload) }),
  "proof.search_scored": (s, e) => same(s, { ...s, scored: copy(e.payload) }),
});
