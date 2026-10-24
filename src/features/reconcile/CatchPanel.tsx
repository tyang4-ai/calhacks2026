// F-reconcile T3: the catch. Appears once flag.raised lands: the kit Flag with expected, paid and
// short from the payload, the three evidence cards, and Cindy's explanation once flag.explained lands.
import type { CSSProperties } from "react";
import { useCindia } from "../../core";
import { Flag, Money, formatCents } from "../../ui";
import { EvidenceTrio } from "./EvidenceTrio";
import { UI, shortReason, t } from "./strings";

export interface CatchPanelProps {
  lang: "en" | "zh";
}

const stackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-12)",
};

const figuresStyle: CSSProperties = {
  display: "flex",
  gap: "var(--c-space-24)",
  flexWrap: "wrap",
  fontSize: "var(--c-text-14)",
};

const figureStyle: CSSProperties = {
  display: "flex",
  gap: "var(--c-space-8)",
  alignItems: "baseline",
};

const labelStyle: CSSProperties = { color: "var(--c-color-ink-soft)" };

const explanationTitleStyle: CSSProperties = {
  fontSize: "var(--c-text-14)",
  color: "var(--c-color-ink-soft)",
  marginBottom: "var(--c-space-4)",
};

export function CatchPanel({ lang }: CatchPanelProps) {
  const flag = useCindia((s) => {
    const id = s.month.flagIds[0];
    return id !== undefined ? s.month.flags[id] : undefined;
  });
  if (!flag) return null;

  const shortCents = Math.abs(flag.deltaCents);

  return (
    <section style={stackStyle} aria-label={t(UI.catchTitle, lang)}>
      <Flag testId="reconcile-flag" reason={t(shortReason(formatCents(shortCents)), lang)}>
        <div style={figuresStyle}>
          <span style={figureStyle}>
            <span style={labelStyle}>{t(UI.expected, lang)}</span>
            <Money cents={flag.expectedCents} />
          </span>
          <span style={figureStyle}>
            <span style={labelStyle}>{t(UI.paid, lang)}</span>
            <Money cents={flag.actualCents} />
          </span>
          <span style={figureStyle}>
            <span style={labelStyle}>{t(UI.short, lang)}</span>
            <Money cents={shortCents} tone="out" />
          </span>
        </div>
      </Flag>
      <EvidenceTrio flag={flag} lang={lang} />
      <div>
        <div style={explanationTitleStyle}>{t(UI.explanationTitle, lang)}</div>
        {flag.explanation ? (
          <p data-testid="reconcile-explanation" style={{ margin: 0 }}>
            {flag.explanation[lang]}
          </p>
        ) : (
          <p style={{ ...labelStyle, margin: 0 }}>{t(UI.explaining, lang)}</p>
        )}
      </div>
    </section>
  );
}
