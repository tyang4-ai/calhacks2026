import { describe, expect, it } from "vitest";
import { SLOT_IDS, type SlotId } from "../core/featureTypes";
import { slotProps, slotPropsJson, type SlotContext } from "./slotProps";

const shop = (extra: Partial<SlotContext> = {}): SlotContext => ({ surface: "buyer", lang: "en", publicSite: false, ...extra });
const sell = (extra: Partial<SlotContext> = {}): SlotContext => ({ surface: "studio", lang: "en", publicSite: false, ...extra });

describe("slot props", () => {
  it("passes surface and lang to every slot, and owner.main gets surface owner with the Sell site's language", () => {
    for (const slot of SLOT_IDS) {
      const p = slotProps(slot, sell({ lang: "zh" }));
      expect(p.lang, slot).toBe("zh");
      expect(p.surface, slot).toBe(slot === "owner.main" ? "owner" : "studio");
    }
  });

  it("gives shop.search.main q and every k, with k an empty list when there's none", () => {
    expect(slotProps("shop.search.main", shop({ shopPage: "search", searchParams: { q: "wool", k: ["wool", "red"] } })).searchParams).toEqual({ q: "wool", k: ["wool", "red"] });
    expect(slotProps("shop.search.main", shop({ shopPage: "search", searchParams: { k: [] } })).searchParams).toEqual({ k: [] });
    expect(slotProps("shop.search.main", shop({ shopPage: "search" })).searchParams).toEqual({ k: [] });
    // An empty q is no q.
    expect(slotProps("shop.search.main", shop({ searchParams: { q: "", k: ["wool"] } })).searchParams).toEqual({ k: ["wool"] });
  });

  it("gives the piece page's two slots pieceId, the receipt orderId, the community and projects their IDs", () => {
    const piece = shop({ shopPage: "piece", pieceId: "pc_01" });
    expect(slotProps("shop.piece.main", piece).pieceId).toBe("pc_01");
    expect(slotProps("shop.piece.side", piece).pieceId).toBe("pc_01");
    expect(slotProps("shop.receipt.main", shop({ shopPage: "receipt", orderId: "ord_001" })).orderId).toBe("ord_001");
    expect(slotProps("shop.community.main", shop({ shopPage: "community", communityId: "com_dine" })).communityId).toBe("com_dine");
    expect(slotProps("shop.projects.main", shop({ shopPage: "projects", projectId: "prj_01" })).projectId).toBe("prj_01");
    expect("projectId" in slotProps("shop.projects.main", shop({ shopPage: "projects" }))).toBe(false);
  });

  it("gives the Shop support drawer side buyer, plus the open piece, receipt or store", () => {
    expect(slotProps("shop.drawer.support", shop({ shopPage: "home" }))).toEqual({ surface: "buyer", lang: "en", side: "buyer" });
    expect(slotProps("shop.drawer.support", shop({ shopPage: "piece", pieceId: "pc_01" }))).toMatchObject({ side: "buyer", pieceId: "pc_01" });
    expect(slotProps("shop.drawer.support", shop({ shopPage: "receipt", orderId: "ord_001" }))).toMatchObject({ side: "buyer", orderId: "ord_001" });
    expect(slotProps("shop.drawer.support", { surface: "store", lang: "en", publicSite: false, slug: "dine-weavers" })).toMatchObject({
      surface: "store",
      side: "buyer",
      slug: "dine-weavers",
    });
    // A piece ID left over from another page isn't passed.
    expect("pieceId" in slotProps("shop.drawer.support", shop({ shopPage: "receipt", pieceId: "pc_01", orderId: "ord_001" }))).toBe(false);
  });

  it("gives the Sell support drawer side seller, plus makerId on a maker page", () => {
    expect(slotProps("studio.drawer.support", sell())).toEqual({ surface: "studio", lang: "en", side: "seller" });
    expect(slotProps("studio.drawer.support", { surface: "maker", lang: "en", publicSite: false, makerId: "mkr_01" })).toEqual({
      surface: "maker",
      lang: "en",
      side: "seller",
      makerId: "mkr_01",
    });
  });

  it("gives ?ref= to the audit drawer, and to owner.main on /sell/approvals", () => {
    expect(slotProps("studio.drawer.audit", sell({ sellView: "close", refId: "flg_01" })).refId).toBe("flg_01");
    expect(slotProps("owner.main", sell({ sellView: "approvals", refId: "apr_01" }))).toEqual({ surface: "owner", lang: "en", refId: "apr_01" });
    expect("refId" in slotProps("owner.main", sell({ sellView: "approvals" }))).toBe(false);
  });

  it("gives both process slots the open process, undefined on the bar while none is open", () => {
    expect(slotProps("process.bar", shop({ processId: "swarm" })).processId).toBe("swarm");
    expect(slotProps("process.view", shop({ processId: "swarm" })).processId).toBe("swarm");
    expect("processId" in slotProps("process.bar", shop({ processId: null }))).toBe(false);
    expect("processId" in slotProps("process.bar", shop())).toBe(false);
  });

  it("gives the maker page's slots makerId and the storefront its slug", () => {
    const maker: SlotContext = { surface: "maker", lang: "en", publicSite: false, makerId: "mkr_01" };
    expect(slotProps("maker.main", maker).makerId).toBe("mkr_01");
    expect(slotProps("maker.side", maker).makerId).toBe("mkr_01");
    expect(slotProps("store.main", { surface: "store", lang: "en", publicSite: false, slug: "dine-weavers" }).slug).toBe("dine-weavers");
  });

  it("passes nothing a slot's row doesn't name", () => {
    const busy = shop({ shopPage: "piece", pieceId: "pc_01", orderId: "ord_001", refId: "x", makerId: "mkr_01", slug: "s", processId: null });
    expect(slotProps("shop.home.main", busy)).toEqual({ surface: "buyer", lang: "en" });
    expect(slotProps("buyer.main", busy)).toEqual({ surface: "buyer", lang: "en" });
    expect(slotProps("studio.month.main", sell({ refId: "flg_01" }))).toEqual({ surface: "studio", lang: "en" });
  });

  it("adds publicSite: true to every slot on the public build only", () => {
    for (const slot of SLOT_IDS) {
      expect(slotProps(slot, sell({ publicSite: true })).publicSite, slot).toBe(true);
      expect("publicSite" in slotProps(slot, sell()), slot).toBe(false);
    }
  });

  it("writes data-slot-props as the JSON of the props, without functions", () => {
    const p = slotProps("shop.piece.main" as SlotId, shop({ shopPage: "piece", pieceId: "pc_01" }));
    expect(JSON.parse(slotPropsJson(p))).toEqual({ surface: "buyer", lang: "en", pieceId: "pc_01" });
    const withFn = { ...p, onSomething: () => undefined } as unknown as typeof p;
    expect(JSON.parse(slotPropsJson(withFn))).toEqual({ surface: "buyer", lang: "en", pieceId: "pc_01" });
  });
});
