// F-proof T1: the scoreboard. Acceptance 1 (Caught 4 of 4 after proof.scored), 3 (the score part:
// Caught 3 of 4 when err_03 is missed), 4 (the score part: not scored yet before proof.scored) and 7
// (opened at /sell/proof after proof.scored, the same result), on M-desktop's /sell/proof. M-desktop's
// acceptance 6: 300 ms after proof.scored the four test cases sit in the view's left two thirds. Elements are found by test ID only, and
// expected copy comes from the feature's strings and the answer key, never typed in.
import { expect, test, type Page } from "@playwright/test";
import { SELL_VIEWPORT, expectInsideFrame, expectReadableText, openSell, seekToEvent, watchPage } from "./sell-views-lib";
import { answerKey } from "../../src/mock/index";
import { UI, caughtOf } from "../../src/features/proof/strings";

/** Moments around the timeline's proof.scored, as offsets from its own time. */
const AFTER = 500;
const BEFORE = -1000;

// M-desktop: the proof view on /sell/proof at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

async function open(page: Page) {
  await openSell(page, "proof");
}

/** Seeks to proof.scored plus `offsetMs`. */
async function seek(page: Page, offsetMs: number) {
  await seekToEvent(page, "proof.scored", {}, offsetMs);
}

type ScoreState = { caught: number; total: number } | null;

async function storeScore(page: Page): Promise<ScoreState> {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { proof: { score: ScoreState } };
    return s.proof.score;
  });
}

test("Acceptance 1: after proof.scored the score reads Caught 4 of 4 from the payload", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  await seek(page, AFTER);

  const score = await storeScore(page);
  expect(score).not.toBeNull();
  expect(score!.caught).toBe(answerKey.length);
  expect(score!.total).toBe(answerKey.length);

  await expect(page.getByTestId("proof-score")).toHaveText(caughtOf(score!.caught, score!.total).en);
  watch.expectClean();
});

test("Acceptance 3: a proof.scored with err_03 missed reads Caught 3 of 4", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  await seek(page, AFTER);

  const results = answerKey.map((e) => ({ errorId: e.id, caught: e.id !== "err_03" }));
  const caught = results.filter((r) => r.caught).length;
  expect(caught).toBe(answerKey.length - 1);

  await page.evaluate(
    (score) => {
      const c = window.__cindia!;
      c.emit({
        id: "evt_test_0001",
        type: "proof.scored",
        at: c.player.now(),
        source: "scripted",
        key: "b03-proof",
        payload: score,
      });
    },
    { results, caught, total: answerKey.length },
  );

  await expect(page.getByTestId("proof-score")).toHaveText(caughtOf(caught, answerKey.length).en);
  watch.expectClean();
});

test("Acceptance 4: before proof.scored the score says it isn't scored yet", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  await seek(page, BEFORE);

  expect(await storeScore(page)).toBeNull();
  await expect(page.getByTestId("proof-score")).toHaveText(UI.notScored.en);

  // Seeking back from after the score also clears it.
  await seek(page, AFTER);
  await expect(page.getByTestId("proof-score")).toHaveText(caughtOf(answerKey.length, answerKey.length).en);
  await seek(page, BEFORE);
  await expect(page.getByTestId("proof-score")).toHaveText(UI.notScored.en);
  watch.expectClean();
});

test("Acceptance 7: opened at /sell/proof after proof.scored, the same result as playing through", async ({ page }) => {
  const watch = watchPage(page);
  const full = caughtOf(answerKey.length, answerKey.length).en;

  // Played through: from just before the score, at 8x, until the score lands.
  await open(page);
  await seek(page, BEFORE);
  await expect(page.getByTestId("proof-score")).toHaveText(UI.notScored.en);
  await page.evaluate(() => {
    // The smoke lib's window type leaves out setSpeed, which the real player has.
    const p = window.__cindia!.player as unknown as { setSpeed(x: number): void; play(): void };
    p.setSpeed(8);
    p.play();
  });
  await expect(page.getByTestId("proof-score")).toHaveText(full);
  const played = await storeScore(page);

  // Opened fresh, then seeked past it.
  await open(page);
  await seek(page, AFTER);
  await expect(page.getByTestId("proof-score")).toHaveText(full);
  expect(await storeScore(page)).toEqual(played);
  watch.expectClean();
});

test("M-desktop acceptance 6: 300 ms after proof.scored the score reads Caught 4 of 4 and the four test cases sit in the left two thirds", async ({ page }) => {
  const watch = watchPage(page);
  await open(page);
  await seek(page, 300);
  await expect(page.getByTestId("proof-score")).toHaveText(caughtOf(answerKey.length, answerKey.length).en);
  await expect(page.getByTestId("proof-score")).toHaveText("Caught 4 of 4");
  const items = answerKey.map((e) => `proof-item-${e.id}`);
  expect(items).toEqual(["proof-item-err_01", "proof-item-err_02", "proof-item-err_03", "proof-item-err_04"]);
  await expectInsideFrame(page, ["proof-score", ...items]);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.proof.main"]');
  // The proof panel has the left two thirds; F-search's model score (or its placeholder) the right third.
  const main = (await page.locator('[data-slot="studio.proof.main"]').boundingBox())!;
  const side = (await page.locator('[data-slot="studio.proof.side"]').boundingBox())!;
  expect(side.x).toBeGreaterThan(main.x + main.width - 1);
  for (const id of items) {
    const b = (await page.getByTestId(id).boundingBox())!;
    expect(b.x, `${id} starts in the left two thirds`).toBeGreaterThanOrEqual(main.x - 1);
    expect(b.x + b.width, `${id} ends in the left two thirds`).toBeLessThanOrEqual(main.x + main.width + 1);
  }
  await expect(page.locator('[data-slot="studio.proof.main"]').getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});
