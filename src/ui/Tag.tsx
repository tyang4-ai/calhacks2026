import type { ReactNode } from "react";
import { Icon } from "./Icon";

export type TagVariant = "neutral" | "match" | "sample" | "limit";

export interface TagProps {
  testId?: string;
  /**
   * neutral: paper with an edge border, ink-soft words (the Illustration tag, sheet names, facets).
   * match: indigo wash, indigo words (a facet a result shares with the request). sample: ink wash,
   * ink words (placeholder content). limit: amber wash, amber words and the flag icon ("Over your
   * $500 limit").
   */
  variant?: TagVariant;
  children?: ReactNode;
  title?: string;
}

/** A small woven label (design drop 3): Label/14, 2 by 8 px padding, 2 px corners. */
export function Tag({ testId, variant = "neutral", children, title }: TagProps) {
  return (
    <span className={`c-tag${variant !== "neutral" ? ` c-tag--${variant}` : ""}`} data-testid={testId} data-variant={variant} title={title}>
      {variant === "limit" && <Icon name="flag" size={16} />}
      {children}
    </span>
  );
}
