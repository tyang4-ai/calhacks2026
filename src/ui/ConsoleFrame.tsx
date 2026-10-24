import type { CSSProperties, ReactNode } from "react";

export const CONSOLE_WIDTH = 1280;
export const CONSOLE_HEIGHT = 800;

export interface ConsoleFrameProps {
  testId?: string;
  lang?: "en" | "zh";
  style?: CSSProperties;
  children?: ReactNode;
}

/** The studio console's frame: 1280 by 800. */
export function ConsoleFrame({ testId, lang, style, children }: ConsoleFrameProps) {
  return (
    <div className="c-console" data-testid={testId} lang={lang} style={{ width: CONSOLE_WIDTH, height: CONSOLE_HEIGHT, ...style }}>
      {children}
    </div>
  );
}
