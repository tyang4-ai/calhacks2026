// F-seller-hub T3: the listing composer.
// - Acceptance 3: before any listing event, the notes box holds lst_01's notes and the maker picker
//   shows lst_01's maker.
// - The timeline's own listing.requested shows in the box as if typed, and "Draft with Cindy" is
//   disabled while that listing's run is still going.
// - Acceptance 7: with lst_01's notes unchanged, a person's listing.requested (source "user",
//   lst_user_<n>) gets run_02's steps under that listing's ID, and the approve link enables on an
//   apr_user_ approval naming the person's listing, never on apr_04. With the notes edited first,
//   the steps belong to the fallback sample run.
// Selects by test ID only. Expected values come from src/mock/. A seek drops a pending answer to a
// person, so these specs never seek after asking.
import { expect, test } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { studio as coop } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { ANSWER_TIMEOUT, FALLBACK_RUN, FRAME_VIEWPORT, LST_01, RUN_02, logged, openSell, seed, storeState } from "./seller-hub-lib";

test.use({ viewport: FRAME_VIEWPORT });

test("before any listing event the box holds lst_01's notes and the picker shows its maker", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "listings");
  const s = await storeState(page);
  expect(s.listings.latestListingId).toBeNull();
  await expect(page.getByTestId("seller-listing-notes")).toHaveValue(LST_01.notes);
  await expect(page.getByTestId("seller-listing-maker")).toHaveValue(LST_01.makerId);
  const options = await page.getByTestId("seller-listing-maker").evaluate((el) => [...(el as HTMLSelectElement).options].map((o) => o.value));
  expect(options).toEqual(coop.makerIds);
  await expect(page.getByTestId("seller-listing-ask")).toBeEnabled();
  watch.expectClean();
});

test("the timeline's request shows as if typed, and Draft with Cindy waits for its draft", async ({ page }) => {
  await openSell(page, "listings");
  await page.getByTestId("seller-listing-notes").fill("Something else entirely.");
  await page.getByTestId("seller-listing-maker").selectOption(coop.makerIds.find((m) => m !== LST_01.makerId)!);
  await seed(page, [{ type: "listing.requested", payload: { listingId: LST_01.id, makerId: LST_01.makerId, notes: LST_01.notes, lang: LST_01.lang } }]);
  await expect(page.getByTestId("seller-listing-notes")).toHaveValue(LST_01.notes);
  await expect(page.getByTestId("seller-listing-maker")).toHaveValue(LST_01.makerId);
  await expect(page.getByTestId("seller-listing-ask")).toBeDisabled();

  const drafted = RUN_02.final.find((f) => f.type === "listing.drafted")!;
  await seed(page, [{ type: "listing.drafted", payload: drafted.payload }]);
  await expect(page.getByTestId("seller-listing-ask")).toBeEnabled();
});

test("a person's request with lst_01's notes gets run_02 under the person's listing and its own approval", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "listings");
  await page.getByTestId("seller-listing-ask").click();

  // The request: source user, a lst_user_ ID, lst_01's maker, notes and lang.
  await expect.poll(async () => (await logged(page, "listing.requested")).length).toBe(1);
  const [req] = await logged(page, "listing.requested");
  expect(req.source).toBe("user");
  const s0 = await storeState(page);
  const listingId = s0.listings.latestListingId!;
  expect(listingId).toMatch(/^lst_user_\d+$/);
  const request = s0.listings.requests[listingId] as Payloads["listing.requested"];
  expect(request.makerId).toBe(LST_01.makerId);
  expect(request.notes).toBe(LST_01.notes);
  expect(request.lang).toBe(LST_01.lang);
  await expect(page.getByTestId("seller-listing-ask")).toBeDisabled();

  // run_02's steps arrive under the person's listing, re-keyed.
  const steps = page.getByTestId("seller-listing-steps").locator('[data-testid^="seller-listing-step-"]');
  await expect(steps).toHaveCount(RUN_02.steps.length, { timeout: ANSWER_TIMEOUT });
  const ids = await steps.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  for (const id of ids) expect(id).toMatch(/^seller-listing-step-stp_user_\d+$/);
  const s1 = await storeState(page);
  const runIds = s1.swarm.runIds.filter((r) => s1.swarm.runs[r].threadId === listingId);
  expect(runIds).toHaveLength(1);
  expect(runIds[0]).not.toBe(RUN_02.runId);
  expect(s1.swarm.runs[runIds[0]].stepIds.map((st) => s1.swarm.steps[st].agentId)).toEqual(RUN_02.steps.map((st) => st.agentId));

  // The approve link enables on the person's own approval, never apr_04.
  const approve = page.getByTestId("seller-listing-approve");
  await expect(approve).toBeEnabled({ timeout: ANSWER_TIMEOUT });
  const approvalId = await approve.getAttribute("data-approval-id");
  expect(approvalId).toMatch(/^apr_user_\d+$/);
  const s2 = await storeState(page);
  expect(s2.approvals.items["apr_04"]).toBeUndefined();
  const inline = s2.approvals.items[approvalId!].approval!;
  expect(inline.kind).toBe("listing_publish");
  expect(inline.subjectIds).toEqual([listingId]);
  await expect(page.getByTestId("seller-listing-draft")).toHaveAttribute("data-listing-id", listingId);
  await expect(page.getByTestId("seller-listing-ask")).toBeEnabled();
  watch.expectClean();
});

test("edited notes get the fallback sample run", async ({ page }) => {
  await openSell(page, "listings");
  await page.getByTestId("seller-listing-notes").fill("A small silver ring with a stamped band. About 6 hours at the bench.");
  await page.getByTestId("seller-listing-ask").click();

  const steps = page.getByTestId("seller-listing-steps").locator('[data-testid^="seller-listing-step-"]');
  await expect(steps).toHaveCount(FALLBACK_RUN.steps.length, { timeout: ANSWER_TIMEOUT });
  const s = await storeState(page);
  const listingId = s.listings.latestListingId!;
  expect(listingId).toMatch(/^lst_user_\d+$/);
  const run = s.swarm.runIds.map((r) => s.swarm.runs[r]).find((r) => r.threadId === listingId)!;
  expect(run.stepIds.map((st) => s.swarm.steps[st].summary.en)).toEqual(FALLBACK_RUN.steps.map((st) => st.summary.en));

  const sample = FALLBACK_RUN.final.find((f) => f.type === "listing.drafted")!.payload as Payloads["listing.drafted"];
  await expect(page.getByTestId("seller-listing-draft")).toContainText(sample.title.en, { timeout: ANSWER_TIMEOUT });
  await expect(page.getByTestId("seller-listing-approve")).toBeEnabled({ timeout: ANSWER_TIMEOUT });
  expect(await page.getByTestId("seller-listing-approve").getAttribute("data-approval-id")).toMatch(/^apr_user_\d+$/);
});
