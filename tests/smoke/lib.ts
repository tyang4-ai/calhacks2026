// Shared Playwright helpers: console and request watchers, and waits on window.__cindia.
// Feature tests may import these too.
import { expect, type Frame, type Page, type Request } from "@playwright/test";

export const SLOT_IDS = [
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

/** Starts collecting console errors, page errors, shell warnings and requests beyond localhost. */
export function watchPage(page: Page) {
  const errors: string[] = [];
  const remote: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
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
  return {
    errors,
    remote,
    expectClean() {
      expect([...errors, ...abortsNotFromNavigation().map((a) => a.text)], "console errors, page errors or failed requests").toEqual([]);
      expect(remote, "requests beyond localhost").toEqual([]);
    },
  };
}

/** Waits until every slot on the page has finished loading its feature. */
export async function waitForSlots(page: Page) {
  await expect(page.locator("[data-slot]").first()).toBeAttached();
  await expect(page.locator("[data-slot-loading]")).toHaveCount(0);
}

/** Every slot wrapper is empty or filled, never error, and no slot-error- test ID is on screen. */
export async function expectNoSlotErrors(page: Page) {
  await expect(page.locator('[data-slot-state="error"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="slot-error-"]')).toHaveCount(0);
  const states = await page.locator("[data-slot]").evaluateAll((els) => els.map((e) => e.getAttribute("data-slot-state")));
  for (const s of states) expect(["empty", "filled"]).toContain(s);
}

/** For each slot: its wrapper exists, and while it's empty its placeholder test ID is visible. */
export async function expectSlots(page: Page, slots: readonly string[]) {
  for (const slot of slots) {
    const wrapper = page.locator(`[data-slot="${slot}"]`);
    await expect(wrapper, `slot ${slot} is on the page`).toHaveCount(1);
    const state = await wrapper.getAttribute("data-slot-state");
    if (state === "empty") await expect(page.getByTestId(slotTestId(slot))).toBeVisible();
    else expect(state).toBe("filled");
  }
}

/** Waits for the test hooks. */
export async function waitForHooks(page: Page) {
  await page.waitForFunction(() => Boolean(window.__cindia?.player && window.__cindia?.store && window.__cindia?.emit));
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
