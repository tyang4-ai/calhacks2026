// F-seller-hub T4: the listing run's steps as they stream.
// - Before any step of the followed listing: "Cindy is starting the team."
// - Acceptance 4 (steps): 300 ms after the run's listing.drafted, seller-listing-steps lists run_02's
//   steps in order (Cindy routes, then the lister, tagger, checker and indexer), each with its agent's
//   name from the roster, its summary and its ms, and only the indexer marked rule-based.
// - The steps stream: after the run's first steps, only those show.
// Seeks by event (or seeds the run before the tour carries it), selects by test ID only. Expected
// values come from src/mock/.
import { expect, test } from "@playwright/test";
import { getAgent } from "../../src/mock/index";
import { LISTING } from "../../src/features/seller-hub/strings";
import { watchPage } from "../smoke/lib";
import { FRAME_VIEWPORT, LST_01, RUN_02, openSell, studio, tourListing } from "./seller-hub-lib";

test.use({ viewport: FRAME_VIEWPORT });

test("before the first step the panel says Cindy is starting the team", async ({ page }) => {
  await openSell(page, "listings");
  await expect(page.getByTestId("seller-listing-steps")).toContainText(LISTING.stepsIdle.en);
  await tourListing(page, "listing.requested", { listingId: LST_01.id });
  await expect(page.getByTestId("seller-listing-steps")).toContainText(LISTING.starting.en);
  await expect(page.getByTestId("seller-listing-steps").locator('[data-testid^="seller-listing-step-"]')).toHaveCount(0);
});

test("the steps stream in as they arrive", async ({ page }) => {
  await openSell(page, "listings");
  const third = RUN_02.steps[2];
  await tourListing(page, "swarm.step", { stepId: third.stepId });
  const steps = page.getByTestId("seller-listing-steps").locator('[data-testid^="seller-listing-step-"]');
  await expect(steps).toHaveCount(3);
  await expect(page.getByTestId(`seller-listing-step-${third.stepId}`)).toContainText(third.summary.en);
});

test("300 ms after the draft: every step in order, named from the roster, the indexer rule-based", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "listings");
  await tourListing(page, "listing.drafted", { listingId: LST_01.id }, 300);

  const panel = studio(page).getByTestId("seller-listing-steps");
  const steps = panel.locator('[data-testid^="seller-listing-step-"]');
  await expect(steps).toHaveCount(RUN_02.steps.length);
  const ids = await steps.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(RUN_02.steps.map((s) => `seller-listing-step-${s.stepId}`));

  // The lister, tagger, checker and indexer, in that order after Cindy's route.
  const agents = RUN_02.steps.map((s) => s.agentId);
  const order = ["lister", "tagger", "checker", "indexer"].map((a) => agents.indexOf(a));
  for (const i of order) expect(i).toBeGreaterThanOrEqual(0);
  expect(order.toSorted((a, b) => a - b)).toEqual(order);

  for (const s of RUN_02.steps) {
    const bubble = page.getByTestId(`seller-listing-step-${s.stepId}`);
    const agent = getAgent(s.agentId)!;
    await expect(bubble).toContainText(agent.name.en);
    await expect(bubble).toContainText(s.summary.en);
    await expect(bubble).toContainText(`${s.ms} ms`);
    if (s.toolName) await expect(bubble).toContainText(s.toolName);
    await expect(bubble.locator('[data-variant="rule"]')).toHaveCount(agent.kind === "code" ? 1 : 0);
  }
  const indexer = RUN_02.steps.find((s) => s.agentId === "indexer")!;
  expect(getAgent("indexer")!.kind).toBe("code");
  await expect(page.getByTestId(`seller-listing-step-${indexer.stepId}`).locator('[data-variant="rule"]')).toBeVisible();
  watch.expectClean();
});

test("the steps read in Chinese with the toggle, the summaries from the payload", async ({ page }) => {
  await openSell(page, "listings");
  await tourListing(page, "listing.drafted", { listingId: LST_01.id }, 300);
  for (let i = 0; i < 3; i++) {
    if ((await page.evaluate(() => window.__cindia!.store.getState().lang)) === "zh") break;
    await page.getByTestId("demo-lang-toggle").click();
  }
  await expect(page.getByTestId("seller-listing-steps")).toContainText(LISTING.steps.zh);
  for (const s of RUN_02.steps) {
    const bubble = page.getByTestId(`seller-listing-step-${s.stepId}`);
    await expect(bubble).toContainText(getAgent(s.agentId)!.name.zh);
    await expect(bubble).toContainText(s.summary.zh);
  }
});
