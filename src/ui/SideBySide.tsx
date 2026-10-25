import type { ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { ScoreBar } from "./ScoreBar";
import { pickText } from "./strings";

export interface SideBySideProps {
  testId?: string;
  /** On the similarity block, which holds the label, the bar and the hint. */
  similarityTestId?: string;
  left: ReactNode;
  right: ReactNode;
  /** From 0 to 1. */
  similarity: number;
  /** Above the bar, with the number, such as L19's first sentence. */
  similarityLabel: Text;
  /** Under the bar in small type, such as L19's last two sentences. */
  similarityHint?: Text;
  lang: Lang;
}

/** Two cards with a similarity bar between them. The kit adds no word of its own. */
export function SideBySide({ testId, similarityTestId, left, right, similarity, similarityLabel, similarityHint, lang }: SideBySideProps) {
  return (
    <div className="c-sbs" data-testid={testId} lang={lang}>
      <div className="c-sbs__side c-sbs__side--left">{left}</div>
      <div className="c-sbs__sim" data-testid={similarityTestId}>
        <p className="c-sbs__label">{pickText(similarityLabel, lang)}</p>
        <ScoreBar value={similarity} width={140} showValue={false} />
        {similarityHint && <p className="c-sbs__hint">{pickText(similarityHint, lang)}</p>}
      </div>
      <div className="c-sbs__side c-sbs__side--right">{right}</div>
    </div>
  );
}
