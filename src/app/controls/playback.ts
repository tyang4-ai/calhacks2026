// What the demo controls do, outside the component so the keys and the buttons share them, and the
// beats of the loaded timeline. Every time the modes use comes from the timeline's beat.started
// events, never from a constant.
import type { TourCameraId } from "../../core/featureTypes";
import { player, type Speed } from "../../core/player";
import { loadScripted } from "../../sources/scripted";

export const SPEEDS: Speed[] = [1, 2, 4, 8];

/** One beat of the loaded timeline: its first beat.started, its first camera, and where the next beat starts. */
export interface BeatSpan {
  beatId: string;
  camera: TourCameraId;
  /** The player time of the beat's first beat.started. */
  start: number;
  /** The next beat's start, or the timeline's durationMs for the last beat. */
  end: number;
}

/** The beats of the loaded timeline in order: the first beat.started of each beat ID. */
export function beatSpans(): BeatSpan[] {
  const t = player.getTimeline();
  if (!t) return [];
  if (cache && cache.timeline === t) return cache.spans;
  const spans = computeSpans(t);
  cache = { timeline: t, spans };
  return spans;
}

let cache: { timeline: object; spans: BeatSpan[] } | null = null;

function computeSpans(t: NonNullable<ReturnType<typeof player.getTimeline>>): BeatSpan[] {
  const firsts: { beatId: string; camera: TourCameraId; start: number }[] = [];
  const seen = new Set<string>();
  for (const e of t.events) {
    if (e.type !== "beat.started") continue;
    const p = e.payload as { beatId: string; camera: TourCameraId };
    if (seen.has(p.beatId)) continue;
    seen.add(p.beatId);
    firsts.push({ beatId: p.beatId, camera: p.camera, start: e.at });
  }
  firsts.sort((a, b) => a.start - b.start);
  return firsts.map((b, i) => ({ ...b, end: i + 1 < firsts.length ? firsts[i + 1].start : t.durationMs }));
}

/** The player time of a beat's first beat.started, or null when no timeline with that beat is loaded. */
export function beatStart(beatId: string): number | null {
  return beatSpans().find((b) => b.beatId === beatId)?.start ?? null;
}

/** The beat a player time falls in: the last beat that started at or before it, or null before the first. */
export function beatAt(ms: number): BeatSpan | null {
  let hit: BeatSpan | null = null;
  for (const b of beatSpans()) if (b.start <= ms) hit = b;
  return hit;
}

/** The first beat that starts after a player time, or null after the last one. */
export function nextBeatAfter(ms: number): BeatSpan | null {
  return beatSpans().find((b) => b.start > ms) ?? null;
}

/**
 * The last millisecond of a beat: 1 ms before the next beat's first beat.started, because a seek
 * to that time already fires the next beat's camera. Null for the last beat, which ends with the run.
 */
export function beatStop(beatId: string): number | null {
  const spans = beatSpans();
  const i = spans.findIndex((b) => b.beatId === beatId);
  return i >= 0 && i + 1 < spans.length ? spans[i + 1].start - 1 : null;
}

/** The spine's last beat (demo-script.md): the end card follows it in presenter and video mode. */
export const SPINE_LAST_BEAT = "d12-receipt";

/** The catch beat, which ?start=catch, demo-start-at-catch and the c key all mean. */
export const CATCH_BEAT = "d08-catch";

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
