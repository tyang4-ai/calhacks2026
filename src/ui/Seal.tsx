import { formatMonthDay } from "./formatDate";
import { sealPose, usePlayerTime, useReducedMotion } from "./motion";

export interface SealProps {
  testId?: string;
  /** One Chinese character, for example 准. */
  char: string;
  /** ISO date of the decision. The seal shows its month and day. */
  date?: string;
  lang?: "en" | "zh";
  size?: number;
  /** Player time (ms) when the owner approved. The seal lands over 220 ms from here. */
  startAt?: number;
  now?: number;
}

/** The smallest text the kit draws (design-system.md). The date line and the character never go under it. */
const MIN_TEXT_PX = 14;
/** Room the date line leaves at each side of the seal. */
const DATE_SIDE_PX = 3;

/**
 * A rough width of a date line in ems: digits, Latin letters, spaces and CJK characters. Checked in
 * Chromium against the kit's body font at 14 px ("Oct 1" 37 px, "10月1日" 55 px, "11月28日" 64 px).
 */
function dateEms(label: string): number {
  let ems = 0;
  for (const ch of label) {
    if (/\d/.test(ch)) ems += 0.64;
    else if (ch === " ") ems += 0.28;
    else if (/[A-Z]/.test(ch)) ems += 0.72;
    else if (/[a-z]/.test(ch)) ems += 0.56;
    else ems += 1;
  }
  return ems;
}

/** Whether a date line fits on one line at 14 px. A seal too small to hold it shows its character alone. */
function sealDateFits(label: string, size: number): boolean {
  return dateEms(label) * MIN_TEXT_PX <= size - 2 * DATE_SIDE_PX;
}

/** The owner's square cinnabar stamp. Cindy never stamps anything. */
export function Seal({ testId, char, date, lang = "en", size = 64, startAt, now }: SealProps) {
  const playerNow = usePlayerTime();
  const reduced = useReducedMotion();
  const pose = startAt === undefined ? { scale: 1, opacity: 1, rotate: -4 } : sealPose(now ?? playerNow, startAt, reduced);
  const rotate = reduced ? 0 : pose.rotate;
  const monthDay = date ? formatMonthDay(date, lang) : "";
  // The date never shrinks under 14 px. Where it can't fit, the seal drops it, and the card that
  // carries a small seal shows the decision's date in its own text.
  const dateLabel = monthDay && sealDateFits(monthDay, size) ? monthDay : "";
  return (
    <span
      className="c-seal"
      data-testid={testId}
      role="img"
      aria-label={lang === "zh" ? "已盖章" : "Sealed"}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(MIN_TEXT_PX, Math.round(size * 0.5)),
        opacity: pose.opacity,
        transform: `scale(${pose.scale}) rotate(${rotate}deg)`,
      }}
    >
      <span className="c-seal__char">{char}</span>
      {dateLabel && <span className="c-seal__date">{dateLabel}</span>}
    </span>
  );
}
