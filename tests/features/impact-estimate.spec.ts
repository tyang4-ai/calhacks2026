// F-impact T2, on M-desktop's /sell/close: the estimate label on each impact number and the one-line estimate note, shown only
// while the impact.updated payload's estimate is true, plus the Simulated badge in scripted mode.
import { expect, test, type Page } from "@playwright/test";
import { GLOSSARY, UI } from "../../src/features/impact/strings";
import { SELL_VIEWPORT, openSell, watchPage } from "./sell-views-lib";

// M-desktop: the close view on /sell/close at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

interface ImpactPayload {
  impactId: string;
  makerShareBps: number;
  daysCloseToPayout: number;
  daysCloseToPayoutBefore: number;
  bookkeepingHoursSaved: number;
  estimate: boolean;
}

const NUMBER_IDS = ["impact-maker-share", "impact-days-to-payout", "impact-hours-saved"] as const;

async function openCloseAt(page: Page, ms: number) {
  await openSell(page, "close");
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function scriptedImpact(page: Page): Promise<{ at: number; payload: ImpactPayload }> {
  const found = await page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline();
    const e = tl?.events.find((ev) => ev.type === "impact.updated");
    return e ? { at: e.at, payload: e.payload as ImpactPayload } : null;
  });
  expect(found, "an impact.updated in the timeline").not.toBeNull();
  return found!;
}

test("impact-estimate-note and the estimate label on each number show after impact.updated", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "close");
  const { at, payload } = await scriptedImpact(page);
  expect(payload.estimate).toBe(true);
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, at + 1000);

  // The Sell site starts in English.
  const note = page.getByTestId("impact-estimate-note");
  await expect(note).toBeVisible();
  await expect(note).toHaveText(UI.estimateNote.en);
  for (const id of NUMBER_IDS) {
    await expect(page.getByTestId(id)).toContainText(GLOSSARY.estimate.en);
  }
  watch.expectClean();
});

test("before impact.updated there is no estimate note and no estimate label", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "close");
  const { at } = await scriptedImpact(page);
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, at - 1000);

  for (const id of NUMBER_IDS) {
    await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId(id)).not.toContainText(GLOSSARY.estimate.en);
  }
  await expect(page.getByTestId("impact-estimate-note")).toHaveCount(0);
  watch.expectClean();
});

test("the impact panel shows the Simulated badge in scripted mode", async ({ page }) => {
  const watch = watchPage(page);
  await openCloseAt(page, 0);
  const { at } = await scriptedImpact(page);
  await page.evaluate((t) => window.__cindia!.player.seek(t), at + 1000);

  const slot = page.locator('[data-slot="studio.close.side"]');
  await expect(page.getByTestId("impact-estimate-note")).toBeVisible();
  await expect(slot.getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("an impact.updated with estimate false removes the note and the labels", async ({ page }) => {
  const watch = watchPage(page);
  await openCloseAt(page, 0);
  const { at, payload } = await scriptedImpact(page);
  await page.evaluate((t) => window.__cindia!.player.seek(t), at + 1000);
  await expect(page.getByTestId("impact-estimate-note")).toBeVisible();

  await page.evaluate((p) => {
    const c = window.__cindia!;
    c.emit({
      id: "evt_live_impact_estimate_0001",
      type: "impact.updated",
      at: c.player.now(),
      source: "live",
      key: "b10-derived",
      payload: { ...p, estimate: false },
    });
  }, payload);

  await expect(page.getByTestId("impact-estimate-note")).toHaveCount(0);
  for (const id of NUMBER_IDS) {
    await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId(id)).not.toContainText(GLOSSARY.estimate.en);
  }
  watch.expectClean();
});
