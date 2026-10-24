// F-buyer T2: the opened piece's maker story card. Title in both languages, the maker's name and
// MakerMark, hours of work, materials, the heritage line, a short story, and the process timeline
// inside it. It sits directly in the buyer phone's panel, so it draws no card of its own. Everything
// comes from src/mock through getById(), and it has to fit the 390 by 844 phone without scrolling.
import type { Person, Piece } from "../../core/types";
import { getById } from "../../mock";
import { MakerMark } from "../../ui/MakerMark";
import { Money } from "../../ui/Money";
import { ProcessTimeline } from "./ProcessTimeline";
import { label, tr, ui, type Lang } from "./strings";

export interface StoryCardProps {
  lang: "en" | "zh";
  pieceId: string;
}

const other = (lang: Lang): Lang => (lang === "en" ? "zh" : "en");

export function StoryCard({ lang, pieceId }: StoryCardProps) {
  const piece = getById<Piece>(pieceId);
  if (!piece) return null;
  const maker = getById<Person>(piece.makerId);
  const alt = other(lang);
  const hoursText = lang === "zh" ? `${piece.hours}${tr(ui.hoursCount, lang)}` : `${piece.hours} ${tr(ui.hoursCount, lang)}`;

  return (
    <article data-testid="buyer-story-card" className="flex flex-col gap-3">
      <div className="flex gap-3">
        <img
          src={piece.image}
          alt={tr(piece.title, lang)}
          width={88}
          height={88}
          className="h-[88px] w-[88px] shrink-0 rounded-panel border border-line object-cover"
        />
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <h3 className="text-2xl">{tr(piece.title, lang)}</h3>
          <span lang={alt} className="text-base text-ink-soft">
            {tr(piece.title, alt)}
          </span>
        </div>
      </div>

      {maker && (
        <div className="flex items-center gap-3">
          <MakerMark char={maker.surnameChar} size={36} label={maker.surnameChar} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm text-ink-soft">{tr(ui.madeBy, lang)}</span>
            <span className="text-base font-semibold text-ink">
              {tr(maker.name, lang)}{" "}
              <span lang={alt} className="font-normal text-ink-soft">
                {tr(maker.name, alt)}
              </span>
            </span>
          </div>
        </div>
      )}

      <dl className="m-0 grid grid-cols-2 gap-3 border-y border-line py-2">
        <div className="flex flex-col">
          <dt className="text-sm text-ink-soft">{tr(label.hoursOfWork, lang)}</dt>
          <dd className="c-tabular m-0 text-lg font-semibold text-ink">{hoursText}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-sm text-ink-soft">{tr(label.materials, lang)}</dt>
          <dd className="m-0 text-lg font-semibold text-ink">
            <Money cents={piece.materialsCents} />
          </dd>
        </div>
      </dl>

      <p className="m-0 line-clamp-4 text-sm text-ink">{tr(piece.story, lang)}</p>

      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-ink">{tr(label.heritage, lang)}</span>
        <p className="m-0 text-sm text-ink-soft">{tr(piece.heritage, lang)}</p>
      </div>

      <ProcessTimeline lang={lang} pieceId={pieceId} />
    </article>
  );
}
