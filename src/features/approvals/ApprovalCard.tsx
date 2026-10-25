// One approval Cindy asked for, as a card in the list: the kind's tag and the approval's ID, its
// title and amount, its summary, the held amount or the over-limit mark when they apply, the line
// saying Cindy proposed it and only the owner can approve it, and its status. While it's pending the
// owner decides on the card itself. Once granted, the owner's small seal sits at the card's top right
// (approvals-seal-<approvalId>) and the status line carries the decision's date, so the date shows
// even where a small seal leaves it out. Clicking the card selects it.
import type { MouseEvent } from "react";
import { useCindia } from "../../core/store";
import type { CindiaState } from "../../core/state";
import type { ApprovalStatus } from "../../core/types";
import { Badge, Money, formatCents, formatMonthDay, type BadgeVariant } from "../../ui";
import { payoutsOf, recordFromState, summarizeApproval } from "./approvalSummary";
import { DecisionBar, OwnerSeal } from "./DecisionBar";
import { isLiveHit } from "./selection";
import styles from "./approvals.module.css";
import { GLOSSARY, UI, decidedLine, heldLine, t, type Lang } from "./strings";

export interface ApprovalCardProps {
  approvalId: string;
  lang: Lang;
  selected?: boolean;
  onSelect?: (approvalId: string) => void;
  /** Hits whose counterfeit.flagged came from a live scan: a report on one waits for the owner's own check. */
  liveHits?: string[];
}

/** The seal's size on a card: 10月1日 fits at 14 px from 62 px up (the kit's Seal), so the date shows in both languages. */
export const CARD_SEAL = 64;

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

/** Whether everything the approval sent out has gone: its follow-up, or all its payouts. */
function selectSent(s: CindiaState, approvalId: string): boolean {
  const record = recordFromState(s, approvalId);
  if (!record) return false;
  if (record.kind === "maker_payouts") {
    const payouts = payoutsOf(record);
    return payouts.length > 0 && payouts.every((p) => Boolean(s.approvals.payouts[p.id]));
  }
  return Object.values(s.approvals.followUps).some((f) => f.approvalId === approvalId && f.sent);
}

const softSmall = { fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)", lineHeight: 1.35 } as const;

export function ApprovalCard({ approvalId, lang, selected = false, onSelect, liveHits = [] }: ApprovalCardProps) {
  const item = useCindia((s) => s.approvals.items[approvalId]);
  const reportOn = useCindia((s) => {
    const record = recordFromState(s, approvalId);
    return record?.kind === "report_listing" ? record.subjectIds[0] : undefined;
  });
  const needsCheck = reportOn !== undefined && isLiveHit(reportOn, liveHits);
  const summary = useCindia((s) => summarizeApproval(approvalId, s));
  const sent = useCindia((s) => selectSent(s, approvalId));
  const status: ApprovalStatus = item?.status ?? "pending";
  const headingFont = lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)";

  const select = (e: MouseEvent) => {
    if (e.defaultPrevented) return;
    onSelect?.(approvalId);
  };

  return (
    <article
      data-testid={`approvals-item-${approvalId}`}
      data-status={status}
      aria-current={selected ? "true" : undefined}
      lang={lang}
      onClick={select}
      style={{
        position: "relative",
        flexShrink: 0,
        background: "var(--c-color-paper)",
        border: selected ? "2px solid var(--c-color-ink)" : "1px solid var(--c-color-line)",
        borderRadius: "var(--c-radius-panel)",
        // The border grows by a pixel when selected, so the padding gives that pixel back.
        padding: selected ? "15px 19px" : "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "var(--c-space-8)",
        color: "var(--c-color-ink)",
        fontSize: "var(--c-text-16)",
        cursor: onSelect ? "pointer" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--c-space-16)" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--c-space-8)" }}>
            <span style={{ ...softSmall, fontWeight: 600 }}>{summary ? t(summary.tag, lang) : ""}</span>
            <span style={{ ...softSmall, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{approvalId}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--c-space-12)", flexWrap: "wrap" }}>
            <h3
              style={{
                margin: 0,
                minWidth: 0,
                fontFamily: headingFont,
                fontSize: "var(--c-text-18)",
                fontWeight: 600,
                lineHeight: 1.3,
              }}
            >
              {/* The title is the card's keyboard way in: a button that selects the card. */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onSelect?.(approvalId);
                }}
                className={styles.titleButton}
              >
                {summary ? t(summary.title, lang) : approvalId}
              </button>
            </h3>
            {summary?.amountCents !== undefined && (
              <span data-part="amount" style={{ flexShrink: 0 }}>
                <Money cents={summary.amountCents} style={{ fontSize: "var(--c-text-24)", fontWeight: 700 }} />
              </span>
            )}
          </div>
        </div>
        <div style={{ width: CARD_SEAL, height: CARD_SEAL, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {status === "granted" && item ? (
            <OwnerSeal
              testId={`approvals-seal-${approvalId}`}
              lang={lang}
              size={CARD_SEAL}
              date={item.date}
              decidedAt={item.decidedAt}
              byUser={item.source === "user"}
            />
          ) : status === "declined" ? null : (
            <span
              aria-hidden="true"
              style={{
                width: CARD_SEAL - 2,
                height: CARD_SEAL - 2,
                border: "1px dashed var(--c-color-line)",
                color: "var(--c-color-ink-soft)",
                fontSize: "var(--c-text-14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {t(UI.sealPlaceholder, lang)}
            </span>
          )}
        </div>
      </div>

      {summary ? (
        <p
          title={t(summary.summary, lang)}
          style={{
            margin: 0,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {t(summary.summary, lang)}
          {summary.extra && <span style={{ color: "var(--c-color-ink-soft)" }}> {t(summary.extra, lang)}</span>}
        </p>
      ) : (
        <p style={{ margin: 0, color: "var(--c-color-ink-soft)" }}>{t(UI.noDetails, lang)}</p>
      )}

      {(summary?.overLimit || (summary?.heldCents ?? 0) > 0) && (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--c-space-8)" }}>
          {summary?.overLimit && <Badge variant="seal">{t(GLOSSARY.overLimit, lang)}</Badge>}
          {summary?.heldCents !== undefined && summary.heldCents > 0 && (
            <span data-part="held-total" style={{ fontSize: "var(--c-text-14)", fontWeight: 600, color: "var(--c-color-amber)" }}>
              {t(heldLine(formatCents(summary.heldCents)), lang)}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--c-space-8)" }}>
        <span style={softSmall}>{t(GLOSSARY.proposedByCindy, lang)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: "var(--c-space-8)" }}>
          <Badge variant={STATUS_VARIANT[status]}>
            {t(decidedLine(STATUS_LABEL[status], status === "granted" && item?.date ? formatMonthDay(item.date, lang) : undefined), lang)}
          </Badge>
          {status === "granted" && sent && <Badge variant="jade">{t(GLOSSARY.sent, lang)}</Badge>}
        </span>
      </div>

      {status === "pending" && <DecisionBar approvalId={approvalId} lang={lang} needsCheck={needsCheck} />}
      {status === "declined" && item?.reason && (
        <span style={softSmall}>
          {t(UI.reasonLabel, lang)}: {t(item.reason, lang)}
        </span>
      )}
    </article>
  );
}
