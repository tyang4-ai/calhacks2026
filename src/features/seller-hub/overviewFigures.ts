// The overview's figures (F-seller-hub T2), derived from the store and the mock, with no wall clock.
// - sales: the gross of the orders whose record.arrived has fired, less the refunds that arrived.
//   A scripted month has no "today", so the tile says "so far this month".
// - waiting: the sum of deltaCents over the open flags, the money owed to the co-op that hasn't
//   arrived ($340.00 after the catch).
// - approvals: requested approvals still pending, inline ones included.
// - flags: the flags raised.
// - hits: the counterfeit.flagged events.
// Plain functions, no components, so the unit tests can run them on a store state.
import type { CindiaState } from "../../core/state";
import type { Approval, ApprovalKind, InlineApproval, Order, Refund } from "../../core/types";
import { getById } from "../../mock";

export interface OverviewFigures {
  salesCents: number;
  orderCount: number;
  refundCount: number;
  waitingCents: number;
  approvalsWaiting: number;
  openFlags: number;
  hits: number;
}

/** The slices of the store the overview reads. */
export type OverviewSlices = Pick<CindiaState, "month" | "approvals" | "watch">;

/** One approval still waiting for the owner, newest request last. */
export interface PendingApproval {
  approvalId: string;
  kind: ApprovalKind | null;
  amountCents?: number;
}

/** The approval record: the mock's, or the inline object the store kept from its approval.requested. */
export function approvalRecord(
  approvalId: string,
  items: CindiaState["approvals"]["items"],
): (Pick<Approval, "kind" | "subjectIds" | "amountCents"> & { summary?: InlineApproval["summary"] }) | null {
  const rec = getById<Approval>(approvalId);
  if (rec) return rec;
  return items[approvalId]?.approval ?? null;
}

export function overviewFigures(s: OverviewSlices): OverviewFigures {
  let salesCents = 0;
  let orderCount = 0;
  let refundCount = 0;
  for (const id of s.month.recordIds) {
    const r = s.month.records[id];
    if (!r) continue;
    if (r.recordType === "order" && id.startsWith("ord_")) {
      const order = getById<Order>(id);
      if (!order) continue;
      salesCents += order.grossCents;
      orderCount += 1;
    } else if (r.recordType === "refund" && id.startsWith("rfd_")) {
      const refund = getById<Refund>(id);
      if (!refund) continue;
      salesCents -= refund.amountCents;
      refundCount += 1;
    }
  }
  let waitingCents = 0;
  for (const id of s.month.flagIds) waitingCents += s.month.flags[id]?.deltaCents ?? 0;
  return {
    salesCents,
    orderCount,
    refundCount,
    waitingCents,
    approvalsWaiting: pendingApprovals(s).length,
    openFlags: s.month.flagIds.length,
    hits: s.watch.hitIds.length,
  };
}

/** The approvals that were requested and are still pending, in the order they were first seen. */
export function pendingApprovals(s: Pick<CindiaState, "approvals">): PendingApproval[] {
  const out: PendingApproval[] = [];
  for (const id of s.approvals.approvalIds) {
    const item = s.approvals.items[id];
    if (!item || !item.requested || item.status !== "pending") continue;
    const rec = approvalRecord(id, s.approvals.items);
    out.push({ approvalId: id, kind: rec?.kind ?? null, ...(rec?.amountCents !== undefined ? { amountCents: rec.amountCents } : {}) });
  }
  return out;
}
