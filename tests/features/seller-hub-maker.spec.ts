// F-seller-hub T6: the maker page's side panel.
// - Acceptance 8: /maker/mkr_01 lists pc_01, pc_04, pc_09 and pc_12 with their prices, and
//   seller-maker-side shows the Demo data badge.
// - Her work in progress shows its milestones, each with its status from the store's wip key,
//   falling back to the mock's.
// - A maker with no pieces, works or questions shows a short empty line for each.
// - English only (decisions.md, Oct 24 11:35 PM): no toggle, no Chinese on the panel.
// Selects by test ID only (and the panel's data attributes inside a test ID). Expected values come
// from src/mock/.
import { expect, test } from "@playwright/test";
import { allMakers, pieces, worksInProgress } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { MAKER } from "../../src/features/seller-hub/strings";
import { watchPage } from "../smoke/lib";
import { FRAME_VIEWPORT, expectEnglishOnly, openMaker, seed } from "./seller-hub-lib";

test.use({ viewport: FRAME_VIEWPORT });

const MINE = pieces.filter((p) => p.makerId === "mkr_01");
const WIP = worksInProgress.filter((w) => w.makerId === "mkr_01");

test("mkr_01's pieces with their prices, under the Demo data badge", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page, "mkr_01");
  const side = page.getByTestId("frame-maker").getByTestId("seller-maker-side");
  await expect(side).toBeVisible();
  await expect(side.locator('[data-variant="demo"]').first()).toBeVisible();

  const list = side.getByTestId("seller-maker-pieces");
  const ids = await list.locator("[data-piece-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-id")));
  expect(ids).toEqual(["pc_01", "pc_04", "pc_09", "pc_12"]);
  expect(ids).toEqual(MINE.map((p) => p.id));
  for (const p of MINE) {
    const row = list.locator(`[data-piece-id="${p.id}"]`);
    await expect(row).toContainText(p.title.en);
    await expect(row).toContainText(formatCents(p.priceCents));
    await expect(row).toContainText(p.facets.oneOfAKind ? MAKER.oneOfAKind.en : MAKER.series.en);
  }
  watch.expectClean();
});

test("her work in progress shows each milestone's status, from the store once it moves", async ({ page }) => {
  await openMaker(page, "mkr_01");
  expect(WIP.length).toBeGreaterThan(0);
  const wip = WIP[0];
  const panel = page.getByTestId("seller-maker-wip");
  await expect(panel).toContainText(wip.title.en);
  for (const m of wip.milestones) {
    await expect(panel.getByTestId(`seller-maker-wip-${m.milestoneId}`)).toHaveAttribute("data-status", m.status);
  }
  const pending = wip.milestones.find((m) => m.status === "pending")!;
  await seed(page, [{ type: "wip.milestone_reached", payload: { wipId: wip.id, milestoneId: pending.milestoneId, date: "2026-10-01" } }]);
  await expect(panel.getByTestId(`seller-maker-wip-${pending.milestoneId}`)).toHaveAttribute("data-status", "reached");
  await seed(page, [{ type: "wip.milestone_paid", payload: { wipId: wip.id, milestoneId: pending.milestoneId, amountCents: 48000, date: "2026-10-02" } }]);
  await expect(panel.getByTestId(`seller-maker-wip-${pending.milestoneId}`)).toHaveAttribute("data-status", "paid");
});

test("a page with nothing listed shows a short empty line for each part", async ({ page }) => {
  // Every maker in the data has pieces, so the co-op manager's page stands in for an empty one.
  const owner = "own_01";
  expect(pieces.some((p) => p.makerId === owner)).toBe(false);
  await openMaker(page, owner);
  await expect(page.getByTestId("seller-maker-pieces")).toContainText(MAKER.noPieces.en);
  await expect(page.getByTestId("seller-maker-wip")).toContainText(MAKER.noWip.en);
  await expect(page.getByTestId("seller-maker-questions")).toContainText(MAKER.noQuestions.en);
});

test("a maker with pieces but no work in progress or questions shows empty lines for those", async ({ page }) => {
  const maker = allMakers.find((m) => pieces.some((p) => p.makerId === m.id) && !worksInProgress.some((w) => w.makerId === m.id))!;
  await openMaker(page, maker.id);
  await expect(page.getByTestId("seller-maker-pieces").locator("[data-piece-id]")).toHaveCount(pieces.filter((p) => p.makerId === maker.id).length);
  await expect(page.getByTestId("seller-maker-wip")).toContainText(MAKER.noWip.en);
  await expect(page.getByTestId("seller-maker-questions")).toContainText(MAKER.noQuestions.en);
});

test("the side panel reads in English only", async ({ page }) => {
  await openMaker(page, "mkr_01");
  await expect(page.getByTestId("seller-maker-side")).toContainText(MAKER.pieces.en);
  await expect(page.getByTestId("seller-maker-wip")).toContainText(MAKER.wip.en);
  await expectEnglishOnly(page.getByTestId("seller-maker-side"));
});
