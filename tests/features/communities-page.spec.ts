// F-communities T2: the community page. Acceptance 2 and 3, plus the page's parts of 10 (no
// Simulated badge) and 11 (the community text, L4, L8, L9 and the protocols in English, the site
// being English only). Expected values come from src/mock/; the labels are the glossary's, copied in
// communities-lib.ts.
import { expect, test } from "@playwright/test";
import type { Community, Person } from "../../src/core/types";
import { communities, getById, pieces, storefronts } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { expectNoChinese, L4, L8, L9_NOTE, L9_TITLE, openPage, slot, WORDS } from "./communities-lib";

function community(id: string): Community {
  const c = communities.find((x) => x.id === id);
  if (!c) throw new Error(`no ${id} in src/mock`);
  return c;
}

const ojibwe = community("com_ojibwe");
const dine = community("com_dine");

async function pieceIds(page: import("@playwright/test").Page): Promise<(string | null)[]> {
  return page
    .getByTestId("communities-pieces")
    .locator("[data-piece-id]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-id")));
}

test("2: clicking the Ojibwe card opens its page with the about note, verification, protocols, makers, pieces and storefront link", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop");
  await page.getByTestId(`community-card-${ojibwe.id}`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/community/${ojibwe.id}$`));

  const view = page.getByTestId("community-page");
  await expect(view).toBeVisible();
  await expect(view).toContainText(ojibwe.about.en);
  await expect(page.getByTestId("communities-about-note")).toHaveText(L8.en);

  const verification = page.getByTestId("community-verification");
  await expect(verification).toContainText(ojibwe.verification.by.en);
  await expect(verification).toContainText(ojibwe.verification.note.en);
  await expect(verification).toContainText(L4.en);

  const protocols = page.getByTestId("community-protocols");
  await expect(protocols.getByRole("heading")).toHaveText(L9_TITLE.en);
  await expect(page.getByTestId("communities-protocols-note")).toHaveText(L9_NOTE.en);
  for (const p of ojibwe.protocols) await expect(protocols).toContainText(p.en);

  const makers = page.getByTestId("communities-makers");
  const makerIds = await makers.locator('[data-testid^="communities-maker-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(makerIds).toEqual(ojibwe.makerIds.map((id) => `communities-maker-${id}`));
  for (const id of ojibwe.makerIds) await expect(page.getByTestId(`communities-maker-${id}`)).toContainText(getById<Person>(id)!.name.en);

  expect(await pieceIds(page)).toEqual(pieces.filter((p) => p.communityId === ojibwe.id).map((p) => p.id));

  const store = storefronts.find((s) => s.id === ojibwe.storefrontId)!;
  await expect(page.getByTestId("communities-storefront-link")).toHaveAttribute("href", `/store/${store.slug}`);
  watch.expectClean();
});

test("3: the co-op's page shows its name and people, its makers with Grace N., its twelve pieces and its verification note with L4", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, `/shop/community/${dine.id}`);
  const view = page.getByTestId("community-page");
  await expect(view).toContainText(dine.name.en);
  await expect(view).toContainText(dine.people.en);

  const makerIds = await page
    .getByTestId("communities-makers")
    .locator('[data-testid^="communities-maker-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(makerIds).toEqual(dine.makerIds.map((id) => `communities-maker-${id}`));
  const grace = getById<Person>("mkr_01")!;
  expect(dine.makerIds).toContain(grace.id);
  await expect(page.getByTestId(`communities-maker-${grace.id}`)).toContainText(grace.name.en);

  expect(await pieceIds(page)).toEqual(pieces.filter((p) => p.communityId === dine.id).map((p) => p.id));

  const verification = page.getByTestId("community-verification");
  expect(dine.verification.note.en.endsWith("No real check was done for this demo.")).toBe(true);
  await expect(verification).toContainText(dine.verification.note.en);
  await expect(verification.locator('[data-role="demo-note"]')).toHaveText(L4.en);
  const text = await view.innerText();
  expect(text).not.toContain("Indian American");
  watch.expectClean();
});

test("the page shows the kind label and the Demo data badge at the top, and the about text isn't set as a quote", async ({ page }) => {
  await openPage(page, `/shop/community/${dine.id}`);
  const view = page.getByTestId("community-page");
  await expect(view.locator('[data-role="kind"]').first()).toHaveText(WORDS.nativeAmerican.en);
  await expect(view.locator('[data-variant="demo"]').first()).toBeVisible();
  await expect(view.locator("blockquote, q")).toHaveCount(0);
});

test("a piece card opens its piece page, and the project card opens its project page", async ({ page }) => {
  await openPage(page, `/shop/community/${dine.id}`);
  const first = pieces.find((p) => p.communityId === dine.id)!;
  await page.getByTestId("communities-pieces").locator(`[data-piece-id="${first.id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/piece/${first.id}$`));

  await openPage(page, `/shop/community/${dine.id}`);
  const projectId = dine.projectIds[0];
  await page.getByTestId(`project-card-${projectId}`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/projects/${projectId}$`));
});

test("10: the community page declares no source keys, so it shows no Simulated badge", async ({ page }) => {
  await openPage(page, `/shop/community/${ojibwe.id}`);
  const s = slot(page, "shop.community.main");
  await expect(s.getByTestId("community-page")).toBeVisible();
  await expect(s.getByTestId("simulated-badge")).toHaveCount(0);
});

test("11: the community text, L4, L8, L9 and the protocols render in English with no Chinese character, with the kind label Native American", async ({ page }) => {
  await openPage(page, `/shop/community/${dine.id}`);
  const view = page.getByTestId("community-page");
  await expect(view).toContainText(dine.name.en);
  await expect(view).toContainText(dine.about.en);
  await expect(view.locator('[data-role="kind"]').first()).toHaveText(WORDS.nativeAmerican.en);
  await expect(page.getByTestId("communities-about-note")).toHaveText(L8.en);
  await expect(page.getByTestId("community-protocols").getByRole("heading")).toHaveText(L9_TITLE.en);
  await expect(page.getByTestId("communities-protocols-note")).toHaveText(L9_NOTE.en);
  for (const p of dine.protocols) await expect(page.getByTestId("community-protocols")).toContainText(p.en);
  const verification = page.getByTestId("community-verification");
  await expect(verification).toContainText(dine.verification.note.en);
  await expect(verification.locator('[data-role="demo-note"]')).toHaveText(L4.en);
  await expectNoChinese(view);
  // Amounts are dollars.
  await expect(page.getByTestId(`project-progress-${dine.projectIds[0]}`)).toContainText("$");
});

test("an unknown community shows a short note and no community page", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/community/com_unknown");
  await expect(page.getByTestId("community-page")).toHaveCount(0);
  await expect(page.locator('[data-slot="shop.community.main"]')).toHaveAttribute("data-slot-state", "filled");
  await expect(page.locator('[data-testid^="slot-error-"]')).toHaveCount(0);
  watch.expectClean();
});
