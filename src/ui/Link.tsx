import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { navigate } from "../core/nav";
import { followLink } from "./frames";

export interface LinkProps {
  /** A path, usually from a src/core/nav.ts route builder. */
  to: string;
  testId?: string;
  children?: ReactNode;
  /** `text` (default) is an underlined inline link. `block` wraps a card or a tile, with no underline. */
  variant?: "text" | "block";
  className?: string;
  style?: CSSProperties;
  title?: string;
  ariaLabel?: string;
}

/**
 * A real anchor to `to`. A plain click (the main button, no modifier key) calls navigate(to) and
 * stops the page load. Any other click keeps the browser's own behavior, so Ctrl-click still opens
 * a new tab. On /demo navigate does nothing, so the stage keeps driving the page.
 */
export function Link({ to, testId, children, variant = "text", className, style, title, ariaLabel }: LinkProps) {
  return (
    <a
      href={to}
      data-testid={testId}
      className={`c-link c-link--${variant}${className ? ` ${className}` : ""}`}
      style={style}
      title={title}
      aria-label={ariaLabel}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        followLink(e, to, navigate);
      }}
    >
      {children}
    </a>
  );
}
