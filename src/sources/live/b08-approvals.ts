// B08 live adapter: approvals on a second screen (api-contract.md, B08). One file serves both screens.
//
// The console:
// - On the keyed approval.requested it registers the approval on the server and returns the live twin.
// - On the scripted approval.granted it asks /api/b08/status first. With no owner screen connected it
//   returns [] at once, so the scripted grant plays on time. With one connected it long-polls
//   /api/b08/approvals/{id}?wait=6 and returns the owner's decision, or [] when none came.
//
// The owner screen (/sell/approvals?screen=owner in live mode, api-contract.md B08):
// - start(emit) polls the pending list every 2 seconds, only while the path is /sell/approvals and
//   the query has screen=owner, and emits each approval.requested it returns. On any other route,
//   the plain /sell/approvals included, it fetches nothing, so the Sell site on the console never
//   counts as an owner screen.
// - The owner's tap reaches produce() as a user approval.granted or approval.declined (Requests from
//   people in events.md). It posts the decision so the console sees it, then returns [], so the
//   scripted answer to that decision plays (a milestone grant's wip.milestone_paid and its move).
//
// Nothing here grants an approval on its own: the only decision it ever sends is the person's tap.
// Every fetch has a timeout, and any failure throws or returns [], so the registry plays the
// scripted event and the panel keeps its Simulated badge.
import type { CindiaEvent, Payloads } from "../../core/events";
import { validateEvent } from "../../core/validate";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so every fetch inside it ends by 7.5. */
const PRODUCE_BUDGET_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
const STATUS_TIMEOUT_MS = 1500;
const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 1900;
/** The server waits at most 6 seconds. */
const MAX_WAIT_S = 6;
const OWNER_PATH = "/sell/approvals";
const OWNER_SCREEN = "owner";

type ApprovalType = "approval.requested" | "approval.granted" | "approval.declined";
const DECISIONS = new Set<string>(["approval.granted", "approval.declined"]);

async function fetchJson(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(1, timeoutMs));
  const onAbort = () => ctrl.abort();
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

function postJson(url: string, body: unknown, timeoutMs: number): Promise<unknown> {
  return fetchJson(
    url,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    timeoutMs,
  );
}

/** The server's events of the allowed types for this approval, each valid against events.md. */
function approvalEvents(out: unknown, types: ReadonlySet<string>, approvalId?: string): CindiaEvent[] {
  const events = (out as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) return [];
  const keep: CindiaEvent[] = [];
  for (const e of events as unknown[]) {
    if (!e || typeof e !== "object") continue;
    const ev = e as CindiaEvent;
    if (!types.has(ev.type)) continue;
    const p = ev.payload as { approvalId?: unknown; by?: unknown };
    if (typeof p?.approvalId !== "string") continue;
    if (approvalId !== undefined && p.approvalId !== approvalId) continue;
    if (ev.type !== "approval.requested" && p.by !== "own_01") continue;
    if (validateEvent(ev).length > 0) continue;
    keep.push(ev);
  }
  return keep;
}

/** True only on /sell/approvals with screen=owner in the query. */
export function onOwnerRoute(): boolean {
  if (typeof window === "undefined" || !window.location) return false;
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path !== OWNER_PATH) return false;
  return new URLSearchParams(window.location.search ?? "").get("screen") === OWNER_SCREEN;
}

const ONLY_REQUESTED = new Set<string>(["approval.requested"]);

async function register(event: CindiaEvent<"approval.requested">): Promise<CindiaEvent[]> {
  const approvalId = event.payload.approvalId;
  const out = await postJson("/api/b08/approvals", { trigger: event, approvalId }, PRODUCE_BUDGET_MS);
  return approvalEvents(out, ONLY_REQUESTED, approvalId);
}

/**
 * The owner's tap: forward the person's decision so the other screen sees it, then answer [] so the
 * scripted answer to the decision plays. The store already holds the person's own event.
 */
async function forwardDecision(event: CindiaEvent): Promise<CindiaEvent[]> {
  const type = event.type as ApprovalType;
  const approvalId = (event.payload as { approvalId: string }).approvalId;
  const reason =
    type === "approval.declined" ? (event.payload as Payloads["approval.declined"]).reason : { en: "", zh: "" };
  const decision = type === "approval.granted" ? "granted" : "declined";
  await postJson(
    `/api/b08/approvals/${encodeURIComponent(approvalId)}/decision`,
    { trigger: event, decision, reason },
    PRODUCE_BUDGET_MS,
  );
  return [];
}

/** The scripted decision: wait for the owner only when an owner screen is connected. */
async function awaitOwner(event: CindiaEvent): Promise<CindiaEvent[]> {
  const started = performance.now();
  const approvalId = (event.payload as { approvalId: string }).approvalId;
  const status = (await fetchJson("/api/b08/status", {}, STATUS_TIMEOUT_MS)) as { ownerConnected?: unknown };
  if (status?.ownerConnected !== true) return [];
  const left = PRODUCE_BUDGET_MS - (performance.now() - started);
  // Leave the server half a second to answer after its wait ends.
  const waitS = Math.min(MAX_WAIT_S, Math.floor((left - 500) / 1000));
  if (waitS < 1) return [];
  const out = await fetchJson(
    `/api/b08/approvals/${encodeURIComponent(approvalId)}?wait=${waitS}`,
    {},
    left,
  );
  return approvalEvents(out, DECISIONS, approvalId);
}

const adapter: LiveAdapter = {
  key: "b08-approvals",

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as { routers?: unknown };
    return Array.isArray(body?.routers) && body.routers.includes("b08");
  },

  async produce(event) {
    if (event.type === "approval.requested") {
      return register(event as CindiaEvent<"approval.requested">);
    }
    if (DECISIONS.has(event.type)) {
      // A person's tap is the only decision ever sent to the server.
      if (event.source === "user") return forwardDecision(event);
      return awaitOwner(event);
    }
    return [];
  },

  start(emit) {
    let stopped = false;
    let inFlight: AbortController | null = null;

    const tick = async () => {
      if (stopped || inFlight || !onOwnerRoute()) return;
      const ctrl = new AbortController();
      inFlight = ctrl;
      try {
        const out = await fetchJson("/api/b08/approvals?status=pending", {}, POLL_TIMEOUT_MS, ctrl.signal);
        if (stopped) return;
        for (const e of approvalEvents(out, ONLY_REQUESTED)) emit(e);
      } catch {
        // The API is down or slow: the owner phone keeps its scripted approvals and badge.
      } finally {
        if (inFlight === ctrl) inFlight = null;
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
      inFlight?.abort();
      inFlight = null;
    };
  },
};

export default adapter;
