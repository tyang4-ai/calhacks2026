// F-buyer T2, moved by M-buyer T1 to the desktop piece page with event-anchored seeks: the maker
// story card and the process timeline (acceptance 2), the story fitting the frame (acceptance 8,
// now 1440 by 900), and another piece's story (the display half of acceptance 7, now its own
// /shop/piece/<pieceId> route). T7 deletes this spec after G4v2; buyer-piece-story.spec.ts repeats
// what it checks.
import { expect, test, type Page } from "@playwright/test";
import { pieces } from "../../src/mock/catalog";
import { makers } from "../../src/mock/people";
import { watchPage } from "../smoke/lib";
import { expectInsideFrame, openPage, seekToEvent } from "./buyer-lib";

function piece(id: string) {
  const p = pieces.find((x) => x.id === id);
  if (!p) throw new Error(`no piece ${id} in src/mock`);
  return p;
}

/** The piece page, 300 ms after the timeline opens pc_01 (inside v1's d02-story). */
async function openStory(page: Page, pieceId = "pc_01") {
  await openPage(page, `/shop/piece/${pieceId}`);
  await seekToEvent(page, "piece.opened", { pieceId: "pc_01" }, 300);
}

test("@T2 the story card shows the grey, red and black weaving, its maker, 26 hours and the craft line", async ({ page }) => {
  const watch = watchPage(page);
  await openStory(page);
  const weaving = piece("pc_01");
  const maker = makers.find((m) => m.id === weaving.makerId)!;
  expect(maker, "pc_01's maker in src/mock").toBeTruthy();

  const card = page.getByTestId("buyer-story-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(weaving.title.en);
  // English only (decisions.md, Oct 24 11:35 PM and 11:55 PM): no Chinese title under the English one.
  await expect(card).not.toContainText(weaving.title.zh);
  await expect(card).toContainText(maker.name.en);
  await expect(card.getByRole("img", { name: maker.surnameChar, exact: true })).toHaveText(maker.surnameChar);
  await expect(card).toContainText(`${weaving.hours} hours`);
  expect(weaving.hours).toBe(26);
  await expect(card).toContainText(weaving.heritage.en);
  watch.expectClean();
});

test("@T2 the process timeline lists every step of the grey, red and black weaving's process in order", async ({ page }) => {
  const watch = watchPage(page);
  await openStory(page);
  const weaving = piece("pc_01");

  const timeline = page.getByTestId("buyer-story-card").getByTestId("buyer-process-timeline");
  await expect(timeline).toBeVisible();
  const steps = timeline.getByRole("listitem");
  await expect(steps).toHaveCount(weaving.process.length);
  for (let i = 0; i < weaving.process.length; i++) {
    await expect(steps.nth(i)).toContainText(weaving.process[i].step.en);
    await expect(steps.nth(i)).toContainText(`${weaving.process[i].hours} h`);
  }
  watch.expectClean();
});

test("@T2 the story fits the frame with the last process step in view", async ({ page }) => {
  const watch = watchPage(page);
  await openStory(page);

  const card = page.getByTestId("buyer-story-card");
  const timeline = page.getByTestId("buyer-process-timeline");
  await expect(card).toBeInViewport({ ratio: 1 });
  await expect(timeline).toBeInViewport({ ratio: 1 });
  await expect(timeline.getByRole("listitem").last()).toBeInViewport({ ratio: 1 });

  // In view of the page is not enough: the card must also end inside the frame and its scroll cell.
  const frame = await page.getByTestId("frame-buyer").boundingBox();
  const box = await card.boundingBox();
  expect(frame && box, "frame and card have boxes").toBeTruthy();
  expect(box!.y + box!.height).toBeLessThanOrEqual(frame!.y + frame!.height);
  await expectInsideFrame(page, "buyer-story-card");
  watch.expectClean();
});

test("@T2 the piece page for pc_07 shows the red and grey mini weaving", async ({ page }) => {
  const watch = watchPage(page);
  await openStory(page, "pc_07");
  const mini = piece("pc_07");

  const card = page.getByTestId("buyer-story-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(mini.title.en);
  await expect(card.getByTestId("buyer-process-timeline").getByRole("listitem")).toHaveCount(mini.process.length);
  watch.expectClean();
});
