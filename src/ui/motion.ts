// Motion helpers that take the player's time, never wall time, so a test sees the same frame every run.
import { useSyncExternalStore } from "react";
import { player } from "../core/player";

/** --c-motion-stitch: a money thread drawing along its path, like a passing shuttle. */
export const STITCH_MS = 700;
export const SEAL_MS = 220;
export const UI_MS = 160;

/** The player's clock, re-rendering on every frame while it plays. */
export function usePlayerTime(): number {
  return useSyncExternalStore(player.subscribe, player.now, player.now);
}

const reducedQuery = "(prefers-reduced-motion: reduce)";

function subscribeReduced(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(reducedQuery).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => false);
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Ease-out cubic. */
export function easeOut(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

/** Linear progress from 0 to 1 of an animation that started at `startAt` on the player clock. */
export function progress(now: number, startAt: number, durationMs: number, reduced = false): number {
  if (reduced || durationMs <= 0) return 1;
  return clamp01((now - startAt) / durationMs);
}

/**
 * The stitch: 700 ms (--c-motion-stitch), ease-out. It stays ease-out, not the token's ease in and
 * out, so a thread is past half by 300 ms and its amount label (drawn from 0.5) shows by then, as
 * M-desktop's acceptance and the money map specs read it. Finished at once under reduced motion.
 */
export function stitchProgress(now: number, startAt: number, reduced = false): number {
  return easeOut(progress(now, startAt, STITCH_MS, reduced));
}

/** The seal pressing in (drop 3): scale 1.06 to 1, opacity 0 to 1 over 220 ms, never a turn. */
export function sealPose(now: number, startAt: number, reduced = false): { scale: number; opacity: number; rotate: number } {
  if (reduced) return { scale: 1, opacity: 1, rotate: 0 };
  const t = easeOut(progress(now, startAt, SEAL_MS));
  return { scale: 1 + 0.06 * (1 - t), opacity: t, rotate: 0 };
}

/** UI transitions: 160 ms. */
export function uiProgress(now: number, startAt: number, reduced = false): number {
  return easeOut(progress(now, startAt, UI_MS, reduced));
}
