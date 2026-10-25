// F-search T5: the featured grid on home. Acceptance 13: on a fresh store, search-featured shows
// eight cards, two from each of the four communities in community order, each starting its
// verification line with L3. Expected pieces come from src/mock/ by the plan's rule.
import { expect, test } from "@playwright/test";
import { communities, pieces } from "../../src/mock/index";
import { L3 } from "../../src/ui/strings";
import { watchPage } from "../smoke/lib";
import { openPage, slot } from "./search-lib";

/** The plan's rule: per community in order, its first two featured pieces, topped up with its first pieces. */
function expectedFeatured(): string[] {
  const out: string[] = [];
  for (const c of communities) {
    const own = pieces.filter((p) => p.communityId === c.id);
    const picked = own.filter((p) => p.kind === "featured").slice(0, 2);
    for (const p of own) if (picked.length < 2 && !picked.includes(p)) picked.push(p);
    out.push(...picked.map((p) => p.id));
  }
  return out;
}

test("13: a fresh Shop home shows eight featured cards, two per community in community order", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop");
  const grid = slot(page, "shop.home.main").getByTestId("search-featured");
  await expect(grid).toBeAttached();
  const ids = await grid.locator("[data-piece-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-id")));
  expect(ids).toHaveLength(8);
  expect(ids).toEqual(expectedFeatured());
  const byCommunity = ids.map((id) => pieces.find((p) => p.id === id)?.communityId);
  expect(byCommunity).toEqual(communities.flatMap((c) => [c.id, c.id]));
  for (const id of ids) {
    const card = grid.locator(`[data-piece-id="${id}"]`);
    const p = pieces.find((x) => x.id === id)!;
    const c = communities.find((x) => x.id === p.communityId)!;
    await expect(card).toContainText(c.name.en);
    await expect(card.locator('[data-role="verification"]')).toHaveText(new RegExp(`^${L3.en}`));
  }
  await expect(slot(page, "shop.home.main").getByTestId("search-input")).toHaveValue("");
  watch.expectClean();
});

test("a featured card opens its piece page", async ({ page }) => {
  await openPage(page, "/shop");
  const grid = slot(page, "shop.home.main").getByTestId("search-featured");
  const first = expectedFeatured()[0];
  await grid.locator(`[data-piece-id="${first}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/shop/piece/${first}$`));
});
