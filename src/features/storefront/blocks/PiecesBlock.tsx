// The pieces block (T2): a kit PieceCard for each of the block's pieceIds, each with
// demo={community.demo}, so its verification line starts with L3. Each card is a kit Link to its
// Shop page, which moves between routes without reloading the store. Each card's cell carries
// data-piece-id for the feature's own specs.
import { pieceRoute } from "../../../core/nav";
import type { Community, Person, Piece } from "../../../core/types";
import { getById } from "../../../mock";
import { Link, PieceCard, VERIFICATION_METHOD_WORDS } from "../../../ui";
import { UI, t } from "../strings";
import styles from "../storefront.module.css";
import { listProp } from "../workingCopy";
import { BlockHeading, type BlockProps, Placeholder } from "./parts";

export function PiecesBlock({ block, community, lang, accent }: BlockProps) {
  const list = listProp(block, "pieceIds")
    .map((id) => getById<Piece>(id))
    .filter((p): p is Piece => Boolean(p && p.id.startsWith("pc_") && p.title));
  return (
    <>
      <BlockHeading text={t(UI.piecesHeading, lang)} accent={accent} lang={lang} />
      {list.length === 0 ? (
        <Placeholder lang={lang} />
      ) : (
        <div className={styles.pieceGrid}>
          {list.map((piece) => {
            const own = getById<Community>(piece.communityId) ?? community;
            const maker = getById<Person>(piece.makerId);
            return (
              <div key={piece.id} className={styles.cardCell} data-piece-id={piece.id}>
                <Link to={pieceRoute(piece.id)} variant="block" ariaLabel={t(piece.title, lang)} className={styles.cardLink}>
                  <PieceCard
                    image={piece.image}
                    imageAlt={piece.imageAlt}
                    title={piece.title}
                    makerName={maker?.name ?? { en: "", zh: "" }}
                    makerChar={maker?.surnameChar ?? ""}
                    communityName={own.name}
                    priceCents={piece.priceCents}
                    verification={VERIFICATION_METHOD_WORDS[own.verification.method]}
                    demo={own.demo}
                    lang={lang}
                    compact
                  />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
