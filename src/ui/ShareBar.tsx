import type { ReactNode } from "react";
import { Money } from "./Money";

export interface SharePart {
  /** maker, materials, platform (Cindia fee), card (card fee), or other. */
  kind: "maker" | "materials" | "platform" | "card" | "other";
  label: ReactNode;
  cents: number;
  /** Test ID on this part's amount, e.g. buyer-split-maker-share. */
  testId?: string;
}

export interface ShareBarProps {
  testId?: string;
  parts: SharePart[];
  /** Hide the legend under the bar. */
  compact?: boolean;
}

/** One price split into parts with their amounts. */
export function ShareBar({ testId, parts, compact = false }: ShareBarProps) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.cents), 0) || 1;
  return (
    <div className="c-sharebar" data-testid={testId}>
      <div className="c-sharebar__bar" role="img" aria-label="Price split">
        {parts.map((p, i) => (
          <div
            key={i}
            className={`c-sharebar__seg--${p.kind}`}
            style={{ width: `${(Math.max(0, p.cents) / total) * 100}%` }}
          />
        ))}
      </div>
      {!compact && (
        <ul className="c-sharebar__legend">
          {parts.map((p, i) => (
            <li key={i} className={`c-sharebar__item${p.kind === "maker" ? " c-sharebar__item--maker" : ""}`}>
              <span>
                <span className={`c-sharebar__swatch c-sharebar__seg--${p.kind}`} aria-hidden="true" />
                {p.label}
              </span>
              <Money cents={p.cents} tone={p.kind === "maker" ? "in" : "neutral"} testId={p.testId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
