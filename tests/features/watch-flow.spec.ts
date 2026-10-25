// F-watch T5: the tour's scan (d14-watch) from watch.started to approval.requested for apr_03, step
// by step with event-anchored seeks, or the same events seeded from src/mock/watch.ts until the
// tour carries them (tourScan). Checks d14-watch's IDs inside frame-studio, and acceptance 11.
import { expect, test } from "@playwright/test";
import { counterfeitCandidates } from "../../src/mock/watch";
import { ACTIONS, ENGINE, GLOSSARY, SCAN, checkedWords, foundWords } from "../../src/features/watch/strings";
import { watchPage } from "../smoke/lib";
import { TOUR_APPROVAL, TOUR_HIT, TOUR_SCAN, WATCH_VIEWPORT, expectInsideFrame, inFrame, openWatch, storeState, tourScan } from "./watch-lib";

test.use({ viewport: WATCH_VIEWPORT });

const CFT = TOUR_HIT.id;
const possible = counterfeitCandidates.filter((c) => c.verdict === "possible_copy").length;

test("the tour's scan plays from watch.started to apr_03, with d14-watch's IDs inside frame-studio", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);

  // 11: scripted mode, so the panel shows the Simulated badge.
  await expect(page.locator('[data-slot="studio.watch.main"]').getByTestId("simulated-badge")).toBeVisible();

  // watch.started: the check is under way and Scan now waits.
  await tourScan(page, "watch.started", { scanId: TOUR_SCAN.scanId }, 300);
  await expect(inFrame(page, "watch-status")).toHaveText(SCAN.statusChecking.en);
  await expect(inFrame(page, "watch-scan")).toBeDisabled();
  await expect(inFrame(page, "watch-queries").locator('[data-role="query"]')).toHaveText(TOUR_SCAN.queries);

  // watch.scanned: the engine, the count and every checked result.
  await tourScan(page, "watch.scanned", { scanId: TOUR_SCAN.scanId }, 300);
  await expect(inFrame(page, "watch-engine")).toHaveText(ENGINE.scripted.en);
  await expect(inFrame(page, "watch-status")).toHaveText(`${checkedWords(counterfeitCandidates.length).en} · ${foundWords(possible).en}`);
  await expect(inFrame(page, "watch-checked").getByTestId(/^watch-checked-\d+$/)).toHaveCount(counterfeitCandidates.length);

  // counterfeit.flagged for cft_01: d14-watch's IDs.
  await tourScan(page, "counterfeit.flagged", { cftId: CFT }, 300);
  await expect(inFrame(page, "watch-results")).toBeVisible();
  await expectInsideFrame(page, [`watch-item-${CFT}`, `watch-similarity-${CFT}`]);
  await expect(inFrame(page, `watch-similarity-${CFT}`)).toContainText(TOUR_HIT.similarity.toFixed(2));
  await expect(inFrame(page, `watch-report-${CFT}`)).toBeDisabled();

  // followup.drafted fup_02: Cindy's draft is in, the approval not yet.
  await tourScan(page, "followup.drafted", { followUpId: TOUR_SCAN.followUpId }, 300);
  expect((await storeState(page)).approvals.followUps[TOUR_SCAN.followUpId!]?.approvalId).toBe(TOUR_APPROVAL.id);
  await expect(inFrame(page, `watch-report-${CFT}`)).toBeDisabled();

  // approval.requested apr_03: the owner can review Cindy's report.
  await tourScan(page, "approval.requested", { approvalId: TOUR_APPROVAL.id }, 300);
  await expect(inFrame(page, `watch-report-${CFT}`)).toBeEnabled();
  await expect(inFrame(page, `watch-report-${CFT}`)).toHaveText(ACTIONS.review.en);
  await expect(inFrame(page, `watch-item-${CFT}`)).toContainText(GLOSSARY.proposedByCindy.en);
  await expectInsideFrame(page, [`watch-item-${CFT}`, `watch-similarity-${CFT}`, "watch-fairness", `watch-report-${CFT}`, `watch-dismiss-${CFT}`]);
  await expect(page.locator('[data-slot="studio.watch.main"]').getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});
