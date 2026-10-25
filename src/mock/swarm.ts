// The scripted swarm runs (run_01 to run_10), the two fallback runs, the questions scripted mode
// answers and the maker question qst_01 with its answer ans_01. S3-catalog T1 stub: swarmRuns and
// demoQuestions are empty until T8 writes the ten runs. The two fallback runs are minimal
// placeholders (a reply with no steps, and a sample draft with no checks) that T8 completes, and
// qst_01 with ans_01 is the plan's exact record.
import type { Payloads } from "../core/events";
import type { Lang, MakerId, MakerQuestionId, PieceId, ScriptedRun, Text, ThreadId } from "../core/types";

/** Every scripted run, run_01 onward. T8 fills it. */
export const swarmRuns: ScriptedRun[] = [];

/** run_05: the reply when no scripted run matches a buyer's question (L16). It names no piece ID. */
export const fallbackSupportRun: ScriptedRun = {
  runId: "run_05",
  side: "buyer",
  threadId: "thr_00",
  trigger: { kind: "fallback" },
  steps: [],
  final: [
    {
      type: "support.answered",
      payload: {
        threadId: "thr_00",
        runId: "run_05",
        agentId: "writer",
        reply: {
          en: "In this demo, scripted answers cover the small grey, red and black wool weaving. Switch to Live to ask about this piece.",
          zh: "在本演示中，脚本回答只涵盖灰红黑三色小幅羊毛编织。切换到实时模式即可询问这件作品。",
        },
        refIds: [],
      },
    },
  ],
};

// T1 placeholder: T8 writes the real sample draft and its checks. The responder re-keys the listing
// ID to the request's own.
/** run_06: the draft shown when no scripted listing run matches, labeled as a sample. */
export const fallbackListingRun: ScriptedRun = {
  runId: "run_06",
  side: "seller",
  threadId: "thr_00",
  trigger: { kind: "fallback" },
  steps: [],
  final: [
    {
      type: "listing.drafted",
      payload: {
        listingId: "lst_00",
        makerId: "mkr_02",
        title: { en: "Sample listing", zh: "示例商品" },
        summary: { en: "A sample draft. Placeholder text.", zh: "示例草稿。占位文字。" },
        facets: { object: { en: "weaving", zh: "编织" }, materials: [], techniques: [], motifs: [], colors: [] },
        vibe: { moods: [], occasions: [], recipients: [] },
        checks: [],
      },
    },
  ],
};

/** A question the support drawer offers in scripted mode. Every entry has its own scripted run (D1-17). */
export interface DemoQuestion {
  side: "buyer" | "seller";
  text: Text;
}

/** The buyer's three (run_01, run_07, run_08), then the seller's two (run_04, run_10). T8 fills it. */
export const demoQuestions: DemoQuestion[] = [];

/** A question a buyer put to a maker, as the records hold it. getById() finds it by its ID. */
export interface MakerQuestion {
  id: MakerQuestionId;
  threadId: ThreadId;
  makerId: MakerId;
  pieceId: PieceId;
  text: string;
  lang: Lang;
}

/** A forwarded question with the maker's scripted answer, the question.answered payload the tour plays. */
export interface MakerQuestionEntry {
  question: MakerQuestion;
  answer: Payloads["question.answered"];
}

// The answer is a placeholder in the maker's voice for Gordon to edit. It holds no meaning, lineage
// or hardship.
export const makerQuestions: MakerQuestionEntry[] = [
  {
    question: {
      id: "qst_01",
      threadId: "thr_03",
      makerId: "mkr_01",
      pieceId: "pc_01",
      text: "What does the pattern on this weaving mean?",
      lang: "en",
    },
    answer: {
      questionId: "qst_01",
      answerId: "ans_01",
      makerId: "mkr_01",
      text: "I picked grey, red and black because I like how they sit together, and the stepped diamond is a shape I enjoy weaving. That's all there is to it.",
      lang: "en",
    },
  },
];
