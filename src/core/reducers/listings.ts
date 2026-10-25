// A maker's listings: requests, drafts and index entries, each by listingId.
import type { ListingsState } from "../state";
import { areaReducer, copy, latestAt, newest, put, same, stamped } from "./util";

export const listingsReducer = areaReducer<ListingsState>({
  "listing.requested": (s, e) => {
    const id = e.payload.listingId;
    const prev = s.requests[id];
    const requests = put(s.requests, id, stamped(prev, copy(e.payload), e.at));
    const latest = s.latestListingId ? s.requests[s.latestListingId] : undefined;
    const latestListingId = latestAt(s.latestListingId, latest?.at, id, requests[id].at, !prev);
    return same(s, { ...s, requests, latestListingId });
  },
  "listing.drafted": (s, e) => {
    const id = e.payload.listingId;
    const drafts = put(s.drafts, id, stamped(s.drafts[id], copy(e.payload), e.at));
    return drafts === s.drafts ? s : { ...s, drafts };
  },
  // The newest wins: the draft's cindia-drafts entry, then cindia-pieces once the owner publishes.
  "listing.indexed": (s, e) => {
    const id = e.payload.listingId;
    const indexed = put(s.indexed, id, newest(s.indexed[id], copy(e.payload), e.at));
    return indexed === s.indexed ? s : { ...s, indexed };
  },
});
