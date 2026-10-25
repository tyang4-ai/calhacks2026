// Support threads, the "ask the maker" questions, and the swarm's runs and steps.
import type { CindiaEvent } from "../events";
import type { FromEvent, SupportMessage, SupportState, SupportThread, SwarmRunState, SwarmState } from "../state";
import { addId, areaReducer, copy, deepEqual, latestAt, put, same, stamped } from "./util";

function blankThread(): SupportThread {
  return { side: "buyer", lang: "en", contextIds: [], messages: [] };
}

function newestAt(thread: SupportThread | undefined): number | undefined {
  if (!thread || thread.messages.length === 0) return undefined;
  return Math.max(...thread.messages.map((m) => m.at));
}

/**
 * Adds one message to its thread, keyed by its event's own id, so a seek that replays the timeline
 * never doubles a message. `patch` sets the thread's side, lang and context from a question.
 */
function addMessage(s: SupportState, threadId: string, msg: SupportMessage, patch: Partial<SupportThread> = {}): SupportState {
  const prev = s.threads[threadId];
  if (prev?.messages.some((m) => m.eventId === msg.eventId)) return s;
  const base = prev ?? blankThread();
  const thread: SupportThread = { ...base, ...patch, messages: [...base.messages, msg] };
  const threads = { ...s.threads, [threadId]: thread };
  const threadIds = addId(s.threadIds, threadId);
  const latestThreadId = latestAt(s.latestThreadId, newestAt(s.latestThreadId ? s.threads[s.latestThreadId] : undefined), threadId, msg.at);
  return { ...s, threads, threadIds, latestThreadId };
}

/** A payload with its event's id and time. The same payload again keeps the first event's id and time. */
function fromEvent<P extends object>(prev: FromEvent<P> | null, payload: P, e: CindiaEvent): FromEvent<P> {
  if (prev && deepEqual({ ...prev, eventId: undefined, at: undefined }, payload)) return prev;
  return { ...copy(payload), eventId: e.id, at: e.at };
}

export const supportReducer = areaReducer<SupportState>({
  "support.asked": (s, e) => {
    const p = copy(e.payload);
    return addMessage(s, p.threadId, { kind: "asked", eventId: e.id, at: e.at, ...p }, { side: p.side, lang: p.lang, contextIds: [...p.contextIds] });
  },
  "support.answered": (s, e) => addMessage(s, e.payload.threadId, { kind: "answered", eventId: e.id, at: e.at, ...copy(e.payload) }),
  "support.escalated": (s, e) => addMessage(s, e.payload.threadId, { kind: "escalated", eventId: e.id, at: e.at, ...copy(e.payload) }),
  "question.forwarded": (s, e) => {
    const id = e.payload.questionId;
    const q = s.questions[id] ?? { forwarded: null, answered: null };
    const questions = put(s.questions, id, { ...q, forwarded: fromEvent(q.forwarded, e.payload, e) });
    return questions === s.questions ? s : { ...s, questions };
  },
  "question.answered": (s, e) => {
    const id = e.payload.questionId;
    const q = s.questions[id] ?? { forwarded: null, answered: null };
    const questions = put(s.questions, id, { ...q, answered: fromEvent(q.answered, e.payload, e) });
    return questions === s.questions ? s : { ...s, questions };
  },
});

/** Marks a run done, making its entry when no step came first. */
function finishRun(s: SwarmState, runId: string, threadId: string, at: number): SwarmState {
  const prev = s.runs[runId];
  const run: SwarmRunState = prev
    ? { ...prev, done: true, lastAt: Math.max(prev.lastAt, at) }
    : { threadId, stepIds: [], done: true, firstAt: at, lastAt: at };
  const runs = put(s.runs, runId, run);
  if (runs === s.runs) return s;
  const runIds = addId(s.runIds, runId);
  const latest = s.latestRunId ? s.runs[s.latestRunId] : undefined;
  const latestRunId = latestAt(s.latestRunId, latest?.firstAt, runId, run.firstAt, !prev);
  return { ...s, runs, runIds, latestRunId };
}

/** Listing and storefront runs use the listingId or storefrontId as threadId: marks that thread's open runs done. */
function finishThread(s: SwarmState, threadId: string, at: number): SwarmState {
  let runs = s.runs;
  for (const [runId, run] of Object.entries(s.runs)) {
    if (run.threadId !== threadId || run.done) continue;
    runs = put(runs, runId, { ...run, done: true, lastAt: Math.max(run.lastAt, at) });
  }
  return runs === s.runs ? s : { ...s, runs };
}

export const swarmReducer = areaReducer<SwarmState>({
  "swarm.step": (s, e) => {
    const p = e.payload;
    const steps = put(s.steps, p.stepId, stamped(s.steps[p.stepId], copy(p), e.at));
    const at = steps[p.stepId].at;
    const prev = s.runs[p.runId];
    const run: SwarmRunState = prev
      ? { ...prev, stepIds: addId(prev.stepIds, p.stepId), firstAt: Math.min(prev.firstAt, at), lastAt: Math.max(prev.lastAt, at) }
      : { threadId: p.threadId, stepIds: [p.stepId], done: false, firstAt: at, lastAt: at };
    const runs = put(s.runs, p.runId, run);
    const runIds = addId(s.runIds, p.runId);
    const latest = s.latestRunId ? s.runs[s.latestRunId] : undefined;
    const latestRunId = latestAt(s.latestRunId, latest?.firstAt, p.runId, run.firstAt, !prev);
    return same(s, { ...s, steps, runs, runIds, latestRunId });
  },
  "support.answered": (s, e) => finishRun(s, e.payload.runId, e.payload.threadId, e.at),
  "support.escalated": (s, e) => finishRun(s, e.payload.runId, e.payload.threadId, e.at),
  "listing.drafted": (s, e) => finishThread(s, e.payload.listingId, e.at),
  "storefront.drafted": (s, e) => finishThread(s, e.payload.storefrontId, e.at),
});
