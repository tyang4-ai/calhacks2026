// F-support T1: the one place that picks the current thread, its messages and its runs from the
// store. Pure selectors over the store's support, swarm, approvals and log keys, so the drawer, the
// step strip and the piece page's side panel agree on what's current.
//
// Arrival order is each entry's place in the store's log, found through its event ID, and `at` for
// an entry that has left the log (those are older than everything still in it). A paused player
// gives every answer the same `at`, so `at` alone can't order them (events.md, Store shapes).
import type { CindiaState, FromEvent, SupportMessage, SupportState, SwarmRunState, SwarmState } from "../../core/state";
import type { Payloads } from "../../core/events";

export type Side = "buyer" | "seller";

/** A person's own threads start with this, numbered from 1 (data-model.md, The ID scheme). */
export const USER_THREAD_PREFIX = "thr_user_";

/** One entry in a thread, in arrival order. */
export type ThreadItem =
  | { kind: "asked"; key: string; message: Extract<SupportMessage, { kind: "asked" }> }
  | { kind: "answered"; key: string; message: Extract<SupportMessage, { kind: "answered" }> }
  | { kind: "escalated"; key: string; message: Extract<SupportMessage, { kind: "escalated" }> }
  | { kind: "forwarded"; key: string; questionId: string; entry: FromEvent<Payloads["question.forwarded"]> }
  | { kind: "maker"; key: string; questionId: string; entry: FromEvent<Payloads["question.answered"]> };

/** The slice of the state the selectors read. */
export type ThreadSource = Pick<CindiaState, "support" | "log">;

/**
 * The current thread for a side: the newest thread of that side in the store (the last one in
 * `threadIds`, which lists threads in the order they first arrived). Threads in `hidden` are
 * skipped, which is how "New conversation" leaves the old one behind until the next is asked.
 */
export function currentThreadId(support: SupportState, side: Side, hidden: ReadonlySet<string> = new Set()): string | null {
  for (let i = support.threadIds.length - 1; i >= 0; i -= 1) {
    const id = support.threadIds[i];
    if (hidden.has(id)) continue;
    if (support.threads[id]?.side === side) return id;
  }
  return null;
}

/** The thread a person's next question goes on: the current thread when it's a person's own, else the next thr_user_. */
export function threadForAsk(support: SupportState, current: string | null): string {
  if (current && current.startsWith(USER_THREAD_PREFIX)) return current;
  return nextUserThreadId(support);
}

/** The next thr_user_<n>, counting the person's threads already in the store. */
export function nextUserThreadId(support: SupportState): string {
  let max = 0;
  for (const id of support.threadIds) {
    if (!id.startsWith(USER_THREAD_PREFIX)) continue;
    const n = Number(id.slice(USER_THREAD_PREFIX.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${USER_THREAD_PREFIX}${max + 1}`;
}

/** Each event ID's place in the log. */
export function logRanks(log: CindiaState["log"]): Map<string, number> {
  const ranks = new Map<string, number>();
  log.entries.forEach((e, i) => ranks.set(e.id, i));
  return ranks;
}

/**
 * A thread's entries in arrival order: each support.asked (the person's), each support.answered and
 * support.escalated (Cindia's), and for each question forwarded on this thread, its forward as a
 * note and the maker's answer, linked by questionId.
 */
export function threadItems(state: ThreadSource, threadId: string | null): ThreadItem[] {
  if (!threadId) return [];
  const thread = state.support.threads[threadId];
  const items: { item: ThreadItem; eventId: string; at: number; order: number }[] = [];
  let order = 0;
  for (const m of thread?.messages ?? []) {
    const item = { kind: m.kind, key: m.eventId, message: m } as ThreadItem;
    items.push({ item, eventId: m.eventId, at: m.at, order: order++ });
  }
  for (const [questionId, q] of Object.entries(state.support.questions)) {
    if (!q.forwarded || q.forwarded.threadId !== threadId) continue;
    items.push({ item: { kind: "forwarded", key: `fwd_${questionId}`, questionId, entry: q.forwarded }, eventId: q.forwarded.eventId, at: q.forwarded.at, order: order++ });
    if (q.answered) {
      items.push({ item: { kind: "maker", key: `ans_${questionId}`, questionId, entry: q.answered }, eventId: q.answered.eventId, at: q.answered.at, order: order++ });
    }
  }
  const ranks = logRanks(state.log);
  const rankOf = (id: string) => ranks.get(id) ?? -1;
  items.sort((a, b) => {
    const ra = rankOf(a.eventId);
    const rb = rankOf(b.eventId);
    // An entry that has left the log is older than everything still in it; among those, `at` orders.
    if (ra === -1 && rb === -1) return a.at - b.at || a.order - b.order;
    if (ra === -1) return -1;
    if (rb === -1) return 1;
    return ra - rb;
  });
  return items.map((x) => x.item);
}

/** The newest agent reply in a thread's items, or null. */
export function latestReply(items: ThreadItem[]): Extract<ThreadItem, { kind: "answered" }> | null {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const it = items[i];
    if (it.kind === "answered") return it;
  }
  return null;
}

export interface RunView {
  runId: string;
  run: SwarmRunState;
}

/** The newest run on a thread: the last one in `runIds` (arrival order) with that threadId. */
export function latestRun(swarm: SwarmState, threadId: string | null): RunView | null {
  if (!threadId) return null;
  for (let i = swarm.runIds.length - 1; i >= 0; i -= 1) {
    const runId = swarm.runIds[i];
    const run = swarm.runs[runId];
    if (run?.threadId === threadId) return { runId, run };
  }
  return null;
}

/** Whether a run is still working: it has steps but no support.answered or support.escalated yet. */
export function isRunWorking(run: SwarmRunState | null | undefined): boolean {
  return Boolean(run && run.stepIds.length > 0 && !run.done);
}

/** Whether the thread's newest run is still working. */
export function isThreadWorking(swarm: SwarmState, threadId: string | null): boolean {
  return isRunWorking(latestRun(swarm, threadId)?.run);
}

/**
 * Whether the thread waits on an answer: its newest run is working, or its last entry is a question
 * no reply has followed yet (the 1.2 s before a scripted run's first step).
 */
export function isThreadBusy(state: ThreadSource & Pick<CindiaState, "swarm">, threadId: string | null): boolean {
  if (!threadId) return false;
  if (isThreadWorking(state.swarm, threadId)) return true;
  const items = threadItems(state, threadId);
  return items.length > 0 && items[items.length - 1].kind === "asked";
}

/** A run's steps in order, as the store keeps them. */
export function runSteps(swarm: SwarmState, runId: string | null | undefined) {
  if (!runId) return [];
  const run = swarm.runs[runId];
  if (!run) return [];
  return run.stepIds.map((id) => swarm.steps[id]).filter((s): s is NonNullable<typeof s> => Boolean(s));
}

/** The reply or escalation that ended a run on a thread, or null while it works. */
export function runEnding(items: ThreadItem[], runId: string): Extract<ThreadItem, { kind: "answered" | "escalated" }> | null {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const it = items[i];
    if ((it.kind === "answered" || it.kind === "escalated") && it.message.runId === runId) return it;
  }
  return null;
}

/** The newest reply on any thread of a side that names a piece, for the side panel's preview. */
export function latestReplyAbout(state: ThreadSource, side: Side, pieceId: string): Extract<ThreadItem, { kind: "answered" }> | null {
  const ranks = logRanks(state.log);
  let best: { item: Extract<ThreadItem, { kind: "answered" }>; rank: number; at: number } | null = null;
  for (const threadId of state.support.threadIds) {
    const thread = state.support.threads[threadId];
    if (!thread || thread.side !== side) continue;
    const about = thread.contextIds.includes(pieceId);
    for (const m of thread.messages) {
      if (m.kind !== "answered") continue;
      if (!about && !m.refIds.includes(pieceId)) continue;
      const rank = ranks.get(m.eventId) ?? -1;
      if (!best || rank > best.rank || (rank === best.rank && m.at >= best.at)) {
        best = { item: { kind: "answered", key: m.eventId, message: m }, rank, at: m.at };
      }
    }
  }
  return best?.item ?? null;
}
