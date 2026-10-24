// Everything features and the shell may import from the sources.
import { player } from "../core/player";
import { emit, getState, onEvent } from "../core/store";
import { mockAnswers } from "./mockAnswers";
import { getRegistry } from "./registry";
import { createResponder, REQUEST_DEFAULTS, type Responder } from "./requests";
import { loadScripted } from "./scripted";

export type { LiveAdapter } from "./types";
export { PRODUCE_TIMEOUT_MS, REPLY_DELAY_MS } from "./types";
export { createRegistry, getRegistry, asLive, withTimeout, type Registry } from "./registry";
export { createResponder, normalizeQuestion, scriptedAnswer, type MockAnswers, type Responder } from "./requests";
export { loadTimeline, timelineIds } from "./timelines";
export { loadScripted, playScripted } from "./scripted";
export { setMode, toggleMode, useMode, useSourceHealth } from "./mode";

let responder: Responder | null = null;

/**
 * Wires the sources once at startup: the player plays through the registry, the responder answers
 * people's requests, and the demo timeline is loaded so the controls work on every route.
 */
export function installSources(): void {
  if (responder) return;
  const registry = getRegistry();
  player.setDispatch((e, opts) => void registry.dispatch(e, opts));
  responder = createResponder({
    emit,
    getState,
    onEvent,
    adapterFor: (k) => registry.adapterFor(k),
    mock: mockAnswers,
    now: () => player.now(),
    epoch: () => player.epoch(),
    delayMs: REQUEST_DEFAULTS.delayMs,
    timeoutMs: REQUEST_DEFAULTS.timeoutMs,
    log: (msg) => console.warn(`[cindia sources] ${msg}`),
  });
  loadScripted("demo");
}
