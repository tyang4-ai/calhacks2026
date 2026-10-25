// F-watch T2: the scan bar. Acceptance 1, 2 and 5, and Scan now disabled while a scan runs.
// Every expected value comes from src/mock/ and the feature's strings; nothing is typed here.
import { expect, test } from "@playwright/test";
import type { Person } from "../../src/core/types";
import { communities, getById, pieces, studio } from "../../src/mock";
import { ENGINE, SCAN, checkedWords, foundWords } from "../../src/features/watch/strings";
import { watchPage } from "../smoke/lib";
import { ANSWER_TIMEOUT, TOUR_SCAN, WATCH_VIEWPORT, inFrame, openWatch, seed, storeState, tourScan } from "./watch-lib";
import { counterfeitCandidates } from "../../src/mock/watch";

test.use({ viewport: WATCH_VIEWPORT });

const firstMaker = studio.makerIds[0];
const grace = getById<Person>(firstMaker)!;
const firstPiece = pieces.find((p) => p.makerId === firstMaker)!;
const coop = communities.find((c) => c.id === grace.communityId)!;
const possible = counterfeitCandidates.filter((c) => c.verdict === "possible_copy").length;

test("1: before any scan, the queries are the first maker's three and the results are empty", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await expect(inFrame(page, "watch-maker")).toHaveValue(firstMaker);
  const queries = inFrame(page, "watch-queries");
  await expect(queries).toHaveAttribute("data-sent", "false");
  const expected = [coop.name.en, `${grace.name.en} ${firstPiece.facets.object.en}`, firstPiece.story.en.split(/\s+/).slice(0, 8).join(" ")];
  await expect(queries.locator('[data-role="query"]')).toHaveText(expected);
  expect(expected).toEqual(TOUR_SCAN.queries);
  await expect(inFrame(page, "watch-results")).toBeEmpty();
  await expect(inFrame(page, "watch-status")).toHaveText(SCAN.statusIdle.en);
  await expect(inFrame(page, "watch-engine")).toHaveCount(0);
  expect((await storeState(page)).watch.latestScanId).toBeNull();
  watch.expectClean();
});

test("2: Scan now emits a person's watch.started, shows the check under way, then the scripted sample", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  // Note every status the bar shows and whether Scan now is disabled, so a fast answer can't hide the check.
  await page.evaluate(() => {
    const w = window as unknown as { watchStatus: { state: string | null; text: string | null; disabled: boolean }[] };
    w.watchStatus = [];
    const frame = document.querySelector('[data-testid="frame-studio"]')!;
    const note = () => {
      const s = frame.querySelector('[data-testid="watch-status"]');
      const b = frame.querySelector<HTMLButtonElement>('[data-testid="watch-scan"]');
      w.watchStatus.push({ state: s?.getAttribute("data-state") ?? null, text: s?.textContent ?? null, disabled: b?.disabled ?? false });
    };
    new MutationObserver(note).observe(frame, { subtree: true, childList: true, characterData: true, attributes: true });
  });

  await inFrame(page, "watch-scan").click();
  const s = await storeState(page);
  const scanId = s.watch.latestScanId!;
  expect(scanId).toMatch(/^wsc_user_\d+$/);
  expect(s.watch.scans[scanId]).toMatchObject({ makerId: firstMaker, queries: TOUR_SCAN.queries });
  const started = s.log.entries.filter((e) => e.type === "watch.started");
  expect(started.at(-1)?.source).toBe("user");

  await expect(inFrame(page, "watch-engine")).toHaveText(ENGINE.scripted.en, { timeout: ANSWER_TIMEOUT });
  const statuses = await page.evaluate(() => (window as unknown as { watchStatus: { state: string; text: string; disabled: boolean }[] }).watchStatus);
  const checking = statuses.filter((x) => x.state === "checking");
  expect(checking.length, "watch-status showed the check under way").toBeGreaterThan(0);
  for (const x of checking) {
    expect(x.text).toBe(SCAN.statusChecking.en);
    expect(x.disabled, "Scan now is disabled while the scan has no watch.scanned").toBe(true);
  }

  // The scripted sample's hits, re-keyed to the person's cft_user_<n>.
  await expect.poll(async () => Object.values((await storeState(page)).watch.hits).filter((h) => h.scanId === scanId).length, { timeout: ANSWER_TIMEOUT }).toBe(possible);
  const hits = Object.values((await storeState(page)).watch.hits).filter((h) => h.scanId === scanId);
  for (const h of hits) {
    expect(h.cftId).toMatch(/^cft_user_\d+$/);
    await expect(inFrame(page, `watch-item-${h.cftId}`)).toBeVisible();
  }
  await expect(inFrame(page, "watch-status")).toHaveText(`${checkedWords(counterfeitCandidates.length).en} · ${foundWords(possible).en}`);
  await expect(inFrame(page, "watch-scan")).toBeEnabled();
  await expect(inFrame(page, "watch-queries")).toHaveAttribute("data-sent", "true");
  watch.expectClean();
});

test("Scan now is disabled from the newest watch.started until its watch.scanned", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await expect(inFrame(page, "watch-scan")).toBeEnabled();
  await tourScan(page, "watch.started", { scanId: TOUR_SCAN.scanId });
  await expect(inFrame(page, "watch-scan")).toBeDisabled();
  await expect(inFrame(page, "watch-status")).toHaveText(SCAN.statusChecking.en);
  await expect(inFrame(page, "watch-checked")).toHaveCount(0);
  await tourScan(page, "watch.scanned", { scanId: TOUR_SCAN.scanId });
  await expect(inFrame(page, "watch-scan")).toBeEnabled();
  await expect(inFrame(page, "watch-engine")).toHaveText(ENGINE.scripted.en);
  watch.expectClean();
});

test("5: given the tour's scan, watch-queries shows that scan's own queries from its watch.started", async ({ page }) => {
  const watch = watchPage(page);
  await openWatch(page);
  await tourScan(page, "counterfeit.flagged", { cftId: TOUR_SCAN.cftIds[0] }, 300);
  const queries = inFrame(page, "watch-queries");
  await expect(queries).toHaveAttribute("data-sent", "true");
  await expect(queries.locator('[data-role="query"]')).toHaveText(TOUR_SCAN.queries);

  // The queries come from the event itself (D1-51): a newer scan of the same maker shows its own.
  const own = [`${TOUR_SCAN.queries[0]} spec`];
  await seed(page, [{ type: "watch.started", payload: { scanId: "wsc_user_9", makerId: TOUR_SCAN.makerId, queries: own } }]);
  await expect(queries.locator('[data-role="query"]')).toHaveText(own);
  watch.expectClean();
});
