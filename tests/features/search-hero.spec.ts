// F-search T1: the home hero. Acceptance 1 (the tour's query fills the box and the chips, with the
// Rule-based badge), 7 (a person's own search, from typing to the keyword scorer's answer), 13 (the
// box starts empty) and 15 (English only: the hero in English, no Chinese). Specs reach tour events with tourEvent() from
// search-lib.ts and check by test ID; expected values come from src/mock/ and the feature's strings.
import { expect, test } from "@playwright/test";
import { demoSearch } from "../../src/mock/index";
import { EXAMPLES, HERO } from "../../src/features/search/strings";
import { watchPage } from "../smoke/lib";
import { loggedEvents, openPage, searchState, slot, tourQueried, userQueries } from "./search-lib";

test("1: the tour's query shows its text and figure 11's six chips in order, with the Rule-based badge", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop");
  await tourQueried(page);
  const home = slot(page, "shop.home.main");
  await expect(home.getByTestId("search-input")).toHaveValue(demoSearch.query.text);
  const chips = demoSearch.query.keywords;
  expect(chips).toContain("gift for mom");
  expect(chips).toContain("under $200");
  for (const [i, word] of chips.entries()) await expect(home.getByTestId(`search-chip-${i + 1}`)).toHaveText(word);
  await expect(home.getByTestId(`search-chip-${chips.length + 1}`)).toHaveCount(0);
  // The kit's Rule-based badge sits in the chip row: code picked the chips, no model did.
  await expect(home.locator('[data-variant="rule"]')).toBeVisible();
  // The query has no answer yet, so Cindy is searching.
  await expect(home.getByTestId("search-working")).toHaveText(HERO.working.en);
  watch.expectClean();
});

test("7: typed words show chips before submit, and submit emits the person's query and opens the scorer's answer", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop");
  const home = slot(page, "shop.home.main");
  await home.getByTestId("search-input").fill("warm wool for a reading nook");
  await expect(home.getByTestId("search-chip-1")).toBeVisible();
  const shown = await home.locator('[data-testid^="search-chip-"]').evaluateAll((els) =>
    els.filter((e) => /^search-chip-\d+$/.test(e.getAttribute("data-testid") ?? "")).map((e) => (e.textContent ?? "").trim()),
  );
  expect(shown.length).toBeGreaterThan(0);
  expect(await userQueries(page), "nothing is emitted before submit").toEqual([]);

  await home.getByTestId("search-submit").click();
  await expect(page).toHaveURL(/\/shop\/search\?q=warm/);
  await expect.poll(async () => (await userQueries(page)).length).toBe(1);
  const [query] = await userQueries(page);
  expect(query.queryId).toBe("qry_user_1");
  expect(query.text).toBe("warm wool for a reading nook");
  expect(query.keywords).toEqual(shown);
  const logged = (await loggedEvents(page, "search.queried")).filter((e) => e.source === "user");
  expect(logged).toHaveLength(1);

  // The scripted keyword scorer answers it, and the grid renders that answer in order.
  await expect.poll(async () => Boolean((await searchState(page)).search.answers[query.queryId])).toBe(true);
  const answer = (await searchState(page)).search.answers[query.queryId];
  expect(answer.engine).toBe("keyword_scripted");
  expect(answer.results.length).toBeGreaterThan(0);
  const results = slot(page, "shop.search.main").getByTestId("search-results");
  await expect(results.getByTestId(`search-result-${answer.results[0].pieceId}`)).toBeVisible();
  const order = await results.locator('[data-testid^="search-result-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(order).toEqual(answer.results.map((r) => `search-result-${r.pieceId}`));
  watch.expectClean();
});

test("an example vibe fills the box and previews its chips", async ({ page }) => {
  await openPage(page, "/shop");
  const home = slot(page, "shop.home.main");
  for (let i = 1; i <= 4; i += 1) await expect(home.getByTestId(`search-example-${i}`)).toHaveText(EXAMPLES[i - 1].label.en);
  await home.getByTestId("search-example-2").click();
  await expect(home.getByTestId("search-input")).toHaveValue(EXAMPLES[1].text);
  await expect(home.getByTestId("search-chip-1")).toBeVisible();
});

test("13: a fresh Shop home has an empty search box and no chips", async ({ page }) => {
  await openPage(page, "/shop");
  const home = slot(page, "shop.home.main");
  await expect(home.getByTestId("search-input")).toHaveValue("");
  await expect(home.getByTestId("search-chip-1")).toHaveCount(0);
  await expect(home.getByTestId("search-working")).toHaveCount(0);
});

// English only (decisions.md, Oct 24 11:35 PM and 11:55 PM): the language toggle is gone, so the
// hero is checked in English, with none of its Chinese text on screen.
test("15: English only: the hero shows its English text and none of its Chinese", async ({ page }) => {
  await openPage(page, "/shop");
  await expect(page.getByTestId("demo-lang-toggle")).toHaveCount(0);
  const home = slot(page, "shop.home.main");
  await expect(home).toContainText(HERO.title.en);
  await expect(home).toContainText(HERO.sub.en);
  await expect(home).not.toContainText(HERO.title.zh);
  await expect(home).not.toContainText(HERO.sub.zh);
  await expect(home.getByTestId("search-example-1")).toHaveText(EXAMPLES[0].label.en);
  await expect(home.getByTestId("search-input")).toHaveAttribute("placeholder", HERO.placeholder.en);
  await tourQueried(page);
  await expect(home.getByTestId("search-working")).toHaveText(HERO.working.en);
});
