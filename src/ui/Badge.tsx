import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "simulated" | "jade" | "amber" | "seal";

export interface BadgeProps {
  testId?: string;
  variant?: BadgeVariant;
  /** Ignored for the simulated variant, which always reads "Simulated 模拟". */
  children?: ReactNode;
  title?: string;
}

/** Small outlined label. The simulated variant marks a panel fed by scripted events. */
export function Badge({ testId, variant = "neutral", children, title }: BadgeProps) {
  if (variant === "simulated") {
    return (
      <span
        className="c-badge c-badge--simulated"
        data-testid={testId ?? "simulated-badge"}
        title={title ?? "Scripted events, not live data"}
      >
        <span lang="en">Simulated</span> <span lang="zh">模拟</span>
      </span>
    );
  }
  return (
    <span className={`c-badge c-badge--${variant}`} data-testid={testId} title={title}>
      {children}
    </span>
  );
}

/** The Simulated badge on its own, test ID simulated-badge. */
export function SimulatedBadge() {
  return <Badge variant="simulated" testId="simulated-badge" />;
}
