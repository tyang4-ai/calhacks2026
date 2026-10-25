import type { ReactNode } from "react";
import { formatScore, scoreFraction } from "./cards";

export interface ScoreBarProps {
  testId?: string;
  /** From 0 to 1. */
  value: number;
  /** Before the bar, such as "closeness". */
  label?: ReactNode;
  /** The fill's color. The figure beside the bar always says the value too. */
  tone?: "neutral" | "jade" | "amber" | "seal";
  /** The track's width in px. Default 160. */
  width?: number;
  /** The figure to two places after the bar. Default true. */
  showValue?: boolean;
}

/** A value from 0 to 1 as a bar, with the figure beside it so color never carries it alone. */
export function ScoreBar({ testId, value, label, tone = "neutral", width = 160, showValue = true }: ScoreBarProps) {
  const fill = scoreFraction(value);
  const figure = formatScore(value);
  return (
    <span className={`c-score c-score--${tone}`} data-testid={testId} data-value={figure}>
      {label !== undefined && <span className="c-score__label">{label}</span>}
      <span
        className="c-score__track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Number(figure)}
        aria-valuetext={figure}
        style={{ width }}
      >
        <span className="c-score__fill" style={{ width: `${fill * 100}%` }} />
      </span>
      {showValue && <span className="c-score__value">{figure}</span>}
    </span>
  );
}
