import type { ReactNode } from "react";
import type { Lang } from "../core/types";

export interface TopNavProps {
  testId?: string;
  /** The word Cindia and the Shop and Sell switch. */
  left?: ReactNode;
  /** Usually empty. A maker page shows the maker here. */
  center?: ReactNode;
  /** L1, Help, Ask Cindy and the language toggle. */
  right?: ReactNode;
  lang?: Lang;
}

/** The top bar: 56 px, a hairline bottom, with left, center and right parts. */
export function TopNav({ testId, left, center, right, lang }: TopNavProps) {
  return (
    <header className="c-topnav" data-testid={testId} lang={lang}>
      <div className="c-topnav__left">{left}</div>
      <div className="c-topnav__center">{center}</div>
      <div className="c-topnav__right">{right}</div>
    </header>
  );
}
