// Which report a hit's button opens (F-watch T4): a requested approval of kind report_listing whose
// subjectIds include the hit's cftId. The record comes from getById() (apr_03 for cft_01), or, when
// that misses (a person's or a live apr_user_<n>), from approvals.items[approvalId].approval, the
// inline object the store kept from its approval.requested. The newest such request wins.
import { sellRoute } from "../../core/nav";
import type { ApprovalsState } from "../../core/state";
import type { Approval, ApprovalKind } from "../../core/types";
import { getById } from "../../mock";

/** What the report button needs: the approval, if Cindy has drafted one, and its status. */
export interface ReportLink {
  approvalId: string;
  status: "pending" | "granted" | "declined";
  /** /sell/approvals?ref=<approvalId>. */
  to: string;
}

type Lookup = (id: string) => { kind?: ApprovalKind; subjectIds?: readonly string[] } | undefined;

const mockLookup: Lookup = (id) => {
  const rec = getById<Approval>(id);
  return rec && "kind" in rec && "subjectIds" in rec ? rec : undefined;
};

/** The report approval for `cftId`, or null before Cindy's draft is requested. */
export function reportLink(cftId: string, approvals: Pick<ApprovalsState, "items" | "approvalIds">, lookup: Lookup = mockLookup): ReportLink | null {
  let found: ReportLink | null = null;
  for (const approvalId of approvals.approvalIds) {
    const item = approvals.items[approvalId];
    if (!item?.requested) continue;
    const rec = lookup(approvalId) ?? item.approval;
    if (!rec || rec.kind !== "report_listing" || !rec.subjectIds?.includes(cftId)) continue;
    found = { approvalId, status: item.status, to: sellRoute("approvals", { ref: approvalId }) };
  }
  return found;
}
