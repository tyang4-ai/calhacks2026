// The event log: one entry per event id, newest last, keeping the newest LOG_LIMIT. A status event
// (data.synced, index.synced) replaces the log's earlier entry of its own type instead of adding one,
// so live polling never pushes the tour's events out. The process views and block counts read it.
import { STATUS_EVENT_TYPES, type CindiaEvent } from "../events";
import { LOG_LIMIT, type LogEntry, type LogState } from "../state";

export function logReducer(s: LogState, e: CindiaEvent): LogState {
  if (s.entries.some((x) => x.id === e.id)) return s;
  const entry: LogEntry = { id: e.id, type: e.type, at: e.at, source: e.source };
  if (e.key) entry.key = e.key;
  const kept = STATUS_EVENT_TYPES.includes(e.type) ? s.entries.filter((x) => x.type !== e.type) : s.entries;
  const entries = [...kept, entry];
  return { entries: entries.length > LOG_LIMIT ? entries.slice(entries.length - LOG_LIMIT) : entries };
}
