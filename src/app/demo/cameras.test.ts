import { describe, expect, it } from "vitest";
import { LEGACY_CAMERA_IDS, TOUR_CAMERA_IDS, toTourCamera } from "../../core/featureTypes";
import {
  CATCH_SCALE,
  INITIAL_PAGES,
  MOVE_MS,
  cameraFrame,
  cameraPose,
  cameraSellView,
  cameraShopPage,
  catchPose,
  createCameraMotion,
  isLegacyCamera,
  nextPages,
  stageSearchParams,
  visibleFrames,
} from "./cameras";

const W = 1440;
const H = 900;

describe("camera poses", () => {
  it("shows exactly one frame at scale 1 for every tour camera but pitch", () => {
    for (const cam of TOUR_CAMERA_IDS) {
      const frames = visibleFrames(cam);
      if (cam === "pitch") {
        expect(frames, cam).toEqual([]);
        continue;
      }
      expect(frames, cam).toHaveLength(1);
      const p = cameraPose(cam)[frames[0]];
      if (cam !== "sell-catch") expect(p, cam).toEqual({ x: 0, y: 0, scale: 1, opacity: 1 });
    }
  });

  it("puts each camera on the frame ui-contract.md names", () => {
    expect(cameraFrame("shop-legacy")).toBe("buyer");
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

  it("shows v1's cameras through the Phase A mapping", () => {
    const shown = Object.fromEntries(LEGACY_CAMERA_IDS.map((c) => [c, visibleFrames(toTourCamera(c))]));
    expect(shown).toEqual({
      buyer: ["buyer"],
      receipt: ["buyer"],
      "buyer-studio": ["studio"],
      "studio-month": ["studio"],
      "studio-catch": ["studio"],
      "studio-owner": ["studio"],
      "studio-close": ["studio"],
      maker: ["maker"],
    });
    for (const c of LEGACY_CAMERA_IDS) expect(isLegacyCamera(c), c).toBe(true);
    expect(isLegacyCamera(null)).toBe(true);
    expect(isLegacyCamera("sell-month")).toBe(false);
    expect(isLegacyCamera("shop-home")).toBe(false);
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
    expect(INITIAL_PAGES).toEqual({ shop: "legacy", sell: "map" });
    expect(cameraShopPage("shop-legacy")).toBe("legacy");
    expect(cameraShopPage("shop-receipt")).toBe("receipt");
    expect(cameraShopPage("sell-map")).toBeNull();
    expect(cameraSellView("sell-catch")).toBe("month");
    expect(cameraSellView("sell-approvals")).toBe("approvals");
    expect(cameraSellView("shop-home")).toBeNull();
    let pages = nextPages(INITIAL_PAGES, "sell-close");
    expect(pages).toEqual({ shop: "legacy", sell: "close" });
    pages = nextPages(pages, "maker");
    expect(pages).toEqual({ shop: "legacy", sell: "close" });
    pages = nextPages(pages, "shop-search");
    expect(pages).toEqual({ shop: "search", sell: "close" });
    // An unchanged page keeps its object.
    expect(nextPages(pages, "store")).toBe(pages);
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
    m.update(cameraPose("shop-legacy"), 0, opts(1));
    const start = m.update(cameraPose("sell-map"), 15000, opts(1));
    expect(start.buyer.opacity).toBe(1);
    const half = m.update(cameraPose("sell-map"), 15000 + MOVE_MS / 2, opts(1));
    expect(half.buyer.opacity).toBeGreaterThan(0);
    expect(half.buyer.opacity).toBeLessThan(1);
    const done = m.update(cameraPose("sell-map"), 15000 + MOVE_MS, opts(1));
    expect(done.buyer.opacity).toBeCloseTo(0, 5);
    expect(done.studio.opacity).toBeCloseTo(1, 5);
  });

  it("jumps after a seek, while paused and under reduced motion", () => {
    const m = createCameraMotion();
    m.update(cameraPose("shop-legacy"), 0, opts(1));
    expect(m.update(cameraPose("sell-close"), 43000, opts(2)).studio.opacity).toBe(1);
    expect(m.update(cameraPose("maker"), 47000, opts(2, false)).maker.opacity).toBe(1);
    expect(m.update(cameraPose("shop-legacy"), 50000, opts(2, true, true)).buyer.opacity).toBe(1);
  });
});
