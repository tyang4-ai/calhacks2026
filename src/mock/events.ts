// Helpers that build scripted events for the timelines and the scenario replies. Each event gets
// the key events.md gives its type, unless the caller names another (the scenario's b05-scenario).
import { EVENT_KEYS, type CindiaEvent, type EventType, type Payloads, type SourceKey } from "../core/events";
import { pad } from "./util";

export interface Draft {
  type: EventType;
  at: number;
  payload: Payloads[EventType];
  key?: SourceKey;
}

export function draft<T extends EventType>(type: T, at: number, payload: Payloads[T], key?: SourceKey): Draft {
  const k = key ?? EVENT_KEYS[type];
  return k ? { type, at: Math.round(at), payload, key: k } : { type, at: Math.round(at), payload };
}

/** Sorts by `at` (stable, so same-time events keep their written order) and numbers the IDs. */
export function finalize(drafts: Draft[], idPrefix: string): CindiaEvent[] {
  return drafts
    .map((d, i) => ({ d, i }))
    .toSorted((a, b) => a.d.at - b.d.at || a.i - b.i)
    .map(({ d }, n) => {
      const e: CindiaEvent = { id: `${idPrefix}${pad(n + 1, 4)}`, type: d.type, at: d.at, source: "scripted", payload: d.payload };
      if (d.key) e.key = d.key;
      return e;
    });
}

/** The act_ IDs count up in firing order across both timelines. */
export function actId(n: number): string {
  return `act_${pad(n, 4)}`;
}
