// The featured grid on home (T5, search-featured): eight kit PieceCards, four across. For each of
// the four communities in community order, its first two pieces of kind "featured", topped up with
// the community's first pieces when it has fewer than two. Each card shows its community's name and
// gets demo={community.demo}, so its verification line starts with L3. It renders from src/mock
// only and needs no events. Each card's wrapper carries data-piece-id for the spec.
import { navigate, pieceRoute } from "../../core/nav";
import type { Community, Person, Piece } from "../../core/types";
import { communities, getById, pieces } from "../../mock";
import { PieceCard, VERIFICATION_METHOD_WORDS } from "../../ui";
import { FEATURED, t, type Lang } from "./strings";

export interface FeaturedProps {
  lang: Lang;
}

const PER_COMMUNITY = 2;

/** The eight featured pieces: two per community, in community order. */
function featuredPieces(list: readonly Piece[] = pieces, order: readonly Community[] = communities): Piece[] {
  const out: Piece[] = [];
  for (const c of order) {
    const own = list.filter((p) => p.communityId === c.id);
    const picked = own.filter((p) => p.kind === "featured").slice(0, PER_COMMUNITY);
    for (const p of own) {
      if (picked.length >= PER_COMMUNITY) break;
      if (!picked.includes(p)) picked.push(p);
    }
    out.push(...picked);
  }
  return out;
}

export function Featured({ lang }: FeaturedProps) {
  const list = featuredPieces();
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)" }} lang={lang}>
      <h2
        style={{
          margin: 0,
          fontFamily: lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)",
          fontSize: "var(--c-text-24)",
          fontWeight: 600,
          lineHeight: "var(--c-leading-heading)",
        }}
      >
        {t(FEATURED.title, lang)}
      </h2>
      <div data-testid="search-featured" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--c-space-24)" }}>
        {list.map((piece) => {
          const maker = getById<Person>(piece.makerId);
          const community = getById<Community>(piece.communityId);
          return (
            <div key={piece.id} data-piece-id={piece.id} style={{ minWidth: 0, display: "flex" }}>
              <PieceCard
                image={piece.image}
                imageAlt={piece.imageAlt}
                title={piece.title}
                makerName={maker?.name ?? { en: "", zh: "" }}
                makerChar={maker?.surnameChar ?? ""}
                communityName={community?.name ?? { en: "", zh: "" }}
                priceCents={piece.priceCents}
                verification={community ? VERIFICATION_METHOD_WORDS[community.verification.method] : undefined}
                demo={community?.demo ?? false}
                lang={lang}
                onClick={() => navigate(pieceRoute(piece.id))}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
