// M-buyer T3: the top of the piece page's price column. Acceptance 1 (the price, the split adding
// up to $180.00 with the maker share $134.48, and the gallery comparison, inside the frame) and 5
// (a piece with no split yet asks for it and draws the answer). Expected values come from
// src/mock/splits.ts, never typed in.
import { expect, test, type Page } from "@playwright/test";
import type { Person, Piece } from "../../src/core/types";
import { getById, gallerySplits, splits } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { watchPage } from "../smoke/lib";
import { expectInsideFrame, freshStore, loggedEvents, openPage, seekToEvent, storeSlice, toCents } from "./buyer-lib";

async function openAtSplit(page: Page, pieceId = "pc_01") {
  await openPage(page, `/shop/piece/${pieceId}`);
  await seekToEvent(page, "split.shown", { pieceId: "pc_01" }, 300);
}

test("@T3 the price and the split: four parts adding up to $180.00, the maker share $134.48", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  const split = splits.pc_01;
  expect(split.grossCents).toBe(18000);
  expect(split.makerShareCents).toBe(13448);

  await expect(page.getByTestId("buyer-split-price")).toHaveText(formatCents(split.grossCents));
  const bar = page.getByTestId("buyer-split-bar");
  const amounts = bar.locator(".c-money");
  await expect(amounts).toHaveCount(4);
  const total = (await amounts.allTextContents()).map(toCents).reduce((a, b) => a + b, 0);
  expect(total).toBe(split.grossCents);
  await expect(page.getByTestId("buyer-split-maker-share")).toHaveText(formatCents(split.makerShareCents));
  await expect(page.getByTestId("buyer-split-request")).toHaveCount(0);
  watch.expectClean();
});

test("@T3 buyer-split-compare reads the gallery's $86.00 from gallerySplits against Cindia's $134.48", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  const gallery = gallerySplits.pc_01;
  expect(gallery.makerShareCents).toBe(8600);
  const maker = getById<Person>(getById<Piece>("pc_01")!.makerId)!;

  const compare = page.getByTestId("buyer-split-compare");
  await expect(compare).toContainText(maker.name.en);
  await expect(compare).toContainText(formatCents(gallery.makerShareCents));
  await expect(compare).toContainText(formatCents(splits.pc_01.makerShareCents));
  // The gallery's amount comes first, then Cindia's.
  const text = (await compare.textContent()) ?? "";
  expect(text.indexOf(formatCents(gallery.makerShareCents))).toBeLessThan(text.indexOf(formatCents(splits.pc_01.makerShareCents)));
  watch.expectClean();
});

test("@T3 the price, the split, the maker share and the comparison sit inside the frame", async ({ page }) => {
  const watch = watchPage(page);
  await openAtSplit(page);
  for (const id of ["buyer-split-price", "buyer-split-bar", "buyer-split-maker-share", "buyer-split-compare"]) await expectInsideFrame(page, id);
  watch.expectClean();
});

test("@T3 a piece of another community shows its split with no gallery line", async ({ page }) => {
  const watch = watchPage(page);
  const other = Object.keys(splits).find((id) => gallerySplits[id] === undefined)!;
  expect(other, "a piece with no gallery entry in src/mock").toBeTruthy();
  await openPage(page, `/shop/piece/${other}`);
  await freshStore(page);
  await page.getByTestId("buyer-split-request").click();
  await expect(page.getByTestId("buyer-split-maker-share")).toHaveText(formatCents(splits[other].makerShareCents));
  await expect(page.getByTestId("buyer-split-compare")).toHaveCount(0);
  watch.expectClean();
});

test("@T3 on pc_02 with no split, See where your money goes asks with a person's piece.opened and draws the answer", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_02");
  // A seek first: it drops any pending answer and gives a fresh store with no split for pc_02.
  await seekToEvent(page, "split.shown", { pieceId: "pc_01" }, 300);
  expect((await storeSlice(page)).buyer.splits.pc_02).toBeUndefined();
  await expect(page.getByTestId("buyer-split-bar")).toHaveCount(0);
  await expect(page.getByTestId("buyer-split-price")).toHaveText(formatCents(getById<Piece>("pc_02")!.priceCents));

  const before = (await loggedEvents(page, "piece.opened")).filter((e) => e.source === "user");
  expect(before).toEqual([]);
  await page.getByTestId("buyer-split-request").click();

  await expect.poll(async () => (await loggedEvents(page, "piece.opened")).filter((e) => e.source === "user").length).toBe(1);
  const opened = await page.evaluate(() => (window.__cindia!.store.getState().buyer as { openPieceId: string | null }).openPieceId);
  expect(opened).toBe("pc_02");

  // The scripted answer (contracts section 11) arrives within the default expect timeout.
  const split = splits.pc_02;
  await expect(page.getByTestId("buyer-split-maker-share")).toHaveText(formatCents(split.makerShareCents));
  const total = (await page.getByTestId("buyer-split-bar").locator(".c-money").allTextContents()).map(toCents).reduce((a, b) => a + b, 0);
  expect(total).toBe(split.grossCents);
  await expect(page.getByTestId("buyer-split-request")).toHaveCount(0);
  if (gallerySplits.pc_02) await expect(page.getByTestId("buyer-split-compare")).toContainText(formatCents(gallerySplits.pc_02.makerShareCents));
  watch.expectClean();
});
