// The event envelope and every event type from docs/common/events.md.
import type { CameraId } from "./featureTypes";
import type { FlagKind, Lang, MatchKind, Text } from "./types";

export type Source = "scripted" | "live" | "user";

export type SourceKey =
  | "b01-match"
  | "b02-explain"
  | "b03-proof"
  | "b04-bank"
  | "b05-scenario"
  | "b06-workbook"
  | "b07-ask"
  | "b08-approvals"
  | "b09-concierge"
  | "b10-derived";

export const SOURCE_KEYS: readonly SourceKey[] = [
  "b01-match",
  "b02-explain",
  "b03-proof",
  "b04-bank",
  "b05-scenario",
  "b06-workbook",
  "b07-ask",
  "b08-approvals",
  "b09-concierge",
  "b10-derived",
];

export interface Party {
  kind: "buyer" | "cindia" | "card_network" | "studio" | "maker" | "gallery" | "processor" | "supplier";
  id?: string;
}

export interface ChartSpec {
  type: "bar" | "line";
  title: Text;
  labels: string[];
  series: { name: Text; valuesCents: number[] }[];
}

export type MoneyMoveKind = "sale" | "fee" | "settlement" | "payout_in" | "materials" | "maker_pay" | "refund";
export type RecordType = "order" | "payout" | "refund" | "statement" | "bank_txn";
export type AgentActKind = "match" | "flag" | "explain" | "draft" | "propose" | "close" | "answer" | "score";

export interface Payloads {
  // Buyer
  "concierge.asked": { query: string; lang: Lang };
  "concierge.answered": { query: string; pieceIds: string[]; reasons: Record<string, Text> };
  "piece.opened": { pieceId: string };
  "split.shown": {
    pieceId: string;
    grossCents: number;
    cardFeeCents: number;
    platformFeeCents: number;
    materialsCents: number;
    makerShareCents: number;
  };
  "checkout.started": { pieceId: string; grossCents: number };
  "card.tokenized": { token: string; brand: "visa"; last4: string };
  "order.placed": {
    orderId: string;
    pieceId: string;
    channelId: string;
    buyerId: string;
    grossCents: number;
    date: string;
  };
  "receipt.updated": {
    orderId: string;
    status: "received" | "paid_to_maker";
    makerId: string;
    makerShareCents: number;
    paidDate?: string;
  };
  // Money
  "money.moved": {
    moveId: string;
    kind: MoneyMoveKind;
    from: Party;
    to: Party;
    amountCents: number;
    refId: string;
    date: string;
    nessieId?: string;
  };
  "account.synced": { accountId: string; balanceCents: number; asOf: string };
  // The month
  "month.started": { monthId: string };
  "record.arrived": { recordId: string; recordType: RecordType; date: string };
  "match.made": { matchId: string; kind: MatchKind; recordIds: string[]; intoMonthId?: string };
  "flag.raised": {
    flagId: string;
    kind: FlagKind;
    recordIds: string[];
    expectedCents: number;
    actualCents: number;
    deltaCents: number;
  };
  "flag.explained": { flagId: string; trustRecordId: string; explanation: Text };
  "ledger.posted": { entryIds: string[] };
  "month.closed": {
    monthId: string;
    salesCents: number;
    feesCents: number;
    makerPayCents: number;
    heldCents: number;
  };
  // Cindy
  "agent.acted": { actId: string; kind: AgentActKind; text: Text; refId?: string };
  // Approvals
  "approval.requested": { approvalId: string };
  "approval.granted": { approvalId: string; by: "own_01"; date: string };
  "approval.declined": { approvalId: string; by: "own_01"; reason: Text };
  "followup.drafted": { followUpId: string; approvalId: string; to: Text; subject: Text; body: Text };
  "followup.sent": { followUpId: string; approvalId: string };
  "payout.sent": { makerPayoutId: string; makerId: string; amountCents: number; date: string };
  // The close
  "workbook.ready": { monthId: string; fileName: string; sheets: string[]; url?: string };
  "statement.issued": {
    makerStatementId: string;
    makerId: string;
    lines: { orderId: string; pieceId: string; makerShareCents: number }[];
    totalCents: number;
    heldCents: number;
    payoutDate: string;
  };
  "impact.updated": {
    impactId: string;
    makerShareBps: number;
    daysCloseToPayout: number;
    daysCloseToPayoutBefore: number;
    bookkeepingHoursSaved: number;
    estimate: boolean;
  };
  // Proof, Ask Cindy, the scenario
  "proof.scored": { caught: number; total: number; results: { errorId: string; caught: boolean }[] };
  "ask.asked": { questionId: string; text: string; lang: Lang };
  "ask.answered": { questionId: string; answer: Text; chart?: ChartSpec; refIds: string[] };
  "scenario.loaded": { scenarioId: string; fileName: string; recordIds?: string[]; content?: string };
  // The demo stage
  "beat.started": { beatId: string; camera: CameraId };
}

export type EventType = keyof Payloads;

export interface CindiaEvent<T extends EventType = EventType> {
  id: string;
  type: T;
  at: number;
  source: Source;
  key?: SourceKey;
  payload: Payloads[T];
}

/** Any event, as a union, so `switch (e.type)` narrows the payload. */
export type AnyCindiaEvent = { [T in EventType]: CindiaEvent<T> }[EventType];

export const EVENT_TYPES: readonly EventType[] = [
  "concierge.asked",
  "concierge.answered",
  "piece.opened",
  "split.shown",
  "checkout.started",
  "card.tokenized",
  "order.placed",
  "receipt.updated",
  "money.moved",
  "account.synced",
  "month.started",
  "record.arrived",
  "match.made",
  "flag.raised",
  "flag.explained",
  "ledger.posted",
  "month.closed",
  "agent.acted",
  "approval.requested",
  "approval.granted",
  "approval.declined",
  "followup.drafted",
  "followup.sent",
  "payout.sent",
  "workbook.ready",
  "statement.issued",
  "impact.updated",
  "proof.scored",
  "ask.asked",
  "ask.answered",
  "scenario.loaded",
  "beat.started",
];

/** The Key column of events.md: the source whose live adapter replaces the scripted event of each type. */
export const EVENT_KEYS: Partial<Record<EventType, SourceKey>> = {
  "concierge.answered": "b09-concierge",
  "split.shown": "b10-derived",
  "order.placed": "b04-bank",
  "receipt.updated": "b10-derived",
  "money.moved": "b04-bank",
  "account.synced": "b04-bank",
  "match.made": "b01-match",
  "flag.raised": "b01-match",
  "flag.explained": "b02-explain",
  "approval.requested": "b08-approvals",
  "approval.granted": "b08-approvals",
  "approval.declined": "b08-approvals",
  "followup.drafted": "b02-explain",
  "payout.sent": "b04-bank",
  "workbook.ready": "b06-workbook",
  "statement.issued": "b10-derived",
  "impact.updated": "b10-derived",
  "proof.scored": "b03-proof",
  "ask.answered": "b07-ask",
  "scenario.loaded": "b05-scenario",
};

/** "Requests from people" in events.md: the key the registry uses to answer each request type. */
export const REQUEST_KEYS: Partial<Record<EventType, SourceKey>> = {
  "concierge.asked": "b09-concierge",
  "ask.asked": "b07-ask",
  "scenario.loaded": "b05-scenario",
  "approval.granted": "b08-approvals",
  "approval.declined": "b08-approvals",
};

let userCounter = 0;
let clockFn: () => number = () => 0;

/** The player registers its clock here, so userEvent() can stamp `at` without an import cycle. */
export function setUserEventClock(fn: () => number): void {
  clockFn = fn;
}

/**
 * Builds a person's event: the next `evt_user_` ID, `at` from player.now(), `source: "user"`.
 * Features use it for every tap and typed request, then pass it to emit().
 */
export function userEvent<T extends EventType>(type: T, payload: Payloads[T]): CindiaEvent<T> {
  userCounter += 1;
  return {
    id: `evt_user_${String(userCounter).padStart(4, "0")}`,
    type,
    at: Math.round(clockFn()),
    source: "user",
    payload,
  };
}
