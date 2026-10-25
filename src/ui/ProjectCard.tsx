import type { ReactNode } from "react";
import type { Lang, Text } from "../core/types";
import { progressPercent, progressShare } from "./cards";
import { Money } from "./Money";
import { pickText, RAISED_OF } from "./strings";

export interface ProjectCardProps {
  testId?: string;
  /** On the progress block: the bar and "raised of goal" through Money. */
  progressTestId?: string;
  title: Text;
  summary: Text;
  raisedCents: number;
  goalCents: number;
  lang: Lang;
  /** Under the progress, such as the fund button and L7 beside it. */
  action?: ReactNode;
}

/** A community project with its progress: a bar, then the raised amount against the goal and the percent. */
export function ProjectCard({ testId, progressTestId, title, summary, raisedCents, goalCents, lang, action }: ProjectCardProps) {
  const share = progressShare(raisedCents, goalCents);
  const pct = progressPercent(raisedCents, goalCents);
  const [before, between, after] = RAISED_OF[lang];
  return (
    <article className="c-projcard" data-testid={testId} lang={lang}>
      <h3 className="c-projcard__title">{pickText(title, lang)}</h3>
      <p className="c-projcard__summary">{pickText(summary, lang)}</p>
      <div className="c-progress" data-testid={progressTestId} data-raised={raisedCents} data-goal={goalCents}>
        <div className="c-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="c-progress__fill" style={{ width: `${share * 100}%` }} />
        </div>
        <p className="c-progress__words">
          {before}
          <Money cents={raisedCents} />
          {between}
          <Money cents={goalCents} />
          {after}
          <span className="c-progress__pct">{` · ${pct}%`}</span>
        </p>
      </div>
      {action !== undefined && <div className="c-projcard__action">{action}</div>}
    </article>
  );
}
