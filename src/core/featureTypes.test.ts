import { describe, expect, it } from "vitest";
import { PROCESS_IDS } from "./events";
import { CAMERA_IDS, SELL_VIEWS, SLOT_IDS, TOUR_CAMERA_IDS, slotTestId } from "./featureTypes";

describe("cameras", () => {
  it("lists the tour's sixteen cameras, pitch included, and no legacy one", () => {
    expect(TOUR_CAMERA_IDS).toHaveLength(16);
    expect(new Set(TOUR_CAMERA_IDS).size).toBe(TOUR_CAMERA_IDS.length);
    for (const c of ["pitch", "shop-home", "shop-search", "shop-piece", "shop-receipt", "sell-catch", "sell-listings", "sell-watch", "maker", "store"]) expect(TOUR_CAMERA_IDS).toContain(c);
    for (const c of ["shop-legacy", "buyer", "buyer-studio", "studio-month", "studio-catch", "studio-owner", "studio-close", "receipt"]) expect(TOUR_CAMERA_IDS as readonly string[]).not.toContain(c);
  });

  it("CAMERA_IDS is the tour's cameras", () => {
    expect(CAMERA_IDS).toEqual(TOUR_CAMERA_IDS);
  });
});

describe("views, slots and processes", () => {
  it("lists the eleven Sell views in route order", () => {
    expect(SELL_VIEWS).toEqual(["overview", "listings", "storefront", "projects", "map", "month", "close", "proof", "dashboard", "approvals", "watch"]);
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
