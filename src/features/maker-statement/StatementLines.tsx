// F-maker-statement T2: each piece the maker sold this month and her share of it.
// Rendered from the statement.issued payload, never from mst_01, because a live B10 recomputes it.
import type { CSSProperties } from "react";
import type { Payloads } from "../../core/events";
import type { Piece } from "../../core/types";
import { getById } from "../../mock";
import { Money } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface StatementLinesProps {
  lang: Lang;
  lines: Payloads["statement.issued"]["lines"];
}

function bodyStyle(lang: Lang): CSSProperties {
  return {
    fontFamily: lang === "zh" ? "var(--c-font-body-zh)" : "var(--c-font-body)",
    lineHeight: lang === "zh" ? "var(--c-leading-body-zh)" : "var(--c-leading-body)",
    fontSize: "var(--c-text-16)",
    color: "var(--c-color-ink)",
  };
}

const headRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "var(--c-space-12)",
  fontSize: "var(--c-text-14)",
  color: "var(--c-color-ink-soft)",
  paddingBottom: "var(--c-space-4)",
  borderBottom: "1px solid var(--c-color-line)",
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "var(--c-space-12)",
  padding: "var(--c-space-8) 0",
  borderBottom: "1px solid var(--c-color-line)",
};

const amount: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

export function StatementLines({ lang, lines }: StatementLinesProps) {
  return (
    <section style={bodyStyle(lang)}>
      <div style={headRow} aria-hidden="true">
        <span>{t(UI.piecesSold, lang)}</span>
        <span>{t(GLOSSARY.makerShare, lang)}</span>
      </div>
      <ul
        data-testid="maker-statement-lines"
        aria-label={t(UI.linesLabel, lang)}
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {lines.map((line) => {
          const piece = getById<Piece>(line.pieceId);
          const title = piece ? t(piece.title, lang) : t(UI.unknownPiece, lang);
          return (
            <li key={line.orderId} data-testid={`maker-statement-line-${line.orderId}`} style={row}>
              <span style={{ minWidth: 0 }}>{title}</span>
              <Money cents={line.makerShareCents} tone="in" style={amount} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
