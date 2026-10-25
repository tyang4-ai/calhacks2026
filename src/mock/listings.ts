// The demo listing lst_01 and the approval apr_04 that proposes publishing it. The scripted draft
// itself is run_02's listing.drafted in swarm.ts. S3-catalog T1 stub: both records are the plan's
// exact values already.
import type { Approval, ListingDraft } from "../core/types";

export const listings: ListingDraft[] = [
  {
    id: "lst_01",
    makerId: "mkr_02",
    notes:
      "New small weaving, about 30 by 40 cm. Store-bought wool yarn in red, grey and white, with a zigzag band across the middle. About 20 hours on the loom. Good for someone who likes warm colors.",
    lang: "en",
  },
];

export const apr_04: Approval = {
  id: "apr_04",
  kind: "listing_publish",
  subjectIds: ["lst_01"],
  proposedBy: "cindy",
  overLimit: false,
  decisionDate: "2026-10-01",
  status: "pending",
};
