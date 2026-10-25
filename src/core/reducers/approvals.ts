import type { ApprovalsState, ApprovalState, FollowUpState } from "../state";
import { addId, areaReducer, copy, put } from "./util";

function blank(approvalId: string): ApprovalState {
  return { approvalId, status: "pending", requested: false };
}

export const approvalsReducer = areaReducer<ApprovalsState>({
  "approval.requested": (s, e) => {
    const id = e.payload.approvalId;
    const prev = s.items[id] ?? blank(id);
    // A request never reopens an approval that has already been decided. An inline approval (one
    // that isn't in src/mock/) is stored as it arrives.
    const approval = e.payload.approval ? copy(e.payload.approval) : prev.approval;
    const items = put(s.items, id, { ...prev, requested: true, ...(approval ? { approval } : {}) });
    const approvalIds = addId(s.approvalIds, id);
    return items === s.items && approvalIds === s.approvalIds ? s : { ...s, items, approvalIds };
  },
  "approval.granted": (s, e) => {
    const id = e.payload.approvalId;
    const prev = s.items[id] ?? blank(id);
    if (prev.status !== "pending") return s; // the first decision wins
    const items = put(s.items, id, {
      ...prev,
      status: "granted",
      by: e.payload.by,
      date: e.payload.date,
      decidedAt: e.at,
      source: e.source,
    });
    return { ...s, items, approvalIds: addId(s.approvalIds, id) };
  },
  "approval.declined": (s, e) => {
    const id = e.payload.approvalId;
    const prev = s.items[id] ?? blank(id);
    if (prev.status !== "pending") return s; // the first decision wins
    const items = put(s.items, id, {
      ...prev,
      status: "declined",
      by: e.payload.by,
      reason: { ...e.payload.reason },
      decidedAt: e.at,
      source: e.source,
    });
    return { ...s, items, approvalIds: addId(s.approvalIds, id) };
  },
  "followup.drafted": (s, e) => {
    const { followUpId, approvalId, to, subject, body } = e.payload;
    const prev: FollowUpState = s.followUps[followUpId] ?? { followUpId, approvalId, sent: false };
    const followUps = put(s.followUps, followUpId, {
      ...prev,
      approvalId,
      to: { ...to },
      subject: { ...subject },
      body: { ...body },
    });
    return followUps === s.followUps ? s : { ...s, followUps };
  },
  "followup.sent": (s, e) => {
    const { followUpId, approvalId } = e.payload;
    const prev: FollowUpState = s.followUps[followUpId] ?? { followUpId, approvalId, sent: false };
    const followUps = put(s.followUps, followUpId, { ...prev, sent: true });
    return followUps === s.followUps ? s : { ...s, followUps };
  },
  "payout.sent": (s, e) => {
    const payouts = put(s.payouts, e.payload.makerPayoutId, { ...e.payload });
    const payoutIds = addId(s.payoutIds, e.payload.makerPayoutId);
    return payouts === s.payouts && payoutIds === s.payoutIds ? s : { ...s, payouts, payoutIds };
  },
});
