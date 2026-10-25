// F-seller-hub T5: the draft, its checks, the index line and the approve link.
// - Acceptance 4 (draft): 300 ms after the run's listing.drafted, seller-listing-draft shows the title
//   in both languages, the facet and vibe chips, L27 in seller-listing-translated-<lang> beside the
//   version not in lst_01.lang only, and each check as passed or needs review with its note.
// - Acceptance 5: 300 ms after its listing.indexed, seller-listing-indexed shows the payload's modelId
//   and names cindia-drafts.
// - Acceptance 6: before apr_04's approval.requested the approve link is disabled; after it, a click
//   opens /sell/approvals?ref=apr_04. A grant reads approved, a decline reads declined.
// Seeks by event (or seeds the run before the tour carries it), selects by test ID only. Expected
// values come from src/mock/.
import { expect, test } from "@playwright/test";
import { GLOSSARY, L27, LISTING } from "../../src/features/seller-hub/strings";
import { watchPage } from "../smoke/lib";
import {
  FRAME_VIEWPORT,
  LST_01,
  RUN_02_APPROVAL,
  RUN_02_DRAFT,
  RUN_02_INDEXED,
  openSell,
  seed,
  storeState,
  studio,
  tourListing,
} from "./seller-hub-lib";

test.use({ viewport: FRAME_VIEWPORT });

const OTHER = LST_01.lang === "en" ? "zh" : "en";

test("300 ms after the draft: both languages, L27 on the translated one only, chips and every check", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "listings");
  await tourListing(page, "listing.drafted", { listingId: LST_01.id }, 300);
  const draft = studio(page).getByTestId("seller-listing-draft");
  await expect(draft).toBeVisible();

  await expect(draft).toContainText(RUN_02_DRAFT.title.en);
  await expect(draft).toContainText(RUN_02_DRAFT.title.zh);
  await expect(draft).toContainText(RUN_02_DRAFT.summary.en);

  const translated = draft.getByTestId(`seller-listing-translated-${OTHER}`);
  await expect(translated).toBeVisible();
  await expect(translated).toHaveText(L27.en);
  await expect(draft.getByTestId(`seller-listing-translated-${LST_01.lang}`)).toHaveCount(0);

  const words = [
    RUN_02_DRAFT.facets.object.en,
    ...RUN_02_DRAFT.facets.materials,
    ...RUN_02_DRAFT.facets.techniques,
    ...RUN_02_DRAFT.facets.motifs,
    ...RUN_02_DRAFT.facets.colors,
    ...RUN_02_DRAFT.vibe.moods,
    ...RUN_02_DRAFT.vibe.occasions,
    ...RUN_02_DRAFT.vibe.recipients,
  ];
  for (const w of words) await expect(draft).toContainText(w);

  for (const c of RUN_02_DRAFT.checks) {
    const row = draft.getByTestId(`seller-listing-check-${c.checkId}`);
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("data-ok", c.ok ? "true" : "false");
    await expect(row).toContainText(c.ok ? LISTING.passed.en : LISTING.needsReview.en);
    await expect(row).toContainText(LISTING.checkKinds[c.kind].en);
    await expect(row).toContainText(c.note.en);
  }
  // The tour's facts check catches the planted claim, labeled a planted test as the data writes it.
  const facts = RUN_02_DRAFT.checks.find((c) => c.kind === "facts")!;
  expect(facts.ok).toBe(false);
  await expect(draft.getByTestId(`seller-listing-check-${facts.checkId}`)).toContainText("Planted test");

  // No index line until the listing.indexed arrives.
  await expect(page.getByTestId("seller-listing-indexed")).toHaveCount(0);
  watch.expectClean();
});

test("300 ms after the index event: the model, cindia-drafts and the passage it embedded", async ({ page }) => {
  await openSell(page, "listings");
  await tourListing(page, "listing.indexed", { listingId: LST_01.id }, 300);
  const s = await storeState(page);
  expect(s.mode).toBe("scripted");
  const line = studio(page).getByTestId("seller-listing-indexed");
  await expect(line).toBeVisible();
  await expect(line).toContainText(RUN_02_INDEXED.modelId);
  await expect(line).toContainText("cindia-drafts");
  await expect(line).toContainText(RUN_02_INDEXED.pieceId);
  await expect(line).toContainText(RUN_02_INDEXED.embedText);
  await expect(line).toContainText("cindia-pieces");
});

test("the approve link waits for apr_04, then opens it in the approvals view", async ({ page }) => {
  await openSell(page, "listings");
  await tourListing(page, "approval.requested", { approvalId: RUN_02_APPROVAL.approvalId }, -1);
  const approve = page.getByTestId("seller-listing-approve");
  await expect(approve).toBeDisabled();
  await expect(approve).toHaveText(LISTING.waitingProposal.en);

  await tourListing(page, "approval.requested", { approvalId: RUN_02_APPROVAL.approvalId }, 0);
  await expect(approve).toBeEnabled();
  await expect(approve).toHaveText(LISTING.review.en);
  await expect(approve).toHaveAttribute("data-approval-id", "apr_04");
  await approve.click();
  await expect(page).toHaveURL(/\/sell\/approvals\?ref=apr_04$/);
});

test("after a grant the link reads approved, after a decline declined", async ({ page }) => {
  await openSell(page, "listings");
  await tourListing(page, "approval.requested", { approvalId: RUN_02_APPROVAL.approvalId }, 0);
  const approve = page.getByTestId("seller-listing-approve");
  await seed(page, [{ type: "approval.granted", payload: { approvalId: "apr_04", by: "own_01", date: "2026-10-01" } }]);
  await expect(approve).toHaveText(GLOSSARY.approved.en);
  await expect(approve).toHaveAttribute("data-status", "granted");

  await openSell(page, "listings");
  await tourListing(page, "approval.requested", { approvalId: RUN_02_APPROVAL.approvalId }, 0);
  await seed(page, [{ type: "approval.declined", payload: { approvalId: "apr_04", by: "own_01", reason: { en: "Fix the wool first.", zh: "先改正毛线。" } } }]);
  await expect(approve).toHaveText(GLOSSARY.declined.en);
  await expect(approve).toHaveAttribute("data-status", "declined");
});

test("in Chinese the labels change, L27 reads in Chinese and the draft's own words stay", async ({ page }) => {
  await openSell(page, "listings");
  await tourListing(page, "approval.requested", { approvalId: RUN_02_APPROVAL.approvalId }, 0);
  for (let i = 0; i < 3; i++) {
    if ((await page.evaluate(() => window.__cindia!.store.getState().lang)) === "zh") break;
    await page.getByTestId("demo-lang-toggle").click();
  }
  await expect(page.getByTestId(`seller-listing-translated-${OTHER}`)).toHaveText(L27.zh);
  await expect(page.getByTestId("seller-listing-approve")).toHaveText(LISTING.review.zh);
  for (const c of RUN_02_DRAFT.checks) {
    await expect(page.getByTestId(`seller-listing-check-${c.checkId}`)).toContainText(c.ok ? LISTING.passed.zh : LISTING.needsReview.zh);
  }
  await expect(page.getByTestId("seller-listing-draft")).toContainText(RUN_02_DRAFT.title.en);
  await expect(page.getByTestId("seller-listing-draft")).toContainText(RUN_02_DRAFT.title.zh);
});
