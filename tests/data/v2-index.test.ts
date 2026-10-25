// S3-catalog T5: the co-op's v2 fields, the merged catalog, the 54 index entries, the aliases and
// the closed vibe list. The passage rule, the keyword extractor and the scorer are reimplemented
// here from data-model.md, independently of src/mock/ and src/sources/, so the data is checked
// against the contract's words and not against its own code.
import { describe, expect, it } from "vitest";
import type { Community, IndexEntry, Piece } from "../../src/core/types";
import { contentRules, getById, keywordAliases, orders, pieces, searchIndex, vibeVocabulary } from "../../src/mock/index";

// The files under public/images/ (I2-art's placeholders), listed without loading them.
const IMAGES = Object.keys(import.meta.glob("../../public/images/*.svg", { query: "?url" })).map((k) => k.replace("../../public", ""));
import { FIG11, fig11Chips, MATERIALS, MOTIFS, OBJECTS, TECHNIQUES, words } from "./v2-catalog-rules";
import { scan } from "./v2-helpers";

const piece = (id: string) => getById<Piece>(id) as Piece;
const community = (id: string) => getById<Community>(id) as Community;
const entry = (id: string) => searchIndex.find((e) => e.pieceId === id) as IndexEntry;

/** data-model.md, The embedded passage, written again from the contract's text. */
function rule(p: Piece): string {
  const c = community(p.communityId);
  const s = p.story.en;
  const cut = [". ", "! ", "? "].map((m) => s.indexOf(m)).filter((i) => i >= 0);
  const first = (cut.length ? s.slice(0, Math.min(...cut) + 2) : s).trim();
  const f = p.facets;
  const v = p.vibe;
  const forList = [v.occasions.join(", "), v.recipients.join(", ")].filter((x) => x !== "").join(", ");
  return [
    `passage: ${f.object.en}`,
    `craft: ${c.craft.en}, ${c.people.en}`,
    f.materials.length ? `materials: ${f.materials.join(", ")}` : "",
    f.techniques.length ? `techniques: ${f.techniques.join(", ")}` : "",
    f.motifs.length ? `motifs: ${f.motifs.join(", ")}` : "",
    f.colors.length ? `colors: ${f.colors.join(", ")}` : "",
    v.moods.length ? `mood: ${v.moods.join(", ")}` : "",
    forList ? `for: ${forList}` : "",
    first,
  ]
    .filter((x) => x !== "")
    .join(" | ");
}

// data-model.md, Keyword chips: the extractor's five steps and its group order, on the real index.
const moods = new Set(pieces.flatMap((p) => p.vibe.moods));
const facetWords = new Set(pieces.flatMap((p) => { const f = p.facets; return [f.object.en, ...f.materials, ...f.techniques, ...f.motifs, ...f.colors]; }));
const forWords = new Set(pieces.flatMap((p) => [...p.vibe.occasions, ...p.vibe.recipients]));
const vocab = new Set([...moods, ...facetWords, ...forWords]);

/** A word as it is, then with simple plural stripping: ies to y, then es, then s. */
const strip = (w: string) => [w, w.endsWith("ies") ? `${w.slice(0, -3)}y` : "", w.endsWith("es") ? w.slice(0, -2) : "", w.endsWith("s") ? w.slice(0, -1) : ""];
/** Chip order: moods, then facet words, then occasions and recipients. */
const group = (t: string) => (moods.has(t) ? 0 : facetWords.has(t) ? 1 : 2);

function extract(text: string): { keywords: string[]; filters: { maxPriceCents?: number } } {
  const ws = text.toLowerCase().split(/\s+/).map((w) => w.replace(/^[^a-z0-9$]+|[^a-z0-9$]+$/g, "")).filter(Boolean);
  const used = ws.map(() => false);
  const found: { term: string; at: number }[] = [];
  const filters: { maxPriceCents?: number } = {};
  let price: string | undefined;
  for (let i = 0; i + 1 < ws.length; i++) {
    const m = /^\$(\d+)$/.exec(ws[i + 1]);
    if ((ws[i] === "under" || ws[i] === "below") && m) {
      price = `under $${m[1]}`;
      filters.maxPriceCents = Number(m[1]) * 100;
      used[i] = used[i + 1] = true;
    }
  }
  const multi = [...vocab, ...Object.keys(keywordAliases)].filter((t) => t.includes(" ")).toSorted((a, b) => b.split(" ").length - a.split(" ").length);
  for (const t of multi) {
    const n = t.split(" ").length;
    for (let i = 0; i + n <= ws.length; i++) {
      if (ws.slice(i, i + n).join(" ") === t && used.slice(i, i + n).every((u) => !u)) {
        for (let k = i; k < i + n; k++) used[k] = true;
        found.push({ term: keywordAliases[t] ?? t, at: i });
      }
    }
  }
  ws.forEach((w, i) => {
    if (!used[i] && keywordAliases[w] && !w.includes(" ")) {
      used[i] = true;
      found.push({ term: keywordAliases[w], at: i });
    }
  });
  ws.forEach((w, i) => {
    if (used[i]) return;
    const hit = strip(w).find((x) => x && vocab.has(x));
    if (hit) {
      used[i] = true;
      found.push({ term: hit, at: i });
    }
  });
  const seen = new Set<string>();
  const ordered = found
    .toSorted((a, b) => group(a.term) - group(b.term) || a.at - b.at)
    .map((f) => f.term)
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
  return { keywords: price ? [...ordered, price] : ordered, filters };
}

/** data-model.md, the scorer: the share of the request's word chips a piece carries, best first, ties by pieceId. */
function score(keywords: string[], maxPriceCents: number) {
  const ks = keywords.filter((k) => !k.startsWith("under $"));
  return pieces
    .filter((p) => p.priceCents <= maxPriceCents)
    .map((p) => {
      const w = new Set(words(p));
      const matched = ks.filter((k) => w.has(k));
      return { pieceId: p.id, matched, score: matched.length / ks.length };
    })
    .filter((r) => r.score > 0)
    .toSorted((a, b) => b.score - a.score || a.pieceId.localeCompare(b.pieceId))
    .slice(0, 12);
}

/** A maker's sales this month, over every piece of hers in the index. */
const makerSales = (m: string) => searchIndex.filter((e) => e.makerId === m).reduce((a, e) => a + e.salesThisMonth, 0);

const FIG11_TEXT ="a warm, bold gift for my mom. she loves red wool. under $200";

describe("the co-op's v2 fields", () => {
  it("give each of the twelve the object T5 names, from the co-op's two crafts", () => {
    const objects = Object.fromEntries(pieces.slice(0, 12).map((p) => [p.id, p.facets.object.en]));
    expect(objects).toEqual({
      pc_01: "wall weaving",
      pc_02: "earrings",
      pc_03: "rug",
      pc_04: "rug",
      pc_05: "wall weaving",
      pc_06: "wall weaving",
      pc_07: "wall weaving",
      pc_08: "ring",
      pc_09: "pendant necklace",
      pc_10: "earrings",
      pc_11: "wall weaving",
      pc_12: "cuff bracelet",
    });
    for (const p of pieces.slice(0, 12)) {
      expect(p.communityId, p.id).toBe("com_dine");
      const craft = p.facets.materials.includes("wool") ? "weaving" : "silver";
      expect(OBJECTS[craft], p.id).toContain(p.facets.object.en);
      for (const m of p.facets.materials) expect(MATERIALS[craft], p.id).toContain(m);
      for (const t of p.facets.techniques) expect(TECHNIQUES[craft], p.id).toContain(t);
      for (const m of p.facets.motifs) expect(MOTIFS[craft], p.id).toContain(m);
      expect(p.facets.oneOfAKind, p.id).toBe(p.kind === "featured");
      expect(p.imageAlt.en.startsWith("Illustration of "), p.id).toBe(true);
      expect(p.imageAlt.zh.startsWith("插图："), p.id).toBe(true);
    }
  });

  it("give pc_01, pc_07 and pc_11 figure 11's words", () => {
    expect(piece("pc_01").facets).toMatchObject({ materials: ["wool"], techniques: ["handwoven"], colors: ["grey", "red", "black"], motifs: ["diamond", "step"], leadTimeDays: 3 });
    expect(piece("pc_01").vibe).toEqual({ moods: ["warm", "bold"], occasions: ["birthday"], recipients: ["gift for mom"] });
    expect(piece("pc_07").facets).toMatchObject({ materials: ["wool"], colors: ["red", "grey"], motifs: ["stripe"] });
    expect(piece("pc_07").vibe.moods).toContain("warm");
    expect(piece("pc_07").vibe.moods).not.toContain("bold");
    expect(piece("pc_11").facets).toMatchObject({ materials: ["wool"], colors: ["red", "white"], motifs: ["stripe", "diamond"] });
    expect(piece("pc_11").vibe.moods).toContain("bold");
    expect(piece("pc_11").vibe.moods).not.toContain("warm");
    expect([piece("pc_01"), piece("pc_07"), piece("pc_11")].map(fig11Chips)).toEqual([
      ["warm", "bold", "red", "wool", "gift for mom"],
      ["warm", "red", "wool", "gift for mom"],
      ["bold", "red", "wool", "gift for mom"],
    ]);
    for (const p of pieces.slice(0, 12)) if (!p.facets.materials.includes("wool") && p.priceCents <= 20000) expect(fig11Chips(p).length, p.id).toBeLessThanOrEqual(2);
  });
});

describe("the catalog", () => {
  it("holds all 54 pieces in ID order, each community's in its contracts range", () => {
    expect(pieces.map((p) => p.id)).toEqual(Array.from({ length: 54 }, (_, i) => `pc_${String(i + 1).padStart(2, "0")}`));
    const range: Record<string, [number, number]> = { com_dine: [1, 12], com_ojibwe: [13, 26], com_acoma: [27, 40], com_seminole: [41, 54] };
    for (const p of pieces) {
      const [lo, hi] = range[p.communityId];
      const n = Number(p.id.slice(3));
      expect(n >= lo && n <= hi, p.id).toBe(true);
      expect(community(p.communityId).makerIds, p.id).toContain(p.makerId);
      expect(getById(p.id), p.id).toBe(p);
    }
  });

  it("figure 11's six carry 5, 4, 4, 3, 3 and 3 of its chips, and every other piece at $200 or less at most two", () => {
    const six = ["pc_01", "pc_07", "pc_11", "pc_14", "pc_30", "pc_43"];
    expect(six.map((id) => fig11Chips(piece(id)).length)).toEqual([5, 4, 4, 3, 3, 3]);
    for (const id of six) expect(piece(id).priceCents, id).toBeLessThanOrEqual(20000);
    const over = pieces.filter((p) => p.priceCents <= 20000 && !six.includes(p.id) && fig11Chips(p).length > 2);
    expect(over.map((p) => [p.id, fig11Chips(p)])).toEqual([]);
  });

  it("figure 11's text gives its six chips, and the scorer ranks figure 11's six first, in order", () => {
    const { keywords, filters } = extract(FIG11_TEXT);
    expect(keywords).toEqual([...FIG11, "under $200"]);
    expect(filters).toEqual({ maxPriceCents: 20000 });
    const ranked = score(keywords, filters.maxPriceCents as number);
    expect(ranked.slice(0, 6).map((r) => [r.pieceId, r.score])).toEqual([
      ["pc_01", 1],
      ["pc_07", 0.8],
      ["pc_11", 0.8],
      ["pc_14", 0.6],
      ["pc_30", 0.6],
      ["pc_43", 0.6],
    ]);
    expect(ranked.slice(6).every((r) => r.score <= 0.4)).toBe(true);
    // No facet or vibe word is a word of the text that figure 11 doesn't make a chip.
    for (const w of ["a", "gift", "for", "my", "mom", "she", "love", "loves", "under"]) expect(vocab.has(w), w).toBe(false);
  });

  it("geometric sits on exactly figure 12's nine pieces, from two communities", () => {
    const nine = pieces.filter((p) => p.facets.motifs.includes("geometric") || words(p).includes("geometric"));
    expect(nine.map((p) => p.id)).toEqual(["pc_27", "pc_30", "pc_32", "pc_35", "pc_38", "pc_42", "pc_45", "pc_48", "pc_51"]);
    expect([...new Set(nine.map((p) => p.communityId))]).toEqual(["com_acoma", "com_seminole"]);
  });

  it("run_08 has at least two pieces from other communities under $100 sharing two or more of pc_01's words, pc_14 among them", () => {
    const mine = new Set(words(piece("pc_01")));
    const alike = pieces.filter((p) => p.communityId !== "com_dine" && p.priceCents < 10000 && words(p).filter((w) => mine.has(w)).length >= 2);
    expect(alike.length).toBeGreaterThanOrEqual(2);
    expect(alike.map((p) => p.id)).toContain("pc_14");
  });

  it("heritage lines hold one kept-out word only: 'fur' in the Ojibwe line's sourced 'fur trade'", () => {
    // The craft lines are sourced facts, written word for word (R12). The Ojibwe line says glass
    // beads came through the fur trade, a history, not a material, so scans of every Text exempt it.
    const lines = [...new Map(pieces.map((p) => [p.heritage.en, p.heritage])).values()];
    expect(lines).toHaveLength(5);
    const hits = lines.flatMap((t) => scan(t, t.en.slice(0, 12), [...contentRules.bannedObjects, ...contentRules.stereotypeWords, ...contentRules.meaningWords]));
    expect(hits).toEqual([
      ["Ojibwe beadw.en", "fur"],
      ["Ojibwe beadw.zh", "毛皮"],
    ]);
    expect(lines.find((t) => t.en.startsWith("Ojibwe"))?.en).toContain("through the fur trade in the 1600s");
  });

  it("no piece holds a banned, stereotype or meaning word, or a nation's name in a title or facet", () => {
    const bad = [...contentRules.bannedObjects, ...contentRules.stereotypeWords, ...contentRules.meaningWords];
    const names = Object.values(contentRules.peopleNames).flat();
    for (const p of pieces) {
      expect(scan({ title: p.title, story: p.story, facets: p.facets, vibe: p.vibe, imageAlt: p.imageAlt, process: p.process }, p.id, bad)).toEqual([]);
      expect(scan({ title: p.title, facets: p.facets }, p.id, names)).toEqual([]);
    }
  });
});

describe("the search index", () => {
  it("has one active entry per piece, in order, with the piece's community, maker, storefront and provenance", () => {
    const slugs: Record<string, string> = { com_dine: "dine-weavers", com_ojibwe: "ojibwe-beadwork", com_acoma: "acoma-pottery", com_seminole: "seminole-patchwork" };
    expect(searchIndex.map((e) => e.pieceId)).toEqual(pieces.map((p) => p.id));
    for (const e of searchIndex) {
      const p = piece(e.pieceId);
      expect(e, e.pieceId).toMatchObject({ communityId: p.communityId, makerId: p.makerId, approvedBy: p.makerId, status: "active", storefrontSlug: slugs[p.communityId] });
      expect(e.provenance, e.pieceId).toEqual({ facts: "maker", culture: "community", vibe: "agent:tagger", picture: "agent:describer" });
      expect(e.pictureNote.en.length > 0 && e.pictureNote.zh.length > 0, e.pieceId).toBe(true);
    }
  });

  it("builds every embedText by the passage rule, pc_01's exactly", () => {
    for (const e of searchIndex) expect(e.embedText, e.pieceId).toBe(rule(piece(e.pieceId)));
    expect(entry("pc_01").embedText).toBe(
      "passage: wall weaving | craft: Wool weavings, silver and turquoise jewelry, Diné (Navajo) | materials: wool | techniques: handwoven | motifs: diamond, step | colors: grey, red, black | mood: warm, bold | for: birthday, gift for mom | A small wool weaving in grey, red and black, with a stepped diamond at its center.",
    );
    // A piece with no motifs leaves the part out, label and all.
    expect(piece("pc_10").facets.motifs).toEqual([]);
    expect(entry("pc_10").embedText).not.toContain("motifs:");
    // A story with no sentence break is embedded whole.
    expect(entry("pc_07").embedText.endsWith("| A palm-sized weaving in red and grey, about 15 by 15 cm, for a shelf or a desk.")).toBe(true);
  });

  it("counts the co-op's sales from September's paid orders, refunds left out", () => {
    for (const p of pieces.slice(0, 12)) {
      const sold = orders.filter((o) => o.pieceId === p.id && o.status === "paid").length;
      expect(entry(p.id).salesThisMonth, p.id).toBe(sold);
    }
    expect(["pc_01", "pc_02", "pc_07", "pc_12"].map((id) => entry(id).salesThisMonth)).toEqual([1, 5, 4, 3]);
  });

  it("types the other 42 from 0 to 6, with figure 12's values, Julie M. at 0 and every featured piece at most 1", () => {
    for (const e of searchIndex.slice(12)) expect(Number.isInteger(e.salesThisMonth) && e.salesThisMonth >= 0 && e.salesThisMonth <= 6, e.pieceId).toBe(true);
    const fig12 = { pc_27: 4, pc_30: 3, pc_32: 2, pc_35: 5, pc_38: 0, pc_42: 3, pc_45: 2, pc_48: 4, pc_51: 1 };
    expect(Object.fromEntries(Object.keys(fig12).map((id) => [id, entry(id).salesThisMonth]))).toEqual(fig12);
    expect(searchIndex.filter((e) => e.makerId === "mkr_12").map((e) => [e.pieceId, e.salesThisMonth])).toEqual([["pc_36", 0], ["pc_37", 0], ["pc_38", 0]]);
    for (const p of pieces) if (p.kind === "featured") expect(entry(p.id).salesThisMonth, p.id).toBeLessThanOrEqual(1);
    // Every other geometric piece's maker sold something this month.
    for (const id of Object.keys(fig12)) {
      const m = piece(id).makerId;
      if (m !== "mkr_12") expect(makerSales(m), m).toBeGreaterThanOrEqual(1);
    }
    expect(makerSales("mkr_12")).toBe(0);
  });

  it("keeps every vibe word in the closed list, and no bare gift, mom or love", () => {
    for (const p of pieces) {
      for (const m of p.vibe.moods) expect(vibeVocabulary.moods, `${p.id} ${m}`).toContain(m);
      for (const o of p.vibe.occasions) expect(vibeVocabulary.occasions, `${p.id} ${o}`).toContain(o);
      for (const r of p.vibe.recipients) expect(vibeVocabulary.recipients, `${p.id} ${r}`).toContain(r);
      expect([...p.vibe.moods, ...p.vibe.occasions, ...p.vibe.recipients].filter((w) => ["gift", "mom", "love"].includes(w)), p.id).toEqual([]);
    }
    expect(scan(vibeVocabulary, "vibeVocabulary", [...contentRules.stereotypeWords, ...contentRules.bannedObjects])).toEqual([]);
  });

  it("maps the aliases T5 names, and never a stereotype word", () => {
    expect(keywordAliases).toEqual({ mom: "gift for mom", mother: "gift for mom", mum: "gift for mom", dad: "gift for dad", father: "gift for dad" });
    const stereo = contentRules.stereotypeWords.map((w) => w.toLowerCase());
    for (const [k, v] of Object.entries(keywordAliases)) {
      expect(stereo, k).not.toContain(k.toLowerCase());
      expect(stereo, v).not.toContain(v.toLowerCase());
      expect(vibeVocabulary.recipients, v).toContain(v);
    }
    expect(scan(keywordAliases, "aliases", Object.values(contentRules.peopleNames).flat())).toEqual([]);
  });

  it("has an image file under public/images/ for every piece", () => {
    expect(IMAGES.length).toBeGreaterThanOrEqual(54);
    for (const p of pieces) expect(IMAGES, p.image).toContain(p.image);
  });
});
