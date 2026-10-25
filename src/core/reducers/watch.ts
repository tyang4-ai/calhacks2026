// The counterfeit watch: scans by scanId, with every checked result, and hits by cftId.
import type { WatchScanState, WatchState } from "../state";
import { addId, areaReducer, copy, deepEqual, latestAt, put, stamped } from "./util";

export const watchReducer = areaReducer<WatchState>({
  "watch.started": (s, e) => {
    const { scanId, makerId, queries } = e.payload;
    const prev = s.scans[scanId];
    // A repeat keeps the scan's start time. A scan first seen through watch.scanned gets its maker and start here.
    const unchanged = prev && prev.makerId === makerId && deepEqual(prev.queries, queries);
    const scan: WatchScanState = unchanged ? prev : { ...prev, makerId, queries: [...queries], startedAt: e.at };
    const scans = put(s.scans, scanId, scan);
    if (scans === s.scans) return s;
    const latest = s.latestScanId ? s.scans[s.latestScanId] : undefined;
    const latestScanId = latestAt(s.latestScanId, latest?.startedAt, scanId, scan.startedAt);
    return { ...s, scans, latestScanId };
  },
  "watch.scanned": (s, e) => {
    const { scanId, engine, candidates, results } = e.payload;
    const prev: WatchScanState = s.scans[scanId] ?? { makerId: "", queries: [], startedAt: e.at };
    const unchanged = prev.engine === engine && prev.candidates === candidates && deepEqual(prev.results, results);
    const scan: WatchScanState = unchanged
      ? prev
      : { ...prev, engine, candidates, results: copy(results), scannedAt: e.at };
    const scans = put(s.scans, scanId, scan);
    if (scans === s.scans) return s;
    return { ...s, scans, latestScanId: s.latestScanId ?? scanId };
  },
  "counterfeit.flagged": (s, e) => {
    const id = e.payload.cftId;
    const hits = put(s.hits, id, stamped(s.hits[id], copy(e.payload), e.at));
    const hitIds = addId(s.hitIds, id);
    return hits === s.hits && hitIds === s.hitIds ? s : { ...s, hits, hitIds };
  },
});
