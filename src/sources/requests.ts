// Answers requests from people (events.md, "Requests from people"). A request is an event with
// source "user". In scripted mode the scripted answer arrives 1.2 seconds later in real time. In
// live mode the adapter for the request's key is tried first, with the scripted answer as fallback.
//
// Mechanism: answers are wall-clock timers outside the player's timeline. They are emitted straight
// into the store with `at` set to the player clock at delivery, so they arrive while the player is
// paused or past the end. They are never added to the timeline, so seek() and reset() replay only
// the timeline and stay deterministic. A pending answer drops itself if the player's epoch changed
// (a reset, seek or load happened) before it was delivered.
import { REQUEST_KEYS, type CindiaEvent, type EventType, type Payloads, type SearchFilters, type SearchResult, type SourceKey } from "../core/events";
import type { Timeline } from "../core/player";
import type { CindiaState } from "../core/state";
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
  Text,
  WorkInProgress,
} from "../core/types";
import type { ChartSpec } from "../core/events";
import { answerId } from "./ids";
import { scoreKeywords } from "./keywordSearch";
import { asLive, withTimeout } from "./registry";
import { DECISION_DATE, inlineSummary, planRun, RUN_STEP_MS, type PlannedRunEvent } from "./scriptedSwarm";
import { drawSurprise, mulberry32 } from "./surprise";
import { REPLY_DELAY_MS, timeoutFor, type LiveAdapter } from "./types";

/** The mock exports the responder reads (src/mock/, found through mockAnswers.ts). */
export interface MockAnswers {
  curatedSet?: { pieceIds: string[]; reasons: Record<string, Text> };
  cannedAnswers?: {
    questionId: string;
    questions: Text;
    answer: Text;
    refIds: string[];
    chart?: ChartSpec;
  }[];
  fallbackAnswer?: Text;
  scenarioReplies?: CindiaEvent[];
  pieces?: Piece[];
  searchIndex?: IndexEntry[];
  keywordAliases?: Record<string, string>;
  demoSearch?: DemoSearch;
  swarmRuns?: ScriptedRun[];
  fallbackSupportRun?: ScriptedRun;
  fallbackListingRun?: ScriptedRun;
  /** qst_01 and its scripted answer ans_01: the text run_09's reply quotes. */
  makerQuestions?: { answer: Payloads["question.answered"] }[];
  counterfeitCandidates?: CounterfeitCandidate[];
  scriptedScan?: ScriptedScan;
  report?: ModelReport | null;
  modelId?: string;
  splits?: Record<string, Payloads["split.shown"]>;
  worksInProgress?: WorkInProgress[];
  /** apr_01 to apr_05, every approval getById() finds. */
  allApprovals?: Approval[];
  /** fup_01 and fup_02, every follow-up getById() finds. */
  allFollowUps?: FollowUp[];
}

export interface ResponderDeps {
  emit: (e: CindiaEvent) => void;
  getState: () => CindiaState;
  onEvent: (l: (e: CindiaEvent) => void) => () => void;
  adapterFor: (key: SourceKey) => LiveAdapter | undefined;
  mock: () => MockAnswers;
  /** The player clock, for the answer's `at`. */
  now: () => number;
  /** The player's epoch. A pending answer is dropped when it changes. */
  epoch: () => number;
  delayMs: number;
  /** How long the live adapter's produce() gets, per key (timeoutFor in types.ts). */
  timeoutFor: (key: SourceKey) => number;
  log: (msg: string) => void;
  /** The loaded timeline: a person's checkout of a piece it checks out itself gets no scripted answer. */
  timeline?: () => Timeline | null;
}

/** What a scripted answer may read beyond the request and the mock data. */
export interface AnswerContext {
  /** The store, right after the request was applied. */
  state?: CindiaState;
  /** The next ID for an answer to a person: answerId() in the request's epoch. */
  ids?: (prefix: string) => string;
  timeline?: Timeline | null;
  /** True the first time a token is claimed in this epoch, so one decision is answered once. */
  claim?: (token: string) => boolean;
}

/** Trims, lowercases, removes punctuation and collapses spaces, so typed questions match canned ones. */
export function normalizeQuestion(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\p{P}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const OWN_FILE_NOTE: Text = {
  en: "Scripted mode reads the sample statement. Live mode reads your file.",
  zh: "演示模式读取样例对账单，实时模式读取您的文件。",
};

/** Cindy's line for a person's milestone: with a release to propose, and without one. */
export const MILESTONE_PROPOSED: Text = {
  en: "A milestone on this commission is done. I proposed releasing its payment to the maker. Only you can approve it.",
  zh: "这件委托作品完成了一个里程碑。我已提议把这一阶段的款项发给匠人。只有您能批准。",
};
export const MILESTONE_NOTED: Text = {
  en: "A milestone on this commission is done. I noted it. No payment is set to release for it in this demo.",
  zh: "这件委托作品完成了一个里程碑。我已记录。本演示中这一阶段没有待发放的款项。",
};

/** The demo buyer, who checks out on /demo and on the Shop. */
const DEMO_BUYER_ID = "buy_01";
/** The day a person's checkout is dated: the demo's decision day, after September closed. */
const CHECKOUT_DATE = DECISION_DATE;
/** The day a released milestone is paid, as maker payouts are (data-model.md). */
const MILESTONE_PAID_DATE = "2026-10-02";

/** The one wall-clock read in the app: the 1.2-second wait for a person's answer. */
function wallClock(): number {
  return Date.now();
}

let replyCounter = 0;
function replyId(): string {
  replyCounter += 1;
  return `evt_reply_${String(replyCounter).padStart(4, "0")}`;
}

let actCounter = 0;
/** Cindy's lines in answers to people: act_reply_<n>. */
function actReplyId(): string {
  actCounter += 1;
  return `act_reply_${actCounter}`;
}

interface Planned {
  /** Delay after the request, in ms of real time. */
  offset: number;
  event: CindiaEvent;
}

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

/** A card token made from the piece ID with no randomness: tok_ and 12 letters or digits. */
export function tokenFor(pieceId: string): string {
  let h = 0x811c9dc5; // FNV-1a over the ID, as the seed
  for (let i = 0; i < pieceId.length; i += 1) {
    h ^= pieceId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const rng = mulberry32(h);
  let out = "";
  for (let i = 0; i < 12; i += 1) out += TOKEN_ALPHABET[Math.floor(rng() * TOKEN_ALPHABET.length)];
  return `tok_${out}`;
}

/** The filters a query is compared on, with empty lists left out and lists sorted. */
function filterKey(f: SearchFilters | undefined): string {
  const communities = f?.communityIds && f.communityIds.length > 0 ? f.communityIds.toSorted().join("|") : "";
  return `${f?.maxPriceCents ?? ""}#${communities}`;
}

/** The chips a query is compared on, as a set: trimmed, lowercased, sorted. */
function keywordKey(k: string[]): string {
  return [...new Set(k.map((w) => w.trim().toLowerCase()).filter(Boolean))].toSorted().join("|");
}

function sameFilters(a: SearchFilters | undefined, b: SearchFilters | undefined): boolean {
  return filterKey(a) === filterKey(b);
}

function sameKeywords(a: string[], b: string[]): boolean {
  return keywordKey(a) === keywordKey(b);
}

/** The query's dot on the map: the score-weighted center of its top three results with a point. */
function queryPoint(results: SearchResult[], points: ModelReport["points"]): { x: number; y: number } | null {
  const at = new Map(points.map((p) => [p.pieceId, p]));
  let w = 0;
  let x = 0;
  let y = 0;
  for (const r of results.slice(0, 3)) {
    const p = at.get(r.pieceId);
    if (!p || !(r.score > 0)) continue;
    w += r.score;
    x += r.score * p.x;
    y += r.score * p.y;
  }
  if (w > 0) return { x: x / w, y: y / w };
  if (points.length === 0) return null;
  // No result to place it by: the center of every point.
  return { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
}

/** The scripted answer to a request, as events with their offsets after the 1.2-second wait. */
export function scriptedAnswer(req: CindiaEvent, mock: MockAnswers, key: SourceKey | undefined, ctx: AnswerContext = {}): Planned[] {
  const ids = ctx.ids ?? ((prefix: string) => (prefix === "act" ? actReplyId() : answerId(prefix)));
  const event = <T extends EventType>(type: T, payload: Payloads[T], offset = 0, keyless = false): Planned => ({
    offset,
    event: {
      id: replyId(),
      type,
      at: 0,
      source: "scripted",
      ...(key && !keyless ? { key } : {}),
      payload,
    } as CindiaEvent,
  });
  // Cindy's lines carry no key, as v1's own-file note doesn't.
  const fromPlan = (plan: PlannedRunEvent[]): Planned[] =>
    plan.map((p) => event(p.event.type, p.event.payload as never, p.offset, p.event.type === "agent.acted"));
  const runs = mock.swarmRuns ?? [];
  const approvals = mock.allApprovals ?? [];

  switch (req.type) {
    case "concierge.asked": {
      const p = req.payload as Payloads["concierge.asked"];
      if (!mock.curatedSet) return [];
      const payload: Payloads["concierge.answered"] = {
        query: p.query,
        pieceIds: [...mock.curatedSet.pieceIds],
        reasons: { ...mock.curatedSet.reasons },
      };
      return [event("concierge.answered", payload)];
    }
    case "ask.asked": {
      const p = req.payload as Payloads["ask.asked"];
      const q = normalizeQuestion(p.text);
      const hit = (mock.cannedAnswers ?? []).find(
        (a) => normalizeQuestion(a.questions.en) === q || normalizeQuestion(a.questions.zh) === q,
      );
      const payload: Payloads["ask.answered"] = hit
        ? { questionId: p.questionId, answer: { ...hit.answer }, refIds: [...hit.refIds], ...(hit.chart ? { chart: hit.chart } : {}) }
        : { questionId: p.questionId, answer: mock.fallbackAnswer ?? { en: "", zh: "" }, refIds: [] };
      if (!hit && !mock.fallbackAnswer) return [];
      return [event("ask.answered", payload)];
    }
    case "scenario.loaded": {
      const p = req.payload as Payloads["scenario.loaded"];
      const replies: Planned[] = (mock.scenarioReplies ?? []).map((e) => ({
        offset: Math.max(0, e.at),
        event: { ...e, id: replyId(), source: "scripted" as const },
      }));
      const ownFile = p.content !== undefined || p.recordIds === undefined;
      if (ownFile) {
        const last = replies.reduce((m, r) => Math.max(m, r.offset), 0);
        replies.push(event("agent.acted", { actId: ids("act"), kind: "answer", text: { ...OWN_FILE_NOTE } }, last, true));
      }
      return replies;
    }

    case "search.queried": {
      const p = req.payload as Payloads["search.queried"];
      const demo = mock.demoSearch;
      const isDemo =
        demo !== undefined &&
        normalizeQuestion(p.text) === normalizeQuestion(demo.query.text) &&
        sameKeywords(p.keywords, demo.query.keywords) &&
        sameFilters(p.filters, demo.query.filters);
      const answer: Payloads["search.answered"] = isDemo
        ? { ...structuredClone(demo.answer), queryId: p.queryId }
        : {
            queryId: p.queryId,
            results: scoreKeywords(p.keywords, p.filters, mock.searchIndex ?? [], mock.pieces ?? []),
            engine: "keyword_scripted",
          };
      const out = [event("search.answered", answer)];
      const report = mock.report;
      if (report) {
        const query = queryPoint(answer.results, report.points);
        if (query) {
          out.push(
            event(
              "search.mapped",
              {
                queryId: p.queryId,
                modelId: report.trained.modelId || mock.modelId || "",
                points: report.points.map((pt) => ({ pieceId: pt.pieceId, x: pt.x, y: pt.y })),
                query,
                method: "pca",
                approx: true,
              },
              RUN_STEP_MS,
            ),
          );
        }
      }
      return out;
    }
    case "surprise.asked": {
      const p = req.payload as Payloads["surprise.asked"];
      const draw = drawSurprise({ keyword: p.keyword, method: p.method, seed: p.seed }, mock.searchIndex ?? [], mock.pieces ?? []);
      return draw ? [event("surprise.drawn", { surpriseId: p.surpriseId, ...draw })] : [];
    }

    case "support.asked": {
      const p = req.payload as Payloads["support.asked"];
      const q = normalizeQuestion(p.text);
      const run =
        runs.find(
          (r) =>
            r.trigger.kind === "support" &&
            r.side === p.side &&
            r.trigger.matches.some((m) => normalizeQuestion(m) === q) &&
            (!r.trigger.pieceId || p.contextIds.includes(r.trigger.pieceId)) &&
            (!r.trigger.makerId || p.contextIds.includes(r.trigger.makerId)),
        ) ?? mock.fallbackSupportRun;
      return run ? fromPlan(planRun(run, req, ids, { approvals })) : [];
    }
    case "listing.requested": {
      const p = req.payload as Payloads["listing.requested"];
      const notes = normalizeQuestion(p.notes);
      const run = runs.find((r) => r.trigger.kind === "listing" && normalizeQuestion(r.trigger.notes) === notes) ?? mock.fallbackListingRun;
      return run ? fromPlan(planRun(run, req, ids, { approvals })) : [];
    }
    case "storefront.requested": {
      const p = req.payload as Payloads["storefront.requested"];
      // The Designer drafts only the seller's own storefront: any other gets no scripted draft.
      const run = runs.find((r) => r.trigger.kind === "storefront" && r.trigger.storefrontId === p.storefrontId);
      return run ? fromPlan(planRun(run, req, ids, { approvals })) : [];
    }
    case "question.answered": {
      const p = req.payload as Payloads["question.answered"];
      const forwarded = ctx.state?.support.questions[p.questionId]?.forwarded ?? null;
      const named = runs.find((r) => r.trigger.kind === "question" && r.trigger.questionId === p.questionId);
      // Any other question the store holds a forward for gets the relay run's answer. One the store
      // doesn't hold gets none.
      const run = named ?? (forwarded ? runs.find((r) => r.trigger.kind === "question") : undefined);
      if (!run || run.trigger.kind !== "question") return [];
      const runQuestionId = run.trigger.questionId;
      const scripted = (mock.makerQuestions ?? []).find((m) => m.answer.questionId === runQuestionId)?.answer;
      const idMap: Record<string, string> = { [runQuestionId]: p.questionId };
      if (scripted) idMap[scripted.answerId] = p.answerId;
      return fromPlan(
        planRun(run, req, ids, {
          approvals,
          threadId: forwarded?.threadId ?? run.threadId,
          quote: scripted ? { from: scripted.text, to: p.text } : undefined,
          idMap,
        }),
      );
    }

    case "watch.started": {
      const p = req.payload as Payloads["watch.started"];
      const scan = mock.scriptedScan;
      if (!scan) return [];
      const cands = mock.counterfeitCandidates ?? [];
      const out: Planned[] = [
        event("watch.scanned", {
          scanId: p.scanId,
          engine: "scripted",
          candidates: cands.length,
          results: cands.map((c) => ({ title: c.title, url: c.url, snippet: c.snippet, similarity: c.similarity, verdict: c.verdict })),
        }),
      ];
      const map = new Map<string, string>();
      const hits: CounterfeitCandidate[] = [];
      for (const cftId of scan.cftIds) {
        const c = cands.find((x) => x.id === cftId);
        if (!c) continue;
        const id = ids("cft");
        map.set(cftId, id);
        hits.push(c);
        out.push(
          event(
            "counterfeit.flagged",
            { cftId: id, scanId: p.scanId, pieceId: c.pieceId, url: c.url, title: c.title, snippet: c.snippet, similarity: c.similarity, claim: { ...c.claim } },
            out.length * RUN_STEP_MS,
          ),
        );
      }
      // The draft and the approval are about the person's own hits, so a scan with none has neither.
      if (hits.length === 0) return out;
      const rec = scan.approvalId ? approvals.find((a) => a.id === scan.approvalId) : undefined;
      const aprId = scan.approvalId ? ids("apr") : undefined;
      const fu = scan.followUpId ? (mock.allFollowUps ?? []).find((f) => f.id === scan.followUpId) : undefined;
      if (fu) {
        out.push(
          event(
            "followup.drafted",
            { followUpId: ids("fup"), approvalId: aprId ?? fu.approvalId, to: { ...fu.to }, subject: { ...fu.subject }, body: { ...fu.body } },
            out.length * RUN_STEP_MS,
          ),
        );
      }
      if (aprId) {
        const kind = rec?.kind ?? "report_listing";
        const subjectIds = rec ? rec.subjectIds.map((id) => map.get(id) ?? id) : [...map.values()];
        out.push(
          event(
            "approval.requested",
            {
              approvalId: aprId,
              approval: {
                kind,
                subjectIds,
                ...(rec?.amountCents !== undefined ? { amountCents: rec.amountCents } : {}),
                overLimit: rec?.overLimit ?? false,
                proposedBy: "cindy",
                summary: inlineSummary(kind, hits[0].title),
                decisionDate: rec?.decisionDate ?? DECISION_DATE,
              },
            },
            out.length * RUN_STEP_MS,
          ),
        );
      }
      return out;
    }

    case "piece.opened": {
      const p = req.payload as Payloads["piece.opened"];
      const split = mock.splits?.[p.pieceId];
      return split ? [event("split.shown", structuredClone(split))] : [];
    }
    case "checkout.started": {
      const p = req.payload as Payloads["checkout.started"];
      // The loaded timeline's own checkout plays from the timeline.
      const own = ctx.timeline?.events.some((e) => e.type === "checkout.started" && (e.payload as Payloads["checkout.started"]).pieceId === p.pieceId);
      if (own) return [];
      const out = [event("card.tokenized", { token: tokenFor(p.pieceId), brand: "visa", last4: "4242", pieceId: p.pieceId }, 0, true)];
      const split = mock.splits?.[p.pieceId];
      const piece = (mock.pieces ?? []).find((x) => x.id === p.pieceId);
      if (!split || !piece) return out;
      // A person's order stays in the buyer's store: out of the month, the ledger and the money map.
      const orderId = ids("ord");
      out.push(
        event(
          "order.placed",
          { orderId, pieceId: p.pieceId, channelId: "ch_cindia", buyerId: DEMO_BUYER_ID, grossCents: split.grossCents, date: CHECKOUT_DATE },
          RUN_STEP_MS,
          true,
        ),
        event("receipt.updated", { orderId, status: "received", makerId: piece.makerId, makerShareCents: split.makerShareCents }, 2 * RUN_STEP_MS, true),
      );
      return out;
    }
    case "wip.milestone_reached": {
      const p = req.payload as Payloads["wip.milestone_reached"];
      const release = approvals.find((a) => a.kind === "milestone_release" && a.subjectIds.includes(p.wipId) && a.subjectIds.includes(p.milestoneId));
      const out = [
        event("agent.acted", { actId: ids("act"), kind: "propose", text: { ...(release ? MILESTONE_PROPOSED : MILESTONE_NOTED) }, refId: p.milestoneId }, 0, true),
      ];
      if (release) out.push(event("approval.requested", { approvalId: release.id }, RUN_STEP_MS));
      return out;
    }
    case "approval.granted": {
      const p = req.payload as Payloads["approval.granted"];
      const item = ctx.state?.approvals.items[p.approvalId];
      const rec = approvals.find((a) => a.id === p.approvalId);
      const kind = rec?.kind ?? item?.approval?.kind;
      if (kind !== "milestone_release") return []; // v1's approvals get nothing more
      if (item && item.status !== "granted") return []; // a decline came first
      const subjects = rec?.subjectIds ?? item?.approval?.subjectIds ?? [];
      const wip = (mock.worksInProgress ?? []).find((w) => subjects.includes(w.id));
      const milestone = wip?.milestones.find((m) => subjects.includes(m.milestoneId));
      if (!wip || !milestone || milestone.status === "paid") return [];
      if (ctx.state?.wip.milestones[milestone.milestoneId]?.status === "paid") return [];
      if (ctx.claim && !ctx.claim(`grant:${p.approvalId}`)) return [];
      const amountCents = Math.floor((wip.priceCents * milestone.shareBps + 5000) / 10000);
      return [
        event("wip.milestone_paid", { wipId: wip.id, milestoneId: milestone.milestoneId, amountCents, date: MILESTONE_PAID_DATE }),
        event(
          "money.moved",
          {
            moveId: ids("mv"),
            kind: "milestone",
            from: { kind: "cindia" },
            to: { kind: "maker", id: wip.makerId },
            amountCents,
            refId: milestone.milestoneId,
            date: MILESTONE_PAID_DATE,
          },
          RUN_STEP_MS,
        ),
      ];
    }
    default:
      // approval.declined, and a grant on any other kind: the store has already applied it.
      return [];
  }
}

export interface Responder {
  /** Handles one event. Returns a promise that settles when every answer has been delivered or dropped. */
  handle(e: CindiaEvent): Promise<void>;
  dispose(): void;
}

export function createResponder(deps: ResponderDeps): Responder {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let claimedEpoch: number | null = null;
  const claimed = new Set<string>();

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        timers.delete(t);
        resolve();
      }, ms);
      timers.add(t);
    });

  function deliver(e: CindiaEvent, epoch: number): void {
    if (deps.epoch() !== epoch) return; // a reset or seek happened, drop it
    deps.emit({ ...e, at: Math.round(deps.now()) });
  }

  function context(epoch: number): AnswerContext {
    return {
      state: deps.getState(),
      // Numbers are reserved the moment the answer is planned, in the request's epoch.
      ids: (prefix) => (prefix === "act" ? actReplyId() : answerId(prefix, epoch)),
      timeline: deps.timeline?.() ?? null,
      claim: (token) => {
        if (claimedEpoch !== epoch) {
          claimed.clear();
          claimedEpoch = epoch;
        }
        if (claimed.has(token)) return false;
        claimed.add(token);
        return true;
      },
    };
  }

  async function playScripted(req: CindiaEvent, key: SourceKey | undefined, epoch: number, startedAt: number) {
    if (deps.epoch() !== epoch) return;
    const planned = scriptedAnswer(req, deps.mock(), key, context(epoch)).toSorted((a, b) => a.offset - b.offset);
    for (const p of planned) {
      const due = startedAt + deps.delayMs + p.offset;
      const left = due - wallClock();
      if (left > 0) await wait(left);
      deliver(p.event, epoch);
    }
  }

  async function handle(req: CindiaEvent): Promise<void> {
    if (req.source !== "user") return; // scripted requests are answered in the timeline
    const epoch = deps.epoch();
    const t0 = wallClock();
    // A person's checkout has no key: its scripted answer plays in both modes, past every adapter.
    if (req.type === "checkout.started") {
      await playScripted(req, undefined, epoch, t0);
      return;
    }
    const key = REQUEST_KEYS[req.type];
    if (!key) return;
    const adapter = deps.adapterFor(key);

    if (adapter) {
      try {
        const out = await withTimeout(adapter.produce(req, deps.getState()), deps.timeoutFor(key));
        if (Array.isArray(out) && out.length > 0) {
          for (const e of out) deliver(asLive(e, key), epoch);
          return;
        }
        deps.log(`${key} returned nothing for ${req.type}, using the scripted answer`);
      } catch (err) {
        deps.log(`${key} failed for ${req.type} (${err instanceof Error ? err.message : String(err)}), using the scripted answer`);
      }
    }
    await playScripted(req, key, epoch, t0);
  }

  const off = deps.onEvent((e) => {
    void handle(e);
  });

  return {
    handle,
    dispose() {
      off();
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
}

export const REQUEST_DEFAULTS = { delayMs: REPLY_DELAY_MS, timeoutFor };
