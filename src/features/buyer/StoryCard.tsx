// The opened piece's maker story card. The title, the maker's name and MakerMark,
// hours of work, materials, the heritage line, a short story, and the process timeline inside it.
// Everything comes from src/mock through getById().
// - layout "phone" (the default) is v1's card in the buyer phone's panel: it draws no card of its
//   own and fits the 390 by 844 phone without scrolling.
// - layout "page" is the desktop piece page's left column (M-buyer T2): the illustration with its
//   Illustration tag, the Demo data badge beside the maker, the community link, L5 under the story,
//   and the process as a row of steps. It has to fit its column at 1440 by 900.
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
import { fill, label, onScreen, page, tr, ui, type Lang } from "./strings";

export interface StoryCardProps {
  lang: "en" | "zh";
  pieceId: string;
  /** "phone" keeps v1's card, "page" is the desktop piece page's story. */
  layout?: "phone" | "page";
}

export function StoryCard({ lang, pieceId, layout = "phone" }: StoryCardProps) {
  const piece = getById<Piece>(pieceId);
  if (!piece) return null;
  const maker = getById<Person>(piece.makerId);
  if (layout === "page") return <PageStory lang={lang} piece={piece} maker={maker} />;

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
        </div>
      </div>

      {maker && (
        <div className="flex items-center gap-3">
          <MakerMark char={maker.surnameChar} size={36} label={maker.surnameChar} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm text-ink-soft">{tr(ui.madeBy, lang)}</span>
            <span className="text-base font-semibold text-ink">{tr(maker.name, lang)}</span>
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

      <ProcessTimeline lang={lang} pieceId={piece.id} />
    </article>
  );
}

interface PageStoryProps {
  lang: Lang;
  piece: Piece;
  maker: Person | undefined;
}

/** The desktop piece page's story (M-buyer T2). */
function PageStory({ lang, piece, maker }: PageStoryProps) {
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

      <ProcessTimeline lang={lang} pieceId={piece.id} layout="row" />

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
