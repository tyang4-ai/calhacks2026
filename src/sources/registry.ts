// The sources registry. It finds live adapters in src/sources/live/ with import.meta.glob, starts
// and stops them with the mode, and in live mode lets an adapter replace the scripted event for its key.
// produce() gets each key's own timeout (timeoutFor), and events an adapter pushes through
// start(emit) take `at` from the player clock as they arrive, here and nowhere else.
import { SOURCE_KEYS, type CindiaEvent, type SourceKey } from "../core/events";
import { player, type DispatchOptions } from "../core/player";
import type { CindiaState, Mode } from "../core/state";
import { emit as storeEmit, getState as storeGetState, subscribe as storeSubscribe } from "../core/store";
import { PRODUCE_TIMEOUT_MS, timeoutFor as defaultTimeoutFor, type LiveAdapter } from "./types";

export type { LiveAdapter } from "./types";

export interface RegistryDeps {
  adapters: LiveAdapter[];
  emit: (e: CindiaEvent) => void;
  getState: () => CindiaState;
  subscribe: (l: () => void) => () => void;
  /** How long health() gets. */
  timeoutMs: number;
  /** How long produce() gets, per key. */
  timeoutFor: (key: SourceKey) => number;
  /** The player clock, for the `at` of events pushed through start(emit). */
  now: () => number;
  /** The player's epoch. A produce() result, or its fallback, is dropped when it changed meanwhile. */
  epoch: () => number;
  log: (msg: string) => void;
}

export interface Registry {
  /** The player's dispatch: plays the scripted event, or the live adapter's events in live mode. */
  dispatch(e: CindiaEvent, opts?: DispatchOptions): Promise<void>;
  /** The healthy adapter for a key in live mode, or undefined. */
  adapterFor(key: SourceKey): LiveAdapter | undefined;
  /** Calls every adapter's health() and starts or stops adapters to match. */
  refreshHealth(): Promise<Record<SourceKey, boolean>>;
  health(): Record<SourceKey, boolean>;
  onHealth(l: () => void): () => void;
  adapters(): LiveAdapter[];
  /** Stops watching the mode and stops every started adapter. */
  dispose(): void;
}

let liveCounter = 0;

/** Marks an adapter's event as live, with an evt_live_ ID and the adapter's key when it has none. */
export function asLive(e: CindiaEvent, key: SourceKey): CindiaEvent {
  let id = e.id;
  if (typeof id !== "string" || !id.startsWith("evt_live_")) {
    liveCounter += 1;
    id = `evt_live_c${String(liveCounter).padStart(4, "0")}`;
  }
  return { ...e, id, source: "live", key: e.key ?? key };
}

/** Runs p with a timeout. Rejects with "timeout" when it takes longer. */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err: unknown) => {
        clearTimeout(t);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

function emptyHealth(): Record<SourceKey, boolean> {
  const h = {} as Record<SourceKey, boolean>;
  for (const k of SOURCE_KEYS) h[k] = false;
  return h;
}

export function createRegistry(overrides: Partial<RegistryDeps> = {}): Registry {
  const deps: RegistryDeps = {
    adapters: [],
    emit: storeEmit,
    getState: storeGetState,
    subscribe: storeSubscribe,
    timeoutMs: PRODUCE_TIMEOUT_MS,
    timeoutFor: defaultTimeoutFor,
    now: () => player.now(),
    epoch: () => player.epoch(),
    log: (msg) => console.warn(`[cindia sources] ${msg}`),
    ...overrides,
  };
  let health = emptyHealth();
  const healthListeners = new Set<() => void>();
  const stops = new Map<SourceKey, () => void>();
  let mode: Mode = deps.getState().mode;
  let checking: Promise<Record<SourceKey, boolean>> | null = null;

  const byKey = new Map<SourceKey, LiveAdapter>();
  for (const a of deps.adapters) {
    if (byKey.has(a.key)) deps.log(`two adapters for ${a.key}, using the first`);
    else byKey.set(a.key, a);
  }

  const notifyHealth = () => {
    for (const l of Array.from(healthListeners)) l();
  };

  function startHealthy(): void {
    if (mode !== "live") return;
    for (const a of byKey.values()) {
      if (!a.start || !health[a.key] || stops.has(a.key)) continue;
      try {
        // Streamed events light up when they land: their `at` is the player clock at arrival.
        const stop = a.start((e) => deps.emit({ ...asLive(e, a.key), at: Math.round(deps.now()) }));
        stops.set(a.key, stop);
      } catch (err) {
        deps.log(`${a.key} start() failed: ${String(err)}`);
      }
    }
  }

  function stopAll(): void {
    for (const [key, stop] of stops) {
      try {
        stop();
      } catch (err) {
        deps.log(`${key} stop failed: ${String(err)}`);
      }
    }
    stops.clear();
  }

  async function refreshHealth(): Promise<Record<SourceKey, boolean>> {
    if (checking) return checking;
    checking = (async () => {
      const next = emptyHealth();
      await Promise.all(
        [...byKey.values()].map(async (a) => {
          try {
            next[a.key] = Boolean(await withTimeout(a.health(), deps.timeoutMs));
          } catch {
            next[a.key] = false;
          }
        }),
      );
      health = next;
      // An adapter that went unhealthy is stopped.
      for (const [key, stop] of Array.from(stops)) {
        if (!health[key]) {
          stop();
          stops.delete(key);
        }
      }
      startHealthy();
      notifyHealth();
      return health;
    })();
    try {
      return await checking;
    } finally {
      checking = null;
    }
  }

  const unsubscribe = deps.subscribe(() => {
    const m = deps.getState().mode;
    if (m === mode) return;
    mode = m;
    if (mode === "live") void refreshHealth();
    else stopAll();
  });

  function adapterFor(key: SourceKey): LiveAdapter | undefined {
    if (mode !== "live" || !health[key]) return undefined;
    return byKey.get(key);
  }

  async function dispatch(e: CindiaEvent, opts: DispatchOptions = { replay: false }): Promise<void> {
    const adapter = e.key && !opts.replay ? adapterFor(e.key) : undefined;
    if (!adapter) {
      deps.emit(e);
      return;
    }
    // A reset, seek or load while produce() waits starts a new run: the old answer, live or the
    // scripted fallback, never lands in it. The seek replays the timeline's own events itself.
    const epoch = deps.epoch();
    const stale = () => {
      if (deps.epoch() === epoch) return false;
      deps.log(`${adapter.key} answered ${e.type} after a reset or seek, dropped`);
      return true;
    };
    try {
      const out = await withTimeout(adapter.produce(e, deps.getState()), deps.timeoutFor(adapter.key));
      if (stale()) return;
      if (!Array.isArray(out) || out.length === 0) {
        deps.log(`${adapter.key} returned nothing for ${e.type}, playing the scripted event`);
        deps.emit(e);
        return;
      }
      for (const live of out) deps.emit(asLive(live, adapter.key));
    } catch (err) {
      if (stale()) return;
      deps.log(`${adapter.key} failed for ${e.type} (${err instanceof Error ? err.message : String(err)}), playing the scripted event`);
      deps.emit(e);
    }
  }

  return {
    dispatch,
    adapterFor,
    refreshHealth,
    health: () => health,
    onHealth(l) {
      healthListeners.add(l);
      return () => {
        healthListeners.delete(l);
      };
    },
    adapters: () => [...byKey.values()],
    dispose() {
      unsubscribe();
      stopAll();
    },
  };
}

/** Every adapter in src/sources/live/, each file's default export. An empty folder is fine. */
export function discoverAdapters(): LiveAdapter[] {
  const mods = import.meta.glob<{ default?: LiveAdapter }>(["./live/*.ts", "!./live/*.test.ts"], { eager: true });
  const out: LiveAdapter[] = [];
  for (const [path, mod] of Object.entries(mods)) {
    const a = mod.default;
    if (a && typeof a.key === "string" && typeof a.health === "function" && typeof a.produce === "function") out.push(a);
    else console.warn(`[cindia sources] ${path} has no LiveAdapter default export, skipped`);
  }
  return out;
}

let appRegistry: Registry | null = null;

/** The app's registry, created on first use with the adapters found in src/sources/live/. */
export function getRegistry(): Registry {
  if (!appRegistry) appRegistry = createRegistry({ adapters: discoverAdapters() });
  return appRegistry;
}
