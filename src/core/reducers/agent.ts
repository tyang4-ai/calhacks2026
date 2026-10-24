import type { AgentState } from "../state";
import { addId, areaReducer, put } from "./util";

export const agentReducer = areaReducer<AgentState>({
  "agent.acted": (s, e) => {
    const prev = s.acts[e.payload.actId];
    const acts = put(s.acts, e.payload.actId, { ...e.payload, text: { ...e.payload.text }, at: prev ? prev.at : e.at });
    const actIds = addId(s.actIds, e.payload.actId);
    if (acts === s.acts && actIds === s.actIds) return s;
    // The latest line is the one that fired last on the player clock.
    const latest = s.latestActId ? acts[s.latestActId] : undefined;
    const mine = acts[e.payload.actId];
    const latestActId = !latest || mine.at >= latest.at ? e.payload.actId : s.latestActId;
    return { ...s, acts, actIds, latestActId };
  },
});
