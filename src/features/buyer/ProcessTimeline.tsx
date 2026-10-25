// The opened piece's process, from the first step to the last, each step with its hours. Data
// comes from src/mock through getById().
// - layout "list" (the default) is v1's: a vertical list inside the phone's story card, with the
//   piece's total hours of work at the bottom.
// - layout "row" is the desktop piece page's (M-buyer T2): the steps side by side on one thread,
//   each with its hours above its name. The card above it already shows the total.
import type { Piece } from "../../core/types";
import { getById } from "../../mock";
import { tr, ui, type Lang } from "./strings";

export interface ProcessTimelineProps {
  lang: "en" | "zh";
  pieceId: string;
  layout?: "list" | "row";
}

function hours(n: number, lang: Lang): string {
  return lang === "zh" ? `${n}${tr(ui.hoursUnit, lang)}` : `${n} ${tr(ui.hoursUnit, lang)}`;
}

export function ProcessTimeline({ lang, pieceId, layout = "list" }: ProcessTimelineProps) {
  const piece = getById<Piece>(pieceId);
  if (!piece) return null;

  if (layout === "row") {
    return (
      <section data-testid="buyer-process-timeline" data-layout="row" aria-label={tr(ui.process, lang)}>
        <ol
          className="m-0 grid list-none gap-2 p-0"
          style={{ gridTemplateColumns: `repeat(${piece.process.length}, minmax(0, 1fr))` }}
        >
          {piece.process.map((p, i) => (
            <li key={i} className="flex min-w-0 flex-col gap-0.5 text-sm leading-[18px]">
              <span aria-hidden="true" className="flex items-center gap-1 pb-0.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-ink" />
                <span className="h-px flex-1 bg-ink-soft" />
              </span>
              <span className="c-tabular font-semibold text-ink">{hours(p.hours, lang)}</span>
              <span className="text-ink-soft">{tr(p.step, lang)}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section data-testid="buyer-process-timeline" aria-label={tr(ui.process, lang)} className="flex flex-col gap-1">
      <h3 className="text-base">{tr(ui.process, lang)}</h3>
      <ol className="m-0 flex list-none flex-col p-0">
        {piece.process.map((p, i) => (
          <li
            key={i}
            className="flex items-baseline gap-2 border-l border-ink-soft py-0.5 pl-3 text-sm leading-snug"
          >
            <span className="c-tabular w-4 shrink-0 text-ink-soft">{i + 1}</span>
            <span className="min-w-0 flex-1 text-ink">{tr(p.step, lang)}</span>
            <span className="c-tabular shrink-0 text-ink">{hours(p.hours, lang)}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-baseline justify-between border-t border-line pt-1 text-sm">
        <span className="text-ink-soft">
          {tr(ui.totalHours, lang)}
        </span>
        <span className="c-tabular font-semibold text-ink">{hours(piece.hours, lang)}</span>
      </div>
    </section>
  );
}
