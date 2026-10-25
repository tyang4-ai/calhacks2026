import { describe, expect, it } from "vitest";
import { SELL_VIEWS } from "../../core/featureTypes";
import { LEGACY_COLUMN, LEGACY_CONSOLE, LEGACY_PAD, LEGACY_PHONE, SELL_VIEW_SLOTS, isSellView, isStudioView, legacyScale } from "./views";

describe("the Sell views", () => {
  it("lays out every view from the contract's table", () => {
    expect(Object.keys(SELL_VIEW_SLOTS)).toEqual([...SELL_VIEWS]);
    expect(SELL_VIEW_SLOTS.month).toEqual({ main: "studio.month.main", side: "studio.month.side" });
    expect(SELL_VIEW_SLOTS.close).toEqual({ main: "studio.close.main", side: "studio.close.side" });
    expect(SELL_VIEW_SLOTS.proof).toEqual({ main: "studio.proof.main", side: "studio.proof.side" });
    expect(SELL_VIEW_SLOTS.approvals).toEqual({ main: "owner.main" });
    expect(isSellView("watch")).toBe(true);
    expect(isSellView("nope")).toBe(false);
    expect(isSellView(undefined)).toBe(false);
    expect(SELL_VIEWS.filter(isStudioView)).toEqual(["map", "month", "close", "proof", "dashboard"]);
  });
});

describe("the legacy boxes", () => {
  it("keeps v1's sizes", () => {
    expect(LEGACY_CONSOLE).toEqual({ w: 1192, h: 744 });
    expect(LEGACY_PHONE).toEqual({ w: 390, h: 844 });
    expect(LEGACY_COLUMN).toEqual({ w: 480, h: 844 });
  });

  it("scales down to fit the space, never up", () => {
    expect(legacyScale(LEGACY_PHONE, { w: 2000, h: 2000 })).toBe(1);
    expect(legacyScale(LEGACY_COLUMN, { w: 1440, h: 780 })).toBeCloseTo((780 - 2 * LEGACY_PAD) / 844, 6);
    expect(legacyScale(LEGACY_CONSOLE, { w: 1000, h: 2000 })).toBeCloseTo((1000 - 2 * LEGACY_PAD) / 1192, 6);
    // A space not measured yet keeps scale 1.
    expect(legacyScale(LEGACY_CONSOLE, { w: 0, h: 0 })).toBe(1);
  });
});
