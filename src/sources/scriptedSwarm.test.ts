import { describe, expect, it } from "vitest";
import type { CindiaEvent } from "../core/events";
import { userEvent } from "../core/events";
import type { PlannedEvent } from "../core/types";
import { validateEvent } from "../core/validate";
import { planRun, RUN_STEP_MS, type PlannedRunEvent } from "./scriptedSwarm";
import { ANS_01_TEXT, D04_TEXT, LST_01_NOTES, TEST_APPROVALS, TEST_FALLBACK_LISTING, TEST_RUNS } from "./testCatalog";

/** A fresh answerId() stand-in: <prefix>_user_<n>, counting per prefix. */
function counter(): (prefix: string) => string {
  const n = new Map<string, number>();
  return (prefix) => {
    const next = (n.get(prefix) ?? 0) + 1;
    n.set(prefix, next);
    return `${prefix}_user_${next}`;
  };
}

const run = (id: string) => {
  const r = TEST_RUNS.find((x) => x.runId === id);
  if (!r) throw new Error(id);
  return r;
};

const of = <T extends PlannedEvent["type"]>(plan: PlannedRunEvent[], type: T) =>
  plan.filter((p) => p.event.type === type).map((p) => p.event as Extract<PlannedEvent, { type: T }>);

/** Every planned event as a full event, for validateEvent. */
function asEvents(plan: PlannedRunEvent[]): CindiaEvent[] {
  return plan.map((p, i) => ({ id: `evt_reply_${i + 1}`, type: p.event.type, at: p.offset, source: "scripted", key: "b14-swarm", payload: p.event.payload }) as CindiaEvent);
}

describe("planRun", () => {
  it("starts at 0, puts each step 300 ms after the last, and each final event 300 ms after the one before", () => {
    const req = userEvent("support.asked", { threadId: "thr_user_1", side: "buyer", text: D04_TEXT, lang: "en", contextIds: ["pc_01"] });
    const plan = planRun(run("run_01"), req, counter());
    expect(plan.map((p) => p.offset)).toEqual([0, 300, 600, 900]);
    expect(plan.map((p) => p.event.type)).toEqual(["swarm.step", "swarm.step", "swarm.step", "support.answered"]);
    expect(RUN_STEP_MS).toBe(300);
  });

  it("lands the run on the request's thread, with the run and steps re-keyed", () => {
    const req = userEvent("support.asked", { threadId: "thr_user_4", side: "buyer", text: D04_TEXT, lang: "en", contextIds: ["pc_01"] });
    const plan = planRun(run("run_01"), req, counter());
    const steps = of(plan, "swarm.step");
    expect(steps.map((s) => s.payload.stepId)).toEqual(["stp_user_1", "stp_user_2", "stp_user_3"]);
    expect(steps.every((s) => s.payload.runId === "run_user_1" && s.payload.threadId === "thr_user_4")).toBe(true);
    const [answer] = of(plan, "support.answered");
    expect(answer.payload).toMatchObject({ threadId: "thr_user_4", runId: "run_user_1", refIds: ["pc_01", "com_dine", "mkr_01", "pol_01"] });
    expect(validateEvent(asEvents(plan)[0])).toEqual([]);
    for (const e of asEvents(plan)) expect(validateEvent(e)).toEqual([]);
  });

  it("re-keys a forwarded question to qst_user_<n> with the person's own text and lang, and its references", () => {
    const req = userEvent("support.asked", { threadId: "thr_user_2", side: "buyer", text: "what does the PATTERN on this weaving mean", lang: "en", contextIds: ["pc_01"] });
    const plan = planRun(run("run_07"), req, counter());
    const [fwd] = of(plan, "question.forwarded");
    expect(fwd.payload).toEqual({ questionId: "qst_user_1", threadId: "thr_user_2", makerId: "mkr_01", pieceId: "pc_01", text: "what does the PATTERN on this weaving mean", lang: "en" });
    // The L14 reply comes first and names the new question, never qst_01.
    expect(plan.map((p) => p.event.type).slice(-2)).toEqual(["support.answered", "question.forwarded"]);
    expect(of(plan, "support.answered")[0].payload.refIds).toEqual(["pc_01", "qst_user_1"]);
    expect(JSON.stringify(plan)).not.toContain("qst_01");
    for (const e of asEvents(plan)) expect(validateEvent(e)).toEqual([]);
  });

  it("re-keys a listing run to the person's listing and ends with its own approval, never apr_04", () => {
    const req = userEvent("listing.requested", { listingId: "lst_user_3", makerId: "mkr_03", notes: LST_01_NOTES, lang: "en" });
    const plan = planRun(run("run_02"), req, counter(), { approvals: TEST_APPROVALS });
    expect(plan.map((p) => p.event.type)).toEqual(["swarm.step", "swarm.step", "listing.drafted", "listing.indexed", "approval.requested"]);
    const steps = of(plan, "swarm.step");
    expect(steps.every((s) => s.payload.threadId === "lst_user_3")).toBe(true);
    const [draft] = of(plan, "listing.drafted");
    expect(draft.payload.listingId).toBe("lst_user_3");
    expect(draft.payload.makerId).toBe("mkr_03");
    expect(draft.payload.checks.map((c) => c.checkId)).toEqual(["chk_user_1", "chk_user_2"]);
    const [indexed] = of(plan, "listing.indexed");
    expect(indexed.payload).toMatchObject({ listingId: "lst_user_3", pieceId: "pc_user_1", index: "cindia-drafts" });
    const [apr] = of(plan, "approval.requested");
    expect(apr.payload.approvalId).toBe("apr_user_1");
    expect(apr.payload.approval).toMatchObject({ kind: "listing_publish", subjectIds: ["lst_user_3"], proposedBy: "cindy", overLimit: false, decisionDate: "2026-10-01" });
    expect(apr.payload.approval?.summary.en).toContain(draft.payload.title.en);
    const text = JSON.stringify(plan);
    for (const tourId of ["apr_04", "lst_01", "pc_55", "chk_01", "run_02", "stp_0011"]) expect(text).not.toContain(`"${tourId}"`);
    for (const e of asEvents(plan)) expect(validateEvent(e)).toEqual([]);
  });

  it("gives the fallback listing run the person's listing and appends the approval it lacks", () => {
    const req = userEvent("listing.requested", { listingId: "lst_user_1", makerId: "mkr_02", notes: "Something new", lang: "en" });
    const plan = planRun(TEST_FALLBACK_LISTING, req, counter(), { approvals: TEST_APPROVALS });
    expect(plan.map((p) => [p.event.type, p.offset])).toEqual([
      ["swarm.step", 0],
      ["listing.drafted", 300],
      ["approval.requested", 600],
    ]);
    expect(of(plan, "listing.drafted")[0].payload.listingId).toBe("lst_user_1");
    expect(of(plan, "approval.requested")[0].payload).toMatchObject({ approvalId: "apr_user_1", approval: { kind: "listing_publish", subjectIds: ["lst_user_1"] } });
    for (const e of asEvents(plan)) expect(validateEvent(e)).toEqual([]);
  });

  it("re-keys a storefront's drafted blocks to blk_user_<n>", () => {
    const req = userEvent("storefront.requested", { storefrontId: "sto_01" });
    const plan = planRun(run("run_03"), req, counter());
    const [draft] = of(plan, "storefront.drafted");
    expect(draft.payload.storefrontId).toBe("sto_01");
    expect(draft.payload.blocks.map((b) => b.blockId)).toEqual(["blk_user_1", "blk_user_2"]);
    expect(draft.payload.blocks[1].props).toEqual({ pieceIds: ["pc_01", "pc_07"] });
    expect(of(plan, "swarm.step").every((s) => s.payload.threadId === "sto_01")).toBe(true);
    for (const e of asEvents(plan)) expect(validateEvent(e)).toEqual([]);
  });

  it("puts a person's own answer where the relay quotes the scripted one, on the thread it's given", () => {
    const req = userEvent("question.answered", { questionId: "qst_user_1", answerId: "ans_user_1", makerId: "mkr_01", text: "My own words, exactly.", lang: "en" });
    const plan = planRun(run("run_09"), req, counter(), {
      threadId: "thr_user_2",
      quote: { from: ANS_01_TEXT, to: "My own words, exactly." },
      idMap: { qst_01: "qst_user_1", ans_01: "ans_user_1" },
    });
    const [answer] = of(plan, "support.answered");
    expect(answer.payload.threadId).toBe("thr_user_2");
    expect(answer.payload.reply.en).toBe('Grace N. answered in her own words: "My own words, exactly."');
    expect(answer.payload.reply.zh).toContain("My own words, exactly.");
    expect(JSON.stringify(answer.payload.reply)).not.toContain(ANS_01_TEXT);
    expect(answer.payload.refIds).toEqual(["qst_user_1", "ans_user_1", "mkr_01"]);
    // The scripted answer itself keeps the scripted reply, Chinese included.
    const same = planRun(run("run_09"), req, counter(), { quote: { from: ANS_01_TEXT, to: ANS_01_TEXT } });
    expect(of(same, "support.answered")[0].payload.reply).toEqual((run("run_09").final[0].payload as { reply: unknown }).reply);
  });

  it("never changes the scripted run it reads", () => {
    const before = JSON.stringify(TEST_RUNS);
    const req = userEvent("listing.requested", { listingId: "lst_user_9", makerId: "mkr_02", notes: LST_01_NOTES, lang: "en" });
    planRun(run("run_02"), req, counter(), { approvals: TEST_APPROVALS });
    expect(JSON.stringify(TEST_RUNS)).toBe(before);
  });
});
