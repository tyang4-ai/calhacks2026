import { describe, expect, it } from "vitest";
import { LEGACY_CAMERA_IDS } from "../../core/featureTypes";
import { CATCH_SCALE, cameraPose, catchPose, createCameraMotion, FRAME_SIZE, MOVE_MS, SURFACES, visibleSurfaces } from "./cameras";

const fits = (cx: number, cy: number, w: number, h: number) => cx - w / 2 >= -0.5 && cx + w / 2 <= 1600.5 && cy - h / 2 >= -0.5 && cy + h / 2 <= 900.5;

describe("camera poses", () => {
  it("shows the frames ui-contract.md lists for each camera", () => {
    expect(visibleSurfaces("buyer")).toEqual(["buyer"]);
    expect(visibleSurfaces("buyer-studio").toSorted()).toEqual(["buyer", "studio"]);
    expect(visibleSurfaces("studio-month")).toEqual(["studio"]);
    expect(visibleSurfaces("studio-catch")).toEqual(["studio"]);
    expect(visibleSurfaces("studio-owner").toSorted()).toEqual(["owner", "studio"]);
    expect(visibleSurfaces("studio-close")).toEqual(["studio"]);
    expect(visibleSurfaces("maker").toSorted()).toEqual(["maker", "studio"]);
    expect(visibleSurfaces("receipt")).toEqual(["buyer"]);
  });

  it("uses the contract's scales", () => {
    expect(cameraPose("buyer-studio").buyer.scale).toBe(0.9);
    expect(cameraPose("buyer-studio").studio.scale).toBe(0.85);
    expect(cameraPose("studio-owner").studio.scale).toBe(0.9);
    expect(cameraPose("studio-owner").owner.scale).toBe(0.8);
    expect(cameraPose("studio-catch").studio.scale).toBe(CATCH_SCALE);
    expect(cameraPose("maker").studio.scale).toBe(0.85);
    expect(cameraPose("maker").studio.opacity).toBeLessThan(1);
  });

  it("keeps every visible frame inside the stage, except the zoomed studio", () => {
    for (const cam of LEGACY_CAMERA_IDS) {
      if (cam === "studio-catch") continue;
      const pose = cameraPose(cam);
      for (const s of SURFACES) {
        if (pose[s].opacity === 0) continue;
        const { w, h } = FRAME_SIZE[s];
        expect(fits(pose[s].cx, pose[s].cy, w * pose[s].scale, h * pose[s].scale), `${cam} ${s}`).toBe(true);
      }
    }
  });

  it("zooms studio-catch to the focus, keeping the zoomed studio over the whole stage", () => {
    expect(catchPose(null)).toMatchObject({ cx: 800, cy: 450 });
    const p = catchPose({ x: 640, y: 380 });
    const w = 1280 * CATCH_SCALE;
    const h = 800 * CATCH_SCALE;
    const left = p.cx - w / 2;
    const top = p.cy - h / 2;
    expect(left).toBeLessThanOrEqual(0);
    expect(left + w).toBeGreaterThanOrEqual(1600);
    expect(top).toBeLessThanOrEqual(0);
    expect(top + h).toBeGreaterThanOrEqual(900);
    // The focus point lands at the center when it can.
    expect(left + 640 * CATCH_SCALE).toBeCloseTo(800, 0);
  });

  it("aligns studio-catch to the view area's corner when the focus box fits, and centers otherwise", () => {
    const corner = { x: 89, y: 57 };
    const p = catchPose({ x: 484, y: 384, box: { top: 147, left: 135, bottom: 620, right: 833 }, corner });
    expect(p.cx - (1280 * CATCH_SCALE) / 2).toBeCloseTo(-corner.x * CATCH_SCALE, 5);
    expect(p.cy - (800 * CATCH_SCALE) / 2).toBeCloseTo(-corner.y * CATCH_SCALE, 5);
    const tall = catchPose({ x: 484, y: 500, box: { top: 147, left: 135, bottom: 760, right: 833 }, corner });
    expect(tall.cy - (800 * CATCH_SCALE) / 2).not.toBeCloseTo(-corner.y * CATCH_SCALE, 0);
  });
});

const opts = (epoch: number, playing = true, reduced = false) => ({ epoch, playing, reduced });

describe("camera motion", () => {
  it("moves over 600 ms on the player clock while playing", () => {
    const m = createCameraMotion();
    m.update(cameraPose("buyer"), 0, opts(1));
    const mid = m.update(cameraPose("buyer-studio"), 15000, opts(1));
    expect(mid.buyer.scale).toBe(1);
    const half = m.update(cameraPose("buyer-studio"), 15000 + MOVE_MS / 2, opts(1));
    expect(half.buyer.scale).toBeGreaterThan(0.9);
    expect(half.buyer.scale).toBeLessThan(1);
    const done = m.update(cameraPose("buyer-studio"), 15000 + MOVE_MS, opts(1));
    expect(done.buyer.scale).toBeCloseTo(0.9, 5);
  });

  it("jumps after a seek, while paused and under reduced motion", () => {
    const m = createCameraMotion();
    m.update(cameraPose("buyer"), 0, opts(1));
    expect(m.update(cameraPose("studio-close"), 43000, opts(2)).studio.opacity).toBe(1);
    expect(m.update(cameraPose("maker"), 47000, opts(2, false)).maker.opacity).toBe(1);
    expect(m.update(cameraPose("receipt"), 50000, opts(2, true, true)).buyer.opacity).toBe(1);
  });
});
