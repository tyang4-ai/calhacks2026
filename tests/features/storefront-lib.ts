// F-storefront's spec helper (T1). It re-exports seekToEvent from tests/smoke/lib.ts and never copies
// it (contracts section 11), and adds:
// - openBuilder(page) and openStore(page, slug): open /sell/storefront or /store/<slug> at 1440 by
//   900, wait for the hooks and every slot, and pause the player,
// - seed(page, events): emits events through window.__cindia.emit, as scripted events stamped with
//   the player's own clock, for events the tour timeline doesn't carry yet (I2-tour adds them),
// - readers for the store areas the feature uses, the language toggle, and a check that no text in a
//   view is clipped, truncated or cut at an edge.
// Expected values come from src/mock/, never typed in.
import { expect, type Locator, type Page } from "@playwright/test";
import type { Storefront, StorefrontBlock } from "../../src/core/types";
import { getById, storefronts } from "../../src/mock/index";
import { seekToEvent, waitForFonts, waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent };

/** Every spec runs at the Sell frame's size. */
export const VIEWPORT = { width: 1440, height: 900 } as const;

/** The Sell site's storefront, the Diné co-op's. */
export const STO_01 = getById<Storefront>("sto_01")!;
export const ALL_STOREFRONTS: readonly Storefront[] = storefronts;

/** Labels from docs/common/glossary.md, copied here word for word on their own, so the specs check the feature's copy against the contract. */
export const L3 = { en: "Demo verification", zh: "演示认证" };
export const L8 = {
  en: "Placeholder written by the Cindia team. In a real launch, the community writes this page.",
  zh: "由 Cindia 团队撰写的占位内容。正式上线后，由社区自己撰写此页面。",
};
export const L13 = { en: "Fictional storefront, made for a demo.", zh: "虚构的店铺，为演示而制作。" };
/** The plan's own lines (T0), copied from docs/plans/F-storefront.md. */
export const PREVIEW_NOTE_EN = "Preview: a simple block editor for this demo. Edits reach the page only when you publish, and a reset clears them.";
export const FOOTER_LINE_EN = "Made with Cindia's storefront builder (preview)";
export const DRAFT_NOTE_EN = "Draft. Not published yet.";
export const PUBLISH_EN = "Publish";

/** One event to emit: its type, payload and key. */
export interface SeedEvent {
  type: string;
  payload: Record<string, unknown>;
  key?: string;
}

let seedCounter = 0;

/** Opens a route at 1440 by 900, waits for the hooks and every slot, and pauses the player. */
export async function openPath(page: Page, path: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await page.goto(path);
  await waitForHooks(page);
  await waitForSlots(page);
  await page.evaluate(() => window.__cindia!.player.pause());
}

/** Opens Sell › Storefront and waits for the builder. */
export async function openBuilder(page: Page): Promise<void> {
  await openPath(page, "/sell/storefront");
  await expect(page.getByTestId("storefront-builder")).toBeVisible();
}

/** Opens /store/<slug> and waits for the page or its missing note. */
export async function openStore(page: Page, slug: string): Promise<void> {
  await openPath(page, `/store/${slug}`);
  await expect(page.getByTestId("store-page").or(page.getByTestId("store-missing"))).toBeVisible();
}

/**
 * Emits events in order through window.__cindia.emit, as scripted events at the player's own clock
 * (the player is paused first). A seek or a reset drops them, so a spec seeds after any seek.
 */
export async function seed(page: Page, events: SeedEvent[]): Promise<number> {
  const start = seedCounter;
  seedCounter += events.length;
  return page.evaluate(
    ({ list, base }) => {
      const c = window.__cindia!;
      c.player.pause();
      const at = Math.round(c.player.now());
      list.forEach((e, i) => {
        c.emit({ id: `evt_${String(930000 + base + i)}`, type: e.type, at, source: "scripted", ...(e.key ? { key: e.key } : {}), payload: e.payload } as never);
      });
      return at;
    },
    { list: events, base: start },
  );
}

/** A storefront.published for a storefront, as a seed. */
export function publishedSeed(storefront: Storefront, blocks: StorefrontBlock[]): SeedEvent {
  return { type: "storefront.published", payload: { storefrontId: storefront.id, slug: storefront.slug, blocks: structuredClone(blocks) } };
}

/** A copy of a storefront's blocks with one block's props changed. */
export function editBlock(blocks: readonly StorefrontBlock[], blockId: string, props: Record<string, string | string[] | undefined>): StorefrontBlock[] {
  return blocks.map((b) => {
    if (b.blockId !== blockId) return structuredClone(b);
    const next: Record<string, string | string[]> = { ...structuredClone(b.props) };
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined) delete next[k];
      else next[k] = v;
    }
    return { ...structuredClone(b), props: next };
  });
}

/** The first block of a kind in a blocks list. */
export function blockOf(blocks: readonly StorefrontBlock[], kind: StorefrontBlock["kind"]): StorefrontBlock {
  const b = blocks.find((x) => x.kind === kind);
  if (!b) throw new Error(`no ${kind} block`);
  return b;
}

/** The store areas this feature reads, for checks on what was emitted and what arrived. */
export async function storefrontState(page: Page) {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      storefront: {
        requests: Record<string, { at: number }>;
        drafts: Record<string, { blocks: StorefrontBlock[]; at: number }>;
        published: Record<string, { slug: string; blocks: StorefrontBlock[]; at: number }>;
      };
      swarm: { runs: Record<string, { threadId: string; stepIds: string[]; done: boolean }>; runIds: string[] };
      sources: Record<string, string>;
    };
    return { storefront: s.storefront, swarm: s.swarm, sources: s.sources };
  });
}

/** Every logged event of a type, as the store's log keeps it (id, type, at, source, key). */
export async function loggedEvents(page: Page, type: string) {
  return page.evaluate((evType) => {
    const s = window.__cindia!.store.getState() as unknown as { log: { entries: { id: string; type: string; at: number; source: string; key?: string }[] } };
    return s.log.entries.filter((e) => e.type === evType);
  }, type);
}

/** The number of events in the store's log. */
export async function logCount(page: Page): Promise<number> {
  return page.evaluate(() => (window.__cindia!.store.getState() as unknown as { log: { entries: unknown[] } }).log.entries.length);
}

/** The block IDs rendered as store-block-<blockId> inside a root, in order. */
export async function renderedBlockIds(root: Locator): Promise<string[]> {
  return root.locator('[data-testid^="store-block-"]').evaluateAll((els) => els.map((e) => (e.getAttribute("data-testid") ?? "").replace(/^store-block-/, "")));
}

/** The block IDs of the builder's rows (storefront-block-<blockId>), in order. */
export async function editorBlockIds(page: Page): Promise<string[]> {
  return page
    .getByTestId("storefront-builder")
    .locator('[data-testid^="storefront-block-"]')
    .evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-testid") ?? "").filter((id) => !/-(up|down|edit)$/.test(id)).map((id) => id.replace(/^storefront-block-/, "")),
    );
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

/** The computed color a kit token resolves to, such as the jade of --c-color-jade. */
export async function tokenColor(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(--c-color-${name})`;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  }, token);
}

/**
 * Every text-bearing element inside the root, checked at its own size: nothing that clips (overflow
 * other than visible, a line clamp or an ellipsis) holds more than it shows, no element's box spills
 * past the left or right edge of a clipping ancestor, and no text is under 14 px. Returns one line
 * per problem, so a spec can expect an empty list. Vertical scrolling in a scroll box is allowed.
 */
export async function clippedText(page: Page, testId: string): Promise<string[]> {
  await waitForFonts(page);
  return page.evaluate((id) => {
    const root = document.querySelector(`[data-testid="${id}"]`);
    if (!root) return [`${id}: not found`];
    const problems: string[] = [];
    // Names an element by the nearest test ID (the root's when it has none), its tag and its text.
    const name = (el: Element) => {
      const tid = el.closest("[data-testid]")?.getAttribute("data-testid") ?? id;
      const text = (el.textContent ?? "").trim().slice(0, 40);
      return `${tid} <${el.tagName.toLowerCase()}> "${text}"`;
    };
    const all = [root, ...root.querySelectorAll("*")];
    for (const el of all) {
      if (!(el instanceof HTMLElement)) continue;
      const box = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (box.width < 1 || box.height < 1 || cs.visibility === "hidden" || cs.display === "none") continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
      const field = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;
      if ((hasText || field) && parseFloat(cs.fontSize) < 14 - 0.01) problems.push(`${name(el)}: font ${cs.fontSize}`);
      const clipsX = cs.overflowX !== "visible";
      const clipsY = cs.overflowY !== "visible";
      const scrollsY = cs.overflowY === "auto" || cs.overflowY === "scroll";
      const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
      if ((clipsX || cs.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 1) problems.push(`${name(el)}: cut on the right (${el.scrollWidth} > ${el.clientWidth})`);
      if (((clipsY && !scrollsY) || clamp || field) && el.scrollHeight > el.clientHeight + 1) problems.push(`${name(el)}: cut at the bottom (${el.scrollHeight} > ${el.clientHeight})`);
      if (hasText || field) {
        const r = el.getBoundingClientRect();
        for (let a = el.parentElement; a; a = a.parentElement) {
          const as = getComputedStyle(a);
          if (as.overflowX === "visible") continue;
          const b = a.getBoundingClientRect();
          if (r.left < b.left - 1 || r.right > b.right + 1) {
            problems.push(`${name(el)}: past the edge of ${a.getAttribute("data-testid") ?? a.tagName.toLowerCase()}`);
            break;
          }
        }
      }
    }
    return problems;
  }, testId);
}
