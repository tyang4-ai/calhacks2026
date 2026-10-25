// The tour on /demo, beat by beat from docs/common/demo-script.md (## Beats and "The events, at 1x"):
// three pitch cards, the buyer minute, the seller minute and chapter 2, 220 seconds in all. The
// finance beats keep every v1 event, ID and payload, moved by the offsets the events table gives,
// and the month timeline plays inside d07-month, shifted by MONTH_SHIFT_MS. Two v1 payloads gain a
// field: card.tokenized its pieceId (B1-34) and split.shown its gallery compare (figure 16).
//
// Every payload is built from src/mock/, never typed: v1's records, and S3's demoSearch,
// demoSurprise, splits, swarmRuns, demoQuestions, makerQuestions, listings, scriptedScan,
// counterfeitCandidates, report, demoContribution, demoFundMoves and demoDataSync. apr_03, apr_04
// and fup_02 are the records allApprovals and allFollowUps gather in index.ts, imported here from
// their own files, because index.ts imports this one. The tour's own IDs qry_01 and srp_01 are
// added here (D1-49). Each beat.started carries the camera, and the process view and the drawer
// it opens, so one without them closes both (events.md, beat.started).
import type { DrawerKind, EventType, Payloads, ProcessId, SearchResult } from "../../core/events";
import type { CameraId } from "../../core/featureTypes";
import type { Timeline } from "../../core/player";
import type { ScriptedRun } from "../../core/types";
import { answerKey } from "../answerKey";
import { pieces } from "../catalog";
import { demoDataSync } from "../database";
import { actId, draft, finalize, type Draft } from "../events";
import { impact } from "../impact";
import { apr_04, listings } from "../listings";
import { report } from "../model";
import {
  approvals,
  balanceAsOf,
  feesCents,
  followUp,
  galleryPayout,
  heldCents,
  journalFor,
  makerPayCents,
  makerPayoutDate,
  makerPayouts,
  makerStatements,
  monthId,
  orders,
  payoutForOrder,
  salesCents,
} from "../month";
import { demoContribution, demoFundMoves } from "../projects";
import { demoSearch, demoSurprise } from "../search";
import { splits } from "../splits";
import { demoQuestions, makerQuestions, swarmRuns } from "../swarm";
import { apr_03, counterfeitCandidates, fup_02, scriptedScan } from "../watch";
import { MONTH_ACT_COUNT, monthTimeline } from "./month";

/** The month timeline plays from 136.2 s, in d07-month. */
export const MONTH_SHIFT_MS = 136200;
/** Figure 11's vibe query, the text of the tour's search.queried qry_01. */
export const DEMO_QUERY = demoSearch.query.text;
/** The tour's length: the spine to 180 s, then chapter 2 to the end of d17-ask-maker. */
const DURATION_MS = 220000;

/** The tour's own IDs for its search and its surprise draw (data-model.md, The ID scheme). */
const QUERY_ID = "qry_01";
const SURPRISE_ID = "srp_01";
/** v1's card token (demo-script.md, d04-pay). */
const TOKEN = "tok_7Q2M9X4KD1PA";

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`timelines/demo.ts needs ${what}`);
  return value;
}

// ---------------------------------------------------------------------------------------------
// v1's records.

const ord = orders[0]; // ord_001
const pc = need(
  pieces.find((p) => p.id === ord.pieceId),
  "ord_001's piece",
);
const settlement = payoutForOrder(ord.id); // pay_001
const mst01 = makerStatements[0];
const [apr01, apr02] = approvals;

const STUDIO = { kind: "studio" as const, id: "std_dine" };

const closingRefs = [galleryPayout.id, ...makerPayouts.map((m) => m.id)];
const closingEntryIds = closingRefs.flatMap((r) => journalFor(r)?.entryIds ?? []);

// ---------------------------------------------------------------------------------------------
// S3's records.

const run = (runId: string): ScriptedRun =>
  need(
    swarmRuns.find((r) => r.runId === runId),
    runId,
  );
const run01 = run("run_01");
const run02 = run("run_02");
const run07 = run("run_07");
const run09 = run("run_09");

/** The drawer's first two questions, both the buyer's: the d04 question, then the meaning question. */
const [askD04, askMeaning] = demoQuestions;
const qst01 = need(makerQuestions[0], "qst_01");
const lst01 = need(listings[0], "lst_01");
const split01 = need(splits[pc.id], `${pc.id}'s split`);
const cfts = scriptedScan.cftIds.map((id) =>
  need(
    counterfeitCandidates.find((c) => c.id === id),
    id,
  ),
);
if (scriptedScan.followUpId !== fup_02.id || scriptedScan.approvalId !== apr_03.id) {
  throw new Error("timelines/demo.ts: scriptedScan's follow-up and approval must be fup_02 and apr_03");
}
if (!run02.final.some((f) => f.type === "approval.requested" && f.payload.approvalId === apr_04.id)) {
  throw new Error("timelines/demo.ts: run_02 must end with apr_04");
}

/** A run's swarm.step events: the first at `from`, each step's ms the gap to the next (demo-script.md). */
function steps(r: ScriptedRun, from: number): Draft[] {
  let at = from;
  return r.steps.map((s) => {
    const d = draft("swarm.step", at, { ...structuredClone(s), threadId: r.threadId });
    at += s.ms;
    return d;
  });
}

/** A copy of the payload of a run's n-th final event of this type. */
function final<T extends EventType>(r: ScriptedRun, type: T, n = 0): Payloads[T] {
  const hit = r.final.filter((f) => f.type === type)[n];
  if (!hit) throw new Error(`timelines/demo.ts: ${r.runId} has no ${type}`);
  return structuredClone(hit.payload) as Payloads[T];
}

/** One beat.started, with the process view and the drawer it opens. */
function cue(beatId: string, at: number, camera: CameraId, open: { drawer?: DrawerKind; process?: ProcessId } = {}): Draft {
  return draft("beat.started", at, {
    beatId,
    camera,
    ...(open.process ? { process: open.process } : {}),
    ...(open.drawer ? { drawer: open.drawer } : {}),
  });
}

// The vibe search, figure 11, with the tour's queryId.
const searchQueried: Payloads["search.queried"] = { queryId: QUERY_ID, ...structuredClone(demoSearch.query) };
const searchAnswered: Payloads["search.answered"] = { queryId: QUERY_ID, ...structuredClone(demoSearch.answer) };

/**
 * The query's dot on the map, placed as the scripted responder places it (events.md, search.queried):
 * the score-weighted center of its top three results, or the center of every point with no result.
 */
function queryPoint(results: SearchResult[], points: { pieceId: string; x: number; y: number }[]): { x: number; y: number } | null {
  const byId = new Map(points.map((p) => [p.pieceId, p]));
  let w = 0;
  let x = 0;
  let y = 0;
  for (const r of results.slice(0, 3)) {
    const p = byId.get(r.pieceId);
    if (!p || !(r.score > 0)) continue;
    w += r.score;
    x += r.score * p.x;
    y += r.score * p.y;
  }
  if (w > 0) return { x: x / w, y: y / w };
  if (points.length === 0) return null;
  return { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
}

const mapQuery = report ? queryPoint(searchAnswered.results, report.points) : null;
const searchMapped: Payloads["search.mapped"] | null =
  report && mapQuery
    ? {
        queryId: QUERY_ID,
        modelId: report.trained.modelId,
        points: report.points.map((p) => ({ pieceId: p.pieceId, x: p.x, y: p.y })),
        query: mapQuery,
        method: "pca",
        approx: true,
      }
    : null;

// ---------------------------------------------------------------------------------------------
// The beats. Times are ms on the player clock at 1x. Events at the same time keep the order they
// are written in.

const own: Draft[] = [
  // p01-what, p02-why, p03-how: the pitch cards, with nothing else.
  cue("p01-what", 0, "pitch"),
  cue("p02-why", 20000, "pitch"),
  cue("p03-how", 40000, "pitch"),

  // d01-vibe: the vibe search (figure 11). The model's events only once model.ts holds a report.
  cue("d01-vibe", 60000, "shop-home"),
  ...(report
    ? [draft("model.trained", 60200, { ...report.trained }), draft("proof.search_scored", 60200, structuredClone(report.scored))]
    : []),
  draft("search.queried", 60400, searchQueried),
  draft("search.answered", 62600, searchAnswered),
  cue("d01-vibe", 63500, "shop-search"),
  ...(searchMapped ? [draft("search.mapped", 66000, searchMapped)] : []),
  cue("d01-vibe", 66500, "shop-search", { process: "search" }),

  // d03-piece: v1's d02-story (4.2 s) and d03-split (8.3 s), with figure 16's gallery compare.
  cue("d03-piece", 74000, "shop-piece"),
  draft("piece.opened", 74300, { pieceId: pc.id }),
  draft("split.shown", 76500, structuredClone(split01)),

  // d04-support: the d04 question, run_01 with its check step, and its answer.
  cue("d04-support", 86000, "shop-piece", { drawer: "support" }),
  draft("support.asked", 86400, {
    threadId: run01.threadId,
    side: askD04.side,
    text: askD04.text.en,
    lang: "en",
    contextIds: [pc.id],
  }),
  ...steps(run01, 87600),
  cue("d04-support", 90000, "shop-piece", { drawer: "support", process: "swarm" }),
  draft("support.answered", 96000, final(run01, "support.answered")),

  // d05-pay: v1's d04-pay at +93.0 s, card.tokenized now with its pieceId, and the project add-on (figure 13).
  cue("d05-pay", 104000, "shop-piece"),
  draft("checkout.started", 104300, { pieceId: pc.id, grossCents: ord.grossCents }),
  draft("card.tokenized", 105500, { token: TOKEN, brand: "visa", last4: "4242", pieceId: pc.id }),
  draft("project.funded", 106000, { ...demoContribution }),
  draft("order.placed", 106500, {
    orderId: ord.id,
    pieceId: ord.pieceId,
    channelId: ord.channelId,
    buyerId: ord.buyerId,
    grossCents: ord.grossCents,
    date: ord.date,
  }),
  draft("receipt.updated", 107000, { orderId: ord.id, status: "received", makerId: pc.makerId, makerShareCents: ord.makerShareCents }),
  cue("d05-pay", 107000, "shop-piece", { process: "checkout" }),

  // d15-listing: lst_01's notes, run_02, its draft, its index entry, the data snapshot and apr_04.
  cue("d15-listing", 120000, "sell-listings"),
  draft("listing.requested", 120300, { listingId: lst01.id, makerId: lst01.makerId, notes: lst01.notes, lang: lst01.lang }),
  ...steps(run02, 121000),
  cue("d15-listing", 122000, "sell-listings", { process: "swarm" }),
  draft("listing.drafted", 126500, final(run02, "listing.drafted")),
  draft("listing.indexed", 127000, final(run02, "listing.indexed")),
  draft("data.synced", 127000, structuredClone(demoDataSync)),
  cue("d15-listing", 127000, "sell-listings", { process: "data" }),
  draft("approval.requested", 128000, { approvalId: apr_04.id }),

  // d06-money: v1's d05-money at +115.0 s, then the add-on's two moves (figure 13).
  cue("d06-money", 130000, "sell-map"),
  draft("money.moved", 130500, {
    moveId: "mv_0001",
    kind: "sale",
    from: { kind: "buyer", id: ord.buyerId },
    to: { kind: "cindia" },
    amountCents: ord.grossCents,
    refId: ord.id,
    date: ord.date,
  }),
  draft("money.moved", 131500, {
    moveId: "mv_0002",
    kind: "fee",
    from: { kind: "cindia" },
    to: { kind: "card_network" },
    amountCents: ord.cardFeeCents,
    refId: ord.id,
    date: ord.date,
  }),
  draft("money.moved", 132500, {
    moveId: "mv_0003",
    kind: "settlement",
    from: { kind: "cindia" },
    to: STUDIO,
    amountCents: settlement.netCents,
    refId: settlement.id,
    date: settlement.date,
  }),
  draft("account.synced", 133500, { accountId: "acct_studio", balanceCents: balanceAsOf(settlement.date), asOf: settlement.date }),
  draft("money.moved", 134200, structuredClone(demoFundMoves[0])),
  draft("money.moved", 134800, structuredClone(demoFundMoves[1])),

  // d07-month: v1's d06-month, the month timeline shifted by MONTH_SHIFT_MS (below).
  cue("d07-month", 136000, "sell-month"),
  cue("d07-month", 142000, "sell-month", { process: "reconcile" }),

  // d08-catch: v1's d07-catch at +116.0 s. The month timeline brings the statement, deposit, flag
  // and explanation.
  cue("d08-catch", 146000, "sell-catch"),
  draft("agent.acted", 151500, {
    actId: actId(MONTH_ACT_COUNT + 1),
    kind: "draft",
    text: {
      en: "I drafted a follow-up to the gallery asking for the difference. It needs your approval.",
      zh: "我起草了一封给画廊的跟进邮件，请其补付差额。需要您批准。",
    },
    refId: followUp.id,
  }),
  draft("followup.drafted", 151700, {
    followUpId: followUp.id,
    approvalId: followUp.approvalId,
    to: { ...followUp.to },
    subject: { ...followUp.subject },
    body: { ...followUp.body },
  }),
  draft("approval.requested", 152000, { approvalId: apr01.id }),

  // d09-approve: v1's d08-approve at +116.0 s.
  cue("d09-approve", 154000, "sell-approvals"),
  draft("agent.acted", 154300, {
    actId: actId(MONTH_ACT_COUNT + 2),
    kind: "propose",
    text: {
      en: "I proposed this month's payouts to the three makers, holding back what the gallery still owes. Only you can approve them.",
      zh: "我拟好了三位匠人本月的结算，画廊欠款部分暂缓发放。只有您能批准。",
    },
    refId: apr02.id,
  }),
  draft("approval.requested", 154600, { approvalId: apr02.id }),
  cue("d09-approve", 155000, "sell-approvals", { process: "approvals" }),
  draft("approval.granted", 155800, { approvalId: apr01.id, by: "own_01", date: apr01.decisionDate }),
  draft("followup.sent", 156300, { followUpId: followUp.id, approvalId: followUp.approvalId }),
  draft("approval.granted", 157000, { approvalId: apr02.id, by: "own_01", date: apr02.decisionDate }),
  ...makerPayouts.map((m) => draft("payout.sent", 157600, { makerPayoutId: m.id, makerId: m.makerId, amountCents: m.amountCents, date: makerPayoutDate })),
  ...makerPayouts.map((m, i) =>
    draft("money.moved", 157800, {
      moveId: `mv_${String(4 + i).padStart(4, "0")}`,
      kind: "maker_pay",
      from: STUDIO,
      to: { kind: "maker", id: m.makerId },
      amountCents: m.amountCents,
      refId: m.id,
      date: makerPayoutDate,
    }),
  ),

  // d10-close: v1's d09-close at +118.0 s.
  cue("d10-close", 161000, "sell-close"),
  draft("ledger.posted", 161300, { entryIds: closingEntryIds }),
  draft("month.closed", 161800, { monthId, salesCents, feesCents, makerPayCents, heldCents }),
  draft("workbook.ready", 162600, {
    monthId,
    fileName: "cindia-close-2026-09.xlsx",
    sheets: ["Ledger", "Reconciliation", "Profit and loss", "Makers"],
  }),
  draft("impact.updated", 163500, {
    impactId: impact.id,
    makerShareBps: impact.makerShareBps,
    daysCloseToPayout: impact.daysCloseToPayout,
    daysCloseToPayoutBefore: impact.daysCloseToPayoutBefore,
    bookkeepingHoursSaved: impact.bookkeepingHoursSaved,
    estimate: impact.estimate,
  }),

  // d11-maker: v1's d10-statement at +119.0 s, with its held line.
  cue("d11-maker", 166000, "maker"),
  draft("statement.issued", 166400, {
    makerStatementId: mst01.id,
    makerId: mst01.makerId,
    lines: mst01.lines.map((l) => ({ ...l })),
    totalCents: mst01.totalCents,
    heldCents: mst01.heldCents,
    payoutDate: mst01.payoutDate,
  }),

  // d12-receipt: v1's paid receipt (51.0 s) at +122.0 s, then the proof score off camera (v1's 59.0 s).
  cue("d12-receipt", 172000, "shop-receipt"),
  draft("receipt.updated", 173000, {
    orderId: ord.id,
    status: "paid_to_maker",
    makerId: pc.makerId,
    makerShareCents: ord.makerShareCents,
    paidDate: makerPayoutDate,
  }),
  draft("proof.scored", 179000, {
    caught: answerKey.length,
    total: answerKey.length,
    results: answerKey.map((e) => ({ errorId: e.id, caught: true })),
  }),

  // d02-surprise: figure 12's draw, with the tour's surpriseId.
  cue("d02-surprise", 180000, "shop-search"),
  draft("surprise.asked", 180400, { surpriseId: SURPRISE_ID, ...structuredClone(demoSurprise.ask) }),
  draft("surprise.drawn", 181600, { surpriseId: SURPRISE_ID, ...structuredClone(demoSurprise.draw) }),

  // d13-proof: d01's proof.search_scored is already in the store, so no second one.
  cue("d13-proof", 186000, "sell-proof"),
  cue("d13-proof", 189000, "sell-proof", { process: "model" }),

  // d14-watch: the scan of Grace N., its hit cft_01 (figure 14), the Reporter's draft fup_02 keyed
  // b15-watch, and apr_03.
  cue("d14-watch", 192000, "sell-watch"),
  draft("watch.started", 192300, { scanId: scriptedScan.scanId, makerId: scriptedScan.makerId, queries: [...scriptedScan.queries] }),
  draft("watch.scanned", 194500, {
    scanId: scriptedScan.scanId,
    engine: "scripted",
    candidates: counterfeitCandidates.length,
    results: counterfeitCandidates.map((c) => ({ title: c.title, url: c.url, snippet: c.snippet, similarity: c.similarity, verdict: c.verdict })),
  }),
  ...cfts.map((c, i) =>
    draft("counterfeit.flagged", 195000 + i * 300, {
      cftId: c.id,
      scanId: scriptedScan.scanId,
      pieceId: c.pieceId,
      url: c.url,
      title: c.title,
      snippet: c.snippet,
      similarity: c.similarity,
      claim: { ...c.claim },
    }),
  ),
  draft(
    "followup.drafted",
    195500,
    { followUpId: fup_02.id, approvalId: fup_02.approvalId, to: { ...fup_02.to }, subject: { ...fup_02.subject }, body: { ...fup_02.body } },
    "b15-watch",
  ),
  draft("approval.requested", 196500, { approvalId: apr_03.id }),

  // d16-store: the co-op's storefront, with no other events.
  cue("d16-store", 200000, "store"),

  // d17-ask-maker: the meaning question, run_07's L14 reply and its forward to Grace N., her answer
  // on her page, then run_09 relaying it in her own words.
  cue("d17-ask-maker", 205000, "shop-piece", { drawer: "support" }),
  draft("support.asked", 205400, {
    threadId: run07.threadId,
    side: askMeaning.side,
    text: askMeaning.text.en,
    lang: "en",
    contextIds: [pc.id],
  }),
  ...steps(run07, 206600),
  draft("support.answered", 211600, final(run07, "support.answered")),
  draft("question.forwarded", 211900, final(run07, "question.forwarded")),
  cue("d17-ask-maker", 212500, "maker"),
  draft("question.answered", 213500, structuredClone(qst01.answer)),
  cue("d17-ask-maker", 215000, "shop-piece", { drawer: "support" }),
  ...steps(run09, 215400),
  draft("support.answered", 216700, final(run09, "support.answered")),
];

const shifted: Draft[] = monthTimeline.events.map((e) => ({
  type: e.type,
  at: e.at + MONTH_SHIFT_MS,
  payload: e.payload,
  ...(e.key ? { key: e.key } : {}),
}));

export const demoTimeline: Timeline = { id: "demo", durationMs: DURATION_MS, events: finalize([...own, ...shifted], "evt_") };

/** The tour's beats in order: ID, start in ms and first camera, from each beat's first beat.started. */
export const BEATS: [string, number, CameraId][] = demoTimeline.events
  .filter((e) => e.type === "beat.started")
  .map((e) => [(e.payload as Payloads["beat.started"]).beatId, e.at, (e.payload as Payloads["beat.started"]).camera] as [string, number, CameraId])
  .filter(([beatId], i, all) => all.findIndex(([b]) => b === beatId) === i);

export default demoTimeline;
