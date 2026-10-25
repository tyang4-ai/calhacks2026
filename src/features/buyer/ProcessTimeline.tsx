// The opened piece's process on the desktop piece page (M-buyer T2): the steps side by side on one
// thread, from the first step to the last, each with its hours above its name. The story card above
// it already shows the total. Data comes from src/mock through getById(). v1's vertical list went
// with the phone flow (M-buyer T7).
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
