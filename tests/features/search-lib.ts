// F-search's spec helper (T0). It re-exports seekToEvent from tests/smoke/lib.ts and never copies
// it, and adds tourEvent(): seek to a tour event once the loaded timeline holds it (after I2-tour),
// and until then pause the player and emit the scripted payloads from src/mock/search.ts in tour
// order. It never seeks to a fixed time. Expected values come from src/mock/, never typed in.
import { expect, type Locator, type Page } from "@playwright/test";
import { demoSearch, demoSurprise, report } from "../../src/mock/index";
import { seekToEvent, waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent };

/** The tour's IDs for figure 11's query and figure 12's draw (data-model.md, ID scheme). */
export const TOUR_QUERY_ID = "qry_01";
export const TOUR_SURPRISE_ID = "srp_01";

/** One event to emit when the timeline doesn't hold the tour event yet: its type, payload and key. */
export interface SeedEvent {
  type: string;
  payload: Record<string, unknown>;
  key?: string;
}

let seedCounter = 0;

/**
 * Reaches a tour event by what it is. When `window.__cindia.player.getTimeline()` holds an event of
 * `type` whose payload matches `match`, it pauses and seeks there plus `offsetMs` (seekToEvent).
 * Otherwise it pauses the player and emits `seed`, in order, as scripted events stamped with the
 * player's own clock, through `window.__cindia.emit()`. Returns the player time it ended at.
 */
export async function tourEvent(
  page: Page,
  type: string,
  match: Record<string, unknown> = {},
  offsetMs = 0,
  seed: SeedEvent[] = [],
): Promise<number> {
  const inTimeline = await page.evaluate(
    ({ wantType, wantFields }) => {
      const events = window.__cindia?.player.getTimeline()?.events ?? [];
      return events.some(
        (e) =>
          e.type === wantType &&
          Object.entries(wantFields).every(([k, v]) => JSON.stringify(((e.payload ?? {}) as Record<string, unknown>)[k]) === JSON.stringify(v)),
      );
    },
    { wantType: type, wantFields: match },
  );
  if (inTimeline) return seekToEvent(page, type, match, offsetMs);
  const base = seedCounter;
  seedCounter += seed.length;
  return page.evaluate(
    ({ events, start }) => {
      const c = window.__cindia!;
      c.player.pause();
      const at = Math.round(c.player.now());
      events.forEach((e, i) => {
        const id = `evt_${String(900000 + start + i)}`;
        c.emit({ id, type: e.type, at, source: "scripted", ...(e.key ? { key: e.key } : {}), payload: e.payload } as never);
      });
      return at;
    },
    { events: seed, start: base },
  );
}

/** The tour's search.queried (figure 11), with qry_01. */
export function tourQuerySeed(): SeedEvent {
  return { type: "search.queried", payload: { queryId: TOUR_QUERY_ID, ...structuredClone(demoSearch.query) } };
}

/** The tour's search.answered (figure 11), with qry_01, keyed b12-search. */
export function tourAnswerSeed(): SeedEvent {
  return { type: "search.answered", key: "b12-search", payload: { queryId: TOUR_QUERY_ID, ...structuredClone(demoSearch.answer) } };
}

/** The tour's surprise.asked (figure 12), with srp_01. */
export function tourAskSeed(): SeedEvent {
  return { type: "surprise.asked", payload: { surpriseId: TOUR_SURPRISE_ID, ...structuredClone(demoSurprise.ask) } };
}

/** The tour's surprise.drawn (figure 12), with srp_01, keyed b12-search. */
export function tourDrawSeed(): SeedEvent {
  return { type: "surprise.drawn", key: "b12-search", payload: { surpriseId: TOUR_SURPRISE_ID, ...structuredClone(demoSurprise.draw) } };
}

/** The tour's model.trained and proof.search_scored, which land at d01-vibe's start only when a report exists. */
export function tourModelSeeds(): SeedEvent[] {
  if (!report) return [];
  return [
    { type: "model.trained", key: "b11-embed", payload: structuredClone(report.trained) as unknown as Record<string, unknown> },
    { type: "proof.search_scored", key: "b11-embed", payload: structuredClone(report.scored) as unknown as Record<string, unknown> },
  ];
}

/** Reaches the tour's search.queried (figure 11): the query is in the store, its answer isn't. */
export function tourQueried(page: Page): Promise<number> {
  return tourEvent(page, "search.queried", { queryId: TOUR_QUERY_ID }, 0, [...tourModelSeeds(), tourQuerySeed()]);
}

/** Reaches the tour's search.answered (figure 11): the query and its answer are in the store. */
export function tourAnswered(page: Page): Promise<number> {
  return tourEvent(page, "search.answered", { queryId: TOUR_QUERY_ID }, 0, [...tourModelSeeds(), tourQuerySeed(), tourAnswerSeed()]);
}

/**
 * Reaches the tour's surprise.drawn (figure 12). With the timeline holding it, the seek replays the
 * search before it too. Without, it seeds the draw alone: call tourAnswered() first for both.
 */
export function tourDrawn(page: Page): Promise<number> {
  return tourEvent(page, "surprise.drawn", { surpriseId: TOUR_SURPRISE_ID }, 0, [tourAskSeed(), tourDrawSeed()]);
}

/** Emits one test payload (not a tour event) as a scripted event, such as a proof.search_scored. */
export async function emitTest(page: Page, type: string, payload: Record<string, unknown>, key?: string): Promise<void> {
  const n = seedCounter;
  seedCounter += 1;
  await page.evaluate(
    ({ evType, evPayload, evKey, idNum }) => {
      const c = window.__cindia!;
      const at = Math.round(c.player.now());
      c.emit({ id: `evt_${String(idNum)}`, type: evType, at, source: "scripted", ...(evKey ? { key: evKey } : {}), payload: evPayload } as never);
    },
    { evType: type, evPayload: payload, evKey: key, idNum: 950000 + n },
  );
}

/** Opens a route on a fresh page, waits for the test hooks and every slot, and pauses the player. */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHooks(page);
  await waitForSlots(page);
  await page.evaluate(() => window.__cindia!.player.pause());
}

/** The store's search, surprise and model areas, for checks on what was emitted. */
export async function searchState(page: Page) {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      search: {
        queries: Record<string, { queryId: string; text: string; keywords: string[]; lang: string; filters?: { maxPriceCents?: number; communityIds?: string[] }; at: number }>;
        answers: Record<string, { queryId: string; results: { pieceId: string; score: number; closeness?: number; matched: string[] }[]; engine: string; at: number }>;
        latestQueryId: string | null;
      };
      surprise: {
        asks: Record<string, { surpriseId: string; keyword?: string; method: string; seed: number; at: number }>;
        draws: Record<string, { surpriseId: string; pieceId: string; method: string; at: number }>;
        latestSurpriseId: string | null;
      };
      model: { trained: unknown; scored: unknown };
      sources: Record<string, string>;
    };
    return { search: s.search, surprise: s.surprise, model: s.model, sources: s.sources };
  });
}

/** Every logged event of a type, as the store's log keeps it (id, type, at, source, key). */
export async function loggedEvents(page: Page, type: string) {
  return page.evaluate((t) => {
    const s = window.__cindia!.store.getState() as unknown as { log: { entries: { id: string; type: string; at: number; source: string; key?: string }[] } };
    return s.log.entries.filter((e) => e.type === t);
  }, type);
}

/** The person's own queries in the store (source user), oldest first by their qry_user_ number. */
export async function userQueries(page: Page) {
  const { search } = await searchState(page);
  return Object.values(search.queries)
    .filter((q) => q.queryId.startsWith("qry_user_"))
    .toSorted((a, b) => Number(a.queryId.slice(9)) - Number(b.queryId.slice(9)));
}

/** A slot's wrapper, so a check stays inside one slot (the process bar has its own badge). */
export function slot(page: Page, slotId: string): Locator {
  return page.locator(`[data-slot="${slotId}"]`);
}

/** The page size the frame tests use: the kit's 1440 by 900 PageFrame, so the viewport is the frame. */
export const FRAME_VIEWPORT = { width: 1440, height: 900 };

/**
 * The test ID's element shows inside the 1440 by 900 frame that holds it (D1-7): its box meets the
 * frame's, and it isn't scrolled or clipped out of view, as the demo harness judges On screen IDs.
 * With `whole`, all of it shows. Call it with the page at FRAME_VIEWPORT.
 */
export async function expectInFrame(page: Page, testId: string, { frameTestId = "frame-buyer", whole = false } = {}): Promise<void> {
  const el = page.getByTestId(testId).first();
  await expect(el, `${testId} is in view`).toBeInViewport(whole ? { ratio: 0.99 } : undefined);
  const frame = await page.getByTestId(frameTestId).boundingBox();
  const box = await el.boundingBox();
  expect(frame, `${frameTestId} has a box`).not.toBeNull();
  expect(box, `${testId} has a box`).not.toBeNull();
  const f = frame!;
  const b = box!;
  const meets = b.x < f.x + f.width && b.x + b.width > f.x && b.y < f.y + f.height && b.y + b.height > f.y;
  expect(meets, `${testId} meets ${frameTestId}`).toBe(true);
  if (whole) {
    expect(b.y + b.height, `${testId} bottom edge inside ${frameTestId}`).toBeLessThanOrEqual(f.y + f.height + 1);
    expect(b.x + b.width, `${testId} right edge inside ${frameTestId}`).toBeLessThanOrEqual(f.x + f.width + 1);
  }
}
