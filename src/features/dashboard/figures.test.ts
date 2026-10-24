import { describe, expect, it } from "vitest";
import type { Order } from "../../core/types";
import type { CindiaEvent } from "../../core/events";
import { initialState } from "../../core/state";
import { channels, demoTimeline, galleryFlag, getById, heldCents, ledger, makerPayCents, monthId, orders, refunds, salesCents } from "../../mock";
import { cash, makerShare, openFlags, revenueByChannel, revenueTotal } from "./figures";

const allEntryIds = ledger.map((e) => e.id);
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("revenueByChannel", () => {
  it("adds up to September's sales less the refund over the whole ledger", () => {
    const rows = revenueByChannel(allEntryIds);
    const expected = sumOf(orders.map((o) => o.grossCents)) - sumOf(refunds.map((r) => r.amountCents));
    expect(revenueTotal(rows)).toBe(expected);
    expect(revenueTotal(rows)).toBe(salesCents);
  });

  it("gives each channel the gross of its orders less refunds on its orders", () => {
    const rows = revenueByChannel(allEntryIds);
    for (const row of rows) {
      const gross = sumOf(orders.filter((o) => o.channelId === row.channelId).map((o) => o.grossCents));
      const refunded = sumOf(
        refunds.filter((r) => getById<Order>(r.orderId)?.channelId === row.channelId).map((r) => r.amountCents),
      );
      expect(row.cents).toBe(gross - refunded);
    }
  });

  it("returns three zero rows in channels order for no entries", () => {
    const rows = revenueByChannel([]);
    expect(rows.map((r) => r.channelId)).toEqual(channels.map((c) => c.id));
    expect(rows.map((r) => r.name)).toEqual(channels.map((c) => c.name));
    expect(rows.every((r) => r.cents === 0)).toBe(true);
  });

  it("ignores unknown IDs and IDs of non-ledger records", () => {
    const nonLedger = [orders[0].id, channels[0].id, "led_9999", "nope"];
    expect(revenueByChannel(nonLedger).every((r) => r.cents === 0)).toBe(true);
    expect(revenueByChannel([...nonLedger, ...allEntryIds])).toEqual(revenueByChannel(allEntryIds));
  });
});

describe("makerShare", () => {
  it("is null before the close", () => {
    expect(makerShare(null)).toBeNull();
  });

  it("returns the close figures and the share in basis points", () => {
    const fig = makerShare({ monthId, salesCents, feesCents: 0, makerPayCents, heldCents });
    expect(fig).not.toBeNull();
    expect(fig?.makerPayCents).toBe(makerPayCents);
    expect(fig?.salesCents).toBe(salesCents);
    expect(fig?.heldCents).toBe(heldCents);
    expect(fig?.shareBps).toBe(Math.round((makerPayCents * 10000) / salesCents));
  });

  it("rounds half up", () => {
    expect(makerShare({ monthId, salesCents: 20000, feesCents: 0, makerPayCents: 1, heldCents: 0 })?.shareBps).toBe(1);
    expect(makerShare({ monthId, salesCents: 0, feesCents: 0, makerPayCents: 0, heldCents: 0 })?.shareBps).toBe(0);
  });
});

describe("cash", () => {
  it("is null before any account.synced", () => {
    expect(cash(initialState().money)).toBeNull();
  });

  it("returns the latest synced account", () => {
    const synced = demoTimeline.events.find((e) => e.type === "account.synced") as
      | CindiaEvent<"account.synced">
      | undefined;
    expect(synced).toBeDefined();
    if (!synced) return;
    const { accountId, balanceCents, asOf } = synced.payload;
    const money = initialState().money;
    money.accounts = { [accountId]: { balanceCents, asOf, at: synced.at } };
    money.latestAccountId = accountId;
    expect(cash(money)).toEqual({ accountId, balanceCents, asOf, at: synced.at });
  });
});

describe("openFlags", () => {
  it("is null before any flag", () => {
    expect(openFlags(initialState().month)).toBeNull();
  });

  it("counts one raised flag", () => {
    const month = initialState().month;
    month.flags = {
      [galleryFlag.id]: {
        flagId: galleryFlag.id,
        kind: galleryFlag.kind,
        recordIds: galleryFlag.recordIds,
        expectedCents: galleryFlag.expectedCents,
        actualCents: galleryFlag.actualCents,
        deltaCents: galleryFlag.deltaCents,
        at: 500,
      },
    };
    month.flagIds = [galleryFlag.id];
    expect(openFlags(month)).toEqual({ count: 1, flagIds: [galleryFlag.id], firstAt: 500 });
  });
});
