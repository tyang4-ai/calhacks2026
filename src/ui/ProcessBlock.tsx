import type { ProcessStatus } from "../core/events";
import type { Lang, Text } from "../core/types";
import { countShown, liveMarkShown, PROCESS_STATUS_LOOK, processBlockClass, pulseLevel, type ProcessStatusLook } from "./frames";
import { usePlayerTime, useReducedMotion } from "./motion";
import { LIVE_WORD, pickText, STATUS_WORDS } from "./strings";

export interface ProcessBlockProps {
  testId?: string;
  label: Text;
  lang: Lang;
  status: ProcessStatus;
  count?: number | string;
  /** True when every key the process watches is live. */
  live: boolean;
  /** Holds the status icon and word. F-process passes process-block-status-<processId>. */
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
 * One block of the process bar, at most 120 px wide so eleven fit one row of the 1440 px page.
 * Its label (up to two lines), then its status as an icon and a word with its count, then a thread
 * along its foot. A working block's thread pulses on the player clock. With `live` it shows a small
 * Live mark. It never shows a Simulated badge: the bar shows one for all blocks.
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
  return (
    <button
      type="button"
      className={processBlockClass(status, selected)}
      data-testid={testId}
      data-status={status}
      aria-pressed={selected}
      title={name}
      lang={lang}
      onClick={onClick}
    >
      {liveMarkShown(live) && (
        <span className="c-pblock__live" data-testid={liveTestId} title={pickText(LIVE_WORD, lang)}>
          <span className="c-pblock__live-dot" aria-hidden="true" />
          <span className="c-visually-hidden">{pickText(LIVE_WORD, lang)}</span>
        </span>
      )}
      <span className="c-pblock__label">{name}</span>
      <span className="c-pblock__meta">
        <span className="c-pblock__status" data-testid={statusTestId}>
          <StatusIcon icon={look.icon} />
          <span className="c-pblock__word">{word}</span>
        </span>
        {countShown(count) && (
          <span className="c-pblock__count" data-testid={countTestId}>
            {count}
          </span>
        )}
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

const DASH: Record<ProcessStatusLook["thread"], string | undefined> = {
  dotted: "2 6",
  dashed: "6 4",
  solid: undefined,
  broken: "8 6",
};

function BlockThread({ look, opacity }: { look: ProcessStatusLook; opacity: number }) {
  return (
    <svg className="c-pblock__thread" aria-hidden="true" preserveAspectRatio="none" style={{ opacity }}>
      <line x1="0" y1="1.5" x2="100%" y2="1.5" strokeWidth="3" strokeDasharray={DASH[look.thread]} />
    </svg>
  );
}

function StatusIcon({ icon }: { icon: ProcessStatusLook["icon"] }) {
  return (
    <svg className="c-pblock__icon" viewBox="0 0 14 14" width="12" height="12" aria-hidden="true">
      {icon === "ring" && <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {icon === "dots" && (
        <g fill="currentColor">
          <circle cx="2.5" cy="7" r="1.5" />
          <circle cx="7" cy="7" r="1.5" />
          <circle cx="11.5" cy="7" r="1.5" />
        </g>
      )}
      {icon === "check" && <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />}
      {icon === "bang" && (
        <g>
          <rect x="1" y="1" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 3.5 V8" stroke="currentColor" strokeWidth="1.8" />
          <rect x="6.1" y="9.4" width="1.8" height="1.8" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
