// The root reducer: one reducer per event type, grouped by area. Every reducer is idempotent
// per entity ID, so replaying or duplicating an event never double-counts.
import type { CindiaEvent } from "../events";
import type { CindiaState } from "../state";
import { agentReducer } from "./agent";
import { approvalsReducer } from "./approvals";
import { askReducer } from "./ask";
import { buyerReducer } from "./buyer";
import { closeReducer } from "./close";
import { listingsReducer } from "./listings";
import { logReducer } from "./log";
import { modelReducer } from "./model";
import { moneyReducer } from "./money";
import { monthReducer } from "./month";
import { projectsReducer } from "./projects";
import { searchReducer } from "./search";
import { demoReducer, impactReducer, proofReducer, scenarioReducer, surpriseReducer, syncReducer, wipReducer } from "./small";
import { storefrontReducer } from "./storefront";
import { supportReducer, swarmReducer } from "./support";
import { watchReducer } from "./watch";

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
    search: searchReducer(state.search, e),
    surprise: surpriseReducer(state.surprise, e),
    support: supportReducer(state.support, e),
    swarm: swarmReducer(state.swarm, e),
    listings: listingsReducer(state.listings, e),
    storefront: storefrontReducer(state.storefront, e),
    projects: projectsReducer(state.projects, e),
    wip: wipReducer(state.wip, e),
    model: modelReducer(state.model, e),
    watch: watchReducer(state.watch, e),
    sync: syncReducer(state.sync, e),
    log: logReducer(state.log, e),
  };
  // Every scripted or live event that carries a key records which source delivered it.
  if (e.key && e.source !== "user" && state.sources[e.key] !== e.source) {
    next.sources = { ...state.sources, [e.key]: e.source };
  }
  const changed = (Object.keys(next) as (keyof CindiaState)[]).some((k) => next[k] !== state[k]);
  return changed ? next : state;
}
