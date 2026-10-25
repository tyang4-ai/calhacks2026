import { describe, expect, it } from "vitest";
import { PUBLIC_SITE, isPublicSite } from "./site";

describe("the public-build flag", () => {
  it("is true only for VITE_PUBLIC_SITE=1", () => {
    expect(isPublicSite("1")).toBe(true);
    for (const v of [undefined, null, "", "0", "true", "yes", " 1", "1 ", 1, true]) expect(isPublicSite(v), String(v)).toBe(false);
  });

  it("is off for the unit tests, which run without the flag like every gate", () => {
    expect(PUBLIC_SITE).toBe(false);
  });
});
