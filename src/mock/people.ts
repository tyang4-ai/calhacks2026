// PLACEHOLDER NAMES. Every person here is fictional, and so is the co-op. Gordon can swap any name
// in this one file. A real artisan's name goes in only with their OK (data-model.md, Units and rules).
//
// The Native American co-op's manager and makers follow A2 R9 (docs/v2/reviews/A2-culture-trust.md):
// a common English given name and a family initial, with surnameChar the initial. Never a full
// family name or a name in an Indigenous language. Their Chinese name is the same romanized name.
//
// The studio std_dine sits here with its owner and makers, because the data-model file table gives
// the studio no file of its own.
import type { Person, Studio } from "../core/types";

export const studio: Studio = {
  id: "std_dine",
  name: { en: "Diné Weaving and Silver Co-op", zh: "纳瓦霍（Diné）编织与银饰合作社" },
  craft: { en: "Wool weavings, silver and turquoise jewelry", zh: "羊毛编织与绿松石银饰" },
  city: { en: "Navajo Nation, Arizona", zh: "亚利桑那州纳瓦霍保留区" },
  ownerId: "own_01",
  makerIds: ["mkr_01", "mkr_02", "mkr_03"],
  payoutLimitCents: 50000,
};

export const owner: Person = {
  id: "own_01",
  role: "owner",
  name: { en: "Ruth B.", zh: "Ruth B." },
  surnameChar: "B",
  lang: "en",
};

export const makers: Person[] = [
  { id: "mkr_01", role: "maker", name: { en: "Grace N.", zh: "Grace N." }, surnameChar: "N", lang: "en" },
  { id: "mkr_02", role: "maker", name: { en: "Lena T.", zh: "Lena T." }, surnameChar: "T", lang: "en" },
  { id: "mkr_03", role: "maker", name: { en: "Mae K.", zh: "Mae K." }, surnameChar: "K", lang: "en" },
];

const BUYER_NAMES: string[] = [
  "Avery Brooks",
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

/** Everyone: the co-op's manager (role owner), the three makers and the twenty buyers. */
export const people: Person[] = [owner, ...makers, ...buyers];
