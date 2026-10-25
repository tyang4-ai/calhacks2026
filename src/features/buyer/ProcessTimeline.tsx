// F-buyer T2: the opened piece's process, from the first step to the last, each step with its
// hours, and the piece's total hours of work at the bottom. Lives inside the story card, so it has
// no panel of its own (no cards in cards). Data comes from src/mock through getById().
import type { Piece } from "../../core/types";
import { getById } from "../../mock";
import { tr, ui, type Lang } from "./strings";

export interface ProcessTimelineProps {
  lang: "en" | "zh";
  pieceId: string;
}

function hours(n: number, lang: Lang): string {
  return lang === "zh" ? `${n}${tr(ui.hoursUnit, lang)}` : `${n} ${tr(ui.hoursUnit, lang)}`;
}

export function ProcessTimeline({ lang, pieceId }: ProcessTimelineProps) {
  const piece = getById<Piece>(pieceId);
  if (!piece) return null;

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
