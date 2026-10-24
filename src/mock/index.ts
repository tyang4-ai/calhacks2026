// Every mock collection and timeline, and getById(), which finds any entity by its ID across every
// collection. An unknown ID returns undefined and never throws.
import type {
  Approval,
  BankTxn,
  Channel,
  ChannelPayout,
  Contract,
  Flag,
  FollowUp,
  Impact,
  LedgerEntry,
  MakerPayout,
  MakerStatement,
  Match,
  Order,
  Person,
  Piece,
  PlantedError,
  Purchase,
  Refund,
  Statement,
  Studio,
} from "../core/types";
import { answerKey } from "./answerKey";
import { pieces } from "./catalog";
import { channels, contracts } from "./channels";
import { impact } from "./impact";
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
import { scenarioRecords } from "./scenario";

export * from "./people";
export * from "./catalog";
export * from "./channels";
export * from "./month";
export * from "./answerKey";
export * from "./ask";
export * from "./impact";
export * from "./scenario";
export { monthTimeline, MONTH_ACT_COUNT, CATCH_TIMES } from "./timelines/month";
export { demoTimeline, BEATS, DEMO_QUERY, MONTH_SHIFT_MS } from "./timelines/demo";
export { bps, cardFee, usd } from "./util";

export type Entity =
  | Studio
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
  | Impact;

const all: { id: string }[] = [
  studio,
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
  ...approvals,
  ...followUps,
  ...ledger,
  ...makerStatements,
  ...answerKey,
  impact,
  ...scenarioRecords,
];

const byId = new Map<string, Entity>();
for (const e of all) {
  if (byId.has(e.id)) throw new Error(`duplicate mock ID ${e.id}`);
  byId.set(e.id, e as Entity);
}

/** Finds any entity by its ID. Pass the type you expect, as in getById<Order>("ord_001"). */
export function getById<T extends Entity = Entity>(id: string): T | undefined {
  return byId.get(id) as T | undefined;
}

/** Every ID getById() knows, for tests. */
export function allIds(): string[] {
  return [...byId.keys()];
}
