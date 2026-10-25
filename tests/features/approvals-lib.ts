// M-approvals T1: helpers the approvals specs share.
// - seekToEvent: re-exported from tests/smoke/lib.ts, never copied.
// - openApprovals(page, ref?): opens /sell/approvals (or ?ref=) and waits for the slot to fill.
// - seed(page, events): emits events through window.__cindia.emit, so the v2 kinds can be tested
//   before the tour carries them.
import { expect, type Page } from "@playwright/test";
import { seekToEvent, waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent };

/** Opens the approvals view, or the approval ?ref= names, and waits for owner.main to fill. */
export async function openApprovals(page: Page, ref?: string, extraQuery = ""): Promise<void> {
  const query = [ref ? `ref=${encodeURIComponent(ref)}` : "", extraQuery].filter(Boolean).join("&");
  await page.goto(`/sell/approvals${query ? `?${query}` : ""}`);
  await waitForHooks(page);
  await waitForSlots(page);
  await expect(page.locator('[data-slot="owner.main"]')).toHaveAttribute("data-slot-state", "filled");
}

/** An event to seed: id, at and source are filled in when left out. */
export interface Seed {
  type: string;
  payload: Record<string, unknown>;
  source?: "scripted" | "live";
  key?: string;
  id?: string;
}

let seeded = 0;

/**
 * Emits each event through window.__cindia.emit, at the player's current time. Scripted events get
 * ids evt_9<n>, live ones evt_live_seed_<n>, so they never collide with the timeline's own.
 */
export async function seed(page: Page, events: Seed[]): Promise<void> {
  const batch = events.map((e) => {
    seeded += 1;
    const source = e.source ?? "scripted";
    const id = e.id ?? (source === "live" ? `evt_live_seed_${Date.now().toString(36)}_${seeded}` : `evt_9${String(seeded).padStart(5, "0")}`);
    return { id, type: e.type, source, ...(e.key ? { key: e.key } : {}), payload: e.payload };
  });
  await page.evaluate((list) => {
    const hooks = window.__cindia!;
    for (const e of list) hooks.emit({ ...e, at: hooks.player.now() });
  }, batch);
}

/** The store's approvals item for one approval, or null. */
export async function approvalItem(page: Page, approvalId: string) {
  return page.evaluate((id) => {
    const s = window.__cindia!.store.getState() as unknown as {
      approvals: { items: Record<string, { status: string; requested: boolean; by?: string; date?: string; source?: string; reason?: { en: string; zh: string } }> };
    };
    return s.approvals.items[id] ?? null;
  }, approvalId);
}

/** Every event of a type in the store's log, with its source. */
export async function logged(page: Page, type: string) {
  return page.evaluate((t) => {
    const s = window.__cindia!.store.getState() as unknown as { log: { entries: { id: string; type: string; source: string }[] } };
    return s.log.entries.filter((e) => e.type === t);
  }, type);
}

/**
 * The approval IDs the loaded timeline requests at or before `ms` (every one when left out), in the
 * order the player plays them: by `at`, then the timeline's own order on a tie. Specs read the
 * order and contents of the list from here, never from fixed IDs or times, because the tour moves
 * the beats (I2-tour requests apr_04 in d15-listing, before apr_01 and apr_02).
 */
export async function requestedBy(page: Page, ms: number = Number.MAX_SAFE_INTEGER): Promise<string[]> {
  return page.evaluate((t) => {
    const events = window.__cindia!.player.getTimeline()?.events ?? [];
    return events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.type === "approval.requested" && e.at <= t)
      .toSorted((a, b) => a.e.at - b.e.at || a.i - b.i)
      .map(({ e }) => (e.payload as { approvalId: string }).approvalId);
  }, ms);
}

/** The test IDs of the cards the list shows, top to bottom, once there are `count` of them. */
export async function listedCards(page: Page, count: number): Promise<(string | null)[]> {
  const cards = page.locator('[data-testid^="approvals-item-"]');
  await expect(cards).toHaveCount(count);
  return cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
}
