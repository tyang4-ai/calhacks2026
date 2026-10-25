import { createElement, type ReactElement } from "react";
import { ICON_SHAPES, type IconName } from "./icons/shapes";

export interface IconProps {
  /** One of the sixteen names in ICON_NAMES. */
  name: IconName;
  /** Px. The icons sit on a 20 px grid. */
  size?: number;
  /** A word for screen readers. Leave it out when a word beside the icon says the same (the usual case). */
  label?: string;
  testId?: string;
  className?: string;
}

/**
 * A line icon from design drop 3: a 20 px grid, a 1.5 px stroke, square caps and joins, in
 * currentColor so it takes the color of the words beside it. Every state icon comes with a word.
 */
export function Icon({ name, size = 20, label, testId, className }: IconProps): ReactElement {
  const shapes = ICON_SHAPES[name] ?? [];
  return (
    <svg
      className={`c-icon${className ? ` ${className}` : ""}`}
      data-testid={testId}
      data-icon={name}
      viewBox="0 0 20 20"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {shapes.map((s, i) => createElement(s.tag, { key: i, ...s.attrs }))}
    </svg>
  );
}
