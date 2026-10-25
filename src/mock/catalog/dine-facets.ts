// The v2 fields of the Diné Weaving and Silver Co-op's twelve pieces (S3-catalog T5): communityId,
// facets, vibe and imageAlt, written from R0's stories. catalog.ts merges them onto R0's records,
// whose fields and figures stay exactly as R0 left them. DEMO DATA, written by the Cindia team.
// - Objects are the safe facts' forms: wall weavings, rugs, earrings, a ring, a pendant necklace
//   and a cuff bracelet. Weaving motifs come from diamond, stripe, zigzag, step and band, silver
//   motifs from dot, line, chevron and arc (R14). Materials are wool, silver and turquoise (R16).
// - Featured pieces are one of a kind and ship in 3 days. Series pieces are made again and ship
//   in 5.
// - Figure 11: pc_01 carries all five word chips (warm, bold, red, wool, gift for mom), pc_07 and
//   pc_11 four each, and every silver piece at $200 or less at most two.
import type { Facets, Text, Vibe } from "../../core/types";

export interface DineFields {
  communityId: "com_dine";
  facets: Facets;
  vibe: Vibe;
  imageAlt: Text;
}

const O = {
  wallWeaving: { en: "wall weaving", zh: "壁挂编织" },
  rug: { en: "rug", zh: "地毯" },
  earrings: { en: "earrings", zh: "耳环" },
  ring: { en: "ring", zh: "戒指" },
  pendant: { en: "pendant necklace", zh: "吊坠项链" },
  cuff: { en: "cuff bracelet", zh: "手镯" },
} satisfies Record<string, Text>;

interface Spec {
  object: Text;
  materials: string[];
  techniques: string[];
  motifs: string[];
  colors: string[];
  sizeCm?: { w: number; h: number };
  featured: boolean;
  moods: string[];
  occasions: string[];
  recipients: string[];
  imageAlt: Text;
}

function fields(s: Spec): DineFields {
  return {
    communityId: "com_dine",
    facets: {
      object: s.object,
      materials: s.materials,
      techniques: s.techniques,
      motifs: s.motifs,
      colors: s.colors,
      ...(s.sizeCm ? { sizeCm: s.sizeCm } : {}),
      oneOfAKind: s.featured,
      leadTimeDays: s.featured ? 3 : 5,
    },
    vibe: { moods: s.moods, occasions: s.occasions, recipients: s.recipients },
    imageAlt: s.imageAlt,
  };
}

/** dineFields[pieceId] holds the v2 fields of pc_01 to pc_12. */
export const dineFields: Record<string, DineFields> = {
  pc_01: fields({
    object: O.wallWeaving,
    materials: ["wool"],
    techniques: ["handwoven"],
    motifs: ["diamond", "step"],
    colors: ["grey", "red", "black"],
    sizeCm: { w: 30, h: 40 },
    featured: true,
    moods: ["warm", "bold"],
    occasions: ["birthday"],
    recipients: ["gift for mom"],
    imageAlt: {
      en: "Illustration of a small wall weaving in grey, red and black with a stepped diamond at its center.",
      zh: "插图：一幅灰、红、黑三色的小幅壁挂编织，中央是一个阶梯菱形。",
    },
  }),
  pc_02: fields({
    object: O.earrings,
    materials: ["silver"],
    techniques: ["hand-stamped"],
    motifs: ["dot"],
    colors: ["silver"],
    featured: false,
    moods: ["elegant", "quiet"],
    occasions: ["everyday"],
    recipients: ["gift for a friend", "gift for a sister"],
    imageAlt: {
      en: "Illustration of a pair of small oval silver earrings, each stamped with a ring of dots.",
      zh: "插图：一对小巧的椭圆形银耳环，每只都压印着一圈圆点。",
    },
  }),
  pc_03: fields({
    object: O.rug,
    materials: ["wool"],
    techniques: ["handwoven", "hand-spun"],
    motifs: ["band", "diamond"],
    colors: ["brown", "white", "grey"],
    sizeCm: { w: 75, h: 120 },
    featured: true,
    moods: ["earthy", "calm", "warm"],
    occasions: ["housewarming"],
    recipients: ["for myself"],
    imageAlt: {
      en: "Illustration of a rug in brown, white and grey wool with bands of small diamonds across it.",
      zh: "插图：一块棕、白、灰三色的羊毛地毯，横贯几道小菱形纹带。",
    },
  }),
  pc_04: fields({
    object: O.rug,
    materials: ["wool"],
    techniques: ["handwoven", "hand-dyed"],
    motifs: ["diamond", "step"],
    colors: ["red", "black", "white"],
    sizeCm: { w: 60, h: 100 },
    featured: true,
    moods: ["bold", "warm"],
    occasions: ["housewarming"],
    recipients: ["for myself", "gift for dad"],
    imageAlt: {
      en: "Illustration of a rug with three red and black stepped diamonds on a white ground.",
      zh: "插图：一块白底地毯，织着三个红黑两色的阶梯菱形。",
    },
  }),
  pc_05: fields({
    object: O.wallWeaving,
    materials: ["wool"],
    techniques: ["handwoven", "hand-spun", "hand-dyed"],
    motifs: ["stripe"],
    colors: ["indigo", "white"],
    sizeCm: { w: 60, h: 90 },
    featured: true,
    moods: ["calm", "elegant"],
    occasions: ["housewarming"],
    recipients: ["for myself"],
    imageAlt: {
      en: "Illustration of a weaving with wide and narrow stripes in indigo blue and white.",
      zh: "插图：一幅靛蓝与白色宽窄条纹相间的编织。",
    },
  }),
  pc_06: fields({
    object: O.wallWeaving,
    materials: ["wool"],
    techniques: ["handwoven"],
    motifs: ["zigzag", "band"],
    colors: ["grey", "white"],
    sizeCm: { w: 45, h: 60 },
    featured: true,
    moods: ["calm", "playful"],
    occasions: ["housewarming"],
    recipients: ["for myself", "gift for a friend"],
    imageAlt: {
      en: "Illustration of a weaving with grey and white bands that bend into zigzags.",
      zh: "插图：一幅编织，灰白两色的纹带折成一道道锯齿。",
    },
  }),
  pc_07: fields({
    object: O.wallWeaving,
    materials: ["wool"],
    techniques: ["handwoven"],
    motifs: ["stripe"],
    colors: ["red", "grey"],
    sizeCm: { w: 15, h: 15 },
    featured: false,
    moods: ["warm", "cheerful"],
    occasions: ["birthday", "thank you"],
    recipients: ["gift for mom", "gift for a friend"],
    imageAlt: {
      en: "Illustration of a palm-sized weaving in red and grey stripes.",
      zh: "插图：一幅巴掌大小的红灰条纹编织。",
    },
  }),
  pc_08: fields({
    object: O.ring,
    materials: ["silver"],
    techniques: ["hand-stamped", "soldered"],
    motifs: ["chevron"],
    colors: ["silver"],
    featured: false,
    moods: ["quiet", "elegant"],
    occasions: ["everyday"],
    recipients: ["for myself", "gift for a friend"],
    imageAlt: {
      en: "Illustration of a thin silver ring stamped all the way around with small chevrons.",
      zh: "插图：一枚细银戒，整圈压印着小小的人字纹。",
    },
  }),
  pc_09: fields({
    object: O.pendant,
    materials: ["silver", "turquoise"],
    techniques: ["hand-stamped", "stone setting"],
    motifs: ["line"],
    colors: ["silver", "turquoise"],
    featured: false,
    moods: ["elegant", "calm"],
    occasions: ["birthday", "holiday"],
    recipients: ["gift for mom", "gift for a sister"],
    imageAlt: {
      en: "Illustration of a silver pendant with one small oval turquoise stone inside a stamped border, on a silver chain.",
      zh: "插图：一枚带压花边框的银吊坠，镶着一颗小椭圆形绿松石，配一条银链。",
    },
  }),
  pc_10: fields({
    object: O.earrings,
    materials: ["silver", "turquoise"],
    techniques: ["stone setting"],
    motifs: [],
    colors: ["silver", "turquoise"],
    featured: false,
    moods: ["bright", "elegant"],
    occasions: ["holiday"],
    recipients: ["gift for a sister", "gift for a friend"],
    imageAlt: {
      en: "Illustration of a pair of drop earrings, each a small turquoise stone in a plain silver setting.",
      zh: "插图：一对坠耳环，每只是一颗嵌在素面银托里的小绿松石。",
    },
  }),
  pc_11: fields({
    object: O.wallWeaving,
    materials: ["wool"],
    techniques: ["handwoven", "hand-dyed"],
    motifs: ["stripe", "diamond"],
    colors: ["red", "white"],
    sizeCm: { w: 30, h: 40 },
    featured: true,
    moods: ["bold", "bright"],
    occasions: ["housewarming", "birthday"],
    recipients: ["gift for mom"],
    imageAlt: {
      en: "Illustration of a weaving in red and white stripes with a band of red diamonds through the middle.",
      zh: "插图：一幅红白条纹编织，中间横贯一道红色菱形纹带。",
    },
  }),
  pc_12: fields({
    object: O.cuff,
    materials: ["silver"],
    techniques: ["hand-stamped", "soldered"],
    motifs: ["dot", "line"],
    colors: ["silver"],
    featured: false,
    moods: ["bold", "elegant"],
    occasions: ["everyday"],
    recipients: ["gift for dad", "for myself"],
    imageAlt: {
      en: "Illustration of a narrow silver cuff stamped with small dots and lines.",
      zh: "插图：一只细窄的银手镯，压印着小圆点和线条。",
    },
  }),
};
