// F-watch T1: the spec helper every watch spec imports.
// - seekToEvent is re-exported from tests/smoke/lib.ts, never copied (conventions.md, Specs).
// - openWatch opens /sell/watch at the Sell frame's size, waits for the hooks and the slot, and
//   pauses the player where it stands.
// - seed emits events through window.__cindia.emit at the player's own clock, each with an ID made
//   from what it is, so seeding the same event twice adds nothing twice.
// - tourScan reaches a point in the tour's scan (d14-watch) by event: it seeks there when the loaded
//   timeline holds the event (after I2-tour), and until then pauses and seeds the scan from
//   src/mock/watch.ts up to that event. Every expected value comes from src/mock/.
import { expect, type Locator, type Page } from "@playwright/test";
import type { CindiaEvent, EventType, Payloads, Source, SourceKey } from "../../src/core/events";
import type { CindiaState } from "../../src/core/state";
import { apr_03, counterfeitCandidates, fup_02, scriptedScan } from "../../src/mock/watch";
import { seekToEvent, waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent };

/** The Sell frame's size, which every watch spec runs at. */
export const WATCH_VIEWPORT = { width: 1440, height: 900 } as const;

/** How long a scripted answer to a person may take on a busy VM: 1.2 s, then 300 ms per event. */
export const ANSWER_TIMEOUT = 20_000;

/** One event to seed. `source` defaults to scripted. */
export interface SeedEvent {
  type: EventType;
  payload: object;
  key?: SourceKey;
  source?: Source;
  /** An explicit event ID; otherwise one is made from the type and the payload's ID. */
  id?: string;
}

/** The tour's own scan, the hit it flags and the approval that goes with it (figure 14). */
export const TOUR_SCAN = scriptedScan;
export const TOUR_HIT = counterfeitCandidates.find((c) => c.id === scriptedScan.cftIds[0])!;
export const TOUR_APPROVAL = apr_03;
export const CLAIM_ONLY = counterfeitCandidates.find((c) => c.verdict === "claim_only")!;

/** The watch.scanned results the scripted scan carries: every candidate, in order. */
export function scriptedResults(): Payloads["watch.scanned"]["results"] {
  return counterfeitCandidates.map((c) => ({ title: c.title, url: c.url, snippet: c.snippet, similarity: c.similarity, verdict: c.verdict }));
}

/** A candidate's counterfeit.flagged payload on a scan. */
export function flaggedPayload(cftId: string, scanId: string, as = cftId): Payloads["counterfeit.flagged"] {
  const c = counterfeitCandidates.find((x) => x.id === cftId)!;
  return { cftId: as, scanId, pieceId: c.pieceId, url: c.url, title: c.title, snippet: c.snippet, similarity: c.similarity, claim: { ...c.claim } };
}

/**
 * The tour's d14-watch run as a seed, keyed as the timeline keys it: watch.started, watch.scanned,
 * one counterfeit.flagged per hit, the Reporter's followup.drafted fup_02 (keyed b15-watch), then
 * approval.requested apr_03.
 */
export function tourScanSeed(): SeedEvent[] {
  const out: SeedEvent[] = [
    { type: "watch.started", payload: { scanId: TOUR_SCAN.scanId, makerId: TOUR_SCAN.makerId, queries: [...TOUR_SCAN.queries] } },
    {
      type: "watch.scanned",
      payload: { scanId: TOUR_SCAN.scanId, engine: "scripted", candidates: counterfeitCandidates.length, results: scriptedResults() },
      key: "b15-watch",
    },
  ];
  for (const id of TOUR_SCAN.cftIds) out.push({ type: "counterfeit.flagged", payload: flaggedPayload(id, TOUR_SCAN.scanId), key: "b15-watch" });
  out.push({
    type: "followup.drafted",
    payload: { followUpId: fup_02.id, approvalId: fup_02.approvalId, to: fup_02.to, subject: fup_02.subject, body: fup_02.body },
    key: "b15-watch",
  });
  out.push({ type: "approval.requested", payload: { approvalId: TOUR_APPROVAL.id }, key: "b08-approvals" });
  return out;
}

/** A seed event's ID, made from its type and the ID its payload names. */
function seedId(e: SeedEvent): string {
  if (e.id) return e.id;
  const p = e.payload as Record<string, unknown>;
  const ident = p.cftId ?? p.approvalId ?? p.followUpId ?? p.scanId ?? "x";
  const prefix = e.source === "live" ? "evt_live_watch" : e.source === "user" ? "evt_user_watch" : "evt_seed_watch";
  return `${prefix}_${e.type.replace(".", "_")}_${String(ident)}`;
}

/** Emits each event through window.__cindia.emit at the player's clock, in order. */
export async function seed(page: Page, events: SeedEvent[]): Promise<void> {
  const full = events.map((e) => ({ ...e, id: seedId(e) }));
  await page.evaluate((list) => {
    const c = window.__cindia!;
    const at = c.player.now();
    for (const e of list) {
      c.emit({ id: e.id, type: e.type, at, source: e.source ?? "scripted", ...(e.key ? { key: e.key } : {}), payload: e.payload } as CindiaEvent);
    }
  }, full);
}

function matches(e: { type: string; payload: object }, type: string, match: Record<string, unknown>): boolean {
  return e.type === type && Object.entries(match).every(([k, v]) => JSON.stringify((e.payload as Record<string, unknown>)[k]) === JSON.stringify(v));
}

/**
 * Reaches the tour scan's event of `type` whose payload holds every field in `match`: seeks to its
 * `at` plus `offsetMs` when the loaded timeline holds it, and otherwise seeds the scan up to that
 * event (left out when `offsetMs` is negative). Throws when neither holds the event.
 */
export async function tourScan(page: Page, type: EventType, match: Record<string, unknown> = {}, offsetMs = 0): Promise<"seek" | "seed"> {
  const inTimeline = await page.evaluate(
    ({ wantType, wantFields }) =>
      (window.__cindia?.player.getTimeline()?.events ?? []).some(
        (e) =>
          e.type === wantType &&
          Object.entries(wantFields).every(([k, v]) => JSON.stringify(((e.payload ?? {}) as Record<string, unknown>)[k]) === JSON.stringify(v)),
      ),
    { wantType: type, wantFields: match },
  );
  if (inTimeline) {
    await seekToEvent(page, type, match, offsetMs);
    return "seek";
  }
  const all = tourScanSeed();
  const index = all.findIndex((e) => matches(e, type, match));
  if (index === -1) throw new Error(`tourScan: neither the timeline nor the seed holds a ${type} matching ${JSON.stringify(match)}`);
  await page.evaluate(() => window.__cindia!.player.pause());
  await seed(page, offsetMs < 0 ? all.slice(0, index) : all.slice(0, index + 1));
  return "seed";
}

/** Opens /sell/watch, waits for the hooks and the slot, and pauses the player where it stands. */
export async function openWatch(page: Page, query = ""): Promise<void> {
  await page.setViewportSize(WATCH_VIEWPORT);
  await page.goto(`/sell/watch${query}`);
  await waitForHooks(page);
  await waitForSlots(page);
  await expect(page.locator('[data-slot="studio.watch.main"]')).toHaveAttribute("data-slot-state", "filled");
  await page.evaluate(() => window.__cindia!.player.pause());
}

/** A test ID inside the Sell frame. */
export function inFrame(page: Page, testId: string): Locator {
  return page.getByTestId("frame-studio").getByTestId(testId);
}

/** The store's state, typed as the app's. */
export async function storeState(page: Page): Promise<CindiaState> {
  return page.evaluate(() => window.__cindia!.store.getState() as unknown as CindiaState);
}

/** How many events the store's log holds. */
export async function logLength(page: Page): Promise<number> {
  return page.evaluate(() => (window.__cindia!.store.getState() as unknown as CindiaState).log.entries.length);
}

/** Switches the language toggle until the store's lang is `lang`. */
export async function setLang(page: Page, lang: "auto" | "en" | "zh"): Promise<void> {
  const toggle = page.getByTestId("demo-lang-toggle");
  for (let i = 0; i < 3; i++) {
    if ((await toggle.getAttribute("data-lang")) === lang) return;
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("data-lang", lang);
}

/**
 * Each test ID sits inside frame-studio and every clipping ancestor (within 1 px), retried with the
 * default expect timeout.
 */
export async function expectInsideFrame(page: Page, testIds: readonly string[]): Promise<void> {
  for (const id of testIds) {
    await expect
      .poll(
        () =>
          page.evaluate((want) => {
            const frame = document.querySelector('[data-testid="frame-studio"]');
            const el = frame?.querySelector(`[data-testid="${want}"]`);
            if (!frame || !el) return `${want}: not in frame-studio`;
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return `${want}: has no size`;
            const out = (c: DOMRect) => r.left < c.left - 1 || r.top < c.top - 1 || r.right > c.right + 1 || r.bottom > c.bottom + 1;
            if (out(frame.getBoundingClientRect())) return `${want}: spills out of frame-studio`;
            for (let a = el.parentElement; a && a !== frame; a = a.parentElement) {
              const cs = getComputedStyle(a);
              if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
              const b = a.getBoundingClientRect();
              const inner = new DOMRect(b.left + a.clientLeft, b.top + a.clientTop, a.clientWidth, a.clientHeight);
              if (out(inner)) return `${want}: clipped by ${a.tagName.toLowerCase()}.${String(a.className).split(" ")[0]}`;
            }
            return "inside";
          }, id),
        { message: `${id} sits inside frame-studio` },
      )
      .toBe("inside");
  }
}
