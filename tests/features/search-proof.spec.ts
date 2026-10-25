// F-search T6: the search proof panel on Sell › Proof. Acceptance 14 ("Not trained yet" with no
// score and report null; with a four-system proof.search_scored, each row's recall and MRR, and L28
// with the payload's query count) and 15 (English only: the panel in English, no Chinese).
import { expect, test } from "@playwright/test";
import { pieces, report } from "../../src/mock/index";
import { L28, PROOF, SYSTEMS, l28 } from "../../src/features/search/strings";
import { watchPage } from "../smoke/lib";
import { emitTest, openPage, slot } from "./search-lib";

const SCORED = {
  modelId: "test-model-a",
  k: 5,
  queries: 50,
  systems: [
    { system: "keyword", recallAtK: 0.46, mrr: 0.41 },
    { system: "base", recallAtK: 0.52, mrr: 0.47 },
    { system: "custom", recallAtK: 0.81, mrr: 0.69 },
    { system: "hybrid", recallAtK: 0.84, mrr: 0.72 },
  ],
} as const;

const TRAINED = { modelId: "test-model-a", baseModel: "intfloat/multilingual-e5-small", pairs: 1080, epochs: 2, dims: 384 };

test("14: with no score it says Not trained yet; a four-system score shows every row's recall and MRR, and L28", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/sell/proof");
  const side = slot(page, "studio.proof.side");
  const panel = side.getByTestId("search-proof");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("simulated-badge")).toBeVisible();
  if (report === null) await expect(panel.getByTestId("search-proof-empty")).toHaveText(PROOF.empty.en);

  await emitTest(page, "proof.search_scored", { ...SCORED, systems: SCORED.systems.map((s) => ({ ...s })) }, "b11-embed");
  await expect(panel.getByTestId("search-proof-empty")).toHaveCount(0);
  for (const s of SCORED.systems) {
    const row = panel.getByTestId(`search-proof-row-${s.system}`);
    await expect(row).toContainText(SYSTEMS[s.system].en);
    await expect(row).toContainText(s.recallAtK.toFixed(2));
    await expect(row).toContainText(s.mrr.toFixed(2));
  }
  // The best row is marked with a word, whichever system it is.
  await expect(panel.getByTestId("search-proof-row-hybrid")).toContainText(PROOF.best.en);
  await expect(panel.getByTestId("search-proof-row-keyword")).not.toContainText(PROOF.best.en);
  await expect(panel.getByTestId("search-proof-note")).toHaveText(L28.en);
  expect(l28("en", SCORED.queries, pieces.length)).toBe(L28.en);
  await expect(panel).toContainText(SCORED.modelId);

  // A different query count comes from the payload.
  await emitTest(page, "proof.search_scored", { ...SCORED, queries: 44, systems: SCORED.systems.map((s) => ({ ...s })) }, "b11-embed");
  await expect(panel.getByTestId("search-proof-note")).toHaveText(l28("en", 44, pieces.length));

  // model.trained adds the base model, the pairs and the epochs.
  await emitTest(page, "model.trained", TRAINED, "b11-embed");
  await expect(panel).toContainText(TRAINED.baseModel);
  await expect(panel).toContainText(String(TRAINED.pairs));
  watch.expectClean();
});

// English only (decisions.md, Oct 24 11:35 PM and 11:55 PM): the language toggle is gone, so the
// panel and L28 are checked in English, with none of their Chinese text on screen.
test("15: English only: the proof panel shows its English text and L28 in English, none of it in Chinese", async ({ page }) => {
  await openPage(page, "/sell/proof");
  await expect(page.getByTestId("demo-lang-toggle")).toHaveCount(0);
  const panel = slot(page, "studio.proof.side").getByTestId("search-proof");
  await expect(panel).toContainText(PROOF.title.en);
  await expect(panel).not.toContainText(PROOF.title.zh);
  if (report === null) await expect(panel.getByTestId("search-proof-empty")).toHaveText(PROOF.empty.en);
  await emitTest(page, "proof.search_scored", { ...SCORED, systems: SCORED.systems.map((s) => ({ ...s })) }, "b11-embed");
  await expect(panel.getByTestId("search-proof-row-custom")).toContainText(SYSTEMS.custom.en);
  await expect(panel.getByTestId("search-proof-row-custom")).not.toContainText(SYSTEMS.custom.zh);
  await expect(panel.getByTestId("search-proof-note")).toHaveText(l28("en", SCORED.queries, pieces.length));
  await expect(panel.getByTestId("search-proof-note")).not.toContainText(L28.zh);
});
