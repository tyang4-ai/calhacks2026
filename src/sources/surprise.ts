// Surprise me (data-model.md, "The surprise draw"). B12's Python port draws exactly the same way, and
// its golden test is generated from mulberry32() and drawSurprise() here, so keep every step plain:
// one number from mulberry32(seed), times the total of the raw weights, then a plain loop over the
// candidates in order, landing on the first whose running total is above that number.
import type { Payloads, SurpriseMethod } from "../core/events";
import type { IndexEntry, Piece } from "../core/types";
import { activePieceIds, scoreKeywords } from "./keywordSearch";

/** The seeded generator: mulberry32, returning numbers from 0 (inclusive) to 1 (exclusive). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SurpriseRequest {
  keyword?: string;
  method: SurpriseMethod;
  seed: number;
}

export type SurpriseDraw = Omit<Payloads["surprise.drawn"], "surpriseId">;

/**
 * Draws one piece. Candidates: for keyword_random and fair_random with a keyword, the keyword's top
 * 12 from scoreKeywords (score, then pieceId). For pure_random, with no keyword, or when the keyword
 * matches nothing, every active piece in pieceId order. Raw weights are 1, or 1 / (1 + salesThisMonth)
 * for fair_random. The payload's weights are the raw weights over their total, unrounded, so they sum
 * to 1. Returns null when there is no piece to draw.
 */
export function drawSurprise(req: SurpriseRequest, index: IndexEntry[], pieces: Piece[]): SurpriseDraw | null {
  const keyword = req.keyword?.trim();
  let ids: string[] = [];
  if (req.method !== "pure_random" && keyword) {
    ids = scoreKeywords([keyword], {}, index, pieces).map((r) => r.pieceId);
  }
  if (ids.length === 0) ids = activePieceIds(index, pieces);
  if (ids.length === 0) return null;

  const sales = new Map(index.map((e) => [e.pieceId, e.salesThisMonth]));
  const raw = ids.map((id) => {
    if (req.method !== "fair_random") return 1;
    const n = sales.get(id);
    return 1 / (1 + (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0));
  });
  let total = 0;
  for (const w of raw) total += w;

  const r = mulberry32(req.seed)() * total;
  let pieceId = ids[ids.length - 1];
  let running = 0;
  for (let i = 0; i < ids.length; i += 1) {
    running += raw[i];
    if (r < running) {
      pieceId = ids[i];
      break;
    }
  }
  return {
    pieceId,
    method: req.method,
    seed: req.seed,
    candidates: ids.map((id, i) => ({ pieceId: id, weight: raw[i] / total })),
  };
}
