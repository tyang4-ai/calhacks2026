// The four communities (data-model.md, Communities), in the contracts' order: com_dine, com_ojibwe,
// com_acoma, com_seminole. DEMO DATA: every community, its lead and its makers are fictional, and
// demo is true on all four. The crafts are real traditions, described only with the sourced safe
// craft facts in docs/plans/S3-catalog.md.
//
// - about stands in for words the community would write about itself. The Cindia team wrote it as
//   two plain third-person sentences (R4), and pages show it as a placeholder under L8, never as
//   the community's own words.
// - protocols are Cindia's demo exclusions, Cindia's choices for this demo and never a nation's own
//   rule or belief (R5). Pages show them under L9. They are the only Text fields in src/mock/ where
//   a kept-out word may appear.
// - verification says how a real launch would check makers, under the U.S. Indian Arts and Crafts
//   Act, and that no real check was done for this demo (R6). Cards show it as demo verification.
import type { Community, Text } from "../core/types";
import { studio } from "./people";

/** The pattern of every verification note (contracts section 2), with the nation's phrase. */
function verificationNote(nation: Text): Text {
  return {
    en: `In a real launch, makers would be enrolled members of ${nation.en} or certified by it as Indian artisans, as the U.S. Indian Arts and Crafts Act defines. Cindia would keep only a yes or no, never the record. No real check was done for this demo.`,
    zh: `正式上线时，匠人须是${nation.zh}的在册成员，或经其认证为印第安手工艺人，以美国《印第安艺术和手工艺品法》的定义为准。Cindia只保存“是”或“否”，从不保存记录本身。本演示没有做任何真实核查。`,
  };
}

/** Who would attest, by the Act, in a real launch. */
function verificationBy(nation: Text): Text {
  const en = nation.en.charAt(0).toUpperCase() + nation.en.slice(1);
  return {
    en: `${en}, under the U.S. Indian Arts and Crafts Act, in a real launch`,
    zh: `正式上线时由${nation.zh}依据美国《印第安艺术和手工艺品法》认证`,
  };
}

const NAVAJO_NATION: Text = { en: "the Navajo Nation", zh: "纳瓦霍（Diné）族" };
const OJIBWE_NATION: Text = { en: "an Ojibwe tribe or band", zh: "某个奥吉布瓦（Ojibwe）部落或族群" };
const ACOMA_NATION: Text = { en: "the Pueblo of Acoma", zh: "阿科马（Acoma）普韦布洛" };
const SEMINOLE_NATION: Text = { en: "the Seminole Tribe of Florida", zh: "佛罗里达州塞米诺尔（Seminole）部落" };

export const communities: Community[] = [
  {
    id: "com_dine",
    name: studio.name,
    kind: "native_american",
    people: { en: "Diné (Navajo)", zh: "纳瓦霍（Diné）" },
    place: { en: "Navajo Nation, Arizona, USA", zh: "美国亚利桑那州纳瓦霍保留区" },
    craft: { en: "Wool weavings, silver and turquoise jewelry", zh: "羊毛编织与绿松石银饰" },
    about: {
      en: "Diné (Navajo) weavers at the co-op weave wool on upright looms, and its smiths decorate silver with hand stamps and set turquoise in it. The co-op makes wall weavings, rugs, earrings, rings, pendant necklaces and cuff bracelets.",
      zh: "合作社的纳瓦霍（Diné）织工在立式织机上织羊毛，银匠用手工印模为银器压花，并在银饰上镶嵌绿松石。合作社制作壁挂编织、地毯、耳环、戒指、吊坠项链和手镯。",
    },
    protocols: [
      {
        en: "No ceremonial pieces or designs, such as Yei or sandpainting designs.",
        zh: "不收录仪式用品或仪式图案，例如Yei图案或沙画图案。",
      },
      {
        en: "No meanings for patterns. A pattern is described by its shapes and colors.",
        zh: "不解释图案的含义。图案只用形状和颜色来描述。",
      },
    ],
    verification: { method: "nation_attestation", by: verificationBy(NAVAJO_NATION), note: verificationNote(NAVAJO_NATION) },
    languages: ["en"],
    leadId: "own_01",
    makerIds: ["mkr_01", "mkr_02", "mkr_03"],
    studioId: "std_dine",
    storefrontId: "sto_01",
    projectIds: ["prj_01"],
    demo: true,
  },
  {
    id: "com_ojibwe",
    name: { en: "An Ojibwe beadwork co-op", zh: "一个奥吉布瓦（Ojibwe）串珠合作社" },
    kind: "native_american",
    people: { en: "Ojibwe", zh: "奥吉布瓦（Ojibwe）" },
    place: { en: "Minnesota, USA", zh: "美国明尼苏达州" },
    craft: { en: "Floral beadwork: earrings, pouches and necklaces", zh: "花卉串珠：耳环、小包和项链" },
    about: {
      en: "Ojibwe beadworkers at the co-op stitch glass seed beads onto cloth or leather, often in floral designs, and also weave beads on a loom. The co-op makes beaded earrings, pouches and necklaces.",
      zh: "合作社的奥吉布瓦（Ojibwe）串珠匠人把玻璃小珠缝在布或皮革上，常做成花卉图案，也在织机上编串珠。合作社制作串珠耳环、小包和项链。",
    },
    protocols: [
      { en: "No regalia, such as bandolier bags or dance aprons.", zh: "不收录典礼服饰，例如斜挎珠饰袋或舞蹈围裙。" },
      { en: "No pipe or tobacco bags.", zh: "不收录烟斗袋或烟草袋。" },
      { en: "No meanings for flowers or plants.", zh: "不解释花卉或植物的含义。" },
    ],
    verification: { method: "nation_attestation", by: verificationBy(OJIBWE_NATION), note: verificationNote(OJIBWE_NATION) },
    languages: ["en"],
    leadId: "own_02",
    makerIds: ["mkr_04", "mkr_05", "mkr_06", "mkr_07", "mkr_08"],
    storefrontId: "sto_02",
    projectIds: ["prj_02"],
    demo: true,
  },
  {
    id: "com_acoma",
    name: { en: "An Acoma pottery studio", zh: "一个阿科马（Acoma）陶艺坊" },
    kind: "native_american",
    people: { en: "Acoma Pueblo", zh: "阿科马（Acoma）" },
    place: { en: "New Mexico, USA", zh: "美国新墨西哥州" },
    craft: { en: "Coil-built, hand-painted pottery", zh: "手工盘筑、手绘的陶器" },
    about: {
      en: "Acoma potters at the studio coil their pots by hand with thin walls, cover them with a white slip, polish them with a smooth stone and paint them with a yucca brush. The studio makes jars, bowls and seed pots in black, orange and white.",
      zh: "陶艺坊的阿科马（Acoma）陶匠手工盘筑薄壁陶器，施白色泥浆，用光滑的石头打磨，再用yucca（丝兰）笔绘制。陶艺坊制作黑、橙、白三色的陶罐、陶碗和种子罐。",
    },
    protocols: [
      { en: "No ceremonial pottery or designs.", zh: "不收录仪式用陶器或仪式图案。" },
      { en: "No named designs and no meanings for designs.", zh: "不使用有名称的图案，也不解释图案的含义。" },
    ],
    verification: { method: "nation_attestation", by: verificationBy(ACOMA_NATION), note: verificationNote(ACOMA_NATION) },
    languages: ["en"],
    leadId: "own_03",
    makerIds: ["mkr_09", "mkr_10", "mkr_11", "mkr_12", "mkr_13"],
    storefrontId: "sto_03",
    projectIds: ["prj_03"],
    demo: true,
  },
  {
    id: "com_seminole",
    name: { en: "A Seminole patchwork co-op", zh: "一个塞米诺尔（Seminole）拼布合作社" },
    kind: "native_american",
    people: { en: "Seminole", zh: "塞米诺尔（Seminole）" },
    place: { en: "Florida, USA", zh: "美国佛罗里达州" },
    craft: { en: "Patchwork skirts and jackets", zh: "拼布裙和拼布夹克" },
    about: {
      en: "Seminole sewers at the co-op sew strips of cloth into long bands on sewing machines, then cut the bands and piece them back together in rows. The co-op makes patchwork skirts and jackets, including children's sizes.",
      zh: "合作社的塞米诺尔（Seminole）缝纫匠人用缝纫机把布条缝成长条，再裁开、重新拼成一排排花样。合作社制作拼布裙和拼布夹克，也有儿童尺码。",
    },
    protocols: [
      { en: "No named patchwork designs and no meanings for them.", zh: "不使用有名称的拼布图案，也不解释其含义。" },
      { en: "Nothing sold as a costume.", zh: "任何作品都不作为戏服出售。" },
    ],
    verification: { method: "nation_attestation", by: verificationBy(SEMINOLE_NATION), note: verificationNote(SEMINOLE_NATION) },
    languages: ["en"],
    leadId: "own_04",
    makerIds: ["mkr_14", "mkr_15", "mkr_16", "mkr_17"],
    storefrontId: "sto_04",
    projectIds: ["prj_04"],
    demo: true,
  },
];
