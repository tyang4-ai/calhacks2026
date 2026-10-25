import type { CSSProperties, ReactNode } from "react";
import type { Lang } from "../core/types";

/** The desktop page. The kit owns these sizes: the shell's stage and the demo tests import them. */
export const PAGE_WIDTH = 1440;
export const PAGE_HEIGHT = 900;

export interface PageFrameProps {
  testId?: string;
  lang?: Lang;
  /** The stage sets opacity on a frame its camera doesn't show. */
  style?: CSSProperties;
  className?: string;
  /** The stage makes a frame its camera doesn't show inert, so it keeps its state but takes no input. */
  inert?: boolean;
  children?: ReactNode;
}

/**
 * The 1440 by 900 desktop page on the paper ground. A column: the shell stacks the top bar, the
 * process bar band and the page under it. Drawers sit inside it, anchored to its right edge.
 */
export function PageFrame({ testId, lang, style, className, inert, children }: PageFrameProps) {
  return (
    <div
      className={`c-page${className ? ` ${className}` : ""}`}
      data-testid={testId}
      lang={lang}
      inert={inert || undefined}
      style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, ...style }}
    >
      {children}
    </div>
  );
}
