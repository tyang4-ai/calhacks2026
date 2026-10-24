// F-ask-cindy T1: the answer view. A suggestion's answer draws its chart, a typed question about the
// gallery payment lists the flag's three records, and the language toggle switches the shown answer
// without asking again. Selects by test ID only.
import { expect, test, type Page } from "@playwright/test";
import { cannedAnswers, getById } from "../../src/mock/index";
import type { Contract, Flag, Statement } from "../../src/core/types";
import { formatBps, formatCents } from "../../src/ui/formatCents";
import { GLOSSARY } from "../../src/features/ask-cindy/strings";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";

const ANSWER_TIMEOUT = 10000;
const ask01 = cannedAnswers.find((a) => a.questionId === "ask_01")!;
const ask02 = cannedAnswers.find((a) => a.questionId === "ask_02")!;
const flag = getById<Flag>("flg_01")!;

/** Opens the drawer and moves the player past the close, before any question is sent. */
async function openAfterClose(page: Page) {
  await page.goto("/studio/close?drawer=ask");
  await waitForHooks(page);
  await waitForSlots(page);
  // Seek before asking: the answer is a wall-clock timer that drops itself if the epoch changes.
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(p.durationMs());
  });
  await expect(page.getByTestId("ask-cindy-input")).toBeVisible();
}

const countAsked = (page: Page) =>
  page.evaluate(() => {
    const ask = window.__cindia!.store.getState().ask as unknown as { questionIds: string[] };
    return ask.questionIds.length;
  });

test("Acceptance 1: suggestion 1 shows the canned answer and one bar per label", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  await page.getByTestId("ask-cindy-suggestion-1").click();

  const answer = page.getByTestId("ask-cindy-answer");
  await expect(answer).toBeVisible({ timeout: ANSWER_TIMEOUT });
  await expect(answer).toContainText(ask01.answer.en);

  const chart = page.getByTestId("ask-cindy-chart");
  await expect(chart).toHaveCount(1);
  await expect(chart).toContainText(ask01.chart!.title.en);
  const labels = ask01.chart!.labels.length;
  expect(labels).toBeGreaterThan(0);
  await expect(chart.locator(".recharts-bar-rectangle")).toHaveCount(labels);

  // The refs list the piece and its orders.
  await expect(page.getByTestId("ask-cindy-refs").locator("li")).toHaveCount(ask01.refIds.length);
  watch.expectClean();
});

test("Acceptance 2: the typed gallery question lists the three records of flg_01", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  await page.getByTestId("ask-cindy-input").fill(ask02.questions.en);
  await page.getByTestId("ask-cindy-send").click();

  const answer = page.getByTestId("ask-cindy-answer");
  await expect(answer).toBeVisible({ timeout: ANSWER_TIMEOUT });
  await expect(answer).toContainText(ask02.answer.en);

  // The answer the store holds names exactly the flag's records.
  const refIds = await page.evaluate(() => {
    const ask = window.__cindia!.store.getState().ask as unknown as { latestAnswerId: string; answers: Record<string, { refIds: string[] }> };
    return ask.answers[ask.latestAnswerId].refIds;
  });
  expect(refIds.toSorted()).toEqual([...flag.recordIds].toSorted());

  const refs = page.getByTestId("ask-cindy-refs");
  await expect(refs.locator("li")).toHaveCount(3);
  await expect(refs).toContainText(GLOSSARY.contract.en);
  await expect(refs).toContainText(GLOSSARY.statement.en);
  await expect(refs).toContainText(GLOSSARY.bankRecord.en);
  const contract = getById<Contract>(flag.recordIds[0])!;
  const statement = getById<Statement>(flag.recordIds[1])!;
  await expect(refs).toContainText(formatBps(contract.commissionBps));
  await expect(refs).toContainText(formatCents(statement.totalNetCents));
  // No answer shows a chart, so no chart test ID is on screen.
  await expect(page.getByTestId("ask-cindy-chart")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 3: the language toggle switches the shown answer without asking again", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  await page.getByTestId("ask-cindy-suggestion-1").click();
  const answer = page.getByTestId("ask-cindy-answer");
  await expect(answer).toContainText(ask01.answer.en, { timeout: ANSWER_TIMEOUT });
  const asked = await countAsked(page);

  // The toggle cycles auto, en, zh. The studio starts in English, so two clicks give Chinese.
  const toggle = page.getByTestId("demo-lang-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-lang", "en");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-lang", "zh");
  await expect(answer).toContainText(ask01.answer.zh);
  await expect(answer).not.toContainText(ask01.answer.en);
  await expect(page.getByTestId("ask-cindy-chart")).toContainText(ask01.chart!.title.zh);
  await expect(page.getByTestId("ask-cindy-refs")).toContainText(GLOSSARY.piece.zh);

  // Back to English.
  await toggle.click();
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-lang", "en");
  await expect(answer).toContainText(ask01.answer.en);

  expect(await countAsked(page)).toBe(asked);
  watch.expectClean();
});
