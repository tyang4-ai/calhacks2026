// Turns an approval into what its card shows: the kind's title, one summary line, the amount and
// the over-limit mark. Every figure comes from src/mock through getById, never typed in.
import type { Approval, ApprovalKind, Flag, MakerPayout, Text } from "../../core/types";
import { getById } from "../../mock";
import { formatCents } from "../../ui";
import { UI, payoutsSummary, shortPaymentSummary } from "./strings";

export interface ApprovalSummary {
  approvalId: string;
  kind: ApprovalKind;
  title: Text;
  summary: Text;
  amountCents?: number;
  overLimit: boolean;
}

/** The flag whose short amount the follow-up asks the gallery for (data-model.md). */
const SHORT_PAYMENT_FLAG_ID = "flg_01";

/**
 * Placeholder titles for the v2 kinds (I2-core fallout). M-approvals writes the real titles and
 * summaries. Plain words, English and Chinese, so a card for one of these never shows a blank.
 */
const PLACEHOLDER_TITLES: Record<Exclude<ApprovalKind, "follow_up" | "maker_payouts">, Text> = {
  listing_publish: { en: "Publish a listing", zh: "发布商品" },
  storefront_publish: { en: "Publish a storefront", zh: "发布店铺" },
  report_listing: { en: "Report a copied listing", zh: "举报仿冒商品" },
  milestone_release: { en: "Release a milestone payment", zh: "发放里程碑付款" },
  support_action: { en: "A support action", zh: "客服操作" },
};

/** The glossary's "proposed by Cindy" row, used as the placeholder summary for the v2 kinds. */
const PLACEHOLDER_SUMMARY: Text = {
  en: "Cindy proposed this. Only you can approve it.",
  zh: "Cindy提议，只有您能批准。",
};

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

  if (approval.kind === "maker_payouts") {
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

  return {
    approvalId,
    kind: approval.kind,
    title: PLACEHOLDER_TITLES[approval.kind],
    summary: PLACEHOLDER_SUMMARY,
    amountCents: approval.amountCents,
    overLimit: approval.overLimit,
  };
}
