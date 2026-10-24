// F-reconcile T1: a match's kind label and its one short reason line. Amounts and dates come from
// the matched records through getById, formatted by the kit, never typed in.
import type { MatchState } from "../../core/state";
import type { ChannelPayout, MatchKind, Order, Refund } from "../../core/types";
import { getById } from "../../mock";
import { formatCents, formatDate, formatMonth } from "../../ui";
import { MATCH_KIND_LABELS, ONE_TO_ONE_REASON, bundledReason, carriedReason, refundReason, t } from "./strings";

export type MatchRecord =
  | { kind: "payout"; id: string; payout: ChannelPayout }
  | { kind: "order"; id: string; order: Order }
  | { kind: "refund"; id: string; refund: Refund }
  | { kind: "unknown"; id: string };

/** Sorts a match's record IDs into payouts, orders and refunds by their ID prefix. */
export function matchRecords(match: MatchState): MatchRecord[] {
  return match.recordIds.map((id): MatchRecord => {
    if (id.startsWith("pay_")) {
      const payout = getById<ChannelPayout>(id);
      if (payout) return { kind: "payout", id, payout };
    } else if (id.startsWith("ord_")) {
      const order = getById<Order>(id);
      if (order) return { kind: "order", id, order };
    } else if (id.startsWith("rfd_")) {
      const refund = getById<Refund>(id);
      if (refund) return { kind: "refund", id, refund };
    }
    return { kind: "unknown", id };
  });
}

/** The match's payout, the first payout among its records. */
export function matchPayout(match: MatchState): ChannelPayout | undefined {
  for (const r of matchRecords(match)) if (r.kind === "payout") return r.payout;
  return undefined;
}

export function matchKindLabel(kind: MatchKind, lang: "en" | "zh"): string {
  return t(MATCH_KIND_LABELS[kind], lang);
}

export function matchReason(match: MatchState, lang: "en" | "zh"): string {
  const records = matchRecords(match);
  const payout = matchPayout(match);
  switch (match.kind) {
    case "bundled": {
      const orderCount = records.filter((r) => r.kind === "order").length;
      return t(bundledReason(orderCount), lang);
    }
    case "refund_netted": {
      const refundCents = records.reduce((sum, r) => (r.kind === "refund" ? sum + r.refund.amountCents : sum), 0);
      return t(refundReason(formatCents(refundCents)), lang);
    }
    case "carried_over": {
      const monthId = match.intoMonthId ?? payout?.monthId ?? "";
      const date = payout ? formatDate(payout.date, lang) : "";
      return t(carriedReason(date, formatMonth(monthId, lang)), lang);
    }
    case "one_to_one":
    default:
      return t(ONE_TO_ONE_REASON, lang);
  }
}
