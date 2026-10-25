// M-maker-statement: the page laid out for 1440 by 900, in English and Chinese. Nothing under
// maker.main is clipped, cut off by an ellipsis, outside frame-maker or under 14 px, the header,
// lines and held note don't overlap, and the held line stays in frame on the beat that shows it
// (its last 300 ms, where the tour's screenshot is taken). Every seek is anchored on an event.
import { expect, test, type Page } from "@playwright/test";
import { waitForFonts, watchPage } from "../smoke/lib";
import {
  BEAT_IDS,
  FRAME_VIEWPORT,
  MKR_04,
  beatEndAfterStatement,
  expectInsideFrame,
  expectNoClippedText,
  openMaker,
  overlaps,
  seekToStatement,
  toChinese,
} from "./maker-statement-lib";

test.use({ viewport: FRAME_VIEWPORT });

const PARTS = ["maker-statement-header", "maker-statement-lines", "maker-statement-held"] as const;

async function expectLaidOut(page: Page) {
  await waitForFonts(page);
  await expectInsideFrame(page, [...PARTS, ...BEAT_IDS, "maker-statement-payout-date", "maker-statement-paid"]);
  for (const id of PARTS) await expectNoClippedText(page, id);
  const boxes = await Promise.all(PARTS.map(async (id) => [id, (await page.getByTestId(id).boundingBox())!] as const));
  const badge = (await page.locator('[data-slot="maker.main"]').getByTestId("simulated-badge").boundingBox())!;
  for (let i = 0; i < boxes.length; i++) {
    expect(overlaps(boxes[i][1], badge), `${boxes[i][0]} overlaps the Simulated badge`).toBe(false);
    for (let j = i + 1; j < boxes.length; j++) {
      expect(overlaps(boxes[i][1], boxes[j][1]), `${boxes[i][0]} overlaps ${boxes[j][0]}`).toBe(false);
    }
  }
  // The statement takes the main column: the left two thirds, beside maker.side.
  const main = (await page.locator('[data-slot="maker.main"]').boundingBox())!;
  const side = (await page.locator('[data-slot="maker.side"]').boundingBox())!;
  expect(main.x + main.width).toBeLessThanOrEqual(side.x);
  expect(main.width).toBeGreaterThan(side.width * 1.5);
}

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: 300 ms after statement.issued nothing is clipped or overlapping`, async ({ page }) => {
    const watch = watchPage(page);
    await openMaker(page);
    await seekToStatement(page, 300);
    if (lang === "zh") await toChinese(page);
    await expectLaidOut(page);
    watch.expectClean();
  });

  test(`${lang}: 300 ms before the beat ends the held line is in frame and nothing is clipped`, async ({ page }) => {
    const watch = watchPage(page);
    await openMaker(page);
    const end = await beatEndAfterStatement(page);
    await seekToStatement(page, 0);
    await page.evaluate((t) => {
      const p = window.__cindia!.player;
      p.pause();
      p.seek(t);
    }, end - 300);
    if (lang === "zh") await toChinese(page);
    await expect(page.getByTestId("maker-statement-held")).toContainText("$95.00");
    await expectLaidOut(page);
    watch.expectClean();
  });
}

test("the empty page for mkr_04 has nothing clipped, in English and Chinese", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page, MKR_04.id);
  await seekToStatement(page, 300);
  await waitForFonts(page);
  await expectInsideFrame(page, ["maker-statement-header", "maker-statement-empty"]);
  await expectNoClippedText(page, "maker-statement-header");
  await expectNoClippedText(page, "maker-statement-empty");
  await toChinese(page);
  await waitForFonts(page);
  await expectNoClippedText(page, "maker-statement-header");
  await expectNoClippedText(page, "maker-statement-empty");
  watch.expectClean();
});
