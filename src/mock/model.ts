// The search model's ID and its real report (S3-catalog T9, second pass).
//
// Copied from B11's real run, never edited: modelId cindia-embed-v1, fingerprint f7181c7ddb90af25,
// trained 2026-10-25T05:55:09Z and rescored by the eval-only rerun 2026-10-25T06:46:04Z (the
// evening of Saturday 2026-10-24, Pacific time), on the CPU. trained and scored are the fields of
// server/b11_embed/report.json that model.trained and proof.search_scored carry, and points are the
// map points of server/b11_embed/vectors.json, every number rounded to 4 decimals. The scores are
// the four systems on the 50 agent-written, held-out test queries, after the pooled grading pass.
// The model is published (hubRevision 5ad571384f2fbf37b82ee955ccbe418b7e480557), but trained has
// no hubUrl: data-model.md allows no URL in src/mock/ outside contentRules.allowedHosts, and the hub
// isn't one of them, so the link stays in report.json and model.trained's optional hubUrl is left out.
// tests/data/v2-model.test.ts checks every value here against the two files.
import type { ModelReport } from "../core/types";

export const modelId = "cindia-embed-v1";

export const report: ModelReport | null = {
  trained: {
    modelId: "cindia-embed-v1",
    baseModel: "intfloat/multilingual-e5-small",
    pairs: 1045,
    epochs: 3,
    dims: 384,
  },
  scored: {
    modelId: "cindia-embed-v1",
    k: 5,
    queries: 50,
    systems: [
      { system: "keyword", recallAtK: 0.7843, mrr: 0.8745 },
      { system: "base", recallAtK: 0.722, mrr: 0.7809 },
      { system: "custom", recallAtK: 0.7893, mrr: 0.8922 },
      { system: "hybrid", recallAtK: 0.8247, mrr: 0.94 },
    ],
  },
  points: [
    { pieceId: "pc_01", x: -0.0932, y: -0.3606 },
    { pieceId: "pc_02", x: -0.1947, y: 0.4673 },
    { pieceId: "pc_03", x: 0.0056, y: -0.2191 },
    { pieceId: "pc_04", x: 0.0619, y: -0.5003 },
    { pieceId: "pc_05", x: 0.0243, y: -0.248 },
    { pieceId: "pc_06", x: -0.0502, y: -0.1977 },
    { pieceId: "pc_07", x: -0.2454, y: -0.3402 },
    { pieceId: "pc_08", x: -0.0265, y: 0.1871 },
    { pieceId: "pc_09", x: -0.1096, y: 0.2475 },
    { pieceId: "pc_10", x: -0.2851, y: 0.5255 },
    { pieceId: "pc_11", x: -0.2716, y: -0.4711 },
    { pieceId: "pc_12", x: 0.0388, y: 0.2088 },
    { pieceId: "pc_13", x: -0.4634, y: 0.9016 },
    { pieceId: "pc_14", x: -0.6351, y: 0.6164 },
    { pieceId: "pc_15", x: -0.1838, y: 0.599 },
    { pieceId: "pc_16", x: -0.479, y: 0.9163 },
    { pieceId: "pc_17", x: -0.2172, y: 0.3005 },
    { pieceId: "pc_18", x: -0.4293, y: 0.8609 },
    { pieceId: "pc_19", x: -0.1104, y: 0.5318 },
    { pieceId: "pc_20", x: -0.2967, y: 0.7476 },
    { pieceId: "pc_21", x: -0.3403, y: 0.3306 },
    { pieceId: "pc_22", x: -0.6222, y: 0.7951 },
    { pieceId: "pc_23", x: -0.4549, y: 0.769 },
    { pieceId: "pc_24", x: -0.4227, y: 0.5867 },
    { pieceId: "pc_25", x: -0.2092, y: 0.4475 },
    { pieceId: "pc_26", x: -0.2699, y: 0.5196 },
    { pieceId: "pc_27", x: 0.9449, y: 0.0142 },
    { pieceId: "pc_28", x: 0.7878, y: -0.2244 },
    { pieceId: "pc_29", x: 0.7948, y: 0.1783 },
    { pieceId: "pc_30", x: 0.9499, y: 0.0569 },
    { pieceId: "pc_31", x: 0.9225, y: 0.1416 },
    { pieceId: "pc_32", x: 0.8807, y: -0.0683 },
    { pieceId: "pc_33", x: 0.7119, y: -0.1613 },
    { pieceId: "pc_34", x: 0.9443, y: 0.0685 },
    { pieceId: "pc_35", x: 0.9205, y: -0.0935 },
    { pieceId: "pc_36", x: 0.5253, y: 0.0483 },
    { pieceId: "pc_37", x: 0.9686, y: 0.1945 },
    { pieceId: "pc_38", x: 1, y: -0.1007 },
    { pieceId: "pc_39", x: 0.9254, y: -0.1026 },
    { pieceId: "pc_40", x: 0.9132, y: 0.2112 },
    { pieceId: "pc_41", x: -0.2541, y: -0.9189 },
    { pieceId: "pc_42", x: -0.5533, y: -0.372 },
    { pieceId: "pc_43", x: -0.4842, y: -0.9234 },
    { pieceId: "pc_44", x: -0.433, y: -0.4486 },
    { pieceId: "pc_45", x: -0.6309, y: -0.4736 },
    { pieceId: "pc_46", x: -0.1105, y: -0.6847 },
    { pieceId: "pc_47", x: -0.2224, y: -0.59 },
    { pieceId: "pc_48", x: -0.3532, y: -0.7614 },
    { pieceId: "pc_49", x: -0.5924, y: -0.8029 },
    { pieceId: "pc_50", x: -0.4797, y: -0.4442 },
    { pieceId: "pc_51", x: -0.3989, y: -0.3644 },
    { pieceId: "pc_52", x: -0.3733, y: -0.8541 },
    { pieceId: "pc_53", x: -0.4322, y: -0.4186 },
    { pieceId: "pc_54", x: -0.592, y: -0.3274 },
  ],
};
