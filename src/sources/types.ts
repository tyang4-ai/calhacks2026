import type { CindiaEvent, SourceKey } from "../core/events";
import type { CindiaState } from "../core/state";

/** One live adapter: src/sources/live/bNN-<slug>.ts default-exports one of these. */
export interface LiveAdapter {
  key: SourceKey;
  /** GET /api/health and its own check. */
  health(): Promise<boolean>;
  produce(event: CindiaEvent, state: CindiaState): Promise<CindiaEvent[]>;
  /**
   * Optional: push events on its own schedule. Returns a stop function. The registry stamps each
   * pushed event's `at` with the player clock as it arrives.
   */
  start?(emit: (e: CindiaEvent) => void): () => void;
}

/** How long the registry gives produce() by default, and health() always, before it plays the scripted event. */
export const PRODUCE_TIMEOUT_MS = 8000;
/** How long a person waits for a scripted answer, in real time. */
export const REPLY_DELAY_MS = 1200;

/** The keys whose produce() gets longer than the default (events.md, Per-key timeouts). */
const KEY_TIMEOUT_MS: Partial<Record<SourceKey, number>> = {
  "b14-swarm": 20000,
  "b15-watch": 60000,
};

/**
 * How long the registry and the responder give a key's produce(): 8 seconds by default, 20 for
 * b14-swarm and 60 for b15-watch. Each adapter aborts its own call 0.5 seconds earlier.
 */
export function timeoutFor(key: SourceKey): number {
  return KEY_TIMEOUT_MS[key] ?? PRODUCE_TIMEOUT_MS;
}
