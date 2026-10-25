// M-maker-statement T2: the kit Toast shows the first time paid arrives, as v1, and on the desktop
// page it covers nothing: not the header, the lines, the held note or the Simulated badge. It's gone
// by the end of the beat that shows the statement, when the held note is the point of the frame.
// The toast is the kit's role="status" element inside maker-statement-header.
import { expect, test, type Page } from "@playwright/test";
import { UI } from "../../src/features/maker-statement/strings";
import { watchPage } from "../smoke/lib";
import { FRAME_VIEWPORT, beatEndAfterStatement, openMaker, overlaps, seekToStatement, toChinese } from "./maker-statement-lib";

test.use({ viewport: FRAME_VIEWPORT });

function toast(page: Page, text: string) {
  return page.getByTestId("maker-statement-header").getByRole("status").filter({ hasText: text });
}

/** The toast's box doesn't overlap the header's text, the lines, the held note or the badge. */
async function expectCoversNothing(page: Page, text: string) {
  const t = (await toast(page, text).boundingBox())!;
  expect(t).toBeTruthy();
  const others: [string, ReturnType<Page["locator"]>][] = [
    ["maker-statement-total", page.getByTestId("maker-statement-total")],
    ["maker-statement-lines", page.getByTestId("maker-statement-lines")],
    ["maker-statement-held", page.getByTestId("maker-statement-held")],
    ["maker-statement-payout-date", page.getByTestId("maker-statement-payout-date")],
    ["simulated-badge", page.locator('[data-slot="maker.main"]').getByTestId("simulated-badge")],
  ];
  for (const [name, loc] of others) {
    const b = (await loc.boundingBox())!;
    expect(b, `${name} has a box`).toBeTruthy();
    expect(overlaps(t, b), `toast ${JSON.stringify(t)} overlaps ${name} ${JSON.stringify(b)}`).toBe(false);
  }
  // The header's own text starts below the toast: the toast sits in the panel's head row.
  const header = (await page.getByTestId("maker-statement-header").boundingBox())!;
  expect(t.y + t.height).toBeLessThanOrEqual(header.y);
}

test("just after statement.issued, with payout.sent already in, the paid toast shows and covers nothing", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  await expect(page.getByTestId("maker-statement-paid")).toBeVisible();
  await expect(toast(page, UI.paidToast.en)).toBeVisible();
  await expectCoversNothing(page, UI.paidToast.en);
  watch.expectClean();
});

test("before statement.issued there's no toast", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, -300);
  await expect(page.getByTestId("maker-statement-empty")).toBeVisible();
  await expect(page.getByTestId("maker-statement-header").getByRole("status")).toHaveCount(0);
  watch.expectClean();
});

test("playing the beat, the toast shows when the statement arrives and is gone by the end-of-beat frame", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  const end = await beatEndAfterStatement(page);
  await seekToStatement(page, -300);
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.setSpeed(2);
    p.play();
  });
  await expect(toast(page, UI.paidToast.en)).toBeVisible();
  await page.waitForFunction((t) => window.__cindia!.player.now() >= t, end - 300, { timeout: 45_000 });
  await page.evaluate(() => window.__cindia!.player.pause());
  await expect(toast(page, UI.paidToast.en)).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-held")).toBeVisible();
  await expect(page.getByTestId("maker-statement-held")).toContainText("$95.00");
  watch.expectClean();
});

test("seeking from the toast to the end of the beat clears it", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  const end = await beatEndAfterStatement(page);
  await seekToStatement(page, 300);
  await expect(toast(page, UI.paidToast.en)).toBeVisible();
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, end - 300);
  await expect(toast(page, UI.paidToast.en)).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-held")).toContainText("$95.00");
  watch.expectClean();
});

test("the toggle turns the paid toast Chinese, and it still covers nothing", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  await expect(toast(page, UI.paidToast.en)).toBeVisible();
  await toChinese(page);
  await expect(toast(page, UI.paidToast.zh)).toBeVisible();
  await expect(toast(page, UI.paidToast.en)).toHaveCount(0);
  await expectCoversNothing(page, UI.paidToast.zh);
  watch.expectClean();
});
