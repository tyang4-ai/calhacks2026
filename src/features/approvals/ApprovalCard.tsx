// One approval Cindy asked for: its title, summary line, amount, over-limit mark, status and the
// line saying Cindy proposed it and only the owner can approve it. Room below for the details (T2)
// and the decision bar with the seal (T3), which lands on this card, so the root is relative.
import type { ReactNode } from "react";
import { useCindia } from "../../core/store";
import type { ApprovalStatus } from "../../core/types";
import { Badge, Money, type BadgeVariant } from "../../ui";
import { summarizeApproval } from "./approvalSummary";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface ApprovalCardProps {
  approvalId: string;
  lang: Lang;
  /** The card's details: FollowUpDraft or PayoutLines (T2). */
  details?: ReactNode;
  /** The decision bar and the seal (T3). */
  decision?: ReactNode;
}

const STATUS_LABEL = {
  pending: GLOSSARY.needsApproval,
  granted: GLOSSARY.approved,
  declined: GLOSSARY.declined,
} as const satisfies Record<ApprovalStatus, { en: string; zh: string }>;

const STATUS_VARIANT: Record<ApprovalStatus, BadgeVariant> = {
  pending: "amber",
  granted: "jade",
  declined: "neutral",
};

export function ApprovalCard({ approvalId, lang, details, decision }: ApprovalCardProps) {
  const status = useCindia((s) => s.approvals.items[approvalId]?.status) ?? "pending";
  const summary = summarizeApproval(approvalId);
  const headingFont = lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)";

  return (
    <article
      data-testid={`approvals-item-${approvalId}`}
      lang={lang}
      style={{
        position: "relative",
        borderTop: "1px solid var(--c-color-line)",
        borderBottom: "1px solid var(--c-color-line)",
        padding: "var(--c-space-16) 0",
        display: "flex",
        flexDirection: "column",
        gap: "var(--c-space-12)",
        color: "var(--c-color-ink)",
        fontSize: "var(--c-text-16)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--c-space-8)" }}>
          <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_LABEL[status], lang)}</Badge>
          {summary?.overLimit && <Badge variant="seal">{t(GLOSSARY.overLimit, lang)}</Badge>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--c-space-12)" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: headingFont,
              fontSize: "var(--c-text-18)",
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {summary ? t(summary.title, lang) : approvalId}
          </h3>
          {summary?.amountCents !== undefined && (
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
              <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(UI.amount, lang)}</span>
              <Money cents={summary.amountCents} style={{ fontSize: "var(--c-text-18)", fontWeight: 600 }} />
            </span>
          )}
        </div>
      </header>

      {summary && <p style={{ margin: 0, lineHeight: 1.5 }}>{t(summary.summary, lang)}</p>}

      <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
        {t(GLOSSARY.proposedByCindy, lang)}
      </p>

      {details}
      {decision}
    </article>
  );
}
