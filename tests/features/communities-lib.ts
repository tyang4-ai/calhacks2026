// F-communities' spec helper (T0). It re-exports seekToEvent from tests/smoke/lib.ts and never
// copies it (contracts section 11), and adds tourEvent(): seek to a tour event once the loaded
// timeline holds it (after I2-tour), and until then pause the player and emit the seed as scripted
// events, stamped with the player's own clock. It never seeks to a fixed time. Expected values come
// from src/mock/, never typed in.
import { expect, type Locator, type Page } from "@playwright/test";
import { apr_05, demoContribution } from "../../src/mock/index";
import { seekToEvent, waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent };

// Labels from docs/common/glossary.md, copied here word for word on their own, so the specs check
// the feature's copy against the contract rather than against itself.

/** L4, which the kit's VerificationLine prints with `demo`. */
export const L4 = {
  en: "Demo: this shows how verification would work. No real check was done.",
  zh: "演示：这里展示认证将如何进行。并未做过真实核查。",
};
/** L7, beside every project-fund-<projectId>. */
export const L7 = { en: "Demo project. No money is collected.", zh: "演示项目。不会收取任何款项。" };
/** L8, under the about box. */
export const L8 = {
  en: "Placeholder written by the Cindia team. In a real launch, the community writes this page.",
  zh: "由 Cindia 团队撰写的占位内容。正式上线后，由社区自己撰写此页面。",
};
/** L9's first sentence (the protocols' title) and the rest (the line under it). */
export const L9_TITLE = { en: "Kept out of this demo.", zh: "本演示未收录。" };
export const L9_NOTE = {
  en: "In a real launch, the community sets these rules. For this demo, the Cindia team left these out.",
  zh: "正式上线后，由社区制定这些规则。本演示中，这些内容由 Cindia 团队排除在外。",
};
/** Glossary domain words the screens show. */
export const WORDS = {
  nativeAmerican: { en: "Native American", zh: "美洲原住民" },
  demoData: { en: "Demo data", zh: "演示数据" },
  approval: { en: "Needs your approval", zh: "待您批准" },
  paid: { en: "Paid", zh: "已发放" },
};

/** One event to emit when the timeline doesn't hold the tour event yet: its type, payload and key. */
export interface SeedEvent {
  type: string;
  payload: Record<string, unknown>;
  key?: string;
}

let seedCounter = 0;
let userCounter = 0;

/** True when the loaded timeline holds an event of `type` whose payload matches every field in `match`. */
async function timelineHolds(page: Page, type: string, match: Record<string, unknown>): Promise<boolean> {
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
 * Reaches a tour event by what it is. When the loaded timeline holds an event of `type` whose
 * payload matches `match`, it pauses and seeks there plus `offsetMs` (seekToEvent). Otherwise it
 * pauses the player and emits `seed`, in order, as scripted events at the player's own clock,
 * through `window.__cindia.emit()`. Returns the player time it ended at.
 */
export async function tourEvent(page: Page, type: string, match: Record<string, unknown> = {}, offsetMs = 0, seed: SeedEvent[] = []): Promise<number> {
  if (await timelineHolds(page, type, match)) return seekToEvent(page, type, match, offsetMs);
  const base = seedCounter;
  seedCounter += seed.length;
  return page.evaluate(
    ({ events, start }) => {
      const c = window.__cindia!;
      c.player.pause();
      const at = Math.round(c.player.now());
      events.forEach((e, i) => {
        c.emit({ id: `evt_${String(910000 + start + i)}`, type: e.type, at, source: "scripted", ...(e.key ? { key: e.key } : {}), payload: e.payload } as never);
      });
      return at;
    },
    { events: seed, start: base },
  );
}

/** Figure 13's contribution, ctb_01 from src/mock/projects.ts, as the tour's project.funded. */
export function tourContributionSeed(): SeedEvent {
  return { type: "project.funded", payload: structuredClone(demoContribution) as unknown as Record<string, unknown> };
}

/** Reaches the tour's project.funded ctb_01 (500 for prj_01 with ord_001). */
export function tourContribution(page: Page): Promise<number> {
  return tourEvent(page, "project.funded", { contributionId: demoContribution.contributionId }, 0, [tourContributionSeed()]);
}

/**
 * Emits a person's event (source "user") the way userEvent() builds one, for a tap another feature
 * owns, such as the owner's approval.granted on Sell › Approvals. The registry answers it as a request.
 */
export async function emitUser(page: Page, type: string, payload: Record<string, unknown>): Promise<void> {
  userCounter += 1;
  await page.evaluate(
    ({ evType, evPayload, n }) => {
      const c = window.__cindia!;
      c.emit({ id: `evt_user_${String(9000 + n)}`, type: evType, at: Math.round(c.player.now()), source: "user", payload: evPayload } as never);
    },
    { evType: type, evPayload: payload, n: userCounter },
  );
}

/** The owner's grant of apr_05, as Sell › Approvals emits it: by own_01 on the approval's decision date. */
export function grantApr05(page: Page): Promise<void> {
  return emitUser(page, "approval.granted", { approvalId: apr_05.id, by: "own_01", date: apr_05.decisionDate });
}

/** Opens a route on a fresh page, waits for the test hooks and every slot, and pauses the player. */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHooks(page);
  await waitForSlots(page);
  await page.evaluate(() => window.__cindia!.player.pause());
}

/** A slot's wrapper, so a check stays inside one slot (the process bar has its own badge). */
export function slot(page: Page, slotId: string): Locator {
  return page.locator(`[data-slot="${slotId}"]`);
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

/** The store areas this feature reads, for checks on what was emitted and what arrived. */
export async function communitiesState(page: Page) {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      projects: {
        contributions: Record<string, { contributionId: string; projectId: string; amountCents: number; buyerId: string; orderId?: string; at: number }>;
        addedCents: Record<string, number>;
      };
      wip: { milestones: Record<string, { wipId: string; status: string; date: string; amountCents?: number; at: number }> };
      approvals: { items: Record<string, { approvalId: string; status: string; requested: boolean }> };
      agent: { acts: Record<string, { actId: string; kind: string; text: { en: string; zh: string }; refId?: string; at: number }>; actIds: string[] };
      sources: Record<string, string>;
    };
    return { projects: s.projects, wip: s.wip, approvals: s.approvals, agent: s.agent, sources: s.sources };
  });
}

/** Every logged event of a type, as the store's log keeps it (id, type, at, source, key). */
export async function loggedEvents(page: Page, type: string) {
  return page.evaluate((evType) => {
    const s = window.__cindia!.store.getState() as unknown as { log: { entries: { id: string; type: string; at: number; source: string; key?: string }[] } };
    return s.log.entries.filter((e) => e.type === evType);
  }, type);
}

/** The data-raised figure a project-progress-<projectId> block carries (the kit's ProjectCard). */
export async function raisedOn(page: Page, projectId: string, scope?: Locator): Promise<number> {
  const root = scope ?? page.locator("body");
  const v = await root.getByTestId(`project-progress-${projectId}`).getAttribute("data-raised");
  return Number(v);
}
