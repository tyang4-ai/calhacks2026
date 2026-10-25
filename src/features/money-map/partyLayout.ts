// Where each party sits on the money map. Pure and deterministic: the same party always gets the
// same point. Canvas units are a 1000 by 600 box; the SVG viewBox and the HTML nodes share them, so
// the map scales to any view size and the labels stay put.
//
// Money comes in from the left (buyer, Cindia, card processor, gallery), the co-op sits in the
// middle, the three makers stand on the right, the card network sits above Cindia so fees peel
// upward, and the supplier sits below the co-op. The gaps between nodes leave room for the kit
// Thread's 88 by 26 amount label at each curve's midpoint.
//
// v2's community funds (one per project, prj_01 to prj_04) sit where their threads from Cindia never
// cross the co-op's: the tour's prj_01 above the co-op, right of the card network; prj_02 above the
// buyer; prj_03 further right in the top band, clear of the first maker; prj_04 under the buyer.
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

const FIXED: Record<Exclude<Party["kind"], "maker" | "community_fund">, Point> = {
  buyer: { x: 80, y: 200 },
  card_network: { x: 335, y: 60 },
  cindia: { x: 335, y: 200 },
  processor: { x: 335, y: 380 },
  gallery: { x: 335, y: 530 },
  studio: { x: 590, y: 300 },
  supplier: { x: 590, y: 530 },
};

/** Maker slots, top to bottom, in the studio's makerIds order. */
const MAKER_SLOTS: Point[] = [
  { x: 885, y: 120 },
  { x: 885, y: 300 },
  { x: 885, y: 480 },
];
/** Where a maker the studio doesn't list stands. */
const MAKER_FALLBACK: Point = { x: 885, y: 560 };

/** Community fund slots by project ID (Party.id of a community_fund is the project's ID). */
const FUND_SLOTS: Record<string, Point> = {
  prj_01: { x: 520, y: 56 },
  prj_02: { x: 80, y: 56 },
  prj_03: { x: 720, y: 56 },
  prj_04: { x: 80, y: 390 },
};
/** Where a fund for any other project stands. */
const FUND_FALLBACK: Point = { x: 80, y: 520 };

const MAKER_IDS: readonly string[] = getById<Studio>("std_dine")?.makerIds ?? [];

/** The studio's makers, in layout order. */
export function studioMakerIds(): readonly string[] {
  return MAKER_IDS;
}

/**
 * The node's key: "studio", "cindia", "maker-mkr_01", "community_fund-prj_01". The node's test ID
 * is money-map-node-<key>.
 */
export function partyKey(p: Party): string {
  if (p.kind === "maker") return `maker-${p.id ?? "unknown"}`;
  if (p.kind === "community_fund") return `community_fund-${p.id ?? "unknown"}`;
  return p.kind;
}

/** The node's centre in canvas units. */
export function partyPoint(p: Party): Point {
  if (p.kind === "maker") {
    const i = p.id ? MAKER_IDS.indexOf(p.id) : -1;
    return MAKER_SLOTS[i] ?? MAKER_FALLBACK;
  }
  if (p.kind === "community_fund") return (p.id ? FUND_SLOTS[p.id] : undefined) ?? FUND_FALLBACK;
  return FIXED[p.kind];
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
