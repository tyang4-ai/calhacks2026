// What the demo controls do, outside the component so the keys and the buttons share them.
import { player, type Speed } from "../../core/player";
import { loadScripted } from "../../sources/scripted";

export const SPEEDS: Speed[] = [1, 2, 4, 8];

/** The player time of the beat.started for a beat, or null when no timeline with that beat is loaded. */
export function beatStart(beatId: string): number | null {
  const e = player
    .getTimeline()
    ?.events.find((ev) => ev.type === "beat.started" && (ev.payload as { beatId: string }).beatId === beatId);
  return e ? e.at : null;
}

/** Start at the catch: seek to the start of d07-catch and play. Does nothing while no timeline is loaded. */
export function startAtCatch(): boolean {
  const at = beatStart("d07-catch");
  if (at === null) return false;
  player.seek(at);
  player.play();
  return true;
}

export function togglePlay(): void {
  if (player.isPlaying()) player.pause();
  else player.play();
}

/** Reset, then reload the demo timeline. */
export function resetDemo(): void {
  player.reset();
  loadScripted("demo");
}

export function cycleSpeed(): Speed {
  const i = SPEEDS.indexOf(player.getSpeed());
  const next = SPEEDS[(i + 1) % SPEEDS.length];
  player.setSpeed(next);
  return next;
}

/** True while focus is in a text field, where the demo keys stay off. */
export function isTextInput(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "range", "submit", "reset", "file", "color", "image"].includes(el.type);
  }
  return (el as HTMLElement).isContentEditable === true;
}
