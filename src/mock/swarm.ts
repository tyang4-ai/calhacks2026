// The scripted swarm runs, run_01 to run_10 (data-model.md, The scripted runs; S3-catalog T8), the
// two fallback runs among them, the questions scripted mode answers, and the maker question qst_01
// with Grace N.'s scripted answer ans_01.
//
// DEMO DATA. Each run is what the agent swarm would do for one request, played by the scripted
// responder (src/sources/requests.ts and scriptedSwarm.ts) and, for run_01 and run_02, by the tour.
// Every step names a roster agent (agents.ts), uses only that agent's tools, and carries the
// agent's model from the roster, with none for code agents, check steps and arrival_window, which
// the run calls as code for the Clerk so no model does date arithmetic (contracts section 6).
// Step IDs run stp_0001 onward across the runs in run order, and check IDs chk_01 onward.
//
// Every amount, date and piece in a reply is computed from the records here, never typed:
// run_01's arrival dates from the demo order's date, pc_01's lead time and pol_01's transit days,
// run_04's and run_10's figures from mpo_01, mst_01 and flg_01, and run_08's pieces from the catalog.
//
// The tour plays run_01's steps inside 87.6 to 95.5 s and run_02's inside 121.0 to 126.0 s, keeping
// each step's ms as the gap to the next (I2-tour), so run_01's first nine steps sum to at most 7900
// and run_02's first six to at most 5000.
import type { Payloads } from "../core/events";
import type { Lang, MakerId, MakerQuestionId, Piece, PieceId, ScriptedRun, StorefrontBlock, Text, ThreadId } from "../core/types";
import { getAgent } from "./agents";
import { pieces } from "./catalog";
import { communities } from "./communities";
import { listings } from "./listings";
import { galleryFlag, makerPayouts, makerStatements, orders } from "./month";
import { modelId, report } from "./model";
import { allMakers, owner } from "./people";
import { policy } from "./policy";
import { storefronts } from "./storefronts";
import { shortDate, usd } from "./util";

// ---------------------------------------------------------------------------------------------
// The records the runs read.

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`swarm.ts needs ${what}`);
  return value;
}

const piece = (id: PieceId): Piece => need(pieces.find((p) => p.id === id), id);
const maker = (id: MakerId) => need(allMakers.find((m) => m.id === id), id);
const communityOf = (p: Piece) => need(communities.find((c) => c.id === p.communityId), `${p.id}'s community`);

const pc01 = piece("pc_01");
const grace = maker(pc01.makerId);
const coop = communityOf(pc01);
const shipping = need(policy.find((t) => t.id === "pol_01"), "pol_01");
const demoOrder = need(orders.find((o) => o.id === "ord_001"), "ord_001");
const lst01 = need(listings.find((l) => l.id === "lst_01"), "lst_01");
const lena = maker(lst01.makerId);
const sto01 = need(storefronts.find((s) => s.id === coop.storefrontId), coop.storefrontId);
const mpo01 = need(makerPayouts.find((m) => m.makerId === grace.id), `${grace.id}'s maker payout`);
const mst01 = need(makerStatements.find((m) => m.makerId === grace.id), `${grace.id}'s maker statement`);

/** Lowercases a title's first letter, for a title inside a sentence. */
const inSentence = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Ends a sentence on a word, without doubling the period of a name like "Grace N.". */
const endSentence = (s: string) => (s.endsWith(".") ? s : `${s}.`);

/**
 * The text a support trigger matches: trimmed, lowercased, punctuation removed and spaces collapsed,
 * the same normalization the scripted responder applies to a typed question.
 */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\p{P}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const matches = (q: Text) => [normalize(q.en), normalize(q.zh)];

// ---------------------------------------------------------------------------------------------
// Dates, without the Date object: the demo's dates are all in September and October 2026.

const DAYS_IN_MONTH_2026 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function addDays(iso: string, days: number): string {
  let [y, m, d] = iso.split("-").map(Number);
  d += days;
  while (d > DAYS_IN_MONTH_2026[m - 1]) {
    d -= DAYS_IN_MONTH_2026[m - 1];
    m += 1;
  }
  if (y !== 2026 || m > 12) throw new Error(`date outside 2026: ${iso} + ${days}`);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------------------------
// Steps.

type Step = ScriptedRun["steps"][number];
type StepKind = Step["kind"];

/** Tools a run calls as code for an agent, so the step carries no model (contracts section 6). */
const CODE_TOOLS = new Set(["arrival_window"]);

let nextStep = 1;

/** One step, numbered stp_0001 onward in the order the runs below are built. */
function step(runId: string, agentId: string, kind: StepKind, ms: number, summary: Text, toolName?: string): Step {
  const agent = need(getAgent(agentId), `the roster agent ${agentId}`);
  const usesModel = agent.kind === "claude" && kind !== "check" && !(toolName && CODE_TOOLS.has(toolName));
  return {
    runId,
    stepId: `stp_${String(nextStep++).padStart(4, "0")}`,
    agentId,
    kind,
    summary,
    ...(toolName ? { toolName } : {}),
    ms,
    ...(usesModel && agent.model ? { model: agent.model } : {}),
  };
}

const writerReply = (runId: string, ms: number, summary: Text) => step(runId, "writer", "reply", ms, summary);

const answered = (runId: string, threadId: ThreadId, reply: Text, refIds: string[]): Payloads["support.answered"] => ({
  threadId,
  runId,
  agentId: "writer",
  reply,
  refIds,
});

// ---------------------------------------------------------------------------------------------
// The questions. Each has its own run below, and demoQuestions lists the five the drawer offers.

const Q_D04: Text = {
  en: "Did the maker weave this herself? Can it arrive by October 10?",
  zh: "这是匠人亲手织的吗？能在10月10日前送到吗？",
};
const Q_MEANING: Text = { en: "What does the pattern on this weaving mean?", zh: "这件编织上的图案是什么意思？" };
const Q_FIND: Text = { en: "Anything like this under $100?", zh: "有没有100美元以内、类似这件的作品？" };
const Q_PAYOUT: Text = { en: "When do I get paid for September?", zh: "我9月的结款什么时候发？" };
const Q_HELD: Text = { en: "Why is part of my September pay held?", zh: "为什么我9月的报酬有一部分暂缓发放？" };

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
      makerId: grace.id,
      pieceId: pc01.id,
      text: Q_MEANING.en,
      lang: "en",
    },
    answer: {
      questionId: "qst_01",
      answerId: "ans_01",
      makerId: grace.id,
      text: "I picked grey, red and black because I like how they sit together, and the stepped diamond is a shape I enjoy weaving. That's all there is to it.",
      lang: "en",
    },
  },
];
const qst01 = makerQuestions[0];

// ---------------------------------------------------------------------------------------------
// run_01, the d04 question: who wove pc_01, and can it arrive by Oct 10?

/** The line the Steward quotes from the co-op's record: pc_01's maker and the co-op, as the records name them. */
const COOP_RECORD_LINE: Text = {
  en: `Maker: ${grace.name.en}, ${coop.name.en}.`,
  zh: `匠人：${grace.name.zh}，${coop.name.zh}。`,
};

// The arrival window: an order on the demo order's day ships within pc_01's lead time and arrives in
// pol_01's transit window.
const orderDay = demoOrder.date;
const leadDays = pc01.facets.leadTimeDays;
const shipBy = addDays(orderDay, leadDays);
const arriveFrom = addDays(shipBy, Number(shipping.data?.transitDaysMin));
const arriveBy = addDays(shipBy, Number(shipping.data?.transitDaysMax));
const WANTED_BY = "2026-10-10";
if (!(arriveBy < WANTED_BY)) throw new Error(`run_01: pc_01 arrives by ${arriveBy}, not before ${WANTED_BY}`);
const D = { order: shortDate(orderDay), ship: shortDate(shipBy), from: shortDate(arriveFrom), by: shortDate(arriveBy), wanted: shortDate(WANTED_BY) };

/** L15, word for word, with the piece's maker named. */
const L15: Text = {
  en: `The co-op attests that ${grace.name.en} wove this herself. That's the co-op's record. Cindia hasn't checked it independently.`,
  zh: `合作社证明这件作品由 ${grace.name.zh} 亲手织成。这是合作社的记录。Cindia尚未独立核实。`,
};

const run01: ScriptedRun = {
  runId: "run_01",
  side: "buyer",
  threadId: "thr_01",
  trigger: { kind: "support", matches: matches(Q_D04), pieceId: pc01.id },
  steps: [
    step("run_01", "cindy", "route", 500, { en: "Routing the question to Intake.", zh: "把问题交给接待。" }),
    step("run_01", "intake", "result", 800, {
      en: `Authenticity and delivery for ${pc01.id}, by ${D.wanted.en}, in English.`,
      zh: `关于${pc01.id}的真伪和配送，${D.wanted.zh}前送达，英文。`,
    }),
    step("run_01", "cindy", "call", 400, {
      en: "Calling the Steward for authenticity and the Clerk for delivery.",
      zh: "请文化与认证核对真伪，请订单核对配送。",
    }),
    step("run_01", "steward", "tool", 900, { en: "Reading the co-op's verification record.", zh: "查阅合作社的认证记录。" }, "verification_record"),
    step("run_01", "steward", "result", 1300, {
      en: `The co-op attests that ${grace.name.en} made ${pc01.id}. Its record reads: "${COOP_RECORD_LINE.en}"`,
      zh: `合作社证明${pc01.id}由 ${grace.name.zh} 制作。记录原文：“${COOP_RECORD_LINE.zh}”`,
    }),
    // A1-7: the check the tour shows beside the open drawer.
    step("run_01", "steward", "check", 500, {
      en: "Quote found word for word in the co-op's record.",
      zh: "在合作社的记录中逐字找到了这句引文。",
    }),
    step("run_01", "clerk", "tool", 600, { en: `Reading the shipping policy (${shipping.id}).`, zh: `查阅配送政策（${shipping.id}）。` }, "policy"),
    step(
      "run_01",
      "clerk",
      "tool",
      400,
      {
        en: `arrival_window: ships by ${D.ship.en}, arrives ${D.from.en} to ${D.by.en}.`,
        zh: `arrival_window：${D.ship.zh}前发出，${D.from.zh}至${D.by.zh}送达。`,
      },
      "arrival_window",
    ),
    step("run_01", "clerk", "result", 1200, {
      en: `An order on ${D.order.en} ships within ${leadDays} days and arrives ${D.from.en} to ${D.by.en}, before ${D.wanted.en}.`,
      zh: `${D.order.zh}下单，${leadDays}天内发出，${D.from.zh}至${D.by.zh}送达，早于${D.wanted.zh}。`,
    }),
    writerReply("run_01", 1400, { en: "Writing the reply in English, with the co-op's words and the dates.", zh: "用英文撰写回复，附上合作社的原话和日期。" }),
  ],
  final: [
    {
      type: "support.answered",
      payload: answered(
        "run_01",
        "thr_01",
        {
          en: `${L15.en} Ordered on ${D.order.en}, it ships by ${D.ship.en} and arrives between ${D.from.en} and ${D.by.en}, well before October 10.`,
          zh: `${L15.zh}如果${D.order.zh}下单，这件作品会在${D.ship.zh}前发出，${D.from.zh}到${D.by.zh}之间送达，远早于${D.wanted.zh}。`,
        },
        [pc01.id, coop.id, grace.id, shipping.id],
      ),
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// run_02, the d15 listing: Lena T.'s notes become a draft, its checks, its index entry and apr_04.

// The draft's words, drawn only from lst_01's notes: a small weaving, about 30 by 40 cm, wool in
// red, grey and white, a zigzag band, about 20 hours on the loom, warm colors. oneOfAKind and
// leadTimeDays are left out, because the notes don't say (D1-26). The site is English only (Gordon,
// Oct 24 11:35 PM), so nothing renders the zh title and summary, and the Lister's step never
// mentions a translation.
const DRAFT_TITLE: Text = {
  en: "Small red, grey and white wool weaving with a zigzag band",
  zh: "带锯齿纹饰带的红灰白三色小幅羊毛编织",
};
// PLANTED TEST, like v1's planted errors: the summary's second sentence claims hand-spun churro wool
// on purpose, though the notes say store-bought yarn. chk_02 catches it, and it is the only failing
// check in any run.
const PLANTED_CLAIM: Text = { en: "Woven from hand-spun churro wool, the old way.", zh: "用手纺的churro（丘罗羊）毛线，按老方法织成。" };
const DRAFT_SUMMARY: Text = {
  en: `A small weaving, about 30 by 40 cm, in red, grey and white wool, with a zigzag band across the middle. ${PLANTED_CLAIM.en} About 20 hours on the loom.`,
  zh: `一幅约30×40厘米的小幅编织，用红、灰、白三色羊毛织成，中间横贯一条锯齿纹饰带。${PLANTED_CLAIM.zh}在织机上织了约20小时。`,
};
const DRAFT_FACETS: Payloads["listing.drafted"]["facets"] = {
  object: { ...pc01.facets.object },
  materials: ["wool"],
  techniques: ["handwoven"],
  motifs: ["zigzag", "band"],
  colors: ["red", "grey", "white"],
  sizeCm: { w: 30, h: 40 },
};
const DRAFT_VIBE: Payloads["listing.drafted"]["vibe"] = { moods: ["warm"], occasions: [], recipients: [] };

const draft: Payloads["listing.drafted"] = {
  listingId: lst01.id,
  makerId: lena.id,
  title: DRAFT_TITLE,
  summary: DRAFT_SUMMARY,
  facets: DRAFT_FACETS,
  hours: 20,
  vibe: DRAFT_VIBE,
  checks: [
    {
      checkId: "chk_01",
      kind: "protocol",
      ok: true,
      note: { en: "Names only the co-op's own craft. Nothing from the kept-out list.", zh: "只涉及合作社自己的手艺，没有不收录清单中的任何内容。" },
    },
    {
      checkId: "chk_02",
      kind: "facts",
      ok: false,
      note: {
        en: `Planted test: the draft says hand-spun churro wool, but ${lena.name.en}'s notes say store-bought yarn. A person must fix this before it publishes.`,
        zh: `预设测试：草稿写的是手纺churro（丘罗羊）毛线，但 ${lena.name.zh} 的笔记写的是买来的毛线。发布前必须由人改正。`,
      },
    },
    {
      checkId: "chk_03",
      kind: "price",
      ok: true,
      note: { en: "The notes give no price, so the draft leaves it for the maker to set.", zh: "笔记里没有价格，所以草稿留给匠人自己定价。" },
    },
  ],
};

/** The first sentence of a text: up to and including the first ". ", "! " or "? ", trimmed. */
function firstSentence(text: string): string {
  const end = /[.!?] /.exec(text);
  return (end ? text.slice(0, end.index + 1) : text).trim();
}

/** The passage rule (data-model.md, The embedded passage), applied to the draft and its community. */
function draftPassage(d: Payloads["listing.drafted"]): string {
  const parts = [`passage: ${d.facets.object.en}`, `craft: ${coop.craft.en}, ${coop.people.en}`];
  const add = (label: string, list: string[]) => {
    if (list.length > 0) parts.push(`${label}: ${list.join(", ")}`);
  };
  add("materials", d.facets.materials);
  add("techniques", d.facets.techniques);
  add("motifs", d.facets.motifs);
  add("colors", d.facets.colors);
  add("mood", d.vibe.moods);
  add("for", [...d.vibe.occasions, ...d.vibe.recipients]);
  parts.push(firstSentence(d.summary.en));
  return parts.join(" | ");
}

// The draft's dot on the map, approximate (approx: true): the center of the co-op's red and the
// zigzag wool weavings once the model's map exists, and a fixed illustrative point until then.
const NEAR_DRAFT = ["pc_06", "pc_07", "pc_11"];
const round4 = (n: number) => Math.round(n * 10000) / 10000;
function draftPoint(): { x: number; y: number } {
  const pts = (report?.points ?? []).filter((p) => NEAR_DRAFT.includes(p.pieceId));
  if (pts.length === 0) return { x: 0.42, y: -0.31 };
  return { x: round4(pts.reduce((s, p) => s + p.x, 0) / pts.length), y: round4(pts.reduce((s, p) => s + p.y, 0) / pts.length) };
}

const run02: ScriptedRun = {
  runId: "run_02",
  side: "seller",
  threadId: lst01.id,
  trigger: { kind: "listing", listingId: lst01.id, notes: lst01.notes },
  steps: [
    step("run_02", "cindy", "route", 500, { en: `Routing ${lst01.id}: draft, tag, check, then index.`, zh: `分派${lst01.id}：起草、标注、核查，然后索引。` }),
    step("run_02", "lister", "result", 1400, {
      en: "Drafted the title and summary from the maker's notes.",
      zh: "Drafted the title and summary from the maker's notes.",
    }),
    step("run_02", "tagger", "result", 800, {
      en: `Proposed the vibe word ${DRAFT_VIBE.moods.join(", ")}, from the notes.`,
      zh: `根据笔记提议氛围词${DRAFT_VIBE.moods.join("、")}。`,
    }),
    step("run_02", "checker", "check", 600, { en: "Protocol check passed.", zh: "规定核查通过。" }),
    step("run_02", "checker", "check", 700, {
      en: "Facts check failed: hand-spun churro wool isn't in the notes.",
      zh: "事实核查未通过：笔记里没有手纺churro（丘罗羊）毛线。",
    }),
    step("run_02", "checker", "check", 500, { en: "Price check passed: no price in the notes.", zh: "价格核查通过：笔记里没有价格。" }),
    step("run_02", "indexer", "result", 600, { en: "Embedded the draft into cindia-drafts as pc_55.", zh: "把草稿嵌入cindia-drafts，编号pc_55。" }),
  ],
  final: [
    { type: "listing.drafted", payload: draft },
    {
      type: "listing.indexed",
      payload: {
        listingId: lst01.id,
        pieceId: "pc_55",
        modelId,
        embedText: draftPassage(draft),
        index: "cindia-drafts",
        point: draftPoint(),
        approx: true,
      },
    },
    { type: "approval.requested", payload: { approvalId: "apr_04" } },
  ],
};

// ---------------------------------------------------------------------------------------------
// run_03, the Designer drafts the co-op's storefront: five blocks, numbered after the storefronts'.

const lastBlock = Math.max(...storefronts.flatMap((s) => s.blocks.map((b) => Number(b.blockId.slice(4)))));
let nextBlock = lastBlock + 1;
const draftBlock = (kind: StorefrontBlock["kind"], props: StorefrontBlock["props"]): StorefrontBlock => ({
  blockId: `blk_${String(nextBlock++).padStart(2, "0")}`,
  kind,
  props,
});
const designerBlocks: StorefrontBlock[] = [
  draftBlock("hero", { tagline: "Wool weavings and stamped silver, made by hand" }),
  draftBlock("story", { title: "About the co-op", body: coop.about.en }),
  draftBlock("pieces", { pieceIds: pieces.filter((p) => p.communityId === coop.id).map((p) => p.id) }),
  draftBlock("projects", { projectIds: [...coop.projectIds] }),
  draftBlock("visit", { address: coop.place.en, hours: "Visits by arrangement" }),
];

const run03: ScriptedRun = {
  runId: "run_03",
  side: "seller",
  threadId: sto01.id,
  trigger: { kind: "storefront", storefrontId: sto01.id },
  steps: [
    step("run_03", "cindy", "route", 400, { en: `Routing ${sto01.id} to the Designer.`, zh: `把${sto01.id}交给设计。` }),
    step("run_03", "designer", "tool", 800, { en: "Reading the co-op's page and its pieces.", zh: "查阅合作社页面及其作品。" }, "community_page"),
    step("run_03", "designer", "result", 1600, {
      en: `Drafted ${designerBlocks.length} blocks: hero, story, pieces, project and visit.`,
      zh: `起草了${designerBlocks.length}个版块：首屏、介绍、作品、项目和到访。`,
    }),
  ],
  final: [{ type: "storefront.drafted", payload: { storefrontId: sto01.id, blocks: designerBlocks } }],
};

// ---------------------------------------------------------------------------------------------
// run_04, Grace N.'s payout question. It answers on her pages only (its trigger names mkr_01).

const pay = { amount: usd(mpo01.amountCents), held: usd(mst01.heldCents), date: shortDate(mst01.payoutDate) };

const run04: ScriptedRun = {
  runId: "run_04",
  side: "seller",
  threadId: "thr_02",
  trigger: { kind: "support", matches: matches(Q_PAYOUT), makerId: grace.id },
  steps: [
    step("run_04", "cindy", "route", 400, { en: "Routing the payout question to the Bookkeeper.", zh: "把结款问题交给记账。" }),
    step("run_04", "bookkeeper", "result", 300, {
      en: `Read ${mpo01.id} and ${mst01.id}: ${pay.amount} on ${pay.date.en}, ${pay.held} held.`,
      zh: `读取${mpo01.id}和${mst01.id}：${pay.date.zh}发放${pay.amount}，暂缓${pay.held}。`,
    }),
    writerReply("run_04", 1200, { en: "Writing the reply in English.", zh: "用英文撰写回复。" }),
  ],
  final: [
    {
      type: "support.answered",
      payload: answered(
        "run_04",
        "thr_02",
        {
          en: `Your September payout is ${pay.amount}, paid on ${pay.date.en} once ${owner.name.en} approves it. ${pay.held} of your share is held until the gallery pays what it owes.`,
          zh: `您9月的结款是${pay.amount}，经 ${owner.name.zh} 批准后于${pay.date.zh}发放。您的份额中有${pay.held}暂缓发放，待画廊补齐欠款后发放。`,
        },
        [mpo01.id, mst01.id],
      ),
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// run_05 and run_06, the fallbacks for anything no run covers. thr_00 is their placeholder thread,
// and the responder puts every reply on the request's own thread and listing.

/** L16, with [L16PIECE] filled. It names no piece ID. */
const L16: Text = {
  en: "In this demo, scripted answers cover the small grey, red and black wool weaving. Switch to Live to ask about this piece.",
  zh: "在本演示中，脚本回答只涵盖灰红黑三色小幅羊毛编织。切换到实时模式即可询问这件作品。",
};

const run05: ScriptedRun = {
  runId: "run_05",
  side: "buyer",
  threadId: "thr_00",
  trigger: { kind: "fallback" },
  steps: [
    step("run_05", "cindy", "route", 400, { en: "No scripted answer covers this question on this page.", zh: "本页面没有涵盖这个问题的脚本回答。" }),
    writerReply("run_05", 600, { en: "Writing the demo's fallback reply.", zh: "撰写演示的备用回复。" }),
  ],
  final: [{ type: "support.answered", payload: answered("run_05", "thr_00", L16, []) }],
};

const run06: ScriptedRun = {
  runId: "run_06",
  side: "seller",
  threadId: "thr_00",
  trigger: { kind: "fallback" },
  steps: [
    step("run_06", "cindy", "route", 400, { en: "No scripted draft matches these notes. Drafting a sample.", zh: "没有与这些笔记对应的脚本草稿，改为起草示例。" }),
    step("run_06", "lister", "result", 900, { en: "Drafted a sample listing, labeled as a sample.", zh: "起草了一份示例商品，并标为示例。" }),
    step("run_06", "checker", "check", 400, { en: "Protocol check passed.", zh: "规定核查通过。" }),
    step("run_06", "checker", "check", 400, { en: "Facts check passed.", zh: "事实核查通过。" }),
    step("run_06", "checker", "check", 400, { en: "Price check passed.", zh: "价格核查通过。" }),
  ],
  final: [
    {
      type: "listing.drafted",
      payload: {
        listingId: "thr_00",
        makerId: lena.id,
        title: { en: "Sample draft", zh: "示例草稿" },
        summary: {
          en: "This is a sample draft, not one written from your notes. In scripted mode, Cindy drafts only the demo listing. Switch to Live to draft from your own notes.",
          zh: "这是一份示例草稿，并非根据您的笔记撰写。在演示模式下，Cindy只起草演示商品。切换到实时模式即可根据您自己的笔记起草。",
        },
        facets: { object: { en: "sample", zh: "示例" }, materials: [], techniques: [], motifs: [], colors: [] },
        vibe: { moods: [], occasions: [], recipients: [] },
        checks: [
          { checkId: "chk_04", kind: "protocol", ok: true, note: { en: "Sample draft: nothing from the kept-out list.", zh: "示例草稿：没有不收录清单中的内容。" } },
          { checkId: "chk_05", kind: "facts", ok: true, note: { en: "Sample draft: it states no facts.", zh: "示例草稿：没有陈述任何事实。" } },
          { checkId: "chk_06", kind: "price", ok: true, note: { en: "Sample draft: no price is set.", zh: "示例草稿：没有设定价格。" } },
        ],
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// run_07, the meaning question: no record says, so the question goes to Grace N. (L14).

/** L14, word for word, with the piece's maker named. */
const L14: Text = {
  en: `Our records don't say, and I won't guess, so I'll ask ${endSentence(grace.name.en)} Her answer will show here in her own words.`,
  zh: `我们的记录里没有答案，我不会乱猜，所以我会去问 ${grace.name.zh}。她的回答会以她自己的原话显示在这里。`,
};

const run07: ScriptedRun = {
  runId: "run_07",
  side: "buyer",
  threadId: qst01.question.threadId,
  trigger: { kind: "support", matches: matches(Q_MEANING), pieceId: pc01.id },
  steps: [
    step("run_07", "cindy", "route", 400, { en: "Routing the question to Intake.", zh: "把问题交给接待。" }),
    step("run_07", "intake", "result", 700, { en: `A question about meaning, for ${pc01.id}, in English.`, zh: `关于${pc01.id}含义的问题，英文。` }),
    step("run_07", "cindy", "call", 300, { en: "Calling the Steward.", zh: "请文化与认证处理。" }),
    step("run_07", "steward", "tool", 700, { en: "Reading the co-op's page.", zh: "查阅合作社页面。" }, "community_page"),
    step("run_07", "steward", "tool", 600, { en: "Reading the co-op's verification record.", zh: "查阅合作社的认证记录。" }, "verification_record"),
    step("run_07", "steward", "result", 900, { en: "Unknown: no record says what the pattern means.", zh: "未知：没有任何记录说明这个图案的含义。" }),
    step("run_07", "steward", "check", 400, {
      en: "No quote about a meaning in the records, so no answer is given.",
      zh: "记录中没有关于含义的引文，因此不作回答。",
    }),
    writerReply("run_07", 1000, {
      en: `Writing the reply, and forwarding the question to ${endSentence(grace.name.en)}`,
      zh: `撰写回复，并把问题转给 ${grace.name.zh}。`,
    }),
  ],
  final: [
    { type: "support.answered", payload: answered("run_07", qst01.question.threadId, L14, [pc01.id, grace.id, qst01.question.id]) },
    {
      type: "question.forwarded",
      payload: {
        questionId: qst01.question.id,
        threadId: qst01.question.threadId,
        makerId: qst01.question.makerId,
        pieceId: qst01.question.pieceId,
        text: qst01.question.text,
        lang: qst01.question.lang,
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// run_08, the find question through Elastic Agent Builder: pieces like pc_01 under $100.

const BUDGET_CENTS = 10000;
/** The budget as the question says it: "$100", "100美元". */
const BUDGET = { en: `$${BUDGET_CENTS / 100}`, zh: `${BUDGET_CENTS / 100}美元` };
const pc01Words = new Set(wordsOf(pc01));
function wordsOf(p: Piece): string[] {
  const f = p.facets;
  const v = p.vibe;
  return [f.object.en, ...f.materials, ...f.techniques, ...f.motifs, ...f.colors, ...v.moods, ...v.occasions, ...v.recipients];
}
const shared = (p: Piece) => new Set(wordsOf(p).filter((w) => pc01Words.has(w))).size;
/** Every other piece under the budget sharing two or more of pc_01's words, most shared first, then by ID. */
const alike = pieces
  .filter((p) => p.id !== pc01.id && p.priceCents < BUDGET_CENTS && shared(p) >= 2)
  .toSorted((a, b) => shared(b) - shared(a) || (a.id < b.id ? -1 : 1));
const sameCoop = need(alike.find((p) => p.communityId === coop.id), "a co-op piece like pc_01 under $100");
/** The closest piece from each other community, in the same order, then the first two of those. */
const others = alike
  .filter((p) => p.communityId !== coop.id)
  .filter((p, i, list) => list.findIndex((q) => q.communityId === p.communityId) === i)
  .slice(0, 2);
if (others.length < 2) throw new Error("run_08 needs pieces from two other communities like pc_01 under $100");
const found = [sameCoop, ...others];

const otherLine = (p: Piece, lang: Lang) => {
  const c = communityOf(p);
  return lang === "en"
    ? `the ${inSentence(p.title.en)} (${usd(p.priceCents)}), from ${inSentence(c.name.en)}`
    : `${c.name.zh}的${p.title.zh}（${usd(p.priceCents)}）`;
};

const run08: ScriptedRun = {
  runId: "run_08",
  side: "buyer",
  threadId: "thr_04",
  trigger: { kind: "support", matches: matches(Q_FIND), pieceId: pc01.id },
  steps: [
    step("run_08", "cindy", "route", 400, { en: "Routing the question to Intake.", zh: "把问题交给接待。" }),
    step("run_08", "intake", "result", 700, {
      en: `Find: pieces like ${pc01.id}, under ${BUDGET.en}.`,
      zh: `找货：与${pc01.id}相似、${BUDGET.zh}以内的作品。`,
    }),
    step("run_08", "cindy", "call", 300, { en: "Calling the Finder.", zh: "请检索处理。" }),
    step(
      "run_08",
      "finder",
      "tool",
      1800,
      {
        en: "Elastic Agent Builder (cindia-finder): pieces like pc_01 under $100",
        zh: "Elastic Agent Builder（cindia-finder）：100美元以内、与pc_01相似的作品",
      },
      "elastic_agent",
    ),
    step("run_08", "finder", "result", 600, {
      en: `Found ${alike.length} pieces under ${BUDGET.en} that share two or more of ${pc01.id}'s words.`,
      zh: `找到${alike.length}件${BUDGET.zh}以内、与${pc01.id}至少有两个相同词的作品。`,
    }),
    step("run_08", "curator", "result", 700, {
      en: `Put ${found.map((p) => p.id).join(", ")} in order, with the search's code-built reasons.`,
      zh: `把${found.map((p) => p.id).join("、")}排好序，理由由搜索代码生成。`,
    }),
    writerReply("run_08", 1100, { en: "Writing the reply in English, with the prices.", zh: "用英文撰写回复，附上价格。" }),
  ],
  final: [
    {
      type: "support.answered",
      payload: answered(
        "run_08",
        "thr_04",
        {
          en:
            `Under ${BUDGET.en}, the closest are ${maker(sameCoop.makerId).name.en}'s ${inSentence(sameCoop.title.en)} (${usd(sameCoop.priceCents)}), from the same co-op, ` +
            `and one piece each from two other communities: ${others.map((p) => otherLine(p, "en")).join(", and ")}.`,
          zh:
            `${BUDGET.zh}以内最接近的是同一合作社 ${maker(sameCoop.makerId).name.zh} 的${sameCoop.title.zh}（${usd(sameCoop.priceCents)}），` +
            `以及另外两个社区各一件作品：${others.map((p) => otherLine(p, "zh")).join("，以及")}。`,
        },
        found.map((p) => p.id),
      ),
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// run_09, the "ask the maker" relay: Grace N.'s answer, word for word, on the question's thread.
// The responder puts a person's own answer where the English reply quotes ans_01's text, so the
// English reply holds that text exactly.

const run09: ScriptedRun = {
  runId: "run_09",
  side: "buyer",
  threadId: qst01.question.threadId,
  trigger: { kind: "question", questionId: qst01.question.id },
  steps: [
    step("run_09", "cindy", "route", 400, {
      en: `${grace.name.en} answered ${qst01.question.id}. Routing it to the Writer.`,
      zh: `${grace.name.zh} 回答了${qst01.question.id}，交给撰写。`,
    }),
    writerReply("run_09", 900, { en: `Relaying ${grace.name.en}'s answer in her own words.`, zh: `原话转达 ${grace.name.zh} 的回答。` }),
  ],
  final: [
    {
      type: "support.answered",
      payload: answered(
        "run_09",
        qst01.question.threadId,
        {
          en: `${grace.name.en} answered in her own words: "${qst01.answer.text}"`,
          zh: `${grace.name.zh} 的回答（以下是Cindy的翻译，她的原话是英文）：“我选灰、红、黑三色，是因为喜欢它们放在一起的样子；阶梯菱形是我喜欢织的形状。仅此而已。”`,
        },
        [qst01.question.id, qst01.answer.answerId, grace.id, pc01.id],
      ),
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// run_10, why part of Grace N.'s September pay is held. It answers on her pages only.

const held = { amount: usd(mst01.heldCents), short: usd(galleryFlag.deltaCents) };

const run10: ScriptedRun = {
  runId: "run_10",
  side: "seller",
  threadId: "thr_05",
  trigger: { kind: "support", matches: matches(Q_HELD), makerId: grace.id },
  steps: [
    step("run_10", "cindy", "route", 400, { en: "Routing the question to the Bookkeeper.", zh: "把问题交给记账。" }),
    step("run_10", "bookkeeper", "result", 300, {
      en: `Read ${mst01.id} and ${galleryFlag.id}: ${held.amount} held, the gallery ${held.short} short.`,
      zh: `读取${mst01.id}和${galleryFlag.id}：暂缓${held.amount}，画廊少付${held.short}。`,
    }),
    writerReply("run_10", 1200, { en: "Writing the reply in English.", zh: "用英文撰写回复。" }),
  ],
  final: [
    {
      type: "support.answered",
      payload: answered(
        "run_10",
        "thr_05",
        {
          en: `${held.amount} of your September share is held. The gallery paid ${held.short} short against its contract, and ${held.amount} of that is your part. It's paid to you once the gallery sends the difference.`,
          zh: `您9月份额中有${held.amount}暂缓发放。画廊按合同少付了${held.short}，其中${held.amount}是您的部分。画廊补齐差额后，这笔钱就会发给您。`,
        },
        [mst01.id, galleryFlag.id],
      ),
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// The exports.

/** Every scripted run, run_01 to run_10, in run order. */
export const swarmRuns: ScriptedRun[] = [run01, run02, run03, run04, run05, run06, run07, run08, run09, run10];

/** run_05: the reply when no scripted run matches a buyer's question (L16). It names no piece ID. */
export const fallbackSupportRun: ScriptedRun = run05;

/** run_06: the draft shown when no scripted listing run matches, labeled as a sample. */
export const fallbackListingRun: ScriptedRun = run06;

/** A question the support drawer offers in scripted mode. Every entry has its own scripted run (D1-17). */
export interface DemoQuestion {
  side: "buyer" | "seller";
  text: Text;
}

/** The buyer's three (run_01, run_07, run_08), then the seller's two (run_04, run_10). */
export const demoQuestions: DemoQuestion[] = [
  { side: "buyer", text: Q_D04 },
  { side: "buyer", text: Q_MEANING },
  { side: "buyer", text: Q_FIND },
  { side: "seller", text: Q_PAYOUT },
  { side: "seller", text: Q_HELD },
];
