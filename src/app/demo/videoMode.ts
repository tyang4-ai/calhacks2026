// Video mode, /demo?video=1 (demo-script.md, The modes), which Gordon records. Under 3 minutes:
// 1. The cold open: the player seeks to the last millisecond of d08-catch without animation, so the
//    flag, its evidence and the explanation are up on sell-catch, and the stage shows v1's line for
//    5 seconds.
// 2. Then it resets and plays the spine from p01-what, with no controls or beat label.
// 3. Each pitch card holds for 10 seconds instead of 20: 10 seconds after a pitch beat's first
//    beat.started on the player clock, the player seeks to the next beat's first beat.started and
//    plays on. The pitch beats carry no other events, so the seek skips nothing.
// 4. The buyer and seller minutes play at 1x.
// 5. At the end of d12-receipt the player pauses, and the end card shows for 5 seconds. Chapter 2
//    isn't in the video.
// The cold open and the end card are real-time holds while the player is paused, so the run itself
// stays on the player clock. A reset, a seek or a load from anyone else ends it. mode=present and
// ?start= are ignored in video mode. Every time comes from the timeline's beat.started events.
import { player } from "../../core/player";
import { CATCH_BEAT, SPINE_LAST_BEAT, beatAt, beatStop } from "../controls/playback";

export type VideoPhase = "off" | "cold-open" | "run" | "end-card" | "done";

export const COLD_OPEN_MS = 5000;
export const END_CARD_MS = 5000;
/** How long each pitch card holds in the video, on the player clock. */
export const PITCH_HOLD_MS = 10000;

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

/** Runs one of this module's own player calls, keeping its epoch as the one it owns. */
function act(fn: () => void): void {
  acting = true;
  try {
    fn();
  } finally {
    ownEpoch = player.epoch();
    acting = false;
  }
}

/** Where the cold open waits: the last millisecond of d08-catch. */
export function coldOpenAt(): number | null {
  return beatStop(CATCH_BEAT);
}

/** Where the video's run ends: the last millisecond of d12-receipt. */
export function videoEndAt(): number | null {
  return beatStop(SPINE_LAST_BEAT);
}

function onPlayer(): void {
  if (acting || phase !== "run") return;
  if (player.epoch() !== ownEpoch) {
    // Someone else reset or seeked: drop the video's holds, keep the stage as it is.
    clearTimer();
    setPhase("done");
    return;
  }
  const now = player.now();
  const end = videoEndAt() ?? player.durationMs();
  if (now >= end) {
    act(() => {
      player.pause();
      // A frame can overshoot. Land exactly on the end of d12-receipt.
      if (player.now() > end) player.seek(end);
    });
    setPhase("end-card");
    timer = setTimeout(() => {
      timer = null;
      setPhase("done");
    }, END_CARD_MS);
    return;
  }
  const beat = beatAt(now);
  if (beat && beat.camera === "pitch" && now >= beat.start + PITCH_HOLD_MS && player.isPlaying()) {
    act(() => player.seek(beat.end));
  }
}

/** Starts video mode from the cold open. Calling it again restarts it. */
export function startVideo(): void {
  stopVideo();
  unsubscribe = player.subscribe(onPlayer);
  act(() => {
    player.pause();
    player.seek(coldOpenAt() ?? 0);
  });
  setPhase("cold-open");
  timer = setTimeout(() => {
    timer = null;
    if (player.epoch() !== ownEpoch) return setPhase("done");
    setPhase("run");
    act(() => {
      player.reset();
      player.play();
    });
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
