// S3-catalog T2: the four communities, the people, the receipt notes and the content rules, checked
// against data-model.md's Communities table and the plan's content rules R1 to R9 and R28.
import { describe, expect, it } from "vitest";
import {
  allMakers,
  buyers,
  communities,
  contentRules,
  getById,
  leads,
  makerPayoutDate,
  makers,
  owner,
  people,
  receiptNotes,
  studio,
} from "../../src/mock/index";
import type { Community, Person } from "../../src/core/types";
import { shortDate } from "../../src/mock/util";
import { isText, scan, strings, wordHits } from "./v2-helpers";

// data-model.md, Communities: [id, lead, makers, storefront, project].
const TABLE: [string, string, string[], string, string][] = [
  ["com_dine", "own_01", ["mkr_01", "mkr_02", "mkr_03"], "sto_01", "prj_01"],
  ["com_ojibwe", "own_02", ["mkr_04", "mkr_05", "mkr_06", "mkr_07", "mkr_08"], "sto_02", "prj_02"],
  ["com_acoma", "own_03", ["mkr_09", "mkr_10", "mkr_11", "mkr_12", "mkr_13"], "sto_03", "prj_03"],
  ["com_seminole", "own_04", ["mkr_14", "mkr_15", "mkr_16", "mkr_17"], "sto_04", "prj_04"],
];

// S3-catalog R9: the leads' and makers' names, in ID order.
const R9: Record<string, string> = {
  own_01: "Ruth B.",
  mkr_01: "Grace N.",
  mkr_02: "Lena T.",
  mkr_03: "Mae K.",
  own_02: "Diane W.",
  mkr_04: "Sarah P.",
  mkr_05: "Karen J.",
  mkr_06: "Linda H.",
  mkr_07: "Amy R.",
  mkr_08: "Joyce F.",
  own_03: "Carol S.",
  mkr_09: "Helen A.",
  mkr_10: "Nora G.",
  mkr_11: "Patricia D.",
  mkr_12: "Julie M.",
  mkr_13: "Ann E.",
  own_04: "Teresa L.",
  mkr_14: "Brenda C.",
  mkr_15: "Laura W.",
  mkr_16: "Donna H.",
  mkr_17: "Rita P.",
};

// The nation in each verification note (R6), and R1's words for the people.
const NATION: Record<string, string> = {
  com_dine: "the Navajo Nation",
  com_ojibwe: "an Ojibwe tribe or band",
  com_acoma: "the Pueblo of Acoma",
  com_seminole: "the Seminole Tribe of Florida",
};
const PEOPLE: Record<string, [string, string]> = {
  com_dine: ["Diné (Navajo)", "纳瓦霍（Diné）"],
  com_ojibwe: ["Ojibwe", "奥吉布瓦（Ojibwe）"],
  com_acoma: ["Acoma Pueblo", "阿科马（Acoma）"],
  com_seminole: ["Seminole", "塞米诺尔（Seminole）"],
};
const PLACE: Record<string, string> = {
  com_dine: "Navajo Nation, Arizona, USA",
  com_ojibwe: "Minnesota, USA",
  com_acoma: "New Mexico, USA",
  com_seminole: "Florida, USA",
};

// R4: words an about never uses.
const ABOUT_BANNED = ["we", "our", "us", "ancestors", "ancestral", "elders", "for generations", "ancient", "timeless", "spirit", "poverty", "hardship", "struggle", "dying", "我们", "祖先", "长老", "世代", "古老"];

const pad = (n: number) => String(n).padStart(2, "0");
const community = (id: string) => getById<Community>(id) as Community;
const person = (id: string) => getById<Person>(id) as Person;

describe("communities", () => {
  it("are the four of the contracts' table, in order, all native_american and demo", () => {
    expect(communities.map((c) => [c.id, c.leadId, c.makerIds, c.storefrontId, c.projectIds[0]])).toEqual(TABLE);
    for (const c of communities) {
      expect(c.kind, c.id).toBe("native_american");
      expect(c.demo, c.id).toBe(true);
      expect(c.projectIds, c.id).toHaveLength(1);
      expect(c.languages, c.id).toEqual(["en"]);
      expect(community(c.id), c.id).toBe(c);
    }
    expect(communities.filter((c) => c.studioId).map((c) => [c.id, c.studioId])).toEqual([["com_dine", "std_dine"]]);
  });

  it("follow R1 to R3: the nation's words, a region for a place, and a describing name", () => {
    for (const c of communities) {
      expect([c.people.en, c.people.zh], c.id).toEqual(PEOPLE[c.id]);
      expect(c.place.en, c.id).toBe(PLACE[c.id]);
    }
    expect(community("com_dine").name).toEqual(studio.name);
    expect(community("com_dine").place.zh).toBe("美国亚利桑那州纳瓦霍保留区");
    expect(communities.slice(1).map((c) => [c.name.en, c.name.zh])).toEqual([
      ["An Ojibwe beadwork co-op", "一个奥吉布瓦（Ojibwe）串珠合作社"],
      ["An Acoma pottery studio", "一个阿科马（Acoma）陶艺坊"],
      ["A Seminole patchwork co-op", "一个塞米诺尔（Seminole）拼布合作社"],
    ]);
    expect(communities.map((c) => c.craft.en)).toEqual([
      "Wool weavings, silver and turquoise jewelry",
      "Floral beadwork: earrings, pouches and necklaces",
      "Coil-built, hand-painted pottery",
      "Patchwork skirts and jackets",
    ]);
    const all = strings(communities, "communities").map(([, s]) => s);
    // R1: never "Indian American", "tribe" as a product word, or "Pueblo pottery".
    expect(all.filter((s) => /Indian American|Pueblo pottery|tribal/i.test(s))).toEqual([]);
    // R20: Diné keeps its mark in every Text.
    expect(all.filter((s) => /\bDine\b/.test(s))).toEqual([]);
  });

  it("every lead, maker and studio resolves, and each community's makers are R9's and name it", () => {
    for (const c of communities) {
      const lead = person(c.leadId);
      expect(lead, c.leadId).toMatchObject({ role: "owner", communityId: c.id, name: { en: R9[c.leadId] } });
      for (const id of c.makerIds) expect(person(id), id).toMatchObject({ role: "maker", communityId: c.id, name: { en: R9[id] } });
      expect(allMakers.filter((m) => m.communityId === c.id).map((m) => m.id)).toEqual(c.makerIds);
    }
    for (const c of communities) {
      expect(getById(c.storefrontId), c.storefrontId).toMatchObject({ id: c.storefrontId, communityId: c.id });
      for (const id of c.projectIds) expect(getById(id), id).toMatchObject({ id, communityId: c.id });
    }
    expect(getById(community("com_dine").studioId as string)).toBe(studio);
    expect(studio.makerIds).toEqual(community("com_dine").makerIds);
    expect(studio.ownerId).toBe(community("com_dine").leadId);
  });

  it("every verification note follows the contracts' pattern and ends that no real check was done", () => {
    for (const c of communities) {
      expect(c.verification.method, c.id).toBe("nation_attestation");
      expect(c.verification.note.en, c.id).toBe(
        `In a real launch, makers would be enrolled members of ${NATION[c.id]} or certified by it as Indian artisans, as the U.S. Indian Arts and Crafts Act defines. Cindia would keep only a yes or no, never the record. No real check was done for this demo.`,
      );
      expect(c.verification.note.en.endsWith("No real check was done for this demo."), c.id).toBe(true);
      expect(c.verification.note.zh.endsWith("本演示没有做任何真实核查。"), c.id).toBe(true);
      expect(c.verification.by.en.toLowerCase(), c.id).toBe(`${NATION[c.id]}, under the U.S. Indian Arts and Crafts Act, in a real launch`.toLowerCase());
      expect(strings(c.verification, c.id).filter(([, s]) => /tribal enrollment/i.test(s))).toEqual([]);
    }
  });

  it("no about uses a word R4 bans, and no Text outside protocols holds a kept-out word", () => {
    for (const c of communities) {
      for (const s of [c.about.en, c.about.zh]) expect(wordHits(s, ABOUT_BANNED), c.id).toEqual([]);
      // Two plain sentences in each language.
      expect(c.about.en.split(/(?<=\.)\s+/).length, c.id).toBe(2);
      expect(c.about.zh.split("。").filter(Boolean).length, c.id).toBe(2);
      expect(c.protocols.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.protocols.every(isText), c.id).toBe(true);
    }
    const outside = communities.map(({ protocols: _p, ...c }) => c);
    const words = [...contentRules.bannedObjects, ...contentRules.stereotypeWords, ...contentRules.meaningWords];
    expect(scan(outside, "communities", words)).toEqual([]);
    expect(scan(people, "people", words)).toEqual([]);
    // The protocols are where the kept-out words live, so the scan really reads them.
    expect(scan(communities.map((c) => c.protocols), "protocols", contentRules.bannedObjects).length).toBeGreaterThan(0);
  });
});

describe("people", () => {
  it("hold the four leads, the seventeen makers and the twenty buyers, each once", () => {
    expect(leads.map((p) => p.id)).toEqual(["own_01", "own_02", "own_03", "own_04"]);
    expect(allMakers.map((p) => p.id)).toEqual(Array.from({ length: 17 }, (_, i) => `mkr_${pad(i + 1)}`));
    expect(makers.map((p) => p.id)).toEqual(["mkr_01", "mkr_02", "mkr_03"]);
    expect(leads[0]).toBe(owner);
    expect(people.map((p) => p.id)).toEqual([...leads, ...allMakers, ...buyers].map((p) => p.id));
    expect(new Set(people.map((p) => p.id)).size).toBe(41);
    for (const p of people) expect(getById(p.id), p.id).toBe(p);
  });

  it("owners and makers carry R9's names: a given name and a family initial, the initial as surnameChar", () => {
    for (const p of [...leads, ...allMakers]) {
      expect(p.name.en, p.id).toBe(R9[p.id]);
      expect(p.name.zh, p.id).toBe(p.name.en);
      expect(p.name.en, p.id).toMatch(/^[A-Z][a-z]+ [A-Z]\.$/);
      expect(p.surnameChar, p.id).toBe(p.name.en.split(" ")[1].charAt(0));
      expect(p.lang, p.id).toBe("en");
    }
    for (const c of communities) {
      const initials = [c.leadId, ...c.makerIds].map((id) => person(id).surnameChar);
      expect(new Set(initials).size, c.id).toBe(initials.length);
    }
    // The leads and makers the plan adds list their languages. R0's four gained only communityId.
    for (const p of [...leads.slice(1), ...allMakers.slice(3)]) expect(p.languages, p.id).toEqual(["en"]);
  });

  it("nobody has a nativeName, and the names in the plan's sources are not used", () => {
    expect(people.filter((p) => p.nativeName !== undefined)).toEqual([]);
    const sourceNames = ["Lucy L.", "Marie C.", "Jessica O.", "Jennie T.", "Jennie K.", "Ramona M.", "Alicia C.", "Ellen O."];
    expect(people.filter((p) => sourceNames.includes(p.name.en))).toEqual([]);
    // fix-plan 1.6: no real person is named. buy_01 was renamed from a well-known actor's name.
    expect(people.find((p) => p.id === "buy_01")?.name.en).toBe("Avery Wrenfield");
  });

  it("the co-op's makers carry receipt notes dated the day they're paid, and receiptNotes holds them", () => {
    const paid = shortDate(makerPayoutDate);
    expect(Object.keys(receiptNotes)).toEqual(["mkr_01", "mkr_02", "mkr_03"]);
    for (const m of makers) {
      const n = m.receiptNote;
      if (!n) throw new Error(`${m.id} has no receipt note`);
      expect(receiptNotes[m.id], m.id).toBe(n);
      expect(n.en.split("\n"), m.id).toHaveLength(2);
      expect(n.zh.split("\n"), m.id).toHaveLength(2);
      expect(n.en.split("\n")[1], m.id).toBe(`My share of your purchase reached me on ${paid.en}.`);
      expect(n.zh.split("\n")[1], m.id).toBe(`您这笔购买中我的那份已在${paid.zh}到账。`);
    }
    expect(person("mkr_01").receiptNote).toEqual({
      en: "Thank you for choosing my weaving.\nMy share of your purchase reached me on Oct 2.",
      zh: "谢谢您选择我的编织作品。\n您这笔购买中我的那份已在10月2日到账。",
    });
    expect(allMakers.slice(3).filter((m) => m.receiptNote)).toEqual([]);
  });
});

describe("content rules", () => {
  it("hold R28's lists", () => {
    expect(Object.keys(contentRules)).toEqual(["bannedObjects", "stereotypeWords", "meaningWords", "accusingWords", "peopleNames", "allowedHosts"]);
    expect(contentRules.stereotypeWords).toHaveLength(25);
    expect(contentRules.meaningWords).toEqual(["symbolizes", "represents", "protects", "brings luck", "象征", "寓意"]);
    expect(contentRules.accusingWords).toHaveLength(18);
    expect(contentRules.allowedHosts).toEqual(["example.com", "example.org"]);
    expect(contentRules.peopleNames).toEqual({
      com_dine: ["Diné", "Navajo", "纳瓦霍"],
      com_ojibwe: ["Ojibwe", "Ojibwa", "Chippewa", "Anishinaabe", "奥吉布瓦"],
      com_acoma: ["Acoma", "Pueblo", "阿科马"],
      com_seminole: ["Seminole", "塞米诺尔"],
      general: ["Native American", "Indigenous", "Native", "Indian", "美洲原住民", "原住民", "土著"],
    });
    // The kept-out list (data-model.md, Communities) and R16 and R17.
    for (const w of ["yei", "sandpainting", "whirling log", "katsina", "feather", "headdress", "regalia", "pipe", "mask", "drum", "rattle", "dreamcatcher", "totem", "ivory", "bone", "whalebone", "baleen", "sealskin", "fur", "bandolier bag", "dance apron", "jingle dress", "bow guard", "costume", "quill", "shell", "eagle"]) {
      expect(contentRules.bannedObjects, w).toContain(w);
    }
    // Whole-word matching: a plural hits, a longer word doesn't.
    expect(wordHits("Two drums and a mask", contentRules.bannedObjects)).toEqual(["mask", "drum"]);
    expect(wordHits("furniture, an eardrum, piped edges", contentRules.bannedObjects)).toEqual([]);
    expect(wordHits("插图：羽毛", contentRules.bannedObjects)).toEqual(["羽毛"]);
  });
});
