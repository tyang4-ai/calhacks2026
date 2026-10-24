import { describe, expect, it } from "vitest";
import { formatDate, formatMonth } from "./formatDate";
import { formatBps, formatCents } from "./formatCents";
import { sealPose, stitchProgress } from "./motion";

describe("formatCents", () => {
  it("formats integer cents as dollars", () => {
    expect(formatCents(18000)).toBe("$180.00");
    expect(formatCents(13448)).toBe("$134.48");
    expect(formatCents(552)).toBe("$5.52");
    expect(formatCents(170000)).toBe("$1,700.00");
    expect(formatCents(120000000)).toBe("$1,200,000.00");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(-34000)).toBe("-$340.00");
  });
  it("formats basis points", () => {
    expect(formatBps(4000)).toBe("40%");
    expect(formatBps(7470)).toBe("74.7%");
  });
});

describe("formatDate", () => {
  it("formats in both languages from the string, in UTC", () => {
    expect(formatDate("2026-10-02", "en")).toBe("Oct 2, 2026");
    expect(formatDate("2026-10-02", "zh")).toBe("2026年10月2日");
    expect(formatDate("2026-09-30", "en")).toBe("Sep 30, 2026");
    expect(formatMonth("2026-09", "en")).toBe("September 2026");
    expect(formatMonth("2026-09", "zh")).toBe("2026年9月");
  });
});

describe("motion helpers", () => {
  it("follow the player's time", () => {
    expect(stitchProgress(1000, 1000)).toBe(0);
    expect(stitchProgress(1900, 1000)).toBe(1);
    expect(stitchProgress(1450, 1000)).toBeGreaterThan(0.5);
    expect(stitchProgress(1000, 1000, true)).toBe(1);
    expect(sealPose(0, 0)).toEqual({ scale: 1.15, opacity: 0, rotate: -0 });
    expect(sealPose(220, 0)).toEqual({ scale: 1, opacity: 1, rotate: -4 });
    expect(sealPose(0, 0, true).rotate).toBe(0);
  });
});
