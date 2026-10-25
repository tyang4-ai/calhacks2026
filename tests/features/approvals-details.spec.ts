// M-approvals T3: the detail column (approvals-detail) for every kind. Acceptance 1 (the drafted
// follow-up), 2 (apr_02's payouts), 4 (sent), 8 (the found listing), 10 (the drafted listing and the
// milestone), 11 (an inline approval's draft), 12 (a support action) and 13 (English only: English
// labels and the payload's English body). The v2 kinds are seeded with seed() from approvals-lib.ts, built from src/mock.
import { expect, test, type Page } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import type { Payloads } from "../../src/core/events";
import type { Approval, CounterfeitCandidate, InlineApproval, ListingDraft, MakerPayout, Person, Studio, WorkInProgress } from "../../src/core/types";
import { allFollowUps, counterfeitCandidates, getById, swarmRuns } from "../../src/mock/index";
import { CHECK_KIND, GLOSSARY, KIND_TITLE, KIND_WAITING, LABELS, UI, textMatchLine } from "../../src/features/approvals/strings";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { openApprovals, seed, seekToEvent, type Seed } from "./approvals-lib";

type Text = { en: string; zh: string };
type FollowUps = Record<string, { approvalId: string; to?: Text; subject?: Text; body?: Text; sent: boolean }>;
type PayoutSent = { makerPayoutId: string; makerId: string; amountCents: number; date: string };

const APR_02 = getById<Approval>("apr_02")!;
const APR_05 = getById<Approval>("apr_05")!;
const CFT_01 = counterfeitCandidates.find((c) => c.id === "cft_01")! as CounterfeitCandidate;
const FUP_02 = allFollowUps.find((f) => f.id === "fup_02")!;
const LST_01 = getById<ListingDraft>("lst_01")!;

/** Whitespace-collapsed text, as Playwright's toContainText compares it. */
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

async function draftFor(page: Page, approvalId: string) {
  return page.evaluate((id) => {
    const s = window.__cindia!.store.getState() as unknown as { approvals: { followUps: FollowUps } };
    return Object.values(s.approvals.followUps).find((f) => f.approvalId === id) ?? null;
  }, approvalId);
}

async function payoutSentEvents(page: Page): Promise<PayoutSent[]> {
  return page.evaluate(() => (window.__cindia!.player.getTimeline()?.events ?? []).filter((e) => e.type === "payout.sent").map((e) => e.payload as PayoutSent));
}

/** run_02's scripted draft, the listing.drafted the tour plays for lst_01. */
function listingDraft(): Payloads["listing.drafted"] {
  const run = swarmRuns.find((r) => r.runId === "run_02")!;
  return run.final.find((e) => e.type === "listing.drafted")!.payload as Payloads["listing.drafted"];
}

/** The watch's hit on cft_01, its Reporter's draft and apr_03, as the tour's scan carries them. */
function hitEvents(source: "scripted" | "live" = "scripted"): Seed[] {
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

test("before followup.drafted nothing is requested and the view says so", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "followup.drafted", { approvalId: "apr_01" }, -100);
  expect(await draftFor(page, "apr_01")).toBeNull();
  await expect(page.getByTestId("approvals-item-apr_01")).toHaveCount(0);
  await expect(page.getByTestId("approvals-empty")).toBeVisible();
  watch.expectClean();
});

test("Acceptance 1: 300 ms after apr_01's request the detail shows the draft from followup.drafted, and one tap opens the full body", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, 300);
  const draft = await draftFor(page, "apr_01");
  expect(draft?.body?.en).toBeTruthy();

  const detail = page.getByTestId("approvals-detail");
  await expect(detail).toContainText(KIND_TITLE.follow_up.en);
  await expect(detail).toContainText(GLOSSARY.followUp.en);
  await expect(detail).toContainText(UI.to.en);
  await expect(detail).toContainText(draft!.to!.en);
  await expect(detail).toContainText(draft!.subject!.en);
  await expect(detail).toContainText(UI.draftInEnglish.en);
  await expect(detail).toContainText(GLOSSARY.proposedByCindy.en);

  const toggle = detail.getByRole("button", { name: UI.readDraft.en });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(detail.getByRole("button", { name: UI.showLess.en })).toHaveAttribute("aria-expanded", "true");
  const shown = await detail.locator("p[lang=en]").first().evaluate((el) => ({ text: el.textContent, ws: getComputedStyle(el).whiteSpace }));
  expect(shown.text).toBe(draft!.body!.en);
  expect(shown.ws).toBe("pre-line");
  await expect(detail).toContainText(squash(draft!.body!.en));
  watch.expectClean();
});

test("Acceptance 2: clicking apr_02 lists its three payouts with name, amount, held amounts and the over-limit marks", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);
  // Select the other card first, so the click on apr_02 is what brings its payouts.
  await page.getByTestId("approvals-item-apr_01").click();
  await expect(page.getByTestId("approvals-detail").getByTestId("approvals-payout-mpo_01")).toHaveCount(0);
  await page.getByTestId("approvals-item-apr_02").click();

  const detail = page.getByTestId("approvals-detail");
  const limit = getById<Studio>("std_dine")!.payoutLimitCents;
  let heldTotal = 0;
  for (const id of APR_02.subjectIds) {
    const mpo = getById<MakerPayout>(id)!;
    const maker = getById<Person>(mpo.makerId)!;
    const line = detail.getByTestId(`approvals-payout-${id}`);
    await expect(line).toBeVisible();
    await expect(line).toContainText(maker.name.en);
    await expect(line).toContainText(maker.surnameChar);
    await expect(line).toContainText(formatCents(mpo.amountCents));
    if (mpo.heldCents > 0) {
      await expect(line).toContainText(GLOSSARY.held.en);
      await expect(line).toContainText(formatCents(mpo.heldCents));
    }
    if (mpo.amountCents > limit) await expect(line).toContainText(GLOSSARY.overLimit.en);
    else await expect(line).not.toContainText(GLOSSARY.overLimit.en);
    await expect(line).not.toContainText(GLOSSARY.sent.en);
    heldTotal += mpo.heldCents;
  }
  // Grace N., Lena T. and Mae K. (the co-op's three makers), and $340.00 held in all.
  expect(APR_02.subjectIds.map((id) => getById<Person>(getById<MakerPayout>(id)!.makerId)!.name.en)).toEqual(["Grace N.", "Lena T.", "Mae K."]);
  expect(formatCents(heldTotal)).toBe("$340.00");
  await expect(detail).toContainText(UI.heldTotal.en);
  await expect(detail).toContainText(formatCents(heldTotal));
  await expect(detail).toContainText(GLOSSARY.heldNote.en);
  watch.expectClean();
});

test("Acceptance 4: once payout.sent has fired for the three payouts, apr_02's detail reads them sent", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  const sentEvents = await payoutSentEvents(page);
  await seekToEvent(page, "payout.sent", { makerPayoutId: "mpo_03" }, 300);
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveAttribute("aria-current", "true");
  for (const id of APR_02.subjectIds) {
    const ev = sentEvents.find((e) => e.makerPayoutId === id)!;
    const line = page.getByTestId("approvals-detail").getByTestId(`approvals-payout-${id}`);
    await expect(line).toContainText(GLOSSARY.sent.en);
    await expect(line).toContainText(formatDate(ev.date, "en"));
  }
  await expect(page.getByTestId("approvals-item-apr_02")).toContainText(GLOSSARY.sent.en);
  watch.expectClean();
});

test("Acceptance 8: a report's detail shows the found listing, its address as text, the text match, the claim, the Reporter's draft and L20", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  await seed(page, hitEvents());
  await page.getByTestId("approvals-item-apr_03").click();

  const hit = page.getByTestId("approvals-detail").getByTestId("approvals-hit");
  await expect(hit).toContainText(CFT_01.title);
  await expect(hit).toContainText(CFT_01.url);
  await expect(hit.locator("a")).toHaveCount(0);
  await expect(hit).toContainText(CFT_01.snippet);
  await expect(hit).toContainText(GLOSSARY.textMatch.en);
  await expect(hit).toContainText(CFT_01.similarity.toFixed(2));
  await expect(hit).toContainText(textMatchLine(CFT_01.similarity).en);
  await expect(hit).toContainText(CFT_01.claim.en);
  await expect(hit).toContainText(UI.reporterDraft.en);
  await expect(hit).toContainText(FUP_02.subject.en);
  await expect(hit).toContainText(UI.fairness.en);
  await expect(hit.getByTestId("approvals-hit-unverified")).toHaveText(LABELS.L20.en);
  await expect(page.getByTestId("approvals-detail")).toContainText(GLOSSARY.proposedByCindy.en);
  watch.expectClean();
});

test("Acceptance 10 (English only): a listing's detail shows the maker's own English draft, each check's result, and no translated version", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  const draft = listingDraft();
  // Before the draft arrives, the detail says what it waits for.
  await seed(page, [{ type: "approval.requested", payload: { approvalId: "apr_04" } }]);
  await expect(page.getByTestId("approvals-detail")).toContainText(KIND_WAITING.listing_publish.en);
  await seed(page, [{ type: "listing.drafted", key: "b14-swarm", payload: draft }]);

  const listing = page.getByTestId("approvals-detail").getByTestId("approvals-listing");
  // lst_01's maker wrote in English: her own version shows, the Lister's translation doesn't.
  expect(LST_01.lang).toBe("en");
  await expect(listing).toContainText(draft.title.en);
  await expect(listing).toContainText(draft.summary.en);
  await expect(listing).not.toContainText(draft.title.zh);
  await expect(listing).not.toContainText(draft.summary.zh);
  await expect(listing).not.toContainText(LABELS.L27.en);
  await expect(listing.locator('[data-testid^="approvals-translated-"]')).toHaveCount(0);
  for (const c of draft.checks) {
    await expect(listing).toContainText(c.note.en);
    await expect(listing.locator(`[data-check="${c.checkId}"]`)).toContainText(c.ok ? UI.checkPassed.en : UI.checkReview.en);
    await expect(listing.locator(`[data-check="${c.checkId}"]`)).toContainText(CHECK_KIND[c.kind].en);
  }
  watch.expectClean();
});

test("Acceptance 10: a milestone release shows the milestone and its share, and reads paid after wip.milestone_paid", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  const wip = getById<WorkInProgress>(APR_05.subjectIds[0])!;
  const mls = wip.milestones.find((m) => APR_05.subjectIds.includes(m.milestoneId))!;
  await seed(page, [{ type: "approval.requested", payload: { approvalId: "apr_05" } }]);

  const detail = page.getByTestId("approvals-detail");
  const milestone = detail.getByTestId("approvals-milestone");
  await expect(milestone).toContainText(mls.label.en);
  await expect(milestone).toContainText(wip.title.en);
  await expect(milestone).toContainText(getById<Person>(wip.makerId)!.name.en);
  await expect(milestone).toContainText(formatCents(APR_05.amountCents!));
  await expect(milestone).not.toContainText(GLOSSARY.paid.en);

  await seed(page, [{ type: "wip.milestone_paid", payload: { wipId: wip.id, milestoneId: mls.milestoneId, amountCents: APR_05.amountCents!, date: "2026-10-02" } }]);
  await expect(milestone).toContainText(GLOSSARY.paid.en);
  watch.expectClean();
});

test("Acceptance 11: an approval that isn't in the mock shows the draft its inline object names", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  const draft = { ...listingDraft(), listingId: "lst_user_1" };
  const inline: InlineApproval = {
    kind: "listing_publish",
    subjectIds: ["lst_user_1"],
    overLimit: false,
    proposedBy: "cindy",
    summary: { en: "Publish the new listing from your notes.", zh: "发布根据您的笔记起草的新作品。" },
    decisionDate: "2026-10-03",
  };
  await seed(page, [
    { type: "listing.requested", payload: { listingId: "lst_user_1", makerId: draft.makerId, notes: "My notes for the new weaving.", lang: "en" } },
    { type: "listing.drafted", key: "b14-swarm", payload: draft },
    { type: "approval.requested", key: "b08-approvals", payload: { approvalId: "apr_user_1", approval: inline } },
  ]);
  const detail = page.getByTestId("approvals-detail");
  await expect(detail).toContainText(inline.summary.en);
  const listing = detail.getByTestId("approvals-listing");
  await expect(listing).toContainText(draft.title.en);
  await expect(listing).toContainText(draft.summary.en);
  await expect(listing).not.toContainText(draft.title.zh);
  await expect(listing.locator('[data-testid^="approvals-translated-"]')).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 12: a support action shows the thread's latest reply and the escalation reason", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await pause(page);
  const reply = { en: "I've passed this to the co-op. A person will reply about the damaged weaving.", zh: "我已转交合作社，会有人就损坏的编织品回复您。" };
  const reason = { en: "The buyer asks for a refund for a damaged piece. Money moves only with a person.", zh: "买家要求为损坏的作品退款。涉及资金必须由人处理。" };
  const inline: InlineApproval = {
    kind: "support_action",
    subjectIds: ["thr_user_1"],
    amountCents: getById<MakerPayout>("mpo_01")!.heldCents,
    overLimit: false,
    proposedBy: "cindy",
    summary: { en: "Refund request for a damaged piece.", zh: "损坏作品的退款请求。" },
    decisionDate: "2026-10-01",
  };
  await seed(page, [
    { type: "support.asked", payload: { threadId: "thr_user_1", side: "buyer", text: "It arrived damaged.", lang: "en", contextIds: ["ord_001"] } },
    { type: "support.answered", key: "b14-swarm", payload: { threadId: "thr_user_1", runId: "run_user_1", agentId: "writer", reply, refIds: [] } },
    { type: "support.escalated", key: "b14-swarm", payload: { threadId: "thr_user_1", runId: "run_user_1", reason, approvalId: "apr_user_2" } },
    { type: "approval.requested", key: "b08-approvals", payload: { approvalId: "apr_user_2", approval: inline } },
  ]);
  await page.getByTestId("approvals-item-apr_user_2").click();
  const detail = page.getByTestId("approvals-detail");
  await expect(detail).toContainText(KIND_TITLE.support_action.en);
  await expect(detail).toContainText(reply.en);
  await expect(detail).toContainText(reason.en);
  await expect(detail).toContainText(formatCents(inline.amountCents!));
  await expect(detail).toContainText(GLOSSARY.proposedByCindy.en);
  watch.expectClean();
});

test("Acceptance 13 (English only): the detail's labels are English, none Chinese, and the follow-up body is the payload's English", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, 300);
  const detail = page.getByTestId("approvals-detail");
  await expect(detail.locator("article").first()).toHaveAttribute("lang", "en");
  await expect(detail).toContainText(KIND_TITLE.follow_up.en);
  await expect(detail).toContainText(GLOSSARY.followUp.en);
  await expect(detail).toContainText(UI.to.en);
  await expect(detail).toContainText(UI.draftInEnglish.en);
  await expect(detail).toContainText(GLOSSARY.proposedByCindy.en);
  for (const zh of [KIND_TITLE.follow_up.zh, GLOSSARY.followUp.zh, UI.to.zh, UI.draftInEnglish.zh, GLOSSARY.proposedByCindy.zh]) await expect(detail).not.toContainText(zh);
  await detail.getByRole("button", { name: UI.readDraft.en }).click();
  const body = await detail.locator("p[lang=en]").first().textContent();
  expect(body).toBe((await draftFor(page, "apr_01"))!.body!.en);
  watch.expectClean();
});
