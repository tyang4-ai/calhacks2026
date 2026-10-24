import type { CSSProperties } from "react";
import { formatCents } from "./formatCents";

export interface MoneyProps {
  testId?: string;
  /** Integer cents. */
  cents: number;
  /** neutral: ink. in: arrived or matched (jade). out: going out short (seal). pending: waiting (amber). */
  tone?: "neutral" | "in" | "out" | "pending";
  className?: string;
  style?: CSSProperties;
}

/** Formats integer cents as dollars. Negative amounts show a minus sign and seal red. */
export function Money({ testId, cents, tone = "neutral", className, style }: MoneyProps) {
  const neg = cents < 0;
  const cls = `c-money${tone !== "neutral" ? ` c-money--${tone}` : ""}${neg ? " c-money--negative" : ""}${className ? ` ${className}` : ""}`;
  return (
    <span className={cls} data-testid={testId} style={style}>
      {formatCents(cents)}
    </span>
  );
}
