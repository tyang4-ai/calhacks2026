import type { ProcessStatus } from "../core/events";
import type { Lang, Text } from "../core/types";
import {
  countShown,
  countVisible,
  liveMarkShown,
  markAtTop,
  PROCESS_STATUS_LOOK,
  processBlockClass,
  processBlockWidth,
  pulseLevel,
  type ProcessStatusLook,
} from "./frames";
import { usePlayerTime, useReducedMotion } from "./motion";
import { DOT_SEPARATOR, LIVE_WORD, pickText, STATUS_WORDS } from "./strings";

export interface ProcessBlockProps {
  testId?: string;
  label: Text;
  lang: Lang;
  status: ProcessStatus;
  count?: number | string;
  /** True when every key the process watches is live. */
  live: boolean;
  /** Holds the status word. F-process passes process-block-status-<processId>. */
  statusTestId?: string;
  /** Holds the count. F-process passes process-block-count-<processId>. */
  countTestId?: string;
  /** Holds the Live mark, rendered only while live. F-process passes process-block-live-<processId>. */
  liveTestId?: string;
  /** Its view is open. */
  selected?: boolean;
  onClick?: () => void;
}

/**
 * One block of the process bar, on the beam (design drop 3): 104 by 48 px, or 124 px when its label
 * needs it (Counterfeit watch), so its label fits on one line at 14 px. Line 1 is the label, line 2
 * the count, a middle dot and the status word (Idle, Working, Done, Attention). A count of zero is
 * left out of sight. A 3 px thread runs 4 px above the foot: dotted when idle, drawn partway and
 * pulsing on the player clock when working, full when done, dashed when it needs attention. Done
 * marks itself with a check and attention with "!", at the top right when the label leaves room and
 * at the end of line 2 otherwise, so a 14 px label is never cut (Counterfeit watch fills its 124 px).
 * With `live` it shows a small Live dot at the top right. It never shows Simulated: the bar's summary
 * says that once.
 */
export function ProcessBlock({
  testId,
  label,
  lang,
  status,
  count,
  live,
  statusTestId,
  countTestId,
  liveTestId,
  selected = false,
  onClick,
}: ProcessBlockProps) {
  const look = PROCESS_STATUS_LOOK[status];
  const word = pickText(STATUS_WORDS[status], lang);
  const name = pickText(label, lang);
  const width = processBlockWidth(label.en);
  const hasMark = look.icon === "check" || look.icon === "bang";
  const markTop = hasMark && markAtTop(label.en);
  const showCount = countShown(count);
  const countSeen = countVisible(count);
  return (
    <button
      type="button"
      className={`${processBlockClass(status, selected)}${liveMarkShown(live) ? " c-pblock--live" : ""}${markTop ? " c-pblock--mark-top" : ""}`}
      data-testid={testId}
      data-status={status}
      aria-pressed={selected}
      title={name}
      lang={lang}
      onClick={onClick}
      style={{ width, minWidth: width, maxWidth: width, flex: `0 0 ${width}px` }}
    >
      {liveMarkShown(live) && (
        <span
          className="c-pblock__live"
          data-testid={liveTestId}
          title={pickText(LIVE_WORD, lang)}
        >
          <span className="c-pblock__live-dot" aria-hidden="true" />
          <span className="c-visually-hidden">{pickText(LIVE_WORD, lang)}</span>
        </span>
      )}
      {markTop && <StatusMark icon={look.icon} top />}
      <span className="c-pblock__label">{name}</span>
      <span className="c-pblock__meta">
        {showCount && (
          <span className={`c-pblock__count${countSeen ? "" : " c-visually-hidden"}`} data-testid={countTestId}>
            {count}
          </span>
        )}
        {countSeen && (
          <span className="c-pblock__sep" aria-hidden="true">
            {DOT_SEPARATOR}
          </span>
        )}
        <span className="c-pblock__status" data-testid={statusTestId}>
          <span className="c-pblock__word">{word}</span>
        </span>
        {hasMark && !markTop && <StatusMark icon={look.icon} />}
      </span>
      {look.pulses ? <PulsingThread look={look} /> : <BlockThread look={look} opacity={1} />}
    </button>
  );
}

/** Only a working block subscribes to the player clock, so idle blocks never re-render per frame. */
function PulsingThread({ look }: { look: ProcessStatusLook }) {
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  return <BlockThread look={look} opacity={pulseLevel(now, reduced)} />;
}

/** The thread patterns, the same values as --c-thread-dash-idle and --c-thread-dash-attention. */
const DASH: Record<ProcessStatusLook["thread"], string | undefined> = {
  dotted: "2 6",
  partial: undefined,
  solid: undefined,
  broken: "8 6",
};

function BlockThread({ look, opacity }: { look: ProcessStatusLook; opacity: number }) {
  return (
    <svg className="c-pblock__thread" aria-hidden="true" preserveAspectRatio="none" style={{ opacity }}>
      <line
        x1="0"
        y1="1.5"
        x2={look.thread === "partial" ? "60%" : "100%"}
        y2="1.5"
        strokeWidth="3"
        strokeLinecap="butt"
        strokeDasharray={DASH[look.thread]}
      />
    </svg>
  );
}

/** The mark: a check when done, "!" when it needs attention. At the top right, or after the status word. */
function StatusMark({ icon, top = false }: { icon: ProcessStatusLook["icon"]; top?: boolean }) {
  return (
    <svg className={`c-pblock__mark${top ? " c-pblock__mark--top" : ""}`} viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      {icon === "check" && <path d="M1.5 6.5 L4.5 9.5 L10.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />}
      {icon === "bang" && (
        <g fill="currentColor">
          <rect x="5" y="1" width="2" height="7" />
          <rect x="5" y="9.5" width="2" height="2" />
        </g>
      )}
    </svg>
  );
}
