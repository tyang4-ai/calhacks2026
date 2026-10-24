// The answer key lists exactly err_01 to err_04, every record in it exists, and each error's
// records really show its problem.
import { describe, expect, it } from "vitest";
import { answerKey, galleryContract, getById, matches, monthTimeline } from "../../src/mock/index";
import type { BankTxn, ChannelPayout, Contract, Order, Refund, Statement } from "../../src/core/types";

const err = (id: string) => {
  const e = answerKey.find((x) => x.id === id);
  if (!e) throw new Error(`${id} missing`);
  return e;
};
const matchEvent = (recordIds: unknown) =>
  monthTimeline.events.find((e) => e.type === "match.made" && JSON.stringify((e.payload as { recordIds: string[] }).recordIds) === JSON.stringify(recordIds));

describe("answer key", () => {
  it("lists exactly the four planted errors with their kinds", () => {
    expect(answerKey.map((e) => [e.id, e.kind])).toEqual([
      ["err_01", "short_payment"],
      ["err_02", "bundled"],
      ["err_03", "refund_netted"],
      ["err_04", "carried_over"],
    ]);
  });

  it("every record ID in it exists", () => {
    for (const e of answerKey) {
      for (const id of e.recordIds) expect(getById(id), `${e.id} ${id}`).toBeDefined();
      const exp = e.expected as { recordIds?: string[] };
      for (const id of exp.recordIds ?? []) expect(getById(id), `${e.id} expected ${id}`).toBeDefined();
    }
  });

  it("err_01: contract 40%, statement 50%, bank 170000, delta 34000", () => {
    const e = err("err_01");
    const [ctrId, stmId, txnId] = e.recordIds;
    const ctr = getById<Contract>(ctrId) as Contract;
    const stm = getById<Statement>(stmId) as Statement;
    const txn = getById<BankTxn>(txnId) as BankTxn;
    expect(ctr.id).toBe(galleryContract.id);
    expect(stm.lines.every((l) => l.commissionBps > ctr.commissionBps)).toBe(true);
    const expected = stm.totalSaleCents - Math.floor((stm.totalSaleCents * ctr.commissionBps + 5000) / 10000);
    expect([expected, txn.amountCents, expected - txn.amountCents]).toEqual([204000, 170000, 34000]);
    expect(txn.amountCents).toBe(stm.totalNetCents);
    expect(e.expected).toEqual({ event: "flag.raised", kind: "short_payment", expectedCents: 204000, actualCents: 170000, deltaCents: 34000, trustRecordId: "ctr_gallery_01" });
    const raised = monthTimeline.events.find((x) => x.type === "flag.raised");
    expect(raised?.payload).toMatchObject({ kind: "short_payment", recordIds: e.recordIds, expectedCents: 204000, actualCents: 170000, deltaCents: 34000 });
    // Nothing else in the month is flagged.
    expect(monthTimeline.events.filter((x) => x.type === "flag.raised")).toHaveLength(1);
  });

  it("err_02: one payout equals the sum of three orders' settlements", () => {
    const e = err("err_02");
    const [payId, ...orderIds] = e.recordIds;
    const p = getById<ChannelPayout>(payId) as ChannelPayout;
    const os = orderIds.map((id) => getById<Order>(id) as Order);
    expect(orderIds).toEqual(["ord_015", "ord_016", "ord_017"]);
    expect(p.orderIds).toEqual(orderIds);
    expect(p.netCents).toBe(os.reduce((a, o) => a + o.grossCents - o.cardFeeCents, 0));
    for (const o of os) expect(p.netCents).not.toBe(o.grossCents - o.cardFeeCents);
    const exp = e.expected as { kind: string; recordIds: string[] };
    expect(exp.kind).toBe("bundled");
    expect(matches.filter((m) => m.kind === "bundled").map((m) => m.recordIds)).toEqual([exp.recordIds]);
    expect(matchEvent(exp.recordIds)?.payload).toMatchObject({ kind: "bundled" });
  });

  it("err_03: the refund is netted out of the next payout", () => {
    const e = err("err_03");
    const [rfdId, ordId, payId] = e.recordIds;
    const r = getById<Refund>(rfdId) as Refund;
    const p = getById<ChannelPayout>(payId) as ChannelPayout;
    expect(r.orderId).toBe(ordId);
    expect(getById<Order>(ordId)?.status).toBe("refunded");
    expect(r.nettedInPayoutId).toBe(p.id);
    expect(p.refundIds).toEqual([r.id]);
    const os = p.orderIds.map((id) => getById<Order>(id) as Order);
    expect(p.netCents).toBe(os.reduce((a, o) => a + o.grossCents - o.cardFeeCents, 0) - r.amountCents);
    const exp = e.expected as { kind: string; recordIds: string[] };
    expect(exp.kind).toBe("refund_netted");
    expect(exp.recordIds).toContain(p.id);
    expect(exp.recordIds).toContain(r.id);
    expect(matches.filter((m) => m.kind === "refund_netted").map((m) => m.recordIds)).toEqual([exp.recordIds]);
    expect(matchEvent(exp.recordIds)?.payload).toMatchObject({ kind: "refund_netted" });
  });

  it("err_04: the late payout lands after the close and carries into October", () => {
    const e = err("err_04");
    const [payId, ...orderIds] = e.recordIds;
    const p = getById<ChannelPayout>(payId) as ChannelPayout;
    expect(p.date > "2026-09-30").toBe(true);
    expect(orderIds).toEqual(["ord_025", "ord_026"]);
    for (const id of orderIds) expect((getById<Order>(id) as Order).date <= "2026-09-30").toBe(true);
    const exp = e.expected as { kind: string; recordIds: string[]; intoMonthId: string };
    expect(exp.kind).toBe("carried_over");
    expect(exp.intoMonthId).toBe("2026-10");
    expect(matches.filter((m) => m.kind === "carried_over").map((m) => m.recordIds)).toEqual([exp.recordIds]);
    expect(matchEvent(exp.recordIds)?.payload).toMatchObject({ kind: "carried_over", intoMonthId: "2026-10" });
  });

  it("every other payout matches one to one", () => {
    const planted = new Set(["bundled", "refund_netted", "carried_over"]);
    const rest = matches.filter((m) => !planted.has(m.kind));
    expect(rest.every((m) => m.kind === "one_to_one" && m.recordIds.length === 2)).toBe(true);
    expect(matches.length - rest.length).toBe(3);
  });
});
