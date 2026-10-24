// Helpers that keep reducers idempotent: writing the same value twice returns the same object.
import type { CindiaEvent, EventType } from "../events";

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao).filter((k) => ao[k] !== undefined);
  const bk = Object.keys(bo).filter((k) => bo[k] !== undefined);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => deepEqual(ao[k], bo[k]));
}

/** Sets map[id] = value, returning the same map when nothing changed. */
export function put<V>(map: Record<string, V>, id: string, value: V): Record<string, V> {
  if (id in map && deepEqual(map[id], value)) return map;
  return { ...map, [id]: value };
}

/** Appends id once. */
export function addId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [...ids, id];
}

/** Appends each id once. */
export function addIds(ids: string[], more: string[]): string[] {
  let out = ids;
  for (const id of more) out = addId(out, id);
  return out;
}

/** Returns prev when next has the same values, so a repeated event changes nothing. */
export function same<S>(prev: S, next: S): S {
  return deepEqual(prev, next) ? prev : next;
}

export type Handlers<S> = { [T in EventType]?: (s: S, e: CindiaEvent<T>) => S };

/** Builds an area reducer from a table of handlers, one per event type. */
export function areaReducer<S>(handlers: Handlers<S>) {
  return (s: S, e: CindiaEvent): S => {
    const h = handlers[e.type] as ((s: S, e: CindiaEvent) => S) | undefined;
    return h ? h(s, e) : s;
  };
}
