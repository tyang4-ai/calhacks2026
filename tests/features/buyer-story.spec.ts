// F-buyer T2: the maker story card and the process timeline (acceptance 2), the story step fitting
// the phone (acceptance 8), and a tapped piece's story (the display half of acceptance 7).
import { expect, test, type Page } from "@playwright/test";
import { pieces } from "../../src/mock/catalog";
import { makers } from "../../src/mock/people";
import { waitForHooks, watchPage } from "../smoke/lib";

const STORY_AT = 7700; // inside d02-story, which ends at 8000

function piece(id: string) {
  const p = pieces.find((x) => x.id === id);
  if (!p) throw new Error(`no piece ${id} in src/mock`);
  return p;
}

async function openBuyerAt(page: Page, ms: number) {
  await page.goto("/buyer");
  await waitForHooks(page);
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

test("@T2 the story card shows the grey, red and black weaving, its maker, 26 hours and the craft line", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, STORY_AT);
  const weaving = piece("pc_01");
  const maker = makers.find((m) => m.id === weaving.makerId)!;
  expect(maker, "pc_01's maker in src/mock").toBeTruthy();

  const card = page.getByTestId("buyer-story-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(weaving.title.en);
  await expect(card).toContainText(weaving.title.zh);
  await expect(card).toContainText(maker.name.en);
  await expect(card.getByRole("img", { name: maker.surnameChar, exact: true })).toHaveText(maker.surnameChar);
  await expect(card).toContainText(`${weaving.hours} hours`);
  expect(weaving.hours).toBe(26);
  await expect(card).toContainText(weaving.heritage.en);
  watch.expectClean();
});

test("@T2 the process timeline lists every step of the grey, red and black weaving's process in order", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, STORY_AT);
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

test("@T2 the story step fits the phone with the last process step in view", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, STORY_AT);

  const card = page.getByTestId("buyer-story-card");
  const timeline = page.getByTestId("buyer-process-timeline");
  await expect(card).toBeInViewport({ ratio: 1 });
  await expect(timeline).toBeInViewport({ ratio: 1 });
  await expect(timeline.getByRole("listitem").last()).toBeInViewport({ ratio: 1 });

  // In view of the page is not enough: the card must also end inside the phone's screen.
  const frame = await page.getByTestId("frame-buyer").boundingBox();
  const box = await card.boundingBox();
  expect(frame && box, "frame and card have boxes").toBeTruthy();
  expect(box!.y + box!.height).toBeLessThanOrEqual(frame!.y + frame!.height);
  watch.expectClean();
});

test("@T2 a piece.opened from the buyer for pc_07 shows the red and grey mini weaving", async ({ page }) => {
  const watch = watchPage(page);
  await openBuyerAt(page, 3700);
  const mini = piece("pc_07");

  await page.evaluate(() => {
    const c = window.__cindia!;
    c.emit({
      id: "evt_user_0001",
      type: "piece.opened",
      at: c.player.now(),
      source: "user",
      payload: { pieceId: "pc_07" },
    });
  });

  const card = page.getByTestId("buyer-story-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(mini.title.en);
  await expect(card.getByTestId("buyer-process-timeline").getByRole("listitem")).toHaveCount(mini.process.length);
  watch.expectClean();
});
