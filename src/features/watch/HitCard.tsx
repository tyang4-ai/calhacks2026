// One hit (F-watch T3), watch-item-<cftId>, top to bottom:
// - the claim first (watch-claim-<cftId>), in the slot's language, as the payload words it,
// - for a live hit, L21 (watch-live-<cftId>),
// - a kit SideBySide: the found listing (its title, its URL as plain selectable text, its snippet)
//   on the left, the maker's piece through the kit PieceCard on the right, and between them the
//   text match (watch-similarity-<cftId>): L19's first sentence with the payload's number to two
//   places as the label, its last two sentences as the hint,
// - the fairness line with L20 (watch-fairness),
// - the actions the results list passes in (the report and dismiss buttons).
// Dismissed, the card folds to one line with Undo (data-folded="true", the Undo button
// data-role="undo"). The found page is never shown: no iframe, no picture from the found site, and
// the URL is text, never a link. The found title and snippet stay as found in either language.
import type { ReactNode } from "react";
import type { Community, Person, Piece } from "../../core/types";
import { getById } from "../../mock";
import { PieceCard, SideBySide, VERIFICATION_METHOD_WORDS } from "../../ui";
import { formatScore } from "../../ui/cards";
import type { Hit } from "./model";
import { ACTIONS, fill, HIT, L19_HINT, L19_LABEL, L20, L21, t, tf, type Lang } from "./strings";
import styles from "./watch.module.css";

export interface HitCardProps {
  hit: Hit;
  /** Its counterfeit.flagged came from a live source. */
  live: boolean;
  lang: Lang;
  /** Dismissed on this screen: one line with Undo. */
  folded?: boolean;
  onUndo?: () => void;
  /** Under the fairness line: the report and dismiss buttons. */
  actions?: ReactNode;
}

export function HitCard({ hit, live, lang, folded = false, onUndo, actions }: HitCardProps) {
  const id = hit.cftId;
  if (folded) {
    return (
      <article data-testid={`watch-item-${id}`} data-folded="true" className={`${styles.hit} ${styles.hitFolded}`} lang={lang}>
        <p className={styles.foldedLine} title={hit.title}>
          {tf(ACTIONS.dismissed, lang, { title: hit.title })}
        </p>
        <span className={styles.foldedNote}>{t(ACTIONS.dismissNote, lang)}</span>
        <button type="button" className={styles.undo} data-role="undo" onClick={onUndo}>
          {t(ACTIONS.undo, lang)}
        </button>
      </article>
    );
  }

  const piece = getById<Piece>(hit.pieceId);
  const maker = piece ? getById<Person>(piece.makerId) : undefined;
  const community = piece ? getById<Community>(piece.communityId) : undefined;
  const score = formatScore(hit.similarity);

  const found = (
    <div className={styles.found} data-role="found">
      <p className={styles.sideLabel}>{t(HIT.foundLabel, lang)}</p>
      <p className={styles.foundTitle} data-role="found-title">
        {hit.title}
      </p>
      <p className={styles.foundUrl}>
        <span className={styles.srOnly}>{t(HIT.urlLabel, lang)}: </span>
        <span className={styles.mono} data-role="found-url">
          {hit.url}
        </span>
      </p>
      <p className={styles.foundSnippet} data-role="found-snippet">
        {hit.snippet}
      </p>
    </div>
  );

  const mine = (
    <div className={styles.mine} data-role="piece" data-piece-id={hit.pieceId}>
      <p className={styles.sideLabel}>{t(HIT.pieceLabel, lang)}</p>
      {piece ? (
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
          compact
        />
      ) : (
        <p className={styles.soft}>{t(HIT.pieceMissing, lang)}</p>
      )}
    </div>
  );

  return (
    <article data-testid={`watch-item-${id}`} data-folded="false" className={styles.hit} lang={lang}>
      <div className={styles.claimRow}>
        <p data-testid={`watch-claim-${id}`} className={styles.claim}>
          <span className={styles.claimLabel}>{t(HIT.claimLabel, lang)}</span> <span className={styles.claimText}>{t(hit.claim, lang)}</span>
        </p>
        {live && (
          <p data-testid={`watch-live-${id}`} className={styles.liveNote}>
            {t(L21, lang)}
          </p>
        )}
      </div>
      <SideBySide
        left={found}
        right={mine}
        similarity={hit.similarity}
        similarityTestId={`watch-similarity-${id}`}
        similarityLabel={fill(L19_LABEL, { score })}
        similarityHint={L19_HINT}
        lang={lang}
      />
      <div className={styles.decideRow}>
        <p data-testid="watch-fairness" className={styles.fairness}>
          <strong className={styles.fairnessLead}>{t(HIT.fairness, lang)}</strong> <span>{t(L20, lang)}</span>
        </p>
        {actions}
      </div>
    </article>
  );
}
