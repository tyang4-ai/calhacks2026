// The camera states from ui-contract.md as poses on the 1440 by 900 stage, and the page each
// frame shows. Pure functions, so the stage and the unit test share them. The stage reads the
// camera from beat.started and maps it through toTourCamera() (the Phase A mapping in
// src/core/featureTypes.ts); it keeps no mapping of its own. Each tour camera but pitch shows
// exactly one frame at scale 1, the others at opacity 0. sell-catch zooms frame-studio 1.35 to the
// flag and its evidence.
import { LEGACY_CAMERA_IDS, type CameraId, type SellView, type TourCameraId } from "../../core/featureTypes";
import type { ShopPage } from "../slotProps";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../stageScale";

/** The four frames the stage keeps mounted. */
export type StageFrame = "buyer" | "studio" | "maker" | "store";

/** In stacking order, bottom first. */
export const STAGE_FRAMES: readonly StageFrame[] = ["studio", "buyer", "maker", "store"];

export const FRAME_TEST_IDS: Record<StageFrame, string> = {
  buyer: "frame-buyer",
  studio: "frame-studio",
  maker: "frame-maker",
  store: "frame-store",
};

/** One frame's pose: its top left on the stage, its scale (from its top left) and its opacity. */
export interface Pose {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export type CameraPose = Record<StageFrame, Pose>;

/** A box inside the studio frame, in its own unscaled pixels. */
export interface Box {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/**
 * A point inside the studio frame, in its own unscaled pixels, for sell-catch to zoom to. With
 * `box` (the flag, evidence and explanation) and `corner` (the top left of the view's content: the
 * legacy box in Phase A), the zoom aligns that corner to the stage's corner when the box fits.
 */
export interface Focus {
  x: number;
  y: number;
  box?: Box;
  corner?: { x: number; y: number };
}

export const MOVE_MS = 600;
export const CATCH_SCALE = 1.35;
/** Room kept between the focus box and the stage edge when the zoom aligns to the corner. */
const CATCH_MARGIN = 16;

/** The frame a tour camera shows, or null for pitch (I2-tour's pitch cards). */
export function cameraFrame(camera: TourCameraId): StageFrame | null {
  switch (camera) {
    case "pitch":
      return null;
    case "shop-home":
    case "shop-search":
    case "shop-piece":
    case "shop-receipt":
    case "shop-legacy":
      return "buyer";
    case "maker":
      return "maker";
    case "store":
      return "store";
    default:
      return "studio";
  }
}

/** True while the camera is one of v1's (the v1 timeline), or before the first beat. Then the stage uses the legacy boxes. */
export function isLegacyCamera(camera: CameraId | null): boolean {
  return camera === null || (LEGACY_CAMERA_IDS as readonly string[]).includes(camera);
}

const hidden: Pose = { x: 0, y: 0, scale: 1, opacity: 0 };
const shown: Pose = { x: 0, y: 0, scale: 1, opacity: 1 };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * sell-catch: frame-studio at 1.35. When the focus box fits, the content corner sits at the stage's
 * top left, so the crop falls on the box's edge instead of through it. Otherwise the focus point
 * goes to the stage center, with the zoomed frame still covering the whole stage.
 */
export function catchPose(focus: Focus | null): Pose {
  const w = STAGE_WIDTH * CATCH_SCALE;
  const h = STAGE_HEIGHT * CATCH_SCALE;
  if (!focus) return { x: (STAGE_WIDTH - w) / 2, y: (STAGE_HEIGHT - h) / 2, scale: CATCH_SCALE, opacity: 1 };
  if (focus.box && focus.corner) {
    const left = -focus.corner.x * CATCH_SCALE;
    const top = -focus.corner.y * CATCH_SCALE;
    const b = focus.box;
    const fits =
      left >= STAGE_WIDTH - w &&
      top >= STAGE_HEIGHT - h &&
      left + b.left * CATCH_SCALE >= CATCH_MARGIN &&
      top + b.top * CATCH_SCALE >= CATCH_MARGIN &&
      left + b.right * CATCH_SCALE <= STAGE_WIDTH - CATCH_MARGIN &&
      top + b.bottom * CATCH_SCALE <= STAGE_HEIGHT - CATCH_MARGIN;
    if (fits) return { x: left, y: top, scale: CATCH_SCALE, opacity: 1 };
  }
  const left = clamp(STAGE_WIDTH / 2 - focus.x * CATCH_SCALE, STAGE_WIDTH - w, 0);
  const top = clamp(STAGE_HEIGHT / 2 - focus.y * CATCH_SCALE, STAGE_HEIGHT - h, 0);
  return { x: left, y: top, scale: CATCH_SCALE, opacity: 1 };
}

/** Every frame's pose for a tour camera: its one frame shown at scale 1 (sell-catch zoomed), the rest hidden. */
export function cameraPose(camera: TourCameraId, focus: Focus | null = null): CameraPose {
  const out: CameraPose = { buyer: hidden, studio: hidden, maker: hidden, store: hidden };
  const frame = cameraFrame(camera);
  if (frame) out[frame] = camera === "sell-catch" ? catchPose(focus) : shown;
  return out;
}

/** The frames a camera shows (opacity above 0). */
export function visibleFrames(camera: TourCameraId): StageFrame[] {
  const pose = cameraPose(camera);
  return STAGE_FRAMES.filter((f) => pose[f].opacity > 0);
}

/** The Shop page a camera puts up, or null when it doesn't show frame-buyer. */
export function cameraShopPage(camera: TourCameraId): ShopPage | null {
  switch (camera) {
    case "shop-home":
      return "home";
    case "shop-search":
      return "search";
    case "shop-piece":
      return "piece";
    case "shop-receipt":
      return "receipt";
    case "shop-legacy":
      return "legacy";
    default:
      return null;
  }
}

const CAMERA_SELL_VIEW: Partial<Record<TourCameraId, SellView>> = {
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

/** The Sell view a camera puts up, or null when it doesn't show frame-studio. */
export function cameraSellView(camera: TourCameraId): SellView | null {
  return CAMERA_SELL_VIEW[camera] ?? null;
}

/** The page each frame shows. A camera that hides a frame leaves its page as it was. */
export interface StagePages {
  shop: ShopPage;
  sell: SellView;
}

/** Before the first beat the camera is buyer, shown as shop-legacy, and the Sell frame waits on the map. */
export const INITIAL_PAGES: StagePages = { shop: "legacy", sell: "map" };

/** The pages after a camera change. */
export function nextPages(prev: StagePages, camera: TourCameraId): StagePages {
  const shop = cameraShopPage(camera) ?? prev.shop;
  const sell = cameraSellView(camera) ?? prev.sell;
  return shop === prev.shop && sell === prev.sell ? prev : { shop, sell };
}

/** The maker and store pages the stage shows (ui-contract.md, Camera states). */
export const STAGE_MAKER_ID = "mkr_01";
export const STAGE_STORE_SLUG = "dine-weavers";
export const STAGE_ORDER_ID = "ord_001";

/**
 * shop.search.main's searchParams on the stage: no q, or only the latest query's own text with its
 * keywords, never any other text. F-search emits search.queried only for a q that differs from the
 * latest query's text, so it never emits one here.
 */
export function stageSearchParams(latest: { text: string; keywords: readonly string[] } | null): { q?: string; k: string[] } {
  return latest && latest.text ? { q: latest.text, k: [...latest.keywords] } : { k: [] };
}

/** Ease-in-out cubic, for camera moves. */
export function easeInOut(t: number): number {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** The pose a fraction t (already eased) of the way from one camera pose to another. */
export function mixPose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const out = {} as CameraPose;
  for (const f of STAGE_FRAMES) {
    const a = from[f];
    const b = to[f];
    out[f] = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), scale: lerp(a.scale, b.scale, t), opacity: lerp(a.opacity, b.opacity, t) };
  }
  return out;
}

export function samePose(a: CameraPose, b: CameraPose): boolean {
  return STAGE_FRAMES.every(
    (f) =>
      Math.abs(a[f].x - b[f].x) < 0.5 &&
      Math.abs(a[f].y - b[f].y) < 0.5 &&
      Math.abs(a[f].scale - b[f].scale) < 0.001 &&
      Math.abs(a[f].opacity - b[f].opacity) < 0.001,
  );
}

/** A pose as the CSS transform for a frame placed at the stage's top left with transform-origin 0 0. */
export function poseTransform(p: Pose): string {
  return `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) scale(${p.scale.toFixed(4)})`;
}

/**
 * Follows the camera on the player clock. Each update gives the target pose; a change while the
 * player plays starts a 600 ms move from wherever the frames are. A seek, a reset, a load (the
 * player's epoch changed), a paused player or reduced motion jumps straight to the target.
 */
export function createCameraMotion() {
  let from: CameraPose | null = null;
  let to: CameraPose | null = null;
  let startAt = 0;
  let epoch = -1;
  return {
    update(target: CameraPose, now: number, opts: { epoch: number; playing: boolean; reduced: boolean }): CameraPose {
      const jump = to === null || opts.epoch !== epoch || !opts.playing || opts.reduced || now < startAt;
      epoch = opts.epoch;
      if (jump) {
        from = target;
        to = target;
        startAt = now;
        return target;
      }
      const current = mixPose(from!, to!, easeInOut((now - startAt) / MOVE_MS));
      if (!samePose(target, to!)) {
        from = current;
        to = target;
        startAt = now;
        return current;
      }
      return current;
    },
  };
}
