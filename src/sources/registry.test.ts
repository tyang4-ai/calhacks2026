import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CindiaEvent } from "../core/events";
import { emit, getState, reset, setStoreMode, subscribe } from "../core/store";
import { sample } from "../core/testFixtures";
import { createRegistry } from "./registry";
import type { LiveAdapter } from "./types";

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

async function liveRegistry(adapters: LiveAdapter[]) {
  const log = vi.fn();
  const r = createRegistry({ adapters, emit, getState, subscribe, timeoutMs: 8000, log });
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
});
