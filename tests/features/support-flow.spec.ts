// F-support T5: the assembled drawer, end to end.
// - A person asks from the piece page's side panel, the drawer opens, the agents take turns and the
//   reply lands in the drawer, in view, with its agent and records, and its preview in the panel.
// - Acceptance 6: every buyer suggestion, each in a new conversation, gets its own run's reply and
//   never the fallback (D1-17).
// Selects by test ID only. Expected values come from src/mock/.
import { expect, test } from "@playwright/test";
import { getAgent } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { ANSWER_TIMEOUT, BUYER_QUESTIONS, FALLBACK_REPLY, drawer, openPage, replyOf, runFor, sidePanel, storeState, userAsks } from "./support-lib";

test("asking from the piece page opens the drawer, the agents take turns, and the reply lands in view", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01");
  await expect(drawer(page)).toHaveCount(0);
  await sidePanel(page).getByTestId("support-piece-suggest-1").click();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).getByTestId("support-records-note")).toBeVisible();
  await expect(drawer(page).getByTestId("support-msg-1")).toContainText(BUYER_QUESTIONS[0].en);
  await expect(drawer(page).getByTestId("support-working")).toBeVisible({ timeout: ANSWER_TIMEOUT });

  const run = runFor(BUYER_QUESTIONS[0], "buyer", ["pc_01"]);
  const answer = replyOf(run);
  const reply = drawer(page).getByTestId("support-reply");
  await expect(reply).toContainText(answer.reply.en, { timeout: ANSWER_TIMEOUT });
  await expect(drawer(page).getByTestId("support-agent")).toHaveText(getAgent(answer.agentId)!.name.en);
  await expect(drawer(page).getByTestId("support-refs").locator('a[href="/shop/piece/pc_01"]')).toHaveCount(1);
  await expect(drawer(page).getByTestId("support-working")).toHaveCount(0);
  await expect(drawer(page).getByTestId("support-steps")).toBeVisible();
  await expect(reply).toBeInViewport();

  // The drawer fits the kit's 440 px width, and the side panel previews the same reply.
  const box = await drawer(page).boundingBox();
  expect(box!.width).toBeLessThanOrEqual(440);
  expect(await sidePanel(page).textContent()).toContain(answer.reply.en);

  // A follow-up stays on the same thread.
  const before = await userAsks(page);
  await drawer(page).getByTestId("support-input").fill("Thanks. Is it one of a kind?");
  await drawer(page).getByTestId("support-send").click();
  const after = await userAsks(page);
  expect(after).toHaveLength(2);
  expect(after[1].threadId).toBe(before[0].threadId);
  await expect(drawer(page).getByTestId("support-reply")).toContainText(FALLBACK_REPLY.en, { timeout: ANSWER_TIMEOUT });
  watch.expectClean();
});

test("6: each buyer suggestion, in a new conversation, gets its own run's reply and never the fallback", async ({ page }) => {
  test.setTimeout(120_000);
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01");
  const threads: string[] = [];
  for (const [i, q] of BUYER_QUESTIONS.entries()) {
    if (i === 0) {
      await sidePanel(page).getByTestId("support-piece-suggest-1").click();
    } else {
      await drawer(page).getByTestId("support-new").click();
      await expect(drawer(page).getByTestId("support-msg-1")).toHaveCount(0);
      await drawer(page).getByTestId(`support-suggest-${i + 1}`).click();
    }
    const run = runFor(q, "buyer", ["pc_01"]);
    expect(run.trigger.kind, `suggestion ${i + 1} has its own run`).toBe("support");
    const answer = replyOf(run).reply.en;
    expect(answer).not.toBe(FALLBACK_REPLY.en);
    await expect(drawer(page).getByTestId("support-reply")).toContainText(answer, { timeout: ANSWER_TIMEOUT });
    await expect(drawer(page).getByTestId("support-msg-1")).toContainText(q.en);
    const asks = await userAsks(page);
    threads.push(asks[asks.length - 1].threadId);
    // Wait for the run's last event before the next conversation (run_07 ends with its forward).
    await expect.poll(async () => {
      const s = await storeState(page);
      return s.swarm.runIds.every((id) => s.swarm.runs[id].done);
    }).toBe(true);
    if (run.final.some((f) => f.type === "question.forwarded")) {
      await expect.poll(async () => Object.keys((await storeState(page)).support.questions).length, { timeout: ANSWER_TIMEOUT }).toBe(1);
    }
  }
  expect(new Set(threads).size).toBe(BUYER_QUESTIONS.length);
  watch.expectClean();
});
