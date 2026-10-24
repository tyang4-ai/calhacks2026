// loadTimeline(id) finds src/mock/timelines/<id>.ts with import.meta.glob. A missing timeline
// gives an empty one, so the app runs before S2 adds the data.
import type { CindiaEvent } from "../core/events";
import type { Timeline } from "../core/player";

const modules = import.meta.glob<Record<string, unknown>>("../mock/timelines/*.ts", { eager: true });

/** The length an empty timeline runs for: the 60-second demo. */
export const EMPTY_DURATION_MS = 60000;

function isTimeline(v: unknown): v is Timeline {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Timeline).id === "string" &&
    typeof (v as Timeline).durationMs === "number" &&
    Array.isArray((v as Timeline).events)
  );
}

const cache = new Map<string, Timeline>();

/** Finds the Timeline a module exports: its default, an export named after the id, or any Timeline with that id. */
function pick(mod: Record<string, unknown>, id: string): Timeline | undefined {
  const candidates = [mod.default, mod[id], mod.timeline, ...Object.values(mod)];
  return candidates.find((c): c is Timeline => isTimeline(c) && c.id === id) ?? candidates.find(isTimeline);
}

/** Returns the timeline with this id, the same object on every call. */
export function loadTimeline(id: string): Timeline {
  const hit = cache.get(id);
  if (hit) return hit;
  const mod = modules[`../mock/timelines/${id}.ts`];
  const found = mod ? pick(mod, id) : undefined;
  if (mod && !found) console.warn(`[cindia sources] src/mock/timelines/${id}.ts exports no Timeline`);
  const t: Timeline = found ?? { id, durationMs: EMPTY_DURATION_MS, events: [] as CindiaEvent[] };
  cache.set(id, t);
  return t;
}

/** The timeline IDs found in src/mock/timelines/. */
export function timelineIds(): string[] {
  return Object.keys(modules).map((p) => p.replace("../mock/timelines/", "").replace(/\.ts$/, ""));
}
