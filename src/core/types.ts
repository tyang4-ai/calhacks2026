// Entities from docs/common/data-model.md. Money is integer cents, rates are basis points,
// dates are ISO "YYYY-MM-DD" strings.
import type { EventType, Payloads } from "./events";

export interface Text {
  en: string;
  zh: string;
}

export type Lang = "en" | "zh";

// ID string types. Each is a plain string with a fixed prefix, documented here.
export type StudioId = string; // "std_dine"
export type PersonId = string; // "own_01".."own_04", "mkr_01".."mkr_17", "buy_01".."buy_20"
export type MakerId = string; // "mkr_01".."mkr_17" (the co-op's are "mkr_01".."mkr_03")
export type BuyerId = string; // "buy_01".."buy_20"
export type OwnerId = string; // "own_01".."own_04" (the co-op's is "own_01")
export type PieceId = string; // "pc_01".."pc_54" (the co-op's are "pc_01".."pc_12"), "pc_55" and "pc_user_<n>" in events only
export type CommunityId = string; // "com_dine", "com_ojibwe", "com_acoma", "com_seminole"
export type ProjectId = string; // "prj_01".."prj_04"
export type WipId = string; // "wip_01".."wip_03"
export type MilestoneId = string; // "mls_01" onward
export type StorefrontId = string; // "sto_01".."sto_04"
export type BlockId = string; // "blk_01" onward, "blk_user_<n>", "blk_user_<tag>_<n>"
export type ListingId = string; // "lst_01", "lst_user_<n>"
export type AgentId = string; // the agent IDs in the roster: "cindy", "intake", "writer" and so on
export type SearchQueryId = string; // "sq_001".."sq_050", the held-out eval queries
export type CounterfeitId = string; // "cft_01".."cft_04", "cft_user_<n>"
export type RunId = string; // "run_01".."run_10", "run_user_<n>"
export type StepId = string; // "stp_0001" onward, "stp_user_<n>"
export type CheckId = string; // "chk_01" onward, "chk_user_<n>"
export type ContributionId = string; // "ctb_01" onward, "ctb_user_<n>"
export type QueryId = string; // "qry_01", "qry_user_<n>"
export type SurpriseId = string; // "srp_01", "srp_user_<n>"
export type ThreadId = string; // "thr_00".."thr_05", "thr_user_<n>", or a listing's or storefront's ID
export type ScanId = string; // "wsc_01", "wsc_user_<n>"
export type MakerQuestionId = string; // "qst_01" onward, "qst_user_<n>": a buyer's question put to a maker
export type AnswerId = string; // "ans_01" onward, "ans_user_<n>": a maker's answer
export type PolicyTopicId = string; // "pol_01" onward
export type ChannelId = "ch_cindia" | "ch_site" | "ch_gallery";
// More IDs: "ord_user_<n>" (a person's order, store only), "evt_" (the timeline), "evt_user_" (a
// person), "evt_reply_<n>" (a scripted answer), "evt_live_" (a live answer). A live answer to a
// person uses its prefix with the page tag: "<prefix>_user_<tag>_<n>".
export type ContractId = string; // "ctr_gallery_01"
export type OrderId = string; // "ord_001".."ord_030"
export type ChannelPayoutId = string; // "pay_001" onward
export type RefundId = string; // "rfd_001"
export type StatementId = string; // "stm_gallery_2026_09"
export type PurchaseId = string; // "pur_001" onward
export type BankTxnId = string; // "txn_001" onward
export type MatchId = string; // "mat_001" onward
export type FlagId = string; // "flg_01"
export type MakerPayoutId = string; // "mpo_01".."mpo_03"
export type ApprovalId = string; // "apr_01".."apr_05", "apr_user_<n>"
export type FollowUpId = string; // "fup_01", "fup_02", "fup_user_<n>"
export type LedgerEntryId = string; // "led_0001" onward
export type MakerStatementId = string; // "mst_01".."mst_03"
export type PlantedErrorId = string; // "err_01".."err_04"
export type ImpactId = string; // "imp_2026_09"
export type MonthId = string; // "2026-09"
export type MoveId = string; // "mv_0001" onward, "mv_0101", "mv_0102", "mv_user_<n>", events only
export type AccountId = string; // "acct_studio", events only
export type ActId = string; // "act_0001" onward, "act_reply_<n>", events only
export type QuestionId = string; // Ask Cindy: "ask_01".."ask_03", "ask_user_1" onward
export type ScenarioId = string; // "scn_01"
export type IsoDate = string;

export interface Studio {
  id: StudioId;
  name: Text;
  craft: Text;
  city: Text;
  ownerId: OwnerId;
  makerIds: MakerId[];
  payoutLimitCents: number;
  nessieAccountId?: string;
}

export interface Person {
  id: PersonId;
  role: "owner" | "maker" | "buyer";
  name: Text;
  surnameChar: string;
  lang: "zh" | "en";
  /** Owners and makers: their community. */
  communityId?: CommunityId;
  /** Unset for everyone in v2. */
  nativeName?: string;
  /** BCP 47 tags, display only. */
  languages?: string[];
  /** Makers: two plain lines for the buyer's paid receipt, demo data. */
  receiptNote?: Text;
}

export interface ProcessStep {
  step: Text;
  hours: number;
}

/** A piece's facts. Every word list is lowercase English. */
export interface Facets {
  object: Text;
  materials: string[];
  techniques: string[];
  motifs: string[];
  colors: string[];
  sizeCm?: { w: number; h: number };
  oneOfAKind: boolean;
  leadTimeDays: number;
}

/** How a piece feels and who it's for. Every word list is lowercase English. */
export interface Vibe {
  moods: string[];
  occasions: string[];
  recipients: string[];
}

export interface Piece {
  id: PieceId;
  title: Text;
  makerId: MakerId;
  kind: "featured" | "series";
  hours: number;
  materialsCents: number;
  priceCents: number;
  story: Text;
  heritage: Text;
  process: ProcessStep[];
  image: string;
  communityId: CommunityId;
  facets: Facets;
  vibe: Vibe;
  imageAlt: Text;
}

export interface CommunityVerification {
  method: "nation_attestation";
  by: Text;
  note: Text;
}

export interface Community {
  id: CommunityId;
  name: Text;
  kind: "native_american";
  /** The nation, as the glossary writes it. */
  people: Text;
  place: Text;
  craft: Text;
  /** Two plain third-person sentences, shown as a placeholder under L8. */
  about: Text;
  /** Cindia's demo exclusions, shown under L9. */
  protocols: Text[];
  verification: CommunityVerification;
  /** BCP 47 tags, display only. */
  languages: string[];
  leadId: OwnerId;
  makerIds: MakerId[];
  /** "std_dine" for com_dine only. */
  studioId?: StudioId;
  storefrontId: StorefrontId;
  projectIds: ProjectId[];
  demo: true;
}

/** Who writes each layer of an index entry in a real launch. */
export type ProvenanceSource = "maker" | "community" | "agent:tagger" | "agent:describer";

/** What Cindia keeps about each piece to find it. One per piece, keyed by pieceId. */
export interface IndexEntry {
  pieceId: PieceId;
  communityId: CommunityId;
  makerId: MakerId;
  storefrontSlug: string;
  /** One entry per field group: facts, culture, vibe, picture. */
  provenance: Record<string, ProvenanceSource>;
  approvedBy: MakerId;
  pictureNote: Text;
  /** The passage, built by the rule in data-model.md. */
  embedText: string;
  salesThisMonth: number;
  status: "active" | "draft";
}

export interface ProjectUpdate {
  date: IsoDate;
  text: Text;
}

export interface Project {
  id: ProjectId;
  communityId: CommunityId;
  title: Text;
  summary: Text;
  goalCents: number;
  raisedCents: number;
  /** The checkout contribution, 500. */
  addOnCents: number;
  updates: ProjectUpdate[];
}

export type MilestoneStatus = "pending" | "reached" | "paid";

export interface Milestone {
  milestoneId: MilestoneId;
  label: Text;
  /** One commission's shares add up to 10000. */
  shareBps: number;
  status: MilestoneStatus;
  date?: IsoDate;
}

export interface WorkInProgress {
  id: WipId;
  communityId: CommunityId;
  makerId: MakerId;
  buyerId: BuyerId;
  title: Text;
  priceCents: number;
  milestones: Milestone[];
}

export type StorefrontBlockKind = "hero" | "story" | "pieces" | "process" | "projects" | "visit";

export interface StorefrontBlock {
  blockId: BlockId;
  kind: StorefrontBlockKind;
  /** Single strings or string lists, never _en and _zh pairs. */
  props: Record<string, string | string[]>;
}

export interface Storefront {
  id: StorefrontId;
  communityId: CommunityId;
  slug: string;
  /** accent is a kit color token name, never a raw hex. */
  theme: { accent: string; layout: "story_first" | "grid_first" };
  blocks: StorefrontBlock[];
  status: "draft" | "published";
}

export interface ListingDraft {
  id: ListingId;
  makerId: MakerId;
  /** The maker's own words, in English. */
  notes: string;
  lang: Lang;
}

/** The only Claude models in the platform. */
export type AgentModel = "claude-haiku-5-5" | "claude-sonnet-5-5";

export interface AgentSpec {
  agentId: AgentId;
  name: Text;
  job: Text;
  kind: "claude" | "code";
  model?: AgentModel;
  tools: string[];
  never: Text;
}

export interface SearchQuery {
  id: SearchQueryId;
  text: string;
  lang: Lang;
  /** 2 is a perfect match, 1 a good one. */
  grades: Record<PieceId, 1 | 2>;
  author: "data_agent" | "gordon";
}

export type CopyVerdict = "possible_copy" | "claim_only" | "neither";

export interface CounterfeitCandidate {
  id: CounterfeitId;
  url: string;
  title: string;
  snippet: string;
  /** The co-op's piece it resembles. */
  pieceId: PieceId;
  /** Normalized, 0 to 1. */
  similarity: number;
  claim: Text;
  verdict: CopyVerdict;
  seller?: string;
  priceCents?: number;
}

export interface Channel {
  id: ChannelId;
  name: Text;
  kind: "marketplace" | "own_site" | "consignment";
}

export interface Contract {
  id: ContractId;
  channelId: "ch_gallery";
  commissionBps: number;
  statementDay: number;
  signedDate: IsoDate;
  terms: Text;
}

export interface Order {
  id: OrderId;
  channelId: ChannelId;
  pieceId: PieceId;
  buyerId: BuyerId;
  date: IsoDate;
  grossCents: number;
  cardFeeCents: number;
  platformFeeCents: number;
  commissionCents: number;
  materialsCents: number;
  makerShareCents: number;
  status: "paid" | "refunded";
}

export interface ChannelPayout {
  id: ChannelPayoutId;
  channelId: ChannelId;
  date: IsoDate;
  grossCents: number;
  feesCents: number;
  refundCents: number;
  netCents: number;
  orderIds: OrderId[];
  refundIds: RefundId[];
  monthId: MonthId;
}

export interface Refund {
  id: RefundId;
  orderId: OrderId;
  date: IsoDate;
  amountCents: number;
  nettedInPayoutId: ChannelPayoutId;
}

export interface StatementLine {
  orderId: OrderId;
  pieceId: PieceId;
  saleCents: number;
  commissionBps: number;
  commissionCents: number;
  netCents: number;
}

export interface Statement {
  id: StatementId;
  channelId: ChannelId;
  monthId: MonthId;
  issuedDate: IsoDate;
  lines: StatementLine[];
  totalSaleCents: number;
  totalCommissionCents: number;
  totalNetCents: number;
}

export interface Purchase {
  id: PurchaseId;
  date: IsoDate;
  supplier: Text;
  amountCents: number;
  memo: string;
  txnId: BankTxnId;
}

export interface BankTxn {
  id: BankTxnId;
  date: IsoDate;
  direction: "in" | "out";
  amountCents: number;
  counterparty: Text;
  memo: string;
  refId: string;
  nessieId?: string;
}

export type MatchKind = "one_to_one" | "bundled" | "refund_netted" | "carried_over";

export interface Match {
  id: MatchId;
  kind: MatchKind;
  recordIds: string[];
  monthId: MonthId;
}

export type FlagKind = "short_payment";

export interface Flag {
  id: FlagId;
  kind: FlagKind;
  recordIds: [ContractId, StatementId, BankTxnId];
  expectedCents: number;
  actualCents: number;
  deltaCents: number;
  trustRecordId: string;
  explanation: Text;
}

export type MakerPayoutStatus = "proposed" | "approved" | "sent" | "held";

export interface MakerPayout {
  id: MakerPayoutId;
  makerId: MakerId;
  monthId: MonthId;
  amountCents: number;
  orderIds: OrderId[];
  heldCents: number;
  status: MakerPayoutStatus;
}

export type ApprovalStatus = "pending" | "granted" | "declined";

export type ApprovalKind =
  | "follow_up"
  | "maker_payouts"
  | "listing_publish"
  | "storefront_publish"
  | "report_listing"
  | "milestone_release"
  | "support_action";

export const APPROVAL_KINDS: readonly ApprovalKind[] = [
  "follow_up",
  "maker_payouts",
  "listing_publish",
  "storefront_publish",
  "report_listing",
  "milestone_release",
  "support_action",
];

export interface Approval {
  id: ApprovalId;
  kind: ApprovalKind;
  subjectIds: string[];
  proposedBy: "cindy";
  amountCents?: number;
  overLimit: boolean;
  decisionDate: IsoDate;
  status: ApprovalStatus;
}

export interface FollowUp {
  id: FollowUpId;
  approvalId: ApprovalId;
  to: Text;
  subject: Text;
  body: Text;
}

export type LedgerAccount =
  | "cash"
  | "sales_cindia"
  | "sales_site"
  | "sales_gallery"
  | "card_fees"
  | "platform_fees"
  | "gallery_commission"
  | "materials"
  | "maker_pay"
  | "receivable_gallery"
  | "refunds";

export interface LedgerEntry {
  id: LedgerEntryId;
  date: IsoDate;
  account: LedgerAccount;
  debitCents: number;
  creditCents: number;
  refId: string;
  memo: string;
}

export interface MakerStatementLine {
  orderId: OrderId;
  pieceId: PieceId;
  makerShareCents: number;
}

export interface MakerStatement {
  id: MakerStatementId;
  makerId: MakerId;
  monthId: MonthId;
  lines: MakerStatementLine[];
  totalCents: number;
  heldCents: number;
  payoutDate: IsoDate;
}

export type PlantedErrorKind = "short_payment" | "bundled" | "refund_netted" | "carried_over";

export interface PlantedError {
  id: PlantedErrorId;
  kind: PlantedErrorKind;
  recordIds: string[];
  expected: Record<string, unknown>;
}

export interface Impact {
  id: ImpactId;
  makerShareBps: number;
  daysCloseToPayout: number;
  daysCloseToPayoutBefore: number;
  bookkeepingHoursSaved: number;
  estimate: true;
}

// The shared shapes the mock data and the scripted responders both use (I2-core, Interfaces).

/**
 * An approval that isn't in src/mock/ (IDs apr_user_<n>), carried inline on approval.requested.
 * decisionDate is there because the Approval record has one.
 */
export interface InlineApproval {
  kind: ApprovalKind;
  subjectIds: string[];
  amountCents?: number;
  overLimit: boolean;
  proposedBy: "cindy";
  summary: Text;
  decisionDate: IsoDate;
}

/** One event a scripted run plays, without id, source, key or at. */
export type PlannedEvent = { [T in EventType]: { type: T; payload: Payloads[T] } }[EventType];

/**
 * What starts a scripted run. A support run with pieceId or makerId answers only when the request's
 * contextIds include it. `fallback` marks the two fallback runs (run_05, run_06), which no request
 * matches by trigger.
 */
export type ScriptedRunTrigger =
  | { kind: "support"; matches: string[]; pieceId?: PieceId; makerId?: MakerId } // matches: normalized en and zh texts
  | { kind: "listing"; listingId: ListingId; notes: string } // matched on the normalized notes
  | { kind: "storefront"; storefrontId: StorefrontId }
  | { kind: "question"; questionId: MakerQuestionId } // the "ask the maker" relay
  | { kind: "fallback" };

export interface ScriptedRun {
  runId: RunId;
  side: "buyer" | "seller";
  /** thr_01 onward, the listingId, the storefrontId, or thr_00 for a fallback. */
  threadId: ThreadId;
  trigger: ScriptedRunTrigger;
  steps: Omit<Payloads["swarm.step"], "threadId">[];
  /** In order: the run's last events, approvals and follow-ups included. */
  final: PlannedEvent[];
}

export interface ModelReport {
  trained: Payloads["model.trained"];
  scored: Payloads["proof.search_scored"];
  points: { pieceId: PieceId; x: number; y: number }[];
}

/** The tour's vibe search. query has no queryId: the tour's timeline adds qry_01. */
export interface DemoSearch {
  query: Omit<Payloads["search.queried"], "queryId">;
  answer: Omit<Payloads["search.answered"], "queryId">;
}

export interface DemoSurprise {
  ask: Omit<Payloads["surprise.asked"], "surpriseId">;
  draw: Omit<Payloads["surprise.drawn"], "surpriseId">;
}

export interface ScriptedScan {
  scanId: ScanId;
  makerId: MakerId;
  queries: string[];
  cftIds: CounterfeitId[];
  followUpId?: FollowUpId;
  approvalId?: ApprovalId;
}

/** One topic the Clerk reads. pol_01 (shipping) holds { transitDaysMin: 6, transitDaysMax: 10 }. */
export interface PolicyTopic {
  id: PolicyTopicId;
  title: Text;
  body: Text;
  data?: Record<string, string | number>;
}

export type Policy = PolicyTopic[];
