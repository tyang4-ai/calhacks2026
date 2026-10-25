// The process overlay on routes lives in the URL: ?process=<processId> on any route. An unknown
// process ID is ignored. Every ID in PROCESS_IDS works, data included.
import { useSearchParams } from "react-router";
import { PROCESS_IDS, type ProcessId } from "../core/events";

/** The open process in a query, or null when there's none or it isn't one of PROCESS_IDS. */
export function parseProcess(params: URLSearchParams): ProcessId | null {
  const raw = params.get("process");
  return raw !== null && (PROCESS_IDS as readonly string[]).includes(raw) ? (raw as ProcessId) : null;
}

/** The query with that process open, or with none for null. Every other parameter stays. */
export function withProcess(params: URLSearchParams, processId: ProcessId | null): URLSearchParams {
  const next = new URLSearchParams(params);
  if (processId) next.set("process", processId);
  else next.delete("process");
  return next;
}

/** The route's open process view, or null. */
export function useProcessParam(): ProcessId | null {
  const [params] = useSearchParams();
  return parseProcess(params);
}
