// B09's prefetch: the scripted concierge.asked starts the request, and produce() for the keyed
// concierge.answered awaits it. Runs the real store and registry with a fake player (epoch, clock,
// timeline) and a fake fetch, on fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent, type CindiaEvent, type Payloads } from "../../core/events";
import { emit, getState, reset, resetEvents, setStoreMode, subscribe } from "../../core/store";
import { pieces } from "../../mock/catalog";
import { demoTimeline } from "../../mock/timelines/demo";
import { createRegistry, type Registry } from "../registry";
import { createConciergeAdapter } from "./b09-concierge";

const KEY = "b09-concierge";
/** About what Haiku takes on the server. */
const LATENCY_MS = 2000;

const asked = demoTimeline.events.find((e) => e.type === "concierge.asked")!;
const answered = demoTimeline.events.find((e) => e.type === "concierge.answered")!;
const DEMO_QUERY = (answered.payload as Payloads["concierge.answered"]).query;

interface Post {
  body: { trigger: CindiaEvent; query: string; lang: string; catalog: unknown[] };
  /** The fake clock when the request went out. */
  sentAt: number;
}

let posts: Post[] = [];
/** The picks each POST answers with, by call number. The default includes pc_01. */
let picksFor: (n: number) => string[] = () => ["pc_07", "pc_01", "pc_03"];
/** False makes every POST hang until its abort signal fires. */
let answers = true;

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function liveAnswer(query: string, at: number, pieceIds: string[], n: number): CindiaEvent {
  const reasons = Object.fromEntries(pieceIds.map((id) => [id, { en: `Live reason ${n} for ${id}.`, zh: `实时理由 ${n}：${id}。` }]));
  return { id: `evt_live_${n}`, type: "concierge.answered", at, source: "live", key: KEY, payload: { query, pieceIds, reasons } };
}

function fakeFetch(url: string, init: RequestInit = {}) {
  if (url === "/api/health") return Promise.resolve(okResponse({ routers: ["b09"], keys: { anthropic: true } }));
  if (url !== "/api/b09/concierge") return Promise.reject(new Error(`unexpected ${url}`));
  const body = JSON.parse(String(init.body)) as Post["body"];
  const n = posts.length + 1;
  posts.push({ body, sentAt: Date.now() });
  return new Promise((resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    if (!answers) return;
    setTimeout(() => resolve(okResponse({ events: [liveAnswer(body.query, Number(body.trigger.at), picksFor(n), n)] })), LATENCY_MS);
  });
}

/** The fake player. */
let epoch = 1;
let clock = 0;
const playerDeps = { epoch: () => epoch, now: () => clock, timeline: () => demoTimeline };

let registry: Registry | null = null;

async function liveRegistry(adapter = createConciergeAdapter(playerDeps)) {
  const log = vi.fn();
  registry = createRegistry({ adapters: [adapter], emit, getState, subscribe, timeoutMs: 8000, now: () => clock, log });
  setStoreMode("live");
  await registry.refreshHealth();
  expect(registry.health()[KEY]).toBe(true);
  return { r: registry, adapter, log };
}

/** The player reaching the scripted concierge.asked: no key, so the registry emits it to the store. */
async function playAsked(r: Registry, at = asked.at) {
  clock = at;
  await r.dispatch(asked);
}

beforeEach(() => {
  reset();
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  posts = [];
  picksFor = () => ["pc_07", "pc_01", "pc_03"];
  answers = true;
  epoch = 1;
  clock = 0;
});

afterEach(() => {
  registry?.dispose();
  registry = null;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  reset();
});

describe("b09-concierge prefetch", () => {
  it("the scripted concierge.asked starts the request once, for its keyed answer", async () => {
    const { r } = await liveRegistry();
    expect(posts).toHaveLength(0);
    await playAsked(r);
    expect(posts).toHaveLength(1);
    const { body } = posts[0];
    expect(body.query).toBe(DEMO_QUERY);
    expect(body.lang).toBe("en");
    expect(body.trigger.id).toBe(answered.id);
    expect(body.trigger.at).toBe(answered.at);
    expect(body.catalog).toHaveLength(pieces.filter((p) => p.communityId === "com_dine").length);
    expect(body.catalog).toHaveLength(12);
    // The same request again in this epoch posts nothing more.
    await playAsked(r, asked.at + 10);
    await vi.advanceTimersByTimeAsync(100);
    expect(posts).toHaveLength(1);
  });

  it("produce() at the keyed answer reuses the request and returns as soon as it resolves", async () => {
    const { r } = await liveRegistry();
    await playAsked(r);
    const t0 = Date.now();
    // The player reaches the keyed answer 1.5 s later.
    await vi.advanceTimersByTimeAsync(answered.at - asked.at);
    clock = answered.at;
    const done = r.dispatch(answered);
    await vi.advanceTimersByTimeAsync(0);
    expect(posts).toHaveLength(1);
    expect(getState().buyer.concierge).toBeNull();
    // Still in flight: nothing has landed, live or scripted.
    await vi.advanceTimersByTimeAsync(LATENCY_MS - (answered.at - asked.at) - 1);
    expect(getState().buyer.concierge).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    await done;
    // Landed 0.5 s after the answer's beat instead of 2 s.
    expect(Date.now() - t0).toBe(LATENCY_MS);
    expect(getState().sources[KEY]).toBe("live");
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_07", "pc_01", "pc_03"]);
    expect(getState().buyer.concierge?.reasons.pc_01.en).toBe("Live reason 1 for pc_01.");
    const live = getState().log.entries.find((e) => e.type === "concierge.answered");
    expect(live?.source).toBe("live");
    expect(live?.at).toBe(answered.at);
    expect(posts).toHaveLength(1);
  });

  it("produce() alone still starts its own request when nothing was prefetched", async () => {
    const { adapter } = await liveRegistry();
    clock = answered.at;
    const out = adapter.produce(answered, getState());
    expect(posts).toHaveLength(1);
    expect(posts[0].body.trigger.id).toBe(answered.id);
    await vi.advanceTimersByTimeAsync(LATENCY_MS);
    const events = await out;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "concierge.answered", at: answered.at, source: "live", key: KEY });
  });

  it("a reset between the request and the answer drops the cached request", async () => {
    picksFor = (n) => (n === 1 ? ["pc_07", "pc_01", "pc_03"] : ["pc_01", "pc_11", "pc_05"]);
    const { r } = await liveRegistry();
    await playAsked(r);
    expect(posts).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(500);
    // A reset, as the player does it: the epoch moves, the store's events clear, the mode stays live.
    epoch += 1;
    clock = 0;
    resetEvents();
    expect(getState().mode).toBe("live");
    // The first request resolves meanwhile, and is not what lands.
    await vi.advanceTimersByTimeAsync(answered.at);
    clock = answered.at;
    const done = r.dispatch(answered);
    expect(posts).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(LATENCY_MS);
    await done;
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_11", "pc_05"]);
    expect(getState().buyer.concierge?.reasons.pc_01.en).toBe("Live reason 2 for pc_01.");
  });

  it("a reset then the scripted request again prefetches once in the new epoch", async () => {
    const { r } = await liveRegistry();
    await playAsked(r);
    epoch += 1;
    await playAsked(r);
    expect(posts).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(answered.at - asked.at);
    clock = answered.at;
    const done = r.dispatch(answered);
    await vi.advanceTimersByTimeAsync(LATENCY_MS);
    await done;
    expect(posts).toHaveLength(2);
    expect(getState().buyer.concierge?.reasons.pc_01.en).toBe("Live reason 2 for pc_01.");
  });

  it("a seek past the keyed answer replays the request without posting", async () => {
    const { r } = await liveRegistry();
    epoch += 1;
    clock = 10000;
    await r.dispatch(asked, { replay: true });
    await r.dispatch(answered, { replay: true });
    expect(posts).toHaveLength(0);
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
  });

  it("scripted mode makes no request", async () => {
    const adapter = createConciergeAdapter(playerDeps);
    registry = createRegistry({ adapters: [adapter], emit, getState, subscribe, timeoutMs: 8000, now: () => clock, log: vi.fn() });
    expect(getState().mode).toBe("scripted");
    await playAsked(registry);
    clock = answered.at;
    await registry.dispatch(answered);
    await vi.advanceTimersByTimeAsync(LATENCY_MS * 2);
    expect(fetch).not.toHaveBeenCalled();
    expect(getState().sources[KEY]).toBe("scripted");
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
  });

  it("going back to scripted mode stops the watcher, and it checks the mode itself", async () => {
    const { r, adapter } = await liveRegistry();
    setStoreMode("scripted");
    await playAsked(r);
    expect(posts).toHaveLength(0);
    // Even a watcher still running in scripted mode posts nothing.
    const stop = adapter.start!(() => undefined);
    emit(asked);
    expect(posts).toHaveLength(0);
    stop();
  });

  it("a timeline answer without pc_01 returns [] and the scripted answer plays", async () => {
    picksFor = () => ["pc_07", "pc_03", "pc_05"];
    const { r, log } = await liveRegistry();
    await playAsked(r);
    await vi.advanceTimersByTimeAsync(answered.at - asked.at);
    clock = answered.at;
    const done = r.dispatch(answered);
    await vi.advanceTimersByTimeAsync(LATENCY_MS);
    await done;
    expect(posts).toHaveLength(1);
    expect(getState().sources[KEY]).toBe("scripted");
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
    expect(log.mock.calls.join(" ")).toMatch(/returned nothing/);
  });

  it("a prefetch that fails early plays the scripted answer on time, without a second request", async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      if (url === "/api/b09/concierge") {
        posts.push({ body: JSON.parse(String(init?.body)) as Post["body"], sentAt: Date.now() });
        return Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({}) } as Response);
      }
      return fakeFetch(String(url), init) as Promise<Response>;
    });
    const { r } = await liveRegistry();
    await playAsked(r);
    await vi.advanceTimersByTimeAsync(answered.at - asked.at);
    clock = answered.at;
    await r.dispatch(answered);
    expect(posts).toHaveLength(1);
    expect(getState().sources[KEY]).toBe("scripted");
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
  });

  it("the prefetched fetch still gives up 7.5 s after it started", async () => {
    answers = false;
    const { r } = await liveRegistry();
    await playAsked(r);
    await vi.advanceTimersByTimeAsync(answered.at - asked.at);
    clock = answered.at;
    let settled = false;
    const done = r.dispatch(answered).then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(7500 - (answered.at - asked.at) - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(settled).toBe(true);
    expect(getState().sources[KEY]).toBe("scripted");
    expect(getState().buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
  });

  it("a buyer's own request is unchanged: its own query and language, no pc_01 check, one call per query", async () => {
    picksFor = () => ["pc_02", "pc_04", "pc_06"];
    const { adapter } = await liveRegistry();
    const mine = userEvent("concierge.asked", { query: "something silver for my dad", lang: "zh" });
    // A person's request in the store starts no prefetch: the responder hands it to produce().
    emit(mine);
    expect(posts).toHaveLength(0);
    const out = adapter.produce(mine, getState());
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ query: "something silver for my dad", lang: "zh" });
    expect(posts[0].body.trigger.id).toBe(mine.id);
    await vi.advanceTimersByTimeAsync(LATENCY_MS);
    const events = await out;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "concierge.answered", at: mine.at, source: "live", key: KEY });
    expect((events[0].payload as Payloads["concierge.answered"]).pieceIds).toEqual(["pc_02", "pc_04", "pc_06"]);
    // Asking again, even after a reset, reuses the page's answer.
    epoch += 1;
    const again = await adapter.produce({ ...mine, id: "evt_user_9999" }, getState());
    expect(again).toHaveLength(1);
    expect(posts).toHaveLength(1);
  });
});
