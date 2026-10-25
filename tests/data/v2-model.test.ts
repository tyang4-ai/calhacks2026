// S3-catalog T9: model.ts's report equals B11's report.json and vectors.json, rounded to 4 decimals,
// cft_01's text match comes from the trained model named in watch.ts, and the pooled grading pass
// kept every piece unjudged.json lists in the catalog. No number T9 writes is typed here: each is
// read from the files, or from the counts searchEval.ts's own comment states.
import { describe, expect, it } from "vitest";
import type { SearchQuery } from "../../src/core/types";
import { counterfeitCandidates as watchCandidates } from "../../src/mock/watch";
import { contentRules, modelId, pieces, report, searchEval } from "../../src/mock/index";

interface ReportFile {
  modelId: string;
  baseModel: string;
  pairs: number;
  epochs: number;
  dims: number;
  hubUrl: string | null;
  hubRevision: string | null;
  fingerprint: string;
  eval: { k: number; queries: number; systems: { system: string; recallAtK: number; mrr: number }[] };
}
interface VectorsFile {
  modelId: string;
  fingerprint: string;
  pieces: { pieceId: string; x: number; y: number }[];
}
interface UnjudgedFile {
  modelId: string;
  fingerprint: string;
  queries: { queryId: string; text: string; lang: string; pieceIds: string[] }[];
}

const REPORT = import.meta.glob<ReportFile>("../../server/b11_embed/report.json", { eager: true, import: "default" });
const VECTORS = import.meta.glob<VectorsFile>("../../server/b11_embed/vectors.json", { eager: true, import: "default" });
const UNJUDGED = import.meta.glob<UnjudgedFile>("../../server/b11_embed/unjudged.json", { eager: true, import: "default" });
const SOURCES = import.meta.glob<string>(["../../src/mock/watch.ts", "../../src/mock/model.ts", "../../src/mock/searchEval.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const only = <T>(files: Record<string, T>, name: string): T => {
  const values = Object.values(files);
  expect(values, name).toHaveLength(1);
  return values[0];
};
const source = (name: string) => only(Object.fromEntries(Object.entries(SOURCES).filter(([f]) => f.endsWith(name))), name);

/** report.json's hubUrl reaches model.ts only on a host contentRules allows (data-model.md: no URL in src/mock/ outside allowedHosts). */
const onAllowedHost = (url: string | null): url is string => {
  if (typeof url !== "string" || url === "") return false;
  const host = new URL(url).hostname;
  return contentRules.allowedHosts.some((a) => host === a || host.endsWith(`.${a}`));
};

/** Rounded to 4 decimals, the rule T9 copies with (and never -0). */
const round4 = (n: number) => {
  const r = Math.round(n * 10000) / 10000;
  return r === 0 ? 0 : r;
};

/** ModelReport as T9 copies it: report.json's model.trained and proof.search_scored fields, and vectors.json's points. */
function expectedReport(r: ReportFile, v: VectorsFile) {
  return {
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
  };
}

const twoDecimals = (n: number) => Math.round(n * 100) / 100 === n;

describe("the model report", () => {
  it("report.json, vectors.json and unjudged.json are one run's, of the model model.ts names", () => {
    const r = only(REPORT, "report.json");
    const v = only(VECTORS, "vectors.json");
    const u = only(UNJUDGED, "unjudged.json");
    expect([r.modelId, v.modelId, u.modelId]).toEqual([modelId, modelId, modelId]);
    expect(v.fingerprint).toBe(r.fingerprint);
    expect(u.fingerprint).toBe(r.fingerprint);
  });

  it("equals report.json's trained and scored fields and vectors.json's points, rounded to 4 decimals", () => {
    const r = only(REPORT, "report.json");
    const v = only(VECTORS, "vectors.json");
    expect(report).not.toBeNull();
    expect(JSON.parse(JSON.stringify(report))).toEqual(expectedReport(r, v));
  });

  it("holds one point per catalog piece, in pieceId order, and only numbers with at most 4 decimals", () => {
    expect(report?.points.map((p) => p.pieceId)).toEqual(pieces.map((p) => p.id));
    const numbers = [
      ...(report?.scored.systems.flatMap((s) => [s.recallAtK, s.mrr]) ?? []),
      ...(report?.points.flatMap((p) => [p.x, p.y]) ?? []),
    ];
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) expect(round4(n), String(n)).toBe(n);
  });

  it("model.ts's comment names the run it copies: the model ID, the fingerprint and the published revision", () => {
    const r = only(REPORT, "report.json");
    const text = source("model.ts");
    expect(text).toContain(r.modelId);
    expect(text).toContain(r.fingerprint);
    if (typeof r.hubRevision === "string" && r.hubRevision) expect(text).toContain(r.hubRevision);
  });

  it("carries report.json's hubUrl only when contentRules allows its host, and src/mock/ never writes it otherwise", () => {
    const r = only(REPORT, "report.json");
    expect(report?.trained.hubUrl).toBe(onAllowedHost(r.hubUrl) ? r.hubUrl : undefined);
    if (typeof r.hubUrl === "string" && r.hubUrl && !onAllowedHost(r.hubUrl)) expect(source("model.ts")).not.toContain(r.hubUrl);
  });
});

describe("cft_01's text match", () => {
  it("is read from watch.ts: a number from 0 to 1 with at most two decimals, from the model the comment names", () => {
    const r = only(REPORT, "report.json");
    const hit = watchCandidates.find((c) => c.id === "cft_01");
    expect(hit?.pieceId).toBe("pc_01");
    const similarity = hit?.similarity ?? Number.NaN;
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
    expect(twoDecimals(similarity)).toBe(true);
    const text = source("watch.ts");
    expect(text).toContain(r.modelId);
    expect(text).toContain(r.fingerprint);
    expect(text).not.toMatch(/cft_01's similarity of [\d.]+ is illustrative/);
  });

  it("every listing's text match is the model's: 0 to 1 with at most two decimals, and none marked illustrative", () => {
    expect(watchCandidates.map((c) => c.id)).toEqual(["cft_01", "cft_02", "cft_03", "cft_04"]);
    for (const c of watchCandidates) {
      expect(c.similarity >= 0 && c.similarity <= 1, c.id).toBe(true);
      expect(twoDecimals(c.similarity), c.id).toBe(true);
    }
    expect(source("watch.ts")).not.toMatch(/illustrative/i);
  });
});

describe("the pooled grading", () => {
  it("unjudged.json covers the 50 eval queries, each in its own language", () => {
    const u = only(UNJUDGED, "unjudged.json");
    expect(u.queries.map((q) => q.queryId)).toEqual(searchEval.map((q) => q.id));
    for (const q of u.queries) expect(q.lang, q.queryId).toBe(searchEval.find((e) => e.id === q.queryId)?.lang);
  });

  it("every piece it lists is graded now or still ungraded, and never removed from the catalog", () => {
    const u = only(UNJUDGED, "unjudged.json");
    const catalog = new Set(pieces.map((p) => p.id));
    for (const q of u.queries) {
      const grades: SearchQuery["grades"] = searchEval.find((e) => e.id === q.queryId)?.grades ?? {};
      for (const pieceId of q.pieceIds) {
        expect(catalog.has(pieceId), `${q.queryId} ${pieceId}`).toBe(true);
        expect([undefined, 1, 2], `${q.queryId} ${pieceId}`).toContain(grades[pieceId]);
      }
    }
  });

  it("searchEval.ts's comment states what the pass added and left, and the grades agree", () => {
    const u = only(UNJUDGED, "unjudged.json");
    const listed = u.queries.flatMap((q) => q.pieceIds.map((pieceId) => [q.queryId, pieceId] as const));
    const graded = listed.filter(([id, pieceId]) => searchEval.find((e) => e.id === id)?.grades[pieceId] !== undefined);
    const comment = source("searchEval.ts").replace(/\n\/\/\s*/g, " ");
    const said = /listed (\d+) pieces.*?The pass added (\d+) grades, all 1s, over (\d+) queries, and left the other (\d+) ungraded/s.exec(comment);
    expect(said, "the pooled pass's counts in searchEval.ts").not.toBeNull();
    const [listedSaid, addedSaid, queriesSaid, leftSaid] = (said ?? []).slice(1).map(Number);
    expect(listed.length).toBe(listedSaid);
    expect(graded.length).toBe(addedSaid);
    expect(new Set(graded.map(([id]) => id)).size).toBe(queriesSaid);
    expect(listed.length - graded.length).toBe(leftSaid);
    // All 1s, as the comment says.
    for (const [id, pieceId] of graded) expect(searchEval.find((e) => e.id === id)?.grades[pieceId], `${id} ${pieceId}`).toBe(1);
  });
});
