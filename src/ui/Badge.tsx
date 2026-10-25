import type { ReactNode } from "react";
import { BADGE_TITLES, BADGE_WORDS } from "./strings";

/**
 * neutral, jade, amber and seal take their words as children. simulated, live, demo, rule and
 * estimate always read their glossary labels, in English only (the site is English only), such as "Live".
 */
export type BadgeVariant = "neutral" | "simulated" | "jade" | "amber" | "seal" | "live" | "demo" | "rule" | "estimate";

/** The variants whose words are fixed. */
export type LabeledBadgeVariant = keyof typeof BADGE_WORDS;

export interface BadgeProps {
  testId?: string;
  variant?: BadgeVariant;
  /** Ignored for the labeled variants (simulated, live, demo, rule, estimate), which read their glossary labels. */
  children?: ReactNode;
  title?: string;
}

function isLabeled(variant: BadgeVariant): variant is LabeledBadgeVariant {
  return variant in BADGE_WORDS;
}

/**
 * Small outlined label. The simulated variant marks a panel fed by scripted events, and keeps its
 * simulated-badge test ID when none is given. Each labeled variant has its own border or mark, so
 * its color is never the only cue.
 */
export function Badge({ testId, variant = "neutral", children, title }: BadgeProps) {
  if (isLabeled(variant)) {
    const words = BADGE_WORDS[variant];
    return (
      <span
        className={`c-badge c-badge--${variant}`}
        data-testid={testId ?? (variant === "simulated" ? "simulated-badge" : undefined)}
        data-variant={variant}
        title={title ?? BADGE_TITLES[variant].en}
      >
        {variant === "live" && <span className="c-badge__dot" aria-hidden="true" />}
        <span lang="en">{words.en}</span>
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
