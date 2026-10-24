// The event player: its own clock on requestAnimationFrame, speeds 1, 2, 4 and 8, and seek()
// that replays every event up to a time at once. Motion reads the player's clock, never wall time.
import { setUserEventClock, type CindiaEvent } from "./events";
import { emit, resetEvents, setClock } from "./store";

export interface Timeline {
  id: string;
  durationMs: number;
  events: CindiaEvent[]; // sorted by `at`
}

export type Speed = 1 | 2 | 4 | 8;

export interface DispatchOptions {
  /** True while seek() replays events at once. Live adapters are skipped for replays. */
  replay: boolean;
}

export interface Player {
  load(timeline: Timeline): void;
  play(): void;
  pause(): void;
  reset(): void;
  seek(ms: number): void;
  setSpeed(x: Speed): void;
  now(): number;
  isPlaying(): boolean;
  // Extras the shell and tests use.
  getSpeed(): Speed;
  getTimeline(): Timeline | null;
  durationMs(): number;
  /** Counts resets, seeks and loads. A pending answer to a person drops itself when this changes. */
  epoch(): number;
  /** Called on every clock change, play, pause, speed change and load. */
  subscribe(listener: () => void): () => void;
  /** Where played events go. The sources registry routes them through live adapters in live mode. */
  setDispatch(fn: (e: CindiaEvent, opts: DispatchOptions) => void): void;
}

export interface PlayerDeps {
  /** Wall clock in ms, used only to advance the player's own clock between frames. */
  wallNow: () => number;
  requestFrame: (cb: () => void) => unknown;
  cancelFrame: (handle: unknown) => void;
  resetStore: () => void;
  setClock: (ms: number) => void;
  dispatch: (e: CindiaEvent, opts: DispatchOptions) => void;
}

function defaultDeps(): PlayerDeps {
  const hasRaf = typeof requestAnimationFrame === "function";
  return {
    wallNow: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
    requestFrame: (cb) => (hasRaf ? requestAnimationFrame(() => cb()) : setTimeout(cb, 16)),
    cancelFrame: (h) => (hasRaf ? cancelAnimationFrame(h as number) : clearTimeout(h as ReturnType<typeof setTimeout>)),
    resetStore: resetEvents,
    setClock,
    dispatch: (e) => emit(e),
  };
}

export function createPlayer(overrides: Partial<PlayerDeps> = {}): Player {
  const deps: PlayerDeps = { ...defaultDeps(), ...overrides };
  let timeline: Timeline | null = null;
  let loadedRef: Timeline | null = null;
  let clock = 0;
  let cursor = 0;
  let playing = false;
  let speed: Speed = 1;
  let lastWall = 0;
  let frame: unknown = null;
  let epochCount = 0;
  let dispatch = deps.dispatch;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const l of Array.from(listeners)) l();
  };
  const duration = () => timeline?.durationMs ?? 0;

  function advance(to: number, replay: boolean): void {
    const events = timeline?.events ?? [];
    while (cursor < events.length && events[cursor].at <= to) {
      const e = events[cursor];
      cursor += 1;
      dispatch(e, { replay });
    }
  }

  function schedule(): void {
    if (frame !== null) return;
    frame = deps.requestFrame(tick);
  }

  function cancel(): void {
    if (frame !== null) deps.cancelFrame(frame);
    frame = null;
  }

  function tick(): void {
    frame = null;
    if (!playing) return;
    const w = deps.wallNow();
    const next = Math.min(duration(), clock + Math.max(0, w - lastWall) * speed);
    lastWall = w;
    clock = next;
    advance(clock, false);
    if (clock >= duration()) playing = false;
    deps.setClock(clock);
    notify();
    if (playing) schedule();
  }

  const player: Player = {
    load(t) {
      // Loading the same timeline object twice is a no-op, so the shell and the stage can both load it.
      if (loadedRef === t) return;
      loadedRef = t;
      cancel();
      playing = false;
      timeline = { ...t, events: t.events.toSorted((a, b) => a.at - b.at) };
      clock = 0;
      cursor = 0;
      epochCount += 1;
      deps.resetStore();
      deps.setClock(0);
      notify();
    },
    play() {
      if (playing) return;
      if (duration() > 0 && clock >= duration()) player.seek(0);
      playing = true;
      lastWall = deps.wallNow();
      // Events at exactly the current time fire at once.
      advance(clock, false);
      notify();
      schedule();
    },
    pause() {
      if (!playing) return;
      // Bank the time since the last frame before stopping.
      const w = deps.wallNow();
      clock = Math.min(duration(), clock + Math.max(0, w - lastWall) * speed);
      lastWall = w;
      advance(clock, false);
      playing = false;
      cancel();
      deps.setClock(clock);
      notify();
    },
    reset() {
      playing = false;
      cancel();
      clock = 0;
      cursor = 0;
      epochCount += 1;
      deps.resetStore();
      deps.setClock(0);
      notify();
    },
    seek(ms) {
      const to = Math.max(0, Math.min(duration(), ms));
      epochCount += 1;
      deps.resetStore();
      clock = to;
      cursor = 0;
      advance(to, true);
      lastWall = deps.wallNow();
      deps.setClock(clock);
      notify();
    },
    setSpeed(x) {
      if (playing) {
        // Bank the time at the old speed first.
        const w = deps.wallNow();
        clock = Math.min(duration(), clock + Math.max(0, w - lastWall) * speed);
        lastWall = w;
      }
      speed = x;
      notify();
    },
    now: () => clock,
    isPlaying: () => playing,
    getSpeed: () => speed,
    getTimeline: () => timeline,
    durationMs: duration,
    epoch: () => epochCount,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setDispatch(fn) {
      dispatch = fn;
    },
  };
  return player;
}

/** The app's one player. */
export const player: Player = createPlayer();
setUserEventClock(() => player.now());
