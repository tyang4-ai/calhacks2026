// The 50 held-out test queries, sq_001 to sq_050 (data-model.md, SearchQuery; S3-catalog R25).
//
// DEMO DATA, written separately by our data agent, not by a person, so every one carries
// author: "data_agent". A query Gordon writes or edits later carries author: "gordon", and B11's
// report scores those as their own row.
//
// Held out: these never enter training, and B11 enforces it (its eval-leak guard drops any generated
// training query equal to one of these, or sharing 80% of its tokens). The 54 pieces they grade are in
// training, and only the queries are held out (B2-7). The wording is this file's own, never the
// training-query generator's patterns.
//
// Grades: 2 is a perfect match and 1 a good one, two to six pieces per query, judged from each
// piece's own facet and vibe words and its title. A piece a query doesn't grade counts as a miss.
// The pooled grading pass (S3-catalog T9, below) graded what the systems actually returned, once.
//
// The mix: moods, occasions, who it's for, what it looks like, materials, techniques, craft words,
// misspellings, very short and long, forty in English and ten in Chinese.
import type { SearchQuery } from "../core/types";

type Grades = SearchQuery["grades"];

const en = (text: string, grades: Grades): Omit<SearchQuery, "id"> => ({ text, lang: "en", grades, author: "data_agent" });
const zh = (text: string, grades: Grades): Omit<SearchQuery, "id"> => ({ text, lang: "zh", grades, author: "data_agent" });

const QUERIES: Omit<SearchQuery, "id">[] = [
  // A mood, with nothing else.
  en("something calm for a reading corner", { pc_05: 2, pc_06: 2, pc_03: 1, pc_27: 1, pc_33: 1, pc_37: 1 }),
  en("earthy and warm, for a kitchen shelf", { pc_28: 2, pc_34: 2, pc_32: 1, pc_29: 1 }),
  en("quiet and simple", { pc_02: 2, pc_08: 2, pc_31: 2, pc_33: 2, pc_37: 2, pc_40: 2 }),
  // An occasion.
  en("housewarming present, something to hang on the wall", { pc_05: 2, pc_06: 2, pc_11: 2, pc_03: 1, pc_04: 1 }),
  en("a thank you gift under $50", { pc_07: 2, pc_18: 2, pc_40: 2 }),
  en("holiday gift for my sister", { pc_09: 2, pc_10: 2, pc_24: 2, pc_42: 2, pc_45: 2, pc_51: 2 }),
  en("birthday present for a young child", { pc_50: 2, pc_54: 2 }),
  // Who it's for.
  en("for my dad, he likes bold things", { pc_04: 2, pc_12: 2, pc_32: 2, pc_48: 2, pc_52: 2, pc_44: 1 }),
  en("treat myself to an elegant black and white pot", { pc_27: 2, pc_33: 2, pc_39: 2, pc_38: 1, pc_37: 1, pc_31: 1 }),
  en("gift for a friend who loves flowers", { pc_13: 2, pc_14: 2, pc_15: 2, pc_19: 2, pc_22: 2, pc_26: 2 }),
  en("my mother's birthday, she wears necklaces", { pc_09: 2, pc_21: 2, pc_23: 2, pc_20: 1 }),
  // What it looks like.
  en("red and black patchwork", { pc_41: 2, pc_43: 2, pc_49: 2, pc_52: 2, pc_48: 1 }),
  en("orange and white dots", { pc_29: 2, pc_36: 2, pc_40: 1 }),
  en("grey zigzags", { pc_06: 2, pc_07: 1, pc_01: 1 }),
  en("big striking rug with stepped diamonds", { pc_04: 2, pc_03: 1, pc_01: 1 }),
  en("a tiny pot with dots", { pc_40: 2, pc_29: 2, pc_36: 1 }),
  en("purple beadwork", { pc_16: 2, pc_24: 2, pc_45: 1 }),
  en("green leaves on a necklace", { pc_20: 2, pc_23: 2, pc_21: 1 }),
  en("navy jacket with orange bands", { pc_46: 2, pc_41: 1, pc_52: 1 }),
  // A material.
  en("turquoise", { pc_09: 2, pc_10: 2 }),
  en("a slim silver band for my finger", { pc_08: 2, pc_12: 1 }),
  en("leather pouch covered in beads", { pc_17: 2, pc_19: 2, pc_24: 2, pc_25: 2, pc_15: 1, pc_26: 1 }),
  en("cotton skirt trimmed with rickrack", { pc_43: 2, pc_49: 2, pc_41: 1, pc_46: 1 }),
  // A technique.
  en("hand-spun wool", { pc_03: 2, pc_05: 2, pc_04: 1 }),
  en("a hand-painted clay bowl to set on a shelf", { pc_28: 2, pc_33: 2, pc_36: 2 }),
  en("beads woven on a loom, red and black", { pc_21: 2, pc_17: 1, pc_26: 1 }),
  en("machine-sewn jacket in red", { pc_48: 2, pc_52: 2, pc_41: 1 }),
  // A craft word.
  en("seed pot", { pc_29: 2, pc_30: 2, pc_31: 2, pc_34: 2, pc_37: 2, pc_40: 2 }),
  en("beadwork necklace", { pc_20: 2, pc_21: 2, pc_23: 2 }),
  en("patchwork that isn't too busy, calm colors", { pc_42: 2, pc_47: 2 }),
  en("pink beadwork earrings", { pc_13: 2, pc_23: 1, pc_17: 1 }),
  en("a weaving with stripes to hang up", { pc_05: 2, pc_07: 2, pc_11: 2, pc_06: 1 }),
  // Misspelled.
  en("turqoise earings", { pc_10: 2, pc_09: 1, pc_02: 1 }),
  en("geometic jar", { pc_27: 2, pc_32: 2, pc_35: 2, pc_38: 2, pc_39: 1 }),
  en("beeded earings with berrys", { pc_18: 2, pc_24: 1, pc_26: 1 }),
  // Long.
  en(
    "My sister just moved into her first apartment and I want to get her something for the wall that feels calm, maybe blue or white, nothing too loud",
    { pc_05: 2, pc_06: 2, pc_03: 1 },
  ),
  en(
    "I'm looking for a present for my dad who keeps everything in his truck, maybe a sturdy leather pouch in earthy colors",
    { pc_25: 2, pc_19: 1, pc_17: 1 },
  ),
  en(
    "Need a bright, happy piece to wear to a holiday party, a skirt with lots of color, yellow if possible",
    { pc_43: 2, pc_45: 2, pc_49: 1, pc_42: 1 },
  ),
  // Very short.
  en("rug", { pc_03: 2, pc_04: 2 }),
  en("jackets", { pc_41: 2, pc_44: 2, pc_46: 2, pc_48: 2, pc_50: 2, pc_52: 2 }),
  // In Chinese.
  zh("安静一点的陶罐，黑白两色", { pc_27: 2, pc_39: 2, pc_33: 1, pc_37: 1 }),
  zh("绿松石吊坠", { pc_09: 2, pc_10: 1, pc_20: 1, pc_23: 1 }),
  zh("送给朋友的小耳环，颜色要亮", { pc_10: 2, pc_14: 2, pc_22: 2, pc_13: 1, pc_18: 1, pc_02: 1 }),
  zh("蓝白拼布裙", { pc_42: 2, pc_54: 1, pc_49: 1 }),
  zh("乔迁新居，送一只大陶碗", { pc_28: 2, pc_33: 2, pc_36: 1 }),
  zh("给爸爸的礼物，要稳重一点", { pc_25: 2, pc_34: 1 }),
  zh("带花的串珠小包", { pc_15: 2, pc_19: 2, pc_26: 2, pc_17: 1 }),
  zh("适合小孩子穿的衣服", { pc_50: 2, pc_54: 2 }),
  zh("紫色和黄色", { pc_45: 2, pc_16: 1, pc_24: 1 }),
  zh("手工盘筑的种子罐，橙色的", { pc_29: 2, pc_30: 2, pc_34: 2, pc_36: 1 }),
];

// The pooled grading pass (S3-catalog T9, B2-8), done once on server/b11_embed/unjudged.json from
// B11's first real run (cindia-embed-v1, fingerprint f7181c7ddb90af25). That file listed 259 pieces
// that some system put in a query's top 5 without a grade. The pass added 38 grades, all 1s, over 22
// queries, and left the other 221 ungraded, so they still count as misses. sq_007 was graded against
// its current text, "birthday present for a young child", and no listed piece is for a child.
// The rule, judged from each piece's own title, facets, vibe and story: a 1 carries the heart of the
// query (the kind of thing, or the one detail that makes it specific) and most of the rest, as T6's
// own 1s for that query do. A piece that shares only a color, a craft, a mood or an occasion stays
// ungraded. No listed piece carries everything a query asks, so no pooled grade is a 2.
// T6's two-to-six rule capped the pass: 12 more pieces would have earned a 1 in 9 queries that were
// already full (sq_004 pc_07; sq_006 pc_15, pc_20, pc_26; sq_008 pc_25; sq_009 pc_40; sq_025 pc_39;
// sq_031 pc_22; sq_035 pc_22; sq_043 pc_16; sq_050 pc_32, pc_38). Where the cap chose, pieces closer
// to the query's kind of thing went first, then pieceId order, never any system's ranking.
// The pooled grades are kept apart here so the pass can be audited, and merged into grades below.
const POOLED: Record<string, Grades> = {
  sq_002: { pc_07: 1 },
  sq_004: { pc_01: 1 },
  sq_014: { pc_03: 1 },
  sq_015: { pc_11: 1 },
  sq_016: { pc_30: 1, pc_31: 1, pc_37: 1 },
  sq_018: { pc_14: 1, pc_16: 1 },
  sq_019: { pc_44: 1, pc_50: 1 },
  sq_023: { pc_52: 1 },
  sq_024: { pc_11: 1 },
  sq_025: { pc_27: 1, pc_35: 1, pc_38: 1 },
  sq_027: { pc_44: 1, pc_46: 1, pc_50: 1 },
  sq_031: { pc_14: 1, pc_16: 1, pc_18: 1 },
  sq_032: { pc_01: 1 },
  sq_035: { pc_13: 1, pc_14: 1, pc_16: 1 },
  sq_037: { pc_24: 1 },
  sq_038: { pc_41: 1, pc_44: 1 },
  sq_041: { pc_40: 1 },
  sq_044: { pc_50: 1, pc_53: 1 },
  sq_045: { pc_39: 1 },
  sq_046: { pc_12: 1, pc_32: 1 },
  sq_047: { pc_24: 1 },
  sq_050: { pc_31: 1, pc_40: 1 },
};

/** The 50 held-out queries, sq_001 to sq_050, each with T6's grades and the pooled pass's. */
export const searchEval: SearchQuery[] = QUERIES.map((q, i) => {
  const id = `sq_${String(i + 1).padStart(3, "0")}`;
  const pooled = POOLED[id] ?? {};
  // The pooled pass only adds: it never regrades a piece T6 graded.
  const regraded = Object.keys(pooled).filter((pieceId) => pieceId in q.grades);
  if (regraded.length > 0) throw new Error(`searchEval: the pooled pass regrades ${id} ${regraded.join(", ")}`);
  return { id, ...q, grades: { ...q.grades, ...pooled } };
});
