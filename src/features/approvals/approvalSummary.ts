// Turns an approval into what its card and its detail show: the kind's tag and title, one summary
// line, the amount and the over-limit mark. Records come from src/mock through getById. An approval
// that isn't there (a live or a person's apr_user_<n>) uses the inline object the store kept from its
// approval.requested. Figures a live event recomputes (the hit's title and text match, the drafted
// listing, the support reply) come from the event payloads in the store, never typed in.
import type { CindiaState, FollowUpState, SupportMessage } from "../../core/state";
import type {
  Approval,
  ApprovalKind,
  Channel,
  Community,
  Contract,
  Flag,
  InlineApproval,
  MakerPayout,
  Storefront,
  Text,
  WorkInProgress,
} from "../../core/types";
import { getById } from "../../mock";
import { formatCents } from "../../ui";
import {
  KIND_TAG,
  KIND_TITLE,
  KIND_WAITING,
  listingSummary,
  milestoneSummary,
  payoutsSummary,
  reportSummary,
  shortPaymentSummary,
  storefrontSummary,
  supportSummary,
} from "./strings";

/** The fields of an approval a card, the detail and a decision need, wherever they came from. */
export interface ApprovalRecord {
  approvalId: string;
  kind: ApprovalKind;
  subjectIds: string[];
  amountCents?: number;
  overLimit: boolean;
  decisionDate: string;
  /** The inline approval's own summary, for an approval that isn't in src/mock/. */
  inlineSummary?: Text;
}

export interface ApprovalSummary {
  approvalId: string;
  kind: ApprovalKind;
  /** The kind's short tag, from the glossary. */
  tag: Text;
  title: Text;
  /** The first summary line: the kind's own line, or an inline approval's own summary. */
  summary: Text;
  /** For an inline approval: the kind's own line once its subject's event is in the store. */
  extra?: Text;
  amountCents?: number;
  overLimit: boolean;
  /** maker_payouts only: the payouts' held amounts added up. */
  heldCents?: number;
  /** False while the kind's own line still waits on its event. */
  ready: boolean;
}

/** The flag whose short amount the follow-up asks the gallery for (data-model.md). */
const SHORT_PAYMENT_FLAG_ID = "flg_01";

/** The approval from src/mock, or the inline object the store kept, or undefined. */
export function approvalRecord(approvalId: string, inline?: InlineApproval): ApprovalRecord | undefined {
  const rec = getById<Approval>(approvalId);
  if (rec && "subjectIds" in rec && "decisionDate" in rec) {
    return {
      approvalId,
      kind: rec.kind,
      subjectIds: [...rec.subjectIds],
      ...(rec.amountCents !== undefined ? { amountCents: rec.amountCents } : {}),
      overLimit: rec.overLimit,
      decisionDate: rec.decisionDate,
    };
  }
  if (inline) {
    return {
      approvalId,
      kind: inline.kind,
      subjectIds: [...inline.subjectIds],
      ...(inline.amountCents !== undefined ? { amountCents: inline.amountCents } : {}),
      overLimit: inline.overLimit,
      decisionDate: inline.decisionDate,
      inlineSummary: inline.summary,
    };
  }
  return undefined;
}

/** The record for an approval in the store: getById() first, then the stored inline object. */
export function recordFromState(s: CindiaState, approvalId: string): ApprovalRecord | undefined {
  return approvalRecord(approvalId, s.approvals.items[approvalId]?.approval);
}

/** The gallery the short-payment flag is about, through its contract. */
export function galleryName(): Text | undefined {
  const flag = getById<Flag>(SHORT_PAYMENT_FLAG_ID);
  const contract = flag ? getById<Contract>(flag.recordIds[0]) : undefined;
  return contract ? getById<Channel>(contract.channelId)?.name : undefined;
}

/** The maker payouts an approval names. */
export function payoutsOf(record: ApprovalRecord): MakerPayout[] {
  return record.subjectIds.map((id) => getById<MakerPayout>(id)).filter((p): p is MakerPayout => Boolean(p && "heldCents" in p));
}

/** The latest drafted follow-up for this approval, or null before followup.drafted. */
export function findFollowUp(s: CindiaState, approvalId: string): FollowUpState | null {
  let found: FollowUpState | null = null;
  for (const f of Object.values(s.approvals.followUps)) {
    if (f.approvalId === approvalId && f.body) found = f;
  }
  return found;
}

/** A support thread an approval belongs to: the escalation or reply that names it, or a subject that is a thread. */
export interface SupportView {
  threadId: string;
  latestReply?: Text;
  reason?: Text;
}

export function supportFor(s: CindiaState, approvalId: string, subjectIds: string[]): SupportView | undefined {
  const names = (m: SupportMessage) =>
    (m.kind === "escalated" && m.approvalId === approvalId) || (m.kind === "answered" && (m.approvalIds ?? []).includes(approvalId));
  let threadId = s.support.threadIds.find((id) => s.support.threads[id]?.messages.some(names));
  threadId ??= subjectIds.find((id) => s.support.threads[id]);
  if (!threadId) return undefined;
  const messages = s.support.threads[threadId]?.messages ?? [];
  let latestReply: Text | undefined;
  let reason: Text | undefined;
  for (const m of messages) {
    if (m.kind === "answered") latestReply = m.reply;
    if (m.kind === "escalated" && (m.approvalId === approvalId || !reason)) reason = m.reason;
  }
  return { threadId, ...(latestReply ? { latestReply } : {}), ...(reason ? { reason } : {}) };
}

/** The kind's own summary line, or undefined while the event it needs hasn't arrived. */
function kindLine(record: ApprovalRecord, s: CindiaState | undefined): Text | undefined {
  const first = record.subjectIds[0] ?? "";
  switch (record.kind) {
    case "follow_up": {
      const flag = getById<Flag>(SHORT_PAYMENT_FLAG_ID);
      const shortCents = flag?.deltaCents ?? record.amountCents ?? 0;
      return shortPaymentSummary(formatCents(shortCents), galleryName());
    }
    case "maker_payouts": {
      const payouts = payoutsOf(record);
      const totalCents = payouts.reduce((acc, p) => acc + p.amountCents, 0);
      return payoutsSummary(payouts.length, formatCents(totalCents));
    }
    case "report_listing": {
      const hit = s?.watch.hits[first];
      return hit ? reportSummary(hit.title, hit.similarity) : undefined;
    }
    case "listing_publish": {
      const draft = s?.listings.drafts[first];
      return draft ? listingSummary(draft.title) : undefined;
    }
    case "storefront_publish": {
      const sto = getById<Storefront>(first);
      const community = sto && "communityId" in sto ? getById<Community>(sto.communityId) : undefined;
      return community ? storefrontSummary(community.name) : undefined;
    }
    case "milestone_release": {
      const wip = getById<WorkInProgress>(record.subjectIds.find((id) => id.startsWith("wip_")) ?? "");
      const mls = wip?.milestones.find((m) => record.subjectIds.includes(m.milestoneId));
      return wip && mls ? milestoneSummary(wip.title, mls.label) : undefined;
    }
    case "support_action": {
      const view = s ? supportFor(s, record.approvalId, record.subjectIds) : undefined;
      const text = view?.latestReply ?? view?.reason;
      return text ? supportSummary(text) : undefined;
    }
  }
}

/**
 * What an approval's card shows. Pass the store's state for the v2 kinds and inline approvals; v1's
 * two kinds read only src/mock. Undefined when neither src/mock nor the store describes it.
 */
export function summarizeApproval(approvalId: string, s?: CindiaState): ApprovalSummary | undefined {
  const record = s ? recordFromState(s, approvalId) : approvalRecord(approvalId);
  if (!record) return undefined;
  const line = kindLine(record, s);
  const heldCents = record.kind === "maker_payouts" ? payoutsOf(record).reduce((acc, p) => acc + p.heldCents, 0) : undefined;
  const base = {
    approvalId,
    kind: record.kind,
    tag: KIND_TAG[record.kind],
    title: KIND_TITLE[record.kind],
    ...(record.amountCents !== undefined ? { amountCents: record.amountCents } : {}),
    overLimit: record.overLimit,
    ...(heldCents !== undefined ? { heldCents } : {}),
    ready: line !== undefined,
  };
  if (record.inlineSummary) return { ...base, summary: record.inlineSummary, ...(line ? { extra: line } : {}) };
  return { ...base, summary: line ?? KIND_WAITING[record.kind] };
}
