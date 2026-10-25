// The pure parts of the search and card components (I2-kit T2), kept apart so cards.test.ts can
// check them without a DOM: the chip test IDs and edits, the demo verification lines, a project's
// progress, the milestone shares and the score bar's fill.
import type { Lang, Text } from "../core/types";
import { clamp01 } from "./motion";
import { DOT_SEPARATOR, L3, L4, NOT_CHECKED } from "./strings";

/** Chip n (from 1) gets `<chipPrefix><n>`, and its remove control `<chipPrefix>remove-<n>`. */
export function chipTestIds(chipPrefix: string, n: number): { chip: string; remove: string } {
  return { chip: `${chipPrefix}${n}`, remove: `${chipPrefix}remove-${n}` };
}

/** The chips without the one at `index` (from 0), as a new list. */
export function removeChipAt(chips: readonly string[], index: number): string[] {
  return chips.filter((_, i) => i !== index);
}

/**
 * The chips with `text` added at the end, as a new list. Blank text, or a word already there
 * (case and spacing aside), leaves the list as it was, so a chip's number never shifts.
 */
export function addChip(chips: readonly string[], text: string): string[] {
  const word = text.trim().replace(/\s+/g, " ");
  if (!word) return [...chips];
  const key = word.toLowerCase();
  if (chips.some((c) => c.trim().replace(/\s+/g, " ").toLowerCase() === key)) return [...chips];
  return [...chips, word];
}

/**
 * A piece card's short verification line. With `demo` it starts with L3, then the given line after
 * a dot and ", not checked". Without `demo` it is the given line alone, and without either there is
 * no line.
 */
export function pieceVerificationText(verification: Text | undefined, demo: boolean, lang: Lang): string | null {
  const line = verification ? verification[lang] : "";
  if (demo) return line ? `${L3[lang]}${DOT_SEPARATOR}${line}${NOT_CHECKED[lang]}` : L3[lang];
  return line || null;
}

/** The lines a VerificationLine shows: its head (L3 first with `demo`) and L4 under it with `demo`. */
export function verificationLines(methodWord: Text, demo: boolean, lang: Lang): { head: string; demoNote: string | null } {
  return {
    head: demo ? `${L3[lang]}${DOT_SEPARATOR}${methodWord[lang]}` : methodWord[lang],
    demoNote: demo ? L4[lang] : null,
  };
}

/** How much of the goal is raised, from 0 to 1. A goal of zero or less counts as nothing raised. */
export function progressShare(raisedCents: number, goalCents: number): number {
  if (!(goalCents > 0) || !Number.isFinite(raisedCents)) return 0;
  return clamp01(raisedCents / goalCents);
}

/** The raised share as a whole percent, rounded down, so it never reads 100% before the goal is met. */
export function progressPercent(raisedCents: number, goalCents: number): number {
  return Math.floor(progressShare(raisedCents, goalCents) * 100 + 1e-9);
}

/**
 * Where each milestone sits along the commission's thread: its start and width as fractions of the
 * whole, in order. The whole is 10000 basis points, or the shares' sum when that's larger, so the
 * segments never run past the end.
 */
export function milestoneSegments(sharesBps: readonly number[]): { start: number; width: number }[] {
  const shares = sharesBps.map((s) => (Number.isFinite(s) && s > 0 ? s : 0));
  const total = Math.max(10000, shares.reduce((a, b) => a + b, 0));
  let at = 0;
  return shares.map((s) => {
    const seg = { start: at / total, width: s / total };
    at += s;
    return seg;
  });
}

/** A score bar's fill from 0 to 1. Anything not a number fills nothing. */
export function scoreFraction(value: number): number {
  return Number.isFinite(value) ? clamp01(value) : 0;
}

/** A score to two places, as the kit shows it beside its bar. */
export function formatScore(value: number): string {
  return scoreFraction(value).toFixed(2);
}

/** Whether a node is a plain figure (text or a number), which the StatTile marks itself. */
export function isPlainFigure(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}
