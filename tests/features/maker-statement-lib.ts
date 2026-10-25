// M-maker-statement T1: the spec helper every maker-statement spec imports.
// - seekToEvent is re-exported from tests/smoke/lib.ts, never copied. Specs seek by event, never by
//   a fixed time, because I2-tour moves every beat.
// - openMaker(page, makerId) opens /maker/<makerId> and waits for maker.main to fill.
// - expectEnglishOnly(el) checks the site is English only (decisions.md, Oct 24 11:35 and 11:55 PM):
//   no language toggle on the page, and no Chinese character in the element's text.
// - expectInsideFrame and expectNoClippedText check the page at 1440 by 900: "inside the frame"
//   means fully inside frame-maker and every clipping ancestor.
// Expected values come from src/mock/, never typed in, except the figures the plan names.
import { expect, type Locator, type Page } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { communities } from "../../src/mock/communities";
import { pieces } from "../../src/mock/catalog";
import { orders, makerPayouts, makerStatements } from "../../src/mock/month";
import { allMakers } from "../../src/mock/people";
import { seekToEvent, waitForHooks } from "../smoke/lib";

export { seekToEvent };

/** The maker page's size: every spec runs at 1440 by 900. */
export const FRAME_VIEWPORT = { width: 1440, height: 900 };

/** Grace N., the demo's maker, her statement and her payout. */
export const MAKER_ID = "mkr_01";
export const GRACE = allMakers.find((m) => m.id === MAKER_ID)!;
export const MST_01 = makerStatements.find((m) => m.id === "mst_01")!;
export const MPO_01 = makerPayouts.find((m) => m.id === "mpo_01")!;
export const DINE = communities.find((c) => c.id === GRACE.communityId)!;
/** ord_001 sells pc_01. */
export const PC_01 = pieces.find((p) => p.id === "pc_01")!;
export const ORD_001 = orders.find((o) => o.id === "ord_001")!;

/** S3's mkr_04, an Ojibwe co-op maker with no statement. */
export const MKR_04 = allMakers.find((m) => m.id === "mkr_04")!;

/** The test IDs the d11-maker beat shows (v1's d10-statement On screen IDs). */
export const BEAT_IDS = ["maker-statement-total", "maker-statement-lines", "maker-statement-held"] as const;

/** Opens a maker's page and waits for maker.main to fill. */
export async function openMaker(page: Page, makerId: string = MAKER_ID): Promise<void> {
  await page.goto(`/maker/${makerId}`);
  await waitForHooks(page);
  await expect(page.locator('[data-slot="maker.main"]')).toHaveAttribute("data-slot-state", "filled");
}

/** Seeks to the timeline's statement.issued for a maker, plus the offset. */
export function seekToStatement(page: Page, offsetMs: number, makerId: string = MAKER_ID): Promise<number> {
  return seekToEvent(page, "statement.issued", { makerId }, offsetMs);
}

/** The statement.issued payload the store holds for a maker, or null. */
export async function statementFor(page: Page, makerId: string = MAKER_ID): Promise<Payloads["statement.issued"] | null> {
  return page.evaluate((id) => {
    const s = window.__cindia!.store.getState() as unknown as {
      close: { statementByMaker: Record<string, string>; statements: Record<string, Payloads["statement.issued"]> };
    };
    const sid = s.close.statementByMaker[id];
    return sid ? s.close.statements[sid] : null;
  }, makerId);
}

/** The `at` of the first timeline event of a type whose payload holds every field in `match`. */
export async function eventAt(page: Page, type: string, match: Record<string, unknown>): Promise<number | null> {
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

/** The end of the beat that shows the statement: the next beat.started after statement.issued. */
export async function beatEndAfterStatement(page: Page, makerId: string = MAKER_ID): Promise<number> {
  const end = await page.evaluate((id) => {
    const events = window.__cindia?.player.getTimeline()?.events ?? [];
    const st = events.find((e) => e.type === "statement.issued" && (e.payload as { makerId?: string }).makerId === id);
    if (!st) return null;
    const next = events.find((e) => e.type === "beat.started" && e.at > st.at);
    return next ? next.at : (window.__cindia?.player.getTimeline()?.durationMs ?? null);
  }, makerId);
  expect(end, "a beat ends after statement.issued").not.toBeNull();
  return end!;
}

/** Han ideographs, CJK punctuation and fullwidth forms: any of them in English text is Chinese. */
const CHINESE = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]+/g;

/**
 * English only (decisions.md, Oct 24 11:35 and 11:55 PM): the page has no language toggle, and the
 * element's text holds no Chinese character. Retried with the default expect timeout.
 */
export async function expectEnglishOnly(el: Locator): Promise<void> {
  await expect(el.page().getByTestId("demo-lang-toggle")).toHaveCount(0);
  await expect(el).toBeVisible();
  await expect
    .poll(async () => ((await el.textContent()) ?? "").match(CHINESE) ?? [], { message: "Chinese text on screen" })
    .toEqual([]);
}

/** The language the shell gave maker.main, from its data-slot-props. */
export async function slotLang(page: Page): Promise<string> {
  const raw = await page.locator('[data-slot="maker.main"]').getAttribute("data-slot-props");
  return (JSON.parse(raw ?? "{}") as { lang?: string }).lang ?? "";
}

/**
 * Each test ID sits fully inside frame-maker and every clipping ancestor (within 1 px), measured
 * against each ancestor's padding box. Retried with the default expect timeout.
 */
export async function expectInsideFrame(page: Page, testIds: readonly string[]): Promise<void> {
  for (const id of testIds) {
    await expect
      .poll(
        () =>
          page.evaluate((want) => {
            const frame = document.querySelector('[data-testid="frame-maker"]');
            const el = frame?.querySelector(`[data-testid="${want}"]`);
            if (!frame || !el) return `${want}: not in frame-maker`;
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return `${want}: has no size`;
            const out = (c: DOMRect) => r.left < c.left - 1 || r.top < c.top - 1 || r.right > c.right + 1 || r.bottom > c.bottom + 1;
            if (out(frame.getBoundingClientRect())) return `${want}: outside frame-maker`;
            // An absolutely placed box is clipped only by its containing block (its nearest
            // positioned ancestor) and what holds that, so the static boxes between don't count.
            let skip = getComputedStyle(el).position === "absolute";
            for (let a = el.parentElement; a && a !== frame; a = a.parentElement) {
              const cs = getComputedStyle(a);
              if (skip && cs.position === "static") continue;
              skip = cs.position === "absolute";
              if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
              const b = a.getBoundingClientRect();
              const inner = new DOMRect(b.left + a.clientLeft, b.top + a.clientTop, a.clientWidth, a.clientHeight);
              if (out(inner)) return `${want}: clipped by ${a.getAttribute("data-slot") ?? a.tagName.toLowerCase()}`;
            }
            return "inside";
          }, id),
        { message: `${id} sits inside frame-maker and every clipping ancestor` },
      )
      .toBe("inside");
  }
}

/**
 * Every element under the test ID that holds text of its own: its text isn't cut off (no ellipsis
 * or hidden overflow, scrollWidth within clientWidth), its box sits inside frame-maker and every
 * clipping ancestor, and its font is at least 14 px. Returns nothing; fails with each problem.
 */
export async function expectNoClippedText(page: Page, testId: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((want) => {
          const frame = document.querySelector('[data-testid="frame-maker"]');
          const root = frame?.querySelector(`[data-testid="${want}"]`);
          if (!frame || !root) return [`${want}: not in frame-maker`];
          const problems: string[] = [];
          const slack = 1;
          const out = (r: DOMRect, c: DOMRect) =>
            r.left < c.left - slack || r.top < c.top - slack || r.right > c.right + slack || r.bottom > c.bottom + slack;
          const all = [root, ...root.querySelectorAll("*")];
          for (const el of all) {
            const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
            if (!own) continue;
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") continue;
            const text = (el.textContent ?? "").trim().slice(0, 40);
            const fontPx = parseFloat(cs.fontSize);
            if (fontPx < 14) problems.push(`"${text}": font ${fontPx}px`);
            const h = el as HTMLElement;
            if (h.scrollWidth > h.clientWidth + 1 && cs.overflowX !== "visible") problems.push(`"${text}": text cut off (${h.scrollWidth} > ${h.clientWidth})`);
            const r = el.getBoundingClientRect();
            if (out(r, frame.getBoundingClientRect())) problems.push(`"${text}": outside frame-maker`);
            // An absolutely placed box (the kit toast) is clipped only by its containing block (its
            // nearest positioned ancestor) and what holds that, so the static boxes between don't count.
            let skip = cs.position === "absolute";
            for (let a = el.parentElement; a && a !== frame; a = a.parentElement) {
              const acs = getComputedStyle(a);
              if (skip && acs.position === "static") continue;
              skip = acs.position === "absolute";
              if (acs.overflowX === "visible" && acs.overflowY === "visible") continue;
              const b = a.getBoundingClientRect();
              const inner = new DOMRect(b.left + a.clientLeft, b.top + a.clientTop, a.clientWidth, a.clientHeight);
              if (out(r, inner)) {
                problems.push(`"${text}": clipped by ${a.getAttribute("data-slot") ?? a.getAttribute("data-testid") ?? a.tagName.toLowerCase()}`);
                break;
              }
            }
          }
          return problems;
        }, testId),
      { message: `no text under ${testId} is clipped, outside the frame or under 14 px` },
    )
    .toEqual([]);
}

/** Two boxes overlap. */
export function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
