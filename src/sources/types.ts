import type { CindiaEvent, SourceKey } from "../core/events";
import type { CindiaState } from "../core/state";

/** One live adapter: src/sources/live/bNN-<slug>.ts default-exports one of these. */
export interface LiveAdapter {
  key: SourceKey;
  /** GET /api/health and its own check. */
  health(): Promise<boolean>;
  produce(event: CindiaEvent, state: CindiaState): Promise<CindiaEvent[]>;
  /** Optional: push events on its own schedule. Returns a stop function. */
  start?(emit: (e: CindiaEvent) => void): () => void;
}

/** How long the registry gives produce() before it plays the scripted event. */
export const PRODUCE_TIMEOUT_MS = 8000;
/** How long a person waits for a scripted answer, in real time. */
export const REPLY_DELAY_MS = 1200;
