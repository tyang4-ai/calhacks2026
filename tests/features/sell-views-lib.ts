// M-desktop T1: the shared helpers for the nine Sell views' specs (money map, the month, the
// scenario, the close, impact, proof, the dashboard, Ask Cindy and the audit trail).
// - seekToEvent is re-exported from tests/smoke/lib.ts and never copied (B1-28, D1-34).
// - openSell opens a Sell view by its v2 route, with ?drawer= when given, and waits for its slots.
// - expectInsideFrame checks that each test ID's box sits fully inside frame-studio and inside
//   every clipping ancestor, so nothing is cut off at 1440 by 900.
// - Events the timeline doesn't carry yet (the tour's fund moves before I2-tour) are emitted from
//   their src/mock/ payloads at the player's own clock. Events are idempotent by ID, so the same
//   spec keeps passing once the tour carries them.
import { expect, type Locator, type Page } from "@playwright/test";
import type { EventType, Payloads, SourceKey } from "../../src/core/events";
import type { SellView } from "../../src/core/featureTypes";
import { seekToEvent, waitForHooks, waitForSlots, watchPage } from "../smoke/lib";

export { seekToEvent, waitForHooks, waitForSlots, watchPage };

/** The Sell frame's size, which every M-desktop spec runs at. */
export const SELL_VIEWPORT = { width: 1440, height: 900 } as const;

/** The slots each of the nine features' views shows (ui-contract.md, Sell views and Slots). */
const VIEW_SLOTS: Partial<Record<SellView, string[]>> = {
  map: ["studio.map.main"],
  month: ["studio.month.main", "studio.month.side"],
  close: ["studio.close.main", "studio.close.side"],
  proof: ["studio.proof.main"],
  dashboard: ["studio.dashboard.main"],
};

/** The slot each drawer fills. */
const DRAWER_SLOTS: Record<string, string> = {
  ask: "studio.drawer.ask",
  audit: "studio.drawer.audit",
};

export interface SellQuery {
  drawer?: "ask" | "audit" | "support";
  ref?: string;
  /** Any other query parameter, such as process. */
  [key: string]: string | undefined;
}

/** The route for a Sell view and its query, as sellRoute() builds it. */
export function sellPath(view: SellView, query: SellQuery = {}): string {
  const params = new URLSearchParams();
  const { drawer, ref, ...rest } = query;
  if (drawer) params.set("drawer", drawer);
  if (drawer === "audit" && ref) params.set("ref", ref);
  for (const [k, v] of Object.entries(rest)) if (v !== undefined) params.set(k, v);
  const qs = params.toString();
  return `/sell/${view}${qs ? `?${qs}` : ""}`;
}

/**
 * Opens /sell/<view> (with ?drawer= and &ref= when given), waits for the test hooks and for the
 * view's own slots, and the drawer's, to finish loading their features.
 */
export async function openSell(page: Page, view: SellView, query: SellQuery = {}): Promise<void> {
  await page.goto(sellPath(view, query));
  await waitForHooks(page);
  await waitForSlots(page);
  const frame = page.getByTestId("frame-studio");
  await expect(frame).toBeVisible();
  const slots = [...(VIEW_SLOTS[view] ?? [])];
  if (query.drawer && DRAWER_SLOTS[query.drawer]) slots.push(DRAWER_SLOTS[query.drawer]);
  for (const slot of slots) {
    await expect(frame.locator(`[data-slot="${slot}"]`), `slot ${slot} on /sell/${view}`).toHaveAttribute("data-slot-state", "filled");
  }
}

/** A test ID's locator inside the Sell frame. */
export function inFrame(page: Page, testId: string): Locator {
  return page.getByTestId("frame-studio").getByTestId(testId);
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What expectInsideFrame measures for one element. */
interface Fit {
  found: boolean;
  box: Box | null;
  /** Each clipping box (the frame first) the element's box spills out of, by more than the tolerance. */
  spills: string[];
}

/**
 * The element's box against frame-studio and every ancestor that clips (overflow other than
 * visible), all in the page's pixels. Runs in the browser.
 */
async function measureFit(page: Page, testId: string, within: string, tolerancePx: number): Promise<Fit> {
  return page.evaluate(
    ({ id, frameId, tol }) => {
      const frame = document.querySelector(`[data-testid="${frameId}"]`);
      const el = frame?.querySelector(`[data-testid="${id}"]`) ?? null;
      if (!frame || !el) return { found: false, box: null, spills: [] };
      const r = el.getBoundingClientRect();
      const box = { x: r.left, y: r.top, width: r.width, height: r.height };
      const spills: string[] = [];
      const check = (name: string, c: DOMRect) => {
        const out = r.left < c.left - tol || r.top < c.top - tol || r.right > c.right + tol || r.bottom > c.bottom + tol;
        if (out) {
          spills.push(
            `${name} [${Math.round(c.left)},${Math.round(c.top)} ${Math.round(c.width)}x${Math.round(c.height)}] vs [${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}]`,
          );
        }
      };
      check(frameId, frame.getBoundingClientRect());
      for (let a = el.parentElement; a && a !== frame; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const clips = [cs.overflowX, cs.overflowY].some((o) => o !== "visible");
        if (!clips) continue;
        // The ancestor's padding box, where its content is shown: the border box less its borders.
        const b = a.getBoundingClientRect();
        const sx = b.width / (a.offsetWidth || b.width || 1);
        const sy = b.height / (a.offsetHeight || b.height || 1);
        const inner = new DOMRect(b.left + a.clientLeft * sx, b.top + a.clientTop * sy, a.clientWidth * sx, a.clientHeight * sy);
        const tag = a.getAttribute("data-testid") ?? a.getAttribute("data-slot") ?? `${a.tagName.toLowerCase()}${a.className ? `.${String(a.className).split(" ")[0]}` : ""}`;
        check(tag, inner);
      }
      return { found: true, box, spills };
    },
    { id: testId, frameId: within, tol: tolerancePx },
  );
}

/**
 * Each test ID is in frame-studio, has a size, and sits fully inside the frame and every clipping
 * ancestor (within 1 px). Retries with Playwright's default expect timeout, so arrival never needs a
 * wall-clock window (B1-27).
 */
export async function expectInsideFrame(page: Page, testIds: readonly string[], opts: { frame?: string; tolerancePx?: number } = {}): Promise<void> {
  const frameId = opts.frame ?? "frame-studio";
  const tol = opts.tolerancePx ?? 1;
  for (const id of testIds) {
    await expect
      .poll(
        async () => {
          const fit = await measureFit(page, id, frameId, tol);
          if (!fit.found) return `${id}: not in ${frameId}`;
          if (!fit.box || fit.box.width < 1 || fit.box.height < 1) return `${id}: has no size`;
          return fit.spills.length ? `${id}: spills out of ${fit.spills.join("; ")}` : "inside";
        },
        { message: `${id} sits inside ${frameId} and every clipping ancestor` },
      )
      .toBe("inside");
  }
}

/** The page-pixel box of a test ID inside the frame, or null when it isn't there. */
export async function boxOf(page: Page, testId: string, frameId = "frame-studio"): Promise<Box | null> {
  return page.evaluate(
    ({ id, f }) => {
      const el = document.querySelector(`[data-testid="${f}"]`)?.querySelector(`[data-testid="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    },
    { id: testId, f: frameId },
  );
}

/** The smallest box around every given box. */
export function unionBox(boxes: readonly Box[]): Box {
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** The time of the first event of `type` in the loaded timeline whose payload holds every field in `match`, or null. */
export async function timelineAt(page: Page, type: string, match: Record<string, unknown> = {}): Promise<number | null> {
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

/** The time of the last event of `type` in the loaded timeline whose payload holds every field in `match`, or null. */
export async function lastTimelineAt(page: Page, type: string, match: Record<string, unknown> = {}): Promise<number | null> {
  return page.evaluate(
    ({ wantType, wantFields }) => {
      const events = window.__cindia?.player.getTimeline()?.events ?? [];
      const hits = events.filter(
        (e) =>
          e.type === wantType &&
          Object.entries(wantFields).every(([k, v]) => JSON.stringify(((e.payload ?? {}) as Record<string, unknown>)[k]) === JSON.stringify(v)),
      );
      return hits.length ? hits[hits.length - 1].at : null;
    },
    { wantType: type, wantFields: match },
  );
}

/**
 * Seeks to the last event of `type` matching `match`, plus `offsetMs`, the way seekToEvent does for
 * the first one. Returns the player time it stops at.
 */
export async function seekToLastEvent(page: Page, type: string, match: Record<string, unknown> = {}, offsetMs = 0): Promise<number> {
  const at = await lastTimelineAt(page, type, match);
  if (at === null) throw new Error(`seekToLastEvent: the loaded timeline has no ${type} event matching ${JSON.stringify(match)}`);
  const t = at + offsetMs;
  await page.evaluate((ms) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(ms);
  }, t);
  return t;
}

/** One event a spec adds at the player's clock: a type and its src/mock/ payload. */
export interface SeedEvent<T extends EventType = EventType> {
  type: T;
  payload: Payloads[T];
  key?: SourceKey;
  source?: "scripted" | "live" | "user";
  id?: string;
}

/** Builds a seed with a typed payload. */
export function seed<T extends EventType>(type: T, payload: Payloads[T], extra: Omit<SeedEvent<T>, "type" | "payload"> = {}): SeedEvent<T> {
  return { type, payload, ...extra };
}

let seedCount = 0;

/**
 * Pauses the player and emits each seed stamped at the player's current clock (plus `offsetMs`, so
 * -1000 stamps a move whose stitch has already finished), in order, as scripted events unless a seed
 * says otherwise. A later seek replays only the timeline, so it drops these. Returns the stamp.
 */
export async function emitAtClock(page: Page, events: readonly SeedEvent[], offsetMs = 0): Promise<number> {
  const out = events.map((e) => {
    // A live event's ID starts with evt_live_ and a person's with evt_user_ (validate.ts).
    const prefix = e.source === "live" ? "evt_live_mdesk_" : e.source === "user" ? "evt_user_mdesk_" : "evt_mdesk_";
    const ev: Record<string, unknown> = {
      id: e.id ?? `${prefix}${++seedCount}`,
      type: e.type,
      source: e.source ?? "scripted",
      payload: e.payload,
    };
    if (e.key) ev.key = e.key;
    return ev;
  });
  return page.evaluate(
    ({ evs, offset }) => {
      const c = window.__cindia!;
      c.player.pause();
      const at = Math.max(0, Math.round(c.player.now() + offset));
      for (const e of evs) c.emit({ ...e, at });
      return at;
    },
    { evs: out, offset: offsetMs },
  );
}

/**
 * Reaches a tour event by what it is: seeks to it (plus `offsetMs`) when the loaded timeline holds
 * it, and otherwise emits `seeds`, its scripted payloads from src/mock/, stamped `offsetMs` before
 * the current clock, so the page is `offsetMs` past them either way.
 */
export async function tourEvent(page: Page, type: string, match: Record<string, unknown>, offsetMs: number, seeds: readonly SeedEvent[]): Promise<void> {
  if ((await timelineAt(page, type, match)) !== null) {
    await seekToEvent(page, type, match, offsetMs);
    return;
  }
  await emitAtClock(page, seeds, -offsetMs);
}

/** Pauses and seeks to the very start of the timeline, so the store is fresh. */
export async function freshStore(page: Page): Promise<void> {
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(0);
  });
}

/** The month's moments, by event: its start, its last match.made before the catch, the flag and its explanation. */
export interface MonthAnchors {
  start: number;
  lastMatch: number;
  flag: number;
  explained: number;
}

/** Reads the month's moments from the loaded timeline, so specs never use fixed times. */
export async function monthAnchors(page: Page): Promise<MonthAnchors> {
  const out = await page.evaluate(() => {
    const events = window.__cindia?.player.getTimeline()?.events ?? [];
    const start = events.find((e) => e.type === "month.started")?.at ?? null;
    const flag = events.find((e) => e.type === "flag.raised")?.at ?? null;
    const explained = events.find((e) => e.type === "flag.explained")?.at ?? null;
    const matches = events.filter((e) => e.type === "match.made" && (flag === null || e.at < flag)).map((e) => e.at);
    return { start, flag, explained, lastMatch: matches.length ? Math.max(...matches) : null };
  });
  for (const [k, v] of Object.entries(out)) if (v === null) throw new Error(`monthAnchors: the loaded timeline has no ${k}`);
  return out as MonthAnchors;
}

/** Pauses and seeks the player to a time on its clock that a spec computed from the events' own times. */
export async function seekTo(page: Page, ms: number): Promise<void> {
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
}

/** Cycles the language toggle until the store's lang is `want` ("auto", "en" or "zh"). */
export async function setLang(page: Page, want: "auto" | "en" | "zh"): Promise<void> {
  const toggle = page.getByTestId("demo-lang-toggle");
  for (let i = 0; i < 3; i += 1) {
    const now = await page.evaluate(() => window.__cindia!.store.getState().lang);
    if (now === want) return;
    await toggle.click();
  }
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().lang)).toBe(want);
}

/** The player's clock now. */
export function playerNow(page: Page): Promise<number> {
  return page.evaluate(() => window.__cindia!.player.now());
}

/** Whether an element scrolls sideways (its content is wider than its box). */
export async function scrollsSideways(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
}

/** What readableText found: every problem with where it is. Empty lists mean the scope reads cleanly. */
export interface TextReport {
  /** Text drawn under 14 px (its font size times the SVG's screen scale for SVG text). */
  small: string[];
  /** Text that shows an ellipsis. */
  ellipsis: string[];
  /** Elements that hide part of their own text (overflow hidden or clip, content larger than the box). */
  clipped: string[];
}

/**
 * Measures every visible text in `scope` (a CSS selector, inside frame-studio) the way the G3
 * verifier does: the size each text draws at, any ellipsis, and any element that hides part of its
 * own text. Text that a scrolling area has scrolled out of view isn't clipped; it scrolls.
 */
export async function readableText(page: Page, scope: string, frameId = "frame-studio"): Promise<TextReport> {
  return page.evaluate(
    ({ sel, f }) => {
      const out = { small: [] as string[], ellipsis: [] as string[], clipped: [] as string[] };
      const roots = [...(document.querySelector(`[data-testid="${f}"]`)?.querySelectorAll(sel) ?? [])];
      for (const root of roots) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const seen = new Set<Element>();
        while (walker.nextNode()) {
          const n = walker.currentNode;
          const txt = (n.textContent ?? "").trim();
          const el: Element | null = n.parentElement;
          if (!txt || !el || seen.has(el)) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
          if (el.closest("[aria-hidden='true']") && !(el instanceof SVGElement)) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const r = range.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          seen.add(el);
          const at = el.closest("[data-testid]")?.getAttribute("data-testid") ?? el.tagName.toLowerCase();
          let px = parseFloat(cs.fontSize);
          if (el instanceof SVGGraphicsElement) {
            const m = el.getScreenCTM();
            if (m) px *= Math.hypot(m.a, m.b);
          }
          if (px < 13.95) out.small.push(`${at}: "${txt.slice(0, 40)}" at ${Math.round(px * 10) / 10} px`);
          if (/…|\.\.\./.test(txt)) out.ellipsis.push(`${at}: "${txt.slice(0, 60)}"`);
          // SVG text past the edge of an svg that hides its overflow (Recharts' surface does).
          if (el instanceof SVGElement) {
            const svg = (el as SVGElement).closest("svg");
            const scs = svg ? getComputedStyle(svg) : null;
            if (svg && scs && ["hidden", "clip"].includes(scs.overflowX)) {
              const b = svg.getBoundingClientRect();
              if (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1) {
                out.clipped.push(`${at}: svg text "${txt.slice(0, 40)}" runs past its chart`);
              }
            }
          }
        }
        for (const el of [root, ...root.querySelectorAll("*")]) {
          if (!(el instanceof HTMLElement) || !(el.textContent ?? "").trim()) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          // A visually hidden label for screen readers (1 by 1 px) isn't text on screen.
          if (el.clientWidth <= 1 && el.clientHeight <= 1) continue;
          const hidesX = ["hidden", "clip"].includes(cs.overflowX);
          const hidesY = ["hidden", "clip"].includes(cs.overflowY);
          const wide = hidesX && el.scrollWidth > el.clientWidth + 1;
          const tall = hidesY && el.scrollHeight > el.clientHeight + 1;
          const at = el.closest("[data-testid]")?.getAttribute("data-testid") ?? el.tagName.toLowerCase();
          if (wide || tall) out.clipped.push(`${at}: <${el.tagName.toLowerCase()}> ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight} "${(el.textContent ?? "").trim().slice(0, 40)}"`);
        }
      }
      return out;
    },
    { sel: scope, f: frameId },
  );
}

/** No text in `scope` under 14 px, none with an ellipsis, none clipped, at 1440 by 900. */
export async function expectReadableText(page: Page, scope: string, frameId = "frame-studio"): Promise<void> {
  const report = await readableText(page, scope, frameId);
  expect(report.small, `text under 14 px in ${scope}`).toEqual([]);
  expect(report.ellipsis, `text cut with an ellipsis in ${scope}`).toEqual([]);
  expect(report.clipped, `text clipped by its box in ${scope}`).toEqual([]);
}

/**
 * The URL the page itself loaded src/core/store.ts from, for specs that import the store module in
 * the page to listen with onEvent. Once the dev server has hot-updated the store (another agent's
 * edit to shared code), Vite serves it as `/src/core/store.ts?t=<time>`, and importing the bare path
 * would load a second store. The URL comes from how the dev server rewrote testHooks.ts's import,
 * or from the page's own resource list, and is checked against window.__cindia's store before use.
 */
export async function storeModuleUrl(page: Page): Promise<string> {
  const url = await page.evaluate(async () => {
    const candidates: string[] = [];
    try {
      const code = await (await fetch("/src/core/testHooks.ts")).text();
      const m = /from\s+["'](\/src\/core\/store\.ts[^"']*)["']/.exec(code);
      if (m) candidates.push(m[1]);
    } catch {
      // The dev server didn't answer; fall back to the resource list.
    }
    for (const e of performance.getEntriesByType("resource")) {
      if (/\/src\/core\/store\.ts(\?|$)/.test(e.name)) {
        const u = new URL(e.name);
        candidates.push(u.pathname + u.search);
      }
    }
    candidates.push("/src/core/store.ts");
    for (const c of candidates) {
      const mod = (await import(/* @vite-ignore */ c)) as { getState(): unknown };
      if (mod.getState() === window.__cindia!.store.getState()) return c;
    }
    return null;
  });
  if (url === null) throw new Error("storeModuleUrl: no URL gives the page's own store instance");
  return url;
}

/** How a drawer slot sits in its frame: found through the slot's wrapper, never a class. */
export interface DrawerFit {
  /** The slot wrapper's box and the frame's, in page pixels. */
  slot: Box;
  frame: Box;
  /** The nearest ancestor of the slot that scrolls (the drawer's body): its sizes. */
  scroller: { clientWidth: number; scrollWidth: number; clientHeight: number; scrollHeight: number } | null;
  /** The page itself: whether the document scrolls either way. */
  pageScrolls: boolean;
}

export async function drawerFit(page: Page, slotId: string, frameId = "frame-studio"): Promise<DrawerFit> {
  return page.evaluate(
    ({ slot, f }) => {
      const frame = document.querySelector(`[data-testid="${f}"]`)!;
      const el = frame.querySelector(`[data-slot="${slot}"]`)!;
      const s = el.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      let scroller: Element | null = null;
      for (let a = el.parentElement; a && a !== frame; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (["auto", "scroll"].includes(cs.overflowY) || ["auto", "scroll"].includes(cs.overflowX)) {
          scroller = a;
          break;
        }
      }
      const doc = document.scrollingElement!;
      return {
        slot: { x: s.left, y: s.top, width: s.width, height: s.height },
        frame: { x: fr.left, y: fr.top, width: fr.width, height: fr.height },
        scroller: scroller
          ? { clientWidth: scroller.clientWidth, scrollWidth: scroller.scrollWidth, clientHeight: scroller.clientHeight, scrollHeight: scroller.scrollHeight }
          : null,
        pageScrolls: doc.scrollWidth > window.innerWidth + 1 || doc.scrollHeight > window.innerHeight + 1,
      };
    },
    { slot: slotId, f: frameId },
  );
}
