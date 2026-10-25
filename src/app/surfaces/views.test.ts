import { describe, expect, it } from "vitest";
import { SELL_VIEWS } from "../../core/featureTypes";
import { SELL_VIEW_SLOTS, isSellView } from "./views";

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
  });
});
