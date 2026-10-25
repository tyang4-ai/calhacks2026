// The tour's beats, from docs/common/demo-script.md (## Beats): when each starts and ends, its camera,
// process and drawer at its screenshot (300 ms before it ends), the test IDs its On screen column
// lists (grouped by the feature that renders them, the pitch cards under `stage`, which is never
// cut), the slot each feature fills there, and the figures that must show. The demo and offline
// tests check each beat against this table. Figures that depend on the data come from the loaded
// timeline at run time (the harness's dynamicChecks), never typed here.
import fs from "node:fs";
import path from "node:path";
import type { TourCameraId } from "../../src/core/featureTypes";
import { PITCH_CARDS } from "../../src/app/demo/pitch";

/**
 * The desktop page every frame and the stage are: 1440 by 900 (ui-contract.md, design-system.md).
 * The kit exports it as PAGE_WIDTH and PAGE_HEIGHT from src/ui/PageFrame.tsx, which the tests'
 * tsconfig (no jsx) can't import, so the harness checks the frames against this on the page itself.
 */
export const PAGE_WIDTH = 1440;
export const PAGE_HEIGHT = 900;

export type CameraId = TourCameraId;
export type FrameId = "frame-buyer" | "frame-studio" | "frame-maker" | "frame-store";
export type ProcessIdString = "search" | "swarm" | "checkout" | "money" | "reconcile" | "approvals" | "close" | "proof" | "watch" | "model" | "data";

export interface Figure {
  testId: string;
  /** Text the element must contain. */
  text: string;
}

export interface Beat {
  id: string;
  start: number;
  end: number;
  /** The camera at the screenshot, 300 ms before the beat ends. */
  camera: CameraId;
  /** The process view open at the screenshot, or null. */
  process: ProcessIdString | null;
  /** The drawer open at the screenshot, or null. */
  drawer: "support" | "ask" | "audit" | null;
  /** On screen test IDs by feature slug, so a cut feature's IDs can be set aside. `process` IDs are looked up in the stage's process panel, `stage` IDs on the stage. */
  onScreen: Record<string, string[]>;
  /** The slot each feature fills here, whose placeholder shows when the feature is cut. */
  slots: Record<string, string>;
  figures: Figure[];
  /** IDs the screen may drop before the screenshot (seen during the beat is enough), with why. */
  transient?: Record<string, string>;
}

const pitchFigures = (id: string): Figure[] => {
  const card = PITCH_CARDS.find((c) => c.id === id)!;
  return [card.title, ...card.lines].map((text) => ({ testId: `pitch-card-${id}`, text }));
};

const pitchBeat = (id: string, cardId: string, start: number): Beat => ({
  id,
  start,
  end: start + 20000,
  camera: "pitch",
  process: null,
  drawer: null,
  onScreen: { stage: [`pitch-card-${cardId}`] },
  slots: {},
  figures: pitchFigures(cardId),
});

export const BEATS: Beat[] = [
  pitchBeat("p01-what", "what", 0),
  pitchBeat("p02-why", "why", 20000),
  pitchBeat("p03-how", "how", 40000),
  {
    id: "d01-vibe",
    start: 60000,
    end: 74000,
    camera: "shop-search",
    process: "search",
    drawer: null,
    // Plus search-chip-1 to search-chip-n, one per keyword of qry_01, added by the harness from the timeline.
    onScreen: {
      search: ["search-input", "search-results", "search-result-pc_01", "search-engine"],
      process: ["process-search-map"],
    },
    slots: { search: "shop.search.main", process: "process.view" },
    figures: [{ testId: "search-result-pc_01", text: "$180.00" }],
  },
  {
    id: "d03-piece",
    start: 74000,
    end: 86000,
    camera: "shop-piece",
    process: null,
    drawer: null,
    onScreen: { buyer: ["buyer-story-card", "buyer-verification", "buyer-split-bar", "buyer-split-maker-share", "buyer-split-compare"] },
    slots: { buyer: "shop.piece.main" },
    // Plus buyer-split-compare's gallery share, from the timeline's split.shown.
    figures: [
      { testId: "buyer-story-card", text: "Grace N." },
      { testId: "buyer-story-card", text: "26 hours" },
      { testId: "buyer-split-maker-share", text: "$134.48" },
      { testId: "buyer-split-bar", text: "$22.00" },
      { testId: "buyer-split-bar", text: "$18.00" },
      { testId: "buyer-split-bar", text: "$5.52" },
    ],
  },
  {
    id: "d04-support",
    start: 86000,
    end: 104000,
    camera: "shop-piece",
    process: "swarm",
    drawer: "support",
    // Plus process-swarm-step-<stepId> for run_01's check step, from the timeline.
    onScreen: { support: ["support-drawer", "support-reply", "support-agent"], process: ["process-swarm-graph"] },
    slots: { support: "shop.drawer.support", process: "process.view" },
    figures: [],
  },
  {
    id: "d05-pay",
    start: 104000,
    end: 120000,
    camera: "shop-piece",
    process: "checkout",
    drawer: null,
    onScreen: { buyer: ["buyer-pay-button", "buyer-project-addon", "buyer-token", "buyer-receipt-status", "buyer-receipt-promise"] },
    slots: { buyer: "shop.piece.main", process: "process.view" },
    figures: [
      { testId: "buyer-token", text: "tok_7Q2M9X4KD1PA" },
      { testId: "buyer-receipt-status", text: "Received" },
      { testId: "buyer-project-addon", text: "$5.00" },
      { testId: "buyer-receipt-promise", text: "Grace N." },
    ],
    transient: { "buyer-pay-button": "the buyer flow swaps Pay for the receipt once the order is placed (v1's rule)" },
  },
  {
    id: "d15-listing",
    start: 120000,
    end: 130000,
    camera: "sell-listings",
    process: "data",
    drawer: null,
    // Plus seller-listing-check-<checkId> for each check in the tour's listing.drafted, from the timeline.
    onScreen: { "seller-hub": ["seller-listing-notes", "seller-listing-draft", "seller-listing-indexed"], process: ["process-data-tables"] },
    slots: { "seller-hub": "studio.listings.main", process: "process.view" },
    figures: [],
  },
  {
    id: "d06-money",
    start: 130000,
    end: 136000,
    camera: "sell-map",
    process: null,
    drawer: null,
    onScreen: { "money-map": ["money-map-canvas", "money-map-thread-mv_0001", "money-map-thread-mv_0003", "money-map-balance"] },
    slots: { "money-map": "studio.map.main" },
    figures: [
      { testId: "money-map-canvas", text: "$180.00" },
      { testId: "money-map-canvas", text: "$5.52" },
      { testId: "money-map-canvas", text: "$156.48" },
      // The balance figure is checked against the store's account.synced in the harness.
    ],
  },
  {
    id: "d07-month",
    start: 136000,
    end: 146000,
    camera: "sell-month",
    process: "reconcile",
    drawer: null,
    // Plus reconcile-match-<matchId> for every match.made in the beat, added by the harness from the
    // timeline. The kinds in SHOWN_MATCH_KINDS must be in frame; one-to-one rows may scroll out.
    onScreen: { reconcile: ["reconcile-timeline"] },
    slots: { reconcile: "studio.month.main", process: "process.view" },
    figures: [],
  },
  {
    id: "d08-catch",
    start: 146000,
    end: 154000,
    camera: "sell-catch",
    process: null,
    drawer: null,
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
    id: "d09-approve",
    start: 154000,
    end: 161000,
    camera: "sell-approvals",
    process: "approvals",
    drawer: null,
    onScreen: { approvals: ["approvals-item-apr_01", "approvals-item-apr_02", "approvals-seal-apr_01", "approvals-seal-apr_02"] },
    slots: { approvals: "owner.main", process: "process.view" },
    figures: [
      { testId: "approvals-item-apr_01", text: "$340.00" },
      { testId: "approvals-item-apr_02", text: "$340.00" },
    ],
  },
  {
    id: "d10-close",
    start: 161000,
    end: 166000,
    camera: "sell-close",
    process: null,
    drawer: null,
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
    id: "d11-maker",
    start: 166000,
    end: 172000,
    camera: "maker",
    process: null,
    drawer: null,
    onScreen: { "maker-statement": ["maker-statement-total", "maker-statement-lines", "maker-statement-held"] },
    slots: { "maker-statement": "maker.main" },
    figures: [
      { testId: "maker-statement-total", text: "This month's income" },
      { testId: "maker-statement-lines", text: "$134.48" },
      { testId: "maker-statement-held", text: "$95.00" },
    ],
  },
  {
    id: "d12-receipt",
    start: 172000,
    end: 180000,
    camera: "shop-receipt",
    process: null,
    drawer: null,
    onScreen: { buyer: ["buyer-receipt", "buyer-receipt-status", "buyer-receipt-maker-note"] },
    slots: { buyer: "shop.receipt.main" },
    figures: [
      { testId: "buyer-receipt-status", text: "Paid to the maker" },
      { testId: "buyer-receipt", text: "$134.48" },
      { testId: "buyer-receipt", text: "Oct 2, 2026" },
      { testId: "buyer-receipt-maker-note", text: "Grace N." },
    ],
  },
  {
    id: "d02-surprise",
    start: 180000,
    end: 186000,
    camera: "shop-search",
    process: null,
    drawer: null,
    // Plus search-surprise-result's piece title, from the timeline's surprise.drawn.
    onScreen: { search: ["search-surprise", "search-surprise-result", "search-surprise-rule"] },
    slots: { search: "shop.search.main" },
    figures: [],
  },
  {
    id: "d13-proof",
    start: 186000,
    end: 192000,
    camera: "sell-proof",
    process: "model",
    drawer: null,
    // Plus search-proof's four systems or "Not trained yet", from the timeline's proof.search_scored.
    onScreen: { proof: ["proof-score"], search: ["search-proof"], process: ["process-model-card"] },
    slots: { proof: "studio.proof.main", search: "studio.proof.side", process: "process.view" },
    figures: [{ testId: "proof-score", text: "4 of 4" }],
  },
  {
    id: "d14-watch",
    start: 192000,
    end: 200000,
    camera: "sell-watch",
    process: null,
    drawer: null,
    // Plus watch-similarity-cft_01's number, from the timeline's counterfeit.flagged cft_01.
    onScreen: { watch: ["watch-results", "watch-item-cft_01", "watch-similarity-cft_01"] },
    slots: { watch: "studio.watch.main" },
    figures: [{ testId: "watch-similarity-cft_01", text: "Text match" }],
  },
  {
    id: "d16-store",
    start: 200000,
    end: 205000,
    camera: "store",
    process: null,
    drawer: null,
    onScreen: { storefront: ["store-page"] },
    slots: { storefront: "store.main" },
    figures: [],
  },
  {
    id: "d17-ask-maker",
    start: 205000,
    end: 220000,
    camera: "shop-piece",
    process: null,
    drawer: "support",
    // Plus support-maker-answer-qst_01's words, from the timeline's question.answered.
    onScreen: { support: ["support-forwarded-qst_01", "support-maker-answer-qst_01"] },
    slots: { support: "shop.drawer.support" },
    figures: [],
    transient: {
      "support-forwarded-qst_01":
        "the notice shows from 211.9 s; once run_09 answers at 216.7 s the thread scrolls to the newest reply, so the notice may scroll up out of the drawer",
    },
  },
];

/**
 * The match kinds d07's Figures name (the bundled payout, the refund netted, the orders carried to
 * Oct 2). Their reconcile-match rows must be in frame at the end of d07-month.
 */
export const SHOWN_MATCH_KINDS: readonly string[] = ["bundled", "refund_netted", "carried_over"];

/** The frame each tour camera shows (ui-contract.md, Camera states). pitch shows none. */
export const TOUR_CAMERA_FRAME: Record<TourCameraId, FrameId | null> = {
  pitch: null,
  "shop-home": "frame-buyer",
  "shop-search": "frame-buyer",
  "shop-piece": "frame-buyer",
  "shop-receipt": "frame-buyer",
  "sell-map": "frame-studio",
  "sell-month": "frame-studio",
  "sell-catch": "frame-studio",
  "sell-approvals": "frame-studio",
  "sell-close": "frame-studio",
  "sell-proof": "frame-studio",
  "sell-watch": "frame-studio",
  "sell-listings": "frame-studio",
  "sell-storefront": "frame-studio",
  maker: "frame-maker",
  store: "frame-store",
};

/** sell-catch zooms frame-studio 1.35 (ui-contract.md). */
export const CATCH_SCALE = 1.35;
/** A frame under a process view shows at 0.66 in the left two thirds, the panel in the right third. */
export const PROCESS_SCALE = 0.66;

/**
 * The frame a camera shows, with its scale: 1, sell-catch 1.35, and 0.66 under a process. Every
 * other frame is hidden. pitch shows none.
 */
export function cameraFrames(camera: CameraId, process: string | null = null): Partial<Record<FrameId, number>> {
  const frame = TOUR_CAMERA_FRAME[camera];
  if (!frame) return {};
  return { [frame]: process ? PROCESS_SCALE : camera === "sell-catch" ? CATCH_SCALE : 1 };
}

/** The frame a camera shows, or null. */
export function shownFrame(camera: CameraId): FrameId | null {
  return TOUR_CAMERA_FRAME[camera];
}

/** The Sell view each tour camera puts up (ui-contract.md, Camera states). */
export const CAMERA_VIEW: Partial<Record<TourCameraId, string>> = {
  "sell-map": "map",
  "sell-month": "month",
  "sell-catch": "month",
  "sell-approvals": "approvals",
  "sell-close": "close",
  "sell-proof": "proof",
  "sell-watch": "watch",
  "sell-listings": "listings",
  "sell-storefront": "storefront",
};

/** The Sell view a camera puts up, or null when frame-studio isn't shown. */
export function cameraView(camera: CameraId): string | null {
  return CAMERA_VIEW[camera] ?? null;
}

export interface AllowedFallback {
  types: readonly string[];
  why: string;
  /**
   * The tour plays this key's events scripted (fix-plan 1.4): its adapter answers each keyed tour
   * event with [] at once, so the key passes when its adapter was healthy at the start and every
   * fallback was an allowed "returned nothing". It doesn't have to go live during the tour, because
   * its G5 proves live mode with a person's own request.
   */
  tourScripted?: boolean;
}

/**
 * Event types a live source may return nothing for during the tour, so the scripted event plays,
 * by source key, with why. v1's keys keep v1's rule: a key listed here passes when it went live at
 * least once and its only fallbacks were "returned nothing" for these types. A tourScripted key
 * passes without going live. A throw, a timeout, nothing returned for any other type, or going
 * back to scripted for any other reason still fails.
 */
export const ALLOWED_EMPTY_FALLBACKS: Record<string, AllowedFallback> = {
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
  "b11-embed": {
    types: ["search.mapped", "model.trained", "proof.search_scored"],
    why: "fix-plan 1.4: the tour stays scripted, so B11's adapter answers d01-vibe's model events and its map with [] at once; G5 b11-embed proves live search on a person's own query",
    tourScripted: true,
  },
  "b12-search": {
    types: ["search.answered", "surprise.drawn"],
    why: "fix-plan 1.4 and B2-11: d01-vibe's answer and d02-surprise's draw play scripted; G5 b12-search proves a person's own search and draw",
    tourScripted: true,
  },
  "b13-live": {
    types: ["data.synced"],
    why: "fix-plan 1.4: d15-listing's data.synced is the one tour event keyed b13-live, and the adapter answers it with [] at once, so the scripted snapshot plays on time",
    tourScripted: true,
  },
  "b14-swarm": {
    types: ["swarm.step", "support.answered", "listing.drafted", "listing.indexed", "question.forwarded", "question.answered"],
    why: "fix-plan 1.4: run_01, run_02, run_07 and run_09 and their results play scripted in the tour; G5 b14-swarm proves a person's own question",
    tourScripted: true,
  },
  "b15-watch": {
    types: ["watch.scanned", "counterfeit.flagged", "followup.drafted"],
    why: "fix-plan 1.4: d14-watch's scan, its hit and fup_02 play scripted; G5 b15-watch proves a person's own scan",
    tourScripted: true,
  },
};

/** The five keys /api/health reports (docs/common/api-contract.md, Health). */
export type HealthKey = "anthropic" | "nessie" | "elastic" | "apify" | "hf";
/** The two services /api/health reports. */
export type HealthService = "spacetime" | "model";

/**
 * The server key each live source needs before its adapter can turn healthy, named as in
 * /api/health's `keys` (docs/plans/B02-explain.md, B04-bank.md, B07-ask.md, B09-concierge.md,
 * B14-swarm.md, B15-watch.md, B16-bank-books.md). Sources not listed need no key. In live mode the
 * harness doesn't wait for an adapter whose key /api/health reports missing, since it can never
 * turn healthy.
 */
export const REQUIRED_KEYS: Partial<Record<string, HealthKey>> = {
  "b02-explain": "anthropic",
  "b04-bank": "nessie",
  "b07-ask": "anthropic",
  "b09-concierge": "anthropic",
  "b14-swarm": "anthropic",
  "b15-watch": "apify",
  "b16-bank-books": "nessie",
};

/**
 * The service each live source needs, named as in /api/health's `services`: the trained model for
 * B11 and B12, SpacetimeDB for B13. B15 has no entry, because it doesn't wait on the model. The
 * harness doesn't wait for an adapter whose service is down, and G5 for that upgrade fails naming it.
 */
export const REQUIRED_SERVICES: Partial<Record<string, HealthService>> = {
  "b11-embed": "model",
  "b12-search": "model",
  "b13-live": "spacetime",
};

/** The four desktop frames, all mounted on the stage. */
export const FRAME_IDS: FrameId[] = ["frame-buyer", "frame-studio", "frame-maker", "frame-store"];
/** Every frame is a kit PageFrame, PAGE_WIDTH wide. */
export const NATIVE_WIDTH: Record<FrameId, number> = { "frame-buyer": PAGE_WIDTH, "frame-studio": PAGE_WIDTH, "frame-maker": PAGE_WIDTH, "frame-store": PAGE_WIDTH };
/** The stage is the kit's page, PAGE_WIDTH by PAGE_HEIGHT. */
export const STAGE_WIDTH = PAGE_WIDTH;
export const STAGE_HEIGHT = PAGE_HEIGHT;

/** The feature folders a cut migration's row covers (B1-24). */
const MIGRATION_SLUGS: Record<string, string[]> = {
  "M-buyer": ["buyer"],
  "M-approvals": ["approvals"],
  "M-maker-statement": ["maker-statement"],
  "M-desktop": ["money-map", "reconcile", "scenario", "close", "impact", "proof", "dashboard", "ask-cindy", "audit"],
};

/**
 * Feature slugs whose state is CUT in the Features tables of docs/harness/status.md: an F- row's
 * own slug, and an M- row's slugs (MIGRATION_SLUGS). A cut migration's v1 version may still fill
 * its slot, so a beat accepts the slot filled or its placeholder, and the report lists it as cut.
 */
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
    // | F-<slug> | wave | state | ...  or  | M-<slug> | wave | state | ...
    if (cells.length <= 4 || cells[3].toUpperCase() !== "CUT") continue;
    if (/^F-[a-z0-9-]+$/.test(cells[1])) out.add(cells[1].slice(2));
    else if (/^M-[a-z0-9-]+$/.test(cells[1])) for (const slug of MIGRATION_SLUGS[cells[1]] ?? [cells[1].slice(2)]) out.add(slug);
  }
  return out;
}

/** Slugs whose cut means the slot may still be filled by the migration's v1 version. */
export function cutMigrationSlugs(root = process.env.CINDIA_ROOT ?? process.cwd()): Set<string> {
  const out = new Set<string>();
  let text = "";
  try {
    text = fs.readFileSync(path.join(root, "docs", "harness", "status.md"), "utf8");
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length > 4 && /^M-[a-z0-9-]+$/.test(cells[1]) && cells[3].toUpperCase() === "CUT") for (const slug of MIGRATION_SLUGS[cells[1]] ?? []) out.add(slug);
  }
  return out;
}
