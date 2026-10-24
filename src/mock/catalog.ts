// The twelve pieces, exactly as the catalog table in data-model.md gives them, and curatedSet,
// the scripted concierge answer. Stories describe the craft plainly and never claim a real person
// made the piece. Images are the placeholders S1 put under public/images/ until Gordon has photos.
import type { Piece, ProcessStep, Text } from "../core/types";

const HERITAGE_BASE: Text = {
  en: "Gu embroidery began in Songjiang, Shanghai, in the late Ming dynasty, and has been on China's national intangible cultural heritage list since 2006.",
  zh: "顾绣起源于明代晚期的上海松江，2006年列入第一批国家级非物质文化遗产名录。",
};

function heritage(extra: Text): Text {
  return { en: `${HERITAGE_BASE.en} ${extra.en}`, zh: `${HERITAGE_BASE.zh}${extra.zh}` };
}

const S = {
  design: { en: "Drawing the design onto silk", zh: "在绢上勾稿" },
  paint: { en: "Painting the base colors", zh: "敷底色" },
  split: { en: "Splitting and dyeing the silk thread", zh: "劈丝染线" },
  stitch: { en: "Stitching", zh: "刺绣" },
  shade: { en: "Blending the shaded stitches", zh: "施针晕色" },
  fanMount: { en: "Mounting on the fan frame", zh: "上扇框装裱" },
  scrollMount: { en: "Mounting as a scroll", zh: "装裱成轴" },
  panelMount: { en: "Stretching and framing", zh: "绷框装裱" },
  sew: { en: "Sewing up and finishing", zh: "缝合收尾" },
} satisfies Record<string, Text>;

function proc(...steps: [Text, number][]): ProcessStep[] {
  return steps.map(([step, hours]) => ({ step, hours }));
}

export const pieces: Piece[] = [
  {
    id: "pc_01",
    title: { en: "Peony fan", zh: "牡丹团扇" },
    makerId: "mkr_01",
    kind: "featured",
    hours: 26,
    materialsCents: 2200,
    priceCents: 18000,
    story: {
      en: "A round silk fan with a single peony in full bloom. The petals are built up from hair-fine split thread, so the pink deepens toward the heart of the flower the way paint would.",
      zh: "一柄圆形绢面团扇，绣一朵盛开的牡丹。花瓣用细如发丝的劈丝层层绣出，粉色向花心渐深，宛如设色。",
    },
    heritage: heritage({ en: "Peonies stand for wealth and honor.", zh: "牡丹寓意富贵。" }),
    process: proc([S.design, 3], [S.split, 4], [S.stitch, 12], [S.shade, 5], [S.fanMount, 2]),
    image: "/images/pc_01.svg",
  },
  {
    id: "pc_02",
    title: { en: "Plum blossom bookmarks", zh: "梅花书签" },
    makerId: "mkr_02",
    kind: "series",
    hours: 9,
    materialsCents: 800,
    priceCents: 6500,
    story: {
      en: "A set of silk bookmarks, each with a branch of winter plum. Small enough to stitch in a few sittings, with the same split-thread shading as the large pieces.",
      zh: "一套绢面书签，每枚绣一枝寒梅。尺幅虽小，用的仍是大件作品的劈丝晕色。",
    },
    heritage: heritage({ en: "Plum blossom opens in the cold and stands for resilience.", zh: "梅花凌寒而开，象征坚韧。" }),
    process: proc([S.design, 1], [S.split, 2], [S.stitch, 5], [S.sew, 1]),
    image: "/images/pc_02.svg",
  },
  {
    id: "pc_03",
    title: { en: "Koi pond panel", zh: "锦鲤图" },
    makerId: "mkr_03",
    kind: "featured",
    hours: 160,
    materialsCents: 9500,
    priceCents: 120000,
    story: {
      en: "Three koi turning under lotus leaves. Gu embroidery is half painting and half stitching: the water is a painted wash, and the fish are stitched over it scale by scale.",
      zh: "三尾锦鲤在荷叶下回游。顾绣半绣半绘：水面以淡彩渲染，鱼身在其上逐片绣出鳞片。",
    },
    heritage: heritage({ en: "Koi stand for abundance, year after year.", zh: "锦鲤寓意年年有余。" }),
    process: proc([S.design, 12], [S.paint, 18], [S.split, 20], [S.stitch, 80], [S.shade, 24], [S.panelMount, 6]),
    image: "/images/pc_03.svg",
  },
  {
    id: "pc_04",
    title: { en: "Lotus at dawn", zh: "晨荷图" },
    makerId: "mkr_01",
    kind: "featured",
    hours: 130,
    materialsCents: 8000,
    priceCents: 95000,
    story: {
      en: "A lotus opening in early light, after the style of the old Gu studio's copies of Song dynasty paintings. The mist is left as bare silk.",
      zh: "清晨初开的荷花，仿顾绣绣宋画的旧法。晨雾处留出素绢，不着一针。",
    },
    heritage: heritage({ en: "The Gu family studio was known for stitching famous paintings.", zh: "顾氏绣坊以绣名画著称。" }),
    process: proc([S.design, 10], [S.paint, 14], [S.split, 16], [S.stitch, 64], [S.shade, 20], [S.panelMount, 6]),
    image: "/images/pc_04.svg",
  },
  {
    id: "pc_05",
    title: { en: "Orchid scroll", zh: "兰花轴" },
    makerId: "mkr_02",
    kind: "featured",
    hours: 110,
    materialsCents: 7000,
    priceCents: 80000,
    story: {
      en: "A hanging scroll of wild orchids on a rock. The long leaves are single unbroken runs of stitching, which is the hardest part to get right.",
      zh: "一幅兰石立轴。修长的兰叶各以一气呵成的长针绣成，这是最难的地方。",
    },
    heritage: heritage({ en: "The orchid is one of the four gentlemen of Chinese painting.", zh: "兰为“四君子”之一。" }),
    process: proc([S.design, 8], [S.paint, 10], [S.split, 14], [S.stitch, 56], [S.shade, 16], [S.scrollMount, 6]),
    image: "/images/pc_05.svg",
  },
  {
    id: "pc_06",
    title: { en: "Sparrow on bamboo", zh: "竹雀图" },
    makerId: "mkr_03",
    kind: "featured",
    hours: 60,
    materialsCents: 4500,
    priceCents: 45000,
    story: {
      en: "A sparrow resting on a bamboo stem. The feathers use short, overlapping stitches in a dozen browns.",
      zh: "一只麻雀栖于竹枝。羽毛以十余种褐色短针层层叠绣。",
    },
    heritage: heritage({ en: "Bamboo bends without breaking.", zh: "竹子宁折不弯，象征气节。" }),
    process: proc([S.design, 5], [S.paint, 6], [S.split, 8], [S.stitch, 30], [S.shade, 8], [S.panelMount, 3]),
    image: "/images/pc_06.svg",
  },
  {
    id: "pc_07",
    title: { en: "Peony sachet", zh: "牡丹香囊" },
    makerId: "mkr_02",
    kind: "series",
    hours: 6,
    materialsCents: 600,
    priceCents: 4800,
    story: {
      en: "A small silk sachet with a peony on one side, filled with dried osmanthus. A traditional gift to carry or hang.",
      zh: "一只小巧的绢面香囊，一面绣牡丹，内装干桂花。是可佩可挂的传统礼物。",
    },
    heritage: heritage({ en: "Embroidered sachets were given as tokens of care.", zh: "绣香囊自古是表达心意的信物。" }),
    process: proc([S.design, 1], [S.split, 1], [S.stitch, 3], [S.sew, 1]),
    image: "/images/pc_07.svg",
  },
  {
    id: "pc_08",
    title: { en: "Silk coasters", zh: "丝绣杯垫" },
    makerId: "mkr_03",
    kind: "series",
    hours: 4,
    materialsCents: 500,
    priceCents: 3800,
    story: {
      en: "A pair of coasters, each with a small ripple pattern in blue and silver thread, backed with cotton so they can be used every day.",
      zh: "一对杯垫，以蓝银两色丝线绣水波纹，背衬棉布，可日常使用。",
    },
    heritage: heritage({ en: "Everyday pieces keep the stitches in daily use.", zh: "日用小件让针法走进日常。" }),
    process: proc([S.design, 0.5], [S.split, 0.5], [S.stitch, 2], [S.sew, 1]),
    image: "/images/pc_08.svg",
  },
  {
    id: "pc_09",
    title: { en: "Crane brooch", zh: "仙鹤胸针" },
    makerId: "mkr_01",
    kind: "series",
    hours: 14,
    materialsCents: 1200,
    priceCents: 12000,
    story: {
      en: "A red-crowned crane in flight, stitched on silk and set in a brass frame to wear as a brooch.",
      zh: "一只飞翔的丹顶鹤，绣于绢上，嵌入黄铜框，可作胸针佩戴。",
    },
    heritage: heritage({ en: "The crane stands for long life.", zh: "仙鹤寓意长寿。" }),
    process: proc([S.design, 2], [S.split, 2], [S.stitch, 7], [S.shade, 2], [S.sew, 1]),
    image: "/images/pc_09.svg",
  },
  {
    id: "pc_10",
    title: { en: "Cloud pouch", zh: "祥云荷包" },
    makerId: "mkr_03",
    kind: "series",
    hours: 10,
    materialsCents: 900,
    priceCents: 8500,
    story: {
      en: "A drawstring pouch with auspicious clouds worked in gold and indigo thread.",
      zh: "一只抽绳荷包，以金线与靛蓝丝线绣祥云纹。",
    },
    heritage: heritage({ en: "Auspicious clouds wish the carrier good fortune.", zh: "祥云纹寓意吉祥如意。" }),
    process: proc([S.design, 1], [S.split, 2], [S.stitch, 5], [S.sew, 2]),
    image: "/images/pc_10.svg",
  },
  {
    id: "pc_11",
    title: { en: "Chrysanthemum fan", zh: "菊花团扇" },
    makerId: "mkr_02",
    kind: "featured",
    hours: 24,
    materialsCents: 2100,
    priceCents: 17500,
    story: {
      en: "A round fan with autumn chrysanthemums. Each curled petal is a separate run of thread, shaded from gold to cream.",
      zh: "一柄团扇，绣秋日菊花。每片卷曲的花瓣单独起针，由金黄晕至米白。",
    },
    heritage: heritage({ en: "Chrysanthemums bloom late and stand for long life.", zh: "菊花傲霜晚开，寓意长寿。" }),
    process: proc([S.design, 3], [S.split, 4], [S.stitch, 11], [S.shade, 4], [S.fanMount, 2]),
    image: "/images/pc_11.svg",
  },
  {
    id: "pc_12",
    title: { en: "Phoenix needle case", zh: "凤凰针盒" },
    makerId: "mkr_01",
    kind: "series",
    hours: 11,
    materialsCents: 1000,
    priceCents: 9500,
    story: {
      en: "A small hard-sided case for needles, its lid stitched with a phoenix tail in five colors.",
      zh: "一只硬面针盒，盒盖绣五彩凤尾。",
    },
    heritage: heritage({ en: "The phoenix stands for good omens.", zh: "凤凰寓意祥瑞。" }),
    process: proc([S.design, 1], [S.split, 2], [S.stitch, 6], [S.sew, 2]),
    image: "/images/pc_12.svg",
  },
];

/** The scripted concierge answer for "a gift under $200 for my mom, she loves peonies", in this order. */
export const curatedSet: { pieceIds: string[]; reasons: Record<string, Text> } = {
  pieceIds: ["pc_01", "pc_07", "pc_11"],
  reasons: {
    pc_01: {
      en: "Peonies, under $200, and a gift she can use. One maker stitched it over 26 hours.",
      zh: "牡丹图案，200美元以内，实用的礼物。一位匠人用26小时绣成。",
    },
    pc_07: {
      en: "A peony gift well under $200. Filled with dried osmanthus, to carry or hang.",
      zh: "牡丹小礼物，远低于200美元。内装干桂花，可佩可挂。",
    },
    pc_11: {
      en: "A fan like the peony one, under $200, with autumn chrysanthemums. 24 hours of stitching.",
      zh: "与牡丹团扇同款，200美元以内，绣秋菊。耗时24小时。",
    },
  },
};
