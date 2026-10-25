// F-communities T3: a project's page and funding it. Acceptance 5 and the Shop side of 6. The tour's
// ctb_01 comes through tourEvent() in communities-lib.ts: a seek once the timeline holds it, and
// until then figure 13's demoContribution from src/mock/. Expected values come from src/mock/.
import { expect, test } from "@playwright/test";
import { demoContribution, projects, usd } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { communitiesState, L7, loggedEvents, openPage, raisedOn, tourContribution } from "./communities-lib";

const prj = projects.find((p) => p.id === demoContribution.projectId)!;

test("5: L7 shows before any click, and funding $10.00 emits the person's project.funded and raises the progress", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, `/shop/projects/${prj.id}`);
  const note = page.getByTestId(`communities-fund-note-${prj.id}`);
  const button = page.getByTestId(`project-fund-${prj.id}`);
  await expect(button).toBeVisible();
  await expect(note).toHaveText(L7.en);
  await expect(note).toBeVisible();
  // Beside the button: on the same row, to its right.
  const b = (await button.boundingBox())!;
  const n = (await note.boundingBox())!;
  expect(n.x).toBeGreaterThanOrEqual(b.x + b.width - 1);
  expect(Math.abs(n.y + n.height / 2 - (b.y + b.height / 2))).toBeLessThan(b.height);

  await expect(page.getByTestId(`communities-amount-${prj.addOnCents}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("communities-thanks")).toHaveCount(0);
  expect(await raisedOn(page, prj.id)).toBe(prj.raisedCents);
  await expect(page.getByTestId(`project-progress-${prj.id}`)).toContainText(usd(prj.raisedCents));

  await page.getByTestId("communities-amount-1000").click();
  await expect(page.getByTestId("communities-amount-1000")).toHaveAttribute("aria-pressed", "true");
  await button.click();

  await expect.poll(async () => (await communitiesState(page)).projects.contributions.ctb_user_1?.amountCents).toBe(1000);
  const { projects: stored } = await communitiesState(page);
  const c = stored.contributions.ctb_user_1;
  expect(c).toMatchObject({ contributionId: "ctb_user_1", projectId: prj.id, amountCents: 1000, buyerId: "buy_01" });
  expect(c.orderId).toBeUndefined();
  const logged = await loggedEvents(page, "project.funded");
  expect(logged).toHaveLength(1);
  expect(logged[0].source).toBe("user");

  await expect.poll(() => raisedOn(page, prj.id)).toBe(prj.raisedCents + 1000);
  await expect(page.getByTestId(`project-progress-${prj.id}`)).toContainText(usd(prj.raisedCents + 1000));
  await expect(page.getByTestId("communities-thanks")).toBeVisible();
  await expect(page.getByTestId("communities-thanks")).toContainText(usd(1000));
  watch.expectClean();
});

test("a second contribution takes the next ctb_user_ number and adds up from the store", async ({ page }) => {
  await openPage(page, `/shop/projects/${prj.id}`);
  const button = page.getByTestId(`project-fund-${prj.id}`);
  await button.click();
  await page.getByTestId("communities-amount-2500").click();
  await button.click();
  await expect.poll(async () => Object.keys((await communitiesState(page)).projects.contributions).toSorted()).toEqual(["ctb_user_1", "ctb_user_2"]);
  const { projects: stored } = await communitiesState(page);
  expect(stored.contributions.ctb_user_1.amountCents).toBe(prj.addOnCents);
  expect(stored.contributions.ctb_user_2.amountCents).toBe(2500);
  await expect.poll(() => raisedOn(page, prj.id)).toBe(prj.raisedCents + prj.addOnCents + 2500);
});

test("6: the tour's ctb_01 counts once in the progress, even after a second seek to the same event", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, `/shop/projects/${prj.id}`);
  await tourContribution(page);
  await expect.poll(() => raisedOn(page, prj.id)).toBe(prj.raisedCents + demoContribution.amountCents);
  await tourContribution(page);
  // The second reach replays the same contribution: the store keeps one, and the progress stays put.
  await expect.poll(async () => Object.keys((await communitiesState(page)).projects.contributions)).toEqual([demoContribution.contributionId]);
  expect(await raisedOn(page, prj.id)).toBe(prj.raisedCents + demoContribution.amountCents);
  await expect(page.getByTestId(`project-progress-${prj.id}`)).toContainText(usd(prj.raisedCents + demoContribution.amountCents));
  watch.expectClean();
});
