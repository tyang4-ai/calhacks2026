// Every mock collection and timeline, and getById(), which finds any entity by its ID across every
// collection. An unknown ID returns undefined and never throws.
import type {
  Approval,
  BankTxn,
  Channel,
  ChannelPayout,
  Community,
  Contract,
  CounterfeitCandidate,
  Flag,
  FollowUp,
  Impact,
  LedgerEntry,
  ListingDraft,
  MakerPayout,
  MakerStatement,
  Match,
  Milestone,
  MilestoneId,
  Order,
  Person,
  Piece,
  PlantedError,
  PolicyTopic,
  Project,
  Purchase,
  Refund,
  Statement,
  Storefront,
  Studio,
  WorkInProgress,
} from "../core/types";
import { answerKey } from "./answerKey";
import { pieces } from "./catalog";
import { channels, contracts } from "./channels";
import { communities } from "./communities";
import { impact } from "./impact";
import { apr_04, listings } from "./listings";
import {
  approvals,
  bankTxns,
  flags,
  followUps,
  ledger,
  makerPayouts,
  makerStatements,
  matches,
  orders,
  payouts,
  purchases,
  refunds,
  statements,
} from "./month";
import { people, studio } from "./people";
import { policy } from "./policy";
import { apr_05, projects, worksInProgress } from "./projects";
import { scenarioRecords } from "./scenario";
import { storefronts } from "./storefronts";
import { type MakerQuestion, makerQuestions } from "./swarm";
import { apr_03, counterfeitCandidates, fup_02 } from "./watch";

export * from "./people";
export * from "./catalog";
export * from "./channels";
export * from "./month";
export * from "./answerKey";
export * from "./ask";
export * from "./impact";
export * from "./scenario";
export * from "./communities";
export * from "./searchIndex";
export * from "./search";
export * from "./searchEval";
export * from "./projects";
export * from "./storefronts";
export * from "./listings";
export * from "./agents";
export * from "./swarm";
export * from "./watch";
export * from "./model";
export * from "./policy";
export * from "./splits";
export * from "./contentRules";
export * from "./database";
export { monthTimeline, MONTH_ACT_COUNT, CATCH_TIMES } from "./timelines/month";
export { demoTimeline, BEATS, DEMO_QUERY, MONTH_SHIFT_MS } from "./timelines/demo";
export { bps, cardFee, usd } from "./util";

/** A milestone, found by its milestoneId, which getById() also exposes as id. */
export type MilestoneRecord = Milestone & { id: MilestoneId };

export type Entity =
  | Studio
  | Community
  | Person
  | Piece
  | Channel
  | Contract
  | Order
  | ChannelPayout
  | Refund
  | Statement
  | Purchase
  | BankTxn
  | Match
  | Flag
  | MakerPayout
  | Approval
  | FollowUp
  | LedgerEntry
  | MakerStatement
  | PlantedError
  | Impact
  | Project
  | WorkInProgress
  | MilestoneRecord
  | Storefront
  | ListingDraft
  | PolicyTopic
  | MakerQuestion;

// A market listing's title is a plain string, not a Text. Code that narrows Entity with
// `"title" in e` and then reads e.title as a Text must not see it, so it stays out of the default
// Entity and is found by naming it: getById<CounterfeitCandidate>("cft_01").
type Lookup = Entity | CounterfeitCandidate;

/** Every approval, apr_01 to apr_05 in ID order: v1's two, then the watch's, the listing's and the commission's. */
export const allApprovals: Approval[] = [...approvals, apr_03, apr_04, apr_05];

/** Every follow-up: v1's fup_01, then the watch's fup_02. */
export const allFollowUps: FollowUp[] = [...followUps, fup_02];

const all: { id: string }[] = [
  studio,
  ...communities,
  ...people,
  ...pieces,
  ...channels,
  ...contracts,
  ...orders,
  ...payouts,
  ...refunds,
  ...statements,
  ...purchases,
  ...bankTxns,
  ...matches,
  ...flags,
  ...makerPayouts,
  ...allApprovals,
  ...allFollowUps,
  ...ledger,
  ...makerStatements,
  ...answerKey,
  impact,
  ...scenarioRecords,
  ...projects,
  ...worksInProgress,
  ...worksInProgress.flatMap((w) => w.milestones.map((m) => ({ ...m, id: m.milestoneId }))),
  ...storefronts,
  ...listings,
  ...counterfeitCandidates,
  ...policy,
  ...makerQuestions.map((q) => q.question),
];

const byId = new Map<string, Lookup>();
for (const e of all) {
  if (byId.has(e.id)) throw new Error(`duplicate mock ID ${e.id}`);
  byId.set(e.id, e as Lookup);
}

/** Finds any entity by its ID. Pass the type you expect, as in getById<Order>("ord_001"). */
export function getById<T extends Lookup = Entity>(id: string): T | undefined {
  return byId.get(id) as T | undefined;
}

/** Every ID getById() knows, for tests. */
export function allIds(): string[] {
  return [...byId.keys()];
}
