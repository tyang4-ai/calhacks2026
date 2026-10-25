// F-process T3: the swarm view. Acceptance 7 to 10.
import { expect, test, type Page } from "@playwright/test";
import type { ScriptedRun } from "../../src/core/types";
import { getAgent, swarmRuns } from "../../src/mock/index";
import { ELASTIC_AGENT_TOOL, STEP_KIND_LABELS } from "../../src/features/process/strings";
import { emitAtClock, expectStatus, open, runEvents, seekToEvent, timelineHas, watchPage } from "./process-lib";

const run = (id: string): ScriptedRun => swarmRuns.find((r) => r.runId === id)!;
const run01 = run("run_01");
const run02 = run("run_02");
const run08 = swarmRuns.find((r) => r.steps.some((s) => s.toolName === "elastic_agent"))!;

/** Brings run_01 into the store: the tour's d04-support run when the timeline has it, else emitted. */
async function toRun01(page: Page) {
  if (await timelineHas(page, "support.answered", { runId: "run_01" })) {
    await seekToEvent(page, "support.answered", { runId: "run_01" }, 300);
    return;
  }
  await seekToEvent(page, "beat.started", {}, 0);
  await emitAtClock(page, runEvents(run01));
}

test("run_01 shows Intake, Cindy, Steward, Clerk and Writer, one row per step in order with agent, kind, tool, model and ms, and its check step", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=swarm");
  await toRun01(page);
  const pane = page.getByTestId("process-pane-swarm");
  await expect(pane).toHaveAttribute("data-run-id", "run_01");
  const graph = page.getByTestId("process-swarm-graph");
  await expect(graph).toBeVisible();
  const nodes = await graph.locator("[data-node-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-node-id")));
  expect(nodes.toSorted()).toEqual(["clerk", "cindy", "intake", "steward", "writer"].toSorted());

  const rows = page.locator('[data-testid^="process-swarm-step-"]');
  await expect(rows).toHaveCount(run01.steps.length);
  expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual(run01.steps.map((s) => `process-swarm-step-${s.stepId}`));
  for (const s of run01.steps) {
    const row = page.getByTestId(`process-swarm-step-${s.stepId}`);
    await expect(row.locator('[data-role="agent"]')).toHaveText(getAgent(s.agentId)!.name.en);
    await expect(row.locator('[data-role="kind"]')).toHaveText(STEP_KIND_LABELS[s.kind].en);
    if (s.toolName) await expect(row.locator('[data-role="tool"]')).toHaveText(s.toolName);
    if (s.model) await expect(row.locator('[data-role="model"]')).toHaveText(s.model);
    await expect(row.locator('[data-role="ms"]')).toContainText(s.ms < 2000 ? `${s.ms} ms` : `${(s.ms / 1000).toFixed(1)} s`);
  }
  const check = run01.steps.find((s) => s.kind === "check")!;
  await expect(page.getByTestId(`process-swarm-step-${check.stepId}`)).toHaveAttribute("data-kind", "check");
  await expect(page.getByTestId(`process-swarm-step-${check.stepId}`).locator('[data-role="kind"]')).toHaveText("check");
  watch.expectClean();
});

/** The element's height and how much of it survives every box that clips it, in px. */
async function shown(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { height: 0, shown: 0 };
    const box = el.getBoundingClientRect();
    let top = Math.max(box.top, 0);
    let bottom = Math.min(box.bottom, window.innerHeight);
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const r = e.getBoundingClientRect();
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
    return { height: box.height, shown: Math.max(0, bottom - top) };
  }, selector);
}

test("once run_01 has finished, its check step and the graph show whole, in the overlay and in the tour's 480 by 900 panel", async ({ page }) => {
  const check = run01.steps.find((s) => s.kind === "check")!;
  const places: [string, string, () => Promise<unknown>][] = [
    ["/shop?process=swarm", '[data-testid="process-view"]', () => toRun01(page)],
    ["/demo", '[data-stage-layer="process-panel"]', () => seekToEvent(page, "support.answered", { runId: "run_01" }, 300)],
  ];
  for (const [route, root, toRun] of places) {
    await open(page, route);
    await toRun();
    await expect(page.locator(`${root} [data-testid="process-pane-swarm"]`)).toHaveAttribute("data-run-id", "run_01");
    for (const sel of [`${root} [data-testid="process-swarm-step-${check.stepId}"]`, `${root} [data-testid="process-swarm-graph"]`]) {
      await expect.poll(async () => { const s = await shown(page, sel); return s.height > 0 && s.shown >= s.height - 1; }, { message: `${route}: ${sel}` }).toBe(true);
    }
  }
});

test("run_02 through its listing.indexed: the Indexer's row is rule-based, and the swarm view's log lists the listing.indexed", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=swarm");
  if (await timelineHas(page, "listing.indexed", { listingId: "lst_01" })) {
    await seekToEvent(page, "listing.indexed", { listingId: "lst_01" }, 300);
  } else {
    await seekToEvent(page, "beat.started", {}, 0);
    await emitAtClock(page, [
      { type: "listing.requested", payload: { listingId: "lst_01", makerId: "mkr_02", notes: "notes", lang: "en" } },
      ...runEvents(run02, { upTo: "listing.indexed" }),
    ]);
  }
  await expect(page.getByTestId("process-pane-swarm")).toHaveAttribute("data-run-id", "run_02");
  const indexer = run02.steps.find((s) => s.agentId === "indexer")!;
  const row = page.getByTestId(`process-swarm-step-${indexer.stepId}`);
  await expect(row.locator('[data-variant="rule"]')).toHaveCount(1);
  await expect(row.locator('[data-role="model"]')).toHaveText("Rule-based");
  const log = page.getByTestId("process-view").getByTestId("process-log");
  await expect(log.locator("tbody tr", { hasText: "listing.indexed" })).toHaveCount(1);
  watch.expectClean();
});

test("a run_user_ run after run_01 never takes over the tour's swarm view, and anywhere else the newest run shows", async ({ page }) => {
  await open(page, "/shop?process=swarm");
  const userStep = {
    type: "swarm.step" as const,
    payload: { runId: "run_user_1", threadId: "thr_user_1", stepId: "stp_user_1", agentId: "cindy", kind: "route" as const, summary: { en: "Routing.", zh: "分派。" }, ms: 400, model: "claude-haiku-5-5" as const },
    key: "b14-swarm" as const,
    id: "evt_spec_user_step_1",
  };
  // The tour opened the view: a beat with process swarm.
  await toRun01(page);
  await emitAtClock(page, [{ type: "beat.started", payload: { beatId: "d04-support", camera: "shop-piece", process: "swarm" }, id: "evt_spec_beat_swarm" }, userStep]);
  await expect(page.getByTestId("process-swarm-step-stp_user_1")).toHaveCount(0);
  await expect(page.getByTestId("process-pane-swarm")).toHaveAttribute("data-run-id", "run_01");
  await expect(page.getByTestId("process-swarm-run-picker")).toHaveValue("run_01");

  // The same run with no tour beat: from the timeline's first beat, which opens no process.
  await seekToEvent(page, "beat.started", {}, 0);
  await emitAtClock(page, [...runEvents(run01), userStep]);
  await expect(page.getByTestId("process-pane-swarm")).toHaveAttribute("data-run-id", "run_user_1");
  await expect(page.getByTestId("process-swarm-step-stp_user_1")).toBeVisible();

  // The picker still reaches run_01.
  await page.getByTestId("process-swarm-run-picker").selectOption("run_01");
  await expect(page.getByTestId("process-pane-swarm")).toHaveAttribute("data-run-id", "run_01");
});

test("the find run's elastic_agent step names Elastic Agent Builder, drawn as a tool node", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, `/shop?process=swarm`);
  await seekToEvent(page, "beat.started", {}, 0);
  await emitAtClock(page, runEvents(run08));
  await expect(page.getByTestId("process-pane-swarm")).toHaveAttribute("data-run-id", run08.runId);
  const step = run08.steps.find((s) => s.toolName === "elastic_agent")!;
  await expect(page.getByTestId(`process-swarm-step-${step.stepId}`).locator('[data-role="tool"]')).toHaveText(ELASTIC_AGENT_TOOL.en);
  await expect(page.getByTestId("process-swarm-graph").locator('[data-node-id="elastic_agent"][data-kind="tool"]')).toHaveCount(1);
  watch.expectClean();
});

test("a seeded support.escalated with its approval still pending puts the swarm block in attention", async ({ page }) => {
  // Only B14 sends support.escalated, so this path is tested with seeded events on purpose (D1-32).
  const watch = watchPage(page);
  await open(page, "/shop");
  await seekToEvent(page, "beat.started", {}, 0);
  await emitAtClock(page, [
    // A scripted request, so the responder doesn't answer it.
    { type: "support.asked", payload: { threadId: "thr_user_91", side: "buyer", text: "Can I return it?", lang: "en", contextIds: ["pc_01"] } },
    {
      type: "swarm.step",
      payload: { runId: "run_user_91", threadId: "thr_user_91", stepId: "stp_user_91", agentId: "cindy", kind: "route", summary: { en: "Routing.", zh: "分派。" }, ms: 300, model: "claude-haiku-5-5" },
      key: "b14-swarm",
    },
    {
      type: "approval.requested",
      payload: {
        approvalId: "apr_user_91",
        approval: { kind: "support_action", subjectIds: ["thr_user_91"], overLimit: false, proposedBy: "cindy", summary: { en: "A person takes over.", zh: "由人接手。" }, decisionDate: "2026-10-01" },
      },
      key: "b08-approvals",
    },
    { type: "support.escalated", payload: { threadId: "thr_user_91", runId: "run_user_91", reason: { en: "Needs a person.", zh: "需要人工。" }, approvalId: "apr_user_91" }, key: "b14-swarm" },
  ]);
  await expectStatus(page, "swarm", "attention");
  await emitAtClock(page, [{ type: "approval.granted", payload: { approvalId: "apr_user_91", by: "own_01", date: "2026-10-01" }, key: "b08-approvals" }]);
  await expectStatus(page, "swarm", "done");
  watch.expectClean();
});
