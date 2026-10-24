// The top of the maker's statement: her mark and name, the month, 本月收入 with the payload's total,
// the payout date, and "paid" once payout.sent arrives for her. Every figure comes from the
// statement.issued payload, never from mst_01, because a live B10 recomputes them.
import { useCallback, useState, type CSSProperties } from "react";
import type { Payloads } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { MakerStatement, Person } from "../../core/types";
import { getById } from "../../mock";
import { MakerMark, Money, Toast, formatDate, formatMonth, usePlayerTime } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface StatementHeaderProps {
  makerId: string;
  lang: Lang;
  statement: Payloads["statement.issued"];
}

/** How long the paid toast stays up, in player time. */
const TOAST_MS = 3000;

const whoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--c-space-12)",
  marginBottom: "var(--c-space-16)",
};

const labelStyle: CSSProperties = {
  fontSize: "var(--c-text-16)",
  color: "var(--c-color-ink-soft)",
  marginBottom: "var(--c-space-4)",
};

const dateRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "var(--c-space-8)",
  marginTop: "var(--c-space-12)",
  fontSize: "var(--c-text-16)",
};

export function StatementHeader({ makerId, lang, statement }: StatementHeaderProps) {
  const maker = getById<Person>(makerId);
  const storeMonthId = useCindia(useCallback((s: CindiaState) => s.month.monthId, []));
  const monthId = getById<MakerStatement>(statement.makerStatementId)?.monthId ?? storeMonthId;
  const paid = useCindia(
    useCallback((s: CindiaState) => Object.values(s.approvals.payouts).some((p) => p.makerId === makerId), [makerId]),
  );

  // The toast shows the first time this mount sees the payout, for TOAST_MS of player time.
  const now = usePlayerTime();
  const [paidSeenAt, setPaidSeenAt] = useState<number | null>(null);
  if (paid && paidSeenAt === null) setPaidSeenAt(now);
  const showToast = paid && paidSeenAt !== null && now >= paidSeenAt && now - paidSeenAt < TOAST_MS;

  const headingFont = lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)";

  return (
    <header>
      <div style={whoStyle}>
        {maker ? <MakerMark char={maker.surnameChar} label={t(maker.name, lang)} size={40} /> : null}
        <div>
          <div style={{ fontSize: "var(--c-text-18)", fontFamily: headingFont }}>{maker ? t(maker.name, lang) : makerId}</div>
          {monthId ? <div style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{formatMonth(monthId, lang)}</div> : null}
        </div>
      </div>

      <div data-testid="maker-statement-total">
        <div style={labelStyle}>{t(GLOSSARY.makerStatement, lang)}</div>
        <Money cents={statement.totalCents} style={{ fontSize: "var(--c-text-48)", lineHeight: 1.1, fontFamily: headingFont }} />
      </div>

      <div style={dateRowStyle}>
        <span style={{ color: "var(--c-color-ink-soft)" }}>{t(GLOSSARY.payoutDate, lang)}</span>
        <span data-testid="maker-statement-payout-date">{formatDate(statement.payoutDate, lang)}</span>
        {paid ? (
          <span data-testid="maker-statement-paid" style={{ color: "var(--c-color-jade)" }}>
            {t(GLOSSARY.paid, lang)}
          </span>
        ) : (
          <span style={{ color: "var(--c-color-amber)" }}>{t(UI.onTheWay, lang)}</span>
        )}
      </div>

      {showToast ? <Toast tone="jade">{t(UI.paidToast, lang)}</Toast> : null}
    </header>
  );
}
