// F-communities T6: the projects route and the whole walk. Acceptance 4 (the list), the projects
// pages' part of 10 (the Simulated badge) and 11 (the project text and L7 in English, the site being
// English only), and the flow: home, to a community, to its project, funded. Expected values come
// from src/mock/.
import { expect, test } from "@playwright/test";
import { communities, projects, usd, worksInProgress } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { communitiesState, expectNoChinese, L7, openPage, raisedOn, slot } from "./communities-lib";

test("the walk: home, to the co-op's page, to its project, funded with the add-on amount", async ({ page }) => {
  const watch = watchPage(page);
  const dine = communities[0];
  const prj = projects.find((p) => p.id === dine.projectIds[0])!;
  await openPage(page, "/shop");
  await page.getByTestId(`community-card-${dine.id}`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/community/${dine.id}$`));
  await expect(page.getByTestId("community-page")).toBeVisible();
  await page.getByTestId(`project-card-${prj.id}`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/projects/${prj.id}$`));
  await expect(page.getByTestId(`communities-fund-note-${prj.id}`)).toHaveText(L7.en);
  await page.getByTestId(`project-fund-${prj.id}`).click();
  await expect.poll(() => raisedOn(page, prj.id)).toBe(prj.raisedCents + prj.addOnCents);
  await expect(page.getByTestId("communities-thanks")).toBeVisible();
  const { projects: stored } = await communitiesState(page);
  expect(Object.values(stored.contributions).map((c) => [c.contributionId, c.projectId, c.amountCents])).toEqual([["ctb_user_1", prj.id, prj.addOnCents]]);
  watch.expectClean();
});

test("4: the list shows every project card with raised against goal, and every work in progress", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/projects");
  const list = page.getByTestId("communities-list");
  await expect(list).toBeVisible();
  const cards = list.locator('[data-testid^="project-card-"]');
  const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(projects.map((p) => `project-card-${p.id}`));
  for (const p of projects) {
    const progress = list.getByTestId(`project-progress-${p.id}`);
    await expect(progress).toHaveAttribute("data-raised", String(p.raisedCents));
    await expect(progress).toHaveAttribute("data-goal", String(p.goalCents));
    await expect(progress).toContainText(usd(p.raisedCents));
    await expect(progress).toContainText(usd(p.goalCents));
  }
  for (const w of worksInProgress) {
    await expect(list).toContainText(w.title.en);
    for (const m of w.milestones) await expect(list.getByTestId(`wip-milestone-${m.milestoneId}`)).toHaveAttribute("data-status", m.status);
  }
  watch.expectClean();
});

test("a project card on the list opens its project page", async ({ page }) => {
  await openPage(page, "/shop/projects");
  const last = projects[projects.length - 1];
  await page.getByTestId(`project-card-${last.id}`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/projects/${last.id}$`));
  await expect(page.getByTestId(`project-fund-${last.id}`)).toBeVisible();
});

test("10: the projects pages show the Simulated badge in scripted mode", async ({ page }) => {
  for (const path of ["/shop/projects", `/shop/projects/${projects[0].id}`, `/shop/projects/${worksInProgress[0].id}`]) {
    await openPage(page, path);
    await expect(slot(page, "shop.projects.main").getByTestId("simulated-badge")).toBeVisible();
  }
});

test("11: the project text, its updates and L7 render in English with no Chinese character, and amounts are dollars", async ({ page }) => {
  const prj = projects[0];
  await openPage(page, `/shop/projects/${prj.id}`);
  const main = slot(page, "shop.projects.main");
  const card = page.getByTestId(`project-card-${prj.id}`);
  await expect(card).toContainText(prj.title.en);
  await expect(card).toContainText(prj.summary.en);
  await expect(page.getByTestId(`communities-fund-note-${prj.id}`)).toHaveText(L7.en);
  for (const u of prj.updates) await expect(main).toContainText(u.text.en);
  await expectNoChinese(main);
  await expect(page.getByTestId(`project-progress-${prj.id}`)).toContainText(usd(prj.raisedCents));
  await expect(page.getByTestId("communities-amount-1000")).toContainText(usd(1000));
});

test("an unknown project ID shows a short note and no slot error", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/projects/prj_99");
  await expect(slot(page, "shop.projects.main")).toHaveAttribute("data-slot-state", "filled");
  await expect(page.getByTestId("communities-list")).toHaveCount(0);
  await expect(page.locator('[data-testid^="slot-error-"]')).toHaveCount(0);
  watch.expectClean();
});
