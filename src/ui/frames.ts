// The pure parts of the frame components (I2-kit T1), kept apart so frames.test.ts can check them
// without a DOM: the process block's status looks and Live mark rule, its pulse on the player
// clock, the drawer's Esc rule and slide, and the Link's plain-click rule.
import type { ProcessStatus } from "../core/events";
import { clamp01, easeOut, UI_MS } from "./motion";

/**
 * How a process block's status looks on the beam (design drop 3). The word carries it as well as
 * the color and the thread; done and attention also draw a mark at the top right.
 */
export interface ProcessStatusLook {
  /** The color group, mapped to the beam colors in kit.css: soft (beam-soft), ink (beam-live), jade (beam-done), seal (beam-flag). */
  tone: "soft" | "ink" | "jade" | "seal";
  /** The status icon. Only check and bang draw a mark, at the block's top right. */
  icon: "ring" | "dots" | "check" | "bang";
  /** The 3 px thread along the block's foot: dotted (idle), partial (working, drawn partway), solid (done), broken (attention, dashed). */
  thread: "dotted" | "partial" | "solid" | "broken";
  /** Only a working block pulses, on the player clock. */
  pulses: boolean;
}

export const PROCESS_STATUS_LOOK: Record<ProcessStatus, ProcessStatusLook> = {
  idle: { tone: "soft", icon: "ring", thread: "dotted", pulses: false },
  working: { tone: "ink", icon: "dots", thread: "partial", pulses: true },
  done: { tone: "jade", icon: "check", thread: "solid", pulses: false },
  attention: { tone: "seal", icon: "bang", thread: "broken", pulses: false },
};

/** A process block's width on the beam: 104 px, or 124 px for a label too long for that at 14 px (Counterfeit watch). */
export const PROCESS_BLOCK_WIDTH = 104;
export const PROCESS_BLOCK_WIDE = 124;
/** The longest English label that fits a 104 px block on one line at 14 px, in characters. */
const NARROW_LABEL_MAX = 12;

/** The block takes its width from its label (components.md, Needs: ProcessBlock width). */
export function processBlockWidth(label: string): number {
  return label.length > NARROW_LABEL_MAX ? PROCESS_BLOCK_WIDE : PROCESS_BLOCK_WIDTH;
}

/** The longest English label that leaves room for the done or attention mark at the block's top right. */
const MARK_TOP_LABEL_MAX = 9;

/**
 * Where the done or attention mark goes: at the top right, as drop 3 draws it, when the label leaves
 * room; otherwise at the end of line 2, so a long label is never cut.
 */
export function markAtTop(label: string): boolean {
  return label.length <= MARK_TOP_LABEL_MAX;
}

/** A count of zero is left out of line 2, so an idle block reads just "Idle". */
export function countVisible(count: number | string | undefined | null): boolean {
  return countShown(count) && String(count) !== "0";
}

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
