// S3-catalog T4: catalog part B, the Seminole co-op's pc_41 to pc_54, against the plan's content
// rules and the pieces figures 11 and 12 name.
import { describe, expect, it } from "vitest";
import type { Piece } from "../../src/core/types";
import { partB } from "../../src/mock/catalog/part-b";
import { checkCommunityPieces, fig11Chips } from "./v2-catalog-rules";

const piece = (id: string) => partB.find((p) => p.id === id) as Piece;

describe("catalog part B", () => {
  it("holds pc_41 to pc_54, all the Seminole co-op's", () => {
    expect(partB.map((p) => p.id)).toEqual(Array.from({ length: 14 }, (_, i) => `pc_${41 + i}`));
    expect(partB.every((p) => p.communityId === "com_seminole")).toBe(true);
  });

  checkCommunityPieces(partB, {
    communityId: "com_seminole",
    craft: "patchwork",
    firstId: 41,
    perMaker: [4, 4, 3, 3],
    mix: { skirt: 8, jacket: 6 },
  });

  it("pc_43 is figure 11's red, yellow and black patchwork skirt", () => {
    const p = piece("pc_43");
    expect(p).toMatchObject({ communityId: "com_seminole", title: { en: "Red, yellow and black patchwork skirt" } });
    expect(p.priceCents).toBeLessThanOrEqual(20000);
    expect(p.facets.object.en).toBe("skirt");
    expect(p.facets.materials).toEqual(["cotton", "rickrack"]);
    expect(p.facets.colors).toEqual(["red", "yellow", "black"]);
    expect(p.facets.motifs).toEqual(["stripe", "zigzag"]);
    expect(p.vibe.moods).toEqual(["warm", "bright"]);
    expect(p.vibe.recipients).toEqual(["gift for mom"]);
    expect(fig11Chips(p)).toEqual(["warm", "red", "gift for mom"]);
  });

  it("geometric sits only on figure 12's four Seminole pieces", () => {
    expect(partB.filter((p) => p.facets.motifs.includes("geometric")).map((p) => p.id)).toEqual(["pc_42", "pc_45", "pc_48", "pc_51"]);
  });

  it("at least one piece is a child's, and nothing reads as a costume", () => {
    expect(partB.filter((p) => /child's/i.test(p.title.en)).map((p) => p.id)).toEqual(["pc_50", "pc_54"]);
    expect(partB.filter((p) => /costume|戏服|演出服/i.test(JSON.stringify(p)))).toEqual([]);
  });
});
