// The answer key: exactly the four planted errors in data-model.md, with the real record IDs from
// month.ts and what a correct matcher reports for each. The proof panel and B03 score against it.
import type { PlantedError, Text } from "../core/types";
import { galleryContract } from "./channels";
import { bundledPayout, galleryDeposit, galleryFlag, galleryStatement, latePayout, matchForPayout, refundPayout, refunds } from "./month";

const refund = refunds[0];

export const answerKey: PlantedError[] = [
  {
    // The gallery's statement charges 5000 bps against the contract's 4000, and the bank shows the
    // statement's short net. Which record to trust comes later, in flag.explained, and isn't scored.
    id: "err_01",
    kind: "short_payment",
    recordIds: [galleryContract.id, galleryStatement.id, galleryDeposit.id],
    expected: {
      event: "flag.raised",
      kind: "short_payment",
      expectedCents: galleryFlag.expectedCents,
      actualCents: galleryFlag.actualCents,
      deltaCents: galleryFlag.deltaCents,
      trustRecordId: galleryFlag.trustRecordId,
    },
  },
  {
    // One site payout covers three orders, so no single order equals it.
    id: "err_02",
    kind: "bundled",
    recordIds: [bundledPayout.id, ...bundledPayout.orderIds],
    expected: { event: "match.made", kind: "bundled", recordIds: matchForPayout(bundledPayout.id).recordIds },
  },
  {
    // A refund is taken out of the next site payout, so that payout is short of its order by the refund.
    id: "err_03",
    kind: "refund_netted",
    recordIds: [refund.id, refund.orderId, refundPayout.id],
    expected: { event: "match.made", kind: "refund_netted", recordIds: matchForPayout(refundPayout.id).recordIds },
  },
  {
    // The site payout for the month's last two orders lands on Oct 2, after the close.
    id: "err_04",
    kind: "carried_over",
    recordIds: [latePayout.id, ...latePayout.orderIds],
    expected: {
      event: "match.made",
      kind: "carried_over",
      recordIds: matchForPayout(latePayout.id).recordIds,
      intoMonthId: "2026-10",
    },
  },
];

/** Why each planted error is there, for the proof panel. */
export const answerKeyNotes: Record<string, Text> = {
  err_01: {
    en: "The gallery charged 50% commission instead of the contract's 40%, and paid short by the difference.",
    zh: "画廊按50%而非合同约定的40%收取佣金，少付了差额。",
  },
  err_02: {
    en: "One card-processor payout covers three orders, so it matches no single order.",
    zh: "一笔收单结款合并了三笔订单，与任何单笔订单都对不上。",
  },
  err_03: {
    en: "A refund was taken out of the next payout, so that payout is less than its order.",
    zh: "一笔退款从下一次结款中扣除，该结款少于其订单金额。",
  },
  err_04: {
    en: "The last payout of the month lands on Oct 2, after the close, and counts in October.",
    zh: "本月最后一笔结款10月2日才到账，晚于月结，计入10月。",
  },
};
