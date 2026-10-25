// B14 live adapter: the agent swarm answers people's own support questions, listings and storefront
// drafts on the server (api-contract.md, B14; docs/plans/B14-swarm.md, Adapter). It calls only
// /api/b14/... on localhost. Claude and the key stay on the server.
//
// health(): GET /api/health lists b14 and keys.anthropic is true.
// produce(event, state):
//   - a person's support.asked: POST /api/b14/support with that side's records only (the buyer gets
//     the catalog, communities, policy, index entries, the roster, the makers of the pieces on screen
//     and only the orders on screen, without a buyer's ID; the seller also gets the co-op's orders,
//     payouts, maker payouts, maker statements and flags), the runId and the reserved IDs.
//   - a person's listing.requested: POST /api/b14/listing with the notes, the maker, the maker's
//     community and the vibe vocabulary from src/mock.
//   - a person's storefront.requested: POST /api/b14/storefront with that storefront's community and
//     its pieces.
//   - a person's question.answered (the maker's reply on her page): [] at once, so the scripted
//     relay run plays. There is no live loop back from the maker yet.
//   - the tour's keyed events (swarm.step, support.answered, listing.drafted, listing.indexed,
//     question.forwarded, question.answered, storefront.drafted): [] at once with no call, so the
//     tour plays scripted and on time in both modes.
// IDs: runId is run_user_<pageTag()>_<n>, and idStart the first number liveIdStart() reserved per
// prefix: 40 steps, 3 checks, 1 approval, 1 piece, 6 blocks and 1 question per run, so two pending
// answers never share a number and a reload never repeats one.
// Every fetch aborts at 19.5 seconds, under the registry's 20 seconds for b14-swarm. An answer is
// kept only when its final event is there and valid; an invalid step is dropped. Anything else
// returns [] or throws, and the registry plays the scripted run.
import type { CindiaEvent, Payloads } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { validateEvent } from "../../core/validate";
import { agents } from "../../mock/agents";
import { pieces } from "../../mock/catalog";
import { communities } from "../../mock/communities";
import { flags, makerPayouts, makerStatements, orders, payouts } from "../../mock/month";
import { allMakers } from "../../mock/people";
import { policy } from "../../mock/policy";
import { searchIndex, vibeVocabulary } from "../../mock/searchIndex";
import { storefronts } from "../../mock/storefronts";
import { liveIdStart, pageTag } from "../ids";
import type { LiveAdapter } from "../types";

const KEY = "b14-swarm" as const;
/** The registry gives b14-swarm 20 seconds, so the fetch gives up at 19.5. */
export const PRODUCE_ABORT_MS = 19500;
const HEALTH_TIMEOUT_MS = 3000;
/** The order whose date is the demo's buying day (the server reads the same one). */
const DEMO_ORDER_ID = "ord_001";
/** The co-op whose books the seller side holds. */
const COOP_ID = "com_dine";
/** Numbers reserved per run, per prefix (api-contract.md, B14 IDs). */
export const RESERVED = { stp: 40, chk: 3, apr: 1, pc: 1, blk: 6, qst: 1 } as const;
/** A buyer never sees who bought an order. */
const PERSON_FIELDS = new Set(["buyerId", "buyer", "buyerName", "name", "email", "phone", "address", "customerId", "customer"]);

type Json = Record<string, unknown>;

function isObj(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

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

function post(path: string, body: unknown): Promise<unknown> {
  return fetchJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, PRODUCE_ABORT_MS);
}

// ---------------------------------------------------------------------------------------------
// IDs and records

/** A fresh run ID and the first reserved number per prefix, from this page's tag. */
export function reserveIds(): { runId: string; idTag: string; idStart: Record<keyof typeof RESERVED, number> } {
  const idTag = pageTag();
  const idStart = Object.fromEntries(Object.entries(RESERVED).map(([prefix, count]) => [prefix, liveIdStart(prefix, count)])) as Record<
    keyof typeof RESERVED,
    number
  >;
  return { runId: `run_user_${idTag}_${liveIdStart("run", 1)}`, idTag, idStart };
}

function withoutPerson<T extends object>(o: T): Json {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !PERSON_FIELDS.has(k)));
}

/** The orders on screen: the co-op's from src/mock, or a person's own from the store. */
function ordersOnScreen(contextIds: string[], state: CindiaState): Json[] {
  const out: Json[] = [];
  for (const id of contextIds) {
    if (!id.startsWith("ord_")) continue;
    const o = orders.find((x) => x.id === id);
    if (o) {
      out.push(withoutPerson(o));
      continue;
    }
    const placed = state.buyer.orders[id];
    if (placed) out.push(withoutPerson({ id, pieceId: placed.pieceId, channelId: placed.channelId, grossCents: placed.grossCents, date: placed.date }));
  }
  return out;
}

/** The records a side may see (api-contract.md, "For B11 to B16"). The server cuts them again. */
export function recordsFor(side: "buyer" | "seller", contextIds: string[], state: CindiaState): Json {
  const ctx = new Set(contextIds);
  const makerIds = new Set<string>(contextIds.filter((id) => id.startsWith("mkr_")));
  for (const p of pieces) if (ctx.has(p.id)) makerIds.add(p.makerId);
  const demoDate = orders.find((o) => o.id === DEMO_ORDER_ID)?.date;
  const base: Json = {
    pieces,
    communities,
    policy,
    searchIndex,
    agents,
    makers: allMakers.filter((m) => makerIds.has(m.id)),
    orders: ordersOnScreen(contextIds, state),
    ...(demoDate ? { demoDate } : {}),
  };
  if (side === "buyer") return base;
  const coop = new Set(communities.find((c) => c.id === COOP_ID)?.makerIds ?? []);
  return {
    ...base,
    makers: allMakers.filter((m) => makerIds.has(m.id) || coop.has(m.id)),
    orders: [...orders, ...(base.orders as Json[]).filter((o) => !orders.some((x) => x.id === o.id))],
    payouts,
    makerPayouts,
    makerStatements,
    flags,
  };
}

// ---------------------------------------------------------------------------------------------
// Request bodies, exported so they can be checked without a server

export function supportBody(e: CindiaEvent, state: CindiaState): Json | null {
  if (e.type !== "support.asked" || e.source !== "user" || !isObj(e.payload)) return null;
  const p = e.payload as Payloads["support.asked"];
  if (typeof p.threadId !== "string" || typeof p.text !== "string" || !p.text.trim()) return null;
  const side = p.side === "seller" ? "seller" : "buyer";
  const contextIds = Array.isArray(p.contextIds) ? p.contextIds.filter((id): id is string => typeof id === "string") : [];
  return {
    trigger: e,
    ...reserveIds(),
    threadId: p.threadId,
    side,
    text: p.text.slice(0, 1000),
    lang: p.lang === "zh" ? "zh" : "en",
    contextIds,
    records: recordsFor(side, contextIds, state),
  };
}

export function listingBody(e: CindiaEvent): Json | null {
  if (e.type !== "listing.requested" || e.source !== "user" || !isObj(e.payload)) return null;
  const p = e.payload as Payloads["listing.requested"];
  const maker = allMakers.find((m) => m.id === p.makerId);
  const community = maker ? communities.find((c) => c.id === maker.communityId) : undefined;
  if (!maker || !community || typeof p.notes !== "string" || !p.notes.trim()) return null;
  return {
    trigger: e,
    ...reserveIds(),
    listingId: p.listingId,
    makerId: p.makerId,
    notes: p.notes.slice(0, 2000),
    lang: p.lang === "zh" ? "zh" : "en",
    community: { ...community, slug: storefronts.find((s) => s.communityId === community.id)?.slug },
    maker,
    vibeVocabulary,
  };
}

export function storefrontBody(e: CindiaEvent): Json | null {
  if (e.type !== "storefront.requested" || e.source !== "user" || !isObj(e.payload)) return null;
  const p = e.payload as Payloads["storefront.requested"];
  const store = storefronts.find((s) => s.id === p.storefrontId);
  const community = store ? communities.find((c) => c.id === store.communityId) : undefined;
  if (!store || !community) return null;
  return {
    trigger: e,
    ...reserveIds(),
    storefrontId: store.id,
    community,
    pieces: pieces.filter((pc) => pc.communityId === community.id).map((pc) => ({ id: pc.id, title: pc.title, communityId: pc.communityId })),
  };
}

// ---------------------------------------------------------------------------------------------
// Reading the answer

const FINALS: Record<string, readonly string[]> = {
  support: ["support.answered", "support.escalated"],
  listing: ["listing.drafted"],
  storefront: ["storefront.drafted"],
};

/**
 * The server's events, each live, keyed b14-swarm and valid, on the request's own thread. An invalid
 * step is dropped; a missing or invalid final event means [] (the scripted run plays).
 */
export function readEvents(body: unknown, kind: keyof typeof FINALS, threadId: string): CindiaEvent[] {
  if (!isObj(body) || !Array.isArray(body.events)) return [];
  const out: CindiaEvent[] = [];
  let finished = false;
  for (const raw of body.events as unknown[]) {
    if (!isObj(raw) || raw.key !== KEY || raw.source !== "live" || typeof raw.type !== "string" || !isObj(raw.payload)) continue;
    const e = raw as unknown as CindiaEvent;
    const valid = validateEvent(e).length === 0;
    const isFinal = FINALS[kind].includes(e.type);
    if (!valid) {
      if (isFinal) return [];
      continue;
    }
    const thread = (e.payload as Json).threadId;
    if (e.type === "swarm.step" && thread !== threadId) continue;
    if (isFinal) finished = true;
    out.push(e);
  }
  return finished ? out : [];
}

async function run(path: string, kind: keyof typeof FINALS, body: Json, threadId: string): Promise<CindiaEvent[]> {
  return readEvents(await post(path, body), kind, threadId);
}

const adapter: LiveAdapter = {
  key: KEY,

  async health() {
    try {
      const h = await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS);
      return isObj(h) && Array.isArray(h.routers) && h.routers.includes("b14") && isObj(h.keys) && h.keys.anthropic === true;
    } catch {
      return false;
    }
  },

  produce(event, state) {
    // The tour's keyed events and anything not from a person: no call, so the scripted run plays.
    if (event.source !== "user") return Promise.resolve([]);
    const support = supportBody(event, state);
    if (support) return run("/api/b14/support", "support", support, String(support.threadId));
    const listing = listingBody(event);
    if (listing) return run("/api/b14/listing", "listing", listing, String(listing.listingId));
    const store = storefrontBody(event);
    if (store) return run("/api/b14/storefront", "storefront", store, String(store.storefrontId));
    // A maker's question.answered and anything else: the scripted answer plays.
    return Promise.resolve([]);
  },
};

export default adapter;
