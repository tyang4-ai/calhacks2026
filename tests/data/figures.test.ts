// The ten demo-critical figures in data-model.md, one test each, with the exact cents. Figures 8 to
// 10 read the tour's events (I2-tour T1). Figures 11 to 16 are in v2-figures.test.ts and
// demo-timeline.test.ts.
import { describe, expect, it } from "vitest";
import { mockAnswers } from "../../src/sources/mockAnswers";
import { scriptedAnswer } from "../../src/sources/requests";
import {
  answerKey,
  approvals,
  bankTxns,
  curatedSet,
  demoTimeline,
  galleryContract,
  galleryStatement,
  getById,
  makerPayouts,
  makerStatements,
  orders,
  payouts,
  refunds,
  studio,
} from "../../src/mock/index";
import type { ChannelPayout, MakerPayout, Order } from "../../src/core/types";
import type { CindiaEvent, EventType } from "../../src/core/events";

function ofType<T extends EventType>(type: T): CindiaEvent<T>[] {
  return demoTimeline.events.filter((e) => e.type === type) as CindiaEvent<T>[];
}
const ids = (n: number, from: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => `${prefix}${String(from + i).padStart(3, "0")}`);

describe("demo-critical figures (data-model.md)", () => {
  it("1. the buyer's order ord_001 and pay_001", () => {
    const o = getById<Order>("ord_001");
    expect(o).toMatchObject({
      channelId: "ch_cindia",
      pieceId: "pc_01",
      buyerId: "buy_01",
      date: "2026-09-01",
      grossCents: 18000,
      cardFeeCents: 552,
      platformFeeCents: 1800,
      commissionCents: 0,
      materialsCents: 2200,
      makerShareCents: 13448,
      status: "paid",
    });
    expect(orders.filter((x) => x.date < "2026-09-01")).toEqual([]);
    expect(getById<ChannelPayout>("pay_001")).toMatchObject({ channelId: "ch_cindia", date: "2026-09-01", orderIds: ["ord_001"], netCents: 15648 });
  });

  // The tour has no concierge beat (data-model.md, figure 2), so figure 2 is checked on curatedSet
  // and on the scripted concierge answer, which reads it.
  it("2. the concierge answer is pc_01, pc_07, pc_11 in that order, each with its reason", () => {
    expect(curatedSet.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
    expect(Object.keys(curatedSet.reasons)).toEqual(["pc_01", "pc_07", "pc_11"]);
    for (const id of curatedSet.pieceIds) {
      expect(curatedSet.reasons[id]?.en, id).toBeTruthy();
      expect(curatedSet.reasons[id]?.zh, id).toBeTruthy();
    }
    const query = "a gift under $200 for my mom, she loves red wool";
    const req = { id: "evt_user_0001", type: "concierge.asked", at: 0, source: "user", payload: { query, lang: "en" } } as CindiaEvent<"concierge.asked">;
    const ans = scriptedAnswer(req, mockAnswers(), "b09-concierge").map((p) => p.event);
    expect(ans.map((e) => [e.type, e.payload])).toEqual([["concierge.answered", { query, pieceIds: ["pc_01", "pc_07", "pc_11"], reasons: curatedSet.reasons }]]);
    expect(ofType("concierge.answered")).toEqual([]);
  });

  it("3. thirty orders on the right channels", () => {
    expect(orders.map((o) => o.id)).toEqual(ids(30, 1, "ord_"));
    for (const o of orders) {
      const n = Number(o.id.slice(4));
      expect(o.channelId, o.id).toBe(n <= 12 ? "ch_cindia" : n <= 26 ? "ch_site" : "ch_gallery");
    }
  });

  it("4. the gallery's month: 340000 gross, 204000 owed, 170000 stated and deposited, short 34000", () => {
    const g = orders.filter((o) => o.channelId === "ch_gallery");
    expect(g.map((o) => o.id)).toEqual(["ord_027", "ord_028", "ord_029", "ord_030"]);
    expect(g.map((o) => o.pieceId)).toEqual(["pc_03", "pc_04", "pc_05", "pc_06"]);
    const gross = g.reduce((a, o) => a + o.grossCents, 0);
    expect(gross).toBe(340000);
    expect(galleryContract.commissionBps).toBe(4000);
    expect(gross - (gross * galleryContract.commissionBps) / 10000).toBe(204000);
    expect(galleryStatement.id).toBe("stm_gallery_2026_09");
    expect(galleryStatement.lines.every((l) => l.commissionBps === 5000)).toBe(true);
    expect(galleryStatement.totalNetCents).toBe(170000);
    const deposits = bankTxns.filter((t) => t.direction === "in" && getById<ChannelPayout>(t.refId)?.channelId === "ch_gallery");
    expect(deposits).toHaveLength(1);
    expect(deposits[0]).toMatchObject({ amountCents: 170000, date: "2026-09-30" });
    expect(204000 - deposits[0].amountCents).toBe(34000);
  });

  it("5. one site payout covers exactly ord_015, ord_016 and ord_017", () => {
    const multi = payouts.filter((p) => p.channelId === "ch_site" && p.orderIds.length > 1 && p.date <= "2026-09-30");
    expect(multi).toHaveLength(1);
    expect(multi[0].orderIds).toEqual(["ord_015", "ord_016", "ord_017"]);
  });

  it("6. the refund rfd_001: ord_020 in full on Sep 21, netted from the next site payout", () => {
    expect(refunds).toHaveLength(1);
    const r = refunds[0];
    expect(r).toMatchObject({ id: "rfd_001", orderId: "ord_020", date: "2026-09-21", amountCents: 9500 });
    expect(getById<Order>("ord_020")).toMatchObject({ pieceId: "pc_12", grossCents: 9500, status: "refunded" });
    const next = payouts.filter((p) => p.channelId === "ch_site" && p.date > r.date).toSorted((a, b) => (a.date < b.date ? -1 : 1))[0];
    expect(r.nettedInPayoutId).toBe(next.id);
    expect(next.refundIds).toEqual(["rfd_001"]);
    expect(next.refundCents).toBe(9500);
  });

  it("7. the late site payout for ord_025 and ord_026 lands Oct 2", () => {
    const late = payouts.filter((p) => p.date > "2026-09-30");
    expect(late).toHaveLength(1);
    expect(late[0]).toMatchObject({ channelId: "ch_site", date: "2026-10-02", orderIds: ["ord_025", "ord_026"], monthId: "2026-10" });
  });

  it("8. maker payouts mpo_01 to mpo_03, paid Oct 2, with the held shares", () => {
    expect(makerPayouts.map((m) => m.id)).toEqual(["mpo_01", "mpo_02", "mpo_03"]);
    const held = Object.fromEntries(makerPayouts.map((m) => [m.makerId, m.heldCents]));
    expect(held).toEqual({ mkr_01: 9500, mkr_02: 8000, mkr_03: 16500 });
    expect(makerPayouts.reduce((a, m) => a + m.heldCents, 0)).toBe(34000);
    expect(getById<MakerPayout>("mpo_01")?.orderIds).toContain("ord_001");
    expect(makerStatements.every((s) => s.payoutDate === "2026-10-02")).toBe(true);
    for (const m of makerPayouts) {
      expect(m.status).toBe("proposed");
      expect(bankTxns.find((t) => t.refId === m.id)).toMatchObject({ direction: "out", amountCents: m.amountCents, date: "2026-10-02" });
      expect(ofType("payout.sent").find((e) => e.payload.makerPayoutId === m.id)?.payload).toEqual({
        makerPayoutId: m.id,
        makerId: m.makerId,
        amountCents: m.amountCents,
        date: "2026-10-02",
      });
    }
    // Paid on Oct 2, then the month closes with that maker pay in its books.
    const paidAt = Math.max(...ofType("payout.sent").map((e) => e.at));
    const closed = ofType("month.closed")[0];
    expect(closed.at).toBeGreaterThan(paidAt);
    expect(closed.payload.makerPayCents).toBe(makerPayouts.reduce((a, m) => a + m.amountCents, 0));
    expect(closed.payload.heldCents).toBe(34000);
    const mst01 = makerStatements.find((s) => s.id === "mst_01");
    expect(mst01?.lines.find((l) => l.orderId === "ord_001")?.makerShareCents).toBe(13448);
  });

  it("9. approvals apr_01 and apr_02, proposed by Cindy, overLimit over 50000", () => {
    const [a1, a2] = approvals;
    expect(a1).toMatchObject({ id: "apr_01", kind: "follow_up", amountCents: 34000, subjectIds: ["fup_01"], proposedBy: "cindy", status: "pending", decisionDate: "2026-10-01", overLimit: false });
    expect(a2).toMatchObject({ id: "apr_02", kind: "maker_payouts", subjectIds: ["mpo_01", "mpo_02", "mpo_03"], proposedBy: "cindy", status: "pending", decisionDate: "2026-10-01" });
    const subjects = a2.subjectIds.map((id) => getById<MakerPayout>(id) as MakerPayout);
    expect(a2.overLimit).toBe(subjects.some((m) => m.amountCents > studio.payoutLimitCents));
    expect(studio.payoutLimitCents).toBe(50000);
    // Cindy never approves: every grant is by the owner.
    expect(ofType("approval.granted").every((e) => e.payload.by === "own_01")).toBe(true);
  });

  it("10. the proof panel scores 4 of 4", () => {
    const p = ofType("proof.scored");
    expect(p).toHaveLength(1);
    expect(p[0].payload).toEqual({
      caught: 4,
      total: 4,
      results: answerKey.map((e) => ({ errorId: e.id, caught: true })),
    });
    expect(answerKey.map((e) => e.id)).toEqual(["err_01", "err_02", "err_03", "err_04"]);
  });
});
