// The impact numbers for September. makerShareBps and daysCloseToPayout are computed from the
// dataset. The other two are estimates, shown as such.
import type { Impact } from "../core/types";
import { closeDate, makerPayoutDate, orders } from "./month";
import { dayIndex, sum } from "./util";

const cindiaOrders = orders.filter((o) => o.channelId === "ch_cindia");

/** Maker share over Cindia sales, weighted by sale, in basis points, rounded half up. */
const makerShareBps = Math.floor(
  (sum(cindiaOrders.map((o) => o.makerShareCents)) * 10000 * 2 + sum(cindiaOrders.map((o) => o.grossCents))) /
    (2 * sum(cindiaOrders.map((o) => o.grossCents))),
);

export const impact: Impact = {
  id: "imp_2026_09",
  makerShareBps,
  // Sep 30 close to Oct 2 payout.
  daysCloseToPayout: dayIndex(makerPayoutDate) - dayIndex(closeDate),
  // ESTIMATE: illustrative, waiting for Gordon's numbers from the studio.
  daysCloseToPayoutBefore: 45,
  // ESTIMATE: illustrative, waiting for Gordon's numbers from the studio.
  bookkeepingHoursSaved: 12,
  estimate: true,
};
