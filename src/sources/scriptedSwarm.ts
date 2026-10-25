// Turns a scripted run (src/mock/swarm.ts) into the events that answer a person (events.md,
// "Planned runs" and "Re-keying a person's run"):
// - offsets start at 0, each step 300 ms after the one before, each final event 300 ms after the one
//   before it, the first 300 ms after the last step. The responder adds its 1.2-second wait.
// - the run lands on the request's thread: its threadId, a listing's listingId, a storefront's
//   storefrontId, or for a maker's answer the thread its question was forwarded on.
// - every ID the run would share with the tour is replaced through `ids` (answerId()): the run, its
//   steps and checks, a listing's piece, a storefront's blocks, a forwarded question, counterfeit hits,
//   follow-ups, approvals, money moves and Cindy's lines. A re-keyed approval.requested carries the
//   inline approval, copied from the scripted record with subjectIds naming the person's records.
import type { CindiaEvent, Payloads } from "../core/events";
import type { Approval, ApprovalKind, InlineApproval, PlannedEvent, ScriptedRun, Text } from "../core/types";

/** The gap between a run's events, in ms. */
export const RUN_STEP_MS = 300;

/** The date every scripted approval's decision carries (data-model.md, Approval). */
export const DECISION_DATE = "2026-10-01";

export interface PlannedRunEvent {
  /** ms after the run starts. */
  offset: number;
  event: PlannedEvent;
}

export interface PlanRunOptions {
  /** The thread the run lands on, when the request names none (a maker's answer). */
  threadId?: string;
  /** Replaces the scripted answer's text with the person's own, wherever the reply quotes it. */
  quote?: { from: string; to: string };
  /** The scripted approval records (allApprovals), for the inline copy. */
  approvals?: Approval[];
  /** IDs the run names that become the request's own, such as qst_01 to a person's question. */
  idMap?: Record<string, string>;
}

/** The line an inline approval shows when the approvals feature finds no record for it. */
export function inlineSummary(kind: ApprovalKind, subject?: string): Text {
  switch (kind) {
    case "listing_publish":
      return subject
        ? { en: `Publish the draft listing "${subject}" in the shop.`, zh: `将草稿商品“${subject}”发布到商店。` }
        : { en: "Publish this draft listing in the shop.", zh: "将这件草稿商品发布到商店。" };
    case "report_listing":
      return subject
        ? { en: `Report the listing "${subject}" to the sandbox market's trust team for review.`, zh: `将商品“${subject}”提交给沙盒市集的信任团队核查。` }
        : { en: "Report this listing to the sandbox market's trust team for review.", zh: "将这件商品提交给沙盒市集的信任团队核查。" };
    default:
      return { en: "Cindy proposed this. Only you can approve it.", zh: "Cindy提议，只有您能批准。" };
  }
}

/** The thread a request's run lands on. */
function threadFor(run: ScriptedRun, request: CindiaEvent, opts: PlanRunOptions): string {
  if (opts.threadId) return opts.threadId;
  switch (request.type) {
    case "support.asked":
      return (request.payload as Payloads["support.asked"]).threadId;
    case "listing.requested":
      return (request.payload as Payloads["listing.requested"]).listingId;
    case "storefront.requested":
      return (request.payload as Payloads["storefront.requested"]).storefrontId;
    default:
      return run.threadId;
  }
}

/** Puts the person's words where the scripted reply quotes the scripted answer. */
function quoteText(reply: Text, quote: { from: string; to: string } | undefined): Text {
  if (!quote || !quote.from || quote.from === quote.to) return { ...reply };
  const en = reply.en.includes(quote.from) ? reply.en.split(quote.from).join(quote.to) : `In the maker's own words: "${quote.to}"`;
  // The Chinese reply carries Cindy's translation of the scripted answer, which would misquote the
  // person, so it quotes the maker's words as she wrote them instead, marked as not translated.
  const zh = `匠人的原话（未翻译）：“${quote.to}”`;
  return { en, zh };
}

export function planRun(run: ScriptedRun, request: CindiaEvent, ids: (prefix: string) => string, opts: PlanRunOptions = {}): PlannedRunEvent[] {
  const thread = threadFor(run, request, opts);
  const map = new Map<string, string>(Object.entries(opts.idMap ?? {}));
  const keep = (id: string) => map.get(id) ?? id;
  const rekey = (id: string, prefix: string) => {
    let next = map.get(id);
    if (next === undefined) {
      next = ids(prefix);
      map.set(id, next);
    }
    return next;
  };

  const listingReq = request.type === "listing.requested" ? (request.payload as Payloads["listing.requested"]) : null;
  const storefrontReq = request.type === "storefront.requested" ? (request.payload as Payloads["storefront.requested"]) : null;
  const supportReq = request.type === "support.asked" ? (request.payload as Payloads["support.asked"]) : null;

  // The request's own records take the place of the run's.
  map.set(run.threadId, thread);
  if (listingReq && run.trigger.kind === "listing") map.set(run.trigger.listingId, listingReq.listingId);
  if (storefrontReq && run.trigger.kind === "storefront") map.set(run.trigger.storefrontId, storefrontReq.storefrontId);

  // Pass 1: reserve every new ID in run order, so the numbers follow the run and every reference
  // below finds its new ID, wherever in the run it appears.
  const runId = rekey(run.runId, "run");
  for (const step of run.steps) rekey(step.stepId, "stp");
  for (const f of run.final) {
    switch (f.type) {
      case "listing.drafted":
        if (listingReq) map.set(f.payload.listingId, listingReq.listingId);
        for (const c of f.payload.checks) rekey(c.checkId, "chk");
        break;
      case "listing.indexed":
        if (listingReq) map.set(f.payload.listingId, listingReq.listingId);
        rekey(f.payload.pieceId, "pc");
        break;
      case "storefront.drafted":
        if (storefrontReq) map.set(f.payload.storefrontId, storefrontReq.storefrontId);
        for (const b of f.payload.blocks) rekey(b.blockId, "blk");
        break;
      case "question.forwarded":
        rekey(f.payload.questionId, "qst");
        break;
      case "counterfeit.flagged":
        rekey(f.payload.cftId, "cft");
        break;
      case "followup.drafted":
        rekey(f.payload.followUpId, "fup");
        break;
      case "approval.requested":
        rekey(f.payload.approvalId, "apr");
        break;
      case "money.moved":
        rekey(f.payload.moveId, "mv");
        break;
      case "agent.acted":
        rekey(f.payload.actId, "act");
        break;
      default:
        break;
    }
  }

  const out: PlannedRunEvent[] = [];
  const push = (event: PlannedEvent) => out.push({ offset: out.length * RUN_STEP_MS, event });

  for (const step of run.steps) {
    push({ type: "swarm.step", payload: { ...structuredClone(step), runId, threadId: thread, stepId: keep(step.stepId) } });
  }

  let draftTitle: string | undefined;
  for (const f of run.final) {
    const e = structuredClone(f) as PlannedEvent;
    switch (e.type) {
      case "support.answered": {
        const p = e.payload;
        p.threadId = thread;
        p.runId = runId;
        p.reply = quoteText(p.reply, opts.quote);
        p.refIds = p.refIds.map(keep);
        if (p.approvalIds) p.approvalIds = p.approvalIds.map(keep);
        break;
      }
      case "support.escalated":
        e.payload.threadId = thread;
        e.payload.runId = runId;
        e.payload.approvalId = keep(e.payload.approvalId);
        break;
      case "question.forwarded": {
        const p = e.payload;
        p.questionId = keep(p.questionId);
        p.threadId = thread;
        if (supportReq) {
          p.text = supportReq.text;
          p.lang = supportReq.lang;
        }
        break;
      }
      case "listing.drafted": {
        const p = e.payload;
        p.listingId = keep(p.listingId);
        if (listingReq) p.makerId = listingReq.makerId;
        p.checks = p.checks.map((c) => ({ ...c, checkId: keep(c.checkId) }));
        draftTitle = p.title.en;
        break;
      }
      case "listing.indexed":
        e.payload.listingId = keep(e.payload.listingId);
        e.payload.pieceId = keep(e.payload.pieceId);
        break;
      case "storefront.drafted":
        e.payload.storefrontId = keep(e.payload.storefrontId);
        e.payload.blocks = e.payload.blocks.map((b) => ({ ...b, blockId: keep(b.blockId) }));
        break;
      case "counterfeit.flagged":
        e.payload.cftId = keep(e.payload.cftId);
        break;
      case "followup.drafted":
        e.payload.followUpId = keep(e.payload.followUpId);
        e.payload.approvalId = keep(e.payload.approvalId);
        break;
      case "approval.requested": {
        const oldId = e.payload.approvalId;
        e.payload.approvalId = keep(oldId);
        e.payload.approval = inlineFor(oldId, e.payload.approval, opts.approvals, keep, listingReq?.listingId, draftTitle);
        break;
      }
      case "money.moved":
        e.payload.moveId = keep(e.payload.moveId);
        e.payload.refId = keep(e.payload.refId);
        break;
      case "agent.acted":
        e.payload.actId = keep(e.payload.actId);
        if (e.payload.refId) e.payload.refId = keep(e.payload.refId);
        break;
      default:
        break;
    }
    push(e);
  }

  // A person's listing run always ends with its own approval to publish that listing.
  if (listingReq && !out.some((p) => p.event.type === "approval.requested")) {
    push({
      type: "approval.requested",
      payload: {
        approvalId: ids("apr"),
        approval: {
          kind: "listing_publish",
          subjectIds: [listingReq.listingId],
          overLimit: false,
          proposedBy: "cindy",
          summary: inlineSummary("listing_publish", draftTitle),
          decisionDate: DECISION_DATE,
        },
      },
    });
  }
  return out;
}

/** The inline approval for a re-keyed approval: the scripted record's fields, naming the person's records. */
function inlineFor(
  oldId: string,
  given: InlineApproval | undefined,
  approvals: Approval[] | undefined,
  keep: (id: string) => string,
  listingId: string | undefined,
  title: string | undefined,
): InlineApproval {
  const rec = approvals?.find((a) => a.id === oldId);
  const kind: ApprovalKind = given?.kind ?? rec?.kind ?? (listingId ? "listing_publish" : "support_action");
  let subjectIds = (given?.subjectIds ?? rec?.subjectIds ?? []).map(keep);
  if (kind === "listing_publish" && listingId && !subjectIds.includes(listingId)) subjectIds = [listingId];
  const amountCents = given?.amountCents ?? rec?.amountCents;
  return {
    kind,
    subjectIds,
    ...(amountCents !== undefined ? { amountCents } : {}),
    overLimit: given?.overLimit ?? rec?.overLimit ?? false,
    proposedBy: "cindy",
    summary: given?.summary ? { ...given.summary } : inlineSummary(kind, kind === "listing_publish" ? title : undefined),
    decisionDate: given?.decisionDate ?? rec?.decisionDate ?? DECISION_DATE,
  };
}
