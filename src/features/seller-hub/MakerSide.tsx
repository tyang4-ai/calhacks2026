// The maker page's side panel (F-seller-hub T6), test ID seller-maker-side, in the right third of
// /maker/<makerId>:
// - her pieces (seller-maker-pieces), read-only: illustration, title in the slot's language, price,
//   one of a kind or not,
// - her works in progress (seller-maker-wip): title, and the milestones in a kit MilestoneTimeline,
//   each one's status from the store's wip key, falling back to the mock's status,
// - MakerQuestions (seller-maker-questions), her side of "ask the maker".
// The pieces and works in progress render no keyed events, so their panel shows the kit's Demo data
// badge. A maker with no pieces, works or questions shows a short empty line for each.
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import type { CindiaState } from "../../core/state";
import type { Piece } from "../../core/types";
import { pieces, worksInProgress } from "../../mock";
import { Badge, MilestoneTimeline, Money, Panel } from "../../ui";
import { MakerQuestions } from "./MakerQuestions";
import { makerQuestionsFor, milestoneItems } from "./model";
import { MAKER, SEP, t, tf, type Lang } from "./strings";
import styles from "./seller-hub.module.css";

const selectWip = (s: CindiaState) => s.wip.milestones;

function PieceRow({ piece, lang }: { piece: Piece; lang: Lang }) {
  return (
    <li className={styles.pieceRow} data-piece-id={piece.id}>
      <img className={styles.pieceImg} src={piece.image} alt={t(piece.imageAlt, lang)} width={64} height={64} />
      <div className={styles.pieceMain}>
        <p className={styles.pieceTitle}>{t(piece.title, lang)}</p>
        <p className={styles.pieceMeta}>
          <Money cents={piece.priceCents} />
          {SEP}
          <span>{t(piece.facets.oneOfAKind ? MAKER.oneOfAKind : MAKER.series, lang)}</span>
        </p>
      </div>
    </li>
  );
}

export function MakerSide({ makerId, lang }: SlotProps) {
  const live = useCindia(selectWip);
  const id = makerId ?? "";
  const mine = pieces.filter((p) => p.makerId === id);
  const works = worksInProgress.filter((w) => w.makerId === id);
  // A buyer's question is the one thing here she can act on, so it goes on top once there is one.
  const asked = useCindia((s) => makerQuestionsFor(s, id).length > 0);
  return (
    <div className={styles.makerSide} data-testid="seller-maker-side" lang={lang}>
      {asked && <MakerQuestions makerId={id} lang={lang} />}
      <Panel
        title={t(MAKER.pieces, lang)}
        sourceKeys={[]}
        actions={<Badge variant="demo" />}
        lang={lang}
        className={styles.sidePanel}
      >
        <section data-testid="seller-maker-pieces" aria-label={t(MAKER.pieces, lang)}>
          {mine.length === 0 ? (
            <p className={styles.empty}>{t(MAKER.noPieces, lang)}</p>
          ) : (
            <>
              <p className={styles.soft}>{tf(MAKER.count, lang, { n: mine.length })}</p>
              <ul className={styles.pieceList}>
                {mine.map((p) => (
                  <PieceRow key={p.id} piece={p} lang={lang} />
                ))}
              </ul>
            </>
          )}
        </section>
        <section data-testid="seller-maker-wip" className={styles.wipSection} aria-label={t(MAKER.wip, lang)}>
          <h3 className={styles.h3}>{t(MAKER.wip, lang)}</h3>
          {works.length === 0 ? (
            <p className={styles.empty}>{t(MAKER.noWip, lang)}</p>
          ) : (
            works.map((w) => (
              <article key={w.id} className={styles.wip} data-wip-id={w.id}>
                <p className={styles.pieceTitle}>
                  {t(w.title, lang)}
                  {SEP}
                  <Money cents={w.priceCents} />
                </p>
                <MilestoneTimeline testIdPrefix="seller-maker-wip-" milestones={milestoneItems(w, live)} lang={lang} />
              </article>
            ))
          )}
        </section>
      </Panel>
      {!asked && <MakerQuestions makerId={id} lang={lang} />}
    </div>
  );
}
