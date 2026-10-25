// B09 live adapter: the gift finder's three picks come from Claude on the server (api-contract.md,
// B09). On the demo timeline's keyed concierge.answered it posts that event's query, and on a
// buyer's own concierge.asked (source "user", passed on by the registry in live mode) it posts the
// buyer's query. Either way it sends the twelve catalog pieces from src/mock with each maker's name.
// The next scripted beat opens pc_01, so a timeline answer without pc_01 returns [] and the curated
// set plays; a buyer's own request skips that check. Anything missing, invalid or failed throws or
// returns [], and the registry plays the scripted answer.
//
// Prefetch: the timeline plays its scripted concierge.asked 1.5 s before the keyed answer, and the
// Haiku call takes about 2 s. In live mode start() watches the store's event stream for that scripted
// request and posts its query at once, when the keyed answer for the same query is still ahead on the
// player clock (so a seek past the answer posts nothing). produce() for the keyed answer then awaits
// that request instead of starting its own. The timeline's requests are kept per player epoch and
// query, and dropped when the epoch changes (a load, reset or seek) or the adapter stops, so a reset
// never serves an earlier run's request. Scripted mode never starts the adapter, and the watcher
// checks the mode too.
import type { CindiaEvent, Payloads } from "../../core/events";
import { player, type Timeline } from "../../core/player";
import type { Mode } from "../../core/state";
import { getState, onEvent } from "../../core/store";
import type { Lang } from "../../core/types";
import { validateEvent } from "../../core/validate";
import { pieces } from "../../mock/catalog";

// The server's prompt reads "the twelve catalog pieces": the co-op's, now that the catalog holds four communities.
const coopPieces = pieces.filter((p) => p.communityId === "com_dine");
import { makers } from "../../mock/people";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;
const KEY = "b09-concierge" as const;
/** The piece the demo's next scripted beat opens. */
const DEMO_PIECE = "pc_01";
/** The timeline's answer carries no language, so its query is posted in English. */
const TIMELINE_LANG: Lang = "en";

/** What the adapter reads from the store and the player. Tests pass their own. */
export interface ConciergeDeps {
  /** Every event the store applied (onEvent in src/core/store.ts). Returns an unsubscribe. */
  onEvent: (listener: (e: CindiaEvent) => void) => () => void;
  mode: () => Mode;
  /** The player's epoch: counts loads, resets and seeks. */
  epoch: () => number;
  /** The player clock. */
  now: () => number;
  /** The loaded timeline, where the keyed answer to a scripted request is found. */
  timeline: () => Timeline | null;
}

const appDeps: ConciergeDeps = {
  onEvent,
  mode: () => getState().mode,
  epoch: () => player.epoch(),
  now: () => player.now(),
  timeline: () => player.getTimeline(),
};

type Answer = Promise<CindiaEvent[]>;

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
  return coopPieces.map((p) => ({
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

/** One POST /api/b09/concierge. Gives up at 7.5 seconds. */
function post(trigger: CindiaEvent, query: string, lang: Lang): Answer {
  const body = { trigger, query, lang, catalog: catalog() };
  return fetchJson(
    "/api/b09/concierge",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    FETCH_TIMEOUT_MS,
  ).then((out) => {
    const events = (out as { events?: unknown }).events;
    if (!Array.isArray(events)) throw new Error("b09 answered without events");
    return events as CindiaEvent[];
  });
}

/** The valid live concierge.answered for this query, timed to the trigger, or []. */
function answerFor(trigger: CindiaEvent, query: string, events: CindiaEvent[], needDemoPiece: boolean): CindiaEvent[] {
  const ids = new Set(coopPieces.map((p) => p.id));
  const found = events.find((e) => {
    if (!e || e.type !== "concierge.answered" || validateEvent(e).length > 0) return false;
    const p = e.payload as Payloads["concierge.answered"];
    if (p.query !== query) return false;
    if (new Set(p.pieceIds).size !== 3 || !p.pieceIds.every((id) => ids.has(id) && p.reasons[id])) return false;
    return !needDemoPiece || p.pieceIds.includes(DEMO_PIECE);
  });
  return found ? [{ ...found, at: trigger.at, source: "live" as const, key: KEY }] : [];
}

export function createConciergeAdapter(overrides: Partial<ConciergeDeps> = {}): LiveAdapter {
  const deps: ConciergeDeps = { ...appDeps, ...overrides };

  /** A buyer's own requests: one call per query and page load, so asking again never calls Claude again. A failure is forgotten. */
  const own = new Map<string, Answer>();
  function askOwn(trigger: CindiaEvent, query: string, lang: Lang): Answer {
    const cacheKey = `${lang}\u0000${query}`;
    const hit = own.get(cacheKey);
    if (hit) return hit;
    const p = post(trigger, query, lang);
    own.set(cacheKey, p);
    p.catch(() => {
      if (own.get(cacheKey) === p) own.delete(cacheKey);
    });
    return p;
  }

  /**
   * The timeline's requests, one per query in the current epoch. A failed one stays until the epoch
   * changes, so a prefetch that failed early plays the scripted answer on time instead of retrying.
   */
  const timed = new Map<string, Answer>();
  let timedEpoch = deps.epoch();
  function timelineAsk(trigger: CindiaEvent, query: string): Answer {
    const epoch = deps.epoch();
    if (epoch !== timedEpoch) {
      timed.clear();
      timedEpoch = epoch;
    }
    const cacheKey = `${epoch}\u0000${query}`;
    const hit = timed.get(cacheKey);
    if (hit) return hit;
    const p = post(trigger, query, TIMELINE_LANG);
    // Handled here too, so a prefetch nobody awaits (a reset came first) never logs an unhandled rejection.
    p.catch(() => undefined);
    timed.set(cacheKey, p);
    return p;
  }

  /** The timeline's keyed answer to a scripted request at `from`, while it is still ahead on the player clock. */
  function upcomingAnswer(query: string, from: number): CindiaEvent | undefined {
    const now = deps.now();
    return deps.timeline()?.events.find(
      (e) =>
        e.type === "concierge.answered" &&
        e.key === KEY &&
        e.source === "scripted" &&
        e.at >= from &&
        e.at > now &&
        (e.payload as Payloads["concierge.answered"]).query === query,
    );
  }

  /** A scripted concierge.asked in live mode posts the query its keyed answer will need. */
  function prefetch(e: CindiaEvent): void {
    if (e.type !== "concierge.asked" || e.source !== "scripted" || deps.mode() !== "live") return;
    const query = (e.payload as Payloads["concierge.asked"]).query;
    const answer = upcomingAnswer(query, e.at);
    if (answer) void timelineAsk(answer, query);
  }

  return {
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
        // The request is usually in flight already, started by the scripted concierge.asked.
        const query = (event.payload as Payloads["concierge.answered"]).query;
        return answerFor(event, query, await timelineAsk(event, query), true);
      }
      if (event.type === "concierge.asked" && event.source === "user") {
        // A buyer's own request: whatever three pieces Claude picks for it.
        const q = event.payload as Payloads["concierge.asked"];
        return answerFor(event, q.query, await askOwn(event, q.query, q.lang), false);
      }
      return [];
    },

    start() {
      const off = deps.onEvent(prefetch);
      return () => {
        off();
        timed.clear();
      };
    },
  };
}

const adapter: LiveAdapter = createConciergeAdapter();

export default adapter;
