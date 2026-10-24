// PLACEHOLDER NAMES. Every person here is fictional. Gordon can swap any name in this one file.
// A real artisan's name goes in only with their OK (data-model.md, Units and rules).
//
// The studio std_gu sits here with its owner and makers, because the data-model file table gives
// the studio no file of its own.
import type { Person, Studio } from "../core/types";

export const studio: Studio = {
  id: "std_gu",
  name: { en: "Gu Embroidery Studio", zh: "顾绣工作室" },
  craft: { en: "Gu embroidery", zh: "顾绣" },
  city: { en: "Shanghai", zh: "上海" },
  ownerId: "own_01",
  makerIds: ["mkr_01", "mkr_02", "mkr_03"],
  payoutLimitCents: 50000,
};

export const owner: Person = {
  id: "own_01",
  role: "owner",
  name: { en: "Shen Ruolan", zh: "沈若兰" },
  surnameChar: "沈",
  lang: "zh",
};

export const makers: Person[] = [
  { id: "mkr_01", role: "maker", name: { en: "Lu Yun", zh: "陆芸" }, surnameChar: "陆", lang: "zh" },
  { id: "mkr_02", role: "maker", name: { en: "Han Jing", zh: "韩静" }, surnameChar: "韩", lang: "zh" },
  { id: "mkr_03", role: "maker", name: { en: "Zhou Mei", zh: "周梅" }, surnameChar: "周", lang: "zh" },
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

/** Everyone: the owner, the three makers and the twenty buyers. */
export const people: Person[] = [owner, ...makers, ...buyers];
