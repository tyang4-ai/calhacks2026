// F-storefront T6: the whole flow, the language (acceptance 11), and the layout at 1440 by 900.
// - The owner drafts with the Designer (scripted), uses the draft, edits its tagline, publishes and
//   opens /store/dine-weavers through the builder's link, which shows exactly what was published,
//   and a piece card there opens its Shop page.
// - English only (decisions.md, Oct 24 11:35 PM and 11:55 PM): there's no language toggle, so the
//   labels, L8 and L13 render in English with no Chinese, and the block text props, English strings
//   in the data, stay as written.
// - Nothing in the builder or on the four storefront pages is clipped, cut at an edge, under 14 px
//   or Chinese.
// Expected values come from src/mock/.
import { expect, test, type Page } from "@playwright/test";
import type { Community, StorefrontBlock } from "../../src/core/types";
import { getById, swarmRuns } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import {
  ALL_STOREFRONTS,
  DESIGNER_EN,
  FOOTER_LINE_EN,
  HAN,
  L13,
  L8,
  PREVIEW_NOTE_EN,
  PUBLISH_EN,
  STO_01,
  VIEWPORT,
  blockOf,
  clippedText,
  editorBlockIds,
  openBuilder,
  openStore,
  renderedBlockIds,
  storefrontState,
} from "./storefront-lib";

test.use({ viewport: VIEWPORT });

const run03 = swarmRuns.find((r) => r.trigger.kind === "storefront" && r.trigger.storefrontId === STO_01.id)!;
const coop = getById<Community>(STO_01.communityId)!;

async function draftAndUse(page: Page): Promise<StorefrontBlock[]> {
  await page.getByTestId("storefront-designer").click();
  await expect(page.getByTestId("storefront-designer-steps").locator("[data-step-id]")).toHaveCount(run03.steps.length);
  await page.getByTestId("storefront-use-draft").click();
  const drafted = (await storefrontState(page)).storefront.drafts[STO_01.id].blocks;
  await expect.poll(() => editorBlockIds(page)).toEqual(drafted.map((b) => b.blockId));
  return drafted;
}

test("the owner drafts with the Designer, edits, publishes, and the page shows exactly that", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const drafted = await draftAndUse(page);
  const hero = blockOf(drafted, "hero");
  const tagline = `${String(hero.props.tagline)}, checked by the owner`;
  await page.getByTestId(`storefront-block-${hero.blockId}-edit`).click();
  await page.getByTestId(`storefront-block-${hero.blockId}`).locator('[data-prop="tagline"]').fill(tagline);
  await expect(page.getByTestId("storefront-preview").getByTestId(`store-block-${hero.blockId}`)).toContainText(tagline);
  await page.getByTestId("storefront-publish").click();
  await expect(page.getByTestId("storefront-status")).toHaveAttribute("data-status", "published");

  await page.getByTestId("storefront-status").locator("a").click();
  await expect(page).toHaveURL(new RegExp(`/store/${STO_01.slug}$`));
  const store = page.getByTestId("frame-store").getByTestId("store-page");
  await expect(store).toBeVisible();
  expect(await renderedBlockIds(store)).toEqual(drafted.map((b) => b.blockId));
  await expect(store.getByTestId(`store-block-${hero.blockId}`)).toContainText(tagline);
  await expect(store.getByTestId(`store-block-${hero.blockId}`)).toContainText(coop.name.en);
  await expect(store.getByTestId("store-draft-note")).toHaveCount(0);

  const pieces = blockOf(drafted, "pieces");
  const first = (pieces.props.pieceIds as string[])[0];
  await store.getByTestId(`store-block-${pieces.blockId}`).locator(`[data-piece-id="${first}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/piece/${first}$`));
  expect((await storefrontState(page)).storefront.published[STO_01.id]?.blocks.length).toBe(drafted.length);
  watch.expectClean();
});

// English only (decisions.md, Oct 24 11:35 PM and 11:55 PM): acceptance 11 switched to Chinese and
// checked the labels turned Chinese. With no toggle, it checks the same labels, L8 and L13 render in
// English with no Chinese character, and the block text props stay as written.
test("11 (English only): with no language toggle, the labels, L8 and L13 are English with no Chinese, and the block text props stay as written", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  await expect(page.getByTestId("demo-lang-toggle")).toHaveCount(0);
  const hero = blockOf(STO_01.blocks, "hero");
  const publish = page.getByTestId("storefront-publish");
  await expect(publish).toHaveText(PUBLISH_EN);
  await expect(publish).not.toHaveText(HAN);
  const designer = page.getByTestId("storefront-designer");
  await expect(designer).toHaveText(DESIGNER_EN);
  await expect(designer).not.toHaveText(HAN);
  const note = page.getByTestId("storefront-preview-note");
  await expect(note).toHaveText(PREVIEW_NOTE_EN);
  await expect(note).not.toHaveText(HAN);
  const status = page.getByTestId("storefront-status");
  await expect(status).toHaveAttribute("data-status", "published");
  await expect(status).toContainText(/published \(preview\)/i);
  await expect(status).not.toHaveText(HAN);
  const heroRow = page.getByTestId("storefront-builder").getByTestId(`storefront-block-${hero.blockId}`);
  await expect(heroRow).toBeVisible();
  await expect(heroRow).not.toHaveText(HAN);
  const preview = page.getByTestId("storefront-preview");
  await expect(preview.getByTestId("store-story-note")).toHaveText(L8.en);
  await expect(preview.getByTestId(`store-block-${hero.blockId}`)).toContainText(String(hero.props.tagline));
  await expect(preview.getByTestId(`store-block-${hero.blockId}`)).toContainText(coop.name.en);
  await expect(preview.getByTestId(`store-block-${hero.blockId}`)).not.toHaveText(HAN);

  await page.getByTestId("storefront-status").locator("a").click();
  const store = page.getByTestId("store-page");
  await expect(store).toBeVisible();
  await expect(store.getByTestId("store-story-note")).toHaveText(L8.en);
  await expect(store.getByTestId("store-footer").locator('[data-role="l13"]')).toHaveText(L13.en);
  await expect(store.getByTestId("store-footer").locator('[data-role="preview-line"]')).toHaveText(FOOTER_LINE_EN);
  await expect(store.getByTestId("store-footer")).not.toHaveText(HAN);
  await expect(store.getByTestId(`store-block-${hero.blockId}`)).toContainText(String(hero.props.tagline));
  await expect(store.getByTestId(`store-block-${hero.blockId}`)).toContainText(coop.name.en);
  await expect(store.getByTestId(`store-block-${hero.blockId}`)).not.toHaveText(HAN);
  const story = blockOf(STO_01.blocks, "story");
  await expect(store.getByTestId(`store-block-${story.blockId}`)).toContainText(String(story.props.title));
  await expect(store.getByTestId(`store-block-${story.blockId}`)).toContainText(coop.about.en);
  await expect(store.getByTestId(`store-block-${story.blockId}`)).not.toHaveText(HAN);
  watch.expectClean();
});

// The layout checks ran once in English and once in Chinese. With no toggle the two runs would be the
// same page, so each runs once, in English, and also checks that no Chinese character shows.
test("nothing in the builder is clipped, under 14 px or Chinese at 1440 by 900", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  expect(await clippedText(page, "storefront-builder")).toEqual([]);
  await expect(page.getByTestId("storefront-builder")).not.toHaveText(HAN);
  // With the Designer's steps, the draft in use and the visit block's fields open.
  const drafted = await draftAndUse(page);
  const visit = blockOf(drafted, "visit");
  await page.getByTestId(`storefront-block-${visit.blockId}-edit`).click();
  expect(await clippedText(page, "storefront-builder")).toEqual([]);
  await expect(page.getByTestId("storefront-builder")).not.toHaveText(HAN);
  // The builder's panel fits the Sell frame: its box ends inside the frame.
  const fit = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="storefront-builder"]')!.getBoundingClientRect();
    const f = document.querySelector('[data-testid="frame-studio"]')!.getBoundingClientRect();
    return { right: b.right <= f.right + 1, bottom: b.bottom <= f.bottom + 1 };
  });
  expect(fit).toEqual({ right: true, bottom: true });
  watch.expectClean();
});

for (const s of ALL_STOREFRONTS) {
  test(`nothing on /store/${s.slug} is clipped, under 14 px or Chinese at 1440 by 900`, async ({ page }) => {
    const watch = watchPage(page);
    await openStore(page, s.slug);
    await expect(page.getByTestId("store-page")).toHaveAttribute("data-storefront-id", s.id);
    expect(await clippedText(page, "store-page"), s.slug).toEqual([]);
    await expect(page.getByTestId("store-page")).not.toHaveText(HAN);
    watch.expectClean();
  });
}
