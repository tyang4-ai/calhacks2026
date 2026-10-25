// M-approvals T2: the list cards. Acceptance 1 (apr_01's card), 2 (apr_02's card reads $340.00 held),
// 3 (every card and the detail say Cindy proposed it, and no seal before its grant), 11 (an inline
// approval's card), 13 (English only: the cards in the slot's English). Elements are found by test ID only, the timeline is
// moved by event, and expected copy is computed from the mock and the feature's strings.
import { expect, test } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import type { Approval, Channel, Contract, Flag, InlineApproval, MakerPayout } from "../../src/core/types";
import type { Payloads } from "../../src/core/events";
import { allApprovals, getById, swarmRuns } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { GLOSSARY, KIND_TITLE, heldLine, listingSummary, payoutsSummary, shortPaymentSummary } from "../../src/features/approvals/strings";
import { openApprovals, seed, seekToEvent } from "./approvals-lib";

const APR_01 = getById<Approval>("apr_01")!;
const APR_02 = getById<Approval>("apr_02")!;
const FLAG = getById<Flag>("flg_01")!;
const GALLERY = getById<Channel>(getById<Contract>(FLAG.recordIds[0])!.channelId)!.name;
const PAYOUTS = APR_02.subjectIds.map((id) => getById<MakerPayout>(id)!);
const TOTAL_CENTS = PAYOUTS.reduce((a, p) => a + p.amountCents, 0);
const HELD_CENTS = PAYOUTS.reduce((a, p) => a + p.heldCents, 0);

/** run_02's scripted draft, the listing.drafted the tour plays for lst_01. */
function listingDraft(): Payloads["listing.drafted"] {
  const run = swarmRuns.find((r) => r.runId === "run_02")!;
  const ev = run.final.find((e) => e.type === "listing.drafted")!;
  return ev.payload as Payloads["listing.drafted"];
}

test("Acceptance 1: 300 ms after apr_01's request its card shows the follow-up to the gallery for the short amount, pending", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, 300);

  const card = page.getByTestId("approvals-item-apr_01");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("lang", "en");
  await expect(card).toContainText(KIND_TITLE.follow_up.en);
  await expect(card).toContainText(GALLERY.en);
  await expect(card).toContainText(shortPaymentSummary(formatCents(FLAG.deltaCents), GALLERY).en);
  await expect(card).toContainText(formatCents(APR_01.amountCents!));
  await expect(card).toContainText(GLOSSARY.needsApproval.en);
  await expect(card).toContainText(GLOSSARY.proposedByCindy.en);
  if (!APR_01.overLimit) await expect(card).not.toContainText(GLOSSARY.overLimit.en);
  await expect(page.getByTestId("approvals-seal-apr_01")).toHaveCount(0);
  // apr_02 isn't requested yet, so its card isn't there.
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 2: 300 ms after apr_02's request its card reads the held total, the payouts' sum and the over-limit mark", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);

  const card = page.getByTestId("approvals-item-apr_02");
  await expect(card).toBeVisible();
  await expect(card).toContainText(KIND_TITLE.maker_payouts.en);
  await expect(card).toContainText(payoutsSummary(PAYOUTS.length, formatCents(TOTAL_CENTS)).en);
  // The held total is the sum of the three payouts' heldCents: $340.00, as v1's card showed it.
  expect(HELD_CENTS).toBe(FLAG.deltaCents);
  await expect(card).toContainText(heldLine(formatCents(HELD_CENTS)).en);
  await expect(page.locator('[data-testid="approvals-item-apr_02"] [data-part="held-total"]')).toContainText(formatCents(HELD_CENTS));
  if (APR_02.overLimit) await expect(card).toContainText(GLOSSARY.overLimit.en);
  await expect(card).toContainText(GLOSSARY.needsApproval.en);
  watch.expectClean();
});

test("Acceptance 3: around every request and grant, each card and the detail say Cindy proposed it, and no seal shows before its grant", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  const moments: [string, string, number][] = [];
  for (const id of ["apr_01", "apr_02"]) {
    moments.push(["approval.requested", id, 300], ["approval.granted", id, -100], ["approval.granted", id, 300]);
  }
  moments.push(["payout.sent", "", 300]);

  for (const [type, id, offset] of moments) {
    const at = type === "payout.sent" ? await seekToEvent(page, type, { makerPayoutId: "mpo_03" }, offset) : await seekToEvent(page, type, { approvalId: id }, offset);
    const items = await page.evaluate(() => (window.__cindia!.store.getState() as unknown as { approvals: { items: Record<string, { status: string; requested: boolean }> } }).approvals.items);
    for (const a of allApprovals) {
      const card = page.getByTestId(`approvals-item-${a.id}`);
      const item = items[a.id];
      if (!item?.requested) {
        await expect(card, `${a.id} at ${at} ms`).toHaveCount(0);
        continue;
      }
      await expect(card, `${a.id} at ${at} ms`).toBeVisible();
      await expect(card, `${a.id} at ${at} ms says Cindy proposed it`).toContainText(GLOSSARY.proposedByCindy.en);
      if (item.status !== "granted") await expect(page.getByTestId(`approvals-seal-${a.id}`), `${a.id} has no seal at ${at} ms`).toHaveCount(0);
      else await expect(card, `${a.id} reads approved at ${at} ms`).toContainText(GLOSSARY.approved.en);
    }
    await expect(page.getByTestId("approvals-detail"), `the detail at ${at} ms`).toContainText(GLOSSARY.proposedByCindy.en);
  }
  watch.expectClean();
});

test("cards list in request order, the newest is selected, and a click selects another", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);
  const ids = await page.locator('[data-testid^="approvals-item-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(["approvals-item-apr_01", "approvals-item-apr_02"]);
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-item-apr_01")).not.toHaveAttribute("aria-current", "true");

  await page.getByTestId("approvals-item-apr_01").click();
  await expect(page.getByTestId("approvals-item-apr_01")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-item-apr_02")).not.toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-detail")).toContainText(KIND_TITLE.follow_up.en);
  watch.expectClean();
});

test("Acceptance 11: a card for an approval that isn't in the mock shows its inline summary, then the draft's own line", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  const draft = { ...listingDraft(), listingId: "lst_user_1" };
  const inline: InlineApproval = {
    kind: "listing_publish",
    subjectIds: ["lst_user_1"],
    overLimit: false,
    proposedBy: "cindy",
    summary: { en: "Publish the new listing from your notes.", zh: "发布根据您的笔记起草的新作品。" },
    decisionDate: "2026-10-03",
  };
  await seed(page, [{ type: "approval.requested", payload: { approvalId: "apr_user_1", approval: inline } }]);
  const card = page.getByTestId("approvals-item-apr_user_1");
  await expect(card).toContainText(inline.summary.en);
  await expect(card).toContainText(KIND_TITLE.listing_publish.en);
  await expect(card).toContainText(GLOSSARY.proposedByCindy.en);
  await expect(card).not.toContainText(listingSummary(draft.title).en);

  await seed(page, [{ type: "listing.drafted", payload: draft }]);
  await expect(card).toContainText(inline.summary.en);
  await expect(card).toContainText(listingSummary(draft.title).en);
  watch.expectClean();
});

test("Acceptance 13 (English only, decisions.md Oct 24 11:35 PM): the cards render in the slot's English, with no Chinese label", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.granted", { approvalId: "apr_01" }, 300);
  const props = JSON.parse((await page.locator('[data-slot="owner.main"]').getAttribute("data-slot-props")) ?? "{}") as { lang?: string };
  expect(props.lang).toBe("en");
  const followUp = page.getByTestId("approvals-item-apr_01");
  const payouts = page.getByTestId("approvals-item-apr_02");

  await expect(followUp).toHaveAttribute("lang", "en");
  await expect(followUp).toContainText(KIND_TITLE.follow_up.en);
  await expect(followUp).toContainText(shortPaymentSummary(formatCents(FLAG.deltaCents), GALLERY).en);
  await expect(followUp).toContainText(GLOSSARY.approved.en);
  await expect(followUp).toContainText(GLOSSARY.proposedByCindy.en);
  await expect(followUp).toContainText(GLOSSARY.followUp.en);
  for (const zh of [KIND_TITLE.follow_up.zh, GLOSSARY.approved.zh, GLOSSARY.proposedByCindy.zh, GLOSSARY.followUp.zh]) await expect(followUp).not.toContainText(zh);

  await expect(payouts).toHaveAttribute("lang", "en");
  await expect(payouts).toContainText(KIND_TITLE.maker_payouts.en);
  await expect(payouts).toContainText(payoutsSummary(PAYOUTS.length, formatCents(TOTAL_CENTS)).en);
  await expect(payouts).toContainText(heldLine(formatCents(HELD_CENTS)).en);
  await expect(payouts).toContainText(GLOSSARY.needsApproval.en);
  if (APR_02.overLimit) await expect(payouts).toContainText(GLOSSARY.overLimit.en);
  for (const zh of [KIND_TITLE.maker_payouts.zh, GLOSSARY.needsApproval.zh, GLOSSARY.overLimit.zh, heldLine(formatCents(HELD_CENTS)).zh]) await expect(payouts).not.toContainText(zh);
  watch.expectClean();
});
