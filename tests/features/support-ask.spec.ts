// F-support T2: asking, the composer and the suggestions.
// Acceptance 8 (a typed question no run matches gets the fallback), 11 (the Sell drawer on a maker
// page: L11, the seller's suggestions, and the run that names mkr_01 answering only on her page),
// 12 (the Simulated badge, and L12 only in live mode) and 14 (Send waits while a run works).
// Selects by test ID only. Asks only after any seek.
import { expect, test } from "@playwright/test";
import { L11, L12 } from "../../src/features/support/strings";
import { watchPage } from "../smoke/lib";
import { ANSWER_TIMEOUT, FALLBACK_REPLY, SELLER_QUESTIONS, drawer, openPage, replyOf, runFor, sidePanel, storeState, userAsks } from "./support-lib";

test("8: a typed question no demo run matches gets the fallback reply", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01?drawer=support");
  await drawer(page).getByTestId("support-input").fill("Do you gift wrap, and can I add a note in Spanish?");
  await drawer(page).getByTestId("support-send").click();
  await expect(drawer(page).getByTestId("support-input")).toHaveValue("");
  const asks = await userAsks(page);
  expect(asks).toHaveLength(1);
  expect(asks[0]).toMatchObject({ source: "user", side: "buyer", lang: "en", contextIds: ["pc_01"] });
  expect(asks[0].threadId).toMatch(/^thr_user_\d+$/);
  await expect(drawer(page).getByTestId("support-reply")).toContainText(FALLBACK_REPLY.en, { timeout: ANSWER_TIMEOUT });
  // The fallback says what scripted mode answers and that Live asks the swarm anything.
  expect(FALLBACK_REPLY.en).toMatch(/scripted answers cover/);
  expect(FALLBACK_REPLY.en).toMatch(/Switch to Live/);
  watch.expectClean();
});

test("11: on Grace N.'s page the Sell drawer offers the seller's questions, and her own run answers", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/maker/mkr_01?drawer=support");
  await expect(drawer(page).getByTestId("support-records-note")).toHaveText(L11.en);
  for (const [i, q] of SELLER_QUESTIONS.entries()) await expect(drawer(page).getByTestId(`support-suggest-${i + 1}`)).toHaveText(q.en);
  await expect(drawer(page).getByTestId(`support-suggest-${SELLER_QUESTIONS.length + 1}`)).toHaveCount(0);

  await drawer(page).getByTestId("support-suggest-1").click();
  const asks = await userAsks(page);
  expect(asks).toHaveLength(1);
  expect(asks[0].side).toBe("seller");
  expect(asks[0].contextIds).toContain("mkr_01");
  const run = runFor(SELLER_QUESTIONS[0], "seller", ["mkr_01"]);
  expect(run.trigger.kind === "support" && run.trigger.makerId).toBe("mkr_01");
  await expect(drawer(page).getByTestId("support-reply")).toContainText(replyOf(run).reply.en, { timeout: ANSWER_TIMEOUT });
  watch.expectClean();
});

for (const path of ["/maker/mkr_02?drawer=support", "/sell/overview?drawer=support"]) {
  test(`11: away from Grace N.'s page (${path}) the same seller question gets the fallback`, async ({ page }) => {
    const watch = watchPage(page);
    await openPage(page, path);
    await drawer(page).getByTestId("support-suggest-1").click();
    const asks = await userAsks(page);
    expect(asks[0].side).toBe("seller");
    expect(asks[0].contextIds).not.toContain("mkr_01");
    await expect(drawer(page).getByTestId("support-reply")).toContainText(FALLBACK_REPLY.en, { timeout: ANSWER_TIMEOUT });
    watch.expectClean();
  });
}

test("12: scripted mode shows the Simulated badge on both drawers and no live note; Live shows L12 under the input", async ({ page }) => {
  await openPage(page, "/shop/piece/pc_01?drawer=support");
  await expect(drawer(page).getByTestId("simulated-badge")).toBeVisible();
  await expect(drawer(page).getByTestId("support-live-note")).toHaveCount(0);

  await openPage(page, "/maker/mkr_01?drawer=support");
  await expect(drawer(page).getByTestId("simulated-badge")).toBeVisible();
  await expect(drawer(page).getByTestId("support-live-note")).toHaveCount(0);

  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  const note = drawer(page).getByTestId("support-live-note");
  await expect(note).toHaveText(L12.en);
  const inputBox = await drawer(page).getByTestId("support-input").boundingBox();
  const noteBox = await note.boundingBox();
  expect(noteBox!.y).toBeGreaterThan(inputBox!.y);
});

test("14: while a run works, Send doesn't emit a second support.asked", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01");
  await sidePanel(page).getByTestId("support-piece-suggest-1").click();
  await expect(drawer(page)).toBeVisible();
  const send = drawer(page).getByTestId("support-send");
  const input = drawer(page).getByTestId("support-input");
  await input.fill("And can you gift wrap it?");
  await expect(send).toBeDisabled();
  await input.press("Enter");
  await send.click({ force: true });
  await drawer(page).getByTestId("support-suggest-2").click({ force: true });
  expect(await userAsks(page)).toHaveLength(1);

  // Once the run is done, Send works again.
  await expect(drawer(page).getByTestId("support-reply")).toBeVisible({ timeout: ANSWER_TIMEOUT });
  await expect.poll(async () => {
    const s = await storeState(page);
    return s.swarm.runIds.every((id) => s.swarm.runs[id].done);
  }).toBe(true);
  expect(await userAsks(page)).toHaveLength(1);
  await expect(send).toBeEnabled();
  watch.expectClean();
});
