// The one list the data tests, B11, B14 and B15 check text against: A2 R28
// (docs/v2/reviews/A2-culture-trust.md), as contracts section 11 and data-model.md "Content rules"
// give its fields. S3-catalog R1 to R28 decide every word in src/mock/, and this list is how code
// checks them.
//
// - bannedObjects: the "Kept out of the catalog" list (data-model.md, Communities), plus S3 R16's
//   materials and R17's objects, and the named forms R14 keeps out. They appear only in a
//   community's protocols and here. English entries are lowercase singulars, matched as whole
//   words with an optional plural. Chinese entries are matched as substrings.
// - stereotypeWords, meaningWords and accusingWords are the contracts' lists, word for word.
// - peopleNames: each nation's names in English and Chinese by community ID, and under "general"
//   the words that name no one nation. No title, facet, vibe word or alias holds one (R10).
// - allowedHosts: example.com and example.org. Relative /market/ paths, the sandbox market's pages,
//   are allowed besides these hosts.

export interface ContentRules {
  /** The kept-out list. These words appear only in a community's protocols and here. */
  bannedObjects: string[];
  stereotypeWords: string[];
  meaningWords: string[];
  /** English and Chinese. */
  accusingWords: string[];
  /** Each nation's names in English and Chinese, by community ID, and the general terms under "general". */
  peopleNames: Record<string, string[]>;
  allowedHosts: string[];
}

export const contentRules: ContentRules = {
  bannedObjects: [
    // Designs and figures kept out
    "yei",
    "yeibichai",
    "sandpainting",
    "sand painting",
    "whirling log",
    "whirling-log",
    "katsina",
    "kachina",
    "naja",
    "squash blossom",
    // Sacred, ceremonial and medicine objects
    "sacred",
    "ceremonial",
    "ceremony",
    "prayer",
    "medicine",
    "pipe",
    "tobacco bag",
    "mask",
    "drum",
    "rattle",
    "dreamcatcher",
    "dream catcher",
    "totem",
    // Regalia and costumes
    "headdress",
    "regalia",
    "bandolier bag",
    "dance apron",
    "jingle dress",
    "bow guard",
    "costume",
    // Materials kept out (R16)
    "feather",
    "eagle",
    "ivory",
    "bone",
    "whalebone",
    "baleen",
    "sealskin",
    "fur",
    "shell",
    "quill",
    // Chinese
    "沙画",
    "克奇纳",
    "卡奇纳",
    "神圣",
    "仪式",
    "祭祀",
    "药包",
    "烟斗",
    "烟草袋",
    "面具",
    "手鼓",
    "摇铃",
    "捕梦网",
    "图腾",
    "头饰",
    "典礼服饰",
    "斜挎珠饰袋",
    "舞蹈围裙",
    "叮当裙",
    "护臂",
    "戏服",
    "羽毛",
    "鹰羽",
    "象牙",
    "鲸骨",
    "鲸须",
    "海豹皮",
    "毛皮",
    "皮草",
    "贝壳",
    "豪猪刺",
  ],
  stereotypeWords: [
    "exotic",
    "tribal",
    "primitive",
    "ethnic",
    "mystical",
    "spiritual",
    "shamanic",
    "sacred",
    "ceremonial",
    "spirit",
    "totem",
    "boho",
    "native-inspired",
    "authentic",
    "ancient",
    "timeless",
    "warrior",
    "princess",
    "chief",
    "powwow",
    "smudge",
    "healing",
    "energy",
    "Aztec",
    "Inca",
  ],
  meaningWords: ["symbolizes", "represents", "protects", "brings luck", "象征", "寓意"],
  accusingWords: [
    "fraud",
    "scam",
    "illegal",
    "fake",
    "counterfeit",
    "knockoff",
    "copy",
    "stolen",
    "infringe",
    "violate",
    "假冒",
    "仿冒",
    "冒充",
    "山寨",
    "盗版",
    "侵权",
    "欺诈",
    "违法",
  ],
  peopleNames: {
    com_dine: ["Diné", "Navajo", "纳瓦霍"],
    com_ojibwe: ["Ojibwe", "Ojibwa", "Chippewa", "Anishinaabe", "奥吉布瓦"],
    com_acoma: ["Acoma", "Pueblo", "阿科马"],
    com_seminole: ["Seminole", "塞米诺尔"],
    general: ["Native American", "Indigenous", "Native", "Indian", "美洲原住民", "原住民", "土著"],
  },
  allowedHosts: ["example.com", "example.org"],
};
