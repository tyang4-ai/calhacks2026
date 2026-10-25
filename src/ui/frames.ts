// The pure parts of the frame components (I2-kit T1), kept apart so frames.test.ts can check them
// without a DOM: the process block's status looks and Live mark rule, its pulse on the player
// clock, the drawer's Esc rule and slide, and the Link's plain-click rule.
import type { ProcessStatus } from "../core/events";
import { clamp01, easeOut, UI_MS } from "./motion";

/** How a process block's status looks. The icon and the word carry it as well as the color. */
export interface ProcessStatusLook {
  /** The color group: ink-soft, ink, jade or seal. */
  tone: "soft" | "ink" | "jade" | "seal";
  /** The icon beside the status word. */
  icon: "ring" | "dots" | "check" | "bang";
  /** The thread along the block's foot. */
  thread: "dotted" | "dashed" | "solid" | "broken";
  /** Only a working block pulses, on the player clock. */
  pulses: boolean;
}

export const PROCESS_STATUS_LOOK: Record<ProcessStatus, ProcessStatusLook> = {
  idle: { tone: "soft", icon: "ring", thread: "dotted", pulses: false },
  working: { tone: "ink", icon: "dots", thread: "dashed", pulses: true },
  done: { tone: "jade", icon: "check", thread: "solid", pulses: false },
  attention: { tone: "seal", icon: "bang", thread: "broken", pulses: false },
};

/** The block's class list: its status, and whether its view is open. */
export function processBlockClass(status: ProcessStatus, selected = false): string {
  const look = PROCESS_STATUS_LOOK[status];
  return `c-pblock c-pblock--${status} c-pblock--tone-${look.tone}${selected ? " c-pblock--selected" : ""}`;
}

/**
 * The Live mark shows only when every key of the block's process is live. A block never shows a
 * Simulated badge of its own: the bar shows one summary badge (contracts section 4).
 */
export function liveMarkShown(live: boolean): boolean {
  return live === true;
}

/** Whether a count is drawn. Nothing is drawn for a missing or empty count. */
export function countShown(count: number | string | undefined | null): boolean {
  return count !== undefined && count !== null && count !== "";
}

/** One pulse of a working block lasts this long on the player clock. */
export const PULSE_MS = 1200;

/**
 * The working block's thread opacity at player time `now`: from 1 down to 0.35 and back once per
 * PULSE_MS. Under reduced motion it stays at 1. A paused player keeps `now` still, so it holds.
 */
export function pulseLevel(now: number, reduced = false): number {
  if (reduced) return 1;
  const phase = (((now % PULSE_MS) + PULSE_MS) % PULSE_MS) / PULSE_MS;
  return 0.675 + 0.325 * Math.cos(2 * Math.PI * phase);
}

/** What the drawer's keydown listener needs from the event. */
export interface KeyLike {
  key: string;
  defaultPrevented?: boolean;
  isComposing?: boolean;
}

/**
 * Esc closes the drawer, unless something inside it already handled that Esc (it called
 * preventDefault) or an input method is composing. The drawer marks the Esc it handles with
 * preventDefault, so a handler under it, such as the process overlay's, can skip it.
 */
export function isDrawerCloseKey(e: KeyLike): boolean {
  return e.key === "Escape" && !e.defaultPrevented && !e.isComposing;
}

export const DRAWER_WIDTH = 440;

/**
 * How far right of its resting place the drawer sits, in px, while it slides in over UI_MS on the
 * player clock. At rest when the player is paused, under reduced motion, or when a seek moved the
 * clock behind the moment it opened.
 */
export function drawerOffset(now: number, openedAt: number, width: number, playing: boolean, reduced = false): number {
  if (!playing || reduced || now < openedAt) return 0;
  const t = easeOut(clamp01((now - openedAt) / UI_MS));
  return Math.round((1 - t) * width);
}

/** What the Link's click handler needs from the event. */
export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented?: boolean;
}

/**
 * A plain click is the main button with no modifier key, not already handled. Only a plain click
 * becomes navigate(). Any other click keeps the browser's own behavior, so Ctrl-click still opens
 * a new tab.
 */
export function isPlainClick(e: ClickLike): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
}

/**
 * The Link's click rule: on a plain click, stop the page load and go through `go` (navigate from
 * src/core/nav.ts). Returns whether it took the click.
 */
export function followLink(e: ClickLike & { preventDefault(): void }, to: string, go: (path: string) => void): boolean {
  if (!isPlainClick(e)) return false;
  e.preventDefault();
  go(to);
  return true;
}
