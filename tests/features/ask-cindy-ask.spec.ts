// F-ask-cindy T2: the drawer and the question box on /sell/close?drawer=ask after the close (M-desktop).
// Suggestions and typed questions emit ask.asked (source "user"), the registry answers 1.2 s later
// in real time, the fallback covers any other question, and the drawer is marked Simulated.
// The answer is a wall-clock timer that drops itself when the player's epoch changes, so the player
// is paused and seeked before any click, never after. Selects by test ID only.
import { expect, test, type Page } from "@playwright/test";
import { cannedAnswers, fallbackAnswer } from "../../src/mock/index";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";
import { SELL_VIEWPORT, timelineAt, storeModuleUrl } from "./sell-views-lib";

// M-desktop: the ask drawer on /sell/close?drawer=ask at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

interface AskSlice {
  questionIds: string[];
  questions: Record<string, { questionId: string; text: string; lang: string }>;
  answers: Record<string, { questionId: string; answer: { en: string; zh: string } }>;
  latestQuestionId: string | null;
}

interface LoggedEvent {
  type: string;
  source: string;
  key?: string;
  payload: { questionId?: string };
}

declare global {
  interface Window {
    cindiaAskLog?: LoggedEvent[];
  }
}

const ANSWER_TIMEOUT = 5000;
const askState = (page: Page) => page.evaluate(() => window.__cindia!.store.getState().ask as unknown as AskSlice);
const drawer = (page: Page) => page.locator('[data-slot="studio.drawer.ask"]');

async function openAfterClose(page: Page) {
  await page.goto("/sell/close?drawer=ask");
  await waitForHooks(page);
  await waitForSlots(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(p.durationMs());
  });
  await expect(drawer(page).getByTestId("ask-cindy-input")).toBeVisible();
}

/** Logs every event the store takes in, through the same store module the app uses (dev server). */
async function startEventLog(page: Page) {
  // The page's own store module, even after the dev server hot-updated it (sell-views-lib).
  const storeUrl = await storeModuleUrl(page);
  await page.evaluate(async (path) => {
    const mod = (await import(/* @vite-ignore */ path)) as {
      onEvent(l: (e: LoggedEvent) => void): () => void;
      getState(): unknown;
    };
    if (mod.getState() !== window.__cindia!.store.getState()) throw new Error("imported a second store instance");
    window.cindiaAskLog = [];
    mod.onEvent((e) => window.cindiaAskLog!.push({ type: e.type, source: e.source, key: e.key, payload: { questionId: e.payload.questionId } }));
  }, storeUrl);
}

test("scripted mode: the ask drawer shows the Simulated badge and three suggestions", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b07-ask"]).toBe("scripted");
  await expect(drawer(page).getByTestId("simulated-badge")).toBeVisible();
  for (const [i, a] of cannedAnswers.entries()) {
    await expect(drawer(page).getByTestId(`ask-cindy-suggestion-${i + 1}`)).toHaveText(a.questions.en);
  }
  watch.expectClean();
});

test("suggestion 1: thinking shows, then about 1.2 s later the canned answer replaces it", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  expect(await page.evaluate(() => window.__cindia!.player.now())).toBeGreaterThanOrEqual((await timelineAt(page, "month.closed"))!);
  await startEventLog(page);

  const started = Date.now();
  await drawer(page).getByTestId("ask-cindy-suggestion-1").click();
  await expect(drawer(page).getByTestId("ask-cindy-thinking")).toBeVisible();
  await expect(drawer(page).getByTestId("ask-cindy-answer")).toHaveCount(0);

  await expect(drawer(page).getByTestId("ask-cindy-answer")).toBeVisible({ timeout: ANSWER_TIMEOUT });
  expect(Date.now() - started).toBeGreaterThanOrEqual(1000);
  await expect(drawer(page).getByTestId("ask-cindy-thinking")).toHaveCount(0);
  await expect(drawer(page).getByTestId("ask-cindy-answer")).toContainText(cannedAnswers[0].answer.en);

  const ask = await askState(page);
  expect(ask.questionIds).toEqual(["ask_01"]);
  expect(ask.questions.ask_01).toMatchObject({ questionId: "ask_01", text: cannedAnswers[0].questions.en, lang: "en" });

  // The store took one ask.asked from the person and exactly one ask.answered for it.
  const log = await page.evaluate(() => window.cindiaAskLog!);
  const asked = log.filter((e) => e.type === "ask.asked");
  expect(asked).toHaveLength(1);
  expect(asked[0]).toMatchObject({ source: "user", payload: { questionId: "ask_01" } });
  expect(asked[0].key).toBeUndefined();
  expect(log.filter((e) => e.type === "ask.answered" && e.payload.questionId === "ask_01")).toHaveLength(1);
  watch.expectClean();
});

test("a question that matches none of the three gets the fallback, and the suggestions stay", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  await startEventLog(page);

  const input = drawer(page).getByTestId("ask-cindy-input");
  // Empty text doesn't send.
  await input.fill("   ");
  await input.press("Enter");
  await expect(drawer(page).getByTestId("ask-cindy-thinking")).toHaveCount(0);
  expect((await askState(page)).questionIds).toEqual([]);

  // Enter sends a typed question as ask_user_1, shown as asked.
  const question = "What's the weather in Denver?";
  await input.fill(question);
  await input.press("Enter");
  await expect(input).toHaveValue("");
  await expect(drawer(page).getByTestId("ask-cindy-thinking")).toBeVisible();
  await expect(drawer(page)).toContainText(question);
  await expect(drawer(page).getByTestId("ask-cindy-answer")).toContainText(fallbackAnswer.en, { timeout: ANSWER_TIMEOUT });
  await expect(drawer(page).getByTestId("ask-cindy-thinking")).toHaveCount(0);
  for (const n of [1, 2, 3]) await expect(drawer(page).getByTestId(`ask-cindy-suggestion-${n}`)).toBeVisible();

  const ask = await askState(page);
  expect(ask.questionIds).toEqual(["ask_user_1"]);
  expect(ask.questions.ask_user_1).toMatchObject({ text: question, lang: "en" });

  const log = await page.evaluate(() => window.cindiaAskLog!);
  expect(log.filter((e) => e.type === "ask.asked")).toEqual([
    expect.objectContaining({ source: "user", payload: { questionId: "ask_user_1" } }),
  ]);
  expect(log.filter((e) => e.type === "ask.answered" && e.payload.questionId === "ask_user_1")).toHaveLength(1);

  // The send button sends the next typed question as ask_user_2.
  await input.fill("Is it raining?");
  await drawer(page).getByTestId("ask-cindy-send").click();
  await expect(drawer(page).getByTestId("ask-cindy-answer")).toBeVisible({ timeout: ANSWER_TIMEOUT });
  await expect(drawer(page).getByTestId("ask-cindy-thinking")).toHaveCount(0);
  expect((await askState(page)).questionIds).toEqual(["ask_user_1", "ask_user_2"]);
  watch.expectClean();
});

test("clicking the same suggestion twice re-shows its answer without getting stuck", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  const second = drawer(page).getByTestId("ask-cindy-suggestion-2");
  await second.click();
  await expect(drawer(page).getByTestId("ask-cindy-answer")).toContainText(cannedAnswers[1].answer.en, { timeout: ANSWER_TIMEOUT });

  await drawer(page).getByTestId("ask-cindy-suggestion-3").click();
  await expect(drawer(page).getByTestId("ask-cindy-answer")).toContainText(cannedAnswers[2].answer.en, { timeout: ANSWER_TIMEOUT });

  await second.click();
  await expect(drawer(page).getByTestId("ask-cindy-thinking")).toHaveCount(0);
  await expect(drawer(page).getByTestId("ask-cindy-answer")).toHaveCount(1);
  await expect(drawer(page).getByTestId("ask-cindy-answer")).toContainText(cannedAnswers[1].answer.en);
  expect((await askState(page)).questionIds).toEqual(["ask_02", "ask_03"]);
  watch.expectClean();
});
