// S3-catalog T8: data-model.md's demo-critical figures 11 to 16, one test each, with exact values.
// Figure 14's text match is the one figure read from the data and never typed, because S3-catalog T9
// rewrites it from the trained model. Also: ord_001 keeps v1's figures, the add-on ctb_01 stays
// separate from it, figure 2 holds on curatedSet, and the model report is null or the real one.
import { describe, expect, it } from "vitest";
import type { Approval, CounterfeitCandidate, Order, Person, Piece } from "../../src/core/types";
import {
  communities,
  contentRules,
  counterfeitCandidates,
  curatedSet,
  demoContribution,
  demoFundMoves,
  demoSearch,
  demoSurprise,
  galleryContract,
  gallerySplits,
  getById,
  makers,
  payouts,
  report,
  splits,
} from "../../src/mock/index";
import { counterfeitCandidates as watchCandidates } from "../../src/mock/watch";

const piece =(id: string) => getById<Piece>(id) as Piece;
const cft = (id: string) => getById<CounterfeitCandidate>(id) as CounterfeitCandidate;

// B11's real report and map points, which S3-catalog T9 copies into model.ts, rounded to 4 decimals.
interface ReportFile {
  modelId: string;
  baseModel: string;
  pairs: number;
  epochs: number;
  dims: number;
  hubUrl: string | null;
  eval: { k: number; queries: number; systems: { system: string; recallAtK: number; mrr: number }[] };
}
interface VectorsFile {
  pieces: { pieceId: string; x: number; y: number }[];
}
const REPORT_FILES = import.meta.glob<ReportFile>("../../server/b11_embed/report.json", { eager: true, import: "default" });
const VECTOR_FILES = import.meta.glob<VectorsFile>("../../server/b11_embed/vectors.json", { eager: true, import: "default" });
const round4 = (n: number) => {
  const r = Math.round(n * 10000) / 10000;
  return r === 0 ? 0 : r;
};
/** report.json's hubUrl reaches model.ts only on a host contentRules allows (data-model.md: no URL in src/mock/ outside allowedHosts). */
const onAllowedHost = (url: string | null): url is string => {
  if (typeof url !== "string" || url === "") return false;
  const host = new URL(url).hostname;
  return contentRules.allowedHosts.some((a) => host === a || host.endsWith(`.${a}`));
};
const fromFiles =(r: ReportFile, v: VectorsFile) => ({
  trained: {
    modelId: r.modelId,
    baseModel: r.baseModel,
    pairs: round4(r.pairs),
    epochs: round4(r.epochs),
    dims: round4(r.dims),
    ...(onAllowedHost(r.hubUrl) ? { hubUrl: r.hubUrl } : {}),
  },
  scored: {
    modelId: r.modelId,
    k: round4(r.eval.k),
    queries: round4(r.eval.queries),
    systems: r.eval.systems.map((s) => ({ system: s.system, recallAtK: round4(s.recallAtK), mrr: round4(s.mrr) })),
  },
  points: v.pieces.map((p) => ({ pieceId: p.pieceId, x: round4(p.x), y: round4(p.y) })),
});
const MOCK_FILES = import.meta.glob<string>("../../src/mock/**/*.ts", { query: "?raw", import: "default", eager: true });

describe("figure 11, the vibe query", () => {
  it("is exactly the tour's text, its six chips and its six results with their chips", () => {
    expect(demoSearch.query).toEqual({
      text: "a warm, bold gift for my mom. she loves red wool. under $200",
      keywords: ["warm", "bold", "red", "wool", "gift for mom", "under $200"],
      lang: "en",
      filters: { maxPriceCents: 20000 },
    });
    expect(demoSearch.answer.engine).toBe("keyword_scripted");
    expect(demoSearch.answer.results.map((r) => [r.pieceId, r.matched, r.score])).toEqual([
      ["pc_01", ["warm", "bold", "red", "wool", "gift for mom"], 1],
      ["pc_07", ["warm", "red", "wool", "gift for mom"], 0.8],
      ["pc_11", ["bold", "red", "wool", "gift for mom"], 0.8],
      ["pc_14", ["bold", "red", "gift for mom"], 0.6],
      ["pc_30", ["warm", "bold", "gift for mom"], 0.6],
      ["pc_43", ["warm", "red", "gift for mom"], 0.6],
    ]);
    expect(demoSearch.answer.results[0].reason).toEqual({ en: "Matches warm, bold, red, wool, gift for mom", zh: "匹配：warm, bold, red, wool, gift for mom" });
    // The pieces the figure names, by maker and community.
    expect([piece("pc_01").makerId, piece("pc_07").makerId, piece("pc_11").makerId]).toEqual(["mkr_01", "mkr_02", "mkr_02"]);
    expect([piece("pc_14").communityId, piece("pc_30").communityId, piece("pc_43").communityId]).toEqual(["com_ojibwe", "com_acoma", "com_seminole"]);
    expect([piece("pc_14").title.en, piece("pc_30").title.en, piece("pc_43").title.en]).toEqual([
      "Red and green floral beaded earrings",
      "Small black and orange seed pot",
      "Red, yellow and black patchwork skirt",
    ]);
  });
});

describe("figure 12, Surprise me", () => {
  it("draws pc_38, Julie M.'s Acoma jar, with figure 12's nine weights", () => {
    expect(demoSurprise.ask).toEqual({ keyword: "geometric", method: "fair_random", seed: 10 });
    expect(demoSurprise.draw.pieceId).toBe("pc_38");
    expect(demoSurprise.draw.method).toBe("fair_random");
    expect(demoSurprise.draw.seed).toBe(10);
    expect(demoSurprise.draw.candidates.map((c) => [c.pieceId, Number(c.weight.toFixed(4))])).toEqual([
      ["pc_27", 0.0619],
      ["pc_30", 0.0773],
      ["pc_32", 0.1031],
      ["pc_35", 0.0515],
      ["pc_38", 0.3093],
      ["pc_42", 0.0773],
      ["pc_45", 0.1031],
      ["pc_48", 0.0619],
      ["pc_51", 0.1546],
    ]);
    const p38 = piece("pc_38");
    expect([p38.makerId, p38.communityId, p38.facets.object.en]).toEqual(["mkr_12", "com_acoma", "jar"]);
    expect(getById<Person>("mkr_12")?.name.en).toBe("Julie M.");
  });
});

describe("figure 13, the project add-on", () => {
  it("is ctb_01, 500 to prj_01 with ord_001, passed in full through mv_0101 and mv_0102", () => {
    expect(demoContribution).toEqual({ contributionId: "ctb_01", projectId: "prj_01", amountCents: 500, buyerId: "buy_01", orderId: "ord_001" });
    expect(demoFundMoves).toEqual([
      { moveId: "mv_0101", kind: "project_fund", from: { kind: "buyer", id: "buy_01" }, to: { kind: "cindia" }, amountCents: 500, refId: "ctb_01", date: "2026-09-01" },
      { moveId: "mv_0102", kind: "project_fund", from: { kind: "cindia" }, to: { kind: "community_fund", id: "prj_01" }, amountCents: 500, refId: "ctb_01", date: "2026-09-01" },
    ]);
    expect(communities.find((c) => c.id === "com_dine")?.projectIds).toEqual(["prj_01"]);
  });

  it("leaves ord_001's own figures as v1's, so ctb_01 is separate from the order", () => {
    const o = getById<Order>("ord_001") as Order;
    expect(o).toMatchObject({
      channelId: "ch_cindia",
      pieceId: "pc_01",
      buyerId: "buy_01",
      date: "2026-09-01",
      grossCents: 18000,
      cardFeeCents: 552,
      platformFeeCents: 1800,
      materialsCents: 2200,
      makerShareCents: 13448,
    });
    expect(payouts.find((p) => p.id === "pay_001")?.netCents).toBe(15648);
    expect(getById("ctb_01")).toBeUndefined();
  });
});

describe("figure 14, the counterfeit hit", () => {
  it("cft_01 copies pc_01: named co-op and maker, its story's first sentence, a possible copy, apr_03 to report it", () => {
    const hit = cft("cft_01");
    const grace = makers.find((m) => m.id === "mkr_01");
    const coop = communities.find((c) => c.id === "com_dine");
    const story = piece("pc_01").story.en;
    const first = story.slice(0, story.indexOf(". ") + 1);
    // The text match is read from watch.ts, never typed here: T9 wrote the trained model's number.
    expect(hit.similarity).toBe(watchCandidates.find((c) => c.id === "cft_01")?.similarity);
    expect(typeof hit.similarity).toBe("number");
    expect(hit.similarity).toBeGreaterThanOrEqual(0);
    expect(hit.similarity).toBeLessThanOrEqual(1);
    expect(Math.round(hit.similarity * 100) / 100).toBe(hit.similarity);
    expect(hit.verdict).toBe("possible_copy");
    expect(hit.pieceId).toBe("pc_01");
    expect(hit.title).toContain(grace?.name.en);
    expect(hit.title).toContain(coop?.name.en);
    expect(hit.snippet).toContain(first);
    expect(hit.claim.en).toBe(`Says it's woven by ${grace?.name.en} of the ${coop?.name.en}. She didn't list it there.`);
    expect(getById<Approval>("apr_03")).toMatchObject({ kind: "report_listing", subjectIds: ["cft_01"], proposedBy: "cindy", status: "pending" });
  });

  it("cft_02 is the claim-only listing, cft_04 the low score, and every URL is on the sandbox market", () => {
    expect(cft("cft_02").verdict).toBe("claim_only");
    expect(cft("cft_02").title).toContain("Authentic Native American made");
    expect(cft("cft_04").similarity).toBeLessThan(cft("cft_01").similarity);
    expect(cft("cft_04").similarity).toBeLessThan(0.5);
    for (const c of counterfeitCandidates) {
      const onHost = contentRules.allowedHosts.some((h) => new RegExp(`^https?://([a-z0-9-]+\\.)*${h.replace(".", "\\.")}(/|$)`).test(c.url));
      expect(c.url.startsWith("/market/") || onHost, c.id).toBe(true);
    }
  });
});

describe("figure 15, the search proof", () => {
  it("holds no report until B11's first real run, then exactly the real one", () => {
    const reports = Object.values(REPORT_FILES);
    const vectors = Object.values(VECTOR_FILES);
    if (report === null) {
      expect(report).toBeNull();
      // Nothing in src/mock/ holds an eval number before the real run.
      expect(Object.entries(MOCK_FILES).filter(([, text]) => /recallAtK|\bmrr\b|systems\s*:/i.test(text)).map(([f]) => f)).toEqual([]);
    } else {
      expect(reports).toHaveLength(1);
      expect(vectors).toHaveLength(1);
      expect(JSON.parse(JSON.stringify(report))).toEqual(fromFiles(reports[0], vectors[0]));
      // The proof shows the four systems, k 5, over the 50 held-out queries, as the file has them.
      expect(report.scored.systems.map((s) => s.system)).toEqual(["keyword", "base", "custom", "hybrid"]);
      expect([report.scored.k, report.scored.queries]).toEqual([reports[0].eval.k, reports[0].eval.queries]);
    }
  });
});

describe("figure 16, the split comparison", () => {
  it("pc_01 gives 13448 on Cindia and 8600 through the gallery, each computed by the money rules", () => {
    const p = piece("pc_01");
    const commission = Math.floor((p.priceCents * galleryContract.commissionBps + 5000) / 10000);
    expect(galleryContract.commissionBps).toBe(4000);
    expect(commission).toBe(7200);
    expect(p.priceCents - commission - p.materialsCents).toBe(8600);
    expect(splits.pc_01).toEqual({
      pieceId: "pc_01",
      grossCents: 18000,
      cardFeeCents: 552,
      platformFeeCents: 1800,
      materialsCents: 2200,
      makerShareCents: 13448,
      compare: { channelId: "ch_gallery", commissionBps: 4000, makerShareCents: 8600 },
    });
    expect(gallerySplits.pc_01).toEqual({ channelId: "ch_gallery", commissionBps: 4000, makerShareCents: 8600 });
  });
});

describe("figure 2 on curatedSet", () => {
  it("is pc_01, pc_07 and pc_11, in that order, each with a reason", () => {
    expect(curatedSet.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
    expect(Object.keys(curatedSet.reasons).toSorted()).toEqual(["pc_01", "pc_07", "pc_11"]);
  });
});
