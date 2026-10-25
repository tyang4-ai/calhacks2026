// The Designer's run in the store (T5), as plain functions so tests can run them. A storefront run
// uses the storefrontId as its threadId (events.md), so the run is picked by thread, never by runId.
import type { CindiaState } from "../../core/state";
import type { StorefrontBlock } from "../../core/types";

export type Step = CindiaState["swarm"]["steps"][string];

/** The newest run on a thread (by its first step's time), and its steps in arrival order. */
export function threadSteps(s: Pick<CindiaState, "swarm">, threadId: string): { runId: string | null; done: boolean; steps: Step[] } {
  let runId: string | null = null;
  let firstAt = -Infinity;
  for (const id of s.swarm.runIds) {
    const run = s.swarm.runs[id];
    if (!run || run.threadId !== threadId) continue;
    if (run.firstAt >= firstAt) {
      runId = id;
      firstAt = run.firstAt;
    }
  }
  const run = runId ? s.swarm.runs[runId] : undefined;
  const steps = run ? run.stepIds.map((id) => s.swarm.steps[id]).filter((x): x is Step => x !== undefined) : [];
  return { runId, done: run?.done ?? false, steps };
}

/** A drafted blocks list's identity: its block IDs, which a re-keyed draft never repeats. */
export function draftKey(blocks: readonly StorefrontBlock[] | undefined): string | null {
  return blocks ? blocks.map((b) => b.blockId).join(",") : null;
}
