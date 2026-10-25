// F-watch T4: the results. Acceptance 6, 7, 8, the report half of 9, and 10.
// Every expected value comes from src/mock/ and the feature's strings.
import { expect, test } from "@playwright/test";
import { ACTIONS, CHECKED, GLOSSARY, L22, RESULTS } from "../../src/features/watch/strings";
import { watchPage } from "../smoke/lib";
import {
  CLAIM_ONLY,
  TOUR_APPROVAL,
  TOUR_HIT,
  TOUR_SCAN,
  WATCH_VIEWPORT,
  flaggedPayload,
  inFrame,
  logLength,
  openWatch,
  scriptedResults,
  seed,
  storeState,
  tourScan,
} from "./watch-lib";

test.use({ viewport: WATCH_VIEWPORT });

const CFT = TOUR_HIT.id;

test("6: given the scan's watch.scanned, watch-checked lists every result with its verdict, and a claim-only result has L22 and no report button", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await tourScan(page, "watch.started", { scanId: TOUR_SCAN.scanId });
  await expect(inFrame(page, "watch-checked")).toHaveCount(0);

  await tourScan(page, "watch.scanned", { scanId: TOUR_SCAN.scanId });
  const results = scriptedResults();
  const checked = inFrame(page, "watch-checked");
  await expect(checked).toBeVisible();
  for (const [i, r] of results.entries()) {
    const row = checked.getByTestId(`watch-checked-${i + 1}`);
    await expect(row).toHaveAttribute("data-verdict", r.verdict);
    await expect(row.locator('[data-role="title"]')).toHaveText(r.title);
    await expect(row.locator('[data-role="url"]')).toHaveText(r.url);
    if (r.similarity === null) await expect(row.locator('[data-role="similarity"]')).toHaveText(CHECKED.notScored.en);
    else await expect(row.locator('[data-role="similarity"]')).toContainText(`${GLOSSARY.textMatch.en}${r.similarity.toFixed(2)}`);
    if (r.verdict === "possible_copy") await expect(row.locator('[data-role="verdict"]')).toHaveText(CHECKED.possibleCopy.en);
    if (r.verdict === "neither") await expect(row.locator('[data-role="verdict"]')).toHaveText(CHECKED.neither.en);
    if (r.verdict === "claim_only") {
      await expect(row.getByTestId(`watch-claim-only-${i + 1}`)).toHaveText(L22.en);
      await expect(row.getByTestId(/^watch-report-/)).toHaveCount(0);
    } else {
      await expect(row.getByTestId(/^watch-claim-only-/)).toHaveCount(0);
    }
  }
  await expect(checked.getByTestId(`watch-checked-${results.length + 1}`)).toHaveCount(0);
  // cft_01 is the possible look-alike; the claim-only listing is one of the results.
  expect(results.find((r) => r.url === TOUR_HIT.url)?.verdict).toBe("possible_copy");
  expect(results.find((r) => r.url === CLAIM_ONLY.url)?.verdict).toBe("claim_only");

  // Once the hit lands, only it has a report button.
  await tourScan(page, "counterfeit.flagged", { cftId: CFT }, 300);
  await expect(inFrame(page, `watch-item-${CFT}`)).toBeVisible();
  await expect(page.getByTestId("frame-studio").getByTestId(/^watch-report-/)).toHaveCount(TOUR_SCAN.cftIds.length);
  await expect(inFrame(page, `watch-report-${CLAIM_ONLY.id}`)).toHaveCount(0);
  watch.expectClean();
});

test("7: dismissing folds the card to one line and emits nothing, and Undo brings it back", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await tourScan(page, "approval.requested", { approvalId: TOUR_APPROVAL.id }, 300);
  const item = inFrame(page, `watch-item-${CFT}`);
  await expect(item).toHaveAttribute("data-folded", "false");
  const unfolded = (await item.boundingBox())!.height;
  const before = await storeState(page);
  const beforeLog = await logLength(page);

  await item.getByTestId(`watch-dismiss-${CFT}`).click();
  await expect(item).toHaveAttribute("data-folded", "true");
  await expect(item.getByTestId(`watch-claim-${CFT}`)).toHaveCount(0);
  await expect(item.getByTestId(`watch-report-${CFT}`)).toHaveCount(0);
  const folded = (await item.boundingBox())!.height;
  expect(folded).toBeLessThan(64);
  expect(folded).toBeLessThan(unfolded / 4);
  expect(await logLength(page)).toBe(beforeLog);
  const after = await storeState(page);
  expect(after.approvals.items[TOUR_APPROVAL.id]).toEqual(before.approvals.items[TOUR_APPROVAL.id]);
  expect(after.watch).toEqual(before.watch);

  await item.locator('[data-role="undo"]').click();
  await expect(item).toHaveAttribute("data-folded", "false");
  await expect(item.getByTestId(`watch-claim-${CFT}`)).toBeVisible();
  await expect(item.getByTestId(`watch-report-${CFT}`)).toBeEnabled();
  expect(await logLength(page)).toBe(beforeLog);
  watch.expectClean();
});

test("8: the report button waits for apr_03, then moves to /sell/approvals?ref=apr_03 without resetting the store", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await tourScan(page, "approval.requested", { approvalId: TOUR_APPROVAL.id }, -1);
  const report = inFrame(page, `watch-report-${CFT}`);
  await expect(report).toBeDisabled();
  await expect(report).toHaveText(ACTIONS.waiting.en);

  await tourScan(page, "approval.requested", { approvalId: TOUR_APPROVAL.id }, 300);
  await expect(report).toBeEnabled();
  await expect(report).toHaveText(ACTIONS.review.en);
  await expect(inFrame(page, `watch-item-${CFT}`)).toContainText(GLOSSARY.proposedByCindy.en);
  const beforeLog = await logLength(page);
  const hits = (await storeState(page)).watch.hitIds;

  await report.click();
  await expect(page).toHaveURL(new RegExp(`/sell/approvals\\?ref=${TOUR_APPROVAL.id}$`));
  const s = await storeState(page);
  expect(s.watch.hitIds).toEqual(hits);
  expect(s.approvals.items[TOUR_APPROVAL.id]?.requested).toBe(true);
  expect(s.log.entries.length).toBeGreaterThanOrEqual(beforeLog);
  watch.expectClean();
});

test("8: after the owner's decision the report button reads approved or declined", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await tourScan(page, "approval.requested", { approvalId: TOUR_APPROVAL.id }, 300);
  await seed(page, [
    { type: "approval.granted", payload: { approvalId: TOUR_APPROVAL.id, by: "own_01", date: TOUR_APPROVAL.decisionDate }, source: "user" },
  ]);
  await expect(inFrame(page, `watch-report-${CFT}`)).toHaveText(ACTIONS.reportApproved.en);

  // A person's own scan: its report is declined.
  await inFrame(page, "watch-scan").click();
  await expect.poll(async () => (await storeState(page)).approvals.approvalIds.filter((id) => id.startsWith("apr_user_")).length, { timeout: 20_000 }).toBe(1);
  const s = await storeState(page);
  const aprId = s.approvals.approvalIds.find((id) => id.startsWith("apr_user_"))!;
  const cftId = s.approvals.items[aprId].approval!.subjectIds[0];
  await expect(inFrame(page, `watch-report-${cftId}`)).toHaveText(ACTIONS.review.en);
  await seed(page, [
    { type: "approval.declined", payload: { approvalId: aprId, by: "own_01", reason: { en: "Checked it myself.", zh: "我自己查过了。" } }, source: "user" },
  ]);
  await expect(inFrame(page, `watch-report-${cftId}`)).toHaveText(ACTIONS.reportDeclined.en);
  watch.expectClean();
});

test("9: a live hit's report button follows its inline approval to /sell/approvals?ref=apr_user_1", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  const scanId = "wsc_user_1";
  await seed(page, [
    { type: "watch.started", payload: { scanId, makerId: TOUR_SCAN.makerId, queries: [...TOUR_SCAN.queries] } },
    { type: "watch.scanned", payload: { scanId, engine: "apify", candidates: scriptedResults().length, results: scriptedResults() }, key: "b15-watch", source: "live" },
    { type: "counterfeit.flagged", payload: flaggedPayload(CFT, scanId, "cft_user_1"), key: "b15-watch", source: "live" },
    {
      type: "approval.requested",
      payload: {
        approvalId: "apr_user_1",
        approval: {
          kind: "report_listing",
          subjectIds: ["cft_user_1"],
          overLimit: false,
          proposedBy: "cindy",
          summary: { en: `Report the listing "${TOUR_HIT.title}"`, zh: `举报商品“${TOUR_HIT.title}”` },
          decisionDate: TOUR_APPROVAL.decisionDate,
        },
      },
      key: "b15-watch",
      source: "live",
    },
  ]);
  await expect(inFrame(page, "watch-live-cft_user_1")).toBeVisible();
  const report = inFrame(page, "watch-report-cft_user_1");
  await expect(report).toBeEnabled();
  await report.click();
  await expect(page).toHaveURL(/\/sell\/approvals\?ref=apr_user_1$/);
  watch.expectClean();
});

test("10: a finished scan with no hits shows watch-empty", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  const scanId = "wsc_user_1";
  const results = scriptedResults().filter((r) => r.verdict !== "possible_copy");
  await seed(page, [
    { type: "watch.started", payload: { scanId, makerId: TOUR_SCAN.makerId, queries: [...TOUR_SCAN.queries] } },
    { type: "watch.scanned", payload: { scanId, engine: "scripted", candidates: results.length, results }, key: "b15-watch" },
  ]);
  await expect(inFrame(page, "watch-empty")).toHaveText(RESULTS.empty.en);
  await expect(page.getByTestId("frame-studio").getByTestId(/^watch-item-/)).toHaveCount(0);
  await expect(inFrame(page, "watch-checked").getByTestId(/^watch-checked-\d+$/)).toHaveCount(results.length);
  watch.expectClean();
});
