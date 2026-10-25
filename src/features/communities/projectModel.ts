// The one place that merges the mock with the store for projects and works in progress (T3). Pure
// selectors over src/mock and a CindiaState, so components and unit tests share them:
// - a project's raised amount is the mock's raisedCents plus the store's addedCents, which the
//   store keeps as the sum of the project's distinct contributions (a replayed project.funded
//   counts once). This file never adds amounts up as they arrive.
// - a milestone's status is the newest of the mock's status and its wip.* events, its amount is
//   priceCents × shareBps / 10000 rounded half up once per milestone (or the paid event's amount),
//   and its release approval is the store's state of the milestone_release approval naming it.
// Nothing here reads the wall clock.
import type { AgentAct, CindiaState } from "../../core/state";
import type { Approval, ApprovalStatus, Community, InlineApproval, MilestoneStatus, Project, Text, WorkInProgress } from "../../core/types";
import { allApprovals, apr_05, communities, projects, studio, worksInProgress } from "../../mock";

/** The demo's buyer, who makes every person's contribution (the plan's project.funded payload). */
export const DEMO_BUYER_ID = "buy_01";

/** The fixed demo date a person's wip.milestone_reached carries, the date approvals decide on. */
export const DEMO_DECISION_DATE = apr_05.decisionDate;

/** The amount picker's choices, in cents. The project's addOnCents is picked first. */
export const FUND_AMOUNTS_CENTS: readonly number[] = [500, 1000, 2500];

const USER_CONTRIBUTION = /^ctb_user_(\d+)$/;

/** A project's contribution in this run, as the store keeps it. */
export interface Contribution {
  contributionId: string;
  projectId: string;
  amountCents: number;
  buyerId: string;
  orderId?: string;
  at: number;
}

export type ReleaseState = "none" | "pending" | "granted" | "declined";

/** One milestone as the screens show it. */
export interface MilestoneView {
  milestoneId: string;
  label: Text;
  shareBps: number;
  amountCents: number;
  status: MilestoneStatus;
  date?: string;
  /** The store's state of the milestone_release approval that names this milestone. */
  release: ReleaseState;
  approvalId?: string;
}

// ---- Lookups -----------------------------------------------------------------------------------

export function findCommunity(id: string | undefined): Community | undefined {
  return id ? communities.find((c) => c.id === id) : undefined;
}

export function findProject(id: string | undefined): Project | undefined {
  return id ? projects.find((p) => p.id === id) : undefined;
}

export function findWip(id: string | undefined): WorkInProgress | undefined {
  return id ? worksInProgress.find((w) => w.id === id) : undefined;
}

/** The Sell site's community: the one whose studio is the co-op's (com_dine). */
export function sellCommunity(): Community | undefined {
  return communities.find((c) => c.studioId === studio.id);
}

/** A community's project, the first of its projectIds. */
export function projectOf(community: Community): Project | undefined {
  return findProject(community.projectIds[0]);
}

/** A community's works in progress, in mock order. */
export function wipsOf(communityId: string): WorkInProgress[] {
  return worksInProgress.filter((w) => w.communityId === communityId);
}

// ---- Projects ----------------------------------------------------------------------------------

/** What a project has raised: the mock's raisedCents plus what this run added (the store's sum). */
export function raisedCents(project: Project, state: Pick<CindiaState, "projects">): number {
  return project.raisedCents + (state.projects.addedCents[project.id] ?? 0);
}

/** A project's contributions in this run, in the order they arrived (by `at`, then as stored). */
export function contributionsOf(projectId: string, state: Pick<CindiaState, "projects">): Contribution[] {
  return Object.values(state.projects.contributions)
    .filter((c) => c.projectId === projectId)
    .map((c) => ({ ...c }))
    .toSorted((a, b) => a.at - b.at);
}

/** The next ctb_user_<n> after every person's contribution in the store (data-model.md, ID scheme). */
export function nextContributionId(state: Pick<CindiaState, "projects">): string {
  let top = 0;
  for (const id of Object.keys(state.projects.contributions)) {
    const m = USER_CONTRIBUTION.exec(id);
    if (m) top = Math.max(top, Number(m[1]));
  }
  return `ctb_user_${top + 1}`;
}

/** The picker's choices for a project: its addOnCents first, then the others, without repeats. */
export function fundAmounts(project: Project): number[] {
  return [...new Set([project.addOnCents, ...FUND_AMOUNTS_CENTS])].toSorted((a, b) => a - b);
}

// ---- Works in progress -------------------------------------------------------------------------

/** A milestone's share of a commission's price: priceCents × shareBps / 10000, rounded half up. */
export function milestoneAmount(priceCents: number, shareBps: number): number {
  return Math.floor((priceCents * shareBps + 5000) / 10000);
}

const STATUS_RANK: Record<MilestoneStatus, number> = { pending: 0, reached: 1, paid: 2 };

/** The milestone_release approval for a commission's milestone, from src/mock or the store's inline copy. */
export function releaseApprovalId(wipId: string, milestoneId: string, state: Pick<CindiaState, "approvals">): string | undefined {
  const names = (a: Pick<Approval | InlineApproval, "kind" | "subjectIds">) =>
    a.kind === "milestone_release" && a.subjectIds.includes(wipId) && a.subjectIds.includes(milestoneId);
  const fromMock = allApprovals.find(names);
  if (fromMock) return fromMock.id;
  for (const item of Object.values(state.approvals.items)) {
    if (item.approval && names(item.approval)) return item.approvalId;
  }
  return undefined;
}

/** The store's state of an approval: none until it's requested or decided in this run. */
export function releaseState(approvalId: string | undefined, state: Pick<CindiaState, "approvals">): ReleaseState {
  if (!approvalId) return "none";
  const item = state.approvals.items[approvalId];
  if (!item) return "none";
  const status: ApprovalStatus = item.status;
  if (status === "granted" || status === "declined") return status;
  return item.requested ? "pending" : "none";
}

/** A commission's milestones with their status, amount, date and release approval. */
export function wipMilestones(wip: WorkInProgress, state: Pick<CindiaState, "wip" | "approvals">): MilestoneView[] {
  return wip.milestones.map((m) => {
    const ev = state.wip.milestones[m.milestoneId];
    const fromEvent = ev && ev.wipId === wip.id && STATUS_RANK[ev.status] >= STATUS_RANK[m.status];
    const status: MilestoneStatus = fromEvent ? ev.status : m.status;
    const date = fromEvent ? ev.date : m.date;
    const paidAmount = fromEvent && ev.status === "paid" ? ev.amountCents : undefined;
    const approvalId = releaseApprovalId(wip.id, m.milestoneId, state);
    return {
      milestoneId: m.milestoneId,
      label: m.label,
      shareBps: m.shareBps,
      amountCents: paidAmount ?? milestoneAmount(wip.priceCents, m.shareBps),
      status,
      ...(date ? { date } : {}),
      release: releaseState(approvalId, state),
      ...(approvalId ? { approvalId } : {}),
    };
  });
}

/** The one milestone Sell can release: the first pending one, when every milestone before it is paid. */
export function releasableMilestone(milestones: readonly MilestoneView[]): string | null {
  const first = milestones.find((m) => m.status !== "paid");
  return first && first.status === "pending" ? first.milestoneId : null;
}

/** Cindy's newest agent.acted line about any of these IDs (a milestone, a commission or a project). */
export function newestActAbout(ids: readonly string[], state: Pick<CindiaState, "agent">): AgentAct | null {
  const want = new Set(ids);
  let best: AgentAct | null = null;
  // actIds keeps arrival order, so on a tie in `at` the later one is newer.
  for (const id of state.agent.actIds) {
    const act = state.agent.acts[id];
    if (!act || !act.refId || !want.has(act.refId)) continue;
    if (!best || act.at >= best.at) best = act;
  }
  return best;
}
