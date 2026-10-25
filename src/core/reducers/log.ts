// The event log: one entry per event id, newest last, keeping the newest LOG_LIMIT. A status event
// (data.synced, index.synced) replaces the log's earlier entry of its own type instead of adding one,
// so live polling never pushes the tour's events out. The process views and block counts read it.
import { STATUS_EVENT_TYPES, type CindiaEvent } from "../events";
import { LOG_LIMIT, type LogEntry, type LogState } from "../state";

export function logReducer(s: LogState, e: CindiaEvent): LogState {
  if (s.entries.some((x) => x.id === e.id)) return s;
  const status = STATUS_EVENT_TYPES.includes(e.type);
  if (status) {
    // A status event older than the kept entry of its type is ignored, as sync keeps the newer
    // payload. Otherwise a timeline with two of one type, replayed into the same store, would put
    // the older one back and move the newer one to the end.
    const kept = s.entries.find((x) => x.type === e.type);
    if (kept && e.at < kept.at) return s;
  }
  const entry: LogEntry = { id: e.id, type: e.type, at: e.at, source: e.source };
  if (e.key) entry.key = e.key;
  const kept = status ? s.entries.filter((x) => x.type !== e.type) : s.entries;
  const entries = [...kept, entry];
  return { entries: entries.length > LOG_LIMIT ? entries.slice(entries.length - LOG_LIMIT) : entries };
}
