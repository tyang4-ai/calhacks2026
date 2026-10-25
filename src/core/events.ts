// The event envelope and every event type from docs/common/events.md.
import type { CameraId } from "./featureTypes";
import type {
  AgentModel,
  CopyVerdict,
  Facets,
  FlagKind,
  InlineApproval,
  Lang,
  MatchKind,
  StorefrontBlock,
  Text,
  Vibe,
} from "./types";

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
  | "b10-derived"
  | "b11-embed"
  | "b12-search"
  | "b13-live"
  | "b14-swarm"
  | "b15-watch"
  | "b16-bank-books";

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
  "b11-embed",
  "b12-search",
  "b13-live",
  "b14-swarm",
  "b15-watch",
  "b16-bank-books",
];

/** The eleven processes, in the order of the process bar (ui-contract.md). */
export type ProcessId =
  | "search"
  | "swarm"
  | "checkout"
  | "money"
  | "reconcile"
  | "approvals"
  | "close"
  | "proof"
  | "watch"
  | "model"
  | "data";

export const PROCESS_IDS: readonly ProcessId[] = [
  "search",
  "swarm",
  "checkout",
  "money",
  "reconcile",
  "approvals",
  "close",
  "proof",
  "watch",
  "model",
  "data",
];

/** A process block's status on the process bar. B13's process rows use working and done. */
export type ProcessStatus = "idle" | "working" | "done" | "attention";

/** The drawers a beat or a feature can open. */
export type DrawerKind = "support" | "ask" | "audit";

export interface Party {
  kind: "buyer" | "cindia" | "card_network" | "studio" | "maker" | "gallery" | "processor" | "supplier" | "community_fund";
  /** For community_fund, the project ID. */
  id?: string;
}

export interface ChartSpec {
  type: "bar" | "line";
  title: Text;
  labels: string[];
  series: { name: Text; valuesCents: number[] }[];
}

export type MoneyMoveKind =
  | "sale"
  | "fee"
  | "settlement"
  | "payout_in"
  | "materials"
  | "maker_pay"
  | "refund"
  | "project_fund"
  | "milestone";
export type RecordType = "order" | "payout" | "refund" | "statement" | "bank_txn";
export type AgentActKind = "match" | "flag" | "explain" | "draft" | "propose" | "close" | "answer" | "score";

export interface SearchFilters {
  maxPriceCents?: number;
  communityIds?: string[];
}

export interface SearchResult {
  pieceId: string;
  /** Scaled so the best is 1. */
  score: number;
  /** The normalized cosine to the query, 0 to 1, when a model answered. */
  closeness?: number;
  matched: string[];
  reason: Text;
}

export type SearchEngine = "elastic_hybrid" | "local_hybrid" | "keyword_scripted";
export type SurpriseMethod = "keyword_random" | "pure_random" | "fair_random";
export type SwarmStepKind = "route" | "call" | "tool" | "result" | "check" | "handoff" | "reply";
export type SearchSystem = "keyword" | "base" | "custom" | "hybrid";
export type DataTable = "catalog" | "listings" | "orders" | "approvals" | "runs" | "steps" | "processes" | "screens";

/** listing.drafted's facets: as on Piece, except that oneOfAKind and leadTimeDays are optional. */
export type DraftFacets = Omit<Facets, "oneOfAKind" | "leadTimeDays"> & { oneOfAKind?: boolean; leadTimeDays?: number };

export interface ListingCheck {
  checkId: string;
  kind: "protocol" | "facts" | "price";
  ok: boolean;
  note: Text;
}

export interface WatchResult {
  title: string;
  url: string;
  snippet: string;
  /** Null when no model scored the result. */
  similarity: number | null;
  verdict: CopyVerdict;
}

export interface Point {
  x: number;
  y: number;
}

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
    /** What the maker would get for the same piece through the gallery (figure 16). */
    compare?: { channelId: "ch_gallery"; commissionBps: number; makerShareCents: number };
  };
  "checkout.started": { pieceId: string; grossCents: number };
  "card.tokenized": { token: string; brand: "visa"; last4: string; pieceId?: string };
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
    /** Set only by B16. */
    nessieId?: string;
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
  "approval.requested": { approvalId: string; approval?: InlineApproval };
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
  "beat.started": { beatId: string; camera: CameraId; process?: ProcessId; drawer?: DrawerKind };
  // Vibe search and Surprise me
  "search.queried": { queryId: string; text: string; keywords: string[]; lang: Lang; filters?: SearchFilters };
  "search.answered": {
    queryId: string;
    /** At most 12, best first. */
    results: SearchResult[];
    /** False when no result is close. */
    closeMatches?: boolean;
    engine: SearchEngine;
    modelId?: string;
    /** keywords, filters and keywordsBy are set only when the Finder wrote the chips. */
    keywords?: string[];
    filters?: SearchFilters;
    keywordsBy?: "finder" | "rules";
  };
  "search.mapped": {
    queryId: string;
    modelId: string;
    /** All pieces. */
    points: { pieceId: string; x: number; y: number }[];
    query: Point;
    method: "pca";
    /** True when the points come from scripted data. */
    approx?: boolean;
  };
  "surprise.asked": { surpriseId: string; keyword?: string; method: SurpriseMethod; seed: number };
  "surprise.drawn": {
    surpriseId: string;
    pieceId: string;
    method: SurpriseMethod;
    seed: number;
    /** Weights sum to 1. */
    candidates: { pieceId: string; weight: number }[];
  };
  // The agent swarm and support
  "support.asked": {
    threadId: string;
    side: "buyer" | "seller";
    text: string;
    lang: Lang;
    /** The records on screen: a piece, an order or a listing, a store page's community, or a maker page's maker. */
    contextIds: string[];
  };
  "swarm.step": {
    runId: string;
    threadId: string;
    stepId: string;
    agentId: string;
    kind: SwarmStepKind;
    summary: Text;
    toolName?: string;
    ms: number;
    model?: AgentModel;
  };
  "support.answered": {
    threadId: string;
    runId: string;
    /** The agent whose words these are, usually writer. */
    agentId: string;
    reply: Text;
    refIds: string[];
    approvalIds?: string[];
  };
  "support.escalated": { threadId: string; runId: string; reason: Text; approvalId: string };
  "question.forwarded": {
    questionId: string;
    threadId: string;
    makerId: string;
    pieceId: string;
    /** The buyer's question, as asked. */
    text: string;
    lang: Lang;
  };
  "question.answered": {
    questionId: string;
    answerId: string;
    makerId: string;
    /** The maker's own words, exactly as she wrote them. */
    text: string;
    lang: Lang;
  };
  // Listings and storefronts
  "listing.requested": { listingId: string; makerId: string; notes: string; lang: Lang };
  "listing.drafted": {
    listingId: string;
    makerId: string;
    title: Text;
    summary: Text;
    facets: DraftFacets;
    /** From the notes. */
    hours?: number;
    vibe: Vibe;
    checks: ListingCheck[];
  };
  "listing.indexed": {
    listingId: string;
    pieceId: string;
    modelId: string;
    embedText: string;
    index: "cindia-drafts" | "cindia-pieces";
    /** The new vector's dot on the map. */
    point?: Point;
    approx?: boolean;
  };
  "storefront.requested": { storefrontId: string };
  "storefront.drafted": { storefrontId: string; blocks: StorefrontBlock[] };
  /** blocks: the owner's working copy at the moment she publishes. */
  "storefront.published": { storefrontId: string; slug: string; blocks: StorefrontBlock[] };
  // Projects and works in progress
  "project.funded": { contributionId: string; projectId: string; amountCents: number; buyerId: string; orderId?: string };
  "wip.milestone_reached": { wipId: string; milestoneId: string; date: string };
  "wip.milestone_paid": { wipId: string; milestoneId: string; amountCents: number; date: string };
  // The search model
  "model.trained": { modelId: string; baseModel: string; pairs: number; epochs: number; dims: number; hubUrl?: string };
  "proof.search_scored": {
    modelId: string;
    k: 5;
    queries: number;
    /** mrr is MRR at 10. */
    systems: { system: SearchSystem; recallAtK: number; mrr: number }[];
  };
  // The counterfeit watch
  "watch.started": { scanId: string; makerId: string; queries: string[] };
  "watch.scanned": {
    scanId: string;
    engine: "apify" | "scripted";
    /** A count. */
    candidates: number;
    /** Every result checked, in the order checked. */
    results: WatchResult[];
  };
  "counterfeit.flagged": {
    cftId: string;
    scanId: string;
    pieceId: string;
    url: string;
    title: string;
    snippet: string;
    similarity: number;
    claim: Text;
  };
  // Status events, because features never fetch
  "data.synced": {
    /** At most three newest rows per table, each an ID and a label built by code. */
    tables: { table: DataTable; rows: number; newest: { id: string; label: string }[] }[];
    screens: number;
    processes: { processId: ProcessId; status: ProcessStatus }[];
  };
  "index.synced": { indexed: number; drafts: number; elastic: boolean; agentBuilder: boolean };
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
  "search.queried",
  "search.answered",
  "search.mapped",
  "surprise.asked",
  "surprise.drawn",
  "support.asked",
  "swarm.step",
  "support.answered",
  "support.escalated",
  "question.forwarded",
  "question.answered",
  "listing.requested",
  "listing.drafted",
  "listing.indexed",
  "storefront.requested",
  "storefront.drafted",
  "storefront.published",
  "project.funded",
  "wip.milestone_reached",
  "wip.milestone_paid",
  "model.trained",
  "proof.search_scored",
  "watch.started",
  "watch.scanned",
  "counterfeit.flagged",
  "data.synced",
  "index.synced",
];

/** Status events: the log keeps only the newest of each type, so live polling never pushes the tour's events out. */
export const STATUS_EVENT_TYPES: readonly EventType[] = ["data.synced", "index.synced"];

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
  "search.answered": "b12-search",
  "search.mapped": "b11-embed",
  "surprise.drawn": "b12-search",
  "swarm.step": "b14-swarm",
  "support.answered": "b14-swarm",
  "support.escalated": "b14-swarm",
  "question.forwarded": "b14-swarm",
  "question.answered": "b14-swarm",
  "listing.drafted": "b14-swarm",
  "listing.indexed": "b14-swarm",
  "storefront.drafted": "b14-swarm",
  "model.trained": "b11-embed",
  "proof.search_scored": "b11-embed",
  "watch.scanned": "b15-watch",
  "counterfeit.flagged": "b15-watch",
  "data.synced": "b13-live",
  "index.synced": "b12-search",
};

/**
 * "Requests from people" in events.md: the key the registry uses to answer each request type.
 * checkout.started stays keyless: the responder answers it through its keyless path.
 * support.escalated and question.forwarded are answers, never requests.
 */
export const REQUEST_KEYS: Partial<Record<EventType, SourceKey>> = {
  "concierge.asked": "b09-concierge",
  "ask.asked": "b07-ask",
  "scenario.loaded": "b05-scenario",
  "approval.granted": "b08-approvals",
  "approval.declined": "b08-approvals",
  "search.queried": "b12-search",
  "surprise.asked": "b12-search",
  "support.asked": "b14-swarm",
  "listing.requested": "b14-swarm",
  "storefront.requested": "b14-swarm",
  "watch.started": "b15-watch",
  "piece.opened": "b10-derived",
  "wip.milestone_reached": "b08-approvals",
  "question.answered": "b14-swarm",
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
