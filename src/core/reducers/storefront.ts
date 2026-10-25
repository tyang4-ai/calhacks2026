// Storefronts: requests, drafted blocks and published copies, each by storefrontId.
import type { StorefrontState } from "../state";
import { areaReducer, copy, newest, put, stamped } from "./util";

export const storefrontReducer = areaReducer<StorefrontState>({
  "storefront.requested": (s, e) => {
    const id = e.payload.storefrontId;
    const requests = put(s.requests, id, { at: s.requests[id]?.at ?? e.at });
    return requests === s.requests ? s : { ...s, requests };
  },
  "storefront.drafted": (s, e) => {
    const id = e.payload.storefrontId;
    const drafts = put(s.drafts, id, stamped(s.drafts[id], { blocks: copy(e.payload.blocks) }, e.at));
    return drafts === s.drafts ? s : { ...s, drafts };
  },
  // The newest storefront.published, so the public page shows the blocks the owner published.
  "storefront.published": (s, e) => {
    const id = e.payload.storefrontId;
    const published = put(s.published, id, newest(s.published[id], { slug: e.payload.slug, blocks: copy(e.payload.blocks) }, e.at));
    return published === s.published ? s : { ...s, published };
  },
});
