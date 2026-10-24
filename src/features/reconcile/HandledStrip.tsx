// F-reconcile G4 fix: a short "Cindy handled" strip above the streaming month list. It pins the three
// special matches (bundled, refund netted, carried over) so they stay in view at the end of d06-month
// while the list keeps scrolling to its newest rows. One compact line per match, in the matches'
// date order, from the store alone and with no animation, so every seek renders the same.
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
}

export function HandledStrip({ month, lang }: HandledStripProps) {
  const special = specialMatches(month);
  if (special.length === 0) return null;
  return (
    <section
      data-testid="reconcile-handled"
      aria-label={t(UI.handledTitle, lang)}
      className="flex flex-col gap-1 px-3 py-2 text-sm"
      style={{ border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-chip)" }}
    >
      <span className="font-semibold">{t(UI.handledTitle, lang)}</span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {special.map((m) => {
          const payout = matchPayout(m);
          return (
            <li key={m.matchId} data-testid={matchTestId(m.matchId)} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Badge variant="jade">{matchKindLabel(m.kind, lang)}</Badge>
              {payout ? <span className="tabular-nums">{formatDate(payout.date, lang)}</span> : null}
              <span className="tabular-nums" style={{ color: "var(--c-color-ink-soft)" }}>
                {m.recordIds.join(", ")}
              </span>
              <span>{matchReason(m, lang)}</span>
              {payout ? (
                <span className="ml-auto">
                  <Money cents={payout.netCents} tone="in" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
