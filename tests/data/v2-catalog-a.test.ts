// S3-catalog T3: catalog part A, the Ojibwe co-op's pc_13 to pc_26 and the Acoma studio's pc_27 to
// pc_40, against the plan's content rules and the pieces figures 11 and 12 name.
import { describe, expect, it } from "vitest";
import type { Piece } from "../../src/core/types";
import { partA } from "../../src/mock/catalog/part-a";
import { checkCommunityPieces, fig11Chips } from "./v2-catalog-rules";

const piece = (id: string) => partA.find((p) => p.id === id) as Piece;

describe("catalog part A", () => {
  it("holds pc_13 to pc_40, the Ojibwe co-op's fourteen then the Acoma studio's", () => {
    expect(partA.map((p) => p.id)).toEqual(Array.from({ length: 28 }, (_, i) => `pc_${13 + i}`));
    expect(partA.slice(0, 14).every((p) => p.communityId === "com_ojibwe")).toBe(true);
    expect(partA.slice(14).every((p) => p.communityId === "com_acoma")).toBe(true);
  });

  checkCommunityPieces(partA, {
    communityId: "com_ojibwe",
    craft: "beadwork",
    firstId: 13,
    perMaker: [3, 3, 3, 3, 2],
    mix: { earrings: 5, pouch: 6, "pendant necklace": 2, "bead necklace": 1 },
  });

  checkCommunityPieces(partA, {
    communityId: "com_acoma",
    craft: "pottery",
    firstId: 27,
    perMaker: [3, 3, 3, 3, 2],
    mix: { "seed pot": 6, jar: 5, bowl: 3 },
  });

  it("pc_14 is figure 11's red and green floral beaded earrings by mkr_04", () => {
    const p = piece("pc_14");
    expect(p).toMatchObject({ makerId: "mkr_04", communityId: "com_ojibwe", title: { en: "Red and green floral beaded earrings" } });
    expect(p.priceCents).toBeLessThan(6000);
    expect(p.facets.object.en).toBe("earrings");
    expect(p.facets.materials).toEqual(["glass beads", "leather"]);
    expect(p.facets.colors).toEqual(["red", "green"]);
    expect(p.facets.motifs).toEqual(["flower", "leaf"]);
    expect(p.vibe.moods).toEqual(["bold", "bright"]);
    expect(p.vibe.recipients).toEqual(["gift for mom", "gift for a friend"]);
    expect(fig11Chips(p)).toEqual(["bold", "red", "gift for mom"]);
  });

  it("pc_30 is figure 11's small black and orange seed pot by mkr_10", () => {
    const p = piece("pc_30");
    expect(p).toMatchObject({ makerId: "mkr_10", communityId: "com_acoma", title: { en: "Small black and orange seed pot" } });
    expect(p.priceCents).toBeLessThanOrEqual(20000);
    expect(p.facets.object.en).toBe("seed pot");
    expect(p.facets.colors).toEqual(["black", "orange", "white"]);
    expect(p.facets.motifs).toEqual(["geometric", "fine line"]);
    expect(p.vibe.moods).toEqual(["warm", "bold"]);
    expect(p.vibe.recipients).toEqual(["gift for mom"]);
    expect(fig11Chips(p)).toEqual(["warm", "bold", "gift for mom"]);
  });

  it("pc_38 is figure 12's jar by Julie M., and geometric sits only on figure 12's Acoma pieces", () => {
    const p = piece("pc_38");
    expect(p).toMatchObject({ makerId: "mkr_12", communityId: "com_acoma" });
    expect(p.facets.object.en).toBe("jar");
    expect(p.facets.motifs).toContain("geometric");
    expect(partA.filter((x) => x.makerId === "mkr_12").map((x) => x.id)).toEqual(["pc_36", "pc_37", "pc_38"]);
    expect(partA.filter((x) => x.facets.motifs.includes("geometric")).map((x) => x.id)).toEqual(["pc_27", "pc_30", "pc_32", "pc_35", "pc_38"]);
  });

  it("flowers, leaves, vines, berries and buds sit only on the Ojibwe co-op's pieces", () => {
    const floral = ["flower", "leaf", "vine", "berry", "bud"];
    expect(partA.filter((p) => p.facets.motifs.some((m) => floral.includes(m))).every((p) => p.communityId === "com_ojibwe")).toBe(true);
    expect(partA.filter((p) => p.communityId === "com_ojibwe").every((p) => p.facets.motifs.every((m) => floral.includes(m)))).toBe(true);
  });
});
