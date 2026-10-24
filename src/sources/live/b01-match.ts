// B01 live adapter: the month's matches and the gallery flag come from the Python matcher
// (api-contract.md, B01). On the first keyed event of a month it posts the month's records from
// src/mock once and caches the answer. Each scripted match.made or flag.raised is then replaced by
// the live result for the same anchor record, keeping the scripted matchId or flagId so the month
// view lines up. Anything missing, invalid or failed returns [] or throws, and the registry plays
// the scripted event, so the panel keeps its Simulated badge.
import type { CindiaEvent } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { validateEvent } from "../../core/validate";
import { contracts } from "../../mock/channels";
import { bankTxns, monthId as mockMonthId, orders, payouts, refunds, statements } from "../../mock/month";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
/** After a failed post, wait this long before trying the server again, so a dead server costs one try. */
const RETRY_AFTER_MS = 15000;

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

type MonthEvent = CindiaEvent<"match.made"> | CindiaEvent<"flag.raised">;

function isMonthEvent(e: unknown): e is MonthEvent {
  if (!e || typeof e !== "object") return false;
  const ev = e as { type?: unknown };
  if (ev.type !== "match.made" && ev.type !== "flag.raised") return false;
  return validateEvent(e).length === 0;
}

/** The month's records, in the shape data-model.md gives. September plus the early-October payout. */
function recordsFor(month: string) {
  if (month !== mockMonthId) return null;
  return { orders, payouts, refunds, statements, bankTxns, contracts };
}

const cache = new Map<string, Promise<MonthEvent[]>>();
const failedAt = new Map<string, number>();

function liveMonth(month: string, trigger: CindiaEvent): Promise<MonthEvent[]> {
  const hit = cache.get(month);
  if (hit) return hit;
  const last = failedAt.get(month);
  if (last !== undefined && performance.now() - last < RETRY_AFTER_MS) {
    return Promise.reject(new Error("b01 failed recently, playing scripted events"));
  }
  const records = recordsFor(month);
  if (!records) return Promise.resolve([]);
  const p = fetchJson(
    "/api/b01/reconcile",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger, monthId: month, records }) },
    FETCH_TIMEOUT_MS,
  ).then((body) => {
    const events = (body as { events?: unknown }).events;
    if (!Array.isArray(events)) throw new Error("b01 answered without an events list");
    return events.filter(isMonthEvent);
  });
  cache.set(month, p);
  p.catch(() => {
    // Forget a failed answer, so a later run of the month can try again.
    if (cache.get(month) === p) cache.delete(month);
    failedAt.set(month, performance.now());
  });
  return p;
}

/** The live twin of a scripted event: the match on the same payout, or the flag of the same kind on the same statement. */
function twinOf(e: MonthEvent, live: MonthEvent[]): MonthEvent | undefined {
  if (e.type === "match.made") {
    const anchor = e.payload.recordIds[0];
    return live.find((l) => l.type === "match.made" && l.payload.recordIds[0] === anchor);
  }
  const statementId = e.payload.recordIds[1];
  return live.find((l) => l.type === "flag.raised" && l.payload.kind === e.payload.kind && l.payload.recordIds.includes(statementId));
}

const adapter: LiveAdapter = {
  key: "b01-match",

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as { routers?: unknown };
    return Array.isArray(body.routers) && body.routers.includes("b01");
  },

  async produce(event: CindiaEvent, state: CindiaState): Promise<CindiaEvent[]> {
    if (event.type !== "match.made" && event.type !== "flag.raised") return [];
    const scripted = event as MonthEvent;
    const month = state.month.monthId ?? mockMonthId;
    const live = await liveMonth(month, event);
    const twin = twinOf(scripted, live);
    if (!twin) return [];
    if (twin.type === "match.made" && scripted.type === "match.made") {
      return [{ ...twin, at: event.at, key: "b01-match", payload: { ...twin.payload, matchId: scripted.payload.matchId } }];
    }
    if (twin.type === "flag.raised" && scripted.type === "flag.raised") {
      return [{ ...twin, at: event.at, key: "b01-match", payload: { ...twin.payload, flagId: scripted.payload.flagId } }];
    }
    return [];
  },
};

export default adapter;
