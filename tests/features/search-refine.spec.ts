// F-search T3: refining on the results page. Acceptance 8 (removing a chip is a new query with a new
// answer), 9 (a $100 price cap), plus adding a keyword, a community toggle and a new text. Each
// change emits a new search.queried with a new queryId; the keyword scorer answers it.
import { expect, test, type Page } from "@playwright/test";
import { communities, demoSearch, pieces } from "../../src/mock/index";
import { watchPage } from "../smoke/lib";
import { openPage, searchState, slot, tourAnswered, userQueries } from "./search-lib";

const priceOf = (id: string) => pieces.find((p) => p.id === id)?.priceCents ?? Number.NaN;
const communityOf = (id: string) => pieces.find((p) => p.id === id)?.communityId;

/** Waits for the newest person's query and its answer, and for the grid to render that answer in order. */
async function newestAnswered(page: Page, count: number) {
  await expect.poll(async () => (await userQueries(page)).length).toBe(count);
  const query = (await userQueries(page)).at(-1)!;
  await expect.poll(async () => Boolean((await searchState(page)).search.answers[query.queryId])).toBe(true);
  const answer = (await searchState(page)).search.answers[query.queryId];
  const results = slot(page, "shop.search.main").getByTestId("search-results");
  await expect
    .poll(async () => results.locator('[data-testid^="search-result-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid"))))
    .toEqual(answer.results.map((r) => `search-result-${r.pieceId}`));
  return { query, answer };
}

test("the results page shows the tour query's text and its six chips, once each", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  await expect(view.getByTestId("search-input")).toHaveValue(demoSearch.query.text);
  for (const [i, word] of demoSearch.query.keywords.entries()) {
    await expect(view.getByTestId(`search-chip-${i + 1}`)).toHaveCount(1);
    await expect(view.getByTestId(`search-chip-${i + 1}`)).toHaveText(word);
  }
  await expect(view.getByTestId("search-filter-price")).toHaveValue(String(demoSearch.query.filters?.maxPriceCents));
  for (const c of communities) await expect(view.getByTestId(`search-filter-community-${c.id}`)).toBeVisible();
});

test("8: removing chip 2 emits a new query without it, and its new answer renders", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  const removed = demoSearch.query.keywords[1];
  await view.getByTestId("search-chip-remove-2").click();
  const { query, answer } = await newestAnswered(page, 1);
  expect(query.queryId).not.toBe("qry_01");
  expect(query.text).toBe(demoSearch.query.text);
  expect(query.keywords).toEqual(demoSearch.query.keywords.filter((k) => k !== removed));
  expect(query.filters).toEqual(demoSearch.query.filters);
  expect(answer.engine).toBe("keyword_scripted");
  // Chips keep their order: chip 2 is now the old chip 3.
  await expect(view.getByTestId("search-chip-2")).toHaveText(demoSearch.query.keywords[2]);
  await expect(view.getByTestId(`search-chip-${demoSearch.query.keywords.length}`)).toHaveCount(0);
  watch.expectClean();
});

test("a person's scripted answer lands 1.2 s after the request on the player clock", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  await page.evaluate(() => window.__cindia!.player.play());
  await slot(page, "shop.search.main").getByTestId("search-chip-remove-1").click();
  const { query, answer } = await newestAnswered(page, 1);
  await page.evaluate(() => window.__cindia!.player.pause());
  // The responder waits 1.2 s in real time and stamps the answer with the player clock, which runs
  // at 1x here, so the gap on `at` is the 1.2 s wait (plus however late the timer fired).
  expect(answer.at - query.at).toBeGreaterThanOrEqual(1150);
});

test("9: a $100 cap emits maxPriceCents 10000, and no card in its answer costs more, so pc_01 is gone", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  await expect(view.getByTestId("search-result-pc_01")).toBeVisible();
  expect(priceOf("pc_01")).toBeGreaterThan(10000);
  await view.getByTestId("search-filter-price").selectOption("10000");
  const { query, answer } = await newestAnswered(page, 1);
  expect(query.filters?.maxPriceCents).toBe(10000);
  expect(query.keywords).toEqual(demoSearch.query.keywords);
  expect(answer.results.length).toBeGreaterThan(0);
  for (const r of answer.results) expect(priceOf(r.pieceId)).toBeLessThanOrEqual(10000);
  await expect(view.getByTestId("search-result-pc_01")).toHaveCount(0);
});

test("adding a keyword and toggling a community each emit a new query", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  const add = view.getByTestId("search-chip-add");
  await add.fill("geometric");
  await add.press("Enter");
  const first = await newestAnswered(page, 1);
  expect(first.query.keywords).toEqual([...demoSearch.query.keywords, "geometric"]);

  const acoma = communities.find((c) => c.id === "com_acoma")!;
  await view.getByTestId(`search-filter-community-${acoma.id}`).click();
  const second = await newestAnswered(page, 2);
  expect(second.query.filters?.communityIds).toEqual([acoma.id]);
  expect(second.query.filters?.maxPriceCents).toBe(demoSearch.query.filters?.maxPriceCents);
  for (const r of second.answer.results) expect(communityOf(r.pieceId)).toBe(acoma.id);
});

test("a new text sent with search-submit is a new query with its own chips", async ({ page }) => {
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  await view.getByTestId("search-input").fill("calm blue clay");
  await view.getByTestId("search-submit").click();
  const { query } = await newestAnswered(page, 1);
  expect(query.text).toBe("calm blue clay");
  expect(query.keywords.length).toBeGreaterThan(0);
  await expect(view.getByTestId("search-chip-1")).toHaveText(query.keywords[0]);
  await expect(page).toHaveURL(/q=calm(%20|\+)blue(%20|\+)clay/);
  // The URL now carries the new text, which is the latest query's, so nothing more is emitted for it.
  await expect(view.getByTestId("search-input")).toHaveValue("calm blue clay");
  expect(await userQueries(page)).toHaveLength(1);
});
