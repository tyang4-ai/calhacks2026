import type { ReactNode } from "react";

export interface FlagProps {
  testId?: string;
  /** The short reason line. */
  reason: ReactNode;
  children?: ReactNode;
}

/** Seal-red left rule plus wash, with a short reason line. The mark gives a second cue beside color. */
export function Flag({ testId, reason, children }: FlagProps) {
  return (
    <div className="c-flag" data-testid={testId} role="alert">
      <div className="c-flag__reason">
        <span className="c-flag__icon" aria-hidden="true">
          ▲
        </span>
        <span>{reason}</span>
      </div>
      {children && <div style={{ marginTop: "var(--c-space-8)" }}>{children}</div>}
    </div>
  );
}
