import type { ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { pieceVerificationText } from "./cards";
import { MakerMark } from "./MakerMark";
import { Money } from "./Money";
import { DOT_SEPARATOR, ILLUSTRATION_WORD, pickText, SAMPLE_WORD } from "./strings";
import { VerificationDot } from "./VerificationLine";

export interface PieceCardProps {
  testId?: string;
  /** The picture's path, such as /images/pc_01.svg. */
  image: string;
  imageAlt: Text;
  title: Text;
  makerName: Text;
  /** The maker's mark character (Person.surnameChar), for MakerMark. */
  makerChar: string;
  communityName: Text;
  priceCents: number;
  /** The short verification line, such as the method word. */
  verification?: Text;
  /** From `community.demo` (A2-3): the verification line starts with L3. */
  demo?: boolean;
  lang: Lang;
  /** Makes the whole card a button. A card inside a Link needs none. */
  onClick?: () => void;
  /** Under the verification line, such as a reason line. It stays clickable on a clickable card. */
  footer?: ReactNode;
  /** On the verification line. */
  verificationTestId?: string;
  /** On the price. */
  priceTestId?: string;
  /** A smaller picture box, so six results fit above the fold. */
  compact?: boolean;
  /** Adds a Sample tag beside the Illustration tag, for placeholder pieces. */
  sample?: boolean;
}

/**
 * A piece: its illustration (always tagged "Illustration"), title, maker mark and name, community,
 * price through Money, and the short verification line, which starts with L3 when `demo` is set.
 */
export function PieceCard({
  testId,
  image,
  imageAlt,
  title,
  makerName,
  makerChar,
  communityName,
  priceCents,
  verification,
  demo = false,
  lang,
  onClick,
  footer,
  verificationTestId,
  priceTestId,
  compact = false,
  sample = false,
}: PieceCardProps) {
  const name = pickText(title, lang);
  const line = pieceVerificationText(verification, demo, lang);
  const maker = pickText(makerName, lang);
  return (
    <article
      className={`c-piececard${compact ? " c-piececard--compact" : ""}${onClick ? " c-piececard--action" : ""}`}
      data-testid={testId}
      lang={lang}
    >
      <div className="c-piececard__pic">
        <img className="c-piececard__img" src={image} alt={pickText(imageAlt, lang)} draggable={false} />
        <span className="c-piececard__tags">
          <span className="c-tag" data-role="illustration-tag">
            {pickText(ILLUSTRATION_WORD, lang)}
          </span>
          {sample && <span className="c-tag c-tag--sample">{pickText(SAMPLE_WORD, lang)}</span>}
        </span>
      </div>
      <div className="c-piececard__body">
        <h3 className="c-piececard__title">
          {onClick ? (
            <button type="button" className="c-card__action" onClick={onClick}>
              {name}
            </button>
          ) : (
            name
          )}
        </h3>
        <p className="c-piececard__maker">
          <MakerMark char={makerChar} size={28} label={maker} />
          <span className="c-piececard__makername">
            {maker}
            {DOT_SEPARATOR}
            {pickText(communityName, lang)}
          </span>
        </p>
        <p className="c-piececard__price">
          <Money cents={priceCents} testId={priceTestId} />
        </p>
        {line && (
          <p className={`c-piececard__verif${demo ? " c-piececard__verif--demo" : ""}`} data-testid={verificationTestId} data-role="verification">
            <VerificationDot />
            <span>{line}</span>
          </p>
        )}
        {footer !== undefined && <div className="c-piececard__footer">{footer}</div>}
      </div>
    </article>
  );
}
