// B03 live adapter: the proof panel's score comes from the server, which runs B01's matcher over
// the month's records and checks each planted error in the answer key (api-contract.md, B03).
// On any failure it throws or returns [], and the registry plays the scripted proof.scored.
import type { CindiaEvent } from "../../core/events";
import { answerKey } from "../../mock/answerKey";
import { contracts } from "../../mock/channels";
import { bankTxns, monthId, orders, payouts, refunds, statements } from "../../mock/month";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;

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

function isProofEvent(e: unknown): e is CindiaEvent<"proof.scored"> {
  if (!e || typeof e !== "object") return false;
  const ev = e as { type?: unknown; payload?: unknown };
  if (ev.type !== "proof.scored" || !ev.payload || typeof ev.payload !== "object") return false;
  const p = ev.payload as { caught?: unknown; total?: unknown; results?: unknown };
  return typeof p.caught === "number" && typeof p.total === "number" && Array.isArray(p.results);
}

const adapter: LiveAdapter = {
  key: "b03-proof",

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as { routers?: unknown };
    return Array.isArray(body.routers) && body.routers.includes("b01") && body.routers.includes("b03");
  },

  async produce(event) {
    if (event.type !== "proof.scored") return [];
    const body = {
      trigger: event,
      monthId,
      records: { orders, payouts, refunds, statements, bankTxns, contracts },
      answerKey,
    };
    const out = (await fetchJson(
      "/api/b03/score",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      FETCH_TIMEOUT_MS,
    )) as { events?: unknown };
    if (!Array.isArray(out.events)) return [];
    return out.events.filter(isProofEvent);
  },
};

export default adapter;
