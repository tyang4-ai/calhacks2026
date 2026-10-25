// Where each party sits on the money map. Pure and deterministic: the same party always gets the
// same point. Canvas units are a 1000 by 600 box; the SVG viewBox and the HTML nodes share them.
//
// Money comes in from the left (buyer, Cindia, card processor, gallery), the studio sits in the
// middle, the three makers stand on the right, the card network sits above Cindia so fees peel
// upward, and the supplier sits below the studio. The gaps between nodes leave room for the kit
// Thread's 88 by 26 amount label at each curve's midpoint.
import type { Party, Studio } from "../../core";
import type { Point } from "../../ui";
import { getById } from "../../mock";

export const CANVAS_W = 1000;
export const CANVAS_H = 600;

/** A node's box in canvas units. Threads meet the node on this box's edge. */
export const NODE_W = 150;
export const NODE_H = 76;
/** Space between a node's edge and where a thread starts or ends. */
export const NODE_GAP = 6;

const FIXED: Record<Exclude<Party["kind"], "maker">, Point> = {
  buyer: { x: 95, y: 200 },
  card_network: { x: 320, y: 60 },
  cindia: { x: 320, y: 200 },
  processor: { x: 320, y: 380 },
  gallery: { x: 320, y: 530 },
  studio: { x: 590, y: 300 },
  supplier: { x: 590, y: 530 },
  // v2 placeholder (I2-core fallout): above the studio, clear of every v1 node and thread.
  community_fund: { x: 590, y: 60 },
};

/** Maker slots, top to bottom, in the studio's makerIds order. */
const MAKER_SLOTS: Point[] = [
  { x: 885, y: 120 },
  { x: 885, y: 300 },
  { x: 885, y: 480 },
];
/** Where a maker the studio doesn't list stands. */
const MAKER_FALLBACK: Point = { x: 885, y: 560 };

const MAKER_IDS: readonly string[] = getById<Studio>("std_dine")?.makerIds ?? [];

/** The studio's makers, in layout order. */
export function studioMakerIds(): readonly string[] {
  return MAKER_IDS;
}

/** The node's key: "studio", "cindia", "maker-mkr_01". The node's test ID is money-map-node-<key>. */
export function partyKey(p: Party): string {
  return p.kind === "maker" ? `maker-${p.id ?? "unknown"}` : p.kind;
}

/** The node's centre in canvas units. */
export function partyPoint(p: Party): Point {
  if (p.kind !== "maker") return FIXED[p.kind];
  const i = p.id ? MAKER_IDS.indexOf(p.id) : -1;
  return MAKER_SLOTS[i] ?? MAKER_FALLBACK;
}

/** Where a thread leaves or meets the node: on the node's box edge facing `toward`, plus a small gap. */
export function anchor(p: Party, toward: Point): Point {
  const c = partyPoint(p);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const hw = NODE_W / 2 + NODE_GAP;
  const hh = NODE_H / 2 + NODE_GAP;
  const s = Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy));
  return { x: c.x + dx * s, y: c.y + dy * s };
}
