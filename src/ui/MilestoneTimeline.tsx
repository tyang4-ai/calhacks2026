import type { ReactNode } from "react";
import type { IsoDate, Lang, MilestoneStatus, Text } from "../core/types";
import { milestoneSegments } from "./cards";
import { formatBps } from "./formatCents";
import { formatDate } from "./formatDate";
import { Money } from "./Money";
import { MILESTONE_STATUS_WORDS, pickText } from "./strings";

export interface MilestoneItem {
  milestoneId: string;
  label: Text;
  /** Its share of the commission. One commission's shares add up to 10000. */
  shareBps: number;
  amountCents?: number;
  status: MilestoneStatus;
  date?: IsoDate;
}

export interface MilestoneTimelineProps {
  /** Milestone n's row gets `<testIdPrefix><milestoneId>`, such as wip-milestone-mls_01. */
  testIdPrefix: string;
  /** On the list's root. */
  testId?: string;
  milestones: MilestoneItem[];
  lang: Lang;
  /** Drawn at the end of a milestone's row, such as a release button. */
  renderAction?: (milestoneId: string) => ReactNode;
  /** Drawn under a milestone's status, such as "Needs your approval". */
  renderNote?: (milestoneId: string) => ReactNode;
}

/**
 * A work in progress's milestones: a thread along the commission with one segment per milestone,
 * sized by its share, then one row each with its knot, label, share, amount, status word and date.
 * The status shows as a knot shape and a word as well as a color.
 */
export function MilestoneTimeline({ testIdPrefix, testId, milestones, lang, renderAction, renderNote }: MilestoneTimelineProps) {
  const segments = milestoneSegments(milestones.map((m) => m.shareBps));
  return (
    <div className="c-milestones" data-testid={testId} lang={lang}>
      <div className="c-milestones__thread" aria-hidden="true">
        {milestones.map((m, i) => (
          <span
            key={m.milestoneId}
            className={`c-milestones__seg c-milestones__seg--${m.status}`}
            style={{ left: `${segments[i].start * 100}%`, width: `${segments[i].width * 100}%` }}
          />
        ))}
      </div>
      <ol className="c-milestones__list">
        {milestones.map((m) => {
          const action = renderAction?.(m.milestoneId);
          const note = renderNote?.(m.milestoneId);
          return (
            <li key={m.milestoneId} className={`c-milestone c-milestone--${m.status}`} data-testid={`${testIdPrefix}${m.milestoneId}`} data-status={m.status}>
              <MilestoneKnot status={m.status} />
              <div className="c-milestone__main">
                <p className="c-milestone__label">{pickText(m.label, lang)}</p>
                <p className="c-milestone__meta">
                  <span className="c-milestone__share">{formatBps(m.shareBps)}</span>
                  {m.amountCents !== undefined && (
                    <>
                      {" · "}
                      <Money cents={m.amountCents} tone={m.status === "paid" ? "in" : "neutral"} />
                    </>
                  )}
                </p>
                {note !== undefined && note !== null && <div className="c-milestone__note">{note}</div>}
              </div>
              <p className="c-milestone__status" data-role="status">
                <span>{pickText(MILESTONE_STATUS_WORDS[m.status], lang)}</span>
                {m.date && <span className="c-milestone__date">{formatDate(m.date, lang)}</span>}
              </p>
              {action !== undefined && action !== null && <div className="c-milestone__action">{action}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Pending is a hollow knot, reached a filled one, paid a filled one with a check. */
function MilestoneKnot({ status }: { status: MilestoneStatus }) {
  return (
    <svg className="c-milestone__knot" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      {status === "pending" && <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2" />}
      {status === "reached" && <circle cx="10" cy="10" r="7" fill="currentColor" />}
      {status === "paid" && (
        <g>
          <circle cx="10" cy="10" r="8" fill="currentColor" />
          <path d="M6 10.5 L8.8 13.2 L14 7.5" fill="none" stroke="var(--c-color-paper)" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
