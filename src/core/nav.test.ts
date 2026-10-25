import { afterEach, describe, expect, it, vi } from "vitest";
import {
  communityRoute,
  makerRoute,
  navigate,
  openDrawer,
  pieceRoute,
  projectsRoute,
  receiptRoute,
  registerNavigator,
  searchRoute,
  sellRoute,
  setProcess,
  shopRoute,
  storeRoute,
} from "./nav";
import type { DrawerKind, ProcessId } from "./events";

function fakeNavigator() {
  return {
    navigate: vi.fn<(path: string) => void>(),
    setProcess: vi.fn<(processId: ProcessId | null) => void>(),
    openDrawer: vi.fn<(drawer: DrawerKind, ref?: string) => void>(),
  };
}

let off: (() => void) | null = null;
afterEach(() => {
  off?.();
  off = null;
});

describe("route builders", () => {
  it("build the exact paths in ui-contract.md", () => {
    expect(shopRoute()).toBe("/shop");
    expect(pieceRoute("pc_01")).toBe("/shop/piece/pc_01");
    expect(communityRoute("com_dine")).toBe("/shop/community/com_dine");
    expect(projectsRoute()).toBe("/shop/projects");
    expect(projectsRoute("prj_01")).toBe("/shop/projects/prj_01");
    expect(projectsRoute("wip_01")).toBe("/shop/projects/wip_01");
    expect(receiptRoute("ord_001")).toBe("/shop/receipt/ord_001");
    expect(storeRoute("dine-weavers")).toBe("/store/dine-weavers");
    expect(makerRoute("mkr_01")).toBe("/maker/mkr_01");
  });

  it("encode the search query and repeat k once per keyword, in order", () => {
    expect(searchRoute({ q: "a warm, bold gift for my mom. she loves red wool. under $200", k: ["warm", "gift for mom", "under $200"] })).toBe(
      "/shop/search?q=a%20warm%2C%20bold%20gift%20for%20my%20mom.%20she%20loves%20red%20wool.%20under%20%24200&k=warm&k=gift%20for%20mom&k=under%20%24200",
    );
    expect(searchRoute({ q: "red", k: [] })).toBe("/shop/search?q=red");
    expect(searchRoute({ k: ["red", "wool"] })).toBe("/shop/search?k=red&k=wool");
    expect(searchRoute({})).toBe("/shop/search");
  });

  it("put the drawer and the ref on Sell views", () => {
    expect(sellRoute("month")).toBe("/sell/month");
    expect(sellRoute("map", { drawer: "ask" })).toBe("/sell/map?drawer=ask");
    expect(sellRoute("close", { drawer: "audit", ref: "led_0001" })).toBe("/sell/close?drawer=audit&ref=led_0001");
    expect(sellRoute("overview", { drawer: "support" })).toBe("/sell/overview?drawer=support");
    expect(sellRoute("approvals", { ref: "apr_03" })).toBe("/sell/approvals?ref=apr_03");
  });
});

describe("navigator", () => {
  it("does nothing and never throws before a navigator is registered", () => {
    expect(() => navigate("/shop")).not.toThrow();
    expect(() => setProcess("search")).not.toThrow();
    expect(() => setProcess(null)).not.toThrow();
    expect(() => openDrawer("support")).not.toThrow();
    expect(() => openDrawer("audit", "led_0001")).not.toThrow();
  });

  it("passes every call to the registered navigator until it unregisters", () => {
    const nav = fakeNavigator();
    off = registerNavigator(nav);
    navigate("/shop/piece/pc_01");
    setProcess("swarm");
    setProcess(null);
    openDrawer("audit", "led_0001");
    openDrawer("support");
    expect(nav.navigate).toHaveBeenCalledWith("/shop/piece/pc_01");
    expect(nav.setProcess.mock.calls).toEqual([["swarm"], [null]]);
    expect(nav.openDrawer.mock.calls).toEqual([["audit", "led_0001"], ["support", undefined]]);
    off();
    off = null;
    navigate("/shop");
    setProcess("data");
    openDrawer("ask");
    expect(nav.navigate).toHaveBeenCalledTimes(1);
    expect(nav.setProcess).toHaveBeenCalledTimes(2);
    expect(nav.openDrawer).toHaveBeenCalledTimes(2);
  });

  it("a stale unregister leaves the newer navigator in place", () => {
    const first = fakeNavigator();
    const second = fakeNavigator();
    const offFirst = registerNavigator(first);
    off = registerNavigator(second);
    offFirst();
    navigate("/sell/month");
    expect(first.navigate).not.toHaveBeenCalled();
    expect(second.navigate).toHaveBeenCalledWith("/sell/month");
  });
});
