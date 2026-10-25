import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent, type CindiaEvent } from "../core/events";
import { createPlayer, type Timeline } from "../core/player";
import { emit, getState, onEvent, reset } from "../core/store";
import { sample } from "../core/testFixtures";
import { validateEvent } from "../core/validate";
import { scoreKeywords } from "./keywordSearch";
import { createResponder, MILESTONE_NOTED, MILESTONE_PROPOSED, normalizeQuestion, OWN_FILE_NOTE, tokenFor, type MockAnswers } from "./requests";
import {
  ANS_01_TEXT,
  D04_TEXT,
  FIG11_KEYWORDS,
  FIG11_TEXT,
  L16,
  LST_01_NOTES,
  MEANING_TEXT,
  PAYOUT_TEXT,
  TEST_DEMO_SEARCH,
  TEST_INDEX,
  TEST_PIECES,
  TEST_REPORT,
  TEST_SPLITS,
  testMock,
} from "./testCatalog";
import { timeoutFor, type LiveAdapter } from "./types";

const mock: MockAnswers = {
  curatedSet: {
    pieceIds: ["pc_01", "pc_07", "pc_11"],
    reasons: { pc_01: { en: "a", zh: "a" }, pc_07: { en: "b", zh: "b" }, pc_11: { en: "c", zh: "c" } },
  },
  cannedAnswers: [
    {
      questionId: "ask_01",
      questions: { en: "Which piece earned the most this month?", zh: "这个月哪件作品最赚钱?" },
      answer: { en: "The brown, white and grey rug.", zh: "棕白灰三色地毯。" },
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
    timeoutFor,
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
    expect(a.answer.en).toBe("The brown, white and grey rug.");
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
    expect(getState().ask.answers.ask_user_6.answer.en).toBe("The brown, white and grey rug.");
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

  it("gives a person's b14-swarm request 20 seconds: a live answer at 15 seconds is used", async () => {
    const reply = {
      id: "evt_live_1402",
      type: "support.answered" as const,
      at: 0,
      source: "live" as const,
      key: "b14-swarm" as const,
      payload: { threadId: "thr_user_1", runId: "run_user_k3x9qa_1", agentId: "writer", reply: { en: "Live reply", zh: "实时回答" }, refIds: [] },
    };
    const slow: LiveAdapter = {
      key: "b14-swarm",
      health: async () => true,
      produce: () => new Promise((resolve) => setTimeout(() => resolve([reply]), 15000)),
    };
    const { r, log } = responder(slow);
    player.seek(30000);
    emit(userEvent("support.asked", { threadId: "thr_user_1", side: "buyer", text: "Who made this?", lang: "en", contextIds: ["pc_01"] }));
    await vi.advanceTimersByTimeAsync(14999);
    expect(getState().support.threads.thr_user_1.messages.map((m) => m.kind)).toEqual(["asked"]);
    await vi.advanceTimersByTimeAsync(1);
    const t = getState().support.threads.thr_user_1;
    expect(t.messages.map((m) => m.kind)).toEqual(["asked", "answered"]);
    // The live answer arrives at the player's time, like every answer to a person.
    expect(t.messages[1].at).toBe(30000);
    expect(getState().sources["b14-swarm"]).toBe("live");
    expect(log).not.toHaveBeenCalled();
    r.dispose();
  });

  it("gives a person's b07-ask request the default 8 seconds: a live answer at 9 seconds is too late, so the scripted one plays", async () => {
    const late: LiveAdapter = {
      key: "b07-ask",
      health: async () => true,
      produce: () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve([
                {
                  id: "evt_live_0702",
                  type: "ask.answered",
                  at: 0,
                  source: "live",
                  key: "b07-ask",
                  payload: { questionId: "ask_user_7", answer: { en: "Too late", zh: "太迟" }, refIds: [] },
                },
              ]),
            9000,
          ),
        ),
    };
    const { r, log } = responder(late);
    emit(userEvent("ask.asked", { questionId: "ask_user_7", text: "Which piece earned the most this month?", lang: "en" }));
    await vi.advanceTimersByTimeAsync(7999);
    expect(getState().ask.answers.ask_user_7).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(getState().ask.answers.ask_user_7.answer.en).toBe("The brown, white and grey rug.");
    await vi.advanceTimersByTimeAsync(2000);
    expect(getState().ask.answers.ask_user_7.answer.en).toBe("The brown, white and grey rug.");
    expect(getState().sources["b07-ask"]).toBe("scripted");
    expect(log.mock.calls.join(" ")).toMatch(/timeout after 8000 ms/);
    r.dispose();
  });

  it("asks the adapter for the request's own key", async () => {
    const seen: number[] = [];
    const r2 = createResponder({
      emit,
      getState,
      onEvent: () => () => {},
      adapterFor: (k) => (k === "b15-watch" ? { key: k, health: async () => true, produce: async () => [] } : undefined),
      mock: () => mock,
      now: () => player.now(),
      epoch: () => player.epoch(),
      delayMs: 1200,
      timeoutFor: (k) => {
        const ms = timeoutFor(k);
        seen.push(ms);
        return ms;
      },
      log: () => {},
    });
    await r2.handle(userEvent("watch.started", { scanId: "wsc_user_1", makerId: "mkr_01", queries: ["Grace N. weaving"] }));
    expect(seen).toEqual([60000]);
    r2.dispose();
  });

  it("matches questions after trimming, lowercasing and removing punctuation", () => {
    expect(normalizeQuestion("  Why did you FLAG the gallery payment?! ")).toBe("why did you flag the gallery payment");
    expect(normalizeQuestion("这个月哪件作品最赚钱？")).toBe(normalizeQuestion("这个月哪件作品最赚钱?"));
  });
});

// T5 and T8: the v2 scripted responders, on the fake catalog in testCatalog.ts.

let epochBase = 0;
/** A responder over the fake catalog. Each test gets its own epochs, so answer IDs start at 1. */
function v2Responder(opts: { mock?: Partial<MockAnswers>; timeline?: Timeline | null; adapter?: LiveAdapter } = {}) {
  const m = testMock(opts.mock);
  const seen: CindiaEvent[] = [];
  const off = onEvent((e) => {
    if (e.source !== "user") seen.push(e);
  });
  const adapterFor = vi.fn((k: string) => (opts.adapter && opts.adapter.key === k ? opts.adapter : undefined));
  const r = createResponder({
    emit,
    getState,
    onEvent,
    adapterFor,
    mock: () => m,
    now: () => player.now(),
    epoch: () => epochBase + player.epoch(),
    delayMs: 1200,
    timeoutFor,
    log: () => {},
    timeline: () => opts.timeline ?? null,
  });
  return {
    seen,
    adapterFor,
    dispose() {
      off();
      r.dispose();
    },
  };
}

function answeredOn(threadId: string) {
  return (getState().support.threads[threadId]?.messages ?? []).flatMap((x) => (x.kind === "answered" ? [x] : []));
}

function expectAllValid(events: CindiaEvent[]) {
  for (const e of events) expect(validateEvent(e), `${e.type} ${e.id}`).toEqual([]);
}

describe("T5: search, surprise, support, listings and the watch", () => {
  beforeEach(() => {
    epochBase += 1000;
  });

  it("answers figure 11's query with demoSearch's answer and the request's queryId, 1.2 seconds later", async () => {
    const t = v2Responder();
    emit(userEvent("search.queried", { queryId: "qry_user_1", text: FIG11_TEXT, keywords: FIG11_KEYWORDS, lang: "en", filters: { maxPriceCents: 20000 } }));
    await vi.advanceTimersByTimeAsync(1199);
    expect(getState().search.answers.qry_user_1).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    const a = getState().search.answers.qry_user_1;
    expect(a.queryId).toBe("qry_user_1");
    expect(a.results).toEqual(TEST_DEMO_SEARCH.answer.results);
    expect(a.engine).toBe("keyword_scripted");
    expect(getState().sources["b12-search"]).toBe("scripted");
    // The text is matched after normalization.
    emit(userEvent("search.queried", { queryId: "qry_user_2", text: "A warm, bold gift for my mom! She loves red wool. Under $200", keywords: FIG11_KEYWORDS, lang: "en", filters: { maxPriceCents: 20000 } }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().search.answers.qry_user_2.results).toEqual(TEST_DEMO_SEARCH.answer.results);
    expectAllValid(t.seen);
    t.dispose();
  });

  it("answers a refined chip or a lower price cap with the keyword scorer, filters applied", async () => {
    const t = v2Responder();
    const fewer = FIG11_KEYWORDS.filter((k) => k !== "bold");
    emit(userEvent("search.queried", { queryId: "qry_user_1", text: FIG11_TEXT, keywords: fewer, lang: "en", filters: { maxPriceCents: 20000 } }));
    emit(userEvent("search.queried", { queryId: "qry_user_2", text: FIG11_TEXT, keywords: FIG11_KEYWORDS, lang: "en", filters: { maxPriceCents: 5000 } }));
    await vi.advanceTimersByTimeAsync(1200);
    const one = getState().search.answers.qry_user_1;
    expect(one.engine).toBe("keyword_scripted");
    expect(one.results).toEqual(scoreKeywords(fewer, { maxPriceCents: 20000 }, TEST_INDEX, TEST_PIECES));
    expect(one.results).not.toEqual(TEST_DEMO_SEARCH.answer.results);
    const two = getState().search.answers.qry_user_2;
    expect(two.results.map((r) => r.pieceId)).toEqual(["pc_07"]);
    expect(two.results.every((r) => (TEST_PIECES.find((p) => p.id === r.pieceId)?.priceCents ?? Infinity) <= 5000)).toBe(true);
    expect(getState().search.maps).toEqual({}); // no report, no map
    expectAllValid(t.seen);
    t.dispose();
  });

  it("follows the answer with an approximate search.mapped 300 ms later when the model report exists", async () => {
    const t = v2Responder({ mock: { report: TEST_REPORT } });
    const keywords = ["warm", "bold", "red", "wool"];
    emit(userEvent("search.queried", { queryId: "qry_user_1", text: "warm bold red wool", keywords, lang: "en" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().search.answers.qry_user_1).toBeDefined();
    expect(getState().search.maps.qry_user_1).toBeUndefined();
    await vi.advanceTimersByTimeAsync(300);
    const map = getState().search.maps.qry_user_1;
    expect(map).toMatchObject({ modelId: "cindia-embed-v1", method: "pca", approx: true });
    expect(map.points).toEqual(TEST_REPORT.points);
    const top = getState().search.answers.qry_user_1.results.slice(0, 3);
    const pts = top.map((r) => TEST_REPORT.points.find((p) => p.pieceId === r.pieceId)!);
    const w = top.reduce((s, r) => s + r.score, 0);
    expect(map.query.x).toBeCloseTo(top.reduce((s, r, i) => s + r.score * pts[i].x, 0) / w, 10);
    expect(map.query.y).toBeCloseTo(top.reduce((s, r, i) => s + r.score * pts[i].y, 0) / w, 10);
    expectAllValid(t.seen);
    t.dispose();
  });

  it("draws a person's surprise with the request's fields", async () => {
    const t = v2Responder();
    emit(userEvent("surprise.asked", { surpriseId: "srp_user_1", keyword: "geometric", method: "fair_random", seed: 10 }));
    await vi.advanceTimersByTimeAsync(1200);
    const d = getState().surprise.draws.srp_user_1;
    expect(d.pieceId).toBe("pc_38");
    expect(d.candidates).toHaveLength(9);
    expect(getState().sources["b12-search"]).toBe("scripted");
    expectAllValid(t.seen);
    t.dispose();
  });

  it("plays the fallback for a question no run matches: first step at 1.2 s, steps 300 ms apart, run_user_1 and stp_user_1 on", async () => {
    const t = v2Responder();
    emit(userEvent("support.asked", { threadId: "thr_user_1", side: "buyer", text: "Do you ship to Canada?", lang: "en", contextIds: ["pc_01"] }));
    await vi.advanceTimersByTimeAsync(1199);
    expect(getState().swarm.runIds).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(getState().swarm.runs.run_user_1.stepIds).toEqual(["stp_user_1"]);
    await vi.advanceTimersByTimeAsync(299);
    expect(getState().swarm.runs.run_user_1.stepIds).toEqual(["stp_user_1"]);
    await vi.advanceTimersByTimeAsync(1);
    expect(getState().swarm.runs.run_user_1.stepIds).toEqual(["stp_user_1", "stp_user_2"]);
    expect(answeredOn("thr_user_1")).toEqual([]);
    await vi.advanceTimersByTimeAsync(300);
    const [answer] = answeredOn("thr_user_1");
    expect(answer).toMatchObject({ runId: "run_user_1", reply: L16, refIds: [] });
    expect(getState().swarm.runs.run_user_1).toMatchObject({ threadId: "thr_user_1", done: true });
    expect(getState().swarm.steps.stp_user_1.threadId).toBe("thr_user_1");
    expect(getState().sources["b14-swarm"]).toBe("scripted");
    expectAllValid(t.seen);
    t.dispose();
  });

  it("answers the tour's d04 question on another piece's page with the fallback, naming no pc_01", async () => {
    const t = v2Responder();
    emit(userEvent("support.asked", { threadId: "thr_user_1", side: "buyer", text: D04_TEXT, lang: "en", contextIds: ["pc_20"] }));
    emit(userEvent("support.asked", { threadId: "thr_user_2", side: "buyer", text: D04_TEXT, lang: "en", contextIds: ["pc_01"] }));
    await vi.advanceTimersByTimeAsync(3000);
    const [other] = answeredOn("thr_user_1");
    expect(other.reply).toEqual(L16);
    expect(other.refIds).not.toContain("pc_01");
    expect(JSON.stringify(t.seen.filter((e) => JSON.stringify(e.payload).includes("thr_user_1")))).not.toContain("pc_01");
    // On pc_01's own page, run_01 answers.
    const [own] = answeredOn("thr_user_2");
    expect(own.refIds).toContain("pc_01");
    t.dispose();
  });

  it("answers run_04's seller question only on Grace N.'s pages", async () => {
    const t = v2Responder();
    emit(userEvent("support.asked", { threadId: "thr_user_1", side: "seller", text: PAYOUT_TEXT, lang: "en", contextIds: ["mkr_01"] }));
    emit(userEvent("support.asked", { threadId: "thr_user_2", side: "seller", text: PAYOUT_TEXT, lang: "en", contextIds: ["mkr_02"] }));
    emit(userEvent("support.asked", { threadId: "thr_user_3", side: "seller", text: PAYOUT_TEXT, lang: "en", contextIds: [] }));
    // The same words from the buyer side match no seller run.
    emit(userEvent("support.asked", { threadId: "thr_user_4", side: "buyer", text: PAYOUT_TEXT, lang: "en", contextIds: ["mkr_01"] }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(answeredOn("thr_user_1")[0].reply.en).toBe("Your payout went out on Oct 2.");
    expect(answeredOn("thr_user_2")[0].reply).toEqual(L16);
    expect(answeredOn("thr_user_3")[0].reply).toEqual(L16);
    expect(answeredOn("thr_user_4")[0].reply).toEqual(L16);
    t.dispose();
  });

  it("gives a support question and a listing request planned within 1.2 seconds IDs that don't overlap", async () => {
    const t = v2Responder();
    emit(userEvent("support.asked", { threadId: "thr_user_1", side: "buyer", text: D04_TEXT, lang: "en", contextIds: ["pc_01"] }));
    await vi.advanceTimersByTimeAsync(400);
    emit(userEvent("listing.requested", { listingId: "lst_user_1", makerId: "mkr_02", notes: LST_01_NOTES, lang: "en" }));
    await vi.advanceTimersByTimeAsync(5000);
    const runs = getState().swarm.runs;
    const support = Object.entries(runs).find(([, r]) => r.threadId === "thr_user_1");
    const listing = Object.entries(runs).find(([, r]) => r.threadId === "lst_user_1");
    expect(support && listing).toBeTruthy();
    expect([support![0], listing![0]].toSorted()).toEqual(["run_user_1", "run_user_2"]);
    expect(support![1].stepIds.filter((id) => listing![1].stepIds.includes(id))).toEqual([]);
    expect(Object.keys(getState().swarm.steps)).toHaveLength(support![1].stepIds.length + listing![1].stepIds.length);
    t.dispose();
  });

  it("re-keys lst_01's run to a person's listing and ends with an apr_user_<n> naming it", async () => {
    const t = v2Responder();
    emit(userEvent("listing.requested", { listingId: "lst_user_1", makerId: "mkr_02", notes: `  ${LST_01_NOTES.toUpperCase()} `, lang: "en" }));
    await vi.advanceTimersByTimeAsync(5000);
    const draft = getState().listings.drafts.lst_user_1;
    expect(draft.title.en).toBe("Small red, grey and white wool weaving"); // run_02's draft, not the fallback's
    expect(draft.checks.map((c) => c.checkId)).toEqual(["chk_user_1", "chk_user_2"]);
    expect(getState().listings.indexed.lst_user_1).toMatchObject({ pieceId: "pc_user_1", index: "cindia-drafts" });
    const run = Object.values(getState().swarm.runs).find((r) => r.threadId === "lst_user_1");
    expect(run?.done).toBe(true);
    expect(t.seen.map((e) => e.type).slice(-3)).toEqual(["listing.drafted", "listing.indexed", "approval.requested"]);
    const apr = getState().approvals.items.apr_user_1;
    expect(apr.requested).toBe(true);
    expect(apr.approval).toMatchObject({ kind: "listing_publish", subjectIds: ["lst_user_1"], proposedBy: "cindy" });
    expect(getState().approvals.items.apr_04).toBeUndefined();
    expect(JSON.stringify(t.seen)).not.toContain('"apr_04"');
    expectAllValid(t.seen);
    t.dispose();
  });

  it("answers other notes with the fallback listing, re-keyed the same way", async () => {
    const t = v2Responder();
    emit(userEvent("listing.requested", { listingId: "lst_user_2", makerId: "mkr_03", notes: "A new silver ring.", lang: "en" }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(getState().listings.drafts.lst_user_2).toMatchObject({ makerId: "mkr_03", title: { en: "Sample listing" } });
    expect(getState().approvals.items.apr_user_1.approval).toMatchObject({ kind: "listing_publish", subjectIds: ["lst_user_2"] });
    expectAllValid(t.seen);
    t.dispose();
  });

  it("plays a person's scan after the tour with cft_user_, fup_user_ and apr_user_ IDs, leaving the tour's cft_01 as it was", async () => {
    // The tour's scan first.
    emit(sample("watch.started", {}, { at: 100 }));
    emit(sample("counterfeit.flagged", {}, { at: 200 }));
    emit(sample("approval.requested", { approvalId: "apr_03" }, { at: 300 }));
    const tourHit = getState().watch.hits.cft_01;
    const t = v2Responder();
    emit(userEvent("watch.started", { scanId: "wsc_user_1", makerId: "mkr_01", queries: ["Diné Weaving and Silver Co-op"] }));
    await vi.advanceTimersByTimeAsync(1200);
    const scan = getState().watch.scans.wsc_user_1;
    expect(scan).toMatchObject({ engine: "scripted", candidates: 4 });
    expect(scan.results?.map((r) => r.verdict)).toEqual(["possible_copy", "claim_only", "neither", "neither"]);
    expect(scan.results?.[0]).toEqual({ title: "Grace N. wool weaving, grey red black", url: "/market/listing-01.html", snippet: "A small weaving.", similarity: 0.91, verdict: "possible_copy" });
    await vi.advanceTimersByTimeAsync(300);
    expect(getState().watch.hits.cft_user_1).toMatchObject({ scanId: "wsc_user_1", pieceId: "pc_01", similarity: 0.91 });
    await vi.advanceTimersByTimeAsync(300);
    expect(getState().approvals.followUps.fup_user_1).toMatchObject({ approvalId: "apr_user_1" });
    await vi.advanceTimersByTimeAsync(300);
    expect(getState().approvals.items.apr_user_1.approval).toMatchObject({ kind: "report_listing", subjectIds: ["cft_user_1"] });
    expect(t.seen.map((e) => e.type)).toEqual(["watch.scanned", "counterfeit.flagged", "followup.drafted", "approval.requested"]);
    expect(t.seen.every((e) => e.key === "b15-watch")).toBe(true);
    expect(getState().watch.hits.cft_01).toEqual(tourHit);
    expect(getState().approvals.items.apr_03.approval).toBeUndefined();
    expectAllValid(t.seen);
    t.dispose();
  });
});

describe("T8: pieces, checkout, milestones, storefronts and the maker's answers", () => {
  beforeEach(() => {
    epochBase += 1000;
  });

  it("answers a person's piece.opened with that piece's split", async () => {
    const t = v2Responder();
    emit(userEvent("piece.opened", { pieceId: "pc_13" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().buyer.splits.pc_13).toEqual(TEST_SPLITS.pc_13);
    expect(getState().sources["b10-derived"]).toBe("scripted");
    // A piece with no split gets nothing.
    emit(userEvent("piece.opened", { pieceId: "pc_99" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().buyer.splits.pc_99).toBeUndefined();
    expectAllValid(t.seen);
    t.dispose();
  });

  it("answers a person's checkout of pc_13 after the tour's pc_01 checkout with its own card, order and receipt", async () => {
    const tourCheckout = sample("checkout.started", {}, { at: 11300 });
    const timeline: Timeline = { id: "t", durationMs: 60000, events: [tourCheckout] };
    emit(tourCheckout);
    emit(sample("card.tokenized", {}, { at: 12500 })); // v1's card has no pieceId
    const tourCard = getState().buyer.cards.pc_01;
    expect(tourCard).toBeDefined();
    const t = v2Responder({ timeline });
    emit(userEvent("checkout.started", { pieceId: "pc_13", grossCents: 4500 }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().buyer.cards.pc_13).toMatchObject({ token: tokenFor("pc_13"), last4: "4242", pieceId: "pc_13" });
    expect(getState().buyer.cards.pc_01).toEqual(tourCard);
    await vi.advanceTimersByTimeAsync(600);
    expect(getState().buyer.orders.ord_user_1).toEqual({ orderId: "ord_user_1", pieceId: "pc_13", channelId: "ch_cindia", buyerId: "buy_01", grossCents: 4500, date: "2026-10-01" });
    expect(getState().buyer.receipts.ord_user_1).toEqual({ orderId: "ord_user_1", status: "received", makerId: "mkr_04", makerShareCents: 2889 });
    // Out of the month, the ledger and the money map, and keyless.
    expect(getState().month.recordIds).toEqual([]);
    expect(getState().month.ledgerEntryIds).toEqual([]);
    expect(getState().money.moveIds).toEqual([]);
    expect(t.seen.every((e) => e.key === undefined)).toBe(true);
    expect(t.adapterFor).not.toHaveBeenCalled();
    expectAllValid(t.seen);
    // The same token every time: made from the piece ID with no randomness.
    expect(tokenFor("pc_13")).toBe(tokenFor("pc_13"));
    expect(tokenFor("pc_13")).not.toBe(tokenFor("pc_14"));
    t.dispose();
  });

  it("gives a person's checkout of the timeline's own piece no scripted answer", async () => {
    const tourCheckout = sample("checkout.started", {}, { at: 11300 });
    const t = v2Responder({ timeline: { id: "t", durationMs: 60000, events: [tourCheckout] } });
    emit(userEvent("checkout.started", { pieceId: "pc_01", grossCents: 18000 }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(t.seen).toEqual([]);
    t.dispose();
  });

  it("proposes apr_05 for wip_01's second milestone, and pays it with mv_user_1 once the owner grants it", async () => {
    const t = v2Responder();
    emit(userEvent("wip.milestone_reached", { wipId: "wip_01", milestoneId: "mls_02", date: "2026-10-01" }));
    await vi.advanceTimersByTimeAsync(1200);
    const acts = Object.values(getState().agent.acts);
    expect(acts).toHaveLength(1);
    expect(acts[0]).toMatchObject({ kind: "propose", text: MILESTONE_PROPOSED });
    expect(getState().agent.actIds[0]).toMatch(/^act_reply_\d+$/);
    await vi.advanceTimersByTimeAsync(300);
    expect(getState().approvals.items.apr_05.requested).toBe(true);
    emit(userEvent("approval.granted", { approvalId: "apr_05", by: "own_01", date: "2026-10-01" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().wip.milestones.mls_02).toMatchObject({ wipId: "wip_01", status: "paid", amountCents: 36000, date: "2026-10-02" });
    await vi.advanceTimersByTimeAsync(300);
    expect(getState().money.moves.mv_user_1).toMatchObject({
      kind: "milestone",
      from: { kind: "cindia" },
      to: { kind: "maker", id: "mkr_01" },
      amountCents: 36000,
      refId: "mls_02",
      date: "2026-10-02",
    });
    // A second tap on the decided approval pays nothing more.
    emit(userEvent("approval.granted", { approvalId: "apr_05", by: "own_01", date: "2026-10-01" }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(getState().money.moveIds).toEqual(["mv_user_1"]);
    expectAllValid(t.seen);
    t.dispose();
  });

  it("gives any other milestone only Cindy's line, and pays nothing after a decline or on v1's approvals", async () => {
    const t = v2Responder();
    emit(userEvent("wip.milestone_reached", { wipId: "wip_01", milestoneId: "mls_03", date: "2026-10-01" }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.seen.map((e) => e.type)).toEqual(["agent.acted"]);
    expect(Object.values(getState().agent.acts)[0].text).toEqual(MILESTONE_NOTED);
    emit(userEvent("approval.declined", { approvalId: "apr_05", by: "own_01", reason: { en: "Not yet", zh: "还没有" } }));
    emit(userEvent("approval.granted", { approvalId: "apr_05", by: "own_01", date: "2026-10-01" }));
    emit(userEvent("approval.granted", { approvalId: "apr_02", by: "own_01", date: "2026-10-01" }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(t.seen.map((e) => e.type)).toEqual(["agent.acted"]);
    expect(getState().money.moveIds).toEqual([]);
    t.dispose();
  });

  it("pays a milestone found through the stored inline approval", async () => {
    const t = v2Responder();
    emit(
      sample("approval.requested", {
        approvalId: "apr_user_7",
        approval: { kind: "milestone_release", subjectIds: ["wip_01", "mls_03"], overLimit: false, proposedBy: "cindy", summary: { en: "Release", zh: "发放" }, decisionDate: "2026-10-01" },
      }),
    );
    emit(userEvent("approval.granted", { approvalId: "apr_user_7", by: "own_01", date: "2026-10-01" }));
    await vi.advanceTimersByTimeAsync(1500);
    expect(getState().wip.milestones.mls_03).toMatchObject({ status: "paid", amountCents: 48000 });
    expect(getState().money.moves.mv_user_1.amountCents).toBe(48000);
    t.dispose();
  });

  it("drafts sto_01 through run_03 with every block re-keyed, and no other storefront", async () => {
    const t = v2Responder();
    emit(userEvent("storefront.requested", { storefrontId: "sto_01" }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(getState().swarm.runs.run_user_1).toMatchObject({ threadId: "sto_01", done: false });
    await vi.advanceTimersByTimeAsync(900);
    expect(getState().swarm.runs.run_user_1.stepIds).toHaveLength(3);
    expect(getState().swarm.runs.run_user_1.done).toBe(true);
    expect(getState().storefront.drafts.sto_01.blocks.map((b) => b.blockId)).toEqual(["blk_user_1", "blk_user_2"]);
    expect(t.seen.map((e) => e.type)).toEqual(["swarm.step", "swarm.step", "swarm.step", "storefront.drafted"]);
    emit(userEvent("storefront.requested", { storefrontId: "sto_02" }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(getState().storefront.drafts.sto_02).toBeUndefined();
    expect(t.seen).toHaveLength(4);
    expectAllValid(t.seen);
    t.dispose();
  });

  it("relays a person's own answer to qst_01 through run_09, quoting her text exactly and not ans_01's", async () => {
    const t = v2Responder();
    const own = "I just like these colors. Nothing more to it!";
    emit(userEvent("question.answered", { questionId: "qst_01", answerId: "ans_user_1", makerId: "mkr_01", text: own, lang: "en" }));
    await vi.advanceTimersByTimeAsync(1500);
    // The store holds no forward for qst_01, so the answer lands on run_09's own thread.
    const [answer] = answeredOn("thr_03");
    expect(answer.runId).toBe("run_user_1");
    expect(answer.reply.en).toContain(own);
    expect(answer.reply.zh).toContain(own);
    expect(JSON.stringify(answer.reply)).not.toContain(ANS_01_TEXT);
    expect(answer.refIds).toEqual(["qst_01", "ans_user_1", "mkr_01"]);
    expectAllValid(t.seen);
    t.dispose();
  });

  it("on a fresh store, forwards a person's meaning question as qst_user_1 and relays her answer back to that thread", async () => {
    const t = v2Responder();
    emit(userEvent("support.asked", { threadId: "thr_user_1", side: "buyer", text: MEANING_TEXT, lang: "en", contextIds: ["pc_01"] }));
    await vi.advanceTimersByTimeAsync(3000);
    const fwd = getState().support.questions.qst_user_1?.forwarded;
    expect(fwd).toMatchObject({ questionId: "qst_user_1", threadId: "thr_user_1", makerId: "mkr_01", pieceId: "pc_01", text: MEANING_TEXT, lang: "en" });
    expect(getState().support.questions.qst_01).toBeUndefined();
    expect(answeredOn("thr_user_1")).toHaveLength(1); // L14

    const own = "Grey, red and black are the colors I had. That's all.";
    emit(userEvent("question.answered", { questionId: "qst_user_1", answerId: "ans_user_1", makerId: "mkr_01", text: own, lang: "en" }));
    await vi.advanceTimersByTimeAsync(3000);
    const answers = answeredOn("thr_user_1");
    expect(answers).toHaveLength(2);
    const relay = answers[1];
    expect(relay.runId).toBe("run_user_2");
    expect(relay.reply.en).toContain(own);
    expect(JSON.stringify(relay.reply)).not.toContain(ANS_01_TEXT);
    expect(relay.refIds).toContain("qst_user_1");
    expect(getState().support.threads.thr_03).toBeUndefined();
    expectAllValid(t.seen);
    t.dispose();
  });

  it("gives an answer to a question no run names and the store doesn't hold no reply", async () => {
    const t = v2Responder();
    emit(userEvent("question.answered", { questionId: "qst_user_9", answerId: "ans_user_1", makerId: "mkr_01", text: "Hello", lang: "en" }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(t.seen).toEqual([]);
    t.dispose();
  });

  it("drops a pending run's remaining events when the player resets", async () => {
    const t = v2Responder();
    emit(userEvent("support.asked", { threadId: "thr_user_1", side: "buyer", text: D04_TEXT, lang: "en", contextIds: ["pc_01"] }));
    await vi.advanceTimersByTimeAsync(1500);
    expect(t.seen).toHaveLength(2);
    player.reset();
    await vi.advanceTimersByTimeAsync(3000);
    expect(t.seen).toHaveLength(2);
    t.dispose();
  });
});
