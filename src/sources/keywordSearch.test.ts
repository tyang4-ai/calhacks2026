import { describe, expect, it } from "vitest";
import { validateEvent } from "../core/validate";
import { sample } from "../core/testFixtures";
import { isPriceChip, keywordReason, keywordVocab, scoreKeywords } from "./keywordSearch";
import { FIG11_KEYWORDS, TEST_ALIASES, TEST_INDEX, TEST_PIECES } from "./testCatalog";

describe("scoreKeywords", () => {
  it("ranks figure 11's six first, in order, under the price cap", () => {
    const results = scoreKeywords(FIG11_KEYWORDS, { maxPriceCents: 20000 }, TEST_INDEX, TEST_PIECES);
    expect(results.map((r) => r.pieceId)).toEqual(["pc_01", "pc_07", "pc_11", "pc_14", "pc_30", "pc_43"]);
    expect(results.map((r) => r.score)).toEqual([1, 0.8, 0.8, 0.6, 0.6, 0.6]);
    // matched lists exactly the chips each piece carries, in the request's order.
    expect(results[0].matched).toEqual(["warm", "bold", "red", "wool", "gift for mom"]);
    expect(results[1].matched).toEqual(["warm", "red", "wool", "gift for mom"]);
    expect(results[3].matched).toEqual(["bold", "red", "gift for mom"]);
    expect(results[0].reason).toEqual({ en: "Matches warm, bold, red, wool, gift for mom", zh: "匹配：warm, bold, red, wool, gift for mom" });
    const answer = sample("search.answered", { queryId: "qry_user_1", results, engine: "keyword_scripted" }, { source: "scripted" });
    expect(validateEvent(answer)).toEqual([]);
  });

  it("applies the price chip as a cap even without the filter, and the lower of the two", () => {
    const byChip = scoreKeywords(FIG11_KEYWORDS, {}, TEST_INDEX, TEST_PIECES);
    expect(byChip.map((r) => r.pieceId)).not.toContain("pc_03");
    const lower = scoreKeywords(["red", "wool", "under $200"], { maxPriceCents: 5000 }, TEST_INDEX, TEST_PIECES);
    expect(lower.map((r) => r.pieceId)).toEqual(["pc_07"]);
  });

  it("scores against word chips only: removing a chip changes every share", () => {
    const four = scoreKeywords(["warm", "bold", "red", "wool"], { maxPriceCents: 20000 }, TEST_INDEX, TEST_PIECES);
    expect(four[0]).toMatchObject({ pieceId: "pc_01", score: 1 });
    expect(four.find((r) => r.pieceId === "pc_07")?.score).toBe(0.75);
  });

  it("filters by community before ranking", () => {
    const res = scoreKeywords(["red", "bold"], { communityIds: ["com_ojibwe"] }, TEST_INDEX, TEST_PIECES);
    expect(res.map((r) => r.pieceId)).toEqual(["pc_14"]);
  });

  it("leaves out pieces that score 0 and drafts, sorts ties by pieceId, and returns at most 12", () => {
    expect(scoreKeywords(["nothing"], {}, TEST_INDEX, TEST_PIECES)).toEqual([]);
    expect(scoreKeywords(["under $100"], {}, TEST_INDEX, TEST_PIECES)).toEqual([]);
    const geometric = scoreKeywords(["geometric"], {}, TEST_INDEX, TEST_PIECES);
    expect(geometric.map((r) => r.pieceId)).toEqual(["pc_27", "pc_30", "pc_32", "pc_35", "pc_38", "pc_42", "pc_45", "pc_48", "pc_51"]);
    // pc_55 is a draft in the index, so it's never returned.
    expect(scoreKeywords(["warm", "bold"], {}, TEST_INDEX, TEST_PIECES).map((r) => r.pieceId)).not.toContain("pc_55");
    const many = Array.from({ length: 20 }, (_, i) => ({ ...TEST_PIECES[0], id: `pc_${String(60 + i)}` }));
    const index = many.map((p) => ({ ...TEST_INDEX[0], pieceId: p.id }));
    const top = scoreKeywords(["wool"], {}, index, many);
    expect(top).toHaveLength(12);
    expect(top[0].pieceId).toBe("pc_60");
  });
});

describe("keywordVocab", () => {
  it("holds every facet and vibe word of the index's pieces, each in its earliest group, plus the aliases", () => {
    const v = keywordVocab(TEST_INDEX, TEST_ALIASES, TEST_PIECES);
    expect(v.terms.get("warm")).toBe("mood");
    expect(v.terms.get("wool")).toBe("facet");
    expect(v.terms.get("wall weaving")).toBe("facet");
    expect(v.terms.get("gift for mom")).toBe("for");
    expect(v.terms.get("birthday")).toBe("for");
    // An alias's term no piece carries is still a term.
    expect(v.terms.get("gift for dad")).toBe("for");
    expect(v.aliases.get("mom")).toBe("gift for mom");
    // A word in two groups counts in the earlier one.
    const both = keywordVocab(TEST_INDEX.slice(0, 1), {}, [{ ...TEST_PIECES[0], facets: { ...TEST_PIECES[0].facets, colors: ["warm"] } }]);
    expect(both.terms.get("warm")).toBe("mood");
  });
});

describe("chips and reasons", () => {
  it("knows a price chip", () => {
    expect(isPriceChip("under $200")).toBe(true);
    expect(isPriceChip("below $1,500")).toBe(true);
    expect(isPriceChip("under 200")).toBe(false);
    expect(isPriceChip("wool")).toBe(false);
  });

  it("builds the reason from the matched words", () => {
    expect(keywordReason(["red", "wool"])).toEqual({ en: "Matches red, wool", zh: "匹配：red, wool" });
  });
});
