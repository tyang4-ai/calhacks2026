// F-support T1: the thread (support-thread) in the drawer.
// Acceptance 2 (the tour's question as support-msg-1 under L11), 4 second half (the tour's reply,
// its agent and its records), 9 ("ask the maker": the forward, her own words, then the Writer's
// relay), 10 (an escalation's handoff) and 13 (English only, with the maker's words left as written:
// the site has no language toggle since Gordon's English-only decision, Oct 24, 11:35 PM).
// Selects by test ID only. Reaches the tour's run with tourEvent(), and asks only after it.
import { expect, test, type Page } from "@playwright/test";
import { getAgent, getById, makerQuestions } from "../../src/mock/index";
import type { Person } from "../../src/core/types";
import { L11, STRINGS, forwardedLine, GLOSSARY } from "../../src/features/support/strings";
import { watchPage } from "../smoke/lib";
import {
  ANSWER_TIMEOUT,
  BUYER_QUESTIONS,
  D04_QUESTION,
  TOUR_RUN,
  TOUR_THREAD,
  drawer,
  emitAsUser,
  emitScripted,
  openPage,
  replyOf,
  runFor,
  sidePanel,
  storeState,
  tourEvent,
} from "./support-lib";

const PIECE_DRAWER = "/shop/piece/pc_01?drawer=support";

/** Any Chinese character: Han ideographs, CJK punctuation and full-width forms. */
const CHINESE = /[\p{Script=Han}　-〿＀-￯]/u;

/** The 1-based place of the support-msg-<n> holding a test ID. */
async function msgIndexOf(page: Page, testId: string): Promise<number> {
  return drawer(page).evaluate((root, id) => {
    const el = root.querySelector(`[data-testid="${id}"]`);
    const li = el?.closest('[data-testid^="support-msg-"]');
    return li ? Number(li.getAttribute("data-testid")!.slice("support-msg-".length)) : -1;
  }, testId);
}

test("2: the drawer shows L11 at the top and the tour's question as support-msg-1", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, PIECE_DRAWER);
  await expect(drawer(page)).toBeVisible();
  await tourEvent(page, "support.asked", { threadId: TOUR_THREAD });
  await expect(drawer(page).getByTestId("support-records-note")).toHaveText(L11.en);
  await expect(drawer(page).getByTestId("support-msg-1")).toContainText(D04_QUESTION.en);
  await expect(drawer(page).getByTestId("support-thread")).toBeVisible();
  // L11 sits above the conversation.
  const noteBox = await drawer(page).getByTestId("support-records-note").boundingBox();
  const threadBox = await drawer(page).getByTestId("support-thread").boundingBox();
  expect(noteBox!.y).toBeLessThan(threadBox!.y);
  watch.expectClean();
});

test("4b: the tour's answer shows as support-reply, named by the Writer, with pc_01 in its records", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, PIECE_DRAWER);
  await tourEvent(page, "support.answered", { threadId: TOUR_THREAD });
  const answer = replyOf(TOUR_RUN);
  const reply = drawer(page).getByTestId("support-reply");
  await expect(reply).toContainText(answer.reply.en);
  await expect(drawer(page).getByTestId("support-agent")).toHaveText(getAgent(answer.agentId)!.name.en);
  expect(answer.agentId).toBe("writer");
  await expect(drawer(page).getByTestId("support-refs").locator('a[href="/shop/piece/pc_01"]')).toHaveCount(1);
  await expect(drawer(page).getByTestId("support-working")).toHaveCount(0);
  // The question first, then the reply.
  await expect(drawer(page).getByTestId("support-msg-1")).toContainText(D04_QUESTION.en);
  expect(await msgIndexOf(page, "support-reply")).toBe(2);
  watch.expectClean();
});

test("9: the meaning question goes to Grace N., and her own words come back before the Writer's relay", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01");
  await sidePanel(page).getByTestId("support-piece-suggest-2").click();
  await expect(drawer(page)).toBeVisible();

  const run = runFor(BUYER_QUESTIONS[1], "buyer", ["pc_01"]);
  const l14 = replyOf(run).reply.en;
  await expect(drawer(page).getByTestId("support-reply")).toContainText(l14, { timeout: ANSWER_TIMEOUT });

  // The forward, re-keyed to the person's own question ID, on the person's thread.
  await expect.poll(async () => Object.keys((await storeState(page)).support.questions).length, { timeout: ANSWER_TIMEOUT }).toBe(1);
  const state = await storeState(page);
  const [questionId, q] = Object.entries(state.support.questions)[0];
  expect(questionId).toMatch(/^qst_user_\d+$/);
  expect(q.forwarded!.threadId).toMatch(/^thr_user_\d+$/);
  const grace = getById<Person>(q.forwarded!.makerId)!;
  const forwarded = drawer(page).getByTestId(`support-forwarded-${questionId}`);
  await expect(forwarded).toHaveText(forwardedLine(grace.name).en);
  expect(await msgIndexOf(page, `support-forwarded-${questionId}`)).toBeGreaterThan(await msgIndexOf(page, "support-reply"));

  // Her answer, as her page's Send emits it.
  const herWords = "My aunt taught me this diamond. I weave it because I like it, and that's all I'll say.";
  await emitAsUser(page, "question.answered", { questionId, answerId: "ans_user_1", makerId: grace.id, text: herWords, lang: "en" });
  const mine = drawer(page).getByTestId(`support-maker-answer-${questionId}`);
  await expect(mine).toBeVisible();
  await expect(mine).toContainText(herWords);
  await expect(mine).toContainText(grace.name.en);
  await expect(mine).toContainText(GLOSSARY.inHerOwnWords.en);
  await expect(mine.locator('[data-variant="demo"]')).toBeVisible();
  await expect(mine).not.toHaveAttribute("data-testid", "support-reply");

  // The Writer's relay arrives after it, quoting her exactly, as the newest reply.
  await expect(drawer(page).getByTestId("support-reply")).toContainText(herWords, { timeout: ANSWER_TIMEOUT });
  await expect(drawer(page).getByTestId("support-agent")).toHaveText(getAgent("writer")!.name.en);
  expect(await msgIndexOf(page, "support-reply")).toBeGreaterThan(await msgIndexOf(page, `support-maker-answer-${questionId}`));
  watch.expectClean();
});

test("10: an escalation with a pending approval shows support-handoff with its reason", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, PIECE_DRAWER);
  await tourEvent(page, "support.answered", { threadId: TOUR_THREAD });
  const reason = { en: "The buyer says the weaving arrived damaged, and a refund needs a person.", zh: "买家说编织品到货时有损坏，退款需要由人处理。" };
  await emitScripted(
    page,
    "approval.requested",
    {
      approvalId: "apr_user_901",
      approval: {
        kind: "support_action",
        subjectIds: ["pc_01"],
        overLimit: false,
        proposedBy: "cindy",
        summary: { en: "Refund a damaged piece.", zh: "为损坏的作品退款。" },
        decisionDate: "2026-10-01",
      },
    },
    1,
    "b14-swarm",
  );
  await emitScripted(page, "support.escalated", { threadId: TOUR_THREAD, runId: "run_901", reason, approvalId: "apr_user_901" }, 2, "b14-swarm");
  const handoff = drawer(page).getByTestId("support-handoff");
  await expect(handoff).toBeVisible();
  await expect(handoff).toContainText(reason.en);
  await expect(handoff).toContainText(STRINGS.handoffPending.en);
  watch.expectClean();
});

test("13: English only, L11, the suggestions, the steps and the reply render English with no Chinese, and the maker's words stay as written", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, PIECE_DRAWER);
  // The suggestions on a fresh drawer, in English (the site is English only, with no language toggle).
  const note = drawer(page).getByTestId("support-records-note");
  await expect(note).toHaveText(L11.en);
  await expect(note).not.toContainText(CHINESE);
  for (const [i, q] of BUYER_QUESTIONS.entries()) {
    const suggestion = drawer(page).getByTestId(`support-suggest-${i + 1}`);
    await expect(suggestion).toHaveText(q.en);
    await expect(suggestion).not.toContainText(CHINESE);
  }

  // The tour's run, answered, and an "ask the maker" loop with her English words.
  await tourEvent(page, "support.answered", { threadId: TOUR_THREAD });
  const { question, answer } = makerQuestions[0];
  await emitScripted(page, "question.forwarded", { questionId: question.id, threadId: TOUR_THREAD, makerId: question.makerId, pieceId: question.pieceId, text: question.text, lang: question.lang }, 1, "b14-swarm");
  await emitScripted(page, "question.answered", answer, 2, "b14-swarm");

  for (const s of TOUR_RUN.steps) {
    const step = drawer(page).getByTestId(`support-step-${s.stepId}`);
    await expect(step).toContainText(s.summary.en);
    await expect(step).not.toContainText(CHINESE);
  }
  const reply = drawer(page).getByTestId("support-reply");
  await expect(reply).toContainText(replyOf(TOUR_RUN).reply.en);
  await expect(reply).not.toContainText(CHINESE);
  const agent = drawer(page).getByTestId("support-agent");
  await expect(agent).toHaveText(getAgent("writer")!.name.en);
  await expect(agent).not.toContainText(CHINESE);
  const mine = drawer(page).getByTestId(`support-maker-answer-${question.id}`);
  await expect(mine).toContainText(answer.text);
  await expect(mine).toContainText(GLOSSARY.inHerOwnWords.en);
  await expect(mine).not.toContainText(CHINESE);
  watch.expectClean();
});
