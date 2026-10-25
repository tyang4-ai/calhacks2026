// M-approvals T4: approve, decline, the owner's check on a live report, the seals and what happens
// next. Acceptance 4 (both seals after d09's grants), 5 (the owner's grant wins), 6 (decline with a
// reason), 8 (after a report's grant, L24), 9 (a live report waits for the owner's check) and 11 (an
// inline approval's grant carries its own decisionDate).
import { expect, test, type Page } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import type { Approval, CounterfeitCandidate, FollowUp, InlineApproval } from "../../src/core/types";
import { allFollowUps, counterfeitCandidates, getById } from "../../src/mock/index";
import { GLOSSARY, KIND_NEXT, LABELS, UI } from "../../src/features/approvals/strings";
import { approvalItem, logged, openApprovals, seed, seekToEvent, type Seed } from "./approvals-lib";

const APR_02 = getById<Approval>("apr_02")!;
const APR_03 = getById<Approval>("apr_03")!;
const CFT_01 = counterfeitCandidates.find((c) => c.id === "cft_01")! as CounterfeitCandidate;
const FUP_02 = allFollowUps.find((f) => f.id === "fup_02")! as FollowUp;

function hitEvents(source: "scripted" | "live"): Seed[] {
  return [
    {
      type: "counterfeit.flagged",
      source,
      key: "b15-watch",
      payload: { cftId: CFT_01.id, scanId: "wsc_01", pieceId: CFT_01.pieceId, url: CFT_01.url, title: CFT_01.title, snippet: CFT_01.snippet, similarity: CFT_01.similarity, claim: CFT_01.claim },
    },
    { type: "followup.drafted", key: "b15-watch", payload: { followUpId: FUP_02.id, approvalId: FUP_02.approvalId, to: FUP_02.to, subject: FUP_02.subject, body: FUP_02.body } },
    { type: "approval.requested", key: "b08-approvals", payload: { approvalId: "apr_03" } },
  ];
}

async function pause(page: Page) {
  await page.evaluate(() => window.__cindia!.player.pause());
}

test("Acceptance 4: 300 ms after the timeline grants apr_02 both cards carry the owner's seal with its date, and no decision buttons", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.granted", { approvalId: "apr_02" }, 300);
  for (const id of ["apr_01", "apr_02"]) {
    const seal = page.getByTestId("approvals-item-" + id).getByTestId(`approvals-seal-${id}`);
    await expect(seal).toBeVisible();
    const granted = await approvalItem(page, id);
    expect(granted?.status).toBe("granted");
    expect(granted?.date).toBeTruthy();
    await expect(seal).toContainText(/\d/);
    await expect(page.getByTestId(`approvals-approve-${id}`)).toHaveCount(0);
    await expect(page.getByTestId(`approvals-decline-${id}`)).toHaveCount(0);
  }
  // The selected grant's detail says what happens next.
  await expect(page.getByTestId("approvals-next")).toContainText(KIND_NEXT.maker_payouts.en);
  watch.expectClean();
});

test("Acceptance 5: the owner's tap on apr_02 before the timeline's grant seals it once, and the timeline's grant changes nothing", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);
  await expect(page.getByTestId("approvals-seal-apr_02")).toHaveCount(0);
  await page.getByTestId("approvals-approve-apr_02").click();

  const seal = page.getByTestId("approvals-seal-apr_02");
  await expect(seal).toBeVisible();
  await expect(page.getByTestId("approvals-approve-apr_02")).toHaveCount(0);
  const first = await approvalItem(page, "apr_02");
  expect(first).toMatchObject({ status: "granted", source: "user", by: "own_01", date: APR_02.decisionDate });
  expect(APR_02.decisionDate).toBe("2026-10-01");
  const sealText = await seal.textContent();
  const cardText = await page.getByTestId("approvals-item-apr_02").textContent();
  await expect(page.getByTestId("approvals-next")).toContainText(KIND_NEXT.maker_payouts.en);

  // seek() would reset the store and drop the tap, so replay the timeline's own grant by hand.
  await page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline();
    const grant = tl!.events.find((e) => e.type === "approval.granted" && (e.payload as { approvalId: string }).approvalId === "apr_02");
    if (!grant) throw new Error("no timeline grant for apr_02");
    window.__cindia!.emit(grant);
  });

  expect(await approvalItem(page, "apr_02")).toEqual(first);
  const userGrants = (await logged(page, "approval.granted")).filter((e) => e.source === "user");
  expect(userGrants).toHaveLength(1);
  await expect(seal).toHaveText(sealText ?? "");
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveText(cardText ?? "");
  await expect(page.getByTestId("approvals-seal-apr_02")).toHaveCount(1);
  watch.expectClean();
});

test("Acceptance 6: declining apr_01 before the timeline's grant stores the reason, the card reads declined, and no seal shows", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, 300);
  await page.getByTestId("approvals-decline-apr_01").click();
  const reasonBox = page.getByTestId("approvals-reason-apr_01");
  await expect(reasonBox).toBeVisible();

  // A blank reason submits nothing.
  await reasonBox.press("Enter");
  expect((await approvalItem(page, "apr_01"))?.status).toBe("pending");

  const reason = "Ask the gallery to call me first";
  await reasonBox.fill(reason);
  await reasonBox.press("Enter");

  await expect(page.getByTestId("approvals-reason-apr_01")).toHaveCount(0);
  expect(await approvalItem(page, "apr_01")).toMatchObject({ status: "declined", by: "own_01", source: "user", reason: { en: reason, zh: reason } });
  const card = page.getByTestId("approvals-item-apr_01");
  await expect(card).toContainText(GLOSSARY.declined.en);
  await expect(card).toContainText(reason);
  await expect(page.getByTestId("approvals-seal-apr_01")).toHaveCount(0);
  await expect(page.getByTestId("approvals-approve-apr_01")).toHaveCount(0);
  await expect(page.getByTestId("approvals-detail")).toContainText(reason);

  // The timeline's own grant later changes nothing: the first decision wins.
  await page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline();
    const grant = tl!.events.find((e) => e.type === "approval.granted" && (e.payload as { approvalId: string }).approvalId === "apr_01");
    window.__cindia!.emit(grant!);
  });
  expect((await approvalItem(page, "apr_01"))?.status).toBe("declined");
  await expect(page.getByTestId("approvals-seal-apr_01")).toHaveCount(0);
  watch.expectClean();
});

/** Emits the loaded timeline's own events of a type for an approval, as a later play would. */
async function replay(page: Page, type: string, match: (p: Record<string, unknown>) => boolean) {
  const payloads = await page.evaluate(
    (t) => (window.__cindia!.player.getTimeline()?.events ?? []).filter((e) => e.type === t).map((e) => e as unknown as Record<string, unknown>),
    type,
  );
  const events = payloads.filter((e) => match(e.payload as Record<string, unknown>));
  expect(events.length, `the timeline has ${type} to replay`).toBeGreaterThan(0);
  await page.evaluate((list) => list.forEach((e) => window.__cindia!.emit(e)), events);
}

test("a declined follow-up never reads Sent, even when the timeline's followup.sent arrives later", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, 300);
  await page.getByTestId("approvals-decline-apr_01").click();
  await page.getByTestId("approvals-reason-apr_01").fill("Not yet");
  await page.getByTestId("approvals-reason-apr_01").press("Enter");
  expect((await approvalItem(page, "apr_01"))?.status).toBe("declined");

  await replay(page, "followup.sent", (p) => p.approvalId === "apr_01");
  const sentInStore = await page.evaluate(() =>
    Object.values((window.__cindia!.store.getState() as unknown as { approvals: { followUps: Record<string, { approvalId: string; sent: boolean }> } }).approvals.followUps).some((f) => f.approvalId === "apr_01" && f.sent),
  );
  expect(sentInStore).toBe(true);
  // "Sent in English, as the gallery reads it." is the draft's own note, not the Sent mark.
  const sentMark = new RegExp(`${GLOSSARY.sent.en}(?! in English)`);
  await expect(page.getByTestId("approvals-detail")).toContainText(GLOSSARY.declined.en);
  await expect(page.getByTestId("approvals-detail")).not.toContainText(sentMark);
  await expect(page.getByTestId("approvals-item-apr_01")).not.toContainText(sentMark);
  watch.expectClean();
});

test("declined maker payouts never read Sent, even when the timeline's payout.sent arrives later", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);
  await page.getByTestId("approvals-decline-apr_02").click();
  await page.getByTestId("approvals-reason-apr_02").fill("Hold all three");
  await page.getByTestId("approvals-reason-apr_02").press("Enter");
  expect((await approvalItem(page, "apr_02"))?.status).toBe("declined");

  await replay(page, "payout.sent", (p) => APR_02.subjectIds.includes(String(p.makerPayoutId)));
  for (const id of APR_02.subjectIds) {
    const line = page.getByTestId("approvals-detail").getByTestId(`approvals-payout-${id}`);
    await expect(line).toBeVisible();
    await expect(line).not.toContainText(GLOSSARY.sent.en);
  }
  await expect(page.getByTestId("approvals-item-apr_02")).not.toContainText(GLOSSARY.sent.en);
  watch.expectClean();
});

test("Acceptance 8: approving a report on a scripted hit needs no check, and what happens next reads L24", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  await seed(page, hitEvents("scripted"));
  await expect(page.getByTestId("approvals-confirm-apr_03")).toHaveCount(0);
  const approve = page.getByTestId("approvals-approve-apr_03");
  await expect(approve).toBeEnabled();
  await approve.click();

  expect(await approvalItem(page, "apr_03")).toMatchObject({ status: "granted", source: "user", by: "own_01", date: APR_03.decisionDate });
  await expect(page.getByTestId("approvals-seal-apr_03")).toBeVisible();
  await expect(page.getByTestId("approvals-item-apr_03")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-next")).toContainText(LABELS.L24.en);
  watch.expectClean();
});

test("Acceptance 9: on a hit from a live scan, approve stays disabled until the owner ticks her own check", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  await seed(page, hitEvents("live"));
  const approve = page.getByTestId("approvals-approve-apr_03");
  const confirm = page.getByTestId("approvals-confirm-apr_03");
  await expect(confirm).toBeVisible();
  await expect(page.getByTestId("approvals-item-apr_03")).toContainText(UI.confirmLooked.en);
  await expect(approve).toBeDisabled();
  await approve.click({ force: true });
  expect((await approvalItem(page, "apr_03"))?.status).toBe("pending");

  await confirm.check();
  await expect(approve).toBeEnabled();
  await approve.click();
  expect((await approvalItem(page, "apr_03"))?.status).toBe("granted");
  await expect(page.getByTestId("approvals-next")).toContainText(LABELS.L24.en);
  watch.expectClean();
});

test("Acceptance 11: approving an inline approval emits approval.granted dated with the inline decisionDate", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  const inline: InlineApproval = {
    kind: "listing_publish",
    subjectIds: ["lst_user_1"],
    overLimit: false,
    proposedBy: "cindy",
    summary: { en: "Publish the new listing from your notes.", zh: "发布根据您的笔记起草的新作品。" },
    decisionDate: "2026-10-03",
  };
  await seed(page, [{ type: "approval.requested", key: "b08-approvals", payload: { approvalId: "apr_user_1", approval: inline } }]);
  await page.getByTestId("approvals-approve-apr_user_1").click();
  expect(await approvalItem(page, "apr_user_1")).toMatchObject({ status: "granted", source: "user", by: "own_01", date: inline.decisionDate });
  await expect(page.getByTestId("approvals-seal-apr_user_1")).toBeVisible();
  await expect(page.getByTestId("approvals-next")).toContainText(KIND_NEXT.listing_publish.en);
  watch.expectClean();
});

test("an approval nothing describes shows its ID and no details, and can still be declined", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  await seed(page, [{ type: "approval.requested", key: "b08-approvals", payload: { approvalId: "apr_user_9" } }]);
  const card = page.getByTestId("approvals-item-apr_user_9");
  await expect(card).toContainText("apr_user_9");
  await expect(card).toContainText(UI.noDetails.en);
  await expect(page.getByTestId("approvals-approve-apr_user_9")).toBeDisabled();
  await page.getByTestId("approvals-decline-apr_user_9").click();
  await page.getByTestId("approvals-reason-apr_user_9").fill("Not mine");
  await page.getByTestId("approvals-reason-apr_user_9").press("Enter");
  expect((await approvalItem(page, "apr_user_9"))?.status).toBe("declined");
  watch.expectClean();
});
