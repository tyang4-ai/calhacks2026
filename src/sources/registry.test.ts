import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CindiaEvent } from "../core/events";
import { createPlayer } from "../core/player";
import { emit, getState, onEvent, reset, setStoreMode, subscribe } from "../core/store";
import { sample } from "../core/testFixtures";
import { createRegistry } from "./registry";
import { timeoutFor, type LiveAdapter } from "./types";

function adapter(key: LiveAdapter["key"], produce: LiveAdapter["produce"], extra: Partial<LiveAdapter> = {}): LiveAdapter {
  return { key, health: async () => true, produce, ...extra };
}

const liveSync = (e: CindiaEvent): CindiaEvent[] => [
  { ...e, id: "evt_live_0001", source: "live", payload: { ...(e.payload as object), balanceCents: 999 } } as CindiaEvent,
];

beforeEach(() => {
  reset();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  reset();
});

async function liveRegistry(adapters: LiveAdapter[], now: () => number = () => 0) {
  const log = vi.fn();
  const r = createRegistry({ adapters, emit, getState, subscribe, timeoutMs: 8000, now, log });
  setStoreMode("live");
  await vi.runOnlyPendingTimersAsync();
  await r.refreshHealth();
  return { r, log };
}

describe("registry", () => {
  it("in scripted mode plays every event as written", async () => {
    const produce = vi.fn(async (e: CindiaEvent) => liveSync(e));
    const r = createRegistry({ adapters: [adapter("b04-bank", produce)], emit, getState, subscribe });
    await r.dispatch(sample("account.synced"));
    expect(produce).not.toHaveBeenCalled();
    expect(getState().money.accounts.acct_studio.balanceCents).toBe(1215648);
    expect(getState().sources["b04-bank"]).toBe("scripted");
    r.dispose();
  });

  it("a healthy adapter that succeeds replaces the scripted event", async () => {
    const { r } = await liveRegistry([adapter("b04-bank", async (e) => liveSync(e))]);
    await r.dispatch(sample("account.synced"));
    expect(getState().money.accounts.acct_studio.balanceCents).toBe(999);
    expect(getState().sources["b04-bank"]).toBe("live");
    r.dispose();
  });

  it("an adapter that times out falls back to the scripted event after 8 seconds", async () => {
    const { r, log } = await liveRegistry([adapter("b04-bank", () => new Promise<CindiaEvent[]>(() => {}))]);
    const done = r.dispatch(sample("account.synced"));
    await vi.advanceTimersByTimeAsync(7999);
    expect(getState().money.latestAccountId).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(getState().money.accounts.acct_studio.balanceCents).toBe(1215648);
    expect(getState().sources["b04-bank"]).toBe("scripted");
    expect(log.mock.calls.join(" ")).toMatch(/timeout/);
    r.dispose();
  });

  it("an adapter that throws falls back to the scripted event", async () => {
    const { r, log } = await liveRegistry([
      adapter("b04-bank", async () => {
        throw new Error("boom");
      }),
    ]);
    await r.dispatch(sample("account.synced"));
    expect(getState().money.accounts.acct_studio.balanceCents).toBe(1215648);
    expect(getState().sources["b04-bank"]).toBe("scripted");
    expect(log.mock.calls.join(" ")).toMatch(/boom/);
    r.dispose();
  });

  it("an adapter that returns nothing falls back to the scripted event", async () => {
    const { r } = await liveRegistry([adapter("b04-bank", async () => [])]);
    await r.dispatch(sample("account.synced"));
    expect(getState().money.accounts.acct_studio.balanceCents).toBe(1215648);
    expect(getState().sources["b04-bank"]).toBe("scripted");
    r.dispose();
  });

  it("an unhealthy adapter is never asked", async () => {
    const produce = vi.fn(async (e: CindiaEvent) => liveSync(e));
    const { r } = await liveRegistry([adapter("b04-bank", produce, { health: async () => false })]);
    await r.dispatch(sample("account.synced"));
    expect(produce).not.toHaveBeenCalled();
    expect(getState().sources["b04-bank"]).toBe("scripted");
    r.dispose();
  });

  it("replays from seek() never call adapters", async () => {
    const produce = vi.fn(async (e: CindiaEvent) => liveSync(e));
    const { r } = await liveRegistry([adapter("b04-bank", produce)]);
    await r.dispatch(sample("account.synced"), { replay: true });
    expect(produce).not.toHaveBeenCalled();
    r.dispose();
  });

  it("starts an adapter with start() in live mode and stops it back in scripted mode", async () => {
    const stop = vi.fn();
    const start = vi.fn((push: (e: CindiaEvent) => void) => {
      push(sample("approval.requested", {}, { id: "evt_x" }));
      return stop;
    });
    const { r } = await liveRegistry([adapter("b08-approvals", async () => [], { start })]);
    expect(start).toHaveBeenCalledTimes(1);
    expect(getState().sources["b08-approvals"]).toBe("live");
    expect(getState().approvals.items.apr_01.requested).toBe(true);
    // A second health check doesn't start it twice.
    await r.refreshHealth();
    expect(start).toHaveBeenCalledTimes(1);
    setStoreMode("scripted");
    expect(stop).toHaveBeenCalledTimes(1);
    r.dispose();
  });

  it("stamps each event pushed through start(emit) with the player's time as it arrives", async () => {
    let clock = 0;
    let push: ((e: CindiaEvent) => void) | null = null;
    const start = (p: (e: CindiaEvent) => void) => {
      push = p;
      return () => {
        push = null;
      };
    };
    const { r } = await liveRegistry([adapter("b04-bank", async () => [], { start })], () => clock);
    expect(push).not.toBeNull();
    // The adapter hands over an event with at: 0 while the player is at 42.1 seconds.
    clock = 42137.4;
    push!(sample("money.moved", {}, { at: 0, id: "evt_live_s001" }));
    expect(getState().money.moves.mv_0001.at).toBe(42137);
    expect(getState().log.entries.find((x) => x.id === "evt_live_s001")).toMatchObject({ at: 42137, source: "live", key: "b04-bank" });
    r.dispose();
  });
});

/** Resolves with value after ms on the (fake) timers. */
function later<T>(ms: number, value: T): Promise<T> {
  return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
}

/** A live copy of a scripted event, with some payload fields changed. */
function liveCopy(e: CindiaEvent, id: string, patch: Record<string, unknown>): CindiaEvent[] {
  return [{ ...e, id, source: "live", payload: { ...(e.payload as object), ...patch } } as CindiaEvent];
}

describe("per-key timeouts", () => {
  it("gives b14-swarm 20 seconds: an answer at 15 seconds is used", async () => {
    const { r } = await liveRegistry([
      adapter("b14-swarm", (e) => later(15000, liveCopy(e, "evt_live_1401", { reply: { en: "Live reply", zh: "实时回答" } }))),
    ]);
    const done = r.dispatch(sample("support.answered"));
    await vi.advanceTimersByTimeAsync(14999);
    expect(getState().support.threads.thr_01).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(getState().support.threads.thr_01.messages.map((m) => m.kind === "answered" && m.reply.en)).toEqual(["Live reply"]);
    expect(getState().sources["b14-swarm"]).toBe("live");
    r.dispose();
  });

  it("gives b15-watch 60 seconds: an answer at 59 seconds is used", async () => {
    const { r } = await liveRegistry([adapter("b15-watch", (e) => later(59000, liveCopy(e, "evt_live_1501", { engine: "apify" })))]);
    const done = r.dispatch(sample("watch.scanned"));
    await vi.advanceTimersByTimeAsync(59000);
    await done;
    expect(getState().watch.scans.wsc_01.engine).toBe("apify");
    expect(getState().sources["b15-watch"]).toBe("live");
    r.dispose();
  });

  it("gives b01-match the default 8 seconds: an answer at 9 seconds is too late, so the scripted event plays", async () => {
    const { r, log } = await liveRegistry([adapter("b01-match", (e) => later(9000, liveCopy(e, "evt_live_0101", { kind: "bundled" })))]);
    const done = r.dispatch(sample("match.made"));
    await vi.advanceTimersByTimeAsync(7999);
    expect(getState().month.matchIds).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(getState().month.matches.mat_001.kind).toBe("one_to_one");
    expect(getState().sources["b01-match"]).toBe("scripted");
    await vi.advanceTimersByTimeAsync(2000);
    expect(getState().month.matches.mat_001.kind).toBe("one_to_one");
    expect(log.mock.calls.join(" ")).toMatch(/timeout after 8000 ms/);
    r.dispose();
  });

  it("drops a produce() answer, and its fallback, when a seek happens while it waits", async () => {
    const p = createPlayer({ wallNow: () => 0, requestFrame: () => 1, cancelFrame: () => {} });
    p.load({ id: "t", durationMs: 60000, events: [] });
    const log = vi.fn();
    const slowLive = adapter("b09-concierge", (e) => later(3000, liveCopy(e, "evt_live_0901", { query: "live" })));
    const slowFail = adapter("b04-bank", () => later(3000, 0).then(() => Promise.reject(new Error("boom"))));
    const r = createRegistry({ adapters: [slowLive, slowFail], emit, getState, subscribe, timeoutMs: 8000, now: () => 0, epoch: () => p.epoch(), log });
    setStoreMode("live");
    await vi.runOnlyPendingTimersAsync();
    await r.refreshHealth();
    const seen: CindiaEvent[] = [];
    const off = onEvent((e) => seen.push(e));

    const answered = r.dispatch(sample("concierge.answered"));
    const failed = r.dispatch(sample("account.synced"));
    await vi.advanceTimersByTimeAsync(1000);
    p.seek(5000);
    await vi.advanceTimersByTimeAsync(3000);
    await answered;
    await failed;
    expect(seen).toEqual([]);
    expect(getState().buyer.concierge).toBeNull();
    expect(getState().money.latestAccountId).toBeNull();
    expect(log.mock.calls.join(" ")).toMatch(/after a reset or seek, dropped/);

    // With no seek, the same wait is used.
    const again = r.dispatch(sample("concierge.answered"));
    await vi.advanceTimersByTimeAsync(3000);
    await again;
    expect(getState().buyer.concierge?.query).toBe("live");
    off();
    r.dispose();
  });

  it("timeoutFor gives 8 seconds by default, 20 for b14-swarm and 60 for b15-watch", () => {
    expect(timeoutFor("b01-match")).toBe(8000);
    expect(timeoutFor("b12-search")).toBe(8000);
    expect(timeoutFor("b14-swarm")).toBe(20000);
    expect(timeoutFor("b15-watch")).toBe(60000);
  });
});
