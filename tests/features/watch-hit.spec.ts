// F-watch T3: the hit card. Acceptance 3, 4, the live label of 9, and 12.
// Every expected value comes from src/mock/ and the feature's strings; the text match is read from
// cft_01's payload in src/mock/watch.ts, never typed (A2-13).
import { expect, test, type Locator } from "@playwright/test";
import type { Piece } from "../../src/core/types";
import { getById } from "../../src/mock";
import { ACTIONS, CHECKED, ENGINE, HIT, L19_HINT, L19_LABEL, L20, L21, L22, L23, SCAN, fill } from "../../src/features/watch/strings";
import { watchPage } from "../smoke/lib";
import {
  CLAIM_ONLY,
  TOUR_HIT,
  TOUR_SCAN,
  WATCH_VIEWPORT,
  expectInsideFrame,
  flaggedPayload,
  inFrame,
  openWatch,
  scriptedResults,
  seed,
  setLang,
  tourScan,
} from "./watch-lib";

test.use({ viewport: WATCH_VIEWPORT });

const CFT = TOUR_HIT.id;
const piece = getById<Piece>(TOUR_HIT.pieceId)!;
const score = TOUR_HIT.similarity.toFixed(2);

async function box(l: Locator) {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return b!;
}

test("3: 300 ms after counterfeit.flagged for cft_01, the claim, the side by side, the text match and the fairness line show", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await tourScan(page, "counterfeit.flagged", { cftId: CFT }, 300);
  const item = inFrame(page, `watch-item-${CFT}`);
  await expect(item).toBeVisible();

  // The claim first, above the side by side.
  const claim = item.getByTestId(`watch-claim-${CFT}`);
  await expect(claim).toContainText(TOUR_HIT.claim.en);
  const found = item.locator('[data-role="found"]');
  const mine = item.locator(`[data-role="piece"][data-piece-id="${TOUR_HIT.pieceId}"]`);
  const claimBox = await box(claim);
  expect(claimBox.y + claimBox.height).toBeLessThanOrEqual((await box(found)).y);
  expect(claimBox.y + claimBox.height).toBeLessThanOrEqual((await box(mine)).y);

  // The found listing beside the co-op's piece.
  await expect(found.locator('[data-role="found-title"]')).toHaveText(TOUR_HIT.title);
  await expect(found.locator('[data-role="found-url"]')).toHaveText(TOUR_HIT.url);
  await expect(found.locator('[data-role="found-snippet"]')).toHaveText(TOUR_HIT.snippet);
  await expect(mine).toContainText(piece.title.en);
  const f = await box(found);
  const m = await box(mine);
  expect(f.x + f.width).toBeLessThanOrEqual(m.x);
  expect(Math.min(f.y + f.height, m.y + m.height)).toBeGreaterThan(Math.max(f.y, m.y));

  // The text match: L19's first sentence with the payload's number, and its hint.
  const sim = item.getByTestId(`watch-similarity-${CFT}`);
  await expect(sim).toContainText(fill(L19_LABEL, { score }).en);
  await expect(sim).toContainText(L19_HINT.en);
  const s = await box(sim);
  expect(s.x).toBeGreaterThanOrEqual(f.x + f.width - 1);
  expect(s.x + s.width).toBeLessThanOrEqual(m.x + 1);

  // The fairness line and L20.
  const fairness = item.getByTestId("watch-fairness");
  await expect(fairness).toContainText(HIT.fairness.en);
  await expect(fairness).toContainText(L20.en);

  // The report and dismiss buttons are the same size.
  const report = await box(item.getByTestId(`watch-report-${CFT}`));
  const dismiss = await box(item.getByTestId(`watch-dismiss-${CFT}`));
  expect(Math.abs(report.width - dismiss.width)).toBeLessThan(0.5);
  expect(Math.abs(report.height - dismiss.height)).toBeLessThan(0.5);
  await expect(item.getByTestId(`watch-dismiss-${CFT}`)).toHaveText(L23.en);

  // A scripted hit has no live label.
  await expect(page.getByTestId(`watch-live-${CFT}`)).toHaveCount(0);

  // d14-watch's IDs, inside frame-studio.
  await expect(inFrame(page, "watch-results")).toHaveCount(1);
  await expectInsideFrame(page, [`watch-item-${CFT}`, `watch-similarity-${CFT}`, `watch-claim-${CFT}`, "watch-fairness", `watch-report-${CFT}`, `watch-dismiss-${CFT}`]);
  watch.expectClean();
});

test("4: the hit never shows the found page: no link to it, no iframe, no picture from its site", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await tourScan(page, "counterfeit.flagged", { cftId: CFT }, 300);
  const item = inFrame(page, `watch-item-${CFT}`);
  await expect(item).toBeVisible();
  const report = await item.evaluate((el, url) => {
    const foundUrl = new URL(url, location.href);
    const site = foundUrl.origin + foundUrl.pathname.slice(0, foundUrl.pathname.lastIndexOf("/") + 1);
    const anchors = [...el.querySelectorAll("a")].filter((a) => a.href === foundUrl.href || a.href.startsWith(site));
    const iframes = el.querySelectorAll("iframe, frame, object, embed").length;
    const imgs = [...el.querySelectorAll("img")].filter((i) => {
      const src = new URL(i.getAttribute("src") ?? "", location.href);
      return src.href.startsWith(site) || (foundUrl.origin !== location.origin && src.origin === foundUrl.origin);
    });
    const urlText = el.querySelector('[data-role="found-url"]');
    return { anchors: anchors.length, iframes, imgs: imgs.map((i) => i.src), urlInLink: Boolean(urlText?.closest("a")) };
  }, TOUR_HIT.url);
  expect(report).toEqual({ anchors: 0, iframes: 0, imgs: [], urlInLink: false });
  watch.expectClean();
});

test("9: a live counterfeit.flagged shows L21 on its card", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  const scanId = "wsc_user_1";
  await seed(page, [
    { type: "watch.started", payload: { scanId, makerId: TOUR_SCAN.makerId, queries: [...TOUR_SCAN.queries] } },
    { type: "watch.scanned", payload: { scanId, engine: "apify", candidates: scriptedResults().length, results: scriptedResults() }, key: "b15-watch", source: "live" },
    { type: "counterfeit.flagged", payload: flaggedPayload(CFT, scanId, "cft_user_1"), key: "b15-watch", source: "live" },
  ]);
  const live = inFrame(page, "watch-live-cft_user_1");
  await expect(live).toHaveText(L21.en);
  await expect(inFrame(page, "watch-item-cft_user_1")).toContainText(L21.en);
  await expect(inFrame(page, "watch-engine")).toHaveText(ENGINE.apify.en);
  watch.expectClean();
});

test("12: in Chinese every label and the claim are Chinese, and the found title and snippet stay as found", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await tourScan(page, "counterfeit.flagged", { cftId: CFT }, 300);
  await setLang(page, "zh");
  const item = inFrame(page, `watch-item-${CFT}`);
  await expect(item.getByTestId(`watch-claim-${CFT}`)).toContainText(TOUR_HIT.claim.zh);
  await expect(item.getByTestId(`watch-claim-${CFT}`)).toContainText(HIT.claimLabel.zh);
  await expect(item.locator('[data-role="found-title"]')).toHaveText(TOUR_HIT.title);
  await expect(item.locator('[data-role="found-snippet"]')).toHaveText(TOUR_HIT.snippet);
  await expect(item.locator('[data-role="found"]')).toContainText(HIT.foundLabel.zh);
  await expect(item.locator('[data-role="piece"]')).toContainText(HIT.pieceLabel.zh);
  await expect(item.locator('[data-role="piece"]')).toContainText(piece.title.zh);
  await expect(item.getByTestId(`watch-similarity-${CFT}`)).toContainText(fill(L19_LABEL, { score }).zh);
  await expect(item.getByTestId(`watch-similarity-${CFT}`)).toContainText(L19_HINT.zh);
  await expect(item.getByTestId("watch-fairness")).toContainText(HIT.fairness.zh);
  await expect(item.getByTestId("watch-fairness")).toContainText(L20.zh);
  await expect(item.getByTestId(`watch-report-${CFT}`)).toHaveText(ACTIONS.waiting.zh);
  await expect(item.getByTestId(`watch-dismiss-${CFT}`)).toHaveText(L23.zh);
  await expect(inFrame(page, "watch-scan")).toHaveText(SCAN.scanNow.zh);
  await expect(inFrame(page, "watch-engine")).toHaveText(ENGINE.scripted.zh);
  const claimOnly = scriptedResults().findIndex((r) => r.url === CLAIM_ONLY.url) + 1;
  await expect(inFrame(page, `watch-claim-only-${claimOnly}`)).toHaveText(L22.zh);
  const neither = scriptedResults().findIndex((r) => r.verdict === "neither") + 1;
  await expect(inFrame(page, `watch-checked-${neither}`)).toContainText(CHECKED.neither.zh);
  watch.expectClean();
});
