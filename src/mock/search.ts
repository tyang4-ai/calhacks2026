// The tour's vibe search (figure 11) and its surprise draw (figure 12). S3-catalog T1 stub: the
// query and the draw's inputs are the plan's exact values, but the six results and the nine weighted
// candidates stay empty until T6 gets them from the real scorer and the real draw.
import type { DemoSearch, DemoSurprise } from "../core/types";

export const demoSearch: DemoSearch = {
  query: {
    text: "a warm, bold gift for my mom. she loves red wool. under $200",
    keywords: ["warm", "bold", "red", "wool", "gift for mom", "under $200"],
    lang: "en",
    filters: { maxPriceCents: 20000 },
  },
  answer: { results: [], engine: "keyword_scripted" },
};

export const demoSurprise: DemoSurprise = {
  ask: { keyword: "geometric", method: "fair_random", seed: 10 },
  draw: { pieceId: "pc_38", method: "fair_random", seed: 10, candidates: [] },
};
