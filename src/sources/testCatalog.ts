// A small fake catalog, index, set of runs and scan for the responder and helper tests. It stands
// in for src/mock/ (S3-catalog fills the real one), so these tests never depend on the real data.
// Only tests import it. Figures 11 and 12 are rebuilt on it with the same words and sales counts.
import type { Payloads } from "../core/events";
import type {
  Approval,
  CounterfeitCandidate,
  DemoSearch,
  FollowUp,
  IndexEntry,
  ModelReport,
  Piece,
  ScriptedRun,
  ScriptedScan,
  WorkInProgress,
} from "../core/types";
import { keywordVocab, type KeywordVocab } from "./keywordSearch";
import type { MockAnswers } from "./requests";

interface PieceSpec {
  id: string;
  communityId: string;
  makerId: string;
  priceCents: number;
  object: string;
  materials?: string[];
  techniques?: string[];
  motifs?: string[];
  colors?: string[];
  moods?: string[];
  occasions?: string[];
  recipients?: string[];
  sales?: number;
  status?: "active" | "draft";
}

const SPECS: PieceSpec[] = [
  { id: "pc_01", communityId: "com_dine", makerId: "mkr_01", priceCents: 18000, object: "wall weaving", materials: ["wool"], techniques: ["handwoven"], motifs: ["diamond", "step"], colors: ["grey", "red", "black"], moods: ["warm", "bold"], occasions: ["birthday"], recipients: ["gift for mom"], sales: 1 },
  { id: "pc_03", communityId: "com_dine", makerId: "mkr_03", priceCents: 120000, object: "rug", materials: ["wool"], techniques: ["handwoven"], colors: ["red", "brown"], moods: ["warm", "bold"], recipients: ["gift for mom"], sales: 1 },
  { id: "pc_07", communityId: "com_dine", makerId: "mkr_02", priceCents: 4800, object: "wall weaving", materials: ["wool"], techniques: ["handwoven"], motifs: ["stripe"], colors: ["red", "grey"], moods: ["warm"], recipients: ["gift for mom"], sales: 4 },
  { id: "pc_11", communityId: "com_dine", makerId: "mkr_02", priceCents: 17500, object: "wall weaving", materials: ["wool"], techniques: ["handwoven"], motifs: ["stripe", "diamond"], colors: ["red", "white"], moods: ["bold"], recipients: ["gift for mom"], sales: 2 },
  { id: "pc_13", communityId: "com_ojibwe", makerId: "mkr_04", priceCents: 4500, object: "earrings", materials: ["glass beads"], techniques: ["beadwork"], motifs: ["flower"], colors: ["blue", "white"], moods: ["calm"], recipients: ["gift for a friend"], sales: 2 },
  { id: "pc_14", communityId: "com_ojibwe", makerId: "mkr_04", priceCents: 5500, object: "earrings", materials: ["glass beads", "leather"], techniques: ["beadwork"], motifs: ["flower", "leaf"], colors: ["red", "green"], moods: ["bold", "bright"], recipients: ["gift for mom", "gift for a friend"], sales: 3 },
  { id: "pc_20", communityId: "com_ojibwe", makerId: "mkr_06", priceCents: 9000, object: "pouch", materials: ["glass beads"], techniques: ["beadwork"], colors: ["blue"], moods: ["calm"], occasions: ["everyday"], recipients: ["for myself"], sales: 1 },
  { id: "pc_27", communityId: "com_acoma", makerId: "mkr_09", priceCents: 30000, object: "jar", materials: ["clay"], techniques: ["coil built"], motifs: ["geometric"], colors: ["black", "white"], moods: ["quiet"], recipients: ["for myself"], sales: 4 },
  { id: "pc_30", communityId: "com_acoma", makerId: "mkr_10", priceCents: 16000, object: "seed pot", materials: ["clay"], techniques: ["coil built"], motifs: ["geometric", "fine line"], colors: ["black", "orange", "white"], moods: ["warm", "bold"], recipients: ["gift for mom"], sales: 3 },
  { id: "pc_32", communityId: "com_acoma", makerId: "mkr_10", priceCents: 22000, object: "bowl", materials: ["clay"], techniques: ["coil built"], motifs: ["geometric"], colors: ["black"], moods: ["quiet"], sales: 2 },
  { id: "pc_35", communityId: "com_acoma", makerId: "mkr_11", priceCents: 45000, object: "jar", materials: ["clay"], techniques: ["coil built"], motifs: ["geometric"], colors: ["white"], moods: ["calm"], sales: 5 },
  { id: "pc_38", communityId: "com_acoma", makerId: "mkr_12", priceCents: 38000, object: "jar", materials: ["clay"], techniques: ["coil built"], motifs: ["geometric"], colors: ["black", "white"], moods: ["quiet"], sales: 0 },
  { id: "pc_42", communityId: "com_seminole", makerId: "mkr_14", priceCents: 26000, object: "skirt", materials: ["cotton"], techniques: ["patchwork"], motifs: ["geometric"], colors: ["blue"], moods: ["playful"], sales: 3 },
  { id: "pc_43", communityId: "com_seminole", makerId: "mkr_14", priceCents: 19000, object: "skirt", materials: ["cotton", "rickrack"], techniques: ["patchwork"], motifs: ["stripe", "zigzag"], colors: ["red", "yellow", "black"], moods: ["warm", "bright"], recipients: ["gift for mom"], sales: 2 },
  { id: "pc_45", communityId: "com_seminole", makerId: "mkr_15", priceCents: 31000, object: "jacket", materials: ["cotton"], techniques: ["patchwork"], motifs: ["geometric"], colors: ["green"], moods: ["cheerful"], sales: 2 },
  { id: "pc_48", communityId: "com_seminole", makerId: "mkr_16", priceCents: 28000, object: "skirt", materials: ["cotton"], techniques: ["patchwork"], motifs: ["geometric"], colors: ["yellow"], moods: ["bright"], sales: 4 },
  { id: "pc_51", communityId: "com_seminole", makerId: "mkr_17", priceCents: 34000, object: "jacket", materials: ["cotton"], techniques: ["patchwork"], motifs: ["geometric"], colors: ["purple"], moods: ["elegant"], sales: 1 },
  // A draft is in the index but never searched or drawn.
  { id: "pc_55", communityId: "com_dine", makerId: "mkr_02", priceCents: 9000, object: "wall weaving", materials: ["wool"], colors: ["red"], moods: ["warm", "bold"], recipients: ["gift for mom"], status: "draft" },
];

function piece(s: PieceSpec): Piece {
  return {
    id: s.id,
    title: { en: `Test ${s.object} ${s.id}`, zh: `测试${s.id}` },
    makerId: s.makerId,
    kind: "series",
    hours: 10,
    materialsCents: 1000,
    priceCents: s.priceCents,
    story: { en: "A test piece.", zh: "测试作品。" },
    heritage: { en: "Test craft.", zh: "测试手艺。" },
    process: [{ step: { en: "Make", zh: "制作" }, hours: 10 }],
    image: `/images/${s.id}.svg`,
    communityId: s.communityId,
    facets: {
      object: { en: s.object, zh: s.object },
      materials: s.materials ?? [],
      techniques: s.techniques ?? [],
      motifs: s.motifs ?? [],
      colors: s.colors ?? [],
      oneOfAKind: false,
      leadTimeDays: 3,
    },
    vibe: { moods: s.moods ?? [], occasions: s.occasions ?? [], recipients: s.recipients ?? [] },
    imageAlt: { en: `A test ${s.object}`, zh: "测试图片" },
  };
}

export const TEST_PIECES: Piece[] = SPECS.map(piece);

export const TEST_INDEX: IndexEntry[] = SPECS.map((s) => ({
  pieceId: s.id,
  communityId: s.communityId,
  makerId: s.makerId,
  storefrontSlug: "test-store",
  provenance: { facts: "maker", culture: "community", vibe: "agent:tagger", picture: "agent:describer" },
  approvedBy: s.makerId,
  pictureNote: { en: "A test picture.", zh: "测试图片。" },
  embedText: `passage: ${s.object}`,
  salesThisMonth: s.sales ?? 0,
  status: s.status ?? "active",
}));

export const TEST_ALIASES: Record<string, string> = { mom: "gift for mom", mother: "gift for mom", dad: "gift for dad" };

export const TEST_VOCAB: KeywordVocab = keywordVocab(TEST_INDEX, TEST_ALIASES, TEST_PIECES);

export const FIG11_TEXT = "a warm, bold gift for my mom. she loves red wool. under $200";
export const FIG11_KEYWORDS = ["warm", "bold", "red", "wool", "gift for mom", "under $200"];

/** The scripted answer the tour plays, marked so a test can tell it from the scorer's. */
export const TEST_DEMO_SEARCH: DemoSearch = {
  query: { text: FIG11_TEXT, keywords: FIG11_KEYWORDS, lang: "en", filters: { maxPriceCents: 20000 } },
  answer: {
    results: [{ pieceId: "pc_01", score: 1, matched: ["warm", "bold", "red", "wool", "gift for mom"], reason: { en: "The demo answer", zh: "演示回答" } }],
    engine: "keyword_scripted",
  },
};

export const ANS_01_TEXT = "I picked grey, red and black because I like how they sit together.";
export const D04_TEXT = "Did the maker weave this herself? Can it arrive by October 10?";
export const MEANING_TEXT = "What does the pattern on this weaving mean?";
export const PAYOUT_TEXT = "When do I get paid for September?";
export const LST_01_NOTES = "New small weaving, about 30 by 40 cm. Store-bought wool yarn in red, grey and white.";
export const L16: { en: string; zh: string } = {
  en: "In this demo, scripted answers cover the small grey, red and black wool weaving. Switch to Live to ask about this piece.",
  zh: "在本演示中，脚本回答只涵盖灰红黑三色小幅羊毛编织。切换到实时模式即可询问这件作品。",
};

const norm = (s: string) => s.toLowerCase().replace(/[\p{P}]/gu, "").replace(/\s+/g, " ").trim();

function step(runId: string, n: number, agentId: string, kind: Payloads["swarm.step"]["kind"]): Omit<Payloads["swarm.step"], "threadId"> {
  return { runId, stepId: `stp_${String(n).padStart(4, "0")}`, agentId, kind, summary: { en: `${agentId} ${kind}`, zh: `${agentId} ${kind}` }, ms: 400 };
}

export const TEST_RUNS: ScriptedRun[] = [
  {
    runId: "run_01",
    side: "buyer",
    threadId: "thr_01",
    trigger: { kind: "support", matches: [norm(D04_TEXT), "这位匠人亲手织的吗能在10月10日前送到吗"], pieceId: "pc_01" },
    steps: [step("run_01", 1, "cindy", "route"), step("run_01", 2, "steward", "check"), step("run_01", 3, "writer", "reply")],
    final: [
      {
        type: "support.answered",
        payload: { threadId: "thr_01", runId: "run_01", agentId: "writer", reply: { en: "The co-op attests that Grace N. wove this herself.", zh: "合作社证明这件作品由 Grace N. 亲手织成。" }, refIds: ["pc_01", "com_dine", "mkr_01", "pol_01"] },
      },
    ],
  },
  {
    runId: "run_02",
    side: "seller",
    threadId: "lst_01",
    trigger: { kind: "listing", listingId: "lst_01", notes: LST_01_NOTES },
    steps: [step("run_02", 11, "cindy", "route"), step("run_02", 12, "lister", "result")],
    final: [
      {
        type: "listing.drafted",
        payload: {
          listingId: "lst_01",
          makerId: "mkr_02",
          title: { en: "Small red, grey and white wool weaving", zh: "红灰白三色小幅羊毛编织" },
          summary: { en: "A small weaving.", zh: "一件小幅编织。" },
          facets: { object: { en: "wall weaving", zh: "壁挂编织" }, materials: ["wool"], techniques: ["handwoven"], motifs: ["zigzag"], colors: ["red", "grey", "white"] },
          hours: 20,
          vibe: { moods: ["warm"], occasions: [], recipients: [] },
          checks: [
            { checkId: "chk_01", kind: "protocol", ok: true, note: { en: "Fine.", zh: "没问题。" } },
            { checkId: "chk_02", kind: "facts", ok: false, note: { en: "Planted test.", zh: "预设测试。" } },
          ],
        },
      },
      { type: "listing.indexed", payload: { listingId: "lst_01", pieceId: "pc_55", modelId: "cindia-embed-v1", embedText: "passage: wall weaving", index: "cindia-drafts", point: { x: 0.1, y: 0.2 }, approx: true } },
      { type: "approval.requested", payload: { approvalId: "apr_04" } },
    ],
  },
  {
    runId: "run_03",
    side: "seller",
    threadId: "sto_01",
    trigger: { kind: "storefront", storefrontId: "sto_01" },
    steps: [step("run_03", 21, "cindy", "route"), step("run_03", 22, "designer", "tool"), step("run_03", 23, "designer", "result")],
    final: [
      {
        type: "storefront.drafted",
        payload: {
          storefrontId: "sto_01",
          blocks: [
            { blockId: "blk_30", kind: "hero", props: { tagline: "Wool weavings" } },
            { blockId: "blk_31", kind: "pieces", props: { pieceIds: ["pc_01", "pc_07"] } },
          ],
        },
      },
    ],
  },
  {
    runId: "run_04",
    side: "seller",
    threadId: "thr_02",
    trigger: { kind: "support", matches: [norm(PAYOUT_TEXT)], makerId: "mkr_01" },
    steps: [step("run_04", 31, "cindy", "route"), step("run_04", 32, "bookkeeper", "result")],
    final: [{ type: "support.answered", payload: { threadId: "thr_02", runId: "run_04", agentId: "writer", reply: { en: "Your payout went out on Oct 2.", zh: "您的结款已于10月2日发放。" }, refIds: ["mpo_01"] } }],
  },
  {
    runId: "run_07",
    side: "buyer",
    threadId: "thr_03",
    trigger: { kind: "support", matches: [norm(MEANING_TEXT)], pieceId: "pc_01" },
    steps: [step("run_07", 41, "cindy", "route"), step("run_07", 42, "steward", "check")],
    final: [
      {
        type: "support.answered",
        payload: { threadId: "thr_03", runId: "run_07", agentId: "writer", reply: { en: "Our records don't say, so I'll ask Grace N.", zh: "我们的记录里没有答案，我会去问 Grace N.。" }, refIds: ["pc_01", "qst_01"] },
      },
      { type: "question.forwarded", payload: { questionId: "qst_01", threadId: "thr_03", makerId: "mkr_01", pieceId: "pc_01", text: MEANING_TEXT, lang: "en" } },
    ],
  },
  {
    runId: "run_09",
    side: "buyer",
    threadId: "thr_03",
    trigger: { kind: "question", questionId: "qst_01" },
    steps: [step("run_09", 51, "cindy", "route")],
    final: [
      {
        type: "support.answered",
        payload: {
          threadId: "thr_03",
          runId: "run_09",
          agentId: "writer",
          reply: { en: `Grace N. answered in her own words: "${ANS_01_TEXT}"`, zh: "Grace N. 的回答（Cindy的翻译）：我选了灰、红、黑三色。" },
          refIds: ["qst_01", "ans_01", "mkr_01"],
        },
      },
    ],
  },
];

export const TEST_FALLBACK_SUPPORT: ScriptedRun = {
  runId: "run_05",
  side: "buyer",
  threadId: "thr_00",
  trigger: { kind: "fallback" },
  steps: [step("run_05", 61, "cindy", "route"), step("run_05", 62, "writer", "reply")],
  final: [{ type: "support.answered", payload: { threadId: "thr_00", runId: "run_05", agentId: "writer", reply: L16, refIds: [] } }],
};

export const TEST_FALLBACK_LISTING: ScriptedRun = {
  runId: "run_06",
  side: "seller",
  threadId: "thr_00",
  trigger: { kind: "fallback" },
  steps: [step("run_06", 71, "cindy", "route")],
  final: [
    {
      type: "listing.drafted",
      payload: {
        listingId: "lst_00",
        makerId: "mkr_02",
        title: { en: "Sample listing", zh: "示例商品" },
        summary: { en: "A sample draft.", zh: "示例草稿。" },
        facets: { object: { en: "weaving", zh: "编织" }, materials: [], techniques: [], motifs: [], colors: [] },
        vibe: { moods: [], occasions: [], recipients: [] },
        checks: [{ checkId: "chk_09", kind: "facts", ok: true, note: { en: "Sample.", zh: "示例。" } }],
      },
    },
  ],
};

export const TEST_CANDIDATES: CounterfeitCandidate[] = [
  { id: "cft_01", url: "/market/listing-01.html", title: "Grace N. wool weaving, grey red black", snippet: "A small weaving.", pieceId: "pc_01", similarity: 0.91, claim: { en: "Says Grace N. wove it.", zh: "声称是 Grace N. 织的。" }, verdict: "possible_copy" },
  { id: "cft_02", url: "/market/listing-02.html", title: "Native American made wool rug", snippet: "A rug.", pieceId: "pc_01", similarity: 0.62, claim: { en: "Claims to be Native American made.", zh: "声称是美洲原住民手作。" }, verdict: "claim_only" },
  { id: "cft_03", url: "/market/listing-03.html", title: "Machine-woven throw", snippet: "Factory made.", pieceId: "pc_01", similarity: 0.8, claim: { en: "Makes no claim.", zh: "没有声称。" }, verdict: "neither" },
  { id: "cft_04", url: "/market/listing-04.html", title: "Grey wool blanket", snippet: "A blanket.", pieceId: "pc_01", similarity: 0.3, claim: { en: "Makes no claim.", zh: "没有声称。" }, verdict: "neither" },
];

export const TEST_SCAN: ScriptedScan = { scanId: "wsc_01", makerId: "mkr_01", queries: ["Diné Weaving and Silver Co-op"], cftIds: ["cft_01"], followUpId: "fup_02", approvalId: "apr_03" };

const approval = (id: string, kind: Approval["kind"], subjectIds: string[], amountCents?: number): Approval => ({
  id,
  kind,
  subjectIds,
  proposedBy: "cindy",
  ...(amountCents !== undefined ? { amountCents } : {}),
  overLimit: false,
  decisionDate: "2026-10-01",
  status: "pending",
});

export const TEST_APPROVALS: Approval[] = [
  approval("apr_01", "follow_up", ["flg_01"], 34000),
  approval("apr_02", "maker_payouts", ["mpo_01", "mpo_02", "mpo_03"]),
  approval("apr_03", "report_listing", ["cft_01"]),
  approval("apr_04", "listing_publish", ["lst_01"]),
  approval("apr_05", "milestone_release", ["wip_01", "mls_02"], 36000),
];

export const TEST_FOLLOW_UPS: FollowUp[] = [
  { id: "fup_01", approvalId: "apr_01", to: { en: "Gallery", zh: "画廊" }, subject: { en: "September", zh: "九月" }, body: { en: "Short by $340.", zh: "少付340美元。" } },
  { id: "fup_02", approvalId: "apr_03", to: { en: "Trust team", zh: "信任团队" }, subject: { en: "A listing to review", zh: "待核查的商品" }, body: { en: "Please review.", zh: "请核查。" } },
];

export const TEST_WIPS: WorkInProgress[] = [
  {
    id: "wip_01",
    communityId: "com_dine",
    makerId: "mkr_01",
    buyerId: "buy_02",
    title: { en: "A commissioned rug", zh: "委托地毯" },
    priceCents: 120000,
    milestones: [
      { milestoneId: "mls_01", label: { en: "Design", zh: "设计" }, shareBps: 3000, status: "paid", date: "2026-09-10" },
      { milestoneId: "mls_02", label: { en: "Half woven", zh: "织到一半" }, shareBps: 3000, status: "pending" },
      { milestoneId: "mls_03", label: { en: "Finished", zh: "完成" }, shareBps: 4000, status: "pending" },
    ],
  },
];

export const TEST_SPLITS: Record<string, Payloads["split.shown"]> = {
  pc_01: { pieceId: "pc_01", grossCents: 18000, cardFeeCents: 552, platformFeeCents: 1800, materialsCents: 2200, makerShareCents: 13448, compare: { channelId: "ch_gallery", commissionBps: 4000, makerShareCents: 8600 } },
  pc_13: { pieceId: "pc_13", grossCents: 4500, cardFeeCents: 161, platformFeeCents: 450, materialsCents: 1000, makerShareCents: 2889 },
};

export const TEST_REPORT: ModelReport = {
  trained: { modelId: "cindia-embed-v1", baseModel: "test-base", pairs: 10, epochs: 1, dims: 8 },
  scored: { modelId: "cindia-embed-v1", k: 5, queries: 50, systems: [{ system: "keyword", recallAtK: 0.5, mrr: 0.4 }] },
  points: TEST_PIECES.map((p, i) => ({ pieceId: p.id, x: i, y: 2 * i })),
};

/** The whole fake src/mock/ the responder reads. */
export function testMock(overrides: Partial<MockAnswers> = {}): MockAnswers {
  return {
    pieces: TEST_PIECES,
    searchIndex: TEST_INDEX,
    keywordAliases: TEST_ALIASES,
    demoSearch: TEST_DEMO_SEARCH,
    swarmRuns: TEST_RUNS,
    fallbackSupportRun: TEST_FALLBACK_SUPPORT,
    fallbackListingRun: TEST_FALLBACK_LISTING,
    makerQuestions: [{ answer: { questionId: "qst_01", answerId: "ans_01", makerId: "mkr_01", text: ANS_01_TEXT, lang: "en" } }],
    counterfeitCandidates: TEST_CANDIDATES,
    scriptedScan: TEST_SCAN,
    report: null,
    modelId: "cindia-embed-v1",
    splits: TEST_SPLITS,
    worksInProgress: TEST_WIPS,
    allApprovals: TEST_APPROVALS,
    allFollowUps: TEST_FOLLOW_UPS,
    ...overrides,
  };
}
