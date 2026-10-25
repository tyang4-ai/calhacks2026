// B12 live adapter: vibe search and surprise me on Elastic Serverless with Cindia's own vectors
// (api-contract.md, B12; docs/plans/B12-search.md, Adapter). The adapter calls only /api/... on
// localhost. Elastic, Kibana and the keys stay on the server.
//
// health():
//   1. GET /api/health must list b12 and b11 with services.model, and GET /api/b11/model must say
//      trained and warm (B11's helpers below).
//   2. GET /api/b12/status. When Elastic is there and its index holds fewer than the catalog's 54
//      active pieces, or another fingerprint than B11's, it posts /api/b12/seed once with the
//      passagesHash of searchIndex (the server answers at once and seeds in a thread from its own
//      data) and answers false while `seeding` is true. A seedError is retried after 20 seconds.
//   3. When Elastic is off, or the seed failed, it answers true: the server's local path is live
//      ranking with our own model.
// produce():
//   - a person's search.queried: POST /api/b12/search, and beside it B11's liveMap() (POST
//     /api/b11/map), appending its search.mapped when the model answers. All within 7.5 seconds.
//   - a person's surprise.asked: POST /api/b12/surprise with its keyword, method and seed.
//   - the tour's keyed search.answered and surprise.drawn: [] at once, with no call, so the tour
//     plays scripted and on time in both modes (fix-plan 1.2). ALLOWED_EMPTY_FALLBACKS lists both.
//   - anything else: []. listing.indexed is keyed b14-swarm, so this adapter never sees it.
// start(emit):
//   - polls GET /api/b12/status every 5 seconds (abort 2 s) and emits index.synced keyed b12-search,
//     { indexed, drafts, elastic, agentBuilder }, whenever those change. Features never fetch.
//   - watches the store with onEvent: when an approval.granted lands for a listing_publish approval
//     whose listing is a person's (lst_user_), it posts /api/b12/publish once for that listing in
//     this page load and emits the returned listing.indexed (index cindia-pieces).
//   It returns a stop function that stops both and keeps the posted set, so a health flap never
//   publishes twice. The registry re-stamps the `at` of every start(emit) event.
// Nothing here runs in scripted mode: the registry polls health() and starts adapters only in live mode.
import type { CindiaEvent } from "../../core/events";
import { getState, onEvent } from "../../core/store";
import { validateEvent } from "../../core/validate";
import { searchIndex } from "../../mock/searchIndex";
import type { LiveAdapter } from "../types";
import { healthListsModel, liveMap, modelIsReady } from "./b11-embed";

const KEY = "b12-search" as const;
/** Every fetch in health() aborts at 3 seconds, the status poll at 2. */
export const HEALTH_TIMEOUT_MS = 3000;
export const STATUS_TIMEOUT_MS = 2000;
/** produce() gets 8 seconds from the registry, so its calls abort at 7.5. */
export const PRODUCE_ABORT_MS = 7500;
/** The status poll's period, and how long a failed seed waits before it's tried again. */
export const STATUS_POLL_MS = 5000;
export const SEED_RETRY_MS = 20000;
/** The publish call (the server answers in under 3 seconds). */
export const PUBLISH_TIMEOUT_MS = 3500;

type Json = Record<string, unknown>;

function isObj(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(1, timeoutMs));
  const onAbort = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", onAbort);
  }
}

function postJson(url: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  return fetchJson(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, timeoutMs, signal);
}

// ---------------------------------------------------------------------------------------------
// Pure checks, exported so they can be tested without a server

/** How many active pieces the catalog holds (54): fewer in the index means it needs a seed. */
export function activeCount(): number {
  return searchIndex.filter((e) => e.status === "active").length;
}

/** The passages joined as B11 hashes them: every entry's embedText in pieceId order, one per line. */
export function passagesText(): string {
  return searchIndex
    .map((e) => ({ id: e.pieceId, text: e.embedText }))
    .toSorted((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }))
    .map((e) => e.text)
    .join("\n");
}

/** sha256 hex of the passages, the seed's passagesHash, or null where WebCrypto isn't available. */
export async function passagesHash(): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(passagesText()));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export interface IndexStatus {
  elastic: boolean;
  indexed: number;
  drafts: number;
  fingerprint: string | null;
  agentBuilder: boolean;
  seeding: boolean;
  seedError: string | null;
}

/** GET /api/b12/status's answer, or null when it isn't that shape. */
export function readStatus(body: unknown): IndexStatus | null {
  if (!isObj(body)) return null;
  const { elastic, indexed, drafts, fingerprint, agentBuilder, seeding, seedError } = body;
  if (typeof elastic !== "boolean" || typeof indexed !== "number" || typeof drafts !== "number") return null;
  if (typeof agentBuilder !== "boolean" || typeof seeding !== "boolean") return null;
  return {
    elastic,
    indexed,
    drafts,
    fingerprint: typeof fingerprint === "string" ? fingerprint : null,
    agentBuilder,
    seeding,
    seedError: typeof seedError === "string" ? seedError : null,
  };
}

/** Whether Elastic's index needs a seed: fewer pieces than the catalog, or another fingerprint. */
export function needsSeed(s: IndexStatus, modelFingerprint: string | null): boolean {
  return s.elastic && (s.indexed < activeCount() || (modelFingerprint !== null && s.fingerprint !== modelFingerprint));
}

/** The one live event of `type` for this request in a server answer, valid and keyed b12-search. */
export function readOne<T extends CindiaEvent["type"]>(body: unknown, type: T, match: (p: Json) => boolean): CindiaEvent | null {
  if (!isObj(body) || !Array.isArray(body.events)) return null;
  for (const e of body.events as unknown[]) {
    if (!isObj(e) || e.type !== type || e.key !== KEY || e.source !== "live" || !isObj(e.payload)) continue;
    if (validateEvent(e).length > 0) continue;
    if (!match(e.payload)) continue;
    return e as unknown as CindiaEvent;
  }
  return null;
}

/** The POST /api/b12/search body for a person's search.queried, or null for anything else. */
export function searchRequest(e: CindiaEvent): Json | null {
  if (e.type !== "search.queried" || e.source !== "user" || !isObj(e.payload)) return null;
  const p = e.payload as Json;
  if (typeof p.queryId !== "string" || typeof p.text !== "string") return null;
  const keywords = Array.isArray(p.keywords) ? p.keywords.filter((k): k is string => typeof k === "string") : [];
  const filters = isObj(p.filters) ? p.filters : {};
  return { trigger: e, queryId: p.queryId, text: p.text, keywords, lang: p.lang === "zh" ? "zh" : "en", filters };
}

/** The POST /api/b12/surprise body for a person's surprise.asked, or null for anything else. */
export function surpriseRequest(e: CindiaEvent): Json | null {
  if (e.type !== "surprise.asked" || e.source !== "user" || !isObj(e.payload)) return null;
  const p = e.payload as Json;
  if (typeof p.surpriseId !== "string" || typeof p.method !== "string" || typeof p.seed !== "number") return null;
  const body: Json = { trigger: e, surpriseId: p.surpriseId, method: p.method, seed: p.seed };
  if (typeof p.keyword === "string" && p.keyword.trim() !== "") body.keyword = p.keyword;
  return body;
}

/** The publish body for an approval.granted on a person's listing_publish, or null. */
export function publishRequest(e: CindiaEvent, state = getState()): Json | null {
  if (e.type !== "approval.granted" || !isObj(e.payload)) return null;
  const approvalId = (e.payload as Json).approvalId;
  if (typeof approvalId !== "string") return null;
  const item = state.approvals.items[approvalId];
  const approval = item?.approval;
  if (!approval || approval.kind !== "listing_publish") return null;
  const listingId = approval.subjectIds.find((id) => id.startsWith("lst_user_"));
  if (!listingId) return null;
  // The Indexer's listing.indexed (cindia-drafts) names the draft's piece.
  const pieceId = state.listings.indexed[listingId]?.pieceId;
  if (typeof pieceId !== "string" || pieceId === "") return null;
  return { trigger: e, listingId, pieceId, approvalId };
}

// ---------------------------------------------------------------------------------------------
// Health and the background seed

let seedPostedAt = -Infinity;
let seedRefused = false;

async function checkHealth(): Promise<boolean> {
  const health = await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS);
  if (!isObj(health) || !Array.isArray(health.routers) || !health.routers.includes("b12")) return false;
  if (!healthListsModel(health)) return false;
  const model = await fetchJson("/api/b11/model", {}, HEALTH_TIMEOUT_MS);
  if (!modelIsReady(model)) return false;
  const fingerprint = isObj(model) && typeof model.fingerprint === "string" ? model.fingerprint : null;
  const status = readStatus(await fetchJson("/api/b12/status", {}, STATUS_TIMEOUT_MS));
  if (!status) return false;
  if (status.seeding) return false;
  if (!needsSeed(status, fingerprint)) return true;
  // The index needs a seed. Post it at most once every 20 seconds. Once a seed failed or was
  // refused, the server's local path answers meanwhile, so health is true.
  const now = performance.now();
  if (now - seedPostedAt < SEED_RETRY_MS) return seedRefused || status.seedError !== null;
  const hash = await passagesHash();
  if (!hash) return true;
  seedPostedAt = now;
  try {
    await postJson("/api/b12/seed", { trigger: null, passagesHash: hash }, HEALTH_TIMEOUT_MS);
    seedRefused = false;
    return false; // seeding started: false until it's done
  } catch {
    seedRefused = true; // no matching vectors, another catalog, or unreachable: the local path still ranks live
    return true;
  }
}

// ---------------------------------------------------------------------------------------------
// Calls

async function liveSearch(event: CindiaEvent, body: Json): Promise<CindiaEvent[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PRODUCE_ABORT_MS);
  try {
    const [answer, mapped] = await Promise.all([
      postJson("/api/b12/search", body, PRODUCE_ABORT_MS, ctrl.signal)
        .then((out) => readOne(out, "search.answered", (p) => p.queryId === body.queryId))
        .catch(() => null),
      liveMap(event, PRODUCE_ABORT_MS - 500, ctrl.signal),
    ]);
    if (!answer) return [];
    return mapped ? [answer, mapped] : [answer];
  } finally {
    clearTimeout(t);
  }
}

async function liveSurprise(body: Json): Promise<CindiaEvent[]> {
  try {
    const out = await postJson("/api/b12/surprise", body, PRODUCE_ABORT_MS);
    const drawn = readOne(out, "surprise.drawn", (p) => p.surpriseId === body.surpriseId);
    return drawn ? [drawn] : [];
  } catch {
    return [];
  }
}

// IDs for the events start(emit) pushes. The registry keeps any ID that starts with evt_live_.
let pushed = 0;
function pushId(): string {
  pushed += 1;
  return `evt_live_12p${String(pushed).padStart(4, "0")}`;
}

// The listings this page load already published, kept across start/stop so a flap never repeats one.
const published = new Set<string>();

const adapter: LiveAdapter = {
  key: KEY,

  async health() {
    try {
      return await checkHealth();
    } catch {
      return false;
    }
  },

  produce(event) {
    const search = searchRequest(event);
    if (search) return liveSearch(event, search);
    const draw = surpriseRequest(event);
    if (draw) return liveSurprise(draw);
    // The tour's keyed search.answered and surprise.drawn, and everything else: no call.
    return Promise.resolve([]);
  },

  start(emit) {
    let stopped = false;
    let last = "";
    let polling = false;

    const poll = async () => {
      if (stopped || polling) return;
      polling = true;
      try {
        const s = readStatus(await fetchJson("/api/b12/status", {}, STATUS_TIMEOUT_MS));
        if (!s || stopped) return;
        const payload = { indexed: s.indexed, drafts: s.drafts, elastic: s.elastic, agentBuilder: s.agentBuilder };
        const sig = JSON.stringify(payload);
        if (sig === last) return;
        last = sig;
        emit({ id: pushId(), type: "index.synced", at: 0, source: "live", key: KEY, payload });
      } catch {
        // the next poll tries again
      } finally {
        polling = false;
      }
    };

    const offEvents = onEvent((e) => {
      if (stopped || e.type !== "approval.granted") return;
      const body = publishRequest(e);
      if (!body || published.has(String(body.listingId))) return;
      published.add(String(body.listingId));
      void postJson("/api/b12/publish", body, PUBLISH_TIMEOUT_MS)
        .then((out) => {
          const indexed = readOne(out, "listing.indexed", (p) => p.listingId === body.listingId && p.index === "cindia-pieces");
          if (indexed && !stopped) emit(indexed);
          void poll();
        })
        .catch(() => {
          // The draft stays in cindia-drafts. The scripted grant has already played.
        });
    });

    void poll();
    const timer = setInterval(() => void poll(), STATUS_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
      offEvents();
    };
  },
};

export default adapter;
