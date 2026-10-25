// Presenter mode, /demo?mode=present (ui-contract.md, Modes and starts; demo-script.md, The modes):
// Gordon at the table, one beat at a time.
// - The stage seeks to the first beat, or the one ?start= names, and plays it.
// - Each beat pauses by itself 1 ms before the next beat's first beat.started, so its last frame
//   stays up. A frame that overshoots seeks back to that stop.
// - Paused at a beat's end, Space or the right arrow plays the next beat, and the left arrow replays
//   the current one from its start. While a beat plays, the right arrow jumps to the next beat's
//   start and Space pauses or resumes.
// - After d12-receipt the end card shows and stays: the right arrow or Space hides it and plays
//   d02-surprise, the left arrow hides it and replays d12-receipt.
// - After the last beat the player stops at the end of the timeline.
// Every time comes from the timeline's beat.started events (playback.ts), never from a constant.
import { player } from "../../core/player";
import { SPINE_LAST_BEAT, beatAt, beatSpans, beatStop, nextBeatAfter } from "../controls/playback";

let active = false;
/** The stop the playing beat pauses at, armed when play starts, or null while paused. */
let armed: number | null = null;
/** The player's epoch when the stop was armed: a seek while playing re-arms it. */
let armedEpoch = -1;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of Array.from(listeners)) l();
}

/**
 * The stop for a run that starts playing at `ms`: the end of the beat it plays into. Playing from a
 * beat's last millisecond plays the next beat, so the beat is the one at ms + 1. Infinity for the
 * last beat, which ends with the run.
 */
export function stopFor(ms: number): number {
  const beat = beatAt(ms + 1);
  if (!beat) {
    const first = beatSpans()[0];
    return first ? (beatStop(first.beatId) ?? Infinity) : Infinity;
  }
  return beatStop(beat.beatId) ?? Infinity;
}

function onPlayer(): void {
  if (!active) return;
  if (!player.isPlaying()) {
    armed = null;
    return;
  }
  if (armed === null || armedEpoch !== player.epoch()) {
    armed = stopFor(player.now());
    armedEpoch = player.epoch();
  }
  const stop = armed;
  if (player.now() >= stop) {
    armed = null;
    player.pause();
    // A frame can overshoot. Land exactly on the stop.
    if (player.now() > stop) player.seek(stop);
  }
}

/** Starts presenter mode at a beat (the first when null), and plays it. */
export function startPresenter(beatId: string | null): void {
  stopPresenter();
  active = true;
  unsubscribe = player.subscribe(onPlayer);
  const spans = beatSpans();
  const at = (beatId ? spans.find((b) => b.beatId === beatId)?.start : undefined) ?? spans[0]?.start ?? 0;
  player.pause();
  player.seek(at);
  player.play();
  notify();
}

export function stopPresenter(): void {
  unsubscribe?.();
  unsubscribe = null;
  armed = null;
  if (active) {
    active = false;
    notify();
  }
}

export function presenterActive(): boolean {
  return active;
}

export function subscribePresenter(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** True while the player waits on the spine's last millisecond, where presenter mode shows the end card. */
export function atSpineEnd(): boolean {
  const stop = beatStop(SPINE_LAST_BEAT);
  return stop !== null && !player.isPlaying() && player.now() === stop;
}

/** The presenter's keys. Space pauses or plays on; right plays the next beat; left replays the current one. */
export function presenterKey(key: "space" | "right" | "left"): void {
  if (!active) return;
  const now = player.now();
  if (key === "space") {
    if (player.isPlaying()) player.pause();
    else player.play();
    return;
  }
  if (key === "right") {
    const next = nextBeatAfter(now);
    if (!next) return;
    player.seek(next.start);
    player.play();
    return;
  }
  const current = beatAt(now) ?? beatSpans()[0];
  if (!current) return;
  player.seek(current.start);
  player.play();
}
