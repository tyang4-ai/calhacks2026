// B02 live adapter: Claude explains the catch and drafts the follow-up (api-contract.md, B02).
// On the scripted flag.explained for flg_01 it posts the flag, its three records from src/mock,
// followUpId and approvalId once, caches the promise, and returns the live flag.explained. On the
// scripted followup.drafted for fup_01 it returns the live twin from the same response, starting
// the call then if none is cached. followup.sent stays simulated, so it always returns []. Anything
// missing, invalid or failed throws or returns [], and the registry plays the scripted event.
import type { CindiaEvent } from "../../core/events";
import { validateEvent } from "../../core/validate";
import { galleryContract } from "../../mock/channels";
import { followUp, galleryDeposit, galleryFlag, galleryStatement } from "../../mock/month";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
const KEY = "b02-explain" as const;

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

/** The one call per page load. A failed call is forgotten, so the next trigger may try again. */
let pending: Promise<CindiaEvent[]> | null = null;

function explain(trigger: CindiaEvent): Promise<CindiaEvent[]> {
  if (pending) return pending;
  const body = {
    trigger,
    flagId: galleryFlag.id,
    flag: galleryFlag,
    contract: galleryContract,
    statement: galleryStatement,
    bankTxn: galleryDeposit,
    followUpId: followUp.id,
    approvalId: followUp.approvalId,
    to: followUp.to,
  };
  const p = fetchJson(
    "/api/b02/explain",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    FETCH_TIMEOUT_MS,
  ).then((out) => {
    const events = (out as { events?: unknown }).events;
    if (!Array.isArray(events)) throw new Error("b02 answered without events");
    return events as CindiaEvent[];
  });
  pending = p;
  p.catch(() => {
    if (pending === p) pending = null;
  });
  return p;
}

/** The live event of the trigger's type for the same flag or follow-up, timed to the trigger. */
function twin(trigger: CindiaEvent, events: CindiaEvent[]): CindiaEvent[] {
  const a = trigger.payload as unknown as Record<string, unknown>;
  const found = events.find((e) => {
    if (!e || e.type !== trigger.type || validateEvent(e).length > 0) return false;
    const b = e.payload as unknown as Record<string, unknown>;
    if (trigger.type === "flag.explained") return b.flagId === a.flagId;
    return b.followUpId === a.followUpId && b.approvalId === a.approvalId;
  });
  return found ? [{ ...found, at: trigger.at, source: "live" as const, key: KEY }] : [];
}

const adapter: LiveAdapter = {
  key: KEY,

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as {
      routers?: unknown;
      keys?: { anthropic?: unknown };
    };
    return Array.isArray(body.routers) && body.routers.includes("b02") && body.keys?.anthropic === true;
  },

  async produce(event) {
    const p = event.payload as unknown as Record<string, unknown>;
    if (event.type === "flag.explained" && p.flagId === galleryFlag.id) {
      return twin(event, await explain(event));
    }
    if (event.type === "followup.drafted" && p.followUpId === followUp.id) {
      return twin(event, await explain(event));
    }
    // followup.sent and anything else: sending stays simulated, so the scripted event plays.
    return [];
  },
};

export default adapter;
