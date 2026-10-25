// The tour's vibe search (figure 11) and its surprise draw (figure 12), as data-model.md gives them.
// The tour's timeline adds qry_01 and srp_01 (D1-49).
//
// Nothing here is typed that the catalog can give: the six results' pieces are figure 11's, but each
// result's matched chips, score and reason are built from the piece's own facet and vibe words,
// exactly as the scripted keyword scorer (src/sources/keywordSearch.ts) builds them. The surprise
// draw's piece is figure 12's, and its nine candidates and their weights are built from the catalog
// and the index's salesThisMonth, exactly as the scripted draw (src/sources/surprise.ts) builds them.
// tests/data/v2-search.test.ts checks both against the real scorer and the real draw.
import type { SearchResult } from "../core/events";
import type { DemoSearch, DemoSurprise, Piece, Text } from "../core/types";
import { pieces } from "./catalog";
import { searchIndex } from "./searchIndex";

/** Figure 11's text, word for word. */
const QUERY_TEXT = "a warm, bold gift for my mom. she loves red wool. under $200";
/** Its six chips, in order: moods, facet words, the recipient through the alias mom, then the price. */
const KEYWORDS = ["warm", "bold", "red", "wool", "gift for mom", "under $200"];
const MAX_PRICE_CENTS = 20000;
/** Figure 11's six results, in order. */
const RESULT_IDS = ["pc_01", "pc_07", "pc_11", "pc_14", "pc_30", "pc_43"];

/** Figure 12's draw. */
const SURPRISE_KEYWORD = "geometric";
const SURPRISE_SEED = 10;
const SURPRISE_PIECE = "pc_38";

function piece(id: string): Piece {
  const p = pieces.find((x) => x.id === id);
  if (!p) throw new Error(`search.ts: no piece ${id}`);
  return p;
}

/** Every facet and vibe word a piece carries, lowercase: what the keyword scorer matches against. */
function pieceWords(p: Piece): Set<string> {
  const f = p.facets;
  const v = p.vibe;
  return new Set(
    [...v.moods, f.object.en, ...f.materials, ...f.techniques, ...f.motifs, ...f.colors, ...v.occasions, ...v.recipients].map((w) =>
      w.trim().toLowerCase(),
    ),
  );
}

/** The reason a result shows: the words it matched, joined by ", ", in English in both languages. */
function reason(matched: string[]): Text {
  const words = matched.join(", ");
  return { en: `Matches ${words}`, zh: `匹配：${words}` };
}

/** The word chips (the price chip is a filter, never a word to match). */
const WORD_CHIPS = KEYWORDS.filter((k) => !/^(?:under|below) \$/.test(k));

function result(id: string): SearchResult {
  const p = piece(id);
  if (p.priceCents > MAX_PRICE_CENTS) throw new Error(`search.ts: ${id} is over figure 11's cap`);
  const words = pieceWords(p);
  const matched = WORD_CHIPS.filter((c) => words.has(c));
  return { pieceId: id, score: matched.length / WORD_CHIPS.length, matched, reason: reason(matched) };
}

export const demoSearch: DemoSearch = {
  query: {
    text: QUERY_TEXT,
    keywords: [...KEYWORDS],
    lang: "en",
    filters: { maxPriceCents: MAX_PRICE_CENTS },
  },
  answer: { results: RESULT_IDS.map(result), engine: "keyword_scripted" },
};

/**
 * Figure 12's candidates: every active piece carrying the keyword, in pieceId order (each scores the
 * same on one keyword), weighted 1 / (1 + salesThisMonth) over the total. The total is summed with a
 * plain loop in candidate order, as the draw sums it, so the weights are the draw's to the last bit.
 */
function surpriseCandidates(): { pieceId: string; weight: number }[] {
  const ids = searchIndex
    .filter((e) => e.status === "active" && pieceWords(piece(e.pieceId)).has(SURPRISE_KEYWORD))
    .map((e) => e.pieceId)
    .toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const raw = ids.map((id) => {
    const sales = searchIndex.find((e) => e.pieceId === id)?.salesThisMonth ?? 0;
    return 1 / (1 + sales);
  });
  let total = 0;
  for (const w of raw) total += w;
  return ids.map((id, i) => ({ pieceId: id, weight: raw[i] / total }));
}

export const demoSurprise: DemoSurprise = {
  ask: { keyword: SURPRISE_KEYWORD, method: "fair_random", seed: SURPRISE_SEED },
  draw: { pieceId: SURPRISE_PIECE, method: "fair_random", seed: SURPRISE_SEED, candidates: surpriseCandidates() },
};
