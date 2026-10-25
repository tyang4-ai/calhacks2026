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

/** A deep copy of a payload, so the store never shares nested arrays or objects with an event. */
export function copy<T>(v: T): T {
  return structuredClone(v);
}

/**
 * The newest of two stamped records: next replaces prev unless prev fired later on the player clock.
 * The same payload again keeps prev and its `at`.
 */
export function newest<P extends object>(prev: (P & { at: number }) | undefined | null, payload: P, at: number): P & { at: number } {
  if (prev && at < prev.at && !samePayload(prev, payload)) return prev;
  return stamped(prev ?? undefined, payload, at);
}

/** True when a stamped record holds exactly this payload (its `at` left out). */
function samePayload(prev: object & { at: number }, payload: object): boolean {
  // deepEqual skips keys whose value is undefined, so this compares everything but `at`.
  return deepEqual({ ...prev, at: undefined }, payload);
}

/**
 * A payload with `at` for the store. A repeat of the same payload keeps the earlier `at`, so a
 * duplicate never restamps a record. A changed payload takes the new event's `at`.
 */
export function stamped<P extends object>(prev: (P & { at: number }) | undefined, payload: P, at: number): P & { at: number } {
  if (prev && samePayload(prev, payload)) return { ...payload, at: prev.at };
  return { ...payload, at };
}

/**
 * The ID to keep as "latest": a new record that fired at or after the current latest on the player
 * clock. A repeat of a record already in the store (isNew false) never takes over.
 */
export function latestAt(currentId: string | null, currentAt: number | undefined, id: string, at: number, isNew = true): string {
  if (currentId === null || currentAt === undefined) return id;
  if (!isNew) return currentId;
  return at >= currentAt ? id : currentId;
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
