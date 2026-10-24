import type { CSSProperties, ReactNode } from "react";

export const PHONE_WIDTH = 390;
export const PHONE_HEIGHT = 844;

export interface PhoneFrameProps {
  testId?: string;
  lang?: "en" | "zh";
  style?: CSSProperties;
  children?: ReactNode;
}

/** The phone frame: 390 by 844, 36 px corners, the only shadow in the kit. */
export function PhoneFrame({ testId, lang, style, children }: PhoneFrameProps) {
  return (
    <div className="c-phone" data-testid={testId} lang={lang} style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT, ...style }}>
      <div className="c-phone__notch" aria-hidden="true" />
      <div className="c-phone__screen">{children}</div>
    </div>
  );
}
