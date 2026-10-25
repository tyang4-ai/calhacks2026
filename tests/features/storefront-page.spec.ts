// F-storefront T3: the public page at /store/:slug (acceptance 1, 2 and 3, d16-store's IDs).
// Expected values come from src/mock/. Events the tour doesn't carry yet are seeded through
// window.__cindia.emit after any seek.
import { expect, test } from "@playwright/test";
import type { Community } from "../../src/core/types";
import { getById } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { FOOTER_LINE_EN, L13, L8, STO_01, VIEWPORT, blockOf, openStore, publishedSeed, renderedBlockIds, seed, storefrontState } from "./storefront-lib";

test.use({ viewport: VIEWPORT });

const coop = getById<Community>(STO_01.communityId)!;
const pieces = blockOf(STO_01.blocks, "pieces");
const pieceIds = pieces.props.pieceIds as string[];

test("1: /store/dine-weavers shows sto_01's blocks, the story's L8, linked pieces and the footer, inside frame-store", async ({ page }) => {
  const watch = watchPage(page);
  await openStore(page, STO_01.slug);
  const frame = page.getByTestId("frame-store");
  const store = frame.getByTestId("store-page");
  await expect(store).toBeVisible();

  // The blocks in order, each a store-block-<blockId>, with the co-op's name in the hero.
  expect(await renderedBlockIds(store)).toEqual(STO_01.blocks.map((b) => b.blockId));
  for (const b of STO_01.blocks) await expect(store.getByTestId(`store-block-${b.blockId}`)).toHaveAttribute("data-kind", b.kind);
  const hero = blockOf(STO_01.blocks, "hero");
  await expect(store.getByTestId(`store-block-${hero.blockId}`)).toContainText(coop.name.en);
  await expect(store.getByTestId(`store-block-${hero.blockId}`)).toContainText(String(hero.props.tagline));

  // The story: the co-op's about text, the Demo data badge and L8.
  const story = store.getByTestId(`store-block-${blockOf(STO_01.blocks, "story").blockId}`);
  await expect(story).toContainText(coop.about.en);
  await expect(story.locator('[data-variant="demo"]')).toHaveCount(1);
  await expect(story.getByTestId("store-story-note")).toHaveText(L8.en);

  // The pieces block: one card per piece, each linking to its Shop page.
  const grid = store.getByTestId(`store-block-${pieces.blockId}`);
  await expect(grid.locator("[data-piece-id]")).toHaveCount(pieceIds.length);
  const links = await grid.locator("[data-piece-id]").evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-piece-id"), href: e.querySelector("a")?.getAttribute("href") })));
  expect(links).toEqual(pieceIds.map((id) => ({ id, href: `/shop/piece/${id}` })));

  // The footer: the preview line, then L13.
  const footer = store.getByTestId("store-footer");
  await expect(footer.locator('[data-role="preview-line"]')).toHaveText(FOOTER_LINE_EN);
  await expect(footer.locator('[data-role="l13"]')).toHaveText(L13.en);
  const text = (await footer.textContent()) ?? "";
  expect(text.indexOf(FOOTER_LINE_EN)).toBeLessThan(text.indexOf(L13.en));

  // No draft note, and everything sits inside frame-store.
  await expect(page.getByTestId("store-draft-note")).toHaveCount(0);
  await expect(frame.getByTestId("store-footer")).toHaveCount(1);
  await expect(page.getByTestId("store-page")).toHaveCount(1);
  watch.expectClean();
});

test("2: a piece card opens that piece's Shop page without resetting the store", async ({ page }) => {
  const watch = watchPage(page);
  await openStore(page, STO_01.slug);
  // A marker in the store and on the window: both survive only if the page didn't reload.
  await seed(page, [publishedSeed(STO_01, STO_01.blocks)]);
  await page.evaluate(() => ((window as unknown as { storefrontMarker: number }).storefrontMarker = 1));
  const epoch = await page.evaluate(() => window.__cindia!.player.epoch());
  const first = pieceIds[0];
  await page.getByTestId(`store-block-${pieces.blockId}`).locator(`[data-piece-id="${first}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/piece/${first}$`));
  await expect(page.getByTestId("frame-buyer")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { storefrontMarker?: number }).storefrontMarker)).toBe(1);
  expect(await page.evaluate(() => window.__cindia!.player.epoch())).toBe(epoch);
  expect((await storefrontState(page)).storefront.published[STO_01.id]?.slug).toBe(STO_01.slug);
  watch.expectClean();
});

test("3: an unknown slug shows store-missing with a link back to /shop", async ({ page }) => {
  const watch = watchPage(page);
  await openStore(page, "no-such-slug");
  const missing = page.getByTestId("frame-store").getByTestId("store-missing");
  await expect(missing).toBeVisible();
  await expect(page.getByTestId("store-page")).toHaveCount(0);
  const link = missing.locator("a");
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute("href", "/shop");
  await link.click();
  await expect(page).toHaveURL(/\/shop$/);
  watch.expectClean();
});
