// The seller hub's plain functions over the store and the mock: the IDs a person's events take,
// which run and approval belong to the followed listing, a maker's questions in log order, and a
// work in progress's milestones with their live status. No components, so unit tests run them.
import type { CindiaState } from "../../core/state";
import type { Lang, MilestoneStatus, WorkInProgress } from "../../core/types";
import { bps } from "../../mock";
import type { MilestoneItem } from "../../ui";
import { approvalRecord } from "./overviewFigures";

/** The prefix of a person's listing IDs (data-model.md, the ID scheme). */
export const LISTING_PREFIX = "lst_user_";

/** The prefix of a maker's own answer IDs (data-model.md, the ID scheme). */
export const ANSWER_PREFIX = "ans_user_";

/** One more than the highest `<prefix><n>` among the IDs: features number IDs by counting the store. */
function nextUserId(prefix: string, ids: Iterable<string>): string {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

/** The next lst_user_<n> for a person's listing.requested. */
export function nextListingId(requestIds: Iterable<string>): string {
  return nextUserId(LISTING_PREFIX, requestIds);
}

/** The next ans_user_<n> for a maker's own question.answered. */
export function nextAnswerId(existing: Iterable<string>): string {
  return nextUserId(ANSWER_PREFIX, existing);
}

/** The responder's normalization, so the screen can tell when scripted mode will draw a sample. */
export function normalizeNotes(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\p{P}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A text's language: Chinese when it holds Han characters, else English. */
export function textLang(text: string): Lang {
  return /[㐀-鿿]/.test(text) ? "zh" : "en";
}

type Step = CindiaState["swarm"]["steps"][string];

/** The newest run on a listing's thread (a listing run's threadId is its listingId), and its steps in arrival order. */
export function listingSteps(s: Pick<CindiaState, "swarm">, listingId: string | null): { runId: string | null; steps: Step[] } {
  if (!listingId) return { runId: null, steps: [] };
  let runId: string | null = null;
  let firstAt = -Infinity;
  for (const id of s.swarm.runIds) {
    const run = s.swarm.runs[id];
    if (!run || run.threadId !== listingId) continue;
    if (run.firstAt >= firstAt) {
      runId = id;
      firstAt = run.firstAt;
    }
  }
  const steps = runId ? s.swarm.runs[runId].stepIds.map((id) => s.swarm.steps[id]).filter((x): x is Step => x !== undefined) : [];
  return { runId, steps };
}

/** The newest requested listing_publish approval that names the listing, with its status. */
export function publishApproval(
  s: Pick<CindiaState, "approvals">,
  listingId: string | null,
): { approvalId: string; status: "pending" | "granted" | "declined" } | null {
  if (!listingId) return null;
  const ids = s.approvals.approvalIds;
  for (let i = ids.length - 1; i >= 0; i--) {
    const item = s.approvals.items[ids[i]];
    if (!item || !item.requested) continue;
    const rec = approvalRecord(ids[i], s.approvals.items);
    if (rec && rec.kind === "listing_publish" && rec.subjectIds.includes(listingId)) return { approvalId: ids[i], status: item.status };
  }
  return null;
}

type Question = CindiaState["support"]["questions"][string];

/** A maker's forwarded questions, newest first by their place in the log, then by time. */
export function makerQuestionsFor(s: Pick<CindiaState, "support" | "log">, makerId: string): { questionId: string; q: Question }[] {
  const place = new Map<string, number>();
  s.log.entries.forEach((e, i) => place.set(e.id, i));
  const list: { questionId: string; q: Question }[] = [];
  for (const [questionId, q] of Object.entries(s.support.questions)) {
    if (q.forwarded && q.forwarded.makerId === makerId) list.push({ questionId, q });
  }
  list.sort((a, b) => {
    const pa = place.get(a.q.forwarded!.eventId) ?? -1;
    const pb = place.get(b.q.forwarded!.eventId) ?? -1;
    if (pa !== pb) return pb - pa;
    if (a.q.forwarded!.at !== b.q.forwarded!.at) return b.q.forwarded!.at - a.q.forwarded!.at;
    return a.questionId < b.questionId ? 1 : -1;
  });
  return list;
}

/** Every answerId the store's questions hold. */
export function answerIds(s: Pick<CindiaState, "support">): string[] {
  const out: string[] = [];
  for (const q of Object.values(s.support.questions)) if (q.answered) out.push(q.answered.answerId);
  return out;
}

/** A work in progress's milestones, each with its status from the store, falling back to the mock's. */
export function milestoneItems(wip: WorkInProgress, live: CindiaState["wip"]["milestones"]): MilestoneItem[] {
  return wip.milestones.map((m) => {
    const st = live[m.milestoneId];
    const fromStore = st !== undefined && st.wipId === wip.id;
    const status: MilestoneStatus = fromStore ? st.status : m.status;
    const date = fromStore ? st.date : m.date;
    return {
      milestoneId: m.milestoneId,
      label: m.label,
      shareBps: m.shareBps,
      amountCents: (fromStore ? st.amountCents : undefined) ?? bps(wip.priceCents, m.shareBps),
      status,
      ...(date ? { date } : {}),
    };
  });
}
