// F-storefront T2: the block renderer, one component per kind, on the public page.
// - hero: the community's name, place and tagline, with the theme's accent as its rule,
// - story: the title and the community's about text, never the block's body,
// - pieces: kit PieceCards whose verification line starts with L3, each a link to its Shop page,
// - process: the first listed piece's own steps and hours, never the block's body,
// - projects: raised against goal, the mock's raisedCents plus the store's addedCents,
// - visit: the region and "Visits by arrangement",
// - missing props: a quiet placeholder, never a crash.
// Expected values come from src/mock/. Events are seeded through window.__cindia.emit.
import { expect, test } from "@playwright/test";
import type { Community, Piece, Project } from "../../src/core/types";
import { demoContribution, getById } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { L3, STO_01, VIEWPORT, blockOf, editBlock, openStore, publishedSeed, seed, tokenColor } from "./storefront-lib";

test.use({ viewport: VIEWPORT });

const coop = getById<Community>(STO_01.communityId)!;
const hero = blockOf(STO_01.blocks, "hero");
const story = blockOf(STO_01.blocks, "story");
const piecesBlock = blockOf(STO_01.blocks, "pieces");
const processBlock = blockOf(STO_01.blocks, "process");
const projectsBlock = blockOf(STO_01.blocks, "projects");
const visit = blockOf(STO_01.blocks, "visit");
const firstPiece = getById<Piece>((piecesBlock.props.pieceIds as string[])[0])!;

test("each kind renders from the data: hero with the accent, pieces with L3, process steps from the piece, visit", async ({ page }) => {
  const watch = watchPage(page);
  await openStore(page, STO_01.slug);
  const store = page.getByTestId("store-page");

  const heroEl = store.getByTestId(`store-block-${hero.blockId}`);
  await expect(heroEl).toContainText(coop.name.en);
  await expect(heroEl).toContainText(coop.place.en);
  await expect(heroEl).toContainText(String(hero.props.tagline));
  const accent = await tokenColor(page, STO_01.theme.accent);
  expect(await heroEl.evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe(accent);

  // Pieces: the verification line of every card starts with L3.
  const cards = store.getByTestId(`store-block-${piecesBlock.blockId}`).locator('[data-role="verification"]');
  await expect(cards).toHaveCount((piecesBlock.props.pieceIds as string[]).length);
  for (const line of await cards.allTextContents()) expect(line.startsWith(L3.en)).toBe(true);

  // Process: the first listed piece's steps and hours, in order, and never the block's body.
  const proc = store.getByTestId(`store-block-${processBlock.blockId}`);
  await expect(proc).toContainText(String(processBlock.props.title));
  const steps = proc.locator("[data-piece-id] li");
  await expect(proc.locator("[data-piece-id]")).toHaveAttribute("data-piece-id", firstPiece.id);
  await expect(steps).toHaveCount(firstPiece.process.length);
  for (const [i, s] of firstPiece.process.entries()) {
    await expect(steps.nth(i)).toContainText(s.step.en);
    await expect(steps.nth(i)).toContainText(String(s.hours));
  }
  expect(await proc.textContent()).not.toContain(String(processBlock.props.body));

  // Story: the about text, never the body (which here is the same about text, so the draft test below checks it).
  await expect(store.getByTestId(`store-block-${story.blockId}`)).toContainText(String(story.props.title));

  // Visit: the region and the hours line, from the block's props.
  const visitEl = store.getByTestId(`store-block-${visit.blockId}`);
  await expect(visitEl).toContainText(String(visit.props.address));
  await expect(visitEl).toContainText(String(visit.props.hours));
  watch.expectClean();
});

test("projects show raised against goal, the mock's raised plus the store's added cents, each linking to its page", async ({ page }) => {
  const watch = watchPage(page);
  await openStore(page, STO_01.slug);
  const projectId = (projectsBlock.props.projectIds as string[])[0];
  const project = getById<Project>(projectId)!;
  const block = page.getByTestId(`store-block-${projectsBlock.blockId}`);
  const progress = block.locator(`[data-project-id="${projectId}"] [data-raised]`);
  await expect(progress).toHaveAttribute("data-raised", String(project.raisedCents));
  await expect(progress).toHaveAttribute("data-goal", String(project.goalCents));
  expect(await block.locator(`[data-project-id="${projectId}"]`).evaluate((e) => e.querySelector("a")?.getAttribute("href"))).toBe(`/shop/projects/${projectId}`);

  // The tour's contribution, twice: the store sums distinct contributions, so it counts once.
  const funded = { type: "project.funded", payload: structuredClone(demoContribution) as unknown as Record<string, unknown> };
  await seed(page, [funded, funded]);
  const added = demoContribution.projectId === projectId ? demoContribution.amountCents : 0;
  await expect(progress).toHaveAttribute("data-raised", String(project.raisedCents + added));
  watch.expectClean();
});

test("a published draft's story and process bodies never render, and missing props show a quiet placeholder", async ({ page }) => {
  const watch = watchPage(page);
  await openStore(page, STO_01.slug);
  const marker = "An agent wrote this body";
  let blocks = editBlock(STO_01.blocks, story.blockId, { body: `${marker} for the story.`, title: undefined });
  blocks = editBlock(blocks, processBlock.blockId, { body: `${marker} for the process.` });
  blocks = editBlock(blocks, hero.blockId, { tagline: undefined });
  blocks = editBlock(blocks, piecesBlock.blockId, { pieceIds: undefined });
  blocks = editBlock(blocks, projectsBlock.blockId, { projectIds: [] });
  blocks = editBlock(blocks, visit.blockId, { address: undefined, hours: undefined });
  await seed(page, [publishedSeed(STO_01, blocks)]);

  const store = page.getByTestId("store-page");
  await expect(store).toHaveAttribute("data-from", "published");
  expect(await store.textContent()).not.toContain(marker);
  // The story still shows the community's about text, and every block missing its props shows the placeholder.
  await expect(store.getByTestId(`store-block-${story.blockId}`)).toContainText(coop.about.en);
  for (const b of [story, hero, piecesBlock, projectsBlock, visit]) {
    await expect(store.getByTestId(`store-block-${b.blockId}`).locator('[data-placeholder="true"]').first()).toBeVisible();
  }
  await expect(page.locator('[data-testid^="slot-error-"]')).toHaveCount(0);
  watch.expectClean();
});
