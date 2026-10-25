// The four projects, the works in progress, the add-on contribution of figure 13 and the milestone
// approval apr_05. S3-catalog T1 stub: projects and works in progress stay empty until T7. The
// contribution, its two money moves and the approval's fixed fields are the plan's exact values.
import type { Payloads } from "../core/events";
import type { Approval, Project, WorkInProgress } from "../core/types";

export const projects: Project[] = [];

export const worksInProgress: WorkInProgress[] = [];

/** Figure 13: with ord_001 the buyer adds 500 to prj_01 as ctb_01. */
export const demoContribution: Payloads["project.funded"] = {
  contributionId: "ctb_01",
  projectId: "prj_01",
  amountCents: 500,
  buyerId: "buy_01",
  orderId: "ord_001",
};

/** Cindia passes the full contribution on with no fee: buyer to Cindia, then Cindia to the project's fund. */
export const demoFundMoves: Payloads["money.moved"][] = [
  {
    moveId: "mv_0101",
    kind: "project_fund",
    from: { kind: "buyer", id: demoContribution.buyerId },
    to: { kind: "cindia" },
    amountCents: demoContribution.amountCents,
    refId: demoContribution.contributionId,
    date: "2026-09-01",
  },
  {
    moveId: "mv_0102",
    kind: "project_fund",
    from: { kind: "cindia" },
    to: { kind: "community_fund", id: demoContribution.projectId },
    amountCents: demoContribution.amountCents,
    refId: demoContribution.contributionId,
    date: "2026-09-01",
  },
];

// T1 placeholder: T7 sets amountCents (the milestone's share of wip_01's price) and overLimit by the
// v1 rule once wip_01 exists.
export const apr_05: Approval = {
  id: "apr_05",
  kind: "milestone_release",
  subjectIds: ["wip_01", "mls_02"],
  proposedBy: "cindy",
  overLimit: false,
  decisionDate: "2026-10-01",
  status: "pending",
};
