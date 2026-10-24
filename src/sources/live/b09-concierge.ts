// B09 live adapter: the gift finder's three picks come from Claude on the server (api-contract.md,
// B09). On the demo timeline's keyed concierge.answered it posts that event's query, and on a
// buyer's own concierge.asked (source "user", passed on by the registry in live mode) it posts the
// buyer's query. Either way it sends the twelve catalog pieces from src/mock with each maker's name.
// The next scripted beat opens pc_01, so a timeline answer without pc_01 returns [] and the curated
// set plays; a buyer's own request skips that check. Anything missing, invalid or failed throws or
// returns [], and the registry plays the scripted answer.
import type { CindiaEvent, Payloads } from "../../core/events";
import type { Lang } from "../../core/types";
import { validateEvent } from "../../core/validate";
import { pieces } from "../../mock/catalog";
import { makers } from "../../mock/people";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
const KEY = "b09-concierge" as const;
/** The piece the demo's next scripted beat opens. */
const DEMO_PIECE = "pc_01";

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

/** The catalog as the server reads it: each piece's own fields plus its maker's name. */
function catalog() {
  const names = new Map(makers.map((m) => [m.id, m.name]));
  return pieces.map((p) => ({
    id: p.id,
    title: p.title,
    makerId: p.makerId,
    maker: names.get(p.makerId) ?? null,
    kind: p.kind,
    hours: p.hours,
    priceCents: p.priceCents,
    story: p.story,
    heritage: p.heritage,
  }));
}

/** One call per query and page load, so seeking back never calls Claude again. A failure is forgotten. */
const cache = new Map<string, Promise<CindiaEvent[]>>();

function ask(trigger: CindiaEvent, query: string, lang: Lang): Promise<CindiaEvent[]> {
  const cacheKey = `${lang}\u0000${query}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const body = { trigger, query, lang, catalog: catalog() };
  const p = fetchJson(
    "/api/b09/concierge",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    FETCH_TIMEOUT_MS,
  ).then((out) => {
    const events = (out as { events?: unknown }).events;
    if (!Array.isArray(events)) throw new Error("b09 answered without events");
    return events as CindiaEvent[];
  });
  cache.set(cacheKey, p);
  p.catch(() => {
    if (cache.get(cacheKey) === p) cache.delete(cacheKey);
  });
  return p;
}

/** The valid live concierge.answered for this query, timed to the trigger, or []. */
function answerFor(trigger: CindiaEvent, query: string, events: CindiaEvent[], needDemoPiece: boolean): CindiaEvent[] {
  const ids = new Set(pieces.map((p) => p.id));
  const found = events.find((e) => {
    if (!e || e.type !== "concierge.answered" || validateEvent(e).length > 0) return false;
    const p = e.payload as Payloads["concierge.answered"];
    if (p.query !== query) return false;
    if (new Set(p.pieceIds).size !== 3 || !p.pieceIds.every((id) => ids.has(id) && p.reasons[id])) return false;
    return !needDemoPiece || p.pieceIds.includes(DEMO_PIECE);
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
    return Array.isArray(body.routers) && body.routers.includes("b09") && body.keys?.anthropic === true;
  },

  async produce(event) {
    if (event.type === "concierge.answered" && event.source === "scripted") {
      // The demo timeline's answer: the next beat opens pc_01, so the live picks must include it.
      const query = (event.payload as Payloads["concierge.answered"]).query;
      return answerFor(event, query, await ask(event, query, "en"), true);
    }
    if (event.type === "concierge.asked" && event.source === "user") {
      // A buyer's own request: whatever three pieces Claude picks for it.
      const q = event.payload as Payloads["concierge.asked"];
      return answerFor(event, q.query, await ask(event, q.query, q.lang), false);
    }
    return [];
  },
};

export default adapter;
