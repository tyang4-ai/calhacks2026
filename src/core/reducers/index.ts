// The root reducer: one reducer per event type, grouped by area. Every reducer is idempotent
// per entity ID, so replaying or duplicating an event never double-counts.
import type { CindiaEvent } from "../events";
import type { CindiaState } from "../state";
import { agentReducer } from "./agent";
import { approvalsReducer } from "./approvals";
import { askReducer } from "./ask";
import { buyerReducer } from "./buyer";
import { closeReducer } from "./close";
import { moneyReducer } from "./money";
import { monthReducer } from "./month";
import { demoReducer, impactReducer, proofReducer, scenarioReducer } from "./small";

export function rootReducer(state: CindiaState, e: CindiaEvent): CindiaState {
  const next: CindiaState = {
    ...state,
    buyer: buyerReducer(state.buyer, e),
    money: moneyReducer(state.money, e),
    month: monthReducer(state.month, e),
    agent: agentReducer(state.agent, e),
    approvals: approvalsReducer(state.approvals, e),
    close: closeReducer(state.close, e),
    proof: proofReducer(state.proof, e),
    ask: askReducer(state.ask, e),
    impact: impactReducer(state.impact, e),
    demo: demoReducer(state.demo, e),
    scenario: scenarioReducer(state.scenario, e),
  };
  // Every scripted or live event that carries a key records which source delivered it.
  if (e.key && e.source !== "user" && state.sources[e.key] !== e.source) {
    next.sources = { ...state.sources, [e.key]: e.source };
  }
  const changed = (Object.keys(next) as (keyof CindiaState)[]).some((k) => next[k] !== state[k]);
  return changed ? next : state;
}
