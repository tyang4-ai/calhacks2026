// The store's state shape, with the keys events.md lists. State holds IDs, statuses and the
// figures and text that events carry in their payloads. It never copies entity data from src/mock/.
import {
  SOURCE_KEYS,
  type AgentActKind,
  type ChartSpec,
  type DrawerKind,
  type EventType,
  type MoneyMoveKind,
  type Party,
  type Payloads,
  type ProcessId,
  type RecordType,
  type Source,
  type SourceKey,
} from "./events";
import type { CameraId } from "./featureTypes";
import type { ApprovalStatus, FlagKind, InlineApproval, Lang, MatchKind, StorefrontBlock, Text } from "./types";

export type Mode = "scripted" | "live";
export type LangSetting = "auto" | "en" | "zh";

/** A payload as the store keeps it: with `at`, the player time of its event. */
export type Stamped<P> = P & { at: number };

export interface BuyerState {
  /** The latest concierge request. */
  conciergeQuery: string | null;
  conciergeLang: Lang | null;
  /** The latest concierge answer. */
  concierge: Payloads["concierge.answered"] | null;
  openPieceId: string | null;
  /** split.shown figures by piece ID, plus the latest piece shown. */
  splits: Record<string, Payloads["split.shown"]>;
  latestSplitPieceId: string | null;
  /** The latest checkout and card, for v1's readers until M-buyer moves off them. */
  checkout: Payloads["checkout.started"] | null;
  card: Payloads["card.tokenized"] | null;
  /** checkout.started by pieceId. */
  checkouts: Record<string, Stamped<Payloads["checkout.started"]>>;
  /** card.tokenized by its pieceId, or by the latest checkout's piece when the event has none. */
  cards: Record<string, Stamped<Payloads["card.tokenized"]>>;
  orders: Record<string, Payloads["order.placed"]>;
  orderIds: string[];
  /** receipt.updated figures by order ID. */
  receipts: Record<string, Payloads["receipt.updated"]>;
}

export interface MoneyMove {
  moveId: string;
  kind: MoneyMoveKind;
  from: Party;
  to: Party;
  amountCents: number;
  refId: string;
  date: string;
  nessieId?: string;
  /** Player time when the move fired, for the stitch animation. */
  at: number;
}

export interface MoneyState {
  moves: Record<string, MoneyMove>;
  moveIds: string[];
  accounts: Record<string, { balanceCents: number; asOf: string; at: number }>;
  /** The latest synced account. */
  latestAccountId: string | null;
}

export interface RecordArrival {
  recordId: string;
  recordType: RecordType;
  date: string;
  at: number;
}

export interface MatchState {
  matchId: string;
  kind: MatchKind;
  recordIds: string[];
  intoMonthId?: string;
  at: number;
}

export interface FlagState {
  flagId: string;
  kind: FlagKind;
  recordIds: string[];
  expectedCents: number;
  actualCents: number;
  deltaCents: number;
  at: number;
  /** Set by flag.explained. */
  trustRecordId?: string;
  explanation?: Text;
}

export interface MonthState {
  monthId: string | null;
  records: Record<string, RecordArrival>;
  recordIds: string[];
  matches: Record<string, MatchState>;
  matchIds: string[];
  flags: Record<string, FlagState>;
  flagIds: string[];
  /** Explanations that arrived before their flag, kept until it lands. */
  pendingExplanations: Record<string, { trustRecordId: string; explanation: Text }>;
  ledgerEntryIds: string[];
  closed: Payloads["month.closed"] | null;
}

export interface AgentAct {
  actId: string;
  kind: AgentActKind;
  text: Text;
  refId?: string;
  at: number;
}

export interface AgentState {
  acts: Record<string, AgentAct>;
  actIds: string[];
  latestActId: string | null;
}

export interface ApprovalState {
  approvalId: string;
  status: ApprovalStatus;
  requested: boolean;
  by?: "own_01";
  date?: string;
  reason?: Text;
  /** Player time of the first decision. */
  decidedAt?: number;
  source?: "scripted" | "live" | "user";
  /** The inline approval from approval.requested, for an approval that isn't in src/mock/. */
  approval?: InlineApproval;
}

export interface FollowUpState {
  followUpId: string;
  approvalId: string;
  to?: Text;
  subject?: Text;
  body?: Text;
  sent: boolean;
}

export interface ApprovalsState {
  items: Record<string, ApprovalState>;
  approvalIds: string[];
  followUps: Record<string, FollowUpState>;
  payouts: Record<string, Payloads["payout.sent"]>;
  payoutIds: string[];
}

export interface CloseState {
  workbook: Payloads["workbook.ready"] | null;
  statements: Record<string, Payloads["statement.issued"]>;
  /** Maker ID to their latest statement's ID. */
  statementByMaker: Record<string, string>;
}

export interface ProofState {
  score: Payloads["proof.scored"] | null;
}

export interface AskQuestion {
  questionId: string;
  text: string;
  lang: Lang;
  at: number;
}

export interface AskAnswer {
  questionId: string;
  answer: Text;
  chart?: ChartSpec;
  refIds: string[];
  at: number;
}

export interface AskState {
  questions: Record<string, AskQuestion>;
  questionIds: string[];
  answers: Record<string, AskAnswer>;
  latestQuestionId: string | null;
  latestAnswerId: string | null;
}

export interface ImpactState {
  latest: Payloads["impact.updated"] | null;
}

export interface DemoState {
  beatId: string | null;
  camera: CameraId | null;
  /** From beat.started: the process view the beat opens, or null. */
  process: ProcessId | null;
  /** From beat.started: the drawer the beat opens, or null. */
  drawer: DrawerKind | null;
}

export interface ScenarioState {
  loads: Record<string, Payloads["scenario.loaded"]>;
  scenarioIds: string[];
  latestScenarioId: string | null;
}

export interface SearchState {
  queries: Record<string, Stamped<Payloads["search.queried"]>>;
  answers: Record<string, Stamped<Payloads["search.answered"]>>;
  maps: Record<string, Stamped<Payloads["search.mapped"]>>;
  latestQueryId: string | null;
}

export interface SurpriseState {
  asks: Record<string, Stamped<Payloads["surprise.asked"]>>;
  draws: Record<string, Stamped<Payloads["surprise.drawn"]>>;
  latestSurpriseId: string | null;
}

/** One message in a support thread, keyed by its event's own id, with that event's fields. */
export type SupportMessage =
  | ({ kind: "asked"; eventId: string; at: number } & Payloads["support.asked"])
  | ({ kind: "answered"; eventId: string; at: number } & Payloads["support.answered"])
  | ({ kind: "escalated"; eventId: string; at: number } & Payloads["support.escalated"]);

export interface SupportThread {
  side: "buyer" | "seller";
  lang: Lang;
  contextIds: string[];
  messages: SupportMessage[];
}

/** A payload with its event's id and player time. */
export type FromEvent<P> = P & { eventId: string; at: number };

/** The "ask the maker" loop for one question. Order it by each entry's place in `log`, never by `at`. */
export interface SupportQuestion {
  forwarded: FromEvent<Payloads["question.forwarded"]> | null;
  answered: FromEvent<Payloads["question.answered"]> | null;
}

export interface SupportState {
  threads: Record<string, SupportThread>;
  threadIds: string[];
  latestThreadId: string | null;
  /** By questionId. The maker page and the buyer's support thread both read it. */
  questions: Record<string, SupportQuestion>;
}

export interface SwarmRunState {
  threadId: string;
  stepIds: string[];
  /** True on the run's support.answered, support.escalated, listing.drafted or storefront.drafted. */
  done: boolean;
  firstAt: number;
  lastAt: number;
}

export interface SwarmState {
  runs: Record<string, SwarmRunState>;
  steps: Record<string, Stamped<Payloads["swarm.step"]>>;
  runIds: string[];
  latestRunId: string | null;
}

export interface ListingsState {
  requests: Record<string, Stamped<Payloads["listing.requested"]>>;
  drafts: Record<string, Stamped<Payloads["listing.drafted"]>>;
  /** The newest listing.indexed for each listing: cindia-drafts, then cindia-pieces once published. */
  indexed: Record<string, Stamped<Payloads["listing.indexed"]>>;
  latestListingId: string | null;
}

export interface StorefrontState {
  requests: Record<string, { at: number }>;
  /** The drafted blocks, by storefrontId. */
  drafts: Record<string, { blocks: StorefrontBlock[]; at: number }>;
  /** From the newest storefront.published, so the public page shows the blocks the owner published. */
  published: Record<string, { slug: string; blocks: StorefrontBlock[]; at: number }>;
}

export interface ProjectsState {
  contributions: Record<string, Stamped<Payloads["project.funded"]>>;
  /** Raised in this run, by projectId: always the sum of that project's contributions. */
  addedCents: Record<string, number>;
}

export interface MilestoneState {
  wipId: string;
  status: "reached" | "paid";
  date: string;
  amountCents?: number;
  at: number;
}

export interface WipState {
  milestones: Record<string, MilestoneState>;
}

export interface ModelState {
  trained: Payloads["model.trained"] | null;
  scored: Payloads["proof.search_scored"] | null;
}

export interface WatchScanState {
  makerId: string;
  queries: string[];
  engine?: Payloads["watch.scanned"]["engine"];
  candidates?: number;
  /** As watch.scanned carries them: every result checked, hits and non-hits. */
  results?: Payloads["watch.scanned"]["results"];
  startedAt: number;
  scannedAt?: number;
}

export interface WatchState {
  scans: Record<string, WatchScanState>;
  hits: Record<string, Stamped<Payloads["counterfeit.flagged"]>>;
  hitIds: string[];
  latestScanId: string | null;
}

export interface SyncState {
  /** The newest data.synced. */
  data: Stamped<Payloads["data.synced"]> | null;
  /** The newest index.synced. */
  index: Stamped<Payloads["index.synced"]> | null;
}

export interface LogEntry {
  id: string;
  type: EventType;
  at: number;
  source: Source;
  key?: SourceKey;
}

/** The newest events we keep in the log. */
export const LOG_LIMIT = 400;

export interface LogState {
  /** One entry per event id, newest last, at most LOG_LIMIT. A status event keeps only its newest entry. */
  entries: LogEntry[];
}

export interface CindiaState {
  clock: number;
  mode: Mode;
  lang: LangSetting;
  buyer: BuyerState;
  money: MoneyState;
  month: MonthState;
  agent: AgentState;
  approvals: ApprovalsState;
  close: CloseState;
  proof: ProofState;
  ask: AskState;
  impact: ImpactState;
  demo: DemoState;
  scenario: ScenarioState;
  search: SearchState;
  surprise: SurpriseState;
  support: SupportState;
  swarm: SwarmState;
  listings: ListingsState;
  storefront: StorefrontState;
  projects: ProjectsState;
  wip: WipState;
  model: ModelState;
  watch: WatchState;
  sync: SyncState;
  log: LogState;
  sources: Record<SourceKey, "scripted" | "live">;
}

export function initialSources(): Record<SourceKey, "scripted" | "live"> {
  const out = {} as Record<SourceKey, "scripted" | "live">;
  for (const k of SOURCE_KEYS) out[k] = "scripted";
  return out;
}

export function initialState(): CindiaState {
  return {
    clock: 0,
    mode: "scripted",
    lang: "auto",
    buyer: {
      conciergeQuery: null,
      conciergeLang: null,
      concierge: null,
      openPieceId: null,
      splits: {},
      latestSplitPieceId: null,
      checkout: null,
      card: null,
      checkouts: {},
      cards: {},
      orders: {},
      orderIds: [],
      receipts: {},
    },
    money: { moves: {}, moveIds: [], accounts: {}, latestAccountId: null },
    month: {
      monthId: null,
      records: {},
      recordIds: [],
      matches: {},
      matchIds: [],
      flags: {},
      flagIds: [],
      pendingExplanations: {},
      ledgerEntryIds: [],
      closed: null,
    },
    agent: { acts: {}, actIds: [], latestActId: null },
    approvals: { items: {}, approvalIds: [], followUps: {}, payouts: {}, payoutIds: [] },
    close: { workbook: null, statements: {}, statementByMaker: {} },
    proof: { score: null },
    ask: { questions: {}, questionIds: [], answers: {}, latestQuestionId: null, latestAnswerId: null },
    impact: { latest: null },
    demo: { beatId: null, camera: null, process: null, drawer: null },
    scenario: { loads: {}, scenarioIds: [], latestScenarioId: null },
    search: { queries: {}, answers: {}, maps: {}, latestQueryId: null },
    surprise: { asks: {}, draws: {}, latestSurpriseId: null },
    support: { threads: {}, threadIds: [], latestThreadId: null, questions: {} },
    swarm: { runs: {}, steps: {}, runIds: [], latestRunId: null },
    listings: { requests: {}, drafts: {}, indexed: {}, latestListingId: null },
    storefront: { requests: {}, drafts: {}, published: {} },
    projects: { contributions: {}, addedCents: {} },
    wip: { milestones: {} },
    model: { trained: null, scored: null },
    watch: { scans: {}, hits: {}, hitIds: [], latestScanId: null },
    sync: { data: null, index: null },
    log: { entries: [] },
    sources: initialSources(),
  };
}
