// B10 live adapter: the buyer's price split and receipt, each maker statement and the impact numbers
// are recomputed on the server from the records with the money rules (api-contract.md, B10). On a
// scripted split.shown, receipt.updated, statement.issued or impact.updated it posts the trigger and
// the records from src/mock, with each maker payout marked `sent` (and dated) once the store holds
// its payout.sent, because the dataset has them as `proposed`. That way the receipt at d11-receipt
// reads paid. Anything missing, invalid or failed throws or returns [], and the registry plays the
// scripted event.
import type { CindiaEvent, EventType } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { validateEvent } from "../../core/validate";
import { pieces } from "../../mock/catalog";
import { contracts } from "../../mock/channels";
import { ledger, makerPayouts, orders, payouts } from "../../mock/month";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
const TYPES: readonly EventType[] = ["split.shown", "receipt.updated", "statement.issued", "impact.updated"];

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

/** The maker payouts as the store knows them: `sent`, with the payout's date, once payout.sent arrived. */
function makerPayoutsFor(state: CindiaState) {
  const sent = state.approvals.payouts;
  return makerPayouts.map((mp) => {
    const p = sent[mp.id];
    return p ? { ...mp, status: "sent" as const, date: p.date } : { ...mp };
  });
}

/** The live event must be the trigger's own type and, for IDs the screens key on, the same ID. */
function sameSubject(trigger: CindiaEvent, e: CindiaEvent): boolean {
  const a = trigger.payload as unknown as Record<string, unknown>;
  const b = e.payload as unknown as Record<string, unknown>;
  switch (trigger.type) {
    case "split.shown":
      return a.pieceId === b.pieceId;
    case "receipt.updated":
      return a.orderId === b.orderId;
    case "statement.issued":
      return a.makerStatementId === b.makerStatementId && a.makerId === b.makerId;
    case "impact.updated":
      return a.impactId === b.impactId;
    default:
      return false;
  }
}

const adapter: LiveAdapter = {
  key: "b10-derived",

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as { routers?: unknown };
    return Array.isArray(body.routers) && body.routers.includes("b10");
  },

  async produce(event, state) {
    if (!TYPES.includes(event.type)) return [];
    const body = {
      trigger: event,
      records: { catalog: pieces, orders, payouts, makerPayouts: makerPayoutsFor(state), ledger, contracts },
    };
    const out = (await fetchJson(
      "/api/b10/derive",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      FETCH_TIMEOUT_MS,
    )) as { events?: unknown };
    if (!Array.isArray(out.events)) return [];
    return (out.events as CindiaEvent[])
      .filter((e) => e && e.type === event.type && validateEvent(e).length === 0 && sameSubject(event, e))
      .map((e) => ({ ...e, at: event.at, source: "live" as const, key: "b10-derived" as const }));
  },
};

export default adapter;
