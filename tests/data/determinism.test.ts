// Nothing in src/mock/ reads the wall clock or uses unseeded randomness.
import { describe, expect, it } from "vitest";

const files = import.meta.glob<string>("../../src/mock/**/*.ts", { query: "?raw", import: "default", eager: true });

describe("determinism", () => {
  it("finds the mock files", () => {
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(12);
  });

  for (const [path, text] of Object.entries(files)) {
    it(`${path.replace("../../", "")} has no randomness or wall-clock reads`, () => {
      expect(text).not.toMatch(/Math\.random/);
      expect(text).not.toMatch(/Date\.now/);
      expect(text).not.toMatch(/performance\.now/);
      expect(text).not.toMatch(/new Date\(\s*\)/);
    });
  }
});
