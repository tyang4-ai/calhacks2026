// Turns an approval into what its card shows: the kind's title, one summary line, the amount and
// the over-limit mark. Every figure comes from src/mock through getById, never typed in.
import type { Approval, Flag, MakerPayout, Text } from "../../core/types";
import { getById } from "../../mock";
import { formatCents } from "../../ui";
import { UI, payoutsSummary, shortPaymentSummary } from "./strings";

export interface ApprovalSummary {
  approvalId: string;
  kind: "follow_up" | "maker_payouts";
  title: Text;
  summary: Text;
  amountCents?: number;
  overLimit: boolean;
}

/** The flag whose short amount the follow-up asks the gallery for (data-model.md). */
const SHORT_PAYMENT_FLAG_ID = "flg_01";

export function summarizeApproval(approvalId: string): ApprovalSummary | undefined {
  const approval = getById<Approval>(approvalId);
  if (!approval) return undefined;

  if (approval.kind === "follow_up") {
    const flag = getById<Flag>(SHORT_PAYMENT_FLAG_ID);
    const shortCents = flag?.deltaCents ?? approval.amountCents ?? 0;
    return {
      approvalId,
      kind: approval.kind,
      title: UI.followUpTitle,
      summary: shortPaymentSummary(formatCents(shortCents)),
      amountCents: approval.amountCents,
      overLimit: approval.overLimit,
    };
  }

  const payouts = approval.subjectIds
    .map((id) => getById<MakerPayout>(id))
    .filter((p): p is MakerPayout => Boolean(p));
  const totalCents = payouts.reduce((acc, p) => acc + p.amountCents, 0);
  return {
    approvalId,
    kind: approval.kind,
    title: UI.payoutsTitle,
    summary: payoutsSummary(payouts.length, formatCents(totalCents)),
    amountCents: approval.amountCents,
    overLimit: approval.overLimit,
  };
}
