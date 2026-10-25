// The URL helpers for drawers and the process overlay, and the router navigator built on them.
import { describe, expect, it } from "vitest";
import { PROCESS_IDS } from "../core/events";
import { drawerSlot, sideOf } from "./chrome/rules";
import { routerNavigator, type Where } from "./navigators";
import { drawerKindsFor, parseDrawer, parseRef, searchString, withDrawer, withoutDrawer } from "./useDrawer";
import { parseProcess, withProcess } from "./useProcessParam";

const q = (s: string) => new URLSearchParams(s);

describe("drawer parameters", () => {
  it("reads the drawer a page takes, and ignores the rest", () => {
    expect(parseDrawer(q("drawer=support"), drawerKindsFor("buyer"))).toBe("support");
    expect(parseDrawer(q("drawer=ask"), drawerKindsFor("buyer"))).toBeNull();
    expect(parseDrawer(q("drawer=audit&ref=flg_01"), drawerKindsFor("store"))).toBeNull();
    expect(parseDrawer(q("drawer=support"), drawerKindsFor("maker"))).toBe("support");
    expect(parseDrawer(q("drawer=ask"), drawerKindsFor("maker"))).toBeNull();
    for (const d of ["support", "ask", "audit"]) expect(parseDrawer(q(`drawer=${d}`), drawerKindsFor("studio"))).toBe(d);
    expect(parseDrawer(q("drawer=nope"), drawerKindsFor("studio"))).toBeNull();
    expect(parseDrawer(q(""), drawerKindsFor("studio"))).toBeNull();
    expect(parseRef(q("ref=apr_01"))).toBe("apr_01");
    expect(parseRef(q("ref="))).toBeUndefined();
  });

  it("opens one drawer at a time, with ref only for audit, and keeps an approval's ref", () => {
    expect(searchString(withDrawer(q(""), "support"))).toBe("?drawer=support");
    expect(searchString(withDrawer(q("drawer=ask"), "audit", "flg_01"))).toBe("?drawer=audit&ref=flg_01");
    expect(searchString(withDrawer(q("drawer=audit&ref=flg_01"), "ask"))).toBe("?drawer=ask");
    expect(searchString(withDrawer(q("ref=apr_01"), "support"))).toBe("?ref=apr_01&drawer=support");
    expect(searchString(withDrawer(q("process=swarm"), "support"))).toBe("?process=swarm&drawer=support");
  });

  it("closes the drawer, taking an audit drawer's ref with it", () => {
    expect(searchString(withoutDrawer(q("drawer=audit&ref=flg_01")))).toBe("");
    expect(searchString(withoutDrawer(q("ref=apr_01&drawer=support")))).toBe("?ref=apr_01");
    expect(searchString(withoutDrawer(q("drawer=ask&process=money")))).toBe("?process=money");
  });
});

describe("process parameter", () => {
  it("reads every process ID, data included, and ignores an unknown one", () => {
    for (const id of PROCESS_IDS) expect(parseProcess(q(`process=${id}`))).toBe(id);
    expect(parseProcess(q("process=nope"))).toBeNull();
    expect(parseProcess(q(""))).toBeNull();
  });

  it("sets and clears it, keeping the other parameters", () => {
    expect(searchString(withProcess(q("q=wool&k=wool"), "search"))).toBe("?q=wool&k=wool&process=search");
    expect(searchString(withProcess(q("process=search&drawer=support"), null))).toBe("?drawer=support");
  });
});

function rig(start: Where) {
  const went: string[] = [];
  let where = start;
  const nav = routerNavigator(
    (to) => {
      went.push(to);
      const [pathname, search = ""] = to.split("?");
      where = { pathname, search: search ? `?${search}` : "" };
    },
    () => where,
  );
  return { nav, went };
}

describe("the router navigator", () => {
  it("navigates to a path, and sets the drawer and the process on the current route", () => {
    const { nav, went } = rig({ pathname: "/shop/piece/pc_01", search: "" });
    nav.openDrawer("support");
    nav.setProcess("swarm");
    nav.setProcess(null);
    nav.navigate("/sell/overview");
    nav.openDrawer("audit", "flg_01");
    expect(went).toEqual(["/shop/piece/pc_01?drawer=support", "/shop/piece/pc_01?drawer=support&process=swarm", "/shop/piece/pc_01?drawer=support", "/sell/overview", "/sell/overview?drawer=audit&ref=flg_01"]);
  });
});

describe("the chrome's rules", () => {
  it("counts maker pages as Sell and store pages as Shop", () => {
    expect(sideOf("buyer")).toBe("shop");
    expect(sideOf("store")).toBe("shop");
    expect(sideOf("studio")).toBe("sell");
    expect(sideOf("maker")).toBe("sell");
  });

  it("opens Help as the Shop drawer on Shop and store pages, and the Sell drawer on Sell and maker pages", () => {
    expect(drawerSlot("buyer", "support")).toBe("shop.drawer.support");
    expect(drawerSlot("store", "support")).toBe("shop.drawer.support");
    expect(drawerSlot("studio", "support")).toBe("studio.drawer.support");
    expect(drawerSlot("maker", "support")).toBe("studio.drawer.support");
    expect(drawerSlot("studio", "ask")).toBe("studio.drawer.ask");
    expect(drawerSlot("studio", "audit")).toBe("studio.drawer.audit");
  });
});
