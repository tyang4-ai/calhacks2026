// B04 live adapter: the studio's bank account on Capital One's Nessie sandbox (api-contract.md, B04).
//
// health(): /api/health must list b04 with keys.nessie true. Then /api/b04/status, and when the
// account isn't seeded, one POST /api/b04/seed with September's bank history from src/mock (without
// the buyer's sale pay_001 and the maker payouts, which the demo posts live). The seed can take up to
// 30 seconds, so it runs in the background when live mode is switched on and health() reports false
// until it's done. It never runs inside the demo's 8-second produce() window.
//
// produce():
// - The sale (order.placed for ord_001, or its settlement money.moved): one POST /api/b04/sale,
//   cached, and each of the two events gets its live twin from that one response.
// - The sale's other moves (the buyer's payment mv_0001 and the card fee mv_0002): [], since Nessie
//   records only the settlement.
// - The first payout.sent: one POST /api/b04/payouts with all three maker payouts, cached. Each
//   payout.sent and each maker_pay money.moved gets its twin from it, and the last maker_pay move also
//   carries the response's account.synced, because the demo has no later account.synced.
// - account.synced: the cached live balance for the same as-of date, or [] before any live call.
//
// Demo-critical figures are checked against src/mock: the sale deposit is 15648, the balance after it
// is balanceAsOf("2026-09-01") (1265648), and the payouts match the maker payouts. A live figure that
// disagrees is dropped, so the registry plays the scripted event and the panel keeps its Simulated
// badge. Every fetch has a timeout, and any failure throws or returns [].
import type { CindiaEvent, Payloads } from "../../core/events";
import { validateEvent } from "../../core/validate";
import { pieces } from "../../mock/catalog";
import { balanceAsOf, bankTxns, makerPayoutDate, makerPayouts, openingBalanceCents, orders, payoutForOrder } from "../../mock/month";
import { studio } from "../../mock/people";
import type { LiveAdapter } from "../types";

const KEY = "b04-bank" as const;
/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
const STATUS_TIMEOUT_MS = 7500;
const SEED_TIMEOUT_MS = 30000;
/** How long health() waits on a seed before answering false for now. */
const HEALTH_WAIT_MS = 4000;
/** After a failed status or seed, wait this long before trying again. */
const RETRY_MS = 20000;

const order = orders[0]; // ord_001
const settlement = payoutForOrder(order.id); // pay_001
const pieceTitle = pieces.find((p) => p.id === order.pieceId)?.title.en ?? order.pieceId;
const SALE_MOVE_ID = "mv_0003";
const PAYOUT_MOVE_IDS = makerPayouts.map((_, i) => `mv_${String(4 + i).padStart(4, "0")}`);
const LAST_PAYOUT_ID = makerPayouts[makerPayouts.length - 1]?.id;

type Ev = CindiaEvent;

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

/** The response's events that are valid, live and keyed b04-bank. */
function eventsOf(out: unknown): Ev[] {
  const events = (out as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) throw new Error("no events in the response");
  return (events as Ev[]).filter((e) => e && typeof e === "object" && validateEvent(e).length === 0 && e.key === KEY);
}

function twin(e: Ev, trigger: Ev): Ev {
  return { ...e, at: trigger.at, source: "live", key: KEY };
}

// ---------------------------------------------------------------------------------------------
// Seeding, from health()

function line(t: (typeof bankTxns)[number]) {
  return { id: t.id, date: t.date, amountCents: t.amountCents, memo: t.memo, refId: t.refId };
}

function seedBody() {
  const skip = new Set<string>([settlement.id, ...makerPayouts.map((m) => m.id)]);
  const history = bankTxns.filter((t) => !skip.has(t.refId));
  return {
    trigger: null,
    studio: { id: studio.id, name: studio.name, openingBalanceCents },
    history: {
      deposits: history.filter((t) => t.direction === "in").map(line),
      withdrawals: history.filter((t) => t.direction === "out").map(line),
    },
  };
}

let seeded = false;
let seeding: Promise<boolean> | null = null;
let retryAt = 0;

async function ensureSeeded(): Promise<boolean> {
  const status = (await fetchJson("/api/b04/status", {}, STATUS_TIMEOUT_MS)) as { seeded?: unknown };
  if (status?.seeded === true) return true;
  const out = await postJson("/api/b04/seed", seedBody(), SEED_TIMEOUT_MS);
  return eventsOf(out).some((e) => e.type === "account.synced");
}

function startSeeding(): Promise<boolean> {
  if (!seeding) {
    seeding = ensureSeeded()
      .catch(() => false)
      .then((ok) => {
        seeded = ok;
        if (!ok) retryAt = performance.now() + RETRY_MS;
        seeding = null;
        return ok;
      });
  }
  return seeding;
}

// ---------------------------------------------------------------------------------------------
// The sale and the payouts, each posted once and cached

interface SaleResult {
  order: Ev | null;
  move: Ev | null;
  synced: Ev | null;
}

interface PayoutsResult {
  sent: Map<string, Ev>;
  moves: Map<string, Ev>;
  synced: Ev | null;
}

let salePromise: Promise<SaleResult> | null = null;
let payoutsPromise: Promise<PayoutsResult> | null = null;

function syncedIfRight(events: Ev[], asOf: string): Ev | null {
  const s = events.find((e) => e.type === "account.synced") as CindiaEvent<"account.synced"> | undefined;
  if (!s) return null;
  // The demo-critical balance: the live path reproduces src/mock's figure or falls back.
  return s.payload.asOf === asOf && s.payload.balanceCents === balanceAsOf(asOf) ? s : null;
}

async function postSale(trigger: Ev): Promise<SaleResult> {
  const out = await postJson(
    "/api/b04/sale",
    {
      trigger,
      orderId: order.id,
      payoutId: settlement.id,
      netCents: settlement.netCents,
      date: settlement.date,
      description: `Cindia sale ${order.id}, ${pieceTitle}, net of fees`,
      pieceId: order.pieceId,
      channelId: order.channelId,
      buyerId: order.buyerId,
      grossCents: order.grossCents,
      moveId: SALE_MOVE_ID,
    },
    FETCH_TIMEOUT_MS,
  );
  const events = eventsOf(out);
  const placed = events.find((e) => e.type === "order.placed") as CindiaEvent<"order.placed"> | undefined;
  const move = events.find((e) => e.type === "money.moved") as CindiaEvent<"money.moved"> | undefined;
  const okOrder =
    placed && placed.payload.orderId === order.id && placed.payload.grossCents === order.grossCents && placed.payload.pieceId === order.pieceId;
  const okMove =
    move &&
    move.payload.moveId === SALE_MOVE_ID &&
    move.payload.kind === "settlement" &&
    move.payload.amountCents === settlement.netCents &&
    move.payload.refId === settlement.id &&
    typeof move.payload.nessieId === "string";
  return { order: okOrder ? placed : null, move: okMove ? move : null, synced: syncedIfRight(events, settlement.date) };
}

function sale(trigger: Ev): Promise<SaleResult> {
  if (!salePromise) {
    salePromise = postSale(trigger);
    salePromise.catch(() => {
      salePromise = null; // a failed call is tried again on the next sale event
    });
  }
  return salePromise;
}

async function postPayouts(trigger: Ev): Promise<PayoutsResult> {
  const out = await postJson(
    "/api/b04/payouts",
    {
      trigger,
      makerPayouts: makerPayouts.map((m, i) => ({
        makerPayoutId: m.id,
        makerId: m.makerId,
        amountCents: m.amountCents,
        date: makerPayoutDate,
        moveId: PAYOUT_MOVE_IDS[i],
      })),
    },
    FETCH_TIMEOUT_MS,
  );
  const events = eventsOf(out);
  const sent = new Map<string, Ev>();
  const moves = new Map<string, Ev>();
  makerPayouts.forEach((m, i) => {
    const s = events.find(
      (e) => e.type === "payout.sent" && (e.payload as Payloads["payout.sent"]).makerPayoutId === m.id,
    ) as CindiaEvent<"payout.sent"> | undefined;
    if (s && s.payload.amountCents === m.amountCents && s.payload.makerId === m.makerId && s.payload.date === makerPayoutDate) {
      sent.set(m.id, s);
    }
    const mv = events.find(
      (e) => e.type === "money.moved" && (e.payload as Payloads["money.moved"]).refId === m.id,
    ) as CindiaEvent<"money.moved"> | undefined;
    if (
      mv &&
      mv.payload.kind === "maker_pay" &&
      mv.payload.moveId === PAYOUT_MOVE_IDS[i] &&
      mv.payload.amountCents === m.amountCents &&
      typeof mv.payload.nessieId === "string"
    ) {
      moves.set(m.id, mv);
    }
  });
  return { sent, moves, synced: syncedIfRight(events, makerPayoutDate) };
}

function payouts(trigger: Ev): Promise<PayoutsResult> {
  if (!payoutsPromise) {
    payoutsPromise = postPayouts(trigger);
    payoutsPromise.catch(() => {
      payoutsPromise = null;
    });
  }
  return payoutsPromise;
}

async function syncedFor(event: CindiaEvent<"account.synced">): Promise<Ev[]> {
  const asOf = event.payload.asOf;
  for (const p of [salePromise, payoutsPromise]) {
    if (!p) continue;
    try {
      const r = await p;
      if (r.synced && (r.synced as CindiaEvent<"account.synced">).payload.asOf === asOf) return [twin(r.synced, event)];
    } catch {
      // that call failed; the scripted balance plays
    }
  }
  return [];
}

const adapter: LiveAdapter = {
  key: KEY,

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as { routers?: unknown; keys?: { nessie?: unknown } };
    if (!Array.isArray(body?.routers) || !body.routers.includes("b04") || body.keys?.nessie !== true) return false;
    if (seeded) return true;
    if (!seeding && performance.now() < retryAt) return false;
    const wait = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), HEALTH_WAIT_MS));
    return Promise.race([startSeeding(), wait]);
  },

  async produce(event) {
    switch (event.type) {
      case "order.placed": {
        const p = event.payload as Payloads["order.placed"];
        if (p.orderId !== order.id) return [];
        const r = await sale(event);
        return r.order ? [twin(r.order, event)] : [];
      }
      case "money.moved": {
        const p = event.payload as Payloads["money.moved"];
        if (p.kind === "settlement" && p.refId === settlement.id) {
          const r = await sale(event);
          return r.move ? [twin(r.move, event)] : [];
        }
        if (p.kind === "maker_pay") {
          const r = await payouts(event);
          const mv = r.moves.get(p.refId);
          if (!mv) return [];
          const out = [twin(mv, event)];
          if (p.refId === LAST_PAYOUT_ID && r.synced) out.push(twin(r.synced, event));
          return out;
        }
        // The buyer's payment and the card fee: Nessie records only the settlement.
        return [];
      }
      case "payout.sent": {
        const p = event.payload as Payloads["payout.sent"];
        const r = await payouts(event);
        const s = r.sent.get(p.makerPayoutId);
        return s ? [twin(s, event)] : [];
      }
      case "account.synced":
        return syncedFor(event as CindiaEvent<"account.synced">);
      default:
        return [];
    }
  },
};

export default adapter;
