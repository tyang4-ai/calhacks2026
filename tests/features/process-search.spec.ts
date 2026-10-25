// F-process T2: the search view. Acceptance 6, and the map's waiting line before any search.mapped.
import { expect, test, type Page } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { demoSearch, demoSurprise, modelId, report } from "../../src/mock/index";
import { ENGINE_LABELS, SEARCH } from "../../src/features/process/strings";
import { emitAtClock, mappedPayload, open, seekToEvent, timelineHas, watchPage } from "./process-lib";

/** Brings the store to the tour's search.mapped: sought when the tour carries it, else emitted from src/mock/. */
async function toSearchMapped(page: Page): Promise<{ answer: Payloads["search.answered"]; mapped: Payloads["search.mapped"] }> {
  if (await timelineHas(page, "search.mapped")) {
    await seekToEvent(page, "search.mapped", {}, 300);
    return page.evaluate(() => {
      const s = window.__cindia!.store.getState() as unknown as { search: { answers: Record<string, Payloads["search.answered"]>; maps: Record<string, Payloads["search.mapped"]> } };
      return { answer: Object.values(s.search.answers).at(-1)!, mapped: Object.values(s.search.maps).at(-1)! };
    });
  }
  await seekToEvent(page, "beat.started", {}, 0);
  const answer: Payloads["search.answered"] = { ...demoSearch.answer, queryId: "qry_01" };
  const mapped = mappedPayload("qry_01", modelId);
  await emitAtClock(page, [
    { type: "search.queried", payload: { ...demoSearch.query, queryId: "qry_01" } },
    { type: "search.answered", payload: answer, key: "b12-search" },
    { type: "search.mapped", payload: mapped, key: "b11-embed" },
  ]);
  return { answer, mapped };
}

test("before any search.mapped the map keeps its test ID and shows the waiting line", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=search");
  const map = page.getByTestId("process-search-map");
  await expect(page.getByTestId("process-view").getByTestId("process-pane-search")).toBeVisible();
  await expect(map).toBeVisible();
  await expect(map.getByTestId("process-empty")).toBeVisible();
  if (report === null) await expect(map.getByTestId("process-empty")).toHaveText(SEARCH.notTrained.en);
  await expect(page.getByTestId("process-search-surprise")).toHaveCount(0);
  watch.expectClean();
});

test("the map draws one point per piece in the payload and the query star, and the scores list six results with the engine", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=search");
  const { answer, mapped } = await toSearchMapped(page);
  const map = page.getByTestId("process-search-map");
  await expect(map.locator("[data-point-id]")).toHaveCount(mapped.points.length);
  await expect(map.locator('[data-role="query"]')).toHaveCount(1);
  const top = answer.results.slice(0, 6);
  await expect(map.locator("[data-link-to]")).toHaveCount(top.filter((r) => mapped.points.some((p) => p.pieceId === r.pieceId)).length);

  const scores = page.getByTestId("process-search-scores");
  const rows = scores.locator("[data-piece-id]");
  await expect(rows).toHaveCount(6);
  expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-id")))).toEqual(top.map((r) => r.pieceId));
  expect(await rows.evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-score"))))).toEqual(top.map((r) => r.score));
  for (const [i, r] of top.entries()) await expect(rows.nth(i)).toContainText(r.score.toFixed(2));
  await expect(scores).toContainText(ENGINE_LABELS[answer.engine].en);
  await expect(scores).toContainText(answer.modelId ?? mapped.modelId);
  watch.expectClean();
});

test("Surprise me lists every candidate with its weight, the weights sum to 1, and the drawn piece reads Drawn", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=search");
  let draw: Payloads["surprise.drawn"];
  if (await timelineHas(page, "surprise.drawn")) {
    await seekToEvent(page, "surprise.drawn", {}, 300);
    draw = await page.evaluate(() => {
      const s = window.__cindia!.store.getState() as unknown as { surprise: { draws: Record<string, Payloads["surprise.drawn"]> } };
      return Object.values(s.surprise.draws).at(-1)!;
    });
  } else {
    await seekToEvent(page, "beat.started", {}, 0);
    draw = { ...demoSurprise.draw, surpriseId: "srp_01" };
    await emitAtClock(page, [
      { type: "surprise.asked", payload: { ...demoSurprise.ask, surpriseId: "srp_01" } },
      { type: "surprise.drawn", payload: draw, key: "b12-search" },
    ]);
  }
  const list = page.getByTestId("process-search-surprise");
  const rows = list.locator("[data-piece-id]");
  await expect(rows).toHaveCount(draw.candidates.length);
  expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-id")))).toEqual(draw.candidates.map((c) => c.pieceId));
  const weights = await rows.evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-weight"))));
  expect(Math.abs(weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(0.003);
  const drawn = list.locator("[data-drawn]");
  await expect(drawn).toHaveCount(1);
  await expect(drawn).toHaveAttribute("data-piece-id", draw.pieceId);
  await expect(drawn).toContainText(SEARCH.drawn.en);
  watch.expectClean();
});
