// M-maker-statement T3: each piece the maker sold this month and her share of it, as a kit
// LedgerTable (maker-statement-lines) with three columns: the piece's title in the slot's language,
// the order's date, and her share, right-aligned. One row per payload line
// (maker-statement-line-<orderId>). Rendered from the statement.issued payload, never from mst_01,
// because a live B10 recomputes it. On v1's 390 px phone column (the Phase A stage) the date column
// drops and each title keeps to one line with an ellipsis and its full text in the tooltip, so the
// held note stays in frame.
import type { CSSProperties } from "react";
import type { Payloads } from "../../core/events";
import type { Order, Piece } from "../../core/types";
import { getById } from "../../mock";
import { LedgerTable, Money, formatDate, type LedgerColumn, type LedgerRow } from "../../ui";
import { COLUMNS, UI, t, type Lang } from "./strings";

export interface StatementLinesProps {
  lang: Lang;
  lines: Payloads["statement.issued"]["lines"];
  /** v1's phone column: two columns, one-line titles. */
  compact?: boolean;
  /** In compact mode, the widest a title may be before its ellipsis, in px. */
  titleMaxPx?: number;
}

const amount: CSSProperties = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

export function StatementLines({ lang, lines, compact = false, titleMaxPx }: StatementLinesProps) {
  const columns: LedgerColumn[] = [
    { key: "piece", label: t(COLUMNS.piece, lang) },
    ...(compact ? [] : [{ key: "date", label: t(COLUMNS.date, lang) }]),
    { key: "share", label: t(COLUMNS.share, lang), numeric: true },
  ];

  const titleStyle: CSSProperties = compact
    ? { display: "block", maxWidth: titleMaxPx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
    : {};

  const rows: LedgerRow[] = lines.map((line) => {
    const piece = getById<Piece>(line.pieceId);
    const order = getById<Order>(line.orderId);
    const title = piece ? t(piece.title, lang) : t(UI.unknownPiece, lang);
    return {
      id: line.orderId,
      testId: `maker-statement-line-${line.orderId}`,
      cells: {
        piece: (
          <span style={titleStyle} title={compact ? title : undefined}>
            {title}
          </span>
        ),
        date: order ? <span style={{ whiteSpace: "nowrap" }}>{formatDate(order.date, lang)}</span> : null,
        share: <Money cents={line.makerShareCents} tone="in" style={amount} />,
      },
    };
  });

  return (
    <section
      aria-label={t(UI.linesLabel, lang)}
      style={{
        fontFamily: lang === "zh" ? "var(--c-font-body-zh)" : "var(--c-font-body)",
        lineHeight: lang === "zh" ? "var(--c-leading-body-zh)" : "var(--c-leading-body)",
        color: "var(--c-color-ink)",
      }}
    >
      <LedgerTable testId="maker-statement-lines" columns={columns} rows={rows} />
    </section>
  );
}
