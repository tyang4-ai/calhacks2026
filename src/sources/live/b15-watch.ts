// B15 live adapter: the copy watch (api-contract.md, B15; docs/plans/B15-watch.md, Adapter). The
// adapter calls only /api/... on localhost. Apify, Claude and the keys stay on the server, and the
// server crawls only Cindia's own sandbox market.
//
// health(): GET /api/health must list b15 with keys.apify true, then GET /api/b15/status must say
//   market (PUBLIC_SITE_URL is set). It doesn't wait on B11's model: without it the server's scan
//   runs on the text checks alone.
// produce():
//   - a person's watch.started (Scan now): POST /api/b15/watch with runId, idTag (pageTag()) and
//     idStart from liveIdStart() (8 steps, 3 hits, 3 drafts, 3 approvals), then poll
//     GET /api/b15/watch/<scanId>?idTag=<tag> every second until it's done or failed, all inside
//     59.5 seconds. A done scan's events are returned when every one is valid and keyed b15-watch. A
//     failed scan, a timeout or an invalid event throws, so the scripted scan plays with the
//     Simulated badge.
//   - the tour's keyed watch.scanned, counterfeit.flagged and followup.drafted: [] at once, with no
//     call, so d14-watch always plays the scripted scan on time with cft_01, fup_02 and apr_03.
//     ALLOWED_EMPTY_FALLBACKS lists those types for b15-watch. A live hit never takes cft_01.
//   - anything else: [].
// There is no start(), no background tour scan and no prefetch.
import type { CindiaEvent } from "../../core/events";
import { validateEvent } from "../../core/validate";
import { liveIdStart, pageTag } from "../ids";
import type { LiveAdapter } from "../types";

const KEY = "b15-watch" as const;
/** health()'s fetches abort at 3 seconds, the status read at 2. */
export const HEALTH_TIMEOUT_MS = 3000;
export const STATUS_TIMEOUT_MS = 2000;
/** The registry gives b15-watch 60 seconds, so the whole scan aborts at 59.5. */
export const PRODUCE_ABORT_MS = 59500;
/** The start answers at once; each poll answers in under 200 ms on the server. */
export const START_TIMEOUT_MS = 5000;
export const POLL_TIMEOUT_MS = 3000;
export const POLL_MS = 1000;
/** Numbers a scan reserves per prefix, as the server's IDs use them. */
export const RESERVE = { stp: 8, cft: 3, fup: 3, apr: 3 } as const;

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
    if (!res.ok) {
      let code = "";
      try {
        const body = (await res.json()) as unknown;
        if (isObj(body) && isObj(body.error) && typeof body.error.code === "string") code = ` ${body.error.code}`;
      } catch {
        // not the error shape
      }
      throw new Error(`${url.split("?")[0]} answered ${res.status}${code}`);
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", onAbort);
  }
}

function postJson(url: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  return fetchJson(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, timeoutMs, signal);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("b15 scan aborted"));
      return;
    }
    let t: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("b15 scan aborted"));
    };
    t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

// ---------------------------------------------------------------------------------------------
// Pure reads, exported so they can be tested without a server

/** The parts of a person's watch.started the POST needs, or null for anything else. */
export function watchRequest(e: CindiaEvent): { scanId: string; makerId: string; queries: string[] } | null {
  if (e.type !== "watch.started" || e.source !== "user" || !isObj(e.payload)) return null;
  const p = e.payload as Json;
  if (typeof p.scanId !== "string" || typeof p.makerId !== "string") return null;
  const queries = Array.isArray(p.queries) ? p.queries.filter((q): q is string => typeof q === "string").slice(0, 10) : [];
  return { scanId: p.scanId, makerId: p.makerId, queries };
}

/** The POST /api/b15/watch body, with this page's tag and freshly reserved numbers. */
export function startBody(e: CindiaEvent, req: { scanId: string; makerId: string; queries: string[] }, tag = pageTag()): Json {
  return {
    trigger: e,
    runId: `run_user_${tag}_${liveIdStart("run", 1)}`,
    idTag: tag,
    idStart: {
      stp: liveIdStart("stp", RESERVE.stp),
      cft: liveIdStart("cft", RESERVE.cft),
      fup: liveIdStart("fup", RESERVE.fup),
      apr: liveIdStart("apr", RESERVE.apr),
    },
    scanId: req.scanId,
    makerId: req.makerId,
    queries: req.queries,
  };
}

/**
 * A done scan's events, each valid, live and keyed b15-watch, with exactly one watch.scanned for
 * this scan and no hit that takes cft_01. Throws otherwise, so the scripted scan plays.
 */
export function readEvents(body: unknown, scanId: string): CindiaEvent[] {
  if (!isObj(body) || !Array.isArray(body.events)) throw new Error("b15 poll answer isn't the contract's shape");
  const out: CindiaEvent[] = [];
  let scanned = 0;
  for (const e of body.events as unknown[]) {
    if (!isObj(e) || e.key !== KEY || e.source !== "live" || typeof e.id !== "string" || !e.id.startsWith("evt_live_")) {
      throw new Error("b15 returned an event that isn't a live b15-watch event");
    }
    const problems = validateEvent(e);
    if (problems.length > 0) throw new Error(`b15 returned an invalid event: ${problems[0]}`);
    const p = e.payload as Json;
    if (e.type === "watch.scanned") {
      if (p.scanId !== scanId) throw new Error("b15 returned another scan's results");
      scanned += 1;
    }
    if (e.type === "counterfeit.flagged" && (p.cftId === "cft_01" || p.scanId !== scanId)) {
      throw new Error("b15 returned a hit that isn't this scan's own");
    }
    out.push(e as unknown as CindiaEvent);
  }
  if (scanned !== 1) throw new Error("b15 returned no watch.scanned for this scan");
  return out;
}

// ---------------------------------------------------------------------------------------------
// Health and the scan

async function checkHealth(): Promise<boolean> {
  const health = await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS);
  if (!isObj(health) || !Array.isArray(health.routers) || !health.routers.includes("b15")) return false;
  if (!isObj(health.keys) || health.keys.apify !== true) return false;
  const status = await fetchJson("/api/b15/status", {}, STATUS_TIMEOUT_MS);
  return isObj(status) && status.market === true;
}

async function liveScan(event: CindiaEvent, req: { scanId: string; makerId: string; queries: string[] }): Promise<CindiaEvent[]> {
  const ctrl = new AbortController();
  const started = performance.now();
  const timer = setTimeout(() => ctrl.abort(), PRODUCE_ABORT_MS);
  const left = () => PRODUCE_ABORT_MS - (performance.now() - started);
  try {
    const tag = pageTag();
    const begun = await postJson("/api/b15/watch", startBody(event, req, tag), Math.min(START_TIMEOUT_MS, left()), ctrl.signal);
    if (!isObj(begun) || begun.scanId !== req.scanId) throw new Error("b15 start answer isn't this scan's");
    let status = typeof begun.status === "string" ? begun.status : "running";
    const url = `/api/b15/watch/${encodeURIComponent(req.scanId)}?idTag=${encodeURIComponent(tag)}`;
    for (;;) {
      if (status !== "done" && status !== "failed") await sleep(Math.min(POLL_MS, Math.max(0, left() - 100)), ctrl.signal);
      if (left() <= 0) throw new Error("b15 scan took too long");
      const out = await fetchJson(url, {}, Math.min(POLL_TIMEOUT_MS, left()), ctrl.signal);
      if (!isObj(out) || typeof out.status !== "string") throw new Error("b15 poll answer isn't the contract's shape");
      status = out.status;
      if (status === "done") return readEvents(out, req.scanId);
      if (status === "failed") {
        const code = isObj(out.error) && typeof out.error.code === "string" ? out.error.code : "unknown";
        throw new Error(`b15 scan failed (${code})`);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

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
    const req = watchRequest(event);
    if (req) return liveScan(event, req);
    // The tour's keyed watch.scanned, counterfeit.flagged and followup.drafted, and everything
    // else: no call, so the scripted scan plays on time.
    return Promise.resolve([]);
  },
};

export default adapter;
