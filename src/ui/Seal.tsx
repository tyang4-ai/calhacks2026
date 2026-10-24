import { formatDate } from "./formatDate";
import { sealPose, usePlayerTime, useReducedMotion } from "./motion";

export interface SealProps {
  testId?: string;
  /** One Chinese character, for example 准. */
  char: string;
  /** ISO date of the decision. */
  date?: string;
  lang?: "en" | "zh";
  size?: number;
  /** Player time (ms) when the owner approved. The seal lands over 220 ms from here. */
  startAt?: number;
  now?: number;
}

/** The owner's square cinnabar stamp. Cindy never stamps anything. */
export function Seal({ testId, char, date, lang = "zh", size = 64, startAt, now }: SealProps) {
  const playerNow = usePlayerTime();
  const reduced = useReducedMotion();
  const pose = startAt === undefined ? { scale: 1, opacity: 1, rotate: -4 } : sealPose(now ?? playerNow, startAt, reduced);
  const rotate = reduced ? 0 : pose.rotate;
  return (
    <span
      className="c-seal"
      data-testid={testId}
      role="img"
      aria-label={lang === "zh" ? "已盖章" : "Sealed"}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.5),
        opacity: pose.opacity,
        transform: `scale(${pose.scale}) rotate(${rotate}deg)`,
      }}
    >
      <span>{char}</span>
      {date && <span className="c-seal__date">{formatDate(date, lang).replace(/^\d{4}年/, "")}</span>}
    </span>
  );
}
