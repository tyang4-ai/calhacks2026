import type { ReactNode } from "react";
import type { Community, Lang, Text } from "../core/types";
import { COMMUNITY_KIND_WORDS, DOT_SEPARATOR, ILLUSTRATION_WORD, pickText } from "./strings";

export interface CommunityCardProps {
  testId?: string;
  name: Text;
  /** The nation's name in fix-plan 1.1's words, such as "Diné (Navajo)". */
  people: Text;
  place: Text;
  craft: Text;
  /** The data model's Community.kind, shown as its glossary word. */
  kind: Community["kind"];
  /** A picture's path. When given it carries the Illustration tag. */
  image?: string;
  imageAlt?: Text;
  lang: Lang;
  /** Makes the whole card a button. A card inside a Link needs none. */
  onClick?: () => void;
  /** Under the craft line, such as the Demo data badge and a link. It stays clickable. */
  footer?: ReactNode;
}

/** A community: its name, people and place, its craft, and its kind as a word, never a color alone. */
export function CommunityCard({ testId, name, people, place, craft, kind, image, imageAlt, lang, onClick, footer }: CommunityCardProps) {
  const title = pickText(name, lang);
  return (
    <article className={`c-commcard${onClick ? " c-commcard--action" : ""}`} data-testid={testId} data-kind={kind} lang={lang}>
      {image && (
        <div className="c-commcard__pic">
          <img className="c-commcard__img" src={image} alt={imageAlt ? pickText(imageAlt, lang) : ""} draggable={false} />
          <span className="c-piececard__tags">
            <span className="c-tag">{pickText(ILLUSTRATION_WORD, lang)}</span>
          </span>
        </div>
      )}
      <div className="c-commcard__body">
        <span className="c-tag c-commcard__kind" data-role="kind">
          {pickText(COMMUNITY_KIND_WORDS[kind], lang)}
        </span>
        <h3 className="c-commcard__name">
          {onClick ? (
            <button type="button" className="c-card__action" onClick={onClick}>
              {title}
            </button>
          ) : (
            title
          )}
        </h3>
        <p className="c-commcard__people">
          {pickText(people, lang)}
          {DOT_SEPARATOR}
          {pickText(place, lang)}
        </p>
        <p className="c-commcard__craft">{pickText(craft, lang)}</p>
        {footer !== undefined && <div className="c-commcard__footer">{footer}</div>}
      </div>
    </article>
  );
}
