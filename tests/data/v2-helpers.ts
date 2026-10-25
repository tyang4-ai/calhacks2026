// Shared helpers for the v2 data tests (S3-catalog). Not a test file itself.
import type { Text } from "../../src/core/types";

/** Every string reachable from a value, with its path, skipping functions. */
export function strings(value: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out);
  return out;
}

const CJK = /[㐀-鿿]/;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The words of a list that a text holds. A Chinese entry matches as a substring. An English entry
 * matches as a whole word or phrase, in any case, with an optional plural ending, so "drums" hits
 * "drum" and "eardrum" doesn't.
 */
export function wordHits(text: string, words: readonly string[]): string[] {
  return words.filter((w) =>
    CJK.test(w)
      ? text.includes(w)
      : new RegExp(`(?<![\\p{L}\\p{N}])${escape(w)}(?:s|es)?(?![\\p{L}\\p{N}])`, "iu").test(text),
  );
}

/** Every [path, word] hit of a word list over every string under a value. */
export function scan(value: unknown, path: string, words: readonly string[]): [string, string][] {
  return strings(value, path).flatMap(([p, s]) => wordHits(s, words).map((w): [string, string] => [p, w]));
}

export function isText(v: unknown): v is Text {
  return typeof v === "object" && v !== null && typeof (v as Text).en === "string" && typeof (v as Text).zh === "string";
}

export const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
