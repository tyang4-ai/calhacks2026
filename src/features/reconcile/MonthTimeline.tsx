// F-reconcile T2: the month's records in date order on the kit's LedgerTable. A record shows as its
// own row when it arrives; when a match.made names it, its rows draw together into one match row.
// Counters per record type and a payouts-matched line sit above. Motion only eases the layout
// change; the rows and their order come from the store alone, so every seek renders the same.
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { LayoutGroup, motion } from "motion/react";
import { useCindia } from "../../core/store";
import { LedgerTable, UI_MS, useReducedMotion, type LedgerColumn, type LedgerRow } from "../../ui";
import { CELL_KEYS, buildTimelineRows, countByType, payoutProgress, type Lang, type MonthSlice } from "./recordRows";
import { HandledStrip } from "./HandledStrip";
import { RECORD_TYPE_LABELS, RECORD_TYPE_ORDER, UI, payoutsMatched, t } from "./strings";

export interface MonthTimelineProps {
  lang: Lang;
  /** Height of the scroll area in px. The table keeps its newest rows in view inside it. */
  maxHeight?: number;
}

/** Wraps each cell so the row slides into its new place. A match row takes over its payout's cells. */
function animateRows(rows: LedgerRow[], layoutKeyFor: (row: LedgerRow) => string, duration: number): LedgerRow[] {
  return rows.map((row) => {
    const anchor = layoutKeyFor(row);
    const cells: Record<string, ReactNode> = {};
    for (const key of CELL_KEYS) {
      cells[key] = (
        <motion.div layout="position" layoutId={`${anchor}-${key}`} transition={{ duration }}>
          {row.cells[key]}
        </motion.div>
      );
    }
    return { ...row, cells };
  });
}

export function MonthTimeline({ lang, maxHeight = 360 }: MonthTimelineProps) {
  const records = useCindia((s) => s.month.records);
  const recordIds = useCindia((s) => s.month.recordIds);
  const matches = useCindia((s) => s.month.matches);
  const matchIds = useCindia((s) => s.month.matchIds);
  const reduced = useReducedMotion();

  const month: MonthSlice = useMemo(() => ({ records, recordIds, matches, matchIds }), [records, recordIds, matches, matchIds]);
  const rows = useMemo(() => buildTimelineRows(month, lang), [month, lang]);
  const counts = useMemo(() => countByType(month), [month]);
  const progress = useMemo(() => payoutProgress(month), [month]);

  const animated = useMemo(() => {
    // A match row's cells share layout IDs with its payout's row, so the payout row becomes the match.
    const anchorFor = (row: LedgerRow) => {
      const m = matches[row.id];
      return `rec-${m ? (m.recordIds[0] ?? row.id) : row.id}`;
    };
    return animateRows(rows, anchorFor, reduced ? 0 : UI_MS / 1000);
  }, [rows, matches, reduced]);

  const columns: LedgerColumn[] = useMemo(
    () => [
      { key: "date", label: t(UI.colDate, lang) },
      { key: "type", label: t(UI.colType, lang) },
      { key: "party", label: t(UI.colParty, lang) },
      { key: "detail", label: t(UI.colDetail, lang) },
      { key: "amount", label: t(UI.colAmount, lang), numeric: true },
    ],
    [lang],
  );

  // Keep the newest rows in view: rows are in date order, so the newest sit at the bottom.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && rows.length > 0) el.scrollTop = el.scrollHeight;
  }, [rows]);

  return (
    <section data-testid="reconcile-timeline" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{t(UI.timelineTitle, lang)}</h3>
        <span className="text-sm" style={{ color: "var(--c-color-ink-soft)" }}>
          {t(payoutsMatched(progress.matched, progress.total), lang)}
        </span>
      </div>
      <ul className="flex flex-wrap gap-2 text-sm" aria-label={t(UI.timelineTitle, lang)}>
        {RECORD_TYPE_ORDER.map((type) => (
          <li
            key={type}
            data-testid={`reconcile-counter-${type}`}
            className="flex items-baseline gap-1 px-2 py-0.5"
            style={{ border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-chip)" }}
          >
            <span>{t(RECORD_TYPE_LABELS[type], lang)}</span>
            <span className="font-semibold tabular-nums">{counts[type]}</span>
          </li>
        ))}
      </ul>
      <HandledStrip month={month} lang={lang} />
      <div ref={scrollRef} data-testid="reconcile-list" className="overflow-y-auto [&_th]:sticky [&_th]:top-0 [&_th]:z-10" style={{ maxHeight }}>
        {rows.length === 0 ? (
          <p className="py-4 text-sm" style={{ color: "var(--c-color-ink-soft)" }}>
            {t(UI.noRecordsYet, lang)}
          </p>
        ) : (
          <LayoutGroup id="reconcile-timeline">
            <LedgerTable columns={columns} rows={animated} />
          </LayoutGroup>
        )}
      </div>
    </section>
  );
}
