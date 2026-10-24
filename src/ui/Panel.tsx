import type { CSSProperties, ReactNode } from "react";
import type { SourceKey } from "../core/events";
import { useCindia } from "../core/store";
import { Badge } from "./Badge";

export interface PanelProps {
  testId?: string;
  title?: ReactNode;
  /** Shown on the right of the title row. */
  actions?: ReactNode;
  /** The source keys this panel renders (the Slots table in ui-contract.md). */
  sourceKeys: SourceKey[];
  /** Phones pad 16, the console pads 24. */
  density?: "console" | "phone";
  lang?: "en" | "zh";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * The mounted panel. It shows the Simulated badge while any of its source keys is "scripted" in
 * the store's sources.
 */
export function Panel({ testId, title, actions, sourceKeys, density = "console", lang, className, style, children }: PanelProps) {
  const simulated = useCindia((s) => sourceKeys.some((k) => s.sources[k] === "scripted"));
  const hasHead = title !== undefined || actions !== undefined || simulated;
  return (
    <section
      className={`c-panel${density === "phone" ? " c-panel--phone" : ""}${className ? ` ${className}` : ""}`}
      data-testid={testId}
      lang={lang}
      style={style}
    >
      <div className="c-panel__face">
        {hasHead && (
          <header className="c-panel__head">
            <div className="c-panel__title">{title !== undefined && <h2 className="c-panel__title">{title}</h2>}</div>
            <div className="c-panel__actions">
              {actions}
              {simulated && <Badge variant="simulated" testId="simulated-badge" />}
            </div>
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
