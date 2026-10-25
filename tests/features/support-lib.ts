// F-support T0: the spec helper every support spec imports.
// - seekToEvent is re-exported from tests/smoke/lib.ts, never copied (contracts section 11).
// - tourEvent reaches a point in the tour's d04 run by event, never by a fixed time: it seeks there
//   when the loaded timeline holds the event (after I2-tour), and until then pauses the player and
//   emits the seed (the tour's support.asked for thr_01, then run_01's steps and answer from
//   src/mock/swarm.ts) up to the event asked for.
// - The rest are small waits and reads the specs share. Expected values come from src/mock/.
// A seek drops a pending answer to a person, so specs seek (or seed) before they ask, never after.
import { expect, type Locator, type Page } from "@playwright/test";
import type { CindiaEvent, EventType, Payloads, SourceKey } from "../../src/core/events";
import type { CindiaState } from "../../src/core/state";
import { demoQuestions, fallbackSupportRun, swarmRuns } from "../../src/mock/swarm";
import { seekToEvent, waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent };

/** How long a scripted answer to a person may take: 1.2 s, then 300 ms per step, on a busy VM. */
export const ANSWER_TIMEOUT = 20_000;

/** One event of a seed: what tourEvent emits when the timeline doesn't hold the tour's run yet. */
export interface SeedEvent {
  type: EventType;
  payload: object;
  key?: SourceKey;
}

const run01 = swarmRuns.find((r) => r.runId === "run_01")!;
const buyerQuestions = demoQuestions.filter((q) => q.side === "buyer");
const sellerQuestions = demoQuestions.filter((q) => q.side === "seller");

/** The tour's d04 question: the buyer's first demo question. */
export const D04_QUESTION = buyerQuestions[0].text;

/** The tour's own thread and run. */
export const TOUR_THREAD = run01.threadId;
export const TOUR_RUN = run01;

/** The buyer's and the seller's suggestions, in the drawer's order. */
export const BUYER_QUESTIONS = buyerQuestions.map((q) => q.text);
export const SELLER_QUESTIONS = sellerQuestions.map((q) => q.text);

/** The fallback run's reply (L16). */
export const FALLBACK_REPLY = (fallbackSupportRun.final[0].payload as Payloads["support.answered"]).reply;

/** The responder's normalization: trimmed, lowercased, punctuation removed, spaces collapsed. */
function norm(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\p{P}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The run whose support trigger matches a question's text and whose context IDs the request holds. */
export function runFor(question: { en: string }, side: "buyer" | "seller", contextIds: string[]) {
  const q = norm(question.en);
  return (
    swarmRuns.find(
      (r) =>
        r.trigger.kind === "support" &&
        r.side === side &&
        r.trigger.matches.some((m) => norm(m) === q) &&
        (!r.trigger.pieceId || contextIds.includes(r.trigger.pieceId)) &&
        (!r.trigger.makerId || contextIds.includes(r.trigger.makerId)),
    ) ?? fallbackSupportRun
  );
}

/** A run's support.answered payload (its first final event of that type). */
export function replyOf(run: (typeof swarmRuns)[number]): Payloads["support.answered"] {
  return run.final.find((f) => f.type === "support.answered")!.payload as Payloads["support.answered"];
}

/**
 * The tour's d04 run as a seed: its support.asked on thr_01 for pc_01, then run_01's steps and its
 * support.answered, each keyed as the timeline keys them.
 */
export function d04Seed(): SeedEvent[] {
  const asked: Payloads["support.asked"] = {
    threadId: run01.threadId,
    side: "buyer",
    text: D04_QUESTION.en,
    lang: "en",
    contextIds: [run01.trigger.kind === "support" ? (run01.trigger.pieceId ?? "pc_01") : "pc_01"],
  };
  const out: SeedEvent[] = [{ type: "support.asked", payload: asked }];
  for (const s of run01.steps) out.push({ type: "swarm.step", payload: { ...s, threadId: run01.threadId }, key: "b14-swarm" });
  for (const f of run01.final) out.push({ type: f.type, payload: f.payload, key: "b14-swarm" });
  return out;
}

function matches(e: { type: string; payload: object }, type: string, match: Record<string, unknown>): boolean {
  return (
    e.type === type &&
    Object.entries(match).every(([k, v]) => JSON.stringify((e.payload as Record<string, unknown>)[k]) === JSON.stringify(v))
  );
}

/**
 * Reaches the tour's event of `type` whose payload holds every field in `match`. When the loaded
 * timeline holds it (after I2-tour), seeks to its `at` plus `offsetMs` with seekToEvent. Until then,
 * pauses the player and emits `seed` up to that event, the event itself included when `offsetMs` is
 * 0 or more and left out when it is negative. Throws when neither holds the event.
 */
export async function tourEvent(
  page: Page,
  type: EventType,
  match: Record<string, unknown> = {},
  offsetMs = 0,
  seed: SeedEvent[] = d04Seed(),
): Promise<"seek" | "seed"> {
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
  if (inTimeline) {
    await seekToEvent(page, type, match, offsetMs);
    return "seek";
  }
  const index = seed.findIndex((e) => matches(e, type, match));
  if (index === -1) throw new Error(`tourEvent: neither the timeline nor the seed holds a ${type} matching ${JSON.stringify(match)}`);
  const upTo = (offsetMs < 0 ? seed.slice(0, index) : seed.slice(0, index + 1)).map((e) => ({ ...e, id: seedEventId(e) }));
  await page.evaluate((events) => {
    const c = window.__cindia!;
    c.player.pause();
    const at = c.player.now();
    for (const e of events) {
      const event = {
        id: e.id,
        type: e.type,
        at,
        source: "scripted",
        ...(e.key ? { key: e.key } : {}),
        payload: e.payload,
      } as CindiaEvent;
      c.emit(event);
    }
  }, upTo);
  return "seed";
}

/**
 * A seed event's ID, made from what it is (its type and its step, question, approval, run or
 * thread), so seeding the same run again later adds nothing twice: the store keys messages and log
 * entries by event ID.
 */
function seedEventId(e: SeedEvent): string {
  const p = e.payload as Record<string, unknown>;
  const ident = p.stepId ?? p.questionId ?? p.approvalId ?? p.runId ?? p.threadId ?? "x";
  return `evt_tour_${e.type.replace(".", "_")}_${String(ident)}`;
}

/** Emits an event as a person would (source "user"), with a spec-only evt_user_ ID. */
export async function emitAsUser<T extends EventType>(page: Page, type: T, payload: Payloads[T], n = 1): Promise<void> {
  await page.evaluate(
    (e) => {
      const c = window.__cindia!;
      c.emit({ id: `evt_user_spec_${e.n}`, type: e.type, at: c.player.now(), source: "user", payload: e.payload } as CindiaEvent);
    },
    { type, payload, n },
  );
}

/** Emits a seeded scripted event for a path the tour has no producer for, such as support.escalated. */
export async function emitScripted<T extends EventType>(page: Page, type: T, payload: Payloads[T], n = 1, key?: SourceKey): Promise<void> {
  await page.evaluate(
    (e) => {
      const c = window.__cindia!;
      c.emit({ id: `evt_seed_${e.n}`, type: e.type, at: c.player.now(), source: "scripted", ...(e.key ? { key: e.key } : {}), payload: e.payload } as CindiaEvent);
    },
    { type, payload, n, key },
  );
}

/** Opens a route, waits for the hooks and the slots, and pauses the player where it stands. */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHooks(page);
  await waitForSlots(page);
  await page.evaluate(() => window.__cindia!.player.pause());
}

/** The open support drawer. */
export function drawer(page: Page): Locator {
  return page.getByTestId("support-drawer");
}

/** The piece page's side panel. */
export function sidePanel(page: Page): Locator {
  return page.getByTestId("support-ask-piece");
}

/** The store's state, typed as the app's. */
export async function storeState(page: Page): Promise<CindiaState> {
  return page.evaluate(() => window.__cindia!.store.getState() as unknown as CindiaState);
}

/** Every support.asked a person made (from the log and the threads), oldest first. */
export async function userAsks(page: Page) {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as CindiaState;
    const logged = new Map(s.log.entries.map((e) => [e.id, e]));
    const out: { eventId: string; source: string | undefined; threadId: string; side: string; text: string; lang: string; contextIds: string[] }[] = [];
    for (const threadId of s.support.threadIds) {
      for (const m of s.support.threads[threadId].messages) {
        if (m.kind !== "asked") continue;
        out.push({
          eventId: m.eventId,
          source: logged.get(m.eventId)?.source,
          threadId,
          side: m.side,
          text: m.text,
          lang: m.lang,
          contextIds: [...m.contextIds],
        });
      }
    }
    return out;
  });
}

/** Waits until the drawer's newest reply reads `text` (its English or Chinese). */
export async function expectReply(page: Page, text: string): Promise<void> {
  await expect(drawer(page).getByTestId("support-reply")).toHaveText(new RegExp(escapeRegExp(text)), { timeout: ANSWER_TIMEOUT });
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
