// F-watch T2: the scan's queries for a maker, by the plan's rule, with no randomness.
import { describe, expect, it } from "vitest";
import type { Community, Person, Piece } from "../../core/types";
import { getById, pieces, scriptedScan, studio } from "../../mock";
import { firstWords, MAX_QUERIES, scanQueries, type QuerySources } from "./scanQueries";

describe("scanQueries for mkr_01", () => {
  const grace = getById<Person>("mkr_01")!;
  const first = pieces.find((p) => p.makerId === "mkr_01")!;
  const coop = getById<Community>(grace.communityId!)!;

  it("sends the co-op's name, Grace N. with her first piece's object, then eight words of its story", () => {
    expect(first.id).toBe("pc_01");
    expect(scanQueries("mkr_01")).toEqual([
      coop.name.en,
      `${grace.name.en} ${first.facets.object.en}`,
      first.story.en.split(/\s+/).slice(0, 8).join(" "),
    ]);
  });

  it("sends the same three as the tour's scriptedScan", () => {
    expect(scriptedScan.makerId).toBe("mkr_01");
    expect(scanQueries("mkr_01")).toEqual(scriptedScan.queries);
  });

  it("is the same on every call", () => {
    expect(scanQueries("mkr_01")).toEqual(scanQueries("mkr_01"));
  });

  it("sends at most three for every maker of the co-op", () => {
    for (const id of studio.makerIds) {
      const q = scanQueries(id);
      expect(q.length).toBeGreaterThan(0);
      expect(q.length).toBeLessThanOrEqual(MAX_QUERIES);
      expect(q[0]).toBe(coop.name.en);
    }
  });
});

describe("scanQueries for a maker with no pieces", () => {
  const src: QuerySources = {
    pieces: [] as Piece[],
    person: (id) => (id === "mkr_x" ? { name: { en: "Ada Q.", zh: "Ada Q." }, communityId: "com_dine" } : undefined),
    community: (id) => (id === "com_dine" ? { name: { en: "A Test Co-op", zh: "测试合作社" } } : undefined),
  };

  it("sends only the community's name, since the other two need a piece", () => {
    expect(scanQueries("mkr_x", src)).toEqual(["A Test Co-op"]);
  });

  it("sends nothing for a maker it can't find", () => {
    expect(scanQueries("mkr_missing", src)).toEqual([]);
  });

  it("takes the maker's first piece in catalog order", () => {
    const withPieces: QuerySources = {
      ...src,
      pieces: [
        { makerId: "mkr_y", communityId: "com_dine", facets: { object: { en: "pot", zh: "罐" } } as Piece["facets"], story: { en: "Other.", zh: "" } },
        { makerId: "mkr_x", communityId: "com_dine", facets: { object: { en: "rug", zh: "毯" } } as Piece["facets"], story: { en: "One two three four five six seven eight nine ten.", zh: "" } },
        { makerId: "mkr_x", communityId: "com_dine", facets: { object: { en: "bowl", zh: "碗" } } as Piece["facets"], story: { en: "Later piece.", zh: "" } },
      ],
    };
    expect(scanQueries("mkr_x", withPieces)).toEqual(["A Test Co-op", "Ada Q. rug", "One two three four five six seven eight"]);
  });
});

describe("firstWords", () => {
  it("keeps the first eight words, splitting on any whitespace", () => {
    expect(firstWords("a  b\nc d e f g h i j")).toBe("a b c d e f g h");
    expect(firstWords("short text")).toBe("short text");
  });
});
