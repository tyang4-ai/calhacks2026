// F-communities T1: the communities strip on Shop home. Acceptance 1, plus the strip's parts of
// 10 (no Simulated badge) and 11 (the kind label in English, the site being English only). Expected
// values come from src/mock/.
import { expect, test } from "@playwright/test";
import { communities } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { expectNoChinese, openPage, slot, WORDS } from "./communities-lib";

const ORDER = communities.map((c) => c.id);

test("1: the strip shows the four community cards in community order, each with its kind label and the Demo data badge", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop");
  const strip = slot(page, "shop.home.communities").getByTestId("communities-strip");
  await expect(strip).toBeVisible();
  const cards = strip.locator('[data-testid^="community-card-"]');
  await expect(cards).toHaveCount(ORDER.length);
  const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(ORDER.map((id) => `community-card-${id}`));
  for (const c of communities) {
    const card = strip.getByTestId(`community-card-${c.id}`);
    await expect(card).toContainText(c.name.en);
    await expect(card).toContainText(c.people.en);
    await expect(card).toContainText(c.place.en);
    await expect(card).toContainText(c.craft.en);
    await expect(card.locator('[data-role="kind"]')).toHaveText(WORDS.nativeAmerican.en);
    const badge = card.locator('[data-variant="demo"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(WORDS.demoData.en);
  }
  watch.expectClean();
});

test("the four cards fit the 1440 px page in one row", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page, "/shop");
  const frame = await page.getByTestId("frame-buyer").boundingBox();
  const boxes = [];
  for (const id of ORDER) boxes.push(await page.getByTestId(`community-card-${id}`).boundingBox());
  expect(frame).not.toBeNull();
  for (const b of boxes) {
    expect(b).not.toBeNull();
    expect(Math.abs(b!.y - boxes[0]!.y)).toBeLessThan(1);
    expect(b!.x).toBeGreaterThanOrEqual(frame!.x);
    expect(b!.x + b!.width).toBeLessThanOrEqual(frame!.x + frame!.width + 1);
  }
  for (let i = 1; i < boxes.length; i += 1) expect(boxes[i]!.x).toBeGreaterThan(boxes[i - 1]!.x + boxes[i - 1]!.width - 1);
});

test("10: the strip declares no source keys, so it shows no Simulated badge", async ({ page }) => {
  await openPage(page, "/shop");
  const strip = slot(page, "shop.home.communities");
  await expect(strip.getByTestId("communities-strip")).toBeVisible();
  await expect(strip.getByTestId("simulated-badge")).toHaveCount(0);
});

test("11: the cards render in English with no Chinese character, and the kind label reads Native American", async ({ page }) => {
  await openPage(page, "/shop");
  const strip = slot(page, "shop.home.communities").getByTestId("communities-strip");
  for (const c of communities) {
    const card = strip.getByTestId(`community-card-${c.id}`);
    await expect(card).toContainText(c.name.en);
    await expect(card).toContainText(c.craft.en);
    await expect(card.locator('[data-role="kind"]')).toHaveText(WORDS.nativeAmerican.en);
    await expectNoChinese(card);
  }
});

test("a card opens its community's page", async ({ page }) => {
  await openPage(page, "/shop");
  const last = ORDER[ORDER.length - 1];
  await page.getByTestId(`community-card-${last}`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/community/${last}$`));
  await expect(page.getByTestId("community-page")).toBeVisible();
});
