// Shared Playwright helpers: console and request watchers, and waits on window.__cindia.
// Feature tests may import these too.
import { expect, type Page } from "@playwright/test";

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
  page.on("requestfailed", (req) => {
    if (isLocal(req.url()) && !/favicon/.test(req.url())) errors.push(`request failed: ${req.url()} ${req.failure()?.errorText ?? ""}`);
  });
  page.on("response", (res) => {
    if (isLocal(res.url()) && res.status() >= 400) errors.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  return {
    errors,
    remote,
    expectClean() {
      expect(errors, "console errors, page errors or failed requests").toEqual([]);
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
