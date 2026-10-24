// One approval Cindy asked for: its title, summary line, amount, over-limit mark, status and the
// line saying Cindy proposed it and only the owner can approve it. Room below for the details (T2)
// and the decision bar (T3). Once granted, the seal sits in the header beside the title. A decided
// card that is no longer the newest renders compact: title, figure, status and a small seal.
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
  /**
   * Decided and no longer the newest card: one or two lines with the title, the key figure, the
   * status and the small seal (passed in as decision), so the newer card keeps the phone's room.
   */
  compact?: boolean;
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

export function ApprovalCard({ approvalId, lang, details, decision, compact = false }: ApprovalCardProps) {
  const status = useCindia((s) => s.approvals.items[approvalId]?.status) ?? "pending";
  const followUpSent = useCindia((s) => Object.values(s.approvals.followUps).some((f) => f.approvalId === approvalId && f.sent));
  const summary = summarizeApproval(approvalId);
  const headingFont = lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)";

  if (compact) {
    return (
      <article
        data-testid={`approvals-item-${approvalId}`}
        data-compact="true"
        lang={lang}
        style={{
          position: "relative",
          borderTop: "1px solid var(--c-color-line)",
          borderBottom: "1px solid var(--c-color-line)",
          padding: "var(--c-space-8) 0",
          display: "flex",
          alignItems: "center",
          gap: "var(--c-space-12)",
          color: "var(--c-color-ink)",
          fontSize: "var(--c-text-14)",
        }}
      >
        {decision}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: headingFont,
              fontSize: "var(--c-text-16)",
              fontWeight: 600,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {summary ? t(summary.title, lang) : approvalId}
          </h3>
          <span style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)", lineHeight: 1.3 }}>
            {t(GLOSSARY.proposedByCindy, lang)}
          </span>
        </div>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--c-space-4)" }}>
          {summary?.amountCents !== undefined && (
            <span data-part="amount">
              <Money cents={summary.amountCents} style={{ fontSize: "var(--c-text-16)", fontWeight: 600 }} />
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: "var(--c-space-4)" }}>
            <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_LABEL[status], lang)}</Badge>
            {followUpSent && <Badge variant="jade">{t(GLOSSARY.sent, lang)}</Badge>}
          </span>
        </div>
      </article>
    );
  }

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
      <header style={{ display: "flex", alignItems: "center", gap: "var(--c-space-12)" }}>
        {/* Once granted, the seal lands here beside the title, in view with the card's figures. */}
        {status === "granted" && decision}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
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
        </div>
      </header>

      {summary && <p style={{ margin: 0, lineHeight: 1.5 }}>{t(summary.summary, lang)}</p>}

      <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
        {t(GLOSSARY.proposedByCindy, lang)}
      </p>

      {details}
      {status !== "granted" && decision}
    </article>
  );
}
