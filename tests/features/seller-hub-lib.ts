// F-seller-hub T1: the spec helper every seller-hub spec imports.
// - seekToEvent is re-exported from tests/smoke/lib.ts, never copied.
// - openSell(page, view) and openMaker(page, makerId) open a page and wait for its slots to fill.
// - seed(page, events) emits events through window.__cindia.emit, for the listing and question
//   events before the tour carries them. Each seeded event's ID is made from what it is, so seeding
//   the same run twice adds nothing twice.
// - tourListing() reaches a point in the tour's d15 listing run by event: it seeks there when the
//   loaded timeline holds the event (after I2-tour), and until then pauses the player and seeds
//   run_02 from src/mock/swarm.ts up to that event. Never a fixed time.
// Expected values come from src/mock/, never typed in.
// A seek drops a pending answer to a person, so specs seek (or seed) before they ask, never after.
import { expect, type Locator, type Page } from "@playwright/test";
import type { CindiaEvent, EventType, Payloads, SourceKey } from "../../src/core/events";
import type { CindiaState } from "../../src/core/state";
import type { ListingDraft, ScriptedRun } from "../../src/core/types";
import { fallbackListingRun, listings, makerQuestions, swarmRuns } from "../../src/mock/index";
import { seekToEvent, waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent };

/** The Sell frame's size: every spec runs at 1440 by 900. */
export const FRAME_VIEWPORT = { width: 1440, height: 900 };

/** How long a scripted answer to a person may take: 1.2 s, then 300 ms per step and final event, on a busy VM. */
export const ANSWER_TIMEOUT = 25_000;

/** The tour's listing, its run and its scripted draft. */
export const LST_01: ListingDraft = listings.find((l) => l.id === "lst_01")!;
export const RUN_02: ScriptedRun = swarmRuns.find((r) => r.runId === "run_02")!;
export const RUN_02_DRAFT = RUN_02.final.find((f) => f.type === "listing.drafted")!.payload as Payloads["listing.drafted"];
export const RUN_02_INDEXED = RUN_02.final.find((f) => f.type === "listing.indexed")!.payload as Payloads["listing.indexed"];
export const RUN_02_APPROVAL = RUN_02.final.find((f) => f.type === "approval.requested")!.payload as Payloads["approval.requested"];
export const FALLBACK_RUN: ScriptedRun = fallbackListingRun;

/** The "ask the maker" question qst_01 and Grace N.'s scripted answer. */
export const QUESTION = makerQuestions[0].question;
export const SCRIPTED_ANSWER = makerQuestions[0].answer;

/** One event to seed: its type, payload and key. */
export interface SeedEvent {
  type: EventType;
  payload: object;
  key?: SourceKey;
}

/** The key the timeline gives each event type the listing run carries (events.md). */
function keyFor(type: EventType): SourceKey | undefined {
  if (type === "swarm.step" || type === "listing.drafted" || type === "listing.indexed") return "b14-swarm";
  if (type === "approval.requested" || type === "approval.granted" || type === "approval.declined") return "b08-approvals";
  if (type === "question.forwarded" || type === "question.answered") return "b14-swarm";
  if (type === "counterfeit.flagged") return "b15-watch";
  return undefined;
}

/**
 * The tour's d15 listing run as a seed: the timeline's listing.requested for lst_01 (its maker,
 * notes and lang), then run_02's steps on the listing's thread, then its final events in order
 * (listing.drafted, listing.indexed, approval.requested apr_04), each keyed as the timeline keys them.
 */
export function listingSeed(): SeedEvent[] {
  const out: SeedEvent[] = [
    { type: "listing.requested", payload: { listingId: LST_01.id, makerId: LST_01.makerId, notes: LST_01.notes, lang: LST_01.lang } },
  ];
  for (const s of RUN_02.steps) out.push({ type: "swarm.step", payload: { ...s, threadId: LST_01.id }, key: "b14-swarm" });
  for (const f of RUN_02.final) out.push({ type: f.type, payload: structuredClone(f.payload), key: keyFor(f.type) });
  return out;
}

/** The scripted "ask the maker" run's question.forwarded for qst_01, keyed b14-swarm. */
export function questionSeed(): SeedEvent {
  return {
    type: "question.forwarded",
    key: "b14-swarm",
    payload: {
      questionId: QUESTION.id,
      threadId: QUESTION.threadId,
      makerId: QUESTION.makerId,
      pieceId: QUESTION.pieceId,
      text: QUESTION.text,
      lang: QUESTION.lang,
    } satisfies Payloads["question.forwarded"],
  };
}

/** A seeded event's ID, from its type and what it names. */
function seedEventId(e: SeedEvent): string {
  const p = e.payload as Record<string, unknown>;
  const ident = p.stepId ?? p.questionId ?? p.approvalId ?? p.cftId ?? p.flagId ?? p.listingId ?? "x";
  return `evt_seed_${e.type.replace(".", "_")}_${String(ident)}`;
}

/**
 * Pauses the player and emits `events` in order, as scripted events stamped with the player's own
 * clock, through window.__cindia.emit. Returns that player time.
 */
export async function seed(page: Page, events: SeedEvent[]): Promise<number> {
  const withIds = events.map((e) => ({ ...e, id: seedEventId(e), key: e.key ?? keyFor(e.type) }));
  return page.evaluate((list) => {
    const c = window.__cindia!;
    c.player.pause();
    const at = Math.round(c.player.now());
    for (const e of list) {
      c.emit({ id: e.id, type: e.type, at, source: "scripted", ...(e.key ? { key: e.key } : {}), payload: e.payload } as CindiaEvent);
    }
    return at;
  }, withIds);
}

function matches(e: SeedEvent, type: string, match: Record<string, unknown>): boolean {
  return e.type === type && Object.entries(match).every(([k, v]) => JSON.stringify((e.payload as Record<string, unknown>)[k]) === JSON.stringify(v));
}

/** True when the loaded timeline holds an event of `type` whose payload holds every field in `match`. */
export async function timelineHas(page: Page, type: string, match: Record<string, unknown> = {}): Promise<boolean> {
  return page.evaluate(
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
}

/**
 * Reaches the tour listing run's event of `type` matching `match`. When the loaded timeline holds it
 * (after I2-tour), seeks to its `at` plus `offsetMs`. Until then, pauses and seeds the run up to that
 * event, the event itself included when `offsetMs` is 0 or more and left out when it is negative.
 */
export async function tourListing(page: Page, type: EventType, match: Record<string, unknown> = {}, offsetMs = 0): Promise<"seek" | "seed"> {
  if (await timelineHas(page, type, match)) {
    await seekToEvent(page, type, match, offsetMs);
    return "seek";
  }
  const all = listingSeed();
  const index = all.findIndex((e) => matches(e, type, match));
  if (index === -1) throw new Error(`tourListing: neither the timeline nor the seed holds a ${type} matching ${JSON.stringify(match)}`);
  await seed(page, offsetMs < 0 ? all.slice(0, index) : all.slice(0, index + 1));
  return "seed";
}

const quiet = new WeakSet<Page>();

/**
 * Holds the dev server's HMR socket open without connecting it, so another agent's edit elsewhere
 * in the repo can't full-reload the page in the middle of a spec (the shell loads every feature, so
 * any edit reaches every open page). The app under test is the same; only the dev server's reload
 * messages stay out.
 */
async function quietHmr(page: Page): Promise<void> {
  if (quiet.has(page)) return;
  quiet.add(page);
  await page.routeWebSocket(/\/\?token=|vite-hmr|:5173\/?$/, () => {});
}

async function open(page: Page, path: string, slot: string): Promise<void> {
  await quietHmr(page);
  await page.goto(path);
  await waitForHooks(page);
  await waitForSlots(page);
  await expect(page.locator(`[data-slot="${slot}"]`)).toHaveAttribute("data-slot-state", "filled");
  await page.evaluate(() => window.__cindia!.player.pause());
}

/** Opens a Sell view and waits for its slots to fill. */
export async function openSell(page: Page, view: "overview" | "listings"): Promise<void> {
  await open(page, `/sell/${view}`, view === "overview" ? "studio.overview.main" : "studio.listings.main");
}

/** Opens a maker's page and waits for its slots to fill. */
export async function openMaker(page: Page, makerId: string): Promise<void> {
  await open(page, `/maker/${makerId}`, "maker.side");
}

/** The Sell frame. */
export function studio(page: Page): Locator {
  return page.getByTestId("frame-studio");
}

/** The store's state, typed as the app's. */
export async function storeState(page: Page): Promise<CindiaState> {
  return page.evaluate(() => window.__cindia!.store.getState() as unknown as CindiaState);
}

/** Every logged event of `type`, with its source. */
export async function logged(page: Page, type: EventType): Promise<{ id: string; source: string }[]> {
  const s = await storeState(page);
  return s.log.entries.filter((e) => e.type === type).map((e) => ({ id: e.id, source: e.source }));
}

/** Switches the language toggle until the store's lang is `want`. */
export async function setLang(page: Page, want: "auto" | "en" | "zh"): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const lang = await page.evaluate(() => window.__cindia!.store.getState().lang);
    if (lang === want) return;
    await page.getByTestId("demo-lang-toggle").click();
  }
  throw new Error(`setLang: the toggle never reached ${want}`);
}

/** A slot's wrapper, which holds the feature's panel and its Simulated badge. */
export function slotOf(page: Page, slot: string): Locator {
  return page.locator(`[data-slot="${slot}"]`);
}

/**
 * Asserts that the element shows in full: its box sits inside the box of every ancestor that clips
 * (overflow other than visible), so nothing has to scroll to see it.
 */
export async function expectUnclipped(el: Locator): Promise<void> {
  await expect(el).toBeVisible();
  const clipped = await el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const out: string[] = [];
    for (let p = node.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const b = p.getBoundingClientRect();
      if (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5 || r.left < b.left - 0.5 || r.right > b.right + 0.5) {
        out.push(`${p.tagName.toLowerCase()}.${String(p.className).slice(0, 40)}`);
      }
    }
    return out;
  });
  expect(clipped, "ancestors that clip the element").toEqual([]);
}

/** Asserts that a locator's box sits inside the frame's box (the 1440 by 900 page). */
export async function expectInside(inner: Locator, frame: Locator): Promise<void> {
  const a = await inner.boundingBox();
  const b = await frame.boundingBox();
  expect(a, "the element has a box").not.toBeNull();
  expect(b, "the frame has a box").not.toBeNull();
  expect(a!.x).toBeGreaterThanOrEqual(b!.x - 0.5);
  expect(a!.y).toBeGreaterThanOrEqual(b!.y - 0.5);
  expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x + b!.width + 0.5);
  expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + b!.height + 0.5);
}
