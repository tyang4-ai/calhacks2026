// The scripted keyword scorer and its vocabulary (data-model.md, "Keyword chips and the keyword
// scorer"). Both modes build chips with this vocabulary. Scripted mode also ranks with the scorer, so
// every rule here is plain code a person can check: no model, no randomness.
import type { SearchFilters, SearchResult } from "../core/events";
import type { IndexEntry, Piece, Text } from "../core/types";
import { mockAnswers } from "./mockAnswers";

/** A chip's group, in the order chips are shown: moods, then facet words, then occasions and recipients. */
export type KeywordGroup = "mood" | "facet" | "for";

export interface KeywordVocab {
  /** Every vocabulary term, lowercase, with the earliest group it appears in. */
  terms: Map<string, KeywordGroup>;
  /** keywordAliases, lowercase: a word or phrase people type, mapped to the term it means. */
  aliases: Map<string, string>;
}

/** The most results the scorer returns. */
export const MAX_KEYWORD_RESULTS = 12;

const GROUP_RANK: Record<KeywordGroup, number> = { mood: 0, facet: 1, for: 2 };

/**
 * Lowercases a text and splits it into words: runs of letters or digits, and dollar amounts like
 * `$200` or `$1,500`. Everything else separates words. Vocabulary terms are split the same way, so a
 * multi-word term matches the same words in a text.
 */
export function keywordWords(text: string): string[] {
  return text.toLowerCase().match(/\$\d[\d,]*(?:\.\d+)?|[\p{L}\p{N}]+/gu) ?? [];
}

/** A chip like `under $200`, which is a price filter, never a word to match. */
export function isPriceChip(chip: string): boolean {
  return /^(?:under|below) \$\d[\d,]*(?:\.\d+)?$/i.test(chip.trim());
}

/** The cap a price chip sets, in cents, or undefined for any other chip. */
export function priceChipCents(chip: string): number | undefined {
  if (!isPriceChip(chip)) return undefined;
  const n = Number(chip.trim().split("$")[1].replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

/** A piece's facet and vibe words, each with its group. */
function pieceTerms(piece: Piece): [string, KeywordGroup][] {
  const f = piece.facets;
  const v = piece.vibe;
  const out: [string, KeywordGroup][] = [];
  for (const w of v?.moods ?? []) out.push([w, "mood"]);
  if (f?.object?.en) out.push([f.object.en, "facet"]);
  for (const list of [f?.materials, f?.techniques, f?.motifs, f?.colors]) for (const w of list ?? []) out.push([w, "facet"]);
  for (const list of [v?.occasions, v?.recipients]) for (const w of list ?? []) out.push([w, "for"]);
  return out.map(([w, g]) => [w.trim().toLowerCase(), g] as [string, KeywordGroup]).filter(([w]) => w.length > 0);
}

/** Every word a piece carries in its facets or vibe, lowercase. */
function pieceWordSet(piece: Piece): Set<string> {
  return new Set(pieceTerms(piece).map(([w]) => w));
}

/** The index's pieces that search can return: one per pieceId, active only, in index order. */
function activePieces(index: IndexEntry[], pieces: Piece[]): { entry: IndexEntry; piece: Piece }[] {
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const out: { entry: IndexEntry; piece: Piece }[] = [];
  for (const entry of index) {
    if (entry.status !== "active" || seen.has(entry.pieceId)) continue;
    const piece = byId.get(entry.pieceId);
    if (!piece) continue;
    seen.add(entry.pieceId);
    out.push({ entry, piece });
  }
  return out;
}

/**
 * The vocabulary: every facet and vibe word of the pieces the index holds, plus `keywordAliases`.
 * A term in two groups counts in the earlier one. An alias's term that no piece carries counts with
 * occasions and recipients, where the aliases point. `pieces` defaults to the catalog in src/mock/.
 */
export function keywordVocab(
  index: IndexEntry[],
  aliases: Record<string, string>,
  pieces: Piece[] = mockAnswers().pieces ?? [],
): KeywordVocab {
  const terms = new Map<string, KeywordGroup>();
  const add = (term: string, group: KeywordGroup) => {
    const prev = terms.get(term);
    if (prev === undefined || GROUP_RANK[group] < GROUP_RANK[prev]) terms.set(term, group);
  };
  for (const { piece } of activePieces(index, pieces)) for (const [w, g] of pieceTerms(piece)) add(w, g);
  const aliasMap = new Map<string, string>();
  for (const [from, to] of Object.entries(aliases)) {
    const key = from.trim().toLowerCase();
    const term = to.trim().toLowerCase();
    if (!key || !term) continue;
    aliasMap.set(key, term);
    if (!terms.has(term)) terms.set(term, "for");
  }
  return { terms, aliases: aliasMap };
}

/** The reason a result shows: the words it matched, joined by ", ". The words stay English. */
export function keywordReason(matched: string[]): Text {
  const words = matched.join(", ");
  return { en: `Matches ${words}`, zh: `匹配：${words}` };
}

/**
 * The scripted keyword scorer. Each piece's score is the share of the request's word chips (the
 * price chip left out) found in its facets or vibe. The filters, and any price chip, apply before
 * ranking. Pieces that score 0 are left out. At most 12, best first, ties by pieceId.
 */
export function scoreKeywords(keywords: string[], filters: SearchFilters | undefined, index: IndexEntry[], pieces: Piece[]): SearchResult[] {
  const chips: string[] = [];
  const seen = new Set<string>();
  let cap = filters?.maxPriceCents;
  for (const raw of keywords) {
    const chip = raw.trim();
    const cents = priceChipCents(chip);
    if (cents !== undefined) {
      cap = cap === undefined ? cents : Math.min(cap, cents);
      continue;
    }
    const norm = chip.toLowerCase();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    chips.push(chip);
  }
  if (chips.length === 0) return [];
  const communities = filters?.communityIds && filters.communityIds.length > 0 ? new Set(filters.communityIds) : null;

  const results: SearchResult[] = [];
  for (const { piece } of activePieces(index, pieces)) {
    if (cap !== undefined && piece.priceCents > cap) continue;
    if (communities && !communities.has(piece.communityId)) continue;
    const words = pieceWordSet(piece);
    const matched = chips.filter((c) => words.has(c.toLowerCase()));
    if (matched.length === 0) continue;
    results.push({ pieceId: piece.id, score: matched.length / chips.length, matched, reason: keywordReason(matched) });
  }
  results.sort((a, b) => b.score - a.score || (a.pieceId < b.pieceId ? -1 : a.pieceId > b.pieceId ? 1 : 0));
  return results.slice(0, MAX_KEYWORD_RESULTS);
}

/** The active pieces of the index, in pieceId order, for draws over every piece. */
export function activePieceIds(index: IndexEntry[], pieces: Piece[]): string[] {
  return activePieces(index, pieces)
    .map((x) => x.piece.id)
    .toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
