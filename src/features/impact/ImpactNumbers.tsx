// The three impact numbers: maker share of each Cindia sale, days from close to payout (with the
// before value beside it), and bookkeeping hours saved. They count up on the player's clock when
// impact.updated arrives, and render only from its payload. Before it, each shows a dash.
import type { CSSProperties, ReactNode } from "react";
import type { Payloads } from "../../core/events";
import { CountUp } from "./CountUp";
import { formatBps } from "./formatBps";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export type ImpactPayload = Payloads["impact.updated"];

export interface ImpactNumbersProps {
  /** The store's impact.latest: the impact.updated payload, or null before it. */
  impact: ImpactPayload | null;
  lang: Lang;
  /** Rendered inside each of the three number blocks (the panel passes T2's EstimateLabel). */
  estimateLabel?: ReactNode;
}

const blockStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-4)",
  paddingBottom: "var(--c-space-16)",
  borderBottom: "1px solid var(--c-color-line)",
};

const labelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--c-space-8)",
  fontSize: "var(--c-text-14)",
  fontWeight: 500,
  color: "var(--c-color-ink-soft)",
};

const numberStyle: CSSProperties = {
  fontSize: "var(--c-text-36)",
  lineHeight: "var(--c-leading-heading)",
  fontWeight: 600,
  color: "var(--c-color-ink)",
  fontVariantNumeric: "tabular-nums",
};

const unitStyle: CSSProperties = {
  fontSize: "var(--c-text-18)",
  fontWeight: 500,
  marginLeft: "var(--c-space-8)",
};

const hintStyle: CSSProperties = {
  fontSize: "var(--c-text-14)",
  color: "var(--c-color-ink-soft)",
  fontVariantNumeric: "tabular-nums",
};

const whole = (n: number) => String(Math.round(n));
const percent = (n: number) => formatBps(Math.round(n));

interface BlockProps {
  testId: string;
  label: string;
  estimateLabel?: ReactNode;
  children: ReactNode;
}

function NumberBlock({ testId, label, estimateLabel, children }: BlockProps) {
  return (
    <div data-testid={testId} style={blockStyle}>
      <div style={labelStyle}>
        <span>{label}</span>
        {estimateLabel}
      </div>
      {children}
    </div>
  );
}

export function ImpactNumbers({ impact, lang, estimateLabel }: ImpactNumbersProps) {
  const dash = t(UI.dash, lang);
  const ready = impact !== null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)" }}>
      <NumberBlock testId="impact-maker-share" label={t(GLOSSARY.makerShare, lang)} estimateLabel={estimateLabel}>
        <div style={numberStyle}>
          <CountUp value={impact?.makerShareBps ?? null} format={percent} placeholder={dash} />
        </div>
        {ready && <div style={hintStyle}>{t(UI.makerShareHint, lang)}</div>}
      </NumberBlock>

      <NumberBlock testId="impact-days-to-payout" label={t(GLOSSARY.daysToPayout, lang)} estimateLabel={estimateLabel}>
        <div style={numberStyle}>
          <CountUp value={impact?.daysCloseToPayout ?? null} format={whole} placeholder={dash} />
          {ready && <span style={unitStyle}>{t(UI.days, lang)}</span>}
        </div>
        {ready && (
          <div style={hintStyle} data-role="before">
            {t(UI.before, lang)}
            {t(UI.colon, lang)}
            {impact.daysCloseToPayoutBefore}
            {lang === "en" ? " " : ""}
            {t(UI.days, lang)}
          </div>
        )}
      </NumberBlock>

      <NumberBlock testId="impact-hours-saved" label={t(GLOSSARY.hoursSaved, lang)} estimateLabel={estimateLabel}>
        <div style={numberStyle}>
          <CountUp value={impact?.bookkeepingHoursSaved ?? null} format={whole} placeholder={dash} />
          {ready && <span style={unitStyle}>{t(UI.hours, lang)}</span>}
        </div>
        {ready && <div style={hintStyle}>{t(UI.perMonth, lang)}</div>}
      </NumberBlock>
    </div>
  );
}
