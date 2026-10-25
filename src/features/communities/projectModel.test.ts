// Unit tests for the project model's pure selectors (T3). Expected values come from src/mock/.
import { describe, expect, it } from "vitest";
import { initialState, type CindiaState } from "../../core/state";
import { apr_05, communities, demoContribution, projects, worksInProgress } from "../../mock";
import {
  contributionsOf,
  fundAmounts,
  milestoneAmount,
  nextContributionId,
  newestActAbout,
  raisedCents,
  releasableMilestone,
  sellCommunity,
  wipMilestones,
} from "./projectModel";

const prj01 = projects[0];
const wip01 = worksInProgress[0];

function withContributions(list: { contributionId: string; projectId: string; amountCents: number; at: number; orderId?: string }[]): CindiaState {
  const s = initialState();
  const contributions: CindiaState["projects"]["contributions"] = {};
  const added: Record<string, number> = {};
  for (const c of list) {
    contributions[c.contributionId] = { buyerId: "buy_01", ...c };
    added[c.projectId] = (added[c.projectId] ?? 0) + c.amountCents;
  }
  return { ...s, projects: { contributions, addedCents: added } };
}

describe("projects", () => {
  it("raised is the mock's raisedCents plus the store's addedCents", () => {
    expect(raisedCents(prj01, initialState())).toBe(prj01.raisedCents);
    const s = withContributions([{ ...demoContribution, at: 10 }]);
    expect(raisedCents(prj01, s)).toBe(prj01.raisedCents + demoContribution.amountCents);
    expect(raisedCents(projects[1], s)).toBe(projects[1].raisedCents);
  });

  it("lists a project's contributions in arrival order", () => {
    const s = withContributions([
      { contributionId: "ctb_user_1", projectId: prj01.id, amountCents: 1000, at: 50 },
      { ...demoContribution, at: 10 },
      { contributionId: "ctb_user_2", projectId: projects[1].id, amountCents: 500, at: 20 },
    ]);
    expect(contributionsOf(prj01.id, s).map((c) => c.contributionId)).toEqual([demoContribution.contributionId, "ctb_user_1"]);
  });

  it("numbers a person's contributions after the highest ctb_user_ in the store", () => {
    expect(nextContributionId(initialState())).toBe("ctb_user_1");
    const s = withContributions([
      { ...demoContribution, at: 0 },
      { contributionId: "ctb_user_3", projectId: prj01.id, amountCents: 500, at: 1 },
    ]);
    expect(nextContributionId(s)).toBe("ctb_user_4");
  });

  it("offers the project's add-on first among the picker's amounts", () => {
    const amounts = fundAmounts(prj01);
    expect(amounts[0]).toBe(prj01.addOnCents);
    expect(amounts).toEqual([500, 1000, 2500]);
  });
});

describe("works in progress", () => {
  it("rounds each milestone's share half up, and the shares add up to the price", () => {
    expect(milestoneAmount(1001, 5000)).toBe(501);
    expect(milestoneAmount(1003, 5000)).toBe(502);
    for (const w of worksInProgress) {
      const total = wipMilestones(w, initialState()).reduce((sum, m) => sum + m.amountCents, 0);
      expect(total).toBe(w.priceCents);
    }
  });

  it("starts wip_01 with mls_01 paid and the release on mls_02", () => {
    const ms = wipMilestones(wip01, initialState());
    expect(ms.map((m) => m.status)).toEqual(wip01.milestones.map((m) => m.status));
    expect(ms[0].status).toBe("paid");
    expect(releasableMilestone(ms)).toBe(apr_05.subjectIds[1]);
    expect(ms[1].release).toBe("none");
    expect(ms[1].approvalId).toBe(apr_05.id);
  });

  it("takes the newest status from the store, and no button while a milestone is reached", () => {
    const s = initialState();
    s.wip.milestones.mls_02 = { wipId: wip01.id, status: "reached", date: apr_05.decisionDate, at: 5 };
    s.approvals.items[apr_05.id] = { approvalId: apr_05.id, status: "pending", requested: true };
    const ms = wipMilestones(wip01, s);
    expect(ms[1].status).toBe("reached");
    expect(ms[1].release).toBe("pending");
    expect(releasableMilestone(ms)).toBeNull();
  });

  it("shows a paid milestone with the paid event's amount and moves the button on", () => {
    const s = initialState();
    s.wip.milestones.mls_02 = { wipId: wip01.id, status: "paid", date: "2026-10-02", amountCents: apr_05.amountCents, at: 9 };
    s.approvals.items[apr_05.id] = { approvalId: apr_05.id, status: "granted", requested: true };
    const ms = wipMilestones(wip01, s);
    expect(ms[1].status).toBe("paid");
    expect(ms[1].amountCents).toBe(apr_05.amountCents);
    expect(ms[1].date).toBe("2026-10-02");
    expect(ms[1].release).toBe("granted");
    expect(releasableMilestone(ms)).toBe(wip01.milestones[2].milestoneId);
  });

  it("never lets an older event take a paid milestone back", () => {
    const s = initialState();
    s.wip.milestones.mls_01 = { wipId: wip01.id, status: "reached", date: "2026-10-01", at: 1 };
    expect(wipMilestones(wip01, s)[0].status).toBe("paid");
  });
});

describe("the Sell side", () => {
  it("is the co-op's community", () => {
    expect(sellCommunity()?.id).toBe(communities[0].id);
  });

  it("picks Cindy's newest line about the given IDs", () => {
    const s = initialState();
    s.agent.acts = {
      act_0001: { actId: "act_0001", kind: "match", text: { en: "a", zh: "a" }, at: 1 },
      act_reply_1: { actId: "act_reply_1", kind: "propose", text: { en: "b", zh: "b" }, refId: "mls_02", at: 3 },
      act_0002: { actId: "act_0002", kind: "close", text: { en: "c", zh: "c" }, at: 4 },
    };
    s.agent.actIds = ["act_0001", "act_reply_1", "act_0002"];
    expect(newestActAbout(["mls_02", "mls_03"], s)?.actId).toBe("act_reply_1");
    expect(newestActAbout(["mls_09"], s)).toBeNull();
  });
});
