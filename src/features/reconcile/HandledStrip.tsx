// F-reconcile G4 fix: a short "Cindy handled" strip above the streaming month list. It pins the three
// special matches (bundled, refund netted, carried over) so they stay in view at the end of d06-month
// while the list keeps scrolling to its newest rows. Each match is two aligned lines on a shared grid:
// kind chip, date and reason, amount on the first; the matched record IDs under the reason on the
// second. Rows come in the matches' date order, from the store alone and with no animation, so every
// seek renders the same.
// These strip rows carry reconcile-match-<matchId>, because they are what's on screen at the d06
// screenshot. The same matches' table rows carry the internal reconcile-row-<matchId>.
import type { MatchState } from "../../core/state";
import { Badge, Money, formatDate } from "../../ui";
import { matchKindLabel, matchPayout, matchReason } from "./matchLabels";
import { compareKeys, isSpecialMatch, matchSortKey, matchTestId, type Lang, type MonthSlice } from "./recordRows";
import { UI, t } from "./strings";

/** The month's special matches (every kind but one_to_one), at their payout's date. */
export function specialMatches(month: MonthSlice): MatchState[] {
  const out: MatchState[] = [];
  for (const mid of month.matchIds) {
    const m = month.matches[mid];
    if (m && isSpecialMatch(m) && !out.some((x) => x.matchId === m.matchId)) out.push(m);
  }
  return out.sort((a, b) => compareKeys(matchSortKey(a, month.records), matchSortKey(b, month.records)));
}

export interface HandledStripProps {
  month: MonthSlice;
  lang: Lang;
  /** One line of chips, for when the catch sits above and only the strip's top edge may show. */
  compact?: boolean;
}

/** A special match's full strip text, for the compact chip's title. */
function matchTitle(m: MatchState, lang: Lang): string {
  const payout = matchPayout(m);
  return [matchKindLabel(m.kind, lang), payout ? formatDate(payout.date, lang) : "", matchReason(m, lang), m.recordIds.join(", ")]
    .filter(Boolean)
    .join(" · ");
}

export function HandledStrip({ month, lang, compact = false }: HandledStripProps) {
  const special = specialMatches(month);
  if (special.length === 0) return null;
  if (compact) {
    // The same matches as chips on one line after the title, so no header ever shows without its rows.
    return (
      <section
        data-testid="reconcile-handled"
        aria-label={t(UI.handledTitle, lang)}
        className="flex flex-nowrap items-center gap-2 overflow-hidden text-sm"
      >
        <span className="shrink-0 font-semibold">{t(UI.handledTitle, lang)}</span>
        <ul className="m-0 flex list-none flex-nowrap gap-2 p-0">
          {special.map((m) => (
            <li key={m.matchId} data-testid={matchTestId(m.matchId)} title={matchTitle(m, lang)} className="shrink-0">
              <Badge variant="jade">{matchKindLabel(m.kind, lang)}</Badge>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section
      data-testid="reconcile-handled"
      aria-label={t(UI.handledTitle, lang)}
      className="flex flex-col text-sm"
      style={{ border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-panel)" }}
    >
      <span className="px-3 py-1 font-semibold" style={{ background: "var(--c-color-mat)" }}>
        {t(UI.handledTitle, lang)}
      </span>
      {/* One grid for all rows, so chips, text and amounts line up in columns across the three matches. */}
      <ul className="m-0 grid list-none p-0" style={{ gridTemplateColumns: "max-content minmax(0, 1fr) max-content" }}>
        {special.map((m) => {
          const payout = matchPayout(m);
          return (
            <li
              key={m.matchId}
              data-testid={matchTestId(m.matchId)}
              className="grid items-baseline gap-x-3 px-3 py-1.5"
              style={{ gridColumn: "1 / -1", gridTemplateColumns: "subgrid", borderTop: "1px solid var(--c-color-line)" }}
            >
              <span style={{ gridColumn: 1, gridRow: 1 }}>
                <Badge variant="jade">{matchKindLabel(m.kind, lang)}</Badge>
              </span>
              <span style={{ gridColumn: 2, gridRow: 1 }}>
                {payout ? <span className="tabular-nums font-medium">{formatDate(payout.date, lang)}</span> : null}
                {payout ? <span aria-hidden="true"> · </span> : null}
                <span>{matchReason(m, lang)}</span>
              </span>
              <span className="text-right tabular-nums" style={{ gridColumn: 3, gridRow: 1 }}>
                {payout ? <Money cents={payout.netCents} tone="in" /> : null}
              </span>
              <span className="tabular-nums" style={{ gridColumn: "2 / -1", gridRow: 2, color: "var(--c-color-ink-soft)" }}>
                {m.recordIds.join(", ")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
