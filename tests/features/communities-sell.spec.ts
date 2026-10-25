// F-communities T5: Sell › Projects. Acceptance 8 and 9 (releasing mls_02, Cindy's proposal apr_05,
// the owner's grant and the payment), the Sell side of 6 (the tour's ctb_01 in the contributions)
// and the Sell side of 10 (the Simulated badge). Scripted answers count as arrived when they show
// within the default expect timeout. Expected values come from src/mock/.
import { expect, test } from "@playwright/test";
import { apr_05, demoContribution, projects, usd, worksInProgress } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { communitiesState, grantApr05, loggedEvents, openPage, raisedOn, setLang, slot, tourContribution, WORDS } from "./communities-lib";

const wip = worksInProgress.find((w) => w.id === apr_05.subjectIds[0])!;
const [first, second, third] = wip.milestones;
const prj = projects.find((p) => p.id === demoContribution.projectId)!;

test("8: releasing mls_02 emits the person's wip.milestone_reached, hides every release button, then shows apr_05 waiting and Cindy's proposal", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/sell/projects");
  const sell = page.getByTestId("communities-sell");
  await expect(sell).toBeVisible();
  await expect(page.getByTestId(`wip-milestone-${first.milestoneId}`)).toHaveAttribute("data-status", "paid");
  await expect(sell.locator('[data-testid^="wip-release-"]')).toHaveCount(1);
  await expect(page.getByTestId(`wip-release-${second.milestoneId}`)).toBeVisible();

  await page.getByTestId(`wip-release-${second.milestoneId}`).click();
  const logged = await loggedEvents(page, "wip.milestone_reached");
  expect(logged).toHaveLength(1);
  expect(logged[0].source).toBe("user");
  const state = await communitiesState(page);
  expect(state.wip.milestones[second.milestoneId]).toMatchObject({ wipId: wip.id, status: "reached", date: apr_05.decisionDate });
  expect(apr_05.decisionDate).toBe("2026-10-01");
  await expect(sell.locator('[data-testid^="wip-release-"]')).toHaveCount(0);
  await expect(page.getByTestId(`wip-milestone-${second.milestoneId}`)).toHaveAttribute("data-status", "reached");

  // Cindy's scripted answer: an agent.acted proposal and approval.requested apr_05.
  await expect.poll(async () => (await communitiesState(page)).approvals.items[apr_05.id]?.requested ?? false).toBe(true);
  await expect(page.getByTestId(`wip-milestone-${second.milestoneId}`)).toContainText(WORDS.approval.en);
  const after = await communitiesState(page);
  const proposal = after.agent.actIds.map((id) => after.agent.acts[id]).find((a) => a.refId === second.milestoneId && a.kind === "propose");
  expect(proposal).toBeDefined();
  await expect(page.getByTestId("communities-cindy-note")).toContainText(proposal!.text.en);
  await expect(sell.locator('[data-testid^="wip-release-"]')).toHaveCount(0);
  watch.expectClean();
});

test("9 (Sell): once the owner grants apr_05 and the payment arrives, mls_02 shows paid with its amount and the button moves to mls_03", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/sell/projects");
  await page.getByTestId(`wip-release-${second.milestoneId}`).click();
  await expect.poll(async () => (await communitiesState(page)).approvals.items[apr_05.id]?.requested ?? false).toBe(true);

  await grantApr05(page);
  const row = page.getByTestId(`wip-milestone-${second.milestoneId}`);
  await expect(row).toHaveAttribute("data-status", "paid");
  await expect(row).toContainText(WORDS.paid.en);
  await expect(row).toContainText(usd(apr_05.amountCents!));
  await expect(row).not.toContainText(WORDS.approval.en);
  const paid = (await communitiesState(page)).wip.milestones[second.milestoneId];
  expect(paid).toMatchObject({ wipId: wip.id, status: "paid", amountCents: apr_05.amountCents });
  await expect(page.getByTestId(`wip-release-${third.milestoneId}`)).toBeVisible();
  await expect(page.getByTestId("communities-sell").locator('[data-testid^="wip-release-"]')).toHaveCount(1);
  watch.expectClean();
});

test("6 (Sell): the contributions list ctb_01 at $5.00 with ord_001, once, even after a second seek", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/sell/projects");
  const list = page.getByTestId("communities-contributions");
  await tourContribution(page);
  await expect(list).toContainText(demoContribution.contributionId);
  await expect(list).toContainText(usd(demoContribution.amountCents));
  await expect(list).toContainText(demoContribution.orderId!);
  await tourContribution(page);
  await expect(list.locator("[data-contribution-id]")).toHaveCount(1);
  await expect(list).toContainText(demoContribution.contributionId);
  await expect.poll(() => raisedOn(page, prj.id, page.getByTestId("communities-sell"))).toBe(prj.raisedCents + demoContribution.amountCents);
  watch.expectClean();
});

test("10 (Sell): Sell › Projects shows the Simulated badge in scripted mode", async ({ page }) => {
  await openPage(page, "/sell/projects");
  const s = slot(page, "studio.projects.main");
  await expect(s.getByTestId("communities-sell")).toBeVisible();
  await expect(s.getByTestId("communities-sell").getByTestId("simulated-badge")).toBeVisible();
});

test("11 (Sell): in Chinese the milestone labels and the waiting note show their Chinese text, and amounts stay dollars", async ({ page }) => {
  await openPage(page, "/sell/projects");
  await setLang(page, "zh");
  for (const m of wip.milestones) await expect(page.getByTestId(`wip-milestone-${m.milestoneId}`)).toContainText(m.label.zh);
  await page.getByTestId(`wip-release-${second.milestoneId}`).click();
  await expect(page.getByTestId(`wip-milestone-${second.milestoneId}`)).toContainText(WORDS.approval.zh);
  await expect(page.getByTestId(`project-progress-${prj.id}`)).toContainText("$");
});
