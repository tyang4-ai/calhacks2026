// F-seller-hub T6: the maker's side of "ask the maker".
// - Acceptance 9: on /maker/mkr_01, a seeded question.forwarded for mkr_01 about pc_01 (the scripted
//   "ask the maker" run's) shows the buyer's words and pc_01, with an empty reply box. When she types
//   and presses Send, the store holds one question.answered with source "user", makerId mkr_01, an
//   ans_user_<n> answerId and her exact text, and seller-maker-answer-<questionId> shows it.
// - Her answer goes back to the buyer: the relay lands on the question's thread with her words.
// - The tour's scripted answer shows the same way, and the box goes.
// - Questions show newest first, and only on their own maker's page.
// - Acceptance 10: the questions panel shows simulated-badge in scripted mode.
// - English only (decisions.md, Oct 24 11:35 PM): no toggle, no Chinese on the panel; the buyer's
//   question and her answer stay as written.
// Selects by test ID only. Expected values come from src/mock/.
import { expect, test } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { pieces } from "../../src/mock/index";
import { MAKER } from "../../src/features/seller-hub/strings";
import { watchPage } from "../smoke/lib";
import { ANSWER_TIMEOUT, FRAME_VIEWPORT, QUESTION, SCRIPTED_ANSWER, expectEnglishOnly, logged, openMaker, questionSeed, seed, storeState } from "./seller-hub-lib";

test.use({ viewport: FRAME_VIEWPORT });

const PC = pieces.find((p) => p.id === QUESTION.pieceId)!;
const HER_WORDS = "I wove it for my aunt's kitchen.\nThe red is the color I like best.";

test("a forwarded question shows her the buyer's words and the piece, with an empty reply box", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page, QUESTION.makerId);
  await seed(page, [questionSeed()]);
  const card = page.getByTestId(`seller-maker-question-${QUESTION.id}`);
  await expect(card).toBeVisible();
  await expect(card).toContainText(QUESTION.text);
  await expect(card).toContainText(PC.title.en);
  await expect(card).toContainText(MAKER.forwarded.en);
  await expect(page.getByTestId(`seller-maker-reply-${QUESTION.id}`)).toHaveValue("");
  await expect(page.getByTestId(`seller-maker-send-${QUESTION.id}`)).toBeDisabled();
  await expect(page.getByTestId("seller-maker-questions").getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("her Send emits one question.answered in her exact words, shows it as sent, and the relay quotes her", async ({ page }) => {
  await openMaker(page, QUESTION.makerId);
  await seed(page, [questionSeed()]);
  await page.getByTestId(`seller-maker-reply-${QUESTION.id}`).fill(HER_WORDS);
  await page.getByTestId(`seller-maker-send-${QUESTION.id}`).click();

  const answer = page.getByTestId(`seller-maker-answer-${QUESTION.id}`);
  await expect(answer).toBeVisible();
  await expect(answer).toContainText("I wove it for my aunt's kitchen.");
  await expect(page.getByTestId(`seller-maker-reply-${QUESTION.id}`)).toHaveCount(0);

  const answers = await logged(page, "question.answered");
  expect(answers).toHaveLength(1);
  expect(answers[0].source).toBe("user");
  const s = await storeState(page);
  const stored = s.support.questions[QUESTION.id].answered as Payloads["question.answered"];
  expect(stored.makerId).toBe(QUESTION.makerId);
  expect(stored.answerId).toMatch(/^ans_user_\d+$/);
  expect(stored.text).toBe(HER_WORDS);
  expect(stored.lang).toBe("en");

  // The relay (run_09's) lands on the question's thread with her words, and no second answer event.
  await expect
    .poll(
      async () => {
        const st = await storeState(page);
        const thread = st.support.threads[QUESTION.threadId];
        return thread ? thread.messages.some((m) => m.kind === "answered" && m.reply.en.includes("I wove it for my aunt's kitchen.")) : false;
      },
      { timeout: ANSWER_TIMEOUT },
    )
    .toBe(true);
  expect(await logged(page, "question.answered")).toHaveLength(1);
});

test("the tour's scripted answer shows as sent, with no reply box", async ({ page }) => {
  await openMaker(page, QUESTION.makerId);
  await seed(page, [questionSeed(), { type: "question.answered", payload: SCRIPTED_ANSWER }]);
  await expect(page.getByTestId(`seller-maker-answer-${QUESTION.id}`)).toContainText(SCRIPTED_ANSWER.text);
  await expect(page.getByTestId(`seller-maker-reply-${QUESTION.id}`)).toHaveCount(0);
  await expect(page.getByTestId(`seller-maker-send-${QUESTION.id}`)).toHaveCount(0);
});

test("questions show newest first, and only on their maker's page", async ({ page }) => {
  await openMaker(page, QUESTION.makerId);
  const second = { ...questionSeed(), payload: { ...(questionSeed().payload as Payloads["question.forwarded"]), questionId: "qst_user_1", text: "Is the red dyed by hand?" } };
  await seed(page, [questionSeed()]);
  await seed(page, [second]);
  const ids = await page
    .getByTestId("seller-maker-questions")
    .locator('[data-testid^="seller-maker-question-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(["seller-maker-question-qst_user_1", `seller-maker-question-${QUESTION.id}`]);

  const other = pieces.find((p) => p.makerId !== QUESTION.makerId && p.communityId === PC.communityId)!.makerId;
  await openMaker(page, other);
  await seed(page, [questionSeed()]);
  await expect(page.getByTestId("seller-maker-questions")).toBeVisible();
  await expect(page.getByTestId(`seller-maker-question-${QUESTION.id}`)).toHaveCount(0);
  await expect(page.getByTestId("seller-maker-questions")).toContainText(MAKER.noQuestions.en);
});

test("the questions panel reads in English only, the buyer's question and her answer as written", async ({ page }) => {
  await openMaker(page, QUESTION.makerId);
  await seed(page, [questionSeed(), { type: "question.answered", payload: SCRIPTED_ANSWER }]);
  const card = page.getByTestId(`seller-maker-question-${QUESTION.id}`);
  await expect(page.getByTestId("seller-maker-questions")).toContainText(MAKER.questions.en);
  await expect(card).toContainText(MAKER.forwarded.en);
  await expect(card).toContainText(PC.title.en);
  await expect(card).toContainText(QUESTION.text);
  await expect(page.getByTestId(`seller-maker-answer-${QUESTION.id}`)).toContainText(SCRIPTED_ANSWER.text);
  await expectEnglishOnly(page.getByTestId("seller-maker-questions"));
});
