// F-support T3: the step strip (support-steps).
// Acceptance 4 first half: with the drawer open and the tour's steps up to the Writer's, the strip
// shows each step of run_01 in order, with the agent's name and summary, its check step included,
// and support-working shows. Then the answer folds the strip and support-working goes. The order is
// checked, never the wall-clock spacing (planRun's unit test covers that).
// Selects by test ID only. Reaches the tour's run with tourEvent().
import { expect, test } from "@playwright/test";
import { getAgent } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { TOUR_RUN, drawer, openPage, tourEvent } from "./support-lib";

test("4a: the tour's steps up to the Writer's show in order with their agents, the check included, while support-working shows", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01?drawer=support");
  await tourEvent(page, "swarm.step", { runId: TOUR_RUN.runId, agentId: "writer" });

  const strip = drawer(page).getByTestId("support-steps");
  await expect(strip).toBeVisible();
  const rows = strip.locator('[data-testid^="support-step-"]');
  await expect(rows).toHaveCount(TOUR_RUN.steps.length);
  const ids = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(TOUR_RUN.steps.map((s) => `support-step-${s.stepId}`));
  for (const s of TOUR_RUN.steps) {
    const row = strip.getByTestId(`support-step-${s.stepId}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(getAgent(s.agentId)!.name.en);
    await expect(row).toContainText(s.summary.en);
  }
  const check = TOUR_RUN.steps.find((s) => s.kind === "check");
  expect(check, "run_01 has a check step").toBeTruthy();
  await expect(strip.getByTestId(`support-step-${check!.stepId}`)).toBeVisible();
  await expect(strip.getByTestId(`support-step-${check!.stepId}`)).toContainText("word for word");
  await expect(drawer(page).getByTestId("support-working")).toBeVisible();
  await expect(drawer(page).getByTestId("support-reply")).toHaveCount(0);

  // The answer ends the run: the strip folds to one line and support-working goes.
  await tourEvent(page, "support.answered", { threadId: TOUR_RUN.threadId });
  await expect(drawer(page).getByTestId("support-working")).toHaveCount(0);
  await expect(drawer(page).getByTestId("support-reply")).toBeVisible();
  await expect(strip.getByTestId(`support-step-${TOUR_RUN.steps[0].stepId}`)).toBeHidden();
  watch.expectClean();
});

test("the steps of a person's scripted run arrive one by one, in the run's order", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01?drawer=support");
  await drawer(page).getByTestId("support-suggest-1").click();
  await expect(drawer(page).getByTestId("support-working")).toBeVisible({ timeout: 20_000 });
  // While it works, the rows seen so far are a prefix of the run's agents, in order.
  const strip = drawer(page).getByTestId("support-steps");
  const seen = await strip.locator('[data-testid^="support-step-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-agent-id")));
  expect(seen.length).toBeGreaterThan(0);
  expect(seen).toEqual(TOUR_RUN.steps.slice(0, seen.length).map((s) => s.agentId));
  await expect(drawer(page).getByTestId("support-reply")).toBeVisible({ timeout: 20_000 });
  const all = await strip.locator('[data-testid^="support-step-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-agent-id")));
  expect(all).toEqual(TOUR_RUN.steps.map((s) => s.agentId));
  watch.expectClean();
});
