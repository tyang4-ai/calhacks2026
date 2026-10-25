// The demo listing lst_01 and the approval apr_04 that proposes publishing it. The scripted draft
// itself is run_02's listing.drafted in swarm.ts. DEMO DATA: the notes are Lena T.'s placeholder
// words, written by the Cindia team in her plain voice, with no price (S3-catalog T7).
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
