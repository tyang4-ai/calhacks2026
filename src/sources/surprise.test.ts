import { describe, expect, it } from "vitest";
import { sample } from "../core/testFixtures";
import { validateEvent } from "../core/validate";
import { drawSurprise, mulberry32 } from "./surprise";
import { TEST_INDEX, TEST_PIECES } from "./testCatalog";

const FIG12_CANDIDATES = ["pc_27", "pc_30", "pc_32", "pc_35", "pc_38", "pc_42", "pc_45", "pc_48", "pc_51"];
/** Figure 12's weights, to 4 decimals. */
const FIG12_WEIGHTS = [0.0619, 0.0773, 0.1031, 0.0515, 0.3093, 0.0773, 0.1031, 0.0619, 0.1546];
const ACTIVE = TEST_INDEX.filter((e) => e.status === "active")
  .map((e) => e.pieceId)
  .toSorted();

const sum = (ws: number[]) => ws.reduce((s, w) => s + w, 0);

describe("mulberry32", () => {
  it("returns 0.50199 first for seed 10, the same sequence every time, from 0 to 1", () => {
    const a = mulberry32(10);
    const b = mulberry32(10);
    const first = a();
    expect(first).toBeCloseTo(0.50199, 5);
    expect(b()).toBe(first);
    expect(a()).toBe(b());
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i += 1) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("drawSurprise", () => {
  it("draws figure 12: geometric, fair_random, seed 10 lands on pc_38, the fifth of nine", () => {
    const draw = drawSurprise({ keyword: "geometric", method: "fair_random", seed: 10 }, TEST_INDEX, TEST_PIECES);
    expect(draw?.pieceId).toBe("pc_38");
    expect(draw?.candidates.map((c) => c.pieceId)).toEqual(FIG12_CANDIDATES);
    draw?.candidates.forEach((c, i) => expect(c.weight).toBeCloseTo(FIG12_WEIGHTS[i], 4));
    expect(sum(draw?.candidates.map((c) => c.weight) ?? [])).toBeCloseTo(1, 12);
    expect(draw).toMatchObject({ method: "fair_random", seed: 10 });
    expect(validateEvent(sample("surprise.drawn", { surpriseId: "srp_user_1", ...draw! }))).toEqual([]);
  });

  it("returns the same piece twice for the same seed and inputs", () => {
    for (const seed of [1, 7, 13, 10]) {
      const a = drawSurprise({ keyword: "geometric", method: "keyword_random", seed }, TEST_INDEX, TEST_PIECES);
      const b = drawSurprise({ keyword: "geometric", method: "keyword_random", seed }, TEST_INDEX, TEST_PIECES);
      expect(a).toEqual(b);
    }
  });

  it("walks the raw weights in candidate order: the first candidate whose running total passes rng() * total", () => {
    // keyword_random weighs the nine equally: seed 10's 0.50199 * 9 = 4.52 lands on the fifth.
    const draw = drawSurprise({ keyword: "geometric", method: "keyword_random", seed: 10 }, TEST_INDEX, TEST_PIECES);
    expect(draw?.pieceId).toBe(FIG12_CANDIDATES[Math.floor(mulberry32(10)() * 9)]);
    expect(draw?.candidates.every((c) => c.weight === 1 / 9)).toBe(true);
  });

  it("uses every active piece in pieceId order for pure_random, no keyword, or a keyword that matches nothing", () => {
    const pure = drawSurprise({ keyword: "geometric", method: "pure_random", seed: 3 }, TEST_INDEX, TEST_PIECES);
    expect(pure?.candidates.map((c) => c.pieceId)).toEqual(ACTIVE);
    expect(pure?.candidates.every((c) => c.weight === 1 / ACTIVE.length)).toBe(true);

    const none = drawSurprise({ method: "keyword_random", seed: 3 }, TEST_INDEX, TEST_PIECES);
    expect(none?.candidates.map((c) => c.pieceId)).toEqual(ACTIVE);

    // fair_random with a keyword that matches nothing: all of them, with fair weights.
    const fair = drawSurprise({ keyword: "zebra", method: "fair_random", seed: 3 }, TEST_INDEX, TEST_PIECES);
    expect(fair?.candidates.map((c) => c.pieceId)).toEqual(ACTIVE);
    const pc38 = fair?.candidates.find((c) => c.pieceId === "pc_38")?.weight ?? 0;
    const pc35 = fair?.candidates.find((c) => c.pieceId === "pc_35")?.weight ?? 0;
    expect(pc38 / pc35).toBeCloseTo(6, 10); // 1 / (1 + 0) against 1 / (1 + 5)
    expect(sum(fair?.candidates.map((c) => c.weight) ?? [])).toBeCloseTo(1, 12);
    // The draft pc_55 is never a candidate.
    expect(fair?.candidates.map((c) => c.pieceId)).not.toContain("pc_55");
  });

  it("has nothing to draw from an empty index", () => {
    expect(drawSurprise({ method: "pure_random", seed: 1 }, [], TEST_PIECES)).toBeNull();
  });
});
