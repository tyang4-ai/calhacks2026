// The beats of the 60-second demo, from docs/common/demo-script.md: when each starts and ends, its
// camera, the test IDs its On screen column lists (grouped by the feature that renders them) and
// the figures that must show. The demo and offline tests check each beat against this table.
import fs from "node:fs";
import path from "node:path";

export type CameraId = "buyer" | "buyer-studio" | "studio-month" | "studio-catch" | "studio-owner" | "studio-close" | "maker" | "receipt";
export type FrameId = "frame-buyer" | "frame-studio" | "frame-owner" | "frame-maker";

export interface Figure {
  testId: string;
  /** Text the element must contain. */
  text: string;
}

export interface Beat {
  id: string;
  start: number;
  end: number;
  camera: CameraId;
  /** On screen test IDs by feature slug, so a cut feature's IDs can be set aside. */
  onScreen: Record<string, string[]>;
  /** The slot each feature fills here, whose placeholder shows when the feature is cut. */
  slots: Record<string, string>;
  figures: Figure[];
  /** IDs the screen may drop before the screenshot (seen during the beat is enough), with why. */
  transient?: Record<string, string>;
}

export const BEATS: Beat[] = [
  {
    id: "d01-ask",
    start: 0,
    end: 4000,
    camera: "buyer",
    onScreen: { buyer: ["buyer-concierge-input", "buyer-concierge-results"] },
    slots: { buyer: "buyer.main" },
    figures: [
      { testId: "buyer-concierge-results", text: "$180.00" },
      { testId: "buyer-concierge-results", text: "$48.00" },
      { testId: "buyer-concierge-results", text: "$175.00" },
    ],
  },
  {
    id: "d02-story",
    start: 4000,
    end: 8000,
    camera: "buyer",
    onScreen: { buyer: ["buyer-story-card", "buyer-process-timeline"] },
    slots: { buyer: "buyer.main" },
    figures: [
      { testId: "buyer-story-card", text: "Lu Yun" },
      { testId: "buyer-story-card", text: "26 hours" },
    ],
  },
  {
    id: "d03-split",
    start: 8000,
    end: 11000,
    camera: "buyer",
    onScreen: { buyer: ["buyer-split-bar", "buyer-split-maker-share"] },
    slots: { buyer: "buyer.main" },
    figures: [
      { testId: "buyer-split-maker-share", text: "$134.48" },
      { testId: "buyer-split-bar", text: "$22.00" },
      { testId: "buyer-split-bar", text: "$18.00" },
      { testId: "buyer-split-bar", text: "$5.52" },
    ],
  },
  {
    id: "d04-pay",
    start: 11000,
    end: 15000,
    camera: "buyer",
    onScreen: { buyer: ["buyer-pay-button", "buyer-token", "buyer-receipt-status"] },
    slots: { buyer: "buyer.main" },
    figures: [
      { testId: "buyer-token", text: "tok_7Q2M9X4KD1PA" },
      { testId: "buyer-receipt-status", text: "Received" },
    ],
    transient: { "buyer-pay-button": "the buyer flow swaps Pay for the receipt once the order is placed" },
  },
  {
    id: "d05-money",
    start: 15000,
    end: 20000,
    camera: "buyer-studio",
    onScreen: { "money-map": ["money-map-canvas", "money-map-thread-mv_0001", "money-map-thread-mv_0003", "money-map-balance"] },
    slots: { "money-map": "studio.map.main" },
    figures: [
      { testId: "money-map-canvas", text: "$180.00" },
      { testId: "money-map-canvas", text: "$5.52" },
      { testId: "money-map-canvas", text: "$156.48" },
      // The balance figure is checked against the store's account.synced in the spec.
    ],
  },
  {
    id: "d06-month",
    start: 20000,
    end: 30000,
    camera: "studio-month",
    // Plus reconcile-match-<matchId> for every match.made in the beat, added by the harness from the
    // timeline. The kinds in SHOWN_MATCH_KINDS must be in frame; one-to-one rows may scroll out.
    onScreen: { reconcile: ["reconcile-timeline"] },
    slots: { reconcile: "studio.month.main" },
    figures: [],
  },
  {
    id: "d07-catch",
    start: 30000,
    end: 38000,
    camera: "studio-catch",
    onScreen: {
      reconcile: ["reconcile-flag", "reconcile-evidence-contract", "reconcile-evidence-statement", "reconcile-evidence-bank", "reconcile-explanation"],
    },
    slots: { reconcile: "studio.month.main" },
    figures: [
      { testId: "reconcile-flag", text: "$340.00" },
      { testId: "reconcile-flag", text: "$2,040.00" },
      { testId: "reconcile-evidence-contract", text: "40%" },
      { testId: "reconcile-evidence-statement", text: "50%" },
      { testId: "reconcile-evidence-bank", text: "$1,700.00" },
      { testId: "reconcile-evidence-bank", text: "Sep 30" },
    ],
  },
  {
    id: "d08-approve",
    start: 38000,
    end: 43000,
    camera: "studio-owner",
    onScreen: { approvals: ["approvals-item-apr_01", "approvals-item-apr_02", "approvals-seal-apr_01", "approvals-seal-apr_02"] },
    slots: { approvals: "owner.main" },
    figures: [
      { testId: "approvals-item-apr_01", text: "$340.00" },
      { testId: "approvals-item-apr_02", text: "$340.00" },
    ],
  },
  {
    id: "d09-close",
    start: 43000,
    end: 47000,
    camera: "studio-close",
    onScreen: {
      close: ["close-workbook", "close-totals"],
      impact: ["impact-maker-share", "impact-days-to-payout", "impact-hours-saved"],
    },
    slots: { close: "studio.close.main", impact: "studio.close.side" },
    figures: [
      { testId: "close-workbook", text: "cindia-close-2026-09.xlsx" },
      { testId: "close-totals", text: "$340.00" },
      { testId: "impact-hours-saved", text: "Estimate" },
    ],
  },
  {
    id: "d10-statement",
    start: 47000,
    end: 50000,
    camera: "maker",
    onScreen: { "maker-statement": ["maker-statement-total", "maker-statement-lines", "maker-statement-held"] },
    slots: { "maker-statement": "maker.main" },
    figures: [
      { testId: "maker-statement-total", text: "本月收入" },
      { testId: "maker-statement-lines", text: "$134.48" },
      { testId: "maker-statement-held", text: "$95.00" },
    ],
  },
  {
    id: "d11-receipt",
    start: 50000,
    end: 60000,
    camera: "receipt",
    onScreen: { buyer: ["buyer-receipt", "buyer-receipt-status"] },
    slots: { buyer: "buyer.main" },
    figures: [
      { testId: "buyer-receipt-status", text: "Paid to the maker" },
      { testId: "buyer-receipt", text: "$134.48" },
      { testId: "buyer-receipt", text: "Oct 2, 2026" },
    ],
  },
];

/**
 * The match kinds d06's Figures column names (the bundled payout, the refund netted, the orders
 * carried to Oct 2). Their reconcile-match rows must be in frame at the end of d06.
 */
export const SHOWN_MATCH_KINDS: readonly string[] = ["bundled", "refund_netted", "carried_over"];

/** The frames each camera shows and their scale (ui-contract.md, Camera states). Every other frame is hidden. */
export const CAMERA_FRAMES: Record<CameraId, Partial<Record<FrameId, number>>> = {
  buyer: { "frame-buyer": 1 },
  "buyer-studio": { "frame-buyer": 0.9, "frame-studio": 0.85 },
  "studio-month": { "frame-studio": 1 },
  "studio-catch": { "frame-studio": 1.35 },
  "studio-owner": { "frame-studio": 0.9, "frame-owner": 0.8 },
  "studio-close": { "frame-studio": 1 },
  maker: { "frame-maker": 1, "frame-studio": 0.85 },
  receipt: { "frame-buyer": 1 },
};

/** The studio view each camera puts up (ui-contract.md), or null when the studio isn't shown. */
export const CAMERA_VIEW: Record<CameraId, string | null> = {
  buyer: null,
  "buyer-studio": "map",
  "studio-month": "month",
  "studio-catch": "month",
  "studio-owner": "month",
  "studio-close": "close",
  maker: "close",
  receipt: null,
};

/**
 * Event types a live source may return nothing for during the demo, so the scripted event plays,
 * by source key, with why. In live mode a key listed here passes when it went live at least once
 * and its only fallbacks were "returned nothing" for these types. A throw, a timeout, nothing
 * returned for any other type, or going back to scripted for any other reason still fails.
 */
export const ALLOWED_EMPTY_FALLBACKS: Record<string, { types: readonly string[]; why: string }> = {
  "b08-approvals": {
    types: ["approval.granted", "approval.declined"],
    why: "docs/plans/B08-approvals.md: with no owner screen connected the adapter returns [] for the scripted decision, so it plays on time",
  },
  // The registry's warning names only the event type, not the moveId, so this can't be narrowed
  // to mv_0001 and mv_0002 here. The key must still go live at least once (mv_0003 onward, account.synced).
  "b04-bank": {
    types: ["money.moved"],
    why: "docs/plans/B04-bank.md, Adapter: the sale's other moves (the buyer's payment mv_0001 and the card fee mv_0002) return [], since Nessie records only the settlement",
  },
};

/**
 * The server key each live source needs before its adapter can turn healthy, named as in
 * /api/health's `keys` (docs/plans/B02-explain.md, B04-bank.md, B07-ask.md, B09-concierge.md).
 * Sources not listed need no key. In live mode the harness doesn't wait for an adapter whose key
 * /api/health reports missing, since it can never turn healthy.
 */
export const REQUIRED_KEYS: Record<string, "anthropic" | "nessie"> = {
  "b02-explain": "anthropic",
  "b04-bank": "nessie",
  "b07-ask": "anthropic",
  "b09-concierge": "anthropic",
};

export const FRAME_IDS: FrameId[] =["frame-buyer", "frame-studio", "frame-owner", "frame-maker"];
export const NATIVE_WIDTH: Record<FrameId, number> = { "frame-buyer": 390, "frame-studio": 1280, "frame-owner": 390, "frame-maker": 390 };

/** Feature slugs whose state is CUT in the Features table of docs/harness/status.md. */
export function cutFeatures(root = process.env.CINDIA_ROOT ?? process.cwd()): Set<string> {
  const out = new Set<string>();
  let text = "";
  try {
    text = fs.readFileSync(path.join(root, "docs", "harness", "status.md"), "utf8");
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split("|").map((c) => c.trim());
    // | F-<slug> | wave | state | ...
    if (cells.length > 4 && /^F-[a-z0-9-]+$/.test(cells[1]) && cells[3].toUpperCase() === "CUT") out.add(cells[1].slice(2));
  }
  return out;
}
