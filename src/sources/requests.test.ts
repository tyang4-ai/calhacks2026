import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent, type CindiaEvent } from "../core/events";
import { createPlayer } from "../core/player";
import { emit, getState, onEvent, reset } from "../core/store";
import { sample } from "../core/testFixtures";
import { createResponder, normalizeQuestion, OWN_FILE_NOTE, type MockAnswers } from "./requests";
import type { LiveAdapter } from "./types";

const mock: MockAnswers = {
  curatedSet: {
    pieceIds: ["pc_01", "pc_07", "pc_11"],
    reasons: { pc_01: { en: "a", zh: "a" }, pc_07: { en: "b", zh: "b" }, pc_11: { en: "c", zh: "c" } },
  },
  cannedAnswers: [
    {
      questionId: "ask_01",
      questions: { en: "Which piece earned the most this month?", zh: "这个月哪件作品最赚钱?" },
      answer: { en: "The koi pond panel.", zh: "锦鲤图。" },
      refIds: ["ord_027"],
    },
  ],
  fallbackAnswer: { en: "In scripted mode I answer three questions.", zh: "演示模式只回答三个问题。" },
  scenarioReplies: [
    sample("record.arrived", { recordId: "scn_001", recordType: "statement" }, { at: 0, key: "b05-scenario" }),
    sample("flag.raised", { flagId: "flg_scn_01" }, { at: 600, key: "b05-scenario" }),
  ],
};

let player = createPlayer({ wallNow: () => 0, requestFrame: () => 1, cancelFrame: () => {} });

function responder(adapter?: LiveAdapter) {
  const log = vi.fn();
  const r = createResponder({
    emit,
    getState,
    onEvent,
    adapterFor: (k) => (adapter && adapter.key === k ? adapter : undefined),
    mock: () => mock,
    now: () => player.now(),
    epoch: () => player.epoch(),
    delayMs: 1200,
    timeoutMs: 8000,
    log,
  });
  return { r, log };
}

beforeEach(() => {
  reset();
  vi.useFakeTimers();
  player = createPlayer({ wallNow: () => 0, requestFrame: () => 1, cancelFrame: () => {} });
  player.load({ id: "t", durationMs: 60000, events: [] });
});
afterEach(() => {
  vi.useRealTimers();
  reset();
});

describe("requests from people", () => {
  it("answers ask.asked in scripted mode 1.2 seconds later, with the request's questionId", async () => {
    const { r } = responder();
    emit(userEvent("ask.asked", { questionId: "ask_user_1", text: "  这个月哪件作品最赚钱？ ", lang: "zh" }));
    await vi.advanceTimersByTimeAsync(1199);
    expect(getState().ask.answers.ask_user_1).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    const a = getState().ask.answers.ask_user_1;
    expect(a.answer.en).toBe("The koi pond panel.");
    expect(a.refIds).toEqual(["ord_027"]);
    expect(getState().sources["b07-ask"]).toBe("scripted");
    r.dispose();
  });

  it("gives the fallback answer when no canned question matches", async () => {
    const { r } = responder();
    emit(userEvent("ask.asked", { questionId: "ask_user_2", text: "What's the weather?", lang: "en" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().ask.answers.ask_user_2.answer).toEqual(mock.fallbackAnswer);
    r.dispose();
  });

  it("answers concierge.asked with the curated set and the request's query", async () => {
    const { r } = responder();
    emit(userEvent("concierge.asked", { query: "something blue", lang: "en" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
    expect(getState().buyer.concierge?.query).toBe("something blue");
    r.dispose();
  });

  it("plays the scenario replies at 1.2 seconds plus their offsets, and notes a person's own file", async () => {
    const { r } = responder();
    emit(userEvent("scenario.loaded", { scenarioId: "scn_01", fileName: "mine.csv", content: "date,orderId" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().month.recordIds).toEqual(["scn_001"]);
    expect(getState().month.flagIds).toEqual([]);
    await vi.advanceTimersByTimeAsync(600);
    expect(getState().month.flagIds).toEqual(["flg_scn_01"]);
    const acts = Object.values(getState().agent.acts);
    expect(acts.map((a) => a.text)).toContainEqual(OWN_FILE_NOTE);
    r.dispose();
  });

  it("the sample file gets the replies without the note", async () => {
    const { r } = responder();
    emit(userEvent("scenario.loaded", { scenarioId: "scn_01", fileName: "sample.csv", recordIds: ["scn_001"] }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(getState().month.flagIds).toEqual(["flg_scn_01"]);
    expect(getState().agent.actIds).toEqual([]);
    r.dispose();
  });

  it("a scripted request gets no answer", async () => {
    const { r } = responder();
    emit(sample("ask.asked", { questionId: "ask_01" }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(getState().ask.answers).toEqual({});
    r.dispose();
  });

  it("a grant or decline from a person gets nothing more in scripted mode", async () => {
    const { r } = responder();
    const seen: CindiaEvent[] = [];
    const off = onEvent((e) => seen.push(e));
    emit(userEvent("approval.granted", { approvalId: "apr_01", by: "own_01", date: "2026-10-01" }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(seen).toHaveLength(1);
    expect(getState().approvals.items.apr_01.status).toBe("granted");
    off();
    r.dispose();
  });

  it("the answer still arrives while the player is paused, at the player's time", async () => {
    const { r } = responder();
    player.seek(62000); // past the end of a 60 s timeline, clamped to 60000
    expect(player.isPlaying()).toBe(false);
    emit(userEvent("ask.asked", { questionId: "ask_user_3", text: "Which piece earned the most this month", lang: "en" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().ask.answers.ask_user_3.at).toBe(60000);
    r.dispose();
  });

  it("a reset before delivery drops the pending answer", async () => {
    const { r } = responder();
    emit(userEvent("ask.asked", { questionId: "ask_user_4", text: "x", lang: "en" }));
    await vi.advanceTimersByTimeAsync(500);
    player.reset();
    await vi.advanceTimersByTimeAsync(1000);
    expect(getState().ask.answers).toEqual({});
    r.dispose();
  });

  it("in live mode a live adapter's answer replaces the scripted one", async () => {
    const live: LiveAdapter = {
      key: "b07-ask",
      health: async () => true,
      produce: async (e) => [
        {
          id: "evt_live_0001",
          type: "ask.answered",
          at: e.at,
          source: "live",
          key: "b07-ask",
          payload: { questionId: "ask_user_5", answer: { en: "Live answer", zh: "实时回答" }, refIds: [] },
        },
      ],
    };
    const { r } = responder(live);
    emit(userEvent("ask.asked", { questionId: "ask_user_5", text: "Which piece earned the most this month?", lang: "en" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(getState().ask.answers.ask_user_5.answer.en).toBe("Live answer");
    expect(getState().sources["b07-ask"]).toBe("live");
    await vi.advanceTimersByTimeAsync(3000);
    expect(getState().ask.answers.ask_user_5.answer.en).toBe("Live answer");
    r.dispose();
  });

  it("in live mode a failing adapter falls back to the scripted answer", async () => {
    const failing: LiveAdapter = {
      key: "b07-ask",
      health: async () => true,
      produce: async () => {
        throw new Error("upstream_error");
      },
    };
    const { r, log } = responder(failing);
    emit(userEvent("ask.asked", { questionId: "ask_user_6", text: "Which piece earned the most this month?", lang: "en" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().ask.answers.ask_user_6.answer.en).toBe("The koi pond panel.");
    expect(getState().sources["b07-ask"]).toBe("scripted");
    expect(log).toHaveBeenCalled();
    r.dispose();
  });

  it("in live mode a timed-out adapter falls back after 8 seconds", async () => {
    const slow: LiveAdapter = { key: "b09-concierge", health: async () => true, produce: () => new Promise(() => {}) };
    const { r } = responder(slow);
    emit(userEvent("concierge.asked", { query: "q", lang: "en" }));
    await vi.advanceTimersByTimeAsync(7999);
    expect(getState().buyer.concierge).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
    r.dispose();
  });

  it("in live mode a grant is forwarded to the B08 adapter", async () => {
    const produce = vi.fn(async () => [] as CindiaEvent[]);
    const { r } = responder({ key: "b08-approvals", health: async () => true, produce });
    emit(userEvent("approval.granted", { approvalId: "apr_02", by: "own_01", date: "2026-10-01" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(produce).toHaveBeenCalledTimes(1);
    r.dispose();
  });

  it("matches questions after trimming, lowercasing and removing punctuation", () => {
    expect(normalizeQuestion("  Why did you FLAG the gallery payment?! ")).toBe("why did you flag the gallery payment");
    expect(normalizeQuestion("这个月哪件作品最赚钱？")).toBe(normalizeQuestion("这个月哪件作品最赚钱?"));
  });
});
