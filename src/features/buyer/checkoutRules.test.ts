// M-buyer T4 and acceptance 7: the desktop checkout's rules. With publicSite every piece's pay is
// blocked and the add-on can't emit. Without it pay is open for every piece until that piece's own
// checkout starts. Pieces, orders and the tour's contribution come from src/mock.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Order } from "../../core/types";
import { demoContribution, getById, pieces } from "../../mock";
import { Checkout } from "./Checkout";
import {
  addOnCanEmit,
  addOnLocked,
  addOnOn,
  contributionFor,
  isUserOrder,
  newestOrderFor,
  nextContributionId,
  payState,
} from "./checkoutRules";

const pieceOfOrder = (orderId: string) => getById<Order>(orderId)?.pieceId;

describe("payState", () => {
  it("blocks pay on every piece on the public build, before and after a checkout", () => {
    expect(pieces.length).toBeGreaterThan(0);
    for (const p of pieces) {
      expect(payState({ publicSite: true, checkedOut: false }), p.id).toBe("blocked");
      expect(payState({ publicSite: true, checkedOut: true }), p.id).toBe("blocked");
    }
  });

  it("keeps pay open on every piece until that piece's own checkout starts", () => {
    const checkouts = new Set<string>(["pc_01"]);
    for (const p of pieces) {
      const state = payState({ publicSite: false, checkedOut: checkouts.has(p.id) });
      expect(state, p.id).toBe(p.id === "pc_01" ? "done" : "open");
    }
  });
});

describe("the project add-on", () => {
  it("can't emit on the public build, whatever the switch says", () => {
    for (const p of pieces) {
      expect(addOnCanEmit({ publicSite: true, checkedOut: false, switchedOn: true }), p.id).toBe(false);
      expect(addOnLocked({ publicSite: true, checkedOut: false }), p.id).toBe(true);
    }
  });

  it("emits on localhost only when switched on and pay is open", () => {
    expect(addOnCanEmit({ publicSite: false, checkedOut: false, switchedOn: true })).toBe(true);
    expect(addOnCanEmit({ publicSite: false, checkedOut: false, switchedOn: false })).toBe(false);
    expect(addOnCanEmit({ publicSite: false, checkedOut: true, switchedOn: true })).toBe(false);
  });

  it("starts off, reads on while switched on, and locks once this piece's checkout started", () => {
    expect(addOnOn({ publicSite: false, checkedOut: false, switchedOn: false, funded: false })).toBe(false);
    expect(addOnOn({ publicSite: false, checkedOut: false, switchedOn: true, funded: false })).toBe(true);
    expect(addOnLocked({ publicSite: false, checkedOut: false })).toBe(false);
    expect(addOnLocked({ publicSite: false, checkedOut: true })).toBe(true);
    // After the checkout, the switch shows what the store holds.
    expect(addOnOn({ publicSite: false, checkedOut: true, switchedOn: true, funded: false })).toBe(false);
    expect(addOnOn({ publicSite: false, checkedOut: true, switchedOn: false, funded: true })).toBe(true);
  });

  it("stays off on the public build unless the tour's own contribution turns it on", () => {
    expect(addOnOn({ publicSite: true, checkedOut: false, switchedOn: true, funded: false })).toBe(false);
    expect(addOnOn({ publicSite: true, checkedOut: true, switchedOn: false, funded: true })).toBe(true);
  });
});

describe("contributionFor", () => {
  const tour = { [demoContribution.contributionId]: demoContribution };

  it("finds the tour's ctb_01 for pc_01, whose order ord_001 it names", () => {
    expect(demoContribution.orderId).toBe("ord_001");
    expect(pieceOfOrder("ord_001")).toBe("pc_01");
    expect(contributionFor(tour, { pieceId: "pc_01", ownId: null, pieceOfOrder })).toEqual(demoContribution);
  });

  it("finds nothing for another piece", () => {
    expect(contributionFor(tour, { pieceId: "pc_02", ownId: null, pieceOfOrder })).toBeNull();
  });

  it("prefers this page's own contribution, so the tour's arriving later adds no second line", () => {
    const own = { contributionId: "ctb_user_1", projectId: "prj_01", amountCents: 500, buyerId: "buy_01" };
    const both = { ctb_user_1: own, ...tour };
    expect(contributionFor(both, { pieceId: "pc_01", ownId: "ctb_user_1", pieceOfOrder })).toEqual(own);
  });

  it("forgets the page's own contribution once the store no longer holds it", () => {
    expect(contributionFor({}, { pieceId: "pc_02", ownId: "ctb_user_1", pieceOfOrder })).toBeNull();
  });
});

describe("the public build's block (acceptance 7)", () => {
  // L6, word for word from the glossary's on-screen labels.
  const L6 = { en: "This is the public demo. Nothing here can be bought.", zh: "这是公开演示版。这里的物品都无法购买。" };

  it("puts buyer-pay-blocked with L6 where buyer-pay-button was, on the piece page and the phone, for every piece", () => {
    for (const p of pieces) {
      for (const layout of ["page", "phone"] as const) {
        const html = renderToStaticMarkup(createElement(Checkout, { lang: "en", pieceId: p.id, publicSite: true, layout }));
        expect(html, `${p.id} ${layout}`).toContain('data-testid="buyer-pay-blocked"');
        expect(html, `${p.id} ${layout}`).toContain(L6.en);
        expect(html, `${p.id} ${layout}`).not.toContain('data-testid="buyer-pay-button"');
      }
    }
    const zh = renderToStaticMarkup(createElement(Checkout, { lang: "zh", pieceId: "pc_01", publicSite: true, layout: "page" }));
    expect(zh).toContain(L6.zh);
  });

  it("keeps the add-on switch locked off on the public build", () => {
    const html = renderToStaticMarkup(createElement(Checkout, { lang: "en", pieceId: "pc_01", publicSite: true, layout: "page" }));
    expect(html).toMatch(/data-testid="buyer-project-addon" data-state="off"/);
    expect(html).toMatch(/<input[^>]*disabled=""/);
  });

  it("shows buyer-pay-button and no block on localhost", () => {
    const html = renderToStaticMarkup(createElement(Checkout, { lang: "en", pieceId: "pc_02", layout: "page" }));
    expect(html).toContain('data-testid="buyer-pay-button"');
    expect(html).not.toContain('data-testid="buyer-pay-blocked"');
  });
});

describe("IDs and orders", () => {
  it("numbers a person's contributions after every ctb_user_ in the store", () => {
    expect(nextContributionId({})).toBe("ctb_user_1");
    expect(nextContributionId({ ctb_01: {} })).toBe("ctb_user_1");
    expect(nextContributionId({ ctb_user_1: {}, ctb_user_3: {} })).toBe("ctb_user_4");
  });

  it("tells a person's own order from the tour's", () => {
    expect(isUserOrder("ord_user_1")).toBe(true);
    expect(isUserOrder("ord_001")).toBe(false);
  });

  it("picks the newest order of one piece", () => {
    const orders = { ord_001: { pieceId: "pc_01" }, ord_user_1: { pieceId: "pc_02" }, ord_user_2: { pieceId: "pc_02" } };
    const ids = ["ord_001", "ord_user_1", "ord_user_2"];
    expect(newestOrderFor(ids, orders, "pc_02")).toBe("ord_user_2");
    expect(newestOrderFor(ids, orders, "pc_01")).toBe("ord_001");
    expect(newestOrderFor(ids, orders, "pc_03")).toBeNull();
  });
});
