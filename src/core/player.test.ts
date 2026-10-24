import { afterEach, describe, expect, it } from "vitest";
import type { CindiaEvent } from "./events";
import { createPlayer, type Timeline } from "./player";
import { getState, reset as resetStore } from "./store";
import { sample } from "./testFixtures";

/** A player on a fake clock: frames run only when the test steps time. */
function fakePlayer() {
  let wall = 0;
  let pending: (() => void) | null = null;
  const dispatched: CindiaEvent[] = [];
  const replays: boolean[] = [];
  const p = createPlayer({
    wallNow: () => wall,
    requestFrame: (cb) => {
      pending = cb;
      return 1;
    },
    cancelFrame: () => {
      pending = null;
    },
    dispatch: (e, opts) => {
      dispatched.push(e);
      replays.push(opts.replay);
    },
  });
  const step = (ms: number, frameMs = 16) => {
    let left = ms;
    while (left > 0) {
      const d = Math.min(frameMs, left);
      wall += d;
      left -= d;
      const cb = pending;
      pending = null;
      cb?.();
    }
  };
  return { p, step, dispatched, replays };
}

const timeline: Timeline = {
  id: "test",
  durationMs: 10000,
  events: [
    sample("beat.started", {}, { at: 0 }),
    sample("piece.opened", {}, { at: 1000 }),
    sample("split.shown", {}, { at: 2000 }),
    sample("order.placed", {}, { at: 5000 }),
  ],
};

afterEach(() => resetStore());

describe("player", () => {
  it("plays events in order on its own clock", () => {
    const { p, step, dispatched } = fakePlayer();
    p.load(timeline);
    p.play();
    expect(p.isPlaying()).toBe(true);
    expect(dispatched.map((e) => e.type)).toEqual(["beat.started"]);
    step(1500);
    expect(p.now()).toBe(1500);
    expect(dispatched.map((e) => e.type)).toEqual(["beat.started", "piece.opened"]);
  });

  it("pauses and keeps its time", () => {
    const { p, step, dispatched } = fakePlayer();
    p.load(timeline);
    p.play();
    step(2500);
    p.pause();
    expect(p.isPlaying()).toBe(false);
    const t = p.now();
    step(5000);
    expect(p.now()).toBe(t);
    expect(dispatched).toHaveLength(3);
  });

  it("speeds up 1, 2, 4 and 8 times", () => {
    for (const x of [1, 2, 4, 8] as const) {
      const { p, step } = fakePlayer();
      p.load(timeline);
      p.setSpeed(x);
      expect(p.getSpeed()).toBe(x);
      p.play();
      step(1000);
      expect(p.now()).toBe(Math.min(10000, 1000 * x));
    }
  });

  it("stops at the end of the timeline", () => {
    const { p, step, dispatched } = fakePlayer();
    p.load(timeline);
    p.setSpeed(8);
    p.play();
    step(3000);
    expect(p.now()).toBe(10000);
    expect(p.isPlaying()).toBe(false);
    expect(dispatched).toHaveLength(4);
  });

  it("seeks: replays every event up to the time at once, marked as a replay", () => {
    const { p, dispatched, replays } = fakePlayer();
    p.load(timeline);
    p.seek(2000);
    expect(p.now()).toBe(2000);
    expect(dispatched.map((e) => e.type)).toEqual(["beat.started", "piece.opened", "split.shown"]);
    expect(replays.every(Boolean)).toBe(true);
    // Seeking back replays from the start again, so the result is deterministic.
    p.seek(1000);
    expect(dispatched.slice(3).map((e) => e.type)).toEqual(["beat.started", "piece.opened"]);
  });

  it("seek through the real store gives the same state as playing", () => {
    resetStore();
    const real = createPlayer({ wallNow: () => 0, requestFrame: () => 1, cancelFrame: () => {} });
    real.load(timeline);
    real.seek(6000);
    const seeked = getState();
    expect(seeked.buyer.orderIds).toEqual(["ord_001"]);
    expect(seeked.clock).toBe(6000);
    real.seek(6000);
    expect(getState().buyer).toEqual(seeked.buyer);
  });

  it("resets the clock to 0 and clears the store", () => {
    resetStore();
    const real = createPlayer({ wallNow: () => 0, requestFrame: () => 1, cancelFrame: () => {} });
    real.load(timeline);
    real.seek(6000);
    const epoch = real.epoch();
    real.reset();
    expect(real.now()).toBe(0);
    expect(real.isPlaying()).toBe(false);
    expect(getState().buyer.orderIds).toEqual([]);
    expect(real.epoch()).toBeGreaterThan(epoch);
  });

  it("restarts from 0 when played at the end", () => {
    const { p, step } = fakePlayer();
    p.load(timeline);
    p.seek(10000);
    p.play();
    step(100);
    expect(p.now()).toBeLessThan(1000);
  });

  it("loading the same timeline twice is a no-op", () => {
    const { p, step } = fakePlayer();
    p.load(timeline);
    p.play();
    step(500);
    p.load(timeline);
    expect(p.isPlaying()).toBe(true);
    expect(p.now()).toBe(500);
  });
});
