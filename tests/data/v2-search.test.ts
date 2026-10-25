// S3-catalog T6: the tour's vibe search (figure 11), its surprise draw (figure 12) and the 50
// held-out eval queries, checked through the real scripted scorer and draw in src/sources/.
import { describe, expect, it } from "vitest";
import type { Piece } from "../../src/core/types";
import { contentRules, demoSearch, demoSurprise, getById, keywordAliases, pieces, searchEval, searchIndex } from "../../src/mock/index";
import { extractKeywords } from "../../src/sources/keywords";
import { keywordReason, keywordVocab, scoreKeywords } from "../../src/sources/keywordSearch";
import { normalizeQuestion } from "../../src/sources/requests";
import { drawSurprise, mulberry32 } from "../../src/sources/surprise";
import { wordHits } from "./v2-helpers";

const FIGURE_11_TEXT = "a warm, bold gift for my mom. she loves red wool. under $200";
const FIGURE_11_KEYWORDS = ["warm", "bold", "red", "wool", "gift for mom", "under $200"];
const WORD_CHIPS = ["warm", "bold", "red", "wool", "gift for mom"];
const FIGURE_11_IDS = ["pc_01", "pc_07", "pc_11", "pc_14", "pc_30", "pc_43"];
const FIGURE_11_COUNTS = [5, 4, 4, 3, 3, 3];
const piece = (id: string) => getById<Piece>(id) as Piece;

/** Every facet and vibe word a piece carries, lowercase, as the scorer reads them. */
function words(p: Piece): Set<string> {
  const f = p.facets;
  const v = p.vibe;
  return new Set([...v.moods, f.object.en, ...f.materials, ...f.techniques, ...f.motifs, ...f.colors, ...v.occasions, ...v.recipients].map((w) => w.toLowerCase()));
}

describe("figure 11, the vibe query", () => {
  it("holds figure 11's text, chips, language, filter and engine, field by field", () => {
    expect(demoSearch.query.text).toBe(FIGURE_11_TEXT);
    expect(demoSearch.query.keywords).toEqual(FIGURE_11_KEYWORDS);
    expect(demoSearch.query.lang).toBe("en");
    expect(demoSearch.query.filters).toEqual({ maxPriceCents: 20000 });
    expect(demoSearch.answer.engine).toBe("keyword_scripted");
    expect(demoSearch.answer.modelId).toBeUndefined();
    expect(demoSearch.answer.results.map((r) => r.pieceId)).toEqual(FIGURE_11_IDS);
    expect(demoSearch.answer.results.map((r) => r.matched.length)).toEqual(FIGURE_11_COUNTS);
    expect(demoSearch.answer.results[0].matched).toEqual(WORD_CHIPS);
    for (const r of demoSearch.answer.results) expect(piece(r.pieceId).priceCents, r.pieceId).toBeLessThanOrEqual(20000);
  });

  it("extractKeywords() on its text gives its six chips in order, and the price filter", () => {
    expect(extractKeywords(FIGURE_11_TEXT)).toEqual({ keywords: FIGURE_11_KEYWORDS, filters: { maxPriceCents: 20000 } });
    // The same through a vocabulary built here from the index and the aliases.
    expect(extractKeywords(FIGURE_11_TEXT, keywordVocab(searchIndex, keywordAliases, pieces)).keywords).toEqual(FIGURE_11_KEYWORDS);
  });

  it("each result's matched are exactly the chips its piece carries, with the scorer's score and reason", () => {
    for (const r of demoSearch.answer.results) {
      const w = words(piece(r.pieceId));
      expect(r.matched, r.pieceId).toEqual(WORD_CHIPS.filter((c) => w.has(c)));
      expect(r.score, r.pieceId).toBe(r.matched.length / WORD_CHIPS.length);
      expect(r.reason, r.pieceId).toEqual(keywordReason(r.matched));
    }
  });

  it("scoreKeywords ranks the same six first, in the same order, with the same results", () => {
    const scored = scoreKeywords(demoSearch.query.keywords, demoSearch.query.filters, searchIndex, pieces);
    expect(scored.slice(0, 6)).toEqual(demoSearch.answer.results);
    // pc_14, pc_30 and pc_43 never carry the chips the figure says they miss.
    expect(demoSearch.answer.results[3].matched).toEqual(["bold", "red", "gift for mom"]);
    expect(demoSearch.answer.results[4].matched).toEqual(["warm", "bold", "gift for mom"]);
    expect(demoSearch.answer.results[5].matched).toEqual(["warm", "red", "gift for mom"]);
  });

  it("holds its ceiling over all 54: every other piece at $200 or less carries at most two word chips", () => {
    expect(pieces).toHaveLength(54);
    const over = pieces
      .filter((p) => p.priceCents <= 20000 && !FIGURE_11_IDS.includes(p.id))
      .map((p) => [p.id, WORD_CHIPS.filter((c) => words(p).has(c)).length] as const)
      .filter(([, n]) => n > 2);
    expect(over).toEqual([]);
  });
});

const salesOf = (id: string) => searchIndex.find((e) => e.pieceId === id)?.salesThisMonth ?? -1;
const makerSales = (makerId: string) => searchIndex.filter((e) => e.makerId === makerId).reduce((n, e) => n + e.salesThisMonth, 0);

describe("figure 12, Surprise me", () => {
  const draw = drawSurprise({ keyword: "geometric", method: "fair_random", seed: 10 }, searchIndex, pieces);

  it("asks for geometric, fair_random and seed 10, and the real scripted draw lands on pc_38", () => {
    expect(demoSurprise.ask).toEqual({ keyword: "geometric", method: "fair_random", seed: 10 });
    expect(draw?.pieceId).toBe("pc_38");
    expect(demoSurprise.draw).toEqual(draw);
  });

  it("has nine candidates from two communities, pc_38 the fifth, not the first, and the heaviest", () => {
    const ids = demoSurprise.draw.candidates.map((c) => c.pieceId);
    expect(ids).toEqual(["pc_27", "pc_30", "pc_32", "pc_35", "pc_38", "pc_42", "pc_45", "pc_48", "pc_51"]);
    expect(new Set(ids.map((id) => piece(id).communityId))).toEqual(new Set(["com_acoma", "com_seminole"]));
    expect(ids.indexOf("pc_38")).toBe(4);
    const max = Math.max(...demoSurprise.draw.candidates.map((c) => c.weight));
    expect(demoSurprise.draw.candidates.filter((c) => c.weight === max).map((c) => c.pieceId)).toEqual(["pc_38"]);
  });

  it("weighs each candidate 1 / (1 + salesThisMonth) over the total, summing to 1, equal to figure 12 to 4 decimals", () => {
    const figure: [string, number, number][] = [
      ["pc_27", 4, 0.0619],
      ["pc_30", 3, 0.0773],
      ["pc_32", 2, 0.1031],
      ["pc_35", 5, 0.0515],
      ["pc_38", 0, 0.3093],
      ["pc_42", 3, 0.0773],
      ["pc_45", 2, 0.1031],
      ["pc_48", 4, 0.0619],
      ["pc_51", 1, 0.1546],
    ];
    const total = figure.reduce((s, [id]) => s + 1 / (1 + salesOf(id)), 0);
    expect(total).toBeCloseTo(194 / 60, 12);
    demoSurprise.draw.candidates.forEach((c, i) => {
      const [id, sales, weight] = figure[i];
      expect(c.pieceId).toBe(id);
      expect(salesOf(id), id).toBe(sales);
      expect(Number(c.weight.toFixed(4)), id).toBe(weight);
    });
    expect(demoSurprise.draw.candidates.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 12);
  });

  it("lands on pc_38 for mulberry32(10)'s first value, and for any first value from 0.2938 to 0.6031", () => {
    const r = mulberry32(10)();
    expect(r).toBeCloseTo(0.50199, 5);
    let running = 0;
    const cum = demoSurprise.draw.candidates.map((c) => (running += c.weight));
    // pc_38's stretch of the walk starts and ends at figure 12's bounds, to 4 decimals.
    expect(Number(cum[3].toFixed(4))).toBe(0.2938);
    expect(Number(cum[4].toFixed(4))).toBe(0.6031);
    expect(cum[3]).toBeLessThan(r);
    expect(cum[4]).toBeGreaterThan(r);
  });

  it("draws a piece by Julie M., whose pieces all sold nothing, the fewest among the candidates' makers", () => {
    expect(piece("pc_38").makerId).toBe("mkr_12");
    expect(searchIndex.filter((e) => e.makerId === "mkr_12").map((e) => [e.pieceId, e.salesThisMonth])).toEqual([
      ["pc_36", 0],
      ["pc_37", 0],
      ["pc_38", 0],
    ]);
    const makers = [...new Set(demoSurprise.draw.candidates.map((c) => piece(c.pieceId).makerId))];
    for (const id of makers.filter((m) => m !== "mkr_12")) expect(makerSales(id), id).toBeGreaterThanOrEqual(1);
    expect(Math.min(...makers.map(makerSales))).toBe(makerSales("mkr_12"));
  });
});

/**
 * Why each query grades what it grades: the words it asks for, from the pieces' own facet and vibe
 * vocabulary or titles. A 2 carries every `must` word. A 1 carries at least one `must` or `near`
 * word. `maxCents` is a price the query states. Written here as an independent check of the grades.
 */
const BASIS: Record<string, { must: string[]; near?: string[]; maxCents?: number }> = {
  sq_001: { must: ["calm", "wall weaving"], near: ["calm"] },
  sq_002: { must: ["earthy", "warm"], near: ["clay"] },
  sq_003: { must: ["quiet"] },
  sq_004: { must: ["housewarming", "wall weaving"], near: ["housewarming"] },
  sq_005: { must: ["thank you"], maxCents: 5000 },
  sq_006: { must: ["holiday", "gift for a sister"] },
  sq_007: { must: ["birthday", "child"] },
  sq_008: { must: ["gift for dad", "bold"], near: ["gift for dad"] },
  sq_009: { must: ["for myself", "elegant", "black", "white", "clay"], near: ["black", "white"] },
  sq_010: { must: ["gift for a friend", "flower"] },
  sq_011: { must: ["gift for mom", "birthday", "necklace"], near: ["necklace"] },
  sq_012: { must: ["patchwork", "red", "black"], near: ["patchwork"] },
  sq_013: { must: ["orange", "white", "dot"], near: ["dot"] },
  sq_014: { must: ["grey", "zigzag"], near: ["grey"] },
  sq_015: { must: ["rug", "diamond", "step"], near: ["diamond"] },
  sq_016: { must: ["seed pot", "dot"], near: ["dot"] },
  sq_017: { must: ["purple", "beadwork"], near: ["purple"] },
  sq_018: { must: ["green", "leaf", "necklace"], near: ["necklace"] },
  sq_019: { must: ["jacket", "navy", "orange"], near: ["jacket"] },
  sq_020: { must: ["turquoise"] },
  sq_021: { must: ["ring", "silver"], near: ["silver"] },
  sq_022: { must: ["pouch", "leather", "glass beads"], near: ["pouch"] },
  sq_023: { must: ["skirt", "rickrack"], near: ["rickrack"] },
  sq_024: { must: ["hand-spun", "wool"], near: ["wool"] },
  sq_025: { must: ["bowl", "hand-painted", "clay"] },
  sq_026: { must: ["loom-woven", "red", "black"], near: ["red", "black"] },
  sq_027: { must: ["jacket", "machine-sewn", "red"], near: ["jacket"] },
  sq_028: { must: ["seed pot"] },
  sq_029: { must: ["beadwork", "necklace"] },
  sq_030: { must: ["patchwork", "calm"] },
  sq_031: { must: ["pink", "earrings", "beadwork"], near: ["pink"] },
  sq_032: { must: ["wall weaving", "stripe"], near: ["wall weaving"] },
  sq_033: { must: ["turquoise", "earrings"], near: ["turquoise", "earrings"] },
  sq_034: { must: ["geometric", "jar"], near: ["jar"] },
  sq_035: { must: ["berry", "earrings"], near: ["berry"] },
  sq_036: { must: ["wall weaving", "calm"], near: ["calm"] },
  sq_037: { must: ["gift for dad", "leather", "pouch", "earthy"], near: ["leather"] },
  sq_038: { must: ["skirt", "bright", "yellow", "holiday"], near: ["skirt"] },
  sq_039: { must: ["rug"] },
  sq_040: { must: ["jacket"] },
  sq_041: { must: ["jar", "black", "white", "calm"], near: ["black"] },
  sq_042: { must: ["turquoise", "pendant necklace"], near: ["turquoise", "pendant"] },
  sq_043: { must: ["earrings", "gift for a friend", "bright"], near: ["earrings"] },
  sq_044: { must: ["skirt", "blue", "white"], near: ["blue"] },
  sq_045: { must: ["bowl", "housewarming"], near: ["bowl"] },
  sq_046: { must: ["gift for dad", "calm"], near: ["gift for dad"] },
  sq_047: { must: ["pouch", "flower"], near: ["pouch"] },
  sq_048: { must: ["child"] },
  sq_049: { must: ["purple", "yellow"], near: ["purple"] },
  sq_050: { must: ["seed pot", "orange", "coil-built"], near: ["orange"] },
};

/** A piece's title and every facet and vibe word, as one text to look words up in. */
function pieceText(p: Piece): string {
  return [p.title.en, ...words(p)].join(" | ");
}

const CJK = /[㐀-鿿]/;

describe("the eval set", () => {
  it("holds 50 queries, sq_001 to sq_050, every one written by the data agent", () => {
    expect(searchEval.map((q) => q.id)).toEqual(Array.from({ length: 50 }, (_, i) => `sq_${String(i + 1).padStart(3, "0")}`));
    for (const q of searchEval) expect(q.author, q.id).toBe("data_agent");
  });

  it("has at least eight queries in Chinese, and each query's language is its script's", () => {
    expect(searchEval.filter((q) => q.lang === "zh").length).toBeGreaterThanOrEqual(8);
    for (const q of searchEval) expect(CJK.test(q.text), q.id).toBe(q.lang === "zh");
  });

  it("grades two to six pieces per query, each one that exists, with 1s and 2s and at least one 2", () => {
    for (const q of searchEval) {
      const ids = Object.keys(q.grades);
      expect(ids.length, q.id).toBeGreaterThanOrEqual(2);
      expect(ids.length, q.id).toBeLessThanOrEqual(6);
      for (const id of ids) expect(getById<Piece>(id), `${q.id} ${id}`).toBeDefined();
      for (const g of Object.values(q.grades)) expect([1, 2], q.id).toContain(g);
      expect(Object.values(q.grades), q.id).toContain(2);
    }
  });

  it("grades follow the pieces' real words: a 2 carries every word the query asks for, a 1 at least one", () => {
    expect(Object.keys(BASIS).toSorted()).toEqual(searchEval.map((q) => q.id));
    for (const q of searchEval) {
      const b = BASIS[q.id];
      for (const [id, g] of Object.entries(q.grades)) {
        const p = piece(id);
        const text = pieceText(p);
        const has = (w: string) => wordHits(text, [w]).length > 0;
        if (g === 2) expect(b.must.filter((w) => !has(w)), `${q.id} ${id} misses`).toEqual([]);
        else expect([...b.must, ...(b.near ?? [])].some(has), `${q.id} ${id}`).toBe(true);
        if (b.maxCents !== undefined) expect(p.priceCents, `${q.id} ${id}`).toBeLessThanOrEqual(b.maxCents);
      }
    }
  });

  it("never repeats the tour's query, and no two queries are the same", () => {
    const texts = searchEval.map((q) => normalizeQuestion(q.text));
    expect(texts).not.toContain(normalizeQuestion(FIGURE_11_TEXT));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("holds no contentRules word: kept-out, stereotype, meaning, accusing or a people's name", () => {
    const all = [
      ...contentRules.bannedObjects,
      ...contentRules.stereotypeWords,
      ...contentRules.meaningWords,
      ...contentRules.accusingWords,
      ...Object.values(contentRules.peopleNames).flat(),
    ];
    expect(searchEval.flatMap((q) => wordHits(q.text, all).map((w) => `${q.id}: ${w}`))).toEqual([]);
  });

  it("mixes the voices T6 asks for: very short, long, a misspelling and the craft words", () => {
    const lengths = searchEval.map((q) => q.text.split(/\s+/).length);
    expect(lengths.filter((n) => n === 1).length).toBeGreaterThanOrEqual(3);
    expect(lengths.filter((n) => n >= 18).length).toBeGreaterThanOrEqual(2);
    const text = searchEval.map((q) => q.text).join(" | ");
    for (const w of ["seed pot", "patchwork", "beadwork", "turquoise", "turqoise", "geometic"]) expect(text, w).toContain(w);
  });
});
