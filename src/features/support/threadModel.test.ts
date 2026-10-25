// Unit tests for threadModel.ts: the current thread, arrival order by the log (never by `at` alone),
// the "ask the maker" entries, and whether a thread waits on an answer.
import { describe, expect, it } from "vitest";
import { initialState, type CindiaState } from "../../core/state";
import type { LogEntry, SupportMessage } from "../../core/state";
import { currentThreadId, isThreadBusy, latestReply, latestRun, nextUserThreadId, threadForAsk, threadItems } from "./threadModel";

function asked(eventId: string, threadId: string, at = 0): SupportMessage {
  return { kind: "asked", eventId, at, threadId, side: "buyer", text: "q", lang: "en", contextIds: ["pc_01"] };
}
function answered(eventId: string, threadId: string, runId: string, at = 0): SupportMessage {
  return { kind: "answered", eventId, at, threadId, runId, agentId: "writer", reply: { en: "r", zh: "r" }, refIds: [] };
}
const logOf = (ids: string[]): LogEntry[] => ids.map((id) => ({ id, type: "support.asked", at: 0, source: "scripted" }));

function stateWith(build: (s: CindiaState) => void): CindiaState {
  const s = initialState();
  build(s);
  return s;
}

describe("threadModel", () => {
  it("picks the newest thread of a side, skipping hidden ones", () => {
    const s = stateWith((st) => {
      st.support.threads = {
        thr_01: { side: "buyer", lang: "en", contextIds: [], messages: [] },
        thr_02: { side: "seller", lang: "en", contextIds: [], messages: [] },
        thr_user_1: { side: "buyer", lang: "en", contextIds: [], messages: [] },
      };
      st.support.threadIds = ["thr_01", "thr_02", "thr_user_1"];
    });
    expect(currentThreadId(s.support, "buyer")).toBe("thr_user_1");
    expect(currentThreadId(s.support, "seller")).toBe("thr_02");
    expect(currentThreadId(s.support, "buyer", new Set(["thr_user_1", "thr_01"]))).toBeNull();
    expect(nextUserThreadId(s.support)).toBe("thr_user_2");
    expect(threadForAsk(s.support, "thr_user_1")).toBe("thr_user_1");
    expect(threadForAsk(s.support, "thr_01")).toBe("thr_user_2");
    expect(threadForAsk(s.support, null)).toBe("thr_user_2");
  });

  it("orders entries by their place in the log when every `at` is the same, and the maker's loop with them", () => {
    const s = stateWith((st) => {
      st.support.threads = {
        thr_user_1: { side: "buyer", lang: "en", contextIds: ["pc_01"], messages: [asked("e1", "thr_user_1"), answered("e2", "thr_user_1", "run_user_1"), answered("e5", "thr_user_1", "run_user_2")] },
      };
      st.support.threadIds = ["thr_user_1"];
      st.support.questions = {
        qst_user_1: {
          forwarded: { eventId: "e3", at: 0, questionId: "qst_user_1", threadId: "thr_user_1", makerId: "mkr_01", pieceId: "pc_01", text: "q", lang: "en" },
          answered: { eventId: "e4", at: 0, questionId: "qst_user_1", answerId: "ans_user_1", makerId: "mkr_01", text: "hers", lang: "en" },
        },
      };
      st.log.entries = logOf(["e1", "e2", "e3", "e4", "e5"]);
    });
    const items = threadItems(s, "thr_user_1");
    expect(items.map((i) => i.kind)).toEqual(["asked", "answered", "forwarded", "maker", "answered"]);
    expect(latestReply(items)?.key).toBe("e5");
  });

  it("puts entries that have left the log first, ordered by `at`", () => {
    const s = stateWith((st) => {
      st.support.threads = {
        t: { side: "buyer", lang: "en", contextIds: [], messages: [answered("new", "t", "r", 5), asked("old2", "t", 2), asked("old1", "t", 1)] },
      };
      st.support.threadIds = ["t"];
      st.log.entries = logOf(["new"]);
    });
    expect(threadItems(s, "t").map((i) => i.key)).toEqual(["old1", "old2", "new"]);
  });

  it("is busy while the newest run works or the last entry is an unanswered question", () => {
    const s = stateWith((st) => {
      st.support.threads = { t: { side: "buyer", lang: "en", contextIds: [], messages: [asked("e1", "t")] } };
      st.support.threadIds = ["t"];
      st.log.entries = logOf(["e1"]);
    });
    expect(isThreadBusy(s, "t")).toBe(true);
    s.swarm.runs = { run_a: { threadId: "t", stepIds: ["stp_1"], done: false, firstAt: 0, lastAt: 0 } };
    s.swarm.runIds = ["run_a"];
    expect(latestRun(s.swarm, "t")?.runId).toBe("run_a");
    expect(isThreadBusy(s, "t")).toBe(true);
    s.swarm.runs.run_a = { ...s.swarm.runs.run_a, done: true };
    s.support.threads.t.messages.push(answered("e2", "t", "run_a"));
    s.log.entries = logOf(["e1", "e2"]);
    expect(isThreadBusy(s, "t")).toBe(false);
    expect(isThreadBusy(s, null)).toBe(false);
  });
});
