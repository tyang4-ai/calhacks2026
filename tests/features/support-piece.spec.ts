// F-support T4: "Ask about this piece" (support-ask-piece) on the piece page.
// Acceptance 1 (the buyer suggestions, d04 first, and no drawer suggestions while it's closed),
// 3 (the tour never opens the drawer on a route), 5 (a person's click: the request, the drawer and
// that suggestion's own run) and 7 (the d04 question on an Ojibwe piece gets the fallback, A2-10).
// Selects by test ID only. Reaches the tour's run with tourEvent(), and asks only after any seek.
import { expect, test } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import {
  ANSWER_TIMEOUT,
  BUYER_QUESTIONS,
  D04_QUESTION,
  FALLBACK_REPLY,
  drawer,
  openPage,
  replyOf,
  runFor,
  sidePanel,
  storeState,
  tourEvent,
  userAsks,
} from "./support-lib";

test("1: the side panel shows the buyer suggestions with the d04 question first, and no drawer suggestions", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01");
  await expect(sidePanel(page)).toBeVisible();
  for (const [i, q] of BUYER_QUESTIONS.entries()) {
    await expect(sidePanel(page).getByTestId(`support-piece-suggest-${i + 1}`)).toHaveText(q.en);
  }
  await expect(sidePanel(page).getByTestId("support-piece-suggest-1")).toHaveText(D04_QUESTION.en);
  await expect(page.locator('[data-testid^="support-suggest-"]')).toHaveCount(0);
  await expect(drawer(page)).toHaveCount(0);
  await expect(sidePanel(page).getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("3: the tour's run past its answer leaves the drawer closed on a route (B1-18)", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01");
  await tourEvent(page, "support.answered", { threadId: "thr_01" }, 500);
  await expect.poll(async () => (await storeState(page)).support.threads.thr_01?.messages.length ?? 0).toBe(2);
  await expect(drawer(page)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("drawer")).toBeNull();
  watch.expectClean();
});

test("5: clicking suggestion 2 asks with the piece as context, opens the drawer, and its own run answers", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01");
  await sidePanel(page).getByTestId("support-piece-suggest-2").click();

  const asks = await userAsks(page);
  expect(asks).toHaveLength(1);
  expect(asks[0].source).toBe("user");
  expect(asks[0].side).toBe("buyer");
  expect(asks[0].contextIds).toContain("pc_01");
  expect(asks[0].threadId).toMatch(/^thr_user_\d+$/);
  expect(asks[0].text).toBe(BUYER_QUESTIONS[1].en);

  await expect(drawer(page)).toBeVisible();
  await expect(page).toHaveURL(/[?&]drawer=support/);

  const run = runFor(BUYER_QUESTIONS[1], "buyer", ["pc_01"]);
  expect(run.trigger.kind).toBe("support");
  const reply = replyOf(run);
  await expect(drawer(page).getByTestId("support-reply")).toContainText(reply.reply.en, { timeout: ANSWER_TIMEOUT });
  expect(reply.reply.en).not.toBe(FALLBACK_REPLY.en);

  // Its steps, in the run's order: the rows the strip keeps for the run, by test ID.
  const state = await storeState(page);
  const runId = state.swarm.runIds.find((id) => state.swarm.runs[id].threadId === asks[0].threadId)!;
  expect(runId).toMatch(/^run_user_\d+$/);
  const stepIds = state.swarm.runs[runId].stepIds;
  expect(stepIds.map((id) => state.swarm.steps[id].agentId)).toEqual(run.steps.map((s) => s.agentId));
  const rows = drawer(page).getByTestId("support-steps").locator('[data-testid^="support-step-"]');
  await expect(rows).toHaveCount(run.steps.length);
  const rowIds = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(rowIds).toEqual(stepIds.map((id) => `support-step-${id}`));
  for (const [i, s] of run.steps.entries()) {
    await expect(rows.nth(i)).toContainText(s.summary.en);
  }
  watch.expectClean();
});

test("7: the d04 question on an Ojibwe piece (pc_20) gets the fallback reply and no pc_01 record", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_20");
  await sidePanel(page).getByTestId("support-piece-suggest-1").click();
  const asks = await userAsks(page);
  expect(asks[0].contextIds).toEqual(["pc_20"]);
  await expect(drawer(page).getByTestId("support-reply")).toContainText(FALLBACK_REPLY.en, { timeout: ANSWER_TIMEOUT });
  const refs = drawer(page).getByTestId("support-refs");
  if ((await refs.count()) > 0) await expect(refs.locator('[data-ref-id="pc_01"]')).toHaveCount(0);
  const state = await storeState(page);
  const answered = state.support.threads[asks[0].threadId].messages.filter((m) => m.kind === "answered");
  expect(answered).toHaveLength(1);
  expect(answered[0].kind === "answered" && answered[0].refIds).not.toContain("pc_01");
  watch.expectClean();
});
