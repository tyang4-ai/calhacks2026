// F-search T4: Surprise me. Acceptance 11 (the tour's fair draw of figure 12, its method and rule,
// and no weight anywhere on the page), 12 (pure random pressed twice: seeds 1 and 2, no keyword),
// keyword mode, and 15 (English only: the rule line in English, no Chinese).
import { expect, test } from "@playwright/test";
import { demoSurprise, pieces } from "../../src/mock/index";
import { SURPRISE_METHOD_NAMES, SURPRISE_RULES } from "../../src/features/search/strings";
import { watchPage } from "../smoke/lib";
import { openPage, searchState, slot, tourAnswered, tourDrawn } from "./search-lib";

const titleOf = (id: string) => pieces.find((p) => p.id === id)?.title ?? { en: "", zh: "" };

/** The person's own surprise asks, oldest first by their srp_user_ number. */
async function userAsks(page: import("@playwright/test").Page) {
  const { surprise } = await searchState(page);
  return Object.values(surprise.asks)
    .filter((a) => a.surpriseId.startsWith("srp_user_"))
    .toSorted((a, b) => Number(a.surpriseId.slice(9)) - Number(b.surpriseId.slice(9)));
}

test("11: the tour's fair draw shows figure 12's piece, names fair random, gives the fair rule and shows no weight", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  await tourDrawn(page);
  const view = slot(page, "shop.search.main");
  const result = view.getByTestId("search-surprise-result");
  expect(demoSurprise.draw.method).toBe("fair_random");
  await expect(result).toContainText(titleOf(demoSurprise.draw.pieceId).en);
  await expect(result).toContainText(SURPRISE_METHOD_NAMES.fair_random.en);
  await expect(view.getByTestId("search-surprise-rule")).toHaveText(SURPRISE_RULES.fair_random.en);
  await expect(view.getByTestId("search-surprise")).toBeVisible();
  // No candidate's weight shows anywhere on the page (A2-17).
  const text = (await page.locator("body").textContent()) ?? "";
  for (const c of demoSurprise.draw.candidates) {
    for (const shown of [c.weight.toFixed(4), c.weight.toFixed(3), `${(c.weight * 100).toFixed(1)}%`, `${Math.round(c.weight * 100)}%`]) {
      expect(text, `weight ${shown} of ${c.pieceId}`).not.toContain(shown);
    }
  }
  watch.expectClean();
});

test("12: pure random pressed twice sends seeds 1 and 2 with no keyword, and names pure random", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop");
  const home = slot(page, "shop.home.main");
  await home.getByTestId("search-surprise-mode").locator('input[value="pure_random"]').check();
  await expect(home.getByTestId("search-surprise-rule")).toHaveText(SURPRISE_RULES.pure_random.en);
  await home.getByTestId("search-surprise").click();
  await expect.poll(async () => (await userAsks(page)).length).toBe(1);
  await home.getByTestId("search-surprise").click();
  await expect.poll(async () => (await userAsks(page)).length).toBe(2);
  const asks = await userAsks(page);
  expect(asks.map((a) => a.seed)).toEqual([1, 2]);
  for (const a of asks) {
    expect(a.method).toBe("pure_random");
    expect(a.keyword).toBeUndefined();
  }
  await expect.poll(async () => Boolean((await searchState(page)).surprise.draws[asks[1].surpriseId])).toBe(true);
  const draw = (await searchState(page)).surprise.draws[asks[1].surpriseId];
  const result = home.getByTestId("search-surprise-result");
  await expect(result).toContainText(titleOf(draw.pieceId).en);
  await expect(result).toContainText(SURPRISE_METHOD_NAMES.pure_random.en);
  await expect(home.getByTestId("search-surprise-rule")).toHaveText(SURPRISE_RULES.pure_random.en);
  watch.expectClean();
});

test("keyword mode sends the typed keyword, starting from the latest query's first chip", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  await view.getByTestId("search-surprise-mode").locator('input[value="keyword_random"]').check();
  const box = view.getByTestId("search-surprise-keyword");
  const { search } = await searchState(page);
  await expect(box).toHaveValue(search.queries.qry_01.keywords[0]);
  await box.fill("geometric");
  await view.getByTestId("search-surprise").click();
  await expect.poll(async () => (await userAsks(page)).length).toBe(1);
  const [ask] = await userAsks(page);
  expect(ask).toMatchObject({ method: "keyword_random", keyword: "geometric", seed: 1 });
  await expect(view.getByTestId("search-surprise-result")).toContainText(SURPRISE_METHOD_NAMES.keyword_random.en);
  await expect(view.getByTestId("search-surprise-rule")).toHaveText(SURPRISE_RULES.keyword_random.en);
});

test("fair random is the default, with its rule before any draw", async ({ page }) => {
  await openPage(page, "/shop");
  const home = slot(page, "shop.home.main");
  await expect(home.getByTestId("search-surprise-mode").locator('input[value="fair_random"]')).toBeChecked();
  await expect(home.getByTestId("search-surprise-rule")).toHaveText(SURPRISE_RULES.fair_random.en);
  await expect(home.getByTestId("search-surprise-keyword")).toHaveCount(0);
  await expect(home.getByTestId("search-surprise-result")).toHaveCount(0);
});

// English only (decisions.md, Oct 24 11:35 PM and 11:55 PM): the language toggle is gone, so the
// rule line, the method and the title are checked in English, with none of their Chinese on screen.
test("15: English only: the rule line and the method show their English text and none of their Chinese", async ({ page }) => {
  await openPage(page, "/shop/search");
  await expect(page.getByTestId("demo-lang-toggle")).toHaveCount(0);
  await tourAnswered(page);
  await tourDrawn(page);
  const view = slot(page, "shop.search.main");
  await expect(view.getByTestId("search-surprise-rule")).toHaveText(SURPRISE_RULES.fair_random.en);
  await expect(view.getByTestId("search-surprise-result")).toContainText(SURPRISE_METHOD_NAMES.fair_random.en);
  await expect(view.getByTestId("search-surprise-result")).toContainText(titleOf(demoSurprise.draw.pieceId).en);
  await expect(view.getByTestId("search-surprise-result")).not.toContainText(SURPRISE_METHOD_NAMES.fair_random.zh);
  await expect(view.getByTestId("search-surprise-result")).not.toContainText(titleOf(demoSurprise.draw.pieceId).zh);
});
