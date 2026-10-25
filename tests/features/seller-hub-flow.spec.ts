// F-seller-hub T7: the assembled listing view, the d15-listing beat end to end.
// - Plays the listing from the timeline's listing.requested for lst_01 to its listing.indexed and
//   approval.requested apr_04 with event-anchored seeks (or, before the tour carries the run, the
//   same events seeded), and checks d15-listing's IDs inside frame-studio, each shown in full with
//   nothing to scroll: seller-listing-notes, seller-listing-draft, seller-listing-check-<checkId>,
//   seller-listing-indexed (process-data-tables is F-process's).
// - Acceptance 10: the listings panel shows simulated-badge in scripted mode.
// - The whole view fits the Sell frame at 1440 by 900, and at the beat's final state every step of
//   the run shows with nothing to scroll (Cindy's route and the Lister included), in English only.
// Selects by test ID only. Expected values come from src/mock/.
import { expect, test } from "@playwright/test";
import { LISTING } from "../../src/features/seller-hub/strings";
import { watchPage } from "../smoke/lib";
import {
  FRAME_VIEWPORT,
  LST_01,
  RUN_02,
  RUN_02_APPROVAL,
  RUN_02_DRAFT,
  RUN_02_INDEXED,
  expectEnglishOnly,
  expectInside,
  expectUnclipped,
  openSell,
  slotOf,
  storeState,
  studio,
  tourListing,
} from "./seller-hub-lib";

test.use({ viewport: FRAME_VIEWPORT });

const D15_IDS = [
  "seller-listing-notes",
  "seller-listing-draft",
  ...RUN_02_DRAFT.checks.map((c) => `seller-listing-check-${c.checkId}`),
  "seller-listing-indexed",
  "seller-listing-approve",
];

test("d15-listing: notes, steps, draft, checks, the index line and apr_04, inside frame-studio", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "listings");
  const frame = studio(page);
  await expect(slotOf(page, "studio.listings.main").getByTestId("simulated-badge")).toBeVisible();

  // 120.3 listing.requested lst_01: the notes as typed, Draft with Cindy waiting on the run.
  await tourListing(page, "listing.requested", { listingId: LST_01.id });
  await expect(frame.getByTestId("seller-listing-notes")).toHaveValue(LST_01.notes);
  await expect(frame.getByTestId("seller-listing-ask")).toBeDisabled();
  await expect(frame.getByTestId("seller-listing-steps")).toContainText(LISTING.starting.en);

  // 121.0 to 126.0: the steps stream.
  const last = RUN_02.steps[RUN_02.steps.length - 1];
  await tourListing(page, "swarm.step", { stepId: last.stepId });
  await expect(frame.getByTestId("seller-listing-steps").locator('[data-testid^="seller-listing-step-"]')).toHaveCount(RUN_02.steps.length);
  await expect(frame.getByTestId("seller-listing-draft")).toContainText(LISTING.draftWaiting.en);

  // 126.5 listing.drafted: the draft and its checks.
  await tourListing(page, "listing.drafted", { listingId: LST_01.id }, 300);
  await expect(frame.getByTestId("seller-listing-draft")).toContainText(RUN_02_DRAFT.title.en);
  await expect(frame.getByTestId("seller-listing-ask")).toBeEnabled();

  // 127.0 listing.indexed: the index line, in scripted mode too.
  await tourListing(page, "listing.indexed", { listingId: LST_01.id }, 300);
  await expect(frame.getByTestId("seller-listing-indexed")).toContainText(RUN_02_INDEXED.modelId);
  await expect(frame.getByTestId("seller-listing-approve")).toBeDisabled();

  // 128.0 approval.requested apr_04: Cindy's proposal, which only the owner can approve.
  await tourListing(page, "approval.requested", { approvalId: RUN_02_APPROVAL.approvalId });
  await expect(frame.getByTestId("seller-listing-approve")).toBeEnabled();
  const s = await storeState(page);
  expect(s.listings.latestListingId).toBe(LST_01.id);
  expect(s.approvals.items[RUN_02_APPROVAL.approvalId].status).toBe("pending");

  for (const id of D15_IDS) {
    const el = frame.getByTestId(id);
    await expectUnclipped(el);
    await expectInside(el, frame);
  }
  watch.expectClean();
});

test("at the beat's final state every step shows with nothing to scroll, in English only", async ({ page }) => {
  await openSell(page, "listings");
  await tourListing(page, "approval.requested", { approvalId: RUN_02_APPROVAL.approvalId }, 1500);
  const frame = studio(page);
  await expect(frame.getByTestId("seller-listing-approve")).toHaveText(LISTING.review.en);
  const steps = frame.getByTestId("seller-listing-steps");
  await expect(steps.locator('[data-testid^="seller-listing-step-"]')).toHaveCount(RUN_02.steps.length);
  // Cindy's route and the Lister first, the newest step last: all in view, inside the frame.
  for (const s of RUN_02.steps) {
    const bubble = frame.getByTestId(`seller-listing-step-${s.stepId}`);
    await expectUnclipped(bubble);
    await expectInside(bubble, frame);
  }
  for (const id of D15_IDS) {
    const el = frame.getByTestId(id);
    await expectUnclipped(el);
    await expectInside(el, frame);
  }
  await expect(page.locator('[data-testid^="seller-listing-translated-"]')).toHaveCount(0);
  await expectEnglishOnly(slotOf(page, "studio.listings.main"));
  await expect(slotOf(page, "studio.listings.main").getByTestId("simulated-badge")).toBeVisible();
});
