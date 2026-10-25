// F-process T6: the proof, watch and model views. Acceptance 13, the planted errors, and the watch's
// chain and every checked result.
import { expect, test } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { counterfeitCandidates, modelId, report, scriptedScan } from "../../src/mock/index";
import { PROOF, VERDICT_LABELS } from "../../src/features/process/strings";
import { emitAtClock, expectStatus, glossaryLabel, open, seekToEvent, timelineHas, watchPage } from "./process-lib";

/** The model's events: the real report's when src/mock/model.ts has one, else a test payload of the same shape. */
const trained: Payloads["model.trained"] = report?.trained ?? { modelId, baseModel: "intfloat/multilingual-e5-small", pairs: 1200, epochs: 3, dims: 384 };
const scored: Payloads["proof.search_scored"] = report?.scored ?? {
  modelId,
  k: 5,
  queries: 50,
  systems: [
    { system: "keyword", recallAtK: 0.42, mrr: 0.38 },
    { system: "base", recallAtK: 0.55, mrr: 0.47 },
    { system: "custom", recallAtK: 0.71, mrr: 0.62 },
    { system: "hybrid", recallAtK: 0.76, mrr: 0.66 },
  ],
};

test("the model card says Not trained yet with no model.trained, then shows the training and the four systems with L28", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop?process=model");
  await seekToEvent(page, "beat.started", {}, 0);
  const card = page.getByTestId("process-model-card");
  await expect(card).toHaveAttribute("data-trained", "false");
  await expect(card).toContainText(PROOF.notTrained.en);
  await emitAtClock(page, [
    { type: "model.trained", payload: trained, key: "b11-embed" },
    { type: "proof.search_scored", payload: scored, key: "b11-embed" },
  ]);
  await expect(card).toHaveAttribute("data-trained", "true");
  await expect(card.locator('[data-field="baseModel"] [data-role="value"]')).toHaveText(trained.baseModel);
  await expect(card.locator('[data-field="pairs"] [data-role="value"]')).toHaveText(String(trained.pairs));
  await expect(card.locator('[data-field="epochs"] [data-role="value"]')).toHaveText(String(trained.epochs));
  await expect(card.locator('[data-field="dims"] [data-role="value"]')).toHaveText(String(trained.dims));
  await expect(card.locator("[data-system]")).toHaveCount(4);
  expect(await card.locator("[data-system]").evaluateAll((els) => els.map((e) => e.getAttribute("data-system")))).toEqual(scored.systems.map((s) => s.system));
  await expect(page.getByTestId("process-model-test-note")).toHaveText(glossaryLabel("L28").en);
  watch.expectClean();
});

test("proof lists each planted error from proof.scored and whether it was caught", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/proof?process=proof");
  await seekToEvent(page, "proof.scored", {}, 300);
  const score = await page.evaluate(() => (window.__cindia!.store.getState() as unknown as { proof: { score: Payloads["proof.scored"] } }).proof.score);
  const errors = page.getByTestId("process-proof-errors");
  await expect(errors.locator("[data-error-id]")).toHaveCount(score.results.length);
  for (const r of score.results) await expect(errors.locator(`[data-error-id="${r.errorId}"]`)).toHaveAttribute("data-caught", String(r.caught));
  await expect(errors).toContainText(`Caught ${score.caught} of ${score.total}`);
  const searchScored = await page.evaluate(() => (window.__cindia!.store.getState() as unknown as { model: { scored: unknown } }).model.scored);
  if (searchScored === null) await expect(page.getByTestId("process-proof-search")).toContainText(PROOF.notTrained.en);
  else await expect(page.getByTestId("process-proof-search").locator("[data-system]")).toHaveCount(4);
  watch.expectClean();
});

test("the watch runs search, compare, check the claim and propose a report, and lists every checked result", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/watch?process=watch");
  let results: Payloads["watch.scanned"]["results"];
  if (await timelineHas(page, "approval.requested", { approvalId: scriptedScan.approvalId })) {
    await seekToEvent(page, "approval.requested", { approvalId: scriptedScan.approvalId }, 300);
    results = await page.evaluate(() => {
      const s = window.__cindia!.store.getState() as unknown as { watch: { latestScanId: string; scans: Record<string, { results: Payloads["watch.scanned"]["results"] }> } };
      return s.watch.scans[s.watch.latestScanId].results;
    });
  } else {
    await seekToEvent(page, "beat.started", {}, 0);
    results = counterfeitCandidates.map((c) => ({ title: c.title, url: c.url, snippet: c.snippet, similarity: c.similarity, verdict: c.verdict }));
    const hits = counterfeitCandidates.filter((c) => scriptedScan.cftIds.includes(c.id));
    await emitAtClock(page, [
      { type: "watch.started", payload: { scanId: scriptedScan.scanId, makerId: scriptedScan.makerId, queries: scriptedScan.queries } },
      { type: "watch.scanned", payload: { scanId: scriptedScan.scanId, engine: "scripted", candidates: results.length, results }, key: "b15-watch" },
      ...hits.map((c) => ({
        type: "counterfeit.flagged" as const,
        payload: { cftId: c.id, scanId: scriptedScan.scanId, pieceId: c.pieceId, url: c.url, title: c.title, snippet: c.snippet, similarity: c.similarity, claim: c.claim },
        key: "b15-watch" as const,
      })),
      { type: "approval.requested", payload: { approvalId: scriptedScan.approvalId! }, key: "b08-approvals" },
    ]);
  }
  const chain = page.getByTestId("process-watch-chain");
  for (const step of ["search", "compare", "claim", "report"]) await expect(chain.locator(`[data-step="${step}"]`)).toHaveAttribute("data-lit", "true");
  for (const id of scriptedScan.cftIds) await expect(chain.locator(`[data-cft-id="${id}"]`)).toHaveCount(1);
  await expect(chain.locator(`[data-step="report"] [data-approval-id="${scriptedScan.approvalId}"]`)).toHaveAttribute("data-status", "pending");
  const list = page.getByTestId("process-watch-results").locator("[data-verdict]");
  await expect(list).toHaveCount(results.length);
  expect(await list.evaluateAll((els) => els.map((e) => e.getAttribute("data-verdict")))).toEqual(results.map((r) => r.verdict));
  for (const [i, r] of results.entries()) await expect(list.nth(i)).toContainText(VERDICT_LABELS[r.verdict].en);
  await expectStatus(page, "watch", "attention");
  watch.expectClean();
});
