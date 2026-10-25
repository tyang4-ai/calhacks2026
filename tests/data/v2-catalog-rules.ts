// The catalog checks parts A and B share (S3-catalog T3 and T4), with each craft's word lists as
// the plan's content rules R13 to R16 and its safe craft facts give them. Not a test file itself.
import { expect, it } from "vitest";
import type { Piece, Text } from "../../src/core/types";
import { allMakers, communities, contentRules, vibeVocabulary } from "../../src/mock/index";
import { scan, total, wordHits } from "./v2-helpers";

export type Craft = "weaving" | "silver" | "beadwork" | "pottery" | "patchwork";

/** The objects each craft's sources name (safe craft facts, "Objects"). */
export const OBJECTS: Record<Craft, string[]> = {
  weaving: ["wall weaving", "rug", "sash belt"],
  silver: ["cuff bracelet", "ring", "earrings", "pendant necklace"],
  beadwork: ["earrings", "pouch", "pendant necklace", "bead necklace"],
  pottery: ["jar", "bowl", "seed pot"],
  patchwork: ["skirt", "jacket"],
};

/** R16's materials. */
export const MATERIALS: Record<Craft, string[]> = {
  weaving: ["wool"],
  silver: ["silver", "turquoise"],
  beadwork: ["glass beads", "cloth", "leather", "thread"],
  pottery: ["clay", "slip", "paint"],
  patchwork: ["cotton", "thread", "rickrack"],
};

/**
 * R14's motifs. Patchwork also takes "geometric", because contracts figure 12 puts it on four
 * Seminole pieces (pc_42, pc_45, pc_48, pc_51) and the contracts win over the plan's list.
 */
export const MOTIFS: Record<Craft, string[]> = {
  weaving: ["diamond", "stripe", "zigzag", "step", "band"],
  silver: ["dot", "line", "chevron", "arc"],
  beadwork: ["flower", "leaf", "vine", "berry", "bud"],
  pottery: ["geometric", "fine line", "band", "step", "dot"],
  patchwork: ["stripe", "band", "diamond", "zigzag", "square", "triangle", "geometric"],
};

/** How each craft is made, as the safe facts say it. */
export const TECHNIQUES: Record<Craft, string[]> = {
  weaving: ["handwoven", "hand-spun", "hand-dyed"],
  silver: ["hand-stamped", "soldered", "stone setting"],
  beadwork: ["beadwork", "hand-stitched", "loom-woven"],
  pottery: ["coil-built", "stone-polished", "hand-painted"],
  patchwork: ["patchwork", "machine-sewn"],
};

/** The physical steps of each craft (R13), as the process steps name them. */
export const STEPS: Record<Craft, string[]> = {
  weaving: [
    "Preparing the yarn",
    "Spinning the wool",
    "Dyeing the yarn",
    "Setting up the warp on the loom",
    "Weaving",
    "Finishing the edges",
  ],
  silver: ["Cutting and shaping the silver", "Stamping the design", "Setting the turquoise", "Soldering", "Fitting the ear wires", "Filing and polishing"],
  beadwork: ["Drawing the design", "Stitching the beads", "Backing and edging", "Attaching the findings", "Weaving the beads on a loom"],
  pottery: [
    "Preparing the clay",
    "Coiling the walls by hand",
    "Smoothing the walls",
    "Covering it with white slip and polishing it with a smooth stone",
    "Painting with a yucca brush",
    "Firing",
  ],
  patchwork: [
    "Cutting the strips",
    "Sewing the strips into bands",
    "Cutting and turning the bands",
    "Piecing the rows",
    "Sewing the skirt",
    "Sewing the jacket",
    "Adding rickrack",
  ],
};

/** Each community's craft line (R12), word for word from the plan's craft lines table. */
export const CRAFT_LINES: Record<string, Text> = {
  com_ojibwe: {
    en: "Ojibwe beadworkers stitch glass seed beads directly onto cloth or leather, often in floral designs. Glass beads reached the Ojibwe through the fur trade in the 1600s.",
    zh: "奥吉布瓦（Ojibwe）串珠匠人把玻璃小珠直接缝在布或皮革上，常做成花卉图案。玻璃珠在17世纪随毛皮贸易传到奥吉布瓦人手中。",
  },
  com_acoma: {
    en: "Acoma potters coil their pots by hand with thin walls, cover them with a white slip and paint them with a yucca brush. Black and orange are the traditional colors.",
    zh: "阿科马（Acoma）陶匠手工盘筑薄壁陶器，施白色泥浆，再用yucca（丝兰）笔绘制。传统颜色是黑色和橙色。",
  },
  com_seminole: {
    en: "Seminole patchwork is sewn from strips of cloth joined into bands on a sewing machine, then cut and pieced back together in rows. It grew after sewing machines arrived in the 1890s.",
    zh: "塞米诺尔（Seminole）拼布是用缝纫机把布条缝成长条，再裁开、重新拼成一排排花样。19世纪90年代缝纫机传入后，这门手艺逐渐发展起来。",
  },
};

/** Figure 11's word chips (the price chip left out). */
export const FIG11 = ["warm", "bold", "red", "wool", "gift for mom"];

/** Every facet and vibe word a piece carries, as the keyword scorer reads them. */
export function words(p: Piece): string[] {
  const f = p.facets;
  return [f.object.en, ...f.materials, ...f.techniques, ...f.motifs, ...f.colors, ...p.vibe.moods, ...p.vibe.occasions, ...p.vibe.recipients];
}

/** The figure 11 chips a piece carries. */
export function fig11Chips(p: Piece): string[] {
  const w = new Set(words(p));
  return FIG11.filter((c) => w.has(c));
}

const FLOWER_WORDS = ["flower", "leaf", "vine", "berry", "bud"];

export interface PartSpec {
  communityId: string;
  craft: Craft;
  firstId: number;
  /** Pieces per maker, in maker ID order. */
  perMaker: number[];
  /** How many pieces of each object. */
  mix: Record<string, number>;
}

const num = (id: string) => Number(id.slice(3));

/** Registers the shared checks for one community's fourteen pieces. Call inside a describe. */
export function checkCommunityPieces(part: Piece[], spec: PartSpec): void {
  const ps = part.filter((p) => p.communityId === spec.communityId);
  const community = communities.find((c) => c.id === spec.communityId);

  it(`${spec.communityId}: fourteen pieces in their ID range, by the community's makers in ID order`, () => {
    expect(community).toBeDefined();
    expect(ps.map((p) => num(p.id))).toEqual(Array.from({ length: 14 }, (_, i) => spec.firstId + i));
    const makerIds = community?.makerIds ?? [];
    expect(spec.perMaker).toHaveLength(makerIds.length);
    const expected = makerIds.flatMap((m, i) => Array.from({ length: spec.perMaker[i] }, () => m));
    expect(ps.map((p) => p.makerId)).toEqual(expected);
    for (const p of ps) expect(allMakers.find((m) => m.id === p.makerId)?.communityId, p.id).toBe(spec.communityId);
  });

  it(`${spec.communityId}: four featured and ten series, the object mix, and believable prices`, () => {
    expect(ps.filter((p) => p.kind === "featured")).toHaveLength(4);
    expect(ps.filter((p) => p.kind === "series")).toHaveLength(10);
    for (const p of ps) expect(p.facets.oneOfAKind, p.id).toBe(p.kind === "featured");
    const mix: Record<string, number> = {};
    for (const p of ps) mix[p.facets.object.en] = (mix[p.facets.object.en] ?? 0) + 1;
    expect(mix).toEqual(spec.mix);
    for (const p of ps) {
      expect(Number.isInteger(p.priceCents) && p.priceCents >= 2500 && p.priceCents <= 450000, p.id).toBe(true);
      expect(Number.isInteger(p.materialsCents) && p.materialsCents > 0 && p.materialsCents < p.priceCents / 4, p.id).toBe(true);
    }
    expect(ps.some((p) => p.priceCents < 6000)).toBe(true);
    expect(ps.some((p) => p.priceCents > 40000)).toBe(true);
  });

  it(`${spec.communityId}: every field is filled, and process hours add up`, () => {
    for (const p of ps) {
      for (const t of [p.title, p.story, p.heritage, p.imageAlt, p.facets.object, ...p.process.map((s) => s.step)]) {
        expect(t.en.trim().length, p.id).toBeGreaterThan(0);
        expect(t.zh.trim().length, p.id).toBeGreaterThan(0);
      }
      expect(p.image, p.id).toBe(`/images/${p.id}.svg`);
      expect(p.process.length >= 3 && p.process.length <= 5, p.id).toBe(true);
      expect(total(p.process.map((s) => s.hours)), p.id).toBe(p.hours);
      expect(p.process.every((s) => s.hours > 0), p.id).toBe(true);
      expect(p.facets.leadTimeDays > 0 && Number.isInteger(p.facets.leadTimeDays), p.id).toBe(true);
      // R11: two or three sentences.
      const sentences = p.story.en.split(/(?<=[.!?])\s+/).length;
      expect(sentences >= 2 && sentences <= 3, p.id).toBe(true);
      expect(p.imageAlt.en.startsWith("Illustration of "), p.id).toBe(true);
      expect(p.imageAlt.zh.startsWith("插图："), p.id).toBe(true);
    }
  });

  it(`${spec.communityId}: heritage is the community's craft line, word for word`, () => {
    for (const p of ps) expect(p.heritage, p.id).toEqual(CRAFT_LINES[spec.communityId]);
  });

  it(`${spec.communityId}: objects, materials, techniques, motifs and steps come from the craft's lists`, () => {
    for (const p of ps) {
      const f = p.facets;
      expect(OBJECTS[spec.craft], p.id).toContain(f.object.en);
      expect(f.materials.length, p.id).toBeGreaterThan(0);
      expect(f.techniques.length, p.id).toBeGreaterThan(0);
      expect(f.colors.length, p.id).toBeGreaterThan(0);
      expect(f.motifs.length, p.id).toBeGreaterThan(0);
      for (const m of f.materials) expect(MATERIALS[spec.craft], `${p.id} ${m}`).toContain(m);
      for (const t of f.techniques) expect(TECHNIQUES[spec.craft], `${p.id} ${t}`).toContain(t);
      for (const m of f.motifs) expect(MOTIFS[spec.craft], `${p.id} ${m}`).toContain(m);
      for (const s of p.process) expect(STEPS[spec.craft], `${p.id} ${s.step.en}`).toContain(s.step.en);
      // Facet and vibe words are lowercase English, and the color is cream, never ivory.
      for (const w of words(p)) expect(w, p.id).toBe(w.toLowerCase());
      expect(f.colors, p.id).not.toContain("ivory");
      if (spec.communityId !== "com_ojibwe") expect(f.motifs.filter((m) => FLOWER_WORDS.includes(m)), p.id).toEqual([]);
    }
  });

  it(`${spec.communityId}: vibe words come from the closed list, in R18's counts`, () => {
    for (const p of ps) {
      const v = p.vibe;
      expect(v.moods.length >= 2 && v.moods.length <= 4, p.id).toBe(true);
      expect(v.occasions.length >= 1 && v.occasions.length <= 3, p.id).toBe(true);
      expect(v.recipients.length >= 1 && v.recipients.length <= 3, p.id).toBe(true);
      for (const m of v.moods) expect(vibeVocabulary.moods, `${p.id} ${m}`).toContain(m);
      for (const o of v.occasions) expect(vibeVocabulary.occasions, `${p.id} ${o}`).toContain(o);
      for (const r of v.recipients) expect(vibeVocabulary.recipients, `${p.id} ${r}`).toContain(r);
      expect([...v.moods, ...v.occasions, ...v.recipients].filter((w) => ["gift", "mom", "love"].includes(w)), p.id).toEqual([]);
    }
  });

  it(`${spec.communityId}: no banned, stereotype or meaning word, and no nation's name in a title or facet`, () => {
    const bad = [...contentRules.bannedObjects, ...contentRules.stereotypeWords, ...contentRules.meaningWords];
    const names = Object.values(contentRules.peopleNames).flat();
    for (const p of ps) {
      const shown = { title: p.title, story: p.story, facets: p.facets, vibe: p.vibe, imageAlt: p.imageAlt, process: p.process };
      expect(scan(shown, p.id, bad)).toEqual([]);
      expect(scan({ title: p.title, facets: p.facets }, p.id, names)).toEqual([]);
      // R10: never "-style" or "inspired" in a title.
      expect(wordHits(`${p.title.en} ${p.title.zh}`, ["style", "inspired"]), p.id).toEqual([]);
    }
  });

  it(`${spec.communityId}: figure 11's ceiling, at most two of its word chips on any other piece at $200 or less`, () => {
    const named = ["pc_01", "pc_07", "pc_11", "pc_14", "pc_30", "pc_43"];
    for (const p of ps) {
      if (p.priceCents <= 20000 && !named.includes(p.id)) expect(fig11Chips(p).length, `${p.id} ${fig11Chips(p)}`).toBeLessThanOrEqual(2);
      expect(fig11Chips(p), p.id).not.toContain("wool");
    }
  });
}
