// Unit tests for the seller hub's plain functions: the overview's figures, the IDs a person's
// events take, the followed listing's run and approval, a maker's questions in log order and a work
// in progress's live milestones. States are built by playing events through the store's own reducer.
// Expected values come from src/mock/.
import { describe, expect, it } from "vitest";
import type { CindiaEvent, EventType, Payloads, SourceKey } from "../../core/events";
import { rootReducer } from "../../core/reducers/index";
import { initialState, type CindiaState } from "../../core/state";
import { flags, listings, makerQuestions, orders, refunds, swarmRuns, worksInProgress } from "../../mock";
import {
  answerIds,
  listingSteps,
  makerQuestionsFor,
  milestoneItems,
  nextAnswerId,
  nextListingId,
  normalizeNotes,
  publishApproval,
  textLang,
} from "./model";
import { overviewFigures, pendingApprovals } from "./overviewFigures";

let n = 0;
function ev<T extends EventType>(type: T, payload: Payloads[T], at = 0, key?: SourceKey): CindiaEvent {
  n += 1;
  return { id: `evt_${String(n).padStart(4, "0")}`, type, at, source: "scripted", ...(key ? { key } : {}), payload } as CindiaEvent;
}

function play(events: CindiaEvent[], from: CindiaState = initialState()): CindiaState {
  return events.reduce((s, e) => rootReducer(s, e), from);
}

const LST_01 = listings[0];
const RUN_02 = swarmRuns.find((r) => r.runId === "run_02")!;
const FLG = flags[0];

describe("overviewFigures", () => {
  it("sums the orders that arrived, less the refunds, and the open flags' deltas", () => {
    const ord = orders.slice(0, 3);
    const rfd = refunds[0];
    const s = play([
      ...ord.map((o) => ev("record.arrived", { recordId: o.id, recordType: "order", date: o.date })),
      ev("record.arrived", { recordId: rfd.id, recordType: "refund", date: rfd.date }),
      ev("flag.raised", {
        flagId: FLG.id,
        kind: FLG.kind,
        recordIds: FLG.recordIds,
        expectedCents: FLG.expectedCents,
        actualCents: FLG.actualCents,
        deltaCents: FLG.deltaCents,
      }),
    ]);
    const f = overviewFigures(s);
    expect(f.salesCents).toBe(ord.reduce((a, o) => a + o.grossCents, 0) - rfd.amountCents);
    expect(f.orderCount).toBe(3);
    expect(f.refundCount).toBe(1);
    expect(f.waitingCents).toBe(34000);
    expect(f.openFlags).toBe(1);
    expect(f.hits).toBe(0);
  });

  it("counts requested approvals still pending, inline ones included, and drops decided ones", () => {
    const s = play([
      ev("approval.requested", { approvalId: "apr_01" }),
      ev("approval.requested", { approvalId: "apr_02" }),
      ev("approval.requested", {
        approvalId: "apr_user_1",
        approval: { kind: "listing_publish", subjectIds: ["lst_user_1"], overLimit: false, proposedBy: "cindy", summary: { en: "x", zh: "x" }, decisionDate: "2026-10-01" },
      }),
      ev("approval.granted", { approvalId: "apr_01", by: "own_01", date: "2026-10-01" }),
      // A grant for an approval never requested doesn't count as waiting.
      ev("approval.granted", { approvalId: "apr_05", by: "own_01", date: "2026-10-01" }),
    ]);
    expect(overviewFigures(s).approvalsWaiting).toBe(2);
    expect(pendingApprovals(s).map((p) => [p.approvalId, p.kind])).toEqual([
      ["apr_02", "maker_payouts"],
      ["apr_user_1", "listing_publish"],
    ]);
  });
});

describe("IDs and words", () => {
  it("numbers a person's listings and answers past the highest in the store", () => {
    expect(nextListingId([])).toBe("lst_user_1");
    expect(nextListingId(["lst_01", "lst_user_1", "lst_user_3"])).toBe("lst_user_4");
    expect(nextAnswerId(["ans_01"])).toBe("ans_user_1");
    expect(nextAnswerId(["ans_user_2", "ans_01"])).toBe("ans_user_3");
  });

  it("normalizes notes as the responder does and tells Chinese from English", () => {
    expect(normalizeNotes("  New small weaving, about 30 by 40 cm.  ")).toBe("new small weaving about 30 by 40 cm");
    expect(normalizeNotes(LST_01.notes.toUpperCase())).toBe(normalizeNotes(LST_01.notes));
    expect(textLang(LST_01.notes)).toBe("en");
    expect(textLang("小幅羊毛编织")).toBe("zh");
  });
});

describe("the followed listing", () => {
  const steps = RUN_02.steps.map((st) => ev("swarm.step", { ...st, threadId: LST_01.id }, 0, "b14-swarm"));

  it("lists the run's steps on the listing's thread, in arrival order", () => {
    const s = play(steps);
    const got = listingSteps(s, LST_01.id);
    expect(got.runId).toBe(RUN_02.runId);
    expect(got.steps.map((st) => st.stepId)).toEqual(RUN_02.steps.map((st) => st.stepId));
    expect(listingSteps(s, "lst_user_1").steps).toEqual([]);
    expect(listingSteps(s, null)).toEqual({ runId: null, steps: [] });
  });

  it("finds apr_04 for lst_01 and an inline approval for a person's listing, never across them", () => {
    let s = play([ev("approval.requested", { approvalId: "apr_04" })]);
    expect(publishApproval(s, LST_01.id)).toEqual({ approvalId: "apr_04", status: "pending" });
    expect(publishApproval(s, "lst_user_1")).toBeNull();
    s = play(
      [
        ev("approval.requested", {
          approvalId: "apr_user_1",
          approval: { kind: "listing_publish", subjectIds: ["lst_user_1"], overLimit: false, proposedBy: "cindy", summary: { en: "x", zh: "x" }, decisionDate: "2026-10-01" },
        }),
        ev("approval.declined", { approvalId: "apr_user_1", by: "own_01", reason: { en: "no", zh: "不" } }),
      ],
      s,
    );
    expect(publishApproval(s, "lst_user_1")).toEqual({ approvalId: "apr_user_1", status: "declined" });
    expect(publishApproval(s, LST_01.id)).toEqual({ approvalId: "apr_04", status: "pending" });
  });
});

describe("a maker's questions and works", () => {
  it("orders a maker's questions newest first by log place, and keeps others' out", () => {
    const q = makerQuestions[0].question;
    const fwd = (questionId: string, makerId: string) =>
      ev("question.forwarded", { questionId, threadId: q.threadId, makerId, pieceId: q.pieceId, text: q.text, lang: q.lang }, 0, "b14-swarm");
    const s = play([fwd(q.id, q.makerId), fwd("qst_user_1", q.makerId), fwd("qst_user_2", "mkr_02")]);
    expect(makerQuestionsFor(s, q.makerId).map((x) => x.questionId)).toEqual(["qst_user_1", q.id]);
    expect(makerQuestionsFor(s, "mkr_02").map((x) => x.questionId)).toEqual(["qst_user_2"]);
    const answered = play([ev("question.answered", makerQuestions[0].answer, 0, "b14-swarm")], s);
    expect(answerIds(answered)).toEqual([makerQuestions[0].answer.answerId]);
  });

  it("takes each milestone's status from the store, falling back to the mock's", () => {
    const wip = worksInProgress[0];
    const pending = wip.milestones.find((m) => m.status === "pending")!;
    const before = milestoneItems(wip, initialState().wip.milestones);
    expect(before.map((m) => m.status)).toEqual(wip.milestones.map((m) => m.status));
    const s = play([ev("wip.milestone_paid", { wipId: wip.id, milestoneId: pending.milestoneId, amountCents: 48000, date: "2026-10-02" })]);
    const after = milestoneItems(wip, s.wip.milestones);
    const moved = after.find((m) => m.milestoneId === pending.milestoneId)!;
    expect(moved.status).toBe("paid");
    expect(moved.amountCents).toBe(48000);
    expect(moved.date).toBe("2026-10-02");
  });
});
