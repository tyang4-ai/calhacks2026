// Shared Playwright helpers: console and request watchers, waits on window.__cindia, the slot
// checks, and seekToEvent. Feature tests import these too, and a feature's own <slug>-lib.ts may
// re-export seekToEvent but never copies it.
import { expect, type Frame, type Locator, type Page, type Request } from "@playwright/test";
import { PROCESS_IDS as CORE_PROCESS_IDS } from "../../src/core/events";
import { SLOT_IDS as CORE_SLOT_IDS } from "../../src/core/featureTypes";

/** Every slot ID in ui-contract.md (Slots), v1's and v2's. */
export const SLOT_IDS: readonly string[] = CORE_SLOT_IDS;

/** v1's twelve slots. */
export const V1_SLOT_IDS = [
  "buyer.main",
  "studio.map.main",
  "studio.month.main",
  "studio.month.side",
  "studio.close.main",
  "studio.close.side",
  "studio.proof.main",
  "studio.dashboard.main",
  "studio.drawer.ask",
  "studio.drawer.audit",
  "owner.main",
  "maker.main",
] as const;

/** The slots v2 adds. */
export const V2_SLOT_IDS: readonly string[] = SLOT_IDS.filter((s) => !(V1_SLOT_IDS as readonly string[]).includes(s));

/** The eleven process IDs, in the process bar's order (ui-contract.md, The process bar and views). */
export const PROCESS_IDS: readonly string[] = CORE_PROCESS_IDS;

/** L1 and L2, word for word from glossary.md's label table. */
export const L1_EN = "Demo. Every maker, community and story here is fictional. Nothing is for sale.";
export const L1_ZH = "演示版。这里的每位匠人、每个社区和每个故事都是虚构的。所有物品均不出售。";
export const L2_EN = "Demo: the Sell side is open so you can look around. In a real launch, only the co-op sees or approves anything here.";

export type SlotIdString = (typeof SLOT_IDS)[number];

export const slotTestId = (slot: string) => `slot-${slot.replace(/\./g, "-")}`;
export const slotErrorTestId = (slot: string) => `slot-error-${slot.replace(/\./g, "-")}`;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLocal(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === "data:" || u.protocol === "blob:" || u.protocol === "about:") return true;
    return LOCAL_HOSTS.has(u.hostname);
  } catch {
    return true;
  }
}

/** The error Chromium gives every request, localhost included, while the context is offline. */
const DISCONNECTED = "net::ERR_INTERNET_DISCONNECTED";

/**
 * Starts collecting console errors, page errors, shell warnings and requests beyond localhost.
 * A test that cuts the network goes through `watch.setOffline()`, never `context().setOffline()`
 * itself, so the check knows which failures the test caused.
 */
export function watchPage(page: Page) {
  const errors: string[] = [];
  const remote: string[] = [];
  // setOffline(true) cuts localhost too, unlike a real outage, so anything the page asks for from
  // then on fails with net::ERR_INTERNET_DISCONNECTED and Chromium logs "Failed to load resource"
  // for it: a Noto Sans SC unicode-range subset, for one, loads only when a glyph from it is first
  // drawn. Those two lines are the test's own doing. Once this watcher has taken the page offline,
  // expectClean() lets through exactly that failure, and that console line only for a URL that
  // failed that way. The window stays open after setOffline(false), because Chromium can report a
  // failure from the offline spell a moment after the network is back. Everything else still
  // counts: a pageerror, any other console error (a failed module import logs one), any other
  // failed request, and any request beyond localhost. A test that never calls setOffline() is
  // checked exactly as before.
  let wentOffline = false;
  const cutRequests: { url: string; line: string }[] = [];
  const cutConsole: { url: string; line: string }[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const line = `console.error: ${msg.text()}`;
      if (wentOffline && msg.text() === `Failed to load resource: ${DISCONNECTED}`) cutConsole.push({ url: msg.location().url, line });
      else errors.push(line);
    }
    // The shell warns when it skips a feature (an id that doesn't match its folder), and the
    // store warns on an invalid event in development. Both fail the smoke test.
    if (msg.type() === "warning" && /^\[cindia( shell)?\]/.test(msg.text())) errors.push(`console.warn: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("request", (req) => {
    if (!isLocal(req.url())) remote.push(req.url());
  });
  // A navigation (page.goto, a reload, a Vite full reload) cancels the old document's in-flight
  // requests with net::ERR_ABORTED, often lazily loaded modules. Those aren't errors. Count each
  // frame's navigations, note the count when a request starts, and when an abort comes in, keep it
  // for later. expectClean() lets an abort through only if its frame navigated after the request
  // started (the abort can fire before framenavigated does). Every other failure counts at once.
  const navCount = new WeakMap<Frame, number>();
  const navAtStart = new WeakMap<Request, number>();
  const mainNavAtStart = new WeakMap<Request, number>();
  const aborted: { req: Request; frame: Frame | null; text: string }[] = [];
  const frameOf = (req: Request): Frame | null => {
    try {
      return req.frame();
    } catch {
      return null; // service worker requests have no frame
    }
  };
  page.on("framenavigated", (f) => navCount.set(f, (navCount.get(f) ?? 0) + 1));
  page.on("request", (req) => {
    const f = frameOf(req);
    if (f) navAtStart.set(req, navCount.get(f) ?? 0);
    mainNavAtStart.set(req, navCount.get(page.mainFrame()) ?? 0);
  });
  page.on("requestfailed", (req) => {
    if (!isLocal(req.url()) || /favicon/.test(req.url())) return;
    const text = req.failure()?.errorText ?? "";
    const line = `request failed: ${req.url()} ${text}`;
    if (text === "net::ERR_ABORTED") aborted.push({ req, frame: frameOf(req), text: line });
    else if (wentOffline && text === DISCONNECTED) cutRequests.push({ url: req.url(), line });
    else errors.push(line);
  });
  page.on("response", (res) => {
    if (isLocal(res.url()) && res.status() >= 400) errors.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  const abortsNotFromNavigation = () =>
    aborted.filter(({ req, frame }) => {
      // A subframe's requests also abort when the page around it navigates.
      const mainStart = mainNavAtStart.get(req);
      if (mainStart !== undefined && (navCount.get(page.mainFrame()) ?? 0) > mainStart) return false;
      if (!frame) return true;
      const start = navAtStart.get(req);
      return start === undefined || (navCount.get(frame) ?? 0) <= start;
    });
  // A "Failed to load resource" line for a URL that didn't fail with net::ERR_INTERNET_DISCONNECTED
  // counts. Matched here, because the console line can arrive before or after the failure.
  const strayCutConsole = () => {
    const cut = new Set(cutRequests.map((r) => r.url));
    return cutConsole.filter((c) => !cut.has(c.url)).map((c) => c.line);
  };
  return {
    errors,
    remote,
    /** Takes the page's context offline or back online, and tells the check it did. */
    async setOffline(offline: boolean) {
      if (offline) wentOffline = true;
      await page.context().setOffline(offline);
    },
    expectClean() {
      expect([...errors, ...strayCutConsole(), ...abortsNotFromNavigation().map((a) => a.text)], "console errors, page errors or failed requests").toEqual([]);
      expect(remote, "requests beyond localhost").toEqual([]);
    },
  };
}

/**
 * Waits until the page has laid out what it shows and every font file that text needs has loaded.
 * A unicode-range subset loads only once a glyph from it is laid out, so this forces a layout and
 * waits two frames before document.fonts.ready, which Chromium also holds until layout is clean.
 */
export async function waitForFonts(page: Page) {
  await page.evaluate(async () => {
    document.body.getBoundingClientRect();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await document.fonts.ready;
  });
}

/** Waits until every slot on the page (or inside `scope`) has finished loading its feature. */
export async function waitForSlots(page: Page, scope?: Locator) {
  const root = scope ?? page.locator("body");
  await expect(root.locator("[data-slot]").first()).toBeAttached();
  await expect(root.locator("[data-slot-loading]")).toHaveCount(0);
}

/** Every slot wrapper is empty or filled, never error, and no slot-error- test ID is on screen. */
export async function expectNoSlotErrors(page: Page) {
  await expect(page.locator('[data-slot-state="error"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="slot-error-"]')).toHaveCount(0);
  const states = await page.locator("[data-slot]").evaluateAll((els) => els.map((e) => e.getAttribute("data-slot-state")));
  for (const s of states) expect(["empty", "filled"]).toContain(s);
}

/**
 * For each slot: its wrapper is there once, and while it's empty its placeholder test ID is visible.
 * `scope` is a frame locator, so a /demo check counts each slot once in the shown frame (all four
 * frames stay mounted there).
 */
export async function expectSlots(page: Page, slots: readonly string[], scope?: Locator) {
  const root = scope ?? page.locator("body");
  for (const slot of slots) {
    const wrapper = root.locator(`[data-slot="${slot}"]`);
    await expect(wrapper, `slot ${slot} is on the page`).toHaveCount(1);
    const state = await wrapper.getAttribute("data-slot-state");
    if (state === "empty") await expect(root.getByTestId(slotTestId(slot)), `${slot} placeholder`).toBeVisible();
    else expect(state, `${slot} state`).toBe("filled");
  }
}

/** The props the shell passed to a slot, read from its wrapper's data-slot-props. */
export async function readSlotProps(page: Page, slot: string, scope?: Locator): Promise<Record<string, unknown>> {
  const root = scope ?? page.locator("body");
  const wrapper = root.locator(`[data-slot="${slot}"]`);
  await expect(wrapper, `slot ${slot} is on the page`).toHaveCount(1);
  const raw = await wrapper.getAttribute("data-slot-props");
  expect(raw, `${slot} has data-slot-props`).not.toBeNull();
  return JSON.parse(raw!) as Record<string, unknown>;
}

/** Waits for the test hooks. */
export async function waitForHooks(page: Page) {
  await page.waitForFunction(() => Boolean(window.__cindia?.player && window.__cindia?.store && window.__cindia?.emit));
}

/**
 * Seeks to an event by what it is, never by a fixed time: finds the first event of `type` in the
 * loaded timeline whose payload holds every field in `match`, pauses, seeks to its `at` plus
 * `offsetMs` and returns that time. Throws an error naming the type and the match when the
 * timeline has no such event.
 */
export async function seekToEvent(page: Page, type: string, match: Record<string, unknown> = {}, offsetMs = 0): Promise<number> {
  const at = await page.evaluate(
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
  if (at === null) throw new Error(`seekToEvent: the loaded timeline has no ${type} event matching ${JSON.stringify(match)}`);
  const t = at + offsetMs;
  await page.evaluate((ms) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(ms);
  }, t);
  return t;
}

/** On /demo: the frame test ID the stage shows now (the one at full opacity), or null. */
export async function shownFrameId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const opacityOf = (el: Element) => {
      let o = 1;
      for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
      return o;
    };
    const frames = [...document.querySelectorAll('[data-testid="demo-stage"] [data-testid^="frame-"]')];
    const shown = frames.filter((f) => opacityOf(f) > 0.99);
    return shown.length === 1 ? shown[0].getAttribute("data-testid") : null;
  });
}

declare global {
  interface Window {
    __cindia?: {
      player: {
        now(): number;
        isPlaying(): boolean;
        getSpeed(): number;
        setSpeed(x: 1 | 2 | 4 | 8): void;
        epoch(): number;
        subscribe(listener: () => void): () => void;
        seek(ms: number): void;
        play(): void;
        pause(): void;
        reset(): void;
        durationMs(): number;
        getTimeline(): { id: string; durationMs: number; events: { type: string; at: number; payload: unknown }[] } | null;
      };
      store: { getState(): Record<string, unknown> & { sources: Record<string, string>; mode: string; lang: string }; subscribe(l: () => void): () => void; reset(): void };
      emit(e: unknown): void;
    };
  }
}
