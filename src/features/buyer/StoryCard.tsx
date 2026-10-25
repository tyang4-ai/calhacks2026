// The opened piece's story on the desktop piece page's left column (M-buyer T2): the illustration
// with its Illustration tag, the title, the maker with her MakerMark and the Demo data badge, the
// community link, hours of work and materials, the story with L5 under it, the process as a row of
// steps, and the craft line. Everything comes from src/mock through getById(). It has to fit its
// column at 1440 by 900. v1's phone layout went with the phone flow (M-buyer T7).
// English only (decisions.md, Oct 24 11:35 PM): every text renders once, in SlotProps.lang, never a
// second language under it.
import type { Community, Person, Piece } from "../../core/types";
import { communityRoute } from "../../core/nav";
import { getById } from "../../mock";
import { Badge } from "../../ui/Badge";
import { Link } from "../../ui/Link";
import { MakerMark } from "../../ui/MakerMark";
import { Money } from "../../ui/Money";
import { ILLUSTRATION_WORD } from "../../ui/strings";
import { ProcessTimeline } from "./ProcessTimeline";
import { fill, label, onScreen, page, tr } from "./strings";

export interface StoryCardProps {
  lang: "en" | "zh";
  pieceId: string;
}

export function StoryCard({ lang, pieceId }: StoryCardProps) {
  const piece = getById<Piece>(pieceId);
  if (!piece) return null;
  const maker = getById<Person>(piece.makerId);
  const community = getById<Community>(piece.communityId);

  return (
    <article data-testid="buyer-story-card" data-layout="page" lang={lang} className="flex flex-col gap-2">
      <div className="flex gap-4">
        <figure className="relative m-0 h-[136px] w-[102px] shrink-0 overflow-hidden rounded-panel border border-line bg-mat">
          <img src={piece.image} alt={tr(piece.imageAlt, lang)} draggable={false} className="h-full w-full object-cover" />
          <span className="c-tag absolute top-1.5 left-1.5" data-role="illustration-tag">
            {tr(ILLUSTRATION_WORD, lang)}
          </span>
        </figure>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-xl leading-tight font-semibold text-ink">{tr(piece.title, lang)}</h2>
          {maker && (
            <div className="flex flex-wrap items-center gap-2">
              <MakerMark char={maker.surnameChar} size={24} label={maker.surnameChar} />
              <span className="text-base font-semibold text-ink">{tr(maker.name, lang)}</span>
              <Badge variant="demo" />
            </div>
          )}
          {community && (
            <Link to={communityRoute(community.id)} className="text-sm">
              {tr(community.name, lang)}
            </Link>
          )}
          <span className="c-tabular text-sm text-ink">
            {fill(tr(page.hoursOfWorkCount, lang), { hours: String(piece.hours) })}
            <span className="text-ink-soft">
              {" · "}
              {tr(label.materials, lang)}{" "}
            </span>
            <Money cents={piece.materialsCents} />
          </span>
        </div>
      </div>

      <p className="m-0 line-clamp-4 text-sm leading-5 text-ink">{tr(piece.story, lang)}</p>
      <p data-testid="buyer-story-demo-note" className="m-0 text-sm leading-5 text-ink-soft">
        {tr(onScreen.L5, lang)}
      </p>

      <ProcessTimeline lang={lang} pieceId={piece.id} />

      <p className="m-0 text-sm leading-5 text-ink-soft">
        <span className="font-semibold text-ink">
          {tr(label.heritage, lang)}
          {lang === "zh" ? "：" : ". "}
        </span>
        {tr(piece.heritage, lang)}
      </p>
    </article>
  );
}
