// B16 live adapter: the books checked against the bank, on Nessie (api-contract.md, B16).
//
// B16 keys no tour event, so produce() returns [] at once and makes no call: anything that reaches
// it plays scripted, on time. The work happens in start(emit), in live mode only, after an event is
// already in the store, so the tour never waits on it:
// - The catch: a flag.raised of kind short_payment not keyed b16-bank-books, once per flagId per page
//   load, goes to POST /api/b16/reconcile with the month's records from src/mock (as B01's adapter
//   builds them, without bankTxns: the server reads the bank side from Nessie). The returned flag is
//   emitted only when it carries a nessieId and its figures and recordIds equal the event's, so the
//   demo-critical $340 is exactly the one Nessie confirms.
// - The fund moves: a money.moved of kind project_fund to a community_fund, or of kind milestone,
//   with no nessieId and not keyed b16-bank-books, once per moveId per page load, goes to
//   POST /api/b16/moves. The returned move is emitted only when its payload equals the event's plus
//   nessieId.
// - One request at a time, in arrival order, each fetch aborting at 7.5 seconds. A failure is
//   dropped quietly, because the scripted event already played and keeps its Simulated badge.
// - A twin is emitted only while the store still holds the record it checks, so a seek back before
//   the event never brings the flag or the stitch early. Twins are kept for the page's life: after a
//   seek replays the scripted event, the kept twin is emitted again without a second post.
// - start() also looks at what's already in the store, so a flag or move that played before the
//   adapter turned healthy is checked too. The stop function unsubscribes and keeps what was posted,
//   so a health flap never posts twice.
//
// health(): /api/health must list b16 with keys.nessie true, then /api/b16/status must say the
// co-op's operating account is there (B04's adapter seeds it first). While B16's accounts aren't
// seeded, one POST /api/b16/seed runs in the background (20-second timeout) and health() answers
// false until it's done, retried 20 seconds after a failure (B04's pattern).
import type { CindiaEvent, Payloads } from "../../core/events";
import { deepEqual } from "../../core/reducers/util";
import { getState, onEvent } from "../../core/store";
import { validateEvent } from "../../core/validate";
import { contracts } from "../../mock/channels";
import { monthId as mockMonthId, orders, payouts, refunds, statements } from "../../mock/month";
import { worksInProgress } from "../../mock/projects";
import type { LiveAdapter } from "../types";

const KEY = "b16-bank-books" as const;
/** Each check's fetch gives up at 7.5 seconds, as a produce() fetch would. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
const STATUS_TIMEOUT_MS = 3000;
const SEED_TIMEOUT_MS = 20000;
/** After a failed seed, wait this long before trying again. */
const RETRY_MS = 20000;
/** The commission whose money Cindia holds in `Commissions held by Cindia`. */
const COMMISSION_ID = "wip_01";

type Ev = CindiaEvent;
type FlagEvent = CindiaEvent<"flag.raised">;
type MoveEvent = CindiaEvent<"money.moved">;

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

function postJson(url: string, body: unknown, timeoutMs: number): Promise<unknown> {
  return fetchJson(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, timeoutMs);
}

/** The response's events that are valid, live and keyed b16-bank-books. */
function eventsOf(out: unknown): Ev[] {
  const events = (out as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) throw new Error("no events in the response");
  return (events as Ev[]).filter(
    (e) => e && typeof e === "object" && e.source === "live" && e.key === KEY && validateEvent(e).length === 0,
  );
}

function isNessieId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

// ---------------------------------------------------------------------------------------------
// Health and the background seed

let seededOk = false;
let seeding: Promise<boolean> | null = null;
let retryAt = 0;

function seedBody() {
  const wip = worksInProgress.find((w) => w.id === COMMISSION_ID);
  return { trigger: null, commission: { wipId: COMMISSION_ID, priceCents: wip?.priceCents ?? 0 } };
}

function startSeeding(): void {
  if (seeding) return;
  seeding = postJson("/api/b16/seed", seedBody(), SEED_TIMEOUT_MS)
    .then((out) => Array.isArray((out as { events?: unknown } | null)?.events))
    .catch(() => false)
    .then((ok) => {
      if (ok) seededOk = true;
      else retryAt = performance.now() + RETRY_MS;
      seeding = null;
      return ok;
    });
}

// ---------------------------------------------------------------------------------------------
// What to check, and whether the bank agrees

/** The flag and move records B16 checks: the short payment, the community fund move and a milestone release. */
function wantsFlag(e: Ev): e is FlagEvent {
  if (e.type !== "flag.raised" || e.key === KEY) return false;
  const p = e.payload as Payloads["flag.raised"];
  return p.kind === "short_payment" && !isNessieId(p.nessieId);
}

function wantsMove(e: Ev): e is MoveEvent {
  if (e.type !== "money.moved" || e.key === KEY) return false;
  const p = e.payload as Payloads["money.moved"];
  if (isNessieId(p.nessieId)) return false;
  if (p.kind === "project_fund") return p.to.kind === "community_fund";
  return p.kind === "milestone" && p.from.kind === "cindia";
}

function sameFigures(a: Payloads["flag.raised"], b: Payloads["flag.raised"]): boolean {
  return (
    a.flagId === b.flagId &&
    a.kind === b.kind &&
    a.expectedCents === b.expectedCents &&
    a.actualCents === b.actualCents &&
    a.deltaCents === b.deltaCents &&
    deepEqual(a.recordIds, b.recordIds)
  );
}

function withoutNessie(p: Payloads["money.moved"]): Payloads["money.moved"] {
  const rest = { ...p };
  delete rest.nessieId;
  return rest;
}

/** The twin agrees with the event: same flag and figures, or the same move, plus a nessieId. */
function agrees(twin: Ev, event: Ev): boolean {
  if (twin.type === "flag.raised" && event.type === "flag.raised") {
    const t = twin.payload as Payloads["flag.raised"];
    return isNessieId(t.nessieId) && sameFigures(t, event.payload as Payloads["flag.raised"]);
  }
  if (twin.type === "money.moved" && event.type === "money.moved") {
    const t = twin.payload as Payloads["money.moved"];
    return isNessieId(t.nessieId) && deepEqual(withoutNessie(t), withoutNessie(event.payload as Payloads["money.moved"]));
  }
  return false;
}

/** The store still holds the record this event made, with the same figures. */
function stillInStore(event: Ev): boolean {
  const s = getState();
  if (event.type === "flag.raised") {
    const p = event.payload as Payloads["flag.raised"];
    const f = s.month.flags[p.flagId];
    return Boolean(f) && f.expectedCents === p.expectedCents && f.actualCents === p.actualCents && f.deltaCents === p.deltaCents;
  }
  if (event.type === "money.moved") {
    const p = event.payload as Payloads["money.moved"];
    const m = s.money.moves[p.moveId];
    return Boolean(m) && m.kind === p.kind && m.amountCents === p.amountCents && m.refId === p.refId;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// The checks

/** The month's records, as B01's adapter sends them, without bankTxns. */
function monthRecords() {
  return { orders, payouts, refunds, statements, contracts };
}

async function checkFlag(event: FlagEvent): Promise<Ev | null> {
  const month = getState().month.monthId ?? mockMonthId;
  if (month !== mockMonthId) return null;
  const out = await postJson("/api/b16/reconcile", { trigger: event, monthId: month, records: monthRecords() }, FETCH_TIMEOUT_MS);
  const twin = eventsOf(out).find((e) => e.type === "flag.raised" && (e.payload as Payloads["flag.raised"]).flagId === event.payload.flagId);
  return twin && agrees(twin, event) ? twin : null;
}

async function postMove(event: MoveEvent): Promise<Ev | null> {
  const out = await postJson("/api/b16/moves", { trigger: event }, FETCH_TIMEOUT_MS);
  const twin = eventsOf(out).find((e) => e.type === "money.moved" && (e.payload as Payloads["money.moved"]).moveId === event.payload.moveId);
  return twin && agrees(twin, event) ? twin : null;
}

/** What was posted (or is queued) this page load, and the twins that came back, by flagId or moveId. */
const posted = new Set<string>();
const twins = new Map<string, Ev>();
/** One request at a time, in arrival order. */
let queue: Promise<void> = Promise.resolve();
/** The running start()'s emit, or null while stopped. A queued check emits through whichever is current. */
let current: { emit: (e: Ev) => void } | null = null;

function recordKey(e: Ev): string {
  return e.type === "flag.raised" ? `flag:${(e.payload as Payloads["flag.raised"]).flagId}` : `move:${(e.payload as Payloads["money.moved"]).moveId}`;
}

function emitTwin(twin: Ev, event: Ev): void {
  // Only while started, and only while the store still holds what the twin checks.
  if (current && agrees(twin, event) && stillInStore(event)) current.emit({ ...twin, at: event.at, source: "live", key: KEY });
}

function enqueue(job: () => Promise<void> | void): void {
  queue = queue.then(job).catch(() => {
    // Dropped quietly: the scripted event already played and keeps its Simulated badge.
  });
}

function consider(event: Ev): void {
  const k = recordKey(event);
  const kept = twins.get(k);
  if (kept) {
    // A replayed scripted event: the bank already agreed, so the kept twin lands again, after the
    // event, never from inside the store's own listener call.
    enqueue(() => emitTwin(kept, event));
    return;
  }
  if (posted.has(k)) return;
  posted.add(k);
  enqueue(async () => {
    if (!current) {
      posted.delete(k); // stopped before it ran: nothing was posted, so a later start may post it
      return;
    }
    const twin = event.type === "flag.raised" ? await checkFlag(event as FlagEvent) : await postMove(event as MoveEvent);
    if (!twin) return;
    twins.set(k, twin);
    emitTwin(twin, event);
  });
}

/** Events for the records already in the store, for what played before the adapter turned healthy. */
function eventsInStore(): Ev[] {
  const s = getState();
  const out: Ev[] = [];
  for (const id of s.month.flagIds) {
    const f = s.month.flags[id];
    if (!f) continue;
    const payload: Payloads["flag.raised"] = {
      flagId: f.flagId,
      kind: f.kind,
      recordIds: [...f.recordIds],
      expectedCents: f.expectedCents,
      actualCents: f.actualCents,
      deltaCents: f.deltaCents,
      ...(f.nessieId ? { nessieId: f.nessieId } : {}),
    };
    out.push({ id: `evt_store_${f.flagId}`, type: "flag.raised", at: f.at, source: "scripted", payload } as Ev);
  }
  for (const id of s.money.moveIds) {
    const m = s.money.moves[id];
    if (!m) continue;
    const { at, ...payload } = m;
    out.push({ id: `evt_store_${m.moveId}`, type: "money.moved", at, source: "scripted", payload } as Ev);
  }
  return out;
}

const adapter: LiveAdapter = {
  key: KEY,

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as { routers?: unknown; keys?: { nessie?: unknown } };
    if (!Array.isArray(body?.routers) || !body.routers.includes("b16") || body.keys?.nessie !== true) return false;
    const status = (await fetchJson("/api/b16/status", {}, STATUS_TIMEOUT_MS)) as { operating?: unknown; seeded?: unknown } | null;
    // B04's adapter seeds the co-op's operating account first.
    if (status?.operating !== true) return false;
    if (status.seeded === true) seededOk = true;
    if (seededOk) return true;
    if (!seeding && performance.now() >= retryAt) startSeeding();
    return false;
  },

  // B16 keys no tour event: whatever reaches produce() plays scripted, on time.
  async produce() {
    return [];
  },

  start(emit) {
    const token = { emit };
    current = token;
    const watch = (e: Ev) => {
      if (current !== token) return;
      if (wantsFlag(e) || wantsMove(e)) consider(e);
    };
    // What already played before the adapter turned healthy is in the store: check it too.
    for (const e of eventsInStore()) watch(e);
    const off = onEvent(watch);
    return () => {
      off();
      if (current === token) current = null;
    };
  },
};

export default adapter;
