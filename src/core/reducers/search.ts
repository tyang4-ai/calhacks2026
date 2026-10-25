// Vibe search: queries, answers and maps, each by queryId.
import type { SearchState } from "../state";
import { areaReducer, copy, latestAt, put, same, stamped } from "./util";

export const searchReducer = areaReducer<SearchState>({
  "search.queried": (s, e) => {
    const id = e.payload.queryId;
    const prev = s.queries[id];
    const queries = put(s.queries, id, stamped(prev, copy(e.payload), e.at));
    const latest = s.latestQueryId ? s.queries[s.latestQueryId] : undefined;
    const latestQueryId = latestAt(s.latestQueryId, latest?.at, id, queries[id].at, !prev);
    return same(s, { ...s, queries, latestQueryId });
  },
  "search.answered": (s, e) => {
    const id = e.payload.queryId;
    const answers = put(s.answers, id, stamped(s.answers[id], copy(e.payload), e.at));
    return answers === s.answers ? s : { ...s, answers };
  },
  "search.mapped": (s, e) => {
    const id = e.payload.queryId;
    const maps = put(s.maps, id, stamped(s.maps[id], copy(e.payload), e.at));
    return maps === s.maps ? s : { ...s, maps };
  },
});
