import { describe, expect, it } from "vitest";
import { owner } from "../../mock/people";
import { sealInitials } from "./sealInitials";

describe("sealInitials", () => {
  it("seals the co-op manager, Ruth B., as RB (design drop 3)", () => {
    expect(owner.id).toBe("own_01");
    expect(sealInitials(owner)).toBe("RB");
  });

  it("takes the given name's first letter and the record's family initial", () => {
    expect(sealInitials({ name: { en: "grace N.", zh: "grace N." }, surnameChar: "N" })).toBe("GN");
  });

  it("falls back to the family initial for a one-word name, and to nothing without a person", () => {
    expect(sealInitials({ name: { en: "B.", zh: "B." }, surnameChar: "B" })).toBe("B");
    expect(sealInitials(undefined)).toBe("");
  });
});
