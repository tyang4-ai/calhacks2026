// The camera states from ui-contract.md as poses: where each frame sits on the 1600 by 900 stage,
// at what scale and opacity. Pure functions, so the stage and the unit test share them.
import type { CameraId, StudioView, SurfaceId } from "../../core/featureTypes";
import { CONSOLE_HEIGHT, CONSOLE_WIDTH } from "../../ui/ConsoleFrame";
import { PHONE_HEIGHT, PHONE_WIDTH } from "../../ui/PhoneFrame";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../stageScale";
import { CAMERA_VIEW } from "../surfaces/views";

/** One frame's pose: its center on the stage, its scale and its opacity. */
export interface Pose {
  cx: number;
  cy: number;
  scale: number;
  opacity: number;
}

export type CameraPose = Record<SurfaceId, Pose>;

/** A point inside the studio frame, in its own unscaled pixels, for studio-catch to zoom to. */
export interface Focus {
  x: number;
  y: number;
}

export const MOVE_MS = 600;
export const SURFACES: readonly SurfaceId[] = ["studio", "buyer", "owner", "maker"];
export const FRAME_SIZE: Record<SurfaceId, { w: number; h: number }> = {
  buyer: { w: PHONE_WIDTH, h: PHONE_HEIGHT },
  studio: { w: CONSOLE_WIDTH, h: CONSOLE_HEIGHT },
  owner: { w: PHONE_WIDTH, h: PHONE_HEIGHT },
  maker: { w: PHONE_WIDTH, h: PHONE_HEIGHT },
};

/** How strongly the studio is dimmed behind the maker phone. */
export const DIMMED = 0.35;
export const CATCH_SCALE = 1.35;
const GAP = 48;
const MID_X = STAGE_WIDTH / 2;
const MID_Y = STAGE_HEIGHT / 2;

const at = (cx: number, scale: number, opacity = 1, cy = MID_Y): Pose => ({ cx, cy, scale, opacity });
const hidden = (p: Pose): Pose => ({ ...p, opacity: 0 });

/** Two frames side by side, centered as a pair. Returns the two centers. */
function pair(leftW: number, rightW: number): [number, number] {
  const total = leftW + GAP + rightW;
  const left = (STAGE_WIDTH - total) / 2;
  return [left + leftW / 2, left + leftW + GAP + rightW / 2];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** studio-catch: the studio at 1.35 with the focus point at the stage center, kept filling the stage. */
export function catchPose(focus: Focus | null): Pose {
  const w = CONSOLE_WIDTH * CATCH_SCALE;
  const h = CONSOLE_HEIGHT * CATCH_SCALE;
  if (!focus) return at(MID_X, CATCH_SCALE);
  const left = clamp(MID_X - focus.x * CATCH_SCALE, STAGE_WIDTH - w, 0);
  const top = clamp(MID_Y - focus.y * CATCH_SCALE, STAGE_HEIGHT - h, 0);
  return { cx: left + w / 2, cy: top + h / 2, scale: CATCH_SCALE, opacity: 1 };
}

/** Every frame's pose for a camera. Hidden frames keep a nearby place at opacity 0, so moves read well. */
export function cameraPose(camera: CameraId, focus: Focus | null = null): CameraPose {
  const studioCenter = at(MID_X, 1);
  const buyerCenter = at(MID_X, 1);
  const [bsBuyer, bsStudio] = pair(PHONE_WIDTH * 0.9, CONSOLE_WIDTH * 0.85);
  const [soStudio, soOwner] = pair(CONSOLE_WIDTH * 0.9, PHONE_WIDTH * 0.8);
  const ownerOff = hidden(at(soOwner, 0.8));
  const makerOff = hidden(at(MID_X, 0.9));
  switch (camera) {
    case "buyer":
    case "receipt":
      return { buyer: buyerCenter, studio: hidden(at(bsStudio, 0.85)), owner: ownerOff, maker: makerOff };
    case "buyer-studio":
      return { buyer: at(bsBuyer, 0.9), studio: at(bsStudio, 0.85), owner: ownerOff, maker: makerOff };
    case "studio-month":
    case "studio-close":
      return { buyer: hidden(at(bsBuyer, 0.9)), studio: studioCenter, owner: ownerOff, maker: makerOff };
    case "studio-catch":
      return { buyer: hidden(at(bsBuyer, 0.9)), studio: catchPose(focus), owner: ownerOff, maker: makerOff };
    case "studio-owner":
      return { buyer: hidden(at(bsBuyer, 0.9)), studio: at(soStudio, 0.9), owner: at(soOwner, 0.8), maker: makerOff };
    case "maker":
      return { buyer: hidden(buyerCenter), studio: at(MID_X, 0.85, DIMMED), owner: ownerOff, maker: at(MID_X, 1) };
  }
}

/** The frames a camera shows (opacity above 0). */
export function visibleSurfaces(camera: CameraId): SurfaceId[] {
  const pose = cameraPose(camera);
  return SURFACES.filter((s) => pose[s].opacity > 0);
}

/** The studio view a camera puts up, or null when the studio isn't shown. */
export function cameraView(camera: CameraId): StudioView | null {
  return CAMERA_VIEW[camera];
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
  for (const s of SURFACES) {
    const a = from[s];
    const b = to[s];
    out[s] = { cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), scale: lerp(a.scale, b.scale, t), opacity: lerp(a.opacity, b.opacity, t) };
  }
  return out;
}

export function samePose(a: CameraPose, b: CameraPose): boolean {
  return SURFACES.every(
    (s) =>
      Math.abs(a[s].cx - b[s].cx) < 0.5 &&
      Math.abs(a[s].cy - b[s].cy) < 0.5 &&
      Math.abs(a[s].scale - b[s].scale) < 0.001 &&
      Math.abs(a[s].opacity - b[s].opacity) < 0.001,
  );
}

/** A pose as the CSS transform for a frame placed at the stage's top left with transform-origin 0 0. */
export function poseTransform(surface: SurfaceId, p: Pose): string {
  const { w, h } = FRAME_SIZE[surface];
  const x = p.cx - (w * p.scale) / 2;
  const y = p.cy - (h * p.scale) / 2;
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${p.scale.toFixed(4)})`;
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
