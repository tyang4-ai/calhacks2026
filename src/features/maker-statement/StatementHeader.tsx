// M-maker-statement T2: the top of the maker's page (maker-statement-header), across the main
// column. On the left her mark, her name (her nativeName under it only when she has one, as written),
// her community with the Demo data badge, then the month, the payout date and "paid" once
// payout.sent arrives for her payout. On the right "This month's income" with the payload's total,
// the largest text on the page. Every figure comes from the statement.issued payload, never from
// mst_01, because a live B10 recomputes them. Before the statement arrives only the maker shows.
import { useCallback, useState, type CSSProperties } from "react";
import type { Payloads } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Community, MakerStatement, Person } from "../../core/types";
import { getById } from "../../mock";
import { Badge, MakerMark, Money, Toast, formatDate, formatMonth, usePlayerTime } from "../../ui";
import { GLOSSARY, UI, makerAt, t, type Lang } from "./strings";
import "./statementToast.css";

export interface StatementHeaderProps {
  makerId: string;
  lang: Lang;
  /** Unset until statement.issued arrives for this maker: then only the maker shows. */
  statement?: Payloads["statement.issued"];
  /** v1's 390 px phone column on the Phase A stage: everything stacks. */
  compact?: boolean;
}

/**
 * How long the paid toast stays up, in player time. statement.issued lands early in the maker's beat
 * (0.4 s in), so the toast shows for a moment and is gone well before the beat ends, when the held
 * note is the point of the frame.
 */
const TOAST_MS = 1800;

const metaRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  columnGap: "var(--c-space-12)",
  rowGap: "var(--c-space-4)",
  fontSize: "var(--c-text-16)",
};

export function StatementHeader({ makerId, lang, statement, compact = false }: StatementHeaderProps) {
  const maker = getById<Person>(makerId);
  const community = maker?.communityId ? getById<Community>(maker.communityId) : undefined;
  const storeMonthId = useCindia(useCallback((s: CindiaState) => s.month.monthId, []));
  const monthId = (statement ? getById<MakerStatement>(statement.makerStatementId)?.monthId : undefined) ?? storeMonthId;
  const paid = useCindia(
    useCallback(
      (s: CindiaState) =>
        statement !== undefined &&
        Object.values(s.approvals.payouts).some((p) => p.makerId === makerId),
      [makerId, statement],
    ),
  );

  // The toast shows the first time paid shows for this statement, for TOAST_MS of player time. A
  // seek or reset that takes paid away (the statement or the payout not issued yet) starts it over,
  // as v1's header did when it unmounted with the statement.
  const now = usePlayerTime();
  const [paidSeenAt, setPaidSeenAt] = useState<number | null>(null);
  if (paid && paidSeenAt === null) setPaidSeenAt(now);
  if (!paid && paidSeenAt !== null) setPaidSeenAt(null);
  const showToast = paid && paidSeenAt !== null && now >= paidSeenAt && now - paidSeenAt < TOAST_MS;

  const headingFont = lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)";
  const name = maker ? t(maker.name, lang) : makerId;
  // The phone column is narrow: its meta lines drop to 14 px and the Demo data badge joins the name.
  const meta: CSSProperties = compact ? { ...metaRow, fontSize: "var(--c-text-14)" } : metaRow;

  return (
    <header
      data-testid="maker-statement-header"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "flex-start",
        columnGap: "var(--c-space-24)",
        rowGap: "var(--c-space-16)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: compact ? "var(--c-space-12)" : "var(--c-space-16)", minWidth: 0, flex: "1 1 280px" }}>
        {maker ? <MakerMark char={maker.surnameChar} label={name} size={compact ? 40 : 48} /> : null}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--c-space-8)" }}>
            <span style={{ fontSize: compact ? "var(--c-text-21)" : "var(--c-text-24)", fontFamily: headingFont, fontWeight: 600, lineHeight: "var(--c-leading-heading)" }}>
              {name}
            </span>
            {compact && community ? <Badge variant="demo" /> : null}
          </div>
          {maker?.nativeName ? (
            // Shown exactly as written, never translated, and only when the person has one.
            <div data-testid="maker-statement-native-name" lang="und" style={{ fontSize: "var(--c-text-16)" }}>
              {maker.nativeName}
            </div>
          ) : null}
          {community ? (
            <div style={{ ...meta, color: "var(--c-color-ink-soft)" }}>
              <span>{makerAt(community.name, lang)}</span>
              {compact ? null : <Badge variant="demo" />}
            </div>
          ) : null}
          <div style={meta}>
            {monthId ? <span style={{ color: "var(--c-color-ink-soft)" }}>{formatMonth(monthId, lang)}</span> : null}
            {statement ? (
              <span style={{ display: "inline-flex", alignItems: "baseline", flexWrap: "wrap", columnGap: "var(--c-space-8)" }}>
                <span style={{ color: "var(--c-color-ink-soft)" }}>{t(GLOSSARY.payoutDate, lang)}</span>
                <span data-testid="maker-statement-payout-date">{formatDate(statement.payoutDate, lang)}</span>
                {paid ? (
                  <span data-testid="maker-statement-paid" style={{ color: "var(--c-color-jade)", fontWeight: 600 }}>
                    {t(GLOSSARY.paid, lang)}
                  </span>
                ) : (
                  <span style={{ color: "var(--c-color-amber)" }}>{t(UI.onTheWay, lang)}</span>
                )}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {statement ? (
        <div data-testid="maker-statement-total" style={{ flex: "0 0 auto", textAlign: compact ? "left" : "right" }}>
          <div style={{ fontSize: compact ? "var(--c-text-14)" : "var(--c-text-16)", color: "var(--c-color-ink-soft)" }}>{t(GLOSSARY.makerStatement, lang)}</div>
          <Money cents={statement.totalCents} style={{ fontSize: "var(--c-text-48)", lineHeight: 1.1, fontFamily: headingFont, display: "block" }} />
        </div>
      ) : null}

      {showToast ? (
        // display: contents keeps the kit toast's containing block (the panel's face), and the class
        // moves it to the top: across the top on the phone column, into the empty left of the
        // panel's head row on the desktop page, so it covers nothing.
        <div className={`maker-statement-toast${compact ? "" : " maker-statement-toast--desktop"}`} style={{ display: "contents" }}>
          <Toast tone="jade">{t(UI.paidToast, lang)}</Toast>
        </div>
      ) : null}
    </header>
  );
}
