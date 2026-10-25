import { describe, expect, it } from "vitest";
import { PROCESS_IDS } from "./events";
import {
  CAMERA_IDS,
  LEGACY_CAMERA_IDS,
  LEGACY_CAMERA_TO_TOUR,
  SELL_VIEWS,
  SLOT_IDS,
  STUDIO_VIEWS,
  TOUR_CAMERA_IDS,
  slotTestId,
  toTourCamera,
} from "./featureTypes";

describe("cameras", () => {
  it("lists v1's eight legacy cameras and the tour's, pitch and shop-legacy included", () => {
    expect(LEGACY_CAMERA_IDS).toHaveLength(8);
    expect(TOUR_CAMERA_IDS).toContain("pitch");
    expect(TOUR_CAMERA_IDS).toContain("shop-legacy");
    expect(TOUR_CAMERA_IDS).toContain("sell-catch");
    expect(TOUR_CAMERA_IDS).toContain("store");
  });

  it("CAMERA_IDS holds both sets, each camera once", () => {
    expect(new Set(CAMERA_IDS).size).toBe(CAMERA_IDS.length);
    for (const c of [...LEGACY_CAMERA_IDS, ...TOUR_CAMERA_IDS]) expect(CAMERA_IDS).toContain(c);
  });

  it("maps v1's cameras through the Phase A mapping and keeps a tour camera as it is", () => {
    expect(toTourCamera("buyer")).toBe("shop-legacy");
    expect(toTourCamera("receipt")).toBe("shop-legacy");
    expect(toTourCamera("buyer-studio")).toBe("sell-map");
    expect(toTourCamera("studio-month")).toBe("sell-month");
    expect(toTourCamera("studio-catch")).toBe("sell-catch");
    expect(toTourCamera("studio-owner")).toBe("sell-approvals");
    expect(toTourCamera("studio-close")).toBe("sell-close");
    expect(toTourCamera("maker")).toBe("maker");
    for (const c of TOUR_CAMERA_IDS) expect(toTourCamera(c)).toBe(c);
    expect(Object.keys(LEGACY_CAMERA_TO_TOUR).toSorted()).toEqual([...LEGACY_CAMERA_IDS].toSorted());
  });
});

describe("views, slots and processes", () => {
  it("lists the eleven Sell views in route order, and keeps v1's five studio views", () => {
    expect(SELL_VIEWS).toEqual(["overview", "listings", "storefront", "projects", "map", "month", "close", "proof", "dashboard", "approvals", "watch"]);
    expect(STUDIO_VIEWS).toEqual(["map", "month", "close", "proof", "dashboard"]);
  });

  it("lists every slot once, v1's twelve first, and the process slots' test IDs", () => {
    expect(new Set(SLOT_IDS).size).toBe(SLOT_IDS.length);
    expect(SLOT_IDS).toHaveLength(32);
    expect(SLOT_IDS.slice(0, 12)).toContain("maker.main");
    expect(`slot-${slotTestId("process.bar")}`).toBe("slot-process-bar");
    expect(`slot-${slotTestId("process.view")}`).toBe("slot-process-view");
  });

  it("lists the eleven processes in the process bar's order", () => {
    expect(PROCESS_IDS).toEqual(["search", "swarm", "checkout", "money", "reconcile", "approvals", "close", "proof", "watch", "model", "data"]);
  });
});
