// The copy watch: the sandbox market's four listings, the scripted scan of mkr_01, and the Reporter's
// draft fup_02 and the approval apr_03 that goes with it. S3-catalog T1 stub: no candidates until T7.
// The scan's queries follow F-watch's rule and are built from the records, the approval is the
// plan's exact record, and fup_02 holds placeholder text that T7 replaces.
import type { Approval, CounterfeitCandidate, FollowUp, ScriptedScan } from "../core/types";
import { pieces } from "./catalog";
import { makers, studio } from "./people";

export const counterfeitCandidates: CounterfeitCandidate[] = [];

const grace = makers.find((m) => m.id === "mkr_01");
const firstPiece = pieces.find((p) => p.makerId === "mkr_01");
if (!grace || !firstPiece) throw new Error("watch.ts needs mkr_01 and her first piece");

// cftIds stays empty while counterfeitCandidates is empty. T7 sets it to ["cft_01"].
export const scriptedScan: ScriptedScan = {
  scanId: "wsc_01",
  makerId: grace.id,
  queries: [
    studio.name.en,
    `${grace.name.en} ${firstPiece.facets.object.en}`,
    firstPiece.story.en.split(/\s+/).slice(0, 8).join(" "),
  ],
  cftIds: [],
  followUpId: "fup_02",
  approvalId: "apr_03",
};

// T1 placeholder text: T7 writes the calm, factual draft.
export const fup_02: FollowUp = {
  id: "fup_02",
  approvalId: "apr_03",
  to: { en: "Sandbox market, trust team", zh: "沙盒市集信任团队" },
  subject: { en: "A listing to review (placeholder)", zh: "待核查的商品（占位）" },
  body: { en: "Placeholder draft.", zh: "占位草稿。" },
};

export const apr_03: Approval = {
  id: "apr_03",
  kind: "report_listing",
  subjectIds: ["cft_01"],
  proposedBy: "cindy",
  overLimit: false,
  decisionDate: "2026-10-01",
  status: "pending",
};
