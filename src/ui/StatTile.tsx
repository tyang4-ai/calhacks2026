import type { ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { isPlainFigure } from "./cards";
import { pickText } from "./strings";

export interface StatTileProps {
  testId?: string;
  title: Text;
  lang: Lang;
  /**
   * The big figure. Mark the figure itself with data-role="value" inside the node you pass. A plain
   * string or number is marked by the tile.
   */
  value: ReactNode;
  /** Lines under the value. */
  detail?: ReactNode;
  /** A seal-colored rule down the left edge, the shape being the second cue. */
  attention?: boolean;
}

/** A titled figure with lines under it. Wrap it in a Link (variant "block") to make it open a view. */
export function StatTile({ testId, title, lang, value, detail, attention = false }: StatTileProps) {
  return (
    <section className={`c-stattile${attention ? " c-stattile--attention" : ""}`} data-testid={testId} data-attention={attention || undefined} lang={lang}>
      {attention && <span className="c-stattile__rule" aria-hidden="true" data-role="attention-rule" />}
      <h3 className="c-stattile__title">{pickText(title, lang)}</h3>
      <div className="c-stattile__value">{isPlainFigure(value) ? <span data-role="value">{value}</span> : value}</div>
      {detail !== undefined && <div className="c-stattile__detail">{detail}</div>}
    </section>
  );
}
