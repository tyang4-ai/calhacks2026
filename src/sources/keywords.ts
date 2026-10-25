// The keyword chips under the search box (data-model.md, "Keyword chips and the keyword scorer").
// Rule-based and deterministic, the same in scripted and live mode:
//   1. Lowercase the text and split it into words. `under $N` and `below $N` become the chip
//      `under $N` and the filter maxPriceCents N * 100, and their words are used up.
//   2. Match multi-word vocabulary terms and multi-word alias keys, longest first.
//   3. Match single-word alias keys. A word that is an alias key always resolves through its alias.
//   4. Match the remaining single words against the vocabulary, as they are, then with simple
//      plural stripping (ies to y, then es, then s).
//   5. Every matched word is used up, and each chip appears once.
// Output: moods, then facet words, then occasions and recipients, then the price chip, each group in
// order of first appearance in the text.
import { keywordVocab, keywordWords, type KeywordGroup, type KeywordVocab } from "./keywordSearch";
import { mockAnswers } from "./mockAnswers";

export interface ExtractedKeywords {
  keywords: string[];
  filters: { maxPriceCents?: number };
}

let catalogVocab: KeywordVocab | null = null;

/** The vocabulary of src/mock/'s index, pieces and aliases, built once. */
function defaultVocab(): KeywordVocab {
  if (!catalogVocab) {
    const m = mockAnswers();
    catalogVocab = keywordVocab(m.searchIndex ?? [], m.keywordAliases ?? {}, m.pieces ?? []);
  }
  return catalogVocab;
}

const RANK: Record<KeywordGroup | "price", number> = { mood: 0, facet: 1, for: 2, price: 3 };

interface Found {
  chip: string;
  group: KeywordGroup | "price";
  pos: number;
}

/**
 * The chips and filters for a typed text. `vocab` defaults to the catalog's vocabulary; tests pass
 * their own.
 */
export function extractKeywords(text: string, vocab: KeywordVocab = defaultVocab()): ExtractedKeywords {
  const words = keywordWords(text);
  const used = words.map(() => false);
  const found = new Map<string, Found>();
  const filters: ExtractedKeywords["filters"] = {};

  const add = (chip: string, group: KeywordGroup | "price", pos: number) => {
    const prev = found.get(chip);
    if (!prev) found.set(chip, { chip, group, pos });
    else if (pos < prev.pos) prev.pos = pos;
  };
  const groupOf = (term: string): KeywordGroup => vocab.terms.get(term) ?? "for";

  // 1. The price chip.
  for (let i = 0; i + 1 < words.length; i += 1) {
    if (used[i] || used[i + 1]) continue;
    if ((words[i] !== "under" && words[i] !== "below") || !words[i + 1].startsWith("$")) continue;
    const digits = words[i + 1].slice(1).replace(/,/g, "");
    const n = Number(digits);
    if (!digits || !Number.isFinite(n)) continue;
    used[i] = used[i + 1] = true;
    if (filters.maxPriceCents === undefined) {
      filters.maxPriceCents = Math.round(n * 100);
      add(`under $${digits}`, "price", i);
    }
  }

  // 2. Multi-word terms and alias keys, longest first. At equal length an alias comes first, so a
  // phrase that is an alias key resolves through its alias.
  const phrases: { words: string[]; chip: string; alias: boolean; key: string }[] = [];
  for (const term of vocab.terms.keys()) {
    const w = keywordWords(term);
    if (w.length > 1) phrases.push({ words: w, chip: term, alias: false, key: term });
  }
  for (const [key, term] of vocab.aliases) {
    const w = keywordWords(key);
    if (w.length > 1) phrases.push({ words: w, chip: term, alias: true, key });
  }
  phrases.sort((a, b) => b.words.length - a.words.length || Number(b.alias) - Number(a.alias) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (const ph of phrases) {
    const n = ph.words.length;
    for (let i = 0; i + n <= words.length; i += 1) {
      let hit = true;
      for (let j = 0; j < n; j += 1) {
        if (used[i + j] || words[i + j] !== ph.words[j]) {
          hit = false;
          break;
        }
      }
      if (!hit) continue;
      for (let j = 0; j < n; j += 1) used[i + j] = true;
      add(ph.chip, groupOf(ph.chip), i);
    }
  }

  // 3. Single-word alias keys.
  for (let i = 0; i < words.length; i += 1) {
    if (used[i]) continue;
    const term = vocab.aliases.get(words[i]);
    if (term === undefined) continue;
    used[i] = true;
    add(term, groupOf(term), i);
  }

  // 4. Single words against single-word terms, then with simple plural stripping.
  for (let i = 0; i < words.length; i += 1) {
    if (used[i]) continue;
    const w = words[i];
    const tries = [w];
    if (w.endsWith("ies") && w.length > 3) tries.push(`${w.slice(0, -3)}y`);
    if (w.endsWith("es") && w.length > 2) tries.push(w.slice(0, -2));
    if (w.endsWith("s") && w.length > 1) tries.push(w.slice(0, -1));
    const term = tries.find((t) => vocab.terms.has(t) && keywordWords(t).length === 1);
    if (term === undefined) continue;
    used[i] = true;
    add(term, groupOf(term), i);
  }

  const keywords = [...found.values()].toSorted((a, b) => RANK[a.group] - RANK[b.group] || a.pos - b.pos).map((f) => f.chip);
  return { keywords, filters };
}
