// The 54 pieces (data-model.md, The catalog) and curatedSet, the scripted concierge answer.
//
// First the twelve pieces of the Diné Weaving and Silver Co-op, exactly as the catalog table in
// data-model.md and the R0-reskin plan give them. Seven are wool weavings and five are silver
// pieces. Stories follow A2 R11: what the piece is, its materials and one plain detail about colors
// or size, with no lineage, hardship or meaning, and never a claim that a real person made it.
// Process steps are physical work only (A2 R13). Their v2 fields (communityId, facets, vibe,
// imageAlt) come from catalog/dine-facets.ts and are merged on below (S3-catalog T5), so R0's fields
// and every v1 figure stay as they were.
//
// Then the other three communities' 42 pieces: catalog/part-a.ts (Ojibwe pc_13 to pc_26, Acoma
// pc_27 to pc_40) and catalog/part-b.ts (Seminole pc_41 to pc_54). Images are the placeholders
// under public/images/ until I2-art draws them.
import type { Piece, ProcessStep, Text } from "../core/types";
import { dineFields } from "./catalog/dine-facets";
import { partA } from "./catalog/part-a";
import { partB } from "./catalog/part-b";

/** A co-op piece as R0 wrote it, before its v2 fields. */
type CoreFields = Omit<Piece, "communityId" | "facets" | "vibe" | "imageAlt">;

// The two craft lines (A2 R12). One line per craft, the same on every piece of that craft, with no
// per-piece extra and no meaning. These are the only statements about the real crafts.

/** Weaving. Source: CU Museum of Natural History, Navajo weaving. */
const WEAVING: Text = {
  en: "Diné weavers weave on an upright loom. Early weavings used the wool of churro sheep in natural white and brown, indigo blue and red, and commercial yarns and dyes arrived in the 1870s.",
  zh: "纳瓦霍（Diné）织工在立式织机上编织。早期织物用丘罗羊（churro）的羊毛，颜色有天然的白与棕、靛蓝和红色；19世纪70年代起有了商品毛线和染料。",
};

/** Silver. Source: Heard Museum, Southwest silverwork 1850 to 1940. Rings: Penn Museum, Navajo ring NA10808. */
const SILVER: Text = {
  en: "Diné smiths have worked silver since the 1850s and 1860s, decorating it mostly with hand stamps, and have set turquoise in silver since about 1880.",
  zh: "纳瓦霍（Diné）银匠自19世纪50至60年代开始制作银器，主要用手工印模压花装饰，约1880年起在银饰上镶嵌绿松石。",
};

const S = {
  yarn: { en: "Preparing the yarn", zh: "整理毛线" },
  spin: { en: "Spinning the wool", zh: "纺毛线" },
  dye: { en: "Dyeing the yarn", zh: "染线" },
  warp: { en: "Setting up the warp on the loom", zh: "在织机上挂经线" },
  weave: { en: "Weaving", zh: "编织" },
  finish: { en: "Finishing the edges", zh: "收边" },
  cut: { en: "Cutting and shaping the silver", zh: "裁切银料并塑形" },
  stamp: { en: "Stamping the design", zh: "压印花纹" },
  set: { en: "Setting the turquoise", zh: "镶嵌绿松石" },
  solder: { en: "Soldering", zh: "焊接" },
  wires: { en: "Fitting the ear wires", zh: "装耳钩" },
  file: { en: "Filing and polishing", zh: "锉磨抛光" },
} satisfies Record<string, Text>;

function proc(...steps: [Text, number][]): ProcessStep[] {
  return steps.map(([step, hours]) => ({ step, hours }));
}

const DINE: CoreFields[] = [
  {
    id: "pc_01",
    title: { en: "Small grey, red and black wool weaving", zh: "灰红黑三色小幅羊毛编织" },
    makerId: "mkr_01",
    kind: "featured",
    hours: 26,
    materialsCents: 2200,
    priceCents: 18000,
    story: {
      en: "A small wool weaving in grey, red and black, with a stepped diamond at its center. About 30 by 40 cm, woven tight so it hangs flat.",
      zh: "一幅灰、红、黑三色的小幅羊毛编织，中央是一个阶梯菱形。约30×40厘米，织得紧密，挂起来平整服帖。",
    },
    heritage: WEAVING,
    process: proc([S.yarn, 4], [S.warp, 3], [S.weave, 17], [S.finish, 2]),
    image: "/images/pc_01.svg",
  },
  {
    id: "pc_02",
    title: { en: "Stamped silver earrings", zh: "压花银耳环" },
    makerId: "mkr_02",
    kind: "series",
    hours: 9,
    materialsCents: 800,
    priceCents: 6500,
    story: {
      en: "A pair of small silver ovals, each stamped with a ring of dots. Light enough to wear every day.",
      zh: "一对小巧的椭圆形银耳环，每只都压印着一圈圆点。分量很轻，适合天天佩戴。",
    },
    heritage: SILVER,
    process: proc([S.cut, 3], [S.stamp, 3], [S.wires, 1], [S.file, 2]),
    image: "/images/pc_02.svg",
  },
  {
    id: "pc_03",
    title: { en: "Brown, white and grey wool rug", zh: "棕白灰三色羊毛地毯" },
    makerId: "mkr_03",
    kind: "featured",
    hours: 160,
    materialsCents: 9500,
    priceCents: 120000,
    story: {
      en: "A rug in undyed brown, white and grey wool, with bands of small diamonds across it. About 75 by 120 cm.",
      zh: "一块用未经染色的棕、白、灰三色羊毛织成的地毯，横贯几道小菱形纹带。约75×120厘米。",
    },
    heritage: WEAVING,
    process: proc([S.spin, 30], [S.warp, 10], [S.weave, 112], [S.finish, 8]),
    image: "/images/pc_03.svg",
  },
  {
    id: "pc_04",
    title: { en: "Red, black and white wool rug with stepped diamonds", zh: "红黑白三色阶梯菱形羊毛地毯" },
    makerId: "mkr_01",
    kind: "featured",
    hours: 130,
    materialsCents: 8000,
    priceCents: 95000,
    story: {
      en: "Three stepped diamonds in red and black on a white ground. About 60 by 100 cm, with even, tight edges.",
      zh: "白色底上织着三个红黑两色的阶梯菱形。约60×100厘米，边缘匀整紧实。",
    },
    heritage: WEAVING,
    process: proc([S.yarn, 6], [S.dye, 10], [S.warp, 10], [S.weave, 98], [S.finish, 6]),
    image: "/images/pc_04.svg",
  },
  {
    id: "pc_05",
    title: { en: "Indigo and white striped wool weaving", zh: "靛蓝白条纹羊毛编织" },
    makerId: "mkr_02",
    kind: "featured",
    hours: 110,
    materialsCents: 7000,
    priceCents: 80000,
    story: {
      en: "Wide and narrow stripes in indigo blue and natural white. About 60 by 90 cm, for a wall or across a bench.",
      zh: "靛蓝与本白的宽窄条纹相间。约60×90厘米，可以挂在墙上，也可以搭在长凳上。",
    },
    heritage: WEAVING,
    process: proc([S.spin, 20], [S.dye, 12], [S.warp, 8], [S.weave, 64], [S.finish, 6]),
    image: "/images/pc_05.svg",
  },
  {
    id: "pc_06",
    title: { en: "Grey and white zigzag wool weaving", zh: "灰白锯齿纹羊毛编织" },
    makerId: "mkr_03",
    kind: "featured",
    hours: 60,
    materialsCents: 4500,
    priceCents: 45000,
    story: {
      en: "Grey and white bands that bend into zigzags across the weaving. About 45 by 60 cm.",
      zh: "灰白两色的纹带横穿整幅织物，折成一道道锯齿。约45×60厘米。",
    },
    heritage: WEAVING,
    process: proc([S.yarn, 4], [S.warp, 5], [S.weave, 47], [S.finish, 4]),
    image: "/images/pc_06.svg",
  },
  {
    id: "pc_07",
    title: { en: "Red and grey wool mini weaving", zh: "红灰双色迷你羊毛编织" },
    makerId: "mkr_02",
    kind: "series",
    hours: 6,
    materialsCents: 600,
    priceCents: 4800,
    story: {
      en: "A palm-sized weaving in red and grey, about 15 by 15 cm, for a shelf or a desk.",
      zh: "一幅巴掌大小的红灰双色编织，约15×15厘米，适合摆在书架或书桌上。",
    },
    heritage: WEAVING,
    process: proc([S.yarn, 1], [S.warp, 1], [S.weave, 3], [S.finish, 1]),
    image: "/images/pc_07.svg",
  },
  {
    id: "pc_08",
    title: { en: "Thin silver ring with stamped chevrons", zh: "压印人字纹细银戒" },
    makerId: "mkr_03",
    kind: "series",
    hours: 4,
    materialsCents: 500,
    priceCents: 3800,
    story: {
      en: "A narrow silver band stamped all the way around with small chevrons.",
      zh: "一枚细窄的银戒，整圈压印着小小的人字纹。",
    },
    heritage: SILVER,
    process: proc([S.cut, 1], [S.stamp, 1.5], [S.solder, 0.5], [S.file, 1]),
    image: "/images/pc_08.svg",
  },
  {
    id: "pc_09",
    title: { en: "Silver and turquoise pendant necklace", zh: "绿松石银吊坠项链" },
    makerId: "mkr_01",
    kind: "series",
    hours: 14,
    materialsCents: 1200,
    priceCents: 12000,
    story: {
      en: "One small oval of turquoise set in silver with a stamped border, on a silver chain.",
      zh: "一颗小小的椭圆形绿松石，镶在带压花边框的银托里，配一条银链。",
    },
    heritage: SILVER,
    process: proc([S.cut, 3], [S.stamp, 3], [S.set, 4], [S.file, 4]),
    image: "/images/pc_09.svg",
  },
  {
    id: "pc_10",
    title: { en: "Silver and turquoise drop earrings", zh: "绿松石银坠耳环" },
    makerId: "mkr_03",
    kind: "series",
    hours: 10,
    materialsCents: 900,
    priceCents: 8500,
    story: {
      en: "Each earring is a small turquoise stone in a plain silver setting, hanging from a short wire.",
      zh: "每只耳环是一颗嵌在素面银托里的小绿松石，挂在一段短短的耳钩下。",
    },
    heritage: SILVER,
    process: proc([S.cut, 2], [S.set, 4], [S.wires, 1], [S.file, 3]),
    image: "/images/pc_10.svg",
  },
  {
    id: "pc_11",
    title: { en: "Red and white wool weaving", zh: "红白双色羊毛编织" },
    makerId: "mkr_02",
    kind: "featured",
    hours: 24,
    materialsCents: 2100,
    priceCents: 17500,
    story: {
      en: "Red and white stripes with a band of red diamonds through the middle. About 30 by 40 cm.",
      zh: "红白相间的条纹，中间横贯一道红色菱形纹带。约30×40厘米。",
    },
    heritage: WEAVING,
    process: proc([S.yarn, 2], [S.dye, 3], [S.warp, 3], [S.weave, 14], [S.finish, 2]),
    image: "/images/pc_11.svg",
  },
  {
    id: "pc_12",
    title: { en: "Narrow stamped silver cuff bracelet", zh: "压花细银手镯" },
    makerId: "mkr_01",
    kind: "series",
    hours: 11,
    materialsCents: 1000,
    priceCents: 9500,
    story: {
      en: "A narrow silver cuff stamped with small dots and lines, to wear alone or with others.",
      zh: "一只细窄的开口银手镯，压印着小圆点和线条，可以单戴，也可以和别的手镯叠戴。",
    },
    heritage: SILVER,
    process: proc([S.cut, 3], [S.stamp, 4], [S.solder, 1], [S.file, 3]),
    image: "/images/pc_12.svg",
  },
];

function withV2Fields(p: CoreFields): Piece {
  const v2 = dineFields[p.id];
  if (!v2) throw new Error(`no v2 fields for ${p.id}`);
  return { ...p, ...v2 };
}

/** All 54 pieces, pc_01 to pc_54: the co-op's twelve first, then parts A and B. */
export const pieces: Piece[] = [...DINE.map(withV2Fields), ...partA, ...partB];

/** The scripted concierge answer for "a gift under $200 for my mom, she loves red wool", in this order. */
export const curatedSet: { pieceIds: string[]; reasons: Record<string, Text> } = {
  pieceIds: ["pc_01", "pc_07", "pc_11"],
  reasons: {
    pc_01: {
      en: "Red wool, under $200, woven by one maker over 26 hours.",
      zh: "红色羊毛，200美元以内，由一位匠人织了26小时。",
    },
    pc_07: {
      en: "A small red and grey weaving, well under $200.",
      zh: "红灰小幅编织，远低于200美元。",
    },
    pc_11: {
      en: "A red and white weaving like the first, under $200. 24 hours of weaving.",
      zh: "与第一件相似的红白编织，200美元以内。织了24小时。",
    },
  },
};
