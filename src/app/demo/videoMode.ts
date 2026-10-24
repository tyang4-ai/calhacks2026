// Video mode, /demo?video=1 (demo-script.md): a 5-second cold open on the catch (the player seeks
// to 38.0 without animation and the stage shows the studio-catch camera), then a reset and the full
// 60 seconds from d01-ask, then the 5-second end card after 60.0. The cold open and the end card
// are real-time holds while the player is paused or finished, so the run itself stays on the
// player clock. Reset, a seek or a load from anyone else ends it.
import { player } from "../../core/player";

export type VideoPhase = "off" | "cold-open" | "run" | "end-card" | "done";

export const COLD_OPEN_MS = 5000;
export const END_CARD_MS = 5000;
/** Where the cold open freezes the player: the end of d07-catch, with the flag and its evidence up. */
export const COLD_OPEN_AT = 38000;

let phase: VideoPhase = "off";
let ownEpoch = -1;
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
/** True while this module itself seeks, resets or plays, so its own epoch change isn't read as a cancel. */
let acting = false;
const listeners = new Set<() => void>();

function setPhase(p: VideoPhase): void {
  if (phase === p) return;
  phase = p;
  for (const l of Array.from(listeners)) l();
}

function clearTimer(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function onPlayer(): void {
  if (acting || phase === "off" || phase === "done") return;
  if (player.epoch() !== ownEpoch) {
    // Someone else reset or seeked: drop the cold open or the end card, keep the stage as it is.
    clearTimer();
    setPhase("done");
    return;
  }
  if (phase === "run" && !player.isPlaying() && player.now() >= player.durationMs()) {
    setPhase("end-card");
    timer = setTimeout(() => {
      timer = null;
      setPhase("done");
    }, END_CARD_MS);
  }
}

/** Starts video mode from the cold open. Calling it again restarts it. */
export function startVideo(): void {
  stopVideo();
  unsubscribe = player.subscribe(onPlayer);
  player.pause();
  player.seek(COLD_OPEN_AT);
  ownEpoch = player.epoch();
  setPhase("cold-open");
  timer = setTimeout(() => {
    timer = null;
    if (player.epoch() !== ownEpoch) return setPhase("done");
    acting = true;
    player.reset();
    ownEpoch = player.epoch();
    setPhase("run");
    player.play();
    acting = false;
  }, COLD_OPEN_MS);
}

/** Stops video mode and its timers, for when the stage unmounts. */
export function stopVideo(): void {
  clearTimer();
  unsubscribe?.();
  unsubscribe = null;
  setPhase("off");
}

export function videoPhase(): VideoPhase {
  return phase;
}

export function subscribeVideoPhase(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
