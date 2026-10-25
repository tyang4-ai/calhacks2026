// B11 live adapter: Cindia's own embedding model (api-contract.md, B11; docs/plans/B11-embed.md,
// Adapter). The model runs on the server, which never calls the Hugging Face Hub at run time.
//
// health(): GET /api/health must list b11 with services.model true, then GET /api/b11/model must say
// trained and warm. Each fetch aborts at 3 seconds. The first /api/b11/model call starts the
// server's background warm-up, so health() turns true on a later poll once the model is loaded and
// its fingerprints match. Until then the panels keep their Simulated badge.
//
// produce(): [] at once for every event, with no network call. The tour is always scripted
// (fix-plan 1.2), so the tour's keyed search.mapped, model.trained and proof.search_scored play
// from src/mock/model.ts in both modes, with the numbers S3-catalog T9 copies from report.json.
// ALLOWED_EMPTY_FALLBACKS in tests/demo/beats.ts lists those three types for b11-embed.
//
// A person's own search.queried belongs to b12-search (events.md, Requests from people), so its
// live map comes through B12's adapter, which can call liveMap() below: POST /api/b11/map with the
// request's queryId, text and keywords. The answer is checked by readMapped(), and liveMap()
// resolves null when the model isn't trained or warm (the server answers []), when anything fails
// or when it times out, so the scripted map plays. Nothing here runs in scripted mode: the registry
// polls health() only in live mode, and B12's adapter calls liveMap() only from its own live path.
import type { CindiaEvent } from "../../core/events";
import { validateEvent } from "../../core/validate";
import type { LiveAdapter } from "../types";

const KEY = "b11-embed" as const;
/** Every fetch in health() aborts at 3 seconds (B11-embed.md, Adapter). */
export const HEALTH_TIMEOUT_MS = 3000;
/** /api/b11/map answers in under 2 seconds once warm, so a map request gives up at 2.5. */
export const MAP_TIMEOUT_MS = 2500;

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

// ---------------------------------------------------------------------------------------------
// Pure checks, exported so they can be tested without a server

/** /api/health's answer lists the b11 router and says the trained model is on disk. */
export function healthListsModel(body: unknown): boolean {
  if (!isObj(body)) return false;
  const services = body.services;
  return Array.isArray(body.routers) && body.routers.includes("b11") && isObj(services) && services.model === true;
}

/** GET /api/b11/model's answer says the model is trained (fingerprints match) and warm. */
export function modelIsReady(body: unknown): boolean {
  return isObj(body) && body.trained === true && body.warm === true;
}

export interface MapRequest {
  trigger: CindiaEvent;
  queryId: string;
  text: string;
  keywords: string[];
}

/** The POST /api/b11/map body for a person's search.queried, or null for any other event. */
export function mapRequest(event: CindiaEvent): MapRequest | null {
  if (event.type !== "search.queried" || !isObj(event.payload)) return null;
  const p = event.payload as Json;
  if (typeof p.queryId !== "string" || p.queryId === "" || typeof p.text !== "string") return null;
  const keywords = Array.isArray(p.keywords) ? p.keywords.filter((k): k is string => typeof k === "string") : [];
  if (p.text.trim() === "" && keywords.length === 0) return null;
  return { trigger: event, queryId: p.queryId, text: p.text, keywords };
}

/**
 * The one search.mapped in a /api/b11/map answer, or null. It must be a valid live event keyed
 * b11-embed, for the request's queryId, with method "pca", the query's point and every piece's
 * point (a non-empty list, each pieceId once).
 */
export function readMapped(body: unknown, queryId: string): CindiaEvent<"search.mapped"> | null {
  if (!isObj(body) || !Array.isArray(body.events)) return null;
  for (const e of body.events as unknown[]) {
    if (!isObj(e) || e.type !== "search.mapped" || e.key !== KEY || e.source !== "live") continue;
    if (validateEvent(e).length > 0) continue;
    const p = e.payload as Json;
    if (p.queryId !== queryId || p.method !== "pca" || !Array.isArray(p.points) || p.points.length === 0) continue;
    const ids = new Set<string>();
    let ok = true;
    for (const pt of p.points as unknown[]) {
      if (!isObj(pt) || typeof pt.pieceId !== "string" || ids.has(pt.pieceId)) {
        ok = false;
        break;
      }
      ids.add(pt.pieceId);
    }
    if (ok) return e as unknown as CindiaEvent<"search.mapped">;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Calls

/**
 * Whether the server's model is ready: /api/health lists b11 with services.model, then
 * /api/b11/model says trained and warm. Any failure or timeout is false.
 */
export async function modelReady(timeoutMs: number = HEALTH_TIMEOUT_MS, signal?: AbortSignal): Promise<boolean> {
  try {
    if (!healthListsModel(await fetchJson("/api/health", {}, timeoutMs, signal))) return false;
    return modelIsReady(await fetchJson("/api/b11/model", {}, timeoutMs, signal));
  } catch {
    return false;
  }
}

/**
 * The live search.mapped for a person's search.queried, from POST /api/b11/map, or null when the
 * event isn't a search, the model isn't trained or warm (the server answers []), the answer
 * fails readMapped(), the call fails, or it takes longer than `timeoutMs`.
 */
export async function liveMap(
  event: CindiaEvent,
  timeoutMs: number = MAP_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<CindiaEvent<"search.mapped"> | null> {
  const body = mapRequest(event);
  if (!body) return null;
  try {
    const out = await fetchJson(
      "/api/b11/map",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      timeoutMs,
      signal,
    );
    return readMapped(out, body.queryId);
  } catch {
    return null;
  }
}

const adapter: LiveAdapter = {
  key: KEY,

  health() {
    return modelReady(HEALTH_TIMEOUT_MS);
  },

  // The tour's keyed events stay scripted in both modes (fix-plan 1.2): no call, nothing returned.
  produce() {
    return Promise.resolve([]);
  },
};

export default adapter;
