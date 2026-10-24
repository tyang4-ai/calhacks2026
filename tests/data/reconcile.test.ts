// Every total reconciles to the cent, except the gallery's 34000 (err_01).
import { describe, expect, it } from "vitest";
import {
  approvals,
  bankTxns,
  buyers,
  demoTimeline,
  galleryContract,
  galleryStatement,
  getById,
  journals,
  ledger,
  makerPayouts,
  makerStatements,
  makers,
  orders,
  owner,
  payouts,
  pieces,
  purchases,
  refunds,
  statements,
  studio,
} from "../../src/mock/index";
import type { ChannelPayout, Order, Piece } from "../../src/core/types";

const halfUp = (amount: number, rate: number) => Math.floor((amount * rate + 5000) / 10000);
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const order = (id: string) => getById<Order>(id) as Order;
const piece = (id: string) => getById<Piece>(id) as Piece;
const CLOSE = "2026-09-30";
const balance = (acct: string) => total(ledger.filter((l) => l.account === acct).map((l) => l.debitCents - l.creditCents));

const CATALOG: [string, string, string, string, "featured" | "series", number, number, number][] = [
  ["pc_01", "Peony fan", "牡丹团扇", "mkr_01", "featured", 18000, 26, 2200],
  ["pc_02", "Plum blossom bookmarks", "梅花书签", "mkr_02", "series", 6500, 9, 800],
  ["pc_03", "Koi pond panel", "锦鲤图", "mkr_03", "featured", 120000, 160, 9500],
  ["pc_04", "Lotus at dawn", "晨荷图", "mkr_01", "featured", 95000, 130, 8000],
  ["pc_05", "Orchid scroll", "兰花轴", "mkr_02", "featured", 80000, 110, 7000],
  ["pc_06", "Sparrow on bamboo", "竹雀图", "mkr_03", "featured", 45000, 60, 4500],
  ["pc_07", "Peony sachet", "牡丹香囊", "mkr_02", "series", 4800, 6, 600],
  ["pc_08", "Silk coasters", "丝绣杯垫", "mkr_03", "series", 3800, 4, 500],
  ["pc_09", "Crane brooch", "仙鹤胸针", "mkr_01", "series", 12000, 14, 1200],
  ["pc_10", "Cloud pouch", "祥云荷包", "mkr_03", "series", 8500, 10, 900],
  ["pc_11", "Chrysanthemum fan", "菊花团扇", "mkr_02", "featured", 17500, 24, 2100],
  ["pc_12", "Phoenix needle case", "凤凰针盒", "mkr_01", "series", 9500, 11, 1000],
];

describe("people and catalog", () => {
  it("the studio, owner, makers and buyers follow data-model.md", () => {
    expect(studio).toMatchObject({ id: "std_gu", ownerId: "own_01", makerIds: ["mkr_01", "mkr_02", "mkr_03"], payoutLimitCents: 50000 });
    expect(owner).toMatchObject({ id: "own_01", role: "owner", lang: "zh" });
    expect(makers.map((m) => [m.id, m.role, m.lang])).toEqual([
      ["mkr_01", "maker", "zh"],
      ["mkr_02", "maker", "zh"],
      ["mkr_03", "maker", "zh"],
    ]);
    const chars = [...makers.map((m) => m.surnameChar), owner.surnameChar];
    expect(new Set(chars).size).toBe(4);
    expect(chars.every((c) => [...c].length === 1)).toBe(true);
    expect(buyers.map((b) => b.id)).toEqual(Array.from({ length: 20 }, (_, i) => `buy_${String(i + 1).padStart(2, "0")}`));
    expect(buyers.every((b) => b.role === "buyer" && b.lang === "en")).toBe(true);
  });

  it("the twelve pieces match the catalog table, and process hours add up", () => {
    expect(pieces.map((p) => [p.id, p.title.en, p.title.zh, p.makerId, p.kind, p.priceCents, p.hours, p.materialsCents])).toEqual(CATALOG);
    for (const p of pieces) {
      expect(total(p.process.map((s) => s.hours)), p.id).toBe(p.hours);
      expect(p.image).toBe(`/images/${p.id}.svg`);
      for (const t of [p.story, p.heritage, ...p.process.map((s) => s.step)]) {
        expect(t.en.length, p.id).toBeGreaterThan(0);
        expect(t.zh.length, p.id).toBeGreaterThan(0);
      }
    }
  });
});

describe("orders", () => {
  it("every fee field follows the money rules, half up", () => {
    for (const o of orders) {
      const p = piece(o.pieceId);
      expect(o.grossCents, o.id).toBe(p.priceCents);
      expect(o.materialsCents, o.id).toBe(p.materialsCents);
      const card = o.channelId === "ch_gallery" ? 0 : halfUp(o.grossCents, 290) + 30;
      const platform = o.channelId === "ch_cindia" ? halfUp(o.grossCents, 1000) : 0;
      const commission = o.channelId === "ch_gallery" ? halfUp(o.grossCents, galleryContract.commissionBps) : 0;
      expect([o.cardFeeCents, o.platformFeeCents, o.commissionCents], o.id).toEqual([card, platform, commission]);
      expect(o.makerShareCents, o.id).toBe(o.grossCents - card - platform - commission - o.materialsCents);
      expect(o.date >= "2026-09-01" && o.date <= CLOSE, o.id).toBe(true);
    }
  });

  it("a featured piece sells at most once in the month", () => {
    const featured = orders.filter((o) => piece(o.pieceId).kind === "featured").map((o) => o.pieceId);
    expect(new Set(featured).size).toBe(featured.length);
  });

  it("only ord_020 is refunded", () => {
    expect(orders.filter((o) => o.status === "refunded").map((o) => o.id)).toEqual(["ord_020"]);
  });
});

describe("payouts and the bank", () => {
  it("every payout equals its orders' gross less fees and refunds", () => {
    for (const p of payouts) {
      const os = p.orderIds.map(order);
      expect(os.every((o) => o.channelId === p.channelId), p.id).toBe(true);
      expect(p.grossCents, p.id).toBe(total(os.map((o) => o.grossCents)));
      const fees = p.channelId === "ch_gallery" ? galleryStatement.totalCommissionCents : total(os.map((o) => o.cardFeeCents + o.platformFeeCents));
      expect(p.feesCents, p.id).toBe(fees);
      const refundCents = total(p.refundIds.map((id) => refunds.find((r) => r.id === id)?.amountCents ?? NaN));
      expect(p.refundCents, p.id).toBe(refundCents);
      expect(p.netCents, p.id).toBe(p.grossCents - p.feesCents - p.refundCents);
      expect(p.monthId, p.id).toBe(p.date > CLOSE ? "2026-10" : "2026-09");
    }
  });

  it("every order is paid out exactly once, and Cindia settles the same day", () => {
    const all = payouts.flatMap((p) => p.orderIds);
    expect(all.toSorted()).toEqual(orders.map((o) => o.id));
    for (const o of orders.filter((x) => x.channelId === "ch_cindia")) {
      const p = payouts.find((x) => x.orderIds.includes(o.id)) as ChannelPayout;
      expect(p.orderIds, o.id).toEqual([o.id]);
      expect(p.date, o.id).toBe(o.date);
    }
    for (const p of payouts) for (const id of p.orderIds) expect(order(id).date <= p.date, p.id).toBe(true);
  });

  it("site payouts cover one order each, except the bundle, the refund netting and the late payout", () => {
    const site = payouts.filter((p) => p.channelId === "ch_site");
    const special = site.filter((p) => p.orderIds.length !== 1 || p.refundIds.length > 0 || p.date > CLOSE);
    expect(special.map((p) => [p.orderIds, p.refundIds, p.date > CLOSE])).toEqual([
      [["ord_015", "ord_016", "ord_017"], [], false],
      [["ord_021"], ["rfd_001"], false],
      [["ord_025", "ord_026"], [], true],
    ]);
  });

  it("only the gallery is off, by exactly 34000 against the contract", () => {
    for (const p of payouts) {
      const os = p.orderIds.map(order);
      const byContract = total(os.map((o) => o.grossCents - o.cardFeeCents - o.platformFeeCents - o.commissionCents)) - p.refundCents;
      expect(byContract - p.netCents, p.id).toBe(p.channelId === "ch_gallery" ? 34000 : 0);
    }
  });

  it("every payout has its bank deposit at the same amount on the same date", () => {
    for (const p of payouts) {
      const ts = bankTxns.filter((t) => t.refId === p.id);
      expect(ts, p.id).toHaveLength(1);
      expect(ts[0], p.id).toMatchObject({ direction: "in", amountCents: p.netCents, date: p.date });
    }
  });

  it("every purchase has its withdrawal, and every bank record points at a payout, purchase or maker payout", () => {
    expect(purchases.length).toBeGreaterThanOrEqual(2);
    expect(purchases.length).toBeLessThanOrEqual(3);
    for (const pur of purchases) {
      const t = bankTxns.find((x) => x.id === pur.txnId);
      expect(t, pur.id).toMatchObject({ direction: "out", amountCents: pur.amountCents, date: pur.date, refId: pur.id });
    }
    for (const t of bankTxns) {
      expect(/^(pay|pur|mpo)_/.test(t.refId), t.id).toBe(true);
      expect(getById(t.refId), t.id).toBeDefined();
    }
    expect(bankTxns.length).toBe(payouts.length + purchases.length + makerPayouts.length);
    expect(bankTxns.map((t) => t.id)).toEqual(bankTxns.map((_, i) => `txn_${String(i + 1).padStart(3, "0")}`));
    const dates = bankTxns.map((t) => t.date);
    expect(dates).toEqual(dates.toSorted());
  });

  it("the balance shown at d05 is the opening balance plus pay_001", async () => {
    const { openingBalanceCents } = await import("../../src/mock/month");
    const synced = demoTimeline.events.find((e) => e.type === "account.synced");
    expect(synced?.payload).toEqual({ accountId: "acct_studio", balanceCents: openingBalanceCents + 15648, asOf: "2026-09-01" });
  });
});

describe("the gallery statement", () => {
  it("its lines add up to its totals", () => {
    for (const s of statements) {
      for (const l of s.lines) {
        expect(l.commissionCents).toBe(halfUp(l.saleCents, l.commissionBps));
        expect(l.netCents).toBe(l.saleCents - l.commissionCents);
        expect(l.saleCents).toBe(order(l.orderId).grossCents);
        expect(l.pieceId).toBe(order(l.orderId).pieceId);
      }
      expect(s.totalSaleCents).toBe(total(s.lines.map((l) => l.saleCents)));
      expect(s.totalCommissionCents).toBe(total(s.lines.map((l) => l.commissionCents)));
      expect(s.totalNetCents).toBe(total(s.lines.map((l) => l.netCents)));
    }
    expect(galleryStatement).toMatchObject({ channelId: "ch_gallery", monthId: "2026-09", issuedDate: "2026-09-30" });
    expect(galleryStatement.lines.map((l) => l.orderId)).toEqual(["ord_027", "ord_028", "ord_029", "ord_030"]);
  });
});

describe("the ledger", () => {
  const ACCOUNTS = ["cash", "sales_cindia", "sales_site", "sales_gallery", "card_fees", "platform_fees", "gallery_commission", "materials", "maker_pay", "receivable_gallery", "refunds"];

  it("debits equal credits in every journal and in total", () => {
    for (const j of journals) {
      const lines = j.entryIds.map((id) => ledger.find((l) => l.id === id));
      expect(lines.every((l) => l && l.refId === j.refId && l.date === j.date), j.refId).toBe(true);
      expect(total(lines.map((l) => l?.debitCents ?? 0)), j.refId).toBe(total(lines.map((l) => l?.creditCents ?? 0)));
    }
    expect(total(ledger.map((l) => l.debitCents))).toBe(total(ledger.map((l) => l.creditCents)));
    expect(journals.flatMap((j) => j.entryIds).toSorted()).toEqual(ledger.map((l) => l.id).toSorted());
  });

  it("every line uses a listed account, one side only, in integer cents", () => {
    for (const l of ledger) {
      expect(ACCOUNTS, l.id).toContain(l.account);
      expect(Number.isInteger(l.debitCents) && Number.isInteger(l.creditCents), l.id).toBe(true);
      expect((l.debitCents > 0) !== (l.creditCents > 0), l.id).toBe(true);
    }
  });

  it("there is a journal for every payout, gallery order, purchase and maker payout", () => {
    const refs = new Set(journals.map((j) => j.refId));
    for (const p of payouts) expect(refs.has(p.id), p.id).toBe(true);
    for (const o of orders.filter((x) => x.channelId === "ch_gallery")) expect(refs.has(o.id), o.id).toBe(true);
    for (const p of purchases) expect(refs.has(p.id), p.id).toBe(true);
    for (const m of makerPayouts) expect(refs.has(m.id), m.id).toBe(true);
  });

  it("cash in the ledger equals the bank's movements, and the gallery still owes 34000", () => {
    expect(balance("cash")).toBe(total(bankTxns.map((t) => (t.direction === "in" ? t.amountCents : -t.amountCents))));
    expect(balance("receivable_gallery")).toBe(34000);
    expect(-balance("sales_cindia")).toBe(total(orders.filter((o) => o.channelId === "ch_cindia").map((o) => o.grossCents)));
    expect(-balance("sales_site")).toBe(total(orders.filter((o) => o.channelId === "ch_site").map((o) => o.grossCents)));
    expect(-balance("sales_gallery")).toBe(340000);
    expect(balance("card_fees")).toBe(total(orders.map((o) => o.cardFeeCents)));
    expect(balance("platform_fees")).toBe(total(orders.map((o) => o.platformFeeCents)));
    expect(balance("gallery_commission")).toBe(total(orders.map((o) => o.commissionCents)));
    expect(balance("refunds")).toBe(9500);
    expect(balance("materials")).toBe(total(purchases.map((p) => p.amountCents)));
    expect(balance("maker_pay")).toBe(total(makerPayouts.map((m) => m.amountCents)));
  });
});

describe("maker payouts and statements", () => {
  it("each pays the maker's share of September orders whose money arrived, holding the gallery's shortfall", () => {
    for (const m of makerPayouts) {
      const expected = orders.filter((o) => {
        if (piece(o.pieceId).makerId !== m.makerId || o.status !== "paid") return false;
        const p = payouts.find((x) => x.orderIds.includes(o.id)) as ChannelPayout;
        return p.date <= CLOSE;
      });
      expect(m.orderIds, m.id).toEqual(expected.map((o) => o.id));
      expect(m.orderIds).not.toContain("ord_020");
      expect(m.orderIds).not.toContain("ord_025");
      expect(m.orderIds).not.toContain("ord_026");
      // Gallery orders pay on what the gallery paid. The rest of the contract share is held.
      const held = total(expected.filter((o) => o.channelId === "ch_gallery").map((o) => halfUp(o.grossCents, 5000 - galleryContract.commissionBps)));
      expect(m.heldCents, m.id).toBe(held);
      expect(m.amountCents, m.id).toBe(total(expected.map((o) => o.makerShareCents)) - held);
      expect(m.monthId).toBe("2026-09");
    }
  });

  it("each maker statement lists the same lines, and its total less held is the payout", () => {
    expect(makerStatements.map((s) => s.id)).toEqual(["mst_01", "mst_02", "mst_03"]);
    makerStatements.forEach((s, i) => {
      const m = makerPayouts[i];
      expect(s.makerId).toBe(m.makerId);
      expect(s.lines.map((l) => l.orderId)).toEqual(m.orderIds);
      for (const l of s.lines) expect([l.pieceId, l.makerShareCents]).toEqual([order(l.orderId).pieceId, order(l.orderId).makerShareCents]);
      expect(s.totalCents).toBe(total(s.lines.map((l) => l.makerShareCents)));
      expect(s.heldCents).toBe(m.heldCents);
      expect(s.totalCents - s.heldCents).toBe(m.amountCents);
    });
  });

  it("month.closed carries the month's totals", () => {
    const closed = demoTimeline.events.find((e) => e.type === "month.closed");
    const sales = total(orders.map((o) => o.grossCents)) - total(refunds.map((r) => r.amountCents));
    const fees = total(orders.map((o) => o.cardFeeCents + o.platformFeeCents)) + galleryStatement.totalCommissionCents;
    expect(closed?.payload).toEqual({
      monthId: "2026-09",
      salesCents: sales,
      feesCents: fees,
      makerPayCents: total(makerPayouts.map((m) => m.amountCents)),
      heldCents: 34000,
    });
    expect(approvals[1].amountCents).toBe(total(makerPayouts.map((m) => m.amountCents)));
  });
});
