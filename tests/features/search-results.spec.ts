// F-search T2: the results grid. Acceptance 2 (the tour's six results in order, reasons, prices,
// L3), 4 (a rule-based keyword match, no model line, the Simulated badge), 5 (the model line from a
// proof.search_scored payload only), 6 (source markers and the provenance note), 10 (the query a URL
// brings, once under StrictMode), 15 (reasons and markers in Chinese, amounts in dollars) and 16
// (closeness and "No close matches" only when the payload carries them).
import { expect, test } from "@playwright/test";
import { communities, demoSearch, pieces, searchIndex } from "../../src/mock/index";
import { ENGINES, MODEL_LINE, RESULTS, SOURCE_MARKERS } from "../../src/features/search/strings";
import { L3 } from "../../src/ui/strings";
import { watchPage } from "../smoke/lib";
import { emitTest, loggedEvents, openPage, searchState, slot, tourAnswered, userQueries } from "./search-lib";

const piece = (id: string) => {
  const p = pieces.find((x) => x.id === id);
  if (!p) throw new Error(`no piece ${id}`);
  return p;
};
const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** A four-system proof.search_scored test payload: custom above keyword unless `customBelow`. */
function scorePayload(customBelow = false) {
  return {
    modelId: "test-model-a",
    k: 5,
    queries: 37,
    systems: [
      { system: "keyword", recallAtK: 0.46, mrr: 0.41 },
      { system: "base", recallAtK: 0.52, mrr: 0.47 },
      { system: "custom", recallAtK: customBelow ? 0.33 : 0.81, mrr: 0.69 },
      { system: "hybrid", recallAtK: 0.84, mrr: 0.72 },
    ],
  };
}

/** The group a matched word comes from in a piece, and the provenance label it gets, as ResultCard finds it. */
function expectedMarker(pieceId: string, word: string, lang: "en" | "zh"): string | null {
  const p = piece(pieceId);
  const w = word.toLowerCase();
  const f = p.facets;
  const facts = [f.object.en, ...f.materials, ...f.techniques, ...f.motifs, ...f.colors].map((x) => x.toLowerCase());
  const vibe = [...p.vibe.moods, ...p.vibe.occasions, ...p.vibe.recipients].map((x) => x.toLowerCase());
  const craft = communities.find((c) => c.id === p.communityId)?.craft.en.toLowerCase() ?? "";
  const group = facts.includes(w) ? "facts" : vibe.includes(w) ? "vibe" : new RegExp(`\\b${w}\\b`).test(craft) ? "culture" : null;
  if (!group) return null;
  const source = searchIndex.find((e) => e.pieceId === pieceId)?.provenance[group];
  return source ? SOURCE_MARKERS[source][lang] : null;
}

test("2: the tour's answer shows figure 11's six results in order, each with its reason, at $200.00 or less, starting with L3", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const results = slot(page, "shop.search.main").getByTestId("search-results");
  const ids = demoSearch.answer.results.map((r) => r.pieceId);
  expect(ids[0]).toBe("pc_01");
  expect(ids).toHaveLength(6);
  await expect(results.getByTestId("search-result-pc_01")).toBeVisible();
  const order = await results.locator('[data-testid^="search-result-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(order).toEqual(ids.map((id) => `search-result-${id}`));
  for (const r of demoSearch.answer.results) {
    const card = results.getByTestId(`search-result-${r.pieceId}`);
    await expect(card.getByTestId(`search-reason-${r.pieceId}`)).toContainText(r.reason.en);
    const p = piece(r.pieceId);
    expect(p.priceCents).toBeLessThanOrEqual(20000);
    await expect(card).toContainText(dollars(p.priceCents));
    await expect(card.locator('[data-role="verification"]')).toHaveText(new RegExp(`^${L3.en}`));
    // The scripted answer carries no closeness and no closeMatches.
    await expect(card.getByTestId(`search-closeness-${r.pieceId}`)).toHaveCount(0);
  }
  await expect(page.getByTestId("search-no-close")).toHaveCount(0);
  watch.expectClean();
});

test("4: in scripted mode with no score, the engine is a rule-based keyword match, no model line, and both Shop panels show Simulated", async ({ page }) => {
  await openPage(page, "/shop");
  await expect(slot(page, "shop.home.main").getByTestId("simulated-badge")).toBeVisible();
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  await expect(view.getByTestId("simulated-badge")).toBeVisible();
  const engine = view.getByTestId("search-engine");
  await expect(engine).toContainText(ENGINES.keyword_scripted.en);
  await expect(engine).toContainText("rule-based keyword match");
  await expect(view.getByTestId("search-model-line")).toHaveCount(0);
  expect((await searchState(page)).model.scored).toBeNull();
});

test("5: a proof.search_scored puts the model line inside search-engine, with that payload's numbers and no other", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const better = scorePayload(false);
  await emitTest(page, "proof.search_scored", better, "b11-embed");
  const line = slot(page, "shop.search.main").getByTestId("search-engine").getByTestId("search-model-line");
  await expect(line).toBeVisible();
  await expect(line).toContainText("0.81");
  await expect(line).toContainText("0.46");
  await expect(line).toContainText("37");
  const numbers = ((await line.textContent()) ?? "").replace(better.modelId, "").match(/\d+(?:\.\d+)?/g) ?? [];
  expect(numbers.toSorted()).toEqual(["0.46", "0.81", "37", "5"].toSorted());
  expect(MODEL_LINE.better.en).toContain("{custom} against {keyword}");

  const worse = { ...scorePayload(true), modelId: "test-model-b" };
  await emitTest(page, "proof.search_scored", worse, "b11-embed");
  await expect(line).toContainText("keyword search scored higher");
  await expect(line).toContainText("0.33");
  await expect(line).toContainText("test-model-b");
});

test("6: each matched keyword of pc_01 names where it came from, and the provenance note shows under the grid", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const reason = slot(page, "shop.search.main").getByTestId("search-reason-pc_01");
  const result = demoSearch.answer.results.find((r) => r.pieceId === "pc_01")!;
  let marked = 0;
  for (const [i, word] of result.matched.entries()) {
    const label = expectedMarker("pc_01", word, "en");
    const marker = reason.getByTestId(`search-source-pc_01-${i + 1}`);
    if (label) {
      await expect(marker).toHaveText(label);
      marked += 1;
    } else {
      await expect(marker).toHaveCount(0);
    }
  }
  expect(marked).toBeGreaterThan(0);
  await expect(slot(page, "shop.search.main").getByTestId("search-provenance-note")).toHaveText(RESULTS.provenanceNote.en);
});

test("10: a shared link's query is emitted exactly once on a fresh store, under StrictMode", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/search?q=something%20calm&k=calm");
  await expect.poll(async () => (await userQueries(page)).length).toBe(1);
  const [query] = await userQueries(page);
  expect(query.text).toBe("something calm");
  expect(query.keywords).toEqual(["calm"]);
  // Its answer arrives, and still only one query was ever emitted.
  await expect.poll(async () => Boolean((await searchState(page)).search.answers[query.queryId])).toBe(true);
  await expect(slot(page, "shop.search.main").getByTestId("search-results")).toBeVisible();
  const logged = (await loggedEvents(page, "search.queried")).filter((e) => e.source === "user");
  expect(logged).toHaveLength(1);
  watch.expectClean();
});

test("15: in Chinese the reasons and source markers show their Chinese text, and amounts stay in dollars", async ({ page }) => {
  await openPage(page, "/shop/search");
  const toggle = page.getByTestId("demo-lang-toggle");
  await toggle.click();
  await toggle.click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("zh");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  const result = demoSearch.answer.results.find((r) => r.pieceId === "pc_01")!;
  await expect(view.getByTestId("search-reason-pc_01")).toContainText(result.reason.zh);
  const label = expectedMarker("pc_01", result.matched[0], "zh");
  if (label) await expect(view.getByTestId("search-source-pc_01-1")).toHaveText(label);
  await expect(view.getByTestId("search-result-pc_01")).toContainText(dollars(piece("pc_01").priceCents));
  await expect(view.getByTestId("search-result-pc_01").locator('[data-role="verification"]')).toHaveText(new RegExp(`^${L3.zh}`));
  await expect(view.getByTestId("search-engine")).toContainText(ENGINES.keyword_scripted.zh);
  await expect(view.getByTestId("search-provenance-note")).toHaveText(RESULTS.provenanceNote.zh);
});

test("16: closeness shows per result and 'No close matches' only when the payload carries them", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const results = demoSearch.answer.results.map((r, i) => ({ ...r, closeness: 0.42 - i * 0.03 }));
  await emitTest(page, "search.queried", { queryId: "qry_test_1", text: "zzz qqq", keywords: [], lang: "en" });
  await emitTest(page, "search.answered", { queryId: "qry_test_1", results, closeMatches: false, engine: "local_hybrid", modelId: "test-model-a" }, "b12-search");
  const view = slot(page, "shop.search.main");
  await expect(view.getByTestId("search-no-close")).toHaveText(RESULTS.noClose.en);
  for (const r of results) {
    await expect(view.getByTestId(`search-closeness-${r.pieceId}`)).toHaveAttribute("data-value", r.closeness.toFixed(2));
  }
  await expect(view.getByTestId("search-engine")).toContainText(ENGINES.local_hybrid.en);
  await expect(view.getByTestId("search-engine")).toContainText("test-model-a");
});
