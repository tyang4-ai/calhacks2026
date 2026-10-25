// F-ask-cindy T1: the answer view. A suggestion's answer draws its chart, a typed question about the
// gallery payment lists the flag's three records, and the answer reads in English without asking
// again (English only since 11:35 PM). On M-desktop's /sell/close?drawer=ask at 1440 by 900, every
// screen's text is at least 14 px, never cut or clipped. Selects by test ID only.
import { expect, test, type Page } from "@playwright/test";
import { cannedAnswers, getById } from "../../src/mock/index";
import type { Contract, Flag, Statement } from "../../src/core/types";
import { formatBps, formatCents } from "../../src/ui/formatCents";
import { GLOSSARY } from "../../src/features/ask-cindy/strings";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";
import { SELL_VIEWPORT, drawerFit, expectReadableText, scrollsSideways } from "./sell-views-lib";

// M-desktop: the ask drawer on /sell/close?drawer=ask at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

const ANSWER_TIMEOUT = 10000;
const ask01 = cannedAnswers.find((a) => a.questionId === "ask_01")!;
const ask02 = cannedAnswers.find((a) => a.questionId === "ask_02")!;
const flag = getById<Flag>("flg_01")!;

/** Opens the drawer and moves the player past the close, before any question is sent. */
async function openAfterClose(page: Page) {
  await page.goto("/sell/close?drawer=ask");
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

// Acceptance 3 was the language toggle switching the shown answer. Gordon's decision of 11:35 PM
// (docs/harness/decisions.md) makes the site English only and hides the toggle, so the same answer
// is checked in English: its text, its chart and its references, and showing them asks nothing again.
test("Acceptance 3 (English only): the answer, its chart and its references read in English without asking again", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  await page.getByTestId("ask-cindy-suggestion-1").click();
  const answer = page.getByTestId("ask-cindy-answer");
  await expect(answer).toContainText(ask01.answer.en, { timeout: ANSWER_TIMEOUT });
  const asked = await countAsked(page);
  await expect(page.getByTestId("ask-cindy-chart")).toContainText(ask01.chart!.title.en);
  await expect(page.getByTestId("ask-cindy-refs")).toContainText(GLOSSARY.piece.en);
  expect(await countAsked(page)).toBe(asked);
  watch.expectClean();
});

test("M-desktop acceptance 7: the first suggestion's answer and chart fit the drawer with no sideways scroll", async ({ page }) => {
  const watch = watchPage(page);
  await openAfterClose(page);
  await page.getByTestId("ask-cindy-suggestion-1").click();
  await expect(page.getByTestId("ask-cindy-answer")).toContainText(ask01.answer.en, { timeout: ANSWER_TIMEOUT });
  await expect(page.getByTestId("ask-cindy-chart")).toBeVisible();
  // The drawer is the kit's width from the shell (440 px at the frame's right edge), never one the feature sets.
  const fit = await drawerFit(page, "studio.drawer.ask");
  const right = fit.frame.x + fit.frame.width;
  expect(fit.slot.x, "the ask slot sits in the drawer's 440 px").toBeGreaterThanOrEqual(right - 440 - 1);
  expect(fit.slot.x + fit.slot.width).toBeLessThanOrEqual(right + 1);
  for (const id of ["ask-cindy-answer", "ask-cindy-chart"]) {
    const b = (await page.getByTestId(id).boundingBox())!;
    expect(b.x, `${id} left edge inside the slot`).toBeGreaterThanOrEqual(fit.slot.x - 1);
    expect(b.x + b.width, `${id} right edge inside the slot`).toBeLessThanOrEqual(fit.slot.x + fit.slot.width + 1);
  }
  expect(fit.scroller, "the drawer body scrolls").not.toBeNull();
  expect(fit.scroller!.scrollWidth, "the drawer body never scrolls sideways").toBeLessThanOrEqual(fit.scroller!.clientWidth + 1);
  expect(await scrollsSideways(page.getByTestId("ask-cindy-chart")), "the chart scrolls sideways").toBe(false);
  // The page itself never scrolls: long answers scroll inside the drawer body.
  expect(fit.pageScrolls).toBe(false);
  // The drawer shows the new answer down to its chart's axis without a scroll by the viewer: the
  // chart's plot (its svg) sits inside the drawer body's visible part.
  const axisInside = await page.getByTestId("ask-cindy-chart").evaluate((fig) => {
    const svg = fig.querySelector("svg");
    let scroller = fig.parentElement;
    while (scroller && !["auto", "scroll"].includes(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    if (!svg || !scroller) return false;
    const a = svg.getBoundingClientRect();
    const b = scroller.getBoundingClientRect();
    return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
  });
  expect(axisInside, "the chart's axis shows inside the drawer").toBe(true);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.drawer.ask"]');
  watch.expectClean();
});
