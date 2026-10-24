// Start at the catch, for Hyphenate's judges (demo-script.md): seek to d07-catch (30.0) and play to
// the end (60.0), show "Rewind to the buyer" for 1 second, seek to 0.0, play d01-ask to d05-money,
// and pause at the end of d05-money (19.999, just before d06's beat.started) so Gordon can talk. Reset, a seek or a load from anyone else cancels it.
import { player } from "../../core/player";
import { beatStart } from "../controls/playback";

export type CatchPhase = "idle" | "catch" | "rewind" | "buyer";

/** The rewind card shows for this long, in real time, while the player waits at 60.0. */
export const REWIND_MS = 1000;
export const REWIND_LINE = "Rewind to the buyer";

let phase: CatchPhase = "idle";
let ownEpoch = -1;
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
/** True while this module itself seeks or plays, so its own epoch change isn't read as a cancel. */
let acting = false;
const listeners = new Set<() => void>();

function setPhase(p: CatchPhase): void {
  if (phase === p) return;
  phase = p;
  for (const l of Array.from(listeners)) l();
}

function stop(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  unsubscribe?.();
  unsubscribe = null;
  setPhase("idle");
}

/**
 * Where the buyer half stops: 1 ms before d06-month starts (20.0), so d05-money's buyer-studio
 * camera stays up while Gordon talks. At 20.0 itself d06's beat.started would already have fired.
 */
function buyerEnd(): number {
  return (beatStart("d06-month") ?? 20000) - 1;
}

function onPlayer(): void {
  if (acting) return;
  if (player.epoch() !== ownEpoch) {
    stop();
    return;
  }
  if (phase === "catch" && !player.isPlaying() && player.now() >= player.durationMs()) {
    setPhase("rewind");
    timer = setTimeout(() => {
      timer = null;
      if (player.epoch() !== ownEpoch) return stop();
      acting = true;
      player.seek(0);
      ownEpoch = player.epoch();
      setPhase("buyer");
      player.play();
      acting = false;
    }, REWIND_MS);
  } else if (phase === "buyer" && player.now() >= buyerEnd()) {
    const end = buyerEnd();
    stop();
    player.pause();
    // A frame can overshoot. Land exactly on the stop.
    if (player.now() > end) player.seek(end);
  }
}

/** Starts the sequence. Returns false, doing nothing, while no timeline with d07-catch is loaded. */
export function startAtCatch(): boolean {
  const at = beatStart("d07-catch");
  if (at === null) return false;
  stop();
  player.seek(at);
  ownEpoch = player.epoch();
  unsubscribe = player.subscribe(onPlayer);
  setPhase("catch");
  player.play();
  return true;
}

export function cancelStartAtCatch(): void {
  stop();
}

export function catchPhase(): CatchPhase {
  return phase;
}

export function subscribeCatchPhase(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
