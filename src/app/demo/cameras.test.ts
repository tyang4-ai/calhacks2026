import { describe, expect, it } from "vitest";
import { TOUR_CAMERA_IDS } from "../../core/featureTypes";
import {
  CATCH_SCALE,
  INITIAL_PAGES,
  MOVE_MS,
  PANEL_X,
  PROCESS_SCALE,
  cameraFrame,
  cameraPose,
  cameraSellView,
  cameraShopPage,
  catchPose,
  createCameraMotion,
  nextPages,
  stageSearchParams,
  visibleFrames,
} from "./cameras";

const W = 1440;
const H = 900;

describe("camera poses", () => {
  it("shows exactly one frame at scale 1 for every tour camera but pitch, which shows the pitch card alone", () => {
    for (const cam of TOUR_CAMERA_IDS) {
      const frames = visibleFrames(cam);
      if (cam === "pitch") {
        expect(frames, cam).toEqual([]);
        expect(cameraPose(cam).pitch.opacity, cam).toBe(1);
        continue;
      }
      expect(cameraPose(cam).pitch.opacity, cam).toBe(0);
      expect(cameraPose(cam).panel.opacity, cam).toBe(0);
      expect(frames, cam).toHaveLength(1);
      const p = cameraPose(cam)[frames[0]];
      if (cam !== "sell-catch") expect(p, cam).toEqual({ x: 0, y: 0, scale: 1, opacity: 1 });
    }
  });

  it("puts each camera on the frame ui-contract.md names", () => {
    expect(cameraFrame("shop-home")).toBe("buyer");
    expect(cameraFrame("shop-search")).toBe("buyer");
    expect(cameraFrame("shop-piece")).toBe("buyer");
    expect(cameraFrame("shop-receipt")).toBe("buyer");
    for (const cam of ["sell-map", "sell-month", "sell-catch", "sell-approvals", "sell-close", "sell-proof", "sell-watch", "sell-listings", "sell-storefront"] as const)
      expect(cameraFrame(cam), cam).toBe("studio");
    expect(cameraFrame("maker")).toBe("maker");
    expect(cameraFrame("store")).toBe("store");
    expect(cameraFrame("pitch")).toBeNull();
  });

  it("puts a frame under a process at 0.66 in the left two thirds, with the panel in the right third", () => {
    for (const cam of TOUR_CAMERA_IDS) {
      if (cam === "pitch") continue;
      const pose = cameraPose(cam, null, true);
      const f = cameraFrame(cam)!;
      expect(pose[f].scale, cam).toBe(PROCESS_SCALE);
      expect(pose[f].x, cam).toBeGreaterThanOrEqual(0);
      expect(pose[f].x + W * PROCESS_SCALE, cam).toBeLessThanOrEqual(PANEL_X);
      expect(pose[f].y + H * PROCESS_SCALE, cam).toBeLessThanOrEqual(H);
      expect(pose.panel, cam).toEqual({ x: W - W / 3, y: 0, scale: 1, opacity: 1 });
      expect(visibleFrames(cam), cam).toEqual([f]);
    }
  });

  it("zooms sell-catch 1.35, keeping the zoomed frame over the whole stage", () => {
    expect(cameraPose("sell-catch").studio.scale).toBe(CATCH_SCALE);
    const centered = catchPose(null);
    expect(centered.x).toBeCloseTo((W - W * CATCH_SCALE) / 2, 5);
    const p = catchPose({ x: 600, y: 420 });
    expect(p.x).toBeLessThanOrEqual(0);
    expect(p.x + W * CATCH_SCALE).toBeGreaterThanOrEqual(W);
    expect(p.y).toBeLessThanOrEqual(0);
    expect(p.y + H * CATCH_SCALE).toBeGreaterThanOrEqual(H);
    // The focus point lands at the center when it can.
    expect(p.x + 600 * CATCH_SCALE).toBeCloseTo(W / 2, 0);
  });

  it("aligns sell-catch to the content corner when the focus box fits, and centers otherwise", () => {
    const corner = { x: 246, y: 184 };
    const p = catchPose({ x: 620, y: 495, box: { top: 270, left: 290, bottom: 719, right: 953 }, corner });
    expect(p.x).toBeCloseTo(-corner.x * CATCH_SCALE, 5);
    expect(p.y).toBeCloseTo(-corner.y * CATCH_SCALE, 5);
    const tall = catchPose({ x: 620, y: 600, box: { top: 270, left: 290, bottom: 880, right: 953 }, corner });
    expect(tall.y).not.toBeCloseTo(-corner.y * CATCH_SCALE, 0);
  });
});

describe("stage pages", () => {
  it("gives each camera its page, and keeps a hidden frame's page", () => {
    expect(INITIAL_PAGES).toEqual({ shop: "home", sell: "map" });
    expect(cameraShopPage("shop-home")).toBe("home");
    expect(cameraShopPage("shop-receipt")).toBe("receipt");
    expect(cameraShopPage("sell-map")).toBeNull();
    expect(cameraShopPage("pitch")).toBeNull();
    expect(cameraSellView("sell-catch")).toBe("month");
    expect(cameraSellView("sell-approvals")).toBe("approvals");
    expect(cameraSellView("sell-listings")).toBe("listings");
    expect(cameraSellView("shop-home")).toBeNull();
    let pages = nextPages(INITIAL_PAGES, "sell-close");
    expect(pages).toEqual({ shop: "home", sell: "close" });
    pages = nextPages(pages, "maker");
    expect(pages).toEqual({ shop: "home", sell: "close" });
    pages = nextPages(pages, "shop-search");
    expect(pages).toEqual({ shop: "search", sell: "close" });
    // An unchanged page keeps its object.
    expect(nextPages(pages, "store")).toBe(pages);
    expect(nextPages(pages, "pitch")).toBe(pages);
  });

  it("gives the search page no q, or the latest query's own text and keywords", () => {
    expect(stageSearchParams(null)).toEqual({ k: [] });
    expect(stageSearchParams({ text: "warm red wool for mom", keywords: ["red", "wool"] })).toEqual({ q: "warm red wool for mom", k: ["red", "wool"] });
  });
});

const opts = (epoch: number, playing = true, reduced = false) => ({ epoch, playing, reduced });

describe("camera motion", () => {
  it("moves over 600 ms on the player clock while playing", () => {
    const m = createCameraMotion();
    m.update(cameraPose("shop-receipt"), 0, opts(1));
    const start = m.update(cameraPose("sell-map"), 15000, opts(1));
    expect(start.buyer.opacity).toBe(1);
    const half = m.update(cameraPose("sell-map"), 15000 + MOVE_MS / 2, opts(1));
    expect(half.buyer.opacity).toBeGreaterThan(0);
    expect(half.buyer.opacity).toBeLessThan(1);
    const done = m.update(cameraPose("sell-map"), 15000 + MOVE_MS, opts(1));
    expect(done.buyer.opacity).toBeCloseTo(0, 5);
    expect(done.studio.opacity).toBeCloseTo(1, 5);
  });

  it("splits for a process view over 600 ms, like a camera move", () => {
    const m = createCameraMotion();
    m.update(cameraPose("shop-piece"), 0, opts(1));
    const half = m.update(cameraPose("shop-piece", null, true), 1000 + MOVE_MS / 2, opts(1));
    expect(half.buyer.scale).toBe(1);
    const mid = m.update(cameraPose("shop-piece", null, true), 1000 + MOVE_MS, opts(1));
    expect(mid.buyer.scale).toBeLessThan(1);
    expect(mid.buyer.scale).toBeGreaterThan(PROCESS_SCALE);
    const done = m.update(cameraPose("shop-piece", null, true), 1000 + MOVE_MS / 2 + MOVE_MS, opts(1));
    expect(done.buyer.scale).toBeCloseTo(PROCESS_SCALE, 5);
    expect(done.panel.opacity).toBeCloseTo(1, 5);
  });

  it("fades from the pitch card to the first frame", () => {
    const m = createCameraMotion();
    m.update(cameraPose("pitch"), 0, opts(1));
    m.update(cameraPose("shop-home"), 60000, opts(1));
    const done = m.update(cameraPose("shop-home"), 60000 + MOVE_MS, opts(1));
    expect(done.pitch.opacity).toBeCloseTo(0, 5);
    expect(done.buyer.opacity).toBeCloseTo(1, 5);
  });

  it("jumps after a seek, while paused and under reduced motion", () => {
    const m = createCameraMotion();
    m.update(cameraPose("shop-receipt"), 0, opts(1));
    expect(m.update(cameraPose("sell-close"), 43000, opts(2)).studio.opacity).toBe(1);
    expect(m.update(cameraPose("maker"), 47000, opts(2, false)).maker.opacity).toBe(1);
    expect(m.update(cameraPose("shop-receipt"), 50000, opts(2, true, true)).buyer.opacity).toBe(1);
  });
});
