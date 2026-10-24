// F-dashboard T2: one stat tile (a title, one big value, optional detail lines), and the three
// tiles the dashboard builds from it: cash, open flags and maker share.
import type { CSSProperties, ReactNode } from "react";
import { Money, ShareBar, formatBps, formatDate } from "../../ui";
import type { CashFigure, MakerShareFigure, OpenFlagsFigure } from "./figures";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface StatTileProps {
  testId: string;
  title: string;
  lang: Lang;
  /** The big value. Mark the number itself with data-role="value". */
  value: ReactNode;
  /** Lines under the value. */
  children?: ReactNode;
  /** A seal-red left rule, for tiles that report something needing attention. */
  rule?: "seal";
}

const tileStyle: CSSProperties = {
  boxSizing: "border-box",
  height: "100%",
  border: "1px solid var(--c-color-line)",
  borderRadius: 2,
  background: "var(--c-color-paper)",
  padding: 16,
  color: "var(--c-color-ink)",
};

function tileTitleStyle(lang: Lang): CSSProperties {
  return {
    margin: 0,
    fontFamily: lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)",
    fontSize: 16,
    fontWeight: 600,
    color: "var(--c-color-ink)",
  };
}

const detailStyle: CSSProperties = { margin: "6px 0 0", fontSize: 14, color: "var(--c-color-ink-soft)" };

export function StatTile({ testId, title, lang, value, children, rule }: StatTileProps) {
  const style: CSSProperties = rule === "seal" ? { ...tileStyle, borderLeft: "3px solid var(--c-color-seal)" } : tileStyle;
  return (
    <section data-testid={testId} style={style}>
      <h3 style={tileTitleStyle(lang)}>{title}</h3>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 600, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {children}
    </section>
  );
}

export function CashTile({ figure, lang }: { figure: CashFigure; lang: Lang }) {
  return (
    <StatTile
      testId="dashboard-tile-cash"
      title={t(UI.cashTitle, lang)}
      lang={lang}
      value={
        <span data-role="value">
          <Money cents={figure.balanceCents} />
        </span>
      }
    >
      <p style={detailStyle}>
        {t(GLOSSARY.balance, lang)} · {t(UI.asOf, lang)} <span data-role="as-of">{formatDate(figure.asOf, lang)}</span>
      </p>
    </StatTile>
  );
}

export function FlagsTile({ figure, lang }: { figure: OpenFlagsFigure; lang: Lang }) {
  const label = figure.count === 1 ? UI.openOne : UI.openMany;
  return (
    <StatTile
      testId="dashboard-tile-flags"
      title={t(UI.flagsTitle, lang)}
      lang={lang}
      rule="seal"
      value={
        <>
          <span data-role="value" style={{ color: "var(--c-color-seal)" }}>
            {figure.count}
          </span>{" "}
          <span style={{ fontSize: 16, fontWeight: 500 }}>{t(label, lang)}</span>
        </>
      }
    >
      <p style={detailStyle}>
        {t(GLOSSARY.flag, lang)}
        {t(UI.colon, lang)}
        {t(GLOSSARY.shortPayment, lang)}
      </p>
    </StatTile>
  );
}

export function MakerShareTile({ figure, lang }: { figure: MakerShareFigure; lang: Lang }) {
  const otherCents = figure.salesCents - figure.makerPayCents;
  return (
    <StatTile
      testId="dashboard-tile-maker-share"
      title={t(GLOSSARY.makerShare, lang)}
      lang={lang}
      value={
        <span data-role="value">
          <Money cents={figure.makerPayCents} />
        </span>
      }
    >
      <p style={detailStyle}>
        <span data-role="share" style={{ color: "var(--c-color-ink)", fontWeight: 600 }}>
          {formatBps(figure.shareBps)}
        </span>{" "}
        {t(UI.ofSales, lang)} (<Money cents={figure.salesCents} />)
      </p>
      <div style={{ marginTop: 12 }}>
        <ShareBar
          parts={[
            { kind: "maker", label: t(GLOSSARY.makerPay, lang), cents: figure.makerPayCents },
            { kind: "other", label: t(GLOSSARY.sales, lang), cents: otherCents },
          ]}
          compact
        />
      </div>
      <p style={detailStyle}>
        {t(GLOSSARY.held, lang)}
        {t(UI.colon, lang)}
        <span data-role="held">
          <Money cents={figure.heldCents} />
        </span>
      </p>
    </StatTile>
  );
}
