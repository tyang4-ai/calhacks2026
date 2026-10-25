// B13 live adapter: the database (api-contract.md, B13). SpacetimeDB holds the platform's shared
// state, and every screen in live mode reads it through the backend.
//
// health(): /api/health must list b13 with services.spacetime true, then /api/b13/status must say
// spacetime. While the catalog isn't seeded it starts POST /api/b13/seed in the background and
// answers false until that's done, retrying 20 seconds after a failure (B04's pattern).
//
// produce(): [] at once, with no call. The one tour event keyed b13-live is d15-listing's scripted
// data.synced, so it plays scripted and on time in both modes.
//
// start(emit), only in live mode:
// - The poll: every 500 ms, one request at a time, GET /api/b13/changes with the last seq, this
//   screen's ID (scr_ plus pageTag()) and its role from the route (/shop and /store buyer, /sell and
//   /maker seller, /demo tour). Each answer's swarm.step and data.synced events keyed b13-live that
//   pass validateEvent() are emitted. The registry stamps their `at` as they land.
// - Steps of a run another page started (run_user_<tag>_<n> with a tag that isn't this page's) get
//   that tag after _user_ in their threadId, so thr_user_2 becomes thr_user_<tag>_2. They reach the
//   swarm view, which groups by run, and never this page's own threads.
// - The mirror: onEvent from the store queues every order.placed, approval.* and listing.* event,
//   scripted, live or a person's, and once a second posts the queue to POST /api/b13/record, each
//   event ID once per page load. A person's IDs carry no page tag (ord_user_1, lst_user_1), so the
//   mirror inserts this page's tag (ord_user_<tag>_1) before posting, or a second page's ord_user_1
//   would overwrite the first page's row. Only the IDs, kinds, amounts and dates the database keeps
//   leave the browser; notes, titles and reasons never do.
// Every fetch has a timeout, and any failure is swallowed, so the screens keep their scripted rows.
import type { CindiaEvent } from "../../core/events";
import { onEvent } from "../../core/store";
import { validateEvent } from "../../core/validate";
import { pageTag } from "../ids";
import type { LiveAdapter } from "../types";

const KEY = "b13-live" as const;
const HEALTH_TIMEOUT_MS = 3000;
const STATUS_TIMEOUT_MS = 2000;
const SEED_TIMEOUT_MS = 10500;
/** After a failed seed, wait this long before trying again. */
const RETRY_MS = 20000;
const POLL_MS = 500;
const POLL_TIMEOUT_MS = 2000;
const MIRROR_MS = 1000;
const MIRROR_TIMEOUT_MS = 2500;
/** After a failed record, wait this long before posting again. */
const MIRROR_RETRY_MS = 5000;
const MIRROR_BATCH = 50;
const MIRROR_QUEUE_MAX = 500;

const STREAMED = new Set<string>(["swarm.step", "data.synced"]);
const MIRRORED = new Set<string>([
  "order.placed",
  "approval.requested",
  "approval.granted",
  "approval.declined",
  "listing.requested",
  "listing.drafted",
  "listing.indexed",
]);

type Role = "buyer" | "seller" | "tour";
type Json = Record<string, unknown>;

/** A non-2xx answer, with its status, so the mirror can tell a bad batch from an outage. */
class HttpError extends Error {
  readonly status: number;
  constructor(url: string, status: number) {
    super(`${url} answered ${status}`);
    this.status = status;
  }
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(1, timeoutMs));
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new HttpError(url, res.status);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", onAbort);
  }
}

function postJson(url: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  return fetchJson(
    url,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    timeoutMs,
    signal,
  );
}

function isObj(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ---------------------------------------------------------------------------------------------
// IDs and the route

/** This screen's ID, scr_ plus the page tag. */
export function screenId(): string {
  return `scr_${pageTag()}`;
}

/** The screen's role from the route: /shop and /store buyer, /sell and /maker seller, /demo tour. */
export function roleFor(pathname: string): Role {
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  if (first === "demo") return "tour";
  if (first === "sell" || first === "maker" || first === "studio" || first === "owner") return "seller";
  return "buyer";
}

function currentRole(): Role {
  if (typeof window === "undefined" || !window.location) return "buyer";
  return roleFor(window.location.pathname);
}

const UNTAGGED = /^([a-z]{2,4})_user_(\d+)$/;
const RUN_TAG = /^run_user_([a-z0-9]{6})_\d+$/;

/** A person's ID without a page tag gets `tag` after _user_: ord_user_1 becomes ord_user_<tag>_1. */
export function withTag(id: string, tag: string): string {
  const m = UNTAGGED.exec(id);
  return m ? `${m[1]}_user_${tag}_${m[2]}` : id;
}

/** A step of another page's run carries that page's tag in its threadId. Others pass unchanged. */
export function retagStep(e: CindiaEvent, ownTag: string): CindiaEvent {
  if (e.type !== "swarm.step" || !isObj(e.payload)) return e;
  const p = e.payload as Json;
  const runId = typeof p.runId === "string" ? p.runId : "";
  const m = RUN_TAG.exec(runId);
  if (!m || m[1] === ownTag || typeof p.threadId !== "string") return e;
  const threadId = withTag(p.threadId, m[1]);
  return threadId === p.threadId ? e : ({ ...e, payload: { ...p, threadId } } as CindiaEvent);
}

// ---------------------------------------------------------------------------------------------
// The mirror's projection: only what the database keeps, with this page's tag on a person's IDs

function tagged(v: unknown, tag: string): unknown {
  return typeof v === "string" ? withTag(v, tag) : v;
}

/** The event as POST /api/b13/record takes it, or null for a type the database doesn't mirror. */
export function mirrorOf(e: CindiaEvent, tag: string): Json | null {
  if (!MIRRORED.has(e.type) || !isObj(e.payload) || typeof e.id !== "string") return null;
  const p = e.payload as Json;
  let payload: Json;
  switch (e.type) {
    case "order.placed":
      payload = {
        orderId: tagged(p.orderId, tag),
        pieceId: tagged(p.pieceId, tag),
        channelId: p.channelId,
        grossCents: p.grossCents,
        date: p.date,
      };
      break;
    case "approval.requested": {
      payload = { approvalId: tagged(p.approvalId, tag) };
      const a = p.approval;
      if (isObj(a)) {
        const approval: Json = {
          kind: a.kind,
          subjectIds: Array.isArray(a.subjectIds) ? a.subjectIds.map((s) => tagged(s, tag)) : a.subjectIds,
        };
        if (a.amountCents !== undefined) approval.amountCents = a.amountCents;
        payload.approval = approval;
      }
      break;
    }
    case "approval.granted":
    case "approval.declined":
      payload = { approvalId: tagged(p.approvalId, tag) };
      break;
    case "listing.requested":
    case "listing.drafted":
      payload = { listingId: tagged(p.listingId, tag), makerId: p.makerId };
      break;
    default: // listing.indexed
      payload = { listingId: tagged(p.listingId, tag), pieceId: tagged(p.pieceId, tag) };
  }
  const out: Json = { id: e.id, type: e.type, payload };
  if (typeof e.key === "string") out.key = e.key;
  return out;
}

// ---------------------------------------------------------------------------------------------
// Seeding, from health()

let seeded = false;
let seeding: Promise<boolean> | null = null;
let retryAt = 0;

/** One seed. A 200 is enough: the feed reads the new rows within a poll or two. */
async function seed(): Promise<boolean> {
  const out = await postJson("/api/b13/seed", { trigger: null }, SEED_TIMEOUT_MS);
  return isObj(out) && Array.isArray(out.events);
}

function startSeeding(): void {
  if (seeding) return;
  seeding = seed()
    .catch(() => false)
    .then((ok) => {
      seeded = ok;
      if (!ok) retryAt = performance.now() + RETRY_MS;
      seeding = null;
      return ok;
    });
}

// ---------------------------------------------------------------------------------------------
// State kept for the page load: the last seq and the event IDs already mirrored

let lastSeq = 0;
const sentIds = new Set<string>();

/** Forgets the page-load state (for tests). */
export function resetForTests(): void {
  lastSeq = 0;
  sentIds.clear();
  seeded = false;
  seeding = null;
  retryAt = 0;
}

const adapter: LiveAdapter = {
  key: KEY,

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as {
      routers?: unknown;
      services?: { spacetime?: unknown };
    } | null;
    if (!Array.isArray(body?.routers) || !body.routers.includes("b13") || body.services?.spacetime !== true) return false;
    const status = (await fetchJson("/api/b13/status", {}, STATUS_TIMEOUT_MS)) as {
      spacetime?: unknown;
      seeded?: unknown;
    } | null;
    if (status?.spacetime !== true) return false;
    if (status.seeded === true) {
      seeded = true;
      return true;
    }
    if (seeded) return true;
    if (!seeding && performance.now() >= retryAt) startSeeding();
    return false;
  },

  produce() {
    return Promise.resolve([]);
  },

  start(emit) {
    let stopped = false;
    let polling: AbortController | null = null;
    let posting: AbortController | null = null;
    let postAfter = 0;
    const tag = pageTag();
    const screen = screenId();
    const queue: Json[] = [];
    const queued = new Set<string>();

    const poll = async () => {
      if (stopped || polling) return;
      const ctrl = new AbortController();
      polling = ctrl;
      try {
        const q = new URLSearchParams({ after: String(lastSeq), screen, role: currentRole() });
        const out = await fetchJson(`/api/b13/changes?${q.toString()}`, {}, POLL_TIMEOUT_MS, ctrl.signal);
        if (stopped || !isObj(out)) return;
        const events = Array.isArray(out.events) ? (out.events as unknown[]) : [];
        for (const raw of events) {
          if (!isObj(raw)) continue;
          const e = raw as unknown as CindiaEvent;
          if (!STREAMED.has(e.type) || e.key !== KEY || validateEvent(e).length > 0) continue;
          emit(retagStep(e, tag));
        }
        if (typeof out.seq === "number" && Number.isInteger(out.seq) && out.seq >= 0) lastSeq = out.seq;
      } catch {
        // The API is down or slow: the screens keep what they have, and the next tick tries again.
      } finally {
        if (polling === ctrl) polling = null;
      }
    };

    const offEvents = onEvent((e) => {
      if (stopped || !MIRRORED.has(e.type) || sentIds.has(e.id) || queued.has(e.id)) return;
      const m = mirrorOf(e, tag);
      if (!m) return;
      queue.push(m);
      queued.add(e.id);
      while (queue.length > MIRROR_QUEUE_MAX) {
        const dropped = queue.shift();
        if (dropped) queued.delete(String(dropped.id));
      }
    });

    const flush = async () => {
      if (stopped || posting || queue.length === 0 || performance.now() < postAfter) return;
      const batch = queue.slice(0, MIRROR_BATCH);
      const ctrl = new AbortController();
      posting = ctrl;
      const done = () => {
        for (const m of batch) {
          sentIds.add(String(m.id));
          queued.delete(String(m.id));
        }
        queue.splice(0, batch.length);
      };
      try {
        await postJson("/api/b13/record", { trigger: null, events: batch }, MIRROR_TIMEOUT_MS, ctrl.signal);
        done();
      } catch (err) {
        // A 4xx means the batch itself is wrong, so it's dropped. Anything else (no token, SpacetimeDB
        // down, a timeout) keeps it for the next try, since SpacetimeDB may be back in a few seconds.
        if (err instanceof HttpError && err.status >= 400 && err.status < 500) done();
        else postAfter = performance.now() + MIRROR_RETRY_MS;
      } finally {
        if (posting === ctrl) posting = null;
      }
    };

    void poll();
    const pollTimer = setInterval(() => void poll(), POLL_MS);
    const mirrorTimer = setInterval(() => void flush(), MIRROR_MS);
    return () => {
      stopped = true;
      clearInterval(pollTimer);
      clearInterval(mirrorTimer);
      offEvents();
      polling?.abort();
      posting?.abort();
      polling = null;
      posting = null;
    };
  },
};

export default adapter;
