// Groups money moves into one path per ordered pair of parties (from, then to) and lane, in arrival
// order. Pure and deterministic: the same moves always give the same groups. No React here.
//
// A buyer's project contribution (kind project_fund) runs in its own "fund" lane, so its $5.00
// never merges into the sale on the same buyer-to-Cindia pair, and its path sits beside the sale's.
import type { MoneyMove, MoneyMoveKind, Party } from "../../core";
import type { Point, ThreadProps } from "../../ui";
import { partyKey } from "./partyLayout";

/**
 * A move's thread tone, by the colors rule in design-system.md: jade ("in") for money that
 * arrived in the co-op or with a maker, and for a contribution or a milestone passed on in full;
 * seal ("out") for fees going out; ink for everything else.
 */
export function moveTone(kind: MoneyMoveKind, to: Party): NonNullable<ThreadProps["tone"]> {
  if (kind === "fee") return "out";
  if (kind === "project_fund" || kind === "milestone") return "in";
  if (to.kind === "studio" || to.kind === "maker") return "in";
  return "neutral";
}

/** "fund" for a project contribution, "main" for every other move. */
export type Lane = "main" | "fund";

export function laneOf(kind: MoneyMoveKind): Lane {
  return kind === "project_fund" ? "fund" : "main";
}

export interface ThreadGroup {
  /** Stable key for the ordered pair and lane: "<from key>><to key>", plus "#fund" in the fund lane. */
  key: string;
  lane: Lane;
  from: Party;
  to: Party;
  /** The moves on this path, oldest first. The last one is the newest. */
  moveIds: string[];
  /** Sum of the moves' amounts, in cents. */
  totalCents: number;
}

export function pairKey(from: Party, to: Party): string {
  return `${partyKey(from)}>${partyKey(to)}`;
}

/** One group per ordered from-to pair and lane, ordered by the group's first move. */
export function groupMoves(moves: readonly MoneyMove[]): ThreadGroup[] {
  const groups: ThreadGroup[] = [];
  const byKey = new Map<string, ThreadGroup>();
  for (const m of moves) {
    const lane = laneOf(m.kind);
    const key = lane === "main" ? pairKey(m.from, m.to) : `${pairKey(m.from, m.to)}#${lane}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, lane, from: m.from, to: m.to, moveIds: [], totalCents: 0 };
      byKey.set(key, g);
      groups.push(g);
    }
    g.moveIds.push(m.moveId);
    g.totalCents += m.amountCents;
  }
  return groups;
}

/** How far the fund lane sits from the main lane on the same pair, in canvas units. */
export const FUND_LANE_OFFSET = 34;

/**
 * A fund-lane path between two parties that also trade in the main lane (the buyer and Cindia)
 * shifts to the left of its direction of travel (above the sale, going right), so the two amount
 * labels stand apart. Any other path keeps its anchors.
 */
export function laneEnds(lane: Lane, from: Party, start: Point, end: Point): { from: Point; to: Point } {
  if (lane !== "fund" || from.kind !== "buyer") return { from: start, to: end };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  // The left-hand normal of the direction of travel, in SVG's y-down coordinates.
  const nx = (dy / len) * FUND_LANE_OFFSET;
  const ny = (-dx / len) * FUND_LANE_OFFSET;
  return { from: { x: start.x + nx, y: start.y + ny }, to: { x: end.x + nx, y: end.y + ny } };
}

/** The kit Thread's default bow. */
const BOW = 0.18;

/** A point on a kit Thread's quadratic curve, t from 0 to 1. Mirrors Thread's own curve. */
export function curvePoint(from: Point, to: Point, t: number, bow = BOW): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const ctrl = { x: (from.x + to.x) / 2 - dy * bow, y: (from.y + to.y) / 2 + dx * bow };
  const u = 1 - t;
  return { x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y };
}

/** The point at the middle of a kit Thread's curve, where its amount label sits. */
export function curveMid(from: Point, to: Point, bow = BOW): Point {
  return curvePoint(from, to, 0.5, bow);
}

/** A box in canvas units, by its edges. */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function rectAround(c: Point, halfW: number, halfH: number): Rect {
  return { left: c.x - halfW, top: c.y - halfH, right: c.x + halfW, bottom: c.y + halfH };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/**
 * An amount label: 88 by 26 drawn pixels around the curve's midpoint, its text at the kit's 14 px.
 * In canvas units each size is multiplied by the canvas's units per pixel (`unit`), so the label
 * draws at the same size whatever the canvas's scale.
 */
export const LABEL_HALF_W = 44;
export const LABEL_HALF_H = 13;
export const LABEL_FONT_PX = 14;
const NOTE_GAP = 6;
const NOTE_HALF_H = 10;

/** About how wide a 14 px note is in pixels, by its characters: Latin narrow, Chinese square. */
export function noteWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += /[⺀-鿿＀-￯]/.test(ch) ? 14 : 7.6;
  return Math.ceil(w) + 8;
}

/** One thread that needs a note, with the path it rides and where its amount label sits. */
export interface NoteRequest {
  /** The move's ID. */
  id: string;
  /** The key of the group whose path the move rides, so its own path is never an obstacle. */
  pathId: string;
  from: Point;
  to: Point;
}

export interface NotePlace {
  /** The note's anchor point: its centre for "middle", its left end for "start", its right end for "end". */
  x: number;
  y: number;
  anchor: "middle" | "start" | "end";
}

/**
 * Where each "Checked against Nessie" note goes beside its thread's amount: the first of below,
 * above, right or left (right, left, below, above on a steep thread) that stays inside the canvas
 * and clear of every node, every amount label, every other thread and every note placed before it.
 * When none is clear it goes below. Pure and deterministic.
 */
export function placeNotes(
  requests: readonly NoteRequest[],
  obstacles: { nodes: readonly Rect[]; labels: readonly Rect[]; paths: readonly { id: string; from: Point; to: Point }[] },
  /** The note's width in pixels (noteWidth). */
  widthPx: number,
  canvas: { w: number; h: number },
  /** Canvas units per drawn pixel. */
  unit = 1,
): Map<string, NotePlace> {
  const out = new Map<string, NotePlace>();
  const placed: Rect[] = [];
  const samples = obstacles.paths.map((p) => ({ id: p.id, pts: Array.from({ length: 25 }, (_, i) => curvePoint(p.from, p.to, i / 24)) }));
  const width = widthPx * unit;
  const halfW = width / 2;
  const halfH = NOTE_HALF_H * unit;
  const gap = NOTE_GAP * unit;
  const labelHalfW = LABEL_HALF_W * unit;
  const labelHalfH = LABEL_HALF_H * unit;
  const centred = (x: number, y: number): [NotePlace, Rect] => [{ x, y, anchor: "middle" }, rectAround({ x, y }, halfW, halfH)];
  for (const r of requests) {
    const mid = curveMid(r.from, r.to);
    const below = centred(mid.x, mid.y + labelHalfH + gap + halfH);
    const above = centred(mid.x, mid.y - labelHalfH - gap - halfH);
    // One more step out, for when the first ring is crowded (two moves merged on one path).
    const below2 = centred(mid.x, mid.y + labelHalfH + 2 * gap + 3 * halfH);
    const above2 = centred(mid.x, mid.y - labelHalfH - 2 * gap - 3 * halfH);
    const rightX = mid.x + labelHalfW + gap;
    const right: [NotePlace, Rect] = [
      { x: rightX, y: mid.y, anchor: "start" },
      { left: rightX, top: mid.y - halfH, right: rightX + width, bottom: mid.y + halfH },
    ];
    const leftX = mid.x - labelHalfW - gap;
    const left: [NotePlace, Rect] = [
      { x: leftX, y: mid.y, anchor: "end" },
      { left: leftX - width, top: mid.y - halfH, right: leftX, bottom: mid.y + halfH },
    ];
    const level = Math.abs(r.to.x - r.from.x) >= Math.abs(r.to.y - r.from.y);
    const order = level ? [below, above, right, left, below2, above2] : [right, left, below, above, below2, above2];
    const clear = (box: Rect) =>
      box.left >= 0 &&
      box.top >= 0 &&
      box.right <= canvas.w &&
      box.bottom <= canvas.h &&
      !obstacles.nodes.some((n) => overlaps(box, n)) &&
      !obstacles.labels.some((l) => overlaps(box, l)) &&
      !placed.some((p) => overlaps(box, p)) &&
      !samples.some((s) => s.id !== r.pathId && s.pts.some((pt) => pt.x > box.left && pt.x < box.right && pt.y > box.top && pt.y < box.bottom));
    const pick = order.find(([, box]) => clear(box)) ?? below;
    out.set(r.id, pick[0]);
    placed.push(pick[1]);
  }
  return out;
}
