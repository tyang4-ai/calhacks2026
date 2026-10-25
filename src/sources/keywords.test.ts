import { describe, expect, it } from "vitest";
import { keywordVocab } from "./keywordSearch";
import { extractKeywords } from "./keywords";
import { FIG11_KEYWORDS, FIG11_TEXT, TEST_ALIASES, TEST_INDEX, TEST_PIECES, TEST_VOCAB } from "./testCatalog";

describe("extractKeywords", () => {
  it("gives figure 11's six chips in figure 11's order, and the price filter", () => {
    const out = extractKeywords(FIG11_TEXT, TEST_VOCAB);
    expect(out.keywords).toEqual(FIG11_KEYWORDS);
    expect(out.filters).toEqual({ maxPriceCents: 20000 });
  });

  it("is deterministic", () => {
    expect(extractKeywords(FIG11_TEXT, TEST_VOCAB)).toEqual(extractKeywords(FIG11_TEXT, TEST_VOCAB));
  });

  it("turns below $N into the chip under $N, and uses its words up", () => {
    const out = extractKeywords("something below $85 in wool", TEST_VOCAB);
    expect(out.keywords).toEqual(["wool", "under $85"]);
    expect(out.filters).toEqual({ maxPriceCents: 8500 });
    expect(extractKeywords("wool under $1,500", TEST_VOCAB).filters).toEqual({ maxPriceCents: 150000 });
    expect(extractKeywords("red wool", TEST_VOCAB).filters).toEqual({});
  });

  it("matches multi-word terms before single words, longest first", () => {
    // "gift for a friend" and "glass beads" are vocabulary phrases. Their words are used up, so
    // "gift" or "beads" never match again on their own.
    const out = extractKeywords("glass beads, a gift for a friend", TEST_VOCAB);
    expect(out.keywords).toEqual(["glass beads", "gift for a friend"]);
    // "fine line" is one motif, not two words.
    expect(extractKeywords("a fine line pot", TEST_VOCAB).keywords).toEqual(["fine line"]);
  });

  it("resolves an alias key through its alias, even when the alias's term no piece carries", () => {
    expect(extractKeywords("for my mother", TEST_VOCAB).keywords).toEqual(["gift for mom"]);
    expect(extractKeywords("something for dad", TEST_VOCAB).keywords).toEqual(["gift for dad"]);
    // A multi-word alias key matches as a phrase.
    const vocab = keywordVocab(TEST_INDEX, { ...TEST_ALIASES, "my aunt": "gift for a friend" }, TEST_PIECES);
    expect(extractKeywords("bold, for my aunt", vocab).keywords).toEqual(["bold", "gift for a friend"]);
  });

  it("strips simple plurals: ies to y, then es, then s", () => {
    const extra = { ...TEST_PIECES[0], id: "pc_90", facets: { ...TEST_PIECES[0].facets, object: { en: "berry", zh: "" }, motifs: ["box", "leaf"] } };
    const index = [...TEST_INDEX, { ...TEST_INDEX[0], pieceId: "pc_90" }];
    const v = keywordVocab(index, {}, [...TEST_PIECES, extra]);
    expect(extractKeywords("berries and boxes with leafs", v).keywords).toEqual(["berry", "box", "leaf"]);
    expect(extractKeywords("jars", v).keywords).toEqual(["jar"]);
    // The vocabulary holds only the words of pieces in the index.
    expect(keywordVocab(TEST_INDEX, {}, [...TEST_PIECES, extra]).terms.has("berry")).toBe(false);
  });

  it("orders moods, then facet words, then occasions and recipients, then the price, each in text order", () => {
    const out = extractKeywords("under $300 for mom: a geometric jar, black, quiet and calm, for a birthday", TEST_VOCAB);
    expect(out.keywords).toEqual(["quiet", "calm", "geometric", "jar", "black", "gift for mom", "birthday", "under $300"]);
  });

  it("gives each chip once, at its first appearance", () => {
    expect(extractKeywords("red, red wool and more red", TEST_VOCAB).keywords).toEqual(["red", "wool"]);
  });

  it("finds nothing in a text with no vocabulary words", () => {
    expect(extractKeywords("hello there", TEST_VOCAB)).toEqual({ keywords: [], filters: {} });
    expect(extractKeywords("", TEST_VOCAB)).toEqual({ keywords: [], filters: {} });
  });
});
