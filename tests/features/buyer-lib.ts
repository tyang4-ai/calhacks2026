// M-buyer T1: the buyer specs' shared helpers. seekToEvent is re-exported from tests/smoke/lib.ts
// (I2-shell T5) and never copied (contracts section 11, D1-34). tourEvent reaches a tour event by
// what it is: it seeks there when the loaded timeline holds it, and until I2-tour puts v2 events such
// as project.funded ctb_01 into the timeline, it pauses the player and emits the scripted payloads
// from src/mock/ instead. Nothing here seeks to a fixed time.
import { expect, type Page } from "@playwright/test";
import type { EventType, Payloads } from "../../src/core/events";
import { seekToEvent, waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent };

/** One scripted event to emit when the timeline doesn't hold it yet: a type and its src/mock payload. */
export interface SeedEvent<T extends EventType = EventType> {
  type: T;
  payload: Payloads[T];
}

/** Builds a seed with a typed payload. */
export function seed<T extends EventType>(type: T, payload: Payloads[T]): SeedEvent<T> {
  return { type, payload };
}

/** Whether the loaded timeline holds an event of `type` whose payload matches every field in `match`. */
export async function timelineHas(page: Page, type: string, match: Record<string, unknown> = {}): Promise<number | null> {
  return page.evaluate(
    ({ wantType, wantFields }) => {
      const events = window.__cindia?.player.getTimeline()?.events ?? [];
      const hit = events.find(
        (e) =>
          e.type === wantType &&
          Object.entries(wantFields).every(([k, v]) => JSON.stringify(((e.payload ?? {}) as Record<string, unknown>)[k]) === JSON.stringify(v)),
      );
      return hit ? hit.at : null;
    },
    { wantType: type, wantFields: match },
  );
}

/** Pauses the player and emits each seed at the current player time, as scripted events. */
export async function emitSeed(page: Page, events: SeedEvent[]): Promise<void> {
  await page.evaluate((list) => {
    const c = window.__cindia!;
    c.player.pause();
    const now = c.player.now();
    list.forEach((e, i) => {
      c.emit({ id: `evt_seed_${Math.round(now)}_${i + 1}`, type: e.type, at: now, source: "scripted", payload: e.payload });
    });
  }, events);
}

/**
 * Reaches a tour event: when the loaded timeline holds an event of `type` matching `match`, seeks to
 * its time plus `offsetMs` (seekToEvent). Otherwise pauses the player and emits `seeds`, the
 * scripted payloads from src/mock/, at the current time. Returns the player time it ends at.
 */
export async function tourEvent(
  page: Page,
  type: string,
  match: Record<string, unknown>,
  offsetMs: number,
  seeds: SeedEvent[],
): Promise<number> {
  if ((await timelineHas(page, type, match)) !== null) return seekToEvent(page, type, match, offsetMs);
  await emitSeed(page, seeds);
  return page.evaluate(() => window.__cindia!.player.now());
}

/**
 * Makes sure the store holds a tour event at the current time, without moving the clock: when the
 * timeline holds it at or before now, the last seek already applied it; when the timeline doesn't
 * hold it yet (before I2-tour), the seeds are emitted. A timeline event later than now is an error
 * in the spec, so it throws.
 */
export async function withTourEvent(page: Page, type: string, match: Record<string, unknown>, seeds: SeedEvent[]): Promise<void> {
  const at = await timelineHas(page, type, match);
  const now = await page.evaluate(() => window.__cindia!.player.now());
  if (at === null) {
    await emitSeed(page, seeds);
    return;
  }
  if (at > now) throw new Error(`withTourEvent: the timeline's ${type} ${JSON.stringify(match)} is at ${at}, after now (${now})`);
}

/** Opens a route, waits for its slots and the test hooks. */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForSlots(page);
  await waitForHooks(page);
}

/**
 * Moves to another route inside the page, as the kit's Link does, so the store keeps a person's
 * records (a page.goto reloads and clears them). Waits for the new route's slots.
 */
export async function clientNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((to) => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[/.]/g, (c) => `\\${c}`)}$`));
  await waitForSlots(page);
}

/** Pauses and seeks to the very start, which clears the store (a fresh store). */
export async function freshStore(page: Page): Promise<void> {
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(0);
  });
}

/** The store's buyer and projects slices, for checks against src/mock. */
export interface BuyerSlice {
  buyer: {
    openPieceId: string | null;
    checkout: { pieceId: string; grossCents: number } | null;
    checkouts: Record<string, { pieceId: string; grossCents: number }>;
    cards: Record<string, { token: string; last4: string; pieceId?: string }>;
    orderIds: string[];
    orders: Record<string, { orderId: string; pieceId: string; grossCents: number; date: string }>;
    receipts: Record<string, { orderId: string; status: string; makerId: string; makerShareCents: number; paidDate?: string }>;
    splits: Record<string, { pieceId: string; grossCents: number; makerShareCents: number }>;
  };
  projects: { contributions: Record<string, { contributionId: string; projectId: string; amountCents: number; buyerId: string; orderId?: string }> };
}

export function storeSlice(page: Page): Promise<BuyerSlice> {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as BuyerSlice;
    return { buyer: s.buyer, projects: s.projects };
  });
}

/** Every event in the store's log of one type, with its source. */
export function loggedEvents(page: Page, type: string): Promise<{ id: string; type: string; source: string }[]> {
  return page.evaluate((t) => {
    const log = (window.__cindia!.store.getState() as unknown as { log: { entries: { id: string; type: string; source: string }[] } }).log;
    return log.entries.filter((e) => e.type === t).map((e) => ({ id: e.id, type: e.type, source: e.source }));
  }, type);
}

/**
 * "Inside the frame": the element's box sits fully inside frame-buyer and inside every ancestor
 * that clips (overflow other than visible), at the page's size.
 */
export async function expectInsideFrame(page: Page, testId: string, frameTestId = "frame-buyer"): Promise<void> {
  const el = page.getByTestId(testId);
  await expect(el, `${testId} is visible`).toBeVisible();
  const problems = await el.evaluate((node, frameId) => {
    const out: string[] = [];
    const box = node.getBoundingClientRect();
    const inside = (r: DOMRect, name: string) => {
      const slack = 1;
      if (box.left < r.left - slack || box.top < r.top - slack || box.right > r.right + slack || box.bottom > r.bottom + slack) {
        out.push(
          `box ${Math.round(box.left)},${Math.round(box.top)} to ${Math.round(box.right)},${Math.round(box.bottom)} is outside ${name} ` +
            `${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)}`,
        );
      }
    };
    const frame = document.querySelector(`[data-testid="${frameId}"]`);
    if (!frame) out.push(`no ${frameId}`);
    else inside(frame.getBoundingClientRect(), frameId);
    for (let a = node.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") inside(a.getBoundingClientRect(), `clipping ancestor <${a.tagName.toLowerCase()} class="${a.className}">`);
    }
    return out;
  }, frameTestId);
  expect(problems, `${testId} inside the frame`).toEqual([]);
}

/** Parses "$1,234.56" or "-$3.00" into cents. */
export function toCents(text: string): number {
  const neg = text.includes("-");
  const n = Math.round(Number(text.replace(/[^0-9.]/g, "")) * 100);
  return neg ? -n : n;
}
