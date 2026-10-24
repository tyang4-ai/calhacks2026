// The store: every event goes through emit(). Components read it with useCindia(selector).
import { useCallback, useRef, useSyncExternalStore } from "react";
import type { CindiaEvent } from "./events";
import { rootReducer } from "./reducers";
import { deepEqual } from "./reducers/util";
import { initialState, type CindiaState, type LangSetting, type Mode } from "./state";
import { validateEvent } from "./validate";

let state: CindiaState = initialState();
const listeners = new Set<() => void>();
const eventListeners = new Set<(e: CindiaEvent) => void>();

function notify(): void {
  for (const l of Array.from(listeners)) l();
}

export function getState(): CindiaState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called after every emitted event, after the store has applied it. The sources registry uses it. */
export function onEvent(listener: (e: CindiaEvent) => void): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

/** Adds one event to the store. The player, live adapters and people's actions all go through it. */
export function emit(event: CindiaEvent): void {
  if (import.meta.env?.DEV) {
    const problems = validateEvent(event);
    if (problems.length) console.warn(`[cindia] invalid event ${event.id}: ${problems.join("; ")}`);
  }
  const next = rootReducer(state, event);
  if (next !== state) {
    state = next;
    notify();
  }
  for (const l of Array.from(eventListeners)) l(event);
}

/** Clears everything, settings included. */
export function reset(): void {
  state = initialState();
  notify();
}

/** Clears every event's effect but keeps the person's settings (mode and language). The player uses it. */
export function resetEvents(): void {
  const { mode, lang } = state;
  state = { ...initialState(), mode, lang };
  notify();
}

export function setClock(ms: number): void {
  if (state.clock === ms) return;
  state = { ...state, clock: ms };
  notify();
}

export function setLang(lang: LangSetting): void {
  if (state.lang === lang) return;
  state = { ...state, lang };
  notify();
}

/** Cycles auto, en, zh, then back to auto. */
export function cycleLang(): LangSetting {
  const next: LangSetting = state.lang === "auto" ? "en" : state.lang === "en" ? "zh" : "auto";
  setLang(next);
  return next;
}

/** Sets the store's mode. Use setMode() from src/sources/ so adapters start and stop with it. */
export function setStoreMode(mode: Mode): void {
  if (state.mode === mode) return;
  state = { ...state, mode };
  notify();
}

/**
 * Reads state in a component. The selector may build new objects or arrays: the hook keeps the
 * previous result while it is deeply equal, so a derived selector never loops.
 */
export function useCindia<T>(selector: (s: CindiaState) => T): T {
  const cache = useRef<{
    state: CindiaState | null;
    selector: ((s: CindiaState) => T) | null;
    value: T | undefined;
    has: boolean;
  }>({ state: null, selector: null, value: undefined, has: false });
  const getSnapshot = useCallback((): T => {
    const s = state;
    const c = cache.current;
    if (c.has && c.state === s && c.selector === selector) return c.value as T;
    const v = selector(s);
    c.state = s;
    c.selector = selector;
    if (!c.has || !deepEqual(v, c.value)) {
      c.value = v;
      c.has = true;
    }
    return c.value as T;
  }, [selector]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The store API exposed to tests as window.__cindia.store. */
export const store = { getState, subscribe, reset };
