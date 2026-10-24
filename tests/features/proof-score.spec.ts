// F-proof T1: the scoreboard. Acceptance 1 (Caught 4 of 4 after proof.scored), 3 (the score part:
// Caught 3 of 4 when err_03 is missed), 4 (the score part: not scored yet before 59.0) and 7 (opened
// at /studio/proof after proof.scored, the same result). Elements are found by test ID only, and
// expected copy comes from the feature's strings and the answer key, never typed in.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";
import { answerKey } from "../../src/mock/index";
import { UI, caughtOf } from "../../src/features/proof/strings";

/** proof.scored lands at 59000 in the demo timeline. */
const SCORED_AT = 59000;
const AFTER = SCORED_AT + 500;
const BEFORE = SCORED_AT - 1000;

async function open(page: Page) {
  await page.goto("/studio/proof");
  await waitForSlots(page);
  await waitForHooks(page);
}

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
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

test("Acceptance 7: opened at /studio/proof after proof.scored, the same result as playing through", async ({ page }) => {
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
