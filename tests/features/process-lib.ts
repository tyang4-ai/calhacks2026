// Helpers for the process feature's specs. Every spec moves the timeline with seekToEvent() from
// tests/smoke/lib.ts. A v2 event the timeline doesn't carry yet is emitted with window.__cindia.emit()
// from the scripted payload in src/mock/, stamped at the player's current clock. Events are idempotent
// by ID, so the same spec still passes once the tour carries them.
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import type { EventType, Payloads, SourceKey } from "../../src/core/events";
import type { ScriptedRun, Text } from "../../src/core/types";
import { communities, pieces, report } from "../../src/mock/index";
import { waitForHooks, waitForSlots } from "../smoke/lib";

export { seekToEvent, waitForHooks, waitForSlots, watchPage } from "../smoke/lib";

/** The eleven processes in the bar's order. */
export const PROCESS_IDS = ["search", "swarm", "checkout", "money", "reconcile", "approvals", "close", "proof", "watch", "model", "data"] as const;

export interface SpecEvent {
  type: EventType;
  payload: unknown;
  key?: SourceKey;
  /** Defaults to a stable ID built from the spec's own counter and the type. */
  id?: string;
  source?: "scripted" | "live" | "user";
}

/** Opens a route and waits for the hooks and every slot. */
export async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForHooks(page);
  await waitForSlots(page);
}

/** True when the loaded timeline has an event of `type` whose payload holds every field in `match`. */
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

let seq = 0;

/** Emits events stamped at the player's current clock, in order. An event without an ID gets the next evt_spec_<n>. */
export async function emitAtClock(page: Page, events: SpecEvent[]) {
  const out = events.map((e) => {
    const ev: Record<string, unknown> = {
      id: e.id ?? `evt_spec_${++seq}`,
      type: e.type,
      source: e.source ?? "scripted",
      payload: e.payload,
    };
    if (e.key) ev.key = e.key;
    return ev;
  });
  await page.evaluate((evs) => {
    const c = window.__cindia!;
    const at = Math.round(c.player.now());
    for (const e of evs) c.emit({ ...e, at });
  }, out);
}

/** A scripted run as the events the responder or the tour would play: its steps on its thread, then its final events. */
export function runEvents(run: ScriptedRun, opts: { upTo?: EventType; idPrefix?: string } = {}): SpecEvent[] {
  const prefix = opts.idPrefix ?? `evt_spec_${run.runId}`;
  const out: SpecEvent[] = run.steps.map((s, i) => ({
    type: "swarm.step",
    payload: { ...s, threadId: run.threadId } satisfies Payloads["swarm.step"],
    key: "b14-swarm",
    id: `${prefix}_s${i + 1}`,
  }));
  for (const [i, f] of run.final.entries()) {
    out.push({ type: f.type, payload: f.payload, key: f.type === "approval.requested" ? "b08-approvals" : "b14-swarm", id: `${prefix}_f${i + 1}` });
    if (opts.upTo && f.type === opts.upTo) break;
  }
  return out;
}

/**
 * A search.mapped payload for every piece: the report's points when src/mock/model.ts has one,
 * otherwise a fixed spread by community, marked approx, so the map has one point per piece.
 */
export function mappedPayload(queryId: string, modelId: string): Payloads["search.mapped"] {
  if (report) return { queryId, modelId, points: report.points.map((p) => ({ ...p })), query: { x: 0, y: 0 }, method: "pca", approx: true };
  const ids = communities.map((c) => c.id);
  const centers = [
    [-0.5, -0.3],
    [0.5, -0.5],
    [0.3, 0.5],
    [-0.5, 0.5],
  ];
  const points = pieces.map((p, i) => {
    const [cx, cy] = centers[Math.max(0, ids.indexOf(p.communityId)) % centers.length];
    return { pieceId: p.id, x: Math.round((cx + Math.cos(i * 1.7) * 0.18) * 1e4) / 1e4, y: Math.round((cy + Math.sin(i * 2.3) * 0.18) * 1e4) / 1e4 };
  });
  return { queryId, modelId, points, query: { x: 0, y: 0 }, method: "pca", approx: true };
}

/** An on-screen label (L1 to L30) from docs/common/glossary.md, word for word. */
export function glossaryLabel(id: string): Text {
  const file = path.join(process.env.CINDIA_ROOT ?? process.cwd(), "docs", "common", "glossary.md");
  const line = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`| ${id} |`));
  if (!line) throw new Error(`glossary.md has no ${id}`);
  const cells = line.split("|").map((c) => c.trim());
  return { en: cells[2], zh: cells[3] };
}

/** The status word a block shows, from its status test ID. */
export async function expectStatus(page: Page, id: string, status: "idle" | "working" | "done" | "attention") {
  await expect(page.getByTestId(`process-block-${id}`)).toHaveAttribute("data-status", status);
  await expect(page.getByTestId(`process-block-status-${id}`)).toHaveText(new RegExp(status, "i"));
}

/**
 * Layout problems in the open view, as the G3 verifier's audit measured them, one line each:
 * - the pane doesn't fit the view's body (it would scroll under the log, or run past the view's side),
 * - text cut by an ancestor that clips it, or by an ellipsis or a line clamp,
 * - text in a drawing that runs past the drawing's edge,
 * - two pieces of text that overlap,
 * - text on a box it doesn't belong to (an agent node's shape, a party box), and a money amount on a party box.
 * Lists that scroll by design (an element with overflow auto or scroll inside the pane) may cut a row at
 * their edge.
 */
export async function layoutProblems(page: Page, processId: string): Promise<string[]> {
  return page.evaluate((id) => {
    const out: string[] = [];
    const view = document.querySelector('[data-testid="process-view"]');
    const pane = document.querySelector(`[data-testid="process-pane-${id}"]`);
    const log = view?.querySelector('[data-testid="process-log"]');
    if (!view || !pane || !log) return [`process-view, process-pane-${id} or process-log is missing`];
    const vr = view.getBoundingClientRect();
    const pr = pane.getBoundingClientRect();
    const lr = log.getBoundingClientRect();
    if (pr.bottom > lr.top + 1) out.push(`pane runs ${Math.round(pr.bottom - lr.top)} px under the log`);
    // The view's body (the pane's scrolling parent) holds the whole pane, so nothing waits below the fold.
    let body = pane.parentElement;
    while (body && !/auto|scroll/.test(getComputedStyle(body).overflowY)) body = body.parentElement;
    if (body && body.scrollHeight > body.clientHeight + 1) out.push(`the view's body scrolls by ${body.scrollHeight - body.clientHeight} px`);
    if (pr.right > vr.right + 1 || pr.left < vr.left - 1) out.push("pane runs past the view's side");

    // The helpers live on one object, because the whole function runs in the page.
    const h = {
      shown(el: Element) {
        for (let e: Element | null = el; e; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
        }
        return true;
      },
      nameOf(el: Element) {
        return `${el.closest("[data-testid]")?.getAttribute("data-testid") ?? ""} ${el.tagName.toLowerCase()}`;
      },
      // Two boxes overlap when they share more than `pad` px across and more than a third of the shorter
      // one's height. Text boxes are line boxes, taller than the ink: two lines of a kit label 16 px apart
      // share up to 5 px of box in Chinese without their glyphs touching.
      hit(a: DOMRect, b: DOMRect, pad = 1.5) {
        return (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > pad &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > Math.max(pad, Math.min(a.height, b.height) / 3)
        );
      },
    };
    // `rects` are the text's own boxes. `lines` are the same boxes cut to the height of the block that
    // lays the text out: a font's box can be taller than a line set at line-height 1 (the kit's seal
    // character), and that extra isn't on screen as ink.
    type T = { el: Element; text: string; rects: DOMRect[]; lines: DOMRect[] };
    const texts: T[] = [];
    const walker = document.createTreeWalker(pane, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!text || !el || el.closest("title, option, .c-visually-hidden") || !h.shown(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
      if (!rects.length) continue;
      let block: Element | null = el instanceof HTMLElement ? el : null;
      while (block && /^(inline|contents)$/.test(getComputedStyle(block).display)) block = block.parentElement;
      const br = block?.getBoundingClientRect();
      let lines = br ? rects.map((r) => new DOMRect(r.x, Math.max(r.top, br.top), r.width, Math.max(0, Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top)))) : rects;
      // A list that scrolls by design shows only the part of a row inside it: a row scrolled out of
      // view isn't on screen, so it can't overlap anything or sit on a box.
      for (let a = el.parentElement; a && a !== pane; a = a.parentElement) {
        if (!/auto|scroll/.test(`${getComputedStyle(a).overflowX} ${getComputedStyle(a).overflowY}`)) continue;
        const ar = a.getBoundingClientRect();
        lines = lines.map((r) => {
          const left = Math.max(r.left, ar.left);
          const top = Math.max(r.top, ar.top);
          return new DOMRect(left, top, Math.max(0, Math.min(r.right, ar.right) - left), Math.max(0, Math.min(r.bottom, ar.bottom) - top));
        });
      }
      texts.push({ el, text, rects, lines });
    }

    for (const t of texts) {
      const label = `"${t.text.slice(0, 40)}" (${h.nameOf(t.el)})`;
      // An ellipsis or a line clamp on the text's own element.
      const he = t.el instanceof HTMLElement ? t.el : null;
      if (he) {
        const cs = getComputedStyle(he);
        if (cs.textOverflow === "ellipsis" && he.scrollWidth > he.clientWidth + 1) out.push(`cut with an ellipsis: ${label}`);
        if (cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== "" && he.scrollHeight > he.clientHeight + 1) out.push(`cut by a line clamp: ${label}`);
      }
      // Cut by an ancestor that clips. Scrolling lists may cut a row at their edge.
      for (let a = t.el.parentElement; a && a !== pane.parentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const ov = `${cs.overflowX} ${cs.overflowY}`;
        if (/auto|scroll/.test(ov)) break;
        if (!/hidden|clip/.test(ov)) continue;
        const ar = a.getBoundingClientRect();
        if (t.rects.some((r) => r.right > ar.right + 1 || r.left < ar.left - 1 || r.bottom > ar.bottom + 1 || r.top < ar.top - 1)) {
          out.push(`cut by ${h.nameOf(a)}: ${label}`);
          break;
        }
      }
      // Text in a drawing stays inside the drawing.
      const svg = t.el.closest("svg");
      if (svg) {
        let top: SVGSVGElement = svg;
        for (let s = svg.parentElement?.closest("svg"); s; s = s.parentElement?.closest("svg")) top = s;
        const sr = top.getBoundingClientRect();
        if (t.rects.some((r) => r.right > sr.right + 2 || r.left < sr.left - 2 || r.bottom > sr.bottom + 2 || r.top < sr.top - 2)) out.push(`runs past its drawing: ${label}`);
      }
    }

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i];
        const b = texts[j];
        if (a.lines.some((ra) => b.lines.some((rb) => h.hit(ra, rb)))) out.push(`text overlaps: "${a.text.slice(0, 30)}" and "${b.text.slice(0, 30)}"`);
      }
    }

    // Boxes text must keep off: agent node shapes and party boxes, each except its own group's text.
    const boxes = [...pane.querySelectorAll(".c-agentgraph__shape, [data-party] rect")].map((el) => ({
      el,
      group: el.closest("[data-node-id], [data-party]"),
      r: el.getBoundingClientRect(),
    }));
    for (const t of texts) {
      for (const b of boxes) {
        if (b.group && b.group.contains(t.el)) continue;
        if (t.lines.some((r) => h.hit(r, b.r, 2))) out.push(`text on another box: "${t.text.slice(0, 30)}" on ${b.group?.getAttribute("data-node-id") ?? b.group?.getAttribute("data-party") ?? "a box"}`);
      }
    }
    for (const label of pane.querySelectorAll("[data-move-id] rect")) {
      const lr2 = label.getBoundingClientRect();
      for (const b of boxes) if (b.group?.hasAttribute("data-party") && h.hit(lr2, b.r, 2)) out.push(`amount on a party box: ${label.closest("[data-move-id]")?.getAttribute("data-move-id")} on ${b.group.getAttribute("data-party")}`);
    }
    return [...new Set(out)];
  }, processId);
}

/** The approvals the store holds as requested and pending. */
export async function pendingInStore(page: Page): Promise<number> {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { approvals: { items: Record<string, { status: string; requested: boolean }> } };
    return Object.values(s.approvals.items).filter((a) => a.requested && a.status === "pending").length;
  });
}
