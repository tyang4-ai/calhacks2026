// F-storefront T5: the Designer's draft and publishing (acceptance 7, 8, 9 and 10).
// The Designer's scripted answer is the responder's run_03 re-keyed to run_user_<n> on thread sto_01;
// it counts as arrived when it shows within Playwright's default expect timeout (B1-27). The public
// page is opened through the builder's own link, so the store isn't reloaded. Expected values come
// from src/mock/.
import { expect, test, type Page } from "@playwright/test";
import { swarmRuns } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { PREVIEW_NOTE_EN, PUBLISH_EN, STO_01, VIEWPORT, blockOf, editorBlockIds, loggedEvents, openBuilder, openStore, renderedBlockIds, storefrontState } from "./storefront-lib";

test.use({ viewport: VIEWPORT });

const ids = STO_01.blocks.map((b) => b.blockId);
const hero = blockOf(STO_01.blocks, "hero");
const run03 = swarmRuns.find((r) => r.trigger.kind === "storefront" && r.trigger.storefrontId === STO_01.id)!;

/** Presses Draft with Designer and waits for the drafted blocks; returns their IDs. */
async function draftWithDesigner(page: Page): Promise<string[]> {
  await page.getByTestId("storefront-designer").click();
  const steps = page.getByTestId("storefront-designer-steps");
  await expect(steps.locator("[data-step-id]")).toHaveCount(run03.steps.length);
  await expect(page.getByTestId("storefront-use-draft")).toBeVisible();
  const state = await storefrontState(page);
  return state.storefront.drafts[STO_01.id].blocks.map((b) => b.blockId);
}

/** Opens the public page through storefront-status's link, a move inside the app. */
async function openPageFromBuilder(page: Page) {
  await page.getByTestId("storefront-status").locator("a").click();
  await expect(page).toHaveURL(new RegExp(`/store/${STO_01.slug}$`));
  await expect(page.getByTestId("store-page")).toBeVisible();
}

test("7: Draft with Designer requests sto_01 as the user, its steps arrive by thread, and only Use this draft changes the working copy", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const drafted = await draftWithDesigner(page);

  const requests = await loggedEvents(page, "storefront.requested");
  expect(requests.length).toBe(1);
  expect(requests[0].source).toBe("user");
  const state = await storefrontState(page);
  expect(state.storefront.requests[STO_01.id]).toBeTruthy();
  const runId = await page.getByTestId("storefront-designer-steps").getAttribute("data-run-id");
  expect(runId).toMatch(/^run_user_/);
  expect(state.swarm.runs[runId!].threadId).toBe(STO_01.id);
  expect(drafted.every((id) => id.startsWith("blk_user_"))).toBe(true);

  // The working copy hasn't changed.
  const preview = page.getByTestId("storefront-preview");
  expect(await editorBlockIds(page)).toEqual(ids);
  expect(await renderedBlockIds(preview)).toEqual(ids);

  await page.getByTestId("storefront-use-draft").click();
  await expect.poll(() => renderedBlockIds(preview)).toEqual(drafted);
  expect(await editorBlockIds(page)).toEqual(drafted);
  // Using the draft emits nothing.
  expect(await loggedEvents(page, "storefront.published")).toEqual([]);
  watch.expectClean();
});

test("8: editing the tagline and publishing puts the edited blocks in the store and on /store/dine-weavers", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const status = page.getByTestId("storefront-status");
  await expect(status).toHaveAttribute("data-status", "published");
  const tagline = `${String(hero.props.tagline)}, published from the builder`;
  await page.getByTestId(`storefront-block-${hero.blockId}-edit`).click();
  await page.getByTestId(`storefront-block-${hero.blockId}`).locator('[data-prop="tagline"]').fill(tagline);
  await expect(status).toHaveAttribute("data-status", "draft");

  const publish = page.getByTestId("storefront-publish");
  await expect(publish).toHaveText(PUBLISH_EN);
  await publish.click();
  await expect(status).toHaveAttribute("data-status", "published");
  const published = (await storefrontState(page)).storefront.published[STO_01.id];
  expect(published.slug).toBe(STO_01.slug);
  expect(published.blocks.map((b) => b.blockId)).toEqual(ids);
  expect(published.blocks.find((b) => b.blockId === hero.blockId)!.props.tagline).toBe(tagline);
  const logged = await loggedEvents(page, "storefront.published");
  expect(logged.map((e) => e.source)).toEqual(["user"]);

  await openPageFromBuilder(page);
  await expect(page.getByTestId("store-page").getByTestId(`store-block-${hero.blockId}`)).toContainText(tagline);
  await expect(page.getByTestId("store-page")).toHaveAttribute("data-from", "published");
  watch.expectClean();
});

test("9: a draft the owner didn't use never reaches the page; after Use this draft and a second publish, it does", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const drafted = await draftWithDesigner(page);

  await page.getByTestId("storefront-publish").click();
  await expect.poll(async () => (await storefrontState(page)).storefront.published[STO_01.id]?.blocks.map((b) => b.blockId)).toEqual(ids);

  await page.getByTestId("storefront-use-draft").click();
  await expect(page.getByTestId("storefront-status")).toHaveAttribute("data-status", "draft");
  await page.getByTestId("storefront-publish").click();
  await expect.poll(async () => (await storefrontState(page)).storefront.published[STO_01.id]?.blocks.map((b) => b.blockId)).toEqual(drafted);
  await expect(page.getByTestId("storefront-status")).toHaveAttribute("data-status", "published");

  await openPageFromBuilder(page);
  expect(await renderedBlockIds(page.getByTestId("store-page"))).toEqual(drafted);
  watch.expectClean();
});

test("9b: publishing without the draft shows the working copy on the page, not the draft", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const drafted = await draftWithDesigner(page);
  await page.getByTestId("storefront-publish").click();
  await expect(page.getByTestId("storefront-status")).toHaveAttribute("data-status", "published");
  await openPageFromBuilder(page);
  const shown = await renderedBlockIds(page.getByTestId("store-page"));
  expect(shown).toEqual(ids);
  for (const id of drafted) expect(shown).not.toContain(id);
  watch.expectClean();
});

test("a reset clears what was published, and the working copy starts over from the mock", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  await page.getByTestId(`storefront-block-${ids[1]}-up`).click();
  await page.getByTestId("storefront-publish").click();
  await expect.poll(async () => (await storefrontState(page)).storefront.published[STO_01.id]?.blocks.map((b) => b.blockId)).toEqual([ids[1], ids[0], ...ids.slice(2)]);

  await page.getByTestId("demo-reset").click();
  await expect.poll(async () => (await storefrontState(page)).storefront.published[STO_01.id] ?? null).toBeNull();
  await expect.poll(() => editorBlockIds(page)).toEqual(ids);
  expect(await renderedBlockIds(page.getByTestId("storefront-preview"))).toEqual(ids);
  await expect(page.getByTestId("storefront-status")).toHaveAttribute("data-status", "published");
  watch.expectClean();
});

test("10: the preview note always shows, the builder shows the Simulated badge, and the page shows the Demo data badge", async ({ page }) => {
  const watch = watchPage(page);
  await openBuilder(page);
  const builder = page.getByTestId("storefront-builder");
  await expect(page.getByTestId("storefront-preview-note")).toHaveText(PREVIEW_NOTE_EN);
  expect((await storefrontState(page)).sources["b14-swarm"]).toBe("scripted");
  await expect(builder.getByTestId("simulated-badge")).toBeVisible();
  await draftWithDesigner(page);
  await expect(page.getByTestId("storefront-preview-note")).toHaveText(PREVIEW_NOTE_EN);
  await page.getByTestId("storefront-publish").click();
  await expect(page.getByTestId("storefront-preview-note")).toHaveText(PREVIEW_NOTE_EN);

  await openStore(page, STO_01.slug);
  const store = page.getByTestId("store-page");
  await expect(store.locator('[data-variant="demo"]').first()).toBeVisible();
  await expect(store.getByTestId("simulated-badge")).toHaveCount(0);
  watch.expectClean();
});
