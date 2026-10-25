// M-buyer T2: the piece page's left column. Acceptance 1 (the story card, the steps and the
// verification line, inside the frame), 8 (the Simulated badge) and 9 (Chinese labels) for the story.
// Expected values come from src/mock and the kit's labels; L3 to L5 are the glossary's words.
import { expect, test, type Page } from "@playwright/test";
import type { Community, Person, Piece } from "../../src/core/types";
import { getById } from "../../src/mock/index";
import { BADGE_WORDS, ILLUSTRATION_WORD, L3, L4 } from "../../src/ui/strings";
import { watchPage } from "../smoke/lib";
import { expectInsideFrame, openPage, seekToEvent } from "./buyer-lib";

/** L5, word for word from the glossary's on-screen labels. */
const L5 = { en: "Fictional maker and story, written by the Cindia team.", zh: "虚构的匠人和故事，由 Cindia 团队撰写。" };

const PIECE = "pc_01";

async function openAtSplit(page: Page) {
  await openPage(page, `/shop/piece/${PIECE}`);
  await seekToEvent(page, "split.shown", { pieceId: PIECE }, 300);
}

function mockFor(pieceId: string) {
  const piece = getById<Piece>(pieceId)!;
  const maker = getById<Person>(piece.makerId)!;
  const community = getById<Community>(piece.communityId)!;
  return { piece, maker, community };
}

test("@T2 the story card shows pc_01's title, Grace N. with her mark, 26 hours of work, the craft line, the Demo data badge and L5", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  const { piece, maker, community } = mockFor(PIECE);
  expect(maker.name.en).toBe("Grace N.");
  expect(piece.hours).toBe(26);

  const card = page.getByTestId("buyer-story-card");
  await expect(card).toContainText(piece.title.en);
  await expect(card).toContainText(piece.title.zh);
  await expect(card).toContainText(maker.name.en);
  await expect(card.getByRole("img", { name: maker.surnameChar, exact: true })).toHaveText(maker.surnameChar);
  // Her en and zh names are the same, so the name shows once (d02's "Grace N. Grace N.").
  expect(((await card.textContent()) ?? "").split(maker.name.en).length - 1).toBe(1);
  await expect(card).toContainText(`${piece.hours} hours of work`);
  await expect(card).toContainText(piece.heritage.en);
  await expect(card).toContainText(BADGE_WORDS.demo.en);
  await expect(card).toContainText(ILLUSTRATION_WORD.en);
  await expect(card).toContainText(community.name.en);
  await expect(card.getByRole("img", { name: piece.imageAlt.en })).toBeVisible();
  await expect(card.getByTestId("buyer-story-demo-note")).toHaveText(L5.en);
  watch.expectClean();
});

test("@T2 the process steps run in a row, every step with its hours", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  const { piece } = mockFor(PIECE);
  const steps = page.getByTestId("buyer-story-card").getByTestId("buyer-process-timeline").getByRole("listitem");
  await expect(steps).toHaveCount(piece.process.length);
  const boxes = [];
  for (let i = 0; i < piece.process.length; i++) {
    await expect(steps.nth(i)).toContainText(piece.process[i].step.en);
    await expect(steps.nth(i)).toContainText(`${piece.process[i].hours} h`);
    boxes.push((await steps.nth(i).boundingBox())!);
  }
  // A row: each step starts to the right of the one before, on the same line.
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x);
    expect(Math.abs(boxes[i].y - boxes[0].y)).toBeLessThan(2);
  }
  watch.expectClean();
});

test("@T2 buyer-verification shows how com_dine would verify its makers, starting with L3 and with L4 under it", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  const { community } = mockFor(PIECE);
  expect(community.id).toBe("com_dine");
  expect(community.demo).toBe(true);

  const line = page.getByTestId("buyer-verification");
  await expect(line).toHaveText(new RegExp(`^${L3.en}`));
  await expect(line).toContainText(community.verification.by.en);
  await expect(line).toContainText(community.verification.note.en);
  await expect(line).toContainText(L4.en);
  // L4 sits under the line's head.
  const text = (await line.textContent()) ?? "";
  expect(text.indexOf(L4.en)).toBeGreaterThan(text.indexOf(L3.en));
  watch.expectClean();
});

test("@T2 the story, the steps and the verification line sit inside the frame at 1440 by 900", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  for (const id of ["buyer-story-card", "buyer-process-timeline", "buyer-verification", "buyer-story-demo-note"]) await expectInsideFrame(page, id);
  watch.expectClean();
});

test("@T2 in Chinese the story's labels, L4 and L5 read Chinese and the hours stay", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  // The toggle cycles auto, en, zh.
  await page.getByTestId("demo-lang-toggle").click();
  await page.getByTestId("demo-lang-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("zh");
  const { piece, community } = mockFor(PIECE);

  const card = page.getByTestId("buyer-story-card");
  await expect(card).toContainText(piece.title.zh);
  await expect(card).toContainText(piece.heritage.zh);
  await expect(card).toContainText(community.name.zh);
  await expect(card).toContainText(ILLUSTRATION_WORD.zh);
  await expect(card.getByTestId("buyer-story-demo-note")).toHaveText(L5.zh);
  await expect(card).not.toContainText("hours of work");
  await expect(card.getByTestId("buyer-process-timeline").getByRole("listitem").first()).toContainText(piece.process[0].step.zh);

  const line = page.getByTestId("buyer-verification");
  await expect(line).toHaveText(new RegExp(`^${L3.zh}`));
  await expect(line).toContainText(L4.zh);
  await expect(line).toContainText(community.verification.note.zh);
  for (const id of ["buyer-story-card", "buyer-verification"]) await expectInsideFrame(page, id);
  watch.expectClean();
});

test("@T2 an unknown piece shows a short note and a link back to Shop", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_nope");
  const pagePanel = page.getByTestId("buyer-piece-page");
  await expect(pagePanel).toBeVisible();
  await expect(pagePanel.getByRole("link")).toHaveAttribute("href", "/shop");
  await expect(page.getByTestId("buyer-story-card")).toHaveCount(0);
  watch.expectClean();
});
