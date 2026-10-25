import type { ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { CLOSE_WORD, pickText } from "./strings";

export interface ProcessViewProps {
  testId?: string;
  title: Text;
  /** Live badge when true, the Simulated badge (simulated-badge) otherwise. */
  live: boolean;
  lang: Lang;
  children?: ReactNode;
  /** The event log, under a hairline. */
  log?: ReactNode;
  /** Shows a close button that calls it. */
  onClose?: () => void;
  /** On the close button. F-process passes process-view-close. */
  closeTestId?: string;
  /** One line under the title: what the view shows. */
  subtitle?: Text;
  /** In the title row before the badge, such as a run picker. */
  actions?: ReactNode;
}

/**
 * The frame of a process view: a title row with the Live or Simulated badge and, with `onClose`, a
 * close button, then the body, then the log under a hairline. It fills its container, such as the
 * shell's 1200 by 720 overlay.
 */
export function ProcessView({ testId, title, live, lang, children, log, onClose, closeTestId, subtitle, actions }: ProcessViewProps) {
  return (
    <section className="c-pview" data-testid={testId} data-live={live} lang={lang}>
      <header className="c-pview__head">
        <div className="c-pview__titles">
          <h2 className="c-pview__title">{pickText(title, lang)}</h2>
          {subtitle && <p className="c-pview__subtitle">{pickText(subtitle, lang)}</p>}
        </div>
        <div className="c-pview__actions">
          {actions}
          {live ? <Badge variant="live" /> : <Badge variant="simulated" testId="simulated-badge" />}
          {onClose && (
            <button type="button" className="c-pview__close" data-testid={closeTestId} onClick={() => onClose()}>
              <Icon name="close" size={16} />
              <span>{pickText(CLOSE_WORD, lang)}</span>
            </button>
          )}
        </div>
      </header>
      <div className="c-pview__body">{children}</div>
      {log !== undefined && <div className="c-pview__log">{log}</div>}
    </section>
  );
}
