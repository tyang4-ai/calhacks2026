// F-storefront T4: the editor on Sell › Storefront (acceptance 5 and 6, and the layout switch).
// Editing changes the working copy in component state only: nothing is emitted to the store.
// Expected values come from src/mock/.
import { expect, test } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import { STO_01, VIEWPORT, blockOf, editorBlockIds, logCount, loggedEvents, openBuilder, renderedBlockIds, tokenColor } from "./storefront-lib";

test.use({ viewport: VIEWPORT });

const ids = STO_01.blocks.map((b) => b.blockId);
const hero = blockOf(STO_01.blocks, "hero");

test("5: moving the second block up and editing the hero's tagline show at once in the rows and the preview, and emit nothing", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const preview = page.getByTestId("storefront-preview");
  expect(await editorBlockIds(page)).toEqual(ids);
  expect(await renderedBlockIds(preview)).toEqual(ids);
  const before = await logCount(page);

  // The second block moves up.
  await page.getByTestId(`storefront-block-${ids[1]}-up`).click();
  const moved = [ids[1], ids[0], ...ids.slice(2)];
  await expect.poll(() => editorBlockIds(page)).toEqual(moved);
  await expect.poll(() => renderedBlockIds(preview)).toEqual(moved);

  // The hero's tagline, edited in its row.
  const tagline = `${String(hero.props.tagline)}, edited in the builder`;
  await page.getByTestId(`storefront-block-${hero.blockId}-edit`).click();
  const field = page.getByTestId(`storefront-block-${hero.blockId}`).locator('[data-prop="tagline"]');
  await field.fill(tagline);
  await expect(preview.getByTestId(`store-block-${hero.blockId}`)).toContainText(tagline);
  await expect(page.getByTestId(`storefront-block-${hero.blockId}`)).toContainText(tagline);

  // Nothing new reached the store.
  expect(await logCount(page)).toBe(before);
  expect(await loggedEvents(page, "storefront.published")).toEqual([]);
  await expect(page.getByTestId("storefront-status")).toHaveAttribute("data-status", "draft");
  watch.expectClean();
});

test("6: a different accent puts that token's CSS variable on the preview", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const accent = page.getByTestId("storefront-accent");
  await expect(accent).toHaveAttribute("data-value", STO_01.theme.accent);
  const heroInPreview = page.getByTestId("storefront-preview").getByTestId(`store-block-${hero.blockId}`);
  expect(await heroInPreview.evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe(await tokenColor(page, STO_01.theme.accent));

  const next = ["jade", "amber", "ink", "seal"].find((a) => a !== STO_01.theme.accent)!;
  await accent.locator(`[data-accent="${next}"]`).click();
  await expect(accent).toHaveAttribute("data-value", next);
  await expect(page.getByTestId("storefront-preview").locator("[data-accent]")).toHaveAttribute("data-accent", next);
  expect(await heroInPreview.evaluate((el) => (el as HTMLElement).style.borderLeftColor)).toBe(`var(--c-color-${next})`);
  expect(await heroInPreview.evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe(await tokenColor(page, next));
  watch.expectClean();
});

test("the layout switch puts the pieces before the story and back, in the rows and the preview", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const layout = page.getByTestId("storefront-layout");
  await expect(layout).toHaveAttribute("data-value", STO_01.theme.layout);
  const story = blockOf(STO_01.blocks, "story").blockId;
  const pieces = blockOf(STO_01.blocks, "pieces").blockId;
  const other = STO_01.theme.layout === "story_first" ? "grid_first" : "story_first";
  await layout.locator(`[data-layout="${other}"]`).click();
  await expect(layout).toHaveAttribute("data-value", other);
  const order = await renderedBlockIds(page.getByTestId("storefront-preview"));
  expect(order.indexOf(pieces) < order.indexOf(story)).toBe(other === "grid_first");
  expect(await editorBlockIds(page)).toEqual(order);
  await layout.locator(`[data-layout="${STO_01.theme.layout}"]`).click();
  await expect.poll(() => renderedBlockIds(page.getByTestId("storefront-preview"))).toEqual(ids);
  watch.expectClean();
});
