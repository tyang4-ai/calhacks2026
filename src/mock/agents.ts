// The agent roster (contracts section 6), 21 agents. S3-catalog T1 stub: empty until T7 writes it.
import type { AgentId, AgentSpec } from "../core/types";

export const agents: AgentSpec[] = [];

/** One agent's spec, or undefined for an unknown ID. */
export function getAgent(agentId: AgentId): AgentSpec | undefined {
  return agents.find((a) => a.agentId === agentId);
}
