// Answers requests from people (events.md, "Requests from people"). A request is an event with
// source "user". In scripted mode the scripted answer arrives 1.2 seconds later in real time. In
// live mode the adapter for the request's key is tried first, with the scripted answer as fallback.
//
// Mechanism: answers are wall-clock timers outside the player's timeline. They are emitted straight
// into the store with `at` set to the player clock at delivery, so they arrive while the player is
// paused or past the end. They are never added to the timeline, so seek() and reset() replay only
// the timeline and stay deterministic. A pending answer drops itself if the player's epoch changed
// (a reset, seek or load happened) before it was delivered.
import { REQUEST_KEYS, type CindiaEvent, type Payloads, type SourceKey } from "../core/events";
import type { CindiaState } from "../core/state";
import type { Text } from "../core/types";
import type { ChartSpec } from "../core/events";
import { asLive, withTimeout } from "./registry";
import { REPLY_DELAY_MS, timeoutFor, type LiveAdapter } from "./types";

/** The mock exports the responder reads (S2 writes them in src/mock/). */
export interface MockAnswers {
  curatedSet?: { pieceIds: string[]; reasons: Record<string, Text> };
  cannedAnswers?: {
    questionId: string;
    questions: Text;
    answer: Text;
    refIds: string[];
    chart?: ChartSpec;
  }[];
  fallbackAnswer?: Text;
  scenarioReplies?: CindiaEvent[];
}

export interface ResponderDeps {
  emit: (e: CindiaEvent) => void;
  getState: () => CindiaState;
  onEvent: (l: (e: CindiaEvent) => void) => () => void;
  adapterFor: (key: SourceKey) => LiveAdapter | undefined;
  mock: () => MockAnswers;
  /** The player clock, for the answer's `at`. */
  now: () => number;
  /** The player's epoch. A pending answer is dropped when it changes. */
  epoch: () => number;
  delayMs: number;
  /** How long the live adapter's produce() gets, per key (timeoutFor in types.ts). */
  timeoutFor: (key: SourceKey) => number;
  log: (msg: string) => void;
}

/** Trims, lowercases, removes punctuation and collapses spaces, so typed questions match canned ones. */
export function normalizeQuestion(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\p{P}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const OWN_FILE_NOTE: Text = {
  en: "Scripted mode reads the sample statement. Live mode reads your file.",
  zh: "演示模式读取样例对账单，实时模式读取您的文件。",
};

/** The one wall-clock read in the app: the 1.2-second wait for a person's answer. */
function wallClock(): number {
  return Date.now();
}

let replyCounter = 0;
function replyId(): string {
  replyCounter += 1;
  return `evt_reply_${String(replyCounter).padStart(4, "0")}`;
}

interface Planned {
  /** Delay after the request, in ms of real time. */
  offset: number;
  event: CindiaEvent;
}

/** The scripted answer to a request, as events with their offsets after the 1.2-second wait. */
export function scriptedAnswer(req: CindiaEvent, mock: MockAnswers, key: SourceKey): Planned[] {
  const base = { source: "scripted" as const, key, at: 0 };
  switch (req.type) {
    case "concierge.asked": {
      const p = req.payload as Payloads["concierge.asked"];
      if (!mock.curatedSet) return [];
      const payload: Payloads["concierge.answered"] = {
        query: p.query,
        pieceIds: [...mock.curatedSet.pieceIds],
        reasons: { ...mock.curatedSet.reasons },
      };
      return [{ offset: 0, event: { ...base, id: replyId(), type: "concierge.answered", payload } }];
    }
    case "ask.asked": {
      const p = req.payload as Payloads["ask.asked"];
      const q = normalizeQuestion(p.text);
      const hit = (mock.cannedAnswers ?? []).find(
        (a) => normalizeQuestion(a.questions.en) === q || normalizeQuestion(a.questions.zh) === q,
      );
      const payload: Payloads["ask.answered"] = hit
        ? { questionId: p.questionId, answer: { ...hit.answer }, refIds: [...hit.refIds], ...(hit.chart ? { chart: hit.chart } : {}) }
        : { questionId: p.questionId, answer: mock.fallbackAnswer ?? { en: "", zh: "" }, refIds: [] };
      if (!hit && !mock.fallbackAnswer) return [];
      return [{ offset: 0, event: { ...base, id: replyId(), type: "ask.answered", payload } }];
    }
    case "scenario.loaded": {
      const p = req.payload as Payloads["scenario.loaded"];
      const replies: Planned[] = (mock.scenarioReplies ?? []).map((e) => ({
        offset: Math.max(0, e.at),
        event: { ...e, id: replyId(), source: "scripted" as const },
      }));
      const ownFile = p.content !== undefined || p.recordIds === undefined;
      if (ownFile) {
        const last = replies.reduce((m, r) => Math.max(m, r.offset), 0);
        replies.push({
          offset: last,
          event: {
            ...base,
            key: undefined,
            id: replyId(),
            type: "agent.acted",
            payload: { actId: `act_reply_${replyCounter}`, kind: "answer", text: { ...OWN_FILE_NOTE } },
          },
        });
      }
      return replies;
    }
    default:
      // approval.granted and approval.declined: the store has already applied it.
      return [];
  }
}

export interface Responder {
  /** Handles one event. Returns a promise that settles when every answer has been delivered or dropped. */
  handle(e: CindiaEvent): Promise<void>;
  dispose(): void;
}

export function createResponder(deps: ResponderDeps): Responder {
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        timers.delete(t);
        resolve();
      }, ms);
      timers.add(t);
    });

  function deliver(e: CindiaEvent, epoch: number): void {
    if (deps.epoch() !== epoch) return; // a reset or seek happened, drop it
    deps.emit({ ...e, at: Math.round(deps.now()) });
  }

  async function playScripted(req: CindiaEvent, key: SourceKey, epoch: number, startedAt: number, wallNow: () => number) {
    const planned = scriptedAnswer(req, deps.mock(), key).toSorted((a, b) => a.offset - b.offset);
    for (const p of planned) {
      const due = startedAt + deps.delayMs + p.offset;
      const left = due - wallNow();
      if (left > 0) await wait(left);
      deliver(p.event, epoch);
    }
  }

  async function handle(req: CindiaEvent): Promise<void> {
    if (req.source !== "user") return; // scripted requests are answered in the timeline
    const key = REQUEST_KEYS[req.type];
    if (!key) return;
    const epoch = deps.epoch();
    const t0 = wallClock();
    const adapter = deps.adapterFor(key);

    if (adapter) {
      try {
        const out = await withTimeout(adapter.produce(req, deps.getState()), deps.timeoutFor(key));
        if (Array.isArray(out) && out.length > 0) {
          for (const e of out) deliver(asLive(e, key), epoch);
          return;
        }
        deps.log(`${key} returned nothing for ${req.type}, using the scripted answer`);
      } catch (err) {
        deps.log(`${key} failed for ${req.type} (${err instanceof Error ? err.message : String(err)}), using the scripted answer`);
      }
    }
    await playScripted(req, key, epoch, t0, wallClock);
  }

  const off = deps.onEvent((e) => {
    void handle(e);
  });

  return {
    handle,
    dispose() {
      off();
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
}

export const REQUEST_DEFAULTS = { delayMs: REPLY_DELAY_MS, timeoutFor };
