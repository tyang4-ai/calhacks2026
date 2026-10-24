// A number that counts up from zero on the player's clock when it first appears.
// It shows the final value at once when the value was already there on mount, arrived with a
// seek, reset or load (the player's epoch changed), arrived while the player was paused, or when
// reduced motion is on. Before the value exists it shows the placeholder (a dash), never zero.
import { useState, useSyncExternalStore } from "react";
import { player } from "../../core/player";
import { easeOut, progress, usePlayerTime, useReducedMotion } from "../../ui";

/** Short enough to finish inside the d09-close beat (impact.updated at 45.5 s, beat ends 47.0 s). */
export const COUNT_UP_MS = 900;

interface Track {
  value: number | null;
  epoch: number;
  startAt: number;
  animate: boolean;
}

/** The value to show now: null before it exists, else between 0 and the target. */
function useCountUp(target: number | null, durationMs = COUNT_UP_MS): number | null {
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  const epoch = useSyncExternalStore(player.subscribe, player.epoch, player.epoch);
  const [track, setTrack] = useState<Track>(() => ({ value: target, epoch, startAt: now, animate: false }));

  let current = track;
  if (track.value !== target || track.epoch !== epoch) {
    // Count up only when the value first appears during normal play in the same epoch.
    const appeared = target !== null && track.value === null;
    const animate = appeared && track.epoch === epoch && player.isPlaying();
    current = { value: target, epoch, startAt: now, animate };
    setTrack(current);
  }

  if (target === null) return null;
  if (!current.animate || reduced) return target;
  return target * easeOut(progress(now, current.startAt, durationMs));
}

export interface CountUpProps {
  value: number | null;
  format: (n: number) => string;
  placeholder: string;
  durationMs?: number;
}

export function CountUp({ value, format, placeholder, durationMs }: CountUpProps) {
  const shown = useCountUp(value, durationMs);
  return <span data-role="value" style={{ fontVariantNumeric: "tabular-nums" }}>{shown === null ? placeholder : format(shown)}</span>;
}
