// PLACEHOLDER NAMES. Every person here is fictional, and so is every community. Gordon can swap
// any name in this one file. A real artisan's name goes in only with their OK (data-model.md,
// Units and rules).
//
// Owners and makers follow S3-catalog R9 (A2 R9 rewritten for the four nations): a common English
// given name and a family initial, with surnameChar the initial, different within a community.
// Never a full family name, a name in a Native language, or a name from the plan's sources.
// lang is "en", nativeName stays unset, and the Chinese name is the same romanized name.
//
// The studio std_dine sits here with its owner and makers, because the data-model file table gives
// the studio no file of its own.
import type { Person, Studio, Text } from "../core/types";

export const studio: Studio = {
  id: "std_dine",
  name: { en: "Diné Weaving and Silver Co-op", zh: "纳瓦霍（Diné）编织与银饰合作社" },
  craft: { en: "Wool weavings, silver and turquoise jewelry", zh: "羊毛编织与绿松石银饰" },
  city: { en: "Navajo Nation, Arizona", zh: "亚利桑那州纳瓦霍保留区" },
  ownerId: "own_01",
  makerIds: ["mkr_01", "mkr_02", "mkr_03"],
  payoutLimitCents: 50000,
};

/** The co-op's manager (role owner), Ruth B. */
export const owner: Person = {
  id: "own_01",
  role: "owner",
  name: { en: "Ruth B.", zh: "Ruth B." },
  surnameChar: "B",
  lang: "en",
  communityId: "com_dine",
};

// Receipt notes (A1 top change 7): two plain lines in the maker's own voice for the buyer's paid
// receipt, joined by a line break. DEMO DATA: placeholders the Cindia team wrote, which Gordon may
// rewrite, and never a real maker's words. No meaning, lineage or hardship. The date is the day the
// makers are paid, makerPayoutDate in month.ts (Oct 2), which the data tests check.
const PAID = { en: "My share of your purchase reached me on Oct 2.", zh: "您这笔购买中我的那份已在10月2日到账。" };
function note(thanks: Text): Text {
  return { en: `${thanks.en}\n${PAID.en}`, zh: `${thanks.zh}\n${PAID.zh}` };
}

/** The co-op's three makers, mkr_01 to mkr_03. */
export const makers: Person[] = [
  {
    id: "mkr_01",
    role: "maker",
    name: { en: "Grace N.", zh: "Grace N." },
    surnameChar: "N",
    lang: "en",
    communityId: "com_dine",
    receiptNote: note({ en: "Thank you for choosing my weaving.", zh: "谢谢您选择我的编织作品。" }),
  },
  {
    id: "mkr_02",
    role: "maker",
    name: { en: "Lena T.", zh: "Lena T." },
    surnameChar: "T",
    lang: "en",
    communityId: "com_dine",
    receiptNote: note({ en: "Thank you for choosing a piece I made.", zh: "谢谢您选择我做的作品。" }),
  },
  {
    id: "mkr_03",
    role: "maker",
    name: { en: "Mae K.", zh: "Mae K." },
    surnameChar: "K",
    lang: "en",
    communityId: "com_dine",
    receiptNote: note({ en: "Thank you for buying my work.", zh: "谢谢您购买我的作品。" }),
  },
];

/** [id, name, communityId] for the other three communities' leads and makers (R9's table). */
const OTHERS: [string, string, string][] = [
  ["own_02", "Diane W.", "com_ojibwe"],
  ["own_03", "Carol S.", "com_acoma"],
  ["own_04", "Teresa L.", "com_seminole"],
  ["mkr_04", "Sarah P.", "com_ojibwe"],
  ["mkr_05", "Karen J.", "com_ojibwe"],
  ["mkr_06", "Linda H.", "com_ojibwe"],
  ["mkr_07", "Amy R.", "com_ojibwe"],
  ["mkr_08", "Joyce F.", "com_ojibwe"],
  ["mkr_09", "Helen A.", "com_acoma"],
  ["mkr_10", "Nora G.", "com_acoma"],
  ["mkr_11", "Patricia D.", "com_acoma"],
  ["mkr_12", "Julie M.", "com_acoma"],
  ["mkr_13", "Ann E.", "com_acoma"],
  ["mkr_14", "Brenda C.", "com_seminole"],
  ["mkr_15", "Laura W.", "com_seminole"],
  ["mkr_16", "Donna H.", "com_seminole"],
  ["mkr_17", "Rita P.", "com_seminole"],
];

const others: Person[] = OTHERS.map(([id, name, communityId]) => ({
  id,
  role: id.startsWith("own_") ? "owner" : "maker",
  name: { en: name, zh: name },
  surnameChar: name.split(" ")[1].charAt(0),
  lang: "en",
  communityId,
  languages: ["en"],
}));

/** The four communities' leads, own_01 to own_04. own_01 is the co-op's manager, Ruth B. */
export const leads: Person[] = [owner, ...others.filter((p) => p.role === "owner")];

/** Every maker, mkr_01 to mkr_17. makers stays the co-op's three. */
export const allMakers: Person[] = [...makers, ...others.filter((p) => p.role === "maker")];

/** receiptNotes[makerId] is that maker's receipt note, for M-buyer. Built from the makers above. */
export const receiptNotes: Record<string, Text> = Object.fromEntries(
  allMakers.flatMap((m) => (m.receiptNote ? [[m.id, m.receiptNote] as const] : [])),
);

const BUYER_NAMES: string[] = [
  "Avery Wrenfield",
  "Jordan Ellis",
  "Morgan Reyes",
  "Casey Nguyen",
  "Riley Patel",
  "Taylor Kim",
  "Quinn Foster",
  "Harper Lewis",
  "Rowan Diaz",
  "Emerson Wright",
  "Sage Thompson",
  "Parker Hayes",
  "Dakota Silva",
  "Reese Morgan",
  "Finley Carter",
  "Skyler Ortiz",
  "Hayden Price",
  "Blake Sullivan",
  "Cameron Ward",
  "Logan Bennett",
];

/** buy_01 to buy_20. Buyers read in English, so their zh name is the same romanized name. */
export const buyers: Person[] = BUYER_NAMES.map((n, i) => ({
  id: `buy_${String(i + 1).padStart(2, "0")}`,
  role: "buyer",
  name: { en: n, zh: n },
  surnameChar: n.split(" ")[1].charAt(0),
  lang: "en",
}));

/** Everyone: the four leads, the seventeen makers and the twenty buyers. */
export const people: Person[] = [...leads, ...allMakers, ...buyers];
