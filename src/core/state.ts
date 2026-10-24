// The store's state shape, with the keys events.md lists. State holds IDs, statuses and the
// figures and text that events carry in their payloads. It never copies entity data from src/mock/.
import { SOURCE_KEYS, type AgentActKind, type ChartSpec, type MoneyMoveKind, type Party, type Payloads, type RecordType, type SourceKey } from "./events";
import type { CameraId } from "./featureTypes";
import type { ApprovalStatus, FlagKind, Lang, MatchKind, Text } from "./types";

export type Mode = "scripted" | "live";
export type LangSetting = "auto" | "en" | "zh";

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
  checkout: Payloads["checkout.started"] | null;
  card: Payloads["card.tokenized"] | null;
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
}

export interface ScenarioState {
  loads: Record<string, Payloads["scenario.loaded"]>;
  scenarioIds: string[];
  latestScenarioId: string | null;
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
    demo: { beatId: null, camera: null },
    scenario: { loads: {}, scenarioIds: [], latestScenarioId: null },
    sources: initialSources(),
  };
}
