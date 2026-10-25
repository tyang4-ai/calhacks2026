// F-search T7: the assembled Shop views. A person walks home to results to surprise to a piece, and
// acceptance 3 (D1-7): on /shop/search after the tour's answer, the search bar with the tour's text,
// each of the six chips exactly once and search-engine show inside the 1440 by 900 frame, and after
// the tour's draw so do search-surprise, search-surprise-result and search-surprise-rule. The d01-vibe
// IDs on /shop show inside the frame too. Checks by test ID; expected values from src/mock/.
import { expect, test } from "@playwright/test";
import { demoSearch, demoSurprise } from "../../src/mock/index";
import { SURPRISE_RULES } from "../../src/features/search/strings";
import { watchPage } from "../smoke/lib";
import { FRAME_VIEWPORT, expectInFrame, openPage, searchState, slot, tourAnswered, tourDrawn, tourQueried, userQueries } from "./search-lib";

test.use({ viewport: FRAME_VIEWPORT });

test("a person goes from home to results to a surprise draw to a piece", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop");
  const home = slot(page, "shop.home.main");
  await home.getByTestId("search-example-1").click();
  await home.getByTestId("search-submit").click();
  await expect(page).toHaveURL(/\/shop\/search\?q=/);
  await expect.poll(async () => (await userQueries(page)).length).toBe(1);
  const [query] = await userQueries(page);
  await expect.poll(async () => Boolean((await searchState(page)).search.answers[query.queryId])).toBe(true);
  const view = slot(page, "shop.search.main");
  const answer = (await searchState(page)).search.answers[query.queryId];
  expect(answer.results.length).toBeGreaterThan(0);
  await expect(view.getByTestId(`search-result-${answer.results[0].pieceId}`)).toBeVisible();
  await expect(view.getByTestId("search-input")).toHaveValue(query.text);

  await view.getByTestId("search-surprise").click();
  await expect(view.getByTestId("search-surprise-result")).toBeVisible();
  const { surprise } = await searchState(page);
  const drawn = surprise.draws[surprise.latestSurpriseId!];
  expect(drawn.method).toBe("fair_random");
  await expect(view.getByTestId("search-surprise-rule")).toHaveText(SURPRISE_RULES.fair_random.en);

  await view.getByTestId("search-surprise-result").click();
  await expect(page).toHaveURL(new RegExp(`/shop/piece/${drawn.pieceId}$`));
  watch.expectClean();
});

test("d01-vibe on /shop: the box and the six chips show inside the frame", async ({ page }) => {
  await openPage(page, "/shop");
  await tourQueried(page);
  await expectInFrame(page, "search-input", { whole: true });
  for (let n = 1; n <= demoSearch.query.keywords.length; n += 1) await expectInFrame(page, `search-chip-${n}`, { whole: true });
});

test("3: after the tour's answer and draw, the results page shows every d01 and d02 ID inside the frame, each chip once", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/search");
  await tourAnswered(page);
  const view = slot(page, "shop.search.main");
  await expect(view.getByTestId("search-input")).toHaveValue(demoSearch.query.text);
  for (const [i, word] of demoSearch.query.keywords.entries()) {
    await expect(page.getByTestId(`search-chip-${i + 1}`)).toHaveCount(1);
    await expect(page.getByTestId(`search-chip-${i + 1}`)).toHaveText(word);
  }
  await expectInFrame(page, "search-input", { whole: true });
  for (let n = 1; n <= demoSearch.query.keywords.length; n += 1) await expectInFrame(page, `search-chip-${n}`, { whole: true });
  await expectInFrame(page, "search-engine", { whole: true });
  await expectInFrame(page, "search-results");
  await expectInFrame(page, "search-result-pc_01");

  await tourDrawn(page);
  expect(demoSurprise.draw.pieceId).toBeTruthy();
  await expectInFrame(page, "search-surprise", { whole: true });
  await expectInFrame(page, "search-surprise-result");
  await expectInFrame(page, "search-surprise-rule", { whole: true });
  watch.expectClean();
});
